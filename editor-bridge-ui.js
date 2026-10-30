/* ===== Mở app sửa video: giao diện gọn =====
 *
 * popup.js vẫn xử lý toàn bộ luồng Native Messaging (chọn file app, kiểm tra
 * app) thông qua các control gốc, nay nằm trong khối ẩn #editorEngine. File
 * này chỉ điều khiển phần hiển thị:
 *   - chuyển tiếp click của nút app sang nút gốc tương ứng;
 *   - hiện tên file app đã chọn, tự chạy "Kiểm tra app" cho mỗi đường dẫn mới
 *     và chuyển nút sang xanh khi hợp lệ (đỏ + dòng lỗi khi không hợp lệ);
 *   - hiện ô chữ (chỉ đọc) "Thư mục gốc: <tên>" cùng hàng với nút app: thư mục
 *     gốc chính là thư mục chọn trong "Video đã chọn", không chọn riêng ở đây.
 * Nạp trước popup.js để quan sát được giá trị khởi tạo.
 */
(() => {
  'use strict';

  const byId = (id) => document.getElementById(id);
  const pathInput = byId('editorAppPath');
  const browseBtn = byId('editorBrowseApp');
  const checkBtn = byId('editorCheckApp');
  const rootText = byId('editorRootText');
  const statusEl = byId('editorBridgeStatus');
  const appBtn = byId('editorAppBtn');
  const rootLine = byId('editorRootLine');
  const note = byId('editorNote');
  const settingsArea = byId('settingsArea');
  if (![pathInput, browseBtn, checkBtn, rootText, statusEl, appBtn, rootLine, note].every(Boolean)) return;

  const APP_LABEL = 'Chọn file app';
  const ROOT_EMPTY = 'Thư mục gốc: chưa có';
  const ROOT_EMPTY_TIP = 'Thư mục gốc lấy theo thư mục chọn trong Video đã chọn';
  const CHECK_TIMEOUT_MS = 20000;
  const PATH_POLL_MS = 300;

  let lastPath = null;   // đường dẫn (đã trim) đang nằm trong ô ẩn
  let result = null;     // { ok, text }: kết quả kiểm tra mới nhất của lastPath
  let needCheck = false; // còn nợ một lần kiểm tra (nút chưa bấm được: chờ kích hoạt key...)
  let checking = false;  // đang chờ kết quả của lần kiểm tra do file này bấm
  let checkTimer = 0;

  const norm = (p) => p.replace(/\//g, '\\').toLowerCase();
  const baseName = (p) => p.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || p;

  function parseRoot() {
    const strong = rootText.querySelector('strong');
    if (strong) return strong.textContent.trim();
    const text = rootText.textContent.trim();
    if (!text || /^chưa/i.test(text)) return '';
    const i = text.indexOf(':');
    return i >= 0 ? text.slice(i + 1).trim() : '';
  }

  function render() {
    const state = !lastPath ? 'none' : !result ? 'pending' : result.ok ? 'ok' : 'error';

    appBtn.textContent = lastPath ? baseName(lastPath) : APP_LABEL;
    appBtn.classList.toggle('is-ok', state === 'ok');
    appBtn.classList.toggle('is-error', state === 'error');
    appBtn.title = state === 'none' ? 'Chọn file .exe hoặc .py của app sửa video'
      : state === 'ok' ? 'Hợp lệ: ' + lastPath
      : state === 'error' ? (result.text || 'App không hợp lệ.') + '\n' + lastPath
      : lastPath;
    note.hidden = state !== 'error';
    note.textContent = state === 'error' ? (result.text || 'App không hợp lệ.') : '';

    const root = parseRoot();
    rootLine.textContent = root ? 'Thư mục gốc: ' + root : ROOT_EMPTY;
    rootLine.classList.toggle('is-ok', !!root);
    rootLine.title = root ? (rootText.title || root) + ' (theo thư mục trong Video đã chọn)' : ROOT_EMPTY_TIP;

    appBtn.disabled = browseBtn.disabled;
  }

  function resetStatus() {
    statusEl.className = 'editor-status';
    statusEl.textContent = '';
  }

  // Chạy đúng nút "Kiểm tra app" gốc. Xoá trạng thái cũ trước khi bấm để kết
  // quả ok/error đọc được sau đó chắc chắn là của lần kiểm tra này.
  function flush() {
    if (!needCheck || !lastPath || checkBtn.matches(':disabled')) return;
    needCheck = false;
    result = null;
    resetStatus();
    checking = true;
    clearTimeout(checkTimer);
    checkTimer = setTimeout(() => { checking = false; }, CHECK_TIMEOUT_MS);
    checkBtn.click();
    render();
  }

  function syncPath() {
    const path = String(pathInput.value || '').trim();
    if (path === lastPath) return;
    const sameFile = lastPath !== null && norm(path) === norm(lastPath);
    lastPath = path;
    if (sameFile) { render(); return; }   // chỉ đổi kiểu dấu gạch/hoa-thường
    result = null;
    checking = false;
    clearTimeout(checkTimer);
    needCheck = !!path;
    render();
    if (needCheck) setTimeout(flush, 0);
  }

  appBtn.addEventListener('click', () => browseBtn.click());

  // popup.js gán pathInput.value bằng code (không phát sự kiện) nên vừa nghe
  // input/change vừa quét định kỳ; syncPath bỏ qua khi giá trị không đổi.
  pathInput.addEventListener('input', syncPath);
  pathInput.addEventListener('change', syncPath);
  setInterval(syncPath, PATH_POLL_MS);

  new MutationObserver(() => {
    if (!checking) return;
    const ok = statusEl.classList.contains('ok');
    const bad = statusEl.classList.contains('error');
    if (!ok && !bad) return;
    checking = false;
    clearTimeout(checkTimer);
    result = { ok, text: statusEl.textContent.trim() };
    render();
  }).observe(statusEl, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class'] });

  new MutationObserver(render).observe(rootText, { childList: true, characterData: true, subtree: true });

  const disabledWatch = { attributes: true, attributeFilter: ['disabled'] };
  new MutationObserver(render).observe(browseBtn, disabledWatch);
  new MutationObserver(flush).observe(checkBtn, disabledWatch);
  if (settingsArea) new MutationObserver(flush).observe(settingsArea, disabledWatch);

  syncPath();
  render();
})();
