'use strict';

const ejs = require('ejs');
const np = require(nowPlayingPluginLibRoot + '/np');

async function index(req, res) {
    let host = `${req.protocol}://${ req.hostname }:3000`;
    let html = await renderView('index', {
        host,
        styles: np.getConfigValue('styles', {}, true)
    });
    res.send(html);
}

async function volumio(req, res) {
    let host = `${req.protocol}://${ req.hostname }:3000`;
    let nowPlayingUrl = `${req.protocol}://${ req.hostname }:${ np.getConfigValue('port', 4004) }`;
    let html = await renderView('volumio', {
        host,
        nowPlayingUrl,
    });
    res.send(html);
}

async function preview(req, res) {
    let html = await renderView('preview', {
        host: `${req.protocol}://${ req.hostname }:${ np.getConfigValue('port', 4004) }`
    });
    res.send(html);
}

function renderView(name, data = {}) {
    if (!data.i18n) {
        data.i18n = np.getI18n.bind(np);
    }
    return new Promise( (resolve, reject) => {
        ejs.renderFile(`${ __dirname }/../views/${ name }.ejs`, data, {}, (err, str) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(str);
            }
        });
    });
}

module.exports = { index, volumio, preview };