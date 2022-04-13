const np = require(nowPlayingPluginLibRoot + '/np');
const config = require(nowPlayingPluginLibRoot + '/config');

async function getSettings({namespace}) {
    switch(namespace) {
        case 'screen.nowPlaying':
        case 'background': 
            return np.getConfigValue(namespace, {}, true);
        case 'theme':
            return np.getConfigValue(namespace, 'default');
        case 'performance':
            return np.getConfigValue('performance', null, true);
        case 'localization':
            return config.getLocalizationSettings();
        default:
            throw new Exception('Unknown namespace.');
    }
}

module.exports = {
    getSettings
};
