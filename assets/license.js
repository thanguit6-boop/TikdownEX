// ===== [Download] License module =====
// Online license check for the extension (service worker side), imported at the top of background.js.
//
// Rules this module follows:
//  - The server signs every verdict with RSA (PKCS#1 v1.5 + SHA-256). Only a verified signature is trusted;
//    no true/false flag that is merely stored locally is ever used to decide anything.
//  - Nothing about the license is kept in service-worker globals (MV3 workers go to sleep): the state is always
//    re-read from chrome.storage.local.
//  - The request is a form-urlencoded POST (not JSON), signed with HMAC-SHA256 over the UPPER-CASED key.
//  - Every single send uses a brand-new nonce. The signed payload must echo nonce, app_name, license_key,
//    machine_id and mode of the request that was just sent, otherwise it is rejected.
//
// Storage keys (chrome.storage.local):
//  - tik_machine_id   random UUID created once per install (never synced between machines, never changed)
//  - tik_license_v2   {v:2, license_key, machine_id, data_str, signature_b64, cached_at_local, max_server_time_seen}
//  - tik_license_flag {licensed, reason, expire_at_ts, last_error}  UI hint only, written by this file only,
//                     never used as the enforcement decision (isLicensed() re-verifies the signed blob).

const LICENSE_ENDPOINT = 'https://clipmaster.thangpham.io.vn/kiemtra_key_v2.php';
const LICENSE_APP_NAME = 'tik_extension';
// Dedicated HMAC token of tik_extension (server: TIK_EXTENSION_SECRET). It ships inside the extension, so it is
// public by design: it is only a spam guard, the real authority is the RSA-signed response.
const LICENSE_HMAC_TOKEN = 'fcd70955d03c1b939f437a07b787aaaf305449f43422fe4d722f00eb9fad911d';
// Public verification key, embedded as SPKI DER base64.  The matching private
// key exists only on the server; do not add a .pem key file to the extension.
const LICENSE_PUBLIC_KEY_B64 = [
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyoMoiHbmU9xfPnbyz43e',
  'O9TBAy7t54VfWDhD8uXiZXf7jjJ28NXBOPgT5L6uzS8/qJ39GwoOYlV7fglfuUmT',
  'CCcyHtVQX4GQgHA4HE3xmaVLtmh8YMeIq9aX2g+/185HOdZkZzi0bk1l8XQrA8ei',
  'xvavxy/CU7TvjfBzK1xSP7su4xv75H8DoKtAP/VBcvJFftrSozyi6PPI6zE1xzOn',
  '9uYbRoi54QDlIIIX5HH5pik83OdAVarGmkp5hnDYfy+cR7l/if99YDSTIkNVn4lM',
  'UE+q64+HbRQt/Wknp3gYELmqNJAED79lYyQdadjbV9HtyZRSE9YXQJdWtActZEMk',
  'QwIDAQAB',
].join('');

const LICENSE_OFFLINE_TTL_SEC = 1800;      // max age of a cached verdict while offline (server ttl is 1800 too)
const LICENSE_SERVER_SKEW_SEC = 600;       // the server rejects requests whose "t" is off by more than this
const LICENSE_CLOCK_BACK_SEC = 60;         // tolerated backwards clock jump relative to the cache time
const LICENSE_TIMEOUT_CHECK_MS = 6000;
const LICENSE_TIMEOUT_ACTIVATE_MS = 12000;
const LICENSE_CHECK_ALARM = 'tik_license_check';   // periodic online check
const LICENSE_TICK_ALARM = 'tik_license_tick';     // one-shot: fires when the trusted window ends
const LICENSE_RETRY_ALARM = 'tik_license_retry';   // one-shot: quick retry after a network failure while locked
const LICENSE_RETRY_DELAY_MIN = 1;
// Chrome alarms are best-effort, not a real-time push channel. Five minutes is
// a small enough revocation window for a shared host, while interaction-driven
// checks below make the next protected use much faster.
const LICENSE_CHECK_PERIOD_MIN = 5;
const LICENSE_INTERACTIVE_CHECK_MAX_AGE_SEC = 60;

const LICENSE_K_MACHINE = 'tik_machine_id';
const LICENSE_K_LICENSE = 'tik_license_v2';
const LICENSE_K_FLAG = 'tik_license_flag';

// Signed verdicts that take the license away at once (and are stored, signed, in place of the old verdict).
// Anything else that is signed (db_error, activate_race, no_duration...) and every unsigned or network error
// only shows a message: a valid cached verdict keeps working until its grace time ends.
const LICENSE_FINAL_VERDICTS = new Set(['expired', 'banned', 'wrong_device', 'not_found', 'unused', 'unbound', 'bad_status']);

// User-facing messages (Vietnamese), keyed by verdict / reason.
const LICENSE_MESSAGES = {
  active: 'Bản quyền hợp lệ',
  banned: 'Key đã bị khóa',
  expired: 'Key đã hết hạn',
  unused: 'Key chưa được kích hoạt',
  wrong_device: 'Key đã đăng ký cho máy khác (liên hệ để đổi máy)',
  not_found: 'Key không tồn tại',
  bad_signature: 'Phản hồi server không xác thực được',
  network_error: 'Lỗi kết nối mạng',
  bad_response: 'Server trả về dữ liệu không hợp lệ',
  mismatch: 'Phản hồi không khớp dữ liệu yêu cầu',
  time_skew: 'Đồng hồ máy lệch quá lớn',
  bad_sign: 'Chữ ký yêu cầu không hợp lệ',
  missing_params: 'Thiếu tham số yêu cầu',
  bad_app: 'Sai app_name',
  replay: 'Yêu cầu đã được dùng',
  bad_status: 'Trạng thái key không hợp lệ',
  no_duration: 'Key chưa cấu hình thời lượng',
  activate_race: 'Trạng thái key đã thay đổi, thử lại',
  db_error: 'Lỗi cơ sở dữ liệu phía server',
  server_misconfig: 'Server thiếu khóa ký',
  // Other unsigned codes the server can send (kiemtra_key_v2.php):
  bad_mode: 'Chế độ yêu cầu không hợp lệ',
  method_not_allowed: 'Phương thức yêu cầu không được hỗ trợ',
  sign_error: 'Server không ký được phản hồi',
  encode_error: 'Server không tạo được phản hồi',
  // Added for the extension:
  unbound: 'Key chưa gắn máy, cần kích hoạt lại',
  no_key: 'Chưa nhập key',
  invalid_key: 'Key không đúng định dạng',
  tampered: 'Dữ liệu bản quyền không hợp lệ. Vui lòng kết nối Internet và nhập lại key',
  clock_changed: 'Đồng hồ máy bị thay đổi, vui lòng kết nối Internet',
  offline_expired: 'Bản quyền cần kết nối Internet để xác thực lại',
  storage_error: 'Không lưu được dữ liệu bản quyền',
  forbidden: 'Không được phép thực hiện thao tác này',
  internal_error: 'Lỗi nội bộ, vui lòng thử lại',
  unsigned: 'Phản hồi từ server không có chữ ký',
};

function licenseMessage(verdict) {
  if (Object.prototype.hasOwnProperty.call(LICENSE_MESSAGES, verdict)) return LICENSE_MESSAGES[verdict];
  // Never show text that came from the server unsigned: only our own table.
  return 'Lỗi không xác định (' + String(verdict || 'unknown') + ')';
}

// ----- small helpers -----
const licenseEnc = new TextEncoder();

function licenseNowSec() {
  return Math.floor(Date.now() / 1000);
}

function licenseIsInt(v) {
  return typeof v === 'number' && Number.isInteger(v);
}

function licenseNum(v) {
  return licenseIsInt(v) ? v : 0;
}

function licenseSafeVerdict(v) {
  return typeof v === 'string' && /^[a-z_]{1,32}$/.test(v) ? v : '';
}

function licenseB64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function licenseBytesToHex(buf) {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

function licenseRandomHex(byteLen) {
  const a = new Uint8Array(byteLen);
  crypto.getRandomValues(a);
  return licenseBytesToHex(a);
}

// Trim + upper-case (the server computes the HMAC over the upper-cased key) + format check.
// Returns '' when the key is not acceptable.
function licenseNormalizeKey(raw) {
  const k = String(raw == null ? '' : raw).trim().toUpperCase();
  return /^[A-Z0-9]{8,64}$/.test(k) ? k : '';
}

function licenseKeyHint(key) {
  const k = String(key || '');
  return k.length >= 9 ? k.slice(0, 4) + '…' + k.slice(-4) : '';
}

// ----- crypto -----
let licensePubKeyPromise = null;   // cached CryptoKey import only, not license state

function licensePublicKey() {
  if (!licensePubKeyPromise) {
    licensePubKeyPromise = crypto.subtle.importKey(
      'spki',
      licenseB64ToBytes(LICENSE_PUBLIC_KEY_B64),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    ).catch((e) => { licensePubKeyPromise = null; throw e; });
  }
  return licensePubKeyPromise;
}

// RSA verify over the exact UTF-8 bytes of data_str (never over a re-serialised object).
async function licenseVerifySignature(dataStr, signatureB64) {
  if (typeof dataStr !== 'string' || !dataStr || typeof signatureB64 !== 'string' || !signatureB64) return false;
  try {
    const key = await licensePublicKey();
    return await crypto.subtle.verify({ name: 'RSASSA-PKCS1-v1_5' }, key, licenseB64ToBytes(signatureB64), licenseEnc.encode(dataStr));
  } catch (e) {
    return false;
  }
}

async function licenseHmacHex(message) {
  const key = await crypto.subtle.importKey('raw', licenseEnc.encode(LICENSE_HMAC_TOKEN), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return licenseBytesToHex(await crypto.subtle.sign('HMAC', key, licenseEnc.encode(message)));
}

// ----- machine id -----
let licenseMachineIdPromise = null;   // single-flight guard for the first creation only

async function licenseGetMachineId(create) {
  const cur = (await chrome.storage.local.get(LICENSE_K_MACHINE))[LICENSE_K_MACHINE];
  if (typeof cur === 'string' && cur.length >= 8) return cur;
  if (!create) return '';
  if (!licenseMachineIdPromise) {
    licenseMachineIdPromise = (async () => {
      const again = (await chrome.storage.local.get(LICENSE_K_MACHINE))[LICENSE_K_MACHINE];
      if (typeof again === 'string' && again.length >= 8) return again;
      const id = crypto.randomUUID();
      await chrome.storage.local.set({ [LICENSE_K_MACHINE]: id });
      return id;
    })().finally(() => { licenseMachineIdPromise = null; });
  }
  return licenseMachineIdPromise;
}

// ----- request / response -----
// A new nonce (and "t") is generated on every call, so a retry can never re-use an old one.
async function licenseBuildRequest(licenseKey, machineId, mode) {
  const t = String(licenseNowSec());
  const nonce = licenseRandomHex(12);
  const signature = await licenseHmacHex([licenseKey, machineId, t, nonce, mode, LICENSE_APP_NAME].join('|'));
  return { license_key: licenseKey, machine_id: machineId, t: t, nonce: nonce, mode: mode, app_name: LICENSE_APP_NAME, signature: signature };
}

// Returns {raw} (parsed JSON) or {error: 'network_error' | 'bad_response'}.
async function licensePost(req, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    let resp;
    try {
      resp = await fetch(LICENSE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(req).toString(),
        signal: ctrl.signal,
        cache: 'no-store',
        credentials: 'omit',
      });
    } catch (e) {
      return { error: 'network_error' };
    }
    try {
      return { raw: await resp.json() };
    } catch (e) {
      // The abort timer also covers reading the body: a stalled download is a network problem.
      return { error: ctrl.signal.aborted ? 'network_error' : 'bad_response' };
    }
  } finally {
    clearTimeout(timer);
  }
}

// Order is fixed: signed? -> RSA ok? -> JSON -> echoes the request? -> verdict.
// kind 'ok'      verified and active (the only kind that grants a license)
// kind 'verdict' verified, signed, not active
// kind 'error'   anything else (network, unsigned, bad signature, mismatch...): never changes the stored state
async function licenseInterpret(req, sent) {
  if (sent.error) return { kind: 'error', verdict: sent.error };
  const raw = sent.raw;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { kind: 'error', verdict: 'bad_response' };

  const dataStr = raw.data_str;
  const sig = raw.signature_b64;
  if (dataStr === undefined || dataStr === null || dataStr === '' || sig === undefined || sig === null || sig === '') {
    // Unsigned error from the server (spam guard, bad_app, time_skew, replay...).
    return { kind: 'error', verdict: licenseSafeVerdict(raw.code) || licenseSafeVerdict(raw.verdict) || 'unsigned' };
  }
  if (typeof dataStr !== 'string' || typeof sig !== 'string') return { kind: 'error', verdict: 'bad_response' };
  if (!(await licenseVerifySignature(dataStr, sig))) return { kind: 'error', verdict: 'bad_signature' };

  let payload;
  try { payload = JSON.parse(dataStr); } catch (e) { return { kind: 'error', verdict: 'bad_response' }; }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return { kind: 'error', verdict: 'bad_response' };

  if (payload.app_name !== LICENSE_APP_NAME || payload.license_key !== req.license_key ||
      payload.machine_id !== req.machine_id || payload.nonce !== req.nonce || payload.mode !== req.mode) {
    return { kind: 'error', verdict: 'mismatch' };
  }

  // Every signed payload carries the server clock and the ttl (they anchor the offline grace later on).
  if (!licenseIsInt(payload.server_time) || !licenseIsInt(payload.issued_at) || !licenseIsInt(payload.ttl) || payload.ttl <= 0) {
    return { kind: 'error', verdict: 'bad_response' };
  }
  const verdict = licenseSafeVerdict(payload.verdict);
  if (verdict === 'active') {
    // Still valid on the server's clock: compare timestamps, never parse the VN-time string expire_at.
    if (payload.license_status !== 'active' || !licenseIsInt(payload.expire_at_ts) || payload.expire_at_ts <= payload.server_time) {
      return { kind: 'error', verdict: 'bad_response' };
    }
    return { kind: 'ok', verdict: 'active', payload: payload, dataStr: dataStr, sig: sig };
  }
  return { kind: 'verdict', verdict: verdict || 'bad_response', payload: payload, dataStr: dataStr, sig: sig };
}

// ----- status (always derived from the signed blob) -----
function licenseMakeStatus(o) {
  const licensed = o.reason === 'ok';
  const remaining = Math.max(0, licenseNum(o.remaining_seconds));
  return {
    licensed: licensed,
    reason: o.reason,
    final: o.final === true,                 // true when the reason is a signed server verdict
    message: licensed ? LICENSE_MESSAGES.active : licenseMessage(o.reason),
    key_hint: o.key_hint || '',
    expire_at: typeof o.expire_at === 'string' ? o.expire_at : null,
    expire_at_ts: licenseNum(o.expire_at_ts),
    remaining_seconds: remaining,
    days_left: Math.floor(remaining / 86400),
    checked_at: licenseNum(o.checked_at),    // local time of the last verified server answer
    valid_until: licenseNum(o.valid_until),  // local time when the cached verdict stops being trusted
  };
}

// Pure read + verification, no network and no writes. This is what every enforcement point must rely on.
async function licenseEvaluate() {
  let store;
  try {
    store = await chrome.storage.local.get([LICENSE_K_LICENSE, LICENSE_K_MACHINE]);
  } catch (e) {
    return licenseMakeStatus({ reason: 'storage_error' });
  }
  const blob = store[LICENSE_K_LICENSE];
  if (blob === undefined || blob === null) return licenseMakeStatus({ reason: 'no_key' });

  const tampered = (hint) => licenseMakeStatus({ reason: 'tampered', key_hint: hint || '' });
  if (typeof blob !== 'object' || Array.isArray(blob) || blob.v !== 2 ||
      typeof blob.license_key !== 'string' || typeof blob.machine_id !== 'string' ||
      typeof blob.data_str !== 'string' || typeof blob.signature_b64 !== 'string') {
    return tampered('');
  }
  const hint = licenseKeyHint(blob.license_key);
  if (!(await licenseVerifySignature(blob.data_str, blob.signature_b64))) return tampered(hint);

  let p;
  try { p = JSON.parse(blob.data_str); } catch (e) { return tampered(hint); }
  if (!p || typeof p !== 'object' || p.app_name !== LICENSE_APP_NAME ||
      licenseNormalizeKey(blob.license_key) !== blob.license_key || p.license_key !== blob.license_key ||
      p.machine_id !== blob.machine_id || p.machine_id !== store[LICENSE_K_MACHINE]) {
    return tampered(hint);
  }
  const cachedAt = blob.cached_at_local;
  if (!licenseIsInt(cachedAt) || cachedAt <= 0 || !licenseIsInt(p.server_time) || !licenseIsInt(p.issued_at) || !licenseIsInt(p.ttl)) {
    return tampered(hint);
  }
  const base = { key_hint: hint, expire_at: p.expire_at, expire_at_ts: licenseNum(p.expire_at_ts), checked_at: cachedAt };

  // A signed verdict that is not "active": locked until the user activates / checks again.
  const verdict = licenseSafeVerdict(p.verdict);
  if (verdict !== 'active' || p.license_status !== 'active') {
    return licenseMakeStatus(Object.assign(base, { reason: verdict || 'bad_response', final: true }));
  }
  if (!licenseIsInt(p.expire_at_ts)) return tampered(hint);

  const now = licenseNowSec();
  const maxSeen = Math.max(licenseNum(blob.max_server_time_seen), p.server_time);
  // Clock moved back (relative to the cache time or to the newest server time seen): do not trust the cache.
  // The second test allows the same +-10 min skew the server itself tolerates, so a slow clock is not punished.
  if (now < cachedAt - LICENSE_CLOCK_BACK_SEC || now + LICENSE_SERVER_SKEW_SEC < maxSeen) {
    return licenseMakeStatus(Object.assign(base, { reason: 'clock_changed' }));
  }
  const ttl = Math.min(p.ttl > 0 ? p.ttl : LICENSE_OFFLINE_TTL_SEC, LICENSE_OFFLINE_TTL_SEC);
  const elapsed = Math.max(0, now - cachedAt);
  // Second anchor: the signed issued_at, so editing cached_at_local alone cannot stretch the offline grace.
  if (elapsed > ttl || now - p.issued_at > ttl + LICENSE_SERVER_SKEW_SEC) {
    return licenseMakeStatus(Object.assign(base, { reason: 'offline_expired' }));
  }
  // Remaining time on the SERVER's clock: server_time + time elapsed locally since the cache was made.
  const remaining = p.expire_at_ts - (p.server_time + elapsed);
  if (remaining <= 0) return licenseMakeStatus(Object.assign(base, { reason: 'expired' }));

  return licenseMakeStatus(Object.assign(base, {
    reason: 'ok',
    remaining_seconds: remaining,
    valid_until: now + Math.min(ttl - elapsed, remaining),
  }));
}

// Public hint for the UI and content scripts. Only this file writes it, and nothing enforces on it.
async function licenseSyncFlag(status, lastError) {
  let cur = {};
  try { cur = (await chrome.storage.local.get(LICENSE_K_FLAG))[LICENSE_K_FLAG] || {}; } catch (e) { cur = {}; }
  const next = {
    licensed: status.licensed === true,
    reason: status.reason,
    expire_at_ts: status.expire_at_ts || 0,
    last_error: lastError === undefined ? (typeof cur.last_error === 'string' ? cur.last_error : '') : lastError,
  };
  if (status.reason === 'no_key') next.last_error = '';
  if (cur.licensed !== next.licensed || cur.reason !== next.reason || cur.expire_at_ts !== next.expire_at_ts || cur.last_error !== next.last_error) {
    try { await chrome.storage.local.set({ [LICENSE_K_FLAG]: next }); } catch (e) { /* UI hint only */ }
  }
  // Wake up exactly when the trusted window ends, so the flag flips off without waiting for the 15-minute alarm.
  if (typeof chrome !== 'undefined' && chrome.alarms) {
    try {
      if (status.licensed && status.valid_until > 0) {
        chrome.alarms.create(LICENSE_TICK_ALARM, { when: (status.valid_until + 1) * 1000 });
        chrome.alarms.clear(LICENSE_RETRY_ALARM);   // licensed again: no retry needed
      } else {
        chrome.alarms.clear(LICENSE_TICK_ALARM);
        // Nothing to retry when there is no key or the server already gave a signed, final answer.
        if (status.reason === 'no_key' || status.final) chrome.alarms.clear(LICENSE_RETRY_ALARM);
      }
    } catch (e) { /* ignore */ }
  }
  return next;
}

// ----- state changes (all serialised, one request at a time) -----
let licenseChain = Promise.resolve();   // serialisation queue only, not license state
let licenseCheckInflight = null;        // concurrent check() callers share one request

function licenseRunExclusive(fn) {
  const p = licenseChain.then(fn);
  licenseChain = p.then(() => undefined, () => undefined);
  return p;
}

async function licenseReadBlob() {
  try {
    const b = (await chrome.storage.local.get(LICENSE_K_LICENSE))[LICENSE_K_LICENSE];
    return b && typeof b === 'object' && !Array.isArray(b) ? b : null;
  } catch (e) {
    return null;
  }
}

async function licenseSaveBlob(req, out, prev) {
  const st = out.payload.server_time;
  let prevMax = prev && licenseIsInt(prev.max_server_time_seen) ? prev.max_server_time_seen : 0;
  if (prevMax > st + LICENSE_SERVER_SKEW_SEC) prevMax = 0;   // server clock went backwards: do not get stuck on it
  const blob = {
    v: 2,
    license_key: req.license_key,
    machine_id: req.machine_id,
    data_str: out.dataStr,
    signature_b64: out.sig,
    cached_at_local: licenseNowSec(),
    max_server_time_seen: Math.max(prevMax, st),
  };
  await chrome.storage.local.set({ [LICENSE_K_LICENSE]: blob });
}

function licenseArmRetry() {
  if (typeof chrome === 'undefined' || !chrome.alarms) return;
  try { chrome.alarms.create(LICENSE_RETRY_ALARM, { delayInMinutes: LICENSE_RETRY_DELAY_MIN }); } catch (e) { /* ignore */ }
}

async function licenseFinish(mode, verdict, ok, lastError) {
  const status = await licenseEvaluate();
  const flag = await licenseSyncFlag(status, lastError);
  // Locked only because the server could not be reached (laptop just woke up and Wi-Fi is not back yet, short
  // outage): try again in a minute instead of waiting for the next 15-minute alarm. While the network is down no
  // request leaves the machine, so this cannot load the server. An install still inside its grace time needs no retry.
  if (!ok && verdict === 'network_error' && status.licensed !== true && status.reason !== 'no_key' && status.final !== true) {
    licenseArmRetry();
  }
  return {
    ok: ok,
    verdict: verdict,
    message: ok ? (mode === 'activate' ? 'Kích hoạt thành công' : LICENSE_MESSAGES.active) : licenseMessage(verdict),
    status: Object.assign({}, status, { last_error: flag.last_error }),
  };
}

async function licenseDoRequest(mode, rawKey) {
  const prev = await licenseReadBlob();   // not verified here: only used to find the stored key
  const prevKey = prev && typeof prev.license_key === 'string' ? licenseNormalizeKey(prev.license_key) : '';
  const typed = rawKey == null ? '' : String(rawKey).trim();

  let key = prevKey;
  if (mode === 'activate' && typed) key = licenseNormalizeKey(typed);   // a typed key always wins over the stored one
  if (!key) return licenseFinish(mode, typed ? 'invalid_key' : (prev ? 'tampered' : 'no_key'), false, undefined);

  let machineId;
  try { machineId = await licenseGetMachineId(true); } catch (e) { return licenseFinish(mode, 'storage_error', false, undefined); }
  // A check always concerns the stored install: if the machine id no longer matches, the stored data cannot be trusted.
  if (mode === 'check' && (!prev || prev.machine_id !== machineId)) return licenseFinish(mode, 'tampered', false, undefined);

  const req = await licenseBuildRequest(key, machineId, mode);
  const sent = await licensePost(req, mode === 'activate' ? LICENSE_TIMEOUT_ACTIVATE_MS : LICENSE_TIMEOUT_CHECK_MS);
  const out = await licenseInterpret(req, sent);

  if (out.kind === 'ok') {
    try { await licenseSaveBlob(req, out, prev); } catch (e) { return licenseFinish(mode, 'storage_error', false, undefined); }
    return licenseFinish(mode, 'active', true, '');
  }
  if (out.kind === 'verdict') {
    if (LICENSE_FINAL_VERDICTS.has(out.verdict)) {
      // Only a verdict about the key stored on this install replaces the stored (signed) verdict.
      // A failed activation of some OTHER key leaves the current license untouched.
      const sameInstall = !!prev && prevKey === req.license_key && prev.machine_id === req.machine_id;
      if (sameInstall) {
        try { await licenseSaveBlob(req, out, prev); } catch (e) { return licenseFinish(mode, 'storage_error', false, undefined); }
        return licenseFinish(mode, out.verdict, false, '');
      }
      return licenseFinish(mode, out.verdict, false, undefined);
    }
    return licenseFinish(mode, out.verdict, false, out.verdict);
  }
  return licenseFinish(mode, out.verdict, false, out.verdict);
}

function licenseActivate(rawKey) {
  return licenseRunExclusive(() => licenseDoRequest('activate', rawKey));
}

function licenseCheck() {
  if (!licenseCheckInflight) {
    licenseCheckInflight = licenseRunExclusive(() => licenseDoRequest('check', null))
      .finally(() => { licenseCheckInflight = null; });
  }
  return licenseCheckInflight;
}

// Revalidate before a user starts using the extension, but coalesce frequent
// UI/fetch activity. `retryFinal` lets a deliberate user entry point retry a
// previously signed ban/expiry immediately after the seller renews the key.
async function licenseCheckIfStale(maxAgeSeconds = LICENSE_INTERACTIVE_CHECK_MAX_AGE_SEC, retryFinal = false) {
  const status = await licenseEvaluate();
  if (status.reason === 'no_key') {
    const flag = await licenseSyncFlag(status, undefined);
    return {
      ok: status.licensed === true,
      verdict: status.reason,
      message: status.message,
      status: Object.assign({}, status, { last_error: flag.last_error }),
    };
  }

  const age = Math.max(0, licenseNowSec() - licenseNum(status.checked_at));
  if ((!status.final || !retryFinal) && status.checked_at > 0 && age < maxAgeSeconds) {
    const flag = await licenseSyncFlag(status, undefined);
    return {
      ok: status.licensed === true,
      verdict: status.licensed === true ? 'active' : status.reason,
      message: status.message,
      status: Object.assign({}, status, { last_error: flag.last_error }),
    };
  }
  return licenseCheck();
}

// Sign out / change key. The machine id stays, so the same key can be entered again on this install.
function licenseClear() {
  return licenseRunExclusive(async () => {
    try { await chrome.storage.local.remove(LICENSE_K_LICENSE); } catch (e) { return licenseFinish('check', 'storage_error', false, undefined); }
    const status = await licenseEvaluate();
    const flag = await licenseSyncFlag(status, '');
    return { ok: true, verdict: 'no_key', message: licenseMessage('no_key'), status: Object.assign({}, status, { last_error: flag.last_error }) };
  });
}

async function licenseStatus() {
  const status = await licenseEvaluate();
  const flag = await licenseSyncFlag(status, undefined);
  return Object.assign({}, status, { last_error: flag.last_error });
}

// Periodic / startup check: every stored key is rechecked. This makes a
// server-side renewal recover automatically; `no_key` is the sole state that
// must never generate network traffic.
async function licenseScheduledCheck() {
  const status = await licenseEvaluate();
  if (status.reason === 'no_key') {
    await licenseSyncFlag(status, undefined);
    return;
  }
  await licenseCheck();
}

// Enforcement helper for background.js (phase 3): no network, signature re-verified on every call.
async function isLicensed() {
  return (await licenseEvaluate()).licensed === true;
}

// The download resolver receives this proof instead of a client-owned
// “licensed: true” flag. It is an RSA signature made by our server and binds
// this key to this machine. The resolver verifies it again and also checks the
// current DB row, so editing the extension cannot mint download permission.
async function getDownloadResolverProof() {
  const status = await licenseEvaluate();
  if (status.licensed !== true) return null;
  const blob = await licenseReadBlob();
  if (!blob || typeof blob.data_str !== 'string' || typeof blob.signature_b64 !== 'string') return null;
  return {
    license_data: blob.data_str,
    license_signature: blob.signature_b64,
  };
}

// ----- wiring (all listeners are registered synchronously at load, as MV3 requires) -----
function licenseIsExtensionPage(sender) {
  return !!sender && typeof sender.url === 'string' && sender.url.indexOf(chrome.runtime.getURL('')) === 0;
}

function licenseOnMessage(msg, sender, sendResponse) {
  if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string' || msg.type.indexOf('LICENSE_') !== 0) return false;
  if (!sender || sender.id !== chrome.runtime.id) return false;   // this extension only
  const forbidden = () => Promise.resolve({ ok: false, verdict: 'forbidden', message: LICENSE_MESSAGES.forbidden });
  let job;
  switch (msg.type) {
    case 'LICENSE_STATUS':
      job = licenseStatus().then((s) => ({ ok: true, status: s }));
      break;
    // Content scripts may request a freshness check; key-changing operations
    // remain restricted to the popup's extension page below.
    case 'LICENSE_REVALIDATE':
      job = licenseCheckIfStale(LICENSE_INTERACTIVE_CHECK_MAX_AGE_SEC, true);
      break;
    // Changing the license is allowed from the extension's own pages (popup) only, never from a content script.
    case 'LICENSE_ACTIVATE':
      job = licenseIsExtensionPage(sender) ? licenseActivate(msg.key) : forbidden();
      break;
    case 'LICENSE_CHECK':
      job = licenseIsExtensionPage(sender) ? licenseCheck() : forbidden();
      break;
    case 'LICENSE_CLEAR':
      job = licenseIsExtensionPage(sender) ? licenseClear() : forbidden();
      break;
    default:
      return false;
  }
  job.then(sendResponse, () => sendResponse({ ok: false, verdict: 'internal_error', message: LICENSE_MESSAGES.internal_error }));
  return true;
}

function licenseEnsureAlarm() {
  if (typeof chrome === 'undefined' || !chrome.alarms) return;
  try {
    chrome.alarms.get(LICENSE_CHECK_ALARM, (a) => {
      if (!a) {
        chrome.alarms.create(LICENSE_CHECK_ALARM, { periodInMinutes: LICENSE_CHECK_PERIOD_MIN });
      } else if (a.periodInMinutes !== LICENSE_CHECK_PERIOD_MIN) {
        chrome.alarms.clear(LICENSE_CHECK_ALARM, () => {
          chrome.alarms.create(LICENSE_CHECK_ALARM, { periodInMinutes: LICENSE_CHECK_PERIOD_MIN });
        });
      }
    });
  } catch (e) { /* ignore */ }
}

chrome.runtime.onMessage.addListener(licenseOnMessage);
chrome.runtime.onStartup.addListener(() => {
  licenseEnsureAlarm();
  licenseScheduledCheck().catch(() => {});
});
chrome.runtime.onInstalled.addListener(() => {
  licenseEnsureAlarm();
  licenseScheduledCheck().catch(() => {});
});
if (chrome.alarms) {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm && (alarm.name === LICENSE_CHECK_ALARM || alarm.name === LICENSE_TICK_ALARM || alarm.name === LICENSE_RETRY_ALARM)) {
      licenseScheduledCheck().catch(() => {});
    }
  });
}
// Every time the worker wakes up: make sure the alarm exists and the UI flag matches the signed state.
licenseEnsureAlarm();
licenseCheckIfStale().catch(() => {});

export { isLicensed, getDownloadResolverProof, licenseStatus as getLicenseStatus, licenseActivate, licenseCheck, licenseCheckIfStale, licenseClear };
// ===== [/Download] License module =====
