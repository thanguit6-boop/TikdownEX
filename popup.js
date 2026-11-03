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
    if (trialLicensed !== active) {
      trialLicensed = active;
      trialRefreshUi();
    }
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

  // ===== [Dùng thử] Nút "Thử miễn phí" (cùng luồng với Multi Phone Manager) =====
  // Máy chưa có bản quyền: [Thử miễn phí] -> gửi email (xác nhận bằng mã 6 số) -> [Đã gửi]
  // -> quản trị viên duyệt -> [Đã nhận key, nhấn để kích hoạt] -> tự kích hoạt.
  // Mọi lời gọi máy chủ nằm ở service worker (assets/license.js, các message TRIAL_*); popup chỉ hiển thị.
  const trialRow = document.getElementById('trialRow');
  const trialButton = document.getElementById('trialButton');
  const trialDialog = document.getElementById('trialDialog');
  const trialEmail = document.getElementById('trialEmail');
  const trialSendCodeButton = document.getElementById('trialSendCode');
  const trialCode = document.getElementById('trialCode');
  const trialPasteButton = document.getElementById('trialPaste');
  const trialPhone = document.getElementById('trialPhone');
  const trialDialogMessage = document.getElementById('trialDialogMessage');
  const trialCancelButton = document.getElementById('trialCancel');
  const trialSubmitButton = document.getElementById('trialSubmit');
  // Popup của Chrome tự đóng ngay khi người dùng bấm sang tab khác (không có cách nào giữ nó mở), nên hộp thoại gửi yêu cầu
  // được mở trong KHUNG BÊN (side panel): nó nằm cạnh trang, chuyển sang tab hộp thư chép mã vẫn còn nguyên. Trang này tự chạy
  // ở chế độ khung bên khi mở bằng popup.html?panel=trial (chỉ còn hộp thoại, xem CSS html.trial-panel trong popup.html).
  const TRIAL_PANEL_PATH = 'popup.html?panel=trial';
  const IS_TRIAL_PANEL = new URLSearchParams(location.search).get('panel') === 'trial';
  if (IS_TRIAL_PANEL) document.documentElement.classList.add('trial-panel');
  const TRIAL_POLL_INTERVAL_MS = 30000;   // đang ở [Đã gửi]: popup còn mở thì cứ chừng này tự hỏi máy chủ (âm thầm)
  const TRIAL_GRANT_POLL_INTERVAL_MS = 60000;   // chưa có bản quyền: popup còn mở thì cứ chừng này hỏi xem admin đã cấp sẵn key (khách mua) chưa
  const TRIAL_DRAFT_KEY = 'tik_trial_draft';
  const TRIAL_BUTTON_TEXT = {
    eligible: 'Thử miễn phí',
    error: 'Thử miễn phí',
    sent: 'Đã gửi',
    received: 'Đã nhận key, nhấn để kích hoạt',
    rejected: 'Không nhận được key dùng thử',
  };
  let trialLicensed = null;   // trạng thái bản quyền ở lần vẽ gần nhất: chỉ hỏi lại máy chủ khi nó đổi
  let trialView = { stage: 'hidden' };
  let trialBusy = false;
  let trialSeq = 0;
  let trialPollTimer = null;
  const trialDialogState = { emailSent: '', expiresAt: 0, left: 0, timer: null };

  function trialValidEmail(email) {
    return email.length > 0 && email.length <= 190 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  }

  function stopTrialPoll() {
    if (trialPollTimer) {
      clearInterval(trialPollTimer);
      trialPollTimer = null;
    }
  }

  function paintTrial(view) {
    trialView = view && typeof view === 'object' && view.stage
      ? view
      : { stage: 'error', enabled: false, message: (view && view.message) || 'Không kiểm tra được lúc này. Vui lòng thử lại sau.' };
    stopTrialPoll();
    const stage = trialView.stage;
    const text = trialView.label || TRIAL_BUTTON_TEXT[stage];   // label: nút [Nhận được key N ngày...] của key admin cấp sẵn
    // Chỉ hiện nút khi bấm được (Thử miễn phí / Đã gửi để kiểm tra / Nhận key để kích hoạt). Máy đang có bản quyền,
    // đã dùng thử, không đủ điều kiện, bị từ chối hoặc không kiểm tra được thì ẩn hẳn, không để nút mờ (lý do ghi ở console popup).
    const show = !settingsUnlocked && text !== undefined && trialView.enabled === true;
    if (!show && !settingsUnlocked && stage !== 'hidden' && trialView.message) console.info('[trial]', stage + ':', trialView.message);
    if (trialRow) trialRow.hidden = !show;
    if (!show || !trialButton) return;
    const enabled = trialView.enabled === true;
    trialButton.textContent = text;
    trialButton.title = trialView.message || '';
    trialButton.disabled = trialBusy || !enabled;
    trialButton.classList.toggle('on', enabled);
    if (stage === 'sent' && enabled) {
      trialPollTimer = setInterval(() => { trialCheckStatus(true); }, TRIAL_POLL_INTERVAL_MS);
    }
  }

  // Hỏi máy chủ máy này có được dùng thử không (hoặc yêu cầu đã gửi đang ở bước nào).
  async function trialRefreshUi() {
    const seq = ++trialSeq;
    paintTrial({ stage: 'hidden' });
    if (settingsUnlocked) return;
    const view = await sendLicenseMessage('TRIAL_REFRESH');
    if (seq !== trialSeq) return;
    paintTrial(view);
    if (trialView.stage === 'eligible') resumeTrialDraft();
    else if (IS_TRIAL_PANEL && !settingsUnlocked) closeTrialPanel();   // đã có bản quyền / đã gửi yêu cầu...: khung bên hết việc
  }

  async function trialCheckStatus(auto) {
    if (trialBusy) return;
    trialBusy = true;
    if (!auto && trialButton) {
      trialButton.disabled = true;
      trialButton.title = 'Đang kiểm tra kết quả...';
    }
    const view = await sendLicenseMessage('TRIAL_STATUS');
    trialBusy = false;
    paintTrial(view);
    if (view && view.activated) refreshLicenseStatus();
    if (!auto && view && view.notice) showLicenseNotice(view.notice, view.error ? 'error' : '');
  }

  async function trialActivateReceived() {
    if (trialBusy) return;
    trialBusy = true;
    if (trialButton) {
      trialButton.disabled = true;
      trialButton.title = 'Đang kích hoạt key dùng thử...';
    }
    setLicenseBusy(true);
    const result = await sendLicenseMessage('TRIAL_ACTIVATE');
    setLicenseBusy(false);
    trialBusy = false;
    paintLicenseStatus(result.status || null, result.ok ? '' : (result.message || 'Không thể kích hoạt key.'));
    if (result.ok) {
      showSavedToast();
      let text = result.granted ? 'Đã kích hoạt key thành công!' : 'Đã kích hoạt key dùng thử thành công!';
      const expiry = formatExpiry(result.status);
      const days = Number(result.trial_days);
      if (expiry) text += ' ' + expiry + '.';
      else if (Number.isFinite(days) && days > 0) text += ' Thời gian dùng thử: ' + days + ' ngày (tính từ lúc kích hoạt).';
      showLicenseNotice(text);
    } else {
      showLicenseNotice(result.message || 'Kích hoạt thất bại.', 'error');
    }
    paintTrial(trialView);   // còn key trên máy -> vẫn cho bấm kích hoạt lại; đã kích hoạt xong -> paintLicenseStatus đã ẩn nút
  }

  // Key MUA do admin cấp sẵn cho máy này (trang quản lý key -> Sửa -> Machine ID + Số ngày kích hoạt):
  // máy chủ có key chờ -> nút tự đổi thành [Nhận được key N ngày, nhấn để kích hoạt]; key bị thu hồi -> về trạng thái bình thường.
  async function trialGrantPoll() {
    if (settingsUnlocked || trialBusy) return;
    const seq = trialSeq;
    const view = await sendLicenseMessage('TRIAL_CLAIM');
    if (settingsUnlocked || trialBusy || seq !== trialSeq) return;
    if (view && view.stage) {
      if (!trialView.grant) paintTrial(view);
    } else if (view && view.revoked && trialView.grant) {
      trialRefreshUi();
    }
  }
  setInterval(trialGrantPoll, TRIAL_GRANT_POLL_INTERVAL_MS);

  // Mở hộp thoại trong khung bên. false = không mở được (Chrome cũ chưa có side panel, bị chặn...) -> dùng hộp thoại ngay trong popup như cũ.
  async function openTrialPanel() {
    if (IS_TRIAL_PANEL || !chrome.sidePanel || typeof chrome.sidePanel.open !== 'function') return false;
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const windowId = tabs && tabs[0] ? tabs[0].windowId : undefined;
      if (windowId === undefined) return false;
      await chrome.sidePanel.setOptions({ path: TRIAL_PANEL_PATH, enabled: true });
      await chrome.sidePanel.open({ windowId });
      window.close();   // khung bên ở lại, popup thì đóng
      return true;
    } catch {
      return false;
    }
  }

  // Đóng khung bên (khi đã gửi xong / bấm Hủy / không còn việc gì để làm). Tắt hẳn để mục này không nằm lại trong danh sách khung bên của Chrome.
  async function closeTrialPanel() {
    if (!IS_TRIAL_PANEL || !chrome.sidePanel) return;
    try {
      if (typeof chrome.sidePanel.close === 'function') {
        const win = await chrome.windows.getCurrent();
        await chrome.sidePanel.close({ windowId: win.id });
      }
    } catch { /* tắt bằng setOptions bên dưới */ }
    try { await chrome.sidePanel.setOptions({ enabled: false }); } catch { /* ignore */ }
  }

  trialButton?.addEventListener('click', async () => {
    if (trialView.stage === 'eligible') {
      if (!(await openTrialPanel())) openTrialDialog(null);
    } else if (trialView.stage === 'sent') trialCheckStatus(false);
    else if (trialView.stage === 'received') trialActivateReceived();
  });

  // ----- Hộp thoại gửi yêu cầu (email + mã 6 số + SĐT) -----
  function setTrialDialogMessage(text, ok) {
    if (!trialDialogMessage) return;
    trialDialogMessage.textContent = text || '';
    trialDialogMessage.className = 'trial-message' + (ok ? ' ok' : '');
  }

  function stopTrialCooldown() {
    if (trialDialogState.timer) {
      clearTimeout(trialDialogState.timer);
      trialDialogState.timer = null;
    }
  }

  function tickTrialCooldown() {
    trialDialogState.timer = null;
    if (trialDialogState.left > 0) {
      trialSendCodeButton.textContent = 'Gửi lại (' + trialDialogState.left + 's)';
      trialSendCodeButton.disabled = true;
      trialDialogState.left -= 1;
      trialDialogState.timer = setTimeout(tickTrialCooldown, 1000);
    } else {
      trialSendCodeButton.textContent = trialDialogState.emailSent ? 'Gửi lại mã' : 'Gửi mã';
      trialSendCodeButton.disabled = false;
    }
  }

  function startTrialCooldown(seconds) {
    stopTrialCooldown();
    const n = Number(seconds);
    trialDialogState.left = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 60;
    tickTrialCooldown();
  }

  // Popup của Chrome tự đóng khi người dùng bấm ra ngoài (vd. sang hộp thư để chép mã) nên bản nháp được lưu lại:
  // mở lại popup trong lúc mã còn hiệu lực là hộp thoại tự mở sẵn, chỉ việc dán mã.
  function saveTrialDraft() {
    try {
      chrome.storage.local.set({
        [TRIAL_DRAFT_KEY]: {
          email: trialEmail.value.trim(),
          phone: trialPhone.value.trim(),
          email_sent: trialDialogState.emailSent,
          expires_at: trialDialogState.expiresAt,
        },
      });
    } catch { /* bản nháp chỉ là tiện ích */ }
  }

  function clearTrialDraft() {
    try { chrome.storage.local.remove(TRIAL_DRAFT_KEY); } catch { /* ignore */ }
  }

  function resumeTrialDraft() {
    try {
      chrome.storage.local.get(TRIAL_DRAFT_KEY, (result) => {
        void chrome.runtime.lastError;
        const draft = result && result[TRIAL_DRAFT_KEY];
        const resumable = !!draft && typeof draft === 'object' && !!draft.email_sent && Number(draft.expires_at) > Date.now();
        if (settingsUnlocked || trialView.stage !== 'eligible' || !trialDialog || !trialDialog.hidden) return;
        if (resumable) openTrialDialog(draft);
        else if (IS_TRIAL_PANEL) openTrialDialog(null);   // khung bên chỉ để nhập: luôn mở sẵn hộp thoại
      });
    } catch { /* ignore */ }
  }

  function openTrialDialog(draft) {
    if (!trialDialog) return;
    stopTrialCooldown();
    const restored = !!(draft && draft.email_sent && Number(draft.expires_at) > Date.now());
    trialDialogState.emailSent = restored ? String(draft.email_sent) : '';
    trialDialogState.expiresAt = restored ? Number(draft.expires_at) : 0;
    trialEmail.value = restored ? String(draft.email || draft.email_sent) : '';
    trialPhone.value = restored ? trialCleanPhoneInput(draft.phone) : '';
    trialCode.value = '';
    trialCode.disabled = !restored;
    trialPasteButton.disabled = !restored;
    trialSubmitButton.disabled = !restored;
    trialSendCodeButton.disabled = false;
    trialSendCodeButton.textContent = restored ? 'Gửi lại mã' : 'Gửi mã';
    setTrialDialogMessage(
      restored ? 'Đã gửi mã tới ' + trialDialogState.emailSent + '. Nhập mã 6 số trong email rồi bấm "Gửi yêu cầu".' : '',
      restored
    );
    trialDialog.hidden = false;
    (restored ? trialCode : trialEmail).focus();
  }

  function closeTrialDialog(discardDraft) {
    stopTrialCooldown();
    if (trialDialog) trialDialog.hidden = true;
    if (discardDraft) clearTrialDraft();
    closeTrialPanel();   // chỉ có tác dụng khi đang ở khung bên
  }

  async function sendTrialCode() {
    const email = trialEmail.value.trim();
    if (!trialValidEmail(email)) {
      setTrialDialogMessage('Email không hợp lệ. Vui lòng kiểm tra lại.');
      return;
    }
    setTrialDialogMessage('Đang gửi mã...', true);
    trialSendCodeButton.disabled = true;
    const res = await sendLicenseMessage('TRIAL_SEND_CODE', { email });
    if (res.status === 'ok') {
      trialDialogState.emailSent = email;
      const expiresIn = Number(res.expires_in);
      const ttl = Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 600;
      trialDialogState.expiresAt = Date.now() + ttl * 1000;
      trialCode.disabled = false;
      trialPasteButton.disabled = false;
      trialSubmitButton.disabled = false;
      trialCode.focus();
      const leftToday = res.attempts_left_today;
      const extra = leftToday !== undefined && leftToday !== null ? ' (hôm nay còn ' + leftToday + ' lượt)' : '';
      setTrialDialogMessage(
        'Đã gửi mã tới ' + email + '. Mã có hiệu lực ' + Math.floor(ttl / 60) + ' phút.' +
        ' Thư có thể mất 1-2 phút và có thể nằm trong mục Thư rác (Spam).' + extra,
        true
      );
      saveTrialDraft();
      startTrialCooldown(res.resend_after !== undefined ? res.resend_after : 60);
      return;
    }
    setTrialDialogMessage(res.message || 'Không gửi được mã. Vui lòng thử lại.');
    if (res.code === 'code_cooldown') {
      startTrialCooldown(res.retry_after !== undefined ? res.retry_after : 60);
    } else {
      trialSendCodeButton.disabled = false;
    }
    if (res.code === 'not_eligible') trialRefreshUi();   // hết lượt / trạng thái máy đổi -> cập nhật lại nút
  }

  function pickTrialCode(text) {
    const source = String(text || '');
    const found = source.match(/(?<!\d)(\d{6})(?!\d)/) || source.replace(/\s/g, '').match(/^\D*(\d{6})\D*$/);
    return found ? found[1] : '';
  }

  async function pasteTrialCode() {
    let clip = '';
    try {
      clip = await navigator.clipboard.readText();
    } catch {
      clip = '';
    }
    const code = pickTrialCode(clip);
    if (code) {
      trialCode.value = code;
      setTrialDialogMessage('Đã dán mã. Bấm "Gửi yêu cầu" để hoàn tất.', true);
      return;
    }
    setTrialDialogMessage(
      clip
        ? 'Clipboard chưa có mã 6 số. Hãy sao chép mã trong email trước (nhấp đúp vào dãy số rồi Ctrl+C).'
        : 'Không đọc được clipboard. Hãy bấm vào ô mã rồi nhấn Ctrl+V.'
    );
    trialCode.focus();
  }

  // Ô số điện thoại chỉ nhận số điện thoại di động Việt Nam: 0xxxxxxxxx (03/05/07/08/09) hoặc +84xxxxxxxxx / 84xxxxxxxxx.
  // Gõ hoặc dán gì cũng tự bỏ ký tự lạ (chữ, khoảng trắng, dấu chấm, gạch...) và cắt theo độ dài tối đa.
  // Cùng quy tắc với trialNormalizePhoneVN trong assets/license.js.
  function trialCleanPhoneInput(value) {
    const raw = String(value == null ? '' : value).trim();
    const plus = raw.startsWith('+');
    const digits = raw.replace(/\D/g, '');
    const max = plus || digits.startsWith('84') ? 11 : 10;
    return (plus ? '+' : '') + digits.slice(0, max);
  }

  // -> số dạng 0xxxxxxxxx, '' khi để trống (không bắt buộc), null khi không phải số di động Việt Nam.
  function trialNormalizePhoneVN(value) {
    const compact = String(value == null ? '' : value).replace(/[\s.\-()]/g, '');
    if (!compact) return '';
    const m = /^(?:\+84|84|0)([35789]\d{8})$/.exec(compact);
    return m ? '0' + m[1] : null;
  }

  async function submitTrialRequest() {
    const email = trialEmail.value.trim();
    const phone = trialNormalizePhoneVN(trialPhone.value);
    const code = trialCode.value.replace(/\D/g, '');
    if (!trialValidEmail(email)) {
      setTrialDialogMessage('Email không hợp lệ. Vui lòng kiểm tra lại.');
      return;
    }
    if (!trialDialogState.emailSent) {
      setTrialDialogMessage('Vui lòng bấm "Gửi mã" để nhận mã xác nhận qua email trước.');
      return;
    }
    if (email.toLowerCase() !== trialDialogState.emailSent.toLowerCase()) {
      setTrialDialogMessage('Email đã thay đổi so với email nhận mã. Vui lòng bấm "Gửi lại mã".');
      return;
    }
    if (code.length !== 6) {
      setTrialDialogMessage('Vui lòng nhập mã xác nhận gồm 6 chữ số.');
      return;
    }
    if (phone === null) {
      setTrialDialogMessage('Số điện thoại không đúng định dạng Việt Nam (VD: 0912345678 hoặc +84912345678).');
      trialPhone.focus();
      return;
    }
    trialPhone.value = phone;   // hiện lại dạng chuẩn 0xxxxxxxxx đúng như sẽ gửi đi
    setTrialDialogMessage('');
    trialSubmitButton.disabled = true;
    const res = await sendLicenseMessage('TRIAL_REQUEST', { email, phone, code });
    trialSubmitButton.disabled = false;
    if (res.status === 'ok' && res.saved) {
      closeTrialDialog(true);
      paintTrial({ stage: 'sent', enabled: true, message: 'Yêu cầu dùng thử đã gửi. Bấm để kiểm tra máy chủ đã cấp key chưa.' });
      showLicenseNotice('Đã gửi yêu cầu dùng thử. Khi quản trị viên duyệt, bấm nút "Đã gửi" để nhận key.');
      return;
    }
    setTrialDialogMessage(res.message || 'Không gửi được yêu cầu. Vui lòng thử lại.');
    if (['code_expired', 'code_locked', 'code_used', 'code_required', 'code_email_mismatch'].includes(res.code)) {
      trialDialogState.emailSent = '';   // buộc xin mã mới
      trialDialogState.expiresAt = 0;
      trialCode.value = '';
      trialPasteButton.disabled = true;
      trialSubmitButton.disabled = true;
      clearTrialDraft();
    }
    if (res.code === 'not_eligible') {
      closeTrialDialog(true);
      trialRefreshUi();   // trạng thái máy đã đổi -> cập nhật lại nút
    }
  }

  trialSendCodeButton?.addEventListener('click', sendTrialCode);
  trialPasteButton?.addEventListener('click', pasteTrialCode);
  trialSubmitButton?.addEventListener('click', submitTrialRequest);
  trialCancelButton?.addEventListener('click', () => closeTrialDialog(true));
  trialEmail?.addEventListener('input', saveTrialDraft);
  trialPhone?.addEventListener('input', () => {
    const cleaned = trialCleanPhoneInput(trialPhone.value);
    if (cleaned !== trialPhone.value) trialPhone.value = cleaned;
    saveTrialDraft();
  });
  trialEmail?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (!trialSendCodeButton.disabled) sendTrialCode();
    }
  });
  trialPhone?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (!trialSubmitButton.disabled) submitTrialRequest();
    }
  });
  trialCode?.addEventListener('input', () => {
    trialCode.value = trialCode.value.replace(/\D/g, '').slice(0, 6);
  });
  trialCode?.addEventListener('paste', (event) => {
    const code = pickTrialCode(event.clipboardData && event.clipboardData.getData('text'));
    if (code) {
      event.preventDefault();
      trialCode.value = code;
    }
  });
  trialCode?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (!trialSubmitButton.disabled) submitTrialRequest();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && trialDialog && !trialDialog.hidden) closeTrialDialog(true);
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
