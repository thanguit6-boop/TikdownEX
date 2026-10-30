/* ===== [Download] Native editor item in player context menus =====
 *
 * tiktok-hook.js owns the custom right-click menu for both Document PiP and
 * the standalone player window. Its data still lives in multi-select.js's
 * isolated world. This small MAIN-world bridge appends one safe action after
 * the folder list and relays it back to that isolated script.
 *
 * It is intentionally loaded before tiktok-hook.js so the Document PiP API
 * can be observed and its short-lived document receives the same menu item.
 */
(function () {
  'use strict';
  if (window.__TIK_EDITOR_PLAYER_MENU__) return;
  window.__TIK_EDITOR_PLAYER_MENU__ = true;

  const MENU_ID = '__download_player_subfolder_menu';
  const MENU_ACTION_CLASS = '__tik_editor_open_action';
  const DATA_EVENT = '__DOWNLOAD_MULTISELECT_SUBFOLDER_MENU_DATA__';
  const OPEN_EVENT = '__DOWNLOAD_MULTISELECT_EDITOR_OPEN__';
  const RESULT_EVENT = '__DOWNLOAD_MULTISELECT_EDITOR_RESULT__';
  const PLAYER_MENU_DATA_MESSAGE = '__DOWNLOAD_PLAYER_SUBFOLDER_MENU_DATA__';
  const PLAYER_OPEN_MESSAGE = '__TIK_EDITOR_OPEN__';
  const PLAYER_RESULT_MESSAGE = '__TIK_EDITOR_RESULT__';
  const CONFIRM_ID = '__tik_editor_folder_confirm';
  const CONFIRM_EVENT = '__DOWNLOAD_MULTISELECT_EDITOR_CONFIRM__';
  const CONFIRM_RESULT_EVENT = '__DOWNLOAD_MULTISELECT_EDITOR_CONFIRM_RESULT__';
  const docs = new Set();
  const pending = new Map();
  let sequence = 0;
  const isDedicatedPlayer = (() => {
    try { return new URL(location.href).searchParams.has('__download_player'); } catch { return false; }
  })();

  const asVideoUrl = (value) => {
    try {
      const url = new URL(String(value || ''), location.href);
      return url.protocol === 'https:' && /(^|\.)tiktok\.com$/i.test(url.hostname) && /\/video\/\d+/.test(url.pathname)
        ? url.href
        : '';
    } catch {
      return '';
    }
  };

  function toast(doc, message, ok) {
    try {
      let el = doc.getElementById('__tik_editor_player_toast');
      if (!el) {
        el = doc.createElement('div');
        el.id = '__tik_editor_player_toast';
        (doc.body || doc.documentElement).appendChild(el);
      }
      el.style.cssText =
        'position:fixed!important;left:50%!important;top:14px!important;transform:translateX(-50%)!important;' +
        'max-width:86%!important;box-sizing:border-box!important;padding:8px 14px!important;border-radius:12px!important;' +
        'background:rgba(0,0,0,.9)!important;border:1px solid ' + (ok ? 'rgba(34,211,238,.4)' : 'rgba(251,113,133,.5)') + '!important;' +
        'color:' + (ok ? '#67e8f9' : '#fb7185') + '!important;font:700 12.5px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif!important;' +
        'text-align:center!important;pointer-events:none!important;z-index:2147483647!important;opacity:1!important;transition:opacity .25s!important';
      el.textContent = message;
      const view = doc.defaultView;
      if (!view) return;
      view.clearTimeout(el.__tikEditorToastTimer);
      el.__tikEditorToastTimer = view.setTimeout(() => el.style.setProperty('opacity', '0', 'important'), 2300);
    } catch {}
  }

  function nextRequestId() {
    sequence += 1;
    return 'tik-editor-' + Date.now().toString(36) + '-' + sequence + '-' + Math.random().toString(36).slice(2, 8);
  }

  function askEditor(doc, url, listRootPath) {
    const requestId = nextRequestId();
    const isPopup = isDedicatedPlayer && window.opener && !window.opener.closed;
    const typedPath = typeof listRootPath === 'string' ? listRootPath.slice(0, 1024) : '';
    pending.set(requestId, { doc, url, timer: 0, popup: isPopup });
    const timeout = () => {
      const waiting = pending.get(requestId);
      if (!waiting) return;
      pending.delete(requestId);
      toast(doc, 'Không nhận được phản hồi khi mở app sửa video.', false);
    };
    pending.get(requestId).timer = setTimeout(timeout, 120000);
    try {
      if (isPopup) {
        window.opener.postMessage({ channel: 'download', type: PLAYER_OPEN_MESSAGE, requestId, url, listRootPath: typedPath }, location.origin);
      } else {
        window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { requestId, url, confirmed: !!typedPath, listRootPath: typedPath } }));
      }
    } catch {
      timeout();
    }
  }

  function settle(requestId, result) {
    const waiting = pending.get(requestId);
    if (!waiting) return;
    pending.delete(requestId);
    clearTimeout(waiting.timer);
    if (result && result.needConfirm === true) {
      confirmThenResend(waiting.doc, waiting.url, result.info);
      return;
    }
    if (result && result.ok === true) pausePreview(waiting.doc);
    toast(waiting.doc, result && result.text ? result.text : 'Không mở được app sửa video.', !!(result && result.ok));
  }

  function cleanInfo(raw) {
    const info = raw && typeof raw === 'object' ? raw : {};
    const str = (value, limit) => (typeof value === 'string' ? value.slice(0, limit) : '');
    return {
      listName: str(info.listName, 255),
      listPath: str(info.listPath, 1024),
      reason: str(info.reason, 200),
    };
  }

  function cleanPath(raw) {
    let path = String(raw == null ? '' : raw).trim().replace(/^["']+|["']+$/g, '').trim();
    if (path.length > 3) path = path.replace(/[\\/]+$/, '');
    return path;
  }

  // Same rules as multi-select.js (which checks again before it writes
  // anything): a drive or UNC path, no "..", and it ends with the name of the
  // folder picked in "Video đã chọn" - the only part of that folder's real
  // path the browser exposes.
  function pathProblem(path, listName) {
    if (!path) return 'Chưa nhập đường dẫn đầy đủ của thư mục.';
    if (
      path.length > 1024 ||
      !/^(?:[A-Za-z]:[\\/]|\\\\[^\\/]+[\\/][^\\/]+)/.test(path) ||
      /[<>"|?*\x00-\x1f]/.test(path) ||
      /(?:^|[\\/])\.\.(?:[\\/]|$)/.test(path)
    ) {
      return 'Đường dẫn chưa hợp lệ. Nhập đường dẫn đầy đủ, ví dụ D:\\Videos\\TikTok.';
    }
    if (/^[A-Za-z]:[\\/]?$/.test(path)) return '';
    const last = path.split(/[\\/]+/).filter(Boolean).pop() || '';
    if (listName && last.toLowerCase() !== listName.toLowerCase()) {
      return 'Đường dẫn phải kết thúc bằng tên thư mục "' + listName + '".';
    }
    return '';
  }

  // Dialog shown when the real path of the folder picked in "Video đã chọn"
  // could not be found automatically. Resolves { accepted, listRootPath }.
  function askFolderConfirm(doc, rawInfo) {
    return new Promise((resolve) => {
      const info = cleanInfo(rawInfo);
      try {
        const old = doc.getElementById(CONFIRM_ID);
        if (old) old.remove();
      } catch {}

      const overlay = doc.createElement('div');
      overlay.id = CONFIRM_ID;
      overlay.style.cssText =
        'position:fixed!important;left:0!important;top:0!important;right:0!important;bottom:0!important;display:flex!important;' +
        'align-items:center!important;justify-content:center!important;background:rgba(0,0,0,.55)!important;' +
        'z-index:2147483647!important;color:#fff!important;font:500 12.5px/1.45 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif!important';
      const box = doc.createElement('div');
      box.style.cssText =
        'box-sizing:border-box;width:min(440px,92%);max-height:92%;overflow:auto;padding:14px 16px;border-radius:14px;' +
        'background:rgba(15,15,20,.98);border:1px solid rgba(251,191,36,.45);box-shadow:0 14px 40px rgba(0,0,0,.6)';
      overlay.appendChild(box);

      const add = (text, css) => {
        const el = doc.createElement('div');
        el.textContent = text;
        el.style.cssText = css || '';
        box.appendChild(el);
        return el;
      };
      add('⚠ Chưa xác định được đường dẫn thư mục', 'font-size:13.5px;font-weight:700;color:#fbbf24;margin-bottom:6px');
      if (info.reason) add(info.reason, 'color:rgba(255,255,255,.65);margin-bottom:8px');
      const field = (label, value) => {
        add(label, 'font-size:11px;font-weight:700;opacity:.6;margin-top:6px');
        add(value, 'word-break:break-all;color:#67e8f9');
      };
      field('Thư mục trong Video đã chọn', info.listName || '(không rõ tên)');
      add(
        'Chrome không cho biết đường dẫn thật của thư mục này và app chưa tự tìm được. ' +
          'Nhập lại đường dẫn đầy đủ của thư mục trong Video đã chọn để app sửa video tìm thấy file ' +
          '(app sẽ nhớ cho các lần sau):',
        'margin-top:10px'
      );
      const input = doc.createElement('input');
      input.type = 'text';
      input.value = info.listPath;
      input.placeholder = 'D:\\Videos\\TikTok';
      input.spellcheck = false;
      input.autocomplete = 'off';
      input.style.cssText =
        'box-sizing:border-box;width:100%;margin-top:6px;padding:7px 9px;border-radius:8px;border:1px solid rgba(255,255,255,.2);' +
        'background:rgba(255,255,255,.07);color:#fff;font:500 12.5px/1.3 Consolas,monospace;outline:none;user-select:text';
      box.appendChild(input);
      const error = add('', 'display:none;margin-top:5px;color:#fb7185');

      const buttons = doc.createElement('div');
      buttons.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;margin-top:12px';
      const button = (label, css) => {
        const el = doc.createElement('button');
        el.type = 'button';
        el.textContent = label;
        el.style.cssText = 'padding:7px 12px;border:0;border-radius:8px;font:600 12.5px/1.3 inherit;cursor:pointer;' + css;
        buttons.appendChild(el);
        return el;
      };
      const cancelBtn = button('Hủy', 'background:rgba(255,255,255,.1);color:#fff');
      const okBtn = button('Dùng đường dẫn này & mở app', 'background:rgba(52,211,153,.22);color:#a7f3d0');
      box.appendChild(buttons);

      let finished = false;
      const finish = (answer) => {
        if (finished) return;
        finished = true;
        try { overlay.remove(); } catch {}
        resolve(answer);
      };
      const cancel = () => finish({ accepted: false, listRootPath: '' });
      const submit = () => {
        const path = cleanPath(input.value);
        const problem = pathProblem(path, info.listName);
        if (problem) {
          error.textContent = problem;
          error.style.display = 'block';
          input.focus();
          return;
        }
        finish({ accepted: true, listRootPath: path });
      };
      cancelBtn.addEventListener('click', (event) => { event.preventDefault(); cancel(); });
      okBtn.addEventListener('click', (event) => { event.preventDefault(); submit(); });
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') { event.preventDefault(); submit(); }
        else if (event.key === 'Escape') { event.preventDefault(); cancel(); }
      });
      // The host page must not see typing or presses inside the dialog.
      for (const type of ['keydown', 'keyup', 'keypress', 'pointerdown', 'mousedown', 'touchstart', 'click']) {
        overlay.addEventListener(type, (event) => event.stopPropagation());
      }
      (doc.body || doc.documentElement).appendChild(overlay);
      setTimeout(() => {
        try { input.focus(); input.select(); } catch {}
      }, 30);
    });
  }

  async function confirmThenResend(doc, url, info) {
    try {
      const busy = doc.getElementById('__tik_editor_player_toast');
      if (busy) busy.style.setProperty('opacity', '0', 'important');
    } catch {}
    const answer = await askFolderConfirm(doc, info);
    if (!answer.accepted) {
      toast(doc, 'Đã hủy mở app sửa video.', false);
      return;
    }
    toast(doc, 'Đang tải video để mở app sửa video…', true);
    askEditor(doc, url, answer.listRootPath);
  }

  function pausePreview(doc) {
    try {
      doc.querySelectorAll('video').forEach((video) => {
        try { video.pause(); } catch {}
      });
    } catch {}
  }

  function addEditorAction(doc, url) {
    if (!url) return;
    const menu = doc.getElementById(MENU_ID);
    if (!menu || menu.querySelector('.' + MENU_ACTION_CLASS)) return;
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = MENU_ACTION_CLASS;
    button.textContent = '✎ Mở app sửa video';
    button.title = 'Tải video vào thư mục đã chọn rồi mở app sửa video';
    button.style.cssText =
      'display:block;width:100%;margin:2px 0 0;text-align:left;padding:7px 10px;border:0;border-radius:8px;' +
      'font:600 12.5px/1.3 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;cursor:pointer;' +
      'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:rgba(52,211,153,.12);color:#a7f3d0';
    button.addEventListener('mouseenter', () => { button.style.background = 'rgba(52,211,153,.22)'; });
    button.addEventListener('mouseleave', () => { button.style.background = 'rgba(52,211,153,.12)'; });
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const close = doc.__downloadCloseSubfolderMenu;
      if (typeof close === 'function') close();
      toast(doc, 'Đang tải video để mở app sửa video…', true);
      askEditor(doc, url);
    });
    menu.appendChild(button);
  }

  function registerDocument(doc) {
    if (!doc || docs.has(doc)) return;
    docs.add(doc);
    const observer = new MutationObserver(() => {
      // The URL comes with the menu-data reply; this observer only ensures a
      // later DOM redraw does not remove an already-added action.
      const menu = doc.getElementById(MENU_ID);
      if (menu && menu.__tikEditorUrl) addEditorAction(doc, menu.__tikEditorUrl);
    });
    try { observer.observe(doc.documentElement || doc, { childList: true, subtree: true }); } catch {}
  }

  function applyUrlToOpenMenus(url) {
    if (!url) return;
    for (const doc of Array.from(docs)) {
      try {
        const menu = doc.getElementById(MENU_ID);
        if (!menu) continue;
        menu.__tikEditorUrl = url;
        addEditorAction(doc, url);
      } catch {}
    }
  }

  registerDocument(document);

  // A local player (including Document PiP) receives this reply as a custom
  // event. It carries the canonical TikTok URL held by multi-select.js.
  window.addEventListener(DATA_EVENT, (event) => {
    const detail = event && event.detail;
    applyUrlToOpenMenus(asVideoUrl(detail && detail.url));
  });

  window.addEventListener(RESULT_EVENT, (event) => {
    const detail = event && event.detail;
    if (!detail || typeof detail.requestId !== 'string') return;
    settle(detail.requestId, {
      ok: detail.ok === true,
      text: typeof detail.text === 'string' ? detail.text : '',
      needConfirm: detail.needConfirm === true,
      info: detail.info,
    });
  });

  // Warning request from multi-select.js for the card context menu on the
  // page itself (the player windows ask through settle() above instead).
  window.addEventListener(CONFIRM_EVENT, (event) => {
    const detail = event && event.detail;
    if (!detail || typeof detail.requestId !== 'string') return;
    const requestId = detail.requestId.slice(0, 128);
    askFolderConfirm(document, detail.info).then((answer) => {
      window.dispatchEvent(new CustomEvent(CONFIRM_RESULT_EVENT, {
        detail: { requestId, accepted: answer.accepted === true, listRootPath: answer.listRootPath || '' },
      }));
    });
  });

  window.addEventListener('message', (event) => {
    if (event.origin !== location.origin || !event.data || event.data.channel !== 'download') return;
    const message = event.data;
    if (message.type === PLAYER_MENU_DATA_MESSAGE) {
      applyUrlToOpenMenus(asVideoUrl(message.url));
      return;
    }
    if (message.type === PLAYER_RESULT_MESSAGE && isDedicatedPlayer && window.opener && event.source === window.opener) {
      settle(message.requestId, {
        ok: message.ok === true,
        text: typeof message.text === 'string' ? message.text : '',
        needConfirm: message.needConfirm === true,
        info: message.info,
      });
      return;
    }
    // This is the opener/search tab receiving a request from a standalone
    // player window. Let the isolated multi-select script own the download.
    if (message.type === PLAYER_OPEN_MESSAGE && !isDedicatedPlayer && event.source && event.source !== window) {
      const url = asVideoUrl(message.url);
      const requestId = typeof message.requestId === 'string' ? message.requestId.slice(0, 128) : '';
      if (!url || !requestId) return;
      const source = event.source;
      const typedPath = typeof message.listRootPath === 'string' ? message.listRootPath.slice(0, 1024) : '';
      const reply = (detail) => {
        const data = detail || {};
        try {
          source.postMessage({
            channel: 'download',
            type: PLAYER_RESULT_MESSAGE,
            requestId,
            ok: data.ok === true,
            text: typeof data.text === 'string' ? data.text.slice(0, 500) : '',
            needConfirm: data.needConfirm === true,
            info: data.needConfirm === true ? cleanInfo(data.info) : null,
          }, location.origin);
        } catch {}
      };
      const onResult = (resultEvent) => {
        const detail = resultEvent && resultEvent.detail;
        if (!detail || detail.requestId !== requestId) return;
        window.removeEventListener(RESULT_EVENT, onResult);
        reply(detail);
      };
      window.addEventListener(RESULT_EVENT, onResult);
      window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { requestId, url, confirmed: !!typedPath, listRootPath: typedPath } }));
      setTimeout(() => {
        window.removeEventListener(RESULT_EVENT, onResult);
      }, 121000);
    }
  });

  // tiktok-hook.js creates Document PiP windows after this file loads. Attach
  // to the new document as soon as Chrome resolves it so its menu is covered.
  try {
    const api = window.documentPictureInPicture;
    const original = api && api.requestWindow;
    if (typeof original === 'function' && !original.__tikEditorWrapped) {
      const wrapped = async function (...args) {
        const pipWindow = await original.apply(this, args);
        try { registerDocument(pipWindow && pipWindow.document); } catch {}
        return pipWindow;
      };
      wrapped.__tikEditorWrapped = true;
      api.requestWindow = wrapped;
      // Most Chromium builds expose this as a writable prototype method. A
      // few expose a read-only instance property, so fall back to the
      // prototype when assigning the instance did not take effect.
      if (api.requestWindow !== wrapped) {
        const proto = Object.getPrototypeOf(api);
        if (proto && proto.requestWindow === original) proto.requestWindow = wrapped;
      }
    }
  } catch {}
})();
