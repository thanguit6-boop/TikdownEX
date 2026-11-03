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
async function licensePost(req, timeoutMs, url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    let resp;
    try {
      resp = await fetch(url || LICENSE_ENDPOINT, {
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

// ----- Free trial request (the "Thử miễn phí" button, same flow as Multi Phone Manager) -----
// eligibility -> send_code (a 6-digit code is mailed to the address) -> request -> the admin approves on the server
// -> status hands over the license key -> the key is activated through licenseActivate() above, like a typed key.
// The trial answers are plain JSON and grant nothing by themselves: the key they deliver is still checked by the
// RSA-signed answer of kiemtra_key_v2.php when it is activated, so a forged trial answer can never unlock a license.
// Only fields of the expected type are passed on to the popup (trialClean), and the popup shows them as text only.
//
// Storage keys (chrome.storage.local):
//  - tik_trial_request  {request_id, poll_token, email, created_at, received, key, days}  request sent from this install
//  - tik_trial_done     {machine_id, received_at}  this install already received a trial key (the server stays the real gate)
//  - tik_trial_reset_seen {token}  the admin's last "Reset Dùng thử" (token of action eligibility) this install already applied

const TRIAL_ENDPOINT = 'https://clipmaster.thangpham.io.vn/api/trial_api.php';
// Must match trial_api.php: the app_name and the HMAC secret registered there for this extension
// (the same dedicated token the license server already uses for tik_extension).
const TRIAL_APP_NAME = LICENSE_APP_NAME;
const TRIAL_TIMEOUT_MS = 10000;
const TRIAL_K_REQUEST = 'tik_trial_request';
const TRIAL_K_DONE = 'tik_trial_done';
const TRIAL_K_RESET_SEEN = 'tik_trial_reset_seen';
const TRIAL_EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const TRIAL_MSG_EMAIL = 'Email không hợp lệ. Vui lòng kiểm tra lại.';
const TRIAL_MSG_PHONE = 'Số điện thoại không đúng định dạng Việt Nam (VD: 0912345678 hoặc +84912345678).';
const TRIAL_MSG_NO_MID = 'Không đọc được mã máy (Machine ID lỗi hoặc rỗng).';
const TRIAL_MSG_NET = 'Không kiểm tra được lúc này. Vui lòng thử lại sau.';
const TRIAL_MSG_GOT_KEY = 'Đã nhận key dùng thử. Bấm để tự động kích hoạt.';
const TRIAL_MSG_SENT = 'Yêu cầu dùng thử đã gửi. Bấm để kiểm tra máy chủ đã cấp key chưa.';
const TRIAL_MSG_REJECTED = 'Không nhận được key dùng thử. Vui lòng liên hệ hỗ trợ.';

function trialValidEmail(email) {
  return typeof email === 'string' && email.length > 0 && email.length <= 190 && TRIAL_EMAIL_RE.test(email);
}

function trialError(code, message) {
  return { status: 'error', code: code, message: message };
}

// Keep only the fields the popup needs, each with the expected type (never pass the raw server object around).
function trialClean(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const k of ['status', 'code', 'reason', 'state']) {
    if (typeof raw[k] === 'string') out[k] = raw[k].slice(0, 64);
  }
  if (typeof raw.message === 'string') out.message = raw.message.trim().slice(0, 300);
  if (typeof raw.duration_text === 'string') out.duration_text = raw.duration_text.trim().slice(0, 64);
  for (const k of ['license_key', 'request_id', 'poll_token', 'reset_token']) {
    if (typeof raw[k] === 'string' || typeof raw[k] === 'number') out[k] = String(raw[k]).slice(0, 128);
  }
  for (const k of ['days', 'attempts_left_today', 'expires_in', 'resend_after', 'retry_after']) {
    if (raw[k] === undefined || raw[k] === null || raw[k] === '') continue;
    const n = Number(raw[k]);
    if (Number.isFinite(n)) out[k] = n;
  }
  return out;
}

async function trialMachineId() {
  try { return await licenseGetMachineId(true); } catch (e) { return ''; }
}

// POST to trial_api.php. Always resolves to an object (network problem -> status 'error', code 'network_error').
async function trialApiCall(action, machineId, extra, fields) {
  const t = String(licenseNowSec());
  let signature;
  try {
    // Must match trial_api.php: app_name|action|machine_id|t|extra
    signature = await licenseHmacHex([TRIAL_APP_NAME, action, machineId, t, extra || ''].join('|'));
  } catch (e) {
    return trialError('internal_error', LICENSE_MESSAGES.internal_error);
  }
  // No hw_id: a browser extension cannot read the Windows MachineGuid, so the server falls back to machine id + IP.
  const data = Object.assign({}, fields || {}, { app_name: TRIAL_APP_NAME, action: action, machine_id: machineId, t: t, signature: signature });
  const sent = await licensePost(data, TRIAL_TIMEOUT_MS, TRIAL_ENDPOINT);
  if (sent.error === 'network_error') return trialError('network_error', LICENSE_MESSAGES.network_error);
  const res = sent.error ? {} : trialClean(sent.raw);
  if (!res.status) return trialError('invalid_response', 'Phản hồi không hợp lệ từ máy chủ.');
  return res;
}

async function trialStateLoad() {
  try {
    const s = (await chrome.storage.local.get(TRIAL_K_REQUEST))[TRIAL_K_REQUEST];
    if (s && typeof s === 'object' && !Array.isArray(s) && s.request_id && s.poll_token) return s;
  } catch (e) { /* ignore */ }
  return null;
}

async function trialStateSave(st) {
  try { await chrome.storage.local.set({ [TRIAL_K_REQUEST]: st }); return true; } catch (e) { return false; }
}

async function trialStateClear() {
  try { await chrome.storage.local.remove(TRIAL_K_REQUEST); } catch (e) { /* ignore */ }
}

async function trialDoneCheck(machineId) {
  try {
    const d = (await chrome.storage.local.get(TRIAL_K_DONE))[TRIAL_K_DONE];
    return !!d && typeof d === 'object' && !!machineId && d.machine_id === machineId;
  } catch (e) {
    return false;
  }
}

async function trialDoneMark(machineId) {
  try {
    await chrome.storage.local.set({ [TRIAL_K_DONE]: { machine_id: machineId, received_at: licenseNowSec() } });
  } catch (e) { /* the server is the real gate */ }
}

// The admin pressed "Reset Dùng thử" for this machine (key page -> Sửa): forget the local "already got a trial key" mark
// and the old request, so the machine can ask again like a new one. Each reset (each token) is handled only once.
// Returns true when the local marks were just removed.
async function trialApplyServerReset(rawToken) {
  const token = String(rawToken == null ? '' : rawToken).trim();
  if (!token) return false;
  try {
    const seen = (await chrome.storage.local.get(TRIAL_K_RESET_SEEN))[TRIAL_K_RESET_SEEN];
    if (seen && typeof seen === 'object' && String(seen.token || '') === token) return false;
    await chrome.storage.local.remove([TRIAL_K_DONE, TRIAL_K_REQUEST]);
    await chrome.storage.local.set({ [TRIAL_K_RESET_SEEN]: { token: token } });
    return true;
  } catch (e) {
    return false;
  }
}

// Purchased key: the admin granted a key to this machine in advance (key page -> Sửa -> Machine ID + "Số ngày kích hoạt").
// The key stays "unused" on the server until it is activated. -> {ok, grant}: ok = the server answered,
// grant = {key, days, duration_text} when a key is waiting, else null. Nothing is stored locally: the server is the source.
async function trialClaim(machineId) {
  const res = await trialApiCall('claim', machineId, '', null);
  if (res.status !== 'ok') return { ok: false, grant: null };
  const key = res.state === 'ready' ? licenseNormalizeKey(res.license_key) : '';
  if (!key) return { ok: true, grant: null };
  return {
    ok: true,
    grant: { key: key, days: res.days === undefined ? null : res.days, duration_text: res.duration_text || '' },
  };
}

// What the popup draws. stage: eligible | sent | received | rejected | error | hidden
// The popup shows the button only while enabled is true (eligible / sent / received); any other view is hidden
// there and its message goes to the popup console.
function trialView(stage, message, extra) {
  return Object.assign({
    ok: true,
    stage: stage,
    message: message || '',
    enabled: stage === 'eligible' || stage === 'sent' || stage === 'received',
  }, extra || {});
}

function trialStoredView(st) {
  return st && st.received && st.key ? trialView('received', TRIAL_MSG_GOT_KEY) : trialView('sent', TRIAL_MSG_SENT);
}

// Button for a purchased key the admin granted: [Nhận được key N ngày, nhấn để kích hoạt] (popup shows view.label).
function trialGrantView(grant) {
  let text = String(grant.duration_text || '').trim();
  if (!text && Number.isFinite(grant.days) && grant.days > 0) text = grant.days + ' ngày';
  return trialView(
    'received',
    'Quản trị viên đã cấp key' + (text ? ' ' + text : '') + ' cho máy này. Bấm để tự động kích hoạt (thời hạn tính từ lúc kích hoạt).',
    { grant: true, label: text ? 'Nhận được key ' + text + ', nhấn để kích hoạt' : '' }
  );
}

// Does this machine get a trial? (a request already sent from this install is followed up with trialCheckStatus)
async function trialRefresh() {
  if ((await licenseEvaluate()).licensed === true) return trialView('hidden', '');
  if (await trialStateLoad()) {
    // A purchased key the admin granted to this machine comes before a pending trial request (same as Multi Phone Manager).
    const mine = await trialMachineId();
    const claimed = mine ? await trialClaim(mine) : { grant: null };
    return claimed.grant ? trialGrantView(claimed.grant) : trialCheckStatus();
  }

  const mid = await trialMachineId();
  if (!mid) return trialView('error', TRIAL_MSG_NO_MID);
  const res = await trialApiCall('eligibility', mid, '', null);
  if (res.status !== 'ok') {
    // The popup hides the button for this view and logs the message (with the error code) to its console.
    return trialView('error', (res.message || TRIAL_MSG_NET) + (res.code ? '\n(Mã lỗi: ' + res.code + ')' : ''));
  }
  switch (res.reason) {
    case 'key_ready': {
      // The admin already granted a key to this machine (purchased): fetch it, the button offers to activate it.
      const claimed = await trialClaim(mid);
      return claimed.grant ? trialGrantView(claimed.grant) : trialView('error', TRIAL_MSG_NET);
    }
    case 'eligible':
      // "Reset Dùng thử" by the admin: drop the local "already got a trial key" mark before looking at it.
      await trialApplyServerReset(res.reset_token);
      if (await trialDoneCheck(mid)) return trialView('hidden', 'Máy này đã nhận key dùng thử rồi nên không thể yêu cầu thêm.');
      return trialView('eligible', 'Dùng thử miễn phí: gửi email để được duyệt.');
    case 'trial_pending':
    case 'trial_approved':
      return trialView('sent', 'Máy này đã gửi yêu cầu dùng thử. Vui lòng chờ quản trị viên liên hệ qua email.', { enabled: false });
    case 'has_license':
      await trialStateClear();
      return trialView('hidden', 'Máy chủ ghi nhận máy này đang có bản quyền nên không thể dùng thử. Hãy nhập key vào ô bên cạnh.');
    case 'had_license':
      return trialView('hidden', 'Máy này đã từng sử dụng bản quyền nên không thể yêu cầu dùng thử.');
    case 'trial_rejected':
      await trialStateClear();
      return trialView('rejected', TRIAL_MSG_REJECTED);
    default:
      return trialView('hidden', res.message || 'Không thể yêu cầu dùng thử trên máy này.');
  }
}

// Ask for the result of the request sent from this install; when the server grants a key, keep it.
// notice = a sentence for the popup to show after a click (not after the silent background check).
async function trialCheckStatus() {
  const st = await trialStateLoad();
  if (!st) return trialRefresh();
  const mid = await trialMachineId();
  if (!mid) return Object.assign(trialStoredView(st), { error: true, notice: TRIAL_MSG_NO_MID });

  const res = await trialApiCall('status', mid, String(st.request_id), { request_id: st.request_id, poll_token: st.poll_token });
  if (res.status !== 'ok') {
    if (res.code === 'not_found') {
      await trialStateClear();   // the request is gone from the server: check again from the start
      return trialRefresh();
    }
    return Object.assign(trialStoredView(st), { error: true, notice: res.message || TRIAL_MSG_NET });
  }

  const key = licenseNormalizeKey(res.license_key);
  if (res.state === 'approved' && key) {
    await trialStateSave(Object.assign({}, st, { received: true, key: key, days: res.days === undefined ? null : res.days }));
    await trialDoneMark(mid);
    return trialView('received', TRIAL_MSG_GOT_KEY);
  }
  if (res.state === 'activated') {
    await trialStateClear();
    return trialView('hidden', '', { activated: true });
  }
  if (res.state === 'rejected') {
    await trialStateClear();
    return trialView('rejected', TRIAL_MSG_REJECTED, { error: true, notice: 'Không nhận được key dùng thử.' });
  }
  const waiting = !res.state || res.state === 'pending' || res.state === 'approved';
  return Object.assign(trialStoredView(st), {
    notice: waiting ? 'Đang đợi Máy chủ cấp key.' : 'Không rõ trạng thái yêu cầu. Vui lòng thử lại sau.',
  });
}

// "Đã nhận key, nhấn để kích hoạt": activate the key the server granted, exactly like a key typed in the popup.
async function trialActivate() {
  const st = await trialStateLoad();
  // A purchased key granted by the admin wins over a received trial key (same as Multi Phone Manager); with no grant
  // (or no answer from the server) the stored trial key is used.
  const mid = await trialMachineId();
  const claimed = mid ? await trialClaim(mid) : { grant: null };
  const grant = claimed.grant;
  const key = grant ? grant.key : (st && st.key ? licenseNormalizeKey(st.key) : '');
  if (!key) return { ok: false, verdict: 'no_key', message: 'Không tìm thấy key dùng thử trên máy này.' };
  const result = await licenseActivate(key);
  if (result && result.ok) {
    await trialStateClear();
    const days = !grant && st && st.days !== undefined ? st.days : null;
    return Object.assign({}, result, { granted: !!grant, trial_days: days });
  }
  return result;   // the key stays stored (or granted on the server), so the button can be pressed again
}

// Silent check while the popup stays open and the machine has no license: is a granted key waiting for this machine?
// -> the button view when one is waiting; otherwise {ok:true}, plus revoked:true when the server answered "no key".
async function trialGrantPoll() {
  if ((await licenseEvaluate()).licensed === true) return { ok: true };
  const mid = await trialMachineId();
  if (!mid) return { ok: true };
  const claimed = await trialClaim(mid);
  if (claimed.grant) return trialGrantView(claimed.grant);
  return { ok: true, revoked: claimed.ok };
}

// Step 1: mail a 6-digit confirmation code to the address.
async function trialSendCode(rawEmail) {
  const email = String(rawEmail == null ? '' : rawEmail).trim();
  if (!trialValidEmail(email)) return trialError('invalid_email', TRIAL_MSG_EMAIL);
  const mid = await trialMachineId();
  if (!mid) return trialError('no_machine_id', TRIAL_MSG_NO_MID);
  return trialApiCall('send_code', mid, email, { email: email });
}

// Vietnamese mobile number: 10 digits starting with 03 / 05 / 07 / 08 / 09, also written +84 or 84 followed by the 9 digits
// after the leading 0. Spaces . - ( ) between digits are ignored. Returns the number as 0xxxxxxxxx, '' when empty (the phone is
// optional) or null when it is not a Vietnamese mobile number. popup.js has the same rule for the dialog.
function trialNormalizePhoneVN(raw) {
  const compact = String(raw == null ? '' : raw).replace(/[\s.\-()]/g, '');
  if (!compact) return '';
  const m = /^(?:\+84|84|0)([35789]\d{8})$/.exec(compact);
  return m ? '0' + m[1] : null;
}

// Step 2: send the request with the code; on success remember request_id + poll_token for the status checks.
async function trialRequest(rawEmail, rawPhone, rawCode) {
  const email = String(rawEmail == null ? '' : rawEmail).trim();
  const phone = trialNormalizePhoneVN(rawPhone);
  const code = String(rawCode == null ? '' : rawCode).replace(/\D/g, '');
  if (!trialValidEmail(email)) return trialError('invalid_email', TRIAL_MSG_EMAIL);
  if (code.length !== 6) return trialError('code_required', 'Vui lòng nhập mã xác nhận gồm 6 chữ số.');
  if (phone === null) return trialError('invalid_phone', TRIAL_MSG_PHONE);
  const mid = await trialMachineId();
  if (!mid) return trialError('no_machine_id', TRIAL_MSG_NO_MID);
  if (await trialDoneCheck(mid)) {
    return trialError('trial_done', 'Máy này đã nhận key dùng thử rồi.\nMỗi máy chỉ được dùng thử 1 lần duy nhất.');
  }

  // The code is not part of the signature (same as the desktop app).
  const res = await trialApiCall('request', mid, email + '|' + phone, { email: email, phone: phone, code: code });
  if (res.status !== 'ok') return res;
  if (!res.request_id || !res.poll_token) return trialError('invalid_response', 'Không gửi được yêu cầu. Vui lòng thử lại.');
  const saved = await trialStateSave({ request_id: res.request_id, poll_token: res.poll_token, email: email, created_at: licenseNowSec() });
  if (!saved) return trialError('storage_error', LICENSE_MESSAGES.storage_error);
  return { status: 'ok', saved: true };   // poll_token stays inside the service worker
}

function trialOnMessage(msg, sender, sendResponse) {
  if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string' || msg.type.indexOf('TRIAL_') !== 0) return false;
  // The trial flow belongs to the popup only: this extension's own pages, never a content script.
  if (!sender || sender.id !== chrome.runtime.id || !licenseIsExtensionPage(sender)) return false;
  let job;
  switch (msg.type) {
    case 'TRIAL_REFRESH':
      job = trialRefresh();
      break;
    case 'TRIAL_STATUS':
      job = trialCheckStatus();
      break;
    case 'TRIAL_SEND_CODE':
      job = trialSendCode(msg.email);
      break;
    case 'TRIAL_REQUEST':
      job = trialRequest(msg.email, msg.phone, msg.code);
      break;
    case 'TRIAL_ACTIVATE':
      job = trialActivate();
      break;
    case 'TRIAL_CLAIM':
      job = trialGrantPoll();
      break;
    default:
      return false;
  }
  job.then(sendResponse, () => sendResponse({ ok: false, status: 'error', code: 'internal_error', message: LICENSE_MESSAGES.internal_error }));
  return true;
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
chrome.runtime.onMessage.addListener(trialOnMessage);
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
