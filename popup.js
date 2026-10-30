(function () {
  'use strict';

  const toast = document.getElementById('savedToast');
  let toastTimer = null;
  const settingsArea = document.getElementById('settingsArea');
  const licenseDot = document.getElementById('licenseStateDot');
  const licenseMessage = document.getElementById('licenseMessage');
  const licenseMeta = document.getElementById('licenseMeta');
  const licenseKey = document.getElementById('licenseKey');
  const licenseActivate = document.getElementById('licenseActivate');
  const licenseCheck = document.getElementById('licenseCheck');
  const licenseNotice = document.getElementById('licenseNotice');
  const licenseBusy = document.getElementById('licenseBusy');
  let settingsUnlocked = false;
  let currentKeyHint = '';   // key đang lưu (dạng rút gọn), dùng để báo "thay key cũ"
  let noticeTimer = null;

  function showSavedToast() {
    if (!toast) return;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1200);
  }

  function showLicenseNotice(text, kind) {
    if (!licenseNotice) return;
    clearTimeout(noticeTimer);
    licenseNotice.textContent = text || '';
    licenseNotice.className = 'license-notice' + (kind === 'error' ? ' error' : '');
    licenseNotice.hidden = !text;
    if (text) noticeTimer = setTimeout(() => { licenseNotice.hidden = true; }, 8000);
  }

  function sendLicenseMessage(type, extra) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type, ...(extra || {}) }, (result) => {
          const error = chrome.runtime.lastError;
          if (error) {
            resolve({ ok: false, message: 'Không thể liên lạc với tiện ích. Hãy đóng và mở lại popup.' });
            return;
          }
          resolve(result && typeof result === 'object' ? result : { ok: false, message: 'Không nhận được phản hồi hợp lệ.' });
        });
      } catch {
        resolve({ ok: false, message: 'Không thể liên lạc với tiện ích. Hãy mở lại popup.' });
      }
    });
  }

  function formatExpiry(status) {
    const timestamp = Number(status && status.expire_at_ts);
    if (!Number.isFinite(timestamp) || timestamp <= 0) return '';
    const date = new Date(timestamp * 1000);
    const dateText = Number.isNaN(date.getTime()) ? '' : date.toLocaleString('vi-VN');
    const remaining = Math.max(0, Number(status.remaining_seconds) || 0);
    const leftText = remaining >= 86400
      ? 'Còn ' + Math.floor(remaining / 86400) + ' ngày'
      : remaining > 0 ? 'Còn dưới 1 ngày' : '';
    return [dateText ? 'Hạn dùng: ' + dateText : '', leftText].filter(Boolean).join(' · ');
  }

  function paintLicenseStatus(status, fallbackMessage) {
    const active = !!(status && status.licensed === true);
    settingsUnlocked = active;
    if (settingsArea) settingsArea.disabled = !active;
    if (licenseDot) licenseDot.className = 'license-state-dot' + (active ? ' active' : ' error');
    if (licenseMessage) {
      licenseMessage.textContent = active
        ? 'Bản quyền hợp lệ' + (status.key_hint ? ': Key ' + status.key_hint : '')
        : (fallbackMessage || status?.message || 'Chưa kích hoạt key. Các tính năng đang bị khóa.');
    }
    const expiry = active ? formatExpiry(status) : '';
    if (licenseMeta) {
      licenseMeta.textContent = expiry;
      licenseMeta.hidden = !expiry;
    }
    currentKeyHint = (status && status.key_hint) || '';
    if (licenseActivate) licenseActivate.textContent = active ? 'Dùng key mới' : 'Kích hoạt';
  }

  function setLicenseBusy(busy) {
    if (licenseBusy) licenseBusy.hidden = !busy;
    for (const control of [licenseKey, licenseActivate, licenseCheck]) {
      if (control) control.disabled = busy;
    }
  }

  async function refreshLicenseStatus() {
    const result = await sendLicenseMessage('LICENSE_REVALIDATE');
    if (result.status) {
      // A short network outage may leave a still-valid signed offline cache.
      // Keep it usable, but never override a signed server revocation.
      paintLicenseStatus(result.status, result.status.licensed ? '' : (result.message || 'Không thể kiểm tra bản quyền.'));
    } else {
      paintLicenseStatus(null, result.message || 'Không thể kiểm tra bản quyền. Các tính năng đang bị khóa.');
    }
  }

  async function activateLicense() {
    const key = String(licenseKey?.value || '').trim();
    if (!key) {
      paintLicenseStatus(null, 'Nhập key bản quyền trước khi kích hoạt.');
      licenseKey?.focus();
      return;
    }
    const oldHint = currentKeyHint;
    showLicenseNotice('');
    setLicenseBusy(true);
    const result = await sendLicenseMessage('LICENSE_ACTIVATE', { key });
    setLicenseBusy(false);
    paintLicenseStatus(result.status || null, result.ok ? '' : (result.message || 'Không thể kích hoạt key.'));
    if (result.ok) {
      licenseKey.value = '';
      showSavedToast();
      const newHint = (result.status && result.status.key_hint) || '';
      if (oldHint && newHint && oldHint !== newHint) {
        showLicenseNotice('Đã thay key cũ (' + oldHint + ') bằng key mới (' + newHint + ').');
      } else if (oldHint && newHint) {
        showLicenseNotice('Key này đang được dùng, đã làm mới bản quyền.');
      } else {
        showLicenseNotice('Kích hoạt key thành công.');
      }
    } else {
      showLicenseNotice(
        (result.message || 'Không thể kích hoạt key.') + (oldHint ? ' Key cũ (' + oldHint + ') vẫn được giữ nguyên.' : ''),
        'error'
      );
    }
  }

  licenseActivate?.addEventListener('click', activateLicense);
  licenseKey?.addEventListener('input', () => {
    licenseKey.value = licenseKey.value.toUpperCase().replace(/\s+/g, '');
  });
  licenseKey?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      activateLicense();
    }
  });
  licenseCheck?.addEventListener('click', async () => {
    setLicenseBusy(true);
    const result = await sendLicenseMessage('LICENSE_CHECK');
    setLicenseBusy(false);
    paintLicenseStatus(result.status || null, result.ok ? '' : (result.message || 'Không thể kiểm tra key.'));
  });

  refreshLicenseStatus();

  // Wires a <input type="checkbox" id="..."> switch to a boolean key in
  // chrome.storage.local: loads the current value on open, persists on
  // change, and stays in sync if the same key changes elsewhere.
  function bindToggle(elementId, storageKey) {
    const toggle = document.getElementById(elementId);
    if (!toggle) return;

    chrome.storage.local.get(storageKey, (result) => {
      toggle.checked = result && result[storageKey] === true;
    });

    toggle.addEventListener('change', () => {
      if (!settingsUnlocked) {
        chrome.storage.local.get(storageKey, (result) => {
          toggle.checked = result && result[storageKey] === true;
        });
        return;
      }
      chrome.storage.local.set({ [storageKey]: toggle.checked }, () => {
        showSavedToast();
      });
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes[storageKey]) {
        toggle.checked = changes[storageKey].newValue === true;
      }
    });
  }

  bindToggle('askWhereToSave', 'askWhereToSave');
  bindToggle('advancedFolderMode', 'advancedFolderMode');
  bindToggle('playerAlwaysOnTop', 'playerAlwaysOnTop');
  bindToggle('subfolderContextMenu', 'subfolderContextMenu');
  bindToggle('autoPasteClipboard', 'autoPasteClipboard');
  bindToggle('hoverPreview', 'hoverPreview');

  // ---------- Mở app sửa video (Native Messaging) ----------
  // Chrome does not disclose the full path behind a FileSystemDirectoryHandle.
  // The root folder is simply the folder picked in "Video đã chọn": multi-select
  // finds its real path through the Native Host (or asks the user to type it)
  // and stores it here; this popup only shows it.
  const EDITOR_SETTINGS_KEY = 'editorBridgeSettings';
  const editorEnabled = document.getElementById('editorBridgeEnabled');
  const editorAppPath = document.getElementById('editorAppPath');
  const editorBrowseApp = document.getElementById('editorBrowseApp');
  const editorCheckApp = document.getElementById('editorCheckApp');
  const editorRootText = document.getElementById('editorRootText');
  const editorStatus = document.getElementById('editorBridgeStatus');

  function editorText(value, max = 4096) {
    return typeof value === 'string' ? value.trim().slice(0, max) : '';
  }

  function readEditorSettings(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    return {
      enabled: src.enabled === true,
      appPath: editorText(src.appPath),
      rootPath: editorText(src.rootPath),
      rootName: editorText(src.rootName, 255),
      rootToken: editorText(src.rootToken, 128),
    };
  }

  let editorState = readEditorSettings(null);

  function setEditorStatus(message, kind) {
    if (!editorStatus) return;
    editorStatus.textContent = message || '';
    editorStatus.className = 'editor-status' + (kind ? ' ' + kind : '');
  }

  function paintEditorSettings() {
    if (editorEnabled) editorEnabled.checked = editorState.enabled;
    if (editorAppPath && document.activeElement !== editorAppPath) editorAppPath.value = editorState.appPath;
    if (editorRootText) {
      if (editorState.rootPath && editorState.rootName) {
        editorRootText.innerHTML = 'Thư mục gốc cho app: <strong></strong>';
        const strong = editorRootText.querySelector('strong');
        if (strong) {
          strong.textContent = editorState.rootName;
          strong.title = editorState.rootPath;
        }
        editorRootText.title = editorState.rootPath;
      } else {
        editorRootText.textContent = 'Chưa xác định thư mục gốc cho app sửa video.';
        editorRootText.removeAttribute('title');
      }
    }
  }

  function saveEditorSettings(next, notify = true) {
    if (!settingsUnlocked) {
      paintEditorSettings();
      return;
    }
    editorState = readEditorSettings(next);
    paintEditorSettings();
    chrome.storage.local.set({ [EDITOR_SETTINGS_KEY]: editorState }, () => {
      if (notify) showSavedToast();
    });
  }

  function sendEditorMessage(type, extra) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type, ...(extra || {}) }, (result) => {
          const error = chrome.runtime.lastError;
          if (error) {
            resolve({ success: false, message: 'Không thể liên lạc với tiện ích. Hãy mở lại popup.' });
            return;
          }
          resolve(result && typeof result === 'object'
            ? result
            : { success: false, message: 'Không nhận được phản hồi hợp lệ.' });
        });
      } catch {
        resolve({ success: false, message: 'Không thể liên lạc với tiện ích.' });
      }
    });
  }

  function setEditorBusy(busy) {
    if (editorBrowseApp) editorBrowseApp.disabled = busy;
    if (editorCheckApp) editorCheckApp.disabled = busy;
  }

  chrome.storage.local.get(EDITOR_SETTINGS_KEY, (result) => {
    editorState = readEditorSettings(result && result[EDITOR_SETTINGS_KEY]);
    paintEditorSettings();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[EDITOR_SETTINGS_KEY]) {
      editorState = readEditorSettings(changes[EDITOR_SETTINGS_KEY].newValue);
      paintEditorSettings();
    }
  });

  editorEnabled?.addEventListener('change', () => {
    saveEditorSettings({ ...editorState, enabled: editorEnabled.checked });
  });

  editorAppPath?.addEventListener('input', () => setEditorStatus(''));
  editorAppPath?.addEventListener('change', () => {
    saveEditorSettings({ ...editorState, appPath: editorText(editorAppPath.value) });
  });

  editorBrowseApp?.addEventListener('click', async () => {
    setEditorBusy(true);
    setEditorStatus('Chọn file .exe hoặc .py trong hộp thoại Windows…');
    const result = await sendEditorMessage('EDITOR_BRIDGE_PICK_APP');
    setEditorBusy(false);
    if (result.cancelled) {
      setEditorStatus('');
      return;
    }
    if (result.success && result.path) {
      saveEditorSettings({ ...editorState, appPath: result.path });
      setEditorStatus('✓ Đã lưu app ' + (result.kind === 'py' ? 'Python.' : 'EXE.'), 'ok');
    } else {
      setEditorStatus(result.message || 'Không chọn được file app.', 'error');
    }
  });

  editorCheckApp?.addEventListener('click', async () => {
    const appPath = editorText(editorAppPath?.value);
    if (!appPath) {
      setEditorStatus('Nhập đường dẫn đầy đủ đến file .exe hoặc .py trước.', 'error');
      editorAppPath?.focus();
      return;
    }
    saveEditorSettings({ ...editorState, appPath }, false);
    setEditorBusy(true);
    setEditorStatus('Đang kiểm tra app…');
    const result = await sendEditorMessage('EDITOR_BRIDGE_CHECK_APP', { appPath });
    setEditorBusy(false);
    if (result.success) {
      setEditorStatus('✓ Đã nhận app ' + (result.kind === 'py' ? 'Python' : 'EXE') + '.', 'ok');
    } else {
      setEditorStatus(result.message || 'Không kiểm tra được app.', 'error');
    }
  });

  // ---------- Tự động cân bằng âm lượng ----------
  // This object is relayed to every TikTok tab by assets/tiktok-loader.js.
  // Keeping the level even while disabled lets the user prepare a value before
  // turning the global volume lock on.
  const VOLUME_BALANCE_KEY = 'volumeBalanceSettings';
  const VOLUME_MIN = 0;
  const VOLUME_MAX = 200;
  const VOLUME_DEFAULT = 100;

  const volumeEnabled = document.getElementById('volumeBalanceEnabled');
  const volumeRange = document.getElementById('volumeBalanceRange');
  const volumeValue = document.getElementById('volumeBalanceValue');
  const volumeControls = document.getElementById('volumeBalanceControls');

  function cleanVolumeLevel(value, fallback = VOLUME_DEFAULT) {
    const n = Math.round(Number(value));
    return Number.isFinite(n) ? Math.max(VOLUME_MIN, Math.min(VOLUME_MAX, n)) : fallback;
  }

  function readVolumeSettings(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    return {
      enabled: src.enabled === true,
      level: cleanVolumeLevel(src.level),
    };
  }

  let volumeState = readVolumeSettings(null);

  function paintVolumeSettings() {
    volumeEnabled.checked = volumeState.enabled;
    volumeControls.setAttribute('aria-disabled', String(!volumeState.enabled));
    volumeRange.disabled = !volumeState.enabled;
    volumeValue.disabled = !volumeState.enabled;
    if (document.activeElement !== volumeRange) volumeRange.value = String(volumeState.level);
    // Do not replace text while the user is typing a manual value.
    if (document.activeElement !== volumeValue) volumeValue.value = String(volumeState.level);
  }

  function saveVolumeSettings(next, notify = true) {
    if (!settingsUnlocked) {
      paintVolumeSettings();
      return;
    }
    volumeState = readVolumeSettings(next);
    paintVolumeSettings();
    chrome.storage.local.set({ [VOLUME_BALANCE_KEY]: volumeState }, () => {
      if (notify) showSavedToast();
    });
  }

  chrome.storage.local.get(VOLUME_BALANCE_KEY, (result) => {
    volumeState = readVolumeSettings(result && result[VOLUME_BALANCE_KEY]);
    paintVolumeSettings();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[VOLUME_BALANCE_KEY]) {
      volumeState = readVolumeSettings(changes[VOLUME_BALANCE_KEY].newValue);
      paintVolumeSettings();
    }
  });

  volumeEnabled.addEventListener('change', () => {
    saveVolumeSettings({ ...volumeState, enabled: volumeEnabled.checked });
  });

  // Save during a drag so videos already playing update without waiting for
  // mouse-up. The toast waits for the final change event.
  volumeRange.addEventListener('input', () => {
    saveVolumeSettings({ ...volumeState, level: cleanVolumeLevel(volumeRange.value) }, false);
  });
  volumeRange.addEventListener('change', () => showSavedToast());

  function commitVolumeValue() {
    const raw = String(volumeValue.value).trim();
    if (!/^\d+$/.test(raw)) {
      paintVolumeSettings();
      return;
    }
    saveVolumeSettings({ ...volumeState, level: cleanVolumeLevel(raw) });
  }

  volumeValue.addEventListener('change', commitVolumeValue);
  volumeValue.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitVolumeValue();
      volumeValue.blur();
    }
  });

  // ---------- Chia đoạn ----------
  // One object in chrome.storage.local: { enabled, count, cols }.
  // assets/tiktok-loader.js relays it to the players (floating / separate
  // window), so a change here applies to players that are already open.
  // The segment window's own × also writes it (enabled:false) - the switch
  // follows through chrome.storage.onChanged.
  const SEGMENT_KEY = 'playerSegmentSettings';
  const COUNT_MIN = 2;
  const COUNT_MAX = 20;
  const COLS_MIN = 1;
  const COLS_MAX = 4;
  const COUNT_DEFAULT = 15;
  const COLS_DEFAULT = 3;

  const segEnabled = document.getElementById('segmentEnabled');
  const segCount = document.getElementById('segmentCount');
  const segCols = document.getElementById('segmentCols');
  const segGear = document.getElementById('segmentGear');
  const segConfig = document.getElementById('segmentConfig');
  const segHint = document.getElementById('segmentHint');
  const segCard = document.getElementById('segmentCard');
  const segError = document.getElementById('segmentError');
  const segSummary = document.getElementById('segmentSummary');

  function cleanSegmentInt(value, min, max, fallback) {
    const n = Math.round(Number(value));
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  }

  function readSegmentSettings(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    return {
      enabled: src.enabled === true,
      count: cleanSegmentInt(src.count, COUNT_MIN, COUNT_MAX, COUNT_DEFAULT),
      cols: cleanSegmentInt(src.cols, COLS_MIN, COLS_MAX, COLS_DEFAULT),
    };
  }

  // Whole number inside [min, max], otherwise null (empty, "1.5", "99", ...).
  function readSegmentField(input, min, max) {
    const raw = String(input.value).trim();
    const n = /^\d+$/.test(raw) ? parseInt(raw, 10) : NaN;
    return Number.isFinite(n) && n >= min && n <= max ? n : null;
  }

  let segmentState = readSegmentSettings(null);

  function showSegmentError(message) {
    segError.textContent = message || '';
    segError.hidden = !message;
  }

  function paintSegment() {
    segEnabled.checked = segmentState.enabled;
    segSummary.textContent = segmentState.count + ' đoạn · ' + segmentState.cols + ' cột';
    // Do not overwrite a field the user is typing in.
    if (document.activeElement !== segCount) {
      segCount.value = String(segmentState.count);
      segCount.classList.remove('bad');
    }
    if (document.activeElement !== segCols) {
      segCols.value = String(segmentState.cols);
      segCols.classList.remove('bad');
    }
  }

  function saveSegment(next) {
    if (!settingsUnlocked) {
      paintSegment();
      return;
    }
    segmentState = readSegmentSettings(next);
    paintSegment();
    chrome.storage.local.set({ [SEGMENT_KEY]: segmentState }, () => {
      showSavedToast();
    });
  }

  chrome.storage.local.get(SEGMENT_KEY, (result) => {
    segmentState = readSegmentSettings(result && result[SEGMENT_KEY]);
    paintSegment();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[SEGMENT_KEY]) {
      segmentState = readSegmentSettings(changes[SEGMENT_KEY].newValue);
      paintSegment();
    }
  });

  segEnabled.addEventListener('change', () => {
    saveSegment({ ...segmentState, enabled: segEnabled.checked });
  });

  // The card is a <div> (the settings live inside it), so keep the "click
  // anywhere on the card flips the switch" feel of the other cards.
  segCard.addEventListener('click', (event) => {
    if (!settingsUnlocked) return;
    if (event.target.closest('button, input, label, .seg-config')) return;
    segEnabled.click();
  });

  segGear.addEventListener('click', (event) => {
    // The gear shows the settings in place of the hint text; it must not flip the switch.
    event.stopPropagation();
    const open = segConfig.hidden;
    segConfig.hidden = !open;
    segHint.hidden = open;
    segGear.setAttribute('aria-expanded', String(open));
    if (open) {
      segCount.focus();
      segCount.select();
    }
  });

  // Saved on "change" (Enter / leaving the field / spinner), not on every
  // keystroke, so typing "20" does not first apply "2".
  function commitSegmentFields() {
    const count = readSegmentField(segCount, COUNT_MIN, COUNT_MAX);
    const cols = readSegmentField(segCols, COLS_MIN, COLS_MAX);
    segCount.classList.toggle('bad', count === null);
    segCols.classList.toggle('bad', cols === null);
    if (count === null) {
      showSegmentError('Số đoạn phải là số nguyên từ ' + COUNT_MIN + ' đến ' + COUNT_MAX + '.');
      return;
    }
    if (cols === null) {
      showSegmentError('Số cột phải là số nguyên từ ' + COLS_MIN + ' đến ' + COLS_MAX + '.');
      return;
    }
    showSegmentError('');
    if (count !== segmentState.count || cols !== segmentState.cols) {
      saveSegment({ ...segmentState, count, cols });
    }
  }

  for (const input of [segCount, segCols]) {
    input.addEventListener('change', commitSegmentFields);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        commitSegmentFields();
      }
    });
  }
})();
