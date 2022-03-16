const np = require(nowPlayingPluginLibRoot + '/np');

async function getCustomStyles() {
    return np.getConfigValue('styles', {}, true);
}

async function getTheme() {
    return np.getConfigValue('theme', 'default');
}

module.exports = {
    getCustomStyles,
    getTheme
};
