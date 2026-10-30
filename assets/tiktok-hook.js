(function(){(function(){var N,G,W,z;if(window.__DOWNLOAD_HOOK__)return;window.__DOWNLOAD_HOOK__=!0;const b=()=>{};let q="",P=null;function ee(){try{const e=location.pathname.match(/^\/@([^/?#]+)/);return e?e[1]:""}catch{return""}}function te(e){if(!e||typeof e!="object")return!1;const r=e.commerceUserInfo;if(r&&typeof r=="object"&&(r.commerceUser===!0||typeof r.category=="string"&&r.category.length>0||typeof r.sellerLevel=="number"&&r.sellerLevel>0||r.starInfo&&typeof r.starInfo=="object")||e.ttSeller===!0)return!0;if(e.bioLink&&typeof e.bioLink=="object"){const d=String(e.bioLink.link||"");if(/tiktok\.com\/.*\/shop|\/shop\/|tiktok\.com\/@[^/]+\/shop/i.test(d))return!0}return!1}let p={backgroundPlay:!1,autoPiP:!1,volumeNormalizer:!1,playbackSpeed:1};const M=(N=Object.getOwnPropertyDescriptor(Document.prototype,"hidden"))==null?void 0:N.get,F=(G=Object.getOwnPropertyDescriptor(Document.prototype,"visibilityState"))==null?void 0:G.get;function _(){return M?!!M.call(document):!1}const re=window.requestAnimationFrame.bind(window),oe=window.cancelAnimationFrame.bind(window);let D=!1;function ne(){D||(D=!0,window.requestAnimationFrame=e=>_()?window.setTimeout(()=>e(performance.now()),16):re(e),window.cancelAnimationFrame=e=>{_()?window.clearTimeout(e):oe(e)})}ne(),window.addEventListener("__download_settings__",e=>{const r=e.detail;r&&typeof r=="object"&&(p={...p,...r},K(),C(),A())});try{Object.defineProperty(document,"hidden",{configurable:!0,get(){return p.backgroundPlay?!1:_()}}),Object.defineProperty(document,"visibilityState",{configurable:!0,get(){return p.backgroundPlay?"visible":F?F.call(document):"visible"}})}catch{}let x=!1;function ie(){return p.autoPiP&&(_()||!document.hasFocus())}async function E(e){if(!ie()||x)return;const r=j();if(!(!r||document.pictureInPictureElement===r)){x=!0;try{T(r),await r.requestPictureInPicture()}catch{B()}finally{x=!1}}}function A(e){setTimeout(()=>E(),250),setTimeout(()=>E(),700),setTimeout(()=>E(),1400),setTimeout(()=>E(),2400)}async function R(){if(document.pictureInPictureElement)try{await document.exitPictureInPicture()}catch{}}const U=e=>{e.isTrusted&&(p.autoPiP&&(e.type==="visibilitychange"?_()?A():R():e.type==="blur"?setTimeout(()=>{document.hasFocus()||A()},150):e.type==="focus"&&R()),p.backgroundPlay&&e.stopImmediatePropagation())};for(const e of["visibilitychange","pagehide","blur","focus"])window.addEventListener(e,U,!0),document.addEventListener(e,U,!0);function ce(){document.querySelectorAll("video").forEach(e=>{const r=p.playbackSpeed||1;if(Math.abs(e.playbackRate-r)>.01)try{e.playbackRate=r}catch{}})}const v=((W=window.AudioContext)==null?void 0:W.prototype)||((z=window.webkitAudioContext)==null?void 0:z.prototype),V=v==null?void 0:v.createMediaElementSource;if(v&&V){const e=new WeakSet;v.createMediaElementSource=function(r){const d=V.call(this,r);if(e.has(r))return d;e.add(r);try{const h=this,c=h.createDynamicsCompressor();c.threshold.value=-24,c.knee.value=30,c.ratio.value=12,c.attack.value=.003,c.release.value=.25;const g=h.createGain();g.gain.value=1.5;const s=d.connect;let a=!0;d.connect=function(f,y,k){return a&&(a=!1,p.volumeNormalizer)?(s.call(this,c),c.connect(g),g.connect(f,y,k),f):s.call(this,f,y,k)}}catch{}return d}}function C(){if("mediaSession"in navigator)try{navigator.mediaSession.setActionHandler("enterpictureinpicture",async()=>{if(!p.autoPiP)return;const e=j();if(e){T(e);try{await e.requestPictureInPicture()}catch{B()}}}),navigator.mediaSession.setActionHandler("nexttrack",()=>{ae(),setTimeout(O,100),A("media-nexttrack")}),navigator.mediaSession.setActionHandler("previoustrack",()=>{le(),setTimeout(O,100),A("media-previoustrack")})}catch{}}function T(e){e.removeAttribute("disablepictureinpicture"),e.disablePictureInPicture=!1,p.autoPiP?(e.setAttribute("autopictureinpicture","true"),e.autoPictureInPicture=!0):(e.removeAttribute("autopictureinpicture"),e.autoPictureInPicture=!1)}function se(){document.querySelectorAll("video").forEach(e=>{try{T(e),e.__downloadHookPipPlaying||(e.__downloadHookPipPlaying=!0,e.addEventListener("playing",()=>{const r=document.pictureInPictureElement;if(!(!p.autoPiP||!r||r===e))try{T(e),e.requestPictureInPicture().catch(()=>{})}catch{}}))}catch{}})}function O(){if(!p.autoPiP||!("mediaSession"in navigator))return;const e=j();if(e)try{document.pictureInPictureElement||(navigator.mediaSession.metadata=new MediaMetadata({title:"Download",artist:"Auto PiP Enabled",artwork:[]})),navigator.mediaSession.playbackState=e.paused?"paused":"playing"}catch{}}function B(){var e;try{(e=document.querySelector('[data-e2e="more-menu-popover_mini-player"]'))==null||e.click()}catch{}}function ae(){const e=document.querySelector('[data-e2e="arrow-right"], [data-e2e="arrow-down"], button[data-e2e="video-switch-next"]');if(e){e.click();return}(document.querySelector('[data-e2e="recommend-list-item-container"]')||document.getElementById("app")||document.documentElement).dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowDown",code:"ArrowDown",keyCode:40,which:40,bubbles:!0,cancelable:!0,composed:!0,view:window})),setTimeout(()=>window.scrollBy({top:window.innerHeight,behavior:"smooth"}),150)}function le(){const e=document.querySelector('[data-e2e="arrow-left"], [data-e2e="arrow-up"], button[data-e2e="video-switch-prev"]');if(e){e.click();return}(document.querySelector('[data-e2e="recommend-list-item-container"]')||document.getElementById("app")||document.documentElement).dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowUp",code:"ArrowUp",keyCode:38,which:38,bubbles:!0,cancelable:!0,composed:!0,view:window})),setTimeout(()=>window.scrollBy({top:-window.innerHeight,behavior:"smooth"}),150)}function j(){var d;const e=Array.from(document.querySelectorAll("video"));if(!e.length)return null;const r=window.innerHeight/2;return((d=e.map(h=>{const c=h.getBoundingClientRect(),g=Math.max(0,Math.min(c.bottom,window.innerHeight)-Math.max(c.top,0)),s=Math.max(0,Math.min(c.right,window.innerWidth)-Math.max(c.left,0)),a=g*s,f=Math.abs((c.top+c.bottom)/2-r),y=(h.paused?0:1e6)+(h.readyState>=2?1e5:0)+a-f;return{video:h,score:y}}).sort((h,c)=>c.score-h.score)[0])==null?void 0:d.video)||null}function K(){ce(),se(),O()}C(),setInterval(C,2e3),setInterval(K,1e3);try{const e=window.fetch;window.fetch=function(...r){var h;const p=e.apply(this,r);p.then(d=>{try{const c=typeof r[0]=="string"?r[0]:r[0]instanceof Request?r[0].url:((h=r[0])==null?void 0:h.url)||"";typeof c=="string"&&/tiktok\.com\/api\//.test(c)&&!/\/inbox\/|\/notice|\/check\b/i.test(c)&&d.clone().json().then(s=>{var Y,$,J,Q,X;let a=[];if(Array.isArray(s==null?void 0:s.itemList))a=s.itemList;else if(Array.isArray(s==null?void 0:s.items))a=s.items;else if(Array.isArray(s==null?void 0:s.aweme_list))a=s.aweme_list;else if(s&&typeof s=="object")for(const t of Object.keys(s)){const n=s[t];if(Array.isArray(n)&&n.length&&n[0]&&typeof n[0]=="object"){if((n[0].id||n[0].aweme_id)&&(n[0].author||n[0].video||n[0].music)){a=n;break}const wKey=n[0].item?"item":(n[0].aweme_info?"aweme_info":null);if(wKey&&n[0][wKey]&&(n[0][wKey].id||n[0][wKey].aweme_id)&&(n[0][wKey].author||n[0][wKey].video||n[0][wKey].music)){a=n.map(x=>x&&x[wKey]).filter(Boolean);break}}}if(!a.length)return;b("item_list response:",c.slice(0,120),"items=",a.length);const f=ee();if(f&&q!==f&&(q=f,P=null,b("profile owner changed →",f,"(reset shop flag)")),f&&P===null){let t=!1;for(const n of a)if(((Y=n==null?void 0:n.author)==null?void 0:Y.uniqueId)===f&&(t=!0,te(n.author))){P=!0;const m=n.author.commerceUserInfo,w=n.author.bioLink;b("profile owner",f,"detected as SHOP creator",{commerceUserInfo:m?Object.keys(m).slice(0,10):null,ttSeller:n.author.ttSeller,bioLink:w&&typeof w=="object"?w.link:null});break}P===null&&t&&(P=!1,b("profile owner",f,"detected as NON-shop creator"))}try{window.postMessage({type:"__DOWNLOAD_PROBE_URL__",url:c.slice(0,200)+" → items: "+a.length},"*")}catch{}const y=[],k=[],H=[];for(const t of a){if(!t)continue;const n=String(t.id||t.video_id||t.aweme_id||"");if(!n||!/^\d{6,}$/.test(n))continue;let m=!1;if(Array.isArray(t.anchors))for(const i of t.anchors){if(!i||i.type!==33)continue;const u=String(i.schema||i.action_url||""),o=i.extra||{},S=/\/shop\//.test(u)||!!o.product_id||!!o.shop_id,L=typeof i.keyword=="string"?i.keyword:"",fe=/capcut|edit like|editing made|template|effect/i.test(L);if(S||L&&!fe){m=!0;break}if(!L&&!u&&!Object.keys(o).length){m=!0;break}}if(!m&&Array.isArray(t.anchors_extras)){for(const i of t.anchors_extras)if(i&&(i.type===33||i.anchor_type===33)){m=!0;break}}if(!m&&Array.isArray(t.contents)){for(const i of t.contents)if(i){if(Array.isArray(i.anchors)){for(const u of i.anchors)if(u&&u.type===33){m=!0;break}}if(m)break}}let w=!1;const l=t.commerceProductInfo||t.commerce_product_info;if(l&&typeof l=="object"){const i=l.products||l.product_list;if(Array.isArray(i)&&i.length>0){const u=i[0];u&&(u.product_id||u.title)&&(w=!0)}else(l.product_id||l.title)&&(w=!0)}let I=!1,Z=!1;!m&&!w&&(t.isECVideo===1||t.isECVideo===!0)&&(Array.isArray(t.anchors)&&t.anchors.some(u=>u&&u.type===54)?P===!0&&(I=!0,Z=!0):I=!0);const ue=m||w||I;if(H.length<5){const i=Array.isArray(t.anchors)?t.anchors.map(o=>({type:o==null?void 0:o.type,keyword:typeof(o==null?void 0:o.keyword)=="string"?o.keyword.slice(0,40):o==null?void 0:o.keyword,extra_keys:o!=null&&o.extra&&typeof o.extra=="object"?Object.keys(o.extra).slice(0,10):null})):null,u=l&&typeof l=="object"?{keys:Object.keys(l).slice(0,10),productsLen:Array.isArray(l.products)?l.products.length:null,product0_id:(J=($=l.products)==null?void 0:$[0])==null?void 0:J.product_id,product0_title:typeof((X=(Q=l.products)==null?void 0:Q[0])==null?void 0:X.title)=="string"?l.products[0].title.slice(0,40):null,direct_product_id:l.product_id,direct_title:typeof l.title=="string"?l.title.slice(0,40):null}:null;H.push({id:n,hasShopAnchor:m,hasRealCommerceProduct:w,relaxedByProfileShop:Z,anchorsDump:i,AnchorTypes:t.AnchorTypes,isECVideo:t.isECVideo,cpiDump:u,anchors_extras:Array.isArray(t.anchors_extras)?t.anchors_extras.map(o=>({type:o==null?void 0:o.type,anchor_type:o==null?void 0:o.anchor_type,keys:o?Object.keys(o).slice(0,8):null})):t.anchors_extras,contents_summary:Array.isArray(t.contents)?t.contents.map(o=>({desc:typeof(o==null?void 0:o.desc)=="string"?o.desc.slice(0,60):null,anchorTypes:Array.isArray(o==null?void 0:o.anchors)?o.anchors.map(S=>S==null?void 0:S.type):null})):null,desc:typeof t.desc=="string"?t.desc.slice(0,120):null,itemKeys:Object.keys(t).filter(o=>/commerce|product|anchor|shop|ec|tcm/i.test(o)),allKeys:Object.keys(t).slice(0,40)})}ue?y.push(n):!I&&(t.isECVideo===0||t.isECVideo===!1||t.isECVideo===void 0)&&!t.AnchorTypes&&(Array.isArray(t.anchors)&&t.anchors.some(u=>u&&u.type===54)||k.push(n))}const _ks=window.__downloadKnownShop||(window.__downloadKnownShop=new Set());for(const x of a){if(x&&x.author&&x.author.uniqueId&&te(x.author))_ks.add(x.author.uniqueId)}let _upg=0;for(const x of a){if(!x||!x.author||!x.author.uniqueId)continue;if(_ks.has(x.author.uniqueId)){const id=x.id||x.aweme_id;if(!id)continue;const ni=k.indexOf(id);if(ni>=0)k.splice(ni,1);if(!y.includes(id)){y.push(id);_upg++}}}b("[D7] knownShopCreators set:",_ks.size,"upgraded ids=",_upg),b("item_list classified: total=",a.length," shop=",y.length," nonShop=",k.length," unclassified=",a.length-y.length-k.length),window.postMessage({type:"__DOWNLOAD_PROFILE_POSTS__",shopIds:y,nonShopIds:k,total:a.length,sample:H},"*")}).catch(()=>{})}catch{}}).catch(()=>{});return p}}catch{}

/* ===== [Download] Search-result PiP + player + download + speed =====
 * TikTok normally renders search cards as <img> thumbnails and only creates a
 * <video> after the card is opened.  This control is attached to the card's
 * /video/ link, not just to an already-created <video>.  If no native preview
 * video is available, the content-script bridge loads the selected card's
 * stream into one private media element and PiP is requested from that element.
 * The adjacent player and download controls use the same selected card URL
 * existing TIKTOK_DOWNLOAD handler.  Playback speed is a tab-session override
 * so TikTok/React and the older rate synchronizer cannot reset it.
 */
(function(){
if(window.__DOWNLOAD_SEARCH_PIP__)return;window.__DOWNLOAD_SEARCH_PIP__=!0;
try{window.dispatchEvent(new CustomEvent("__download_settings__",{detail:{autoScroll:false,backgroundPlay:false,autoPiP:false,cleanVideoMode:false,unlockShopVideo:false,productViewer:true,volumeNormalizer:true,playbackSpeed:1}}))}catch{}
const documentPipSupported=!!(window.documentPictureInPicture&&typeof window.documentPictureInPicture.requestWindow==="function");
const pipSupported=documentPipSupported||!!document.pictureInPictureEnabled&&typeof HTMLVideoElement!=="undefined"&&typeof HTMLVideoElement.prototype.requestPictureInPicture==="function";

const PIP_BUTTON_CLASS="__download_search_pip_btn",PLAYER_BUTTON_CLASS="__download_search_player_btn",DOWNLOAD_BUTTON_CLASS="__download_search_download_btn",SPEED_BUTTON_CLASS="__download_search_speed_btn",SPEED_MENU_CLASS="__download_search_speed_menu",PLAYER_OVERLAY_ID="__download_search_video_player",PLAYER_CONTROLS_CLASS="__download_player_controls",PLAYER_WINDOW_NAME="DownloadVideoPlayer",PLAYER_REQUEST_PARAM="__download_player",PLAYER_SPEED_PARAM="__download_speed",PLAYER_SPEED_MESSAGE="__DOWNLOAD_PLAYER_SPEED__",REQUEST_TYPE="__DOWNLOAD_SEARCH_PIP_MEDIA_REQUEST__",RESPONSE_TYPE="__DOWNLOAD_SEARCH_PIP_MEDIA_RESPONSE__",DOWNLOAD_REQUEST_TYPE="__DOWNLOAD_SEARCH_DOWNLOAD_REQUEST__",DOWNLOAD_RESPONSE_TYPE="__DOWNLOAD_SEARCH_DOWNLOAD_RESPONSE__";
const busy=new WeakSet,downloadBusy=new WeakSet,streamCache=new Map,streamRequests=new Map,pendingRequests=new Map,pendingDownloads=new Map,queuedNodes=new Set,pipActivatedUrls=new Set,playerActivatedUrls=new Set,downloadActivatedUrls=new Set;
/* The global volume module is appended after this player module.  Calling this
 * tiny bridge at media creation time also covers the closed-shadow hover
 * preview, which no document-wide selector can reach. */
function applyGlobalVolumeBalance(video){
try{const apply=window.__DOWNLOAD_APPLY_VOLUME_BALANCE__;if(typeof apply==="function")apply(video)}catch{}
}
/* The volume balance measures a clip through video.captureStream(), which Chrome refuses for cross-origin media that
 * was not fetched in CORS mode ("Cannot capture from element with cross-origin data"). The extension's own videos
 * (hover preview, search PiP, player window) play the server-resolved stream, so they are requested with
 * crossorigin=anonymous; background.js adds the matching Access-Control-Allow-Origin header. If the request is
 * refused anyway, the element is reloaded once without CORS: playback never breaks, only the measuring is lost. */
function prepareCorsVideo(video){
try{
if(!video||video.__downloadCorsReady)return;
video.__downloadCorsReady=!0;
video.crossOrigin="anonymous";
video.addEventListener("error",event=>{
if(video.__downloadCorsOff||video.crossOrigin!=="anonymous"||!video.getAttribute("src"))return;
video.__downloadCorsOff=!0;
/* Registered before any other error handler: stop them from tearing the player down while it retries. */
try{event.stopImmediatePropagation()}catch{}
const time=Number(video.currentTime)||0,resume=!video.paused||video.autoplay===!0;
video.removeAttribute("crossorigin");
const restore=()=>{video.removeEventListener("loadedmetadata",restore);try{if(time>.05)video.currentTime=time}catch{}if(resume)try{const played=video.play();if(played&&played.catch)played.catch(()=>{})}catch{}};
video.addEventListener("loadedmetadata",restore);
try{video.load()}catch{}
})
}catch{}
}
let warmVideo=null,documentPipWindow=null,documentPipPlaybackSpeed=null,scanScheduled=!1,lastHref=location.href,requestNumber=0,wasSearchPage=!1,basePlaybackSpeed=1,syncingSearchSpeed=!1,playerRequestStarted=!1,playerPopup=null,playerPopupSpeed=null;
/* "Luôn hiển thị trên cùng" (popup.html). Chrome gives extensions no way to pin an ordinary popup
 * window on top, so when this is on the player button opens the video in a Document Picture-in-Picture
 * window instead, which Chrome always keeps above other windows. The value is relayed by
 * tiktok-loader.js (ISOLATED world) at startup and on every change, so it is live without a reload. */
let playerAlwaysOnTop=!1;
window.addEventListener("__DOWNLOAD_PLAYER_ALWAYS_ON_TOP__",event=>{playerAlwaysOnTop=!!(event&&event.detail&&event.detail.enabled===!0)});
/* "Menu chuột phải thư mục con" (popup.html).  When on, right-clicking the always-on-top (Document PiP) player or the
 * dedicated player window shows the subfolder menu (see "Player subfolder menu" below).  Relayed by tiktok-loader.js
 * like the option above; asked for once here in case the loader sent its first value before this script was running. */
let subfolderContextMenu=!1;
window.addEventListener("__DOWNLOAD_SUBFOLDER_CONTEXT_MENU__",event=>{subfolderContextMenu=!!(event&&event.detail&&event.detail.enabled===!0)});
try{window.dispatchEvent(new CustomEvent("__DOWNLOAD_SUBFOLDER_CONTEXT_MENU_REQUEST__"))}catch{}
/* ===== Player size / position memory =====
 * Remembers how big the user made each player and where they left it, for both
 * players: "win" = the dedicated popup window, "pip" = the always-on-top
 * Document PiP window.  Sizes are viewport (inner) sizes and are kept per video
 * shape (portrait / square / landscape): the next video of the same shape
 * reuses the user's size, a different shape (9:16 -> 16:9) is fitted again.
 * x/y is the window's screen position.  This MAIN-world hook cannot use
 * chrome.storage, so tiktok-loader.js (ISOLATED world) keeps everything in
 * chrome.storage.local (survives closing the browser) and relays it here with
 * CustomEvents, the same way it relays the always-on-top option above. */
let playerBounds={},playerBoundsLoaded=!1,playerBoundsWaiters=[];
window.addEventListener("__DOWNLOAD_PLAYER_BOUNDS__",event=>{
try{const parsed=JSON.parse(event&&event.detail&&event.detail.json);if(parsed&&typeof parsed==="object")playerBounds=parsed}catch{}
playerBoundsLoaded=!0;const waiters=playerBoundsWaiters;playerBoundsWaiters=[];for(const done of waiters)done()
});
try{window.dispatchEvent(new CustomEvent("__DOWNLOAD_PLAYER_BOUNDS_REQUEST__"))}catch{}
function playerBoundsReady(timeout){
if(playerBoundsLoaded)return Promise.resolve();
return new Promise(resolve=>{const timer=setTimeout(resolve,timeout||800);playerBoundsWaiters.push(()=>{clearTimeout(timer);resolve()})})
}
function playerShape(vw,vh){const ratio=vw/vh;return ratio<.8?"portrait":ratio>1.25?"landscape":"square"}
function savedPlayerBounds(mode){const rec=playerBounds&&playerBounds[mode];return rec&&typeof rec==="object"?rec:{}}
function savedPlayerSize(mode,shape){
const rec=savedPlayerBounds(mode),size=rec.sizes&&rec.sizes[shape];
return size&&Number.isFinite(size.w)&&Number.isFinite(size.h)&&size.w>=120&&size.h>=80?{w:Math.round(size.w),h:Math.round(size.h)}:null
}
/* Size to open a new window at before its video (and so its shape) is known: the last size used. */
function playerStartSize(mode,fallback){
const size=savedPlayerSize(mode,savedPlayerBounds(mode).last)||fallback,scr=window.screen||{};
return{w:Math.min(size.w,scr.availWidth||size.w),h:Math.min(size.h,scr.availHeight||size.h)}
}
function pipWindowOptions(){const size=playerStartSize("pip",{w:400,h:680});return{width:size.w,height:size.h}}
function playerWindowFeatures(){
const rec=savedPlayerBounds("win"),size=playerStartSize("win",{w:560,h:820});
let features="popup=yes,width="+size.w+",height="+size.h+",resizable=yes,scrollbars=no";
if(Number.isFinite(rec.x)&&Number.isFinite(rec.y))features+=",left="+Math.round(rec.x)+",top="+Math.round(rec.y);
return features
}
/* True while the window is maximised or fullscreen (outer size covers the work area). */
function playerWindowIsFilled(win){
try{
if(win.document&&win.document.fullscreenElement)return!0;
const scr=win.screen||{};
return!!scr.availWidth&&win.outerWidth>=scr.availWidth-2&&win.outerHeight>=scr.availHeight-2
}catch{return!1}
}
function savePlayerBounds(mode,patch){
try{
const rec=Object.assign({},savedPlayerBounds(mode));rec.sizes=Object.assign({},rec.sizes);
if(patch.shape&&Number.isFinite(patch.w)&&Number.isFinite(patch.h)){rec.sizes[patch.shape]={w:Math.round(patch.w),h:Math.round(patch.h)};rec.last=patch.shape}
if(Number.isFinite(patch.x)&&Number.isFinite(patch.y)){rec.x=Math.round(patch.x);rec.y=Math.round(patch.y)}
if(Number.isFinite(patch.mx)&&Number.isFinite(patch.my)){rec.mx=Math.round(patch.mx);rec.my=Math.round(patch.my)}
if(typeof patch.max==="boolean")rec.max=patch.max;
playerBounds=Object.assign({},playerBounds,{[mode]:rec});
window.dispatchEvent(new CustomEvent("__DOWNLOAD_PLAYER_BOUNDS_SAVE__",{detail:{json:JSON.stringify(Object.assign({mode},patch))}}))
}catch{}
}
/* Resize a player window so its VIEWPORT becomes width x height.  resizeTo() is read as an outer size by
 * normal popups; if a window reads it differently the one-shot resizeBy() below corrects the difference.
 * Chrome may still clamp the result (e.g. Document PiP has a maximum size). */
function applyPlayerInnerSize(win,width,height){
try{
const tw=Math.round(width),th=Math.round(height);
win.__downloadBoundsHold=Date.now()+1800;
if(Math.abs(win.innerWidth-tw)<=3&&Math.abs(win.innerHeight-th)<=3)return;
const extraW=Math.max(0,win.outerWidth-win.innerWidth),extraH=Math.max(0,win.outerHeight-win.innerHeight);
win.resizeTo(tw+extraW,th+extraH);
win.setTimeout(()=>{try{
const dx=tw-win.innerWidth,dy=th-win.innerHeight;if(Math.abs(dx)>3||Math.abs(dy)>3)win.resizeBy(dx,dy);
}catch{}},350)
}catch{}
}
/* Watches a player window and saves its size / position once the user has stopped changing it
 * (there is no "moved" event, so it polls).  getShape() returns the shape of the video currently shown. */
function trackPlayerBounds(win,mode,getShape){
if(!win||win.__downloadBoundsTracker)return;
win.__downloadBoundsTracker=!0;
let lastSig="",savedSig="",stableSince=Date.now(),timer=0;
const stop=()=>{try{win.clearInterval(timer)}catch{}};
const snapshot=force=>{
if(win.closed){stop();return}
if(Date.now()<(win.__downloadBoundsHold||0)){lastSig="";return}
if(win.document&&win.document.fullscreenElement)return;
const w=win.innerWidth,h=win.innerHeight;if(!(w>0&&h>0))return;
const filled=mode==="win"&&playerWindowIsFilled(win),sig=filled?"max,"+win.screenX+","+win.screenY:[w,h,win.screenX,win.screenY].join();
if(!force){if(sig!==lastSig){lastSig=sig;stableSince=Date.now();return}if(Date.now()-stableSince<450)return}
if(sig===savedSig)return;
const shape=getShape();if(!shape)return;
savedSig=sig;
filled?savePlayerBounds(mode,{max:!0,mx:win.screenX,my:win.screenY}):savePlayerBounds(mode,{shape,w,h,x:win.screenX,y:win.screenY,max:!1})
};
try{timer=win.setInterval(()=>{try{snapshot(!1)}catch{}},250)}catch{}
try{win.addEventListener("pagehide",()=>{try{snapshot(!0)}catch{}stop()},{once:!0})}catch{}
}
/* ===== [Download] Player window placement across displays =====
 * window.open(left / top), moveTo() and resizeTo() of a page are held to the display the window is on (the opener's, for a
 * new window), so a player the user left on the second monitor came back on the first one - and, fitted against the work
 * area of that other monitor, with a size cut down to it.  The extension API is not held to that: the saved place is
 * applied by background.js with chrome.windows.update(), after checking it against the displays connected right now (a
 * monitor that is gone gives the nearest one, never an off-screen window).  Same relay as the other hooks:
 *   here -> loader -> background :  __DOWNLOAD_PLAYER_PLACE__ { json: { id, mode, x, y, w, h, fill, cx, cy } }
 *       mode "win" = this dedicated player window (outer size w x h, fill = it filled the work area when it was left);
 *       mode "pip" = the always-on-top player: only the place is applied (cx / cy = where it is now, w x h = its size)
 *   background -> loader -> here :  __DOWNLOAD_PLAYER_PLACED__ { json: { id, ok } }
 * The dedicated window waits for the answer before it fits itself (a short timeout when nothing answers). */
const PLAYER_PLACE_EVENT="__DOWNLOAD_PLAYER_PLACE__",PLAYER_PLACED_EVENT="__DOWNLOAD_PLAYER_PLACED__";
let playerPlaceSeq=0,playerPlaceState=0;
const playerPlaceWaiters=new Map();
window.addEventListener(PLAYER_PLACED_EVENT,event=>{
try{const data=JSON.parse(event&&event.detail&&event.detail.json),done=data&&playerPlaceWaiters.get(data.id);if(done)done(data.ok===!0)}catch{}
});
function sendPlayerPlacement(detail,timeout){
return new Promise(resolve=>{
const id=++playerPlaceSeq;let timer=0;
const finish=ok=>{if(!playerPlaceWaiters.has(id))return;playerPlaceWaiters.delete(id);clearTimeout(timer);resolve(ok)};
playerPlaceWaiters.set(id,finish);timer=setTimeout(()=>finish(!1),timeout||900);
try{window.dispatchEvent(new CustomEvent(PLAYER_PLACE_EVENT,{detail:{json:JSON.stringify(Object.assign({id},detail))}}))}catch{finish(!1)}
})
}
/* The dedicated window: move / size it to where the user left it (on whichever display that was) before it fits itself. */
async function placeSavedPlayerWindow(video){
try{
const rec=savedPlayerBounds("win"),fill=rec.max===!0;
const x=fill&&Number.isFinite(rec.mx)?rec.mx:rec.x,y=fill&&Number.isFinite(rec.my)?rec.my:rec.y;
if(!Number.isFinite(x)||!Number.isFinite(y))return;
const detail={mode:"win",x:Math.round(x),y:Math.round(y),fill};
if(fill){
if(playerWindowIsFilled(window)&&Math.abs(window.screenX-detail.x)<=16&&Math.abs(window.screenY-detail.y)<=16)return
}else{
const size=savedPlayerSize("win",playerShape(video.videoWidth,video.videoHeight));
if(size){detail.w=size.w+Math.max(0,window.outerWidth-window.innerWidth);detail.h=size.h+Math.max(0,window.outerHeight-window.innerHeight)}
if(Math.abs(window.screenX-detail.x)<=4&&Math.abs(window.screenY-detail.y)<=4&&(!size||Math.abs(window.outerWidth-detail.w)<=4&&Math.abs(window.outerHeight-detail.h)<=4))return
}
if(await sendPlayerPlacement(detail,900))await new Promise(done=>setTimeout(done,150))
}catch{}
}
/* Called at the top of fitVideoPlayerWindow(): the first time it runs in a dedicated player window the fit is put off until
 * the window was placed, then it runs again (true = "this call is handled, return"). */
function deferFitForPlacement(video){
if(playerPlaceState===2||!isDedicatedPlayerWindow())return!1;
if(playerPlaceState===1)return!0;
playerPlaceState=1;
placeSavedPlayerWindow(video).catch(()=>{}).then(()=>{playerPlaceState=2;fitVideoPlayerWindow(video)});
return!0
}
/* The always-on-top player: once its size is applied, put it where the user left it (the moveTo() above is held to the display
 * it opened on). */
function schedulePipPlacement(pipWindow,rec){
try{
pipWindow.setTimeout(()=>{try{
if(pipWindow.closed)return;
const x=Math.round(rec.x),y=Math.round(rec.y);
if(Math.abs(pipWindow.screenX-x)<=4&&Math.abs(pipWindow.screenY-y)<=4)return;
sendPlayerPlacement({mode:"pip",x,y,w:Math.round(pipWindow.outerWidth),h:Math.round(pipWindow.outerHeight),cx:Math.round(pipWindow.screenX),cy:Math.round(pipWindow.screenY)},900)
}catch{}},900)
}catch{}
}
/* The always-on-top player is asked for with requestWindow(), which has no left / top: Chrome opens it in the bottom-right
 * corner of the opener's display.  fitDocumentPipWindow() only moves it once the video's metadata is known (+ 450 / 900 ms),
 * so it sat in that corner for a second or more.  requestPipWindow() moves it to the saved place as soon as the window exists -
 * before the stream is even fetched.  The later moves stay as a second chance (they skip a window that is already there). */
function requestPipWindow(){
const request=window.documentPictureInPicture.requestWindow(pipWindowOptions());
request.then(placePipWindowEarly,()=>{});
return request
}
function placePipWindowEarly(pipWindow){
try{
const rec=savedPlayerBounds("pip");
if(!pipWindow||!Number.isFinite(rec.x)||!Number.isFinite(rec.y))return;
const x=Math.round(rec.x),y=Math.round(rec.y);let tries=0;
const attempt=()=>{
try{
/* fitDocumentPipWindow() has taken over once the video is known. */
if(pipWindow.closed||pipWindow.__downloadPipPlaced||tries++>=6)return;
if(Math.abs(pipWindow.screenX-x)<=4&&Math.abs(pipWindow.screenY-y)<=4)return;
try{pipWindow.moveTo(x,y)}catch{}
/* background.js finds the window by its size, which may not be listed yet in the first milliseconds: try again shortly. */
sendPlayerPlacement({mode:"pip",x,y,w:Math.round(pipWindow.outerWidth),h:Math.round(pipWindow.outerHeight),cx:Math.round(pipWindow.screenX),cy:Math.round(pipWindow.screenY)},600).then(ok=>{try{if(!ok)pipWindow.setTimeout(attempt,150)}catch{}})
}catch{}
};
attempt()
}catch{}
}
/* ===== [/Download] Player window placement across displays ===== */
/* ===== [Download] Player segment popup ("Chia đoạn") =====
 * Started from the "Chia đoạn" button of the "Video đã chọn" panel (assets/multi-select.js): the user picks the number
 * of segments (2-20) and the number of columns they are shown in (1-4).  While it is on, every player this hook builds -
 * the always-on-top Document PiP player ("pip") and the dedicated player window ("win") - gets a frame strip that cuts
 * the video into that many equal segments and shows every segment as a thumbnail of its FIRST FRAME (with its number
 * and start time on it), in the chosen number of columns.  The segment being played is outlined and shows its own
 * progress; a click on a thumbnail seeks the video to the start of that segment and plays.
 * The thumbnails come from a second, hidden <video> with the same source: it is seeked to the start of every segment one
 * after the other and each frame is drawn into a small canvas, so the player itself is never disturbed.  If that stream
 * cannot be opened a second time, the thumbnail is taken from the player itself the first time its segment is jumped to
 * (until a frame exists a cell just shows its number and time).
 * The strip is drawn inside the player's own document, so it works the same in both players (a separate window could
 * not be opened without a user gesture and would not stay above the always-on-top player).  It starts docked: at the
 * right of the video, OUTSIDE the picture - while it is docked the video is made narrower by the width of the strip
 * (see segmentApplyInset).  The user drags it by its title bar anywhere else (it then floats over the video and the
 * video takes the whole window again) and drops it against the right edge to dock it again.  The place is remembered
 * per player as a fraction of the room left in the window (x = 1 means docked), so it stays inside a window of another
 * size.  Settings and place travel like the player size
 * memory above: tiktok-loader.js (ISOLATED world) keeps them in chrome.storage.local - they survive closing the browser
 * and restarting the PC - and relays them here with CustomEvents:
 *   loader -> here : __DOWNLOAD_PLAYER_SEGMENTS__ / __DOWNLOAD_PLAYER_SEGMENT_POS__  { json }
 *   here -> loader : __DOWNLOAD_PLAYER_SEGMENTS_REQUEST__ / __DOWNLOAD_PLAYER_SEGMENT_POS_REQUEST__  (ask once on load)
 *   here -> loader : __DOWNLOAD_PLAYER_SEGMENTS_SAVE__ { json: { enabled } }  (the popup's × turns the feature off)
 *   here -> loader : __DOWNLOAD_PLAYER_SEGMENT_POS_SAVE__ { json: { mode, x, y } }  (after a drag) */
const SEGMENT_PANEL_ID="__download_player_segments",SEGMENT_STRIP_ID="__download_player_segments_strip",SEGMENT_COUNT_MIN=2,SEGMENT_COUNT_MAX=20,SEGMENT_COLS_MIN=1,SEGMENT_COLS_MAX=4,SEGMENT_MARGIN=8,SEGMENT_BOTTOM_RESERVE=64,SEGMENT_CELL_MIN=36,SEGMENT_CELL_MAX=88,SEGMENT_MAX_SHARE=.4,SEGMENT_GAP=4,SEGMENT_CHROME=26,SEGMENT_SNAP=16,SEGMENT_THUMB_WIDTH=128;
let segmentSettings={enabled:!1,count:15,cols:3},segmentPos={};
const segmentContexts=new Set;
function segmentInt(value,min,max,fallback){const n=Math.round(Number(value));return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback}
function segmentContextAlive(ctx){try{return!!ctx.view&&!ctx.view.closed&&!!ctx.host&&ctx.host.isConnected}catch{return!1}}
window.addEventListener("__DOWNLOAD_PLAYER_SEGMENTS__",event=>{
try{
const parsed=JSON.parse(event&&event.detail&&event.detail.json);
if(parsed&&typeof parsed==="object")segmentSettings={enabled:parsed.enabled===!0,count:segmentInt(parsed.count,SEGMENT_COUNT_MIN,SEGMENT_COUNT_MAX,15),cols:segmentInt(parsed.cols,SEGMENT_COLS_MIN,SEGMENT_COLS_MAX,3)}
}catch{}
syncSegmentPanels()
});
window.addEventListener("__DOWNLOAD_PLAYER_SEGMENT_POS__",event=>{
try{const parsed=JSON.parse(event&&event.detail&&event.detail.json);if(parsed&&typeof parsed==="object")segmentPos=parsed}catch{}
for(const ctx of Array.from(segmentContexts))placeSegmentPanel(ctx)
});
try{window.dispatchEvent(new CustomEvent("__DOWNLOAD_PLAYER_SEGMENTS_REQUEST__"));window.dispatchEvent(new CustomEvent("__DOWNLOAD_PLAYER_SEGMENT_POS_REQUEST__"))}catch{}
function segmentCss(){
const p="#"+SEGMENT_PANEL_ID;
return[
p+"{position:absolute!important;z-index:2147483646!important;box-sizing:border-box!important;min-width:96px!important;max-height:calc(100% - "+(SEGMENT_MARGIN+SEGMENT_BOTTOM_RESERVE)+"px)!important;display:flex!important;flex-direction:column!important;margin:0!important;padding:0!important;border-radius:10px!important;background:rgba(18,18,24,.93)!important;border:1px solid rgba(255,255,255,.16)!important;box-shadow:0 8px 26px rgba(0,0,0,.55)!important;color:#fff!important;font:500 11px/1.2 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif!important;overflow:hidden!important;user-select:none!important;-webkit-user-select:none!important;cursor:default!important}",
p+" .dl-seg-head{display:flex!important;align-items:center!important;gap:6px!important;flex:none!important;padding:5px 5px 5px 9px!important;border-bottom:1px solid rgba(255,255,255,.1)!important;cursor:grab!important;touch-action:none!important}",
p+" .dl-seg-head.is-drag{cursor:grabbing!important}",
p+" .dl-seg-title{flex:1!important;min-width:0!important;font-weight:700!important;font-size:11px!important;white-space:nowrap!important;color:#fff!important}",
p+" .dl-seg-close{flex:none!important;width:18px!important;height:18px!important;margin:0!important;padding:0!important;border:0!important;border-radius:5px!important;background:transparent!important;color:#fff!important;font:700 14px/1 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif!important;cursor:pointer!important}",
p+" .dl-seg-close:hover{background:rgba(255,255,255,.18)!important}",
p+" .dl-seg-grid{display:grid!important;justify-content:center!important;align-content:start!important;gap:"+SEGMENT_GAP+"px!important;margin:0!important;padding:6px!important;overflow-x:hidden!important;overflow-y:auto!important;overscroll-behavior:contain!important;scrollbar-width:thin!important;min-height:0!important}",
p+" .dl-seg-cell{position:relative!important;display:block!important;align-self:start!important;width:100%!important;height:auto!important;aspect-ratio:var(--dl-seg-ar,.5625)!important;min-width:0!important;margin:0!important;padding:0!important;border:1px solid rgba(255,255,255,.14)!important;border-radius:6px!important;background:rgba(255,255,255,.07)!important;color:#fff!important;overflow:hidden!important;cursor:pointer!important}",
p+" .dl-seg-cell:hover{border-color:rgba(255,255,255,.5)!important}",
p+" .dl-seg-cell.is-active{border-color:rgba(34,211,238,.9)!important;box-shadow:0 0 0 1px rgba(34,211,238,.6)!important}",
p+" .dl-seg-img{display:none!important;position:absolute!important;left:0!important;top:0!important;width:100%!important;height:100%!important;margin:0!important;object-fit:cover!important}",
p+" .dl-seg-cell.has-frame .dl-seg-img{display:block!important}",
p+" .dl-seg-no{position:absolute!important;left:2px!important;top:2px!important;z-index:1!important;min-width:14px!important;padding:2px 3px!important;border-radius:4px!important;background:rgba(0,0,0,.62)!important;color:#fff!important;font-size:10px!important;font-weight:700!important;line-height:1!important;text-align:center!important}",
p+" .dl-seg-cell.is-active .dl-seg-no{background:rgba(34,211,238,.95)!important;color:#042a31!important}",
p+" .dl-seg-at{position:absolute!important;left:0!important;right:0!important;bottom:0!important;z-index:1!important;padding:10px 2px 3px!important;background:linear-gradient(rgba(0,0,0,0),rgba(0,0,0,.78))!important;color:#fff!important;font-size:10px!important;line-height:1!important;text-align:center!important;font-variant-numeric:tabular-nums!important}",
p+" .dl-seg-cell::after{content:\"\"!important;position:absolute!important;left:0!important;bottom:0!important;z-index:2!important;width:0!important;height:3px!important;background:#22d3ee!important}",
p+" .dl-seg-cell.is-active::after{width:var(--p,0%)!important}"
].join("")
}
/* Room the popup can move in: the window minus a margin, and minus the strip at the bottom the player controls use. */
function segmentBounds(ctx){
const view=ctx.view,panel=ctx.panel,vw=view.innerWidth,vh=view.innerHeight,pw=panel.offsetWidth,ph=panel.offsetHeight;
return{vw,vh,pw,ph,freeW:Math.max(0,vw-pw-SEGMENT_MARGIN*2),freeH:Math.max(0,vh-ph-SEGMENT_MARGIN-SEGMENT_BOTTOM_RESERVE)}
}
/* Sizes of the cells and of the strip: from the window width (the strip may take at most SEGMENT_MAX_SHARE of it) and the
 * video's aspect ratio (a cell is as tall as one frame).  Cheap to call again: nothing changes unless a size did. */
function layoutSegmentPanel(ctx){
const panel=ctx.panel,grid=ctx.grid;if(!panel||!grid)return;
const vw=ctx.view.innerWidth;if(!(vw>0))return;
const cols=ctx.cols,cellW=Math.max(SEGMENT_CELL_MIN,Math.min(SEGMENT_CELL_MAX,Math.floor((vw*SEGMENT_MAX_SHARE-SEGMENT_CHROME-(cols-1)*SEGMENT_GAP)/cols))),sig=cellW+"|"+ctx.aspect.toFixed(3);
if(sig===ctx.layoutSig)return;
ctx.layoutSig=sig;
grid.style.setProperty("grid-template-columns","repeat("+cols+","+cellW+"px)","important");
grid.style.setProperty("--dl-seg-ar",ctx.aspect.toFixed(4));
panel.style.setProperty("width",(cols*cellW+(cols-1)*SEGMENT_GAP+SEGMENT_CHROME)+"px","important")
}
/* While the strip is docked (px > 0) the video is made `px` narrower, so the strip sits beside the picture instead of on
 * top of it; px = 0 gives the video its normal size back.  The players size their <video> with inline !important
 * declarations, which only inline !important can override - so the normal values are put back by hand: "pip" is 100%
 * wide, "win" is 100vw wide (a centred flex item: the right margin keeps the narrower video at the left edge). */
function segmentApplyInset(ctx,px){
ctx.inset=px;
try{
const video=ctx.getVideo();if(!video)return;
const set=(name,value)=>{
if(!value){if(video.style.getPropertyValue(name))video.style.removeProperty(name);return}
if(video.style.getPropertyValue(name)!==value||video.style.getPropertyPriority(name)!=="important")video.style.setProperty(name,value,"important")
};
const full=ctx.mode==="win"?"100vw":"100%",size=px>0?"calc("+full+" - "+px+"px)":full;
set("width",size);
if(ctx.mode==="win"){set("max-width",size);set("margin-right",px>0?px+"px":"")}
}catch{}
}
/* Puts the popup at the saved place of its player.  Nothing saved, or x = 1: docked - against the right edge, beside the
 * video, which gives up that much width.  Any other saved place: floating over the video, which keeps its full size. */
function placeSegmentPanel(ctx){
const panel=ctx.panel;if(!panel||!panel.isConnected||ctx.dragging)return;
layoutSegmentPanel(ctx);
const b=segmentBounds(ctx);if(!(b.vw>0&&b.vh>0&&b.pw>0))return;
const saved=segmentPos&&segmentPos[ctx.mode],docked=!(saved&&Number.isFinite(saved.x)&&saved.x<.9995),fx=docked?1:saved.x,fy=saved&&Number.isFinite(saved.y)?saved.y:.5;
panel.style.setProperty("left",Math.round(SEGMENT_MARGIN+b.freeW*Math.max(0,Math.min(1,fx)))+"px","important");
panel.style.setProperty("top",Math.round(SEGMENT_MARGIN+b.freeH*Math.max(0,Math.min(1,fy)))+"px","important");
const reserve=docked?b.pw+SEGMENT_MARGIN*2:0;
if(ctx.strip){ctx.strip.style.setProperty("width",reserve+"px","important");ctx.strip.style.setProperty("display",docked?"block":"none","important")}
segmentApplyInset(ctx,reserve)
}
function saveSegmentPos(ctx){
try{
const panel=ctx.panel;if(!panel||!panel.isConnected)return;
const b=segmentBounds(ctx),left=parseFloat(panel.style.left),top=parseFloat(panel.style.top);
if(!Number.isFinite(left)||!Number.isFinite(top))return;
const x=b.freeW>0?Math.max(0,Math.min(1,(left-SEGMENT_MARGIN)/b.freeW)):1,y=b.freeH>0?Math.max(0,Math.min(1,(top-SEGMENT_MARGIN)/b.freeH)):.5;
segmentPos=Object.assign({},segmentPos,{[ctx.mode]:{x,y}});
window.dispatchEvent(new CustomEvent("__DOWNLOAD_PLAYER_SEGMENT_POS_SAVE__",{detail:{json:JSON.stringify({mode:ctx.mode,x,y})}}))
}catch{}
}
function bindSegmentDrag(ctx,head){
head.addEventListener("pointerdown",event=>{
if(event.button!==0||(event.target&&event.target.closest&&event.target.closest(".dl-seg-close")))return;
const panel=ctx.panel;if(!panel)return;
event.preventDefault();
const rect=panel.getBoundingClientRect(),offX=event.clientX-rect.left,offY=event.clientY-rect.top,pointerId=event.pointerId;
ctx.dragging=!0;head.classList.add("is-drag");try{head.setPointerCapture(pointerId)}catch{}
const move=e=>{
const b=segmentBounds(ctx),left=Math.max(SEGMENT_MARGIN,Math.min(SEGMENT_MARGIN+b.freeW,e.clientX-offX)),top=Math.max(SEGMENT_MARGIN,Math.min(SEGMENT_MARGIN+b.freeH,e.clientY-offY));
panel.style.setProperty("left",Math.round(left)+"px","important");panel.style.setProperty("top",Math.round(top)+"px","important")
};
const done=()=>{
head.removeEventListener("pointermove",move);head.removeEventListener("pointerup",done);head.removeEventListener("pointercancel",done);
try{head.releasePointerCapture(pointerId)}catch{}
head.classList.remove("is-drag");ctx.dragging=!1;
/* Dropped against the right edge: snap to it - that docks the strip beside the video again. */
const b=segmentBounds(ctx),left=parseFloat(panel.style.left);
if(Number.isFinite(left)&&left>=SEGMENT_MARGIN+b.freeW-SEGMENT_SNAP)panel.style.setProperty("left",Math.round(SEGMENT_MARGIN+b.freeW)+"px","important");
saveSegmentPos(ctx);placeSegmentPanel(ctx)
};
head.addEventListener("pointermove",move);head.addEventListener("pointerup",done);head.addEventListener("pointercancel",done)
})
}
/* ---- Frames: one thumbnail per segment, its first frame ---- */
function segmentStartTime(duration,count,index){return index===0?0:Math.min(duration,duration*index/count+.001)}
/* Resolves true when `name` fires on `target`, false on an error event or after `timeout` ms. */
function segmentWaitEvent(target,name,timeout){
return new Promise(resolve=>{
let finished=!1,timer=0;
const finish=value=>{if(finished)return;finished=!0;clearTimeout(timer);target.removeEventListener(name,onEvent);target.removeEventListener("error",onError);resolve(value)},onEvent=()=>finish(!0),onError=()=>finish(!1);
target.addEventListener(name,onEvent);target.addEventListener("error",onError);timer=setTimeout(()=>finish(!1),timeout)
})
}
/* Resolves true once `video` presented a frame whose time is within `tolerance` s of `time`, false after `timeout` ms.
 * Right after "seeked" drawImage() can still get the PREVIOUS frame (seen when the player decodes at the same time), so
 * the frame is waited for with requestVideoFrameCallback; without it a short pause has to do. */
function segmentFramePresented(video,time,tolerance,timeout){
return new Promise(resolve=>{
if(typeof video.requestVideoFrameCallback!=="function"){setTimeout(resolve,150,!0);return}
let finished=!1;
const finish=value=>{if(finished)return;finished=!0;clearTimeout(timer);resolve(value)},timer=setTimeout(()=>finish(!1),timeout);
const onFrame=(now,meta)=>{
if(finished)return;
if(Math.abs(Number(meta&&meta.mediaTime)-time)<=tolerance){finish(!0);return}
try{video.requestVideoFrameCallback(onFrame)}catch{finish(!1)}
};
try{video.requestVideoFrameCallback(onFrame)}catch{finish(!1)}
})
}
async function segmentSeekHelper(helper,time,spacing){
if(helper.error)return!1;
const seeked=segmentWaitEvent(helper,"seeked",9000),presented=segmentFramePresented(helper,time,Math.max(.1,Math.min(.25,spacing/2)),1500);
try{helper.currentTime=time}catch{return!1}
if(!await seeked)return!1;
if(helper.readyState<2&&!await segmentWaitEvent(helper,"loadeddata",3000)&&helper.readyState<2)return!1;
await presented;
return helper.videoWidth>0
}
/* Draws the frame `source` (a <video>) is showing into the thumbnail of segment `index`. */
function segmentDrawFrame(ctx,index,source){
const cell=ctx.cells[index];if(!cell)return!1;
const w=source.videoWidth,h=source.videoHeight;if(!(w>0&&h>0))return!1;
const canvas=cell.canvas,tw=SEGMENT_THUMB_WIDTH,th=Math.max(1,Math.round(tw*h/w));
try{
if(canvas.width!==tw||canvas.height!==th){canvas.width=tw;canvas.height=th}
canvas.getContext("2d").drawImage(source,0,0,tw,th)
}catch{return!1}
cell.done=!0;cell.el.classList.add("has-frame");return!0
}
function segmentResetFrames(ctx){
for(const cell of ctx.cells){cell.done=!1;cell.el.classList.remove("has-frame");try{cell.canvas.width=cell.canvas.width}catch{}}
}
function segmentStopFrames(ctx){
if(ctx.job)ctx.job.cancelled=!0;ctx.job=null;
const helper=ctx.helper;ctx.helper=null;
if(helper){try{helper.pause()}catch{}try{helper.removeAttribute("src");helper.load()}catch{}try{helper.remove()}catch{}}
}
/* Takes the first frame of every segment with a hidden second <video> (same source, never played): seek, wait for the
 * frame, draw, next.  It lives in the page's own document (where the player's source was loaded from) and is thrown
 * away as soon as it is done, cancelled, or fails twice. */
function segmentStartFrames(ctx,src,duration){
segmentStopFrames(ctx);
if(!src||!(duration>0)||!ctx.cells.length)return;
const job={cancelled:!1},count=ctx.cells.length;
let helper=null;
try{
helper=document.createElement("video");
helper.muted=!0;helper.preload="auto";helper.playsInline=!0;helper.controls=!1;
helper.style.cssText="position:fixed!important;left:-10000px!important;top:-10000px!important;width:2px!important;height:2px!important;opacity:0!important;pointer-events:none!important";
helper.src=src;(document.body||document.documentElement).appendChild(helper)
}catch{return}
ctx.job=job;ctx.helper=helper;
(async()=>{
if(helper.readyState<1&&!await segmentWaitEvent(helper,"loadedmetadata",12000))return;
let failed=0;
for(let i=0;i<count;i++){
if(job.cancelled)return;
const cell=ctx.cells[i];if(!cell||cell.done)continue;
if(await segmentSeekHelper(helper,segmentStartTime(duration,count,i),duration/count)){if(!job.cancelled)segmentDrawFrame(ctx,i,helper)}
else if(++failed>=2)return
}
})().catch(()=>{}).then(()=>{if(ctx.job===job)segmentStopFrames(ctx)})
}
/* Jump to the start of segment `index` (0-based) and play. */
function jumpToSegment(ctx,index){
const video=ctx.getVideo();if(!video)return;
const duration=Number.isFinite(video.duration)?video.duration:0;if(!(duration>0))return;
const count=ctx.cells.length||segmentSettings.count,cell=ctx.cells[index];
try{
video.currentTime=segmentStartTime(duration,count,index);
/* No thumbnail for it yet (the hidden video could not get it): the frame the player shows after this seek is that one. */
if(cell&&!cell.done)video.addEventListener("seeked",()=>{if(ctx.cells[index]===cell)segmentDrawFrame(ctx,index,video)},{once:!0});
const played=video.play();played&&played.catch&&played.catch(()=>{})
}catch{}
tickSegmentPanel(ctx)
}
/* Runs a few times a second: start times + thumbnails once the duration is known (also after the player switched to
 * another video), the strip's aspect ratio once the picture size is known, and the highlight + progress of the segment
 * being played. */
function tickSegmentPanel(ctx){
if(!segmentContextAlive(ctx)){removeSegmentPanel(ctx);segmentContexts.delete(ctx);return}
if(!ctx.panel||!ctx.panel.isConnected){removeSegmentPanel(ctx);return}
const video=ctx.getVideo(),duration=video&&Number.isFinite(video.duration)&&video.duration>0?video.duration:0,count=ctx.cells.length,src=video?video.currentSrc||video.src||"":"",sig=duration?src+"|"+duration.toFixed(2):"";
/* The players set their <video>'s inline size on their own: keep the docked width. */
if(ctx.inset>0)segmentApplyInset(ctx,ctx.inset);
const pw=video?video.videoWidth:0,ph=video?video.videoHeight:0,aspect=pw>0&&ph>0?Math.max(.4,Math.min(2.5,pw/ph)):ctx.aspect;
if(aspect!==ctx.aspect){ctx.aspect=aspect;placeSegmentPanel(ctx)}
if(sig!==ctx.durationSig){
ctx.durationSig=sig;
ctx.cells.forEach((cell,i)=>{
cell.at.textContent=duration?formatPlayerTime(duration*i/count):"–";
cell.el.title=duration?"Đoạn "+(i+1)+": "+formatPlayerTime(duration*i/count)+" – "+formatPlayerTime(duration*(i+1)/count):"Đoạn "+(i+1)
});
segmentResetFrames(ctx);
sig?segmentStartFrames(ctx,src,duration):segmentStopFrames(ctx)
}
let active=-1,fill=0;
if(duration){const pos=Math.min(.999999,Math.max(0,(Number(video.currentTime)||0)/duration))*count;active=Math.floor(pos);fill=pos-active}
if(active!==ctx.active){
if(ctx.cells[ctx.active])ctx.cells[ctx.active].el.classList.remove("is-active");
if(ctx.cells[active])ctx.cells[active].el.classList.add("is-active");
ctx.active=active;ctx.fill=-1
}
if(active>=0){const pct=Math.round(fill*100);if(pct!==ctx.fill){ctx.fill=pct;ctx.cells[active].el.style.setProperty("--p",pct+"%")}}
}
function removeSegmentPanel(ctx){
try{if(ctx.timer)ctx.view.clearInterval(ctx.timer)}catch{}
try{if(ctx.onResize)ctx.view.removeEventListener("resize",ctx.onResize)}catch{}
segmentStopFrames(ctx);
try{if(ctx.panel)ctx.panel.remove()}catch{}
try{if(ctx.strip)ctx.strip.remove()}catch{}
if(ctx.inset>0)segmentApplyInset(ctx,0);
ctx.timer=0;ctx.onResize=null;ctx.panel=null;ctx.strip=null;ctx.grid=null;ctx.cells=[];ctx.key="";ctx.dragging=!1;ctx.inset=0;ctx.layoutSig=""
}
/* The × of the popup: turns the whole feature off (the "Chia đoạn" button of the panel turns it on again). */
function disableSegmentPanels(){
segmentSettings=Object.assign({},segmentSettings,{enabled:!1});syncSegmentPanels();
try{window.dispatchEvent(new CustomEvent("__DOWNLOAD_PLAYER_SEGMENTS_SAVE__",{detail:{json:JSON.stringify({enabled:!1})}}))}catch{}
}
function buildSegmentPanel(ctx,key){
removeSegmentPanel(ctx);
const view=ctx.view,doc=view.document,count=segmentSettings.count,cols=segmentSettings.cols;
const panel=doc.createElement("div"),style=doc.createElement("style"),head=doc.createElement("div"),title=doc.createElement("span"),close=doc.createElement("button"),grid=doc.createElement("div"),strip=doc.createElement("div");
panel.id=SEGMENT_PANEL_ID;panel.setAttribute("role","group");panel.setAttribute("aria-label","Chia đoạn video");
/* The strip is the black column the docked popup sits in: it keeps the video's side free of clicks (the dedicated player
 * window closes on a click on its black margin).  It stops above the strip the player controls use. */
strip.id=SEGMENT_STRIP_ID;strip.setAttribute("aria-hidden","true");strip.style.cssText="position:absolute!important;top:0!important;right:0!important;bottom:"+SEGMENT_BOTTOM_RESERVE+"px!important;width:0!important;display:none!important;z-index:2147483645!important;box-sizing:border-box!important;margin:0!important;padding:0!important;background:#0b0b0f!important;border-left:1px solid rgba(255,255,255,.08)!important";
style.textContent=segmentCss();
head.className="dl-seg-head";head.title="Kéo để di chuyển (thả sát mép phải để gắn lại cạnh video)";
title.className="dl-seg-title";title.textContent="Chia đoạn · "+count;
close.type="button";close.className="dl-seg-close";close.tabIndex=-1;close.textContent="×";close.title="Tắt Chia đoạn (bật lại bằng nút \"Chia đoạn\" trong danh sách Video đã chọn)";
close.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();disableSegmentPanels()});
head.append(title,close);
grid.className="dl-seg-grid";
ctx.cells=[];
for(let i=0;i<count;i++){
const cell=doc.createElement("button"),img=doc.createElement("canvas"),no=doc.createElement("span"),at=doc.createElement("span");
cell.type="button";cell.className="dl-seg-cell";cell.tabIndex=-1;
img.className="dl-seg-img";no.className="dl-seg-no";no.textContent=String(i+1);at.className="dl-seg-at";at.textContent="–";
cell.append(img,no,at);
cell.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();jumpToSegment(ctx,i)});
ctx.cells.push({el:cell,at,canvas:img,done:!1});grid.appendChild(cell)
}
panel.append(style,head,grid);
/* No focus on the buttons (Space must keep pausing the video, not click the last segment again), and nothing here may
 * reach the player underneath (click = play/pause, double click = fullscreen, ...). */
panel.addEventListener("mousedown",event=>event.preventDefault());
for(const type of["pointerdown","mousedown","touchstart","click","dblclick","wheel"])panel.addEventListener(type,event=>event.stopPropagation());
ctx.panel=panel;ctx.strip=strip;ctx.grid=grid;ctx.cols=cols;ctx.key=key;ctx.active=-1;ctx.fill=-1;ctx.durationSig="";ctx.dragging=!1;ctx.layoutSig="";ctx.inset=0;
bindSegmentDrag(ctx,head);
ctx.onResize=()=>placeSegmentPanel(ctx);try{view.addEventListener("resize",ctx.onResize)}catch{}
ctx.host.appendChild(strip);ctx.host.appendChild(panel);placeSegmentPanel(ctx);
ctx.timer=view.setInterval(()=>{try{tickSegmentPanel(ctx)}catch{}},250);
tickSegmentPanel(ctx)
}
function syncSegmentPanel(ctx){
if(SEGMENT_EXTERNAL_WINDOW){syncSegmentWindow(ctx);return}
if(!segmentSettings.enabled){removeSegmentPanel(ctx);return}
const key=segmentSettings.count+"x"+segmentSettings.cols;
if(ctx.panel&&ctx.panel.isConnected&&ctx.key===key){placeSegmentPanel(ctx);return}
buildSegmentPanel(ctx,key)
}
function syncSegmentPanels(){
for(const ctx of Array.from(segmentContexts)){
if(!segmentContextAlive(ctx)){removeSegmentPanel(ctx);segmentContexts.delete(ctx);continue}
syncSegmentPanel(ctx)
}
}
/* ctx = { mode:"pip"|"win", view, host, getVideo() } for the player living in `view`; host = the element the popup goes
 * into (it must cover the player window).  Called each time a player is built, so a rebuilt player gets its popup back. */
function registerSegmentPanel(ctx){
for(const old of Array.from(segmentContexts))if(old.view===ctx.view||!segmentContextAlive(old)){removeSegmentPanel(old);segmentContexts.delete(old)}
ctx.panel=null;ctx.strip=null;ctx.grid=null;ctx.cells=[];ctx.key="";ctx.timer=0;ctx.onResize=null;ctx.dragging=!1;ctx.aspect=.5625;ctx.inset=0;ctx.layoutSig="";ctx.job=null;ctx.helper=null;
segmentContexts.add(ctx);syncSegmentPanel(ctx);
/* The players size their <video> right after registering, which would undo the docked width: place again once they did. */
try{ctx.view.setTimeout(()=>{try{placeSegmentPanel(ctx)}catch{}},0)}catch{}
}
/* ===== [/Download] Player segment popup ===== */
/* ===== [Download] Segment popup as its own window ("Chia đoạn", phase 1) =====
 * The segment popup used to be drawn INSIDE the player's document (see above).  With SEGMENT_EXTERNAL_WINDOW on, the
 * players no longer draw it: this block asks the extension to open it as a separate popup window (segments.html),
 * docked against the right edge of the player window with no gap, and kept there: it follows the player when that moves.
 * Nothing is drawn here, and the window cannot be opened from this page (no user gesture, and the thumbnails could not
 * leave this document anyway: the video is cross-origin, so its frames taint a canvas), so the work is split like the
 * other relays of this hook:
 *   here -> loader -> background :  __DOWNLOAD_SEGMENT_WINDOW__ { json: { op, mode, count, cols, src, anchor } }
 *       op "open"   = create the window (or, when it exists, reload it with the new settings / video); sent for every
 *                     new video, so the window comes back when it was closed and the feature is still on
 *       op "update" = like "open", but a closed window is never re-opened (no longer sent from here)
 *       op "move"   = the player moved or was resized (sent when it changes and now and then): { op, mode, anchor }
 *       op "close"  = the player is gone or the feature was turned off
 *       anchor      = { x, y, w, h, al, at, aw, ah }: the player window (x / w = its visible edges, frame left out) and
 *                     the work area of its screen
 *   segment window -> background -> loader -> here :  __DOWNLOAD_SEGMENT_SEEK__ { json: { mode, index, count } }
 *       a click on a segment of the window: the player jumps to the start of that segment
 * The window loads the video itself from `src` and cuts its own thumbnails, so only that URL travels.
 * Set SEGMENT_EXTERNAL_WINDOW to false to get the old in-player popup back. */
const SEGMENT_EXTERNAL_WINDOW=!0,SEGMENT_WINDOW_EVENT="__DOWNLOAD_SEGMENT_WINDOW__",SEGMENT_WINDOW_POLL=300,SEGMENT_FOLLOW_POLL=120,SEGMENT_FOLLOW_REFRESH=1500;
function segmentWindowAnchor(ctx){
try{
const v=ctx.view,s=v.screen||{};
/* The window frame is left out of x / w (on Windows it has an invisible resize border that counts in screenX and outerWidth), so that the segment window can touch the picture. */
const diff=Math.round(v.outerWidth-v.innerWidth),frame=diff>=0&&diff<=24?Math.floor(diff/2):0;
const a={x:Math.round(v.screenX)+frame,y:Math.round(v.screenY),w:Math.round(v.outerWidth)-2*frame,h:Math.round(v.outerHeight),al:Math.round(s.availLeft||0),at:Math.round(s.availTop||0),aw:Math.round(s.availWidth||0),ah:Math.round(s.availHeight||0)};
for(const name in a)if(!Number.isFinite(a[name]))return null;
return a.w>0&&a.h>0?a:null
}catch{return null}
}
function sendSegmentWindow(detail){
try{window.dispatchEvent(new CustomEvent(SEGMENT_WINDOW_EVENT,{detail:{json:JSON.stringify(detail)}}))}catch{}
}
/* close = also close the window (the feature was turned off, or the player is gone). */
function stopSegmentWindow(ctx,close){
if(ctx.winTimer){try{clearInterval(ctx.winTimer)}catch{}ctx.winTimer=0}
if(ctx.followTimer){try{ctx.view.clearInterval(ctx.followTimer)}catch{}ctx.followTimer=0}
if(close&&ctx.winOpened)sendSegmentWindow({op:"close",mode:ctx.mode});
ctx.winOpened=!1;ctx.winSent="";ctx.winKey="";ctx.winSig="";ctx.followSig="";ctx.followAt=0
}
/* Runs a few times a second per player: asks for the window once the video (and the geometry of the player window,
 * which the players still resize and move right after the metadata arrived) is settled, and again for every other
 * video the player switches to (so the window is back when the user closed it). */
function tickSegmentWindow(ctx){
try{
if(!segmentContexts.has(ctx)){stopSegmentWindow(ctx,!1);return}
if(!segmentContextAlive(ctx)){segmentContexts.delete(ctx);stopSegmentWindow(ctx,!0);return}
const video=ctx.getVideo(),src=video?String(video.currentSrc||video.src||""):"";
if(!/^https:\/\//i.test(src)||!(video.videoWidth>0))return;
if(src===ctx.winSent)return;
const anchor=segmentWindowAnchor(ctx);if(!anchor)return;
if(!ctx.winOpened){
const sig=anchor.x+","+anchor.y+","+anchor.w+","+anchor.h;
if(ctx.winSig!==sig){ctx.winSig=sig;return}
}
sendSegmentWindow({op:"open",mode:ctx.mode,count:segmentSettings.count,cols:segmentSettings.cols,src,anchor});
ctx.winOpened=!0;ctx.winSent=src
}catch{}
}
/* Runs several times a second inside the player's own window (its timers are not slowed down while the TikTok tab is in
 * the background): tells the extension where the player is, so that the segment window follows it and stays against it. */
function followSegmentWindow(ctx){
try{
if(!ctx.winOpened||!segmentContextAlive(ctx))return;
const anchor=segmentWindowAnchor(ctx);if(!anchor)return;
const sig=anchor.x+","+anchor.y+","+anchor.w+","+anchor.h,now=Date.now();
if(sig===ctx.followSig&&now-ctx.followAt<SEGMENT_FOLLOW_REFRESH)return;
ctx.followSig=sig;ctx.followAt=now;
sendSegmentWindow({op:"move",mode:ctx.mode,anchor})
}catch{}
}
/* Called by syncSegmentPanel(): the feature is on / off, or count / cols changed. */
function syncSegmentWindow(ctx){
if(!segmentSettings.enabled){stopSegmentWindow(ctx,!0);return}
const key=segmentSettings.count+"x"+segmentSettings.cols;
if(ctx.winKey!==key){ctx.winKey=key;ctx.winSent=""}
if(!ctx.winTimer)ctx.winTimer=setInterval(()=>tickSegmentWindow(ctx),SEGMENT_WINDOW_POLL);
if(!ctx.followTimer){try{ctx.followTimer=ctx.view.setInterval(()=>followSegmentWindow(ctx),SEGMENT_FOLLOW_POLL)}catch{}}
tickSegmentWindow(ctx)
}
/* Where segment `index` of the window is: `count` frames spread evenly from the very first frame of the video (segment 1)
 * to its very last frame (the last segment) - the same sum as startTime() in segments.js, so that a click lands on the
 * frame the thumbnail shows.  The last frame is taken SEGMENT_END_GAP before the end: at the end itself the video is over. */
const SEGMENT_END_GAP=.001;
function segmentWindowTime(duration,count,index){const last=Math.max(0,duration-SEGMENT_END_GAP);return index<=0?0:index>=count-1?last:Math.min(last,duration*index/(count-1)+.001)}
/* A click on a segment of the window (background -> loader -> here): the player of that mode jumps to that segment (see
 * segmentWindowTime) and plays - the last segment is the last frame, so the player stays on it (playing on from there
 * would end the video at once, and loop it or scroll to the next one). */
window.addEventListener("__DOWNLOAD_SEGMENT_SEEK__",event=>{
try{
const data=JSON.parse(event&&event.detail&&event.detail.json);
if(!data||typeof data!=="object")return;
const count=Number(data.count),index=Number(data.index);
if(!Number.isInteger(count)||!Number.isInteger(index)||count<SEGMENT_COUNT_MIN||count>SEGMENT_COUNT_MAX||index<0||index>=count)return;
for(const ctx of Array.from(segmentContexts)){
if(ctx.mode!==data.mode||!segmentContextAlive(ctx))continue;
const video=ctx.getVideo(),duration=video&&Number.isFinite(video.duration)?video.duration:0;
if(!(duration>0))return;
video.currentTime=segmentWindowTime(duration,count,index);
if(index===count-1)video.pause();else{const played=video.play();played&&played.catch&&played.catch(()=>{})}
return
}
}catch{}
});
/* ===== [/Download] Segment popup as its own window ===== */
const SPEED_STORAGE_KEY="__download_search_playback_speed_v1",PIP_SPEED_STORAGE_KEY="__download_document_pip_speed_v1",SPEED_MIN=.5,SPEED_MAX=3;
let searchPlaybackSpeed=null;
try{const saved=Number(sessionStorage.getItem(SPEED_STORAGE_KEY));Number.isFinite(saved)&&saved>=SPEED_MIN&&saved<=SPEED_MAX&&(searchPlaybackSpeed=saved)}catch{}
try{const saved=Number(sessionStorage.getItem(PIP_SPEED_STORAGE_KEY));Number.isFinite(saved)&&saved>=.25&&saved<=3&&(documentPipPlaybackSpeed=saved)}catch{}

/* The original Auto PiP hook reacts to any preview video that starts playing.
 * Guard its requestPictureInPicture() call while a search card has been put in
 * PiP manually.  A deliberate click on another Download PiP button is permitted. */
(function(){
if(window.__DOWNLOAD_SEARCH_PIP_LOCK_GUARD__||typeof HTMLVideoElement==="undefined")return;
const request=HTMLVideoElement.prototype.requestPictureInPicture;if(typeof request!=="function")return;
window.__DOWNLOAD_SEARCH_PIP_LOCK_GUARD__=!0;
HTMLVideoElement.prototype.requestPictureInPicture=function(...args){
const locked=window.__DOWNLOAD_SEARCH_PIP_LOCK__,allowed=window.__DOWNLOAD_SEARCH_PIP_ALLOW__;
if(locked&&document.pictureInPictureElement!==locked)window.__DOWNLOAD_SEARCH_PIP_LOCK__=null;
if(locked&&document.pictureInPictureElement===locked&&this!==locked&&this!==allowed)return Promise.reject(new DOMException("Download search PiP is locked to the selected video","NotAllowedError"));
return request.apply(this,args)
}
})();
function lockSearchPiP(video){
if(!video)return;
window.__DOWNLOAD_SEARCH_PIP_LOCK__=video;
if(video.__downloadSearchPipLockBound)return;
video.__downloadSearchPipLockBound=!0;
video.addEventListener("leavepictureinpicture",()=>{if(window.__DOWNLOAD_SEARCH_PIP_LOCK__===video)window.__DOWNLOAD_SEARCH_PIP_LOCK__=null;broadcastPipClosed(video.__downloadSearchPipUrl)})
}
function unlockSearchPiP(video){if(!video||window.__DOWNLOAD_SEARCH_PIP_LOCK__===video)window.__DOWNLOAD_SEARCH_PIP_LOCK__=null}
async function requestSelectedPiP(video,waitForReady){
window.__DOWNLOAD_SEARCH_PIP_ALLOW__=video;
try{return await enterPiP(video,waitForReady)}finally{if(window.__DOWNLOAD_SEARCH_PIP_ALLOW__===video)window.__DOWNLOAD_SEARCH_PIP_ALLOW__=null}
}

/* Search and Explore use the same card controls and dynamic-card observer. */
function isSearchPage(){try{return/^\/(?:search|explore)(?:\/|$)/.test(location.pathname)}catch{return!1}}
function isDedicatedPlayerWindow(){try{return new URL(location.href).searchParams.has(PLAYER_REQUEST_PARAM)}catch{return!1}}
if(isDedicatedPlayerWindow())try{const style=document.createElement("style");style.id="__download_player_hide_search_actions";style.textContent="."+PIP_BUTTON_CLASS+",."+PLAYER_BUTTON_CLASS+",."+DOWNLOAD_BUTTON_CLASS+",."+SPEED_BUTTON_CLASS+",.__download_dl_btn{display:none!important}";(document.head||document.documentElement).appendChild(style)}catch{}
function icon(){return'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4.5" width="20" height="15" rx="2"/><rect x="12.5" y="12" width="7.5" height="5.5" rx="1" fill="currentColor" stroke="none"/></svg>'}
function playerIcon(){return'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="m10 9 5 3-5 3Z" fill="currentColor" stroke="none"/></svg>'}
function downloadIcon(){const src=document.documentElement&&document.documentElement.dataset.downloadExtensionIcon;return src?'<img src="'+src+'" alt="" style="display:block!important;width:23px!important;height:23px!important;object-fit:contain!important">':'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>'}

function videoUrl(value){
try{const url=new URL(value,location.href);return url.protocol==="https:"&&/(^|\.)tiktok\.com$/i.test(url.hostname)&&/\/video\/\d+/.test(url.pathname)?url.href:""}catch{return""}
}
function hasCardSize(el){
try{const r=el.getBoundingClientRect();return r.width>=76&&r.height>=76&&r.width<=720&&r.height<=1100}catch{return!1}
}
function isThumbnailLink(link){return!!(link&&hasCardSize(link)&&(link.querySelector("img,video,picture,canvas")||link.querySelector("[style*='background']")))}
function buttonLabel(btn){return btn&&btn.dataset.downloadAction==="player"?"Mở video trên cửa sổ riêng":btn&&btn.dataset.downloadAction==="download"?"Tải xuống":btn&&btn.dataset.downloadAction==="speed"?"Playback speed":"Trình phát nổi"}
function setButtonState(btn,state,message){
if(!btn||!btn.isConnected)return;
btn.dataset.downloadPipState=state||"";
btn.title=message||buttonLabel(btn);
btn.setAttribute("aria-label",btn.title);
btn.style.background=state==="loading"?"rgba(8,145,178,.9)":state==="active"?"#2adc00":state==="error"?"rgba(220,38,38,.9)":"rgba(0,0,0,.62)";
}
function actionState(action){return action==="player"?{urls:playerActivatedUrls,message:"Đã xem"}:action==="download"?{urls:downloadActivatedUrls,message:"Đã tải"}:{urls:pipActivatedUrls,message:"Đã xem"}}
function flash(btn,message){setButtonState(btn,"error",message||buttonLabel(btn)+" is unavailable");setTimeout(()=>{let url="";try{url=typeof btn.__downloadGetUrl==="function"&&btn.__downloadGetUrl()||""}catch{}const action=btn&&btn.dataset.downloadAction,state=actionState(action);if((action==="pip"||action==="player"||action==="download")&&url&&state.urls.has(url))setButtonState(btn,"active",state.message);else setButtonState(btn,"",buttonLabel(btn))},1400)}
function markCardActionActive(btn,url,activatedUrls,message){if(url)activatedUrls.add(url);setButtonState(btn,"active",message)}
function restoreCardActionState(btn,url,activatedUrls,message){if(!btn)return;if(url&&activatedUrls.has(url))setButtonState(btn,"active",message);else if(btn.dataset.downloadPipState==="active")setButtonState(btn,"",buttonLabel(btn))}
/* ===== [Download] Multi-select panel bridge =====
 * The multi-select side panel (assets/multi-select.js) runs in the ISOLATED
 * world and has no direct access to this MAIN-world module's state, so it
 * signals a completed download with a CustomEvent — the same cross-world
 * pattern __download_settings__ already uses. This just reuses the existing
 * "active" (green) button state and downloadActivatedUrls set, so a video
 * downloaded from the panel looks exactly like one downloaded from this
 * card's own Download button, and survives card re-render the same way. */
window.addEventListener("__download_multi_mark_downloaded__",event=>{
try{
const url=event&&event.detail&&event.detail.url;
if(!url)return;
downloadActivatedUrls.add(url);
document.querySelectorAll("."+DOWNLOAD_BUTTON_CLASS).forEach(btn=>{
const btnUrl=typeof btn.__downloadGetUrl==="function"&&btn.__downloadGetUrl();
if(btnUrl===url)setButtonState(btn,"active","Đã tải")
})
}catch{}
});
/* ===== [Download] Player select button =====
 * A checkbox identical to the one multi-select.js puts on every search card
 * (top-left, purple/cyan gradient when ticked), added to the video being
 * played in the dedicated player window and in the always-on-top (Document
 * PiP) player.  It ticks / unticks that video in the "Video đã chọn" list.
 * The selection lives in multi-select.js (ISOLATED world, search tab), so:
 *  - Document PiP player and in-page player (same tab as the cards): the same
 *    CustomEvent pattern as the PiP bridge above (toggle / query go to
 *    multi-select.js, its state events come back).
 *  - dedicated popup window (a separate page): postMessage to window.opener
 *    (the search tab that opened it, the same link the speed sync uses).  The
 *    opener relays to multi-select.js and posts every state change back. */
const SELECT_BUTTON_CLASS="__download_player_select_btn",SELECT_TOGGLE_EVENT="__DOWNLOAD_MULTISELECT_SELECT_TOGGLE__",SELECT_QUERY_EVENT="__DOWNLOAD_MULTISELECT_SELECT_QUERY__",SELECT_STATE_EVENT="__DOWNLOAD_MULTISELECT_SELECTION_STATE__",PLAYER_SELECT_TOGGLE_MESSAGE="__DOWNLOAD_PLAYER_SELECT_TOGGLE__",PLAYER_SELECT_QUERY_MESSAGE="__DOWNLOAD_PLAYER_SELECT_QUERY__",PLAYER_SELECT_STATE_MESSAGE="__DOWNLOAD_PLAYER_SELECT_STATE__";
const playerSelectEntries=new Set,selectionByUrl=new Map,selectSubscribers=new Set;
const SUBFOLDER_MENU_QUERY_EVENT="__DOWNLOAD_MULTISELECT_SUBFOLDER_MENU_QUERY__",SUBFOLDER_MENU_DATA_EVENT="__DOWNLOAD_MULTISELECT_SUBFOLDER_MENU_DATA__",SUBFOLDER_PICK_EVENT="__DOWNLOAD_MULTISELECT_SUBFOLDER_PICK__",SUBFOLDER_PICK_RESULT_EVENT="__DOWNLOAD_MULTISELECT_SUBFOLDER_PICK_RESULT__",PLAYER_MENU_QUERY_MESSAGE="__DOWNLOAD_PLAYER_SUBFOLDER_MENU_QUERY__",PLAYER_MENU_DATA_MESSAGE="__DOWNLOAD_PLAYER_SUBFOLDER_MENU_DATA__",PLAYER_MENU_PICK_MESSAGE="__DOWNLOAD_PLAYER_SUBFOLDER_PICK__",PLAYER_MENU_PICK_RESULT_MESSAGE="__DOWNLOAD_PLAYER_SUBFOLDER_PICK_RESULT__";
function selectMeta(thumb,title){return{thumb:typeof thumb==="string"&&/^https:\/\//i.test(thumb)?thumb.slice(0,2048):"",title:typeof title==="string"?title.trim().slice(0,200):""}}
/* Players that live in the same tab as multi-select.js. */
const localSelectBridge={
toggle(target){try{window.dispatchEvent(new CustomEvent(SELECT_TOGGLE_EVENT,{detail:{url:target.url,thumb:target.thumb||"",title:target.title||""}}));return!0}catch{return!1}},
query(url){try{window.dispatchEvent(new CustomEvent(SELECT_QUERY_EVENT,{detail:{url}}))}catch{}},
menuQuery(requestId,url){try{window.dispatchEvent(new CustomEvent(SUBFOLDER_MENU_QUERY_EVENT,{detail:{requestId,url}}));return!0}catch{return!1}},
menuPick(requestId,target,folderName){try{window.dispatchEvent(new CustomEvent(SUBFOLDER_PICK_EVENT,{detail:{requestId,url:target.url,thumb:target.thumb||"",title:target.title||"",folderName}}));return!0}catch{return!1}}
};
/* The dedicated player window: everything goes through the tab that opened it. */
const openerSelectBridge={
post(message){try{const opener=window.opener;if(!opener||opener.closed)return!1;opener.postMessage(Object.assign({channel:"download"},message),location.origin);return!0}catch{return!1}},
toggle(target){return this.post({type:PLAYER_SELECT_TOGGLE_MESSAGE,url:target.url,thumb:target.thumb||"",title:target.title||""})},
query(url){this.post({type:PLAYER_SELECT_QUERY_MESSAGE,url})},
menuQuery(requestId,url){return this.post({type:PLAYER_MENU_QUERY_MESSAGE,requestId,url})},
menuPick(requestId,target,folderName){return this.post({type:PLAYER_MENU_PICK_MESSAGE,requestId,url:target.url,thumb:target.thumb||"",title:target.title||"",folderName})}
};
function paintPlayerSelect(button,selected){
button.dataset.checked=selected?"1":"0";button.setAttribute("aria-checked",selected?"true":"false");
button.title=selected?"Bỏ chọn video này":"Chọn video này";button.setAttribute("aria-label",button.title);
button.style.setProperty("background",selected?"linear-gradient(135deg,#a855f7,#22d3ee)":"rgba(0,0,0,.55)","important");
button.style.setProperty("border-color",selected?"rgba(255,255,255,.9)":"rgba(255,255,255,.75)","important");
const mark=button.querySelector("svg");if(mark)mark.style.opacity=selected?"1":"0"
}
/* getTarget() returns {url,thumb,title} of the video the host player shows right now (or null).
 * The button stays hidden until refreshPlayerSelectButtons() has seen a URL for it. */
function makePlayerSelectButton(doc,getTarget,bridge){
const button=doc.createElement("button");
button.type="button";button.className=SELECT_BUTTON_CLASS;button.setAttribute("role","checkbox");
button.style.cssText="position:absolute!important;top:8px!important;left:8px!important;width:26px!important;height:26px!important;min-width:0!important;margin:0!important;padding:0!important;box-sizing:border-box!important;border-radius:7px!important;background:rgba(0,0,0,.55)!important;border:1.5px solid rgba(255,255,255,.75)!important;display:none!important;align-items:center!important;justify-content:center!important;cursor:pointer!important;z-index:2147483645!important;transition:transform .12s ease,background .15s ease,border-color .15s ease!important;pointer-events:auto!important";
button.innerHTML='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="opacity:0;transition:opacity .1s ease;pointer-events:none"><path d="M20 6 9 17l-5-5"/></svg>';
button.addEventListener("mouseenter",()=>{button.style.transform="scale(1.08)"});
button.addEventListener("mouseleave",()=>{button.style.transform="scale(1)"});
for(const type of["pointerdown","mousedown","touchstart"])button.addEventListener(type,event=>event.stopPropagation(),!0);
button.addEventListener("click",event=>{
event.preventDefault();event.stopPropagation();
let target=null;try{target=getTarget()}catch{}
if(!target||!target.url)return;
if(!bridge.toggle(target)){
button.title="Không tìm thấy tab tìm kiếm để chọn video";button.style.setProperty("border-color","#ef4444","important");
setTimeout(()=>{if(button.isConnected)paintPlayerSelect(button,button.dataset.checked==="1")},1800)
}
},!0);
playerSelectEntries.add({button,getTarget,bridge,url:""});
paintPlayerSelect(button,!1);
return button
}
/* Re-reads which video every player shows and asks multi-select.js whether it is ticked.  Called
 * whenever a player is built or switches video; entries whose window / overlay is gone are dropped. */
function refreshPlayerSelectButtons(){
for(const entry of Array.from(playerSelectEntries)){
let alive=!1;try{const view=entry.button.ownerDocument.defaultView;alive=!!(entry.button.isConnected&&view&&!view.closed)}catch{}
if(!alive){playerSelectEntries.delete(entry);continue}
let target=null;try{target=entry.getTarget()}catch{}
entry.url=target&&target.url||"";
entry.button.style.setProperty("display",entry.url?"flex":"none","important");
try{paintPlayerTitleBar(entry,target)}catch{}
paintPlayerSelect(entry.button,!!entry.url&&selectionByUrl.get(entry.url)===!0);
if(entry.url)entry.bridge.query(entry.url)
}
}
function applySelectionState(url,selected){
if(!url)return;
selectionByUrl.set(url,selected);
for(const entry of playerSelectEntries)if(entry.url===url)paintPlayerSelect(entry.button,selected)
}
/* Tab that owns the selection: tell every player popup it opened about each change. */
function forwardSelectionToPlayerPopups(url,selected){
for(const popup of Array.from(selectSubscribers)){
try{if(!popup||popup.closed){selectSubscribers.delete(popup);continue}popup.postMessage({channel:"download",type:PLAYER_SELECT_STATE_MESSAGE,url,selected},location.origin)}catch{selectSubscribers.delete(popup)}
}
}
window.addEventListener(SELECT_STATE_EVENT,event=>{
const detail=event&&event.detail;if(!detail||typeof detail.url!=="string")return;
const selected=detail.selected===!0;applySelectionState(detail.url,selected);forwardSelectionToPlayerPopups(detail.url,selected)
});
window.addEventListener("message",event=>{
if(event.origin!==location.origin||!event.data||event.data.channel!=="download")return;
const message=event.data;
if(message.type===PLAYER_SELECT_STATE_MESSAGE){
/* In the popup window: state pushed by the tab that opened it. */
if(!isDedicatedPlayerWindow()||!window.opener||event.source!==window.opener||typeof message.url!=="string")return;
applySelectionState(message.url,message.selected===!0);return
}
if(message.type!==PLAYER_SELECT_TOGGLE_MESSAGE&&message.type!==PLAYER_SELECT_QUERY_MESSAGE)return;
/* In the search tab: a request from a player popup. */
if(isDedicatedPlayerWindow()||!event.source||event.source===window)return;
const url=videoUrl(message.url);if(!url)return;
selectSubscribers.add(event.source);
if(message.type===PLAYER_SELECT_TOGGLE_MESSAGE){const meta=selectMeta(message.thumb,message.title);localSelectBridge.toggle({url,thumb:meta.thumb,title:meta.title})}else localSelectBridge.query(url)
});
/* ===== [/Download] Player select button ===== */
/* ===== [Download] Player title bar + "show nothing" =====
 * Next to the select button every player (Document PiP and the dedicated window) shows "<position>/<total> <title>" of
 * the video it plays: position / total = place of that video in the "Video đã chọn" list and size of the list (a video
 * that is not in the list shows only its title).  The list lives in multi-select.js (ISOLATED world, search tab), which
 * sends it - urls and titles in row order - with every change:  CustomEvent for the search tab, postMessage through
 * that tab for the dedicated window (same relay as the select state above).
 * When a video is removed from the list with no video after it, multi-select.js sends the same two ways a "clear" for
 * its url: a player that still shows that url stops, drops the video and shows nothing (black, no bar, no select
 * button, the "Chia đoạn" window closes). */
const LIST_INFO_EVENT="__DOWNLOAD_MULTISELECT_LIST_INFO__",PLAYER_CLEAR_EVENT="__DOWNLOAD_MULTISELECT_PLAYER_CLEAR__",PLAYER_LIST_INFO_MESSAGE="__DOWNLOAD_PLAYER_LIST_INFO__",PLAYER_CLEAR_MESSAGE="__DOWNLOAD_PLAYER_CLEAR__",PLAYER_TITLE_BAR_CLASS="__download_player_title_bar";
let selectionListInfo={total:0,byUrl:new Map};
function readListInfo(items){
const byUrl=new Map;let total=0;
if(Array.isArray(items))for(const row of items){if(!Array.isArray(row)||typeof row[0]!=="string")continue;total++;byUrl.set(row[0],{index:total,title:typeof row[1]==="string"?row[1].trim().slice(0,200):""})}
return{total,byUrl}
}
function makePlayerTitleBar(doc){
const bar=doc.createElement("div"),index=doc.createElement("span"),title=doc.createElement("span");
bar.className=PLAYER_TITLE_BAR_CLASS;
bar.style.cssText="position:absolute!important;top:8px!important;left:42px!important;right:8px!important;height:26px!important;box-sizing:border-box!important;display:none!important;align-items:center!important;gap:6px!important;padding:0 10px!important;border-radius:7px!important;background:rgba(0,0,0,.55)!important;color:#fff!important;font:600 13px/26px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif!important;text-shadow:0 1px 2px rgba(0,0,0,.6)!important;pointer-events:none!important;user-select:none!important;overflow:hidden!important;z-index:2147483644!important";
index.style.cssText="flex:none!important;color:#67e8f9!important;font-weight:700!important;font-variant-numeric:tabular-nums!important";
title.style.cssText="flex:1 1 auto!important;min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important";
bar.append(index,title);bar.__downloadIndex=index;bar.__downloadTitle=title;return bar
}
/* The bar lives in the same container as the select button of `entry` (the player overlay / the PiP host). */
function paintPlayerTitleBar(entry,target){
const parent=entry.button.parentElement;if(!parent)return;
let bar=entry.bar;
if(!bar||bar.parentElement!==parent){if(bar)bar.remove();bar=entry.bar=makePlayerTitleBar(entry.button.ownerDocument);parent.appendChild(bar)}
const info=entry.url?selectionListInfo.byUrl.get(entry.url):null,title=info&&info.title||(target&&typeof target.title==="string"?target.title.trim():""),indexText=info?info.index+"/"+selectionListInfo.total:"";
bar.__downloadIndex.textContent=indexText;bar.__downloadTitle.textContent=title;
bar.style.setProperty("display",entry.url&&(indexText||title)?"flex":"none","important")
}
function applyListInfo(items){
selectionListInfo=readListInfo(items);
for(const entry of Array.from(playerSelectEntries)){let target=null;try{target=entry.getTarget()}catch{}try{paintPlayerTitleBar(entry,target)}catch{}}
}
function forwardListInfoToPlayerPopups(items){
for(const popup of Array.from(selectSubscribers)){
try{if(!popup||popup.closed){selectSubscribers.delete(popup);continue}popup.postMessage({channel:"download",type:PLAYER_LIST_INFO_MESSAGE,items},location.origin)}catch{selectSubscribers.delete(popup)}
}
}
/* The "Chia đoạn" window follows the video of its player: with the video gone it has nothing to show. */
function closeSegmentWindowFor(video){
for(const ctx of Array.from(segmentContexts)){
let own=null;try{own=ctx.getVideo()}catch{}
if(own!==video)continue;
if(ctx.winOpened){sendSegmentWindow({op:"close",mode:ctx.mode});ctx.winOpened=!1}
ctx.winSent=""
}
}
function blankPlayerVideo(video){
try{video.pause()}catch{}
try{video.removeAttribute("src");video.removeAttribute("poster");video.load()}catch{}
video.__downloadPlayerSource="";video.__downloadPlayerMeta=null;video.__downloadSearchPipUrl="";
closeSegmentWindowFor(video);refreshPlayerSelectButtons()
}
/* Every player of this document that shows `url` (the PiP player in the search tab, the video of the player window). */
function clearPlayersShowing(url){
for(const kind of["pip","popup"]){
const ctx=findShortcutContext(kind);if(!ctx)continue;
let video=null,shown="";try{video=ctx.video();shown=ctx.url()}catch{}
if(video&&shown===url)blankPlayerVideo(video)
}
}
window.addEventListener(LIST_INFO_EVENT,event=>{
/* The player window has no list of its own to trust: it gets the list from the tab that opened it (message below). */
if(isDedicatedPlayerWindow())return;
const detail=event&&event.detail;if(!detail)return;
applyListInfo(detail.items);forwardListInfoToPlayerPopups(detail.items)
});
window.addEventListener(PLAYER_CLEAR_EVENT,event=>{
if(isDedicatedPlayerWindow())return;
const url=event&&event.detail&&typeof event.detail.url==="string"?event.detail.url:"";if(!url)return;
clearPlayersShowing(url);
for(const popup of Array.from(selectSubscribers)){
try{if(!popup||popup.closed){selectSubscribers.delete(popup);continue}popup.postMessage({channel:"download",type:PLAYER_CLEAR_MESSAGE,url},location.origin)}catch{selectSubscribers.delete(popup)}
}
});
/* A video was handed to the editor app and left the list (multi-select.js): a player that still shows it goes on with the next video of the list, loaded but paused.  The Document PiP player is handled here, a player window gets the same message through the tab that opened it. */
const PLAYER_ADVANCE_EVENT="__DOWNLOAD_MULTISELECT_PLAYER_ADVANCE__",PLAYER_ADVANCE_MESSAGE="__DOWNLOAD_PLAYER_ADVANCE__";
function advancePlayersShowing(url,nextUrl){
for(const kind of["pip","popup"]){
const ctx=findShortcutContext(kind);if(!ctx)continue;
let shown="";try{shown=ctx.url()}catch{}
if(shown!==url)continue;
if(kind==="pip")openPiPForUrl(nextUrl,()=>{},!0);else openVideoPlayerStream(nextUrl,!0)
}
}
window.addEventListener(PLAYER_ADVANCE_EVENT,event=>{
if(isDedicatedPlayerWindow())return;
const detail=event&&event.detail,url=detail&&typeof detail.url==="string"?detail.url:"",nextUrl=detail&&typeof detail.nextUrl==="string"?videoUrl(detail.nextUrl):"";
if(!url||!nextUrl)return;
advancePlayersShowing(url,nextUrl);
for(const popup of Array.from(selectSubscribers)){
try{if(!popup||popup.closed){selectSubscribers.delete(popup);continue}popup.postMessage({channel:"download",type:PLAYER_ADVANCE_MESSAGE,url,nextUrl},location.origin)}catch{selectSubscribers.delete(popup)}
}
});
/* The last video left the list (multi-select.js sends this after the player has said "Danh sách trống."): close every preview window of this tab - the Document PiP player and the player windows opened from here. */
const PLAYER_CLOSE_EVENT="__DOWNLOAD_MULTISELECT_PLAYER_CLOSE__";
window.addEventListener(PLAYER_CLOSE_EVENT,()=>{
if(isDedicatedPlayerWindow())return;
const pip=activeDocumentPipWindow();if(pip){try{pip.close()}catch{}}
const popups=new Set(selectSubscribers);if(playerPopup)popups.add(playerPopup);
for(const popup of popups){try{if(popup&&!popup.closed)popup.close()}catch{}}
});
window.addEventListener("message",event=>{
if(event.origin!==location.origin||!event.data||event.data.channel!=="download")return;
const message=event.data;
if(message.type!==PLAYER_LIST_INFO_MESSAGE&&message.type!==PLAYER_CLEAR_MESSAGE&&message.type!==PLAYER_ADVANCE_MESSAGE)return;
/* In the player window: pushed by the tab that opened it. */
if(!isDedicatedPlayerWindow()||!window.opener||event.source!==window.opener)return;
if(message.type===PLAYER_LIST_INFO_MESSAGE){applyListInfo(message.items);return}
if(message.type===PLAYER_ADVANCE_MESSAGE){const nextUrl=typeof message.nextUrl==="string"?videoUrl(message.nextUrl):"";if(nextUrl&&typeof message.url==="string")advancePlayersShowing(message.url,nextUrl);return}
if(typeof message.url==="string")clearPlayersShowing(message.url)
});
/* ===== [/Download] Player title bar + "show nothing" ===== */
/* ===== [Download] Player subfolder menu =====
 * Right-clicking the always-on-top (Document PiP) player or the dedicated "open video in a new window" player shows the
 * same subfolder menu multi-select.js shows on a search card (popup.html -> "Menu chuột phải thư mục con").  The menu is
 * drawn here, inside the player's own window; the folder list and the selection live in multi-select.js (ISOLATED world,
 * search tab), so it is reached like the select button above: CustomEvents for players in the search tab, postMessage
 * through window.opener for the dedicated window.  Picking a folder selects the video when needed and links it to that
 * folder.  Only active while the option is on (subfolderContextMenu, relayed by tiktok-loader.js).
 * A video that is in the "Video đã chọn" list also gets the menu without that option: its first entry "Xóa video này" removes the
 * video from the list (sent through the player shortcut bridge below, the list lives in multi-select.js) and the player goes on
 * with the next video; with the option on, a divider separates that entry from the subfolder list. */
const PLAYER_SUBFOLDER_MENU_ID="__download_player_subfolder_menu",PLAYER_SUBFOLDER_TOAST_ID="__download_player_subfolder_toast";
const subfolderMenuPending=new Map,subfolderMenuRoutes=new Map;let subfolderRequestNumber=0;
function readSubfolderMenuData(detail){
if(!detail||typeof detail.requestId!=="string")return null;
return{requestId:detail.requestId,url:typeof detail.url==="string"?detail.url:"",state:typeof detail.state==="string"?detail.state:"",current:typeof detail.current==="string"?detail.current:"",folders:Array.isArray(detail.folders)?detail.folders.filter(name=>typeof name==="string").slice(0,500):[]}
}
function readSubfolderPickResult(detail){
if(!detail||typeof detail.requestId!=="string")return null;
return{requestId:detail.requestId,ok:detail.ok===!0,text:typeof detail.text==="string"?detail.text.slice(0,300):""}
}
/* Player side: hands a reply to whoever asked (the menu being drawn). */
function resolveSubfolderRequest(data){
const done=data&&subfolderMenuPending.get(data.requestId);
if(!done)return;subfolderMenuPending.delete(data.requestId);done(data)
}
/* Search-tab side: a reply to a request that came from a player popup goes back to that popup, any other reply is ours. */
function routeSubfolderReply(data,messageType){
if(!data)return;
const popup=subfolderMenuRoutes.get(data.requestId);
if(!popup){resolveSubfolderRequest(data);return}
subfolderMenuRoutes.delete(data.requestId);
try{if(!popup.closed)popup.postMessage(Object.assign({channel:"download",type:messageType},data),location.origin)}catch{}
}
window.addEventListener(SUBFOLDER_MENU_DATA_EVENT,event=>routeSubfolderReply(readSubfolderMenuData(event&&event.detail),PLAYER_MENU_DATA_MESSAGE));
window.addEventListener(SUBFOLDER_PICK_RESULT_EVENT,event=>routeSubfolderReply(readSubfolderPickResult(event&&event.detail),PLAYER_MENU_PICK_RESULT_MESSAGE));
window.addEventListener("message",event=>{
if(event.origin!==location.origin||!event.data||event.data.channel!=="download")return;
const message=event.data;
if(message.type===PLAYER_MENU_DATA_MESSAGE||message.type===PLAYER_MENU_PICK_RESULT_MESSAGE){
/* In the popup window: answers pushed by the tab that opened it. */
if(!isDedicatedPlayerWindow()||!window.opener||event.source!==window.opener)return;
resolveSubfolderRequest(message.type===PLAYER_MENU_DATA_MESSAGE?readSubfolderMenuData(message):readSubfolderPickResult(message));return
}
if(message.type!==PLAYER_MENU_QUERY_MESSAGE&&message.type!==PLAYER_MENU_PICK_MESSAGE)return;
/* In the search tab: a request from a player popup. */
if(isDedicatedPlayerWindow()||!event.source||event.source===window)return;
const url=videoUrl(message.url),requestId=typeof message.requestId==="string"?message.requestId.slice(0,128):"";
if(!url||!requestId)return;
subfolderMenuRoutes.set(requestId,event.source);setTimeout(()=>subfolderMenuRoutes.delete(requestId),15000);
if(message.type===PLAYER_MENU_QUERY_MESSAGE)localSelectBridge.menuQuery(requestId,url);
else{const meta=selectMeta(message.thumb,message.title);localSelectBridge.menuPick(requestId,{url,thumb:meta.thumb,title:meta.title},typeof message.folderName==="string"?message.folderName.slice(0,255):"")}
});
/* send(requestId) must return true when the request went out; callback(reply) gets null when nobody answers in time. */
function requestSubfolder(send,callback){
const requestId="download-menu-"+Date.now().toString(36)+"-"+(++subfolderRequestNumber)+"-"+Math.random().toString(36).slice(2,8);
const timer=setTimeout(()=>{if(subfolderMenuPending.delete(requestId))callback(null)},3000);
subfolderMenuPending.set(requestId,data=>{clearTimeout(timer);callback(data)});
let sent=!1;try{sent=send(requestId)===!0}catch{}
if(!sent&&subfolderMenuPending.delete(requestId)){clearTimeout(timer);callback(null)}
}
function showPlayerSubfolderToast(doc,text,ok){
try{
let el=doc.getElementById(PLAYER_SUBFOLDER_TOAST_ID);
if(!el){el=doc.createElement("div");el.id=PLAYER_SUBFOLDER_TOAST_ID;(doc.body||doc.documentElement).appendChild(el)}
el.style.cssText="position:fixed!important;left:50%!important;top:14px!important;transform:translateX(-50%)!important;max-width:86%!important;box-sizing:border-box!important;padding:8px 14px!important;border-radius:12px!important;background:rgba(0,0,0,.9)!important;border:1px solid "+(ok?"rgba(34,211,238,.4)":"rgba(251,113,133,.5)")+"!important;color:"+(ok?"#67e8f9":"#fb7185")+"!important;font:700 12.5px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif!important;text-align:center!important;pointer-events:none!important;z-index:2147483647!important;opacity:1!important;transition:opacity .25s!important";
el.textContent=text;
const view=doc.defaultView;if(!view)return;
view.clearTimeout(el.__downloadToastTimer);el.__downloadToastTimer=view.setTimeout(()=>{el.style.setProperty("opacity","0","important")},1800)
}catch{}
}
const SUBFOLDER_MENU_HINTS={"no-advanced":'Bật "Chọn thư mục nâng cao" trong cài đặt tiện ích để dùng menu này.',"loading":"Đang tải…","no-root":"Chưa chọn thư mục gốc. Mở danh sách Video đã chọn ở tab tìm kiếm và nhấp ô thư mục để chọn.","no-permission":"⚠ Cần cấp lại quyền cho thư mục gốc: chuột phải vào một thumbnail ở tab tìm kiếm.","scanning":"Đang đọc thư mục con…","empty":"Thư mục gốc không có thư mục con."};
/* `root` is the player's own container (it already holds the select button); the menu lives inside it so a right-click on
 * the menu itself is caught by the same handler.  (x,y) are viewport coordinates of the right-click. */
function openPlayerSubfolderMenu(doc,root,entry,x,y){
const view=doc.defaultView;if(!view)return;
if(typeof doc.__downloadCloseSubfolderMenu==="function")doc.__downloadCloseSubfolderMenu();
let target=null;try{target=entry.getTarget()}catch{}
if(!target||!target.url)return;
const withFolders=subfolderContextMenu,canRemove=selectionByUrl.get(target.url)===!0,hasEditorAction=window.__TIK_EDITOR_PLAYER_MENU__===!0;
if(!withFolders&&!canRemove&&!hasEditorAction)return;
const menu=doc.createElement("div"),body=doc.createElement("div");
menu.id=PLAYER_SUBFOLDER_MENU_ID;
menu.style.cssText="position:fixed!important;left:0;top:0;min-width:180px;max-width:min(320px,92vw);max-height:calc(100vh - 8px);overflow-y:auto;overscroll-behavior:contain;box-sizing:border-box;padding:6px;border-radius:12px;background:rgba(15,15,20,.97);border:1px solid rgba(255,255,255,.12);box-shadow:0 12px 36px rgba(0,0,0,.55);z-index:2147483647!important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#fff;text-align:left;cursor:default";
/* "Xóa video này" goes last: right under the subfolders, with no separator line and no gap. */
if(withFolders)menu.appendChild(body);
if(canRemove){
const removeButton=doc.createElement("button");
removeButton.type="button";removeButton.textContent="🗑 Xóa video này";removeButton.title="Xóa video này khỏi danh sách Video đã chọn";
removeButton.style.cssText="display:block;width:100%;margin:0;text-align:left;padding:7px 10px;border:0;border-radius:8px;font:600 12.5px/1.3 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:transparent;color:#fb7185";
removeButton.addEventListener("mouseenter",()=>{removeButton.style.background="rgba(251,113,133,.16)"});removeButton.addEventListener("mouseleave",()=>{removeButton.style.background="transparent"});
removeButton.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();removeVideo()});
menu.appendChild(removeButton);
}
/* Everything must be visible without scrolling: as is if the window is tall enough, else tighter rows, else 2-3 columns of subfolders
 * (the window width allows); scrolling stays only as the last resort for a very small window. */
const fit=()=>{
const limit=view.innerHeight-10,maxColumns=Math.max(1,Math.min(3,Math.floor((view.innerWidth-20)/140)));
const layout=(dense,columns)=>{
menu.style.setProperty("padding",dense?"4px":"6px");menu.style.setProperty("max-width",columns>1?"96vw":"min(320px,92vw)");
for(const button of menu.querySelectorAll("button")){button.style.setProperty("padding",dense?"2px 8px":"7px 10px");button.style.setProperty("font-size",dense?"12px":"12.5px")}
body.style.setProperty("display",columns>1?"grid":"block");body.style.setProperty("grid-template-columns",columns>1?"repeat("+columns+",minmax(0,1fr))":"none")
};
layout(!1,1);if(menu.scrollHeight<=limit)return;
layout(!0,1);
for(let columns=2;menu.scrollHeight>limit&&columns<=maxColumns;columns++)layout(!0,columns)
};
const place=()=>{menu.style.left="0px";menu.style.top="0px";fit();const rect=menu.getBoundingClientRect();menu.style.left=Math.max(4,Math.min(x,view.innerWidth-rect.width-4))+"px";menu.style.top=Math.max(4,Math.min(y,view.innerHeight-rect.height-4))+"px"};
const onDown=event=>{if(!menu.contains(event.target))close()};
const onKey=event=>{if(event.key!=="Escape")return;event.preventDefault();event.stopPropagation();close()};
const close=()=>{
view.removeEventListener("pointerdown",onDown,!0);view.removeEventListener("keydown",onKey,!0);view.removeEventListener("blur",close);view.removeEventListener("resize",close);
if(doc.__downloadCloseSubfolderMenu===close)doc.__downloadCloseSubfolderMenu=null;
menu.remove()
};
const setHint=(text,color)=>{
body.replaceChildren();const el=doc.createElement("div");el.textContent=text;
el.style.cssText="font-size:11.5px;line-height:1.45;padding:4px 8px 6px;color:"+(color||"rgba(255,255,255,.65)");body.appendChild(el);place()
};
const addEntry=(label,active,onPick)=>{
const button=doc.createElement("button"),base=active?"rgba(34,211,238,.16)":"transparent";
button.type="button";button.textContent=label;button.title=label;
button.style.cssText="display:block;width:100%;margin:0;text-align:left;padding:7px 10px;border:0;border-radius:8px;font:400 12.5px/1.3 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:"+base+";color:"+(active?"#67e8f9":"#fff");
button.addEventListener("mouseenter",()=>{button.style.background="rgba(255,255,255,.1)"});button.addEventListener("mouseleave",()=>{button.style.background=base});
button.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();onPick()});
body.appendChild(button)
};
const pick=name=>{
close();
requestSubfolder(id=>entry.bridge.menuPick(id,target,name),result=>showPlayerSubfolderToast(doc,result?result.text:"Không gửi được tới tab tìm kiếm.",!!(result&&result.ok)))
};
/* The list lives in multi-select.js: ask it through the shortcut bridge of this player (its answer is the toast, and for the
 * dedicated window the next video to load). */
const removeVideo=()=>{
close();
const context=Array.from(shortcutContexts).find(candidate=>candidate.view===view);
if(!context){showPlayerSubfolderToast(doc,"Không xóa được video này.",!1);return}
requestListShortcut(context,"remove",target.url)
};
const render=data=>{
if(!menu.isConnected)return;
if(!data){setHint("Không tìm thấy tab tìm kiếm để lấy danh sách thư mục con.");return}
if(data.state==="ok"&&data.folders.length){
body.replaceChildren();
data.folders.forEach((name,index)=>{const isCurrent=data.current===name;addEntry((isCurrent?"✓ ":"")+"["+(index+1)+"] "+name,isCurrent,()=>pick(name))});
place();return
}
setHint(SUBFOLDER_MENU_HINTS[data.state]||"Không đọc được danh sách thư mục con.",data.state==="no-permission"?"#fbbf24":"")
};
root.appendChild(menu);doc.__downloadCloseSubfolderMenu=close;
view.addEventListener("pointerdown",onDown,!0);view.addEventListener("keydown",onKey,!0);view.addEventListener("blur",close);view.addEventListener("resize",close);
if(withFolders||hasEditorAction){if(withFolders)setHint("Đang tải…");requestSubfolder(id=>entry.bridge.menuQuery(id,target.url),render)}else place()
}
/* Called once for each player container (Document PiP host, dedicated-window overlay).  The video being played and the
 * bridge to the selection owner come from the select button the container already holds. */
function bindPlayerSubfolderMenu(root){
root.addEventListener("contextmenu",event=>{
const doc=root.ownerDocument,open=doc.getElementById(PLAYER_SUBFOLDER_MENU_ID);
if(open&&open.contains(event.target)){event.preventDefault();event.stopPropagation();return}
const button=root.querySelector("."+SELECT_BUTTON_CLASS);let entry=null;
if(button)for(const candidate of playerSelectEntries)if(candidate.button===button){entry=candidate;break}
if(!entry)return;
let target=null;try{target=entry.getTarget()}catch{}
if(!target||!target.url)return;
/* Without the subfolder option the menu only exists for a video that is in the list ("Xóa video này"); otherwise the browser's own menu stays. */
if(!subfolderContextMenu&&selectionByUrl.get(target.url)!==!0)return;
event.preventDefault();event.stopPropagation();
openPlayerSubfolderMenu(doc,root,entry,event.clientX,event.clientY)
},!0)
}
/* ===== [/Download] Player subfolder menu ===== */
function makeButton(action){
const btn=document.createElement("button");
const isPlayer=action==="player",isDownload=action==="download",isSpeed=action==="speed",label=isPlayer?"Mở video trên cửa sổ riêng":isDownload?"Tải xuống":isSpeed?"Playback speed":"Trình phát nổi",position=isPlayer?"top:46px!important;":isDownload?"top:84px!important;":isSpeed?"top:122px!important;":"top:8px!important;";
btn.type="button";btn.className=isPlayer?PLAYER_BUTTON_CLASS:isDownload?DOWNLOAD_BUTTON_CLASS:isSpeed?SPEED_BUTTON_CLASS:PIP_BUTTON_CLASS;btn.dataset.downloadAction=action;btn.title=label;btn.setAttribute("aria-label",label);
btn.style.cssText="position:absolute!important;"+position+"right:8px!important;width:32px!important;height:32px!important;padding:0!important;border:1px solid rgba(255,255,255,.42)!important;border-radius:50%!important;background:rgba(0,0,0,.62)!important;color:#fff!important;display:flex!important;align-items:center!important;justify-content:center!important;cursor:pointer!important;z-index:2147483645!important;box-shadow:0 2px 10px rgba(0,0,0,.42)!important;transition:transform .15s ease,background .15s ease!important;pointer-events:auto!important";
btn.innerHTML=isPlayer?playerIcon():isDownload?downloadIcon():isSpeed?'<span style="font:700 10px/1 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif">1×</span>':icon();
btn.addEventListener("mouseenter",()=>{if(!btn.dataset.downloadPipState)btn.style.transform="scale(1.08)"});
btn.addEventListener("mouseleave",()=>{btn.style.transform="scale(1)"});
return btn
}
function stopCardEvent(event){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation()}
/* ===== [Download] Player shortcuts =====
 * Keyboard shortcuts for looking through the "Video đã chọn" list fast (the "Phím tắt" button of that panel lists them):
 * T next video, R previous video, C tick/untick the video for download, F / G faster / slower, M mute, <- -> seek 5 s.
 * (Space = play/pause is already handled by each player's own keydown handler.)  They work in the always-on-top (Document
 * PiP) player and in the dedicated player window while that window has the focus; the same keys pressed in the search tab
 * are handled by multi-select.js, which forwards the playback ones here (PLAYER_CONTROL_*).  Playback keys are applied
 * right here.  List keys (T R C) need the list, which lives in multi-select.js (ISOLATED world, search tab), so they go
 * there like the select button does (CustomEvent / window.opener) and the answer comes back: a short toast, plus the video
 * to load when this is the dedicated window.  Never while typing in a text field. */
const PLAYER_SHORTCUT_EVENT="__DOWNLOAD_MULTISELECT_PLAYER_SHORTCUT__",PLAYER_SHORTCUT_RESULT_EVENT="__DOWNLOAD_MULTISELECT_PLAYER_SHORTCUT_RESULT__",PLAYER_CONTROL_EVENT="__DOWNLOAD_PLAYER_CONTROL__",PLAYER_SHORTCUT_MESSAGE="__DOWNLOAD_PLAYER_SHORTCUT__",PLAYER_SHORTCUT_RESULT_MESSAGE="__DOWNLOAD_PLAYER_SHORTCUT_RESULT__",PLAYER_CONTROL_MESSAGE="__DOWNLOAD_PLAYER_CONTROL__",PLAYER_SHORTCUT_TOAST_ID="__download_player_shortcut_toast";
const SHORTCUT_BY_CODE={KeyT:"next",KeyR:"prev",KeyC:"pick",KeyF:"faster",KeyG:"slower",KeyM:"mute",ArrowLeft:"seekBack",ArrowRight:"seekFwd"};
const SHORTCUT_LIST_ACTIONS=new Set(["next","prev","pick","remove"]),SHORTCUT_PLAYBACK_ACTIONS=new Set(["playpause","faster","slower","mute","seekBack","seekFwd"]),SHORTCUT_REPEAT_ACTIONS=new Set(["faster","slower","seekBack","seekFwd"]);
const shortcutContexts=new Set,shortcutRoutes=new Map;let shortcutRequestNumber=0;
/* Players in the search tab reach multi-select.js with a CustomEvent, the dedicated window through the tab that opened it. */
const localShortcutBridge={send(requestId,action,url,kind){try{window.dispatchEvent(new CustomEvent(PLAYER_SHORTCUT_EVENT,{detail:{requestId,action,url,kind}}));return!0}catch{return!1}}};
const openerShortcutBridge={send(requestId,action,url){try{const opener=window.opener;if(!opener||opener.closed)return!1;opener.postMessage({channel:"download",type:PLAYER_SHORTCUT_MESSAGE,requestId,action,url},location.origin);return!0}catch{return!1}}};
function shortcutContextAlive(ctx){try{return!!ctx.view&&!ctx.view.closed}catch{return!1}}
function findShortcutContext(kind){for(const ctx of Array.from(shortcutContexts)){if(!shortcutContextAlive(ctx)){shortcutContexts.delete(ctx);continue}if(ctx.kind===kind)return ctx}return null}
function isShortcutTypingTarget(target){
try{
if(!target||!target.tagName)return!1;
if(target.tagName==="INPUT")return!/^(range|checkbox|radio|button|submit)$/i.test(target.type||"");
return target.tagName==="TEXTAREA"||target.tagName==="SELECT"||!!target.isContentEditable
}catch{return!1}
}
function readShortcutResult(detail){
if(!detail)return null;
return{requestId:typeof detail.requestId==="string"?detail.requestId.slice(0,128):"",kind:detail.kind==="popup"?"popup":"pip",ok:detail.ok===!0,text:typeof detail.text==="string"?detail.text.slice(0,300):"",loadUrl:typeof detail.loadUrl==="string"?videoUrl(detail.loadUrl):""}
}
function showPlayerShortcutToast(doc,text,ok){
try{
if(!text)return;
let el=doc.getElementById(PLAYER_SHORTCUT_TOAST_ID);
if(!el){el=doc.createElement("div");el.id=PLAYER_SHORTCUT_TOAST_ID;(doc.body||doc.documentElement).appendChild(el)}
el.style.cssText="position:fixed!important;left:50%!important;top:14px!important;transform:translateX(-50%)!important;max-width:86%!important;box-sizing:border-box!important;padding:8px 14px!important;border-radius:12px!important;background:rgba(0,0,0,.9)!important;border:1px solid "+(ok?"rgba(34,211,238,.4)":"rgba(251,191,36,.5)")+"!important;color:"+(ok?"#67e8f9":"#fbbf24")+"!important;font:700 12.5px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif!important;text-align:center!important;pointer-events:none!important;z-index:2147483647!important;opacity:1!important;transition:opacity .25s!important";
el.textContent=text;
const view=doc.defaultView;if(!view)return;
view.clearTimeout(el.__downloadToastTimer);el.__downloadToastTimer=view.setTimeout(()=>{el.style.setProperty("opacity","0","important")},1500)
}catch{}
}
/* Playback keys.  Returns the text for the toast ("" = nothing to say). */
function applyPlayerAction(ctx,action){
const video=ctx.video();if(!video)return"";
if(action==="playpause"){video.paused?video.play().catch(()=>{}):video.pause();return""}
if(action==="faster"||action==="slower"){
const current=Number(video.playbackRate)||1,next=Math.max(.25,Math.min(3,Math.round((current+(action==="faster"?.25:-.25))*100)/100));
ctx.setSpeed(next);return"Tốc độ "+formatSpeed(next)
}
if(action==="mute"){video.muted=!video.muted;return video.muted?"Đã tắt tiếng":"Đã bật tiếng"}
if(action==="seekBack"||action==="seekFwd"){
const duration=Number.isFinite(video.duration)?video.duration:1/0;
try{video.currentTime=Math.max(0,Math.min(duration,(video.currentTime||0)+(action==="seekFwd"?5:-5)))}catch{}
}
return""
}
function requestListShortcut(ctx,action,url){
const requestId="download-shortcut-"+Date.now().toString(36)+"-"+(++shortcutRequestNumber)+"-"+Math.random().toString(36).slice(2,8);
if(!ctx.bridge.send(requestId,action,url,ctx.kind))showPlayerShortcutToast(ctx.view.document,"Không tìm thấy tab tìm kiếm.",!1)
}
/* ctx = { kind:"pip"|"popup", bridge, video(), url(), setSpeed(value) } for the player living in `view`. */
function bindPlayerShortcuts(view,ctx){
ctx.view=view;
for(const old of Array.from(shortcutContexts))if(old.view===view||!shortcutContextAlive(old))shortcutContexts.delete(old);
shortcutContexts.add(ctx);
if(view.__downloadShortcutsBound)return;view.__downloadShortcutsBound=!0;
view.addEventListener("keydown",event=>{
const current=Array.from(shortcutContexts).find(candidate=>candidate.view===view);if(!current)return;
if(event.ctrlKey||event.altKey||event.metaKey||event.shiftKey)return;
const action=SHORTCUT_BY_CODE[event.code];if(!action)return;
const target=event.target;if(isShortcutTypingTarget(target))return;
/* Arrow keys on a focused slider keep moving the slider. */
if((action==="seekBack"||action==="seekFwd")&&target&&target.tagName==="INPUT")return;
event.preventDefault();event.stopPropagation();
if(event.repeat&&!SHORTCUT_REPEAT_ACTIONS.has(action))return;
if(SHORTCUT_LIST_ACTIONS.has(action)){
const url=current.url();
if(!url){showPlayerShortcutToast(view.document,"Chưa có video để thao tác.",!1);return}
requestListShortcut(current,action,url);return
}
showPlayerShortcutToast(view.document,applyPlayerAction(current,action),!0)
},!0)
}
/* Search tab: the answer to a list key.  A request that came from a player window goes back to that window, any other is
 * for the Document PiP player. */
window.addEventListener(PLAYER_SHORTCUT_RESULT_EVENT,event=>{
const data=readShortcutResult(event&&event.detail);if(!data)return;
const popup=data.requestId?shortcutRoutes.get(data.requestId):null;
if(data.requestId)shortcutRoutes.delete(data.requestId);
if(popup){try{if(!popup.closed)popup.postMessage(Object.assign({channel:"download",type:PLAYER_SHORTCUT_RESULT_MESSAGE},data),location.origin)}catch{}return}
const ctx=data.kind==="pip"?findShortcutContext("pip"):null;
if(ctx)showPlayerShortcutToast(ctx.view.document,data.text,data.ok)
});
/* Search tab: a playback key pressed in the tab itself, for the Document PiP player. */
window.addEventListener(PLAYER_CONTROL_EVENT,event=>{
const action=event&&event.detail&&typeof event.detail.action==="string"?event.detail.action:"";
if(!SHORTCUT_PLAYBACK_ACTIONS.has(action))return;
const ctx=findShortcutContext("pip");if(!ctx)return;
showPlayerShortcutToast(ctx.view.document,applyPlayerAction(ctx,action),!0)
});
window.addEventListener("message",event=>{
if(event.origin!==location.origin||!event.data||event.data.channel!=="download")return;
const message=event.data;
if(message.type===PLAYER_SHORTCUT_RESULT_MESSAGE||message.type===PLAYER_CONTROL_MESSAGE){
/* In the player window: pushed by the tab that opened it. */
if(!isDedicatedPlayerWindow()||!window.opener||event.source!==window.opener)return;
if(message.type===PLAYER_CONTROL_MESSAGE){
const action=typeof message.action==="string"?message.action:"",ctx=SHORTCUT_PLAYBACK_ACTIONS.has(action)?findShortcutContext("popup"):null;
if(ctx)showPlayerShortcutToast(document,applyPlayerAction(ctx,action),!0);
return
}
const data=readShortcutResult(message);if(!data)return;
if(data.loadUrl)openVideoPlayerStream(data.loadUrl);
showPlayerShortcutToast(document,data.text,data.ok);return
}
if(message.type!==PLAYER_SHORTCUT_MESSAGE)return;
/* In the search tab: a list key pressed in a player window. */
if(isDedicatedPlayerWindow()||!event.source||event.source===window)return;
const url=videoUrl(message.url),requestId=typeof message.requestId==="string"?message.requestId.slice(0,128):"",action=typeof message.action==="string"?message.action:"";
if(!url||!requestId||!SHORTCUT_LIST_ACTIONS.has(action))return;
shortcutRoutes.set(requestId,event.source);setTimeout(()=>shortcutRoutes.delete(requestId),15000);
localShortcutBridge.send(requestId,action,url,"popup")
});
/* ===== [/Download] Player shortcuts ===== */
function formatSpeed(speed){return String(speed).replace(/\.0$/,"")+"×"}
/* Generic mouse-wheel "nudge a numeric value" helper, reused by every volume/speed/concurrency control below. preventDefault so the page behind the control does not scroll while the value is being adjusted. */
function wheelStepValue(current,step,min,max,deltaY){
/* Snap onto the grid anchored at `min` (the same grid a native <input type=range min max step>
 * element itself uses), not a grid anchored at 0. When min isn't itself a multiple of step
 * (e.g. min=.25, step=.1 → valid values are .25,.35,...,1.95,2.05,...) the old "round to the
 * nearest multiple of step from zero" logic produced values like 1.9 that don't exist on the
 * slider's real step grid; floating-point error in that rounding could also push the result to
 * the wrong neighboring tenth depending on direction, which is what made the value appear to
 * get stuck when decreasing. Doing the math in integers (scaled) avoids the float drift too. */
const SCALE=1e3,toInt=n=>Math.round(n*SCALE),stepI=toInt(step),minI=toInt(min),maxI=toInt(max),nextI=toInt(current)+(deltaY<0?stepI:-stepI),clampedI=Math.max(minI,Math.min(maxI,nextI)),stepsFromMin=Math.round((clampedI-minI)/stepI),snappedI=Math.max(minI,Math.min(maxI,minI+stepsFromMin*stepI));
return snappedI/SCALE
}
function bindWheelStep(el,step,min,max,getValue,onChange){
el.addEventListener("wheel",event=>{
const current=getValue();if(!Number.isFinite(current))return;
event.preventDefault();event.stopPropagation();
onChange(wheelStepValue(current,step,min,max,event.deltaY))
},{passive:!1})
}
function renderSpeedButton(btn){
if(!btn||!btn.isConnected)return;
const speed=searchPlaybackSpeed||1,label="Playback speed: "+formatSpeed(speed);
btn.title=label;btn.setAttribute("aria-label",label);btn.innerHTML='<span style="font:700 10px/1 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif">'+formatSpeed(speed)+"</span>"
}
function forceSearchSpeed(video){
if(!video||!isSearchPage()||video.__downloadSearchSpeedApplying)return;
if(isDocumentPipVideo(video)&&documentPipPlaybackSpeed!==null){
if(Math.abs(video.playbackRate-documentPipPlaybackSpeed)<.01)return;
try{video.__downloadSearchSpeedApplying=!0;video.playbackRate=documentPipPlaybackSpeed}catch{}finally{video.__downloadSearchSpeedApplying=!1}return
}
if(searchPlaybackSpeed===null)return;
if(Math.abs(video.playbackRate-searchPlaybackSpeed)<.01)return;
try{video.__downloadSearchSpeedApplying=!0;video.playbackRate=searchPlaybackSpeed}catch{}finally{video.__downloadSearchSpeedApplying=!1}
}
function isDocumentPipVideo(video){
const pipWindow=activeDocumentPipWindow();try{return!!(video&&pipWindow&&pipWindow.document.querySelector("#"+DOCUMENT_PIP_HOST_ID+" video")===video)}catch{return!1}
}
function setDocumentPipSpeed(video,speed){
const value=Math.max(.25,Math.min(3,Number(speed)||1));documentPipPlaybackSpeed=value;
try{sessionStorage.setItem(PIP_SPEED_STORAGE_KEY,String(value))}catch{}
try{video.__downloadSearchSpeedApplying=!0;video.playbackRate=value}catch{}finally{try{video.__downloadSearchSpeedApplying=!1}catch{}}
}
function bindSearchSpeed(video){
if(!video||video.__downloadSearchSpeedBound)return;
video.__downloadSearchSpeedBound=!0;
video.addEventListener("ratechange",()=>forceSearchSpeed(video),!0);
video.addEventListener("loadedmetadata",()=>forceSearchSpeed(video),!0);
video.addEventListener("playing",()=>forceSearchSpeed(video),!0);
forceSearchSpeed(video)
}
function applySearchSpeed(root=document){
if(searchPlaybackSpeed===null||!isSearchPage())return;
if(root&&root.nodeType===1&&root.matches("video"))bindSearchSpeed(root);
const scope=root&&typeof root.querySelectorAll==="function"?root:document;
scope.querySelectorAll("video").forEach(bindSearchSpeed);
/* The hover preview video lives in a shadow root, so the query above misses it too. */
try{if(hoverState&&hoverState.video){bindSearchSpeed(hoverState.video);forceSearchSpeed(hoverState.video)}}catch{}
/* The Document PiP video lives in a different document, so it is not part of
 * document.querySelectorAll("video") above.  Apply the same tab speed to it. */
const pipWindow=activeDocumentPipWindow();
try{const pipVideo=pipWindow&&pipWindow.document.querySelector("#"+DOCUMENT_PIP_HOST_ID+" video");if(pipVideo){bindSearchSpeed(pipVideo);setDocumentPipSpeed(pipVideo,searchPlaybackSpeed)}}catch{}
}
function syncSearchSpeed(){
if(searchPlaybackSpeed===null||!isSearchPage())return;
try{syncingSearchSpeed=!0;window.dispatchEvent(new CustomEvent("__download_settings__",{detail:{playbackSpeed:searchPlaybackSpeed}}))}catch{}finally{syncingSearchSpeed=!1}
applySearchSpeed()
}
function closeSpeedMenus(){document.querySelectorAll("."+SPEED_MENU_CLASS).forEach(menu=>{menu.__downloadClose&&menu.__downloadClose();menu.remove()})}
function chooseSpeed(speed,keepMenuOpen){
searchPlaybackSpeed=speed;
try{sessionStorage.setItem(SPEED_STORAGE_KEY,String(speed))}catch{}
if(isDedicatedPlayerWindow())try{window.opener&&window.opener.postMessage({channel:"download",type:PLAYER_SPEED_MESSAGE,speed},location.origin)}catch{}
document.querySelectorAll("."+SPEED_BUTTON_CLASS).forEach(renderSpeedButton);
syncSearchSpeed();if(!keepMenuOpen)closeSpeedMenus()
}
window.addEventListener("message",event=>{
if(event.origin!==location.origin||!event.data||event.data.channel!=="download"||event.data.type!==PLAYER_SPEED_MESSAGE)return;
const speed=Number(event.data.speed);if(Number.isFinite(speed)&&speed>=.25&&speed<=3)playerPopupSpeed=speed
},!0);
function openSpeedMenu(btn){
const existing=document.querySelector("."+SPEED_MENU_CLASS);if(existing){closeSpeedMenus();return}
const rect=btn.getBoundingClientRect(),menu=document.createElement("div");
menu.className=SPEED_MENU_CLASS;menu.setAttribute("role","menu");menu.style.cssText="position:fixed!important;z-index:2147483646!important;width:176px!important;padding:10px 12px 12px!important;border:1px solid rgba(255,255,255,.22)!important;border-radius:10px!important;background:rgba(20,20,24,.96)!important;box-shadow:0 8px 24px rgba(0,0,0,.5)!important;display:flex!important;flex-direction:column!important;gap:6px!important;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif!important";
const labelRow=document.createElement("div");labelRow.style.cssText="display:flex!important;align-items:center!important;justify-content:space-between!important;font:600 11px/1 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif!important";
const labelText=document.createElement("span");labelText.textContent="Playback speed";labelText.style.cssText="color:#fff!important;opacity:.7!important";
const valueText=document.createElement("span");valueText.style.cssText="color:#2fe4f8!important;font-weight:700!important";valueText.textContent=formatSpeed(searchPlaybackSpeed||1);
labelRow.append(labelText,valueText);
const slider=document.createElement("input");slider.type="range";slider.min=String(SPEED_MIN);slider.max=String(SPEED_MAX);slider.step=".05";slider.value=String(searchPlaybackSpeed||1);slider.title="Playback speed";slider.setAttribute("aria-label","Playback speed");slider.style.cssText="width:100%!important;margin:2px 0 0!important;accent-color:#2fe4f8!important;cursor:pointer!important";
/* stopPropagation only — never preventDefault — on the slider itself.
 * Dragging a native range thumb is a default browser action tied to
 * pointer/mouse events actually reaching this element; preventDefault()
 * here (or stopping propagation any higher up, before the event even
 * reaches this element) would suppress that native drag. This mirrors the
 * download-list panel fix: an ancestor's capturing listener must never
 * run interference before the interactive element itself gets the event. */
for(const type of["pointerdown","mousedown","touchstart","click"])slider.addEventListener(type,event=>event.stopPropagation());
slider.addEventListener("input",()=>{const value=Number(slider.value);if(!Number.isFinite(value))return;valueText.textContent=formatSpeed(value);chooseSpeed(value,!0)});
bindWheelStep(slider,.1,SPEED_MIN,SPEED_MAX,()=>Number(slider.value)||1,value=>{slider.value=String(value);valueText.textContent=formatSpeed(value);chooseSpeed(value,!0)});
menu.append(labelRow,slider);
document.body.appendChild(menu);const top=Math.min(innerHeight-menu.offsetHeight-8,Math.max(8,rect.bottom+6)),left=Math.max(8,Math.min(innerWidth-menu.offsetWidth-8,rect.right-menu.offsetWidth));menu.style.top=Math.round(top)+"px";menu.style.left=Math.round(left)+"px";
const dismiss=event=>{if(!menu.contains(event.target)&&!btn.contains(event.target))closeSpeedMenus()};const onScroll=()=>closeSpeedMenus();menu.__downloadClose=()=>{document.removeEventListener("pointerdown",dismiss,!0);window.removeEventListener("scroll",onScroll,!0);window.removeEventListener("resize",onScroll)};document.addEventListener("pointerdown",dismiss,!0);window.addEventListener("scroll",onScroll,!0);window.addEventListener("resize",onScroll)
}
window.addEventListener("__download_settings__",event=>{
const incoming=Number(event.detail&&event.detail.playbackSpeed);if(Math.abs(incoming-searchPlaybackSpeed)<.01)return;
if(Number.isFinite(incoming)&&incoming>0&&!syncingSearchSpeed)basePlaybackSpeed=incoming;
if(searchPlaybackSpeed===null||!isSearchPage())return;
queueMicrotask(()=>{if(searchPlaybackSpeed!==null&&isSearchPage())syncSearchSpeed()})
},!0);

function getVideoIn(host){
if(!host)return null;
const videos=Array.from(host.querySelectorAll("video")).filter(video=>video.isConnected);
return videos.sort((a,b)=>(b.paused?0:1e6)+(b.readyState>=1?1e5:0)-(a.paused?0:1e6)-(a.readyState>=1?1e5:0))[0]||null
}
function findVideoHost(video){
let host=video.parentElement,hops=0;
while(host&&hops++<8){if(hasCardSize(host))return host;host=host.parentElement}
return null
}
function attach(host,getVideo,getUrl){
if(!host||!hasCardSize(host))return;
try{if(getComputedStyle(host).position==="static")host.style.setProperty("position","relative","important")}catch{}
let pipButton=host.querySelector("."+PIP_BUTTON_CLASS);
if(pipSupported&&!pipButton){
pipButton=makeButton("pip");
for(const type of["pointerdown","mousedown","touchstart"])pipButton.addEventListener(type,stopCardEvent,!0);
pipButton.addEventListener("click",event=>{stopCardEvent(event);openPiP(pipButton)},!0);
pipButton.addEventListener("mouseenter",()=>prepare(pipButton));
pipButton.addEventListener("focus",()=>prepare(pipButton));
host.appendChild(pipButton)
}
if(pipButton){pipButton.__downloadGetVideo=getVideo;pipButton.__downloadGetUrl=getUrl}
let playerButton=host.querySelector("."+PLAYER_BUTTON_CLASS);
if(!playerButton){
playerButton=makeButton("player");
for(const type of["pointerdown","mousedown","touchstart"])playerButton.addEventListener(type,stopCardEvent,!0);
playerButton.addEventListener("click",event=>{stopCardEvent(event);openVideoPlayer(playerButton)},!0);
host.appendChild(playerButton)
}
playerButton.__downloadGetUrl=getUrl;
let downloadButton=host.querySelector("."+DOWNLOAD_BUTTON_CLASS);
if(!downloadButton){
downloadButton=makeButton("download");
for(const type of["pointerdown","mousedown","touchstart"])downloadButton.addEventListener(type,stopCardEvent,!0);
downloadButton.addEventListener("click",event=>{stopCardEvent(event);downloadVideo(downloadButton)},!0);
host.appendChild(downloadButton)
}
downloadButton.__downloadGetUrl=getUrl
let speedButton=host.querySelector("."+SPEED_BUTTON_CLASS);
if(!speedButton){
speedButton=makeButton("speed");
speedButton.addEventListener("pointerdown",event=>{stopCardEvent(event);speedButton.__downloadSpeedOpenedByPointer=!0;openSpeedMenu(speedButton)},!0);
for(const type of["mousedown","touchstart"])speedButton.addEventListener(type,stopCardEvent,!0);
speedButton.addEventListener("click",event=>{stopCardEvent(event);if(speedButton.__downloadSpeedOpenedByPointer){speedButton.__downloadSpeedOpenedByPointer=!1;return}openSpeedMenu(speedButton)},!0);
bindWheelStep(speedButton,.1,SPEED_MIN,SPEED_MAX,()=>searchPlaybackSpeed||1,value=>chooseSpeed(value));
host.appendChild(speedButton)
}
renderSpeedButton(speedButton)
let cardUrl="";try{cardUrl=typeof getUrl==="function"&&getUrl()||""}catch{}
restoreCardActionState(pipButton,cardUrl,pipActivatedUrls,"Đã xem");
restoreCardActionState(playerButton,cardUrl,playerActivatedUrls,"Đã xem");
restoreCardActionState(downloadButton,cardUrl,downloadActivatedUrls,"Đã tải")
}
function attachForLink(link){
if(!isThumbnailLink(link))return;
attach(link,()=>getVideoIn(link),()=>videoUrl(link.href))
}
function attachForVideo(video){
if(!video)return;
bindSearchSpeed(video);
if(!hasCardSize(video))return;
const link=video.closest("a[href*='/video/']");
if(link&&hasCardSize(link)){attach(link,()=>getVideoIn(link),()=>videoUrl(link.href));return}
const host=findVideoHost(video);host&&attach(host,()=>getVideoIn(host)||video,()=>{
const cardLink=host.closest("a[href*='/video/']")||host.querySelector("a[href*='/video/']");return cardLink?videoUrl(cardLink.href):""
})
}

function scanRoot(root){
if(!isSearchPage()||isDedicatedPlayerWindow()||!root)return;
if(root===document){document.querySelectorAll("a[href*='/video/']").forEach(attachForLink);document.querySelectorAll("video").forEach(attachForVideo);return}
if(root.nodeType!==1)return;
const element=root;
if(element.matches("a[href*='/video/']"))attachForLink(element);
if(element.matches("video"))attachForVideo(element);
const parentLink=element.closest("a[href*='/video/']");parentLink&&attachForLink(parentLink);
element.querySelectorAll("a[href*='/video/']").forEach(attachForLink);
element.querySelectorAll("video").forEach(attachForVideo)
}
function flushScan(){scanScheduled=!1;const nodes=Array.from(queuedNodes);queuedNodes.clear();nodes.forEach(scanRoot)}
function queueScan(node){if(node)queuedNodes.add(node);if(!scanScheduled){scanScheduled=!0;requestAnimationFrame(flushScan)}}
function scanAll(){queueScan(document)}

function waitForMetadata(video,timeout=1500){
if(video.readyState>=HTMLMediaElement.HAVE_METADATA)return Promise.resolve(!0);
return new Promise(resolve=>{let done=!1;const finish=value=>{if(done)return;done=!0;video.removeEventListener("loadedmetadata",ready);video.removeEventListener("error",failed);resolve(value)},ready=()=>finish(!0),failed=()=>finish(!1);video.addEventListener("loadedmetadata",ready,{once:!0});video.addEventListener("error",failed,{once:!0});setTimeout(()=>finish(video.readyState>=HTMLMediaElement.HAVE_METADATA),timeout)})
}
async function enterPiP(video,waitForReady){
if(!video||!video.isConnected)return!1;
try{
T(video);
if(document.pictureInPictureElement===video){await document.exitPictureInPicture();return!0}
if(document.pictureInPictureElement)await document.exitPictureInPicture();
if(video.readyState<HTMLMediaElement.HAVE_METADATA){try{video.play().catch(()=>{})}catch{}if(!waitForReady||!await waitForMetadata(video))return!1}
try{await video.requestPictureInPicture();return!0}catch{
try{await video.play()}catch{}
try{await video.requestPictureInPicture();return!0}catch{return!1}
}
}catch{return!1}
}

/* Search cards use Document Picture-in-Picture when Chrome supports it.  This
 * window contains our own transparent controls, so Chrome's dark native PiP
 * hover overlay is never drawn over the video. */
const DOCUMENT_PIP_HOST_ID="__download_document_pip_player";
function activeDocumentPipWindow(){
const candidate=documentPipWindow||(window.documentPictureInPicture&&window.documentPictureInPicture.window);
try{return candidate&&!candidate.closed&&candidate.__downloadDocumentPip===!0?candidate:null}catch{return null}
}
function hideWarmVideo(video){
if(!video)return;try{video.pause()}catch{}
try{if(video.ownerDocument!==document||!video.isConnected)(document.body||document.documentElement).appendChild(video)}catch{}
video.style.cssText="position:fixed!important;left:-10000px!important;top:-10000px!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important"
}
function makeDocumentPipButton(doc,label,title){
const button=doc.createElement("button");button.type="button";button.textContent=label;button.title=title;button.setAttribute("aria-label",title);
button.style.cssText="width:32px;height:30px;padding:0;border:0;border-radius:7px;background:transparent;color:#fff;font:700 15px/1 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;cursor:pointer;text-shadow:0 1px 3px #000";
button.addEventListener("mouseenter",()=>button.style.background="rgba(255,255,255,.16)");button.addEventListener("mouseleave",()=>button.style.background="transparent");return button
}
function buildDocumentPipPlayer(pipWindow,video){
if(video.__downloadPipHandlers){const _h=video.__downloadPipHandlers;video.removeEventListener("click",_h.togglePlay);video.removeEventListener("play",_h.updatePlay);video.removeEventListener("pause",_h.updatePlay);video.removeEventListener("volumechange",_h.updateMute);video.removeEventListener("ratechange",_h.updateSpeed);video.removeEventListener("durationchange",_h.updateTimeline);video.removeEventListener("loadedmetadata",_h.updateTimeline);video.removeEventListener("timeupdate",_h.updateTimeline);video.__downloadPipHandlers=null}
const doc=pipWindow.document,host=doc.createElement("div"),controls=doc.createElement("div"),play=makeDocumentPipButton(doc,"▶","Play"),progress=doc.createElement("input"),time=doc.createElement("span"),mute=makeDocumentPipButton(doc,"🔊","Mute"),speed=doc.createElement("span"),speedPopup=doc.createElement("div"),speedSlider=doc.createElement("input"),close=makeDocumentPipButton(doc,"×","Close Picture-in-Picture");
doc.title="Download";doc.head.replaceChildren();doc.body.replaceChildren();
const style=doc.createElement("style");style.textContent="html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#000}#"+DOCUMENT_PIP_HOST_ID+"{position:fixed;inset:0;background:#000;overflow:hidden}#"+DOCUMENT_PIP_HOST_ID+" video{display:block;width:100%;height:100%;background:#000;object-fit:contain}.download-pip-controls{position:absolute;left:8px;right:8px;bottom:8px;display:flex;align-items:center;gap:8px;min-height:32px;padding:0;background:transparent;opacity:0;pointer-events:none;transition:opacity .16s ease}.download-pip-controls.is-visible{opacity:1;pointer-events:auto}.download-pip-progress{flex:1;min-width:36px;margin:0;accent-color:#2fe4f8;cursor:pointer}.download-pip-time{min-width:64px;color:#fff;font:500 11px/1 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;text-shadow:0 1px 3px #000;font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}.download-pip-speed{margin-left:auto;min-width:32px;padding:4px 6px;border-radius:6px;color:#fff;font:700 12px/1 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;text-align:right;text-shadow:0 1px 3px #000;cursor:pointer;user-select:none}.download-pip-speed:hover,.download-pip-speed.is-open{background:rgba(255,255,255,.16)}.download-pip-speed-popup{position:absolute;right:8px;bottom:40px;display:none;align-items:center;gap:8px;padding:8px 10px;border-radius:9px;background:rgba(20,20,24,.96);box-shadow:0 8px 24px rgba(0,0,0,.5);pointer-events:auto}.download-pip-speed-popup.is-visible{display:flex}.download-pip-speed-popup input[type=range]{width:120px;accent-color:#2fe4f8;cursor:pointer}";doc.head.appendChild(style);
style.textContent+=".download-pip-controls{flex-wrap:wrap;gap:4px 6px}";
host.id=DOCUMENT_PIP_HOST_ID;controls.className="download-pip-controls";controls.setAttribute("aria-label","Picture-in-Picture controls");
speed.className="download-pip-speed";speed.tabIndex=0;speed.setAttribute("role","button");speed.title="Playback speed (scroll to adjust)";speed.setAttribute("aria-label","Playback speed");
speedSlider.type="range";speedSlider.min=".25";speedSlider.max="3";speedSlider.step=".1";speedSlider.title="Playback speed";speedSlider.setAttribute("aria-label","Playback speed");
speedPopup.className="download-pip-speed-popup";speedPopup.appendChild(speedSlider);
progress.type="range";progress.min="0";progress.max="0";progress.step=".01";progress.value="0";progress.className="download-pip-progress";progress.title="Seek";progress.setAttribute("aria-label","Seek");
time.className="download-pip-time";
controls.append(play,progress,time,mute,speed,close);
const selectButton=makePlayerSelectButton(doc,()=>{const url=video.__downloadSearchPipUrl;if(!url)return null;const data=streamCache.get(url)||{};return{url,thumb:data.coverUrl,title:data.title}},localSelectBridge);
host.append(video,controls,speedPopup,selectButton);doc.body.appendChild(host);applyGlobalVolumeBalance(video);
bindPlayerSubfolderMenu(host);
registerSegmentPanel({mode:"pip",view:pipWindow,host,getVideo:()=>host.querySelector("video")});
video.controls=!1;video.playsInline=!0;video.style.cssText="display:block!important;width:100%!important;height:100%!important;background:#000!important;object-fit:contain!important;cursor:pointer!important";
const updatePlay=()=>{play.textContent=video.paused?"▶":"❚❚";play.title=video.paused?"Play":"Pause";play.setAttribute("aria-label",play.title)},updateMute=()=>{mute.textContent=video.muted||video.volume===0?"🔇":"🔊";mute.title=video.muted?"Unmute":"Mute";mute.setAttribute("aria-label",mute.title)},updateSpeed=()=>{const current=Math.max(.25,Math.min(3,Number(video.playbackRate)||1));speed.textContent=formatSpeed(current);if(!speedSlider.matches(":active"))speedSlider.value=String(current)},updateTimeline=()=>{const duration=Number.isFinite(video.duration)?video.duration:0;progress.max=String(duration);if(!progress.matches(":active"))progress.value=String(Math.min(duration,video.currentTime||0));time.textContent=formatPlayerTime(video.currentTime)+" / "+formatPlayerTime(duration)};
const togglePlay=()=>{video.paused?video.play().catch(()=>{}):video.pause()};play.addEventListener("click",togglePlay);video.addEventListener("click",togglePlay);mute.addEventListener("click",()=>{video.muted=!video.muted});close.addEventListener("click",()=>pipWindow.close());
progress.addEventListener("input",()=>{const value=Number(progress.value);if(Number.isFinite(value))video.currentTime=value});
for(const type of["pointerdown","mousedown","touchstart","click"])progress.addEventListener(type,event=>event.stopPropagation());
/* Click the "2×" badge to open a small popup slider (max 3×); scroll the
 * badge itself, or the slider, to nudge speed by 0.1 per wheel notch. */
const closeSpeedPopup=()=>{speedPopup.classList.remove("is-visible");speed.classList.remove("is-open")};
const openSpeedPopup=()=>{speedSlider.value=String(Math.max(.25,Math.min(3,Number(video.playbackRate)||1)));speedPopup.classList.add("is-visible");speed.classList.add("is-open")};
speed.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();speedPopup.classList.contains("is-visible")?closeSpeedPopup():openSpeedPopup()});
speed.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();event.stopPropagation();speedPopup.classList.contains("is-visible")?closeSpeedPopup():openSpeedPopup()}});
bindWheelStep(speed,.1,.25,3,()=>Number(video.playbackRate)||1,value=>{setDocumentPipSpeed(video,value);updateSpeed()});
for(const type of["pointerdown","mousedown","touchstart","click"])speedSlider.addEventListener(type,event=>event.stopPropagation());
speedSlider.addEventListener("input",()=>{const value=Number(speedSlider.value);if(!Number.isFinite(value))return;setDocumentPipSpeed(video,value);updateSpeed()});
bindWheelStep(speedSlider,.1,.25,3,()=>Number(speedSlider.value)||1,value=>{speedSlider.value=String(value);setDocumentPipSpeed(video,value);updateSpeed()});
doc.addEventListener("pointerdown",event=>{if(!speedPopup.contains(event.target)&&event.target!==speed)closeSpeedPopup()},!0);
video.addEventListener("play",updatePlay);video.addEventListener("pause",updatePlay);video.addEventListener("volumechange",updateMute);video.addEventListener("ratechange",updateSpeed);video.addEventListener("durationchange",updateTimeline);video.addEventListener("loadedmetadata",updateTimeline);video.addEventListener("timeupdate",updateTimeline);
video.__downloadPipHandlers={togglePlay,updatePlay,updateMute,updateSpeed,updateTimeline};
let hideTimer=0;const showControls=()=>{clearTimeout(hideTimer);controls.classList.add("is-visible")},hideControls=()=>{clearTimeout(hideTimer);hideTimer=setTimeout(()=>{if(!controls.matches(":focus-within")&&!speedPopup.classList.contains("is-visible"))controls.classList.remove("is-visible")},180)};
host.addEventListener("pointermove",event=>{event.clientY>=pipWindow.innerHeight-68?showControls():hideControls()});host.addEventListener("pointerleave",hideControls);controls.addEventListener("pointerenter",showControls);controls.addEventListener("pointerleave",hideControls);
doc.addEventListener("keydown",event=>{
if(event.ctrlKey&&!event.altKey&&!event.metaKey&&(event.key==="ArrowRight"||event.key==="ArrowLeft")){
event.preventDefault();event.stopPropagation();
const current=Number(video.playbackRate)||documentPipPlaybackSpeed||searchPlaybackSpeed||1,next=wheelStepValue(current,.1,.25,3,event.key==="ArrowRight"?-1:1);
setDocumentPipSpeed(video,next);return
}
if(event.code!=="Space"||event.ctrlKey||event.altKey||event.metaKey)return;
const tag=event.target&&event.target.tagName;if(tag==="BUTTON"||tag==="INPUT")return;event.preventDefault();event.stopPropagation();togglePlay()
});
bindPlayerShortcuts(pipWindow,{kind:"pip",bridge:localShortcutBridge,video:()=>video,url:()=>video.__downloadSearchPipUrl||"",setSpeed:value=>setDocumentPipSpeed(video,value)});
updatePlay();updateMute();updateSpeed();updateTimeline();return host
}
function handleDocumentPipClosed(pipWindow){
let video=null;try{video=pipWindow.document.querySelector("video")}catch{}if(video===warmVideo)hideWarmVideo(video);if(documentPipWindow===pipWindow)documentPipWindow=null;
broadcastPipClosed(video&&video.__downloadSearchPipUrl)
}
/* Tells the multi-select popup's "Đang xem" indicator (assets/multi-select.js,
 * ISOLATED world) that the PiP video for this URL is no longer showing —
 * covers every way it can close (native close button on the PiP window,
 * navigating it away, the user's own "leavepictureinpicture"), not just the
 * toggle-off click path that already replies through the request/response
 * bridge above. Harmless no-op there if this URL isn't the one it's tracking. */
function broadcastPipClosed(url){
if(!url)return;
try{window.dispatchEvent(new CustomEvent("__DOWNLOAD_MULTISELECT_PIP_CLOSED__",{detail:{url}}))}catch{}
}
function pipWindowShape(pipWindow){
try{const video=pipWindow.document.querySelector("video");return video&&video.videoWidth&&video.videoHeight?playerShape(video.videoWidth,video.videoHeight):null}catch{return null}
}
/* Size the PiP window for the video it just got.  Same shape as the previous video in this window ->
 * keep whatever size the user gave it.  New window or a different shape (9:16 <-> 16:9) -> the size
 * the user last gave that shape, else an automatic fit.  Position: best effort, Chrome may ignore moveTo(). */
function fitDocumentPipWindow(pipWindow,video){
try{
if(!pipWindow||pipWindow.closed)return;
const vw=video.videoWidth,vh=video.videoHeight;
if(!vw||!vh)return;
const shape=playerShape(vw,vh),previous=pipWindow.__downloadPipShape,fresh=!pipWindow.__downloadPipPlaced;
pipWindow.__downloadPipShape=shape;pipWindow.__downloadPipPlaced=!0;
trackPlayerBounds(pipWindow,"pip",()=>pipWindowShape(pipWindow));
if(previous===shape)return;
const scr=pipWindow.screen||window.screen||{},screenW=scr.availWidth||1280,screenH=scr.availHeight||800;
let size=savedPlayerSize("pip",shape);
if(!size){
const baseArea=400*680;let w=Math.sqrt(baseArea*(vw/vh)),h=w*(vh/vw);
const maxW=Math.min(screenW-40,720),maxH=Math.min(screenH-40,720);
if(w>maxW){w=maxW;h=w*(vh/vw)}
if(h>maxH){h=maxH;w=h*(vw/vh)}
size={w:Math.max(220,Math.round(w)),h:Math.max(160,Math.round(h))}
}
applyPlayerInnerSize(pipWindow,Math.min(size.w,screenW-24),Math.min(size.h,screenH-24));
if(fresh){
const rec=savedPlayerBounds("pip");
if(Number.isFinite(rec.x)&&Number.isFinite(rec.y))pipWindow.setTimeout(()=>{try{pipWindow.moveTo(Math.round(rec.x),Math.round(rec.y))}catch{}},450)
if(Number.isFinite(rec.x)&&Number.isFinite(rec.y))schedulePipPlacement(pipWindow,rec);
}
}catch{}
}
async function openDocumentPiP(url,data,windowRequest,startPaused){
let pipWindow=activeDocumentPipWindow();
if(!pipWindow){
if(document.pictureInPictureElement)try{await document.exitPictureInPicture()}catch{}
pipWindow=await(windowRequest||requestPipWindow());pipWindow.__downloadDocumentPip=!0;documentPipWindow=pipWindow;
pipWindow.addEventListener("pagehide",()=>handleDocumentPipClosed(pipWindow),{once:!0})
}
const video=warm(url,data);let host=null;try{host=pipWindow.document.getElementById(DOCUMENT_PIP_HOST_ID)}catch{}
if(!host)host=buildDocumentPipPlayer(pipWindow,video);else{const controls=host.querySelector(".download-pip-controls");if(video.parentElement!==host||video.nextSibling!==controls)host.insertBefore(video,controls||null);video.controls=!1;video.style.cssText="display:block!important;width:100%!important;height:100%!important;background:#000!important;object-fit:contain!important;cursor:pointer!important"}
refreshPlayerSelectButtons();bindSearchSpeed(video);if(!await waitForMetadata(video,2500))return!1;forceSearchSpeed(video);fitDocumentPipWindow(pipWindow,video);if(!startPaused){try{await video.play()}catch{}}return!0
}

function validStream(data){
try{return!!data&&typeof data.videoUrl==="string"&&new URL(data.videoUrl).protocol==="https:"}catch{return!1}}
function streamFor(url){
if(streamCache.has(url))return Promise.resolve(streamCache.get(url));
if(streamRequests.has(url))return streamRequests.get(url);
const requestId="download-pip-"+Date.now().toString(36)+"-"+(++requestNumber)+"-"+Math.random().toString(36).slice(2,8);
const promise=new Promise((resolve,reject)=>{
const timer=setTimeout(()=>{pendingRequests.delete(requestId);reject(new Error("metadata_timeout"))},15000);
pendingRequests.set(requestId,{resolve:data=>{clearTimeout(timer);pendingRequests.delete(requestId);resolve(data)},reject:error=>{clearTimeout(timer);pendingRequests.delete(requestId);reject(error)}});
window.postMessage({channel:"download",type:REQUEST_TYPE,requestId,url},location.origin)
}).then(data=>{if(!validStream(data))throw new Error("invalid_video_stream");streamCache.set(url,data);return data}).finally(()=>streamRequests.delete(url));
streamRequests.set(url,promise);return promise
}
window.addEventListener("message",event=>{
if(event.source!==window||event.origin!==location.origin)return;
const message=event.data;
if(!message||message.channel!=="download"||typeof message.requestId!=="string")return;
if(message.type===RESPONSE_TYPE){
const pending=pendingRequests.get(message.requestId);if(!pending)return;
message.success&&validStream(message.data)?pending.resolve(message.data):pending.reject(new Error(message.error||"metadata_unavailable"));return
}
if(message.type===DOWNLOAD_RESPONSE_TYPE){
const pending=pendingDownloads.get(message.requestId);if(!pending)return;
pendingDownloads.delete(message.requestId);clearTimeout(pending.timer);message.success?pending.resolve():pending.reject(new Error(message.error||"download_unavailable"))
}
});

function requestDownload(url){
const requestId="download-download-"+Date.now().toString(36)+"-"+(++requestNumber)+"-"+Math.random().toString(36).slice(2,8);
return new Promise((resolve,reject)=>{
const timer=setTimeout(()=>{pendingDownloads.delete(requestId);reject(new Error("download_timeout"))},20000);
pendingDownloads.set(requestId,{resolve,reject,timer});
window.postMessage({channel:"download",type:DOWNLOAD_REQUEST_TYPE,requestId,url},location.origin)
})
}
async function downloadVideo(btn){
if(!btn||downloadBusy.has(btn))return;
const url=typeof btn.__downloadGetUrl==="function"&&btn.__downloadGetUrl();
if(!url){flash(btn,"No downloadable TikTok video was found");return}
downloadBusy.add(btn);setButtonState(btn,"loading","Starting download…");
try{await requestDownload(url);markCardActionActive(btn,url,downloadActivatedUrls,"Đã tải")}catch{flash(btn,"Unable to download this TikTok video")}finally{downloadBusy.delete(btn)}
}

/* TikTok's regular video route also renders its author, caption, hashtags, and
 * comments.  This overlay uses the selected card stream instead, so it shows
 * only the video and Download's compact controls.  Escape or the black margin
 * closes it. */
function closeVideoPlayer(){
const overlay=document.getElementById(PLAYER_OVERLAY_ID);if(!overlay)return;
if(overlay.__downloadPlayerKeydown)document.removeEventListener("keydown",overlay.__downloadPlayerKeydown,!0);
const video=overlay.querySelector("video");
if(video){try{video.pause();video.removeAttribute("src");video.load()}catch{}}
overlay.remove()
}
function formatPlayerTime(seconds){
if(!Number.isFinite(seconds)||seconds<0)return"0:00";
const minutes=Math.floor(seconds/60),secs=Math.floor(seconds%60);return minutes+":"+String(secs).padStart(2,"0")
}
function makePlayerControl(label,title){
const button=document.createElement("button");button.type="button";button.title=title;button.setAttribute("aria-label",title);button.textContent=label;button.style.cssText="width:34px!important;height:30px!important;padding:0!important;border:0!important;border-radius:6px!important;background:transparent!important;color:#fff!important;font:700 16px/1 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif!important;cursor:pointer!important;flex:none!important";button.addEventListener("mouseenter",()=>button.style.background="rgba(255,255,255,.16)");button.addEventListener("mouseleave",()=>button.style.background="transparent");return button
}
function bindPlayerControls(overlay,video,controls){
const play=makePlayerControl("▶","Play"),mute=makePlayerControl("🔊","Mute"),fullscreen=makePlayerControl("⛶","Fullscreen");
const progress=document.createElement("input"),volume=document.createElement("input"),speed=document.createElement("input"),time=document.createElement("span"),speedLabel=document.createElement("span");
progress.type="range";progress.min="0";progress.max="0";progress.step=".01";progress.value="0";progress.title="Seek";progress.style.cssText="min-width:70px!important;flex:1!important;accent-color:#2fe4f8!important;cursor:pointer!important";
volume.type="range";volume.min="0";volume.max="1";volume.step=".01";volume.value=String(video.volume);volume.title="Volume";volume.style.cssText="width:72px!important;accent-color:#2fe4f8!important;cursor:pointer!important";
speed.type="range";speed.min=".25";speed.max="3";speed.step=".05";speed.value=String(searchPlaybackSpeed||video.playbackRate||1);speed.title="Playback speed";speed.style.cssText="width:96px!important;accent-color:#2fe4f8!important;cursor:pointer!important";
time.style.cssText="min-width:76px!important;color:#fff!important;font:500 12px/1 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif!important;font-variant-numeric:tabular-nums!important";
speedLabel.style.cssText="min-width:36px!important;color:#fff!important;font:700 12px/1 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif!important;text-align:right!important";
const updatePlay=()=>{play.textContent=video.paused?"▶":"❚❚";play.title=video.paused?"Play":"Pause";play.setAttribute("aria-label",play.title)};
const updateTimeline=()=>{const duration=Number.isFinite(video.duration)?video.duration:0;progress.max=String(duration);if(!progress.matches(":active"))progress.value=String(Math.min(duration,video.currentTime||0));time.textContent=formatPlayerTime(video.currentTime)+" / "+formatPlayerTime(duration)};
const updateVolume=()=>{mute.textContent=video.muted||video.volume===0?"🔇":"🔊";mute.title=video.muted?"Unmute":"Mute";mute.setAttribute("aria-label",mute.title);if(!volume.matches(":active"))volume.value=String(video.muted?0:video.volume)};
const updateSpeed=()=>{const current=Math.max(.25,Math.min(3,Number(video.playbackRate)||1));if(!speed.matches(":active"))speed.value=String(current);speedLabel.textContent=formatSpeed(current)};
const togglePlay=()=>{video.paused?video.play().catch(()=>{}):video.pause()};
play.addEventListener("click",togglePlay);video.addEventListener("click",togglePlay);
mute.addEventListener("click",()=>{video.muted=!video.muted});
progress.addEventListener("input",()=>{const value=Number(progress.value);if(Number.isFinite(value))video.currentTime=value});
volume.addEventListener("input",()=>{const value=Number(volume.value);if(Number.isFinite(value)){video.muted=value===0;video.volume=value}});
bindWheelStep(volume,.1,0,1,()=>Number(volume.value)||0,value=>{volume.value=String(value);video.muted=value===0;video.volume=value});
speed.addEventListener("input",()=>{const value=Number(speed.value);if(!Number.isFinite(value))return;chooseSpeed(value);try{video.playbackRate=value}catch{}updateSpeed()});
bindWheelStep(speed,.1,.25,3,()=>Number(speed.value)||1,value=>{speed.value=String(value);chooseSpeed(value);try{video.playbackRate=value}catch{}updateSpeed()});
fullscreen.addEventListener("click",()=>{const request=overlay.requestFullscreen||overlay.webkitRequestFullscreen;if(!request)return;try{const result=request.call(overlay);result&&result.catch&&result.catch(()=>{})}catch{}});
video.addEventListener("dblclick",event=>{event.preventDefault();try{if(document.fullscreenElement){const leave=document.exitFullscreen();leave&&leave.catch&&leave.catch(()=>{})}else fullscreen.click()}catch{}});
video.addEventListener("play",updatePlay);video.addEventListener("pause",updatePlay);video.addEventListener("durationchange",updateTimeline);video.addEventListener("loadedmetadata",updateTimeline);video.addEventListener("timeupdate",updateTimeline);video.addEventListener("volumechange",updateVolume);video.addEventListener("ratechange",updateSpeed);
controls.append(play,progress,time,mute,volume,speedLabel,speed,fullscreen);updatePlay();updateTimeline();updateVolume();updateSpeed()
}
function getVideoPlayer(){
let overlay=document.getElementById(PLAYER_OVERLAY_ID);if(overlay)return overlay;
overlay=document.createElement("div");overlay.id=PLAYER_OVERLAY_ID;overlay.setAttribute("role","dialog");overlay.setAttribute("aria-label","Video player");overlay.style.cssText="position:fixed!important;inset:0!important;z-index:2147483647!important;display:flex!important;align-items:center!important;justify-content:center!important;background:#000!important;cursor:default!important";
const video=document.createElement("video");prepareCorsVideo(video);video.controls=!1;video.autoplay=!0;video.playsInline=!0;video.preload="metadata";video.style.cssText="display:block!important;width:100vw!important;height:100vh!important;max-width:100vw!important;max-height:100vh!important;background:#000!important;object-fit:contain!important;cursor:pointer!important";
const controls=document.createElement("div");controls.className=PLAYER_CONTROLS_CLASS;controls.setAttribute("aria-hidden","true");controls.style.cssText="position:absolute!important;left:12px!important;right:12px!important;bottom:12px!important;z-index:1!important;min-height:48px!important;display:flex!important;align-items:center!important;gap:9px!important;padding:9px 10px!important;border:0!important;border-radius:10px!important;background:transparent!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;opacity:0!important;pointer-events:none!important;transition:opacity .16s ease!important";
overlay.append(video,controls);bindPlayerControls(overlay,video,controls);
overlay.appendChild(makePlayerSelectButton(document,()=>{const url=video.__downloadPlayerSource;if(!url)return null;const meta=video.__downloadPlayerMeta||{};return{url,thumb:meta.thumb,title:meta.title}},isDedicatedPlayerWindow()?openerSelectBridge:localSelectBridge));
bindPlayerSubfolderMenu(overlay);
let hideControlsTimer=0;
const showControls=()=>{clearTimeout(hideControlsTimer);controls.style.setProperty("opacity","1","important");controls.style.setProperty("pointer-events","auto","important");controls.setAttribute("aria-hidden","false")};
const hideControls=()=>{clearTimeout(hideControlsTimer);hideControlsTimer=setTimeout(()=>{if(controls.matches(":focus-within"))return;controls.style.setProperty("opacity","0","important");controls.style.setProperty("pointer-events","none","important");controls.setAttribute("aria-hidden","true")},160)};
const updateControlsVisibility=event=>{const rect=controls.getBoundingClientRect();event.clientY>=rect.top-42?showControls():hideControls()};
overlay.addEventListener("pointermove",updateControlsVisibility,!0);overlay.addEventListener("pointerleave",hideControls,!0);controls.addEventListener("pointerenter",showControls,!0);controls.addEventListener("pointerleave",hideControls,!0);controls.addEventListener("focusin",showControls,!0);controls.addEventListener("focusout",hideControls,!0);
overlay.addEventListener("pointerdown",event=>{if(event.target===overlay)closeVideoPlayer()},!0);
overlay.__downloadPlayerKeydown=event=>{
if(event.key==="Escape"){event.preventDefault();closeVideoPlayer();return}
if(event.ctrlKey&&!event.altKey&&!event.metaKey&&(event.key==="ArrowRight"||event.key==="ArrowLeft")){
event.preventDefault();event.stopPropagation();
const current=Number(video.playbackRate)||searchPlaybackSpeed||1,delta=event.key==="ArrowRight"?.1:-.1,next=Math.max(.25,Math.min(3,Math.round((current+delta)*10)/10));
chooseSpeed(next);try{video.playbackRate=next}catch{}return
}
if(event.code==="Space"&&!event.ctrlKey&&!event.altKey&&!event.metaKey){
const target=event.target,tag=target&&target.tagName;
if(tag==="BUTTON"||tag==="INPUT"||tag==="TEXTAREA"||tag==="SELECT")return;
event.preventDefault();event.stopPropagation();video.paused?video.play().catch(()=>{}):video.pause()
}
};
document.addEventListener("keydown",overlay.__downloadPlayerKeydown,!0);
if(isDedicatedPlayerWindow())bindPlayerShortcuts(window,{kind:"popup",bridge:openerShortcutBridge,video:()=>video,url:()=>video.__downloadPlayerSource||"",setSpeed:value=>{chooseSpeed(value);try{video.playbackRate=value}catch{}}});
(document.body||document.documentElement).appendChild(overlay);
registerSegmentPanel({mode:"win",view:window,host:overlay,getVideo:()=>overlay.querySelector("video")});
return overlay
}
function requestedPlayerUrl(){try{return videoUrl(new URL(location.href).searchParams.get(PLAYER_REQUEST_PARAM)||"")}catch{return""}}
function requestedPlayerSpeed(){try{const speed=Number(new URL(location.href).searchParams.get(PLAYER_SPEED_PARAM));return Number.isFinite(speed)&&speed>=.25&&speed<=3?speed:null}catch{return null}}
function playerWindowUrl(url,speed){const target=new URL("/search",location.origin);target.searchParams.set(PLAYER_REQUEST_PARAM,url);if(Number.isFinite(speed)&&speed>=.25&&speed<=3)target.searchParams.set(PLAYER_SPEED_PARAM,String(speed));return target.href}
function speedFromPlayerWindow(playerWindow){
try{const video=playerWindow.document.querySelector("#"+PLAYER_OVERLAY_ID+" video"),speed=Number(video&&video.playbackRate);return Number.isFinite(speed)&&speed>=.25&&speed<=3?speed:null}catch{return null}
}
/* Always-on-top variant of the player: same Document PiP window as the PiP button. requestWindow()
 * must run synchronously from the click (stream discovery is async), exactly like openPiP(). */
async function openPlayerOnTop(btn,url){
if(!btn||busy.has(btn))return;
busy.add(btn);setButtonState(btn,"loading","Preparing Picture-in-Picture…");
try{
const windowRequest=activeDocumentPipWindow()?null:requestPipWindow();
const data=await streamFor(url);
if(await openDocumentPiP(url,data,windowRequest)){markCardActionActive(btn,url,playerActivatedUrls,"Đã xem");return}
flash(btn,"Unable to open the always-on-top player")
}catch{flash(btn,"Unable to open the always-on-top player")}finally{busy.delete(btn)}
}
function openVideoPlayer(btn){
if(!btn)return;
const url=typeof btn.__downloadGetUrl==="function"&&btn.__downloadGetUrl();
if(!url){flash(btn,"No playable TikTok video was found");return}
if(playerAlwaysOnTop&&documentPipSupported){openPlayerOnTop(btn,url);return}
/* A fixed window name makes window.open reuse the existing player window.
 * Navigating it directly in the click handler retains Chrome's user activation
 * far more reliably than opening a blank popup and assigning location later. */
const openPlayer=playerPopup&&!playerPopup.closed?playerPopup:null;
const speed=speedFromPlayerWindow(openPlayer)||playerPopupSpeed||searchPlaybackSpeed||1;
const playerWindow=window.open(playerWindowUrl(url,speed),PLAYER_WINDOW_NAME,playerWindowFeatures());
if(!playerWindow){flash(btn,"Allow popups to open the video player");return}
playerPopup=playerWindow;
try{playerWindow.focus()}catch{}
markCardActionActive(btn,url,playerActivatedUrls,"Đã xem")
}
async function ensurePlayerVideoPlaying(video,sourceUrl){
if(!video||!video.isConnected||video.__downloadPlayerSource!==sourceUrl)return!1;
const play=async()=>{try{const result=video.play();result&&await result;return!video.paused}catch{return!1}};
return play()
}
function playerWindowShape(){
const video=document.querySelector("#"+PLAYER_OVERLAY_ID+" video");
return video&&video.videoWidth&&video.videoHeight?playerShape(video.videoWidth,video.videoHeight):null
}
/* Popup window opened via window.open() keeps its own title-bar "chrome", so outerWidth/outerHeight !=
 * innerWidth/innerHeight; sizes below are VIEWPORT sizes (the box the <video style="width:100vw;
 * height:100vh;object-fit:contain"> renders into).  Runs once per page load, right after metadata resolves:
 *  - maximised / fullscreen window: never touched (the same window is reused for the next video);
 *  - otherwise the size the user last gave this video shape (portrait / square / landscape), else an
 *    automatic fit to the video's aspect ratio.  A window the user resized keeps that size for the next
 *    video of the same shape; the size/position/maximised state are saved while the window is open
 *    (trackPlayerBounds) and reused after the browser is restarted. */
function fitVideoPlayerWindow(video){
try{
const vw=video.videoWidth,vh=video.videoHeight;
if(!vw||!vh)return;
if(deferFitForPlacement(video))return;
trackPlayerBounds(window,"win",playerWindowShape);
window.__downloadBoundsHold=Date.now()+1500;
if(playerWindowIsFilled(window))return;
const scr=window.screen||{},availW=scr.availWidth||1280,availH=scr.availHeight||800,availL=scr.availLeft||0,availT=scr.availTop||0;
if(savedPlayerBounds("win").max===!0){window.moveTo(availL,availT);window.resizeTo(availW,availH);return}
const chromeW=Math.max(0,window.outerWidth-window.innerWidth),chromeH=Math.max(0,window.outerHeight-window.innerHeight);
let size=savedPlayerSize("win",playerShape(vw,vh));
if(!size){
const maxOuterW=Math.min(availW-40,760),maxOuterH=Math.min(availH-60,900);
let h=Math.min(820,maxOuterH-chromeH),w=h*(vw/vh);
if(w>maxOuterW-chromeW){w=maxOuterW-chromeW;h=w*(vh/vw)}
size={w:Math.max(220,Math.round(w)),h:Math.max(160,Math.round(h))}
}
const tw=Math.round(Math.min(size.w,availW-chromeW)),th=Math.round(Math.min(size.h,availH-chromeH));
if(Math.abs(window.innerWidth-tw)<=3&&Math.abs(window.innerHeight-th)<=3)return;
const ow=tw+chromeW,oh=th+chromeH;
window.resizeTo(ow,oh);
let x=window.screenX,y=window.screenY;
if(x+ow>availL+availW)x=Math.max(availL,availL+availW-ow);
if(y+oh>availT+availH)y=Math.max(availT,availT+availH-oh);
if(x!==window.screenX||y!==window.screenY)window.moveTo(x,y)
}catch{}
}
/* A new player window has no prefetched stream, so one failed metadata request must not close it: retry once. */
function streamForWithRetry(url){
return streamFor(url).catch(()=>new Promise(resolve=>setTimeout(resolve,700)).then(()=>streamFor(url)))
}
async function openVideoPlayerStream(url,startPaused){
try{
const data=await streamForWithRetry(url),overlay=getVideoPlayer(),video=overlay.querySelector("video");
if(!video)throw new Error("player_unavailable");
try{video.pause()}catch{}
video.__downloadPlayerSource=url;video.__downloadPlayerMeta={thumb:data.coverUrl,title:data.title};refreshPlayerSelectButtons();applyGlobalVolumeBalance(video);
/* Prefer audible playback. If Chrome rejects autoplay, leave the video
 * paused rather than silently forcing muted playback. */
try{video.muted=!1}catch{}
try{video.autoplay=startPaused!==!0}catch{}
video.src=data.videoUrl;if(data.coverUrl)video.poster=data.coverUrl;else video.removeAttribute("poster");
try{video.playbackRate=searchPlaybackSpeed||1}catch{}
bindSearchSpeed(video);try{video.load()}catch{}
await waitForMetadata(video,3000);forceSearchSpeed(video);await playerBoundsReady(800);fitVideoPlayerWindow(video);
if(startPaused===!0){try{video.pause()}catch{}}
else if(!await ensurePlayerVideoPlaying(video,url)){
const retry=()=>{ensurePlayerVideoPlaying(video,url)};
video.addEventListener("canplay",retry,{once:!0});setTimeout(retry,450)
}
return!0
}catch{closeVideoPlayer();return!1}
}
function launchRequestedPlayer(){
if(playerRequestStarted)return;
const url=requestedPlayerUrl();if(!url)return;
playerRequestStarted=!0;
const requestedSpeed=requestedPlayerSpeed();if(requestedSpeed!==null)chooseSpeed(requestedSpeed);
try{document.documentElement.style.background="#000"}catch{}
openVideoPlayerStream(url)
}
if(requestedPlayerUrl()){
try{document.documentElement.style.background="#000"}catch{}
window.addEventListener("__DOWNLOAD_PLAYER_BRIDGE_READY__",launchRequestedPlayer,{once:!0});
setTimeout(launchRequestedPlayer,2500)
}

function getWarmVideo(){
if(warmVideo)return warmVideo;
warmVideo=document.createElement("video");prepareCorsVideo(warmVideo);warmVideo.__downloadSearchPipMedia=!0;warmVideo.preload="metadata";warmVideo.playsInline=!0;warmVideo.style.cssText="position:fixed!important;left:-10000px!important;top:-10000px!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important";applyGlobalVolumeBalance(warmVideo);
return warmVideo
}
function mountWarmVideo(video){
if(video.ownerDocument!==document||!video.isConnected)(document.body||document.documentElement).appendChild(video);
return video
}
function warm(url,data){
const video=getWarmVideo();
if(video.__downloadSearchPipUrl===url)return video;
video.pause();video.__downloadSearchPipUrl=url;video.src=data.videoUrl;if(data.coverUrl)video.poster=data.coverUrl;applyGlobalVolumeBalance(video);try{video.load()}catch{}return video
}
async function switchWarmPiP(video,url,data){
if(video.__downloadSearchPipUrl!==url)warm(url,data);
bindSearchSpeed(video);
if(!await waitForMetadata(video,2500))return!1;
forceSearchSpeed(video);
try{await video.play()}catch{}
return document.pictureInPictureElement===video
}
async function prepare(btn){
if(!btn||btn.__downloadPreparing)return;
const url=typeof btn.__downloadGetUrl==="function"&&btn.__downloadGetUrl();
if(!url)return;
btn.__downloadPreparing=!0;
try{const data=await streamFor(url);if(btn.isConnected&&(typeof btn.__downloadGetUrl!=="function"||btn.__downloadGetUrl()===url)){btn.__downloadStream=data;!activeDocumentPipWindow()&&document.pictureInPictureElement!==warmVideo&&warm(url,data);pipActivatedUrls.has(url)?setButtonState(btn,"active","Đã xem"):setButtonState(btn,"","Trình phát nổi")}}catch{}finally{btn.__downloadPreparing=!1}
}
async function openPiP(btn){
if(!btn||busy.has(btn))return;
busy.add(btn);setButtonState(btn,"loading","Preparing Picture-in-Picture…");
try{
const url=typeof btn.__downloadGetUrl==="function"&&btn.__downloadGetUrl();
if(!url){flash(btn,"No playable TikTok video was found");return}
const existingDocumentPip=activeDocumentPipWindow();
if(existingDocumentPip&&warmVideo&&warmVideo.__downloadSearchPipUrl===url){existingDocumentPip.close();markCardActionActive(btn,url,pipActivatedUrls,"Đã xem");return}
/* requestWindow() must run synchronously from this click.  Stream discovery is
 * asynchronous, so requesting it after streamFor() would lose user activation. */
const documentWindowRequest=documentPipSupported&&!existingDocumentPip?requestPipWindow():null;
const data=btn.__downloadStream||await streamFor(url);
if(documentPipSupported){
const opened=await openDocumentPiP(url,data,documentWindowRequest);
if(opened){markCardActionActive(btn,url,pipActivatedUrls,"Đã xem");return}
flash(btn,"Unable to open Picture-in-Picture");return
}
const video=getWarmVideo();
if(document.pictureInPictureElement===video){
if(video.__downloadSearchPipUrl===url){await document.exitPictureInPicture();unlockSearchPiP(video);markCardActionActive(btn,url,pipActivatedUrls,"Đã xem");return}
setButtonState(btn,"loading","Switching Picture-in-Picture video…");
if(await switchWarmPiP(video,url,data)){lockSearchPiP(video);markCardActionActive(btn,url,pipActivatedUrls,"Đã xem");return}
flash(btn,"Unable to switch the Picture-in-Picture video");return
}
if(document.pictureInPictureElement){const previousPiP=document.pictureInPictureElement;await document.exitPictureInPicture();unlockSearchPiP(previousPiP)}
mountWarmVideo(warm(url,data));
const opened=await requestSelectedPiP(video,!0);
if(opened){document.pictureInPictureElement===video?lockSearchPiP(video):unlockSearchPiP(video);markCardActionActive(btn,url,pipActivatedUrls,"Đã xem");return}
if(document.pictureInPictureElement!==video)video.remove();
setButtonState(btn,"ready","Video is ready — click Picture-in-Picture again")
}catch{flash(btn,"Unable to load this TikTok video for Picture-in-Picture")}finally{busy.delete(btn)}
}

/* ===== [Download] Multi-select popup bridge =====
 * The "Video đã chọn" management panel (assets/multi-select.js) runs in the
 * ISOLATED world and has no direct access to the functions above, so it
 * reaches this exact same Document PiP flow through a same-tick CustomEvent
 * instead of re-implementing its own PiP window. This keeps the popup
 * thumbnail's PiP identical to the Search/Explore PiP button: a scrubbable
 * seek bar, custom transparent controls, and no native-PiP dark hover
 * overlay. The request is handled synchronously up to requestWindow() (no
 * await before it) so the user gesture relayed from the popup's thumbnail
 * click is still valid when Document PiP is requested. */
async function openPiPForUrl(url,notify,startPaused){
    const report=typeof notify==="function"?notify:function(){};
    if(!url){report({state:"error",message:"No playable TikTok video was found"});return}
    try{
        const existingDocumentPip=activeDocumentPipWindow();
        if(existingDocumentPip&&warmVideo&&warmVideo.__downloadSearchPipUrl===url){
            existingDocumentPip.close();
            report({state:"closed"});
            return
        }
        /* requestWindow() must run synchronously from the relayed click (see
         * the comment above openPiP()'s own documentWindowRequest). */
        const documentWindowRequest=documentPipSupported&&!existingDocumentPip?requestPipWindow():null;
        report({state:"loading"});
        const data=await streamFor(url);
        if(documentPipSupported){
            const opened=await openDocumentPiP(url,data,documentWindowRequest,startPaused===!0);
            report(opened?{state:"ok"}:{state:"error",message:"Unable to open Picture-in-Picture"});
            return
        }
        const video=getWarmVideo();
        if(document.pictureInPictureElement===video){
            if(video.__downloadSearchPipUrl===url){
                await document.exitPictureInPicture();
                unlockSearchPiP(video);
                report({state:"closed"});
                return
            }
            if(await switchWarmPiP(video,url,data)){
                lockSearchPiP(video);
                report({state:"ok"});
                return
            }
            report({state:"error",message:"Unable to switch the Picture-in-Picture video"});
            return
        }
        if(document.pictureInPictureElement){
            const previousPiP=document.pictureInPictureElement;
            await document.exitPictureInPicture();
            unlockSearchPiP(previousPiP)
        }
        mountWarmVideo(warm(url,data));
        const opened=await requestSelectedPiP(video,!0);
        if(opened){
            document.pictureInPictureElement===video?lockSearchPiP(video):unlockSearchPiP(video);
            report({state:"ok"});
            return
        }
        if(document.pictureInPictureElement!==video)video.remove();
        report({state:"error",message:"Video is ready — click again"})
    }catch{
        report({state:"error",message:"Unable to load this TikTok video for Picture-in-Picture"})
    }
}
window.addEventListener("__DOWNLOAD_MULTISELECT_PIP_REQUEST__",function(event){
    const detail=event&&event.detail;
    const url=detail&&typeof detail.url==="string"?detail.url:"";
    const requestId=detail&&typeof detail.requestId==="string"?detail.requestId:"";
    openPiPForUrl(url,function(result){
        try{
            window.dispatchEvent(new CustomEvent("__DOWNLOAD_MULTISELECT_PIP_RESPONSE__",{detail:Object.assign({requestId:requestId},result)}))
        }catch{}
    })
});
/* ===== [/Download] Multi-select popup bridge ===== */

/* ===== [Download] Hover preview =====
 * Hovering a search/explore card (the same cards that get the PiP / player /
 * download / speed buttons) plays a preview of that video on top of its
 * thumbnail; leaving the card stops it and the thumbnail shows again.
 * A speaker button at the bottom-right of the thumbnail switches the sound
 * on/off.  The choice is kept in localStorage and used by every later preview
 * (muted by default).
 * The stream comes from streamFor() - the same GET_TIKTOK_METADATA bridge the
 * PiP button uses - and its request starts the moment the pointer enters the
 * card (a stream already fetched for that card plays at once).
 * The preview plays at the tab's playback speed (the card's speed button, e.g.
 * 2.1x) and follows it live when the speed is changed.
 * The <video> lives in a closed shadow root so the page-wide
 * document.querySelectorAll("video") scans (playback-speed sync, auto-PiP,
 * the injected download badge, attachForVideo) never see it. */
const HOVER_PREVIEW_CLASS="__download_hover_preview",HOVER_MUTE_CLASS="__download_hover_mute_btn",HOVER_MUTE_STORAGE_KEY="__download_hover_preview_muted_v1";
let hoverMuted=!0,hoverState=null;
/* ===== [Download] Hover preview prefetch =====
 * The first hover on a card pays for two network round trips before any sound can start: the server metadata request
 * (streamFor) and the first bytes of the mp4.  The Picture-in-Picture / player-window buttons only feel instant because
 * hovering the card has already paid for both.  While the hover preview setting is on, a slow background loop does the
 * same for the cards that are on screen: one card per HOVER_PREFETCH_GAP (this also respects the 1 request/second limit
 * of the free API), nearest to the pointer first.  Its stream is requested and the mp4 starts buffering in a pooled,
 * hidden <video> that lives in a closed shadow root, so the page-wide video scans never see it.  startHoverPreview()
 * then takes that already buffered <video> instead of creating a new one, so picture and sound start together.
 * Set HOVER_PREFETCH_ENABLED to false to switch the whole thing off. */
const HOVER_PREFETCH_ENABLED=!0,HOVER_PREFETCH_MAX=6,HOVER_PREFETCH_GAP=1300;
const hoverWarm=new Map(),hoverPrefetchSeen=new Set(),hoverPointer={x:-1,y:-1};
let hoverWarmHost=null,hoverWarmMount=null,hoverPrefetchTimer=0,hoverPrefetchBusy=!1;
function getHoverWarmMount(){
if(hoverWarmHost&&hoverWarmHost.isConnected&&hoverWarmMount)return hoverWarmMount;
const host=document.createElement("div");
host.style.cssText="position:fixed!important;left:-10000px!important;top:-10000px!important;width:1px!important;height:1px!important;overflow:hidden!important;opacity:0!important;pointer-events:none!important";
let mount=host;try{mount=host.attachShadow({mode:"closed"})}catch{}
(document.body||document.documentElement).appendChild(host);
hoverWarmHost=host;hoverWarmMount=mount;
return mount
}
function dropHoverWarm(url){
const entry=hoverWarm.get(url);
if(!entry)return;
hoverWarm.delete(url);
const video=entry.video;
try{video.pause();video.removeAttribute("src");video.load()}catch{}
try{video.remove()}catch{}
}
/* Hands the buffered <video> of this card over to the preview (the pool forgets it). */
function takeHoverWarm(url){
const entry=hoverWarm.get(url);
if(!entry)return null;
hoverWarm.delete(url);
const video=entry.video;
if(video.error||!video.getAttribute("src")){try{video.removeAttribute("src");video.load()}catch{}try{video.remove()}catch{}return null}
return video
}
function warmHoverVideo(url,data){
if(hoverWarm.has(url))return;
while(hoverWarm.size>=HOVER_PREFETCH_MAX)dropHoverWarm(hoverWarm.keys().next().value);
const video=document.createElement("video");
prepareCorsVideo(video);
video.muted=!0;video.loop=!0;video.playsInline=!0;video.preload="auto";video.disablePictureInPicture=!0;
video.style.cssText="display:block!important;width:100%!important;height:100%!important;object-fit:cover!important;background:#000!important";
video.addEventListener("error",()=>{const entry=hoverWarm.get(url);if(entry&&entry.video===video)dropHoverWarm(url)});
hoverWarm.set(url,{video});
getHoverWarmMount().appendChild(video);
video.src=data.videoUrl;
try{video.load()}catch{}
}
/* Cards on screen that have a stream URL and are not warmed / hovered / tried yet, nearest to the pointer first. */
function hoverCardsInView(){
const out=[];
try{
document.querySelectorAll("."+PLAYER_BUTTON_CLASS).forEach(btn=>{
const host=btn.parentElement;
if(!host||!host.isConnected)return;
const r=host.getBoundingClientRect();
if(r.width<60||r.height<60||r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth)return;
let url="";try{url=typeof btn.__downloadGetUrl==="function"&&btn.__downloadGetUrl()||""}catch{}
if(!url||hoverWarm.has(url)||hoverPrefetchSeen.has(url))return;
const dx=r.left+r.width/2-hoverPointer.x,dy=r.top+r.height/2-hoverPointer.y;
out.push({url,d:hoverPointer.x<0?r.top*1e4+r.left:dx*dx+dy*dy})
})
}catch{}
out.sort((a,b)=>a.d-b.d);
return out
}
async function hoverPrefetchTick(){
if(hoverPrefetchBusy||!hoverPreviewEnabled||hoverState||document.hidden||!isSearchPage()||isDedicatedPlayerWindow()||hoverWarm.size>=HOVER_PREFETCH_MAX)return;
hoverPrefetchBusy=!0;
try{
const next=hoverCardsInView()[0];
if(!next)return;
if(hoverPrefetchSeen.size>600)hoverPrefetchSeen.clear();
hoverPrefetchSeen.add(next.url);
const data=await streamFor(next.url);
if(hoverPreviewEnabled&&!hoverState)warmHoverVideo(next.url,data)
}catch{}finally{hoverPrefetchBusy=!1}
}
function startHoverPrefetch(){
if(!HOVER_PREFETCH_ENABLED||hoverPrefetchTimer)return;
hoverPrefetchTimer=setInterval(hoverPrefetchTick,HOVER_PREFETCH_GAP)
}
function stopHoverPrefetch(){
clearInterval(hoverPrefetchTimer);hoverPrefetchTimer=0;
while(hoverWarm.size)dropHoverWarm(hoverWarm.keys().next().value);
hoverPrefetchSeen.clear()
}
function readHoverMuted(){
try{const saved=localStorage.getItem(HOVER_MUTE_STORAGE_KEY);if(saved==="0")hoverMuted=!1;else if(saved==="1")hoverMuted=!0}catch{}
return hoverMuted
}
function saveHoverMuted(muted){
hoverMuted=!!muted;
try{localStorage.setItem(HOVER_MUTE_STORAGE_KEY,hoverMuted?"1":"0")}catch{}
}
/* The card under the pointer: the nearest ancestor that attach() gave a player button. */
function hoverCardFor(target){
let el=target&&target.nodeType===1?target:null,hops=0;
while(el&&el!==document.documentElement&&hops++<14){
const marker=Array.prototype.find.call(el.children,child=>child.classList&&child.classList.contains(PLAYER_BUTTON_CLASS));
if(marker){let url="";try{url=typeof marker.__downloadGetUrl==="function"&&marker.__downloadGetUrl()||""}catch{}return url?{host:el,url}:null}
el=el.parentElement
}
return null
}
/* Box of the thumbnail image inside the card, relative to the card, so the preview covers only the thumbnail. */
function hoverMediaBox(host){
let best=null,bestArea=0;
try{host.querySelectorAll("img,picture,canvas,video,[style*='background']").forEach(el=>{
if(el.closest("button,[role='checkbox'],."+HOVER_PREVIEW_CLASS))return;
const r=el.getBoundingClientRect(),area=r.width*r.height;
if(area>bestArea){bestArea=area;best=el}
})}catch{}
const hostRect=host.getBoundingClientRect();
if(!best)return{left:0,top:0,width:hostRect.width,height:hostRect.height,radius:""};
const r=best.getBoundingClientRect();let radius="";
try{radius=getComputedStyle(best).borderRadius||""}catch{}
return{left:r.left-hostRect.left-(host.clientLeft||0),top:r.top-hostRect.top-(host.clientTop||0),width:r.width,height:r.height,radius}
}
function hoverVolumeIcon(muted){
return'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z"/>'+(muted?'<line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/>':'<path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>')+"</svg>"
}
function renderHoverMuteButton(state){
const btn=state&&state.button,video=state&&state.video;
if(!btn||!video)return;
const muted=video.muted,label=muted?"Bật tiếng xem trước":"Tắt tiếng xem trước";
btn.innerHTML=hoverVolumeIcon(muted);btn.title=label;btn.setAttribute("aria-label",label)
}
function toggleHoverMute(state){
const video=state&&state.video;
if(!video)return;
const muted=!video.muted;
video.muted=muted;saveHoverMuted(muted);
if(video.paused)video.play().catch(()=>{});
renderHoverMuteButton(state)
}
function makeHoverMuteButton(state,box){
const btn=document.createElement("button");
btn.type="button";btn.className=HOVER_MUTE_CLASS;
const left=Math.max(0,Math.round(box.left+box.width-40)),top=Math.max(0,Math.round(box.top+box.height-40));
btn.style.cssText="position:absolute!important;left:"+left+"px!important;top:"+top+"px!important;width:32px!important;height:32px!important;padding:0!important;border:1px solid rgba(255,255,255,.42)!important;border-radius:50%!important;background:rgba(0,0,0,.62)!important;color:#fff!important;display:flex!important;align-items:center!important;justify-content:center!important;cursor:pointer!important;z-index:2147483645!important;box-shadow:0 2px 10px rgba(0,0,0,.42)!important;pointer-events:auto!important";
for(const type of["pointerdown","mousedown","touchstart"])btn.addEventListener(type,stopCardEvent,!0);
btn.addEventListener("click",event=>{stopCardEvent(event);toggleHoverMute(state)},!0);
return btn
}
function stopHoverPreview(){
const state=hoverState;hoverState=null;
if(!state)return;
clearInterval(state.watch);
const video=state.video;
if(video){try{video.pause();video.removeAttribute("src");video.load()}catch{}}
if(state.wrap)state.wrap.remove();
if(state.button)state.button.remove()
}
async function startHoverPreview(state){
if(hoverState!==state)return;
let data;
try{data=await streamFor(state.url)}catch{
/* With no dwell, sweeping across the grid can fire several metadata requests at once and
 * the free API may refuse one: retry once if this card is still the hovered one. */
if(hoverState!==state)return;
await new Promise(resolve=>setTimeout(resolve,1200));
if(hoverState!==state)return;
try{data=await streamFor(state.url)}catch{return}
}
const host=state.host;
if(hoverState!==state||!host.isConnected)return;
/* TikTok is already playing its own preview in this card: do not stack a second one on top. */
if(Array.prototype.some.call(host.querySelectorAll("video"),video=>!video.paused&&video.readyState>=2))return;
const box=hoverMediaBox(host);
if(!(box.width>=60&&box.height>=60))return;
const wrap=document.createElement("div");
wrap.className=HOVER_PREVIEW_CLASS;
wrap.style.cssText="position:absolute!important;left:"+Math.round(box.left)+"px!important;top:"+Math.round(box.top)+"px!important;width:"+Math.round(box.width)+"px!important;height:"+Math.round(box.height)+"px!important;overflow:hidden!important;"+(box.radius?"border-radius:"+box.radius+"!important;":"")+"background:#000!important;pointer-events:none!important;z-index:1!important;opacity:0;transition:opacity .15s ease";
const warmed=takeHoverWarm(state.url),video=warmed||document.createElement("video");
prepareCorsVideo(video);
video.muted=readHoverMuted();video.loop=!0;video.playsInline=!0;video.preload="auto";video.disablePictureInPicture=!0;applyGlobalVolumeBalance(video);
/* Same speed as the card's speed button (load() resets playbackRate to the default, so set both). */
const speed=searchPlaybackSpeed||1;video.defaultPlaybackRate=speed;video.playbackRate=speed;bindSearchSpeed(video);
video.style.cssText="display:block!important;width:100%!important;height:100%!important;object-fit:cover!important;background:#000!important";
let mount=wrap;try{mount=wrap.attachShadow({mode:"closed"})}catch{}
mount.appendChild(video);
state.wrap=wrap;state.video=video;
video.addEventListener("playing",()=>{
if(hoverState!==state)return;
wrap.style.opacity="1";
if(!state.button){state.button=makeHoverMuteButton(state,box);host.appendChild(state.button)}
renderHoverMuteButton(state)
},{once:!0});
video.addEventListener("error",()=>{streamCache.delete(state.url);if(hoverState===state)stopHoverPreview()});
host.appendChild(wrap);
/* A pooled video is already loading this stream: assigning src again would restart it. */
if(!warmed||video.getAttribute("src")!==data.videoUrl)video.src=data.videoUrl;
try{await video.play()}catch{
if(hoverState!==state)return;
if(!video.muted){
/* The browser refuses unmuted autoplay until the page has had a user gesture:
 * fall back to muted playback; clicking the speaker button then restores sound. */
video.muted=!0;
try{await video.play()}catch{}
renderHoverMuteButton(state)
}
}
}
function scheduleHoverPreview(card){
stopHoverPreview();
hoverPrefetchSeen.add(card.url);
const state={host:card.host,url:card.url,watch:0,video:null,wrap:null,button:null};
hoverState=state;
startHoverPreview(state).catch(()=>{});
/* Safety net for cases that fire no mouse event (scrolling under a still pointer, route change, hidden tab, card re-rendered). */
state.watch=setInterval(()=>{
if(hoverState!==state)return;
let hovered=!1;
try{hovered=state.host.isConnected&&state.host.matches(":hover")}catch{}
if(!hovered||document.hidden||!isSearchPage())stopHoverPreview()
},600)
}
/* "Preview khi rê chuột vào video" (popup.html).  Off by default: while it is off the mouseover listener below is not
 * registered at all, so hovering a video does nothing.  The value is relayed by tiktok-loader.js (ISOLATED world) at
 * startup and on every change, so toggling it in the popup takes effect at once; turning it off also stops a preview
 * that is playing.  Asked for once here in case the loader sent its first value before this script was running. */
let hoverPreviewEnabled=!1;
function onHoverPreviewMouseOver(event){
hoverPointer.x=event.clientX;hoverPointer.y=event.clientY;
if(!isSearchPage()||isDedicatedPlayerWindow()){if(hoverState)stopHoverPreview();return}
const target=event.target;
if(hoverState&&target&&hoverState.host.contains(target))return;
const card=hoverCardFor(target);
if(!card){if(hoverState)stopHoverPreview();return}
scheduleHoverPreview(card)
}
function applyHoverPreviewSetting(enabled){
enabled=enabled===!0;
if(enabled===hoverPreviewEnabled)return;
hoverPreviewEnabled=enabled;
if(enabled){document.addEventListener("mouseover",onHoverPreviewMouseOver,!0);startHoverPrefetch()}
else{document.removeEventListener("mouseover",onHoverPreviewMouseOver,!0);stopHoverPreview();stopHoverPrefetch()}
}
window.addEventListener("__DOWNLOAD_HOVER_PREVIEW__",event=>applyHoverPreviewSetting(!!(event&&event.detail&&event.detail.enabled===!0)));
try{window.dispatchEvent(new CustomEvent("__DOWNLOAD_HOVER_PREVIEW_REQUEST__"))}catch{}
window.addEventListener("mouseout",event=>{if(!event.relatedTarget)stopHoverPreview()},!0);
document.addEventListener("click",event=>{
if(!hoverState)return;
const target=event.target;
if(target&&target.closest&&target.closest("button"))return;
stopHoverPreview()
},!0);
document.addEventListener("visibilitychange",()=>{if(document.hidden)stopHoverPreview()});
/* ===== [/Download] Hover preview ===== */

scanAll();
wasSearchPage=isSearchPage();
if(searchPlaybackSpeed!==null)syncSearchSpeed();
const root=document.documentElement;
if(root)try{new MutationObserver(records=>{for(const record of records){if(record.type==="attributes")queueScan(record.target);else record.addedNodes.forEach(queueScan)}}).observe(root,{childList:!0,subtree:!0,attributes:!0,attributeFilter:["href","src"]})}catch{}
setTimeout(scanAll,800);setTimeout(scanAll,2000);
setInterval(()=>{if(location.href===lastHref)return;lastHref=location.href;const nowSearchPage=isSearchPage();if(wasSearchPage&&!nowSearchPage&&searchPlaybackSpeed!==null)try{window.dispatchEvent(new CustomEvent("__download_settings__",{detail:{playbackSpeed:basePlaybackSpeed}}))}catch{}if(!wasSearchPage&&nowSearchPage&&searchPlaybackSpeed!==null)setTimeout(syncSearchSpeed,0);wasSearchPage=nowSearchPage;closeSpeedMenus();closeVideoPlayer();document.querySelectorAll("."+PIP_BUTTON_CLASS+",."+PLAYER_BUTTON_CLASS+",."+DOWNLOAD_BUTTON_CLASS+",."+SPEED_BUTTON_CLASS).forEach(button=>button.remove());setTimeout(scanAll,250)},750)
})();
/* ===== [/Download] Search-result PiP + player + download + speed ===== */

})();
})()

/* ===== [Download] Global volume balance =====
 * The native video.volume property alone cannot equalize clips whose source
 * audio is already loud or quiet. Each playing video is therefore measured
 * through a side-chain Web Audio analyser (K-weighted, silence/pause gated and
 * integrated over the whole clip, not a single instantaneous sample) and gets
 * a per-clip gain that pulls its loudness toward TARGET_DB. The popup's 0-200
 * setting multiplies that gain: 100 = every clip sits at TARGET_DB, 200 = twice
 * as loud.
 * Measuring needs video.captureStream(), which Chrome only allows for CORS-clean
 * media - see prepareCorsVideo() and the header rule in background.js.
 * How the gain is applied depends on the video:
 *  - The extension's own videos (hover preview, search PiP, player window; they
 *    carry __downloadCorsReady) that captureStream() accepted are CORS-clean, so
 *    routing them through MediaElementAudioSourceNode cannot silence them. They
 *    play through source -> gain -> limiter -> destination, and the gain may
 *    exceed 100%: quiet clips really are raised to the target, so all clips end
 *    up at about the same loudness. The route is permanent for that element (Web
 *    Audio cannot undo it); with the feature off the gain simply stays at 1.
 *  - Every other video (TikTok's own feed player, a video inside the Document
 *    PiP window, media that is not CORS-clean) keeps its playback route and is
 *    controlled through video.volume only. The native volume cannot exceed
 *    100%, so there the gain can only lower loud clips; a clip already quieter
 *    than the target cannot be raised.
 */
;(function () {
  'use strict';

  if (window.__DOWNLOAD_VOLUME_BALANCE_HOOK__) return;
  window.__DOWNLOAD_VOLUME_BALANCE_HOOK__ = true;

  const EVENT_NAME = '__DOWNLOAD_VOLUME_BALANCE__';
  const REQUEST_EVENT = '__DOWNLOAD_VOLUME_BALANCE_REQUEST__';
  const SYNC_EVENT = '__DOWNLOAD_VOLUME_BALANCE_SYNC__';
  const MIN_LEVEL = 0;
  const MAX_LEVEL = 200;
  const DEFAULT_LEVEL = 100;
  // Loudness every clip is pulled toward at 100% (K-weighted RMS, dBFS). Higher
  // = louder overall but quiet clips fall short of it (native volume cannot
  // exceed 100%); lower = more clips can reach it but everything is quieter.
  const TARGET_DB = -20;
  const MIN_GAIN_DB = -26;
  const MAX_GAIN_DB = 18;
  // A clip that has not been measured yet starts at most this far below full
  // volume, so a loud clip never blasts while its loudness is being measured.
  const START_GAIN_DB = -6;
  const ABS_GATE_DB = -60;
  const REL_GATE_DB = 10;
  const BLOCK_POLLS = 4;
  const MIN_BLOCKS = 5;
  const ATTACK_DB = 4;
  const RELEASE_DB = 1.2;
  const SAMPLE_INTERVAL_MS = 90;
  const FFT_SIZE = 4096;
  const HIST_MIN_DB = -90;
  const HIST_BINS = 91;
  const CACHE_LIMIT = 400;
  const observedVideos = new WeakSet();
  const trackedVideos = new Set();
  const analysisChains = new WeakMap();
  const originalLevels = new WeakMap();
  const balanceMuted = new WeakSet();
  // video -> { video, context, source, gain, limiter }: the permanent Web Audio output route.
  const outputRoutes = new WeakMap();
  // clip key -> integrated loudness, so a clip that is seen again (loop, scroll
  // back, replay in the player) starts at the right level immediately.
  const loudnessCache = new Map();
  let lastGainDb = START_GAIN_DB;
  let warnedReason = '';
  let audioContext = null;
  let settings = { enabled: false, level: DEFAULT_LEVEL };

  function cleanSettings(raw) {
    const value = raw && typeof raw === 'object' ? raw : {};
    const level = Math.round(Number(value.level));
    return {
      enabled: value.enabled === true,
      level: Number.isFinite(level) ? Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, level)) : DEFAULT_LEVEL,
    };
  }

  function masterLevel() {
    return settings.level / 100;
  }

  function rememberOriginalLevel(video) {
    if (!originalLevels.has(video)) {
      originalLevels.set(video, { volume: Number(video.volume), muted: video.muted === true });
    }
  }

  function setNativeVolume(video, level) {
    const target = Math.max(0, Math.min(1, Number(level) || 0));
    try {
      if (Math.abs(Number(video.volume) - target) > .001) video.volume = target;
      // A volume feature must not turn a muted autoplay preview into an
      // unmuted autoplay attempt. It only mutes at zero, then restores mute
      // state if this feature was the component that muted the video.
      if (target === 0 && !video.muted) {
        balanceMuted.add(video);
        video.muted = true;
      } else if (target > 0 && balanceMuted.has(video)) {
        balanceMuted.delete(video);
        video.muted = false;
      }
    } catch {}
  }

  // Only the extension's own, CORS-clean videos in this document are ever routed.
  function wantsRoute(video) {
    return !!video
      && video.__downloadCorsReady === true
      && !video.__downloadCorsOff
      && !video.__downloadRouteFailed
      && video.ownerDocument === document;
  }

  // Gain of a routed video. video.volume is pinned to 1 (this feature owns the
  // level) and the mute state is applied here, so a muted preview stays silent
  // whether or not Chrome also applies it before the Web Audio node.
  function setRoutedGain(route, level) {
    const video = route.video;
    try { if (Number(video.volume) !== 1) video.volume = 1; } catch {}
    const target = video.muted ? 0 : Math.max(0, Number(level) || 0);
    try {
      const param = route.gain.gain;
      const now = route.context.currentTime;
      param.cancelScheduledValues(now);
      param.setTargetAtTime(target, now, .03);
    } catch {}
  }

  function setOutputLevel(video, level) {
    const route = outputRoutes.get(video);
    if (route) setRoutedGain(route, level);
    else setNativeVolume(video, level);
  }

  function createOutputRoute(video, context) {
    try {
      const source = context.createMediaElementSource(video);
      const gain = context.createGain();
      // Brick-wall-ish limiter: boosted quiet clips must not clip on loud peaks.
      const limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -2;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = .002;
      limiter.release.value = .12;
      gain.gain.value = Math.min(1, masterLevel() * dbToGain(startGainDb(video)));
      source.connect(gain);
      gain.connect(limiter);
      limiter.connect(context.destination);
      const route = { video, context, source, gain, limiter };
      outputRoutes.set(video, route);
      return route;
    } catch (error) {
      video.__downloadRouteFailed = true;
      noteAnalysisFailure(video, error);
      return null;
    }
  }

  function getAudioContext() {
    if (audioContext) return audioContext;
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return null;
    try {
      audioContext = new Context();
      return audioContext;
    } catch {
      return null;
    }
  }

  function resumeAudioContext(context) {
    if (!context || context.state === 'running') return;
    try {
      const resumed = context.resume();
      if (resumed && resumed.catch) resumed.catch(() => {});
    } catch {}
  }

  function dbToGain(db) {
    return Math.pow(10, db / 20);
  }

  function gainDbFor(loudnessDb) {
    return Math.max(MIN_GAIN_DB, Math.min(MAX_GAIN_DB, TARGET_DB - loudnessDb));
  }

  function clipKey(video) {
    const src = (video && (video.currentSrc || video.src)) || '';
    if (!src || src.indexOf('blob:') === 0) return src;
    try {
      const url = new URL(src, location.href);
      return url.origin + url.pathname;
    } catch {
      return src;
    }
  }

  function rememberLoudness(key, db) {
    if (!key) return;
    loudnessCache.delete(key);
    loudnessCache.set(key, db);
    if (loudnessCache.size > CACHE_LIMIT) loudnessCache.delete(loudnessCache.keys().next().value);
  }

  function startGainDb(video) {
    const known = loudnessCache.get(clipKey(video));
    return known === undefined ? Math.min(lastGainDb, START_GAIN_DB) : gainDbFor(known);
  }

  // Integrated loudness, EBU R128 style: ~400 ms blocks, absolute gate against
  // silence, relative gate against pauses, energy-mean of what remains.
  function createEstimator() {
    return {
      ring: [],
      counts: new Float64Array(HIST_BINS),
      sums: new Float64Array(HIST_BINS),
      total: 0,
    };
  }

  function pushBlock(est, power) {
    est.ring.push(power);
    if (est.ring.length > BLOCK_POLLS) est.ring.shift();
    if (est.ring.length < BLOCK_POLLS) return;
    let mean = 0;
    for (let index = 0; index < est.ring.length; index += 1) mean += est.ring[index];
    mean /= est.ring.length;
    if (!(mean > 0)) return;
    const db = 10 * Math.log10(mean);
    if (db < ABS_GATE_DB) return;
    const bin = Math.max(0, Math.min(HIST_BINS - 1, Math.floor(db - HIST_MIN_DB)));
    est.counts[bin] += 1;
    est.sums[bin] += mean;
    est.total += 1;
  }

  function integratedLoudness(est) {
    if (est.total < MIN_BLOCKS) return null;
    let count = 0;
    let sum = 0;
    for (let index = 0; index < HIST_BINS; index += 1) {
      count += est.counts[index];
      sum += est.sums[index];
    }
    const gate = 10 * Math.log10(sum / count) - REL_GATE_DB;
    let keptCount = 0;
    let keptSum = 0;
    for (let index = 0; index < HIST_BINS; index += 1) {
      if (est.counts[index] && index + HIST_MIN_DB + 1 > gate) {
        keptCount += est.counts[index];
        keptSum += est.sums[index];
      }
    }
    return keptCount ? 10 * Math.log10(keptSum / keptCount) : null;
  }

  function stopSampler(chain) {
    if (!chain || !chain.timer) return;
    clearInterval(chain.timer);
    chain.timer = 0;
  }

  function chainIsStale(chain) {
    // The same <video> element is reused for other clips (player, search PiP):
    // its capture track ends and the measured history no longer applies.
    if (chain.track && chain.track.readyState === 'ended') return true;
    const key = clipKey(chain.video);
    return !!key && key !== chain.key;
  }

  function applyChainVolume(chain) {
    setOutputLevel(chain.video, masterLevel() * dbToGain(chain.gainDb));
  }

  function sampleLoudness(chain) {
    const video = chain.video;
    if (!settings.enabled || !video || video.paused || video.ended) return;
    try {
      if (chainIsStale(chain)) {
        applyVolume(video, true);
        return;
      }
      // A context created before any user gesture stays suspended (and the
      // analyser reads only zeros) until it is resumed again.
      if (chain.context.state !== 'running') resumeAudioContext(chain.context);
      // The context was not running when this chain was built, so the video
      // stayed on its native volume. Rebuild the chain through the output route
      // as soon as the context runs.
      if (!chain.route && wantsRoute(video) && chain.context.state === 'running') {
        disposeChain(video);
        applyVolume(video, true);
        return;
      }
      chain.analyser.getFloatTimeDomainData(chain.samples);
      let sum = 0;
      for (let index = 0; index < chain.samples.length; index += 1) {
        const sample = chain.samples[index];
        sum += sample * sample;
      }
      pushBlock(chain.estimator, sum / chain.samples.length);
      const loudness = integratedLoudness(chain.estimator);
      if (loudness !== null && Number.isFinite(loudness)) {
        chain.loudness = loudness;
        const diff = gainDbFor(loudness) - chain.gainDb;
        // Pull loud clips down promptly; bring quiet clips back up slowly so
        // the level does not pump.
        if (!chain.measuredOnce) {
          // First measurement of this clip: jump straight to the target instead of crawling up
          // from the cautious start level at RELEASE_DB per poll (that took seconds on a new clip).
          chain.measuredOnce = true;
          chain.gainDb = gainDbFor(loudness);
        } else {
          chain.gainDb += diff < 0 ? Math.max(diff, -ATTACK_DB) : Math.min(diff, RELEASE_DB);
        }
        lastGainDb = chain.gainDb;
        rememberLoudness(chain.key, loudness);
      }
      applyChainVolume(chain);
    } catch {}
  }

  function startSampler(chain) {
    if (!chain || chain.timer || !settings.enabled) return;
    sampleLoudness(chain);
    chain.timer = setInterval(() => sampleLoudness(chain), SAMPLE_INTERVAL_MS);
  }

  function noteAnalysisFailure(video, error) {
    const reason = String((error && error.message) || error || 'unknown');
    try { video.__downloadVolumeBalanceError = reason; } catch {}
    if (warnedReason === reason) return;
    warnedReason = reason;
    try { console.warn('[Download] Volume balance cannot analyse this audio:', reason); } catch {}
  }

  function createAnalysisChain(video) {
    if (!video || analysisChains.has(video)) return analysisChains.get(video) || null;
    const context = getAudioContext();
    const capture = video.captureStream || video.mozCaptureStream;
    if (!context || typeof capture !== 'function') return null;
    try {
      // captureStream() throws for media that is not CORS-clean; getting past
      // it also means the media can be routed through Web Audio without going
      // silent.
      const stream = capture.call(video);
      const tracks = stream && stream.getAudioTracks ? stream.getAudioTracks() : [];
      if (tracks.length === 0) return null;
      let route = outputRoutes.get(video) || null;
      if (!route && wantsRoute(video)) {
        resumeAudioContext(context);
        if (context.state === 'running') route = createOutputRoute(video, context);
      }
      // A routed video is measured straight from its source node; the capture
      // stream was only the CORS check.
      const source = route ? route.source : context.createMediaStreamSource(stream);
      if (route) {
        try { stream.getTracks().forEach((track) => track.stop()); } catch {}
      }
      // K-weighting (ITU-R BS.1770): high-shelf + low cut, so bass rumble does
      // not count as loudness the way it would in a plain RMS.
      const shelf = context.createBiquadFilter();
      shelf.type = 'highshelf';
      shelf.frequency.value = 1681;
      shelf.gain.value = 4;
      const lowCut = context.createBiquadFilter();
      lowCut.type = 'highpass';
      lowCut.frequency.value = 38;
      const analyser = context.createAnalyser();
      const silentOutput = context.createGain();
      analyser.fftSize = FFT_SIZE;
      // Deliberately do not connect the analyser to destination: it measures
      // the stream while the video keeps its original, audible output path.
      // A zero-gain destination keeps the analyser graph rendered without
      // adding a second audible copy of the audio.
      silentOutput.gain.value = 0;
      source.connect(shelf);
      shelf.connect(lowCut);
      lowCut.connect(analyser);
      analyser.connect(silentOutput);
      silentOutput.connect(context.destination);
      const chain = {
        video,
        context,
        stream,
        route,
        tapHead: shelf,
        track: route ? null : tracks[0],
        nodes: route ? [shelf, lowCut, analyser, silentOutput] : [source, shelf, lowCut, analyser, silentOutput],
        analyser,
        key: clipKey(video),
        samples: new Float32Array(FFT_SIZE),
        estimator: createEstimator(),
        loudness: null,
        timer: 0,
        gainDb: startGainDb(video),
      };
      analysisChains.set(video, chain);
      try { video.__downloadVolumeBalanceError = ''; } catch {}
      resumeAudioContext(context);
      return chain;
    } catch (error) {
      noteAnalysisFailure(video, error);
      return null;
    }
  }

  function disposeChain(video) {
    const chain = analysisChains.get(video);
    if (!chain) return;
    stopSampler(chain);
    for (const node of chain.nodes) {
      try { node.disconnect(); } catch {}
    }
    if (chain.route) {
      // Only the measuring branch goes; the route to the speakers stays. Until
      // the next clip is measured it plays at a cautious level.
      try { chain.route.source.disconnect(chain.tapHead); } catch {}
      setRoutedGain(chain.route, masterLevel() * dbToGain(Math.min(chain.gainDb, START_GAIN_DB)));
    }
    try { chain.stream.getTracks().forEach((track) => track.stop()); } catch {}
    analysisChains.delete(video);
  }

  function restoreOriginalLevel(video) {
    disposeChain(video);
    const route = outputRoutes.get(video);
    if (route) {
      // The route cannot be removed: pass the audio through at unity gain.
      setRoutedGain(route, 1);
      originalLevels.delete(video);
      return;
    }
    const original = originalLevels.get(video);
    if (!original) return;
    try {
      if (Number.isFinite(original.volume)) video.volume = original.volume;
      video.muted = original.muted;
    } catch {}
    balanceMuted.delete(video);
    originalLevels.delete(video);
  }

  function applyVolume(video, forceSample = false) {
    if (!video || video.tagName !== 'VIDEO') return;
    if (!settings.enabled) {
      restoreOriginalLevel(video);
      return;
    }
    rememberOriginalLevel(video);
    let chain = analysisChains.get(video);
    if (chain && chainIsStale(chain)) {
      disposeChain(video);
      chain = null;
    }
    if (chain) {
      // Master level changes apply at once, also to paused / preloaded videos.
      applyChainVolume(chain);
      if (forceSample) sampleLoudness(chain);
      if (!video.paused) startSampler(chain);
      return;
    }
    // If this audio cannot be analysed at all, behave as before: master level only.
    setOutputLevel(video, Math.min(1, masterLevel() * dbToGain(video.__downloadVolumeBalanceError ? 0 : startGainDb(video))));
    if (!video.paused) {
      chain = createAnalysisChain(video);
      if (chain) {
        sampleLoudness(chain);
        startSampler(chain);
      } else if (video.__downloadVolumeBalanceError) {
        setOutputLevel(video, Math.min(1, masterLevel()));
      }
    }
  }

  function observeVideo(video) {
    if (!video || video.tagName !== 'VIDEO') return;
    // Re-added to the tracked set every time: a video that was detached and
    // attached again (virtualized feed, player moved into a PiP window) must
    // keep receiving settings changes.
    trackedVideos.add(video);
    if (!observedVideos.has(video)) {
      observedVideos.add(video);
      const applyLater = () => {
        // The analyser itself adjusts video.volume several times per second.
        // Do not overwrite that adjustment from its resulting volumechange.
        // A routed video does not: it only needs its mute state re-applied.
        const chain = analysisChains.get(video);
        if (!chain) queueMicrotask(() => applyVolume(video));
        else if (chain.route) queueMicrotask(() => applyChainVolume(chain));
      };
      video.addEventListener('loadedmetadata', applyLater);
      video.addEventListener('canplay', applyLater);
      video.addEventListener('playing', () => queueMicrotask(() => applyVolume(video, true)));
      video.addEventListener('pause', () => stopSampler(analysisChains.get(video)));
      // A new clip in the same element: drop the old measurement. The next
      // 'playing' event measures the new clip from scratch.
      video.addEventListener('loadstart', () => disposeChain(video));
      video.addEventListener('emptied', () => disposeChain(video));
      // TikTok can restore its own saved volume after a route change. Running
      // after the event completes keeps the global setting authoritative while
      // this feature is enabled, without touching volume while it is off.
      video.addEventListener('volumechange', applyLater);
    }
    applyVolume(video);
  }

  function scanVideos(root) {
    if (!root) return;
    if (root.tagName === 'VIDEO') observeVideo(root);
    if (!root.querySelectorAll) return;
    root.querySelectorAll('video').forEach(observeVideo);
  }

  function applyToAllVideos(forceSample = false) {
    scanVideos(document);
    for (const video of trackedVideos) {
      if (!video.isConnected) {
        trackedVideos.delete(video);
        disposeChain(video);
        continue;
      }
      applyVolume(video, forceSample);
    }
  }

  function settingsFromDocument() {
    try {
      const raw = document.documentElement && document.documentElement.getAttribute('data-download-volume-balance');
      return raw ? cleanSettings(JSON.parse(raw)) : null;
    } catch {
      return null;
    }
  }

  function updateSettings(raw) {
    // Prefer the DOM attribute written by the isolated content script. It is a
    // stable bridge across Chrome execution worlds, including separate player
    // windows, while CustomEvent.detail remains a useful fallback.
    settings = settingsFromDocument() || cleanSettings(raw);
    applyToAllVideos(true);
  }

  function startObserver() {
    const root = document.documentElement;
    if (!root) {
      document.addEventListener('DOMContentLoaded', startObserver, { once: true });
      return;
    }
    scanVideos(document);
    try {
      new MutationObserver((records) => {
        for (const record of records) {
          record.addedNodes.forEach(scanVideos);
        }
      }).observe(root, { childList: true, subtree: true });
    } catch {}
  }

  window.addEventListener(EVENT_NAME, (event) => {
    updateSettings(event && event.detail);
  });
  window.addEventListener(SYNC_EVENT, () => updateSettings(null));

  startObserver();
  // Exposed only for this extension's other MAIN-world player code. It binds
  // the event listeners too, so videos in closed Shadow DOM stay synchronized.
  window.__DOWNLOAD_APPLY_VOLUME_BALANCE__ = observeVideo;
  // Console helper: __DOWNLOAD_VOLUME_BALANCE_DEBUG__() lists, per video, the
  // measured loudness, applied gain and whether the analyser is running.
  window.__DOWNLOAD_VOLUME_BALANCE_DEBUG__ = () => Array.from(trackedVideos).map((video) => {
    const chain = analysisChains.get(video);
    return {
      clip: clipKey(video).slice(-48),
      paused: video.paused,
      volume: Math.round(video.volume * 1000) / 1000,
      analysing: !!chain,
      routed: outputRoutes.has(video),
      crossOrigin: video.crossOrigin || '',
      contextState: chain ? chain.context.state : audioContext ? audioContext.state : 'none',
      loudnessDb: chain && chain.loudness !== null ? Math.round(chain.loudness * 10) / 10 : null,
      gainDb: chain ? Math.round(chain.gainDb * 10) / 10 : null,
      error: video.__downloadVolumeBalanceError || '',
    };
  });
  const initialSettings = settingsFromDocument();
  if (initialSettings) updateSettings(initialSettings);
  // The isolated-world loader owns chrome.storage and responds with the saved
  // value. It also broadcasts once it has read storage, covering a late reply.
  try { window.dispatchEvent(new CustomEvent(REQUEST_EVENT)); } catch {}
})();

// ===== [Download] fetch rejection stack scrub =====
// The fetch wrapper on line 1 of this file is on the call stack of every page fetch().
// When TikTok's own request fails at network level (offline, blocked by another extension,
// DNS/VPN/firewall, request cancelled by an SPA navigation) and TikTok's code does not catch
// it, Chrome reports "Uncaught (in promise) TypeError: Failed to fetch" with this file as the
// top stack frame and lists it under this extension's Errors page.
// Here the stack of that one specific rejection is re-captured without any frame from this
// file. The rejection itself (same error object, same type and message) is still delivered
// to the page unchanged; fulfilled responses and all other errors pass through untouched.
(function () {
  if (window.__DOWNLOAD_FETCH_SCRUB__) return;
  window.__DOWNLOAD_FETCH_SCRUB__ = true;
  try {
    const prevFetch = window.fetch;
    if (typeof prevFetch !== "function" || typeof Error.captureStackTrace !== "function") return;
    const scrub = function scrub(err) {
      try {
        if (err instanceof TypeError && /^Failed to fetch$/i.test(String(err.message))) {
          // Omit this function and every caller above it => no frame of this file remains.
          Error.captureStackTrace(err, scrub);
        }
      } catch {}
      throw err;
    };
    window.fetch = function (...args) {
      return prevFetch.apply(this, args).then(undefined, scrub);
    };
  } catch {}
})();
// ===== [/Download] fetch rejection stack scrub =====
