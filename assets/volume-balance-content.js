(function () {
  'use strict';

  // Runs in the isolated content-script world, where chrome.storage is
  // available. It publishes the setting as a DOM attribute for the MAIN-world
  // audio engine; a single engine is important because a media element can only
  // be connected safely to one Web Audio source graph.
  const STORAGE_KEY = 'volumeBalanceSettings';
  const LICENSE_FLAG_KEY = 'tik_license_flag';
  const MIN_LEVEL = 0;
  const MAX_LEVEL = 200;
  const DEFAULT_LEVEL = 100;
  let settings = { enabled: false, level: DEFAULT_LEVEL };
  let licensed = false;

  function cleanSettings(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const level = Math.round(Number(source.level));
    return {
      enabled: source.enabled === true,
      level: Number.isFinite(level) ? Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, level)) : DEFAULT_LEVEL,
    };
  }

  function publishSettings() {
    try {
      // Do not leave an old enabled setting affecting a TikTok video after the
      // key expires or is removed. The page-side audio engine will restore the
      // native media level when it receives enabled:false.
      const effective = { ...settings, enabled: licensed && settings.enabled === true };
      document.documentElement.setAttribute('data-download-volume-balance', JSON.stringify(effective));
      window.dispatchEvent(new Event('__DOWNLOAD_VOLUME_BALANCE_SYNC__'));
    } catch {}
  }

  try {
    chrome.storage.local.get([STORAGE_KEY, LICENSE_FLAG_KEY], (result) => {
      settings = cleanSettings(result && result[STORAGE_KEY]);
      licensed = !!(result && result[LICENSE_FLAG_KEY] && result[LICENSE_FLAG_KEY].licensed === true);
      publishSettings();
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || (!changes[STORAGE_KEY] && !changes[LICENSE_FLAG_KEY])) return;
      if (changes[STORAGE_KEY]) settings = cleanSettings(changes[STORAGE_KEY].newValue);
      if (changes[LICENSE_FLAG_KEY]) licensed = !!(changes[LICENSE_FLAG_KEY].newValue && changes[LICENSE_FLAG_KEY].newValue.licensed === true);
      publishSettings();
    });
  } catch {}
})();
