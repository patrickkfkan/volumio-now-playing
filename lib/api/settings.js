const np = require(nowPlayingPluginLibRoot + '/np');

async function getSettings({namespace}) {
    switch(namespace) {
        case 'screen.nowPlaying':
        case 'background': 
            return np.getConfigValue(namespace, {}, true);
        case 'theme':
            return np.getConfigValue(namespace, 'default');
        case 'performance':
            return np.getConfigValue('performance', null, true);
        default:
            return null;
    }
}

module.exports = {
    getSettings
};
