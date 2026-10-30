(function () {
  'use strict';

  // This runs before the page-side feature hook. With no trusted state yet,
  // extension controls stay hidden. The isolated loader later relays the
  // background-verified license state through this event.
  const STYLE_ID = '__download_license_gate_main';

  function apply(licensed) {
    const root = document.documentElement;
    if (!root) return;
    root.dataset.tikToolkitLicensed = licensed ? 'true' : 'false';
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      root.appendChild(style);
    }
    style.textContent = licensed ? '' : [
      '[id^="__download_"], [class^="__download_"], [class*=" __download_"]',
      '{display:none!important;}',
    ].join('');
  }

  apply(false);
  window.addEventListener('__DOWNLOAD_LICENSE_STATE__', (event) => {
    apply(!!(event && event.detail && event.detail.licensed === true));
  });
})();
