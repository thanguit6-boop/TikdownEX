(function () {
  'use strict';

  const injectTime = performance.now();

  /*
   * When the extension is reloaded or updated, the content script that is still
   * running in an already-open tab is orphaned: every chrome.runtime /
   * chrome.storage call then throws "Extension context invalidated".  All
   * chrome.* access below goes through these helpers, which check the context
   * first and fail quietly instead of raising uncaught errors.  The tab has to
   * be refreshed to get a live content script again.
   */
  const CONTEXT_INVALIDATED = 'extension_context_invalidated';

  const isContextAlive = () => {
    try {
      return Boolean(chrome.runtime && chrome.runtime.id);
    } catch {
      return false;
    }
  };

  // callback(result, runtimeError) is always called exactly once, also when the
  // context is gone, so the MAIN-world page gets an immediate error answer
  // instead of waiting for its own timeout.
  const sendRuntimeMessage = (payload, callback) => {
    if (!isContextAlive()) {
      callback(undefined, CONTEXT_INVALIDATED);
      return;
    }
    try {
      chrome.runtime.sendMessage(payload, (result) => {
        let runtimeError;
        try {
          runtimeError = chrome.runtime.lastError?.message;
        } catch {
          runtimeError = CONTEXT_INVALIDATED;
        }
        callback(result, runtimeError);
      });
    } catch {
      callback(undefined, CONTEXT_INVALIDATED);
    }
  };

  const storageGet = (keys, callback) => {
    if (!isContextAlive()) return;
    try { chrome.storage.local.get(keys, callback); } catch {}
  };

  const storageSet = (items) => {
    if (!isContextAlive()) return;
    try { chrome.storage.local.set(items); } catch {}
  };

  const onStorageChanged = (listener) => {
    if (!isContextAlive()) return;
    try { chrome.storage.onChanged.addListener(listener); } catch {}
  };

  // `tik_license_flag` is only used to decide whether extension UI is shown;
  // privileged requests are independently checked in the service worker.
  const LICENSE_FLAG_KEY = 'tik_license_flag';
  let extensionLicensed = false;
  let extensionUiLoaded = false;

  // chrome.storage answers asynchronously, so right after this script starts
  // `extensionLicensed` is only its default (false), not the stored state. A
  // freshly opened player window asks for its video stream in that gap, got
  // 'license_required' back and closed itself - which is why "Open video
  // player" only worked some of the time while PiP (started by a click on an
  // already loaded page) nearly always did. Stream/download requests that
  // arrive before the first license state wait for it (4 s at most).
  let licenseKnown = false;
  const licenseWaiters = [];
  const releaseLicenseWaiters = () => {
    licenseKnown = true;
    for (const run of licenseWaiters.splice(0)) {
      try { run(); } catch {}
    }
  };
  const whenLicenseKnown = (run) => {
    if (licenseKnown) run();
    else licenseWaiters.push(run);
  };
  setTimeout(releaseLicenseWaiters, 4000);

  function paintLicenseLock(licensed) {
    extensionLicensed = licensed === true;
    if (!licenseKnown) releaseLicenseWaiters();
    document.documentElement.dataset.tikToolkitLicensed = extensionLicensed ? 'true' : 'false';
    let style = document.getElementById('__download_license_lock');
    if (!style) {
      style = document.createElement('style');
      style.id = '__download_license_lock';
      document.documentElement.appendChild(style);
    }
    style.textContent = extensionLicensed ? '' : [
      '[id^="__download_"], [class^="__download_"], [class*=" __download_"]',
      '{display:none!important;}',
    ].join('');
    try {
      window.dispatchEvent(new CustomEvent('__DOWNLOAD_LICENSE_STATE__', {
        detail: { licensed: extensionLicensed },
      }));
      // The page-world hook has no Chrome API. Keep its built-in extensions
      // disabled while locked as well as hiding their controls. The worker
      // remains the authoritative enforcement point for every request.
      window.dispatchEvent(new CustomEvent('__download_settings__', {
        detail: {
          autoScroll: false,
          backgroundPlay: false,
          autoPiP: false,
          cleanVideoMode: false,
          unlockShopVideo: false,
          productViewer: extensionLicensed,
          volumeNormalizer: extensionLicensed,
        },
      }));
      if (!extensionLicensed) {
        window.dispatchEvent(new CustomEvent('__DOWNLOAD_HOVER_PREVIEW__', { detail: { enabled: false } }));
        window.dispatchEvent(new CustomEvent('__DOWNLOAD_PLAYER_ALWAYS_ON_TOP__', { detail: { enabled: false } }));
        window.dispatchEvent(new CustomEvent('__DOWNLOAD_SUBFOLDER_CONTEXT_MENU__', { detail: { enabled: false } }));
      } else {
        // Ask each bridge to replay the user's saved preference after unlock.
        window.dispatchEvent(new CustomEvent('__DOWNLOAD_HOVER_PREVIEW_REQUEST__'));
        window.dispatchEvent(new CustomEvent('__DOWNLOAD_PLAYER_ALWAYS_ON_TOP_REQUEST__'));
        window.dispatchEvent(new CustomEvent('__DOWNLOAD_SUBFOLDER_CONTEXT_MENU_REQUEST__'));
        window.dispatchEvent(new CustomEvent('__DOWNLOAD_VOLUME_BALANCE_REQUEST__'));
      }
    } catch {}
    if (extensionLicensed) loadExtensionUi();
  }

  function syncLicenseLock() {
    storageGet(LICENSE_FLAG_KEY, (result) => {
      paintLicenseLock(!!(result && result[LICENSE_FLAG_KEY] && result[LICENSE_FLAG_KEY].licensed === true));
    });
    // Revalidate on entry as well as listening for the background alarm. The
    // license module coalesces this to at most one request per minute.
    sendRuntimeMessage({ type: 'LICENSE_REVALIDATE' }, (result, runtimeError) => {
      if (!runtimeError && result && result.status) paintLicenseLock(result.status.licensed === true);
    });
  }

  onStorageChanged((changes, area) => {
    if (area === 'local' && changes[LICENSE_FLAG_KEY]) {
      paintLicenseLock(!!(changes[LICENSE_FLAG_KEY].newValue && changes[LICENSE_FLAG_KEY].newValue.licensed === true));
    }
  });
  syncLicenseLock();

  document.documentElement.dataset.downloadExtensionIcon = chrome.runtime.getURL('icons/icon-32.png');
  try {
    if (new URL(location.href).searchParams.has('__download_player')) {
      const playerOnlyStyle = document.createElement('style');
      playerOnlyStyle.id = '__download_player_hide_page_actions';
      playerOnlyStyle.textContent = [
        '.__download_search_pip_btn',
        '.__download_search_player_btn',
        '.__download_search_download_btn',
        '.__download_search_speed_btn',
        '.__download_dl_btn',
      ].join(',') + '{display:none!important;}';
      document.documentElement.appendChild(playerOnlyStyle);
    }
  } catch {}
  const fixedDownloadSettings = Object.freeze({
    autoScroll: false,
    backgroundPlay: false,
    autoPiP: false,
    cleanVideoMode: false,
    unlockShopVideo: false,
    productViewer: true,
    volumeNormalizer: true,
    playbackSpeed: 1,
  });

  /* Download has no settings popup.  Always return the product defaults to the
   * existing content bundle, including when an earlier version left
   * values in chrome.storage.sync. */
  try {
    const storage = chrome.storage?.sync;
    const originalGet = storage?.get?.bind(storage);
    if (storage && originalGet && !window.__DOWNLOAD_FIXED_SETTINGS__) {
      window.__DOWNLOAD_FIXED_SETTINGS__ = true;
      storage.get = (keys, callback) => {
        const asksForSettings = keys === 'ext_settings'
          || (Array.isArray(keys) && keys.includes('ext_settings'))
          || (keys && typeof keys === 'object' && 'ext_settings' in keys);
        const applyDefaults = (result) => {
          if (!asksForSettings) return result;
          return {
            ...result,
            ext_settings: { ...(result?.ext_settings || {}), ...fixedDownloadSettings },
          };
        };
        if (!isContextAlive()) {
          // Orphaned content script: nothing can be read any more, so hand back
          // the fixed defaults instead of letting originalGet throw.
          const fallback = applyDefaults({});
          if (typeof callback === 'function') {
            callback(fallback);
            return undefined;
          }
          return Promise.resolve(fallback);
        }
        if (typeof callback === 'function') {
          return originalGet(keys, (result) => callback(applyDefaults(result)));
        }
        return originalGet(keys).then(applyDefaults);
      };
    }
  } catch {
    // If Chrome exposes a non-writable storage method, the MAIN-world default
    // event below still applies the same settings to TikTok's active page.
  }

  /*
   * The MAIN-world hook cannot call chrome.runtime.sendMessage.  This bridge
   * is limited to TikTok video URLs and powers the search-card PiP/download
   * controls without making the user open an individual video page first.
   */
  const searchPipRequest = '__DOWNLOAD_SEARCH_PIP_MEDIA_REQUEST__';
  const searchPipResponse = '__DOWNLOAD_SEARCH_PIP_MEDIA_RESPONSE__';
  const searchDownloadRequest = '__DOWNLOAD_SEARCH_DOWNLOAD_REQUEST__';
  const searchDownloadResponse = '__DOWNLOAD_SEARCH_DOWNLOAD_RESPONSE__';

  const isTikTokVideoUrl = (value) => {
    try {
      const url = new URL(value, location.origin);
      return url.protocol === 'https:'
        && /(^|\.)tiktok\.com$/i.test(url.hostname)
        && /\/video\/\d+/.test(url.pathname);
    } catch {
      return false;
    }
  };

  window.addEventListener('message', function handleSearchBridgeMessage(event) {
    if (event.source !== window) return;

    const message = event.data;
    if (!message || message.channel !== 'download') return;
    if (typeof message.requestId !== 'string' || message.requestId.length > 128) return;
    if (!isTikTokVideoUrl(message.url)) return;

    if (!licenseKnown && (message.type === searchDownloadRequest || message.type === searchPipRequest)) {
      whenLicenseKnown(() => handleSearchBridgeMessage(event));
      return;
    }

    if (!extensionLicensed && (message.type === searchDownloadRequest || message.type === searchPipRequest)) {
      window.postMessage({
        channel: 'download',
        type: message.type === searchDownloadRequest ? searchDownloadResponse : searchPipResponse,
        requestId: message.requestId,
        success: false,
        data: null,
        error: 'license_required',
      }, location.origin);
      return;
    }

    if (message.type === searchDownloadRequest) {
      sendRuntimeMessage(
        { type: 'TIKTOK_DOWNLOAD', url: message.url },
        (result, runtimeError) => {
          window.postMessage({
            channel: 'download',
            type: searchDownloadResponse,
            requestId: message.requestId,
            success: Boolean(result?.success),
            error: runtimeError || result?.error || 'download_unavailable',
          }, location.origin);
        },
      );
      return;
    }

    if (message.type !== searchPipRequest) return;

    sendRuntimeMessage(
      { type: 'GET_TIKTOK_METADATA', url: message.url },
      (result, runtimeError) => {
        const data = result?.success && result.data?.videoUrl
          ? {
              videoUrl: String(result.data.videoUrl),
              coverUrl: typeof result.data.coverUrl === 'string' ? result.data.coverUrl : '',
              title: typeof result.data.title === 'string' ? result.data.title : '',
            }
          : null;

        window.postMessage({
          channel: 'download',
          type: searchPipResponse,
          requestId: message.requestId,
          success: Boolean(data),
          data,
          error: runtimeError || result?.error || 'video_stream_unavailable',
        }, location.origin);
      },
    );
  });

  // The MAIN-world hook waits for this before starting a requested player in
  // the reusable popup window, so its metadata request never races this bridge.
  window.dispatchEvent(new CustomEvent('__DOWNLOAD_PLAYER_BRIDGE_READY__'));

  // "Luôn hiển thị trên cùng" (popup.html -> chrome.storage.local). The
  // MAIN-world hook cannot read chrome.storage, so the current value is relayed
  // to it with a CustomEvent: once at startup and again on every change, which
  // makes toggling the option in the popup take effect immediately.
  const PLAYER_ALWAYS_ON_TOP_KEY = 'playerAlwaysOnTop';
  let playerAlwaysOnTopCache = null;
  const sendPlayerAlwaysOnTop = (enabled) => {
    playerAlwaysOnTopCache = enabled === true;
    try {
      window.dispatchEvent(new CustomEvent('__DOWNLOAD_PLAYER_ALWAYS_ON_TOP__', {
        detail: { enabled: extensionLicensed && playerAlwaysOnTopCache },
      }));
    } catch {}
  };
  try {
    storageGet(PLAYER_ALWAYS_ON_TOP_KEY, (res) => {
      sendPlayerAlwaysOnTop(res && res[PLAYER_ALWAYS_ON_TOP_KEY] === true);
    });
    onStorageChanged((changes, area) => {
      if (area === 'local' && changes[PLAYER_ALWAYS_ON_TOP_KEY]) {
        sendPlayerAlwaysOnTop(changes[PLAYER_ALWAYS_ON_TOP_KEY].newValue === true);
      }
    });
    window.addEventListener('__DOWNLOAD_PLAYER_ALWAYS_ON_TOP_REQUEST__', () => {
      if (playerAlwaysOnTopCache !== null) sendPlayerAlwaysOnTop(playerAlwaysOnTopCache);
    });
  } catch {}

  // "Menu chuột phải thư mục con" (popup.html -> chrome.storage.local).  Same
  // relay as the option above: the MAIN-world hook needs the value
  // synchronously inside a contextmenu handler on the player windows (the
  // always-on-top player and the dedicated player window), so it keeps the
  // latest one.  The hook also asks for it once on load (REQUEST event), in
  // case it started after the first send.
  const SUBFOLDER_CONTEXT_MENU_KEY = 'subfolderContextMenu';
  let subfolderContextMenuCache = null;
  const sendSubfolderContextMenu = (enabled) => {
    subfolderContextMenuCache = enabled === true;
    try {
      window.dispatchEvent(new CustomEvent('__DOWNLOAD_SUBFOLDER_CONTEXT_MENU__', {
        detail: { enabled: extensionLicensed && subfolderContextMenuCache },
      }));
    } catch {}
  };
  try {
    storageGet(SUBFOLDER_CONTEXT_MENU_KEY, (res) => {
      sendSubfolderContextMenu(res && res[SUBFOLDER_CONTEXT_MENU_KEY] === true);
    });
    onStorageChanged((changes, area) => {
      if (area === 'local' && changes[SUBFOLDER_CONTEXT_MENU_KEY]) {
        sendSubfolderContextMenu(changes[SUBFOLDER_CONTEXT_MENU_KEY].newValue === true);
      }
    });
    window.addEventListener('__DOWNLOAD_SUBFOLDER_CONTEXT_MENU_REQUEST__', () => {
      if (subfolderContextMenuCache !== null) sendSubfolderContextMenu(subfolderContextMenuCache);
    });
  } catch {}

  // "Preview khi rê chuột vào video" (popup.html -> chrome.storage.local, off by
  // default).  Same relay as the option above: the MAIN-world hook cannot read
  // chrome.storage, so it gets the latest value through a CustomEvent - at
  // startup, on every change, and whenever it asks again (REQUEST event).
  const HOVER_PREVIEW_KEY = 'hoverPreview';
  let hoverPreviewCache = null;
  const sendHoverPreview = (enabled) => {
    hoverPreviewCache = enabled === true;
    try {
      window.dispatchEvent(new CustomEvent('__DOWNLOAD_HOVER_PREVIEW__', {
        detail: { enabled: extensionLicensed && hoverPreviewCache },
      }));
    } catch {}
  };
  try {
    storageGet(HOVER_PREVIEW_KEY, (res) => {
      sendHoverPreview(res && res[HOVER_PREVIEW_KEY] === true);
    });
    onStorageChanged((changes, area) => {
      if (area === 'local' && changes[HOVER_PREVIEW_KEY]) {
        sendHoverPreview(changes[HOVER_PREVIEW_KEY].newValue === true);
      }
    });
    window.addEventListener('__DOWNLOAD_HOVER_PREVIEW_REQUEST__', () => {
      if (hoverPreviewCache !== null) sendHoverPreview(hoverPreviewCache);
    });
  } catch {}

  // "Tự động cân bằng âm lượng" (popup.html -> chrome.storage.local). The
  // MAIN-world hook owns the page's <video> elements, so it receives the
  // current setting here at startup and whenever it changes. This is separate
  // from TikTok's own remembered volume: when enabled, the chosen percentage is
  // enforced for every current and newly-created video in the tab.
  const VOLUME_BALANCE_KEY = 'volumeBalanceSettings';
  const VOLUME_BALANCE_MIN = 0;
  const VOLUME_BALANCE_MAX = 200;
  const VOLUME_BALANCE_DEFAULT = 100;
  let volumeBalanceCache = null;

  const cleanVolumeBalanceSettings = (raw) => {
    const src = raw && typeof raw === 'object' ? raw : {};
    const number = Math.round(Number(src.level));
    return {
      enabled: src.enabled === true,
      level: Number.isFinite(number)
        ? Math.max(VOLUME_BALANCE_MIN, Math.min(VOLUME_BALANCE_MAX, number))
        : VOLUME_BALANCE_DEFAULT,
    };
  };

  const sendVolumeBalanceSettings = (raw) => {
    volumeBalanceCache = cleanVolumeBalanceSettings(raw);
    const effectiveSettings = {
      ...volumeBalanceCache,
      enabled: extensionLicensed && volumeBalanceCache.enabled === true,
    };
    try {
      // A DOM attribute is readable from the MAIN world too, unlike JavaScript
      // globals created by an isolated content script. It makes the setting
      // available to closed-shadow previews and Document PiP media elements.
      document.documentElement.setAttribute(
        'data-download-volume-balance',
        JSON.stringify(effectiveSettings),
      );
      window.dispatchEvent(new CustomEvent('__DOWNLOAD_VOLUME_BALANCE__', {
        detail: effectiveSettings,
      }));
      window.dispatchEvent(new Event('__DOWNLOAD_VOLUME_BALANCE_SYNC__'));
    } catch {}
  };

  try {
    storageGet(VOLUME_BALANCE_KEY, (res) => {
      sendVolumeBalanceSettings(res && res[VOLUME_BALANCE_KEY]);
    });
    onStorageChanged((changes, area) => {
      if (area === 'local' && changes[VOLUME_BALANCE_KEY]) {
        sendVolumeBalanceSettings(changes[VOLUME_BALANCE_KEY].newValue);
      }
    });
    window.addEventListener('__DOWNLOAD_VOLUME_BALANCE_REQUEST__', () => {
      if (volumeBalanceCache !== null) sendVolumeBalanceSettings(volumeBalanceCache);
    });
  } catch {}

  // Player window size / position memory.  The MAIN-world hook reports the size
  // and position the user gave the popup player / always-on-top PiP player and
  // asks for them again on the next open; they are kept in chrome.storage.local
  // so they survive closing the browser.  Shape: { win|pip: { x, y, max, last,
  // sizes: { portrait|square|landscape: { w, h } } } }.
  // win only: mx / my = where the window was while it filled the work area (maximized), so it comes back on the same
  // monitor.
  const PLAYER_BOUNDS_KEY = 'playerWindowBounds';
  const PLAYER_BOUNDS_MODES = ['win', 'pip'];
  const PLAYER_BOUNDS_SHAPES = ['portrait', 'square', 'landscape'];
  let playerBoundsCache = null;

  const inRange = (value, min, max) =>
    typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;

  const sendPlayerBounds = (bounds) => {
    try {
      window.dispatchEvent(new CustomEvent('__DOWNLOAD_PLAYER_BOUNDS__', {
        detail: { json: JSON.stringify(bounds && typeof bounds === 'object' ? bounds : {}) },
      }));
    } catch {}
  };

  const mergePlayerBounds = (all, patch) => {
    const next = { ...(all && typeof all === 'object' ? all : {}) };
    const rec = { ...(next[patch.mode] && typeof next[patch.mode] === 'object' ? next[patch.mode] : {}) };
    rec.sizes = { ...(rec.sizes && typeof rec.sizes === 'object' ? rec.sizes : {}) };
    if (PLAYER_BOUNDS_SHAPES.includes(patch.shape) && inRange(patch.w, 120, 10000) && inRange(patch.h, 80, 10000)) {
      rec.sizes[patch.shape] = { w: Math.round(patch.w), h: Math.round(patch.h) };
      rec.last = patch.shape;
    }
    if (inRange(patch.x, -20000, 20000) && inRange(patch.y, -20000, 20000)) {
      rec.x = Math.round(patch.x);
      rec.y = Math.round(patch.y);
    }
    if (inRange(patch.mx, -20000, 20000) && inRange(patch.my, -20000, 20000)) {
      rec.mx = Math.round(patch.mx);
      rec.my = Math.round(patch.my);
    }
    if (typeof patch.max === 'boolean') rec.max = patch.max;
    next[patch.mode] = rec;
    return next;
  };

  try {
    storageGet(PLAYER_BOUNDS_KEY, (res) => {
      playerBoundsCache = (res && res[PLAYER_BOUNDS_KEY]) || {};
      sendPlayerBounds(playerBoundsCache);
    });
    onStorageChanged((changes, area) => {
      if (area === 'local' && changes[PLAYER_BOUNDS_KEY]) {
        playerBoundsCache = changes[PLAYER_BOUNDS_KEY].newValue || {};
        sendPlayerBounds(playerBoundsCache);
      }
    });
    window.addEventListener('__DOWNLOAD_PLAYER_BOUNDS_REQUEST__', () => {
      if (playerBoundsCache) sendPlayerBounds(playerBoundsCache);
    });
    window.addEventListener('__DOWNLOAD_PLAYER_BOUNDS_SAVE__', (event) => {
      let patch = null;
      try { patch = JSON.parse(event && event.detail && event.detail.json); } catch {}
      if (!patch || !PLAYER_BOUNDS_MODES.includes(patch.mode)) return;
      if (playerBoundsCache) {
        playerBoundsCache = mergePlayerBounds(playerBoundsCache, patch);
        storageSet({ [PLAYER_BOUNDS_KEY]: playerBoundsCache });
      } else {
        storageGet(PLAYER_BOUNDS_KEY, (res) => {
          playerBoundsCache = mergePlayerBounds(res && res[PLAYER_BOUNDS_KEY], patch);
          storageSet({ [PLAYER_BOUNDS_KEY]: playerBoundsCache });
        });
      }
    });
  } catch {}

  // "Chia đoạn" (panel "Video đã chọn" -> chrome.storage.local).  Same relay as the
  // options above: multi-select.js (ISOLATED world, search tab) stores
  // { enabled, count, cols } and the MAIN-world hook, which draws the segment
  // popup inside the player windows, gets it with a CustomEvent at startup, on
  // request and on every change.  The popup's place (x / y = fraction of the room
  // left in the player window, per player: win | pip) is kept here too, so it
  // survives closing the browser and restarting the computer.
  const PLAYER_SEGMENTS_KEY = 'playerSegmentSettings';
  const PLAYER_SEGMENT_POS_KEY = 'playerSegmentPos';
  const SEGMENT_COUNT_MIN = 2;
  const SEGMENT_COUNT_MAX = 20;
  const SEGMENT_COLS_MIN = 1;
  const SEGMENT_COLS_MAX = 4;
  let segmentSettingsCache = null;
  let segmentPosCache = null;

  const clampSegmentInt = (value, min, max, fallback) => {
    const n = Math.round(Number(value));
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  };

  const cleanSegmentSettings = (raw) => {
    const src = raw && typeof raw === 'object' ? raw : {};
    return {
      enabled: src.enabled === true,
      count: clampSegmentInt(src.count, SEGMENT_COUNT_MIN, SEGMENT_COUNT_MAX, 15),
      cols: clampSegmentInt(src.cols, SEGMENT_COLS_MIN, SEGMENT_COLS_MAX, 3),
    };
  };

  const cleanSegmentPos = (raw) => {
    const out = {};
    for (const mode of PLAYER_BOUNDS_MODES) {
      const rec = raw && typeof raw === 'object' ? raw[mode] : null;
      if (rec && inRange(rec.x, 0, 1) && inRange(rec.y, 0, 1)) out[mode] = { x: rec.x, y: rec.y };
    }
    return out;
  };

  const sendSegmentSettings = (raw) => {
    segmentSettingsCache = cleanSegmentSettings(raw);
    try {
      window.dispatchEvent(new CustomEvent('__DOWNLOAD_PLAYER_SEGMENTS__', {
        detail: { json: JSON.stringify(segmentSettingsCache) },
      }));
    } catch {}
  };

  const sendSegmentPos = (raw) => {
    segmentPosCache = cleanSegmentPos(raw);
    try {
      window.dispatchEvent(new CustomEvent('__DOWNLOAD_PLAYER_SEGMENT_POS__', {
        detail: { json: JSON.stringify(segmentPosCache) },
      }));
    } catch {}
  };

  const mergeSegmentPos = (all, patch) => ({
    ...cleanSegmentPos(all),
    [patch.mode]: {
      x: Math.round(patch.x * 10000) / 10000,
      y: Math.round(patch.y * 10000) / 10000,
    },
  });

  try {
    storageGet([PLAYER_SEGMENTS_KEY, PLAYER_SEGMENT_POS_KEY], (res) => {
      sendSegmentSettings(res && res[PLAYER_SEGMENTS_KEY]);
      sendSegmentPos(res && res[PLAYER_SEGMENT_POS_KEY]);
    });
    onStorageChanged((changes, area) => {
      if (area !== 'local') return;
      if (changes[PLAYER_SEGMENTS_KEY]) sendSegmentSettings(changes[PLAYER_SEGMENTS_KEY].newValue);
      if (changes[PLAYER_SEGMENT_POS_KEY]) sendSegmentPos(changes[PLAYER_SEGMENT_POS_KEY].newValue);
    });
    window.addEventListener('__DOWNLOAD_PLAYER_SEGMENTS_REQUEST__', () => {
      if (segmentSettingsCache) sendSegmentSettings(segmentSettingsCache);
    });
    window.addEventListener('__DOWNLOAD_PLAYER_SEGMENT_POS_REQUEST__', () => {
      if (segmentPosCache) sendSegmentPos(segmentPosCache);
    });
    // The popup's × turns the feature off; count / cols stay as they were.
    window.addEventListener('__DOWNLOAD_PLAYER_SEGMENTS_SAVE__', (event) => {
      let patch = null;
      try { patch = JSON.parse(event && event.detail && event.detail.json); } catch {}
      if (!patch || typeof patch.enabled !== 'boolean') return;
      segmentSettingsCache = { ...(segmentSettingsCache || cleanSegmentSettings(null)), enabled: patch.enabled };
      storageSet({ [PLAYER_SEGMENTS_KEY]: segmentSettingsCache });
    });
    window.addEventListener('__DOWNLOAD_PLAYER_SEGMENT_POS_SAVE__', (event) => {
      let patch = null;
      try { patch = JSON.parse(event && event.detail && event.detail.json); } catch {}
      if (!patch || !PLAYER_BOUNDS_MODES.includes(patch.mode)) return;
      if (!inRange(patch.x, 0, 1) || !inRange(patch.y, 0, 1)) return;
      if (segmentPosCache) {
        segmentPosCache = mergeSegmentPos(segmentPosCache, patch);
        storageSet({ [PLAYER_SEGMENT_POS_KEY]: segmentPosCache });
      } else {
        storageGet(PLAYER_SEGMENT_POS_KEY, (res) => {
          segmentPosCache = mergeSegmentPos(res && res[PLAYER_SEGMENT_POS_KEY], patch);
          storageSet({ [PLAYER_SEGMENT_POS_KEY]: segmentPosCache });
        });
      }
    });
  } catch {}

  // "Chia đoạn" as its own popup window (phase 1).  The MAIN-world hook cannot
  // call chrome.runtime.sendMessage, so it asks for the window with a
  // CustomEvent and this relay forwards it to the background script, which
  // opens / reloads / closes segments.html next to the player and keeps it
  // docked there ("move").  The other way round, a click on a segment in that
  // window comes back as a runtime message and is handed to the hook with a
  // CustomEvent.  Everything is validated here again: the page (MAIN world) is
  // not trusted.
  try {
    const SEGMENT_WINDOW_EVENT = '__DOWNLOAD_SEGMENT_WINDOW__';
    const SEGMENT_WINDOW_OPS = ['open', 'update', 'move', 'close'];
    const SEGMENT_WINDOW_MODES = ['pip', 'win'];
    const segmentWindowInt = (value, min, max, fallback) => {
      const n = Math.round(Number(value));
      return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
    };
    const cleanSegmentAnchor = (raw) => {
      if (!raw || typeof raw !== 'object') return null;
      const out = {};
      for (const name of ['x', 'y', 'w', 'h', 'al', 'at', 'aw', 'ah']) {
        const n = Math.round(Number(raw[name]));
        if (!Number.isFinite(n) || Math.abs(n) > 100000) return null;
        out[name] = n;
      }
      return out.w > 0 && out.h > 0 ? out : null;
    };
    window.addEventListener(SEGMENT_WINDOW_EVENT, (event) => {
      let data = null;
      try { data = JSON.parse(event && event.detail && event.detail.json); } catch {}
      if (!data || typeof data !== 'object') return;
      if (!SEGMENT_WINDOW_OPS.includes(data.op) || !SEGMENT_WINDOW_MODES.includes(data.mode)) return;
      const message = { type: '__DOWNLOAD_SEGMENT_WINDOW__', op: data.op, mode: data.mode };
      if (data.op === 'move') {
        const moved = cleanSegmentAnchor(data.anchor);
        if (!moved) return;
        message.anchor = moved;
      } else if (data.op !== 'close') {
        const src = typeof data.src === 'string' ? data.src : '';
        if (!/^https:\/\//i.test(src) || src.length > 4000) return;
        message.src = src;
        message.count = segmentWindowInt(data.count, 2, 20, 15);
        message.cols = segmentWindowInt(data.cols, 1, 4, 3);
        const anchor = cleanSegmentAnchor(data.anchor);
        if (anchor) message.anchor = anchor;
      }
      sendRuntimeMessage(message, () => {});
    });
    // A click on a segment of the window (background.js -> here -> hook).
    chrome.runtime.onMessage.addListener((message, sender) => {
      if (!message || message.type !== '__DOWNLOAD_SEGMENT_SEEK__') return false;
      if (!sender || sender.id !== chrome.runtime.id || sender.tab) return false;
      if (!SEGMENT_WINDOW_MODES.includes(message.mode)) return false;
      const count = Number(message.count);
      const index = Number(message.index);
      if (!Number.isInteger(count) || !Number.isInteger(index) || count < 2 || count > 20 || index < 0 || index >= count) return false;
      try {
        window.dispatchEvent(new CustomEvent('__DOWNLOAD_SEGMENT_SEEK__', {
          detail: { json: JSON.stringify({ mode: message.mode, index, count }) },
        }));
      } catch {}
      return false;
    });
  } catch {}

  // Player window placement across displays.  The MAIN-world hook cannot call chrome.*, and window.moveTo() / window.open()
  // are held to one display, so it asks (CustomEvent) for the saved place of the dedicated player window or of the
  // always-on-top player to be applied with chrome.windows.update() in background.js, and gets the answer back the same
  // way.  Everything is validated here again: the page (MAIN world) is not trusted.
  try {
    const PLAYER_PLACE_EVENT = '__DOWNLOAD_PLAYER_PLACE__';
    const PLAYER_PLACED_EVENT = '__DOWNLOAD_PLAYER_PLACED__';
    const placeInt = (value, min, max) => {
      const n = Math.round(Number(value));
      return Number.isFinite(n) && n >= min && n <= max ? n : null;
    };
    const answerPlacement = (id, ok) => {
      try {
        window.dispatchEvent(new CustomEvent(PLAYER_PLACED_EVENT, { detail: { json: JSON.stringify({ id, ok }) } }));
      } catch {}
    };
    window.addEventListener(PLAYER_PLACE_EVENT, (event) => {
      let data = null;
      try { data = JSON.parse(event && event.detail && event.detail.json); } catch {}
      if (!data || typeof data !== 'object' || !PLAYER_BOUNDS_MODES.includes(data.mode)) return;
      const id = placeInt(data.id, 0, 1e9);
      const x = placeInt(data.x, -30000, 30000);
      const y = placeInt(data.y, -30000, 30000);
      if (id === null || x === null || y === null) return;
      const message = { type: '__DOWNLOAD_PLAYER_PLACE__', mode: data.mode, x, y, fill: data.fill === true };
      const w = placeInt(data.w, 120, 20000);
      const h = placeInt(data.h, 80, 20000);
      if (w !== null && h !== null) {
        message.w = w;
        message.h = h;
      }
      const cx = placeInt(data.cx, -30000, 30000);
      const cy = placeInt(data.cy, -30000, 30000);
      if (cx !== null && cy !== null) {
        message.cx = cx;
        message.cy = cy;
      }
      sendRuntimeMessage(message, (result, runtimeError) => {
        answerPlacement(id, !runtimeError && !!result && result.ok === true);
      });
    });
  } catch {}

  function loadExtensionUi() {
    if (!extensionLicensed || extensionUiLoaded) return;
    extensionUiLoaded = true;
    (async () => {
      const { onExecute } = await import(
        /* @vite-ignore */
        chrome.runtime.getURL("assets/tiktok-content.js")
      );
      onExecute?.({ perf: { injectTime, loadTime: performance.now() - injectTime } });
    })().catch((error) => {
      extensionUiLoaded = false;
      console.error(error);
    });
  }

})();
