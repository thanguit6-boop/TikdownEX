import{g as tt,D as ot,t as Se}from"./i18n.js";let ye=null,y=ot,Le=location.href,x="idle",S=!1,Ce=()=>{},Y="",H=null,oe="",q=!1;const it=new Map,nt=e=>new Promise(t=>setTimeout(t,e)),l=()=>{};const K="__download_product_card",T="__download_injected_player",Re="__download_play_button",Ee=chrome.runtime.getURL("icons/shop-cart.png"),Ae=["View in app","Watch in app","Mở trong ứng dụng","Xem trong ứng dụng","View in the TikTok app","Open in the TikTok app","View TikTok Shop videos in the TikTok app","View TikTok Shop videos in TikTok app","Xem video TikTok Shop trong ung dung","Xem video TikTok Shop trong ứng dụng","Xem video TikTok Shop trong TikTok app"],Ie=/view in.{0,4}app|watch in.{0,4}app|m[ởơ] trong ứng dụng|xem trong ứng dụng|view\s+tiktok\s+shop\s+videos[\s\S]{0,80}tiktok\s+app|xem\s+video\s+tiktok\s+shop[\s\S]{0,80}(?:tiktok\s+app|ung\s+dung|ứng\s+dụng)/i,ke="__download_blocker_hide_style";function E(){var e;try{return!!((e=chrome==null?void 0:chrome.runtime)!=null&&e.id)}catch{return!1}}const Oe=e=>Se[y.language].content[e];function X(e){return/\/video\/\d+/.test(e)}function V(e){const t=e.match(/\/video\/(\d+)/);return t?t[1]:""}function rt(e){return e.replace(/"/g,"&quot;").replace(/</g,"&lt;")}const Ve=rt;function se(e){var s;const t=e||document,o=Array.from(t.querySelectorAll("video"));if(!o.length)return null;const n=window.innerHeight/2,i=o.filter(c=>!c.closest("#"+T));return i.length&&((s=i.map(c=>{const a=c.getBoundingClientRect(),r=Math.max(0,Math.min(a.bottom,window.innerHeight)-Math.max(a.top,0)),d=Math.max(0,Math.min(a.right,window.innerWidth)-Math.max(a.left,0)),p=r*d,h=Math.abs((a.top+a.bottom)/2-n),u=p===0?2e6:0,k=(c.paused?0:1e6)+(c.readyState>=2?1e5:0)+p-h-u;return{video:c,score:k}}).sort((c,a)=>a.score-c.score)[0])==null?void 0:s.video)||null}function at(e){const t=se(e);if(!t)return!1;const o=t.currentSrc||t.src;return!(!o||o==="about:blank"||t.error||!t.videoWidth||t.videoWidth<50||!t.duration||isNaN(t.duration)||t.duration<2)}function st(){const e=document.querySelectorAll("div, span, button, a, p");for(const t of e){const o=(t.textContent||"").trim();if(!(!o||o.length>220)&&(Ie.test(o)||Ae.some(n=>o.includes(n))))return t}return null}function ct(e){let t=e,o=e;for(let s=0;s<10&&o;s++){const c=getComputedStyle(o).position;if(c==="absolute"||c==="fixed"){t=o;break}o=o.parentElement}const n=t.parentElement;if(!n)return null;const i=n.getBoundingClientRect();return i.width<150||i.height<200?null:{overlay:t,container:n}}function Ne(){if(!document.getElementById(ke)){const t=document.createElement("style");t.id=ke,t.textContent=`
      [class*="RegionBlock"], [class*="ShopBlock"], [class*="ShopVideoBlocker"],
      [class*="DivShopVideoOverlay"], [class*="video-region-block"],
      [data-e2e*="shop-video-blocker"], [data-e2e*="region-block"] {
        display: none !important;
      }
    `,(document.head||document.documentElement).appendChild(t)}const e=st();if(e){const t=ct(e);t?t.overlay.style.setProperty("display","none","important"):e.style.setProperty("display","none","important")}}function ue(e){var h,u;const t=e.getBoundingClientRect();if(t.width<300||t.height<300||t.bottom<=0||t.top>=window.innerHeight||t.right<=0||t.left>=window.innerWidth)return!1;const o=getComputedStyle(e);if(o.display==="none"||o.visibility==="hidden"||Number(o.opacity)===0)return!1;const n=t.left+t.width/2;if(n>window.innerWidth*.95||t.width>window.innerWidth*.9&&t.height>window.innerHeight*.9||e.querySelector('[data-e2e*="comment"], [class*="CommentContainer"], [class*="CommentList"], [class*="EmptyStateWrapper"]'))return!1;const i=((u=(h=e.className)==null?void 0:h.toString)==null?void 0:u.call(h))||"";if(/\bDivVideoContainer\b/.test(i)||/\bDivBasicPlayer\b/.test(i)||/\bDivBrowserModeContainer\b/.test(i)||/\bDivVideoContainerForDetail\b/.test(i)||/\bxgplayer\b/.test(i))return!0;const c=!!e.querySelector("video"),a=e.textContent||"",r=Ie.test(a)||Ae.some(k=>a.includes(k)),d=o.backgroundColor||"",p=X(location.href)&&t.width>=420&&t.width<=window.innerWidth*.78&&t.height>=420&&t.height<=window.innerHeight*.98&&n<window.innerWidth*.6&&a.length<260&&(d.includes("0, 0, 0")||d==="black"||!!e.querySelector('button, [role="button"], svg'));return!(!c&&!r&&!p)}function ie(){let e=null;const t=['[data-e2e="feed-video"]','[data-e2e="browse-video-player"]','[data-e2e="video-player-wrapper"]','[data-e2e="feed-video-player"]','[data-e2e="video-detail-player"]','[data-e2e="video-player"]',"xg-video-container",'[class*="xgplayer"]:not([class*="skin"])','[class*="DivBasicPlayer"]','[class*="DivVideoContainerForDetail"]','[class*="SectionMediaCardContainer"]','[class*="DivVideoContainer"]:not([class*="Wrapper"])','[data-e2e="browse-video"]','[data-e2e="video-item"]','[class*="DivVideoWrapper"]','[class*="DivPlayerContainer"]','[class*="DivBrowserModeContainer"] [class*="DivVideoWrapper"]','[role="dialog"] [class*="DivVideoWrapper"]','[data-e2e="recommend-list-item-container"]',".video-container"],o=window.innerHeight/2;for(const n of t){const i=Array.from(document.querySelectorAll(n)).filter(s=>ue(s));if(i.length){i.sort((s,c)=>{const a=s.getBoundingClientRect(),r=c.getBoundingClientRect();return Math.abs((a.top+a.bottom)/2-o)-Math.abs((r.top+r.bottom)/2-o)}),e={el:i[0],strategy:`selector ${n}`};break}}if(!e){const n=se();if(n){const i=window.innerWidth*.75;let s=n.parentElement,c=null,a=0;for(let r=0;r<8&&s;r++){if(ue(s)){const d=s.getBoundingClientRect();if(d.width<=i){const p=d.width*d.height;p>a&&(c=s,a=p)}}s=s.parentElement}c&&(e={el:c,strategy:"walk-up from <video>"})}}if(!e&&X(location.href)){const n=Array.from(document.querySelectorAll("div, section")).filter(i=>{const s=i.getBoundingClientRect();return s.width>=400&&s.height>=400&&s.height>s.width&&ue(i)});n.sort((i,s)=>{const c=i.getBoundingClientRect(),a=s.getBoundingClientRect();return a.width*a.height-c.width*c.height}),n[0]&&(e={el:n[0],strategy:"portrait-fallback"})}return e?(l('[Download] ✔ Container "'+e.strategy+'":',Math.round(e.el.getBoundingClientRect().width)+"×"+Math.round(e.el.getBoundingClientRect().height),"@ ("+Math.round(e.el.getBoundingClientRect().left)+", "+Math.round(e.el.getBoundingClientRect().top)+")",e.el),e.el):null}let fe=!1;function lt(){const e=se();!e||e===ye||(ye=e,e.addEventListener("ended",dt),e.addEventListener("timeupdate",pt))}function dt(){y.autoScroll&&Ge()}function pt(){if(!y.autoScroll)return;const e=ye;e&&e.duration&&e.currentTime>0&&e.duration-e.currentTime<.2&&Ge()}function Ge(e){if(fe)return;fe=!0,setTimeout(()=>{fe=!1},2e3);const t=document.querySelector('[data-e2e="arrow-right"], [data-e2e="arrow-down"], button[data-e2e="video-switch-next"]');if(t){t.click();return}(document.querySelector('[data-e2e="recommend-list-item-container"]')||document.getElementById("app")||document.documentElement).dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowDown",code:"ArrowDown",keyCode:40,which:40,bubbles:!0,cancelable:!0,composed:!0,view:window})),setTimeout(()=>window.scrollBy({top:window.innerHeight,behavior:"smooth"}),150)}function Ue(){try{window.dispatchEvent(new CustomEvent("__download_settings__",{detail:{backgroundPlay:y.backgroundPlay,autoPiP:y.autoPiP,volumeNormalizer:y.volumeNormalizer,playbackSpeed:y.playbackSpeed}}))}catch{}}const ze="__download_clean_style";function he(e){const t=document.getElementById(ze);if(!e){t==null||t.remove();return}if(t)return;const o=document.createElement("style");o.id=ze,o.textContent=`
    [class*="DivSideNavContainer"],
    [class*="DivLeftContainer"],
    [class*="DivHeaderTopContainer"],
    [class*="DivCommentContainer"],
    [class*="DivVideoActionBarV2"],
    [data-e2e="like-icon"],
    [data-e2e="comment-icon"],
    [data-e2e="share-icon"],
    [data-e2e="bookmark-icon"] {
      opacity: 0 !important;
      pointer-events: none !important;
      transition: opacity 0.3s !important;
    }
    [class*="DivSideNavContainer"]:hover,
    [class*="DivLeftContainer"]:hover {
      opacity: 1 !important;
      pointer-events: auto !important;
    }
  `,document.head.appendChild(o)}function be(){var t;const e=((t=document.body)==null?void 0:t.innerText)||"";return!!(Ie.test(e)||Ae.some(o=>e.includes(o))||document.querySelector('[class*="RegionBlock"], [class*="ShopBlock"], [class*="ShopVideoBlocker"], [class*="DivShopVideoOverlay"], [class*="video-region-block"], [data-e2e*="shop-video-blocker"], [data-e2e*="region-block"]'))}async function ut(e,t){const o=Date.now();for(;Date.now()-o<e;){if(be())return l("unlock/native explicit blocker detected — abort wait"),!1;if(at(t))return!0;await nt(250)}return l("unlock/native timeout; fallback"),!1}function Fe(){return!!(/security check|verify/i.test(document.title)||document.querySelector('#captcha-verify-container, [class*="captcha_verify_container"], [id*="captcha-verify"], [class*="CaptchaVerifyContainer"]'))}let _downloadMOvL=!1;function downloadMRepos(){const o=document.getElementById("__download_modal_overlay");if(!o)return;if(!document.querySelector('[data-e2e="browse-close"]')){o.remove();return}const W=innerWidth,H=innerHeight;let r=W;const c=[...document.querySelectorAll("div")].map(e=>e.getBoundingClientRect()).filter(b=>b.height>H*.6&&b.left>W*.45&&b.width>180&&b.width<W*.5);c.length&&(r=Math.min(...c.map(b=>b.left)));const aW=Math.max(200,r),PH=H,PW=Math.min(aW,Math.round(PH*9/16)),L=Math.round((aW-PW)/2);o.style.left=L+"px",o.style.width=PW+"px",o.style.height=PH+"px"}function downloadMOv(){try{if(!document.querySelector('[data-e2e="browse-close"]'))return null;let o=document.getElementById("__download_modal_overlay");if(!o){o=document.createElement("div"),o.id="__download_modal_overlay",o.style.cssText="position:fixed!important;top:0!important;z-index:2147483640!important;background:#000!important;overflow:hidden",document.body.appendChild(o),_downloadMOvL||(_downloadMOvL=!0,window.addEventListener("resize",downloadMRepos),window.addEventListener("scroll",downloadMRepos,!0))}return downloadMRepos(),o}catch(e){return null}}async function ve(){var p,h;if(!E()||!y.unlockShopVideo||!X(location.href)||x==="checking"||x==="injected"||document.getElementById(T))return;if(Fe()){l("[Download] Captcha/verify page detected — skip player injection"),x="idle";return}x="checking";const e=be(),t=ie(),o=!!(t!=null&&t.querySelector("video")),n=!document.querySelector("video"),i=e?800:t&&!o?1e3:n?2500:1500;l("[Download] native timeout chosen = "+i,{explicitBlockerAtStart:e,hasTrustedWrapper:!!t,trustedHasVideo:o,noVideoAtAll:n});const s=location.href,c=(async()=>{try{return await new Promise(k=>{chrome.runtime.sendMessage({type:"GET_TIKTOK_METADATA",url:s},A=>{if(chrome.runtime.lastError){k(null);return}k(A)})})}catch{return null}})();if(await ut(i,t)){be()&&Ne(),x="native",l("[Download] Native player available, no inject");return}l("[Download] Native player stayed unavailable; using server resolver fallback");const r=await c;if(l("unlock/resolver result",{success:!!(r!=null&&r.success),hasVideoUrl:!!((p=r==null?void 0:r.data)!=null&&p.videoUrl),error:(r==null?void 0:r.error)||null}),!(r!=null&&r.success)||!((h=r==null?void 0:r.data)!=null&&h.videoUrl)){x="idle";return}let d=ie();if(!d)d=downloadMOv();if(!d){x="idle";return}if(Fe()){l("[Download] Captcha appeared during fetch — abort inject"),x="idle";return}Ne(),ft(d,r.data.videoUrl,r.data.coverUrl,r.data.title)}function ft(e,t,o,n){if(document.getElementById(T)){l("[Download] Player already present, skip re-inject");return}const i=e.getBoundingClientRect();if(i.width<100||i.height<100){l(`[Download] Container size too small (${Math.round(i.width)}×${Math.round(i.height)}), skip inject — sẽ retry`),x="idle";return}l(`[Download] Injecting player into container (${Math.round(i.width)}×${Math.round(i.height)})`);const s=document.querySelector("video"),c=s?s.muted:!1;getComputedStyle(e).position==="static"&&e.style.setProperty("position","relative","important");const a=document.createElement("div");a.id=T,a.style.cssText=`
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    z-index: 2147483646 !important;
    background: #000 !important;
    border-radius: inherit;
    overflow: hidden;
    box-shadow: inset 0 0 0 2px rgba(34,211,238,0.5), 0 0 30px rgba(34,211,238,0.3);
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;
  `,a.innerHTML=`
    <style>
      #${T}:fullscreen,
      #${T}:-webkit-full-screen {
        position: fixed !important; inset: 0 !important;
        width: 100vw !important; height: 100vh !important;
        border-radius: 0 !important; box-shadow: none !important; background: #000 !important;
      }
      #${T}:fullscreen video,
      #${T}:-webkit-full-screen video,
      #${T} video:fullscreen,
      #${T} video:-webkit-full-screen {
        width: 100vw !important; height: 100vh !important;
        max-width: none !important; max-height: none !important;
        object-fit: contain !important; background: #000 !important;
      }
    </style>
    <video src="${Ve(t)}"
      ${o?`poster="${Ve(o)}"`:""}
      controls autoplay loop playsinline muted
      style="width:100%;height:100%;object-fit:contain;background:#000;display:block;"
    ></video>
    <button id="${Re}" type="button" aria-label="Play" style="
      position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
      z-index: 4; width: 74px; height: 74px; border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.34);
      background: linear-gradient(135deg, rgba(34,211,238,0.78), rgba(217,70,239,0.78));
      box-shadow: 0 12px 36px rgba(0,0,0,0.45), 0 0 30px rgba(34,211,238,0.35);
      backdrop-filter: blur(14px) saturate(180%);
      -webkit-backdrop-filter: blur(14px) saturate(180%);
      cursor: pointer; display: none; align-items: center; justify-content: center;
      padding: 0; color: white;
    ">
      <span style="display:inline-block;width:0;height:0;
        border-top:14px solid transparent;border-bottom:14px solid transparent;
        border-left:22px solid white;margin-left:5px;"></span>
    </button>
    <div id="__download_unmute_hint" style="
      position: absolute; left: 50%; bottom: 16px; transform: translateX(-50%);
      padding: 6px 12px; border-radius: 999px;
      background: rgba(0,0,0,0.55); color: #fff; font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      pointer-events: none; opacity: 0.92; user-select: none;
      transition: opacity 0.3s;
    ">${Oe("clickToUnmute")}</div>
    <div style="
      position: absolute; left: 10px; top: 10px; z-index: 3;
      padding: 4px 10px; border-radius: 999px;
      background: rgba(0,0,0,0.55); color: #fff; font-size: 11px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      pointer-events: none;
    ">${Oe("unlocked")}</div>
  `,e.appendChild(a),x="injected",l("[Download] Player injected into native container");const r=a.querySelector("video"),d=a.querySelector("#"+Re),p=a.querySelector("#__download_unmute_hint");l("inject/video src",t.slice(0,100)+"..."),r&&(c&&(r.muted=!0),r.addEventListener("loadedmetadata",()=>l("inject/video loadedmetadata",JSON.stringify({duration:r.duration,width:r.videoWidth,height:r.videoHeight}))),r.addEventListener("loadeddata",()=>l("inject/video loadeddata")),r.addEventListener("canplay",()=>l("inject/video canplay")),r.addEventListener("playing",()=>l("inject/video playing")),r.addEventListener("waiting",()=>l("inject/video waiting")),r.addEventListener("pause",()=>{d&&(d.style.display="flex")}),r.addEventListener("play",()=>{d&&(d.style.display="none")}),setTimeout(()=>{l("inject/video status@2s",JSON.stringify({rs:r.readyState,ns:r.networkState,paused:r.paused,ct:Math.round(r.currentTime*100)/100,size:i.width+"x"+i.height,vw:r.videoWidth,vh:r.videoHeight,muted:r.muted,visible:a.offsetParent!==null}))},2e3),setTimeout(()=>{const u=a.getBoundingClientRect();l("inject/visibility@3000ms",JSON.stringify({wrapper:{size:Math.round(u.width)+"x"+Math.round(u.height)},injectedVideo:{rs:r.readyState,ct:r.currentTime,muted:r.muted}}))},3e3)),d&&d.addEventListener("click",()=>{r==null||r.play().catch(()=>{})});const h=()=>{r&&(r.muted=!1,p&&(p.style.opacity="0"),setTimeout(()=>p==null?void 0:p.remove(),400),a.removeEventListener("click",h),l("[Download] Video unmuted on user interaction"))};a.addEventListener("click",h),l("[Download] Player injected via resolver"),y.productViewer&&setTimeout(()=>{E()&&ce()},100),Je()}function je(){var e,t,m;(e=document.getElementById(T))==null||e.remove(),(t=document.getElementById(ke))==null||t.remove(),(m=document.getElementById("__download_modal_overlay"))==null||m.remove(),x="idle"}function Je(){const e=["View TikTok Shop videos in the TikTok app","Xem video TikTok Shop trong ứng dụng"];document.querySelectorAll("div").forEach(t=>{if(t.children.length>2)return;const o=(t.textContent||"").trim();!o||o.length>120||e.some(n=>o.includes(n))&&(t.style.display="none",l("[Download] TOAST REMOVED: "+o.slice(0,80)))})}function ht(){const e=document.querySelector("script#__UNIVERSAL_DATA_FOR_REHYDRATION__, script#SIGI_STATE");if(!e)return null;try{return JSON.parse(e.textContent||"{}")}catch{return null}}function we(){var n,i,s;const e=ht();if(!e)return null;const t=(s=(i=(n=e==null?void 0:e.__DEFAULT_SCOPE__)==null?void 0:n["webapp.video-detail"])==null?void 0:i.itemInfo)==null?void 0:s.itemStruct;if(t)return t;const o=e==null?void 0:e.ItemModule;if(o&&typeof o=="object"){const c=Object.keys(o);if(c.length)return o[c[0]]}return null}function gt(e){if(!e||typeof e!="object")return{};const t=(i,s)=>{for(const c of s){const a=i==null?void 0:i[c];if(typeof a=="string"&&a.trim())return a;if(typeof a=="number"&&a>0)return String(a)}},o=t(e,["format_price","price_format","sale_price_format","price_str","current_price"]),n=t(e,["origin_price_format","market_price_format","original_price_str","market_price"]);return{price:o,originalPrice:n}}function mt(e){var t,o,n,i,s,c;if(!(!e||typeof e!="object"))return e.cover_url||e.image||((o=(t=e.cover)==null?void 0:t.url_list)==null?void 0:o[0])||((i=(n=e.thumbnail)==null?void 0:n.url_list)==null?void 0:i[0])||((c=(s=e.icon)==null?void 0:s.url_list)==null?void 0:c[0])||e.product_image}function yt(e,t){if(!Array.isArray(e))return null;l("[Download] Anchors ("+e.length+") — first sample:",JSON.stringify(e[0]||{}).slice(0,500)),l("[Download] Anchor types:",JSON.stringify(e.map(o=>o==null?void 0:o.type)));for(const o of e){if(!o||typeof o!="object"||o.type!==33&&o.type!==106)continue;const n=o.extra||o.extra_info||{},i=o.keyword||o.description||n.elastic_title||n.title;if(!i)continue;if(/capcut|edit like|editing made|try this effect|template/i.test(String(i))){l("[Download] Rejected non-shop keyword on type "+o.type+": "+i);continue}const s=String(o.id||n.product_id||n.id||"");let c=String(o.schema||o.action_url||n.detail_url||n.product_link||"");c&&!/tiktok\.com\/shop\//i.test(c)&&(c="");const{price:a,originalPrice:r}=gt(n),d=mt(n),p=n.shop_name||n.seller_name||n.brand||"TikTok Shop",h={id:s,title:String(i).slice(0,200),price:a,originalPrice:r,imageUrl:d,shopName:p,url:c};return l("[Download] Anchor embedded product:",h),(t==null?void 0:t.isECVideo)===1||(t==null||t.isECVideo),h}return null}function kt(e){if(!e)return;const o=(Array.isArray(e.anchors)?e.anchors.map(n=>n==null?void 0:n.type):[]).some(n=>n===33||n===106);l(`[Download] isECVideo=${e.isECVideo}, AnchorTypes=${JSON.stringify(e.AnchorTypes)}, hasCommerceProductInfo=${!!e.commerceProductInfo}`),(e.isECVideo===1||e.isECVideo===!0||o)&&!e.commerceProductInfo&&l("[Download] EC video but no commerceProductInfo — anchor extraction only");try{const n=String(e.id||"");if(n&&!qe.has(n)){qe.add(n);const i=[],s=(a,r,d)=>{if(!(!a||typeof a!="object"||d>3))for(const p of Object.keys(a)){const h=a[p],u=r?r+"."+p:p;if(typeof h=="string"){const k=h.trim();k.length>=3&&k.length<=80&&!/^https?:|^\/|^\d+$|^[#@]/.test(k)&&i.push({path:u,value:k})}else typeof h=="object"&&h!==null&&d<3&&s(h,u,d+1)}};Array.isArray(e.anchors)&&e.anchors.forEach((a,r)=>{if(!a)return;let d=a.extra||a.extra_info||{};try{typeof a.extraInfo=="string"&&(d=JSON.parse(a.extraInfo))}catch{}let p={};try{p=typeof a.logExtra=="string"?JSON.parse(a.logExtra):a.logExtra||{}}catch{}s({...a,extra:void 0,extra_info:void 0,extraInfo:void 0,logExtra:void 0},`anchor[${r}](t=${a.type})`,0),s(d,`anchor[${r}].extra`,0),s(p,`anchor[${r}].logExtra`,0)});const c=e.commerceProductInfo||e.commerce_product_info;c&&s(c,"cpi",0),l("[Download] SHORT-FIELD DUMP for "+n+":",JSON.stringify(i.slice(0,60)))}}catch{}}const qe=new Set;function Ye(e){if(!e)return"";const t=i=>{if(typeof i!="string")return"";const s=i.trim();return s.length<3||s.length>80||/capcut|edit like|editing made|template|effect/i.test(s)||/^[\s#@][\s#@\w-]*$/.test(s)?"":s};let o="";const n=[];if(Array.isArray(e.anchors))for(const i of e.anchors){if(!i||i.type!==33&&i.type!==106)continue;let s={};try{s=typeof i.extraInfo=="string"?JSON.parse(i.extraInfo):i.extraInfo||i.extra||i.extra_info||{}}catch{s=i.extra||{}}let c={};try{c=typeof i.logExtra=="string"?JSON.parse(i.logExtra):i.logExtra||{}}catch{}const a=[["anchor.keyword",i.keyword],["anchor.description",i.description],["anchor.name",i.name],["anchor.extra.elastic_title",s.elastic_title],["anchor.extra.elasticTitle",s.elasticTitle],["anchor.extra.marketing_words",Array.isArray(s.marketing_words)?s.marketing_words[0]:s.marketing_words],["anchor.extra.title",s.title],["anchor.extra.short_title",s.short_title],["anchor.extra.display_title",s.display_title],["anchor.logExtra.elastic_title",c.elastic_title],["anchor.logExtra.marketing_words",Array.isArray(c.marketing_words)?c.marketing_words[0]:c.marketing_words]];for(const[r,d]of a){const p=t(d);p&&(n.push({from:r,value:p}),o||(o=p))}if(o)break}if(!o){const i=e.commerceProductInfo||e.commerce_product_info;if(i&&typeof i=="object"){const s=(Array.isArray(i.products)?i.products[0]:i)||{},c=[["cpi.elastic_title",i.elastic_title],["cpi.marketing_words",Array.isArray(i.marketing_words)?i.marketing_words[0]:i.marketing_words],["cpi.products[0].elastic_title",s.elastic_title],["cpi.products[0].marketing_words",Array.isArray(s.marketing_words)?s.marketing_words[0]:s.marketing_words],["cpi.products[0].short_title",s.short_title],["cpi.products[0].display_title",s.display_title]];for(const[a,r]of c){const d=t(r);if(d&&(n.push({from:a,value:d}),!o)){o=d;break}}}}if(!o&&Array.isArray(e.suggestedWords))for(const i of e.suggestedWords){const s=t(typeof i=="string"?i:i==null?void 0:i.word);if(s){o=s,n.push({from:"suggestedWords",value:s});break}}return l("[Download] marketingTitle resolved:",o||"(none)","candidates:",JSON.stringify(n)),o}function bt(){var n,i;const e=we();if(!e)return null;kt(e);const t=Ye(e),o=e.commerceProductInfo||e.commerce_product_info;if(o&&typeof o=="object"){const c=(Array.isArray(o.products)?o.products:o.title?[o]:[])[0];if(c&&(c.title||c.product_name||c.name)){const a=String(c.title||c.product_name||c.name||""),r={id:String(c.product_id||c.id||""),title:t||a,price:String(c.price_str||c.format_price||c.price||""),originalPrice:String(c.market_price_str||c.origin_price_str||c.market_price||""),imageUrl:String(((i=(n=c.cover)==null?void 0:n.urlList)==null?void 0:i[0])||c.cover_url||c.image||""),shopName:String(c.shop_name||c.seller_name||"TikTok Shop"),url:String(c.product_link||c.detail_url||"")};return l("[Download] Product via commerceProductInfo:",r),r}}if(Array.isArray(e.anchors)){const s=yt(e.anchors,e);if(s)return l("[Download] Product via anchors:",s),s}return null}function vt(e){if(!e)return!1;if(Array.isArray(e.anchors)){for(const s of e.anchors)if(s&&s.type===54)continue}const t=Array.isArray(e.anchors)&&e.anchors.length>0,o=!!(e.commerceProductInfo||e.commerce_product_info),n=e.isECVideo===1||e.isECVideo===!0,i=Array.isArray(e.AnchorTypes)&&(e.AnchorTypes.includes(33)||e.AnchorTypes.includes(106));return!(!t&&!o&&!n&&!i)}function wt(e){if(!E())return;const t=V(e);if(!t||oe===t||q||S)return;if(re.has(t)){l("[Download] video",t,"confirmed non-shop by TikTok API → skip BG fetch");return}const o=we();if(!w.has(t)&&!vt(o)){l("[Download] No SIGI shop signal — proceeding with weak fetch anyway (v9), videoId="+t)}else if(w.has(t)){l("[Download] video known shop from profile XHR → bypass, videoId="+t)}const n=Array.isArray(o==null?void 0:o.anchors)&&o.anchors.some(a=>{if(!a||a.type!==33&&a.type!==106)return!1;const r=a.extra||a.extra_info||a.extraInfo;return!!(a.keyword||a.description||a.schema||a.actionUrl||r&&(typeof r=="string"?r.length>2:Object.keys(r).length))}),i=!!(o!=null&&o.commerceProductInfo||o!=null&&o.commerce_product_info),s=w.has(t),c=n||i||s;l("[Download] signal strength",{videoId:t,strongSignal:c,hasRealShopAnchor:n,hasRealCpi:i,confirmedShop:s}),oe=t,q=!0,l("[Download] Starting product fetch via mobile UA, strongSignal="+c),queueMicrotask(()=>{if(S){q=!1;return}if(V(location.href)!==t){l("[Download] Defer expired — user chuyển sang video khác, skip"),q=!1;return}chrome.runtime.sendMessage({type:"GET_DOWNLOADDUCT",url:e,strongSignal:c},a=>{if(q=!1,chrome.runtime.lastError){l("[Download] BG message error:",chrome.runtime.lastError.message);return}if(!(a!=null&&a.success)){l("[Download] Mobile fetch failed:",a==null?void 0:a.error);return}if(a.debug)try{l("[Download] Mobile fetch debug JSON:",JSON.stringify(a.debug))}catch{l("[Download] Mobile fetch debug:",a.debug)}const r=a.data;if(!r||!r.title){l("[Download] Mobile fetch không có product → KHÔNG render");return}if(/^(security check|please verify|verify to continue|please complete|access denied|too many requests)$/i.test(String(r.title).trim())){l("[Download] Captcha-shaped product title → skip render",r.title);return}if(r.id&&/^\d{6,}$/.test(String(r.id))&&(!r.url||!/tiktok\.com\/shop\//.test(r.url))){const k=(r.title||"product").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80)||"product";r.url=`https://www.tiktok.com/shop/vn/pdp/${k}/${r.id}`,l("[Download] Synthesized PDP URL from product_id:",r.url)}if(!r.url||!/tiktok\.com\/shop\//.test(r.url)){l("[Download] No PDP URL after enrichment → skip render (avoid search-tab fallback)");return}if(V(location.href)!==t){l("[Download] User chuyÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€ Ã¢â‚¬â„¢n video khÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡c, skip render product cÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â©");return}if(S)return;const d=(r.title||"").trim(),p=d.length>0&&d.length<=80,h=Ye(we()),u=p?d:h||d;l("[Download] Product via mobile fetch:",d,"displayTitle:",u,"bgShort:",p,"localMktg:",h),Ke({title:u,price:r.price,shopName:r.shopName,imageUrl:r.imageUrl,url:r.url,originalPrice:r.originalPrice,soldCount:r.soldCount,rating:r.rating,reviewCount:r.reviewCount,tags:r.tags,description:r.description}),S=!0})})}async function He(){y=await tt(),Ue(),he(y.cleanVideoMode),xt(),chrome.storage.onChanged.addListener((o,n)=>{var a;if(n!=="sync")return;const i=(a=o.ext_settings)==null?void 0:a.newValue;if(!i)return;const s=y.unlockShopVideo,c=y.productViewer;y={...y,...i},Ue(),he(y.cleanVideoMode),y.unlockShopVideo&&!s&&(x="idle",ve()),!y.unlockShopVideo&&s&&je(),y.productViewer&&!c&&(S=!1,ce(),Pe()),!y.productViewer&&c&&(ne(),ee(),b==null||b.disconnect(),b=null,R="")});const e=new MutationObserver(()=>{if(!E()){e.disconnect();return}x==="injected"&&!document.getElementById(T)&&(l("[Download] Injected wrapper unmounted — reset unlockState"),x="idle",y.unlockShopVideo&&X(location.href)&&setTimeout(()=>{E()&&ve()},200)),ge()});e.observe(document.body,{childList:!0,subtree:!0});const t=setInterval(()=>{if(!E()){clearInterval(t);return}const o=V(location.href),n=V(Le);o!==n?(n&&Je(),Le=location.href,x="idle",S=!1,Y="",oe="",q=!1,it.clear(),H&&(clearTimeout(H),H=null),je(),ne(),setTimeout(ge,100),Pe()):(et(),Ce("url-watch"))},500);ge(),he(y.cleanVideoMode)}function ge(){lt(),et(),Ce("dom-change"),y.unlockShopVideo&&ve(),y.productViewer&&ce(),y.productViewer&&Pe()}function xt(){Ce=e=>{y.autoPiP}}let We="";function _t(){if(We===location.href)return;We=location.href,l("[Download] === DEBUG: Product-related DOM dump ===");const e=Array.from(document.querySelectorAll('a[href*="shop"], a[href*="/pdp/"], a[href*="tcm"]'));l(`[Download] Shop-like <a> count: ${e.length}`),e.slice(0,10).forEach((n,i)=>{var a,r;const s=n.getBoundingClientRect(),c=s.width>0&&s.height>0&&s.bottom>0&&s.top<window.innerHeight;l(`  [a-${i}]`,c?"VISIBLE":"hidden",`${Math.round(s.width)}x${Math.round(s.height)}`,"href=",n.href.slice(0,100),"text=",(n.textContent||"").trim().slice(0,80),"class=",(((r=(a=n.className)==null?void 0:a.toString)==null?void 0:r.call(a))||"").slice(0,80))});const t=Array.from(document.querySelectorAll('[class*="nchor" i], [class*="Product" i], [class*="ShopAnchor" i], [class*="ShopCard" i], [class*="ProductCard" i], [class*="adge" i]'));l(`[Download] Anchor/product/card-like elements: ${t.length}`),t.slice(0,15).forEach((n,i)=>{var r,d,p;const s=n.getBoundingClientRect(),c=(n.textContent||"").trim().slice(0,80),a=n.innerHTML.slice(0,120).replace(/\s+/g," ");l(`  [c-${i}] <${n.tagName.toLowerCase()}>`,`${Math.round(s.width)}x${Math.round(s.height)} @ (${Math.round(s.left)}, ${Math.round(s.top)})`,"class=",(((d=(r=n.className)==null?void 0:r.toString)==null?void 0:d.call(r))||"").slice(0,120),"data-e2e=",n.getAttribute("data-e2e")||"","href=",n.href||((p=n.querySelector("a"))==null?void 0:p.getAttribute("href"))||"","text=",c,"html=",a)});const o=Array.from(document.querySelectorAll('[data-e2e*="shop" i], [data-e2e*="product" i], [data-e2e*="anchor" i]'));l(`[Download] data-e2e shop/product/anchor: ${o.length}`),o.slice(0,10).forEach((n,i)=>{const s=n.getBoundingClientRect();l(`  [e-${i}]`,n.getAttribute("data-e2e"),`${Math.round(s.width)}x${Math.round(s.height)}`,"tag=",n.tagName.toLowerCase(),"text=",(n.textContent||"").trim().slice(0,60))})}function ce(){if(!E()||S||!X(location.href)||Y===location.href)return;const e=bt(),t=!!(e!=null&&e.url)&&/tiktok\.com\/shop\//i.test(e.url);if(!e||!t){wt(location.href),_t(),Y=location.href,H&&clearTimeout(H),H=window.setTimeout(()=>{S||(Y="")},3500);return}l("[Download] Product card render:",e),Ke(e),S=!0}function Tt(){const e=document.querySelectorAll('[class*="DivAnchorTagWrapper"], [class*="DivAnchorTag"], [class*="ShopAnchor"], [data-e2e*="anchor"]');for(const t of e){const o=t.getBoundingClientRect();if(o.height<10||o.width<40)continue;const n=(t.innerText||t.textContent||"").trim();if(!n||/capcut|try this effect|edit like|editing made|template|paid partnership|promotional content|sponsored|h(?:ợ|o)p t(?:á|a)c c(?:ó|o) tr(?:ả|a) ph(?:í|i)|n(?:ộ|o)i dung qu(?:ả|a)ng (?:c(?:á|a)o|b(?:á|a))/i.test(n)||n.length>80)continue;const i=n.replace(/^[\s\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]+/u,"").trim();if(i.length>=3)return l("[Download] Native anchor short title from DOM:",i),i}return""}function Ke(e){var v,B;(v=document.getElementById(K))==null||v.remove();const t=e.url||"";if(l("renderProductCard called",{hasUrl:!!t,title:e.title,layout:{vw:window.innerWidth,vh:window.innerHeight}}),!t)return;const o=Date.now(),n=V(location.href),i=Tt(),s=(e.title||"").trim();let a=(!!i&&(!s||i.length<s.length*.8&&i.length<=60)?i:s)||(y.language==="vi"?"Xem sản phẩm TikTok Shop":"View TikTok Shop product");if(a.length>40){const g=a.match(/^(.{8,45}?)\s*[\|\u00b7\u2022\u2013\u2014\-\u2013\u2014]\s+/);g&&(a=g[1].trim())}if(a.length>40){const g=a.slice(0,38),P=g.lastIndexOf(" ");a=(P>=20?g.slice(0,P):g).trim()+"…"}ie();const r=document.createElement("div");r.id=K,r.dataset.videoId=n;const d="position: fixed; bottom: 90px; left: 24px; opacity: 0; visibility: hidden;";r.style.cssText=`
    ${d}
    z-index: 2147483647;
    background: linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 100%);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border: 1px solid rgba(255,255,255,0.18);
    border-radius: 999px;
    padding: 8px 14px 8px 8px;
    box-shadow:
      0 8px 28px rgba(0,0,0,0.45),
      0 0 18px rgba(34,211,238,0.18),
      inset 0 1px 0 rgba(255,255,255,0.22),
      inset 0 -1px 0 rgba(217,70,239,0.10);
    min-width: min(240px, calc(100% - 32px));
    max-width: min(380px, calc(100% - 24px));
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'DM Sans', sans-serif;
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s, background 0.2s, opacity 0.25s ease-out;
    animation: downloadProductSlideIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  `;const p=`
    <div style="
      width:32px;height:32px;border-radius:50%;
      background:#fff;
      display:flex;align-items:center;justify-content:center;
      flex-shrink:0;border:1px solid rgba(255,255,255,0.75);
      box-shadow: 0 2px 8px rgba(0,0,0,0.22), inset 0 0 0 1px rgba(217,70,239,0.12);
      overflow:hidden;
    ">
      <img src="${Ee}" alt="" style="width:24px;height:24px;object-fit:contain;display:block;" />
    </div>
  `;if(r.innerHTML=`
    ${p}
    <div title="${m(a)}" style="
      flex:1; min-width:0; font-size:13px; font-weight:700; line-height:1.3;
      display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;
      overflow:hidden; text-overflow:ellipsis; word-break:break-word;
      max-height:2.7em;
    ">${m(a)}</div>
    <button id="__download_product_close" style="
      background:transparent;border:none;color:rgba(255,255,255,0.45);cursor:pointer;
      padding:2px 4px;font-size:14px;line-height:1;flex-shrink:0;font-weight:600;
    ">&times;</button>
  `,!document.getElementById("__download_product_keyframes")){const g=document.createElement("style");g.id="__download_product_keyframes",g.textContent=`
      @keyframes downloadProductSlideIn {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      #${K}:hover {
        transform: translateY(-2px);
        border-color: rgba(217,70,239,0.5);
        background: linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.05) 100%);
        box-shadow:
          0 12px 36px rgba(0,0,0,0.55),
          0 0 28px rgba(217,70,239,0.35),
          inset 0 1px 0 rgba(255,255,255,0.3),
          inset 0 -1px 0 rgba(34,211,238,0.15);
      }
    `,document.head.appendChild(g)}r.addEventListener("click",g=>{g.target.id!=="__download_product_close"&&(g.preventDefault(),g.stopPropagation(),It(e,r))},{capture:!0}),(B=r.querySelector("#__download_product_close"))==null||B.addEventListener("click",g=>{g.stopPropagation(),r.remove()}),document.body.appendChild(r);const h=()=>{var $,W;if(!r.isConnected)return;let g=null,P="";const I=ie();if(I&&(g=I.getBoundingClientRect(),P=`container:${(((W=($=I.className)==null?void 0:$.toString)==null?void 0:W.call($))||"").slice(0,80)}`),!g||g.width<50){const D=document.getElementById(T);D&&(g=D.getBoundingClientRect(),P="injected-wrapper")}if(!g||g.width<50){const D=se();if(D){const U=D.getBoundingClientRect();U.width>=300&&U.height>=300&&(g=U,P="best-video")}}if(!g||g.width<50){l("positionCart: NO anchor → viewport fallback",{vw:window.innerWidth,vh:window.innerHeight,liveContainer:!!I}),r.style.left="24px",r.style.bottom="90px",r.style.right="",r.style.top="",r.style.visibility="visible",r.style.opacity="1",(()=>{const _c=r.getBoundingClientRect(),_vw=window.innerWidth,_vh=window.innerHeight;let _l=parseFloat(r.style.left)||0,_b=parseFloat(r.style.bottom)||0;_l=Math.max(8,Math.min(_l,_vw-8-_c.width)),_b=Math.max(8,Math.min(_b,_vh-8-_c.height)),r.style.left=Math.round(_l)+"px",r.style.bottom=Math.round(_b)+"px"})(),Date.now()-o>30000&&r.remove();return}let N=Math.max(8,g.left+12),M=Math.max(8,window.innerHeight-g.bottom+80);g.bottom>window.innerHeight&&(M=80),g.left>window.innerWidth&&(N=16),r.style.left=`${Math.round(N)}px`,r.style.bottom=`${Math.round(M)}px`,r.style.right="",r.style.top="",(()=>{const _c=r.getBoundingClientRect(),_vw=window.innerWidth,_vh=window.innerHeight;let _l=parseFloat(r.style.left)||0,_b=parseFloat(r.style.bottom)||0;_l=Math.max(8,Math.min(_l,_vw-8-_c.width)),_b=Math.max(8,Math.min(_b,_vh-8-_c.height)),r.style.left=Math.round(_l)+"px",r.style.bottom=Math.round(_b)+"px"})(),r.style.visibility==="hidden"&&(r.style.visibility="visible",r.style.opacity="1"),l("positionCart",{src:P,rect:{l:Math.round(g.left),t:Math.round(g.top),w:Math.round(g.width),h:Math.round(g.height),b:Math.round(g.bottom)},placed:{left:Math.round(N),bottom:Math.round(M)},vp:{w:window.innerWidth,h:window.innerHeight},zoom:Math.round(window.devicePixelRatio*100)/100})};requestAnimationFrame(h);let _uTick=0;let _uSettle=0;const u=()=>{clearTimeout(_uSettle),_uSettle=setTimeout(()=>{_uSettle=0,h()},260),_uTick||(_uTick=requestAnimationFrame(()=>{_uTick=0,h()}))};window.addEventListener("resize",u),window.addEventListener("scroll",u,!0);let k=null;try{k=new ResizeObserver(()=>h()),k.observe(document.body)}catch{}const A=new MutationObserver(()=>{r.isConnected||(window.removeEventListener("resize",u),window.removeEventListener("scroll",u,!0),k==null||k.disconnect(),A.disconnect())});A.observe(document.body,{childList:!0,subtree:!0})}function ne(){var e;(e=document.getElementById(K))==null||e.remove(),S=!1}const xe="__download_profile_shop_badge",w=new Set,re=new Set;let R="",G="",b=null;function Pt(e){try{const o=new URL(e).pathname.match(/^\/@([^/]+)(?:\/|$)/);return o?o[1]:null}catch{return null}}function le(e){try{const t=new URL(e);return/^\/@[^/]+\/?$|^\/search\b|^\/explore\b|^\/tag\//.test(t.pathname)}catch{return!1}}function Xe(e){try{const o=new URL(e).pathname.match(/^\/@([^/]+)\/?$/);return o?o[1]:null}catch{return null}}const ae=new Set;window.addEventListener("message",e=>{if(e.source!==window)return;const t=e.data;if((t==null?void 0:t.type)==="__DOWNLOAD_PROBE_URL__"){l("[Profile Badges] probe url:",t.url);return}if(!t||t.type!=="__DOWNLOAD_PROFILE_POSTS__")return;const o=Array.isArray(t.shopIds)?t.shopIds:[];if(Array.isArray(t.nonShopIds)){let i=0;for(const s of t.nonShopIds)re.has(s)||(re.add(s),i++);i&&l("[Profile Badges] hook delivered",t.nonShopIds.length,"non-shop ids (",i,"new)")}if(Array.isArray(t.sample))try{l("[Profile Badges] sample item shape:",JSON.stringify(t.sample))}catch{l("[Profile Badges] sample item shape (object):",t.sample)}if(!o.length){l("[Profile Badges] hook delivered 0 shop ids (",t.total,"total items)");return}if(!le(location.href))return;let n=0;for(const i of o)w.has(i)||(w.add(i),n++);l("[Profile Badges] hook delivered",o.length,"shop ids (",n,"new) /",t.total,"total items"),n&&(O(),setTimeout(()=>Ze(),400))});function St(e){if(!ae.has(e)){ae.add(e),l("[Profile Badges] requesting shop ids from BG for",e);try{chrome.runtime.sendMessage({type:"GET_PROFILE_SHOP_VIDEOS",username:e},t=>{if(chrome.runtime.lastError){l("[Profile Badges] BG error:",chrome.runtime.lastError.message);return}if(!(t!=null&&t.success)){l("[Profile Badges] BG returned failure:",t==null?void 0:t.error);return}const o=t.shopVideoIds||[];if(l("[Profile Badges] BG returned",o.length,"shop ids /",t.totalScanned,"scanned"),Xe(location.href)!==e){l("[Profile Badges] User navigated away, skipping apply");return}o.forEach(n=>w.add(n)),O()})}catch(t){l("[Profile Badges] sendMessage threw:",t.message)}}}function _e(e,t,o=3,n=""){const i=[];if(!e||typeof e!="object"||t>o)return i;if(Array.isArray(e))return i.push(`${n}Array(${e.length})${e[0]&&typeof e[0]=="object"?" of obj":""}`),i;const s=Object.keys(e).slice(0,25);for(const c of s){const a=e[c];if(Array.isArray(a))i.push(`${n}${c}: Array(${a.length})`),a.length&&typeof a[0]=="object"&&a[0]&&(a[0].id||a[0].aweme_id)&&i.push(`${n}  → sample keys: ${Object.keys(a[0]).slice(0,20).join(",")}`);else if(a&&typeof a=="object"){const r=Object.keys(a).slice(0,10);i.push(`${n}${c}: { ${r.join(", ")} }`),t<o&&i.push(..._e(a,t+1,o,n+"  "))}}return i}function Ct(){const e=new Set,t=document.querySelectorAll('script#__UNIVERSAL_DATA_FOR_REHYDRATION__, script#SIGI_STATE, script[id*="UNIVERSAL_DATA"]');if(l("[Profile Badges] SIGI nodes found:",t.length,Array.from(t).map(n=>n.id)),t.length)try{const n=JSON.parse(t[0].textContent||"{}"),i=(n==null?void 0:n.__DEFAULT_SCOPE__)||n,s=i==null?void 0:i["webapp.user-detail"];s&&l("[Profile Badges] webapp.user-detail tree:",_e(s,0,4).join(`
`));for(const c of Object.keys(i||{}))/post|item|video|feed/i.test(c)&&l(`[Profile Badges] SIGI scope ${c}:`,_e(i[c],0,3).join(`
`))}catch{}let o=0;for(const n of t){let i=function(a,r){if(!(!a||typeof a!="object"||r>12)&&!c.has(a)){if(c.add(a),Array.isArray(a)){for(const d of a){if(!d||typeof d!="object")continue;const p=d.id||d.video_id||d.aweme_id||d.itemId;if(p&&/^\d{6,}$/.test(String(p))){let h=!1;if(Array.isArray(d.anchors))for(const v of d.anchors){if(!v||v.type!==33)continue;const B=String(v.schema||v.action_url||""),g=v.extra||{},P=typeof v.keyword=="string"?v.keyword:"",I=/capcut|edit like|editing made|template|effect/i.test(P);if(/\/shop\//.test(B)||!!g.product_id||!!g.shop_id||P&&!I){h=!0;break}}const u=!!d.commerceProductInfo||!!d.ecCommerceInfo,k=Array.isArray(d.anchors)&&d.anchors.some(v=>v&&v.type===54),A=(d.isECVideo===!0||d.isECVideo===1)&&(!k||(function(a){if(!a||typeof a!=="object")return false;var c=a.commerceUserInfo;if(c&&typeof c==="object"){if(c.commerceUser===true)return true;if(typeof c.category==="string"&&c.category.length>0)return true;if(typeof c.sellerLevel==="number"&&c.sellerLevel>0)return true}return a.ttSeller===true})(d.author));(h||u||A)&&e.add(String(p))}i(d,r+1)}return}for(const d of Object.keys(a))i(a[d],r+1)}},s;try{s=JSON.parse(n.textContent||"{}")}catch(a){l("[Profile Badges] SIGI parse fail",a.message);continue}o++;const c=new WeakSet;i(s,0),l("[Profile Badges] SIGI scope keys:",Object.keys((s==null?void 0:s.__DEFAULT_SCOPE__)||s||{}).slice(0,20))}return l("[Profile Badges] SIGI scanned",o,"roots → shop ids:",e.size),e}function Et(e,t){if(!w.has(t)||e.querySelector("."+xe))return;getComputedStyle(e).position==="static"&&(e.style.position="relative");const n=document.createElement("div");if(n.className=xe,n.style.cssText=`
    position: absolute !important;
    top: 8px !important;
    right: 8px !important;
    width: 30px !important;
    height: 30px !important;
    border-radius: 50% !important;
    background: linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.86) 100%) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    z-index: 2147483640 !important;
    box-shadow:
      0 2px 8px rgba(0,0,0,0.35),
      0 0 12px rgba(217,70,239,0.25),
      inset 0 0 0 1px rgba(217,70,239,0.18) !important;
    pointer-events: none !important;
    animation: downloadProfileBadgeIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    opacity: 1 !important;
    visibility: visible !important;
  `,n.innerHTML=`<img src="${Ee}" alt="" style="width:20px;height:20px;object-fit:contain;display:block;" />`,e.appendChild(n),!document.getElementById("__download_profile_badge_keyframes")){const i=document.createElement("style");i.id="__download_profile_badge_keyframes",i.textContent=`
      @keyframes downloadProfileBadgeIn {
        from { opacity: 0; transform: scale(0.6); }
        to   { opacity: 1; transform: scale(1); }
      }
    `,document.head.appendChild(i)}}function O(){if(!w.size){l("[Profile Badges] scan: skip, no shop ids cached");return}const e=document.querySelectorAll('a[href*="/video/"]'),t=new Map;let o=0,n=0;for(const i of e){const s=i.href.match(/\/video\/(\d+)/);if(!s)continue;const c=s[1];if(!w.has(c))continue;o++;let a=i,r=null;for(let p=0;p<6&&a;p++){const h=a.getBoundingClientRect(),u=!!a.querySelector("img");if(h.width>=140&&h.width<=480&&h.height>=180&&h.height<=900&&u){r=a;break}if(h.width>480)break;a=a.parentElement}if(!r)continue;const d=`${c}@${Math.round(r.getBoundingClientRect().left)},${Math.round(r.getBoundingClientRect().top)}`;t.has(d)||(t.set(d,r),Et(r,c),n++)}l("[Profile Badges] scan: anchors=",e.length," shopAnchors=",o," badged=",n);{const i=new Set;document.querySelectorAll('a[href*="/video/"]').forEach(a=>{const r=a.href.match(/\/video\/(\d+)/);r&&i.add(r[1])});const s=[],c=[];i.forEach(a=>{w.has(a)||(re.has(a)?c.push(a):s.push(a))}),l("[Profile Badges] scan-detail: domTotal=",i.size," shopCached=",w.size," confirmedNonShop=",c.length," unknownInDom=",s.length," unknownIds=",s.slice(0,40))}}function ee(){document.querySelectorAll("."+xe).forEach(e=>e.remove())}let Te=0;function Qe(){if(!le(location.href)||Date.now()-Te<4e3)return;Te=Date.now(),l("[Profile Badges] nudging TikTok to re-fetch posts");const e=window.scrollY,t=[400,1200,2400,4e3];t.forEach((o,n)=>{setTimeout(()=>window.scrollTo({top:e+o,behavior:"auto"}),n*250)}),setTimeout(()=>window.scrollTo({top:e,behavior:"auto"}),t.length*250+120)}let J=0;function Ze(){if(!le(location.href)||J>=3)return;const e=new Set;document.querySelectorAll('a[href*="/video/"]').forEach(n=>{const i=n.href.match(/\/video\/(\d+)/);i&&e.add(i[1])});let t=0;e.forEach(n=>{w.has(n)&&t++});const o=e.size-t;if(o>4){J++,l("[Profile Badges] DOM has",e.size,"unique ids,",t,"in cache,",o,"missing → nudge again");{const n=[];e.forEach(i=>{w.has(i)||n.push(i)}),l("[Profile Badges] missing-detail: attempt=",J," missingIds=",n.slice(0,60))}Te=0,Qe()}else l("[Profile Badges] maybeRescan: missing<=4, no nudge (domTotal=",e.size," matched=",t," attempt=",J,")")}function Pe(){const e=le(location.href),t=Pt(location.href);if(l("[Profile Badges] ensureProfileShopBadges",{url:location.href,isProfile:e,lastUrl:R,lastUser:G,currentUser:t,idsCached:w.size}),!e&&t&&t===G){b&&(b.disconnect(),b=null),ee();return}if(!e){R&&(b==null||b.disconnect(),b=null,w.clear(),ae.clear(),G="",ee(),R="");return}if(e&&t&&t===G&&w.size>0){R=location.href,l("[Profile Badges] returning to same profile, re-scan with cached ids:",w.size),O(),Ze(),b||(b=new MutationObserver(()=>{if(!E()){b==null||b.disconnect(),b=null;return}O()}),b.observe(document.body,{childList:!0,subtree:!0}));return}if(R!==location.href){R=location.href,G=t||"",w.clear(),ae.clear(),J=0,ee();const o=n=>{const i=Ct();if(l("[Profile Badges] extract attempt",n,"→ SIGI ids:",i.size),i.size)i.forEach(s=>w.add(s)),l("[Download] Profile shop video ids (SIGI):",w.size),O();else if(n<2)setTimeout(()=>o(n+1),500);else{l("[Profile Badges] SIGI empty → requesting the server resolver + nudge re-fetch");const s=Xe(location.href);s&&St(s),Qe()}};o(0)}else O();b||(b=new MutationObserver(()=>{if(!E()){b==null||b.disconnect(),b=null;return}O()}),b.observe(document.body,{childList:!0,subtree:!0}))}const F="__download_product_popover",At=340,j=8,me=16;function It(e,t){var D,U,$e,Be;(D=document.getElementById(F))==null||D.remove();const o=Se[y.language].content,n=y.language==="vi"?"Sản phẩm":"Product",i=o.modalTitle||"PRODUCT INFO",s=o.modalReload||"Reload",c=o.modalClose||"Close",a=o.modalProductLabel||"Product",r=o.modalSoldLabel||"Sold",d=o.modalOpenShop||"Open on TikTok Shop →",p=document.createElement("div");p.id=F,p.style.cssText=`
    position: fixed; inset: 0; z-index: 2147483647;
    background: rgba(0,0,0,0.55);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    animation: downloadPopoverFadeIn 0.15s ease-out;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'DM Sans', sans-serif;
  `;const h=Ee,u=document.createElement("div");u.dataset.side="top",u.style.cssText=`
    position: fixed; left: 0; top: 0; visibility: hidden;
    width: ${At}px; max-width: calc(100vw - ${me*2}px);
    max-height: calc(100vh - ${me*2}px); overflow: hidden;
    background: linear-gradient(180deg, rgba(20,20,28,0.97) 0%, rgba(10,10,15,0.97) 100%);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border: 1px solid rgba(34,211,238,0.25);
    border-radius: 16px;
    box-shadow:
      0 24px 64px rgba(0,0,0,0.6),
      0 0 30px rgba(34,211,238,0.18),
      inset 0 1px 0 rgba(255,255,255,0.08);
    color: #fff;
    display: flex; flex-direction: column;
    transform-origin: top left;
  `;const k=e.price||e.originalPrice?`
    <div style="display:flex; align-items:baseline; gap:8px; flex-wrap:wrap; margin-bottom:6px;">
      ${e.price?`<div style="font-size: 22px; font-weight: 800; color: #f472b6; line-height:1.1;">${m(e.price)}</div>`:""}
      ${e.originalPrice?`<div style="font-size: 12px; opacity: 0.55; text-decoration: line-through;">${m(e.originalPrice)}</div>`:""}
    </div>`:"",A=e.tags&&e.tags.length?`
    <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px;">
      ${e.tags.slice(0,4).map(f=>`<span style="
        display:inline-flex; align-items:center; padding: 2px 8px; border-radius: 4px;
        background: linear-gradient(135deg, rgba(34,197,94,0.18), rgba(34,197,94,0.08));
        border: 1px solid rgba(34,197,94,0.35); color: #4ade80;
        font-size: 10px; font-weight: 700; letter-spacing: 0.3px; text-transform: uppercase;
      ">${m(f)}</span>`).join("")}
    </div>`:"",v=[];e.rating&&v.push(`★ ${m(e.rating)}${e.reviewCount?` <span style="opacity:0.6;">(${m(e.reviewCount)})</span>`:""}`),e.soldCount&&v.push(`${m(e.soldCount)} ${m(r.toLowerCase())}`);const B=v.length?`
    <div style="display:flex; align-items:center; gap:10px; font-size: 12px; opacity: 0.85; margin-top: 8px;">
      ${v.join('<span style="opacity:0.4;">|</span>')}
    </div>`:"",g=!!e.imageUrl,P=(e.shopName||"").trim().toLowerCase(),I=!!e.shopName&&P!=="tiktok shop",de=g?`
    <div style="aspect-ratio: 1/1; width: 100%; background: #000; display: flex; align-items: center; justify-content: center; overflow: hidden;">
      <img src="${m(e.imageUrl)}" alt="" style="width:100%; height:100%; object-fit:contain; display:block;" referrerpolicy="no-referrer" />
    </div>`:`
    <div style="
      width: 100%; padding: 22px 12px; display:flex; align-items:center; gap:10px;
      background: linear-gradient(135deg, rgba(34,211,238,0.10) 0%, rgba(236,72,153,0.10) 100%);
      border-bottom: 1px solid rgba(255,255,255,0.06);
    ">
      <img src="${h}" alt="" style="width:34px;height:34px;border-radius:999px;background:#fff;padding:6px;box-sizing:border-box;flex-shrink:0;" />
      <div style="flex:1; min-width:0;">
        <div style="font-size:11px; opacity:0.65;">${m(a)}</div>
        <div style="font-size:13px; font-weight:600; line-height:1.3; margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
          ${m(e.title||n)}
        </div>
      </div>
    </div>`;u.innerHTML=`
    <!-- Header -->
    <div style="display:flex; align-items:center; gap:8px; padding:11px 12px; border-bottom: 1px solid rgba(255,255,255,0.08); flex-shrink: 0;">
      <img src="${h}" alt="" style="width:18px;height:18px;border-radius:999px;background:#fff;padding:3px;box-sizing:border-box;" />
      <span style="font-weight:700; font-size:11px; letter-spacing:0.6px;">${m(i.toUpperCase())}</span>
      <div style="flex:1;"></div>
      <button id="__download_product_popup_reload" type="button" aria-label="${m(s)}" style="
        padding: 3px 9px; border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.16);
        background: rgba(255,255,255,0.06); color: #fff;
        font-size: 10px; cursor: pointer; line-height: 1;
        display: inline-flex; align-items: center; gap: 4px;
      ">⟳ ${m(s)}</button>
      <button id="__download_product_popup_close" type="button" aria-label="${m(c)}" style="
        width: 24px; height: 24px; border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.16);
        background: rgba(255,255,255,0.06); color: #fff;
        font-size: 12px; cursor: pointer; padding: 0;
        display: inline-flex; align-items: center; justify-content: center;
      ">✕</button>
    </div>

    <!-- Scrollable body -->
    <div style="overflow-y: auto; -webkit-overflow-scrolling: touch;">
      ${de}

      ${g?`
      <!-- Body (shown when there's an image; otherwise the image-block already
           contains the title) -->
      <div style="padding: 12px 14px;" data-tpp-body="1">
        <div style="font-size: 10px; letter-spacing: 0.4px; text-transform: uppercase; opacity: 0.55; margin-bottom: 4px;">${m(a)}</div>
        ${k}
        ${A}
        <div style="font-size: 13px; font-weight: 600; line-height: 1.4; margin-bottom: 4px; word-break: break-word;">
          ${m(e.title||n)}
        </div>
        ${I?`<div style="font-size: 11px; opacity: 0.7;">by ${m(e.shopName)}</div>`:""}
        ${B}
        ${e.description?`
          <div style="font-size: 11px; line-height: 1.55; opacity: 0.8; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.08); word-break: break-word; max-height: 6em; overflow-y: auto;">
            ${m(e.description.slice(0,400))}
          </div>`:""}
      </div>`:`
      ${k||A||B||e.description||I?`
      <!-- Compact body for no-image case: only render if there's something
           non-trivial to show beyond title. -->
      <div style="padding: 10px 14px;" data-tpp-body="1">
        ${k}
        ${A}
        ${I?`<div style="font-size: 11px; opacity: 0.7;">by ${m(e.shopName)}</div>`:""}
        ${B}
        ${e.description?`
          <div style="font-size: 11px; line-height: 1.55; opacity: 0.8; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.08); word-break: break-word; max-height: 6em; overflow-y: auto;">
            ${m(e.description.slice(0,400))}
          </div>`:""}
      </div>`:""}`}
    </div>

    <!-- CTA footer -->
    <div style="padding: 10px 12px 12px; flex-shrink: 0; border-top: 1px solid rgba(255,255,255,0.06);">
      <button id="__download_product_popup_open" type="button" style="
        width: 100%; padding: 11px 16px; border: none; border-radius: 999px;
        background: linear-gradient(135deg, #22d3ee 0%, #ec4899 100%);
        color: #fff; font-size: 13px; font-weight: 700; cursor: pointer;
        box-shadow: 0 6px 20px rgba(236,72,153,0.4), inset 0 1px 0 rgba(255,255,255,0.25);
        transition: transform 0.15s, box-shadow 0.15s, filter 0.15s;
      ">${m(d)}</button>
    </div>
  `,p.appendChild(u),document.body.appendChild(p);const N=()=>{const f=t==null?void 0:t.getBoundingClientRect(),_=u.getBoundingClientRect(),Q=window.innerWidth,z=window.innerHeight,C=me;let pe=f?f.left:(Q-_.width)/2;pe=Math.max(C,Math.min(pe,Q-_.width-C));let L,Z="top";if(f){const Me=f.top-j-C,De=z-f.bottom-j-C;Me>=_.height?L=f.top-j-_.height:De>=_.height?(L=f.bottom+j,Z="bottom"):Me>=De?L=Math.max(C,f.top-j-_.height):(L=Math.min(z-_.height-C,f.bottom+j),Z="bottom")}else L=(z-_.height)/2;L=Math.max(C,Math.min(L,z-_.height-C)),u.style.left=`${Math.round(pe)}px`,u.style.top=`${Math.round(L)}px`,u.style.visibility="visible",u.dataset.side=Z,u.style.animation=Z==="top"?"downloadPopoverSlideUp 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)":"downloadPopoverSlideDown 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)"};requestAnimationFrame(N);const M=()=>{document.body.contains(p)&&N()};window.addEventListener("resize",M),window.addEventListener("scroll",M,!0);const $=()=>{document.body.contains(p)&&(u.style.animation=u.dataset.side==="top"?"downloadPopoverSlideDown 0.15s ease-in reverse":"downloadPopoverSlideUp 0.15s ease-in reverse",p.style.animation="downloadPopoverFadeIn 0.15s ease-in reverse",setTimeout(()=>{p.remove(),window.removeEventListener("resize",M),window.removeEventListener("scroll",M,!0),document.removeEventListener("keydown",W,!0)},130))},W=f=>{f.key==="Escape"&&(f.stopPropagation(),$())};if(document.addEventListener("keydown",W,!0),p.addEventListener("click",f=>{f.target===p&&$()}),(U=u.querySelector("#__download_product_popup_close"))==null||U.addEventListener("click",f=>{f.stopPropagation(),$()}),($e=u.querySelector("#__download_product_popup_reload"))==null||$e.addEventListener("click",f=>{f.stopPropagation(),Y="",oe="",S=!1,ne(),$(),setTimeout(()=>{E()&&ce()},50)}),(Be=u.querySelector("#__download_product_popup_open"))==null||Be.addEventListener("click",f=>{if(f.stopPropagation(),e.url)try{chrome.runtime.sendMessage({type:"OPEN_PRODUCT_TAB",url:e.url})}catch{window.open(e.url,"_blank","noopener,noreferrer")}$()}),!document.getElementById("__download_product_popup_keyframes")){const f=document.createElement("style");f.id="__download_product_popup_keyframes",f.textContent=`
      @keyframes downloadPopoverFadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes downloadPopoverSlideUp {
        from { opacity: 0; transform: translateY(8px) scale(0.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes downloadPopoverSlideDown {
        from { opacity: 0; transform: translateY(-8px) scale(0.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      #${F} #__download_product_popup_open:hover {
        transform: translateY(-1px);
        box-shadow: 0 10px 26px rgba(236,72,153,0.5), inset 0 1px 0 rgba(255,255,255,0.3);
        filter: brightness(1.05);
      }
      #${F} #__download_product_popup_reload:hover,
      #${F} #__download_product_popup_close:hover {
        background: rgba(255,255,255,0.12);
      }
      #${F} .tpp-skeleton {
        display: inline-block;
        height: 12px; min-width: 60px; border-radius: 4px;
        background: linear-gradient(90deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0.06) 100%);
        background-size: 200% 100%;
        animation: tppShimmer 1.4s ease-in-out infinite;
      }
      @keyframes tppShimmer {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `,document.head.appendChild(f)}if(e.url&&/\/shop\/[^/]+\/pdp\//.test(e.url)&&!(e.price&&e.rating&&e.soldCount)&&($t(u),E()))try{chrome.runtime.sendMessage({type:"GET_TIKTOK_PDP_INFO",url:e.url},f=>{var C;if(!document.body.contains(u))return;if(chrome.runtime.lastError){l("[Download] PDP fetch BG error:",chrome.runtime.lastError.message),te(u);return}if(!(f!=null&&f.success)||!f.data){l("[Download] PDP fetch returned no data:",f==null?void 0:f.error),te(u);return}l("[Download] PDP info",JSON.stringify(f.data));const _=f.data.title,Q=!!_&&_.length>(((C=e.title)==null?void 0:C.length)||0)+10,z={...e,title:Q?_:e.title,price:e.price||f.data.price,originalPrice:e.originalPrice||f.data.originalPrice,soldCount:e.soldCount||f.data.soldCount,rating:e.rating||f.data.rating,reviewCount:e.reviewCount||f.data.reviewCount,tags:e.tags&&e.tags.length?e.tags:f.data.tags,description:e.description||f.data.description,imageUrl:e.imageUrl||f.data.imageUrl};Mt(u,z)})}catch(f){l("[Download] PDP fetch sendMessage failed:",String(f)),te(u)}}function $t(e,t){if(e.querySelector('[data-tpp-skeleton="1"]'))return;const o=e.querySelector('[data-tpp-body="1"]')??Bt(e);if(!o)return;const n=document.createElement("div");n.dataset.tppSkeleton="1",n.style.cssText=`
    display:flex; gap:10px; align-items:center; margin-top:8px;
    padding-top:8px; border-top: 1px solid rgba(255,255,255,0.06);
  `,n.innerHTML=`
    <span class="tpp-skeleton" style="min-width:90px;"></span>
    <span class="tpp-skeleton" style="min-width:50px;"></span>
    <span class="tpp-skeleton" style="min-width:70px;"></span>
  `,o.appendChild(n)}function te(e){var t;(t=e.querySelector('[data-tpp-skeleton="1"]'))==null||t.remove()}function Bt(e){const t=e.querySelectorAll('div[style*="padding"]');return t[t.length-1]||null}function Mt(e,t){te(e);const o=e.querySelector('[data-tpp-body="1"]');if(!o)return;const n=Se[y.language].content,i=n.modalSoldLabel||"Sold",s=n.modalProductLabel||"Product",c=y.language==="vi"?"Sản phẩm":"Product",a=!!t.shopName&&t.shopName.trim().toLowerCase()!=="tiktok shop",r=t.price||t.originalPrice?`
    <div style="display:flex; align-items:baseline; gap:8px; flex-wrap:wrap; margin-bottom:6px;">
      ${t.price?`<div style="font-size: 22px; font-weight: 800; color: #f472b6; line-height:1.1;">${m(t.price)}</div>`:""}
      ${t.originalPrice?`<div style="font-size: 12px; opacity: 0.55; text-decoration: line-through;">${m(t.originalPrice)}</div>`:""}
    </div>`:"",d=t.tags&&t.tags.length?`
    <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px;">
      ${t.tags.slice(0,4).map(u=>`<span style="
        display:inline-flex; align-items:center; padding: 2px 8px; border-radius: 4px;
        background: linear-gradient(135deg, rgba(34,197,94,0.18), rgba(34,197,94,0.08));
        border: 1px solid rgba(34,197,94,0.35); color: #4ade80;
        font-size: 10px; font-weight: 700; letter-spacing: 0.3px; text-transform: uppercase;
      ">${m(u)}</span>`).join("")}
    </div>`:"",p=[];t.rating&&p.push(`★ ${m(t.rating)}${t.reviewCount?` <span style="opacity:0.6;">(${m(t.reviewCount)})</span>`:""}`),t.soldCount&&p.push(`${m(t.soldCount)} ${m(i.toLowerCase())}`);const h=p.length?`
    <div style="display:flex; align-items:center; gap:10px; font-size: 12px; opacity: 0.85; margin-top: 8px;">
      ${p.join('<span style="opacity:0.4;">|</span>')}
    </div>`:"";o.innerHTML=`
    <div style="font-size: 10px; letter-spacing: 0.4px; text-transform: uppercase; opacity: 0.55; margin-bottom: 4px;">${m(s)}</div>
    ${r}
    ${d}
    <div style="font-size: 13px; font-weight: 600; line-height: 1.4; margin-bottom: 4px; word-break: break-word;">
      ${m(t.title||c)}
    </div>
    ${a?`<div style="font-size: 11px; opacity: 0.7;">by ${m(t.shopName)}</div>`:""}
    ${h}
    ${t.description?`
      <div style="font-size: 11px; line-height: 1.55; opacity: 0.8; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.08); word-break: break-word; max-height: 6em; overflow-y: auto;">
        ${m(t.description.slice(0,400))}
      </div>`:""}
  `}function et(){const e=document.getElementById(K);if(!e){S=!1;return}const t=V(location.href),o=e.dataset.videoId||"";t&&o&&t!==o&&ne()}function m(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}document.readyState==="complete"||document.readyState==="interactive"?He():document.addEventListener("DOMContentLoaded",He);
;(()=>{const BC="__download_dl_btn";const dl=new WeakSet();let obs=null,poll=0;const RELOAD="Extension vừa được cập nhật. Hãy tải lại trang (F5)";function alive(){try{return!!(chrome.runtime&&chrome.runtime.id)}catch{return!1}}function stop(){try{obs&&obs.disconnect()}catch{}obs=null;if(poll){clearInterval(poll);poll=0}}function videoContainers(){const out=[];const seen=new WeakSet();document.querySelectorAll("video").forEach(v=>{try{const r=v.getBoundingClientRect();if(r.width<240||r.height<240)return;let p=v;for(let i=0;i<10&&p;i++){if(seen.has(p))break;const cs=getComputedStyle(p);if(cs.position==="relative"||cs.position==="absolute"||cs.position==="fixed"){if(!seen.has(p)){seen.add(p);out.push(p)}break}p=p.parentElement}}catch{}});return out}function inject(c){if(!c||c.querySelector("."+BC))return;let icon="";try{icon=chrome.runtime.getURL("icons/icon-32.png")}catch{}if(!icon){stop();return}try{if(getComputedStyle(c).position==="static")c.style.position="relative"}catch{}const b=document.createElement("div");b.className=BC;b.style.cssText="position:absolute;bottom:84px;right:14px;width:44px;height:44px;border-radius:50%;background:rgba(10,16,32,.94);display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 20px rgba(168,85,247,0.5),inset 0 0 0 1px rgba(255,255,255,0.2);transition:transform .2s;animation:downloadDlPulse 2.5s ease-in-out infinite;z-index:99999";b.title="Download · Tải video về máy";b.innerHTML='<img src="'+icon+'" alt="" style="display:block;width:30px;height:30px;object-fit:contain;"/>';b.addEventListener("click",click,true);b.addEventListener("mouseenter",function(){this.style.transform="scale(1.1)"});b.addEventListener("mouseleave",function(){this.style.transform="scale(1)"});c.appendChild(b);if(!document.getElementById("__download_dl_kf")){const s=document.createElement("style");s.id="__download_dl_kf";s.textContent="@keyframes downloadDlPulse{0%,100%{box-shadow:0 4px 20px rgba(168,85,247,0.5),inset 0 0 0 1px rgba(255,255,255,0.2)}50%{box-shadow:0 4px 28px rgba(34,211,238,0.7),inset 0 0 0 1px rgba(255,255,255,0.3)}}";document.head.appendChild(s)}}async function click(ev){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();const b=ev.currentTarget;if(!alive()){stop();toast("err",RELOAD);return}if(dl.has(b))return;dl.add(b);const url=extractUrl(b)||location.href;toast("dl","Đang tải video...");try{const r=await chrome.runtime.sendMessage({type:"TIKTOK_DOWNLOAD",url});if(r&&r.success)toast("ok","Đã tải xong");else toast("err","Lỗi: "+((r&&r.error)||"unknown"))}catch(e){toast("err",alive()?"Lỗi: "+(e.message||"unknown"):RELOAD)}finally{dl.delete(b)}}function extractUrl(b){if(/^\/@[^/]+\/video\/\d+/.test(location.pathname))return location.href;let e=b;for(let i=0;i<20&&e;i++){if(e.querySelector){const a=e.querySelector('a[href*="/video/"]');if(a)return a.href}e=e.parentElement}return null}function toast(t,m){let el=document.getElementById("__download_dl_toast");if(!el){el=document.createElement("div");el.id="__download_dl_toast";el.style.cssText="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.92);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(34,211,238,0.4);padding:14px 22px;border-radius:14px;color:#fff;font-family:-apple-system,sans-serif;font-size:14px;font-weight:600;box-shadow:0 12px 40px rgba(0,0,0,0.5),0 0 30px rgba(34,211,238,0.2);z-index:2147483647;pointer-events:none;display:flex;align-items:center;gap:10px;opacity:0;transition:opacity .25s";document.body.appendChild(el)}const ic=t==="dl"?"⬇":t==="ok"?"✓":"✗";const c=t==="err"?"#fb7185":t==="ok"?"#4ade80":"#22d3ee";el.style.borderColor="rgba("+(t==="err"?"251,113,133":t==="ok"?"74,222,128":"34,211,238")+",0.4)";el.innerHTML='<span style="font-size:20px;color:'+c+'">'+ic+"</span><span>"+m.replace(/[<>]/g,"")+"</span>";requestAnimationFrame(function(){el.style.opacity="1"});if(t!=="dl"){setTimeout(function(){el.style.opacity="0";setTimeout(function(){if(el.parentNode)el.remove()},300)},2200)}}function scan(){if(!alive()){stop();return}videoContainers().forEach(inject)}scan();setTimeout(scan,800);setTimeout(scan,2000);let sched=false;try{obs=new MutationObserver(function(){if(sched)return;sched=true;requestAnimationFrame(function(){sched=false;scan()})});obs.observe(document.body,{childList:true,subtree:true})}catch{}let lu=location.href;poll=setInterval(function(){if(!alive()){stop();return}if(location.href!==lu){lu=location.href;setTimeout(scan,500);setTimeout(scan,1500)}},1000)})();
