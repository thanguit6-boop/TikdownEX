/* "Chia đoạn" popup window (phase 1).
 * Opened by background.js next to the player window.  The page is a function of its URL:
 *   key    "<tabId>:<mode>" of the player it belongs to
 *   count  number of segments (2-20)       cols  columns (1-4)
 *   src    https URL of the video
 *   a      "x,y,w,h,al,at,aw,ah": the player window (x / w = its visible edges, frame left out) and the work area of its screen
 * It loads the video itself in a hidden <video> (never played), seeks it to the start of every segment one after the
 * other and draws each frame into a small canvas of this same document - nothing has to leave a cross-origin
 * canvas.  Once the picture size is known it asks background.js to size (and place) the window to fit its content.
 * A click on a cell asks the player (background.js -> loader -> hook) to jump to the start of that segment.
 * The cells always fill the window: they grow / shrink with it as far as its width and its height allow and keep the
 * shape of the video.  A window the user resized snaps, once he lets go, to the exact size of the biggest cells that
 * fit what he dragged it to (no room left over beside or below them); that cell size is kept for the next videos of
 * this window.  It stays docked: its place and its size follow the player (see followCellWidth() / scaledUserCell()).
 * The window is docked against the player with no gap: the hook sends the player's place again whenever it moves or is
 * resized and the window follows, and a window the user drags away is put back once it stays still.
 * Highlighting the playing segment comes in phase 2. */
(function () {
  'use strict';

  const COUNT_MIN = 2;
  const COUNT_MAX = 20;
  const COLS_MIN = 1;
  const COLS_MAX = 4;
  const GAP = 6;
  const PAD = 8;
  const CELL_MIN = 56;
  const CELL_MAX = 140;
  const TARGET_W = 330;
  const SCROLLBAR = 12;
  const THUMB_WIDTH = 360;
  const ASPECT_MIN = 0.4;
  const ASPECT_MAX = 2.5;
  const ASPECT_DEFAULT = 0.5625;
  const END_GAP = 0.001;
  const FIT_FALLBACK_MS = 2500;
  const FRAME_SIDE_MAX = 12;
  const DOCK_POLL_MS = 250;
  const DOCK_SETTLE_MS = 600;
  const RESIZE_SETTLE_MS = 350;
  const RESIZE_TOL = 1;
  const ANCHOR_KEYS = ['x', 'y', 'w', 'h', 'al', 'at', 'aw', 'ah'];
  const SIZED_KEY = 'segUserSized';
  const SIZED_REF_KEY = 'segUserSizedRef';
  const FOLLOW_W_RATIO = 0.4;
  const FOLLOW_W_MIN = 240;

  function clampInt(value, min, max, fallback) {
    const n = Math.round(Number(value));
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  }

  function clampAspect(value) {
    return Number.isFinite(value) && value > 0 ? Math.max(ASPECT_MIN, Math.min(ASPECT_MAX, value)) : ASPECT_DEFAULT;
  }

  // Sizes of the cells and of the content.  The cells shrink (down to CELL_MIN) so that every row fits in
  // maxInnerH; below that the content scrolls and innerW grows by the scrollbar.
  function computeLayout(count, cols, aspect, maxInnerH) {
    const rows = Math.ceil(count / cols);
    const widthFor = (w) => cols * w + (cols - 1) * GAP + 2 * PAD;
    const heightFor = (w) => rows * Math.round(w / aspect) + (rows - 1) * GAP + 2 * PAD;
    const preferred = Math.max(CELL_MIN, Math.min(CELL_MAX, Math.floor((TARGET_W - 2 * PAD - (cols - 1) * GAP) / cols)));
    let cellW = preferred;
    if (heightFor(cellW) > maxInnerH) {
      const fit = Math.floor(((maxInnerH - 2 * PAD - (rows - 1) * GAP) / rows) * aspect);
      cellW = Math.max(CELL_MIN, Math.min(preferred, fit));
    }
    const needH = heightFor(cellW);
    const scroll = needH > maxInnerH;
    return {
      rows,
      cellW,
      cellH: Math.round(cellW / aspect),
      innerW: widthFor(cellW) + (scroll ? SCROLLBAR : 0),
      innerH: Math.min(maxInnerH, needH),
      scroll,
    };
  }

  // Width of the cells that fill a viewport of viewW x viewH: the biggest cell that fits both ways, so the frames grow
  // and shrink with the window and never change shape (the height of a cell always follows from its width and the
  // aspect).  Below CELL_MIN the cells stop shrinking: a window too short for them scrolls (the scrollbar takes
  // SCROLLBAR of the width).  1px of height is left over so that rounding can not make the content taller than the window.
  function fitCellWidth(count, cols, aspect, viewW, viewH) {
    const rows = Math.ceil(count / cols);
    const widthFor = (w) => Math.floor((w - 2 * PAD - (cols - 1) * GAP) / cols);
    const byW = widthFor(viewW);
    const byH = Math.floor(((viewH - 1 - 2 * PAD - (rows - 1) * GAP) / rows) * aspect);
    let cellW = Math.min(byW, byH);
    if (cellW < CELL_MIN && byW >= CELL_MIN) cellW = Math.min(CELL_MIN, widthFor(viewW - SCROLLBAR));
    return Math.max(1, cellW);
  }

  // The cell width that the width of a viewport allows (byW) and the one that its height allows (byH), each on its own.
  function cellLimits(count, cols, aspect, viewW, viewH) {
    const rows = Math.ceil(count / cols);
    return {
      byW: Math.floor((viewW - 2 * PAD - (cols - 1) * GAP) / cols),
      byH: Math.floor(((viewH - 1 - 2 * PAD - (rows - 1) * GAP) / rows) * aspect),
    };
  }

  // The cell width a window the user resized from `before` to `after` (viewport sizes { w, h }) is meant to get.  When
  // only one side was dragged (the cell width that side allows changed, the other one did not) that side decides and the
  // other follows, so the window grows / shrinks in both directions with the shape of its cells.  When both sides were
  // dragged the smaller cell width decides: the window never ends up bigger than the size he dragged it to.
  function resizedCellWidth(count, cols, aspect, before, after) {
    const was = cellLimits(count, cols, aspect, before.w, before.h);
    const now = cellLimits(count, cols, aspect, after.w, after.h);
    const movedW = Math.abs(now.byW - was.byW) > RESIZE_TOL;
    const movedH = Math.abs(now.byH - was.byH) > RESIZE_TOL;
    let cellW = Math.min(now.byW, now.byH);
    if (movedW && !movedH) cellW = now.byW;
    else if (movedH && !movedW) cellW = now.byH;
    return Math.max(1, cellW);
  }

  // Sizes of the cells and of the content for a window the user sized: cells of width wantW, as far as the room of
  // maxInnerW x maxInnerH allows (and never below CELL_MIN: the content scrolls then).  The content is exactly as big as
  // its cells need, so no room is left beside or below them, and fitCellWidth() of that size gives the same cell width.
  function computeUserLayout(count, cols, aspect, wantW, maxInnerW, maxInnerH) {
    const rows = Math.ceil(count / cols);
    const widthFor = (w) => cols * w + (cols - 1) * GAP + 2 * PAD;
    const heightFor = (w) => Math.ceil((rows * w) / aspect - 1e-9) + (rows - 1) * GAP + 2 * PAD + 2;
    const byW = Math.floor((maxInnerW - 2 * PAD - (cols - 1) * GAP) / cols);
    const byH = Math.floor(((maxInnerH - 2 - 2 * PAD - (rows - 1) * GAP) / rows) * aspect);
    const cellW = Math.max(CELL_MIN, Math.min(Math.round(wantW), byW, byH));
    const needH = heightFor(cellW);
    const scroll = needH > maxInnerH;
    return {
      rows,
      cellW,
      cellH: Math.round(cellW / aspect),
      innerW: widthFor(cellW) + (scroll ? SCROLLBAR : 0),
      innerH: Math.min(maxInnerH, needH),
      scroll,
    };
  }

  // How big a player is: its longer side (a 9:16 video is tall, a 16:9 one wide), 0 when the player is not known.
  function playerSize(a) {
    return a && a.w > 0 && a.h > 0 ? Math.max(a.w, a.h) : 0;
  }

  // Width the window aims for beside a player of size `size` (see playerSize()): the same share of it as TARGET_W is of the
  // default player (about 820px), so a bigger / smaller player gets a proportionally wider / narrower window.
  function followTargetWidth(size) {
    const s = Number.isFinite(size) && size > 0 ? size : TARGET_W / FOLLOW_W_RATIO;
    return Math.max(FOLLOW_W_MIN, Math.round(s * FOLLOW_W_RATIO));
  }

  // Cell width the window starts from when the user never sized it (computeUserLayout() lowers it to what the height of
  // the player and the work area allow).  There is no CELL_MAX here: a big player gets big cells.
  function followCellWidth(cols, size) {
    return Math.max(CELL_MIN, Math.floor((followTargetWidth(size) - 2 * PAD - (cols - 1) * GAP) / cols));
  }

  // The cell width the user gave the window while the player was refSize big, for a player that is `size` big now: the
  // cells grow and shrink with the player.  Unknown sizes leave the width as the user gave it.
  function scaledUserCell(userCell, refSize, size) {
    if (!(userCell > 0)) return 0;
    if (!(refSize > 0) || !(size > 0)) return userCell;
    return Math.max(CELL_MIN, Math.round((userCell * size) / refSize));
  }

  function parseAnchor(text) {
    if (typeof text !== 'string') return null;
    const parts = text.split(',').map(Number);
    if (parts.length !== 8 || !parts.every(Number.isFinite)) return null;
    const [x, y, w, h, al, at, aw, ah] = parts;
    return w > 0 && h > 0 ? { x, y, w, h, al, at, aw, ah } : null;
  }

  // Width of one side of a window frame, from outerWidth - innerWidth.  On Windows that includes the invisible resize
  // border of the frame; anything that does not look like a frame (browser zoom, ...) counts as none.
  function frameSide(frameW) {
    return Number.isFinite(frameW) && frameW >= 0 && frameW <= 2 * FRAME_SIDE_MAX ? Math.floor(frameW / 2) : 0;
  }

  // Flush against the right edge of the player (anchor.x / anchor.w are its visible edges): the frame of this window
  // (frameW = its outerWidth - innerWidth) goes under the player's, so the two pictures touch with no gap.  On the left
  // of the player when there is no room on the right; the top edges line up unless the window would leave the work area.
  function placeBeside(anchor, outerW, outerH, frameW) {
    const side = frameSide(frameW);
    const hasArea = anchor.aw > 0 && anchor.ah > 0;
    const areaLeft = hasArea ? anchor.al : -Infinity;
    const areaRight = hasArea ? anchor.al + anchor.aw : Infinity;
    const areaBottom = hasArea ? anchor.at + anchor.ah : Infinity;
    let left = anchor.x + anchor.w - side;
    if (left + outerW - side > areaRight) {
      const onLeft = anchor.x - outerW + side;
      left = onLeft + side >= areaLeft ? onLeft : Math.max(hasArea ? anchor.al : 0, areaRight - outerW);
    }
    let top = anchor.y;
    if (top + outerH > areaBottom) top = Math.max(hasArea ? anchor.at : 0, areaBottom - outerH);
    return { left: Math.round(left), top: Math.round(top) };
  }

  // The frame of segment `index`.  The segments are spread evenly over the video from its very first frame (the first
  // segment) to its very last frame (the last segment): `count` frames, `count - 1` equal steps.  The last frame is taken
  // END_GAP before the end: at the end itself the video is over (and play() would start it over).  The player does the
  // same sum when a segment is clicked (segmentWindowTime() in tiktok-hook.js): keep the two the same.
  function startTime(duration, count, index) {
    if (index <= 0) return 0;
    const last = Math.max(0, duration - END_GAP);
    return index >= count - 1 ? last : Math.min(last, (duration * index) / (count - 1) + 0.001);
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return minutes + ':' + String(secs).padStart(2, '0');
  }

  if (typeof document === 'undefined') {
    module.exports = {
      clampInt,
      clampAspect,
      computeLayout,
      fitCellWidth,
      cellLimits,
      resizedCellWidth,
      computeUserLayout,
      playerSize,
      followTargetWidth,
      followCellWidth,
      scaledUserCell,
      parseAnchor,
      frameSide,
      placeBeside,
      startTime,
      formatTime,
    };
    return;
  }

  /* ---------------- the page ---------------- */

  const params = new URLSearchParams(location.search);
  const key = params.get('key') || '';
  const count = clampInt(params.get('count'), COUNT_MIN, COUNT_MAX, 15);
  const cols = clampInt(params.get('cols'), COLS_MIN, COLS_MAX, 3);
  const rawSrc = params.get('src') || '';
  const src = /^https:\/\//i.test(rawSrc) ? rawSrc : '';
  let anchor = parseAnchor(params.get('a'));

  document.title = 'Chia đoạn · ' + count;

  const grid = document.getElementById('grid');
  const cells = [];
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    const canvas = document.createElement('canvas');
    const no = document.createElement('span');
    const at = document.createElement('span');
    el.className = 'cell';
    canvas.className = 'img';
    no.className = 'no';
    no.textContent = String(i + 1);
    at.className = 'at';
    at.textContent = '–';
    el.title = 'Đoạn ' + (i + 1);
    el.addEventListener('click', () => seekTo(i));
    el.append(canvas, no, at);
    grid.appendChild(el);
    cells.push({ el, canvas, at, done: false });
  }

  let aspect = ASPECT_DEFAULT;
  let layout = null;
  let fitted = false;
  let userCell = 0; // cell width the user gave the window by resizing it (0 = he never did): it is fitted around cells of that width
  let userRefSize = 0; // size of the player at that moment: the cells keep that proportion to the player when it is resized
  let fitWait = 0; // a resize before this time is the window getting to the size this page asked for
  let lastW = window.innerWidth; // viewport size at the previous resize event
  let lastH = window.innerHeight;
  let dragFrom = null; // viewport size { w, h } before the user started resizing (null = he is not resizing)
  let settleTimer = 0; // set while the user is still resizing: the window is fitted once he stops
  let dockedAt = ''; // where the window is once it was put against the player ('' = not read yet)
  let dockLast = ''; // where it was seen the last time it was not there
  let dockWait = 0; // the place is not read before this time (the window needs a moment to get there)

  // Room for the content: as tall as the player (when known) minus the window frame.
  function maxInnerHeight() {
    const frameH = Math.max(0, window.outerHeight - window.innerHeight);
    const outer = anchor ? anchor.h : Math.round((screen.availHeight || 800) * 0.9);
    return Math.max(200, outer - frameH);
  }

  // Room for a window the user sized: the work area of the player's screen minus the window frame.
  function maxUserInner() {
    const frameW = Math.max(0, window.outerWidth - window.innerWidth);
    const frameH = Math.max(0, window.outerHeight - window.innerHeight);
    const areaW = anchor && anchor.aw > 0 ? anchor.aw : screen.availWidth || 1200;
    const areaH = anchor && anchor.ah > 0 ? anchor.ah : screen.availHeight || 800;
    return { w: Math.max(200, areaW - frameW), h: Math.max(200, areaH - frameH) };
  }

  // The cells fill the window: the biggest size that fits its width and its height, the shape of a frame untouched.
  function fillWindow() {
    grid.style.setProperty('--ar', aspect.toFixed(4));
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (!(w > 0 && h > 0)) return;
    grid.style.gridTemplateColumns = 'repeat(' + cols + ',' + fitCellWidth(count, cols, aspect, w, h) + 'px)';
  }

  // `layout` is the size the window asks for when it fits its content; the cells always follow the window itself.
  function applyLayout() {
    const room = maxUserInner();
    const size = playerSize(anchor);
    if (userCell > 0) {
      layout = computeUserLayout(count, cols, aspect, scaledUserCell(userCell, userRefSize, size), room.w, room.h);
    } else {
      // Never sized by the user: as tall as the player, the cells as big as that (and the work area) allows.
      const tall = Math.min(room.h, maxInnerHeight());
      layout = computeUserLayout(count, cols, aspect, followCellWidth(cols, size || tall), room.w, tall);
    }
    fillWindow();
  }

  // The window was resized: the cells follow at once.  A size that is not the one this page asked for is the user's own
  // (a resize shortly after a fit, or one that lands on the fitted size, is the window getting there): once he stops
  // (RESIZE_SETTLE_MS without another resize) the window snaps to the biggest cells that fit what he dragged it to.
  window.addEventListener('resize', () => {
    const atFit =
      !layout || (Math.abs(window.innerWidth - layout.innerW) <= 3 && Math.abs(window.innerHeight - layout.innerH) <= 3);
    if (dragFrom || (fitted && Date.now() >= fitWait && !atFit)) {
      if (!dragFrom) dragFrom = { w: lastW, h: lastH };
      clearTimeout(settleTimer);
      settleTimer = setTimeout(settleResize, RESIZE_SETTLE_MS);
    }
    lastW = window.innerWidth;
    lastH = window.innerHeight;
    fillWindow();
  });
  // The cell width the user gave an earlier video of this window: kept, also for the next video.
  try {
    const saved = Number(sessionStorage.getItem(SIZED_KEY));
    if (Number.isFinite(saved) && saved >= CELL_MIN) userCell = Math.round(saved);
  } catch {}
  try {
    const savedRef = Number(sessionStorage.getItem(SIZED_REF_KEY));
    if (Number.isFinite(savedRef) && savedRef > 0) userRefSize = Math.round(savedRef);
  } catch {}
  if (userCell > 0 && !(userRefSize > 0)) userRefSize = playerSize(anchor); // sized before the player size was kept

  // The window fills the screen (maximized by the user): its size can not be set and it has no room left to give.
  function looksMaximized() {
    return window.outerWidth >= screen.availWidth - 2 && window.outerHeight >= screen.availHeight - 2;
  }

  // The user let go of the window edge: the cell width he dragged it to decides (see resizedCellWidth()), the window is
  // fitted around cells of that width and keeps that cell width for the next videos.
  function settleResize() {
    settleTimer = 0;
    const from = dragFrom;
    dragFrom = null;
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (!from || !(w > 0 && h > 0) || looksMaximized()) return;
    userCell = Math.max(CELL_MIN, resizedCellWidth(count, cols, aspect, from, { w, h }));
    try {
      sessionStorage.setItem(SIZED_KEY, String(userCell));
    } catch {}
    userRefSize = playerSize(anchor);
    try {
      sessionStorage.setItem(SIZED_REF_KEY, String(userRefSize));
    } catch {}
    applyLayout();
    requestFit();
  }

  function requestFit() {
    if (settleTimer || looksMaximized()) return; // the user is still resizing (the fit follows when he stops) / maximized it
    if (!layout) applyLayout();
    const frameW = Math.max(0, window.outerWidth - window.innerWidth);
    const frameH = Math.max(0, window.outerHeight - window.innerHeight);
    // The window gets the size that wraps its cells exactly (cells of the width the user gave it, if he resized it).
    const outerW = layout.innerW + frameW;
    const outerH = layout.innerH + frameH;
    const message = { type: '__DOWNLOAD_SEGMENT_FIT__', width: outerW, height: outerH };
    fitWait = Date.now() + DOCK_SETTLE_MS;
    // Always docked against the player (every fit puts the window back beside it).
    if (anchor) {
      const spot = placeBeside(anchor, outerW, outerH, frameW);
      message.left = spot.left;
      message.top = spot.top;
      dockedAt = '';
      dockLast = '';
      dockWait = Date.now() + DOCK_SETTLE_MS;
    }
    fitted = true;
    try {
      chrome.runtime.sendMessage(message, () => void chrome.runtime.lastError);
    } catch {}
  }

  /* ---- click on a cell: the player jumps to the start of that segment ---- */

  // background.js checks that this window may ask for it and hands it on to the player's tab (loader -> hook).
  function seekTo(index) {
    try {
      chrome.runtime.sendMessage({ type: '__DOWNLOAD_SEGMENT_SEEK__', key, index, count }, () => void chrome.runtime.lastError);
    } catch {}
  }

  /* ---- docked: the window follows the player and stays against it ---- */

  function sameAnchor(a, b) {
    return ANCHOR_KEYS.every((name) => a[name] === b[name]);
  }

  // The player moved or was resized (the hook tells background.js, which passes it on): follow it.
  function onAnchor(next) {
    if (!next || (anchor && sameAnchor(anchor, next))) return;
    // The size of the player (or the work area it is in) changed: the cells and the window follow it, not only its place.
    const sizeChanged =
      !anchor || anchor.w !== next.w || anchor.h !== next.h || anchor.aw !== next.aw || anchor.ah !== next.ah;
    anchor = next;
    if (sizeChanged) applyLayout();
    requestFit();
  }

  try {
    chrome.runtime.onMessage.addListener((message, sender) => {
      if (!message || message.type !== '__DOWNLOAD_SEGMENT_ANCHOR__' || message.key !== key) return false;
      if (!sender || sender.id !== chrome.runtime.id || sender.tab || !message.anchor) return false;
      onAnchor(parseAnchor(ANCHOR_KEYS.map((name) => message.anchor[name]).join(',')));
      return false;
    });
  } catch {}

  // A window the user dragged away from the player: while it is still being moved leave it alone, once it stays where
  // it was dropped put it back against the player.
  setInterval(() => {
    if (!anchor || !fitted || document.hidden || settleTimer || Date.now() < dockWait) return;
    const here = Math.round(window.screenX) + ',' + Math.round(window.screenY);
    if (!dockedAt) {
      dockedAt = here;
      return;
    }
    if (here === dockedAt) {
      dockLast = '';
      return;
    }
    if (here === dockLast) requestFit();
    else dockLast = here;
  }, DOCK_POLL_MS);

  /* ---- thumbnails: one hidden <video>, seeked to the start of every segment ---- */

  // Resolves true when `name` fires on `target`, false on an error event or after `timeout` ms.
  function waitEvent(target, name, timeout) {
    return new Promise((resolve) => {
      let finished = false;
      let timer = 0;
      const finish = (value) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        target.removeEventListener(name, onEvent);
        target.removeEventListener('error', onError);
        resolve(value);
      };
      const onEvent = () => finish(true);
      const onError = () => finish(false);
      target.addEventListener(name, onEvent);
      target.addEventListener('error', onError);
      timer = setTimeout(() => finish(false), timeout);
    });
  }

  // Right after "seeked" drawImage() can still get the previous frame: wait for the frame that belongs to `time`.
  function framePresented(video, time, tolerance, timeout) {
    return new Promise((resolve) => {
      if (typeof video.requestVideoFrameCallback !== 'function') {
        setTimeout(resolve, 150, true);
        return;
      }
      let finished = false;
      let timer = 0;
      const finish = (value) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        resolve(value);
      };
      timer = setTimeout(() => finish(false), timeout);
      const onFrame = (now, meta) => {
        if (finished) return;
        if (Math.abs(Number(meta && meta.mediaTime) - time) <= tolerance) {
          finish(true);
          return;
        }
        try {
          video.requestVideoFrameCallback(onFrame);
        } catch {
          finish(false);
        }
      };
      try {
        video.requestVideoFrameCallback(onFrame);
      } catch {
        finish(false);
      }
    });
  }

  async function seekHelper(helper, time, spacing) {
    if (helper.error) return false;
    const seeked = waitEvent(helper, 'seeked', 9000);
    const presented = framePresented(helper, time, Math.max(0.1, Math.min(0.25, spacing / 2)), 1500);
    try {
      helper.currentTime = time;
    } catch {
      return false;
    }
    if (!(await seeked)) return false;
    if (helper.readyState < 2 && !(await waitEvent(helper, 'loadeddata', 3000)) && helper.readyState < 2) return false;
    await presented;
    return helper.videoWidth > 0;
  }

  function drawFrame(index, source) {
    const cell = cells[index];
    const w = source.videoWidth;
    const h = source.videoHeight;
    if (!cell || !(w > 0 && h > 0)) return false;
    const th = Math.max(1, Math.round((THUMB_WIDTH * h) / w));
    try {
      if (cell.canvas.width !== THUMB_WIDTH || cell.canvas.height !== th) {
        cell.canvas.width = THUMB_WIDTH;
        cell.canvas.height = th;
      }
      cell.canvas.getContext('2d').drawImage(source, 0, 0, THUMB_WIDTH, th);
    } catch {
      return false;
    }
    cell.done = true;
    cell.el.classList.add('has-frame');
    return true;
  }

  async function makeThumbnails() {
    if (!src) return;
    const helper = document.createElement('video');
    helper.muted = true;
    helper.preload = 'auto';
    helper.playsInline = true;
    helper.controls = false;
    helper.style.cssText =
      'position:fixed;left:-10000px;top:-10000px;width:2px;height:2px;opacity:0;pointer-events:none';
    helper.src = src;
    document.body.appendChild(helper);

    if (helper.readyState < 1 && !(await waitEvent(helper, 'loadedmetadata', 12000))) return;
    const duration = Number.isFinite(helper.duration) && helper.duration > 0 ? helper.duration : 0;
    if (helper.videoWidth > 0 && helper.videoHeight > 0) {
      aspect = clampAspect(helper.videoWidth / helper.videoHeight);
      applyLayout();
      requestFit();
    }
    if (!duration) return;
    cells.forEach((cell, i) => {
      const from = formatTime(startTime(duration, count, i));
      cell.at.textContent = from;
      cell.el.title =
        'Đoạn ' + (i + 1) + ': ' + from + (i < count - 1 ? ' – ' + formatTime(startTime(duration, count, i + 1)) : '');
    });

    let failed = 0;
    for (let i = 0; i < count; i++) {
      if (await seekHelper(helper, startTime(duration, count, i), duration / (count - 1))) drawFrame(i, helper);
      else if (++failed >= 2) break;
    }
    try {
      helper.pause();
      helper.removeAttribute('src');
      helper.load();
      helper.remove();
    } catch {}
  }

  applyLayout();
  // The video's shape is not known yet: if its metadata does not come, fit the window with the default shape.
  setTimeout(() => {
    if (!fitted) requestFit();
  }, FIT_FALLBACK_MS);
  makeThumbnails().catch(() => {});
})();
