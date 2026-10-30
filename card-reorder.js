/* Kéo-thả sắp xếp lại các ô cài đặt trong popup.
 * Nhấn giữ chuột trên một ô, kéo sang bất kỳ cột/hàng nào rồi thả.
 * Thứ tự được nhớ lại ở lần mở popup sau (localStorage). */
(function () {
  'use strict';

  const area = document.getElementById('settingsArea');
  if (!area) return;

  const STORE_KEY = 'tvtCardLayout.v1';
  const DRAG_THRESHOLD = 6;   // px phải di chuyển mới tính là kéo (click thường vẫn bật/tắt công tắc)
  const EDGE = 36;            // vùng sát mép trên/dưới popup sẽ tự cuộn khi đang kéo
  const SCROLL_MAX = 14;
  const FLIP_MS = 160;
  const NO_DRAG = 'input[type="range"],input[type="number"],input[type="text"],textarea,select,button,a';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const groups = Array.from(area.children).filter(el => el.classList.contains('group'));
  if (!groups.length) return;

  const isCard = el => el.classList.contains('item');
  const cardsOf = g => Array.from(g.children).filter(isCard);
  const allCards = () => groups.reduce((acc, g) => acc.concat(cardsOf(g)), []);
  const cardKey = card => {
    const cb = card.querySelector('.switch input[type="checkbox"]');
    return (cb && cb.id) || card.id || '';
  };
  const snapshot = () => groups.map(g => cardsOf(g).map(cardKey));

  /* ---------- Lưu / khôi phục thứ tự ---------- */
  function loadLayout() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (!Array.isArray(saved)) return;
      const byKey = new Map();
      allCards().forEach(c => { const k = cardKey(c); if (k) byKey.set(k, c); });
      const placed = new Set();
      saved.forEach((keys, gi) => {
        if (!groups[gi] || !Array.isArray(keys)) return;
        keys.forEach(k => {
          const c = byKey.get(k);
          if (c && !placed.has(c)) { placed.add(c); groups[gi].appendChild(c); }
        });
      });
    } catch (_) { /* bỏ qua: dùng thứ tự mặc định */ }
  }

  function saveLayout() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(snapshot())); } catch (_) { /* ignore */ }
  }

  /* ---------- Tiện ích hình học ---------- */
  // Vị trí theo layout, bỏ phần dịch do animation đang chạy (tránh nhảy qua lại khi kéo nhanh).
  function layoutRect(el) {
    const r = el.getBoundingClientRect();
    const m = new DOMMatrix(getComputedStyle(el).transform);
    return { top: r.top - m.f, height: r.height };
  }

  // Chạy thay đổi DOM và cho các phần tử còn lại trượt êm từ vị trí cũ sang vị trí mới.
  function flip(els, mutate) {
    const first = els.map(el => el.getBoundingClientRect());
    els.forEach(el => el.getAnimations().forEach(a => { if (a.id === 'tvt-flip') a.cancel(); }));
    mutate();
    if (reduceMotion) return;
    els.forEach((el, i) => {
      const b = el.getBoundingClientRect();
      const dx = first[i].left - b.left;
      const dy = first[i].top - b.top;
      if (!dx && !dy) return;
      const a = el.animate(
        [{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'translate(0,0)' }],
        { duration: FLIP_MS, easing: 'cubic-bezier(.2,.8,.2,1)' }
      );
      a.id = 'tvt-flip';
    });
  }

  function pickGroup(x) {
    let best = groups[0];
    let bestD = Infinity;
    groups.forEach(g => {
      const r = g.getBoundingClientRect();
      const d = x < r.left ? r.left - x : (x > r.right ? x - r.right : 0);
      if (d < bestD) { best = g; bestD = d; }
    });
    return best;
  }

  /* ---------- Trạng thái kéo ---------- */
  let st = null;              // lần kéo hiện tại
  let slot = null;            // ô giữ chỗ: chỗ ô sẽ rơi xuống khi thả
  let swallowClick = false;   // chặn đúng 1 click "ma" ngay sau khi thả (tránh bật/tắt nhầm công tắc)
  let swallowUntil = 0;

  area.addEventListener('pointerdown', onDown);
  document.addEventListener('pointerdown', () => { swallowClick = false; }, true);
  document.addEventListener('click', e => {
    if (swallowClick && performance.now() < swallowUntil) { e.preventDefault(); e.stopPropagation(); }
    swallowClick = false;
  }, true);

  function onDown(e) {
    if (st || e.button !== 0 || e.isPrimary === false || area.disabled) return;
    const card = e.target.closest('.item');
    if (!card || !card.parentElement || !card.parentElement.classList.contains('group')) return;
    if (e.target.closest(NO_DRAG)) return;   // thanh trượt, ô nhập số, nút... giữ nguyên hành vi cũ
    st = { card, id: e.pointerId, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, active: false, raf: 0 };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onCancel);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('blur', onCancel);
  }

  function onMove(e) {
    if (!st || e.pointerId !== st.id) return;
    st.x = e.clientX;
    st.y = e.clientY;
    if (e.pointerType === 'mouse' && (e.buttons & 1) === 0) {   // lỡ mất sự kiện nhả chuột
      if (st.active) finish(true); else teardown();
      return;
    }
    if (!st.active) {
      if (Math.hypot(st.x - st.sx, st.y - st.sy) < DRAG_THRESHOLD) return;
      begin();
    }
    update();
  }

  function onUp(e) {
    if (!st || e.pointerId !== st.id) return;
    if (st.active) finish(true); else teardown();
  }

  function onCancel() {
    if (!st) return;
    if (st.active) finish(false); else teardown();
  }

  function onKey(e) {
    if (e.key === 'Escape' && st && st.active) {
      e.preventDefault();
      e.stopPropagation();
      finish(false);
    }
  }

  function begin() {
    const card = st.card;
    const r = card.getBoundingClientRect();
    st.active = true;
    st.before = JSON.stringify(snapshot());
    st.origParent = card.parentElement;
    st.origNext = card.nextElementSibling;
    slot = document.createElement('div');
    slot.className = 'card-slot';
    slot.style.height = r.height + 'px';
    card.before(slot);
    card.style.left = r.left + 'px';
    card.style.top = r.top + 'px';
    card.style.width = r.width + 'px';
    card.classList.add('is-dragging');
    document.body.classList.add('is-reordering');
    st.raf = requestAnimationFrame(tick);
  }

  function update() {
    const card = st.card;
    card.style.transform = `translate3d(${st.x - st.sx}px,${st.y - st.sy}px,0) scale(1.02)`;

    const g = pickGroup(st.x);
    const kids = Array.from(g.children).filter(k => k === slot || (isCard(k) && k !== card));
    let before = null;
    for (const k of kids) {
      const r = layoutRect(k);
      if (st.y < r.top + r.height / 2) { before = k; break; }
    }
    const i = kids.indexOf(slot);
    if (i >= 0 && (before === slot || before === (kids[i + 1] || null))) return;   // vị trí không đổi

    flip(allCards().filter(c => c !== card), () => g.insertBefore(slot, before));
  }

  // Tự cuộn khi kéo sát mép trên/dưới (popup cao hơn khung nhìn).
  function tick() {
    if (!st || !st.active) return;
    const vh = window.innerHeight;
    let dy = 0;
    if (st.y < EDGE) dy = -Math.ceil((EDGE - st.y) / EDGE * SCROLL_MAX);
    else if (st.y > vh - EDGE) dy = Math.ceil((st.y - (vh - EDGE)) / EDGE * SCROLL_MAX);
    if (dy) {
      const y0 = window.scrollY;
      window.scrollBy(0, dy);
      if (window.scrollY !== y0) update();
    }
    st.raf = requestAnimationFrame(tick);
  }

  function teardown() {
    if (!st) return;
    cancelAnimationFrame(st.raf);
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onCancel);
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('blur', onCancel);
    document.body.classList.remove('is-reordering');
    st = null;
  }

  function finish(commit) {
    const s = st;
    const card = s.card;
    const flying = card.getBoundingClientRect();   // vị trí "đang bay" (đã phóng to) tại lúc thả
    const others = allCards().filter(c => c !== card);
    teardown();

    flip(others, () => {
      card.classList.remove('is-dragging');
      ['left', 'top', 'width', 'transform'].forEach(p => card.style.removeProperty(p));
      if (commit) {
        slot.replaceWith(card);
      } else {
        slot.remove();
        s.origParent.insertBefore(card, s.origNext);
      }
    });
    slot = null;

    if (!reduceMotion) {
      const now = card.getBoundingClientRect();
      const a = card.animate([
        { transformOrigin: '0 0', transform: `translate(${flying.left - now.left}px,${flying.top - now.top}px) scale(${flying.width / now.width},${flying.height / now.height})` },
        { transformOrigin: '0 0', transform: 'translate(0,0) scale(1,1)' }
      ], { duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' });
      a.id = 'tvt-flip';
    }

    swallowClick = true;
    swallowUntil = performance.now() + 400;
    if (commit && JSON.stringify(snapshot()) !== s.before) saveLayout();
  }

  loadLayout();
})();
