"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = exports.preview = exports.volumio = exports.index = void 0;
const ejs_1 = __importDefault(require("ejs"));
const NowPlayingContext_1 = __importDefault(require("../lib/NowPlayingContext"));
const System_1 = require("../lib/utils/System");
const MetadataAPI_1 = __importDefault(require("../lib/api/MetadataAPI"));
const SettingsAPI_1 = __importDefault(require("../lib/api/SettingsAPI"));
const WeatherAPI_1 = __importDefault(require("../lib/api/WeatherAPI"));
const UnsplashAPI_1 = __importDefault(require("../lib/api/UnsplashAPI"));
const CommonSettingsLoader_1 = __importDefault(require("../lib/config/CommonSettingsLoader"));
const now_playing_common_1 = require("now-playing-common");
const APIs = {
    metadata: MetadataAPI_1.default,
    settings: SettingsAPI_1.default,
    weather: WeatherAPI_1.default,
    unsplash: UnsplashAPI_1.default
};
async function index(req, res) {
    const html = await renderView('index', req, {
        settings: {
            [now_playing_common_1.CommonSettingsCategory.NowPlayingScreen]: CommonSettingsLoader_1.default.get(now_playing_common_1.CommonSettingsCategory.NowPlayingScreen),
            [now_playing_common_1.CommonSettingsCategory.IdleScreen]: CommonSettingsLoader_1.default.get(now_playing_common_1.CommonSettingsCategory.IdleScreen),
            [now_playing_common_1.CommonSettingsCategory.Background]: CommonSettingsLoader_1.default.get(now_playing_common_1.CommonSettingsCategory.Background),
            [now_playing_common_1.CommonSettingsCategory.ActionPanel]: CommonSettingsLoader_1.default.get(now_playing_common_1.CommonSettingsCategory.ActionPanel),
            [now_playing_common_1.CommonSettingsCategory.Theme]: CommonSettingsLoader_1.default.get(now_playing_common_1.CommonSettingsCategory.Theme),
            [now_playing_common_1.CommonSettingsCategory.Performance]: CommonSettingsLoader_1.default.get(now_playing_common_1.CommonSettingsCategory.Performance),
            [now_playing_common_1.CommonSettingsCategory.Localization]: CommonSettingsLoader_1.default.get(now_playing_common_1.CommonSettingsCategory.Localization)
        }
    });
    res.send(html);
}
exports.index = index;
async function volumio(req, res) {
    const html = await renderView('volumio', req, {
        nowPlayingUrl: getNowPlayingURL(req)
    });
    res.send(html);
}
exports.volumio = volumio;
async function preview(req, res) {
    const html = await renderView('preview', req, {
        nowPlayingUrl: getNowPlayingURL(req)
    });
    res.send(html);
}
exports.preview = preview;
async function api(apiName, method, params, res) {
    const api = apiName && method ? APIs[apiName] : null;
    const fn = api && typeof api[method] === 'function' ? api[method] : null;
    if (fn) {
        try {
            const result = await fn.call(api, params);
            res.json({
                success: true,
                data: result
            });
        }
        catch (e) {
            NowPlayingContext_1.default.getLogger().error(NowPlayingContext_1.default.getErrorMessage(`[now-playing] API endpoint ${apiName}/${method} returned error:`, e, true));
            res.json({
                success: false,
                error: e.message || e
            });
        }
    }
    else {
        res.json({
            success: false,
            error: `Invalid API endpoint ${apiName}/${method}`
        });
    }
}
exports.api = api;
function getNowPlayingURL(req) {
    return `${req.protocol}://${req.hostname}:${NowPlayingContext_1.default.getConfigValue('port')}`;
}
function renderView(name, req, data = {}) {
    if (!data.i18n) {
        data.i18n = NowPlayingContext_1.default.getI18n.bind(NowPlayingContext_1.default);
    }
    if (!data.host) {
        data.host = `${req.protocol}://${req.hostname}:3000`;
    }
    if (!data.pluginInfo) {
        data.pluginInfo = (0, System_1.getPluginInfo)();
    }
    return new Promise((resolve, reject) => {
        ejs_1.default.renderFile(`${__dirname}/views/${name}.ejs`, data, {}, (err, str) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(str);
            }
        });
    });
}
//# sourceMappingURL=Handler.js.map