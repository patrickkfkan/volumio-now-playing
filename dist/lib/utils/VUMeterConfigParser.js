"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _VUMeterConfigParser_parseExtendedConfig, _VUMeterConfigParser_parsePosition, _VUMeterConfigParser_parseSize, _VUMeterConfigParser_rgbToHex, _VUMeterConfigParser_parseColor, _VUMeterConfigParser_parsePlayInfoTextElement, _VUMeterConfigParser_getConfigProp;
Object.defineProperty(exports, "__esModule", { value: true });
const NowPlayingContext_1 = __importDefault(require("../NowPlayingContext"));
const configparser_1 = __importDefault(require("configparser"));
const System_1 = require("./System");
const VUMeterTemplateMonitor_1 = require("./VUMeterTemplateMonitor");
const DEFAULT_FONTS = {
    light: 'Lato-Light.ttf',
    regular: 'Lato-Regular.ttf',
    bold: 'Lato-Bold.ttf'
};
class VUMeterConfigParser {
    static getConfig(template) {
        const appUrl = (0, System_1.getPluginInfo)().appUrl;
        const templateUrl = `${appUrl}/vumeter/${template}`;
        try {
            const templateDir = `${VUMeterTemplateMonitor_1.VU_METER_TEMPLATE_PATH}/${template}`;
            const configPath = `${templateDir}/meters.txt`;
            if (!(0, System_1.dirExists)(templateDir)) {
                throw Error(NowPlayingContext_1.default.getI18n('NOW_PLAYING_ERR_VU_METER_TEMPLATE_NOT_FOUND', template));
            }
            if (!(0, System_1.fileExists)(configPath)) {
                throw Error(NowPlayingContext_1.default.getI18n('NOW_PLAYING_ERR_VU_METER_CONF_NOT_FOUND', template));
            }
            const config = new configparser_1.default();
            config.read(configPath);
            if (config.sections().length === 0) {
                throw Error(`No meters defined in ${template}`);
            }
            const meters = config.sections().reduce((result, section) => {
                const meterType = __classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'meter.type');
                const channels = Number(__classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'channels'));
                if (meterType !== 'linear' && meterType !== 'circular') {
                    throw Error(`Unknown meter type: ${meterType}`);
                }
                if (isNaN(channels) || (channels !== 1 && channels !== 2)) {
                    throw Error(`Invalid channels value: ${channels}`);
                }
                if (meterType === 'linear' && channels !== 2) {
                    throw Error(`Invalid channels value '${channels} for meter type '${meterType}'`);
                }
                const screenBackground = __classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'screen.bgr', null);
                const foreground = __classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'fgr.filename', null);
                const meterBase = {
                    template,
                    name: section,
                    type: meterType,
                    meter: {
                        x: Number(__classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'meter.x', 0)),
                        y: Number(__classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'meter.y', 0))
                    },
                    channels,
                    uiRefreshPeriod: Number(__classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'ui.refresh.period', 0.05)),
                    images: {
                        background: `${templateUrl}/${__classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'bgr.filename')}`,
                        foreground: foreground ? `${templateUrl}/${foreground}` : null,
                        indicator: `${templateUrl}/${__classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'indicator.filename')}`,
                        screenBackground: screenBackground ? `${templateUrl}/${screenBackground}` : null
                    }
                };
                let meter = null;
                if (meterType === 'linear') {
                    const directionValue = __classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'direction', null);
                    let direction;
                    switch (directionValue) {
                        case 'bottom-top':
                        case 'top-bottom':
                        case 'center-edges':
                        case 'edges-center':
                            direction = directionValue;
                            break;
                        default:
                            direction = 'left-right';
                    }
                    const flipLeftX = __classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'flip.left.x', null);
                    const flipRightX = __classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'flip.right.x', null);
                    meter = {
                        ...meterBase,
                        type: 'linear',
                        channels: 2,
                        left: {
                            x: Number(__classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'left.x')),
                            y: Number(__classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'left.y'))
                        },
                        right: {
                            x: Number(__classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'right.x')),
                            y: Number(__classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'right.y'))
                        },
                        position: {
                            regular: Number(__classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'position.regular')),
                            overload: Number(__classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'position.overload', 0))
                        },
                        stepWidth: {
                            regular: Number(__classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'step.width.regular')),
                            overload: Number(__classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'step.width.overload', 0))
                        },
                        direction,
                        flipLeft: {
                            x: flipLeftX === 'True'
                        },
                        flipRight: {
                            x: flipRightX === 'True'
                        }
                    };
                    const indicatorType = __classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'indicator.type', null);
                    if (indicatorType === 'single') {
                        meter.indicatorType = indicatorType;
                    }
                }
                else if (meterType === 'circular') {
                    const circularMeterBase = {
                        ...meterBase,
                        type: 'circular',
                        stepsPerDegree: Number(__classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'steps.per.degree')),
                        distance: Number(__classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'distance'))
                    };
                    if (channels === 1) {
                        meter = {
                            ...circularMeterBase,
                            channels: 1,
                            monoOrigin: {
                                x: Number(__classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'mono.origin.x')),
                                y: Number(__classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'mono.origin.y'))
                            },
                            angle: {
                                start: Number(__classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'start.angle')),
                                stop: Number(__classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'stop.angle'))
                            }
                        };
                    }
                    else {
                        const startAngle = __classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'start.angle', null);
                        const stopAngle = __classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'stop.angle', null);
                        let angle;
                        if (startAngle !== null && stopAngle !== null) {
                            angle = {
                                leftStart: Number(startAngle),
                                rightStart: Number(startAngle),
                                leftStop: Number(stopAngle),
                                rightStop: Number(stopAngle)
                            };
                        }
                        else {
                            angle = {
                                leftStart: Number(__classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'left.start.angle')),
                                leftStop: Number(__classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'left.stop.angle')),
                                rightStart: Number(__classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'right.start.angle')),
                                rightStop: Number(__classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'right.stop.angle'))
                            };
                        }
                        meter = {
                            ...circularMeterBase,
                            channels: 2,
                            leftOrigin: {
                                x: Number(__classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'left.origin.x')),
                                y: Number(__classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'left.origin.y'))
                            },
                            rightOrigin: {
                                x: Number(__classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'right.origin.x')),
                                y: Number(__classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'right.origin.y'))
                            },
                            angle
                        };
                    }
                }
                if (meter) {
                    result.push(__classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_parseExtendedConfig).call(this, config, section, meter));
                }
                return result;
            }, []);
            meters.sort((m1, m2) => m1.name.localeCompare(m2.name));
            return {
                meters
            };
        }
        catch (error) {
            NowPlayingContext_1.default.getLogger().error(NowPlayingContext_1.default.getErrorMessage(`[now-playing] Failed to get config for VU template ${template}:`, error, true));
            return {
                error: NowPlayingContext_1.default.getErrorMessage(NowPlayingContext_1.default.getI18n('NOW_PLAYING_ERR_VU_METER_PROCESS_TEMPLATE'), error, false)
            };
        }
    }
}
exports.default = VUMeterConfigParser;
_a = VUMeterConfigParser, _VUMeterConfigParser_parseExtendedConfig = function _VUMeterConfigParser_parseExtendedConfig(config, section, baseConfig) {
    const extend = __classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'config.extend', null);
    if (extend !== 'True') {
        return baseConfig;
    }
    let albumart = null;
    const albumartPos = __classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_parsePosition).call(this, config, section, 'albumart.pos');
    const albumartSize = __classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_parseSize).call(this, config, section, 'albumart.dimension');
    if (albumartPos && albumartSize) {
        const borderWidth = __classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'albumart.border', null);
        let border = null;
        if (borderWidth && Number(borderWidth) > 0) {
            border = {
                width: Number(borderWidth)
            };
        }
        albumart = {
            position: albumartPos,
            size: albumartSize,
            border
        };
    }
    const playInfoMaxWidth = Number(__classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'playinfo.maxwidth', null));
    const playInfoTitle = __classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_parsePlayInfoTextElement).call(this, config, section, 'playinfo.title.pos', 'bold');
    const playInfoArtist = __classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_parsePlayInfoTextElement).call(this, config, section, 'playinfo.artist.pos', 'light');
    const playInfoAlbum = __classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_parsePlayInfoTextElement).call(this, config, section, 'playinfo.album.pos', 'light');
    const playInfoSampleRate = __classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_parsePlayInfoTextElement).call(this, config, section, 'playinfo.samplerate.pos', 'bold');
    let playInfo = null;
    if (playInfoMaxWidth && (playInfoTitle || playInfoArtist || playInfoAlbum || playInfoSampleRate)) {
        const playInfoCenter = __classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'playinfo.center', null) === 'True';
        const trackTypePosition = __classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_parsePosition).call(this, config, section, 'playinfo.type.pos');
        const trackTypeSize = __classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_parseSize).call(this, config, section, 'playinfo.type.dimension');
        let trackType = null;
        if (trackTypePosition && trackTypeSize) {
            trackType = {
                position: trackTypePosition,
                color: __classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_parseColor).call(this, config, section, 'playinfo.type.color'),
                size: trackTypeSize
            };
        }
        playInfo = {
            title: playInfoTitle,
            artist: playInfoArtist,
            album: playInfoAlbum,
            sampleRate: playInfoSampleRate,
            center: playInfoCenter,
            maxWidth: playInfoMaxWidth,
            trackType
        };
    }
    const timeRemainingPos = __classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_parsePosition).call(this, config, section, 'time.remaining.pos');
    let timeRemaining = null;
    if (timeRemainingPos) {
        timeRemaining = {
            position: timeRemainingPos,
            color: __classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_parseColor).call(this, config, section, 'time.remaining.color')
        };
    }
    const { appUrl } = (0, System_1.getPluginInfo)();
    const font = {
        url: {
            light: `${appUrl}/sys_asset/font/${DEFAULT_FONTS.light}`,
            regular: `${appUrl}/sys_asset/font/${DEFAULT_FONTS.regular}`,
            bold: `${appUrl}/sys_asset/font/${DEFAULT_FONTS.bold}`,
            digi: `${appUrl}/assets/vumeter-fonts/DSEG7Classic-Italic.ttf`
        },
        size: {
            light: Number(__classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'font.size.light', null)) || 30,
            regular: Number(__classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'font.size.regular', null)) || 35,
            bold: Number(__classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'font.size.bold', null)) || 40,
            digi: Number(__classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, 'font.size.digi', null)) || 40
        },
        color: __classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_parseColor).call(this, config, section, 'font.color')
    };
    return {
        ...baseConfig,
        extend: true,
        albumart,
        playInfo,
        timeRemaining,
        font
    };
}, _VUMeterConfigParser_parsePosition = function _VUMeterConfigParser_parsePosition(config, section, prop) {
    const pos = __classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, prop, null);
    const [x, y] = pos?.split(',').map((s) => Number(s)) || [NaN, NaN];
    if (!isNaN(x) && !isNaN(y)) {
        return {
            x, y
        };
    }
    return null;
}, _VUMeterConfigParser_parseSize = function _VUMeterConfigParser_parseSize(config, section, prop) {
    const size = __classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, prop, null);
    const [w, h] = size?.split(',').map((s) => Number(s)) || [NaN, NaN];
    if (!isNaN(w) && !isNaN(h)) {
        return {
            width: w,
            height: h
        };
    }
    return null;
}, _VUMeterConfigParser_rgbToHex = function _VUMeterConfigParser_rgbToHex(r, g, b) {
    return `#${[r, g, b].map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? `0${hex}` : hex;
    }).join('')}`;
}, _VUMeterConfigParser_parseColor = function _VUMeterConfigParser_parseColor(config, section, prop, defaultColor = '#ffffff') {
    const color = __classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, prop, null); // Expects 'r,g,b'
    const [r, g, b] = color?.split(',').map((s) => Number(s)) || [];
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        return __classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_rgbToHex).call(this, r, g, b);
    }
    return defaultColor;
}, _VUMeterConfigParser_parsePlayInfoTextElement = function _VUMeterConfigParser_parsePlayInfoTextElement(config, section, prop, defaultStyle) {
    const pos = __classPrivateFieldGet(this, _a, "m", _VUMeterConfigParser_getConfigProp).call(this, config, section, prop, null);
    const parts = pos?.split(',') || [];
    const x = Number(parts[0]);
    const y = Number(parts[1]);
    if (!isNaN(x) && !isNaN(y)) {
        const _style = parts[2];
        let style = defaultStyle;
        if (_style) {
            switch (_style.trim()) {
                case 'bold':
                    style = 'bold';
                    break;
                case 'regular':
                    style = 'regular';
                    break;
                case 'light':
                    style = 'light';
                    break;
            }
        }
        return {
            position: {
                x,
                y
            },
            style
        };
    }
    return null;
}, _VUMeterConfigParser_getConfigProp = function _VUMeterConfigParser_getConfigProp(config, section, key, defaultValue) {
    const value = config.get(section, key);
    if (value !== undefined) {
        return value;
    }
    if (defaultValue !== undefined) {
        return defaultValue;
    }
    throw Error(`VU config has no value for ${section}:${key}`);
};
//# sourceMappingURL=VUMeterConfigParser.js.map