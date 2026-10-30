/* ===== [Download] Multi-select checkbox + management panel =====
 * Pure addition — does not modify any existing bundled file.
 * Runs in the ISOLATED world (default), so it can call chrome.runtime
 * directly: no MAIN-world postMessage bridge is needed here.
 *
 * Card recognition mirrors the existing Search/Explore 4-button module
 * (assets/tiktok-hook.js) so the checkbox always lands on the
 * exact same cards as the PiP/Player/Download/Speed buttons:
 *   - page: /search or /explore
 *   - host: an <a href*="/video/"> whose box is card-sized (76–720 / 76–1100)
 *           and that contains an <img>/<video>/<picture>/<canvas> or a
 *           background-image element.
 *
 * Download re-uses the existing background handlers verbatim:
 *   - TIKTOK_DOWNLOAD        (same message the existing Download buttons send)
 *   - GET_TIKTOK_METADATA    (same message the existing PiP button flow uses)
 * No source-resolving or chrome.downloads logic is duplicated here.
 *
 * "Open video player" re-uses the existing dedicated player window
 * (window.open with the __download_player query param + the
 * "DownloadVideoPlayer" window name) — the same mechanism the existing
 * Player button opens, so clicking it from this panel reuses that window.
 *
 * Namespace: every id/class here is prefixed with __download_multi_ so it
 * can never collide with the existing extension's own elements.
 */
(function () {
    "use strict";

    // This content script is declared in the manifest, so it must opt out on
    // unactivated installs before it creates any buttons or panel UI. The
    // service worker still enforces the license for every privileged action.
    const boot = () => {
    if (window.__DOWNLOAD_MULTI_SELECT__) return;
    window.__DOWNLOAD_MULTI_SELECT__ = true;

    const NS = "__download_multi_";
    const CHECKBOX_CLASS = NS + "checkbox";
    // Checkboxes are hidden (CSS only) while the page is not a search/explore
    // page, i.e. while TikTok's video viewer is open on top of the result grid.
    const CHECKBOX_HIDE_STYLE_ID = NS + "hide_style";
    const CHECKBOX_HIDE_ATTR = "data-download-multi-hide";
    const FAB_ID = NS + "fab";
    const FAB_COUNT_ID = NS + "fab_count";
    const PANEL_ID = NS + "panel";
    const PANEL_LIST_ID = NS + "panel_list";
    const PANEL_COUNT_ID = NS + "panel_count";
    const PANEL_CLOSE_ID = NS + "panel_close";
    const PANEL_DL_PICKED_ID = NS + "panel_dl_picked";
    const PANEL_DL_ALL_ID = NS + "panel_dl_all";
    const ROW_CHECK_CLASS = NS + "row_check";
    const ROW_THUMB_CLASS = NS + "row_thumb";
    const ROW_STATUS_CLASS = NS + "row_status";
    const ROW_PLAYER_CLASS = NS + "row_player";
    const ROW_DL_CLASS = NS + "row_dl";
    const ROW_REMOVE_CLASS = NS + "row_remove";
    const PANEL_SELECTALL_CHECK_ID = NS + "panel_selectall_check";
    const PANEL_RENAME_INPUT_ID = NS + "panel_rename_input";
    const PANEL_CONCURRENCY_INPUT_ID = NS + "panel_concurrency";
    const PANEL_SAVEPATH_BOX_ID = NS + "panel_savepath_box";
    const PANEL_SAVEPATH_TEXT_ID = NS + "panel_savepath_text";
    const PANEL_SAVEPATH_CLEAR_ID = NS + "panel_savepath_clear";
    const PANEL_OPENFOLDER_BTN_ID = NS + "panel_open_folder";
    const PANEL_SYNC_HINT_ID = NS + "panel_sync_hint";
    const CENTER_TOAST_ID = NS + "center_toast";
    // Advanced folder mode (Video ↔ subfolder mapping) — only rendered/used
    // when advancedFolderMode is on; see the "Advanced folder mode" section.
    const PANEL_ADV_SECTION_ID = NS + "panel_adv_section";
    const PANEL_FOLDER_LIST_ID = NS + "panel_folder_list";
    const PANEL_ADV_REFRESH_ID = NS + "panel_adv_refresh";
    const PANEL_SHORTCUT_BTN_ID = NS + "panel_shortcut_btn";
    const PANEL_FOLDERS_TOGGLE_ID = NS + "panel_folders_toggle";
    const PANEL_FOLDERS_HINT_ID = NS + "panel_folders_hint";
    const ROW_NUM_BADGE_CLASS = NS + "row_badge";
    const ROW_FOLDER_CELL_CLASS = NS + "row_folder_cell";
    const ROW_FOLDER_INPUT_CLASS = NS + "row_folder_input";
    const FOLDER_CHIP_CLASS = NS + "folder_chip";

    const PLAYER_WINDOW_NAME = "DownloadVideoPlayer";
    const PLAYER_REQUEST_PARAM = "__download_player";

    // Persisted (chrome.storage.local) so the FAB stays where the user put it,
    // and so their preferred "how many at once" download setting survives
    // page reloads / new tabs.
    const FAB_POS_KEY = NS + "fab_pos";
    const CONCURRENCY_KEY = NS + "concurrency";
    // Subfolder order the user arranged by dragging chips in the panel, see
    // "Folder chip re-ordering". FOLDER_ORDER_ALL_KEY is ONE list shared by every
    // root folder: [subfolderName, ...]. FOLDER_ORDER_KEY is the older per-root
    // form { [rootFolderName]: [subfolderName, ...] }, now only read as the
    // starting point until the shared list exists.
    const FOLDER_ORDER_KEY = NS + "folder_order";
    const FOLDER_ORDER_ALL_KEY = NS + "folder_order_all";
    const DEFAULT_CONCURRENCY = 3;
    // "Save to folder": the folder handle itself is not JSON-safe, so it
    // lives in IndexedDB (see the "Save to folder" section below).
    const SAVEPATH_IDB_NAME = NS + "fsdb";
    const SAVEPATH_IDB_STORE = "handles";
    const SAVEPATH_IDB_KEY = "root";
    const MAX_CONCURRENCY = 5;

    // Display mode of the selected-videos list: expanded (full list shown)
    // or collapsed (only the FAB download icon). The mode is sticky — it
    // changes ONLY when the user explicitly toggles it (clicking the FAB, or
    // the panel's own × button), never as a side effect of selecting videos,
    // clicking elsewhere on the page or pressing Escape. Remembered across
    // page loads. Expanded by default, matching the previous behavior.
    // NOTE: selecting a video no longer auto-opens the list in either mode;
    // it only opens when the user clicks the FAB.
    const PANEL_EXPANDED_KEY = NS + "panel_expanded";
    let panelExpandedMode = true;

    function loadPanelExpandedMode() {
        try {
            chrome.storage.local.get(PANEL_EXPANDED_KEY, (res) => {
                if (res && typeof res[PANEL_EXPANDED_KEY] === "boolean") panelExpandedMode = res[PANEL_EXPANDED_KEY];
            });
        } catch {}
    }

    function setPanelExpandedMode(expanded) {
        panelExpandedMode = !!expanded;
        try {
            chrome.storage.local.set({ [PANEL_EXPANDED_KEY]: panelExpandedMode });
        } catch {}
    }

    // Whether the "Thư mục con" chip list inside the panel is collapsed (only
    // its header row — title, "Phím tắt", refresh — stays visible) or expanded
    // (every chip shown). Flipped ONLY by the small triangle icon in front of
    // the "Thư mục con" title, and remembered in chrome.storage.local so it
    // survives closing the browser. Expanded by default.
    const FOLDERS_COLLAPSED_KEY = NS + "folders_collapsed";
    let foldersCollapsed = false;

    function loadFoldersCollapsed() {
        try {
            chrome.storage.local.get(FOLDERS_COLLAPSED_KEY, (res) => {
                if (res && typeof res[FOLDERS_COLLAPSED_KEY] === "boolean") foldersCollapsed = res[FOLDERS_COLLAPSED_KEY];
                applyFoldersCollapsed();
            });
        } catch {}
    }

    function setFoldersCollapsed(collapsed) {
        foldersCollapsed = !!collapsed;
        applyFoldersCollapsed();
        try {
            chrome.storage.local.set({ [FOLDERS_COLLAPSED_KEY]: foldersCollapsed });
        } catch {}
    }

    // Pushes foldersCollapsed onto the DOM: hides/shows the chip list and
    // the drag hint, and turns the toggle's triangle (right = collapsed,
    // down = expanded). Safe to call any time — quietly no-ops for whatever
    // parts of the panel are not built yet.
    function applyFoldersCollapsed() {
        const listEl = document.getElementById(PANEL_FOLDER_LIST_ID);
        if (listEl) listEl.style.display = foldersCollapsed ? "none" : "flex";
        const hintEl = document.getElementById(PANEL_FOLDERS_HINT_ID);
        if (hintEl) hintEl.style.display = foldersCollapsed ? "none" : "";
        const btn = document.getElementById(PANEL_FOLDERS_TOGGLE_ID);
        if (!btn) return;
        btn.setAttribute("aria-expanded", foldersCollapsed ? "false" : "true");
        btn.title = foldersCollapsed ? "Xổ ra danh sách thư mục con" : "Thu gọn danh sách thư mục con";
        const icon = btn.firstElementChild;
        if (icon) icon.style.transform = foldersCollapsed ? "rotate(0deg)" : "rotate(90deg)";
    }

    // Global extension setting (NOT namespaced with NS: plain, un-prefixed
    // key shared with popup.html/popup.js's "Chọn thư mục nâng cao" toggle,
    // so both sides must agree on the name).
    // When ON, the panel additionally reads the direct subfolders of the
    // chosen root folder and lets each video be mapped to one of them (see
    // the "Advanced folder mode" section further down). When OFF, every
    // piece of that is skipped and the panel behaves exactly as before.
    const ADVANCED_FOLDER_SETTING_KEY = "advancedFolderMode";
    let advancedFolderMode = false;

    function loadAdvancedFolderSetting() {
        try {
            chrome.storage.local.get(ADVANCED_FOLDER_SETTING_KEY, (res) => {
                advancedFolderMode = !!(res && res[ADVANCED_FOLDER_SETTING_KEY] === true);
                if (advancedFolderMode && rootDirHandle) rescanFolders();
                else renderAdvancedFolderSection();
            });
        } catch {}
    }

    // Same pattern again: plain, un-prefixed key shared with popup.html/popup.js's
    // "Luôn hiển thị trên cùng" toggle. When ON, the row's "Open video player"
    // button opens the video in an always-on-top Document PiP window (see
    // previewPip below) instead of the regular popup window. Cached here so the
    // click handler can read it synchronously; the onChanged listener keeps it
    // live, so flipping the toggle applies to the very next click.
    const PLAYER_ALWAYS_ON_TOP_SETTING_KEY = "playerAlwaysOnTop";
    let playerAlwaysOnTop = false;

    function loadPlayerAlwaysOnTopSetting() {
        try {
            chrome.storage.local.get(PLAYER_ALWAYS_ON_TOP_SETTING_KEY, (res) => {
                playerAlwaysOnTop = !!(res && res[PLAYER_ALWAYS_ON_TOP_SETTING_KEY] === true);
            });
        } catch {}
    }

    // Same pattern once more: plain, un-prefixed key shared with popup.html/popup.js's
    // "Hiển thị menu chuột phải là Thư mục con" toggle. When ON, right-clicking a
    // video thumbnail on the page shows the subfolder list (see the "Right-click
    // subfolder menu" section below) instead of the browser's own context menu.
    // Off by default; the onChanged listener keeps it live.
    const SUBFOLDER_CONTEXT_MENU_SETTING_KEY = "subfolderContextMenu";
    let subfolderContextMenu = false;

    function loadSubfolderContextMenuSetting() {
        try {
            chrome.storage.local.get(SUBFOLDER_CONTEXT_MENU_SETTING_KEY, (res) => {
                subfolderContextMenu = !!(res && res[SUBFOLDER_CONTEXT_MENU_SETTING_KEY] === true);
            });
        } catch {}
    }

    // Same pattern: plain, un-prefixed key shared with popup.html/popup.js's
    // "Tự động dán dữ liệu clipboard" toggle. When ON, clicking the "Đặt tên khi
    // tải" box or TikTok's search box pastes the clipboard text into it (see
    // the "click-to-paste" section below). Off by default: while it is OFF the
    // clipboard is never read. The onChanged listener keeps it live.
    const AUTO_PASTE_CLIPBOARD_SETTING_KEY = "autoPasteClipboard";
    let autoPasteClipboard = false;

    function loadAutoPasteClipboardSetting() {
        try {
            chrome.storage.local.get(AUTO_PASTE_CLIPBOARD_SETTING_KEY, (res) => {
                autoPasteClipboard = !!(res && res[AUTO_PASTE_CLIPBOARD_SETTING_KEY] === true);
            });
        } catch {}
    }

    try {
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area !== "local") return;
            if (changes[AUTO_PASTE_CLIPBOARD_SETTING_KEY]) {
                autoPasteClipboard = changes[AUTO_PASTE_CLIPBOARD_SETTING_KEY].newValue === true;
            }
            if (changes[FOLDERS_COLLAPSED_KEY]) {
                foldersCollapsed = changes[FOLDERS_COLLAPSED_KEY].newValue === true;
                applyFoldersCollapsed();
            }
            if (changes[PLAYER_ALWAYS_ON_TOP_SETTING_KEY]) {
                playerAlwaysOnTop = changes[PLAYER_ALWAYS_ON_TOP_SETTING_KEY].newValue === true;
            }
            if (changes[SUBFOLDER_CONTEXT_MENU_SETTING_KEY]) {
                subfolderContextMenu = changes[SUBFOLDER_CONTEXT_MENU_SETTING_KEY].newValue === true;
                if (!subfolderContextMenu) closeSubfolderMenu();
            }
            if (changes[ADVANCED_FOLDER_SETTING_KEY]) {
                advancedFolderMode = changes[ADVANCED_FOLDER_SETTING_KEY].newValue === true;
                // Toggling mid-session (the popup can be opened any time, not
                // just before a page load) must take effect immediately: pull
                // in the subfolder list if it turns on, and rebuild any
                // already-open row list either way so the Folder column /
                // numbering badges appear or disappear right away.
                if (advancedFolderMode && rootDirHandle) rescanFolders();
                else renderAdvancedFolderSection();
                if (panelOpen) renderPanelList();
            }
            if (changes[EDITOR_BRIDGE_SETTINGS_KEY]) refreshEditorSyncHint();
        });
    } catch {}
    const FAB_MARGIN = 16;
    const FAB_SIZE = 52;
    const DRAG_THRESHOLD = 6; // px of movement before a press-and-hold counts as a drag, not a click

    /* ---------------- page / card detection (mirrors the existing hook) --------------- */

    function isSearchPage() {
        try {
            return /^\/(?:search|explore)(?:\/|$)/.test(location.pathname);
        } catch {
            return false;
        }
    }

    function hasCardSize(el) {
        try {
            const r = el.getBoundingClientRect();
            return r.width >= 76 && r.height >= 76 && r.width <= 720 && r.height <= 1100;
        } catch {
            return false;
        }
    }

    function isThumbnailLink(link) {
        return !!(
            link &&
            hasCardSize(link) &&
            (link.querySelector("img,video,picture,canvas") || link.querySelector("[style*='background']"))
        );
    }

    function videoUrl(value) {
        try {
            const url = new URL(value, location.href);
            return url.protocol === "https:" && /(^|\.)tiktok\.com$/i.test(url.hostname) && /\/video\/\d+/.test(url.pathname)
                ? url.href
                : "";
        } catch {
            return "";
        }
    }

    function stopCardEvent(event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /* ---------------- background messaging (reuses existing handlers) --------------- */

    function sendMessage(msg) {
        return new Promise((resolve) => {
            try {
                chrome.runtime.sendMessage(msg, (result) => {
                    const err = chrome.runtime.lastError;
                    resolve(err ? { success: false, error: err.message } : result || { success: false, error: "no_response" });
                });
            } catch (e) {
                resolve({ success: false, error: (e && e.message) || "send_failed" });
            }
        });
    }

    // Reuses the extension's existing TIKTOK_DOWNLOAD handler; only adds an
    // optional custom filename, read fresh from the rename box each call.
    // When a save folder has been chosen, that folder is authoritative: the
    // download goes there and only there. It deliberately never falls back
    // to chrome.downloads on failure — a silent fallback used to mean a
    // video could show up in both the chosen folder and Chrome's default
    // Downloads folder, depending on exactly where the write failed.
    async function downloadUrl(url) {
        const renameInput = document.getElementById(PANEL_RENAME_INPUT_ID);
        const renameRaw = renameInput ? renameInput.value : renameDraft;
        if (rootDirHandle) {
            const item = selected.get(url);
            const folderName = advancedFolderMode && item ? item.folderName || null : null;
            // Every download takes its " - (N)" number here (panel buttons and "Mở app sửa video" alike).
            const chosenName = await nextRenamedFilename(renameRaw, rootDirHandle, folderName);
            return await saveToChosenFolder(url, chosenName, folderName);
        }
        const filename = await nextRenamedFilename(renameRaw, null, null);
        const msg = { type: "TIKTOK_DOWNLOAD", url };
        if (filename) msg.filename = filename;
        const res = await sendMessage(msg);
        return { success: !!(res && res.success), error: res && res.error };
    }

    // Reuses the extension's existing GET_TIKTOK_METADATA handler verbatim.
    async function getMetadata(url) {
        const res = await sendMessage({ type: "GET_TIKTOK_METADATA", url });
        return res && res.success ? res.data : null;
    }

    /* ---------------- "Save to folder" (persisted custom download location) ---------------
     * Chrome deliberately does not let a page/extension read or write an
     * arbitrary absolute OS path, see the real absolute path of a folder the
     * user picks, or open an arbitrary OS folder in the system file manager
     * — that is a browser security boundary, not a bug here. The closest
     * the platform allows is the File System Access API: showDirectoryPicker()
     * opens the real native OS folder browser, and the resulting handle can
     * be used to write files straight into that folder on every future
     * download without asking again, as long as the granted permission is
     * still valid (see queryRootPermission below — Chrome may ask to
     * re-confirm it after a browser restart, which just needs one click,
     * not re-picking the folder).
     *
     * Trade-offs this implies, by design:
     *  - Only the folder's own name is ever exposed to us (never a full
     *    "D:\..." path) — refreshSavePathUI() shows that name, not a path.
     *  - Files are saved directly in that folder — there is no subfolder
     *    picker/typed subpath here anymore.
     *  - Files written this way do NOT go through chrome.downloads, so they
     *    will not appear in Chrome's download history/shelf.
     *  - Once a folder is chosen it is authoritative: downloadUrl() sends
     *    every download through saveToChosenFolder() only. A failure there
     *    is reported back as an error and never silently retried through
     *    the normal TIKTOK_DOWNLOAD/chrome.downloads flow, so a video is
     *    never saved to the chosen folder and Chrome's default folder at
     *    the same time.
     */

    let rootDirHandle = null; // FileSystemDirectoryHandle | null — cached in memory after the first IndexedDB load
    let rootDirLoaded = false; // true once that first load has resolved (lets the UI show "loading" briefly instead of "not set")
    let savePathNeedsPermission = false; // kept in sync by refreshSavePathUI(); read by the box's click handler

    // ---- Advanced folder mode state (only meaningful when advancedFolderMode === true) ----
    // currentFolders: names of the direct subfolders of rootDirHandle, in the
    // same order shown to the user — index 0 is "folder #1", etc. Names
    // (not handles) are the source of truth for a video's mapping, so a
    // rescan can tell a still-present folder apart from one that was
    // deleted/renamed, per rescanFolders()/reconcileFolderMappings() below.
    let currentFolders = [];
    let folderHandleCache = new Map(); // subfolder name -> FileSystemDirectoryHandle, refreshed by every rescanFolders()
    // "no-root" | "no-permission" | "loading" | "empty" | "ready"
    let advFolderStatus = "no-root";
    // The Folder-column <input> the user most recently focused, so a click on
    // a folder chip (see "click-to-link", section 10 of the spec) knows which
    // video row to apply the mapping to.
    let focusedFolderInputEl = null;
    // Last time that input gained or lost focus. A chip click lands right
    // after the input blurs (pressing the chip moves focus), so "focused or
    // blurred a moment ago" = the user deliberately picked that row first.
    // An older focus is stale and must not hijack the single-unmapped shortcut.
    let focusedFolderInputAt = 0;
    const FOLDER_FOCUS_FRESH_MS = 1500;
    // Drag-to-reorder state for the subfolder chips (see "Folder chip
    // re-ordering"). chipClickSuppressUntil swallows the click that the
    // browser fires right after a drag ends, so dropping a chip never also
    // links it to a video.
    const CHIP_DRAG_THRESHOLD_PX = 5;
    let folderDragState = null; // { chip, name, startX, startY, dragging, insertAt }
    let chipClickSuppressUntil = 0;

    function idbOpen() {
        return new Promise((resolve, reject) => {
            try {
                const req = indexedDB.open(SAVEPATH_IDB_NAME, 1);
                req.onupgradeneeded = () => {
                    if (!req.result.objectStoreNames.contains(SAVEPATH_IDB_STORE)) {
                        req.result.createObjectStore(SAVEPATH_IDB_STORE);
                    }
                };
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error || new Error("idb_open_failed"));
            } catch (e) {
                reject(e);
            }
        });
    }

    async function idbSet(key, value) {
        const db = await idbOpen();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(SAVEPATH_IDB_STORE, "readwrite");
            tx.objectStore(SAVEPATH_IDB_STORE).put(value, key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error || new Error("idb_set_failed"));
        });
    }

    async function idbGet(key) {
        const db = await idbOpen();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(SAVEPATH_IDB_STORE, "readonly");
            const req = tx.objectStore(SAVEPATH_IDB_STORE).get(key);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error || new Error("idb_get_failed"));
        });
    }

    async function idbDelete(key) {
        const db = await idbOpen();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(SAVEPATH_IDB_STORE, "readwrite");
            tx.objectStore(SAVEPATH_IDB_STORE).delete(key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error || new Error("idb_delete_failed"));
        });
    }

    // Loaded once at startup: pulls the previously-picked folder handle (if
    // any) out of IndexedDB. Purely passive — never prompts the user.
    async function loadRootDirHandle() {
        try {
            rootDirHandle = await idbGet(SAVEPATH_IDB_KEY);
        } catch {
            rootDirHandle = null;
        }
        rootDirLoaded = true;
        refreshSavePathUI();
        if (advancedFolderMode && rootDirHandle) rescanFolders();
        else renderAdvancedFolderSection();
    }

    // Passive check only — never shows a permission prompt. Safe to call any
    // time, including outside a user gesture (e.g. right after page load).
    async function queryRootPermission() {
        if (!rootDirHandle) return "no-handle";
        try {
            return await rootDirHandle.queryPermission({ mode: "readwrite" });
        } catch {
            return "denied";
        }
    }

    // Interactive — must only be called synchronously-ish from inside a real
    // click handler, since re-confirming a lapsed permission requires a
    // user gesture.
    async function requestRootPermission() {
        if (!rootDirHandle) return "no-handle";
        try {
            return await rootDirHandle.requestPermission({ mode: "readwrite" });
        } catch {
            return "denied";
        }
    }

    // Reconstructs the raw video bytes from the base64 string background.js
    // sends over (see the comment in __fetchBytesForChosenFolder for why a
    // plain ArrayBuffer can't be sent through chrome.runtime.sendMessage).
    function base64ToBytes(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    function sanitizeFsName(name) {
        return String(name || "")
            .replace(/[<>:"/\\|?*\x00-\x1f\x7f]/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 180);
    }

    // Mirrors the extension's own default-filename convention ("<author> -
    // <title or short id>.mp4") so files saved this way look the same as
    // ones saved through the normal TIKTOK_DOWNLOAD flow.
    function buildDefaultFilename(meta, url) {
        const idMatch = String(url || "").match(/\/video\/(\d+)/);
        const idSuffix = idMatch ? idMatch[1].slice(-8) : String(Date.now());
        const author = ((meta && meta.author) || "tiktok").trim() || "tiktok";
        const title = ((meta && meta.title) || "").trim();
        const base = title ? author + " - " + title : author + " - " + idSuffix;
        return sanitizeFsName(base) + ".mp4";
    }

    // Writes straight into the chosen folder and reports the real outcome —
    // {success:true} once the file is actually written, or
    // {success:false, error} otherwise. Unlike the old implementation, this
    // never falls back to chrome.downloads: once a folder is chosen it is
    // the only place a video gets saved, so a failure here is surfaced to
    // the caller instead of silently retried elsewhere.
    //
    // `folderName`, when given (advanced folder mode only — see downloadUrl),
    // is the direct subfolder of rootDirHandle this particular video is
    // mapped to; the file is written inside that subfolder instead of
    // straight into rootDirHandle. Left null/undefined, behavior is exactly
    // the plain flat-root save this function has always done.
    async function saveToChosenFolder(url, filenameOverride, folderName) {
        let filename = null;
        let targetDirHandle = rootDirHandle;
        try {
            let permission = await queryRootPermission();
            if (permission !== "granted") {
                // Interactive re-confirmation needs a user gesture; safe to
                // call here because this only ever runs from inside a real
                // click handler (the row / "Đã chọn" / "Tất cả" buttons).
                permission = await requestRootPermission();
            }
            if (permission !== "granted") {
                return { success: false, error: "Chưa có quyền ghi vào thư mục đã chọn" };
            }
            if (folderName) {
                try {
                    targetDirHandle = await rootDirHandle.getDirectoryHandle(folderName, { create: false });
                } catch {
                    // The folder this video was mapped to is gone (deleted or
                    // renamed since the mapping was made) — never silently
                    // fall back to the root folder for it. Trigger a rescan so
                    // the folder list / numbering the user sees is accurate
                    // right away, matching section 17/18 of the spec.
                    rescanFolders();
                    return { success: false, error: 'Không tìm thấy thư mục "' + folderName + '".' };
                }
            }
            const meta = await getMetadata(url);
            if (!meta || !meta.videoUrl) return { success: false, error: "Không lấy được video" };
            filename = filenameOverride ? sanitizeFsName(filenameOverride) + ".mp4" : buildDefaultFilename(meta, url);
            // Pass the TikTok page URL, never the resolved stream URL. The
            // service worker asks the licensed resolver again, then fetches
            // only the stream it has just received from that resolver.
            const bytesRes = await sendMessage({ type: "__DOWNLOAD_MULTI_FETCH_BYTES__", url });
            if (!bytesRes || !bytesRes.success || !bytesRes.base64) {
                return { success: false, error: (bytesRes && bytesRes.error) || "Không tải được dữ liệu video" };
            }
            const bytes = base64ToBytes(bytesRes.base64);
            const fileHandle = await targetDirHandle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(bytes);
            await writable.close();
            // Keep the exact final filename for the Native Editor bridge.
            // The browser's File System Access API deliberately hides the
            // absolute path; the bridge receives only this name plus the
            // user-confirmed root and selected direct subfolder.
            return { success: true, filename, folderName: folderName || "" };
        } catch (e) {
            // Best-effort cleanup: getFileHandle(create:true) above can
            // leave an empty/partial file behind if a later step throws,
            // and this stops that from lingering in the chosen folder.
            if (filename) {
                try {
                    await targetDirHandle.removeEntry(filename);
                } catch {}
            }
            return { success: false, error: (e && e.message) || "Lỗi khi lưu vào thư mục đã chọn" };
        }
    }

    // Downloads exactly one video to its selected subfolder or the root,
    // waits until the File System Access write has committed, then asks the
    // service worker to call the Native Host. This stays separate from
    // normal/batch downloads: those downloads must never unexpectedly launch
    // a local editing app.
    const editorOpeningUrls = new Set();
    const EDITOR_ROOT_MARKER_FILE = ".tvt"; // keep in sync with ROOT_MARKER_FILE in tik_native_host.py

    async function editorRootToken() {
        try {
            const handle = await rootDirHandle.getFileHandle(EDITOR_ROOT_MARKER_FILE, { create: false });
            const text = await (await handle.getFile()).text();
            const parsed = JSON.parse(text);
            const token = parsed && typeof parsed.rootToken === "string" ? parsed.rootToken : "";
            return /^[A-Za-z0-9_-]{32,128}$/.test(token) ? token : "";
        } catch {
            return "";
        }
    }

    // Chrome hides the real path of the folder picked in "Video đã chọn". That
    // folder IS the editor app's root folder, so its real path is looked up by
    // the native host (marker file) and, when that fails, typed by the user
    // once. The path is kept together with the folder name, so picking another
    // folder never reuses a stale path.
    const EDITOR_LIST_PATH_KEY = NS + "editor_list_root_path";
    const EDITOR_BRIDGE_SETTINGS_KEY = "editorBridgeSettings";

    // Same storage key/shape background.js reads for the Native editor bridge.
    async function readEditorBridgeSettings() {
        const empty = { enabled: false, appPath: "", rootPath: "", rootName: "", rootToken: "" };
        try {
            const res = await chrome.storage.local.get(EDITOR_BRIDGE_SETTINGS_KEY);
            const raw = res && res[EDITOR_BRIDGE_SETTINGS_KEY];
            if (!raw || typeof raw !== "object") return empty;
            const text = (value) => (typeof value === "string" ? value.trim() : "");
            return {
                enabled: raw.enabled === true,
                appPath: text(raw.appPath),
                rootPath: text(raw.rootPath),
                rootName: text(raw.rootName),
                rootToken: text(raw.rootToken),
            };
        } catch {
            return empty;
        }
    }

    async function loadSavedListRootPath(rootName) {
        try {
            const res = await chrome.storage.local.get(EDITOR_LIST_PATH_KEY);
            const saved = res && res[EDITOR_LIST_PATH_KEY];
            return saved && saved.name === rootName && typeof saved.path === "string" ? saved.path : "";
        } catch {
            return "";
        }
    }

    // Trims a pasted path ("Copy as path" adds quotes) and drops trailing
    // separators, except on a bare drive root such as "D:\".
    function cleanFullPath(raw) {
        let path = String(raw == null ? "" : raw).trim().replace(/^["']+|["']+$/g, "").trim();
        if (path.length > 3) path = path.replace(/[\\/]+$/, "");
        return path;
    }

    // "" when `path` is a usable full path for the folder named `rootName`,
    // otherwise the message to show. The folder name is the only part of the
    // real path the browser lets us check before anything is downloaded.
    function fullPathProblem(path, rootName) {
        if (!path) return "Chưa nhập đường dẫn đầy đủ của thư mục.";
        if (
            path.length > 1024 ||
            !/^(?:[A-Za-z]:[\\/]|\\\\[^\\/]+[\\/][^\\/]+)/.test(path) ||
            /[<>"|?*\x00-\x1f]/.test(path) ||
            /(?:^|[\\/])\.\.(?:[\\/]|$)/.test(path)
        ) {
            return "Đường dẫn chưa hợp lệ. Nhập đường dẫn đầy đủ, ví dụ D:\\Videos\\TikTok.";
        }
        if (/^[A-Za-z]:[\\/]?$/.test(path)) return "";
        const last = path.split(/[\\/]+/).filter(Boolean).pop() || "";
        if (rootName && last.toLowerCase() !== rootName.toLowerCase()) {
            return 'Đường dẫn phải kết thúc bằng tên thư mục "' + rootName + '" (thư mục đang chọn trong Video đã chọn).';
        }
        return "";
    }

    // Writes the same marker file the native host writes into the editor root
    // (see editorRootToken), but with a fresh random token, into the folder
    // picked in "Video đã chọn". The host finds it again at the typed path,
    // which proves the typed path really is this folder.
    async function mintListRootToken(rootPath) {
        const bytes = new Uint8Array(32);
        crypto.getRandomValues(bytes);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        const token = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
        // The host hides the marker (Hidden + System). Windows will not let a
        // write replace such a file, so drop any old marker first; the host
        // hides the fresh one again the next time it reads it.
        try {
            await rootDirHandle.removeEntry(EDITOR_ROOT_MARKER_FILE);
        } catch {}
        const handle = await rootDirHandle.getFileHandle(EDITOR_ROOT_MARKER_FILE, { create: true });
        const writable = await handle.createWritable();
        await writable.write(JSON.stringify(rootPath ? { rootToken: token, rootPath } : { rootToken: token }));
        await writable.close();
        return token;
    }

    // `confirm` is undefined on the first call. When the real path of the folder
    // picked in "Video đã chọn" is still unknown and cannot be found
    // automatically, that call returns { needConfirm: true, info } before
    // anything is downloaded; the caller asks the user to type the full path
    // and calls again with { listRootPath }.
    async function downloadAndOpenInEditor(url, confirm) {
        const item = selected.get(url);
        if (!advancedFolderMode) {
            return { ok: false, text: 'Bật "Chọn thư mục nâng cao" trước khi mở app sửa video.' };
        }
        if (!rootDirLoaded || !rootDirHandle) {
            return { ok: false, text: "Chưa chọn thư mục gốc trong danh sách Video đã chọn." };
        }
        const folderName = item && typeof item.folderName === "string" ? item.folderName : "";
        if (folderName && !currentFolders.includes(folderName)) {
            return { ok: false, text: 'Không tìm thấy thư mục con "' + item.folderName + '".' };
        }
        const rootName = typeof rootDirHandle.name === "string" ? rootDirHandle.name.trim() : "";
        if (!rootName) {
            return { ok: false, text: "Không đọc được tên thư mục gốc đã chọn." };
        }
        let rootPermission = await queryRootPermission();
        if (rootPermission !== "granted") rootPermission = await requestRootPermission();
        if (rootPermission !== "granted") {
            return { ok: false, text: "Chưa có quyền ghi vào thư mục gốc đã chọn." };
        }
        const editorSettings = await readEditorBridgeSettings();
        if (!editorSettings.enabled) {
            return { ok: false, text: "Hãy bật “Mở app sửa video” trong cài đặt tiện ích." };
        }
        if (!editorSettings.appPath) {
            return { ok: false, text: "Chưa đặt đường dẫn file .exe hoặc .py của app sửa video." };
        }
        const rootToken = await editorRootToken();
        let openToken = rootToken;
        let resolved = isEditorRootResolved(editorSettings, rootName, rootToken);
        let lookupText = "";
        if (!resolved && !confirm) {
            // The path is not known yet (folder picked while the editor was off,
            // the lookup at pick time failed...): try a quick lookup before
            // bothering the user.
            const found = await syncEditorRootFromList({ quick: true });
            if (found.busy) return { ok: false, text: found.text + " Hãy thử lại sau ít giây." };
            if (found.ok && found.token) {
                openToken = found.token;
                resolved = true;
            } else {
                lookupText = found.text || "";
            }
        }
        let sourceRootPath = "";
        if (!resolved) {
            if (!confirm) {
                return {
                    ok: false,
                    needConfirm: true,
                    text: "Chưa xác định được đường dẫn thật của thư mục trong Video đã chọn.",
                    info: {
                        listName: rootName,
                        listPath: await loadSavedListRootPath(rootName),
                        reason: lookupText || "Không tự tìm được đường dẫn thật của thư mục này.",
                    },
                };
            }
            const typedPath = cleanFullPath(confirm.listRootPath);
            const pathProblem = fullPathProblem(typedPath, rootName);
            if (pathProblem) return { ok: false, text: pathProblem };
            try {
                openToken = rootToken || (await mintListRootToken(typedPath));
            } catch (e) {
                return { ok: false, text: "Không ghi được file xác nhận vào thư mục: " + ((e && e.message) || "lỗi không xác định") };
            }
            sourceRootPath = typedPath;
            try {
                chrome.storage.local.set({ [EDITOR_LIST_PATH_KEY]: { name: rootName, path: typedPath } });
            } catch {}
        }
        if (editorOpeningUrls.has(url) || downloadingUrls.has(url)) {
            return { ok: false, text: "Video này đang được tải." };
        }

        editorOpeningUrls.add(url);
        downloadingUrls.add(url);
        showCenterToast("Đang tải video để mở app sửa video…", "ok", 2600);
        try {
            const saved = await downloadUrl(url);
            if (!saved || !saved.success || !saved.filename) {
                return { ok: false, text: (saved && saved.error) || "Không tải được video vào thư mục con." };
            }
            const opened = await sendMessage({
                type: "EDITOR_BRIDGE_OPEN_SAVED_VIDEO",
                rootName,
                folderName,
                fileName: saved.filename,
                rootToken: openToken,
                ...(sourceRootPath ? { sourceRootPath, confirmedMismatch: true } : {}),
            });
            if (!opened || !opened.success) {
                const reason = (opened && (opened.message || opened.error)) || "Không mở được app sửa video.";
                return {
                    ok: false,
                    text: sourceRootPath ? reason + " Kiểm tra lại đường dẫn đầy đủ của thư mục trong Video đã chọn." : reason,
                };
            }
            markDownloadedOnPage(url);
            // The video leaves the list. A player that shows it goes on with the video that followed it
            // (loaded, paused) instead of staying on a video that is no longer in the list: the list key T
            // looks the shown video up in the list and, not finding it, started again from the first one.
            const order = Array.from(selected.keys());
            const at = order.indexOf(url);
            const nextItem = at !== -1 && at < order.length - 1 ? selected.get(order[at + 1]) : null;
            const wasWatched = !!watchingItem && watchingItem.url === url;
            removeSelection(url, { clearPlayer: true });
            if (nextItem) advancePlayersShowing(url, nextItem, wasWatched);
            pauseTikTokPreview();
            return { ok: true, text: "✓ Đã tải xong và mở app sửa video." };
        } finally {
            editorOpeningUrls.delete(url);
            downloadingUrls.delete(url);
        }
    }

    /* ---------------- Đường dẫn thật của thư mục trong "Video đã chọn" ---------------
     * Thư mục chọn trong "Video đã chọn" chính là thư mục gốc của app sửa video (popup không còn
     * ô chọn thư mục gốc riêng). Chrome chỉ cho biết TÊN thư mục, nên khi "Mở app sửa video" đang
     * bật, ghi marker mới vào thư mục rồi nhờ native host tìm đường dẫn thật theo marker
     * (background.js, EDITOR_BRIDGE_SYNC_ROOT):
     *   - lúc chọn thư mục ở "Video đã chọn" (pickRootFolder);
     *   - lúc mở app sửa video nếu chưa biết đường dẫn (downloadAndOpenInEditor).
     * Vẫn không tìm được thì khi mở app sửa video, hộp thoại yêu cầu nhập lại đường dẫn đầy đủ
     * của thư mục này; đường dẫn đúng được lưu lại cho các lần sau.
     */
    let editorSyncBusy = false;
    let editorSyncHintSeq = 0;

    function editorSyncHintButton(label, title, onClick) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.title = title;
        button.style.cssText =
            "margin:6px 6px 0 0;max-width:100%;height:22px;padding:0 9px;border:1px solid rgba(251,191,36,.5);border-radius:6px;background:rgba(251,191,36,.12);color:#fbbf24;font-size:11px;line-height:1;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
        button.addEventListener("click", (ev) => {
            stopCardEvent(ev);
            onClick();
        });
        button.addEventListener("dblclick", stopCardEvent);
        return button;
    }

    // Đã biết đường dẫn thật của thư mục đang chọn trong "Video đã chọn": marker trong thư mục
    // trùng mã đã lưu, tên thư mục khớp tên đã lưu và đường dẫn đã có.
    function isEditorRootResolved(settings, listName, token) {
        return !!(
            token &&
            settings.rootToken &&
            token === settings.rootToken &&
            settings.rootPath &&
            settings.rootName &&
            listName &&
            listName.toLowerCase() === settings.rootName.toLowerCase()
        );
    }

    // Hiện dòng nhắc dưới ô thư mục khi đang bật "Mở app sửa video" mà chưa biết đường dẫn thật của
    // thư mục đang chọn (so tên + marker, giống bước kiểm tra khi mở app); đã biết thì ẩn.
    async function refreshEditorSyncHint() {
        const seq = ++editorSyncHintSeq;
        const el = document.getElementById(PANEL_SYNC_HINT_ID);
        if (!el) return;
        const hide = () => {
            if (seq !== editorSyncHintSeq) return;
            el.style.display = "none";
            el.textContent = "";
        };
        try {
            const settings = await readEditorBridgeSettings();
            if (seq !== editorSyncHintSeq) return;
            if (!settings.enabled || editorSyncBusy || !rootDirLoaded || !rootDirHandle) return hide();
            if ((await queryRootPermission()) !== "granted") return hide();
            const listName = typeof rootDirHandle.name === "string" ? rootDirHandle.name.trim() : "";
            const token = await editorRootToken();
            if (seq !== editorSyncHintSeq) return;
            if (!listName) return hide();
            if (isEditorRootResolved(settings, listName, token)) return hide();
            el.textContent = "";
            const message = document.createElement("div");
            message.textContent =
                "Chưa biết đường dẫn thật của thư mục “" + listName + "”. Khi mở app sửa video, app sẽ tự tìm hoặc hỏi bạn nhập đường dẫn.";
            el.appendChild(message);
            el.appendChild(editorSyncHintButton(
                "Tìm đường dẫn ngay",
                "Tìm đường dẫn thật của thư mục “" + listName + "” trên máy",
                () => { runEditorRootSync(); }
            ));
            el.style.display = "block";
        } catch {
            hide();
        }
    }

    // Tìm đường dẫn thật của thư mục đang chọn trong "Video đã chọn" và lưu làm thư mục gốc của
    // app sửa video. options.quick: chỉ quét ngắn (lúc mở app, ngay trước khi hỏi người dùng).
    // Không ném lỗi; trả { ok, text, token } (skipped: chưa bật "Mở app sửa video"; busy: đang chạy).
    async function syncEditorRootFromList(options) {
        const opts = options || {};
        if (editorSyncBusy) return { ok: false, busy: true, text: "Đang tìm đường dẫn thư mục…" };
        editorSyncBusy = true;
        refreshEditorSyncHint();
        try {
            const settings = await readEditorBridgeSettings();
            // opts.force: the "Mở thư mục" button needs the real path even while "Mở app sửa video" is off.
            if (!settings.enabled && !opts.force) return { ok: false, skipped: true, text: "" };
            if (!rootDirLoaded || !rootDirHandle) return { ok: false, text: "Chưa chọn thư mục trong Video đã chọn." };
            const rootName = typeof rootDirHandle.name === "string" ? rootDirHandle.name.trim() : "";
            if (!rootName) return { ok: false, text: "Không đọc được tên thư mục đã chọn." };
            if ((await queryRootPermission()) !== "granted") {
                return { ok: false, text: "Chưa có quyền ghi vào thư mục đã chọn." };
            }
            const current = await editorRootToken();
            if (isEditorRootResolved(settings, rootName, current)) {
                return { ok: true, text: "✓ Đã biết đường dẫn thư mục: " + settings.rootPath, token: current };
            }
            showCenterToast("Đang tìm đường dẫn thật của thư mục “" + rootName + "”…", "ok", opts.quick ? 5000 : 25000);
            let token;
            try {
                token = await mintListRootToken("");
            } catch (e) {
                return { ok: false, text: "Không ghi được file xác nhận vào thư mục: " + ((e && e.message) || "lỗi không xác định") };
            }
            const res = await sendMessage({
                type: "EDITOR_BRIDGE_SYNC_ROOT",
                folderName: rootName,
                rootToken: token,
                hintPath: await loadSavedListRootPath(rootName),
                seconds: opts.quick ? 3 : 20,
                ...(opts.force ? { force: true } : {}),
            });
            if (!res || !res.success) {
                return { ok: false, text: (res && (res.message || res.error)) || "Không tìm được đường dẫn thật của thư mục." };
            }
            // Cũng nhớ đường dẫn này làm gợi ý cho lần tìm sau.
            try {
                chrome.storage.local.set({ [EDITOR_LIST_PATH_KEY]: { name: rootName, path: res.path } });
            } catch {}
            return { ok: true, text: "✓ Đã xác định thư mục gốc của app sửa video: " + res.path, token };
        } catch (e) {
            return { ok: false, text: (e && e.message) || "Không tìm được đường dẫn thật của thư mục." };
        } finally {
            editorSyncBusy = false;
            refreshEditorSyncHint();
        }
    }

    async function runEditorRootSync() {
        const result = await syncEditorRootFromList();
        if (result.skipped || result.busy) return;
        const text = result.ok
            ? result.text
            : result.text + " Khi mở app sửa video, app sẽ yêu cầu bạn nhập lại đường dẫn đầy đủ của thư mục này.";
        showCenterToast(text, result.ok ? "ok" : "warn", result.ok ? 3500 : 9000);
    }

    // "Mở thư mục" button: shows the folder the videos are saved in, in Windows Explorer.
    //  - No folder chosen: videos go through chrome.downloads, so it is Chrome's own download
    //    folder (background.js OPEN_DOWNLOAD_FOLDER -> chrome.downloads.showDefaultFolder()).
    //  - Folder chosen: Chrome only tells its NAME, so the native host opens the real path
    //    (background.js EDITOR_BRIDGE_OPEN_FOLDER -> host action open_folder). The real path is
    //    the one found for the editor root (marker file); when it is not known yet it is looked
    //    up now, also while "Mở app sửa video" is off (force).
    let openFolderBusy = false;

    async function runOpenDownloadFolder() {
        if (!rootDirLoaded) return { ok: false, text: "Đang tải thông tin thư mục, hãy thử lại sau giây lát." };
        if (!rootDirHandle) {
            const res = await sendMessage({ type: "OPEN_DOWNLOAD_FOLDER" });
            if (res && res.success) return { ok: true };
            return { ok: false, text: (res && (res.message || res.error)) || "Không mở được thư mục tải về." };
        }
        const rootName = typeof rootDirHandle.name === "string" ? rootDirHandle.name.trim() : "";
        if (!rootName) return { ok: false, text: "Không đọc được tên thư mục đã chọn." };
        let permission = await queryRootPermission();
        if (permission !== "granted") permission = await requestRootPermission();
        refreshSavePathUI();
        if (permission !== "granted") {
            return { ok: false, text: "Chưa có quyền với thư mục đã chọn. Nhấp ô thư mục để cấp lại quyền." };
        }
        let settings = await readEditorBridgeSettings();
        let token = await editorRootToken();
        let searched = false;
        if (!isEditorRootResolved(settings, rootName, token)) {
            searched = true;
            const found = await syncEditorRootFromList({ force: true });
            if (!found.ok || !found.token) {
                return { ok: false, text: found.text || "Không tìm được đường dẫn thật của thư mục." };
            }
            settings = await readEditorBridgeSettings();
            token = found.token;
        }
        const opened = await sendMessage({
            type: "EDITOR_BRIDGE_OPEN_FOLDER",
            rootPath: settings.rootPath,
            rootToken: token,
        });
        if (opened && opened.success) return { ok: true, searched };
        return { ok: false, text: (opened && (opened.message || opened.error)) || "Không mở được thư mục." };
    }

    async function openDownloadFolder() {
        if (openFolderBusy) return;
        openFolderBusy = true;
        try {
            const result = await runOpenDownloadFolder();
            if (result.ok) {
                // The "looking for the real path" toast (up to 25 s) is no longer true once Explorer is open.
                if (result.searched) hideCenterToast();
            } else {
                showCenterToast(result.text, "warn", result.text.length > 90 ? 8000 : 4500);
            }
        } catch (e) {
            showCenterToast((e && e.message) || "Không mở được thư mục tải về.", "warn", 4500);
        } finally {
            openFolderBusy = false;
        }
    }

    function pauseTikTokPreview() {
        // TikTok can retain a hidden preloaded video beside the visible
        // player, so pause every video in this document after the explicit
        // "open editor" action succeeds.
        document.querySelectorAll("video").forEach((video) => {
            try { video.pause(); } catch {}
        });
    }

    async function pickRootFolder() {
        if (typeof window.showDirectoryPicker !== "function") {
            const textEl = document.getElementById(PANEL_SAVEPATH_TEXT_ID);
            if (textEl) textEl.textContent = "Trình duyệt này chưa hỗ trợ chọn thư mục";
            return;
        }
        let handle;
        try {
            handle = await window.showDirectoryPicker({ id: NS + "root", mode: "readwrite" });
        } catch {
            return; // user cancelled the native dialog — nothing to do
        }
        try {
            const permission = await handle.requestPermission({ mode: "readwrite" });
            if (permission !== "granted") return;
        } catch {
            return;
        }
        rootDirHandle = handle;
        try {
            await idbSet(SAVEPATH_IDB_KEY, handle);
        } catch {}
        refreshSavePathUI();
        // A freshly (re)picked root folder means any previous subfolder list
        // is for the OLD root and must not linger — rescanFolders() reads the
        // new one, renumbers 1→N, and re-validates every video's mapping
        // against it (clearing any that no longer resolve), per section 18.
        if (advancedFolderMode) await rescanFolders();
        else renderAdvancedFolderSection();
        // Tự tìm đường dẫn thật của thư mục vừa chọn (chỉ khi "Mở app sửa video" đang bật).
        await runEditorRootSync();
    }

    async function clearRootFolder() {
        rootDirHandle = null;
        try {
            await idbDelete(SAVEPATH_IDB_KEY);
        } catch {}
        refreshSavePathUI();
        await rescanFolders(); // no root -> empties currentFolders and clears every video's mapping
    }

    function folderIconSvg() {
        return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex:none;"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg>';
    }

    // Triangle for the "Thư mục con" toggle. Drawn pointing right (collapsed);
    // applyFoldersCollapsed() rotates it 90deg to point down (expanded).
    function foldersToggleIconSvg() {
        return '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round" style="display:block;flex:none;transition:transform .15s;transform:rotate(90deg);"><path d="M7 3.5 21 12 7 20.5Z"/></svg>';
    }

    // Re-renders the box's display text/color from current in-memory state.
    // Safe to call any time — quietly no-ops if the panel isn't built yet.
    async function refreshSavePathUI() {
        refreshEditorSyncHint();
        const textEl = document.getElementById(PANEL_SAVEPATH_TEXT_ID);
        const box = document.getElementById(PANEL_SAVEPATH_BOX_ID);
        const clearBtn = document.getElementById(PANEL_SAVEPATH_CLEAR_ID);
        if (!textEl || !box) return;
        if (!rootDirLoaded) {
            textEl.textContent = "Đang tải…";
            box.style.color = "rgba(255,255,255,.55)";
            if (clearBtn) clearBtn.style.display = "none";
            savePathNeedsPermission = false;
            return;
        }
        if (!rootDirHandle) {
            textEl.textContent = "Chưa chọn thư mục — nhấp để chọn";
            box.style.color = "rgba(255,255,255,.5)";
            if (clearBtn) clearBtn.style.display = "none";
            savePathNeedsPermission = false;
            return;
        }
        if (clearBtn) clearBtn.style.display = "";
        const permission = await queryRootPermission();
        const rootName = rootDirHandle.name || "(thư mục đã chọn)";
        if (permission !== "granted") {
            textEl.textContent = "⚠ " + rootName + " — nhấp để cấp lại quyền";
            box.style.color = "#fbbf24";
            savePathNeedsPermission = true;
            return;
        }
        savePathNeedsPermission = false;
        textEl.textContent = rootName;
        box.style.color = "#67e8f9";
    }

    /* ---------------- Advanced folder mode (Video ↔ subfolder mapping) ---------------
     * Only active when advancedFolderMode === true AND a root folder is
     * chosen (the same root the flat "Save to folder" box above already
     * manages — advanced mode does not introduce a second root picker, it
     * reuses that one). Adds:
     *   - a numbered list of the root's direct subfolders (currentFolders),
     *   - a Folder column on every row in the panel list, letting a video be
     *     mapped to one of those subfolders by number, by typing or by
     *     clicking a folder chip after focusing the row's input,
     *   - validation of that number, and a warning before downloading any
     *     video that still has no folder chosen.
     * Mappings are kept as the subfolder's NAME on the item itself
     * (item.folderName), not its position, so a rescan can tell a
     * still-present folder apart from one that was deleted/renamed and
     * clear only the mappings that no longer resolve (see
     * reconcileFolderMappings) instead of trusting stale numbers.
     */

    // The File System Access API deliberately never exposes real OS-level
    // file attributes (Windows' "Hidden" checkbox/attrib +H, macOS Finder's
    // hidden flag, a Linux dotfile's own semantics, etc.) — a
    // FileSystemDirectoryHandle entry only ever gives a plain name and a
    // kind, nothing else, by design (same sandboxing this whole feature
    // already works within). The one "hidden folder" signal that IS
    // readable from the name alone — and is the standard convention on
    // macOS/Linux, plus widely recognized by cross-platform tools on
    // Windows too — is a leading dot, e.g. ".git", ".cache". That's what
    // this checks; it can't and doesn't check the Windows Hidden attribute
    // itself, since the API has no way to read that.
    function isHiddenFolderName(name) {
        return typeof name === "string" && name.charAt(0) === ".";
    }

    // Re-reads the direct subfolders of rootDirHandle, renumbers them, and
    // re-validates every selected video's mapping against the new list.
    // Safe to call any time (init, toggling the setting on, re-picking or
    // clearing the root, the manual refresh button, or automatically after a
    // download fails with "folder not found").
    async function rescanFolders() {
        if (!rootDirHandle) {
            currentFolders = [];
            folderHandleCache.clear();
            advFolderStatus = "no-root";
            reconcileFolderMappings();
            renderAdvancedFolderSection();
            if (panelOpen) renderPanelList();
            return;
        }
        const permission = await queryRootPermission();
        if (permission !== "granted") {
            advFolderStatus = "no-permission";
            renderAdvancedFolderSection();
            return;
        }
        advFolderStatus = "loading";
        renderAdvancedFolderSection();
        const names = [];
        const cache = new Map();
        try {
            // FileSystemDirectoryHandle is async-iterable; only entries whose
            // own kind is "directory" are subfolders — files sitting directly
            // in the root are ignored, matching section 6 of the spec (only
            // direct child folders, not files, not deeper levels). Hidden
            // (dot-prefixed) subfolders are skipped too — see
            // isHiddenFolderName above for why only that convention, and not
            // the OS's own Hidden attribute, can be checked here.
            for await (const [name, handle] of rootDirHandle.entries()) {
                if (handle.kind === "directory" && !isHiddenFolderName(name)) {
                    names.push(name);
                    cache.set(name, handle);
                }
            }
        } catch {
            // Read failed entirely (e.g. permission revoked mid-flight) —
            // treat as "no subfolders" rather than leaving stale data around.
            currentFolders = [];
            folderHandleCache.clear();
            advFolderStatus = "empty";
            reconcileFolderMappings();
            renderAdvancedFolderSection();
            if (panelOpen) renderPanelList();
            return;
        }
        // Stable, deterministic order so folder numbers don't reshuffle
        // between rescans unless the actual set of subfolders changed.
        names.sort((a, b) => a.localeCompare(b, "vi", { numeric: true, sensitivity: "base" }));
        // ...then the user's own drag-to-reorder arrangement (if any) wins
        // over that alphabetical default; folders it doesn't know about yet
        // (newly created) are appended at the end in alphabetical order.
        currentFolders = applySavedFolderOrder(names, await loadSavedFolderOrder(folderOrderRootKey()));
        folderHandleCache = cache;
        advFolderStatus = names.length ? "ready" : "empty";
        reconcileFolderMappings();
        renderAdvancedFolderSection();
        if (panelOpen) renderPanelList();
    }

    // Clears any video's mapping whose folder name is no longer among
    // currentFolders (deleted, renamed, or the root itself changed) — never
    // blindly keeps a stale mapping, per section 17/18 of the spec.
    function reconcileFolderMappings() {
        let invalidated = 0;
        for (const item of selected.values()) {
            if (item.folderName && !currentFolders.includes(item.folderName)) {
                item.folderName = null;
                invalidated++;
            }
        }
        if (invalidated > 0) {
            showCenterToast(
                invalidated + " video đã mất liên kết vì thư mục không còn tồn tại",
                "warn",
                5000
            );
        }
    }

    // 1-based position of `name` in currentFolders, or 0 if it isn't there.
    function folderIndexForName(name) {
        const idx = currentFolders.indexOf(name);
        return idx === -1 ? 0 : idx + 1;
    }

    // Applies folder #idx (1-based) to whichever video owns `inputEl`,
    // validating range first. Shared by the input's own change handler and
    // by clicking a folder chip (section 10/11 of the spec — typing a number
    // and clicking a folder both end up here).
    function applyFolderMapping(inputEl, idx) {
        const row = inputEl.closest("[data-url]");
        const item = row && selected.get(row.dataset.url);
        if (!item) return;
        if (!Number.isInteger(idx) || idx < 1) {
            inputEl.value = "";
            item.folderName = null;
            markFolderInputValidity(inputEl, true);
            return;
        }
        if (idx > currentFolders.length) {
            inputEl.value = "";
            item.folderName = null;
            markFolderInputValidity(inputEl, true);
            showCenterToast("Folder số " + idx + " không tồn tại.", "error", 3000);
            return;
        }
        item.folderName = currentFolders[idx - 1];
        inputEl.value = String(idx);
        markFolderInputValidity(inputEl, true);
    }

    function markFolderInputValidity(inputEl, valid) {
        inputEl.style.borderColor = valid ? "rgba(34,211,238,.55)" : "rgba(251,113,133,.7)";
        inputEl.style.color = valid ? "#67e8f9" : "#fb7185";
    }

    // Handles the Folder-column <input> being typed into directly. Only
    // positive integers are accepted at all (section 13); an in-range one is
    // resolved to a folder name via applyFolderMapping, everything else is
    // rejected with the video left unmapped rather than guessing.
    function handleFolderInputChange(item, inputEl) {
        const raw = inputEl.value.trim();
        if (raw === "") {
            item.folderName = null;
            markFolderInputValidity(inputEl, true);
            return;
        }
        if (!/^[1-9][0-9]*$/.test(raw)) {
            inputEl.value = "";
            item.folderName = null;
            markFolderInputValidity(inputEl, false);
            showCenterToast("Chỉ chấp nhận số nguyên dương (1-" + currentFolders.length + ").", "error", 3000);
            setTimeout(() => markFolderInputValidity(inputEl, true), 1500);
            return;
        }
        applyFolderMapping(inputEl, parseInt(raw, 10));
    }

    // After a row is removed from an already-open panel (removePanelRowByUrl
    // touches only that one row, not a full rebuild), every row below it has
    // shifted up one position — this brings their ①②③ badges back in sync
    // without re-rendering thumbnails/inputs. No-op outside advanced mode,
    // where those badges don't exist.
    function renumberVisibleRows() {
        if (!advancedFolderMode) return;
        const list = document.getElementById(PANEL_LIST_ID);
        if (!list) return;
        const rows = list.querySelectorAll("[data-url]");
        rows.forEach((row, i) => {
            const badge = row.querySelector("." + ROW_NUM_BADGE_CLASS);
            if (badge) badge.textContent = String(i + 1);
        });
    }

    // Renders the "Thư mục con" block inside the panel (folder chips /
    // empty-root hint / permission hint) and sizes the panel itself — wider
    // in advanced mode so the new Folder column and badges have room without
    // squeezing the existing video info, unchanged (320px) otherwise. Safe
    // to call any time, including before the panel has been built yet.
    function renderAdvancedFolderSection() {
        const panel = document.getElementById(PANEL_ID);
        if (panel) {
            panel.style.width = (advancedFolderMode ? 400 : 320) + "px";
            // positionPanelNearFab() pins the panel's LEFT edge to a fixed
            // pixel value computed from the FAB's position (see that
            // function), so changing the width alone — which is all the
            // line above does — only grows the panel further to the right,
            // potentially off-screen or overlapping the page, since the
            // right edge is whatever moves. Advanced folder mode can be
            // toggled from the popup/sidepanel while this panel is already
            // open (see the chrome.storage.onChanged listener above), so
            // re-anchoring here — not just when the panel first opens —
            // is what makes the panel grow toward the FAB (left) instead.
            if (panelOpen) positionPanelNearFab();
        }
        const section = document.getElementById(PANEL_ADV_SECTION_ID);
        const listEl = document.getElementById(PANEL_FOLDER_LIST_ID);
        if (!section || !listEl) return;
        if (!advancedFolderMode) {
            section.style.display = "none";
            return;
        }
        section.style.display = "block";
        listEl.innerHTML = "";
        if (!rootDirHandle) {
            listEl.innerHTML = '<div style="font-size:11px;opacity:.55;">Chọn thư mục gốc ở trên để bắt đầu.</div>';
            return;
        }
        if (advFolderStatus === "loading") {
            listEl.innerHTML = '<div style="font-size:11px;opacity:.55;">Đang đọc thư mục con…</div>';
            return;
        }
        if (advFolderStatus === "no-permission") {
            listEl.innerHTML = '<div style="font-size:11px;color:#fbbf24;">Thư mục cần được cấp lại quyền (nhấp vào ô phía trên).</div>';
            return;
        }
        if (advFolderStatus === "empty") {
            const hint = document.createElement("div");
            hint.style.cssText = "font-size:11px;opacity:.65;margin-bottom:6px;";
            hint.textContent = "Thư mục đã chọn không có thư mục con.";
            listEl.appendChild(hint);
            const btn = document.createElement("button");
            btn.type = "button";
            btn.textContent = "Chọn thư mục khác";
            btn.style.cssText =
                "font-size:11px;padding:5px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:#fff;cursor:pointer;";
            btn.addEventListener("click", (ev) => {
                stopCardEvent(ev);
                pickRootFolder();
            });
            listEl.appendChild(btn);
            return;
        }
        currentFolders.forEach((name, i) => {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = FOLDER_CHIP_CLASS;
            chip.textContent = "[" + (i + 1) + "] " + name;
            chip.dataset.folderName = name;
            chip.title = "Kéo để đổi vị trí. Bấm để liên kết: chỉ có 1 video (hoặc chỉ còn 1 video chưa liên kết) thì tự điền; còn lại bấm vào ô số của video trước.";
            chip.style.cssText =
                "font-size:11px;padding:4px 8px;border-radius:7px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#a5f3fc;cursor:grab;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;touch-action:none;user-select:none;";
            chip.addEventListener("click", (ev) => {
                stopCardEvent(ev);
                if (Date.now() < chipClickSuppressUntil) return;
                // Exactly one selected video: there is no ambiguity about
                // which video the folder is for, so link it straight away
                // without making the user focus that row's number box first.
                const soleInput = selected.size === 1 ? soleRowFolderInput() : null;
                if (soleInput) {
                    applyFolderMapping(soleInput, i + 1);
                    return;
                }
                const focusAlive = !!focusedFolderInputEl && focusedFolderInputEl.isConnected;
                // The user just picked a row's number box on purpose: honour
                // that row, even when exactly one other video is unmapped.
                if (focusAlive && Date.now() - focusedFolderInputAt < FOLDER_FOCUS_FRESH_MS) {
                    applyFolderMapping(focusedFolderInputEl, i + 1);
                    return;
                }
                // Several videos selected but exactly one of them has no
                // folder yet: it is the only one the click can be meant for.
                const unmappedInput = soleUnmappedRowFolderInput();
                if (unmappedInput) {
                    applyFolderMapping(unmappedInput, i + 1);
                    return;
                }
                if (!focusAlive) {
                    showCenterToast("Hãy bấm vào ô số của video trước, rồi bấm thư mục để liên kết.", "warn", 3000);
                    return;
                }
                applyFolderMapping(focusedFolderInputEl, i + 1);
            });
            listEl.appendChild(chip);
        });
    }

    /* ---------------- Single-video shortcut ----------------
     * With exactly one selected video there is nothing to disambiguate, so a
     * click on a subfolder chip links that folder straight to that video's
     * number box (the chip click handler in renderAdvancedFolderSection).
     * The same applies when several videos are selected but exactly one of
     * them has no folder yet (soleUnmappedRowFolderInput).
     */
    function soleRowFolderInput() {
        const list = document.getElementById(PANEL_LIST_ID);
        if (!list) return null;
        const rows = list.querySelectorAll("[data-url]");
        if (rows.length !== 1) return null;
        return rows[0].querySelector("." + ROW_FOLDER_INPUT_CLASS);
    }

    // The Folder-column <input> of the one selected video that has no folder
    // yet, or null when zero or several videos are still unmapped.
    function soleUnmappedRowFolderInput() {
        const list = document.getElementById(PANEL_LIST_ID);
        if (!list) return null;
        let found = null;
        for (const row of list.querySelectorAll("[data-url]")) {
            const item = selected.get(row.dataset.url);
            if (!item || item.folderName) continue;
            if (found) return null;
            found = row;
        }
        return found ? found.querySelector("." + ROW_FOLDER_INPUT_CLASS) : null;
    }

    // Refreshes every visible row's number box after the folder numbering
    // changed (chips re-ordered). Mappings are stored by folder NAME, so only
    // the displayed number has to follow; no row is rebuilt (thumbnails stay).
    function syncRowFolderInputs() {
        const list = document.getElementById(PANEL_LIST_ID);
        if (!list) return;
        list.querySelectorAll("[data-url]").forEach((row) => {
            const item = selected.get(row.dataset.url);
            const input = row.querySelector("." + ROW_FOLDER_INPUT_CLASS);
            if (!item || !input) return;
            const idx = item.folderName ? folderIndexForName(item.folderName) : 0;
            input.value = idx ? String(idx) : "";
            input.style.borderColor = idx ? "rgba(34,211,238,.55)" : "rgba(255,255,255,.15)";
            input.style.color = idx ? "#67e8f9" : "#fff";
        });
    }

    /* ---------------- Folder chip re-ordering ----------------
     * The subfolder chips can be dragged to a new position; the arrangement
     * is saved in chrome.storage.local and re-applied by every rescanFolders(),
     * so it survives page loads and panel re-opens. Position = folder number,
     * so re-ordering also renumbers.
     *
     * The arrangement is ONE list shared by every root folder
     * (FOLDER_ORDER_ALL_KEY), so a subfolder keeps its place relative to the
     * others whichever parent folder is open: switching to another parent lists
     * the subfolders it has in common with the previous one in the order the
     * user already arranged, and the rest follow alphabetically. Dragging a chip
     * moves only that chip in the shared list, so the order of folders that the
     * open root does not have is left alone.
     */
    function folderOrderRootKey() {
        return rootDirHandle && rootDirHandle.name ? rootDirHandle.name : "";
    }

    function cleanFolderNameList(list) {
        return Array.isArray(list) ? list.filter((n) => typeof n === "string") : [];
    }

    // The shared arrangement. Until a chip has been dragged once, it is built
    // from the per-root lists saved before: the open root's own list first (so
    // its order stays as it was), then whatever names the other roots add.
    function sharedFolderOrder(res, rootKey) {
        const shared = res && res[FOLDER_ORDER_ALL_KEY];
        if (Array.isArray(shared)) return cleanFolderNameList(shared);
        const perRoot = res && res[FOLDER_ORDER_KEY];
        if (!perRoot || typeof perRoot !== "object") return [];
        const lists = [cleanFolderNameList(perRoot[rootKey])];
        for (const key of Object.keys(perRoot)) {
            if (key !== rootKey) lists.push(cleanFolderNameList(perRoot[key]));
        }
        const out = [];
        for (const list of lists) {
            for (const n of list) if (!out.includes(n)) out.push(n);
        }
        return out;
    }

    // `name` was dragged to its place in `next` (the open root's new order).
    // Moves just that name in the shared list, to sit right before the folder
    // that now follows it (or right after the one before it, when dropped
    // last). Every other folder keeps its place, so the shared order restricted
    // to this root's folders becomes exactly `next`. Folders of this root that
    // the shared list does not know yet are appended first.
    function moveInSharedFolderOrder(shared, name, next) {
        if (!next.includes(name)) return shared;
        const list = shared.filter((n) => n !== name);
        for (const n of next) {
            if (n !== name && !list.includes(n)) list.push(n);
        }
        const at = next.indexOf(name);
        const before = at < next.length - 1;
        const anchor = list.indexOf(before ? next[at + 1] : next[at - 1]);
        if (anchor === -1) {
            list.push(name);
        } else {
            list.splice(before ? anchor : anchor + 1, 0, name);
        }
        return list;
    }

    function loadSavedFolderOrder(rootKey) {
        return new Promise((resolve) => {
            try {
                chrome.storage.local.get([FOLDER_ORDER_KEY, FOLDER_ORDER_ALL_KEY], (res) => {
                    resolve(sharedFolderOrder(res, rootKey));
                });
            } catch {
                resolve([]);
            }
        });
    }

    // `names` = the open root's new order, `movedName` = the chip just dragged.
    function saveFolderOrder(rootKey, names, movedName) {
        try {
            chrome.storage.local.get([FOLDER_ORDER_KEY, FOLDER_ORDER_ALL_KEY], (res) => {
                const shared = moveInSharedFolderOrder(sharedFolderOrder(res, rootKey), movedName, names);
                chrome.storage.local.set({ [FOLDER_ORDER_ALL_KEY]: shared });
            });
        } catch {}
    }

    // `names` is the freshly scanned (alphabetical) list. Saved names that
    // still exist keep their saved order; anything new goes after them.
    function applySavedFolderOrder(names, saved) {
        if (!Array.isArray(saved) || saved.length === 0) return names;
        const remaining = new Set(names);
        const ordered = [];
        for (const n of saved) {
            if (remaining.has(n)) {
                ordered.push(n);
                remaining.delete(n);
            }
        }
        for (const n of names) if (remaining.has(n)) ordered.push(n);
        return ordered;
    }

    function clearFolderDropIndicators() {
        const listEl = document.getElementById(PANEL_FOLDER_LIST_ID);
        if (!listEl) return;
        listEl.querySelectorAll("." + FOLDER_CHIP_CLASS).forEach((c) => {
            c.style.boxShadow = "";
        });
    }

    function blockSelectDuringDrag(ev) {
        ev.preventDefault();
    }

    function onFolderChipPointerDown(ev) {
        if (!advancedFolderMode) return;
        // Primary button / touch / pen contact only (those all report 0).
        if (ev.button !== 0) return;
        // A previous drag whose pointerup never arrived must not wedge
        // dragging for good: tidy it up and start fresh.
        if (folderDragState) endFolderDrag();
        const chip = ev.target && ev.target.closest ? ev.target.closest("." + FOLDER_CHIP_CLASS) : null;
        if (!chip || !chip.dataset.folderName) return;
        folderDragState = {
            chip,
            name: chip.dataset.folderName,
            startX: ev.clientX,
            startY: ev.clientY,
            dragging: false,
            insertAt: -1,
        };
        window.addEventListener("pointermove", onFolderDragMove, true);
        window.addEventListener("pointerup", onFolderDragEnd, true);
        window.addEventListener("pointercancel", onFolderDragEnd, true);
    }

    function onFolderDragMove(ev) {
        const st = folderDragState;
        if (!st) return;
        if (!st.dragging) {
            // A plain click (no real movement) must stay a click: only turn
            // into a drag once the pointer has moved past a small threshold.
            if (Math.hypot(ev.clientX - st.startX, ev.clientY - st.startY) < CHIP_DRAG_THRESHOLD_PX) return;
            st.dragging = true;
            st.chip.style.opacity = ".45";
            st.chip.style.cursor = "grabbing";
            try {
                window.getSelection().removeAllRanges();
            } catch {}
            window.addEventListener("selectstart", blockSelectDuringDrag, true);
        }
        ev.preventDefault();
        const listEl = document.getElementById(PANEL_FOLDER_LIST_ID);
        const chips = listEl ? Array.from(listEl.querySelectorAll("." + FOLDER_CHIP_CLASS)) : [];
        if (!chips.includes(st.chip)) {
            // The chips were rebuilt under us (e.g. a rescan): give up.
            endFolderDrag();
            return;
        }
        // Drop target = the chip nearest to the pointer (works across wrapped
        // rows); left half -> insert before it, right half -> after it.
        let best = -1;
        let bestDist = Infinity;
        chips.forEach((c, i) => {
            const r = c.getBoundingClientRect();
            const dx = Math.max(r.left - ev.clientX, 0, ev.clientX - r.right);
            const dy = Math.max(r.top - ev.clientY, 0, ev.clientY - r.bottom);
            const d = dx * dx + dy * dy;
            if (d < bestDist) {
                bestDist = d;
                best = i;
            }
        });
        clearFolderDropIndicators();
        if (best === -1) return;
        const r = chips[best].getBoundingClientRect();
        const after = ev.clientX > r.left + r.width / 2;
        st.insertAt = best + (after ? 1 : 0);
        chips[best].style.boxShadow = after ? "inset -3px 0 0 #22d3ee" : "inset 3px 0 0 #22d3ee";
    }

    function endFolderDrag() {
        const st = folderDragState;
        folderDragState = null;
        window.removeEventListener("pointermove", onFolderDragMove, true);
        window.removeEventListener("pointerup", onFolderDragEnd, true);
        window.removeEventListener("pointercancel", onFolderDragEnd, true);
        window.removeEventListener("selectstart", blockSelectDuringDrag, true);
        if (st) {
            if (st.dragging) chipClickSuppressUntil = Date.now() + 300;
            if (st.chip.isConnected) {
                st.chip.style.opacity = "";
                st.chip.style.cursor = "grab";
            }
        }
        clearFolderDropIndicators();
    }

    function onFolderDragEnd(ev) {
        const st = folderDragState;
        if (!st) return;
        const reorder = st.dragging && ev.type === "pointerup" && st.insertAt >= 0;
        const insertAt = st.insertAt;
        endFolderDrag();
        if (!reorder) return;
        // insertAt is a slot in the list as it was BEFORE removing the
        // dragged chip, so it shifts down by one when moving rightwards.
        const from = currentFolders.indexOf(st.name);
        if (from === -1) return;
        const next = currentFolders.slice();
        next.splice(from, 1);
        next.splice(insertAt > from ? insertAt - 1 : insertAt, 0, st.name);
        if (next.every((n, i) => n === currentFolders[i])) return;
        currentFolders = next;
        saveFolderOrder(folderOrderRootKey(), next, st.name);
        renderAdvancedFolderSection();
        syncRowFolderInputs();
    }

    // A small confirm/choice overlay, independent of the panel (so it still
    // shows even if the panel were to close), used for the "video(s) chưa
    // được chọn thư mục" warning below. Resolves with whichever button's
    // `value` was clicked, or "cancel" if the user clicks outside the card.
    function showConfirmModal({ title, message, buttons }) {
        return new Promise((resolve) => {
            const overlay = document.createElement("div");
            overlay.style.cssText =
                "position:fixed!important;inset:0!important;background:rgba(0,0,0,.5)!important;z-index:2147483647!important;display:flex!important;align-items:center!important;justify-content:center!important;";
            const card = document.createElement("div");
            card.style.cssText =
                "width:280px;max-width:90vw;background:rgba(20,20,26,.98);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:16px;box-shadow:0 16px 48px rgba(0,0,0,.6);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#fff;";
            card.innerHTML =
                (title ? '<div style="font-weight:700;font-size:13.5px;margin-bottom:6px;">' + escapeHtml(title) + "</div>" : "") +
                '<div style="font-size:12.5px;opacity:.85;line-height:1.5;margin-bottom:14px;">' + escapeHtml(message) + "</div>";
            const btnRow = document.createElement("div");
            btnRow.style.cssText = "display:flex;flex-direction:column;gap:8px;";
            buttons.forEach((b) => {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.textContent = b.label;
                btn.style.cssText =
                    "height:34px;border-radius:9px;font-size:12.5px;font-weight:700;cursor:pointer;" +
                    (b.primary
                        ? "border:0;background:linear-gradient(135deg,#a855f7,#22d3ee);color:#fff;"
                        : "border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#fff;");
                btn.addEventListener("click", (ev) => {
                    stopCardEvent(ev);
                    if (overlay.isConnected) document.body.removeChild(overlay);
                    resolve(b.value);
                });
                btnRow.appendChild(btn);
            });
            card.appendChild(btnRow);
            overlay.appendChild(card);
            for (const type of ["pointerdown", "mousedown", "touchstart"]) {
                overlay.addEventListener(type, (ev) => ev.stopPropagation(), true);
            }
            overlay.addEventListener("click", (ev) => {
                if (ev.target !== overlay) return;
                if (overlay.isConnected) document.body.removeChild(overlay);
                resolve("cancel");
            });
            (document.body || document.documentElement).appendChild(overlay);
        });
    }

    // Section 14 of the spec: before downloading, any video still missing a
    // folder mapping must be called out — never silently assigned a random
    // folder. Returns the list of items to actually download:
    //   - unchanged, for "Tải về thư mục gốc" AND for the default case
    //     (nothing unmapped, or advanced mode isn't active) — an item left
    //     with folderName === null/undefined already saves straight into
    //     rootDirHandle (see saveToChosenFolder's `targetDirHandle` default),
    //     so no special-casing is needed here to make that happen;
    //   - a subset (only the already-mapped ones), for "Bỏ qua video này";
    //   - or null if the batch should not proceed at all ("Hủy", or "Chọn
    //     thư mục" — which instead focuses the first unmapped row so the
    //     user can map it and press download again).
    async function resolveDownloadBatch(items) {
        if (!advancedFolderMode || !rootDirHandle) return items;
        const unmapped = items.filter((i) => !i.folderName);
        if (unmapped.length === 0) return items;
        const choice = await showConfirmModal({
            title: "Có video chưa được chọn thư mục",
            message: unmapped.length + "/" + items.length + " video chưa được liên kết với thư mục con. Bạn muốn làm gì?",
            buttons: [
                { label: "Chọn thư mục", value: "map", primary: true },
                { label: "Tải về thư mục gốc", value: "root" },
                { label: "Bỏ qua video này", value: "skip" },
                { label: "Hủy", value: "cancel" },
            ],
        });
        if (choice === "root") return items;
        if (choice === "skip") return items.filter((i) => i.folderName);
        if (choice === "map") {
            const first = unmapped[0];
            const row = document.querySelector('[data-url="' + CSS.escape(first.url) + '"]');
            const input = row && row.querySelector("." + ROW_FOLDER_INPUT_CLASS);
            if (input) {
                input.focus();
                try {
                    input.scrollIntoView({ block: "center", behavior: "smooth" });
                } catch {}
            }
        }
        return null;
    }

    // The rename box gives every downloaded file its name. When a download
    // button of the panel is pressed while that box is still empty, warn
    // first: "Nhập tên" focuses the box and downloads nothing, "Vẫn tải"
    // downloads with the default names, a click outside cancels. Resolves
    // true when the download may go ahead.
    async function confirmRenameBeforeDownload() {
        const input = document.getElementById(PANEL_RENAME_INPUT_ID);
        if (!input || normalizeRenameBase(input.value)) return true;
        const choice = await showConfirmModal({
            title: "Chưa đặt tên file khi tải",
            message: "Ô \"Đặt tên khi tải\" đang trống nên video sẽ được lưu với tên mặc định. Bạn muốn làm gì?",
            buttons: [
                { label: "Nhập tên", value: "name", primary: true },
                { label: "Vẫn tải", value: "go" },
            ],
        });
        if (choice === "go") return true;
        if (choice === "name" && input.isConnected) input.focus();
        return false;
    }

    // Shows a short-lived summary banner fixed to the center of the
    // viewport once a batch download (runBatchDownload) finishes.
    //
    // This used to be a banner drawn *inside* the panel — but updateFab()
    // calls closePanel() the instant `selected` empties out, and every
    // successful item removes itself from `selected` as soon as it
    // finishes (see removeSelection). So on a fully-successful batch (the
    // common case), the very last item's success would empty `selected`,
    // close the panel, and only *then* would runBatchDownload try to show
    // the "✓ Đã tải xong…" banner inside that now-hidden panel — so it was
    // being set but never actually seen. Rendering it as its own
    // body-level, centered element sidesteps that: it stays visible no
    // matter what state the panel is in.
    //
    // There is also still no OS-level "download complete" notification for
    // videos saved through the chosen-folder flow (see the "Save to
    // folder" comment above), so this remains the only thing that actually
    // tells the user the batch is done.
    let centerToastTimer = null;
    let centerToastEndsAt = 0;

    // Fades the toast out for good. Also called when the tab comes back to the
    // front after the toast's time was already up while the tab was hidden.
    function hideCenterToast() {
        if (centerToastTimer) {
            clearTimeout(centerToastTimer);
            centerToastTimer = null;
        }
        centerToastEndsAt = 0;
        const el = document.getElementById(CENTER_TOAST_ID);
        if (el) el.style.setProperty("opacity", "0", "important");
    }

    function expireCenterToastIfDue() {
        if (centerToastEndsAt && Date.now() >= centerToastEndsAt) hideCenterToast();
    }
    document.addEventListener("visibilitychange", expireCenterToastIfDue);
    window.addEventListener("focus", expireCenterToastIfDue);

    function showCenterToast(text, tone, durationMs) {
        let el = document.getElementById(CENTER_TOAST_ID);
        if (!el) {
            el = document.createElement("div");
            el.id = CENTER_TOAST_ID;
            el.style.cssText =
                'position:fixed!important;top:50%!important;left:50%!important;' +
                'transform:translate(-50%,-50%)!important;max-width:min(86vw,420px)!important;' +
                'padding:14px 22px!important;border-radius:14px!important;background:rgba(0,0,0,.92)!important;' +
                'backdrop-filter:blur(20px)!important;-webkit-backdrop-filter:blur(20px)!important;color:#fff!important;' +
                'font:700 14px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;text-align:center!important;' +
                'box-shadow:0 12px 40px rgba(0,0,0,.5),0 0 30px rgba(34,211,238,.2)!important;' +
                'border:1px solid rgba(34,211,238,.4)!important;z-index:2147483647!important;pointer-events:none!important;' +
                'opacity:0!important;transition:opacity .25s!important;';
            (document.body || document.documentElement).appendChild(el);
        }
        if (centerToastTimer) clearTimeout(centerToastTimer);
        el.textContent = text;
        const borderColor =
            tone === "error" ? "rgba(251,113,133,.5)" : tone === "warn" ? "rgba(251,191,36,.5)" : "rgba(34,211,238,.4)";
        const textColor = tone === "error" ? "#fb7185" : tone === "warn" ? "#fbbf24" : "#67e8f9";
        el.style.setProperty("border-color", borderColor, "important");
        el.style.setProperty("color", textColor, "important");
        // No requestAnimationFrame here: a hidden / covered tab does not run
        // animation frames, so a toast shown while the user was in another
        // window (a subfolder picked in the player window, a batch download
        // that finished in the background) used to fade IN only when the tab
        // came back - long after the timer below had already faded it out -
        // and then stayed on screen for good. Reading offsetWidth commits the
        // opacity:0 state first, so the fade-in transition still plays.
        void el.offsetWidth;
        el.style.setProperty("opacity", "1", "important");
        const showMs = durationMs || 5000;
        centerToastEndsAt = Date.now() + showMs;
        centerToastTimer = setTimeout(hideCenterToast, showMs);
    }

    /* ---------------- "Open video player" (reuses the existing popup window) --------------- */

    // There's no cross-window "closed" event, so the only reliable way to
    // notice the player popup went away (native close button, Alt+F4, the
    // user just navigating it elsewhere) is to poll win.closed. Only one
    // poll ever runs: window.open() with PLAYER_WINDOW_NAME reuses/navigates
    // the same popup rather than opening a new one, so opening it again
    // (even for a different item) just re-points this same poll at the new
    // item instead of stacking a second interval.
    let playerCloseWatchId = null;

    function watchPlayerWindowClose(win, item) {
        if (playerCloseWatchId) clearInterval(playerCloseWatchId);
        playerCloseWatchId = setInterval(() => {
            let closed = true;
            try {
                closed = !win || win.closed;
            } catch {
                closed = true;
            }
            if (!closed) return;
            clearInterval(playerCloseWatchId);
            playerCloseWatchId = null;
            clearWatchingItem(item);
        }, 500);
    }

    function openPlayerWindow(item, setStatus) {
        const url = item && item.url;
        if (!url) return;
        // "Luôn hiển thị trên cùng": ordinary popup windows cannot be pinned on
        // top, so use the Document PiP window (always above other windows).
        // Needs Chrome's Document PiP; otherwise fall through to the popup.
        if (playerAlwaysOnTop && window.documentPictureInPicture) {
            previewPip(item, setStatus);
            return;
        }
        try {
            const target = new URL("/search", location.origin);
            target.searchParams.set(PLAYER_REQUEST_PARAM, url);
            const win = window.open(
                target.href,
                PLAYER_WINDOW_NAME,
                "popup=yes,width=560,height=820,resizable=yes,scrollbars=no"
            );
            if (win) {
                try {
                    win.focus();
                } catch {}
                playerWin = win;
                watchingKind = "popup";
                setWatchingItem(item);
                watchPlayerWindowClose(win, item);
            }
        } catch {}
    }

    /* ---------------- PIP preview (new: this is a "view", not a "download") ---------------
     * Delegates to the exact same Document PiP flow the Search/Explore PiP
     * button uses (assets/tiktok-hook.js, MAIN world): a scrubbable seek bar,
     * custom transparent controls, and no native-PiP dark hover overlay.
     * Runs in the ISOLATED world, so it bridges to that MAIN-world flow with a
     * same-tick CustomEvent (dispatchEvent() calls listeners in every world
     * synchronously — unlike postMessage(), which would lose the click's user
     * gesture before tiktok-hook.js can call documentPictureInPicture.requestWindow()).
     * tiktok-hook.js owns all "is this URL already showing / same-window
     * switch / toggle-closed" logic, so this function only needs to relay the
     * URL and reflect back whatever state it reports. */

    let pipRequestSeq = 0;

    function previewPip(item, setStatus) {
        const url = item && item.url;
        if (!url) return;
        const requestId = "multi-pip-" + Date.now().toString(36) + "-" + (++pipRequestSeq);
        let settled = false;

        const finish = () => {
            settled = true;
            window.removeEventListener("__DOWNLOAD_MULTISELECT_PIP_RESPONSE__", onResponse);
            clearTimeout(timeoutId);
        };
        const onResponse = (event) => {
            const detail = event && event.detail;
            if (!detail || detail.requestId !== requestId) return;
            if (detail.state === "loading") {
                // Not terminal — tiktok-hook.js still has an "ok"/"error"
                // report coming for this same requestId once the stream is
                // fetched and the PiP window actually opens, so the listener
                // has to stay attached (finish() must NOT run here, or that
                // second report is missed entirely and the row gets stuck
                // showing "Đang tải…" forever instead of updating to "Đang
                // xem").
                setStatus && setStatus("Đang tải…");
                return;
            }
            finish();
            if (detail.state === "error") {
                setStatus && setStatus(detail.message || "Không thể xem PIP video này", true);
                return;
            }
            if (detail.state === "closed") {
                // Toggled off by clicking the already-open thumbnail again.
                clearWatchingItem(item);
                return;
            }
            // "ok": opened, or switched in place from a different URL — mark
            // this row as the one being watched (this also clears "Đang
            // xem" off whichever other row, PiP or player, held it before).
            watchingKind = "pip";
            setWatchingItem(item);
        };
        // tiktok-hook.js reports "loading" almost immediately, so a stuck
        // spinner past a few seconds means the bridge never got a listener
        // (e.g. an unusual page state) rather than a slow network fetch.
        const timeoutId = setTimeout(() => {
            if (settled) return;
            finish();
            setStatus && setStatus("Không thể xem PIP video này", true);
        }, 8000);

        window.addEventListener("__DOWNLOAD_MULTISELECT_PIP_RESPONSE__", onResponse);
        try {
            window.dispatchEvent(new CustomEvent("__DOWNLOAD_MULTISELECT_PIP_REQUEST__", {
                detail: { url, requestId },
            }));
        } catch {
            finish();
            setStatus && setStatus("PiP không được trình duyệt hỗ trợ", true);
        }
    }

    /* ---------------- selection state ---------------- */

    /** url -> { url, thumb, title, picked } */
    const selected = new Map();
    /** url -> Set<checkboxEl>  (keeps every on-page checkbox for a url in sync) */
    const urlCheckboxes = new Map();

    /* ---------------- "currently watching" indicator ----------------
     * Shared between the PiP thumbnail button and the "open video player"
     * button: only one row should ever show "Đang xem" at a time, no
     * matter which of the two actions opened it. Tracked by item (not by
     * a row/status closure) because the list can be fully rebuilt while
     * a video is open (renderPanelList/removePanelRowByUrl swap out row
     * elements), so any status update has to be re-looked-up via
     * setRowStatus at the time it happens. */
    let watchingItem = null;
    // Status text of the row being watched, and the row look that goes with
    // it: while a row shows this text its whole rectangle gets a translucent
    // cyan tint (plus a thin ring in the same colour), so the video that is
    // playing is easy to spot in the list. Any other status text puts the
    // row back to its normal background (see markRowWatching).
    const WATCHING_STATUS_TEXT = "Đang xem";
    const ROW_BG_NORMAL = "rgba(255,255,255,.045)";
    const ROW_BG_WATCHING = "rgba(34,211,238,.17)";
    const ROW_RING_WATCHING = "inset 0 0 0 1px rgba(34,211,238,.45)";

    function markRowWatching(row, statusText) {
        if (!row) return;
        const watching = statusText === WATCHING_STATUS_TEXT;
        row.style.background = watching ? ROW_BG_WATCHING : ROW_BG_NORMAL;
        row.style.boxShadow = watching ? ROW_RING_WATCHING : "";
    }

    // Which kind of player `watchingItem` was opened in ("pip" = always-on-top
    // Document PiP player, "popup" = the dedicated player window) and, for the
    // latter, the window itself: the keyboard shortcuts (see "Keyboard
    // shortcuts for quick review") need both to move on to the next video.
    let watchingKind = "";
    let playerWin = null;

    // Marks `item` as the one currently being watched: shows "Đang xem"
    // on its row and clears that text off whichever other item was
    // previously marked, if any.
    function setWatchingItem(item) {
        if (watchingItem && watchingItem !== item) {
            setRowStatus(watchingItem, "");
        }
        watchingItem = item;
        if (item) setRowStatus(item, WATCHING_STATUS_TEXT);
    }

    // Clears `item`'s "Đang xem" indicator, but only while it's still the
    // one being tracked — guards against a late/stale event (e.g. an old
    // PiP "closed" response) overwriting a status set by a newer action.
    function clearWatchingItem(item) {
        if (watchingItem !== item) return;
        watchingItem = null;
        setRowStatus(item, "");
    }

    // The MAIN-world hook (tiktok-hook.js) broadcasts this whenever a PiP
    // window it manages closes for any reason — the native close button on
    // the PiP window, navigating it away, "leavepictureinpicture" — not just
    // the toggle-off-by-clicking-the-thumbnail-again path already covered by
    // previewPip's own request/response above. Clears "Đang xem" for that
    // URL if it's still the one currently marked (no-op otherwise).
    window.addEventListener("__DOWNLOAD_MULTISELECT_PIP_CLOSED__", (event) => {
        const url = event && event.detail && event.detail.url;
        if (!url || !watchingItem || watchingItem.url !== url) return;
        clearWatchingItem(watchingItem);
    });

    /* ---------------- rename-on-download (panel-only naming) ---------------- */

    // Every download the panel triggers reads the rename box fresh, so the
    // filename always matches what's currently typed — no separate "apply"
    // step needed. The counter is keyed to the *normalized* name so it only
    // resets when the user actually types a different name; "name" and
    // "name -" normalize to the same base and keep counting together.
    let renameBaseKey = "";
    let renameCounter = 0;

    function normalizeRenameBase(raw) {
        // Strip any trailing "-" the user already typed (with surrounding
        // spaces) so exactly one " - (N)" gets appended below — never two.
        return String(raw || "").trim().replace(/\s*-+\s*$/, "").trim();
    }

    // The " - (N)" numbers handed out so far are kept per normalized base name in chrome.storage.local, as
    // [[base, lastNumber], ...] (most recently used last). A page reload, a second TikTok tab or a restart of
    // the browser therefore goes on where the last download stopped, instead of starting at 1 again and writing
    // over "name - (1).mp4". Every download of the extension takes its number from here - the panel buttons
    // and "Mở app sửa video" alike - so a number used by one is never used by the other. On top of that a
    // number whose file is already in the target folder is skipped (files saved before the numbers were kept,
    // or by another tab).
    const RENAME_SEQ_KEY = NS + "rename_seq";
    const RENAME_SEQ_MAX_BASES = 40;
    let renameSeqChain = Promise.resolve();

    async function readRenameSeq() {
        try {
            const res = await chrome.storage.local.get(RENAME_SEQ_KEY);
            const raw = res && res[RENAME_SEQ_KEY];
            if (!Array.isArray(raw)) return [];
            return raw
                .filter((row) => Array.isArray(row) && typeof row[0] === "string" && Number.isInteger(row[1]) && row[1] > 0)
                .map((row) => [row[0], row[1]]);
        } catch {
            return [];
        }
    }

    async function resolveRenameDir(rootHandle, folderName) {
        if (!rootHandle) return null;
        try {
            return folderName ? await rootHandle.getDirectoryHandle(folderName, { create: false }) : rootHandle;
        } catch {
            return null;
        }
    }

    async function renameFileExists(dir, name) {
        if (!dir) return false;
        try {
            await dir.getFileHandle(sanitizeFsName(name) + ".mp4", { create: false });
            return true;
        } catch {
            return false;
        }
    }

    // `rootHandle` / `folderName`: where the file will be written (null when it goes through chrome.downloads).
    function nextRenamedFilename(raw, rootHandle, folderName) {
        const base = normalizeRenameBase(raw);
        if (!base) return Promise.resolve("");
        // One at a time: a batch download runs several videos in parallel and they must not read the same number.
        const run = renameSeqChain.then(async () => {
            const seq = await readRenameSeq();
            const at = seq.findIndex((row) => row[0] === base);
            let n = Math.max(at === -1 ? 0 : seq[at][1], base === renameBaseKey ? renameCounter : 0);
            const dir = await resolveRenameDir(rootHandle, folderName);
            do {
                n += 1;
            } while (n < 100000 && (await renameFileExists(dir, base + " - (" + n + ")")));
            if (at !== -1) seq.splice(at, 1);
            seq.push([base, n]);
            while (seq.length > RENAME_SEQ_MAX_BASES) seq.shift();
            try {
                await chrome.storage.local.set({ [RENAME_SEQ_KEY]: seq });
            } catch {}
            renameBaseKey = base;
            renameCounter = n;
            return base + " - (" + n + ")";
        });
        renameSeqChain = run.catch(() => {});
        return run;
    }

    /* ---------------- click-to-paste into the rename box / TikTok search box ----------------
     * Only while the "Tự động dán dữ liệu clipboard" option is ON (popup).
     * Clicking "Đặt tên khi tải" (or TikTok's search box) pastes whatever text
     * is on the clipboard, so a name copied elsewhere lands here without
     * pressing Ctrl+V. Rules:
     *  - nothing happens (and the clipboard is not even read) while the option
     *    is OFF;
     *  - nothing happens when the clipboard has no text, or when the browser
     *    does not allow reading it (permission denied / page not focused);
     *  - hand-typed text is never overwritten: a click only pastes while the
     *    box is empty, or still holds exactly what the last click pasted
     *    (so copying a new name and clicking again swaps it in);
     *  - the text is flattened to one line and capped like file names are
     *    downstream (background.js and sanitizeFsName both cut at 180);
     *  - a click on TikTok's search box that pastes the clipboard there also
     *    puts the same text into the rename box, under the same rules (the
     *    hidden panel is built on demand, so the name is already there when
     *    the list is opened later). */
    const RENAME_PASTE_MAX_LENGTH = 180;
    let renameAutoPasted = "";

    // Writes `rawText` into the rename box under the rules above (one line,
    // capped, never over hand-typed text). Shared by the click on the rename
    // box itself and by the click on TikTok's search box.
    function fillRenameBox(input, rawText) {
        const text = String(rawText || "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, RENAME_PASTE_MAX_LENGTH);
        if (!text || !input || !input.isConnected) return;
        // Re-read the box only now: the user may have started typing while
        // the (possibly permission-gated) clipboard read was pending.
        const current = input.value;
        if (current.trim() !== "" && current !== renameAutoPasted) return;
        if (current === text) return;
        input.value = text;
        renameAutoPasted = text;
        renameDraft = text;
        persistRename();
        try {
            input.setSelectionRange(text.length, text.length);
        } catch {}
    }

    async function pasteClipboardIntoRename(input) {
        if (!autoPasteClipboard || !input || !navigator.clipboard || typeof navigator.clipboard.readText !== "function") return;
        let text = "";
        try {
            text = String((await navigator.clipboard.readText()) || "")
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, RENAME_PASTE_MAX_LENGTH);
        } catch {
            return;
        }
        if (!text || !input.isConnected) return;
        fillRenameBox(input, text);
    }

    /* ---------------- keep the list and the rename box across reloads ----------------
     * The "Video đã chọn" list and the "Đặt tên khi tải" text are saved in chrome.storage.local, so a page
     * reload, or closing the browser and opening it again, brings both back. One exception: when the saved
     * list is empty, the saved name is dropped too (a name never outlives the list it was typed for).
     *  - list: SELECTION_STORE_KEY = [{ url, thumb, title, picked, folderName }, ...] in list order;
     *  - name: RENAME_STORE_KEY = { text, auto }; auto = the text was put there by a click-to-paste (see
     *    above), so after the reload a new click can still swap it for the clipboard text.
     * Nothing is written before the restore has finished (selectionRestored), or the still empty list would
     * overwrite what was saved. Changes are found by comparing with what was written last
     * (persistSelection / persistRename: after a tick or untick, on a timer, and when the page is left), so
     * the many places that change a row (picked, folder number...) need no call of their own.
     */
    const SELECTION_STORE_KEY = NS + "selection";
    const RENAME_STORE_KEY = NS + "rename_text";
    const STORED_TEXT_MAX_LENGTH = 500;
    let selectionRestored = false;
    let lastSavedSelectionJson = "[]";
    let lastSavedRenameJson = JSON.stringify({ text: "", auto: false });
    // Text of the rename box. The box itself is only built when the list is first opened (ensurePanel), so
    // the text is kept here meanwhile.
    let renameDraft = "";

    // Only an https picture can be shown again after a reload (a blob: / data: one is gone or far too big).
    function storableThumb(thumb) {
        return typeof thumb === "string" && /^https:\/\//i.test(thumb) && thumb.length <= 4096 ? thumb : "";
    }

    function serializeSelection() {
        const out = [];
        for (const item of selected.values()) {
            out.push({
                url: item.url,
                thumb: storableThumb(item.thumb),
                title: String(item.title || "").slice(0, STORED_TEXT_MAX_LENGTH),
                picked: item.picked !== false,
                folderName: typeof item.folderName === "string" && item.folderName ? item.folderName : null,
            });
        }
        return out;
    }

    // One saved entry back to a list item; null when it is not a TikTok video link (never trust storage blindly).
    function sanitizeStoredItem(raw) {
        const url = raw && typeof raw.url === "string" ? videoUrl(raw.url) : "";
        if (!url) return null;
        const id = /\/video\/(\d+)/.exec(url);
        const title = typeof raw.title === "string" ? raw.title.trim().slice(0, STORED_TEXT_MAX_LENGTH) : "";
        const item = {
            url,
            thumb: storableThumb(raw.thumb),
            title: title || (id ? "Video …" + id[1].slice(-6) : "TikTok video"),
            picked: raw.picked !== false,
        };
        if (typeof raw.folderName === "string" && raw.folderName) item.folderName = raw.folderName;
        return item;
    }

    function persistSelection() {
        if (!selectionRestored) return;
        const items = serializeSelection();
        const json = JSON.stringify(items);
        if (json === lastSavedSelectionJson) return;
        lastSavedSelectionJson = json;
        try {
            chrome.storage.local.set({ [SELECTION_STORE_KEY]: items });
        } catch {}
    }

    function persistRename() {
        if (!selectionRestored) return;
        const record = { text: renameDraft, auto: renameDraft !== "" && renameDraft === renameAutoPasted };
        const json = JSON.stringify(record);
        if (json === lastSavedRenameJson) return;
        lastSavedRenameJson = json;
        try {
            chrome.storage.local.set({ [RENAME_STORE_KEY]: record });
        } catch {}
    }

    function persistAll() {
        persistSelection();
        persistRename();
    }

    // Runs once at start-up. When the saved list cannot be read, saving stays off for this page
    // (selectionRestored stays false) so that the saved data is never overwritten by an empty list.
    function restoreSelectionAndRename() {
        try {
            chrome.storage.local.get([SELECTION_STORE_KEY, RENAME_STORE_KEY], (res) => {
                if (chrome.runtime.lastError) return;
                const stored = res && Array.isArray(res[SELECTION_STORE_KEY]) ? res[SELECTION_STORE_KEY] : [];
                lastSavedSelectionJson = JSON.stringify(stored);
                const restoredUrls = [];
                for (const raw of stored) {
                    const item = sanitizeStoredItem(raw);
                    // A video ticked in the moment before the saved list arrived keeps its own entry.
                    if (!item || selected.has(item.url)) continue;
                    selected.set(item.url, item);
                    restoredUrls.push(item.url);
                }

                const record = res && res[RENAME_STORE_KEY];
                let text = record && typeof record.text === "string" ? record.text.slice(0, STORED_TEXT_MAX_LENGTH) : "";
                const auto = !!(record && record.auto === true);
                lastSavedRenameJson = JSON.stringify({ text, auto });
                // Empty list: the saved name goes too (persistRename below writes that down).
                if (selected.size === 0) text = "";
                if (text && !renameDraft) {
                    renameDraft = text;
                    if (auto) renameAutoPasted = text;
                    const input = document.getElementById(PANEL_RENAME_INPUT_ID);
                    if (input && input.value === "") input.value = text;
                }

                selectionRestored = true;
                for (const url of restoredUrls) syncCheckboxesFor(url);
                updateFab();
                if (panelOpen) renderPanelList();
                // A restored folder number may point to a folder that is gone: let the rescan check it.
                if (advancedFolderMode && rootDirHandle) rescanFolders();
                persistAll();
            });
        } catch {}
    }

    // TikTok's own search box (sidebar + header + search page). Same rules as
    // the rename box: only paste into an empty box, or one that still holds
    // exactly what the last click pasted. The "input" event is fired so
    // TikTok's page code notices the new text (search suggestions). Right
    // after a paste the search is submitted (same as pressing Enter) so the
    // results open straight away; nothing is submitted when nothing was pasted.
    // TikTok may re-render the box or hand focus to a second input when its
    // search panel opens, so the paste is started by the click AND by a search
    // input gaining focus right after a mouse press, and it always goes to the
    // search input that is actually live (focused / visible) once the
    // clipboard has been read - not blindly to the element that was clicked.
    const SEARCH_INPUT_SELECTOR = 'input[data-e2e="search-user-input"], form[data-e2e="search-box"] input, input[type="search"]';
    const SEARCH_BOX_SELECTOR = 'form[data-e2e="search-box"], [data-e2e="search-box"]';
    const SEARCH_PASTE_MAX_LENGTH = 200;
    const SEARCH_FOCUS_AFTER_PRESS_MS = 1000;
    // Pause between the paste and the Enter, so TikTok's own state has caught
    // up with the new text before the search is submitted.
    const SEARCH_SUBMIT_DELAY_MS = 150;
    let searchAutoPasted = "";
    let lastPointerPressAt = 0;

    function isSearchInput(el) {
        return !!el && el.nodeType === 1 && el.tagName === "INPUT" && el.matches(SEARCH_INPUT_SELECTOR);
    }

    function isVisibleEl(el) {
        return !!el && el.isConnected && el.getClientRects().length > 0;
    }

    function findLiveSearchInput(preferred) {
        const active = document.activeElement;
        if (isSearchInput(active) && isVisibleEl(active)) return active;
        if (isVisibleEl(preferred)) return preferred;
        for (const el of document.querySelectorAll(SEARCH_INPUT_SELECTOR)) {
            if (isVisibleEl(el)) return el;
        }
        return null;
    }

    // Same effect as pressing Enter in the search box: submit its <form>
    // (requestSubmit fires the page's own submit handler, or does the normal
    // GET to /search?q=... when there is none). Without a <form>, fall back to
    // a synthetic Enter key press. Skipped when the box changed in the meantime.
    function submitSearchBox(input, text) {
        if (!autoPasteClipboard || !input.isConnected || input.value !== text) return;
        const form = input.form || (input.closest ? input.closest("form") : null);
        if (form && typeof form.requestSubmit === "function") {
            try {
                form.requestSubmit();
                return;
            } catch {}
        }
        for (const type of ["keydown", "keypress", "keyup"]) {
            try {
                input.dispatchEvent(
                    new KeyboardEvent(type, { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true })
                );
            } catch {}
        }
    }

    async function pasteClipboardIntoSearch(preferred) {
        if (!autoPasteClipboard || !navigator.clipboard || typeof navigator.clipboard.readText !== "function") return;
        let text = "";
        try {
            text = String((await navigator.clipboard.readText()) || "")
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, SEARCH_PASTE_MAX_LENGTH);
        } catch (err) {
            try {
                console.debug("[Download] search box paste: clipboard read failed", err);
            } catch {}
            return;
        }
        if (!text || !autoPasteClipboard) return;
        // Give TikTok a moment to finish opening its search panel / moving focus.
        await new Promise((resolve) => setTimeout(resolve, 50));
        const input = findLiveSearchInput(preferred);
        if (!input) return;
        // Same click, same text: the rename box ("Đặt tên khi tải") gets it
        // too. The panel is built (hidden) when it does not exist yet, so the
        // name is already there when the list is opened later.
        try {
            fillRenameBox(ensurePanel().querySelector("#" + PANEL_RENAME_INPUT_ID), text);
        } catch {}
        const current = input.value;
        if (current.trim() !== "" && current !== searchAutoPasted) return;
        if (current === text) return;
        input.value = text;
        searchAutoPasted = text;
        try {
            input.dispatchEvent(new Event("input", { bubbles: true }));
        } catch {}
        try {
            input.setSelectionRange(text.length, text.length);
        } catch {}
        setTimeout(() => submitSearchBox(input, text), SEARCH_SUBMIT_DELAY_MS);
    }

    function onSearchPointerPress() {
        lastPointerPressAt = Date.now();
    }

    function onSearchBoxClick(ev) {
        if (!autoPasteClipboard) return;
        const target = ev.target;
        if (!target || target.nodeType !== 1) return;
        let input = null;
        if (isSearchInput(target)) {
            input = target;
        } else if (target.closest) {
            // Click on the icon / padding around the input: use the box's input,
            // but never when the click is on its submit (search) button.
            if (target.closest('button[type="submit"]')) return;
            const box = target.closest(SEARCH_BOX_SELECTOR);
            if (box) input = box.querySelector(SEARCH_INPUT_SELECTOR);
        }
        if (!input) return;
        pasteClipboardIntoSearch(input);
    }

    function onSearchBoxFocusIn(ev) {
        if (!autoPasteClipboard) return;
        if (Date.now() - lastPointerPressAt > SEARCH_FOCUS_AFTER_PRESS_MS) return;
        if (!isSearchInput(ev.target)) return;
        pasteClipboardIntoSearch(ev.target);
    }

    function registerCheckbox(url, el) {
        let set = urlCheckboxes.get(url);
        if (!set) {
            set = new Set();
            urlCheckboxes.set(url, set);
        }
        set.add(el);
    }

    function syncCheckboxesFor(url) {
        // Every selection change (card checkbox, panel remove button, player
        // select button) passes through here, so this is the one place that
        // tells the player windows to repaint their own select button.
        broadcastSelectionState(url);
        const set = urlCheckboxes.get(url);
        if (!set) return;
        const isSelected = selected.has(url);
        for (const el of Array.from(set)) {
            if (!el.isConnected) {
                set.delete(el);
                continue;
            }
            setCheckboxVisual(el, isSelected);
        }
    }

    function setCheckboxVisual(el, checked) {
        el.dataset.checked = checked ? "1" : "0";
        el.setAttribute("aria-checked", checked ? "true" : "false");
        el.style.background = checked
            ? "linear-gradient(135deg,#a855f7,#22d3ee)"
            : "rgba(0,0,0,.55)";
        el.style.borderColor = checked ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.75)";
        const mark = el.querySelector("svg");
        if (mark) mark.style.opacity = checked ? "1" : "0";
    }

    function extractThumb(link) {
        const img = link.querySelector("img");
        if (img && (img.currentSrc || img.src)) return img.currentSrc || img.src;
        const video = link.querySelector("video");
        if (video && video.poster) return video.poster;
        const bgEl = link.querySelector("[style*='background-image']");
        if (bgEl) {
            const m = /url\((['"]?)(.*?)\1\)/.exec(bgEl.style.backgroundImage || "");
            if (m && m[2]) return m[2];
        }
        return "";
    }

    function extractTitle(link, url) {
        const img = link.querySelector("img[alt]");
        if (img && img.alt && img.alt.trim()) return img.alt.trim();
        const m = /\/video\/(\d+)/.exec(url);
        return m ? "Video …" + m[1].slice(-6) : "TikTok video";
    }

    function toggleSelection(link, checkboxEl) {
        const url = videoUrl(link.href);
        if (!url) return;
        registerCheckbox(url, checkboxEl);
        toggleSelectionForUrl(url, () => ({
            url,
            thumb: extractThumb(link),
            title: extractTitle(link, url),
            picked: true,
        }));
    }

    // Shared by the on-card checkbox (above) and the select button inside the
    // player windows (see "Player select button bridge"): flips `url` in or
    // out of the selection and keeps checkboxes, FAB and panel in step.
    // `buildItem` is only called when the video is being added.
    function toggleSelectionForUrl(url, buildItem) {
        const isAdding = !selected.has(url);
        let addedItem = null;
        if (!isAdding) {
            selected.delete(url);
        } else {
            addedItem = buildItem();
            selected.set(url, addedItem);
        }
        syncCheckboxesFor(url);
        updateFab();
        persistSelection();
        // Selecting a video never opens the list by itself (not even for the
        // first video): the list only opens when the user clicks the FAB.
        // While it is already open, the new row is added to it.
        if (panelOpen) {
            // Panel is already visible: touch only the one row that
            // changed instead of tearing down and rebuilding the whole
            // list (which was reloading every thumbnail image on every
            // single click).
            if (isAdding) {
                appendPanelRow(addedItem);
            } else {
                removePanelRowByUrl(url);
            }
        }
    }

    // opts.clearPlayer: the user took the video out of the list on purpose (row
    // "x" button, the player's "Xóa video này"). When no video follows it in
    // the list (it was the last one / the only one left), a player that is
    // still showing it is blanked instead of going on with a video that is
    // no longer in the list. With a next video, the caller moves the player on.
    function removeSelection(url, opts) {
        const item = selected.get(url);
        const order = Array.from(selected.keys());
        const hasNext = !!item && order.indexOf(url) < order.length - 1;
        if (item && watchingItem === item) watchingItem = null;
        selected.delete(url);
        syncCheckboxesFor(url);
        updateFab();
        persistSelection();
        // updateFab() already closes the panel via closePanel() once the
        // list empties out, so this only needs to touch a still-open panel.
        if (panelOpen) removePanelRowByUrl(url);
        if (opts && opts.clearPlayer && item && !hasNext) {
            clearPlayersShowing(url);
            // It was the last video of the list: once the player has told
            // "Danh sách trống.", the preview windows close by themselves.
            if (selected.size === 0) closePlayersWhenListEmpty();
        }
    }

    // Tells the existing Search/Explore 4-button module (MAIN world) that a
    // video was downloaded from this panel, so its own on-card Download icon
    // switches to the same "Đã tải" state it already shows for its own
    // button — cross-world bridge, same pattern as __download_settings__.
    function markDownloadedOnPage(url) {
        try {
            window.dispatchEvent(new CustomEvent("__download_multi_mark_downloaded__", { detail: { url } }));
        } catch {}
    }

    /* ---------------- Player select button bridge ----------------
     * The dedicated player window and the always-on-top (Document PiP) player
     * each carry a select button, built by assets/tiktok-hook.js (MAIN world),
     * that looks and behaves like the on-card checkbox: it ticks / unticks
     * the video being played in this same selection. The selection only
     * lives here, so the button talks to this module with CustomEvents (same
     * cross-world pattern as the PiP bridge):
     *   hook -> here : __DOWNLOAD_MULTISELECT_SELECT_TOGGLE__ { url, thumb, title }
     *   hook -> here : __DOWNLOAD_MULTISELECT_SELECT_QUERY__  { url }
     *   here -> hook : __DOWNLOAD_MULTISELECT_SELECTION_STATE__ { url, selected }
     * The state event is sent on EVERY change (see syncCheckboxesFor), so a
     * player button stays in step with the cards and with the panel. */
    const SELECT_TOGGLE_EVENT = "__DOWNLOAD_MULTISELECT_SELECT_TOGGLE__";
    const SELECT_QUERY_EVENT = "__DOWNLOAD_MULTISELECT_SELECT_QUERY__";
    const SELECT_STATE_EVENT = "__DOWNLOAD_MULTISELECT_SELECTION_STATE__";
    // The players also show "<position>/<total> <title>" of the video they play
    // (top bar next to the select button), so they need the list itself, in row
    // order:  here -> hook : __DOWNLOAD_MULTISELECT_LIST_INFO__ { items: [[url, title], ...] }
    // And when the video a player shows is taken out of the list with nothing
    // after it, the player is told to show nothing:
    //           here -> hook : __DOWNLOAD_MULTISELECT_PLAYER_CLEAR__ { url }
    const LIST_INFO_EVENT = "__DOWNLOAD_MULTISELECT_LIST_INFO__";
    const PLAYER_CLEAR_EVENT = "__DOWNLOAD_MULTISELECT_PLAYER_CLEAR__";
    const PLAYER_CLEAR_MESSAGE = "__DOWNLOAD_PLAYER_CLEAR__";

    function broadcastListInfo() {
        try {
            const items = Array.from(selected.values(), (i) => [i.url, String(i.title || "").slice(0, 200)]);
            window.dispatchEvent(new CustomEvent(LIST_INFO_EVENT, { detail: { items } }));
        } catch {}
    }

    // Blanks every player that is showing `url` (hook: Document PiP player and
    // every player window of this tab). The dedicated window opened from this
    // panel is also told directly, in case it has not talked to the hook yet.
    function clearPlayersShowing(url) {
        if (!url) return;
        try {
            window.dispatchEvent(new CustomEvent(PLAYER_CLEAR_EVENT, { detail: { url } }));
        } catch {}
        try {
            if (playerWin && !playerWin.closed) {
                playerWin.postMessage({ channel: "download", type: PLAYER_CLEAR_MESSAGE, url }, location.origin);
            }
        } catch {}
    }

    // The video a player shows was handed to the editor app and left the list; `item` is the video that
    // followed it. The players showing `url` (hook: Document PiP player, and through the tab the player
    // windows) go on with `item`, loaded but paused. `wasWatched`: the row of `url` was the one marked
    // "Đang xem", so that mark moves on to `item` as well.
    //   here -> hook : __DOWNLOAD_MULTISELECT_PLAYER_ADVANCE__ { url, nextUrl }
    const PLAYER_ADVANCE_EVENT = "__DOWNLOAD_MULTISELECT_PLAYER_ADVANCE__";

    function advancePlayersShowing(url, item, wasWatched) {
        if (!url || !item) return;
        try {
            window.dispatchEvent(new CustomEvent(PLAYER_ADVANCE_EVENT, { detail: { url, nextUrl: item.url } }));
        } catch {}
        if (!wasWatched) return;
        scrollRowIntoView(item);
        setWatchingItem(item);
        if (watchingKind === "popup" && playerWin && !playerWin.closed) watchPlayerWindowClose(playerWin, item);
    }

    // Closes every preview window of this tab (hook: Document PiP player and the
    // player windows it opened; the dedicated window opened from this panel is
    // closed here). Waits a moment so the player's toast ("Đã xóa video này.
    // Danh sách trống.") can be read, and checks the list again when the time is
    // up: a video put back in the list meanwhile keeps the windows open.
    const PLAYER_CLOSE_EVENT = "__DOWNLOAD_MULTISELECT_PLAYER_CLOSE__";
    const PLAYER_CLOSE_DELAY_MS = 1500;
    let playerCloseTimer = null;

    function closePlayersWhenListEmpty() {
        clearTimeout(playerCloseTimer);
        playerCloseTimer = setTimeout(() => {
            playerCloseTimer = null;
            if (selected.size > 0) return;
            try {
                window.dispatchEvent(new CustomEvent(PLAYER_CLOSE_EVENT));
            } catch {}
            try {
                if (playerWin && !playerWin.closed) playerWin.close();
            } catch {}
        }, PLAYER_CLOSE_DELAY_MS);
    }

    function broadcastSelectionState(url) {
        if (!url) return;
        try {
            window.dispatchEvent(
                new CustomEvent(SELECT_STATE_EVENT, { detail: { url, selected: selected.has(url) } })
            );
        } catch {}
        broadcastListInfo();
    }

    // The on-page card for `url`, if it is currently rendered: its thumbnail
    // and caption are what a video ticked on the card would have used.
    function findCardLinkForUrl(url) {
        try {
            const m = /\/video\/(\d+)/.exec(url);
            if (!m) return null;
            for (const a of document.querySelectorAll("a[href*='/video/" + m[1] + "']")) {
                if (videoUrl(a.href) === url && isThumbnailLink(a)) return a;
            }
        } catch {}
        return null;
    }

    // Item for a video ticked from a player window: prefer what the card
    // shows, fall back to the stream metadata the player already fetched.
    function buildItemFromPlayer(url, meta) {
        const card = findCardLinkForUrl(url);
        let thumb = card ? extractThumb(card) : "";
        if (!thumb && meta && typeof meta.thumb === "string" && /^https:\/\//i.test(meta.thumb)) {
            thumb = meta.thumb.slice(0, 2048);
        }
        const cardImg = card && card.querySelector("img[alt]");
        const cardAlt = cardImg && cardImg.alt ? cardImg.alt.trim() : "";
        const metaTitle = meta && typeof meta.title === "string" ? meta.title.trim().slice(0, 200) : "";
        let title = cardAlt || metaTitle;
        if (!title) {
            const m = /\/video\/(\d+)/.exec(url);
            title = m ? "Video …" + m[1].slice(-6) : "TikTok video";
        }
        return { url, thumb, title, picked: true };
    }

    function urlFromSelectEvent(event) {
        const detail = event && event.detail;
        return detail && typeof detail.url === "string" ? videoUrl(detail.url) : "";
    }

    window.addEventListener(SELECT_TOGGLE_EVENT, (event) => {
        const url = urlFromSelectEvent(event);
        if (!url) return;
        toggleSelectionForUrl(url, () => buildItemFromPlayer(url, event.detail));
    });

    window.addEventListener(SELECT_QUERY_EVENT, (event) => {
        const url = urlFromSelectEvent(event);
        if (url) broadcastSelectionState(url);
    });

    /* ---------------- Keyboard shortcuts for quick review ----------------
     * The "Phím tắt" button (panel, "Thư mục con" row) lists them. They exist to
     * look through the videos of this list fast and to tick the ones worth
     * downloading, without the mouse:
     *   T / R  next / previous video of the list (same order as the rows)
     *   C      tick / untick the current video's row checkbox ("tải lượt sau")
     *   Space, F, G, M, ← →  play/pause, speed -/+, mute, seek: done by the player
     * The players (assets/tiktok-hook.js, MAIN world) handle their own keys while
     * they have the focus. The list keys (T R C) need this list, so the hook
     * relays them here, like the select button does (CustomEvent for the
     * Document PiP player; postMessage through this tab for the player window).
     * While a player opened from this panel is open and the panel is showing,
     * the same keys also work from this tab: list keys run here, playback keys
     * are forwarded to the player. Never while typing in a text field.
     *   hook -> here : __DOWNLOAD_MULTISELECT_PLAYER_SHORTCUT__        { requestId, action, url, kind }
     *   here -> hook : __DOWNLOAD_MULTISELECT_PLAYER_SHORTCUT_RESULT__ { requestId, kind, ok, text, loadUrl }
     *   here -> hook : __DOWNLOAD_PLAYER_CONTROL__                     { action }  (PiP player)
     *   here -> player window: postMessage { type: PLAYER_CONTROL / PLAYER_SHORTCUT_RESULT }
     */
    const PLAYER_SHORTCUT_EVENT = "__DOWNLOAD_MULTISELECT_PLAYER_SHORTCUT__";
    const PLAYER_SHORTCUT_RESULT_EVENT = "__DOWNLOAD_MULTISELECT_PLAYER_SHORTCUT_RESULT__";
    const PLAYER_CONTROL_EVENT = "__DOWNLOAD_PLAYER_CONTROL__";
    const PLAYER_SHORTCUT_RESULT_MESSAGE = "__DOWNLOAD_PLAYER_SHORTCUT_RESULT__";
    const PLAYER_CONTROL_MESSAGE = "__DOWNLOAD_PLAYER_CONTROL__";
    const SHORTCUT_HELP_ID = NS + "shortcut_help";
    // `code` = KeyboardEvent.code (same key whatever the keyboard layout / IME).
    const SHORTCUTS = [
        { code: "KeyT", key: "T", action: "next", label: "Video kế tiếp" },
        { code: "KeyR", key: "R", action: "prev", label: "Video trước đó" },
        { code: "Space", key: "Space", action: "playpause", label: "Dừng/phát tiếp" },
        { code: "KeyF", key: "F", action: "faster", label: "Tăng tốc độ phát" },
        { code: "KeyG", key: "G", action: "slower", label: "Giảm tốc độ phát" },
        { code: "KeyC", key: "C", action: "pick", label: "Chọn/bỏ chọn video để tải" },
        { code: "KeyM", key: "M", action: "mute", label: "Bật/tắt tiếng" },
        { code: "ArrowLeft", key: "←", action: "seekBack", label: "Tua lùi 5 giây" },
        { code: "ArrowRight", key: "→", action: "seekFwd", label: "Tua tới 5 giây" },
    ];
    const SHORTCUT_BY_CODE = {};
    for (const s of SHORTCUTS) SHORTCUT_BY_CODE[s.code] = s.action;
    // "remove" has no key: it comes from the player's right-click menu ("Xóa video này").
    const SHORTCUT_LIST_ACTIONS = new Set(["next", "prev", "pick", "remove"]);
    // Held-down keys repeat only where that is useful (speed steps, seeking).
    const SHORTCUT_REPEAT_ACTIONS = new Set(["faster", "slower", "seekBack", "seekFwd"]);

    function isTypingTarget(el) {
        try {
            if (!el || !el.tagName) return false;
            if (el.tagName === "INPUT") return !/^(range|checkbox|radio|button|submit)$/i.test(el.type || "");
            return el.tagName === "TEXTAREA" || el.tagName === "SELECT" || !!el.isContentEditable;
        } catch {
            return false;
        }
    }

    function shortcutClip(text) {
        const t = String(text || "").trim();
        return t.length > 40 ? t.slice(0, 40) + "…" : t;
    }

    function scrollRowIntoView(item) {
        try {
            const list = document.getElementById(PANEL_LIST_ID);
            const row = list && list.querySelector('[data-url="' + CSS.escape(item.url) + '"]');
            if (row) row.scrollIntoView({ block: "nearest" });
        } catch {}
    }

    // Same effect as clicking the row's checkbox.
    function setItemPicked(item, picked) {
        item.picked = picked;
        const list = document.getElementById(PANEL_LIST_ID);
        const row = list && list.querySelector('[data-url="' + CSS.escape(item.url) + '"]');
        const cb = row && row.querySelector("." + ROW_CHECK_CLASS);
        if (cb) cb.checked = picked;
        updateSelectAllCheckbox();
    }

    // next / prev / pick / remove for the video at `url` (the one the player shows).
    // "remove" takes the video out of the list; the video that followed it comes
    // back as `item`, so the player goes on with that one (none left: no `item`).
    // A plain move (next / prev) is `silent`: the player window shows no toast for it.
    // A video that is not in the list yet starts from the first (next) or the
    // last (prev) row. Returns { ok, text, item? }; `item` = video to go to.
    function handleListShortcut(action, url) {
        const list = Array.from(selected.values());
        if (list.length === 0) return { ok: false, text: "Danh sách trống." };
        if (action === "pick") {
            const item = selected.get(url);
            if (!item) return { ok: false, text: "Video này chưa có trong danh sách đã chọn." };
            setItemPicked(item, item.picked === false);
            const n = list.filter((i) => i.picked !== false).length;
            return { ok: true, text: (item.picked ? "✓ Chọn để tải" : "✗ Bỏ chọn") + " (" + n + "/" + list.length + ")" };
        }
        if (action === "remove") {
            const at = list.findIndex((i) => i.url === url);
            if (at === -1) return { ok: false, text: "Video này chưa có trong danh sách đã chọn." };
            const next = list[at + 1] || null;
            // No next video: the player is blanked (removeSelection -> clearPlayersShowing).
            removeSelection(url, { clearPlayer: true });
            if (next) return { ok: true, item: next, text: "Đã xóa video này." };
            return { ok: true, text: "Đã xóa video này. " + (list.length > 1 ? "Không còn video kế tiếp." : "Danh sách trống.") };
        }
        const idx = list.findIndex((i) => i.url === url);
        const delta = action === "next" ? 1 : -1;
        const to = idx === -1 ? (delta > 0 ? 0 : list.length - 1) : idx + delta;
        if (to < 0) return { ok: false, text: "Đây là video đầu danh sách." };
        if (to >= list.length) return { ok: false, text: "Đã hết video trong danh sách." };
        return { ok: true, item: list[to], silent: true, text: "[" + (to + 1) + "/" + list.length + "] " + shortcutClip(list[to].title) };
    }

    // Brings `item` up in the same kind of player the key was pressed for.
    // A player window loads the video itself when it gets `loadUrl` with the
    // result (deliverShortcutResult), so only the bookkeeping is done here.
    function openItemInPlayer(item, kind) {
        if (kind === "popup") {
            if (playerWin && !playerWin.closed) {
                watchingKind = "popup";
                setWatchingItem(item);
                watchPlayerWindowClose(playerWin, item);
            }
            return;
        }
        previewPip(item, (text, isError) => setRowStatus(item, text, isError));
    }

    // Answer for the player: a short toast, plus the video to load for a player
    // window. Asked from a player -> back through the hook (requestId set); asked
    // from this tab -> straight to the player window, or the hook for the PiP one.
    function deliverShortcutResult(kind, requestId, res) {
        if (!requestId) showCenterToast(res.text, res.ok ? "ok" : "warn", 1200);
        const detail = { requestId: requestId || "", kind, ok: res.ok, text: res.silent ? "" : res.text, loadUrl: res.loadUrl || "" };
        if (kind === "popup" && !requestId) {
            try {
                if (playerWin && !playerWin.closed) {
                    playerWin.postMessage(
                        Object.assign({ channel: "download", type: PLAYER_SHORTCUT_RESULT_MESSAGE }, detail),
                        location.origin
                    );
                }
            } catch {}
            return;
        }
        try {
            window.dispatchEvent(new CustomEvent(PLAYER_SHORTCUT_RESULT_EVENT, { detail }));
        } catch {}
    }

    function runPlayerShortcut(action, url, kind, requestId) {
        const res = handleListShortcut(action, url);
        if (res.item) {
            scrollRowIntoView(res.item);
            openItemInPlayer(res.item, kind);
            if (kind === "popup") res.loadUrl = res.item.url;
        }
        deliverShortcutResult(kind, requestId, res);
    }

    window.addEventListener(PLAYER_SHORTCUT_EVENT, (event) => {
        const d = event && event.detail;
        if (!d || typeof d.action !== "string" || !SHORTCUT_LIST_ACTIONS.has(d.action)) return;
        const url = typeof d.url === "string" ? videoUrl(d.url) : "";
        if (!url) return;
        const requestId = typeof d.requestId === "string" ? d.requestId.slice(0, 128) : "";
        runPlayerShortcut(d.action, url, d.kind === "popup" ? "popup" : "pip", requestId);
    });

    // Playback keys pressed in this tab -> the player that shows `watchingItem`.
    function sendPlayerControl(action, kind) {
        if (kind === "popup") {
            try {
                if (playerWin && !playerWin.closed) {
                    playerWin.postMessage({ channel: "download", type: PLAYER_CONTROL_MESSAGE, action }, location.origin);
                }
            } catch {}
            return;
        }
        try {
            window.dispatchEvent(new CustomEvent(PLAYER_CONTROL_EVENT, { detail: { action } }));
        } catch {}
    }

    // Only while the panel is showing and a player opened from it is open, so
    // Space still scrolls the page and the letters still reach TikTok otherwise.
    function onPanelShortcutKey(ev) {
        if (!panelOpen || !watchingItem) return;
        if (ev.ctrlKey || ev.altKey || ev.metaKey || ev.shiftKey) return;
        const action = SHORTCUT_BY_CODE[ev.code];
        if (!action) return;
        const target = ev.target;
        if (isTypingTarget(target)) return;
        // Space on a focused button / link activates it, as usual.
        if (ev.code === "Space" && target && (target.tagName === "BUTTON" || target.tagName === "A")) return;
        stopCardEvent(ev);
        if (ev.repeat && !SHORTCUT_REPEAT_ACTIONS.has(action)) return;
        const kind = watchingKind || "pip";
        if (SHORTCUT_LIST_ACTIONS.has(action)) runPlayerShortcut(action, watchingItem.url, kind, "");
        else sendPlayerControl(action, kind);
    }

    window.addEventListener("keydown", onPanelShortcutKey, true);

    /* "Phím tắt" button: a small list of the keys above, under the button. */
    let shortcutHelpEl = null;

    function closeShortcutHelp() {
        window.removeEventListener("pointerdown", onShortcutHelpDismiss, true);
        window.removeEventListener("keydown", onShortcutHelpKey, true);
        window.removeEventListener("resize", closeShortcutHelp);
        if (shortcutHelpEl) {
            shortcutHelpEl.remove();
            shortcutHelpEl = null;
        }
    }

    function onShortcutHelpDismiss(ev) {
        if (!shortcutHelpEl) return;
        const t = ev && ev.target;
        if (t && t.nodeType === 1 && (shortcutHelpEl.contains(t) || (t.closest && t.closest("#" + PANEL_SHORTCUT_BTN_ID)))) return;
        closeShortcutHelp();
    }

    function onShortcutHelpKey(ev) {
        if (ev.key !== "Escape") return;
        stopCardEvent(ev);
        closeShortcutHelp();
    }

    function toggleShortcutHelp(anchor) {
        if (shortcutHelpEl) {
            closeShortcutHelp();
            return;
        }
        const el = document.createElement("div");
        el.id = SHORTCUT_HELP_ID;
        el.style.cssText =
            "position:fixed!important;left:0;top:0;width:268px;box-sizing:border-box;padding:10px 12px 12px;border-radius:12px;background:rgba(15,15,20,.98);border:1px solid rgba(255,255,255,.14);box-shadow:0 12px 36px rgba(0,0,0,.55);" +
            "z-index:2147483647!important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#fff;";
        let html =
            '<div style="font-size:12px;font-weight:700;margin-bottom:2px;">Phím tắt xem nhanh video</div>' +
            '<div style="font-size:10.5px;line-height:1.4;opacity:.6;margin-bottom:8px;">Dùng khi đang xem video từ danh sách này (trình phát nổi hoặc cửa sổ video).</div>';
        for (const s of SHORTCUTS) {
            html +=
                '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:4px 0;font-size:12px;"><span>' +
                escapeHtml(s.label) +
                '</span><span style="flex:none;min-width:34px;text-align:center;padding:2px 7px;border-radius:6px;background:rgba(34,211,238,.12);border:1px solid rgba(34,211,238,.35);color:#67e8f9;font-weight:700;font-size:11px;">[' +
                escapeHtml(s.key) +
                "]</span></div>";
        }
        html +=
            '<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.08);font-size:10.5px;line-height:1.4;opacity:.55;">Không hoạt động khi đang gõ vào ô nhập chữ.</div>';
        el.innerHTML = html;
        // Same isolation the other overlays use, so TikTok never reacts to presses on it.
        for (const type of ["pointerdown", "mousedown", "touchstart"]) {
            el.addEventListener(type, (ev) => ev.stopPropagation(), true);
        }
        (document.body || document.documentElement).appendChild(el);
        shortcutHelpEl = el;
        // Under the button, right edge aligned with it; above it when there is no room below.
        const a = anchor.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        let top = a.bottom + 6;
        if (top + r.height > window.innerHeight - 8) top = a.top - r.height - 6;
        el.style.left = Math.max(8, Math.min(a.right - r.width, window.innerWidth - r.width - 8)) + "px";
        el.style.top = Math.max(8, top) + "px";
        window.addEventListener("pointerdown", onShortcutHelpDismiss, true);
        window.addEventListener("keydown", onShortcutHelpKey, true);
        window.addEventListener("resize", closeShortcutHelp);
    }

    /* ---------------- checkbox creation + DOM scanning ---------------- */

    function makeCheckbox() {
        const el = document.createElement("div");
        el.className = CHECKBOX_CLASS;
        el.setAttribute("role", "checkbox");
        el.setAttribute("aria-checked", "false");
        el.title = "Chọn video này";
        el.style.cssText =
            "position:absolute!important;top:8px!important;left:8px!important;width:26px!important;height:26px!important;border-radius:7px!important;background:rgba(0,0,0,.55)!important;border:1.5px solid rgba(255,255,255,.75)!important;display:flex!important;align-items:center!important;justify-content:center!important;cursor:pointer!important;z-index:2147483645!important;transition:transform .12s ease,background .15s ease,border-color .15s ease!important;pointer-events:auto!important";
        el.innerHTML =
            '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="opacity:0;transition:opacity .1s ease;pointer-events:none"><path d="M20 6 9 17l-5-5"/></svg>';
        el.addEventListener("mouseenter", () => (el.style.transform = "scale(1.08)"));
        el.addEventListener("mouseleave", () => (el.style.transform = "scale(1)"));
        return el;
    }

    function attachCheckboxForLink(link) {
        if (!isThumbnailLink(link)) return;
        let checkboxEl = link.querySelector(":scope > ." + CHECKBOX_CLASS);
        if (!checkboxEl) {
            try {
                if (getComputedStyle(link).position === "static") link.style.setProperty("position", "relative", "important");
            } catch {}
            checkboxEl = makeCheckbox();
            checkboxEl.addEventListener(
                "click",
                (ev) => {
                    stopCardEvent(ev);
                    toggleSelection(link, checkboxEl);
                },
                true
            );
            for (const type of ["pointerdown", "mousedown", "touchstart"]) {
                checkboxEl.addEventListener(type, stopCardEvent, true);
            }
            link.appendChild(checkboxEl);
        }
        const url = videoUrl(link.href);
        if (url) {
            registerCheckbox(url, checkboxEl);
            setCheckboxVisual(checkboxEl, selected.has(url));
        }
    }

    let scanScheduled = false;
    const queuedNodes = new Set();

    function scanRoot(root) {
        if (!isSearchPage() || !root) return;
        if (root === document) {
            document.querySelectorAll("a[href*='/video/']").forEach(attachCheckboxForLink);
            return;
        }
        if (root.nodeType !== 1) return;
        if (root.matches && root.matches("a[href*='/video/']")) attachCheckboxForLink(root);
        const parentLink = root.closest && root.closest("a[href*='/video/']");
        if (parentLink) attachCheckboxForLink(parentLink);
        if (root.querySelectorAll) root.querySelectorAll("a[href*='/video/']").forEach(attachCheckboxForLink);
    }

    function flushScan() {
        scanScheduled = false;
        const nodes = Array.from(queuedNodes);
        queuedNodes.clear();
        nodes.forEach(scanRoot);
    }

    function queueScan(node) {
        if (node) queuedNodes.add(node);
        if (!scanScheduled) {
            scanScheduled = true;
            requestAnimationFrame(flushScan);
        }
    }

    function scanAll() {
        queueScan(document);
    }

    /* ---------------- hide checkboxes while TikTok's video viewer is open ---------------- */

    // Opening a card on /search or /explore makes TikTok push /@user/video/<id>
    // and draw its viewer ON TOP of the result grid, which stays mounted
    // underneath.  The checkboxes use a very high z-index, so they would keep
    // showing through that viewer.  They are hidden with visibility only (DOM
    // nodes and selection state untouched) for as long as the page is not a
    // search/explore page, and come back the moment the viewer is closed.
    // Driven by every URL-change signal available, not only the 1s poll, so
    // the squares never flash over the viewer.
    let checkboxesHidden = null;

    function ensureCheckboxHideStyle() {
        if (document.getElementById(CHECKBOX_HIDE_STYLE_ID)) return;
        try {
            const style = document.createElement("style");
            style.id = CHECKBOX_HIDE_STYLE_ID;
            style.textContent =
                "html[" + CHECKBOX_HIDE_ATTR + "] ." + CHECKBOX_CLASS + "{visibility:hidden!important}";
            (document.head || document.documentElement).appendChild(style);
        } catch {}
    }

    function syncCheckboxVisibility() {
        const root = document.documentElement;
        if (!root) return;
        const hide = !isSearchPage();
        if (hide) ensureCheckboxHideStyle();
        if (hide === checkboxesHidden) return;
        checkboxesHidden = hide;
        if (hide) {
            root.setAttribute(CHECKBOX_HIDE_ATTR, "");
        } else {
            root.removeAttribute(CHECKBOX_HIDE_ATTR);
            scanAll();
        }
    }

    function initObserver() {
        const root = document.documentElement;
        if (!root) {
            setTimeout(initObserver, 50);
            return;
        }
        try {
            new MutationObserver((records) => {
                syncCheckboxVisibility();
                for (const record of records) {
                    if (record.type === "attributes") queueScan(record.target);
                    else record.addedNodes.forEach(queueScan);
                }
            }).observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["href", "src"] });
        } catch {}
    }

    /* ---------------- Right-click subfolder menu on a video thumbnail ----------------
     * Optional (popup.html -> "Hiển thị menu chuột phải là Thư mục con",
     * chrome.storage.local key `subfolderContextMenu`, off by default).
     * While it is ON, right-clicking a search/explore card thumbnail replaces
     * the browser's own context menu with the subfolders listed in the
     * "Video đã chọn" panel (currentFolders: same order and numbering as the
     * chips). Picking one selects the video if it is not selected yet and links
     * it to that subfolder — the same result as ticking the card's checkbox and
     * typing the folder number in its row. The list needs advanced folder mode
     * and a root folder; when either is missing the menu says so instead.
     */
    const SUBFOLDER_MENU_ID = NS + "subfolder_menu";
    let subfolderMenuEl = null;

    function closeSubfolderMenu() {
        window.removeEventListener("pointerdown", onSubfolderMenuDismiss, true);
        window.removeEventListener("scroll", onSubfolderMenuDismiss, true);
        window.removeEventListener("resize", onSubfolderMenuDismiss, true);
        window.removeEventListener("keydown", onSubfolderMenuKey, true);
        window.removeEventListener("blur", closeSubfolderMenu);
        if (subfolderMenuEl) {
            subfolderMenuEl.remove();
            subfolderMenuEl = null;
        }
    }

    // Pointer presses / scrolling / resizing anywhere except inside the menu
    // itself (clicking an entry, scrolling a long list) dismiss it.
    function onSubfolderMenuDismiss(ev) {
        if (!subfolderMenuEl) return;
        const t = ev && ev.target;
        if (t && t !== window && t !== document && subfolderMenuEl.contains(t)) return;
        closeSubfolderMenu();
    }

    function onSubfolderMenuKey(ev) {
        if (ev.key !== "Escape") return;
        stopCardEvent(ev);
        closeSubfolderMenu();
    }

    // Selects `link`'s video when needed and links it to `folderName`. Goes
    // through toggleSelection() so the on-page checkbox, FAB counter and the
    // panel row all update exactly as they do for a normal checkbox click.
    function linkVideoToFolder(link, folderName) {
        const url = videoUrl(link.href);
        if (!url) return;
        if (!currentFolders.includes(folderName)) {
            showCenterToast('Không tìm thấy thư mục "' + folderName + '".', "error", 3000);
            return;
        }
        if (!selected.has(url)) {
            attachCheckboxForLink(link);
            const checkboxEl = link.querySelector(":scope > ." + CHECKBOX_CLASS);
            if (!checkboxEl) return;
            toggleSelection(link, checkboxEl);
        }
        const item = selected.get(url);
        if (!item) return;
        item.folderName = folderName;
        // The row may have been built a moment ago without the mapping (or
        // may show an older one): bring its number box up to date.
        syncRowFolderInputs();
        showCenterToast("✓ [" + folderIndexForName(folderName) + "] " + folderName, "ok", 1600);
    }

    function openSubfolderMenu(link, x, y) {
        closeSubfolderMenu();
        const url = videoUrl(link.href);
        if (!url) return;
        const current = selected.get(url);

        const menu = document.createElement("div");
        menu.id = SUBFOLDER_MENU_ID;
        menu.style.cssText =
            "position:fixed!important;left:0;top:0;min-width:190px;max-width:min(320px,86vw);max-height:min(60vh,360px);overflow-y:auto;overscroll-behavior:contain;" +
            "padding:6px;border-radius:12px;background:rgba(15,15,20,.97);border:1px solid rgba(255,255,255,.12);box-shadow:0 12px 36px rgba(0,0,0,.55);" +
            "z-index:2147483647!important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#fff;";

        const header = document.createElement("div");
        header.textContent = "Thư mục con";
        header.style.cssText = "font-size:11px;font-weight:700;opacity:.65;padding:4px 8px 6px;";
        menu.appendChild(header);

        const addHint = (text, color) => {
            const el = document.createElement("div");
            el.textContent = text;
            el.style.cssText = "font-size:11.5px;line-height:1.45;padding:4px 8px 6px;color:" + (color || "rgba(255,255,255,.65)") + ";";
            menu.appendChild(el);
        };
        const addEntry = (label, onPick, active, color) => {
            const btn = document.createElement("button");
            const base = active ? "rgba(34,211,238,.16)" : "transparent";
            btn.type = "button";
            btn.textContent = label;
            btn.title = label;
            btn.style.cssText =
                "display:block;width:100%;text-align:left;padding:7px 10px;border:0;border-radius:8px;font-size:12.5px;cursor:pointer;" +
                "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:" + base + ";color:" + (color || (active ? "#67e8f9" : "#fff")) + ";";
            btn.addEventListener("mouseenter", () => (btn.style.background = "rgba(255,255,255,.1)"));
            btn.addEventListener("mouseleave", () => (btn.style.background = base));
            btn.addEventListener("click", (ev) => {
                stopCardEvent(ev);
                closeSubfolderMenu();
                onPick();
            });
            menu.appendChild(btn);
        };

        if (!advancedFolderMode) {
            addHint('Bật "Chọn thư mục nâng cao" trong cài đặt tiện ích để dùng menu này.');
        } else if (!rootDirLoaded) {
            addHint("Đang tải…");
        } else if (!rootDirHandle) {
            addHint("Chưa chọn thư mục gốc. Mở danh sách Video đã chọn và nhấp ô thư mục để chọn.");
        } else if (advFolderStatus === "no-permission") {
            addEntry(
                "⚠ Cấp lại quyền cho thư mục gốc",
                () => {
                    requestRootPermission().then(() => {
                        refreshSavePathUI();
                        rescanFolders();
                    });
                },
                false,
                "#fbbf24"
            );
        } else if (advFolderStatus === "loading") {
            addHint("Đang đọc thư mục con…");
        } else if (currentFolders.length === 0) {
            addHint("Thư mục gốc không có thư mục con.");
        } else {
            currentFolders.forEach((name, i) => {
                const isCurrent = !!current && current.folderName === name;
                addEntry((isCurrent ? "✓ " : "") + "[" + (i + 1) + "] " + name, () => linkVideoToFolder(link, name), isCurrent);
            });
        }
        if (advancedFolderMode && rootDirLoaded && rootDirHandle && advFolderStatus !== "no-permission" && advFolderStatus !== "loading") {
            addEntry(
                "✎ Mở app sửa video",
                () => {
                    openInEditorWithConfirm(url).then((result) => {
                        showCenterToast(result.text, result.ok ? "ok" : "error", result.ok ? 3600 : 5200);
                    });
                },
                false,
                "#a7f3d0"
            );
        }

        // Same isolation the other overlays use, so TikTok never reacts to
        // presses that land on the menu.
        for (const type of ["pointerdown", "mousedown", "touchstart"]) {
            menu.addEventListener(type, (ev) => ev.stopPropagation(), true);
        }
        (document.body || document.documentElement).appendChild(menu);
        subfolderMenuEl = menu;

        // Open at the cursor, nudged back inside the viewport if it would spill out.
        const r = menu.getBoundingClientRect();
        menu.style.left = Math.max(8, Math.min(x, window.innerWidth - r.width - 8)) + "px";
        menu.style.top = Math.max(8, Math.min(y, window.innerHeight - r.height - 8)) + "px";

        window.addEventListener("pointerdown", onSubfolderMenuDismiss, true);
        window.addEventListener("scroll", onSubfolderMenuDismiss, true);
        window.addEventListener("resize", onSubfolderMenuDismiss, true);
        window.addEventListener("keydown", onSubfolderMenuKey, true);
        window.addEventListener("blur", closeSubfolderMenu);
    }

    function onCardContextMenu(ev) {
        if (!subfolderContextMenu) return;
        const target = ev.target;
        // A right-click on the menu itself must not open the browser's menu either.
        if (subfolderMenuEl && target && subfolderMenuEl.contains(target)) {
            ev.preventDefault();
            return;
        }
        if (!isSearchPage()) return;
        const link = target && target.closest ? target.closest("a[href*='/video/']") : null;
        if (!link || !isThumbnailLink(link) || !videoUrl(link.href)) return;
        stopCardEvent(ev);
        openSubfolderMenu(link, ev.clientX, ev.clientY);
    }

    /* ---------------- Right-click subfolder menu inside the player windows ----------------
     * The same menu, opened by right-clicking the always-on-top (Document PiP)
     * player or the dedicated "open video in a new window" player while the
     * `subfolderContextMenu` option is ON. Those players are built by
     * assets/tiktok-hook.js (MAIN world), which draws the menu inside the
     * player's own window; the folder list and the selection live here, so it
     * talks to this module with CustomEvents (same cross-world pattern as the
     * player select button bridge):
     *   hook -> here : __DOWNLOAD_MULTISELECT_SUBFOLDER_MENU_QUERY__  { requestId, url }
     *   here -> hook : __DOWNLOAD_MULTISELECT_SUBFOLDER_MENU_DATA__   { requestId, url, state, folders, current }
     *   hook -> here : __DOWNLOAD_MULTISELECT_SUBFOLDER_PICK__        { requestId, url, thumb, title, folderName }
     *   here -> hook : __DOWNLOAD_MULTISELECT_SUBFOLDER_PICK_RESULT__ { requestId, ok, text }
     * `state` is ok / no-advanced / loading / no-root / no-permission /
     * scanning / empty: the same cases openSubfolderMenu() above words out.
     * Picking a folder selects the video when it is not selected yet and links
     * it to that folder, the same result as choosing it in the card menu.
     */
    const SUBFOLDER_MENU_QUERY_EVENT = "__DOWNLOAD_MULTISELECT_SUBFOLDER_MENU_QUERY__";
    const SUBFOLDER_MENU_DATA_EVENT = "__DOWNLOAD_MULTISELECT_SUBFOLDER_MENU_DATA__";
    const SUBFOLDER_PICK_EVENT = "__DOWNLOAD_MULTISELECT_SUBFOLDER_PICK__";
    const SUBFOLDER_PICK_RESULT_EVENT = "__DOWNLOAD_MULTISELECT_SUBFOLDER_PICK_RESULT__";
    const EDITOR_OPEN_EVENT = "__DOWNLOAD_MULTISELECT_EDITOR_OPEN__";
    const EDITOR_RESULT_EVENT = "__DOWNLOAD_MULTISELECT_EDITOR_RESULT__";

    function subfolderMenuSnapshot(url) {
        const current = selected.get(url);
        const snap = { url, state: "ok", folders: [], current: current && current.folderName ? current.folderName : "" };
        if (!advancedFolderMode) snap.state = "no-advanced";
        else if (!rootDirLoaded) snap.state = "loading";
        else if (!rootDirHandle) snap.state = "no-root";
        else if (advFolderStatus === "no-permission") snap.state = "no-permission";
        else if (advFolderStatus === "loading") snap.state = "scanning";
        else if (currentFolders.length === 0) snap.state = "empty";
        else snap.folders = currentFolders.slice();
        return snap;
    }

    // Same job as linkVideoToFolder() above, but for a video that is only known
    // by its URL (the one a player window is showing) instead of a card link.
    function linkUrlToFolder(url, folderName, meta) {
        if (!folderName || !currentFolders.includes(folderName)) {
            const text = 'Không tìm thấy thư mục "' + folderName + '".';
            showCenterToast(text, "error", 3000);
            return { ok: false, text };
        }
        if (!selected.has(url)) toggleSelectionForUrl(url, () => buildItemFromPlayer(url, meta));
        const item = selected.get(url);
        if (!item) return { ok: false, text: "Không chọn được video này." };
        item.folderName = folderName;
        syncRowFolderInputs();
        const text = "✓ [" + folderIndexForName(folderName) + "] " + folderName;
        showCenterToast(text, "ok", 1600);
        return { ok: true, text };
    }

    function readPlayerMenuRequest(event) {
        const detail = event && event.detail;
        const url = detail && typeof detail.url === "string" ? videoUrl(detail.url) : "";
        const requestId = detail && typeof detail.requestId === "string" ? detail.requestId.slice(0, 128) : "";
        return url && requestId ? { detail, url, requestId } : null;
    }

    function replyToPlayer(eventName, detail) {
        try {
            window.dispatchEvent(new CustomEvent(eventName, { detail }));
        } catch {}
    }

    window.addEventListener(SUBFOLDER_MENU_QUERY_EVENT, (event) => {
        const req = readPlayerMenuRequest(event);
        if (!req) return;
        replyToPlayer(SUBFOLDER_MENU_DATA_EVENT, Object.assign({ requestId: req.requestId }, subfolderMenuSnapshot(req.url)));
    });

    window.addEventListener(SUBFOLDER_PICK_EVENT, (event) => {
        const req = readPlayerMenuRequest(event);
        if (!req) return;
        const folderName = typeof req.detail.folderName === "string" ? req.detail.folderName : "";
        const result = linkUrlToFolder(req.url, folderName, req.detail);
        replyToPlayer(SUBFOLDER_PICK_RESULT_EVENT, { requestId: req.requestId, ok: result.ok, text: result.text });
    });

    // The player-menu bridge (MAIN world) sends this only after it has the
    // canonical TikTok URL from the existing subfolder-menu request. Keeping
    // the download here is essential: this isolated world owns the selected
    // folder handle and is the only context allowed to write the video bytes.
    window.addEventListener(EDITOR_OPEN_EVENT, (event) => {
        const req = readPlayerMenuRequest(event);
        if (!req) return;
        // The second request carries the full path the user typed in the
        // player's dialog; the first one carries none.
        const typedPath =
            req.detail.confirmed === true && typeof req.detail.listRootPath === "string" ? req.detail.listRootPath : "";
        const reply = (result) =>
            replyToPlayer(EDITOR_RESULT_EVENT, {
                requestId: req.requestId,
                ok: result.ok,
                text: result.text,
                needConfirm: result.needConfirm === true,
                info: result.needConfirm === true ? result.info : null,
            });
        downloadAndOpenInEditor(req.url, typedPath ? { listRootPath: typedPath } : undefined).then(reply, () =>
            reply({ ok: false, text: "Không mở được app sửa video." })
        );
    });

    // The warning itself is drawn by assets/editor-player-menu.js (MAIN world),
    // the same code the player windows use, so every entry point shows one
    // identical dialog. It answers with the full path the user typed.
    //   here -> bridge: __DOWNLOAD_MULTISELECT_EDITOR_CONFIRM__        { requestId, info }
    //   bridge -> here: __DOWNLOAD_MULTISELECT_EDITOR_CONFIRM_RESULT__ { requestId, accepted, listRootPath }
    const EDITOR_CONFIRM_EVENT = "__DOWNLOAD_MULTISELECT_EDITOR_CONFIRM__";
    const EDITOR_CONFIRM_RESULT_EVENT = "__DOWNLOAD_MULTISELECT_EDITOR_CONFIRM_RESULT__";

    function askEditorFolderConfirm(info) {
        return new Promise((resolve) => {
            const requestId = "tik-editor-page-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
            let timer = 0;
            const onResult = (event) => {
                const detail = event && event.detail;
                if (!detail || detail.requestId !== requestId) return;
                done({ accepted: detail.accepted === true, listRootPath: typeof detail.listRootPath === "string" ? detail.listRootPath : "" });
            };
            const done = (answer) => {
                clearTimeout(timer);
                window.removeEventListener(EDITOR_CONFIRM_RESULT_EVENT, onResult);
                resolve(answer);
            };
            window.addEventListener(EDITOR_CONFIRM_RESULT_EVENT, onResult);
            timer = setTimeout(() => done({ accepted: false, listRootPath: "" }), 10 * 60 * 1000);
            replyToPlayer(EDITOR_CONFIRM_EVENT, { requestId, info });
        });
    }

    // Entry point for the card context menu: same download-and-open, with the
    // full-path dialog in front of it when the folder's real path is unknown.
    async function openInEditorWithConfirm(url) {
        let result = await downloadAndOpenInEditor(url);
        if (result && result.needConfirm === true) {
            const answer = await askEditorFolderConfirm(result.info);
            if (!answer.accepted) return { ok: false, text: "Đã hủy mở app sửa video." };
            showCenterToast("Đang tải video để mở app sửa video…", "ok", 2600);
            result = await downloadAndOpenInEditor(url, { listRootPath: answer.listRootPath });
        }
        return result;
    }

    /* ---------------- floating counter icon (FAB): bottom-right by default, draggable, persisted ---------------- */

    // Clamp + apply a right/bottom offset pair to the FAB so it can never be
    // dragged fully off-screen (also re-clamps on window resize).
    function applyFabPosition(right, bottom) {
        const fab = document.getElementById(FAB_ID);
        if (!fab) return;
        const w = fab.offsetWidth || FAB_SIZE;
        const h = fab.offsetHeight || FAB_SIZE;
        const maxRight = Math.max(4, window.innerWidth - w - 4);
        const maxBottom = Math.max(4, window.innerHeight - h - 4);
        right = Math.min(Math.max(4, right), maxRight);
        bottom = Math.min(Math.max(4, bottom), maxBottom);
        fab.style.right = right + "px";
        fab.style.bottom = bottom + "px";
        fab.style.left = "auto";
    }

    function saveFabPosition(right, bottom) {
        try {
            chrome.storage.local.set({ [FAB_POS_KEY]: { right, bottom } });
        } catch {}
    }

    function loadFabPosition() {
        try {
            chrome.storage.local.get(FAB_POS_KEY, (res) => {
                const pos = res && res[FAB_POS_KEY];
                if (pos && typeof pos.right === "number" && typeof pos.bottom === "number") {
                    applyFabPosition(pos.right, pos.bottom);
                }
            });
        } catch {}
    }

    let fabDragState = null;
    let fabSuppressNextClick = false;

    function ensureFab() {
        let fab = document.getElementById(FAB_ID);
        if (fab) return fab;
        fab = document.createElement("div");
        fab.id = FAB_ID;
        // Default corner: bottom-right. Position is expressed via right/bottom
        // (not left) so dragging + resize-clamping stay simple and consistent.
        fab.style.cssText =
            'position:fixed!important;right:' + FAB_MARGIN + 'px!important;bottom:' + FAB_MARGIN + 'px!important;min-width:52px!important;height:52px!important;padding:0 14px!important;border-radius:26px!important;background:linear-gradient(135deg,#a855f7,#22d3ee)!important;align-items:center!important;justify-content:center!important;gap:8px!important;cursor:grab!important;z-index:2147483646!important;box-shadow:0 6px 24px rgba(0,0,0,.45),inset 0 0 0 1px rgba(255,255,255,.18)!important;font:700 15px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;color:#fff!important;user-select:none!important;touch-action:none!important;transition:transform .15s ease!important;display:none';
        let iconSrc = "";
        try {
            iconSrc = chrome.runtime.getURL("icons/icon-32.png");
        } catch {}
        fab.innerHTML =
            (iconSrc
                ? '<img src="' + iconSrc + '" alt="" style="width:22px;height:22px;object-fit:contain;display:block;pointer-events:none;">'
                : "") + '<span id="' + FAB_COUNT_ID + '" style="pointer-events:none;">0</span>';
        fab.title = "Giữ để di chuyển · Bấm để xổ/thu gọn danh sách";
        fab.addEventListener("mouseenter", () => {
            if (!fabDragState) fab.style.transform = "scale(1.06)";
        });
        fab.addEventListener("mouseleave", () => {
            if (!fabDragState) fab.style.transform = "scale(1)";
        });
        fab.addEventListener(
            "click",
            (ev) => {
                stopCardEvent(ev);
                if (fabSuppressNextClick) {
                    fabSuppressNextClick = false;
                    return;
                }
                togglePanel();
            },
            true
        );
        for (const type of ["mousedown", "touchstart"]) fab.addEventListener(type, stopCardEvent, true);

        // Press-and-hold to move: track from pointerdown, only "become" a
        // drag once the pointer has moved past a small threshold (so a plain
        // tap still opens the panel instead of being swallowed as a drag).
        fab.addEventListener(
            "pointerdown",
            (ev) => {
                stopCardEvent(ev);
                const rect = fab.getBoundingClientRect();
                fabDragState = {
                    pointerId: ev.pointerId,
                    startX: ev.clientX,
                    startY: ev.clientY,
                    startRight: window.innerWidth - rect.right,
                    startBottom: window.innerHeight - rect.bottom,
                    moved: false,
                };
                try {
                    fab.setPointerCapture(ev.pointerId);
                } catch {}
            },
            true
        );
        fab.addEventListener(
            "pointermove",
            (ev) => {
                if (!fabDragState || ev.pointerId !== fabDragState.pointerId) return;
                const dx = ev.clientX - fabDragState.startX;
                const dy = ev.clientY - fabDragState.startY;
                if (!fabDragState.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
                    fabDragState.moved = true;
                    fab.style.transition = "none";
                    fab.style.cursor = "grabbing";
                }
                if (fabDragState.moved) {
                    stopCardEvent(ev);
                    applyFabPosition(fabDragState.startRight - dx, fabDragState.startBottom - dy);
                    if (panelOpen) positionPanelNearFab();
                }
            },
            true
        );
        const endFabDrag = (ev) => {
            if (!fabDragState || ev.pointerId !== fabDragState.pointerId) return;
            fab.style.transition = "";
            fab.style.cursor = "grab";
            try {
                fab.releasePointerCapture(ev.pointerId);
            } catch {}
            if (fabDragState.moved) {
                stopCardEvent(ev);
                const right = parseFloat(fab.style.right) || FAB_MARGIN;
                const bottom = parseFloat(fab.style.bottom) || FAB_MARGIN;
                saveFabPosition(right, bottom);
                fabSuppressNextClick = true; // the browser still fires "click" right after; swallow just that one
            }
            fabDragState = null;
        };
        fab.addEventListener("pointerup", endFabDrag, true);
        fab.addEventListener("pointercancel", endFabDrag, true);

        (document.body || document.documentElement).appendChild(fab);
        loadFabPosition();
        window.addEventListener("resize", () => {
            const right = parseFloat(fab.style.right) || FAB_MARGIN;
            const bottom = parseFloat(fab.style.bottom) || FAB_MARGIN;
            applyFabPosition(right, bottom);
            if (panelOpen) positionPanelNearFab();
        });
        return fab;
    }

    // The FAB is always on screen (also with nothing selected, then it shows 0);
    // only its counter changes. The list still closes once the selection empties out.
    function updateFab() {
        const fab = ensureFab();
        const count = selected.size;
        const countEl = document.getElementById(FAB_COUNT_ID);
        if (countEl) countEl.textContent = String(count);
        fab.style.display = "flex";
        if (count === 0) closePanel();
    }

    /* ---------------- management panel ---------------- */

    let panelOpen = false;

    function ensurePanel() {
        let panel = document.getElementById(PANEL_ID);
        if (panel) return panel;
        panel = document.createElement("div");
        panel.id = PANEL_ID;
        panel.style.cssText =
            'position:fixed!important;right:16px!important;bottom:80px!important;width:320px!important;max-height:60vh!important;flex-direction:column!important;background:rgba(15,15,20,.97)!important;backdrop-filter:blur(20px)!important;-webkit-backdrop-filter:blur(20px)!important;border:1px solid rgba(255,255,255,.12)!important;border-radius:16px!important;box-shadow:0 16px 48px rgba(0,0,0,.55)!important;z-index:2147483646!important;overflow:hidden!important;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;color:#fff!important;display:none';
        // Actual position is recalculated relative to the FAB's current spot
        // every time the panel opens (positionPanelNearFab) — the values
        // above are only a same-tick fallback before that first runs.
        panel.innerHTML =
            '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.08);flex:none;">' +
            '<span style="font-weight:700;font-size:14px;">Video đã chọn (<span id="' + PANEL_COUNT_ID + '">0</span>)</span>' +
            '<button type="button" id="' + PANEL_CLOSE_ID + '" title="Đóng" style="width:26px;height:26px;border:0;border-radius:8px;background:rgba(255,255,255,.08);color:#fff;cursor:pointer;font-size:15px;line-height:1;">×</button>' +
            "</div>" +
            '<div style="display:flex;align-items:center;gap:8px;padding:8px 14px;border-bottom:1px solid rgba(255,255,255,.08);flex:none;">' +
            '<input type="checkbox" id="' + PANEL_SELECTALL_CHECK_ID + '" style="width:16px;height:16px;flex:none;accent-color:#22d3ee;cursor:pointer;" title="Select/Deselect all">' +
            '<label for="' + PANEL_SELECTALL_CHECK_ID + '" style="font-size:12px;opacity:.85;cursor:pointer;user-select:none;white-space:nowrap;">Select all</label>' +
            '<div id="' + PANEL_SAVEPATH_BOX_ID + '" title="Nhấp để chọn/đổi thư mục lưu video" style="flex:1;min-width:0;height:24px;display:flex;align-items:center;gap:5px;padding:0 6px 0 8px;border-radius:7px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);cursor:pointer;user-select:none;">' +
            folderIconSvg() +
            '<span id="' + PANEL_SAVEPATH_TEXT_ID + '" style="flex:1;min-width:0;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Đang tải…</span>' +
            '<button type="button" id="' + PANEL_SAVEPATH_CLEAR_ID + '" title="Bỏ chọn thư mục" style="display:none;width:15px;height:15px;flex:none;border:0;border-radius:5px;background:transparent;color:rgba(255,255,255,.55);cursor:pointer;font-size:12px;line-height:1;padding:0;">×</button>' +
            "</div>" +
            '<button type="button" id="' + PANEL_OPENFOLDER_BTN_ID + '" title="Mở thư mục tải về trong Explorer" style="height:24px;flex:none;border:1px solid rgba(255,255,255,.15);border-radius:7px;background:rgba(255,255,255,.06);color:#fff;cursor:pointer;font-size:11px;line-height:1;padding:0 9px;white-space:nowrap;">Mở thư mục</button>' +
            "</div>" +
            '<div id="' + PANEL_SYNC_HINT_ID + '" style="display:none;padding:7px 14px 8px;border-bottom:1px solid rgba(255,255,255,.08);flex:none;font-size:11px;line-height:1.45;color:#fbbf24;"></div>' +
            '<div id="' + PANEL_ADV_SECTION_ID + '" style="display:none;padding:8px 14px 10px;border-bottom:1px solid rgba(255,255,255,.08);flex:none;">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">' +
            '<span style="display:flex;align-items:center;gap:6px;min-width:0;">' +
            '<button type="button" id="' + PANEL_FOLDERS_TOGGLE_ID + '" title="Thu gọn danh sách thư mục con" aria-expanded="true" style="width:20px;height:20px;flex:none;border:0;border-radius:6px;background:rgba(255,255,255,.08);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;">' + foldersToggleIconSvg() + "</button>" +
            '<span style="font-size:11px;font-weight:700;opacity:.75;">Thư mục con <span id="' + PANEL_FOLDERS_HINT_ID + '" style="font-weight:400;opacity:.7;">(kéo để đổi vị trí)</span></span>' +
            "</span>" +
            '<span style="display:flex;align-items:center;gap:6px;flex:none;">' +
            '<button type="button" id="' + PANEL_SHORTCUT_BTN_ID + '" title="Phím tắt xem nhanh video" style="height:20px;flex:none;border:0;border-radius:6px;background:rgba(255,255,255,.08);color:#fff;cursor:pointer;font-size:11px;line-height:1;padding:0 9px;white-space:nowrap;">Phím tắt</button>' +
            '<button type="button" id="' + PANEL_ADV_REFRESH_ID + '" title="Làm mới danh sách thư mục" style="width:20px;height:20px;flex:none;border:0;border-radius:6px;background:rgba(255,255,255,.08);color:#fff;cursor:pointer;font-size:12px;line-height:1;">⟳</button>' +
            "</span>" +
            "</div>" +
            '<div id="' + PANEL_FOLDER_LIST_ID + '" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;"></div>' +
            "</div>" +
            '<div style="display:flex;align-items:center;gap:8px;padding:8px 14px 10px;border-bottom:1px solid rgba(255,255,255,.08);flex:none;">' +
            '<label for="' + PANEL_CONCURRENCY_INPUT_ID + '" style="font-size:11.5px;opacity:.75;white-space:nowrap;flex:none;">Tải cùng lúc</label>' +
            '<input type="number" id="' + PANEL_CONCURRENCY_INPUT_ID + '" min="1" max="' + MAX_CONCURRENCY + '" step="1" value="' + DEFAULT_CONCURRENCY + '" title="Tối đa ' + MAX_CONCURRENCY + ' video / lượt" style="width:40px;height:30px;flex:none;box-sizing:border-box;border-radius:7px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#fff;font-size:12px;padding:0 4px;text-align:center;outline:none;">' +
            '<input type="text" id="' + PANEL_RENAME_INPUT_ID + '" placeholder="Đặt tên khi tải (vd: Dép Nesty Ne01)" style="flex:1;min-width:0;height:30px;box-sizing:border-box;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#fff;font-size:12px;padding:0 10px;outline:none;">' +
            "</div>" +
            '<div id="' + PANEL_LIST_ID + '" style="overflow-y:auto;flex:1 1 auto;padding:8px;display:flex;flex-direction:column;gap:8px;"></div>' +
            '<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;border-top:1px solid rgba(255,255,255,.08);flex:none;">' +
            '<div title="Tải xuống" style="width:36px;height:36px;flex:none;border-radius:10px;background:linear-gradient(135deg,#a855f7,#22d3ee);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(168,85,247,.4);">' + footerDownloadIconSvg() + "</div>" +
            '<button type="button" id="' + PANEL_DL_PICKED_ID + '" title="Tải các video đã chọn" style="flex:1;height:36px;border:1.5px solid rgba(34,211,238,.55);border-radius:10px;background:rgba(34,211,238,.14);color:#67e8f9;font-weight:700;font-size:12.5px;cursor:pointer;">Đã chọn</button>' +
            '<button type="button" id="' + PANEL_DL_ALL_ID + '" title="Tải tất cả video trong danh sách" style="flex:1;height:36px;border:0;border-radius:10px;background:linear-gradient(135deg,#a855f7,#22d3ee);color:#fff;font-weight:700;font-size:12.5px;cursor:pointer;box-shadow:0 2px 10px rgba(168,85,247,.4);">Tất cả</button>' +
            "</div>";
        (document.body || document.documentElement).appendChild(panel);

        panel.querySelector("#" + PANEL_CLOSE_ID).addEventListener("click", (ev) => {
            stopCardEvent(ev);
            setPanelExpandedMode(false);
            closePanel();
        });
        panel.querySelector("#" + PANEL_SELECTALL_CHECK_ID).addEventListener("change", (ev) => {
            const checkAll = ev.target.checked;
            for (const item of selected.values()) item.picked = checkAll;
            renderPanelList();
        });
        // "Save to folder" box: a single click opens the native folder
        // picker to choose (or change) where videos get saved — there is no
        // subfolder text to edit anymore. Double click intentionally does
        // nothing (the box doesn't try to distinguish it from a single
        // click at all — see the dblclick listener below).
        const savePathBox = panel.querySelector("#" + PANEL_SAVEPATH_BOX_ID);
        savePathBox.addEventListener("click", (ev) => {
            ev.stopPropagation();
            ev.preventDefault();
            // Box is showing "⚠ ... — nhấp để cấp lại quyền": a single
            // click here means re-confirm the lapsed permission instead
            // of opening the picker again (matches that label literally).
            if (savePathNeedsPermission) {
                requestRootPermission().then(() => {
                    refreshSavePathUI();
                    if (advancedFolderMode) rescanFolders();
                });
            } else pickRootFolder();
        });
        // Swallows the dblclick so it doesn't bubble out to the page (e.g.
        // TikTok's own double-click-to-like handling underneath) — the box
        // still just runs its normal click handler for each of the two
        // clicks that make up a double click.
        savePathBox.addEventListener("dblclick", stopCardEvent);
        const openFolderBtn = panel.querySelector("#" + PANEL_OPENFOLDER_BTN_ID);
        openFolderBtn.addEventListener("click", (ev) => {
            stopCardEvent(ev);
            openDownloadFolder();
        });
        openFolderBtn.addEventListener("dblclick", stopCardEvent);
        panel.querySelector("#" + PANEL_SAVEPATH_CLEAR_ID).addEventListener("click", (ev) => {
            stopCardEvent(ev);
            clearRootFolder();
        });
        panel.querySelector("#" + PANEL_ADV_REFRESH_ID).addEventListener("click", (ev) => {
            stopCardEvent(ev);
            rescanFolders();
        });
        panel.querySelector("#" + PANEL_SHORTCUT_BTN_ID).addEventListener("click", (ev) => {
            stopCardEvent(ev);
            toggleShortcutHelp(ev.currentTarget);
        });
        panel.querySelector("#" + PANEL_FOLDERS_TOGGLE_ID).addEventListener("click", (ev) => {
            stopCardEvent(ev);
            setFoldersCollapsed(!foldersCollapsed);
        });
        refreshSavePathUI();
        renderAdvancedFolderSection();
        applyFoldersCollapsed();
        // Prevent TikTok's own keyboard shortcuts (mute, next video, etc.)
        // from firing while the user is typing a rename — only propagation
        // is stopped, so normal typing/selection inside the box is untouched.
        for (const type of ["keydown", "keyup", "keypress"]) {
            panel.querySelector("#" + PANEL_RENAME_INPUT_ID).addEventListener(type, (ev) => ev.stopPropagation());
        }
        // Click on the box -> paste the clipboard text into it (see
        // pasteClipboardIntoRename). "click" (not mousedown) so the read runs
        // inside a user gesture; the panel's own click listener is bubble-phase,
        // so it does not get in the way here.
        const renameInput = panel.querySelector("#" + PANEL_RENAME_INPUT_ID);
        renameInput.addEventListener("click", () => {
            pasteClipboardIntoRename(renameInput);
        });
        // Text kept from before a reload (or typed/pasted while the panel was not built yet), and every
        // later change of it (see "keep the list and the rename box across reloads").
        renameInput.value = renameDraft;
        renameInput.addEventListener("input", () => {
            renameDraft = renameInput.value;
            persistRename();
        });
        const concurrencyInput = panel.querySelector("#" + PANEL_CONCURRENCY_INPUT_ID);
        for (const type of ["keydown", "keyup", "keypress"]) {
            concurrencyInput.addEventListener(type, (ev) => ev.stopPropagation());
        }
        concurrencyInput.addEventListener("change", (ev) => {
            stopCardEvent(ev);
            const n = getConcurrency();
            ev.target.value = String(n);
            try {
                chrome.storage.local.set({ [CONCURRENCY_KEY]: n });
            } catch {}
        });
        // Mouse wheel over the concurrency stepper nudges it by 1 per notch
        // (scroll up = increase), clamped to [1, MAX_CONCURRENCY].
        concurrencyInput.addEventListener("wheel", (ev) => {
            stopCardEvent(ev);
            const current = getConcurrency();
            const next = Math.max(1, Math.min(MAX_CONCURRENCY, current + (ev.deltaY < 0 ? 1 : -1)));
            concurrencyInput.value = String(next);
            try {
                chrome.storage.local.set({ [CONCURRENCY_KEY]: next });
            } catch {}
        }, { passive: false });
        try {
            chrome.storage.local.get(CONCURRENCY_KEY, (res) => {
                const n = res && res[CONCURRENCY_KEY];
                if (Number.isFinite(n) && n >= 1 && n <= MAX_CONCURRENCY) concurrencyInput.value = String(n);
            });
        } catch {}
        panel.querySelector("#" + PANEL_DL_PICKED_ID).addEventListener("click", (ev) => onBatchDownloadClick(ev, true));
        panel.querySelector("#" + PANEL_DL_ALL_ID).addEventListener("click", (ev) => onBatchDownloadClick(ev, false));
        // Subfolder chips are re-ordered by dragging. This must be attached
        // BEFORE the capturing stopPropagation() loop right below: that loop
        // swallows pointerdown for everything inside the panel (the chips
        // included), but listeners already attached to the panel itself in
        // the same phase still run.
        panel.addEventListener("pointerdown", onFolderChipPointerDown, true);
        for (const type of ["pointerdown", "mousedown", "touchstart"]) {
            panel.addEventListener(type, (ev) => ev.stopPropagation(), true);
        }
        // IMPORTANT: "click" must be bubble-phase here, not capturing.
        // A capturing stopPropagation() on this ancestor would stop the event
        // before it ever reaches a row's own button (target phase never runs),
        // which is why download/player/thumb/remove silently did nothing.
        // Each row control already calls stopCardEvent() itself right after
        // it's handled, so this bubble listener only mops up clicks that land
        // on inert panel chrome (padding, the checkbox's native click) and
        // keeps those from leaking out to the page's own listeners.
        panel.addEventListener("click", (ev) => ev.stopPropagation(), false);
        return panel;
    }

    function getConcurrency() {
        const input = document.getElementById(PANEL_CONCURRENCY_INPUT_ID);
        let n = input ? parseInt(input.value, 10) : DEFAULT_CONCURRENCY;
        if (!Number.isFinite(n) || n < 1) n = 1;
        if (n > MAX_CONCURRENCY) n = MAX_CONCURRENCY;
        return n;
    }

    // Places the panel just above/beside wherever the FAB currently is
    // (which may have been dragged anywhere on screen), using explicit
    // left/bottom pixel values so it stays fully on-screen from any corner.
    function positionPanelNearFab() {
        const panel = document.getElementById(PANEL_ID);
        const fab = document.getElementById(FAB_ID);
        if (!panel || !fab) return;
        const fabRect = fab.getBoundingClientRect();
        const panelWidth = panel.offsetWidth || 320;
        const gap = 8;
        let left = fabRect.right - panelWidth;
        left = Math.max(8, Math.min(left, window.innerWidth - panelWidth - 8));
        let bottom = Math.max(8, window.innerHeight - fabRect.top + gap);
        panel.style.left = left + "px";
        panel.style.right = "auto";
        panel.style.bottom = bottom + "px";
    }

    function playerIconSvg() {
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="m10 9 5 3-5 3Z" fill="currentColor" stroke="none"/></svg>';
    }
    function downloadIconSvg() {
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>';
    }
    // Slightly larger, fixed-white variant used for the standalone footer
    // icon badge — stroke is hard-coded (not currentColor) so it always
    // reads as a bright icon against that badge's colored gradient, no
    // matter what text color the surrounding panel ends up using.
    function footerDownloadIconSvg() {
        return '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>';
    }

    function updateSelectAllCheckbox() {
        const cb = document.getElementById(PANEL_SELECTALL_CHECK_ID);
        if (!cb) return;
        const items = Array.from(selected.values());
        const total = items.length;
        const pickedCount = items.filter((i) => i.picked !== false).length;
        cb.disabled = total === 0;
        cb.checked = total > 0 && pickedCount === total;
        cb.indeterminate = pickedCount > 0 && pickedCount < total;
    }

    // Builds one row's DOM node and wires up its controls. Shared by the
    // full renderPanelList() rebuild and by appendPanelRow()'s single-row
    // insert, so the two paths can never drift out of sync with each other.
    // `index` (1-based position within the current `selected` order) is only
    // used for the advanced-mode ①②③ badge — callers outside advanced mode
    // can omit it. See renderPanelList/appendPanelRow for how it's supplied.
    function buildPanelRow(item, index) {
        const row = document.createElement("div");
        row.dataset.url = item.url;
        row.style.cssText = "display:flex;align-items:center;gap:8px;padding:6px;border-radius:10px;transition:background .15s,box-shadow .15s;background:" + ROW_BG_NORMAL + ";";
        const badgeHtml = advancedFolderMode
            ? '<div class="' + ROW_NUM_BADGE_CLASS + '" style="width:16px;height:16px;flex:none;border-radius:50%;background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:rgba(255,255,255,.75);">' + (index || 1) + "</div>"
            : "";
        const mappedIdx = advancedFolderMode && item.folderName ? folderIndexForName(item.folderName) : 0;
        const folderCellHtml = advancedFolderMode
            ? '<div class="' + ROW_FOLDER_CELL_CLASS + '" style="flex:none;">' +
              '<input type="text" inputmode="numeric" autocomplete="off" class="' + ROW_FOLDER_INPUT_CLASS + '" placeholder="-" value="' + (mappedIdx ? mappedIdx : "") + '" title="' + (currentFolders.length ? "Số thư mục (1-" + currentFolders.length + ")" : "Chưa có thư mục con") + '" style="width:32px;height:26px;box-sizing:border-box;border-radius:7px;border:1px solid ' + (mappedIdx ? "rgba(34,211,238,.55)" : "rgba(255,255,255,.15)") + ';background:rgba(255,255,255,.06);color:' + (mappedIdx ? "#67e8f9" : "#fff") + ';font-size:11px;text-align:center;outline:none;">' +
              "</div>"
            : "";
        row.innerHTML =
            badgeHtml +
            '<input type="checkbox" class="' + ROW_CHECK_CLASS + '" ' + (item.picked !== false ? "checked" : "") +
            ' style="width:16px;height:16px;flex:none;accent-color:#22d3ee;cursor:pointer;" title="Chọn để tải trong lượt Download tiếp theo">' +
            '<div class="' + ROW_THUMB_CLASS + '" title="Xem PIP" style="width:38px;height:54px;border-radius:6px;overflow:hidden;background:#000;flex:none;cursor:pointer;position:relative;">' +
            (item.thumb ? '<img src="' + escapeHtml(item.thumb) + '" style="width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;">' : "") +
            "</div>" +
            '<div style="flex:1;min-width:0;">' +
            '<div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHtml(item.title) + "</div>" +
            '<div class="' + ROW_STATUS_CLASS + '" style="font-size:10.5px;opacity:.65;margin-top:2px;"></div>' +
            "</div>" +
            '<button type="button" class="' + ROW_PLAYER_CLASS + '" title="Open video player" style="width:26px;height:26px;flex:none;border:0;border-radius:7px;background:rgba(255,255,255,.08);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;">' + playerIconSvg() + "</button>" +
            '<button type="button" class="' + ROW_DL_CLASS + '" title="Download" style="width:26px;height:26px;flex:none;border:0;border-radius:7px;background:rgba(255,255,255,.08);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;">' + downloadIconSvg() + "</button>" +
            '<button type="button" class="' + ROW_REMOVE_CLASS + '" title="Xoá khỏi danh sách" style="width:22px;height:22px;flex:none;border:0;border-radius:7px;background:transparent;color:rgba(255,255,255,.55);cursor:pointer;font-size:15px;line-height:1;">×</button>' +
            folderCellHtml;

        const statusEl = row.querySelector("." + ROW_STATUS_CLASS);
        const setStatus = (text, isError) => {
            if (!statusEl) return;
            statusEl.textContent = text || "";
            statusEl.style.color = isError ? "#fb7185" : "rgba(255,255,255,.65)";
            markRowWatching(row, text);
        };
        // The list is rebuilt now and then (select all, reopening the panel)
        // while a video is still playing: show it as being watched again.
        if (watchingItem === item) setStatus(WATCHING_STATUS_TEXT);

        row.querySelector("." + ROW_CHECK_CLASS).addEventListener("change", (ev) => {
            item.picked = ev.target.checked;
            updateSelectAllCheckbox();
        });
        // A thumbnail kept from an earlier session may have expired: show the plain black box, not a broken image.
        const thumbImg = row.querySelector("." + ROW_THUMB_CLASS + " img");
        if (thumbImg) thumbImg.addEventListener("error", () => (thumbImg.style.display = "none"));
        row.querySelector("." + ROW_THUMB_CLASS).addEventListener("click", (ev) => {
            stopCardEvent(ev);
            previewPip(item, setStatus);
        });
        row.querySelector("." + ROW_PLAYER_CLASS).addEventListener("click", (ev) => {
            stopCardEvent(ev);
            openPlayerWindow(item, setStatus);
        });
        row.querySelector("." + ROW_DL_CLASS).addEventListener("click", async (ev) => {
            stopCardEvent(ev);
            // Already being downloaded (this button pressed again, or a batch
            // is saving it right now): never start a second download of it.
            if (downloadingUrls.has(item.url)) return;
            downloadingUrls.add(item.url);
            try {
                if (!(await confirmRenameBeforeDownload())) return;
                // Advanced mode: refuse (with the standard 3-option prompt) to
                // download this one video while it still has no folder chosen,
                // same rule the batch buttons enforce — see resolveDownloadBatch.
                const resolved = await resolveDownloadBatch([item]);
                if (!resolved || resolved.length === 0) return;
                setStatus("Đang tải…");
                const r = await downloadUrl(item.url);
                setStatus(r.success ? "Đã tải xong" : "Lỗi: " + (r.error || "unknown"), !r.success);
                if (r.success) {
                    removeSelection(item.url);
                    markDownloadedOnPage(item.url);
                }
            } finally {
                downloadingUrls.delete(item.url);
            }
        });
        row.querySelector("." + ROW_REMOVE_CLASS).addEventListener("click", (ev) => {
            stopCardEvent(ev);
            removeSelection(item.url, { clearPlayer: true });
        });

        if (advancedFolderMode) {
            const folderInput = row.querySelector("." + ROW_FOLDER_INPUT_CLASS);
            if (folderInput) {
                folderInput.addEventListener("focus", () => {
                    focusedFolderInputEl = folderInput;
                    focusedFolderInputAt = Date.now();
                });
                folderInput.addEventListener("blur", () => {
                    if (focusedFolderInputEl === folderInput) focusedFolderInputAt = Date.now();
                });
                // No click/pointerdown handling needed here: the panel's own
                // bubble-phase listeners already stop these from leaking out
                // to the page (same as the rename/concurrency inputs above),
                // without calling preventDefault() — which a text input needs
                // left alone on mousedown, or it can never receive focus.
                for (const type of ["keydown", "keyup", "keypress"]) {
                    folderInput.addEventListener(type, (ev) => ev.stopPropagation());
                }
                folderInput.addEventListener("change", (ev) => {
                    stopCardEvent(ev);
                    handleFolderInputChange(item, folderInput);
                });
            }
        }

        return row;
    }

    function emptyListPlaceholderHtml() {
        return '<div data-empty="1" style="padding:18px 6px;text-align:center;font-size:12.5px;opacity:.6;">Chưa có video nào được chọn</div>';
    }

    function renderPanelList() {
        const list = document.getElementById(PANEL_LIST_ID);
        const countEl = document.getElementById(PANEL_COUNT_ID);
        if (countEl) countEl.textContent = String(selected.size);
        updateSelectAllCheckbox();
        if (!list) return;
        list.innerHTML = "";
        if (selected.size === 0) {
            list.innerHTML = emptyListPlaceholderHtml();
            return;
        }
        let i = 0;
        for (const item of selected.values()) {
            i++;
            list.appendChild(buildPanelRow(item, i));
        }
    }

    // Adds exactly one new row for `item` to an already-open panel, leaving
    // every existing row (and its already-loaded thumbnail image) untouched.
    // This is what stops a new selection from re-rendering/reflashing the
    // whole list — only the newly picked video's row is created.
    function appendPanelRow(item) {
        const list = document.getElementById(PANEL_LIST_ID);
        const countEl = document.getElementById(PANEL_COUNT_ID);
        if (countEl) countEl.textContent = String(selected.size);
        updateSelectAllCheckbox();
        if (!list) return;
        const placeholder = list.querySelector("[data-empty]");
        if (placeholder) list.innerHTML = "";
        list.appendChild(buildPanelRow(item, selected.size));
    }

    // Removes exactly the row for `url` from an already-open panel, without
    // rebuilding/reflashing any other row.
    function removePanelRowByUrl(url) {
        const list = document.getElementById(PANEL_LIST_ID);
        const countEl = document.getElementById(PANEL_COUNT_ID);
        if (countEl) countEl.textContent = String(selected.size);
        updateSelectAllCheckbox();
        if (!list) return;
        const row = list.querySelector('[data-url="' + CSS.escape(url) + '"]');
        if (row) row.remove();
        if (selected.size === 0) list.innerHTML = emptyListPlaceholderHtml();
        else renumberVisibleRows();
    }

    // Sets a row's status text by re-querying the DOM fresh (the list gets
    // fully rebuilt whenever any item finishes, via removeSelection ->
    // renderPanelList, so a stale element reference from before that
    // rebuild would silently write to a detached node).
    function setRowStatus(item, text, isError) {
        const list = document.getElementById(PANEL_LIST_ID);
        if (!list) return;
        const statusEls = list.querySelectorAll("." + ROW_STATUS_CLASS);
        const idx = Array.from(selected.values()).indexOf(item);
        const statusEl = statusEls[idx];
        if (!statusEl) return;
        statusEl.textContent = text || "";
        statusEl.style.color = isError ? "#fb7185" : "rgba(255,255,255,.65)";
        markRowWatching(statusEl.closest("[data-url]"), text);
    }

    // Download guards. The batch is "busy" from the moment Đã chọn / Tất cả is
    // pressed (the confirm dialogs included) until its last video is done, and
    // both buttons stay disabled meanwhile. Pressing them again used to start
    // another pass over the same, still-selected videos and download each one
    // again. downloadingUrls is the same guard per video, so a row's own
    // download button and a running batch can't both save the same video.
    let batchDownloadBusy = false;
    const downloadingUrls = new Set();

    function setBatchButtonsBusy(busy) {
        for (const id of [PANEL_DL_PICKED_ID, PANEL_DL_ALL_ID]) {
            const btn = document.getElementById(id);
            if (!btn) continue;
            btn.disabled = busy;
            btn.style.opacity = busy ? ".5" : "";
            btn.style.cursor = busy ? "not-allowed" : "pointer";
        }
    }

    // onlyPicked: true = "Đã chọn" (ticked rows only), false = "Tất cả".
    async function onBatchDownloadClick(ev, onlyPicked) {
        stopCardEvent(ev);
        if (batchDownloadBusy) return;
        batchDownloadBusy = true;
        setBatchButtonsBusy(true);
        try {
            if (!(await confirmRenameBeforeDownload())) return;
            const all = Array.from(selected.values());
            const resolved = await resolveDownloadBatch(onlyPicked ? all.filter((i) => i.picked !== false) : all);
            if (resolved) await runBatchDownload(resolved);
        } finally {
            batchDownloadBusy = false;
            setBatchButtonsBusy(false);
        }
    }

    // A batch is attempted at most this many times in total: the initial
    // pass over every item, plus up to two automatic retry passes that only
    // re-attempt whatever is still failing. Kept small and fixed (rather
    // than exposed as a setting) since most failures here are transient
    // (a metadata fetch racing the page, a momentary network hiccup) and
    // clear up within a couple of tries; anything still failing after 3
    // attempts is almost always a real error worth surfacing rather than
    // hiding behind more retries.
    const MAX_DOWNLOAD_ATTEMPTS = 3;
    // Short pause before each retry pass (not before the first pass), so a
    // retry doesn't immediately re-hit whatever just failed.
    const RETRY_DELAY_MS = 1200;

    // Runs one concurrent pass over `items` (up to `concurrency` requests in
    // flight at once, via a small worker pool draining a shared cursor) and
    // reports which ones failed, so the caller can decide whether to retry
    // them. `statusPrefix` lets a retry pass show e.g. "Đang tải lại (lần
    // 2)…" instead of the first-pass "Đang tải…", so the user can tell a
    // retry is happening rather than a fresh attempt.
    async function runDownloadPass(items, concurrency, statusPrefix) {
        let cursor = 0;
        let successCount = 0;
        const failed = [];

        async function worker(workerIndex) {
            // Stagger worker start slightly so a big batch doesn't fire every
            // request in the exact same tick.
            if (workerIndex > 0) await sleep(workerIndex * 150);
            while (true) {
                const idx = cursor++;
                if (idx >= items.length) return;
                const item = items[idx];
                // Already downloaded or removed meanwhile (e.g. through its own
                // row button), or being saved right now: don't download it again.
                if (!selected.has(item.url) || downloadingUrls.has(item.url)) continue;
                downloadingUrls.add(item.url);
                setRowStatus(item, statusPrefix, false);
                let r;
                try {
                    r = await downloadUrl(item.url);
                } finally {
                    downloadingUrls.delete(item.url);
                }
                setRowStatus(item, r.success ? "Đã tải xong" : "Lỗi: " + (r.error || "unknown"), !r.success);
                if (r.success) {
                    successCount++;
                    removeSelection(item.url);
                    markDownloadedOnPage(item.url);
                } else {
                    item.lastError = r.error || "unknown";
                    failed.push(item);
                }
            }
        }

        const n = Math.min(concurrency, items.length);
        const workers = [];
        for (let i = 0; i < n; i++) workers.push(worker(i));
        await Promise.all(workers);
        return { successCount, failed };
    }

    // Downloads `items`, automatically retrying whatever is left over after
    // a pass still has failures — up to MAX_DOWNLOAD_ATTEMPTS attempts total
    // for any single item (1 initial pass + up to 2 retries). Only the
    // still-failing items are re-attempted each time, not the whole batch.
    async function runBatchDownload(items) {
        if (!items.length) return;
        const concurrency = getConcurrency();
        const total = items.length;
        let successCount = 0;
        let pending = items;
        let attempt = 1;

        while (pending.length && attempt <= MAX_DOWNLOAD_ATTEMPTS) {
            if (attempt > 1) {
                await sleep(RETRY_DELAY_MS);
            }
            const statusPrefix = attempt === 1 ? "Đang tải…" : "Đang tải lại (lần " + attempt + ")…";
            const result = await runDownloadPass(pending, concurrency, statusPrefix);
            successCount += result.successCount;
            pending = result.failed;
            attempt++;
        }

        const failCount = pending.length;
        const attemptsUsed = attempt - 1;

        // There is no OS-level "download complete" notification available
        // for videos saved through the chosen-folder flow (see the "Save to
        // folder" comment above), so this centered toast is what actually
        // tells the user the batch is done (see showCenterToast for why it
        // has to live outside the panel).
        if (failCount === 0) {
            showCenterToast("✓ Đã tải xong " + successCount + " video", "ok");
        } else if (successCount === 0) {
            showCenterToast(
                "Tải thất bại " + failCount + "/" + total + " video" + (attemptsUsed > 1 ? " (đã thử lại " + (attemptsUsed - 1) + " lần)" : ""),
                "error",
                6000
            );
        } else {
            showCenterToast(
                "Đã tải xong " + successCount + "/" + total + " video (" + failCount + " lỗi" + (attemptsUsed > 1 ? ", đã thử lại " + (attemptsUsed - 1) + " lần" : "") + ")",
                "warn",
                6000
            );
        }
    }

    function openPanel() {
        ensureFab();
        const panel = ensurePanel();
        renderPanelList();
        panel.style.display = "flex";
        panelOpen = true;
        positionPanelNearFab();
        // Re-check permission on the chosen folder every time the panel is
        // opened (not just once at page load) — Chrome can require the user
        // to re-confirm it after a browser restart, and this is what surfaces
        // that "⚠ needs permission again" state without a page reload.
        refreshSavePathUI();
        renderAdvancedFolderSection();
    }

    function closePanel() {
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.style.display = "none";
        panelOpen = false;
        closeShortcutHelp();
    }

    // Only the FAB's click handler calls this, so it is always an explicit
    // user choice — which is exactly what (re)sets the sticky display mode.
    function togglePanel() {
        if (panelOpen) {
            setPanelExpandedMode(false);
            closePanel();
        } else {
            setPanelExpandedMode(true);
            openPanel();
        }
    }

    // Deliberately NO "click outside" / Escape auto-close: the list stays in
    // whichever mode the user last chose (FAB click or the panel's ×), no
    // matter what else they do on the page.

    /* ---------------- init ---------------- */

    loadPanelExpandedMode();
    loadFoldersCollapsed();
    loadAdvancedFolderSetting();
    loadPlayerAlwaysOnTopSetting();
    loadSubfolderContextMenuSetting();
    loadAutoPasteClipboardSetting();
    restoreSelectionAndRename();
    updateFab();
    window.addEventListener("pointerdown", onSearchPointerPress, true);
    window.addEventListener("click", onSearchBoxClick, true);
    window.addEventListener("focusin", onSearchBoxFocusIn, true);
    loadRootDirHandle();
    syncCheckboxVisibility();
    scanAll();
    setTimeout(scanAll, 800);
    setTimeout(scanAll, 2000);
    initObserver();
    window.addEventListener("contextmenu", onCardContextMenu, true);

    // TikTok opens/closes its video viewer with history.pushState / back, which
    // is a same-document navigation (no page load).  popstate/hashchange and the
    // Navigation API's currententrychange report it right away; the poll below
    // stays as a fallback.
    window.addEventListener("popstate", syncCheckboxVisibility);
    window.addEventListener("hashchange", syncCheckboxVisibility);
    try {
        if (window.navigation && typeof window.navigation.addEventListener === "function") {
            window.navigation.addEventListener("currententrychange", syncCheckboxVisibility);
        }
    } catch {}

    let lastHref = location.href;
    // Last chance to save what the ticks / removals above did not already save (picked boxes, folder numbers,
    // the rename text) when the page is reloaded or closed.
    window.addEventListener("pagehide", persistAll);
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") persistAll();
    });
    setInterval(() => {
        syncCheckboxVisibility();
        persistAll();
        if (location.href !== lastHref) {
            lastHref = location.href;
            setTimeout(scanAll, 500);
            setTimeout(scanAll, 1500);
        }
    }, 1000);
    };

    try {
        chrome.storage.local.get('tik_license_flag', (result) => {
            if (result && result.tik_license_flag && result.tik_license_flag.licensed === true) boot();
        });
    } catch {}
})();
/* ===== [/Download] Multi-select checkbox + management panel ===== */
