// ===== [Download] License module import =====
import { getDownloadResolverProof, licenseCheckIfStale } from './license.js';
// ===== [/Download] License module import =====

// These are the privileged operations behind preview, player and download.
// The UI flag is only a display hint; each protected call verifies the signed
// license blob and, when needed, a fresh online check before it can use an
// extension API.
const __licenseRequiredError = () => new Error('LICENSE_REQUIRED');
const __licenseProtectedUrl = (value) => {
  try {
    const url = new URL(typeof value === 'string' ? value : (value && value.url) || '');
    return /(^|\.)tiktok\.com$/i.test(url.hostname);
  } catch {
    return false;
  }
};
const __licenseAllows = async () => {
  const result = await licenseCheckIfStale();
  return !!(result && result.status && result.status.licensed === true);
};

try {
  const __nativeFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (...args) => {
    if (__licenseProtectedUrl(args[0]) && !(await __licenseAllows())) throw __licenseRequiredError();
    return __nativeFetch(...args);
  };
} catch {}

try {
  const __nativeDownload = chrome.downloads.download.bind(chrome.downloads);
  chrome.downloads.download = async (...args) => {
    if (!(await __licenseAllows())) throw __licenseRequiredError();
    return __nativeDownload(...args);
  };
} catch {}

try {
  const __nativeTabCreate = chrome.tabs.create.bind(chrome.tabs);
  chrome.tabs.create = async (...args) => {
    if (__licenseProtectedUrl(args[0]) && !(await __licenseAllows())) throw __licenseRequiredError();
    return __nativeTabCreate(...args);
  };
} catch {}

try {
  const __nativeWindowCreate = chrome.windows.create.bind(chrome.windows);
  chrome.windows.create = async (...args) => {
    const requestedUrl = args[0] && args[0].url;
    if (typeof requestedUrl === 'string' && requestedUrl.indexOf(chrome.runtime.getURL('segments.html')) === 0 && !(await __licenseAllows())) {
      throw __licenseRequiredError();
    }
    return __nativeWindowCreate(...args);
  };
} catch {}

// A successful activation makes already-open TikTok tabs usable immediately.
// The injected file has its own singleton and checks the license flag again.
const __licenseStartTikTokUi = async () => {
  try {
    const tabs = await chrome.tabs.query({ url: ['*://*.tiktok.com/*'] });
    await Promise.all((tabs || []).filter((tab) => Number.isInteger(tab.id)).map((tab) =>
      chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['assets/multi-select.js'] }).catch(() => {})
    ));
  } catch {}
};
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.tik_license_flag && changes.tik_license_flag.newValue?.licensed === true) {
    __licenseStartTikTokUi();
  }
});

// The resolver owns the only official path that turns a TikTok page URL into
// a downloadable media URL. It receives a fresh, server-signed license proof,
// verifies the proof and current key/device row, then resolves the source on
// the server itself.
// The resulting media stream still goes directly from the upstream CDN to the
// browser; this shared host never proxies video bytes.
const __downloadResolverEndpoint = 'https://clipmaster.thangpham.io.vn/resolve_download_v1.php';
const __resolverInflight = new Map();

function __resolverError(code) {
  const error = new Error(code || 'resolver_unavailable');
  error.code = code || 'resolver_unavailable';
  return error;
}

function __resolverMessage(code) {
  const messages = {
    LICENSE_REQUIRED: 'Vui lòng kích hoạt key trước khi tải.',
    invalid_video_url: 'Liên kết video TikTok không hợp lệ.',
    invalid_license_proof: 'Không xác thực được key. Hãy kiểm tra lại key trong tiện ích.',
    license_not_active: 'Key không còn hiệu lực hoặc đã bị chặn.',
    upstream_unavailable: 'Nguồn video đang tạm không phản hồi. Hãy thử lại sau.',
    resolver_unavailable: 'Máy chủ tải video đang tạm không phản hồi. Hãy thử lại sau.',
  };
  return messages[code] || 'Không thể chuẩn bị video để tải. Hãy thử lại sau.';
}

function __validTikTokVideoUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:'
      && /(^|\.)tiktok\.com$/i.test(url.hostname)
      && /\/video\/\d{6,32}(?:\/|$)/.test(url.pathname);
  } catch {
    return false;
  }
}

async function __resolveDownloadViaServer(videoUrl) {
  if (!__validTikTokVideoUrl(videoUrl)) throw __resolverError('invalid_video_url');
  const proof = await getDownloadResolverProof();
  if (!proof) throw __licenseRequiredError();
  const response = await fetch(__downloadResolverEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      license_data: proof.license_data,
      license_signature: proof.license_signature,
      video_url: String(videoUrl),
    }).toString(),
    credentials: 'omit',
    cache: 'no-store',
  });
  let payload = null;
  try { payload = await response.json(); } catch {}
  if (!response.ok || !payload || payload.success !== true || !payload.data || typeof payload.data.videoUrl !== 'string') {
    throw __resolverError(payload && typeof payload.code === 'string' ? payload.code : 'resolver_unavailable');
  }
  return payload.data;
}

async function __resolveProfileShopViaServer(username) {
  const cleanUsername = String(username || '').trim();
  if (!/^[A-Za-z0-9_.]{1,30}$/.test(cleanUsername)) throw __resolverError('invalid_request');
  const proof = await getDownloadResolverProof();
  if (!proof) throw __licenseRequiredError();
  const response = await fetch(__downloadResolverEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      license_data: proof.license_data,
      license_signature: proof.license_signature,
      action: 'profile_shop',
      username: cleanUsername,
    }).toString(),
    credentials: 'omit',
    cache: 'no-store',
  });
  let payload = null;
  try { payload = await response.json(); } catch {}
  if (!response.ok || !payload || payload.success !== true || !payload.data || !Array.isArray(payload.data.shopVideoIds)) {
    throw __resolverError(payload && typeof payload.code === 'string' ? payload.code : 'resolver_unavailable');
  }
  return {
    shopVideoIds: payload.data.shopVideoIds.filter((id) => /^\d{6,32}$/.test(String(id))).map(String),
    totalScanned: Math.max(0, Number(payload.data.totalScanned) || 0),
  };
}

async function __resolveDownloadShared(videoUrl) {
  const key = String(videoUrl || '');
  if (__resolverInflight.has(key)) return __resolverInflight.get(key);
  const pending = __resolveDownloadViaServer(key).finally(() => __resolverInflight.delete(key));
  __resolverInflight.set(key, pending);
  return pending;
}

async function __serverMetadata(videoUrl) {
  try {
    return { success: true, data: await __resolveDownloadShared(videoUrl) };
  } catch (error) {
    return { success: false, error: __resolverMessage((error && error.code) || (error && error.message)) };
  }
}

async function __serverDownload(videoUrl, requestedFilename) {
  try {
    const data = await __resolveDownloadShared(videoUrl);
    const idMatch = String(videoUrl).match(/\/video\/(\d+)/);
    const fallbackId = idMatch ? idMatch[1].slice(-8) : Date.now().toString();
    const filename = requestedFilename && String(requestedFilename).trim()
      ? Gt(String(requestedFilename).trim()) + '.mp4'
      : wt(data.author, data.title, fallbackId);
    const jobId = await chrome.downloads.download({
      url: data.videoUrl,
      filename,
      saveAs: await __getAskWhereToSave(),
    });
    return { success: true, jobId: String(jobId) };
  } catch (error) {
    return { success: false, error: __resolverMessage((error && error.code) || (error && error.message)) };
  }
}

async function __serverProfileShop(username) {
  try {
    const data = await __resolveProfileShopViaServer(username);
    return { success: true, ...data };
  } catch (error) {
    return { success: false, shopVideoIds: [], totalScanned: 0, error: __resolverMessage((error && error.code) || (error && error.message)) };
  }
}
const ot=(...t)=>{};chrome.runtime.onMessage.addListener((t,e,s)=>{switch(t.type){case"TIKTOK_DOWNLOAD":return __serverDownload(t.url,t.filename).then(s),!0;case"GET_TIKTOK_METADATA":return __serverMetadata(t.url).then(s),!0;case"__DOWNLOAD_MULTI_FETCH_BYTES__":return __fetchBytesForChosenFolder(t.url).then(s),!0;case"GET_DOWNLOADDUCT":return Lt(t.url,t.strongSignal===!0).then(s),!0;case"OPEN_PRODUCT_TAB":{const r=String(t.url||"");return/^https:\/\/(www\.)?tiktok\.com\//i.test(r)||/^https:\/\/vm\.tiktok\.com\//i.test(r)?(chrome.tabs.create({url:r,active:!0}).catch(c=>ot("[BG] open tab fail:",c)),!1):(ot("[BG] OPEN_PRODUCT_TAB rejected non-TikTok URL:",r.slice(0,80)),!1)}case"GET_TIKTOK_PDP_INFO":return At(t.url).then(s),!0;case"GET_PROFILE_SHOP_VIDEOS":return __serverProfileShop(t.username).then(s),!0;default:return!1}});async function __getAskWhereToSave(){try{const r=await chrome.storage.local.get("askWhereToSave");return r&&r.askWhereToSave===!0}catch{return!1}}function wt(t,e,s){const r=(t||"tiktok").trim(),a=(e||"").trim(),c=a?r+" - "+a:r+" - "+s;return Gt(c)+".mp4"}const lt=new Map,J=new Map,bt=5*60*1e3;async function At(t){if(!t||!/\/shop\/[^/]+\/pdp\//.test(t))return{success:!1,error:"not_a_pdp_url"};const e=(t.match(/^https?:\/\/[^/]+\/shop\/[^/]+\/pdp\/[^/]+\/\d+/)||[t])[0];try{const s=lt.get(e);if(s&&Date.now()-s.ts<bt)return{success:!0,data:s.info};const r=J.get(e);if(r)return{success:!0,data:await r};const a=ct(e).then(l=>(lt.set(e,{info:l,ts:Date.now()}),J.delete(e),l)).catch(l=>{throw J.delete(e),l});return J.set(e,a),{success:!0,data:await a}}catch(s){return{success:!1,error:s.message}}}async function ct(t){var a,c;await nt();const e=await fetch(t,{method:"GET",credentials:"include",redirect:"follow",headers:{Accept:"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8","Accept-Language":"vi-VN,vi;q=0.9,en;q=0.8"}});if(!e.ok)throw new Error(`PDP fetch ${e.status}`);const s=await e.text(),r=((c=(a=s.match(/<title[^>]*>([^<]+)<\/title>/))==null?void 0:a[1])==null?void 0:c.trim())||"";if(/^(security check|please verify|verify to continue|please complete|access denied)$/i.test(r)||/captcha|secsdk-captcha|verify[-_]?modal/i.test(s.slice(0,5e3)))throw new Error("pdp_captcha_or_rate_limited");return Pt(s)}function K(t,e,s=0){const r=`"${e}":`;let a=s;for(;a<t.length;){const c=t.indexOf(r,a);if(c<0)return null;const l=t.indexOf("{",c+r.length);if(l<0)return null;let u=0,d=!1,m=!1;const S=Math.min(t.length,l+2e5);for(let A=l;A<S;A++){const y=t[A];if(m){m=!1;continue}if(y==="\\"&&d){m=!0;continue}if(y==='"'){d=!d;continue}if(!d){if(y==="{")u++;else if(y==="}"&&(u--,u===0))try{return{obj:JSON.parse(t.slice(l,A+1)),endIdx:A+1}}catch{break}}}a=l+1}return null}function Pt(t){var I,f,p,w,T,D,L,C,R,O,F,E,V,G,$,M,v;const e={},s=K(t,"product_model"),r=s==null?void 0:s.obj,a=(s==null?void 0:s.endIdx)??0,c=K(t,"price_info",a),l=K(t,"rating_info",a),u=K(t,"default_sku",a),d=K(t,"sku_list",a);if(r&&typeof r=="object"){if(!e.title){const i=r.name||r.title||r.product_name||r.product_title||r.display_name;i&&(e.title=String(i).slice(0,200))}if(!e.soldCount&&r.sold_count!==void 0&&r.sold_count!==0&&r.sold_count!=="0"&&(e.soldCount=String(r.sold_count)),!e.imageUrl){const i=((p=(f=(I=r.main_images)==null?void 0:I[0])==null?void 0:f.url_list)==null?void 0:p[0])||((D=(T=(w=r.images)==null?void 0:w[0])==null?void 0:T.url_list)==null?void 0:D[0])||r.cover_url||((C=(L=r.cover)==null?void 0:L.url_list)==null?void 0:C[0]);i&&(e.imageUrl=String(i))}}if(!e.title){const i=K(t,"product_info"),o=i==null?void 0:i.obj;if(o&&typeof o=="object"){const _=o.title||o.name||o.product_name||o.product_title;_&&(e.title=String(_).slice(0,200))}}if(!e.title){const i=t.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i)||t.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i);if(i!=null&&i[1]){let o=i[1].trim();o=o.replace(/\s*[\|·\-–—]\s*(TikTok Shop|TikTok)\s*$/i,"").trim(),o&&o.length>3&&(e.title=o.slice(0,200))}}if(!e.title){const i=t.match(/<title[^>]*>([^<]+)<\/title>/);if(i!=null&&i[1]){let o=i[1].trim();o=o.replace(/\s*[\|·\-–—]\s*(TikTok Shop|TikTok)\s*$/i,"").trim(),o&&o.length>3&&!/^(TikTok|TikTok Shop|Login|Verify)$/i.test(o)&&(e.title=o.slice(0,200))}}if(!e.title){const i=/"(?:product_name|product_title|elastic_title)"\s*:\s*"([^"\\]{4,200})"/,o=t.match(i);o!=null&&o[1]&&(e.title=o[1].slice(0,200))}const m=[c==null?void 0:c.obj,r==null?void 0:r.price_info,r==null?void 0:r.priceInfo,u==null?void 0:u.obj,r==null?void 0:r.default_sku].filter(Boolean);for(const i of m){if(e.price)break;if(e.price=i.format_price||i.price_str||i.price||i.sale_price_str||i.sale_price||i.current_price_str||i.current_price||i.real_price_str||i.real_price,!e.originalPrice){const o=i.market_price_str||i.market_price||i.origin_price_str||i.origin_price||i.list_price_str||i.list_price;o&&o!==e.price&&o!==0&&o!=="0"&&(e.originalPrice=String(o))}}if(!e.price&&(d!=null&&d.obj)){const i=Array.isArray(d.obj)?d.obj:Array.isArray(d.obj.skus)?d.obj.skus:Array.isArray(d.obj.list)?d.obj.list:[];for(const o of i){if(!o||typeof o!="object")continue;const _=o.format_price||o.price_str||o.price||o.sale_price_str||o.sale_price||((R=o.price_info)==null?void 0:R.format_price)||((O=o.price_info)==null?void 0:O.price);if(_&&_!==0&&_!=="0"){e.price=String(_);break}}}if(!e.price&&r&&Array.isArray(r.skus))for(const i of r.skus){if(!i||typeof i!="object")continue;const o=i.format_price||i.price_str||i.price||i.sale_price_str||i.sale_price||((F=i.price_info)==null?void 0:F.format_price)||((E=i.price_info)==null?void 0:E.price);if(o&&o!==0&&o!=="0"){e.price=String(o);break}}if(e.price&&/^\d+$/.test(String(e.price))){const i=Number(e.price);Number.isFinite(i)&&i>=1e3&&(e.price=`đ${i.toLocaleString("vi-VN")}`)}if(e.originalPrice&&/^\d+$/.test(String(e.originalPrice))){const i=Number(e.originalPrice);Number.isFinite(i)&&i>=1e3&&(e.originalPrice=`đ${i.toLocaleString("vi-VN")}`)}if(e.price&&/^[đ₫]?0+$/.test(String(e.price).replace(/[.,\s]/g,""))&&(e.price=void 0),!e.price){const i=(V=t.match(/"sale_price_format"\s*:\s*"([^"]+)"/))==null?void 0:V[1],o=(G=t.match(/"origin_price_format"\s*:\s*"([^"]+)"/))==null?void 0:G[1],_=(($=t.match(/"price_prefix"\s*:\s*"([^"]+)"/))==null?void 0:$[1])||"",k=/["']?(VND|VNĐ)["']?/i.test(t.slice(0,2e5)),g=!_||/^(t[ưừ]|from)$/i.test(_.trim())?k?"₫":"đ":_;i&&i!=="0"&&(e.price=`${g}${i}`),!e.originalPrice&&o&&o!==i&&o!=="0"&&(e.originalPrice=`${g}${o}`)}if(!e.price){const i=(M=t.match(/"sale_price_decimal"\s*:\s*"?(\d+)"?/))==null?void 0:M[1],o=(v=t.match(/"origin_price_decimal"\s*:\s*"?(\d+)"?/))==null?void 0:v[1];if(i&&i!=="0"){const _=Number(i);Number.isFinite(_)&&_>=1e3&&(e.price=`đ${_.toLocaleString("vi-VN")}`)}if(!e.originalPrice&&o&&o!=="0"&&o!==i){const _=Number(o);Number.isFinite(_)&&_>=1e3&&(e.originalPrice=`đ${_.toLocaleString("vi-VN")}`)}}if(!e.price){const i=[],o=/(?:đ|₫|\\u0111|\\u20ab)([\d.]+)/gi;let _;for(;(_=o.exec(t))!==null;){const k=Number(_[1].replace(/\./g,""));if(Number.isFinite(k)&&k>=1e3&&k<=1e9&&i.push(k),i.length>200)break}if(i.length){const k=new Map;for(const P of i)k.set(P,(k.get(P)??0)+1);const n=[...k.entries()].sort((P,x)=>x[1]-P[1]).slice(0,2).map(P=>P[0]).sort((P,x)=>P-x);n[0]&&(e.price=`đ${n[0].toLocaleString("vi-VN")}`,n[1]&&n[1]>n[0]&&(e.originalPrice=`đ${n[1].toLocaleString("vi-VN")}`))}}if(!e.rating){const i=t.match(/"product_overall_score"\s*:\s*"?([\d.]+)"?/)||t.match(/"product_rating"\s*:\s*"?([\d.]+)"?/)||t.match(/"average_rating"\s*:\s*"?([\d.]+)"?/)||t.match(/"avg_rating"\s*:\s*"?([\d.]+)"?/)||t.match(/"avg_rate"\s*:\s*"?([\d.]+)"?/)||t.match(/"product_rate"\s*:\s*"?([\d.]+)"?/)||t.match(/"rating_value"\s*:\s*"?([\d.]+)"?/)||t.match(/"score"\s*:\s*([\d.]+)/)||t.match(/"rating"\s*:\s*([\d.]+)/);i!=null&&i[1]&&i[1]!=="0"&&i[1]!=="0.0"&&(e.rating=i[1])}if(!e.reviewCount){const i=t.match(/"product_review_count"\s*:\s*"?(\d+)"?/)||t.match(/"review_count"\s*:\s*"?(\d+)"?/)||t.match(/"rating_count"\s*:\s*"?(\d+)"?/)||t.match(/"total_reviews"\s*:\s*"?(\d+)"?/)||t.match(/"comments_count"\s*:\s*"?(\d+)"?/);i!=null&&i[1]&&i[1]!=="0"&&(e.reviewCount=i[1])}const S=[l==null?void 0:l.obj,r==null?void 0:r.rating_info,r==null?void 0:r.ratingInfo,r==null?void 0:r.product_rating_info].filter(Boolean);for(const i of S){if(e.rating&&e.reviewCount)break;if(!e.rating){const o=i.rating||i.product_rating||i.average_rating||i.rating_value;o!==void 0&&o!==0&&o!=="0"&&o!=="0.0"&&(e.rating=String(o))}if(!e.reviewCount){const o=i.review_count||i.rating_count||i.product_rating_count;o!==void 0&&o!==0&&o!=="0"&&(e.reviewCount=String(o))}}!e.rating&&(r!=null&&r.product_rating)&&(e.rating=String(r.product_rating)),!e.reviewCount&&(r!=null&&r.review_count)&&(e.reviewCount=String(r.review_count));const A=t.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g)||[];for(const i of A){const o=i.replace(/^<script[^>]*>/,"").replace(/<\/script>$/,"").trim();try{const _=JSON.parse(o),k=Array.isArray(_)?_:[_];for(const g of k){if(!g||typeof g!="object")continue;const n=g["@type"];if(n==="Product"||n==="product"||Array.isArray(n)&&n.includes("Product")){const P=g.offers,x=Array.isArray(P)?P:P?[P]:[];for(const b of x){if(!e.price){const U=b.price||b.lowPrice,q=b.priceCurrency||b.currency;U&&(e.price=Q(U,q))}!e.originalPrice&&b.highPrice&&b.highPrice!==b.lowPrice&&(e.originalPrice=Q(b.highPrice,b.priceCurrency))}const N=g.aggregateRating;if(N&&(!e.rating&&N.ratingValue!==void 0&&(e.rating=String(N.ratingValue)),!e.reviewCount&&(N.reviewCount!==void 0||N.ratingCount!==void 0)&&(e.reviewCount=String(N.reviewCount??N.ratingCount))),!e.description&&g.description&&(e.description=String(g.description).slice(0,600)),!e.imageUrl){const b=g.image;typeof b=="string"?e.imageUrl=b:Array.isArray(b)&&typeof b[0]=="string"&&(e.imageUrl=b[0])}}}}catch{}}if(!e.price){const i=t.match(/<meta[^>]+property=["']og:price:amount["'][^>]+content=["']([^"']+)["']/i)||t.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:price:amount["']/i),o=t.match(/<meta[^>]+property=["']og:price:currency["'][^>]+content=["']([^"']+)["']/i)||t.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:price:currency["']/i);i!=null&&i[1]&&(e.price=Q(i[1],o==null?void 0:o[1]))}const y=i=>i.replace(/\\u0111/gi,"đ").replace(/\\u20ab/gi,"₫").replace(/\\u20AB/gi,"₫");if(!e.price){const i=t.match(/"price_str"\s*:\s*"([^"]+)"/)||t.match(/"format_price"\s*:\s*"([^"]+)"/)||t.match(/"sale_price_str"\s*:\s*"([^"]+)"/)||t.match(/"discount_price_str"\s*:\s*"([^"]+)"/)||t.match(/"current_price_str"\s*:\s*"([^"]+)"/);if(i!=null&&i[1]){const o=y(i[1]);o.replace(/[^\d]/g,"").replace(/^0+$/,"")&&(e.price=o)}}if(!e.price){const i=t.match(/"sale_price"\s*:\s*(\d{4,})/)||t.match(/"current_price"\s*:\s*(\d{4,})/)||t.match(/"real_price"\s*:\s*(\d{4,})/)||t.match(/"product_price"\s*:\s*(\d{4,})/);if(i!=null&&i[1]){const o=Number(i[1]);Number.isFinite(o)&&o>0&&(e.price=`đ${o.toLocaleString("vi-VN")}`)}}if(!e.originalPrice){const i=t.match(/"market_price_str"\s*:\s*"([^"]+)"/)||t.match(/"original_price_str"\s*:\s*"([^"]+)"/)||t.match(/"list_price_str"\s*:\s*"([^"]+)"/);if(i!=null&&i[1]){const o=y(i[1]);o.replace(/[^\d]/g,"").replace(/^0+$/,"")&&(e.originalPrice=o)}}if(!e.originalPrice){const i=t.match(/"market_price"\s*:\s*(\d{4,})/)||t.match(/"original_price"\s*:\s*(\d{4,})/);if(i!=null&&i[1]){const o=Number(i[1]);Number.isFinite(o)&&o>0&&(e.originalPrice=`đ${o.toLocaleString("vi-VN")}`)}}if(!e.soldCount){const i=t.match(/"sold_count"\s*:\s*"?(\d[\d,.kKmM]*)"?/)||t.match(/"sales_count"\s*:\s*"?(\d[\d,.kKmM]*)"?/)||t.match(/"sold"\s*:\s*"?(\d[\d,.kKmM]+)"?/);i!=null&&i[1]&&i[1]!=="0"&&(e.soldCount=i[1])}if(!e.rating){const i=t.match(/"product_rating"\s*:\s*"?([\d.]+)"?/)||t.match(/"average_rating"\s*:\s*"?([\d.]+)"?/)||t.match(/"rating_value"\s*:\s*"?([\d.]+)"?/)||t.match(/"score"\s*:\s*"?([\d.]+)"?[\s,}]/);i!=null&&i[1]&&i[1]!=="0"&&i[1]!=="0.0"&&(e.rating=i[1])}if(!e.reviewCount){const i=t.match(/"review_count"\s*:\s*"?(\d+)"?/)||t.match(/"rating_count"\s*:\s*"?(\d+)"?/)||t.match(/"product_rating_count"\s*:\s*"?(\d+)"?/);i!=null&&i[1]&&i[1]!=="0"&&(e.reviewCount=i[1])}const h=[];if(/HÀNG\s*VIỆT|HANG_VIET|HangViet/.test(t)&&h.push("HÀNG VIỆT"),h.length&&(e.tags=h),!e.price||!e.rating){const i={},o=t.indexOf('"product_info":');if(o>=0){const x=t.indexOf("{",o);if(x>=0){const N=[];let b=0,U=!1,q=!1;const z=Math.min(t.length,x+5e4);for(let j=x;j<z&&N.length<25;j++){const B=t[j];if(q){q=!1;continue}if(B==="\\"&&U){q=!0;continue}if(B==='"'){if(U=!U,U&&b===1){const H=t.indexOf('"',j+1);if(H>j&&H-j<80){const st=t.slice(j+1,H);t.charAt(H+1)===":"&&!st.includes("\\")&&(N.push(st),j=H,U=!1)}}continue}if(!U){if(B==="{")b++;else if(B==="}"&&(b--,b===0))break}}i.product_info_top_keys=N}}const _=t.match(/đ[\d.,]+/g)||[],k=t.match(/\\u0111[\d.,]+/g)||[],g=t.match(/[\d.,]+\s*₫/g)||[];i.dong_patterns=[..._.slice(0,6),...k.slice(0,6),...g.slice(0,6)];const n=t.match(/"[a-z_]*price[a-z_]*"\s*:\s*"?[^,"}\]]{1,40}/gi)||[];i.price_shaped_keys=n.filter(x=>!/:\s*"?0+"?/.test(x)).slice(0,15);const P=t.match(/"[a-z_]*(?:rate|rating|review|score|star)[a-z_]*"\s*:\s*"?[^,"}\]]{1,40}/gi)||[];i.rating_shaped_keys=P.filter(x=>!/:\s*"?0+"?/.test(x)).slice(0,15),i.found_price_info=t.indexOf('"price_info"')>=0,i.found_rating_info=t.indexOf('"rating_info"')>=0,i.found_default_sku=t.indexOf('"default_sku"')>=0,i.found_sku_list=t.indexOf('"sku_list"')>=0,i.found_sale_price_info=t.indexOf('"sale_price_info"')>=0,i.found_discount_info=t.indexOf('"discount_info"')>=0,e._debug=i}return e}function Q(t,e){if(t==null)return"";const s=typeof t=="number"?t:Number(String(t).replace(/[^\d.-]/g,""));if(!Number.isFinite(s)||s<=0)return"";const r=s.toLocaleString("vi-VN"),a=(e||"").toUpperCase()==="VND"?"đ":e||"";return a?`${a}${r}`:r}const gt="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",ut=9001;let dt=!1;async function nt(){if(!dt)try{await chrome.declarativeNetRequest.updateSessionRules({removeRuleIds:[ut],addRules:[{id:ut,priority:1,action:{type:"modifyHeaders",requestHeaders:[{header:"User-Agent",operation:"set",value:gt}]},condition:{urlFilter:"||tiktok.com/",resourceTypes:["xmlhttprequest","main_frame","sub_frame","other"],tabIds:[-1]}}]}),dt=!0}catch{}}async function It(t,e="include"){var p,w,T,D,L;await nt();const s=t.match(/\/video\/(\d+)/);if(!s)throw new Error("URL không có video ID");const r=s[1],a=t.match(/@([^/?#]+)/),l=`https://www.tiktok.com/@${a?a[1]:"_"}/video/${r}`,u=await fetch(l,{method:"GET",credentials:e,redirect:"follow",headers:{Accept:"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8","Accept-Language":"vi-VN,vi;q=0.9,en;q=0.8"}});if(!u.ok)throw new Error(`Mobile fetch ${u.status}`);const d=await u.text(),m=((p=d.match(/<title[^>]*>([^<]+)<\/title>/))==null?void 0:p[1])||"";if(/^(security check|please verify|verify to continue|please complete|access denied)$/i.test(m.trim())||/captcha|secsdk-captcha|verify[-_]?modal/i.test(d.slice(0,5e3)))throw new Error("captcha_or_rate_limited");const S={htmlSize:d.length,titleTag:m.slice(0,120),hasCommerceProductInfoStr:d.includes("commerceProductInfo")||d.includes("commerce_product_info"),hasProductId:/"product_id"\s*:/.test(d),hasFormatPrice:/"format_price"\s*:/.test(d),hasAnchorType33:/"type"\s*:\s*33\b/.test(d),hasLoginWall:/login|verify|captcha|too many requests|redirect/i.test(m),htmlHead:d.slice(0,400)},A=d.match(/<script[^>]*id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/);if(!A)return{product:null,debug:{error:"no_universal_data_script",...S}};let y;try{y=JSON.parse(A[1])}catch(C){return{product:null,debug:{error:"parse_fail",msg:C.message,...S}}}const h=(D=(T=(w=y==null?void 0:y.__DEFAULT_SCOPE__)==null?void 0:w["webapp.video-detail"])==null?void 0:T.itemInfo)==null?void 0:D.itemStruct;if(!h){const C=d.match(/tiktok\.com\/shop\/[a-z]{2}\/pdp\/([^/"'\s\\)]+)\/(\d{6,})/i);if(C){const R=C[1],O=C[2],F=`https://www.tiktok.com/shop/vn/pdp/${R}/${O}`,E=[],V=d.match(/"elastic_title"\s*:\s*"([^"]{3,80})"/);V&&E.push({src:"elastic_title",text:V[1]});const G=/"keyword"\s*:\s*"([^"\\]{3,80})"/g;let $;for(;($=G.exec(d))!==null;){const n=$[1];if(!/capcut|edit like|editing made|template|effect|tiktok shop/i.test(n)&&(E.push({src:"keyword",text:n}),E.length>8))break}const M=/\\"keyword\\"\s*:\s*\\"([^"\\]{3,80})\\"/g;let v;for(;(v=M.exec(d))!==null;){const n=v[1];if(!/capcut|edit like|editing made|template|effect|tiktok shop/i.test(n)&&(E.push({src:"escaped_keyword",text:n}),E.length>12))break}const i=d.match(/\\"elastic_title\\"\s*:\s*\\"([^"\\]{3,80})\\"/);i&&E.push({src:"escaped_elastic_title",text:i[1]});const o=d.match(/<span class="[^"]*SpanAnchorTitle[^"]*">([^<]{3,100})<\/span>/);if(o){const n=o[1].trim();/capcut|edit like|editing made|template|effect|tiktok shop/i.test(n)||E.push({src:"SpanAnchorTitle",text:n})}const _=d.match(/<meta\s+(?:property|name)="og:title"\s+content="([^"]{3,200})"/i);_&&E.push({src:"og:title",text:_[1]});let k="";for(const n of E)if(n.text.length<=60&&!n.text.includes("tiktok.com")){k=n.text;break}const g=m?m.split(/[|·]/)[0].trim().slice(0,200):"";return{product:{id:O,title:k||g||"TikTok Shop Product",price:"",imageUrl:"",shopName:"TikTok Shop",url:F},debug:{matchedVia:"reflow_pdp_regex",slug:R,productId:O,shortTitleSource:k?(L=E.find(n=>n.text===k))==null?void 0:L.src:null,shortTitle:k||null,...S}}}return{product:null,debug:{error:"no_itemStruct",scopeKeys:Object.keys((y==null?void 0:y.__DEFAULT_SCOPE__)||{}),...S}}}const I={isECVideo:h.isECVideo,AnchorTypes:h.AnchorTypes,hasCommerceProductInfo:!!h.commerceProductInfo,anchorsLen:Array.isArray(h.anchors)?h.anchors.length:0,anchorTypes:Array.isArray(h.anchors)?h.anchors.map(C=>C==null?void 0:C.type):[],productLikeKeys:Object.keys(h).filter(C=>/ec|commerce|product|anchor|shop|tcm/i.test(C)),...S};return{product:xt(h,I),debug:I}}function xt(t,e){var m,S,A,y,h,I;const s=f=>{if(typeof f!="string")return"";const p=f.trim();return p.length<3||p.length>80||/capcut|edit like|editing made|template|effect/i.test(p)?"":p};let r="";const a=[];if(Array.isArray(t.anchors))for(const f of t.anchors){if(!f||f.type!==33&&f.type!==106)continue;a.push(["anchor.keyword",f.keyword]),a.push(["anchor.description",f.description]);let p=f.extra||f.extra_info||f.extraInfo;if(typeof p=="string")try{p=JSON.parse(p)}catch{p={}}const w=Array.isArray(p)?p:p&&typeof p=="object"?[p]:[];for(const T of w)!T||typeof T!="object"||(a.push(["extra.keyword",T.keyword]),a.push(["extra.elastic_title",T.elastic_title]),a.push(["extra.short_title",T.short_title]),a.push(["extra.display_title",T.display_title]),Array.isArray(T.marketing_words)&&T.marketing_words.length&&a.push(["extra.marketing_words[0]",T.marketing_words[0]]))}for(const[f,p]of a){const w=s(p);if(w){r=w,e.marketingTitleFrom=f;break}}const c=t.commerceProductInfo||t.commerce_product_info;if(c){const f=c.products||c.product_list||(c.title?[c]:[]),p=Array.isArray(f)?f[0]:null;if(p){e.matchedVia="commerceProductInfo";const w=String(p.title||p.product_name||p.name||"TikTok Shop Product");return{id:String(p.product_id||p.id||""),title:r||w,price:String(p.price_str||p.format_price||p.price||""),imageUrl:String(((S=(m=p.cover)==null?void 0:m.urlList)==null?void 0:S[0])||p.cover_url||p.image||""),shopName:String(p.shop_name||p.seller_name||""),url:String(p.product_link||p.detail_url||"")}}}const l=t.anchors||[];if(Array.isArray(l))for(const f of l){if(!f||f.type===35||f.id===35||f.type!==33&&f.id!==33&&f.type!==106)continue;let p=f.extra||f.extra_info||f.extraInfo;if(typeof p=="string")try{p=JSON.parse(p)}catch{p={}}const w=Array.isArray(p)?p[0]||{}:p||{};let T={};try{T=typeof f.logExtra=="string"?JSON.parse(f.logExtra):f.logExtra||{}}catch{}const D=r||f.keyword||f.description||f.name||w.product_name||w.elastic_title||w.keyword||T.product_name;if(D)return e.matchedVia=`anchor_type_${f.type}`,{id:String(w.product_id||w.id||T.product_id||f.id||""),title:String(D),price:String(w.price||w.format_price||w.price_str||""),imageUrl:String(((y=(A=f.thumbnail)==null?void 0:A.urlList)==null?void 0:y[0])||((I=(h=f.icon)==null?void 0:h.urlList)==null?void 0:I[0])||w.cover_url||w.image||""),shopName:String(w.shop_name||T.shop_name||""),url:String(f.schema||f.actionUrl||w.product_link||"")}}const u=JSON.stringify(t),d=u.match(/"product_name"\s*:\s*"([^"]{3,200})"/)||u.match(/"title"\s*:\s*"([^"]{3,200})"[^}]*"price/);if(d){e.matchedVia="regex_scan";const f=u.match(/"product_id"\s*:\s*"?(\d{6,})"?/),p=u.match(/"format_price"\s*:\s*"([^"]+)"/)||u.match(/"price_str"\s*:\s*"([^"]+)"/),w=u.match(/"cover_url"\s*:\s*"([^"]+)"/);return{id:(f==null?void 0:f[1])||"",title:d[1],price:(p==null?void 0:p[1])||"",imageUrl:(w==null?void 0:w[1])||""}}return null}const ft=new Map,Dt=5*60*1e3;async function _t(t){if(!t)return t;const e=!!t.url&&/tiktok\.com\/shop\/[a-z]{2}\/pdp\//i.test(t.url);if(e&&t.price)return t;let s="";if(e?s=t.url:t.id&&/^\d{6,}$/.test(String(t.id))&&(s=`https://www.tiktok.com/shop/vn/pdp/${(t.title||"product").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80)||"product"}/${t.id}`),s)try{const c=await ct(s);if(c.title||c.price||c.imageUrl){const l=(t.title||"").trim(),d=l.length>0&&l.length<=80&&!/\s\|\s/.test(l)?l:c.title||l;return{...t,title:d,price:c.price||t.price,imageUrl:c.imageUrl||t.imageUrl,url:s,...c.originalPrice?{originalPrice:c.originalPrice}:{},...c.soldCount?{soldCount:c.soldCount}:{},...c.rating?{rating:c.rating}:{},...c.reviewCount?{reviewCount:c.reviewCount}:{}}}}catch{}if(!t.title)return t;const r=t.title.slice(0,80).toLowerCase().trim(),a=ft.get(r);if(a&&Date.now()-a.ts<Dt)return{...t,...a.product};try{await nt();const l=`https://www.tiktok.com/search/product?q=${encodeURIComponent(t.title.slice(0,80))}`,u=await fetch(l,{method:"GET",credentials:"include",redirect:"follow",headers:{Accept:"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8","Accept-Language":"vi-VN,vi;q=0.9,en;q=0.8"}});if(!u.ok)throw new Error(`Shop search ${u.status}`);const m=(await u.text()).match(/tiktok\.com\/shop\/[a-z]{2}\/pdp\/([^/"'\s\\)]+)\/(\d{6,})/i);if(!m)return t;const S=m[1],A=m[2],y=`https://www.tiktok.com/shop/vn/pdp/${S}/${A}`,h=await ct(y);if(!h.title&&!h.price&&!h.imageUrl)return t;const I=(t.title||"").trim(),p=I.length>0&&I.length<=80&&!/\s\|\s/.test(I)?I:h.title||I,w={...t,id:A,title:p,price:h.price||t.price,imageUrl:h.imageUrl||t.imageUrl,url:y,...h.originalPrice?{originalPrice:h.originalPrice}:{},...h.soldCount?{soldCount:h.soldCount}:{},...h.rating?{rating:h.rating}:{},...h.reviewCount?{reviewCount:h.reviewCount}:{}};return ft.set(r,{product:w,ts:Date.now()}),w}catch{return t}}const tt=new Map,$t=15*1e3,et=new Map,Mt=10*60*1e3;function Ot(t){const e=t.match(/\/video\/(\d+)/);return e?e[1]:t}async function Lt(t,e=!1){const s=Ot(t),r=et.get(s);if(r&&Date.now()-r.ts<Mt)return{success:!0,data:r.product,debug:{method:"success_cache",cachedAge:Date.now()-r.ts}};const a=tt.get(t);if(a&&Date.now()-a<$t)return{success:!0,data:null,debug:{method:"mobile_fetch",skipReason:"recently_failed"}};let c=null,l=null;for(const u of["omit","include"])try{const d=await It(t,u);if(l={...l||{},[`mobile_${u}`]:d.debug},d.product){c=d.product;const m=await _t(c);return et.set(s,{product:m,ts:Date.now()}),{success:!0,data:m,debug:{...l,method:`mobile_fetch_${u}`,enriched:m!==c}}}}catch(d){l={...l||{},[`mobile_${u}_error`]:d.message}}if(!e)return tt.set(t,Date.now()),{success:!0,data:null,debug:{method:"mobile_fetch_no_data",skipReason:"weak_signal_no_popup",mobileDebug:l}};try{let u=rt.get(t);u||(u=qt(t),rt.set(t,u),u.finally(()=>rt.delete(t)));const d=await u;if(d){const m=await _t(d);return et.set(s,{product:m,ts:Date.now()}),{success:!0,data:m,debug:{...l,method:"hidden_window",enriched:m!==d}}}}catch(u){l={...l||{},hiddenError:u.message}}return tt.set(t,Date.now()),{success:!0,data:null,debug:{method:"hidden_window_failed",skipReason:"no_commerce_signal",mobileDebug:l}}}const it=9002,Rt=5e3,Vt=3e3,rt=new Map;async function qt(t){var m,S,A;const e=t.match(/\/video\/(\d+)/);if(!e)throw new Error("no_video_id");const s=t.match(/@([^/?#]+)/),r=s?s[1]:"_",a=new URLSearchParams;try{const y=new URL(t),h=y.searchParams.get("shop_id");h&&a.set("shop_id",h);const I=y.searchParams.get("shop_region");I&&a.set("shop_region",I)}catch{}const c=`https://www.tiktok.com/@${r}/video/${e[1]}${a.toString()?"?"+a.toString():""}`;let l;try{l=await chrome.windows.create({url:"about:blank",focused:!1,type:"popup",state:"minimized"})}catch{l=await chrome.windows.create({url:"about:blank",focused:!1,type:"popup",width:100,height:100,top:0,left:0})}const u=(S=(m=l.tabs)==null?void 0:m[0])==null?void 0:S.id,d=l.id;if(!u||!d)throw new Error("no_tab_id");try{try{await chrome.windows.update(d,{state:"minimized"})}catch{}await chrome.declarativeNetRequest.updateSessionRules({removeRuleIds:[it],addRules:[{id:it,priority:2,action:{type:"modifyHeaders",requestHeaders:[{header:"User-Agent",operation:"set",value:gt}]},condition:{urlFilter:"||tiktok.com/",resourceTypes:["main_frame","sub_frame","xmlhttprequest","script","image","media","other"],tabIds:[u]}}]}),await chrome.tabs.update(u,{url:c}),await jt(u,Rt);const y=await chrome.scripting.executeScript({target:{tabId:u},world:"MAIN",func:Ft,args:[Vt]}),h=(A=y==null?void 0:y[0])==null?void 0:A.result;return h&&h.product?h.product:null}finally{try{await chrome.declarativeNetRequest.updateSessionRules({removeRuleIds:[it]})}catch{}if(d)try{await chrome.windows.remove(d)}catch{}}}function jt(t,e){return new Promise((s,r)=>{const a=setTimeout(()=>{chrome.tabs.onUpdated.removeListener(c),r(new Error("tab_load_timeout"))},e),c=(l,u)=>{l===t&&u.status==="complete"&&(clearTimeout(a),chrome.tabs.onUpdated.removeListener(c),s())};chrome.tabs.onUpdated.addListener(c)})}async function Ft(t=4e3){const e=l=>new Promise(u=>setTimeout(u,l)),s=Date.now()+t;let r=0,a=null;for(;Date.now()<s;){r++;const l=c();if(a=l.debug,l.product)return l.debug={...l.debug,polls:r},l;await e(250)}return{product:null,via:null,debug:{...a,polls:r,exhausted:!0}};function c(){var S,A,y,h,I,f,p,w,T,D,L,C,R,O,F,E,V,G;const l={url:location.href,title:document.title};if(/security check|verify/i.test(document.title))return{product:null,via:"captcha",debug:l};let u=null;const d=['a[href*="/shop/"][href*="/pdp/"]','a[href*="tiktok.com/shop"][href*="pdp"]','[class*="DivProductAnchor"]','[class*="EcomNameMobile"]','[class*="DivEcomAnchorMobile"]','[class*="EcomAnchor"]','[data-e2e="product-anchor"]','[data-e2e="anchor-name"]','[data-e2e="video-product"]'];for(const $ of d){const M=document.querySelectorAll($);for(const v of M){const i=v,o=i.getBoundingClientRect();if(o.width<30&&o.height<30)continue;let _=(i.innerText||"").trim();if(!_){const U=i.cloneNode(!0);U.querySelectorAll("style,script").forEach(q=>q.remove()),_=(U.textContent||"").trim()}_=_.replace(/^\.?css-[a-z0-9-]+\{[^}]*\}\s*/i,"").trim();const k=i.tagName==="A"?i.href:((S=i.querySelector("a"))==null?void 0:S.href)||"",g=/\/shop\/[^/]+\/pdp\//.test(k);if(!g&&(!_||_==="Shop"||_==="TikTok Shop"||_.length>250))continue;let n=_;if(n.includes("|")&&(n=n.split("|").pop().trim()),n.length>200&&(n=n.slice(0,200)),!n&&g&&(n=i.getAttribute("aria-label")||((A=i.querySelector("img"))==null?void 0:A.getAttribute("alt"))||"TikTok Shop Product"),!n)continue;const P=((y=i.querySelector("img"))==null?void 0:y.getAttribute("src"))||(i.tagName==="IMG"?i.src:"")||"";let x="";const N=i.closest('[class*="anchor"], [class*="Anchor"], [class*="Ecom"], [class*="product"], [class*="Product"]')||i.parentElement;if(N){const U=N.querySelector('[class*="price"], [class*="Price"]');if(U&&(x=(U.innerText||U.textContent||"").trim().slice(0,40)),!x){const z=(N.innerText||N.textContent||"").match(/(\d[\d.,]+\s*(?:đ|VNĐ|VND|₫|\$|USD))/i);z&&(x=z[1].trim())}}const b={product:{id:"",title:n,price:x,imageUrl:P,shopName:"TikTok Shop",url:k||""},via:g?"DOM_PDP_LINK":"DOM_"+$,debug:l};if(P||x)return b;u||(u=b)}}const m=["SIGI_STATE","__SIGI_STATE__","__UNIVERSAL_DATA_FOR_REHYDRATION__"];for(const $ of m){const M=document.getElementById($);if(!(!M||!M.textContent))try{const v=JSON.parse(M.textContent),i=[(f=(I=(h=v==null?void 0:v.__DEFAULT_SCOPE__)==null?void 0:h["webapp.video-detail"])==null?void 0:I.itemInfo)==null?void 0:f.itemStruct,(w=(p=v==null?void 0:v.__DEFAULT_SCOPE__)==null?void 0:p["webapp.reflow.video.detail"])==null?void 0:w.itemStruct,(L=(D=(T=v==null?void 0:v.__DEFAULT_SCOPE__)==null?void 0:T["webapp.reflow.video.detail"])==null?void 0:D.itemInfo)==null?void 0:L.itemStruct,(C=v==null?void 0:v.itemInfo)==null?void 0:C.itemStruct];v!=null&&v.ItemModule&&i.push(...Object.values(v.ItemModule));for(const o of i){if(!o)continue;const _=o.commerceProductInfo||o.commerce_product_info;if(_){const g=_.products||_.product_list||(_.title?[_]:[]),n=Array.isArray(g)?g[0]:null;if(n)return{product:{id:String(n.product_id||n.id||""),title:String(n.title||n.product_name||n.name||"Product"),price:String(n.price_str||n.format_price||n.price||""),imageUrl:String(((O=(R=n.cover)==null?void 0:R.urlList)==null?void 0:O[0])||n.cover_url||n.image||""),shopName:String(n.shop_name||n.seller_name||""),url:String(n.product_link||n.detail_url||""),originalPrice:n.origin_price_str||n.market_price_str||n.original_price,soldCount:n.sold_count!=null?String(n.sold_count):void 0,rating:n.rating!=null?String(n.rating):void 0,reviewCount:n.review_count!=null?String(n.review_count):void 0},via:"commerceProductInfo",debug:l}}const k=o.anchors;if(Array.isArray(k))for(const g of k){if(!g||g.type===35||g.type!==33&&g.type!==106)continue;let n={};try{n=typeof g.extraInfo=="string"?JSON.parse(g.extraInfo):g.extraInfo||{}}catch{}const P=g.keyword||g.description||g.name||n.product_name;if(P&&!/capcut|edit like|editing made|template|effect/i.test(String(P)))return{product:{id:String(n.product_id||g.id||""),title:String(P),price:String(n.price_str||n.format_price||n.price||""),imageUrl:String(((E=(F=g.thumbnail)==null?void 0:F.urlList)==null?void 0:E[0])||((G=(V=g.icon)==null?void 0:V.urlList)==null?void 0:G[0])||n.cover_url||""),shopName:String(n.shop_name||""),url:String(g.schema||g.actionUrl||n.product_link||""),originalPrice:n.origin_price_str||n.market_price_str,soldCount:n.sold_count!=null?String(n.sold_count):void 0,rating:n.rating!=null?String(n.rating):void 0,reviewCount:n.review_count!=null?String(n.review_count):void 0},via:"anchor_type_"+g.type,debug:l}}}}catch{}}return u||{product:null,debug:l}}}function Gt(t){return t.replace(/[<>:"/\\|?*\x00-\x1f\x7f]/g,"").replace(/\s+/g," ").trim().slice(0,180)}chrome.runtime.onInstalled.addListener(t=>{t.reason});
// Fetches the raw video bytes on behalf of multi-select.js's "save straight
// to a chosen folder" feature (File System Access API). This has to run
// here in the service worker rather than in the content script: the
// service worker is the context that actually holds this extension's
// extension host permissions, so it can fetch the stream cross-origin without
// hitting the page's own CORS rules. The caller supplies the TikTok page URL,
// not a media URL: the resolver is the sole component that obtains a stream.
//
// IMPORTANT: chrome.runtime.sendMessage uses JSON serialization by default
// (not structured clone), so a raw ArrayBuffer cannot be sent through it —
// it has no enumerable properties, so it silently arrives on the other end
// as "{}". That "{}" was then getting passed straight into
// FileSystemWritableFileStream.write(), which mistook it for a WriteParams
// dictionary missing its required "type" field — the exact
// "Failed to read the 'type' property from 'WriteParams'" error. Sending
// the bytes as a base64 string (which survives JSON serialization intact)
// and decoding them back into a Uint8Array on the receiving end avoids
// this entirely.
async function __fetchBytesForChosenFolder(tikTokPageUrl) {
    try {
        const data = await __resolveDownloadShared(tikTokPageUrl);
        if (!data || typeof data.videoUrl !== 'string') throw __resolverError('resolver_unavailable');
        const res = await fetch(data.videoUrl);
        if (!res.ok) throw new Error("HTTP " + res.status);
        const buffer = await res.arrayBuffer();
        const base64 = __arrayBufferToBase64(buffer);
        return { success: true, base64 };
    } catch (e) {
        return { success: false, error: (e && e.message) || "fetch_failed" };
    }
}

// Chunked to avoid "Maximum call stack size exceeded" from
// String.fromCharCode.apply() on large videos (some engines cap the number
// of arguments a function can be called with in one go).
function __arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = "";
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
}

// ===== [Download] Segment popup window ("Chia đoạn", phase 1) =====
// The player (tiktok-hook.js, MAIN world) asks through tiktok-loader.js for the
// segment popup as a window of its own.  chrome.windows.create() needs no user
// gesture, so it works for the always-on-top (Document PiP) player and for the
// dedicated player window alike.  One window per player: key = "<tabId>:<mode>",
// remembered in chrome.storage.session so that it survives the service worker
// being stopped.  The window (segments.html) is a function of its URL: a new
// video / new settings simply navigate it.  It stays docked against the player:
// the hook reports the player's place ("move"), this script passes it on to the
// window, which puts itself beside the player (segments.js).  A click on one of
// its cells comes back here and is handed on to the player's tab.
(() => {
  const PAGE = "segments.html";
  const STORE_PREFIX = "segwin:";
  const MODES = ["pip", "win"];
  const ANCHOR_KEYS = ["x", "y", "w", "h", "al", "at", "aw", "ah"];

  const toInt = (value, min, max, fallback) => {
    const n = Math.round(Number(value));
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  };

  // Messages of one player are handled one after the other (open, then update...).
  const chains = new Map();
  const run = (key, job) => {
    const next = (chains.get(key) || Promise.resolve()).then(job).catch(() => {});
    chains.set(key, next);
    next.then(() => { if (chains.get(key) === next) chains.delete(key); });
    return next;
  };

  const cleanAnchor = (raw) => {
    if (!raw || typeof raw !== "object") return null;
    const out = {};
    for (const name of ANCHOR_KEYS) {
      const n = Math.round(Number(raw[name]));
      if (!Number.isFinite(n) || Math.abs(n) > 100000) return null;
      out[name] = n;
    }
    return out.w > 0 && out.h > 0 ? out : null;
  };

  const pageUrl = (key, count, cols, src, anchor) => {
    const query = new URLSearchParams({ key, count: String(count), cols: String(cols), src });
    if (anchor) query.set("a", ANCHOR_KEYS.map((name) => anchor[name]).join(","));
    return chrome.runtime.getURL(PAGE) + "?" + query.toString();
  };

  // The open window of this player, or null (never opened, or the user closed it).
  const findWindow = async (key) => {
    const storeKey = STORE_PREFIX + key;
    try {
      const rec = (await chrome.storage.session.get(storeKey))[storeKey];
      if (!rec || !Number.isInteger(rec.windowId)) return null;
      await chrome.windows.get(rec.windowId);
      const tabs = await chrome.tabs.query({ windowId: rec.windowId });
      const tab = tabs && tabs[0];
      if (!tab || !Number.isInteger(tab.id)) return null;
      return { windowId: rec.windowId, tabId: tab.id, anchor: cleanAnchor(rec.anchor) };
    } catch {
      return null;
    }
  };

  const handleHostMessage = (msg, sender) => {
    const tabId = sender && sender.tab && sender.tab.id;
    if (!Number.isInteger(tabId) || !MODES.includes(msg.mode)) return;
    const key = tabId + ":" + msg.mode;
    const storeKey = STORE_PREFIX + key;
    run(key, async () => {
      const found = await findWindow(key);
      if (msg.op === "close") {
        if (found) { try { await chrome.windows.remove(found.windowId); } catch {} }
        await chrome.storage.session.remove(storeKey);
        return;
      }
      if (msg.op === "move") {
        // The player moved or was resized: the open window follows it.
        const moved = cleanAnchor(msg.anchor);
        if (found && moved) chrome.runtime.sendMessage({ type: "__DOWNLOAD_SEGMENT_ANCHOR__", key, anchor: moved }).catch(() => {});
        return;
      }
      if (msg.op !== "open" && msg.op !== "update") return;
      const src = typeof msg.src === "string" ? msg.src : "";
      if (!/^https:\/\//i.test(src) || src.length > 4000) return;
      const count = toInt(msg.count, 2, 20, 15);
      const cols = toInt(msg.cols, 1, 4, 3);
      const anchor = cleanAnchor(msg.anchor);
      if (found) {
        // Already open: reload it in place (same window), docked against the player where it is now.
        await chrome.tabs.update(found.tabId, { url: pageUrl(key, count, cols, src, anchor || found.anchor) });
        if (anchor) await chrome.storage.session.set({ [storeKey]: { windowId: found.windowId, anchor } });
        return;
      }
      if (msg.op !== "open") return; // the user closed it: only a new "open" brings it back
      const geometry = { width: 340, height: anchor ? Math.max(300, Math.min(anchor.h, 900)) : 640 };
      if (anchor) { geometry.left = anchor.x + anchor.w; geometry.top = anchor.y; }
      const win = await chrome.windows.create({
        url: pageUrl(key, count, cols, src, anchor),
        type: "popup",
        focused: false,
        ...geometry,
      });
      if (win && Number.isInteger(win.id)) {
        await chrome.storage.session.set({ [storeKey]: { windowId: win.id, anchor } });
      }
    });
  };

  // The window measures its own content and asks for the size and the place
  // beside the player that fit: only it knows the size of the window frame and
  // of the video.
  const handleFitMessage = (msg, sender) => {
    const windowId = sender && sender.tab && sender.tab.windowId;
    if (!Number.isInteger(windowId)) return;
    if (sender.id !== chrome.runtime.id || typeof sender.url !== "string" || !sender.url.startsWith(chrome.runtime.getURL(PAGE))) return;
    const update = {};
    const width = Math.round(Number(msg.width));
    const height = Math.round(Number(msg.height));
    if (Number.isFinite(width) && width >= 120 && width <= 4000) update.width = width;
    if (Number.isFinite(height) && height >= 120 && height <= 4000) update.height = height;
    if (msg.left !== undefined && msg.top !== undefined) {
      const left = Math.round(Number(msg.left));
      const top = Math.round(Number(msg.top));
      if (Number.isFinite(left) && Number.isFinite(top) && Math.abs(left) <= 100000 && Math.abs(top) <= 100000) {
        update.left = left;
        update.top = top;
      }
    }
    if (Object.keys(update).length) chrome.windows.update(windowId, update).catch(() => {});
  };

  // A click on a cell of the segment window: the player of this key (its tab)
  // jumps to the start of that segment.  The window is only trusted for its own
  // key, the one written when it was opened.
  const handleSeekMessage = async (msg, sender) => {
    const windowId = sender && sender.tab && sender.tab.windowId;
    if (!Number.isInteger(windowId)) return;
    if (sender.id !== chrome.runtime.id || typeof sender.url !== "string" || !sender.url.startsWith(chrome.runtime.getURL(PAGE))) return;
    const match = /^(\d+):(pip|win)$/.exec(String(msg.key));
    const count = Number(msg.count);
    const index = Number(msg.index);
    if (!match || !Number.isInteger(count) || !Number.isInteger(index) || count < 2 || count > 20 || index < 0 || index >= count) return;
    const storeKey = STORE_PREFIX + match[0];
    try {
      const rec = (await chrome.storage.session.get(storeKey))[storeKey];
      if (!rec || rec.windowId !== windowId) return;
      await chrome.tabs.sendMessage(Number(match[1]), { type: "__DOWNLOAD_SEGMENT_SEEK__", mode: match[2], index, count }, { frameId: 0 });
    } catch {}
  };

  chrome.runtime.onMessage.addListener((msg, sender) => {
    if (!msg || typeof msg !== "object") return false;
    if (msg.type === "__DOWNLOAD_SEGMENT_WINDOW__") handleHostMessage(msg, sender);
    else if (msg.type === "__DOWNLOAD_SEGMENT_FIT__") handleFitMessage(msg, sender);
    else if (msg.type === "__DOWNLOAD_SEGMENT_SEEK__") handleSeekMessage(msg, sender);
    return false;
  });

  // The player's tab is closed (the dedicated player window, or the TikTok tab
  // that owns a Picture-in-Picture player): its segment windows go with it.
  chrome.tabs.onRemoved.addListener((tabId) => {
    (async () => {
      const all = await chrome.storage.session.get(null);
      for (const storeKey of Object.keys(all)) {
        if (!storeKey.startsWith(STORE_PREFIX + tabId + ":")) continue;
        const rec = all[storeKey];
        try { if (rec && Number.isInteger(rec.windowId)) await chrome.windows.remove(rec.windowId); } catch {}
        await chrome.storage.session.remove(storeKey);
      }
    })().catch(() => {});
  });
})();
// ===== [/Download] Segment popup window =====

// ===== [Download] CORS header for the extension's own video streams =====
// The hover preview, the search PiP and the player window play a server-resolved
// stream in a <video crossorigin="anonymous"> (tiktok-hook.js). Without CORS
// approval Chrome refuses video.captureStream(), which the volume balance
// needs to measure the audio ("Cannot capture from element with cross-origin
// data"). The header is added to media requests at the known upstream host;
// it does not resolve a page URL or expose an upstream API to the extension.
(() => {
  const RULE_ID = 9101;
  const addRule = () => {
    try {
      chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: [RULE_ID],
        addRules: [{
          id: RULE_ID,
          priority: 1,
          action: {
            type: "modifyHeaders",
            responseHeaders: [{ header: "Access-Control-Allow-Origin", operation: "set", value: "*" }],
          },
          condition: {
            requestDomains: ["tikwm.com"],
            initiatorDomains: ["tiktok.com"],
            resourceTypes: ["media"],
          },
        }],
      }).catch(() => {});
    } catch (e) {}
  };
  addRule();
  chrome.runtime.onInstalled.addListener(addRule);
  chrome.runtime.onStartup.addListener(addRule);
})();
// ===== [/Download] CORS header for the extension's own video streams =====

// ===== [Download] Player window placement across displays =====
// window.open(left / top), moveTo() and resizeTo() of a page are held to the display the window is on (the opener's, for a
// new window), so a player the user left on the second monitor came back on the first one.  chrome.windows.update() is not
// held to it.  The hook (tiktok-hook.js) asks, through tiktok-loader.js, for the saved place of
//   "win" = the dedicated player window (the page that sends it; moved and sized as a whole), or
//   "pip" = the always-on-top Document PiP player (only moved: it is found as the always-on-top window of the size the hook
//           reports; nothing happens when the browser does not show that window to chrome.windows)
// The place is checked against the work areas of the displays that are connected right now (chrome.system.display), so a
// window saved on a monitor that is not there any more comes back on the nearest one instead of off-screen.
(() => {
  const PLAYER_PARAM = "__download_player";
  const SLACK = 16; // a window may hang this far over the edge of a work area (the invisible resize border on Windows)

  const intIn = (value, min, max) => {
    const n = Math.round(Number(value));
    return Number.isFinite(n) && n >= min && n <= max ? n : null;
  };

  // Work areas of the connected displays: [{ left, top, width, height }] (empty when the API is not available).
  const workAreas = async () => {
    try {
      const list = await chrome.system.display.getInfo();
      return (Array.isArray(list) ? list : [])
        .map((d) => d && d.workArea)
        .filter((a) => a && [a.left, a.top, a.width, a.height].every(Number.isFinite) && a.width > 0 && a.height > 0)
        .map((a) => ({ left: a.left, top: a.top, width: a.width, height: a.height }));
    } catch {
      return [];
    }
  };

  const overlap = (r, a) => {
    const w = Math.min(r.left + r.width, a.left + a.width) - Math.max(r.left, a.left);
    const h = Math.min(r.top + r.height, a.top + a.height) - Math.max(r.top, a.top);
    return w > 0 && h > 0 ? w * h : 0;
  };

  const gap = (r, a) => {
    const dx = Math.max(a.left - (r.left + r.width), r.left - (a.left + a.width), 0);
    const dy = Math.max(a.top - (r.top + r.height), r.top - (a.top + a.height), 0);
    return dx * dx + dy * dy;
  };

  // The display `rect` belongs to: the one it overlaps most, else the nearest one.
  const pickArea = (rect, areas) => {
    let best = areas[0];
    let bestOverlap = -1;
    for (const a of areas) {
      const o = overlap(rect, a);
      if (o > bestOverlap) {
        bestOverlap = o;
        best = a;
      }
    }
    if (bestOverlap > 0) return best;
    let nearest = Infinity;
    for (const a of areas) {
      const d = gap(rect, a);
      if (d < nearest) {
        nearest = d;
        best = a;
      }
    }
    return best;
  };

  // Where (and how big) the window goes: { left, top, width?, height? }.  req = { x, y, w, h, fill }, w / h = 0 when the size
  // is not asked for.  fill = the window filled the work area of its display: it gets that whole work area again.
  const resolvePlace = (req, areas) => {
    if (!areas.length) {
      const spot = { left: req.x, top: req.y };
      if (req.w > 0 && req.h > 0) {
        spot.width = req.w;
        spot.height = req.h;
      }
      return spot;
    }
    if (req.fill) {
      const area = pickArea({ left: req.x + 24, top: req.y + 24, width: 1, height: 1 }, areas);
      return { left: area.left, top: area.top, width: area.width, height: area.height };
    }
    const known = req.w > 0 && req.h > 0;
    const probe = { left: req.x, top: req.y, width: known ? req.w : 320, height: known ? req.h : 240 };
    const area = pickArea(probe, areas);
    const width = Math.min(probe.width, area.width);
    const height = Math.min(probe.height, area.height);
    const fit = (pos, size, lo, span) => {
      const hi = lo + span - size;
      if (hi <= lo) return lo; // as big as the work area (or bigger): flush with its edge
      return pos < lo - SLACK || pos > hi + SLACK ? Math.min(Math.max(pos, lo), hi) : pos;
    };
    const spot = { left: fit(req.x, width, area.left, area.width), top: fit(req.y, height, area.top, area.height) };
    if (known) {
      spot.width = width;
      spot.height = height;
    }
    return spot;
  };

  const handlePlace = async (msg, sender) => {
    const x = intIn(msg.x, -30000, 30000);
    const y = intIn(msg.y, -30000, 30000);
    if (x === null || y === null) return { ok: false };
    const req = { x, y, w: intIn(msg.w, 120, 20000) || 0, h: intIn(msg.h, 80, 20000) || 0, fill: msg.fill === true };
    if (!req.w || !req.h) req.w = req.h = 0;
    const tab = sender && sender.tab;
    if (!tab || !Number.isInteger(tab.windowId)) return { ok: false };

    if (msg.mode === "win") {
      // Only the dedicated player window (a popup whose page carries the player request) is ever moved by this.
      let page;
      try { page = new URL(String(sender.url || tab.url || "")); } catch { return { ok: false }; }
      if (!/(^|\.)tiktok\.com$/i.test(page.hostname) || !page.searchParams.has(PLAYER_PARAM)) return { ok: false };
      const win = await chrome.windows.get(tab.windowId);
      if (!win || win.type !== "popup") return { ok: false };
      const spot = resolvePlace(req, await workAreas());
      const update = { left: spot.left, top: spot.top };
      if (spot.width && spot.height) {
        update.width = spot.width;
        update.height = spot.height;
      }
      if (win.state && win.state !== "normal") update.state = "normal";
      await chrome.windows.update(win.id, update);
      return { ok: true };
    }

    if (msg.mode === "pip") {
      if (!req.w) return { ok: false };
      const cx = intIn(msg.cx, -30000, 30000);
      const cy = intIn(msg.cy, -30000, 30000);
      const all = await chrome.windows.getAll();
      const near = (Array.isArray(all) ? all : []).filter((w) =>
        w && w.alwaysOnTop === true && w.id !== tab.windowId && Math.abs(w.width - req.w) <= 3 && Math.abs(w.height - req.h) <= 3);
      if (!near.length) return { ok: false };
      let target = near[0];
      if (near.length > 1) {
        if (cx === null || cy === null) return { ok: false };
        const off = (w) => Math.abs(w.left - cx) + Math.abs(w.top - cy);
        target = near.reduce((a, b) => (off(b) < off(a) ? b : a));
      }
      const spot = resolvePlace(req, await workAreas());
      await chrome.windows.update(target.id, { left: spot.left, top: spot.top });
      return { ok: true };
    }
    return { ok: false };
  };

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || msg.type !== "__DOWNLOAD_PLAYER_PLACE__") return false;
    if (!sender || sender.id !== chrome.runtime.id) return false;
    handlePlace(msg, sender).then(sendResponse, () => sendResponse({ ok: false }));
    return true;
  });
})();
// ===== [/Download] Player window placement across displays =====

// ===== [Download] Native editor bridge =====
// The browser must never launch local programs directly.  These are the only
// worker-side operations that can talk to the registered Native Messaging
// host: verify the app setting, find the real path of the folder picked in
// "Video đã chọn" (that folder IS the editor's root folder), and open a video
// only after multi-select has finished writing it into that root's selected
// direct subfolder.
(() => {
  const HOST_NAME = 'com.tik_video_toolkit.editor_bridge';
  const SETTINGS_KEY = 'editorBridgeSettings';
  const MAX_TEXT = 4096;

  const text = (value, limit = MAX_TEXT) =>
    typeof value === 'string' && value.length <= limit ? value.trim() : '';

  const hostError = (error) => {
    const message = String((error && error.message) || error || '');
    if (/native messaging host|not found|host name/i.test(message)) {
      return 'Không tìm thấy cầu nối Native Messaging. Hãy chạy install_native_host.bat sau khi nạp tiện ích vào Chrome.';
    }
    return message || 'Không thể liên lạc với cầu nối trên máy.';
  };

  const sendNative = (payload) => new Promise((resolve) => {
    try {
      chrome.runtime.sendNativeMessage(HOST_NAME, payload, (response) => {
        const error = chrome.runtime.lastError;
        if (error) {
          resolve({ ok: false, error: 'native_unavailable', message: hostError(error) });
          return;
        }
        resolve(response && typeof response === 'object'
          ? response
          : { ok: false, error: 'native_invalid_response', message: 'Cầu nối trả về phản hồi không hợp lệ.' });
      });
    } catch (error) {
      resolve({ ok: false, error: 'native_unavailable', message: hostError(error) });
    }
  });

  const readSettings = async () => {
    try {
      const result = await chrome.storage.local.get(SETTINGS_KEY);
      const raw = result && result[SETTINGS_KEY];
      return raw && typeof raw === 'object' ? {
        enabled: raw.enabled === true,
        appPath: text(raw.appPath),
        rootPath: text(raw.rootPath),
        rootName: text(raw.rootName, 255),
        rootToken: text(raw.rootToken, 128),
      } : { enabled: false, appPath: '', rootPath: '', rootName: '' };
    } catch {
      return { enabled: false, appPath: '', rootPath: '', rootName: '' };
    }
  };

  // A Windows drive or UNC path without "..": the shape the host is given for
  // the folder the user confirmed in the "different folders" warning.
  const isFullPath = (value) =>
    /^(?:[A-Za-z]:[\\/]|\\\\[^\\/]+[\\/][^\\/]+)/.test(value) &&
    !/[<>"|?*\x00-\x1f]/.test(value) &&
    !/(?:^|[\\/])\.\.(?:[\\/]|$)/.test(value);

  const requireLicense = async () => {
    try {
      return await __licenseAllows();
    } catch {
      return false;
    }
  };

  const resultMessage = (result, fallback) => ({
    success: result && result.ok === true,
    message: text(result && result.message, 600) || fallback,
    kind: text(result && result.kind, 20),
    path: text(result && result.path),
    name: text(result && result.name, 255),
    rootToken: text(result && result.rootToken, 128),
    cancelled: !!(result && result.cancelled),
  });

  const handle = async (message) => {
    if (!(await requireLicense())) {
      return { success: false, message: 'Vui lòng kích hoạt key trước khi dùng app sửa video.' };
    }

    if (message.type === 'EDITOR_BRIDGE_CHECK_APP') {
      const appPath = text(message.appPath);
      if (!appPath) return { success: false, message: 'Nhập đường dẫn đầy đủ đến file .exe hoặc .py.' };
      return resultMessage(await sendNative({ action: 'check_app', appPath }), 'Đường dẫn app không hợp lệ.');
    }

    if (message.type === 'EDITOR_BRIDGE_PICK_APP') {
      const result = resultMessage(await sendNative({ action: 'choose_app_file' }), 'Không chọn được file app.');
      if (result.cancelled) return { success: false, cancelled: true, message: '' };
      return result;
    }

    // Tìm đường dẫn thật của thư mục chọn trong "Video đã chọn": multi-select.js vừa ghi marker
    // mới vào thư mục đó nhưng chỉ biết TÊN thư mục. Host tìm đường dẫn thật theo marker; tìm
    // thấy thì thư mục đó trở thành thư mục gốc của app sửa video.
    if (message.type === 'EDITOR_BRIDGE_SYNC_ROOT') {
      const current = await readSettings();
      // force: nút "Mở thư mục" của "Video đã chọn" cũng cần đường dẫn thật khi "Mở app sửa video" đang tắt.
      if (!current.enabled && message.force !== true) return { success: false, skipped: true, message: '' };
      const folderName = text(message.folderName, 255);
      const rootToken = text(message.rootToken, 128);
      if (!folderName || !rootToken) return { success: false, message: 'Thiếu tên thư mục hoặc mã xác nhận để đồng bộ.' };
      const found = await sendNative({
        action: 'locate_folder',
        folderName,
        rootToken,
        hints: [text(message.hintPath, 1024), current.rootPath].filter(Boolean),
        seconds: Math.min(25, Math.max(1, Number(message.seconds) || 20)),
      });
      if (found && found.error === 'unknown_action') {
        return { success: false, message: 'Cầu nối trên máy chưa hỗ trợ tự tìm đường dẫn thư mục. Hãy cập nhật thư mục native_host (bản .exe cần build lại bằng build_exe.bat) rồi chạy lại file cài.' };
      }
      if (!found || found.ok !== true) {
        return { success: false, message: text(found && found.message, 600) || 'Không tìm được đường dẫn thật của thư mục.' };
      }
      const foundPath = text(found.path);
      const foundName = text(found.name, 255);
      if (found.found !== true || !isFullPath(foundPath) || !foundName) {
        return {
          success: false,
          message: found.reason === 'timeout'
            ? 'Tìm quá lâu mà chưa thấy đường dẫn thật của thư mục.'
            : 'Không tìm thấy đường dẫn thật của thư mục trên máy.',
        };
      }
      const latest = await readSettings();
      await chrome.storage.local.set({ [SETTINGS_KEY]: { ...latest, rootPath: foundPath, rootName: foundName, rootToken } });
      return { success: true, path: foundPath, name: foundName };
    }

    // Nút "Mở thư mục" của "Video đã chọn": mở thư mục đã chọn (đường dẫn thật tìm được ở trên)
    // bằng Explorer. Host kiểm tra marker trong thư mục trước khi mở.
    if (message.type === 'EDITOR_BRIDGE_OPEN_FOLDER') {
      const rootPath = text(message.rootPath, 1024);
      const rootToken = text(message.rootToken, 128);
      if (!isFullPath(rootPath)) return { success: false, message: 'Đường dẫn đầy đủ của thư mục không hợp lệ.' };
      if (!rootToken) return { success: false, message: 'Thiếu mã xác nhận của thư mục.' };
      const opened = await sendNative({ action: 'open_folder', rootPath, rootToken });
      if (opened && opened.error === 'unknown_action') {
        return { success: false, message: 'Cầu nối trên máy chưa hỗ trợ mở thư mục. Hãy cập nhật thư mục native_host (bản .exe cần build lại bằng build_exe.bat) rồi chạy lại file cài.' };
      }
      return resultMessage(opened, 'Không mở được thư mục.');
    }

    if (message.type !== 'EDITOR_BRIDGE_OPEN_SAVED_VIDEO') return null;
    const settings = await readSettings();
    if (!settings.enabled) return { success: false, message: 'Hãy bật “Mở app sửa video” trong cài đặt tiện ích.' };
    if (!settings.appPath) return { success: false, message: 'Chưa đặt đường dẫn file .exe hoặc .py của app sửa video.' };

    // The real path of the folder picked in "Video đã chọn" could not be found
    // automatically, so the user typed it. The video was saved in that folder,
    // so the host is pointed at the typed full path; the token is the marker
    // multi-select.js left in that same folder, which proves the path is right.
    if (message.confirmedMismatch === true) {
      const sourceRootPath = text(message.sourceRootPath, 1024);
      const fileName = text(message.fileName, 255);
      const rootToken = text(message.rootToken, 128);
      if (!isFullPath(sourceRootPath)) return { success: false, message: 'Đường dẫn đầy đủ của thư mục trong Video đã chọn không hợp lệ.' };
      if (!fileName || !rootToken) return { success: false, message: 'Video chưa tải xong hoặc thư mục chưa được xác nhận.' };
      const opened = resultMessage(await sendNative({
        action: 'open_saved_video',
        appPath: settings.appPath,
        rootPath: sourceRootPath,
        folderName: text(message.folderName, 255),
        fileName,
        rootToken,
      }), 'Không mở được app sửa video.');
      if (opened.success) {
        // The host confirmed the typed path: remember it as the root so the
        // next video from this folder opens without asking again.
        const latest = await readSettings();
        await chrome.storage.local.set({
          [SETTINGS_KEY]: { ...latest, rootPath: sourceRootPath, rootName: text(message.rootName, 255) || latest.rootName, rootToken },
        });
      }
      return opened;
    }
    if (!settings.rootPath || !settings.rootName || !settings.rootToken) return { success: false, message: 'Chưa xác định đường dẫn thật của thư mục trong Video đã chọn.' };

    const rootName = text(message.rootName, 255);
    if (!rootName || rootName.localeCompare(settings.rootName, undefined, { sensitivity: 'accent' }) !== 0) {
      return {
        success: false,
        message: 'Thư mục trong Video đã chọn đã đổi so với thư mục đã lưu cho app sửa video. Hãy thử mở lại.',
      };
    }

    const folderName = text(message.folderName, 255);
    const fileName = text(message.fileName, 255);
    const rootToken = text(message.rootToken, 128);
    if (!fileName || !rootToken) return { success: false, message: 'Video chưa tải xong hoặc thư mục gốc chưa được xác nhận.' };
    if (rootToken !== settings.rootToken) {
      return { success: false, message: 'Thư mục Chrome đang dùng không khớp đường dẫn đã lưu cho app sửa video. Hãy thử mở lại.' };
    }
    return resultMessage(await sendNative({
      action: 'open_saved_video',
      appPath: settings.appPath,
      rootPath: settings.rootPath,
      folderName,
      fileName,
      rootToken,
    }), 'Không mở được app sửa video.');
  };

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message.type !== 'string' || !message.type.startsWith('EDITOR_BRIDGE_')) return false;
    handle(message).then(
      (result) => sendResponse(result || { success: false, message: 'Yêu cầu không được hỗ trợ.' }),
      () => sendResponse({ success: false, message: 'Không thể xử lý yêu cầu mở app sửa video.' }),
    );
    return true;
  });
})();
// ===== [/Download] Native editor bridge =====

// ===== [Download] Open Chrome's download folder =====
// Nút "Mở thư mục" của "Video đã chọn" khi chưa chọn thư mục lưu: video đi qua chrome.downloads nên
// thư mục tải về là thư mục Downloads của Chrome. Không cần native host.
// Nếu đang bật "Hỏi nơi lưu mỗi lần tải xuống" thì mỗi video có thể nằm ở một thư mục khác nhau:
// khi đó mở thư mục chứa video vừa tải xong gần nhất của tiện ích (chrome.downloads.show), không có thì
// mở thư mục Downloads mặc định.
(() => {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.type !== 'OPEN_DOWNLOAD_FOLDER') return false;
    if (!sender || sender.id !== chrome.runtime.id) return false;
    (async () => {
      try {
        if (await __getAskWhereToSave()) {
          const items = await chrome.downloads.search({ state: 'complete', orderBy: ['-startTime'], limit: 50 });
          const last = (items || []).find((item) => item && item.byExtensionId === chrome.runtime.id && item.exists !== false);
          if (last) {
            chrome.downloads.show(last.id);
            sendResponse({ success: true });
            return;
          }
        }
        chrome.downloads.showDefaultFolder();
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false, message: String((error && error.message) || 'Không mở được thư mục tải về.') });
      }
    })();
    return true;
  });
})();
// ===== [/Download] Open Chrome's download folder =====
