import np from '../NowPlayingContext';
import ConfigParser from 'configparser';
import { VUMeter, VUMeterBase, VUMeterCircularBase, VUMeterCircularStereo, VUMeterConfig, VUMeterExtended, VUMeterLinear, VUMeterPlayInfoTextElement } from 'now-playing-common';
import { dirExists, fileExists, getPluginInfo } from './System';
import { VU_METER_TEMPLATE_PATH } from './VUMeterTemplateMonitor';

const DEFAULT_FONTS = {
  light: 'Lato-Light.ttf',
  regular: 'Lato-Regular.ttf',
  bold: 'Lato-Bold.ttf'
};

export default class VUMeterConfigParser {

  static getConfig(template: string): VUMeterConfig {
    const appUrl = getPluginInfo().appUrl;
    const templateUrl = `${appUrl}/vumeter/${template}`;
    try {
      const templateDir = `${VU_METER_TEMPLATE_PATH}/${template}`;
      const configPath = `${templateDir}/meters.txt`;
      if (!dirExists(templateDir)) {
        throw Error(np.getI18n('NOW_PLAYING_ERR_VU_METER_TEMPLATE_NOT_FOUND', template));
      }
      if (!fileExists(configPath)) {
        throw Error(np.getI18n('NOW_PLAYING_ERR_VU_METER_CONF_NOT_FOUND', template));
      }
      const config = new ConfigParser();
      config.read(configPath);
      if (config.sections().length === 0) {
        throw Error(`No meters defined in ${template}`);
      }
      const meters = config.sections().reduce<VUMeter[]>((result, section) => {
        const meterType = this.#getConfigProp(config, section, 'meter.type');
        const channels = Number(this.#getConfigProp(config, section, 'channels'));
        if (meterType !== 'linear' && meterType !== 'circular') {
          throw Error(`Unknown meter type: ${meterType}`);
        }
        if (isNaN(channels) || (channels !== 1 && channels !== 2)) {
          throw Error(`Invalid channels value: ${channels}`);
        }
        if (meterType === 'linear' && channels !== 2) {
          throw Error(`Invalid channels value '${channels} for meter type '${meterType}'`);
        }
        const screenBackground = this.#getConfigProp(config, section, 'screen.bgr', null);
        const foreground = this.#getConfigProp(config, section, 'fgr.filename', null);
        const meterBase: VUMeterBase = {
          name: section,
          type: meterType,
          meter: {
            x: Number(this.#getConfigProp(config, section, 'meter.x', 0)),
            y: Number(this.#getConfigProp(config, section, 'meter.y', 0))
          },
          channels,
          uiRefreshPeriod: Number(this.#getConfigProp(config, section, 'ui.refresh.period', 0.05)),
          images: {
            background: `${templateUrl}/${this.#getConfigProp(config, section, 'bgr.filename')}`,
            foreground: foreground ? `${templateUrl}/${foreground}` : null,
            indicator: `${templateUrl}/${this.#getConfigProp(config, section, 'indicator.filename')}`,
            screenBackground: screenBackground ? `${templateUrl}/${screenBackground}` : null
          }
        };
        let meter: VUMeter | null = null;
        if (meterType === 'linear') {
          const directionValue = this.#getConfigProp(config, section, 'direction', null);
          let direction: VUMeterLinear['direction'];
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
          const flipLeftX = this.#getConfigProp(config, section, 'flip.left.x', null);
          const flipRightX = this.#getConfigProp(config, section, 'flip.right.x', null);
          meter = {
            ...meterBase,
            type: 'linear',
            channels: 2,
            left: {
              x: Number(this.#getConfigProp(config, section, 'left.x')),
              y: Number(this.#getConfigProp(config, section, 'left.y'))
            },
            right: {
              x: Number(this.#getConfigProp(config, section, 'right.x')),
              y: Number(this.#getConfigProp(config, section, 'right.y'))
            },
            position: {
              regular: Number(this.#getConfigProp(config, section, 'position.regular')),
              overload: Number(this.#getConfigProp(config, section, 'position.overload', 0))
            },
            stepWidth: {
              regular: Number(this.#getConfigProp(config, section, 'step.width.regular')),
              overload: Number(this.#getConfigProp(config, section, 'step.width.overload', 0))
            },
            direction,
            flipLeft: {
              x: flipLeftX === 'True'
            },
            flipRight: {
              x: flipRightX === 'True'
            }
          };
          const indicatorType = this.#getConfigProp(config, section, 'indicator.type', null);
          if (indicatorType === 'single') {
            meter.indicatorType = indicatorType;
          }
        }
        else if (meterType === 'circular') {
          const circularMeterBase: VUMeterCircularBase = {
            ...meterBase,
            type: 'circular',
            stepsPerDegree: Number(this.#getConfigProp(config, section, 'steps.per.degree')),
            distance: Number(this.#getConfigProp(config, section, 'distance'))
          };
          if (channels === 1) {
            meter = {
              ...circularMeterBase,
              channels: 1,
              monoOrigin: {
                x: Number(this.#getConfigProp(config, section, 'mono.origin.x')),
                y: Number(this.#getConfigProp(config, section, 'mono.origin.y'))
              },
              angle: {
                start: Number(this.#getConfigProp(config, section, 'start.angle')),
                stop: Number(this.#getConfigProp(config, section, 'stop.angle'))
              }
            };
          }
          else {
            const startAngle = this.#getConfigProp(config, section, 'start.angle', null);
            const stopAngle = this.#getConfigProp(config, section, 'stop.angle', null);
            let angle: VUMeterCircularStereo['angle'];
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
                leftStart: Number(this.#getConfigProp(config, section, 'left.start.angle')),
                leftStop: Number(this.#getConfigProp(config, section, 'left.stop.angle')),
                rightStart: Number(this.#getConfigProp(config, section, 'right.start.angle')),
                rightStop: Number(this.#getConfigProp(config, section, 'right.stop.angle'))
              };
            }
            meter = {
              ...circularMeterBase,
              channels: 2,
              leftOrigin: {
                x: Number(this.#getConfigProp(config, section, 'left.origin.x')),
                y: Number(this.#getConfigProp(config, section, 'left.origin.y'))
              },
              rightOrigin: {
                x: Number(this.#getConfigProp(config, section, 'right.origin.x')),
                y: Number(this.#getConfigProp(config, section, 'right.origin.y'))
              },
              angle
            };
          }
        }

        if (meter) {
          result.push(this.#parseExtendedConfig(config, section, meter));
        }

        return result;
      }, []);

      meters.sort((m1, m2) => m1.name.localeCompare(m2.name));

      return {
        meters
      };
    }
    catch (error: any) {
      np.getLogger().error(np.getErrorMessage(`[now-playing] Failed to get config for VU template ${template}:`, error, true));
      return {
        error: np.getErrorMessage(np.getI18n('NOW_PLAYING_ERR_VU_METER_PROCESS_TEMPLATE'), error, false)
      };
    }
  }

  static #parseExtendedConfig(config: ConfigParser, section: string, baseConfig: VUMeter): VUMeter | VUMeterExtended {
    const extend = this.#getConfigProp(config, section, 'config.extend', null);
    if (extend !== 'True') {
      return baseConfig;
    }

    let albumart: VUMeterExtended['albumart'] = null;
    const albumartPos = this.#parsePosition(config, section, 'albumart.pos');
    const albumartSize = this.#parseSize(config, section, 'albumart.dimension');
    if (albumartPos && albumartSize) {
      const borderWidth = this.#getConfigProp(config, section, 'albumart.border', null);
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

    const playInfoMaxWidth = Number(this.#getConfigProp(config, section, 'playinfo.maxwidth', null));
    const playInfoTitle = this.#parsePlayInfoTextElement(config, section, 'playinfo.title.pos', 'bold');
    const playInfoArtist = this.#parsePlayInfoTextElement(config, section, 'playinfo.artist.pos', 'light');
    const playInfoAlbum = this.#parsePlayInfoTextElement(config, section, 'playinfo.album.pos', 'light');
    const playInfoSampleRate = this.#parsePlayInfoTextElement(config, section, 'playinfo.samplerate.pos', 'bold');
    let playInfo: VUMeterExtended['playInfo'] = null;
    if (playInfoMaxWidth && (playInfoTitle || playInfoArtist || playInfoAlbum || playInfoSampleRate)) {
      const playInfoCenter = this.#getConfigProp(config, section, 'playinfo.center', null) === 'True';
      const trackTypePosition = this.#parsePosition(config, section, 'playinfo.type.pos');
      const trackTypeSize = this.#parseSize(config, section, 'playinfo.type.dimension');
      let trackType = null;
      if (trackTypePosition && trackTypeSize) {
        trackType = {
          position: trackTypePosition,
          color: this.#parseColor(config, section, 'playinfo.type.color'),
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

    const timeRemainingPos = this.#parsePosition(config, section, 'time.remaining.pos');
    let timeRemaining: VUMeterExtended['timeRemaining'] = null;
    if (timeRemainingPos) {
      timeRemaining = {
        position: timeRemainingPos,
        color: this.#parseColor(config, section, 'time.remaining.color')
      };
    }

    const { appUrl } = getPluginInfo();
    const font: VUMeterExtended['font'] = {
      url: {
        light: `${appUrl}/sys_asset/font/${DEFAULT_FONTS.light}`,
        regular: `${appUrl}/sys_asset/font/${DEFAULT_FONTS.regular}`,
        bold: `${appUrl}/sys_asset/font/${DEFAULT_FONTS.bold}`,
        digi: `${appUrl}/assets/vumeter-fonts/DSEG7Classic-Italic.ttf`
      },
      size: {
        light: Number(this.#getConfigProp(config, section, 'font.size.light', null)) || 30,
        regular: Number(this.#getConfigProp(config, section, 'font.size.regular', null)) || 35,
        bold: Number(this.#getConfigProp(config, section, 'font.size.bold', null)) || 40,
        digi: Number(this.#getConfigProp(config, section, 'font.size.digi', null)) || 40
      },
      color: this.#parseColor(config, section, 'font.color')
    };

    return {
      ...baseConfig,
      extend: true,
      albumart,
      playInfo,
      timeRemaining,
      font
    };
  }

  static #parsePosition(config: ConfigParser, section: string, prop: string) {
    const pos = this.#getConfigProp(config, section, prop, null);
    const [ x, y ] = pos?.split(',').map((s) => Number(s)) || [ NaN, NaN ];
    if (!isNaN(x) && !isNaN(y)) {
      return {
        x, y
      };
    }
    return null;
  }

  static #parseSize(config: ConfigParser, section: string, prop: string) {
    const size = this.#getConfigProp(config, section, prop, null);
    const [ w, h ] = size?.split(',').map((s) => Number(s)) || [ NaN, NaN ];
    if (!isNaN(w) && !isNaN(h)) {
      return {
        width: w,
        height: h
      };
    }
    return null;
  }

  // https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
  static #rgbToHex(r: number, g: number, b: number) {
    return `#${[ r, g, b ].map((x) => {
      const hex = x.toString(16);
      return hex.length === 1 ? `0${hex}` : hex;
    }).join('')}`;
  }

  static #parseColor(config: ConfigParser, section: string, prop: string, defaultColor = '#ffffff') {
    const color = this.#getConfigProp(config, section, prop, null); // Expects 'r,g,b'
    const [ r, g, b ] = color?.split(',').map((s) => Number(s)) || [];
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      return this.#rgbToHex(r, g, b);
    }
    return defaultColor;
  }

  static #parsePlayInfoTextElement(config: ConfigParser, section: string, prop: string, defaultStyle: VUMeterPlayInfoTextElement['style']) {
    const pos = this.#getConfigProp(config, section, prop, null);
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
  }

  static #getConfigProp(config: ConfigParser, section: string, key: string, defaultValue?: undefined): string;
  static #getConfigProp<T>(config: ConfigParser, section: string, key: string, defaultValue: T): T | string;
  static #getConfigProp<T>(config: ConfigParser, section: string, key: string, defaultValue?: T): T | string {
    const value = config.get(section, key);
    if (value !== undefined) {
      return value;
    }
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw Error(`VU config has no value for ${section}:${key}`);
  }
}
