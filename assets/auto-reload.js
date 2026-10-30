// ===== [Auto-reload] Tự tải lại extension khi file trên đĩa đã được cập nhật =====
// Extension được nạp kiểu "Load unpacked" nên Chrome KHÔNG tự đọc lại file khi hub (TP App Suite) ghi đè
// thư mục bằng bản mới từ GitHub. Service worker kiểm tra mỗi phút: nếu "version" trong manifest.json trên
// đĩa khác bản đang chạy thì gọi chrome.runtime.reload() -> người dùng không phải bấm Tải lại ở chrome://extensions.
// - Hub ghi manifest.json CUỐI CÙNG, nên khi version đổi thì các file khác đã ghi xong.
// - Bản cài từ Web Store không bao giờ bị lệch version nên đoạn này không làm gì.
// - Không tải lại khi extension đang có file tải dở; thử lại ở lần kiểm tra sau.
// - Chống lặp: cùng một version đích chỉ thử tải lại 1 lần mỗi 10 phút.
// - Sau khi tải lại, tự F5 các tab TikTok đang mở (content script cũ đã mất kết nối với extension).
//   Đặt RELOAD_TIKTOK_TABS = false để tắt việc này.

const ALARM_NAME = 'tp-auto-reload';
const STATE_KEY = 'tp_auto_reload_state';
const CHECK_EVERY_MIN = 1;
const SETTLE_MS = 2000;                 // chờ file ghi xong rồi đọc lại version lần nữa cho chắc
const RETRY_GUARD_MS = 10 * 60 * 1000;  // cùng version đích: không thử tải lại quá 1 lần / 10 phút
const RELOAD_TIKTOK_TABS = true;
const TIKTOK_MATCH = '*://*.tiktok.com/*';

let checking = false;

async function readDiskVersion() {
  const res = await fetch(chrome.runtime.getURL('manifest.json'), { cache: 'no-store' });
  const text = (await res.text()).replace(/^\uFEFF/, '');
  return String(JSON.parse(text).version || '').trim();
}

async function hasActiveDownload() {
  try {
    const items = await chrome.downloads.search({ state: 'in_progress' });
    return (items || []).some((d) => d && d.byExtensionId === chrome.runtime.id);
  } catch {
    return false;
  }
}

async function readState() {
  const got = await chrome.storage.local.get(STATE_KEY);
  return got && got[STATE_KEY] ? got[STATE_KEY] : null;
}

async function checkForUpdate() {
  if (checking) return;
  checking = true;
  try {
    const onDisk = await readDiskVersion();
    const running = chrome.runtime.getManifest().version;
    if (!onDisk || onDisk === running) return;

    const st = await readState();
    if (st && st.to === onDisk && Date.now() - (st.at || 0) < RETRY_GUARD_MS) return;
    if (await hasActiveDownload()) return;

    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    if ((await readDiskVersion()) !== onDisk) return;  // file vẫn đang được ghi -> để lần sau

    await chrome.storage.local.set({ [STATE_KEY]: { to: onDisk, at: Date.now(), tabs: RELOAD_TIKTOK_TABS } });
    chrome.runtime.reload();
  } catch {
    // không đọc được manifest.json (đang ghi dở...) -> thử lại ở lần kiểm tra sau
  } finally {
    checking = false;
  }
}

// Chạy ở lần khởi động đầu tiên SAU khi tải lại: F5 các tab TikTok để nạp content script mới.
async function afterReload() {
  try {
    const st = await readState();
    if (!st || st.tabs !== true || st.to !== chrome.runtime.getManifest().version) return;
    await chrome.storage.local.set({ [STATE_KEY]: { ...st, tabs: false } });
    const tabs = await chrome.tabs.query({ url: TIKTOK_MATCH });
    for (const tab of tabs) {
      if (tab && tab.id !== undefined) chrome.tabs.reload(tab.id).catch(() => {});
    }
  } catch {}
}

try {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm && alarm.name === ALARM_NAME) checkForUpdate();
  });
  chrome.alarms.get(ALARM_NAME).then((a) => {
    if (!a) chrome.alarms.create(ALARM_NAME, { periodInMinutes: CHECK_EVERY_MIN });
  }).catch(() => {});
} catch {}

checkForUpdate();
afterReload();
// ===== [/Auto-reload] =====
