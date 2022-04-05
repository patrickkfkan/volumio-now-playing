const locales = require('windows-locale');
const ct = require('countries-and-timezones');
const util = require('./util');
const np = require(nowPlayingPluginLibRoot + '/np');

const DEFAULT_LOCALIZATION_SETTINGS = {
    localeType: 'volumio',
    locale: 'en-US',
    timezoneType: 'client',
    timezone: 'Etc/UTC'
};

function getLocaleList() {
    let localeList = np.get('localeList');
    if (!localeList) {
        localeList = [];
        for (const lc of Object.values(locales)) {
            localeList.push({
                value: lc.tag,
                label: lc.language + (lc.location ? ` (${lc.location})` : '') + ` - ${lc.tag}`
            });
        }
        np.set('localeList', localeList);
    }
    return localeList;
}

function getTimezoneList() {
    let timezoneList = np.get('timezoneList');
    if (!timezoneList) {
        timezoneList = [];
        for (const tz of Object.values(ct.getAllTimezones())) {
            timezoneList.push({
                value: tz.name,
                label: tz.name + ` (GMT${tz.utcOffsetStr})`
            });
        }
        np.set('timezoneList', timezoneList);
    }
    return timezoneList;
}

function getLocalizationSettings() {
    let localization = Object.assign({}, DEFAULT_LOCALIZATION_SETTINGS, np.getConfigValue('localization', {}, true));
    localization.volumioLocale = np.getLanguageCode().replace('_', '-');

    return localization;
}


module.exports = {
    getLocaleList,
    getTimezoneList,
    getLocalizationSettings
};
