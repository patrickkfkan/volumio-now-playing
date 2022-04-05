'use strict';

const path = require('path');
const geoTZ = require('geo-tz');
global.nowPlayingPluginLibRoot = path.resolve(__dirname) + '/lib';

const libQ = require('kew');
const np = require(nowPlayingPluginLibRoot + '/np');
const util = require(nowPlayingPluginLibRoot + '/util');
const metadata = require(nowPlayingPluginLibRoot + '/api/metadata');
const app = require(__dirname + '/app');
const config = require(nowPlayingPluginLibRoot + '/config');

const volumioKioskPath = '/opt/volumiokiosk.sh';
const volumioKioskBackupPath = '/home/volumio/.now_playing/volumiokiosk.sh.bak';
const volumioBackgroundPath = '/data/backgrounds';

module.exports = ControllerNowPlaying;

function ControllerNowPlaying(context) {
    this.context = context;
    this.commandRouter = this.context.coreCommand;
    this.logger = this.context.logger;
    this.configManager = this.context.configManager;
}

ControllerNowPlaying.prototype.getUIConfig = function () {
    let self = this;
    let defer = libQ.defer();

    let lang_code = self.commandRouter.sharedVars.get('language_code');

    self.commandRouter.i18nJson(__dirname + '/i18n/strings_' + lang_code + '.json',
        __dirname + '/i18n/strings_en.json',
        __dirname + '/UIConfig.json')
        .then(uiconf => {
            let daemonUIConf = uiconf.sections[0];
            let textStylesUIConf = uiconf.sections[1];
            let widgetStylesUIConf = uiconf.sections[2];
            let albumartStylesUIConf = uiconf.sections[3];
            let backgroundStylesUIConf = uiconf.sections[4];
            let dockedVolumeIndicatorUIConf = uiconf.sections[5];
            let dockedClockUIConf = uiconf.sections[6];
            let localizationUIConf = uiconf.sections[7];
            let metadataServiceUIConf = uiconf.sections[8];
            let extraScreensUIConf = uiconf.sections[9];
            let kioskUIConf = uiconf.sections[10];
            let performanceUIConf = uiconf.sections[11];

            /**
             * Daemon conf
             */
            let port = np.getConfigValue('port', 4004);
            daemonUIConf.content[0].value = port;

            // Get Now Playing Url
            let thisDevice = np.getDeviceInfo();
            let url = `${thisDevice.host}:${port}`;
            let previewUrl = `${url}/preview`
            daemonUIConf.content[1].value = url;
            daemonUIConf.content[2].value = previewUrl;
            daemonUIConf.content[3].onClick.url = previewUrl;

            /**
             * Text Styles conf
             */
            let nowPlayingScreenSettings = np.getConfigValue('screen.nowPlaying', {}, true);

            let fontSizes = nowPlayingScreenSettings.fontSizes || 'auto';
            textStylesUIConf.content[0].value = {
                value: fontSizes,
                label: fontSizes == 'auto' ? np.getI18n('NOW_PLAYING_AUTO') : np.getI18n('NOW_PLAYING_CUSTOM')
            };
            textStylesUIConf.content[1].value = nowPlayingScreenSettings.titleFontSize || '';
            textStylesUIConf.content[2].value = nowPlayingScreenSettings.artistFontSize || '';
            textStylesUIConf.content[3].value = nowPlayingScreenSettings.albumFontSize || '';
            textStylesUIConf.content[4].value = nowPlayingScreenSettings.mediaInfoFontSize || '';

            let fontColors = nowPlayingScreenSettings.fontColors || 'default';
            textStylesUIConf.content[5].value = {
                value: fontColors,
                label: fontColors == 'default' ? np.getI18n('NOW_PLAYING_DEFAULT') : np.getI18n('NOW_PLAYING_CUSTOM')
            };
            textStylesUIConf.content[6].value = nowPlayingScreenSettings.titleFontColor || '#FFFFFF';
            textStylesUIConf.content[7].value = nowPlayingScreenSettings.artistFontColor || '#CCCCCC';
            textStylesUIConf.content[8].value = nowPlayingScreenSettings.albumFontColor || '#CCCCCC';
            textStylesUIConf.content[9].value = nowPlayingScreenSettings.mediaInfoFontColor || '#CCCCCC';

            let textMargins = nowPlayingScreenSettings.textMargins || 'auto';
            textStylesUIConf.content[10].value = {
                value: textMargins,
                label: textMargins == 'auto' ? np.getI18n('NOW_PLAYING_AUTO') : np.getI18n('NOW_PLAYING_CUSTOM')
            };
            textStylesUIConf.content[11].value = nowPlayingScreenSettings.titleMargin || '';
            textStylesUIConf.content[12].value = nowPlayingScreenSettings.artistMargin || '';
            textStylesUIConf.content[13].value = nowPlayingScreenSettings.albumMargin || '';
            textStylesUIConf.content[14].value = nowPlayingScreenSettings.mediaInfoMargin || '';

            let textAlignmentH = nowPlayingScreenSettings.textAlignmentH || 'left';
            textStylesUIConf.content[15].value = {
                value: textAlignmentH
            };
            switch (textAlignmentH) {
                case 'center':
                    textStylesUIConf.content[15].value.label = np.getI18n('NOW_PLAYING_POSITION_CENTER');
                    break;
                case 'right':
                    textStylesUIConf.content[15].value.label = np.getI18n('NOW_PLAYING_POSITION_RIGHT');
                    break;
                default:
                    textStylesUIConf.content[15].value.label = np.getI18n('NOW_PLAYING_POSITION_LEFT');
            }

            let textAlignmentV = nowPlayingScreenSettings.textAlignmentV || 'flex-start';
            textStylesUIConf.content[16].value = {
                value: textAlignmentV
            };
            switch (textAlignmentV) {
                case 'center':
                    textStylesUIConf.content[16].value.label = np.getI18n('NOW_PLAYING_POSITION_CENTER');
                    break;
                case 'flex-end':
                    textStylesUIConf.content[16].value.label = np.getI18n('NOW_PLAYING_POSITION_BOTTOM');
                    break;
                case 'space-between':
                    textStylesUIConf.content[16].value.label = np.getI18n('NOW_PLAYING_SPREAD');
                    break;
                default:
                    textStylesUIConf.content[16].value.label = np.getI18n('NOW_PLAYING_POSITION_TOP');
            }

            let textAlignmentLyrics = nowPlayingScreenSettings.textAlignmentLyrics || 'center';
            textStylesUIConf.content[17].value = {
                value: textAlignmentLyrics
            };
            switch (textAlignmentLyrics) {
                case 'center':
                    textStylesUIConf.content[17].value.label = np.getI18n('NOW_PLAYING_POSITION_CENTER');
                    break;
                case 'right':
                    textStylesUIConf.content[17].value.label = np.getI18n('NOW_PLAYING_POSITION_RIGHT');
                    break;
                default:
                    textStylesUIConf.content[17].value.label = np.getI18n('NOW_PLAYING_POSITION_LEFT');
            }

            let maxLines = nowPlayingScreenSettings.maxLines || 'auto';
            textStylesUIConf.content[18].value = {
                value: maxLines,
                label: maxLines == 'auto' ? np.getI18n('NOW_PLAYING_AUTO') : np.getI18n('NOW_PLAYING_CUSTOM')
            };
            textStylesUIConf.content[19].value = nowPlayingScreenSettings.maxTitleLines !== undefined ? nowPlayingScreenSettings.maxTitleLines : '';
            textStylesUIConf.content[20].value = nowPlayingScreenSettings.maxArtistLines !== undefined ? nowPlayingScreenSettings.maxArtistLines : '';
            textStylesUIConf.content[21].value = nowPlayingScreenSettings.maxAlbumLines !== undefined ? nowPlayingScreenSettings.maxAlbumLines : '';

            let trackInfoOrder = nowPlayingScreenSettings.trackInfoOrder || 'default';
            textStylesUIConf.content[22].value = {
                value: trackInfoOrder,
                label: trackInfoOrder == 'default' ? np.getI18n('NOW_PLAYING_DEFAULT') : np.getI18n('NOW_PLAYING_CUSTOM')
            };
            textStylesUIConf.content[23].value = nowPlayingScreenSettings.trackInfoTitleOrder !== undefined ? nowPlayingScreenSettings.trackInfoTitleOrder : '';
            textStylesUIConf.content[24].value = nowPlayingScreenSettings.trackInfoArtistOrder !== undefined ? nowPlayingScreenSettings.trackInfoArtistOrder : '';
            textStylesUIConf.content[25].value = nowPlayingScreenSettings.trackInfoAlbumOrder !== undefined ? nowPlayingScreenSettings.trackInfoAlbumOrder : '';
            textStylesUIConf.content[26].value = nowPlayingScreenSettings.trackInfoMediaInfoOrder !== undefined ? nowPlayingScreenSettings.trackInfoMediaInfoOrder : '';

            /**
             * Widget Styles conf
             */
            let widgetColors = nowPlayingScreenSettings.widgetColors || 'default';
            widgetStylesUIConf.content[0].value = {
                value: widgetColors,
                label: widgetColors == 'default' ? np.getI18n('NOW_PLAYING_DEFAULT') : np.getI18n('NOW_PLAYING_CUSTOM')
            };
            widgetStylesUIConf.content[1].value = nowPlayingScreenSettings.widgetPrimaryColor || '#CCCCCC';
            widgetStylesUIConf.content[2].value = nowPlayingScreenSettings.widgetHighlightColor || '#24A4F3';

            let widgetVisibility = nowPlayingScreenSettings.widgetVisibility || 'default';
            widgetStylesUIConf.content[3].value = {
                value: widgetVisibility,
                label: widgetVisibility == 'default' ? np.getI18n('NOW_PLAYING_DEFAULT') : np.getI18n('NOW_PLAYING_CUSTOM')
            };
            let playbackButtonsVisibility = nowPlayingScreenSettings.playbackButtonsVisibility == undefined ? true : nowPlayingScreenSettings.playbackButtonsVisibility;
            let seekbarVisibility = nowPlayingScreenSettings.seekbarVisibility == undefined ? true : nowPlayingScreenSettings.seekbarVisibility;
            widgetStylesUIConf.content[4].value = playbackButtonsVisibility ? true : false;
            widgetStylesUIConf.content[5].value = seekbarVisibility ? true : false;
            let playbackButtonSizeType = nowPlayingScreenSettings.playbackButtonSizeType || 'auto';
            widgetStylesUIConf.content[6].value = {
                value: playbackButtonSizeType,
                label: playbackButtonSizeType == 'auto' ? np.getI18n('NOW_PLAYING_AUTO') : np.getI18n('NOW_PLAYING_CUSTOM')
            };
            widgetStylesUIConf.content[7].value = nowPlayingScreenSettings.playbackButtonSize || '';

            let widgetMargins = nowPlayingScreenSettings.widgetMargins || 'auto';
            widgetStylesUIConf.content[8].value = {
                value: widgetMargins,
                label: widgetMargins == 'auto' ? np.getI18n('NOW_PLAYING_AUTO') : np.getI18n('NOW_PLAYING_CUSTOM')
            };
            widgetStylesUIConf.content[9].value = nowPlayingScreenSettings.playbackButtonsMargin || '';
            widgetStylesUIConf.content[10].value = nowPlayingScreenSettings.seekbarMargin || '';

            /**
             * Albumart Styles conf
             */
            let albumartVisibility = nowPlayingScreenSettings.albumartVisibility == undefined ? true : nowPlayingScreenSettings.albumartVisibility;
            albumartStylesUIConf.content[0].value = albumartVisibility ? true : false;
            let albumartSize = nowPlayingScreenSettings.albumartSize || 'auto';
            albumartStylesUIConf.content[1].value = {
                value: albumartSize,
                label: albumartSize == 'auto' ? np.getI18n('NOW_PLAYING_AUTO') : np.getI18n('NOW_PLAYING_CUSTOM')
            };
            albumartStylesUIConf.content[2].value = nowPlayingScreenSettings.albumartWidth || '';
            albumartStylesUIConf.content[3].value = nowPlayingScreenSettings.albumartHeight || '';

            let albumartFit = nowPlayingScreenSettings.albumartFit || 'cover';
            albumartStylesUIConf.content[4].value = {
                value: albumartFit
            };
            switch (albumartFit) {
                case 'contain':
                    albumartStylesUIConf.content[4].value.label = np.getI18n('NOW_PLAYING_FIT_CONTAIN');
                    break;
                case 'fill':
                    albumartStylesUIConf.content[4].value.label = np.getI18n('NOW_PLAYING_FIT_FILL');
                    break;
                default:
                    albumartStylesUIConf.content[4].value.label = np.getI18n('NOW_PLAYING_FIT_COVER');
            }
            albumartStylesUIConf.content[5].value = nowPlayingScreenSettings.albumartBorder || '';
            albumartStylesUIConf.content[6].value = nowPlayingScreenSettings.albumartBorderRadius || '';
            if (!albumartVisibility) {
                albumartStylesUIConf.content = [albumartStylesUIConf.content[0]];
                albumartStylesUIConf.saveButton.data = ['albumartVisibility'];
            }

            /**
            * Background Styles Conf
            */
            let backgroundSettings = np.getConfigValue('background', {}, true);
            let backgroundType = backgroundSettings.backgroundType || 'default';
            backgroundStylesUIConf.content[0].value = {
                value: backgroundType,
            };
            switch (backgroundType) {
                case 'albumart':
                    backgroundStylesUIConf.content[0].value.label = np.getI18n('NOW_PLAYING_ALBUM_ART');
                    break;
                case 'color':
                    backgroundStylesUIConf.content[0].value.label = np.getI18n('NOW_PLAYING_COLOR');
                    break;
                case 'volumioBackground':
                    backgroundStylesUIConf.content[0].value.label = np.getI18n('NOW_PLAYING_VOLUMIO_BACKGROUND');
                    break;
                default:
                    backgroundStylesUIConf.content[0].value.label = np.getI18n('NOW_PLAYING_DEFAULT');
            }

            backgroundStylesUIConf.content[1].value = backgroundSettings.backgroundColor || '#000000';

            let albumartBackgroundFit = backgroundSettings.albumartBackgroundFit || 'cover';
            backgroundStylesUIConf.content[2].value = {
                value: albumartBackgroundFit
            };
            switch (albumartBackgroundFit) {
                case 'contain':
                    backgroundStylesUIConf.content[2].value.label = np.getI18n('NOW_PLAYING_FIT_CONTAIN');
                    break;
                case 'fill':
                    backgroundStylesUIConf.content[2].value.label = np.getI18n('NOW_PLAYING_FIT_FILL');
                    break;
                default:
                    backgroundStylesUIConf.content[2].value.label = np.getI18n('NOW_PLAYING_FIT_COVER');
            }
            let albumartBackgroundPosition = backgroundSettings.albumartBackgroundPosition || 'center';
            backgroundStylesUIConf.content[3].value = {
                value: albumartBackgroundPosition
            };
            switch (albumartBackgroundPosition) {
                case 'top':
                    backgroundStylesUIConf.content[3].value.label = np.getI18n('NOW_PLAYING_POSITION_TOP');
                    break;
                case 'left':
                    backgroundStylesUIConf.content[3].value.label = np.getI18n('NOW_PLAYING_POSITION_LEFT');
                    break;
                case 'bottom':
                    backgroundStylesUIConf.content[3].value.label = np.getI18n('NOW_PLAYING_POSITION_BOTTOM');
                    break;
                case 'right':
                    backgroundStylesUIConf.content[3].value.label = np.getI18n('NOW_PLAYING_POSITION_RIGHT');
                    break;
                default:
                    backgroundStylesUIConf.content[3].value.label = np.getI18n('NOW_PLAYING_POSITION_CENTER');
            }
            backgroundStylesUIConf.content[4].value = backgroundSettings.albumartBackgroundBlur || '';
            backgroundStylesUIConf.content[5].value = backgroundSettings.albumartBackgroundScale || '';

            let volumioBackgrounds = getVolumioBackgrounds();
            let volumioBackgroundImage = backgroundSettings.volumioBackgroundImage || '';
            if (volumioBackgroundImage !== '' && !volumioBackgrounds.includes(volumioBackgroundImage)) {
                volumioBackgroundImage = '';  // img no longer exists
            }
            backgroundStylesUIConf.content[6].value = {
                value: volumioBackgroundImage,
                label: volumioBackgroundImage
            };
            backgroundStylesUIConf.content[6].options = [];
            volumioBackgrounds.forEach(bg => {
                backgroundStylesUIConf.content[6].options.push({
                    value: bg,
                    label: bg
                });
            });
            let volumioBackgroundFit = backgroundSettings.volumioBackgroundFit || 'cover';
            backgroundStylesUIConf.content[7].value = {
                value: volumioBackgroundFit
            };
            switch (volumioBackgroundFit) {
                case 'contain':
                    backgroundStylesUIConf.content[7].value.label = np.getI18n('NOW_PLAYING_FIT_CONTAIN');
                    break;
                case 'fill':
                    backgroundStylesUIConf.content[7].value.label = np.getI18n('NOW_PLAYING_FIT_FILL');
                    break;
                default:
                    backgroundStylesUIConf.content[7].value.label = np.getI18n('NOW_PLAYING_FIT_COVER');
            }
            let volumioBackgroundPosition = backgroundSettings.volumioBackgroundPosition || 'center';
            backgroundStylesUIConf.content[8].value = {
                value: volumioBackgroundPosition
            };
            switch (volumioBackgroundPosition) {
                case 'top':
                    backgroundStylesUIConf.content[8].value.label = np.getI18n('NOW_PLAYING_POSITION_TOP');
                    break;
                case 'left':
                    backgroundStylesUIConf.content[8].value.label = np.getI18n('NOW_PLAYING_POSITION_LEFT');
                    break;
                case 'bottom':
                    backgroundStylesUIConf.content[8].value.label = np.getI18n('NOW_PLAYING_POSITION_BOTTOM');
                    break;
                case 'right':
                    backgroundStylesUIConf.content[8].value.label = np.getI18n('NOW_PLAYING_POSITION_RIGHT');
                    break;
                default:
                    backgroundStylesUIConf.content[8].value.label = np.getI18n('NOW_PLAYING_POSITION_CENTER');
            }
            backgroundStylesUIConf.content[9].value = backgroundSettings.volumioBackgroundBlur || '';
            backgroundStylesUIConf.content[10].value = backgroundSettings.volumioBackgroundScale || '';

            let backgroundOverlay = backgroundSettings.backgroundOverlay || 'default';
            // Revert obsolete value 'custom' to 'default'
            if (backgroundOverlay === 'custom') {
                backgroundOverlay = 'default';
            }
            backgroundStylesUIConf.content[11].value = {
                value: backgroundOverlay
            };
            switch (backgroundOverlay) {
                case 'customColor':
                    backgroundStylesUIConf.content[11].value.label = np.getI18n('NOW_PLAYING_CUSTOM_COLOR');
                    break;
                case 'customGradient':
                    backgroundStylesUIConf.content[11].value.label = np.getI18n('NOW_PLAYING_CUSTOM_GRADIENT');
                    break;
                case 'none':
                    backgroundStylesUIConf.content[11].value.label = np.getI18n('NOW_PLAYING_NONE');
                    break;
                default:
                    backgroundStylesUIConf.content[11].value.label = np.getI18n('NOW_PLAYING_DEFAULT');
            }
            backgroundStylesUIConf.content[12].value = backgroundSettings.backgroundOverlayColor || '#000000';
            backgroundStylesUIConf.content[13].value = backgroundSettings.backgroundOverlayColorOpacity || '';
            backgroundStylesUIConf.content[14].value = backgroundSettings.backgroundOverlayGradient || '';
            backgroundStylesUIConf.content[15].value = backgroundSettings.backgroundOverlayGradientOpacity || '';

            /**
             * Docked Volume Indicator
             */
            let dockedVolumeIndicator = nowPlayingScreenSettings.dockedVolumeIndicator || {};
            let dockedvolumeIndicatorPlacement = dockedVolumeIndicator.placement || 'bottom-right';
            dockedVolumeIndicatorUIConf.content[0].value = dockedVolumeIndicator.enabled ? true : false;
            dockedVolumeIndicatorUIConf.content[1].value = {
                value: dockedvolumeIndicatorPlacement
            };
            switch (dockedvolumeIndicatorPlacement) {
                case 'top-left':
                    dockedVolumeIndicatorUIConf.content[1].value.label = np.getI18n('NOW_PLAYING_POSITION_TOP_LEFT');
                    break;
                case 'top':
                    dockedVolumeIndicatorUIConf.content[1].value.label = np.getI18n('NOW_PLAYING_POSITION_TOP');
                    break;
                case 'top-right':
                    dockedVolumeIndicatorUIConf.content[1].value.label = np.getI18n('NOW_PLAYING_POSITION_TOP_RIGHT');
                    break;
                case 'left':
                    dockedVolumeIndicatorUIConf.content[1].value.label = np.getI18n('NOW_PLAYING_POSITION_LEFT');
                    break;
                case 'right':
                    dockedVolumeIndicatorUIConf.content[1].value.label = np.getI18n('NOW_PLAYING_POSITION_RIGHT');
                    break;
                case 'bottom-left':
                    dockedVolumeIndicatorUIConf.content[1].value.label = np.getI18n('NOW_PLAYING_POSITION_BOTTOM_LEFT');
                    break;
                case 'bottom':
                    dockedVolumeIndicatorUIConf.content[1].value.label = np.getI18n('NOW_PLAYING_POSITION_BOTTOM');
                    break;
                default:
                    dockedVolumeIndicatorUIConf.content[1].value.label = np.getI18n('NOW_PLAYING_POSITION_BOTTOM_RIGHT');
            }
            dockedVolumeIndicatorUIConf.content[2].value = dockedVolumeIndicator.fontSize || '';
            dockedVolumeIndicatorUIConf.content[3].value = dockedVolumeIndicator.iconSize || '';
            dockedVolumeIndicatorUIConf.content[4].value = dockedVolumeIndicator.fontColor || '#CCCCCC';
            dockedVolumeIndicatorUIConf.content[5].value = dockedVolumeIndicator.iconColor || '#CCCCCC';
            dockedVolumeIndicatorUIConf.content[6].value = dockedVolumeIndicator.margin || '';

            /**
             * Docked Clock
             */
            let dockedClock = nowPlayingScreenSettings.dockedClock || {};
            let dockedClockPlacement = dockedClock.placement || 'top-left';
            dockedClockUIConf.content[0].value = dockedClock.enabled ? true : false;
            dockedClockUIConf.content[1].value = {
                value: dockedClockPlacement
            };
            switch (dockedClockPlacement) {
                case 'top-left':
                    dockedClockUIConf.content[1].value.label = np.getI18n('NOW_PLAYING_POSITION_TOP_LEFT');
                    break;
                case 'top':
                    dockedClockUIConf.content[1].value.label = np.getI18n('NOW_PLAYING_POSITION_TOP');
                    break;
                case 'top-right':
                    dockedClockUIConf.content[1].value.label = np.getI18n('NOW_PLAYING_POSITION_TOP_RIGHT');
                    break;
                case 'left':
                    dockedClockUIConf.content[1].value.label = np.getI18n('NOW_PLAYING_POSITION_LEFT');
                    break;
                case 'right':
                    dockedClockUIConf.content[1].value.label = np.getI18n('NOW_PLAYING_POSITION_RIGHT');
                    break;
                case 'bottom-left':
                    dockedClockUIConf.content[1].value.label = np.getI18n('NOW_PLAYING_POSITION_BOTTOM_LEFT');
                    break;
                case 'bottom':
                    dockedClockUIConf.content[1].value.label = np.getI18n('NOW_PLAYING_POSITION_BOTTOM');
                    break;
                default:
                    dockedClockUIConf.content[1].value.label = np.getI18n('NOW_PLAYING_POSITION_BOTTOM_RIGHT');
            }
            dockedClockUIConf.content[2].value = dockedClock.fontSize || '';
            dockedClockUIConf.content[3].value = dockedClock.dateColor || '#CCCCCC';
            dockedClockUIConf.content[4].value = dockedClock.timeColor || '#CCCCCC';
            dockedClockUIConf.content[5].value = dockedClock.margin || '';

            /**
             * Localization conf
             */
            let localization = config.getLocalizationSettings();

            localizationUIConf.content[0].value = localization.geoCoordinates || '';

            // Locale list
            let localeList = config.getLocaleList();
            let locale = localization.locale;
            let matchLocale = localeList.find(lc => lc.value === locale);
            if (matchLocale) {
                localizationUIConf.content[1].value = matchLocale;
            }
            else {
                localizationUIConf.content[1].value = {
                    value: locale,
                    label: locale
                }
            }
            localizationUIConf.content[1].options = localeList;

            // Timezone list
            let timezoneList = config.getTimezoneList();
            let timezone = localization.timezone;
            let matchTimezone = timezoneList.find(tz => tz.value === timezone);
            if (matchTimezone) {
                localizationUIConf.content[2].value = matchTimezone;
            }
            else {
                localizationUIConf.content[2].value = {
                    value: timezone,
                    label: timezone
                }
            }
            localizationUIConf.content[2].options = timezoneList;

            /**
             * Metadata Service conf
             */
            metadataServiceUIConf.content[0].value = np.getConfigValue('geniusAccessToken', '');
            let accessTokenSetupUrl = `${url}/genius_setup`;
            metadataServiceUIConf.content[1].onClick.url = accessTokenSetupUrl;

            /**
             * Extra Screens conf
             */
            let theme = np.getConfigValue('theme', 'default');
            extraScreensUIConf.content[0].value = {
                value: theme
            };
            switch (theme) {
                case 'glass':
                    extraScreensUIConf.content[0].value.label = np.getI18n('NOW_PLAYING_GLASS');
                    break;
                default:
                    extraScreensUIConf.content[0].value.label = np.getI18n('NOW_PLAYING_DEFAULT');
            }

            /**
             * Kiosk conf
             */
            let kiosk = checkVolumioKiosk();
            let kioskDesc, kioskButton;
            if (!kiosk.exists) {
                kioskDesc = np.getI18n('NOW_PLAYING_KIOSK_NOT_FOUND');
            }
            else if (kiosk.display == 'default') {
                kioskDesc = np.getI18n('NOW_PLAYING_KIOSK_SHOWING_DEFAULT');
                kioskButton = {
                    id: 'kioskSetToNowPlaying',
                    element: 'button',
                    label: np.getI18n('NOW_PLAYING_KIOSK_SET_TO_NOW_PLAYING'),
                    onClick: {
                        type: 'emit',
                        message: 'callMethod',
                        data: {
                            endpoint: 'user_interface/now_playing',
                            method: 'configureVolumioKiosk',
                            data: {
                                display: 'nowPlaying'
                            }
                        }
                    }
                };
            }
            else if (kiosk.display == 'nowPlaying') {
                kioskDesc = np.getI18n('NOW_PLAYING_KIOSK_SHOWING_NOW_PLAYING');
                kioskButton = {
                    id: 'kioskRestore',
                    element: 'button',
                    label: np.getI18n('NOW_PLAYING_KIOSK_RESTORE'),
                    onClick: {
                        type: 'emit',
                        message: 'callMethod',
                        data: {
                            endpoint: 'user_interface/now_playing',
                            method: 'configureVolumioKiosk',
                            data: {
                                display: 'default'
                            }
                        }
                    }
                };
            }
            else {
                kioskDesc = np.getI18n('NOW_PLAYING_KIOSK_SHOWING_UNKNOWN');
                if (util.fileExists(volumioKioskBackupPath)) {
                    kioskDesc += ' ' + np.getI18n('NOW_PLAYING_DOC_KIOSK_RESTORE_BAK');
                    kioskButton = {
                        id: 'kioskRestoreBak',
                        element: 'button',
                        label: np.getI18n('NOW_PLAYING_KIOSK_RESTORE_BAK'),
                        onClick: {
                            type: 'emit',
                            message: 'callMethod',
                            data: {
                                endpoint: 'user_interface/now_playing',
                                method: 'restoreVolumioKioskBak'
                            }
                        }
                    };
                }
            }
            kioskUIConf.description = kioskDesc;
            if (kioskButton) {
                kioskUIConf.content = [kioskButton];
            }

            // Performance conf
            let performanceSettings = np.getConfigValue('performance', {}, true);
            performanceUIConf.content[0].value = performanceSettings.transitionEffectsKiosk || false;
            performanceUIConf.content[1].value = performanceSettings.transitionEffectsOtherDevices == undefined ? true : performanceSettings.transitionEffectsOtherDevices;
            let unmountScreensOnExit = performanceSettings.unmountScreensOnExit || 'default';
            performanceUIConf.content[2].value = {
                value: unmountScreensOnExit,
                label: fontColors == 'default' ? np.getI18n('NOW_PLAYING_DEFAULT') : np.getI18n('NOW_PLAYING_CUSTOM')
            };
            performanceUIConf.content[3].value = performanceSettings.unmountNowPlayingScreenOnExit == undefined ? true : performanceSettings.unmountNowPlayingScreenOnExit;
            performanceUIConf.content[4].value = performanceSettings.unmountBrowseScreenOnExit || false;
            performanceUIConf.content[5].value = performanceSettings.unmountQueueScreenOnExit || false;
            performanceUIConf.content[6].value = performanceSettings.unmountVolumioScreenOnExit == undefined ? true : performanceSettings.unmountVolumioScreenOnExit;

            defer.resolve(uiconf);
        })
        .fail(error => {
            np.getLogger().error(np.getErrorMessage('[now-playing] getUIConfig(): Cannot populate Now Playing configuration:', error));
            defer.reject(new Error());
        }
        );

    return defer.promise;
};

ControllerNowPlaying.prototype.configSaveDaemon = function (data) {
    let oldPort = np.getConfigValue('port', 4004);
    let port = parseInt(data['port'], 10);
    if (port < 1024 || port > 65353) {
        np.toast('error', np.getI18n('NOW_PLAYING_INVALID_PORT'));
        return;
    }

    if (oldPort !== port) {
        var modalData = {
            title: np.getI18n('NOW_PLAYING_CONFIGURATION'),
            message: np.getI18n('NOW_PLAYING_CONF_RESTART_CONFIRM'),
            size: 'lg',
            buttons: [
                {
                    name: np.getI18n('NOW_PLAYING_NO'),
                    class: 'btn btn-warning',
                },
                {
                    name: np.getI18n('NOW_PLAYING_YES'),
                    class: 'btn btn-info',
                    emit: 'callMethod',
                    payload: {
                        'endpoint': 'user_interface/now_playing',
                        'method': 'configConfirmSaveDaemon',
                        'data': { port, oldPort }
                    }
                }
            ]
        };
        this.commandRouter.broadcastMessage("openModal", modalData);
    }
    else {
        np.toast('success', np.getI18n('NOW_PLAYING_SETTINGS_SAVED'));
    }
}

ControllerNowPlaying.prototype.configConfirmSaveDaemon = function (data) {
    let self = this;

    // Obtain kiosk info before saving new port
    let kiosk = checkVolumioKiosk();

    self.config.set('port', data['port']);

    self.restartApp().then(() => {
        np.toast('success', np.getI18n('NOW_PLAYING_RESTARTED'));

        // Update cached plugin info and broadcast it
        np.set('pluginInfo', util.getPluginInfo());
        let bc = self.getPluginInfo();
        np.broadcastMessage(bc.message, bc.payload);

        // Check if kiosk script was set to show Now Playing, and update 
        // to new port (do not restart volumio-kiosk service because 
        // the screen will reload itself when app is started)
        if (kiosk.exists && kiosk.display == 'nowPlaying') {
            self.modifyVolumioKioskScript(data['oldPort'], data['port'], false);
        }

        self.refreshUIConfig();
    })
        .fail(error => {
            self.config.set('port', data['oldPort']);
            self.refreshUIConfig();
        });
}

ControllerNowPlaying.prototype.configSaveTextStyles = function (data) {
    let maxTitleLines = data.maxTitleLines !== '' ? parseInt(data.maxTitleLines, 10) : '';
    let maxArtistLines = data.maxArtistLines !== '' ? parseInt(data.maxArtistLines, 10) : '';
    let maxAlbumLines = data.maxAlbumLines !== '' ? parseInt(data.maxAlbumLines, 10) : '';
    let trackInfoTitleOrder = data.trackInfoTitleOrder !== '' ? parseInt(data.trackInfoTitleOrder, 10) : '';
    let trackInfoArtistOrder = data.trackInfoArtistOrder !== '' ? parseInt(data.trackInfoArtistOrder, 10) : '';
    let trackInfoAlbumOrder = data.trackInfoAlbumOrder !== '' ? parseInt(data.trackInfoAlbumOrder, 10) : '';
    let trackInfoMediaInfoOrder = data.trackInfoMediaInfoOrder !== '' ? parseInt(data.trackInfoMediaInfoOrder, 10) : '';
    let apply = {
        fontSizes: data.fontSizes.value,
        titleFontSize: data.titleFontSize,
        artistFontSize: data.artistFontSize,
        albumFontSize: data.albumFontSize,
        mediaInfoFontSize: data.mediaInfoFontSize,
        fontColors: data.fontColors.value,
        titleFontColor: data.titleFontColor,
        artistFontColor: data.artistFontColor,
        albumFontColor: data.albumFontColor,
        mediaInfoFontColor: data.mediaInfoFontColor,
        textAlignmentH: data.textAlignmentH.value,
        textAlignmentV: data.textAlignmentV.value,
        textAlignmentLyrics: data.textAlignmentLyrics.value,
        textMargins: data.textMargins.value,
        titleMargin: data.titleMargin,
        artistMargin: data.artistMargin,
        albumMargin: data.albumMargin,
        mediaInfoMargin: data.mediaInfoMargin,
        maxLines: data.maxLines.value,
        maxTitleLines,
        maxArtistLines,
        maxAlbumLines,
        trackInfoOrder: data.trackInfoOrder.value,
        trackInfoTitleOrder,
        trackInfoArtistOrder,
        trackInfoAlbumOrder,
        trackInfoMediaInfoOrder
    };
    let current = np.getConfigValue('screen.nowPlaying', {}, true);
    let updated = Object.assign(current, apply);
    this.config.set('screen.nowPlaying', JSON.stringify(updated));
    np.toast('success', np.getI18n('NOW_PLAYING_SETTINGS_SAVED'));

    np.broadcastMessage('nowPlayingPushSettings', { namespace: 'screen.nowPlaying', data: updated });
}

ControllerNowPlaying.prototype.configSaveWidgetStyles = function (data) {
    let apply = {
        widgetColors: data.widgetColors.value,
        widgetPrimaryColor: data.widgetPrimaryColor,
        widgetHighlightColor: data.widgetHighlightColor,
        widgetVisibility: data.widgetVisibility.value,
        playbackButtonsVisibility: data.playbackButtonsVisibility,
        seekbarVisibility: data.seekbarVisibility,
        playbackButtonSizeType: data.playbackButtonSizeType.value,
        playbackButtonSize: data.playbackButtonSize,
        widgetMargins: data.widgetMargins.value,
        playbackButtonsMargin: data.playbackButtonsMargin,
        seekbarMargin: data.seekbarMargin
    };
    let current = np.getConfigValue('screen.nowPlaying', {}, true);
    let updated = Object.assign(current, apply);
    this.config.set('screen.nowPlaying', JSON.stringify(updated));
    np.toast('success', np.getI18n('NOW_PLAYING_SETTINGS_SAVED'));

    np.broadcastMessage('nowPlayingPushSettings', { namespace: 'screen.nowPlaying', data: updated });
}

ControllerNowPlaying.prototype.configSaveAlbumartStyles = function (data) {
    let apply = {};
    for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'object' && value.value !== undefined) {
            apply[key] = value.value;
        }
        else {
            apply[key] = value;
        }
    }
    /*let styles = {
        albumartVisibility: data.albumartVisibility,
        albumartSize: data.albumartSize.value,
        albumartWidth: data.albumartWidth,
        albumartHeight: data.albumartHeight,
        albumartFit: data.albumartFit.value,
        albumartBorderRadius: data.albumartBorderRadius
    };*/
    let current = np.getConfigValue('screen.nowPlaying', {}, true);
    let currentAlbumartVisibility = (current.albumartVisibility == undefined ? true : current.albumartVisibility) ? true : false;
    let refresh = currentAlbumartVisibility !== apply.albumartVisibility;
    let updated = Object.assign(current, apply);
    this.config.set('screen.nowPlaying', JSON.stringify(updated));
    np.toast('success', np.getI18n('NOW_PLAYING_SETTINGS_SAVED'));

    np.broadcastMessage('nowPlayingPushSettings', { namespace: 'screen.nowPlaying', data: updated });

    if (refresh) {
        this.refreshUIConfig();
    }
}

ControllerNowPlaying.prototype.configSaveBackgroundStyles = function (data) {
    let settings = {
        backgroundType: data.backgroundType.value,
        backgroundColor: data.backgroundColor,
        albumartBackgroundFit: data.albumartBackgroundFit.value,
        albumartBackgroundPosition: data.albumartBackgroundPosition.value,
        albumartBackgroundBlur: data.albumartBackgroundBlur,
        albumartBackgroundScale: data.albumartBackgroundScale,
        volumioBackgroundImage: data.volumioBackgroundImage.value,
        volumioBackgroundFit: data.volumioBackgroundFit.value,
        volumioBackgroundPosition: data.volumioBackgroundPosition.value,
        volumioBackgroundBlur: data.volumioBackgroundBlur,
        volumioBackgroundScale: data.volumioBackgroundScale,
        backgroundOverlay: data.backgroundOverlay.value,
        backgroundOverlayColor: data.backgroundOverlayColor,
        backgroundOverlayColorOpacity: data.backgroundOverlayColorOpacity,
        backgroundOverlayGradient: data.backgroundOverlayGradient,
        backgroundOverlayGradientOpacity: data.backgroundOverlayGradientOpacity
    };
    let current = np.getConfigValue('background', {}, true);
    let updated = Object.assign(current, settings);
    this.config.set('background', JSON.stringify(updated));
    np.toast('success', np.getI18n('NOW_PLAYING_SETTINGS_SAVED'));

    np.broadcastMessage('nowPlayingPushSettings', { namespace: 'background', data: updated });
}

ControllerNowPlaying.prototype.configSaveDockedVolumeIndicatorSettings = function (data) {
    let apply = {
        dockedVolumeIndicator: {
            enabled: data.dockedVolumeIndicatorEnabled,
            placement: data.dockedVolumeIndicatorPlacement.value,
            fontSize: data.dockedVolumeIndicatorFontSize,
            iconSize: data.dockedVolumeIndicatorIconSize,
            fontColor: data.dockedVolumeIndicatorFontColor,
            iconColor: data.dockedVolumeIndicatorIconColor,
            margin: data.dockedVolumeIndicatorMargin
        }
    };
    let current = np.getConfigValue('screen.nowPlaying', {}, true);
    let updated = Object.assign(current, apply);
    this.config.set('screen.nowPlaying', JSON.stringify(updated));
    np.toast('success', np.getI18n('NOW_PLAYING_SETTINGS_SAVED'));

    np.broadcastMessage('nowPlayingPushSettings', { namespace: 'screen.nowPlaying', data: updated });
}

ControllerNowPlaying.prototype.configSaveDockedClockSettings = function (data) {
    let apply = {
        dockedClock: {
            enabled: data.dockedClockEnabled,
            placement: data.dockedClockPlacement.value,
            fontSize: data.dockedClockFontSize,
            dateColor: data.dockedClockDateColor,
            timeColor: data.dockedClockTimeColor,
            margin: data.dockedClockMargin
        }
    };
    let current = np.getConfigValue('screen.nowPlaying', {}, true);
    let updated = Object.assign(current, apply);
    this.config.set('screen.nowPlaying', JSON.stringify(updated));
    np.toast('success', np.getI18n('NOW_PLAYING_SETTINGS_SAVED'));

    np.broadcastMessage('nowPlayingPushSettings', { namespace: 'screen.nowPlaying', data: updated });
}

ControllerNowPlaying.prototype.configSaveLocalizationSettings = function(data) {
    const validateCoord = (coord) => {
        if (!coord) {
            return false;
        }
        let parts = coord.split(',');
        if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) {
            return false;
        }
        return parts;
    }
    
    let settings = {
        geoCoordinates: data.geoCoordinates,
        locale: data.locale.value,
        timezone: data.timezone.value
    };

    if (settings.locale === 'localeListDivider') {
        np.toast('error', np.getI18n('NOW_PLAYING_LOCALE_SELECTION_INVALID'));
        return;
    }
    if (settings.timezone === 'timezoneListDivider') {
        np.toast('error', np.getI18n('NOW_PLAYING_TIMEZONE_SELECTION_INVALID'));
        return;
    }
    
    let successMessage = np.getI18n('NOW_PLAYING_SETTINGS_SAVED');
    if (settings.timezone === 'matchGeoCoordinates') {
        const coord = validateCoord(settings.geoCoordinates);
        if (!coord) {
            np.toast('error', np.getI18n('NOW_PLAYING_INVALID_GEO_COORD'));
            return;
        }
        let matchTimezones = geoTZ.find(...coord);
        if (Array.isArray(matchTimezones) && matchTimezones.length > 0) {
            settings.geoTimezone = matchTimezones[0];
            successMessage = np.getI18n('NOW_PLAYING_TZ_SET_BY_GEO_COORD', matchTimezones[0]);
        }
        else {
            settings.geoTimezone = null;
            successMessage = null;
            np.toast('warning', np.getI18n('NOW_PLAYING_TZ_BY_GEO_COORD_NOT_FOUND'));
        }
    }
    
    this.config.set('localization', JSON.stringify(settings));
    if (successMessage) {
        np.toast('success', successMessage);
    }

    np.broadcastMessage('nowPlayingPushSettings', { namespace: 'localization', data: config.getLocalizationSettings() });
}

ControllerNowPlaying.prototype.configSaveMetadataServiceSettings = function (data) {
    let token = data['geniusAccessToken'].trim();
    this.config.set('geniusAccessToken', token);
    metadata.setAccessToken(token);
    np.toast('success', np.getI18n('NOW_PLAYING_SETTINGS_SAVED'));
}

ControllerNowPlaying.prototype.clearMetadataCache = function () {
    metadata.clearCache();
    np.toast('success', np.getI18n('NOW_PLAYING_CACHE_CLEARED'));
}

ControllerNowPlaying.prototype.configSaveExtraScreenSettings = function (data) {
    let theme = data.theme.value;
    this.config.set('theme', theme);
    np.toast('success', np.getI18n('NOW_PLAYING_SETTINGS_SAVED'));

    np.broadcastMessage('nowPlayingPushSettings', { namespace: 'theme', data: theme });
}

ControllerNowPlaying.prototype.configureVolumioKiosk = function (data) {
    let self = this;
    let oldPort, newPort;
    if (data.display == 'nowPlaying') {
        oldPort = 3000;
        newPort = np.getConfigValue('port', 4004);
    }
    else { // display == 'default'
        oldPort = np.getConfigValue('port', 4004);
        newPort = 3000;
    }

    self.modifyVolumioKioskScript(oldPort, newPort).then(() => {
        self.config.set('kioskDisplay', data.display);
    });
    self.refreshUIConfig();
}

ControllerNowPlaying.prototype.restoreVolumioKioskBak = function () {
    if (!util.fileExists(volumioKioskBackupPath)) {
        np.toast('error', np.getI18n('NOW_PLAYING_KIOSK_BAK_NOT_FOUND'));
        return;
    }
    try {
        util.copyFile(volumioKioskBackupPath, volumioKioskPath, { asRoot: true });
        this.restartVolumioKioskService();
    } catch (error) {
        np.getLogger().error(np.getErrorMessage('[now-playing] Error restoring kiosk script from backup: ', error));
        np.toast('error', np.getI18n('NOW_PLAYING_KIOSK_RESTORE_BAK_ERR'));
    }
    this.refreshUIConfig();
}

ControllerNowPlaying.prototype.modifyVolumioKioskScript = function (oldPort, newPort, restartService = true) {
    try {
        if (oldPort == 3000) {
            np.getLogger().info(`[now-playing] Backing up ${volumioKioskPath} to ${volumioKioskBackupPath}`);
            util.copyFile(volumioKioskPath, volumioKioskBackupPath, { createDestDirIfNotExists: true });
        }
        util.replaceInFile(volumioKioskPath, `localhost:${oldPort}`, `localhost:${newPort}`);
        np.toast('success', np.getI18n('NOW_PLAYING_KIOSK_MODIFIED'));
    } catch (error) {
        np.getLogger().error(np.getErrorMessage('[now-playing] Error modifying Volumio Kiosk script:', error));
        np.toast('error', np.getI18n('NOW_PLAYING_KIOSK_MODIFY_ERR'));
        return libQ.reject();
    }

    if (restartService) {
        return this.restartVolumioKioskService();
    }
    else {
        return libQ.resolve();
    }
}

ControllerNowPlaying.prototype.restartVolumioKioskService = function () {
    let defer = libQ.defer();

    // Restart volumio-kiosk service if it is active
    util.isSystemdServiceActive('volumio-kiosk').then(isActive => {
        if (isActive) {
            np.toast('info', 'Restarting Volumio Kiosk service...');
            util.restartSystemdService('volumio-kiosk')
                .then(() => { defer.resolve(); })
                .catch(error => {
                    np.toast('error', 'Failed to restart Volumio Kiosk service.');
                    defer.resolve();
                });
        }
        else {
            defer.resolve();
        }
    })
        .catch(error => {
            defer.resolve();
        });

    return defer.promise;
}

ControllerNowPlaying.prototype.configSavePerformanceSettings = function (data) {
    let performanceSettings = {
        transitionEffectsKiosk: data.transitionEffectsKiosk,
        transitionEffectsOtherDevices: data.transitionEffectsOtherDevices,
        unmountScreensOnExit: data.unmountScreensOnExit.value,
        unmountNowPlayingScreenOnExit: data.unmountNowPlayingScreenOnExit,
        unmountBrowseScreenOnExit: data.unmountBrowseScreenOnExit,
        unmountQueueScreenOnExit: data.unmountQueueScreenOnExit,
        unmountVolumioScreenOnExit: data.unmountVolumioScreenOnExit
    };
    this.config.set('performance', JSON.stringify(performanceSettings));
    np.toast('success', np.getI18n('NOW_PLAYING_SETTINGS_SAVED'));

    np.broadcastMessage('nowPlayingPushSettings', { namespace: 'performance', data: performanceSettings });
}

ControllerNowPlaying.prototype.broadcastRefresh = function () {
    np.broadcastMessage('nowPlayingRefresh');
    np.toast('success', np.getI18n('NOW_PLAYING_BROADCASTED_COMMAND'));
}

// Socket callMethod
ControllerNowPlaying.prototype.getPluginInfo = function () {
    return {
        message: 'nowPlayingPluginInfo',
        payload: np.get('pluginInfo')
    };
}

ControllerNowPlaying.prototype.refreshUIConfig = function () {
    let self = this;

    self.commandRouter.getUIConfigOnPlugin('user_interface', 'now_playing', {}).then(config => {
        self.commandRouter.broadcastMessage('pushUiConfig', config);
    });
}

ControllerNowPlaying.prototype.onVolumioStart = function () {
    let configFile = this.commandRouter.pluginManager.getConfigurationFile(this.context, 'config.json');
    this.config = new (require('v-conf'))();
    this.config.loadFile(configFile);

    return libQ.resolve();
}

ControllerNowPlaying.prototype.onStart = function () {
    let self = this;

    np.init(self.context, self.config);

    metadata.setAccessToken(np.getConfigValue('geniusAccessToken', ''));

    np.set('pluginInfo', util.getPluginInfo());

    // Register language change listener
    self.volumioLanguageChangeCallback = self.onVolumioLanguageChanged.bind(self);
    self.context.coreCommand.sharedVars.registerCallback('language_code', self.volumioLanguageChangeCallback);

    return self.startApp().then(() => {
        let display = np.getConfigValue('kioskDisplay', 'default');
        if (display == 'nowPlaying') {
            let kiosk = checkVolumioKiosk();
            if (kiosk.exists && kiosk.display == 'default') {
                self.modifyVolumioKioskScript(3000, np.getConfigValue('port', 4004));
            }
        }

        return libQ.resolve();
    });
};

ControllerNowPlaying.prototype.onStop = function () {
    this.stopApp();

    // If kiosk is set to Now Playing, restore it back to default
    let restoreKiosk;
    let kiosk = checkVolumioKiosk();
    if (kiosk.exists && kiosk.display == 'nowPlaying') {
        restoreKiosk = this.modifyVolumioKioskScript(np.getConfigValue('port', 4004), 3000);
    }
    else {
        restoreKiosk = libQ.resolve();
    }

    // Remove language change listener (this is hacky but prevents a potential
    // memory leak)
    if (this.config.callbacks && this.volumioLanguageChangeCallback) {
        this.config.callbacks.delete('language_code', this.volumioLanguageChangeCallback);
    }

    return restoreKiosk.fin(() => {
        np.reset();
    });
};

ControllerNowPlaying.prototype.getConfigurationFiles = function () {
    return ['config.json'];
}

ControllerNowPlaying.prototype.startApp = function () {
    let defer = libQ.defer();

    app.start({
        port: np.getConfigValue('port', 4004)
    })
        .then(() => {
            defer.resolve();
        })
        .catch(error => {
            np.toast('error', np.getI18n('NOW_PLAYING_DAEMON_START_ERR', error.message));
            defer.reject(error);
        });

    return defer.promise;
}

ControllerNowPlaying.prototype.stopApp = function () {
    app.stop();
}

ControllerNowPlaying.prototype.restartApp = function () {
    this.stopApp();
    return this.startApp();
}

ControllerNowPlaying.prototype.onVolumioLanguageChanged = function () {
    // Push localization settings
    np.getLogger().info('[now-playing] Volumio language changed - pushing localization settings');
    np.broadcastMessage('nowPlayingPushSettings', { namespace: 'localization', data: config.getLocalizationSettings() });
}

function checkVolumioKiosk() {
    try {
        if (!util.fileExists(volumioKioskPath)) {
            return {
                exists: false,
            };
        }

        if (util.findInFile(volumioKioskPath, 'localhost:3000')) {
            return {
                exists: true,
                display: 'default'
            };
        }

        if (util.findInFile(volumioKioskPath, `localhost:${np.getConfigValue('port', 4004)}`)) {
            return {
                exists: true,
                display: 'nowPlaying'
            };
        }

        return {
            exists: true,
            display: 'unknown'
        };

    } catch (error) {
        np.getLogger().error(np.getErrorMessage('[now-playing] Error reading Volumio Kiosk script: ', error));
        np.toast('error', np.getI18n('NOW_PLAYING_KIOSK_CHECK_ERR'));
        return {
            exists: false
        };
    }
}

function getVolumioBackgrounds() {
    try {
        return util.readdir(volumioBackgroundPath, 'thumbnail-');
    } catch (error) {
        np.getLogger().error(np.getErrorMessage(`[now-playing] Error getting Volumio backgrounds from ${volumioBackgroundPath}: `, error));
        np.toast('error', np.getI18n('NOW_PLAYING_GET_VOLUMIO_BG_ERR'));
        return [];
    }
}
