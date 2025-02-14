'use strict';

var utils = require('./utils');

function setWallpaper(settings, config) {
  // Grab the default wallpaper and convert it into a base64 string
  let devpixels = '';
  if (config.GAIA_DEV_PIXELS_PER_PX != '1') {
    devpixels = '@' + config.GAIA_DEV_PIXELS_PER_PX + 'x';
  }

  let wallpaper = utils.resolve(
    utils.joinPath(config.GAIA_DISTRIBUTION_DIR, 'wallpapers',
      'default' + devpixels + '.jpg'), config.GAIA_DIR);

  if (!wallpaper.exists()) {
    wallpaper = utils.resolve(
      utils.joinPath(config.GAIA_DISTRIBUTION_DIR, 'wallpapers', 'default.jpg'),
      config.GAIA_DIR);
  }

  if (!wallpaper.exists()) {
    wallpaper = utils.resolve(
      utils.joinPath('build', 'config', 'wallpaper_' +
        config.GAIA_DEVICE_TYPE + devpixels + '.jpg'), config.GAIA_DIR);
  }

  if (!wallpaper.exists()) {
    wallpaper = utils.resolve(
      utils.joinPath('build', 'config', 'wallpaper_' +
        config.GAIA_DEVICE_TYPE + '.jpg'), config.GAIA_DIR);
  }

  if (!wallpaper.exists()) {
    wallpaper = utils.resolve(
      utils.joinPath('build', 'config', 'wallpaper' + devpixels + '.jpg'),
      config.GAIA_DIR);
  }

  if (!wallpaper.exists()) {
    wallpaper = utils.resolve(
      utils.joinPath('build', 'config', 'wallpaper.jpg'),
      config.GAIA_DIR);
  }
  settings['wallpaper.image'] = utils.getFileAsDataURI(wallpaper);
}

function setTone(settings, config, toneType, name, l10nID) {
  let settingsKey, dir;
  switch (toneType) {
  case 'ringtone':
    settingsKey = 'dialer.ringtone';
    dir = 'shared/resources/media/ringtones/';
    break;
  case 'alerttone':
    settingsKey = 'notification.ringtone';
    dir = 'shared/resources/media/notifications/';
    break;
  default:
    throw new Error('unknown tone type: ' + toneType);
  }

  let tone = utils.resolve(dir + name, config.GAIA_DIR);

  settings[settingsKey] = utils.getFileAsDataURI(tone);
  settings[settingsKey + '.name'] = {l10nID: l10nID};
  settings[settingsKey + '.id'] = settings[settingsKey + '.default.id'] =
    'builtin:' + toneType + '/' + name.replace(/\.\w+$/, '');
}

function setMediatone(settings, config) {
  // Grab notifier_firefox.opus and convert it into a base64 string
  let mediatone_name = 'shared/resources/media/notifications/' +
    'notifier_firefox.opus';
  let mediatone = utils.resolve(mediatone_name,
    config.GAIA_DIR);

  settings['media.ringtone'] = utils.getFileAsDataURI(mediatone);
}

function setAlarmtone(settings, config) {
  // Grab ac_awake.opus and convert it into a base64 string
  let alarmtone_name = 'shared/resources/media/alarms/' +
    'ac_awake.opus';
  let alarmtone = utils.resolve(alarmtone_name,
    config.GAIA_DIR);

  settings['alarm.ringtone'] = utils.getFileAsDataURI(alarmtone);
}

function setRingtone(settings, config) {
  // Grab ringer_firefox.opus and convert it into a base64 string
  let ringtone_name = 'ringer_firefox.opus';
  let ringtone_l10nID = 'ringer_firefox2';
  setTone(settings, config, 'ringtone', ringtone_name, ringtone_l10nID);
}

function setNotification(settings, config) {
  // Grab notifier_firefox.opus and convert it into a base64 string
  let notification_name = 'notifier_firefox.opus';
  let notification_l10nID = 'notifier_firefox2';
  setTone(settings, config, 'alerttone', notification_name,
          notification_l10nID);
}

function deviceTypeSettings(settings, config) {
  // See if any override file exists and eventually override settings
  let override = utils.getFile(config.GAIA_DIR,
                  'build', 'config', config.GAIA_DEVICE_TYPE, 'settings.json');
  if (override.exists()) {
    let content = utils.getJSON(override);
    for (let key in content) {
      settings[key] = content[key];
    }
  }
}

function overrideRingtoneSettings(content, key) {
  // Override ringtone if ringtone, ringtone name, and ringtone ID properties
  // are available.
  if (content[key] && content[key + '.name'] && content[key + '.id']) {
    content[key + '.default.id'] = content[key + '.id'];
  } else if (content[key] || content[key + '.name'] || content[key + '.id']) {
    delete content[key];
    delete content[key + '.name'];
    delete content[key + '.id'];
    delete content[key + '.default.id'];
    throw new Error('ringtone not overridden because ' + key + ', ' +
                    key + '.name, or ' + key + '.id not found in custom ' +
                    '\'settings.json\'. All properties must be set.');
  }
}

function overrideSettings(settings, config) {
  // See if any override file exists and eventually override settings
  let override = utils.resolve(config.SETTINGS_PATH,
    config.GAIA_DIR);
  if (override.exists()) {
    let content = utils.getJSON(override);

    overrideRingtoneSettings(content, 'dialer.ringtone');
    overrideRingtoneSettings(content, 'notification.ringtone');

    for (let key in content) {
      settings[key] = content[key];
    }
  }
}

function setHomescreenURL(settings, config) {
  // 'homescreen' as default value of homescreen.appName
  let appName = 'homescreen';

  if (typeof(settings['homescreen.appName']) !== 'undefined') {
    appName = settings['homescreen.appName'];

    let homescreenExists = utils.existsInAppDirs(config.GAIA_APPDIRS, appName);

    if (!homescreenExists) {
      throw new Error('homescreen APP not found: ' + appName);
    }
    // no longer to use this settings so remove it.
    delete settings['homescreen.appName'];
  }
  settings['homescreen.manifestURL'] = utils.gaiaManifestURL(appName,
    config.GAIA_SCHEME, config.GAIA_PORT);
}

function writeSettings(settings, config) {
  // Finally write the settings file
  let profileDir = utils.getFile(config.PROFILE_DIR);
  let settingsFile = utils.getFile(config.PROFILE_DIR, 'settings.json');
  let defaultsSettings = utils.getFile(
    config.PROFILE_DIR, 'defaults', 'settings.json');

  utils.ensureFolderExists(profileDir);
  let content = JSON.stringify(settings);
  utils.writeContent(settingsFile, content + '\n');
  utils.log('settings.js', 'Writing settings file: ' + settingsFile.path);

  var defaultSettingFolder = utils.getFile(profileDir.path, 'defaults');
  utils.ensureFolderExists(defaultSettingFolder);
  utils.writeContent(defaultsSettings, content + '\n');
  utils.log('settings.js', 'Writing settings file: ' + defaultsSettings.path);
}

function execute(config) {
  var settingsFile = utils.getFile(config.GAIA_DIR, 'build', 'config',
    'common-settings.json');

  if (!settingsFile.exists()) {
    throw new Error('file not found: ' + settingsFile.path);
  }

  var settings = utils.getJSON(settingsFile);
  if (config.TARGET_BUILD_VARIANT != 'user') {
    // We want the console to be disabled
    // for device builds using the user variant.
    settings['debug.console.enabled'] = true;

    // Activate developer menu under the system menu when long pressing
    // the power button by default for devs.
    settings['developer.menu.enabled'] = true;
  }

  // Set the ftu manifest URL
  if (config.NOFTU === '0') {
    settings['ftu.manifestURL'] = utils.gaiaManifestURL('ftu',
      config.GAIA_SCHEME, config.GAIA_PORT);
  }

  // Set the ftu ping URL -- we set this regardless of NOFTU for now
  settings['ftu.pingURL'] = config.FTU_PING_URL;

  // The selected value for the level of data to share.
  settings['metrics.selectedMetrics.level'] = 'Basic';

  // Set the rocketbar URL
  settings['rocketbar.searchAppURL'] = utils.gaiaOriginURL('search',
    config.GAIA_SCHEME, config.GAIA_PORT) + '/index.html';

  // Set the new tab-page URL
  settings['rocketbar.newTabAppURL'] = utils.gaiaOriginURL('search',
    config.GAIA_SCHEME, config.GAIA_PORT) + '/index.html';

  settings['debugger.remote-mode'] = config.REMOTE_DEBUGGER === '1' ?
    'adb-only' : 'disabled';

  if (config.PRODUCTION === '1') {
    settings['feedback.url'] = 'https://input.mozilla.org/api/v1/feedback/';
    settings['debugger.remote-mode'] = 'disabled';
    settings['gaia.system.checkForUpdates'] = true;
  }

  if (config.PRODUCTION === '0') {
    settings['dom.mozApps.signed_apps_installable_from'] =
      'https://marketplace.firefox.com,https://marketplace.allizom.org';
    settings['devtools.pseudolocalization.enabled'] = true;
  }

  if (config.DOGFOOD === '1') {
    settings['debug.performance_data.dogfooding'] = true;
    settings['metrics.appusage.reportInterval'] = 24 * 60 * 60 * 1000;
    settings['metrics.selectedMetrics.level'] = 'Enhanced';
    settings['hud.hide'] = true;
    settings['devtools.overlay'] = true;
  }

  settings['language.current'] = config.GAIA_DEFAULT_LOCALE;

  if (config.DEVICE_DEBUG === '1') {
    settings['debugger.remote-mode'] = 'adb-devtools';
  }

  if (config.NO_LOCK_SCREEN === '1') {
    settings['lockscreen.enabled'] = false;
    settings['lockscreen.locked'] = false;
  }

  var screenTimeout = parseInt(config.SCREEN_TIMEOUT, 10);
  if (screenTimeout >= 0) {
    settings['screen.timeout'] = screenTimeout;
  }

  setWallpaper(settings, config);
  setMediatone(settings, config);
  setAlarmtone(settings, config);
  setRingtone(settings, config);
  setNotification(settings, config);
  deviceTypeSettings(settings, config);
  overrideSettings(settings, config);
  setHomescreenURL(settings, config);
  writeSettings(settings, config);

  return settings;
}

exports.execute = execute;
exports.setWallpaper = setWallpaper;
exports.setMediatone = setMediatone;
exports.setAlarmtone = setAlarmtone;
exports.setRingtone = setRingtone;
exports.setNotification = setNotification;
exports.deviceTypeSettings = deviceTypeSettings;
exports.overrideSettings = overrideSettings;
exports.writeSettings = writeSettings;
exports.setHomescreenURL = setHomescreenURL;
