// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import libQ from 'kew';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import vconf from 'v-conf';

import geoTZ from 'geo-tz';
import np from './lib/NowPlayingContext';
import { jsPromiseToKew, kewToJSPromise, getVolumioBackgrounds } from './lib/utils/Misc';
import * as App from './app';
import CommonSettingsLoader from './lib/config/CommonSettingsLoader';
import ConfigHelper from './lib/config/ConfigHelper';
import * as SystemUtils from './lib/utils/System';
import * as KioskUtils from './lib/utils/Kiosk';
import ConfigUpdater from './lib/config/ConfigUpdater';
import metadataAPI from './lib/api/MetadataAPI';
import weatherAPI from './lib/api/WeatherAPI';
import { CommonSettingsCategory, LocalizationSettings, NowPlayingScreenSettings, PerformanceSettings, ThemeSettings } from 'now-playing-common';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type DockedComponentKey<T = keyof NowPlayingScreenSettings> = T extends `docked${infer _X}` ? T : never;

class ControllerNowPlaying {
  #context: any;
  #config: any;
  #commandRouter: any;
  #volumioLanguageChangeCallback: (() => void) | null;

  constructor(context: any) {
    this.#context = context;
    this.#commandRouter = this.#context.coreCommand;
    this.#volumioLanguageChangeCallback = null;
  }

  getUIConfig() {
    return jsPromiseToKew(this.#doGetUIConfig())
      .fail((error: any) => {
        np.getLogger().error(`[now-playing] getUIConfig(): Cannot populate configuration - ${error}`);
        throw error;
      });
  }

  async #doGetUIConfig() {
    const langCode = this.#commandRouter.sharedVars.get('language_code');
    const uiconf = await kewToJSPromise(this.#commandRouter.i18nJson(
      `${__dirname}/i18n/strings_${langCode}.json`,
      `${__dirname}/i18n/strings_en.json`,
      `${__dirname}/UIConfig.json`));

    const daemonUIConf = uiconf.sections[0];
    const localizationUIConf = uiconf.sections[1];
    const metadataServiceUIConf = uiconf.sections[2];
    const textStylesUIConf = uiconf.sections[4];
    const widgetStylesUIConf = uiconf.sections[5];
    const albumartStylesUIConf = uiconf.sections[6];
    const backgroundStylesUIConf = uiconf.sections[7];
    const actionPanelUIConf = uiconf.sections[8];
    const dockedMenuUIConf = uiconf.sections[9];
    const dockedActionPanelTriggerUIConf = uiconf.sections[10];
    const dockedVolumeIndicatorUIConf = uiconf.sections[11];
    const dockedClockUIConf = uiconf.sections[12];
    const dockedWeatherUIConf = uiconf.sections[13];
    const idleScreenUIConf = uiconf.sections[14];
    const extraScreensUIConf = uiconf.sections[15];
    const kioskUIConf = uiconf.sections[16];
    const performanceUIConf = uiconf.sections[17];

    /**
     * Daemon conf
     */
    const port = np.getConfigValue('port');
    daemonUIConf.content[0].value = port;

    // Get Now Playing Url
    const thisDevice = np.getDeviceInfo();
    const url = `${thisDevice.host}:${port}`;
    const previewUrl = `${url}/preview`;
    daemonUIConf.content[1].value = url;
    daemonUIConf.content[2].value = previewUrl;
    daemonUIConf.content[3].onClick.url = previewUrl;

    /**
     * Localization conf
     */
    const localization = CommonSettingsLoader.get(CommonSettingsCategory.Localization);
    const geoCoordSetupUrl = `${url}/geo_coord_setup`;

    localizationUIConf.content[0].value = localization.geoCoordinates;
    localizationUIConf.content[1].onClick.url = geoCoordSetupUrl;

    // Locale list
    const localeList = ConfigHelper.getLocaleList();
    const matchLocale = localeList.find((lc) => lc.value === localization.locale);
    if (matchLocale) {
      localizationUIConf.content[2].value = matchLocale;
    }
    else {
      localizationUIConf.content[2].value = {
        value: localization.locale,
        label: localization.locale
      };
    }
    localizationUIConf.content[2].options = localeList;

    // Timezone list
    const timezoneList = await ConfigHelper.getTimezoneList();
    const matchTimezone = timezoneList.find((tz) => tz.value === localization.timezone);
    if (matchTimezone) {
      localizationUIConf.content[3].value = matchTimezone;
    }
    else {
      localizationUIConf.content[3].value = {
        value: localization.timezone,
        label: localization.timezone
      };
    }
    localizationUIConf.content[3].options = timezoneList;

    // Unit system
    localizationUIConf.content[4].value = {
      value: localization.unitSystem
    };
    switch (localization.unitSystem) {
      case 'imperial':
        localizationUIConf.content[4].value.label = np.getI18n('NOW_PLAYING_UNITS_IMPERIAL');
        break;
      default: // Metric
        localizationUIConf.content[4].value.label = np.getI18n('NOW_PLAYING_UNITS_METRIC');
    }

    /**
     * Metadata Service conf
     */
    metadataServiceUIConf.content[0].value = np.getConfigValue('geniusAccessToken');
    const accessTokenSetupUrl = `${url}/genius_setup`;
    metadataServiceUIConf.content[1].onClick.url = accessTokenSetupUrl;

    /**
     * Text Styles conf
     */
    const nowPlayingScreen = CommonSettingsLoader.get(CommonSettingsCategory.NowPlayingScreen);

    textStylesUIConf.content[0].value = {
      value: nowPlayingScreen.fontSizes,
      label: nowPlayingScreen.fontSizes == 'auto' ? np.getI18n('NOW_PLAYING_AUTO') : np.getI18n('NOW_PLAYING_CUSTOM')
    };
    textStylesUIConf.content[1].value = nowPlayingScreen.titleFontSize;
    textStylesUIConf.content[2].value = nowPlayingScreen.artistFontSize;
    textStylesUIConf.content[3].value = nowPlayingScreen.albumFontSize;
    textStylesUIConf.content[4].value = nowPlayingScreen.mediaInfoFontSize;
    textStylesUIConf.content[5].value = nowPlayingScreen.seekTimeFontSize;
    textStylesUIConf.content[6].value = nowPlayingScreen.metadataFontSize;

    textStylesUIConf.content[7].value = {
      value: nowPlayingScreen.fontColors,
      label: nowPlayingScreen.fontColors == 'default' ? np.getI18n('NOW_PLAYING_DEFAULT') : np.getI18n('NOW_PLAYING_CUSTOM')
    };
    textStylesUIConf.content[8].value = nowPlayingScreen.titleFontColor;
    textStylesUIConf.content[9].value = nowPlayingScreen.artistFontColor;
    textStylesUIConf.content[10].value = nowPlayingScreen.albumFontColor;
    textStylesUIConf.content[11].value = nowPlayingScreen.mediaInfoFontColor;
    textStylesUIConf.content[12].value = nowPlayingScreen.seekTimeFontColor;
    textStylesUIConf.content[13].value = nowPlayingScreen.metadataFontColor;

    textStylesUIConf.content[14].value = {
      value: nowPlayingScreen.textMargins,
      label: nowPlayingScreen.textMargins == 'auto' ? np.getI18n('NOW_PLAYING_AUTO') : np.getI18n('NOW_PLAYING_CUSTOM')
    };
    textStylesUIConf.content[15].value = nowPlayingScreen.titleMargin;
    textStylesUIConf.content[16].value = nowPlayingScreen.artistMargin;
    textStylesUIConf.content[17].value = nowPlayingScreen.albumMargin;
    textStylesUIConf.content[18].value = nowPlayingScreen.mediaInfoMargin;

    textStylesUIConf.content[19].value = {
      value: nowPlayingScreen.textAlignmentH
    };
    switch (nowPlayingScreen.textAlignmentH) {
      case 'center':
        textStylesUIConf.content[19].value.label = np.getI18n('NOW_PLAYING_POSITION_CENTER');
        break;
      case 'right':
        textStylesUIConf.content[19].value.label = np.getI18n('NOW_PLAYING_POSITION_RIGHT');
        break;
      default: // Left
        textStylesUIConf.content[19].value.label = np.getI18n('NOW_PLAYING_POSITION_LEFT');
    }

    textStylesUIConf.content[20].value = {
      value: nowPlayingScreen.textAlignmentV
    };
    switch (nowPlayingScreen.textAlignmentV) {
      case 'center':
        textStylesUIConf.content[20].value.label = np.getI18n('NOW_PLAYING_POSITION_CENTER');
        break;
      case 'flex-end':
        textStylesUIConf.content[20].value.label = np.getI18n('NOW_PLAYING_POSITION_BOTTOM');
        break;
      case 'space-between':
        textStylesUIConf.content[20].value.label = np.getI18n('NOW_PLAYING_SPREAD');
        break;
      default: // Top
        textStylesUIConf.content[20].value.label = np.getI18n('NOW_PLAYING_POSITION_TOP');
    }

    textStylesUIConf.content[21].value = {
      value: nowPlayingScreen.textAlignmentLyrics
    };
    switch (nowPlayingScreen.textAlignmentLyrics) {
      case 'center':
        textStylesUIConf.content[21].value.label = np.getI18n('NOW_PLAYING_POSITION_CENTER');
        break;
      case 'right':
        textStylesUIConf.content[21].value.label = np.getI18n('NOW_PLAYING_POSITION_RIGHT');
        break;
      default: // Left
        textStylesUIConf.content[21].value.label = np.getI18n('NOW_PLAYING_POSITION_LEFT');
    }

    textStylesUIConf.content[22].value = {
      value: nowPlayingScreen.maxLines,
      label: nowPlayingScreen.maxLines == 'auto' ? np.getI18n('NOW_PLAYING_AUTO') : np.getI18n('NOW_PLAYING_CUSTOM')
    };
    textStylesUIConf.content[23].value = nowPlayingScreen.maxTitleLines;
    textStylesUIConf.content[24].value = nowPlayingScreen.maxArtistLines;
    textStylesUIConf.content[25].value = nowPlayingScreen.maxAlbumLines;

    textStylesUIConf.content[26].value = {
      value: nowPlayingScreen.trackInfoOrder,
      label: nowPlayingScreen.trackInfoOrder == 'default' ? np.getI18n('NOW_PLAYING_DEFAULT') : np.getI18n('NOW_PLAYING_CUSTOM')
    };
    textStylesUIConf.content[27].value = nowPlayingScreen.trackInfoTitleOrder;
    textStylesUIConf.content[28].value = nowPlayingScreen.trackInfoArtistOrder;
    textStylesUIConf.content[29].value = nowPlayingScreen.trackInfoAlbumOrder;
    textStylesUIConf.content[30].value = nowPlayingScreen.trackInfoMediaInfoOrder;

    textStylesUIConf.content[31].value = nowPlayingScreen.trackInfoMarqueeTitle;

    /**
     * Widget Styles conf
     */
    widgetStylesUIConf.content[0].value = {
      value: nowPlayingScreen.widgetColors,
      label: nowPlayingScreen.widgetColors == 'default' ? np.getI18n('NOW_PLAYING_DEFAULT') : np.getI18n('NOW_PLAYING_CUSTOM')
    };
    widgetStylesUIConf.content[1].value = nowPlayingScreen.widgetPrimaryColor;
    widgetStylesUIConf.content[2].value = nowPlayingScreen.widgetHighlightColor;

    widgetStylesUIConf.content[3].value = {
      value: nowPlayingScreen.widgetVisibility,
      label: nowPlayingScreen.widgetVisibility == 'default' ? np.getI18n('NOW_PLAYING_DEFAULT') : np.getI18n('NOW_PLAYING_CUSTOM')
    };
    widgetStylesUIConf.content[4].value = nowPlayingScreen.playbackButtonsVisibility;
    widgetStylesUIConf.content[5].value = nowPlayingScreen.seekbarVisibility;
    widgetStylesUIConf.content[6].value = {
      value: nowPlayingScreen.playbackButtonSizeType,
      label: nowPlayingScreen.playbackButtonSizeType == 'auto' ? np.getI18n('NOW_PLAYING_AUTO') : np.getI18n('NOW_PLAYING_CUSTOM')
    };
    widgetStylesUIConf.content[7].value = nowPlayingScreen.playbackButtonSize;

    widgetStylesUIConf.content[8].value = {
      value: nowPlayingScreen.widgetMargins,
      label: nowPlayingScreen.widgetMargins == 'auto' ? np.getI18n('NOW_PLAYING_AUTO') : np.getI18n('NOW_PLAYING_CUSTOM')
    };
    widgetStylesUIConf.content[9].value = nowPlayingScreen.playbackButtonsMargin;
    widgetStylesUIConf.content[10].value = nowPlayingScreen.seekbarMargin;

    /**
     * Albumart Styles conf
     */
    albumartStylesUIConf.content[0].value = nowPlayingScreen.albumartVisibility;
    albumartStylesUIConf.content[1].value = {
      value: nowPlayingScreen.albumartSize,
      label: nowPlayingScreen.albumartSize == 'auto' ? np.getI18n('NOW_PLAYING_AUTO') : np.getI18n('NOW_PLAYING_CUSTOM')
    };
    albumartStylesUIConf.content[2].value = nowPlayingScreen.albumartWidth;
    albumartStylesUIConf.content[3].value = nowPlayingScreen.albumartHeight;

    albumartStylesUIConf.content[4].value = {
      value: nowPlayingScreen.albumartFit
    };
    switch (nowPlayingScreen.albumartFit) {
      case 'contain':
        albumartStylesUIConf.content[4].value.label = np.getI18n('NOW_PLAYING_FIT_CONTAIN');
        break;
      case 'fill':
        albumartStylesUIConf.content[4].value.label = np.getI18n('NOW_PLAYING_FIT_FILL');
        break;
      default:
        albumartStylesUIConf.content[4].value.label = np.getI18n('NOW_PLAYING_FIT_COVER');
    }
    albumartStylesUIConf.content[5].value = nowPlayingScreen.albumartBorder;
    albumartStylesUIConf.content[6].value = nowPlayingScreen.albumartBorderRadius;
    if (!nowPlayingScreen.albumartVisibility) {
      albumartStylesUIConf.content = [ albumartStylesUIConf.content[0] ];
      albumartStylesUIConf.saveButton.data = [ 'albumartVisibility' ];
    }

    /**
    * Background Styles Conf
    */
    const backgroundSettings = CommonSettingsLoader.get(CommonSettingsCategory.Background);
    backgroundStylesUIConf.content[0].value = {
      value: backgroundSettings.backgroundType
    };
    switch (backgroundSettings.backgroundType) {
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

    backgroundStylesUIConf.content[1].value = backgroundSettings.backgroundColor;

    backgroundStylesUIConf.content[2].value = {
      value: backgroundSettings.albumartBackgroundFit
    };
    switch (backgroundSettings.albumartBackgroundFit) {
      case 'contain':
        backgroundStylesUIConf.content[2].value.label = np.getI18n('NOW_PLAYING_FIT_CONTAIN');
        break;
      case 'fill':
        backgroundStylesUIConf.content[2].value.label = np.getI18n('NOW_PLAYING_FIT_FILL');
        break;
      default:
        backgroundStylesUIConf.content[2].value.label = np.getI18n('NOW_PLAYING_FIT_COVER');
    }
    backgroundStylesUIConf.content[3].value = {
      value: backgroundSettings.albumartBackgroundPosition
    };
    switch (backgroundSettings.albumartBackgroundPosition) {
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

    const volumioBackgrounds = getVolumioBackgrounds();
    let volumioBackgroundImage = backgroundSettings.volumioBackgroundImage;
    if (volumioBackgroundImage !== '' && !volumioBackgrounds.includes(volumioBackgroundImage)) {
      volumioBackgroundImage = ''; // Image no longer exists
    }
    backgroundStylesUIConf.content[6].value = {
      value: volumioBackgroundImage,
      label: volumioBackgroundImage
    };
    backgroundStylesUIConf.content[6].options = volumioBackgrounds.map((bg) => ({
      value: bg,
      label: bg
    }));
    backgroundStylesUIConf.content[7].value = {
      value: backgroundSettings.volumioBackgroundFit
    };
    switch (backgroundSettings.volumioBackgroundFit) {
      case 'contain':
        backgroundStylesUIConf.content[7].value.label = np.getI18n('NOW_PLAYING_FIT_CONTAIN');
        break;
      case 'fill':
        backgroundStylesUIConf.content[7].value.label = np.getI18n('NOW_PLAYING_FIT_FILL');
        break;
      default:
        backgroundStylesUIConf.content[7].value.label = np.getI18n('NOW_PLAYING_FIT_COVER');
    }
    backgroundStylesUIConf.content[8].value = {
      value: backgroundSettings.volumioBackgroundPosition
    };
    switch (backgroundSettings.volumioBackgroundPosition) {
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
    backgroundStylesUIConf.content[9].value = backgroundSettings.volumioBackgroundBlur;
    backgroundStylesUIConf.content[10].value = backgroundSettings.volumioBackgroundScale;

    backgroundStylesUIConf.content[11].value = {
      value: backgroundSettings.backgroundOverlay
    };
    switch (backgroundSettings.backgroundOverlay) {
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
    backgroundStylesUIConf.content[12].value = backgroundSettings.backgroundOverlayColor;
    backgroundStylesUIConf.content[13].value = backgroundSettings.backgroundOverlayColorOpacity;
    backgroundStylesUIConf.content[14].value = backgroundSettings.backgroundOverlayGradient;
    backgroundStylesUIConf.content[15].value = backgroundSettings.backgroundOverlayGradientOpacity;

    /**
     * Action Panel
     */
    const actionPanelSettings = CommonSettingsLoader.get(CommonSettingsCategory.ActionPanel);
    actionPanelUIConf.content[0].value = actionPanelSettings.showVolumeSlider;

    /**
     * Docked Menu
     */
    const dockedMenu = nowPlayingScreen.dockedMenu;
    dockedMenuUIConf.content[0].value = dockedMenu.enabled;

    /**
     * Docked Action Panel Trigger
     */
    const dockedActionPanelTrigger = nowPlayingScreen.dockedActionPanelTrigger;
    dockedActionPanelTriggerUIConf.content[0].value = dockedActionPanelTrigger.enabled;
    dockedActionPanelTriggerUIConf.content[1].value = {
      value: dockedActionPanelTrigger.iconSettings,
      label: dockedActionPanelTrigger.iconSettings == 'default' ? np.getI18n('NOW_PLAYING_DEFAULT') : np.getI18n('NOW_PLAYING_CUSTOM')
    };
    dockedActionPanelTriggerUIConf.content[2].value = {
      value: dockedActionPanelTrigger.iconStyle
    };
    switch (dockedActionPanelTrigger.iconStyle) {
      case 'expand_circle_down':
        dockedActionPanelTriggerUIConf.content[2].value.label = np.getI18n('NOW_PLAYING_CHEVRON_CIRCLE');
        break;
      case 'arrow_drop_down':
        dockedActionPanelTriggerUIConf.content[2].value.label = np.getI18n('NOW_PLAYING_CARET');
        break;
      case 'arrow_drop_down_circle':
        dockedActionPanelTriggerUIConf.content[2].value.label = np.getI18n('NOW_PLAYING_CARET_CIRCLE');
        break;
      case 'arrow_downward':
        dockedActionPanelTriggerUIConf.content[2].value.label = np.getI18n('NOW_PLAYING_ARROW');
        break;
      case 'arrow_circle_down':
        dockedActionPanelTriggerUIConf.content[2].value.label = np.getI18n('NOW_PLAYING_ARROW_CIRCLE');
        break;
      default:
        dockedActionPanelTriggerUIConf.content[2].value.label = np.getI18n('NOW_PLAYING_CHEVRON');
    }
    dockedActionPanelTriggerUIConf.content[3].value = dockedActionPanelTrigger.iconSize;
    dockedActionPanelTriggerUIConf.content[4].value = dockedActionPanelTrigger.iconColor;
    dockedActionPanelTriggerUIConf.content[5].value = dockedActionPanelTrigger.opacity;
    dockedActionPanelTriggerUIConf.content[6].value = dockedActionPanelTrigger.margin;
    if (!dockedActionPanelTrigger.enabled) {
      dockedActionPanelTriggerUIConf.content = [ dockedActionPanelTriggerUIConf.content[0] ];
      dockedActionPanelTriggerUIConf.saveButton.data = [ 'enabled' ];
    }

    /**
     * Docked Volume Indicator
     */
    const dockedVolumeIndicator = nowPlayingScreen.dockedVolumeIndicator;
    dockedVolumeIndicatorUIConf.content[0].value = dockedVolumeIndicator.enabled;
    dockedVolumeIndicatorUIConf.content[1].value = {
      value: dockedVolumeIndicator.placement
    };
    switch (dockedVolumeIndicator.placement) {
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
    dockedVolumeIndicatorUIConf.content[2].value = dockedVolumeIndicator.displayOrder;
    dockedVolumeIndicatorUIConf.content[3].value = {
      value: dockedVolumeIndicator.fontSettings,
      label: dockedVolumeIndicator.fontSettings == 'default' ? np.getI18n('NOW_PLAYING_DEFAULT') : np.getI18n('NOW_PLAYING_CUSTOM')
    };
    dockedVolumeIndicatorUIConf.content[4].value = dockedVolumeIndicator.fontSize;
    dockedVolumeIndicatorUIConf.content[5].value = dockedVolumeIndicator.fontColor;
    dockedVolumeIndicatorUIConf.content[6].value = {
      value: dockedVolumeIndicator.iconSettings,
      label: dockedVolumeIndicator.iconSettings == 'default' ? np.getI18n('NOW_PLAYING_DEFAULT') : np.getI18n('NOW_PLAYING_CUSTOM')
    };
    dockedVolumeIndicatorUIConf.content[7].value = dockedVolumeIndicator.iconSize;
    dockedVolumeIndicatorUIConf.content[8].value = dockedVolumeIndicator.iconColor;
    dockedVolumeIndicatorUIConf.content[9].value = dockedVolumeIndicator.margin;
    dockedVolumeIndicatorUIConf.content[10].value = dockedVolumeIndicator.showVolumeBarOnClick;
    dockedVolumeIndicatorUIConf.content[11].value = {
      value: dockedVolumeIndicator.volumeBarPosition
    };
    switch (dockedVolumeIndicator.volumeBarPosition) {
      case 'anchored':
        dockedVolumeIndicatorUIConf.content[11].value.label = np.getI18n('NOW_PLAYING_VOL_BAR_ANCHORED');
        break;
      default:
        dockedVolumeIndicatorUIConf.content[11].value.label = np.getI18n('NOW_PLAYING_VOL_BAR_CENTER');
    }
    dockedVolumeIndicatorUIConf.content[12].value = {
      value: dockedVolumeIndicator.volumeBarOrientation
    };
    switch (dockedVolumeIndicator.volumeBarOrientation) {
      case 'vertical':
        dockedVolumeIndicatorUIConf.content[12].value.label = np.getI18n('NOW_PLAYING_VERTICAL');
        break;
      default:
        dockedVolumeIndicatorUIConf.content[12].value.label = np.getI18n('NOW_PLAYING_HORIZONTAL');
    }
    if (!dockedVolumeIndicator.enabled) {
      dockedVolumeIndicatorUIConf.content = [ dockedVolumeIndicatorUIConf.content[0] ];
      dockedVolumeIndicatorUIConf.saveButton.data = [ 'enabled' ];
    }

    /**
     * Docked Clock
     */
    const dockedClock = nowPlayingScreen.dockedClock;
    dockedClockUIConf.content[0].value = dockedClock.enabled;
    dockedClockUIConf.content[1].value = {
      value: dockedClock.placement
    };
    switch (dockedClock.placement) {
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
    dockedClockUIConf.content[2].value = dockedClock.displayOrder;
    dockedClockUIConf.content[3].value = {
      value: dockedClock.showInfo
    };
    switch (dockedClock.showInfo) {
      case 'time':
        dockedClockUIConf.content[3].value.label = np.getI18n('NOW_PLAYING_TIME_ONLY');
        break;
      case 'date':
        dockedClockUIConf.content[3].value.label = np.getI18n('NOW_PLAYING_DATE_ONLY');
        break;
      default:
        dockedClockUIConf.content[3].value.label = np.getI18n('NOW_PLAYING_DATE_TIME');
    }
    dockedClockUIConf.content[4].value = {
      value: dockedClock.fontSettings,
      label: dockedClock.fontSettings == 'default' ? np.getI18n('NOW_PLAYING_DEFAULT') : np.getI18n('NOW_PLAYING_CUSTOM')
    };
    dockedClockUIConf.content[5].value = dockedClock.fontSize;
    dockedClockUIConf.content[6].value = dockedClock.dateColor;
    dockedClockUIConf.content[7].value = dockedClock.timeColor;
    dockedClockUIConf.content[8].value = {
      value: dockedClock.dateFormat,
      label: dockedClock.dateFormat == 'default' ? np.getI18n('NOW_PLAYING_DEFAULT') : np.getI18n('NOW_PLAYING_CUSTOM')
    };
    dockedClockUIConf.content[9].value = {
      value: dockedClock.yearFormat
    };
    switch (dockedClock.yearFormat) {
      case 'numeric':
        dockedClockUIConf.content[9].value.label = np.getI18n('NOW_PLAYING_NUMERIC_YEAR');
        break;
      case '2-digit':
        dockedClockUIConf.content[9].value.label = np.getI18n('NOW_PLAYING_2DIGIT_YEAR');
        break;
      default:
        dockedClockUIConf.content[9].value.label = np.getI18n('NOW_PLAYING_NONE');
    }
    dockedClockUIConf.content[10].value = {
      value: dockedClock.monthFormat
    };
    switch (dockedClock.monthFormat) {
      case 'numeric':
        dockedClockUIConf.content[10].value.label = np.getI18n('NOW_PLAYING_NUMERIC_MONTH');
        break;
      case '2-digit':
        dockedClockUIConf.content[10].value.label = np.getI18n('NOW_PLAYING_2DIGIT_MONTH');
        break;
      case 'long':
        dockedClockUIConf.content[10].value.label = np.getI18n('NOW_PLAYING_LONG_MONTH');
        break;
      default:
        dockedClockUIConf.content[10].value.label = np.getI18n('NOW_PLAYING_SHORT_MONTH');
    }
    dockedClockUIConf.content[11].value = {
      value: dockedClock.dayFormat
    };
    switch (dockedClock.dayFormat) {
      case '2-digit':
        dockedClockUIConf.content[11].value.label = np.getI18n('NOW_PLAYING_2DIGIT_DAY');
        break;
      default:
        dockedClockUIConf.content[11].value.label = np.getI18n('NOW_PLAYING_NUMERIC_DAY');
    }
    dockedClockUIConf.content[12].value = {
      value: dockedClock.dayOfWeekFormat
    };
    switch (dockedClock.dayOfWeekFormat) {
      case 'long':
        dockedClockUIConf.content[12].value.label = np.getI18n('NOW_PLAYING_LONG_DAY_OF_WEEK');
        break;
      case 'short':
        dockedClockUIConf.content[12].value.label = np.getI18n('NOW_PLAYING_SHORT_DAY_OF_WEEK');
        break;
      default:
        dockedClockUIConf.content[12].value.label = np.getI18n('NOW_PLAYING_NONE');
    }
    dockedClockUIConf.content[13].value = {
      value: dockedClock.timeFormat,
      label: dockedClock.timeFormat == 'default' ? np.getI18n('NOW_PLAYING_DEFAULT') : np.getI18n('NOW_PLAYING_CUSTOM')
    };
    dockedClockUIConf.content[14].value = {
      value: dockedClock.hourFormat
    };
    switch (dockedClock.hourFormat) {
      case '2-digit':
        dockedClockUIConf.content[14].value.label = np.getI18n('NOW_PLAYING_2DIGIT_HOUR');
        break;
      default:
        dockedClockUIConf.content[14].value.label = np.getI18n('NOW_PLAYING_NUMERIC_HOUR');
    }
    dockedClockUIConf.content[15].value = dockedClock.hour24;
    dockedClockUIConf.content[16].value = dockedClock.showSeconds;
    dockedClockUIConf.content[17].value = dockedClock.margin;
    if (!dockedClock.enabled) {
      dockedClockUIConf.content = [ dockedClockUIConf.content[0] ];
      dockedClockUIConf.saveButton.data = [ 'enabled' ];
    }

    /**
     * Docked Weather
     */
    const dockedWeather = nowPlayingScreen.dockedWeather;
    dockedWeatherUIConf.content[0].value = dockedWeather.enabled;
    dockedWeatherUIConf.content[1].value = {
      value: dockedWeather.placement
    };
    switch (dockedWeather.placement) {
      case 'top-left':
        dockedWeatherUIConf.content[1].value.label = np.getI18n('NOW_PLAYING_POSITION_TOP_LEFT');
        break;
      case 'top':
        dockedWeatherUIConf.content[1].value.label = np.getI18n('NOW_PLAYING_POSITION_TOP');
        break;
      case 'top-right':
        dockedWeatherUIConf.content[1].value.label = np.getI18n('NOW_PLAYING_POSITION_TOP_RIGHT');
        break;
      case 'left':
        dockedWeatherUIConf.content[1].value.label = np.getI18n('NOW_PLAYING_POSITION_LEFT');
        break;
      case 'right':
        dockedWeatherUIConf.content[1].value.label = np.getI18n('NOW_PLAYING_POSITION_RIGHT');
        break;
      case 'bottom-left':
        dockedWeatherUIConf.content[1].value.label = np.getI18n('NOW_PLAYING_POSITION_BOTTOM_LEFT');
        break;
      case 'bottom':
        dockedWeatherUIConf.content[1].value.label = np.getI18n('NOW_PLAYING_POSITION_BOTTOM');
        break;
      default:
        dockedWeatherUIConf.content[1].value.label = np.getI18n('NOW_PLAYING_POSITION_BOTTOM_RIGHT');
    }
    dockedWeatherUIConf.content[2].value = dockedWeather.displayOrder;
    dockedWeatherUIConf.content[3].value = dockedWeather.showHumidity;
    dockedWeatherUIConf.content[4].value = dockedWeather.showWindSpeed;
    dockedWeatherUIConf.content[5].value = {
      value: dockedWeather.fontSettings,
      label: dockedWeather.fontSettings == 'default' ? np.getI18n('NOW_PLAYING_DEFAULT') : np.getI18n('NOW_PLAYING_CUSTOM')
    };
    dockedWeatherUIConf.content[6].value = dockedWeather.fontSize;
    dockedWeatherUIConf.content[7].value = dockedWeather.fontColor;
    dockedWeatherUIConf.content[8].value = {
      value: dockedWeather.iconSettings,
      label: dockedWeather.iconSettings == 'default' ? np.getI18n('NOW_PLAYING_DEFAULT') : np.getI18n('NOW_PLAYING_CUSTOM')
    };
    dockedWeatherUIConf.content[9].value = {
      value: dockedWeather.iconStyle
    };
    switch (dockedWeather.iconStyle) {
      case 'outline':
        dockedWeatherUIConf.content[9].value.label = np.getI18n('NOW_PLAYING_OUTLINE');
        break;
      case 'mono':
        dockedWeatherUIConf.content[9].value.label = np.getI18n('NOW_PLAYING_MONOCHROME');
        break;
      default:
        dockedWeatherUIConf.content[9].value.label = np.getI18n('NOW_PLAYING_FILLED');
    }
    dockedWeatherUIConf.content[10].value = dockedWeather.iconSize;
    dockedWeatherUIConf.content[11].value = dockedWeather.iconMonoColor;
    dockedWeatherUIConf.content[12].value = dockedWeather.iconAnimate;
    dockedWeatherUIConf.content[13].value = dockedWeather.margin;
    if (!dockedWeather.enabled) {
      dockedWeatherUIConf.content = [ dockedWeatherUIConf.content[0] ];
      dockedWeatherUIConf.saveButton.data = [ 'enabled' ];
    }

    /**
     * Idle Screen conf
     */
    const idleScreen = CommonSettingsLoader.get(CommonSettingsCategory.IdleScreen);
    let idleScreenVolumioImage = idleScreen.volumioBackgroundImage;

    idleScreenUIConf.content[0].value = {
      value: idleScreen.enabled
    };
    switch (idleScreen.enabled) {
      case 'all':
        idleScreenUIConf.content[0].value.label = np.getI18n('NOW_PLAYING_ALL_CLIENTS');
        break;
      case 'disabled':
        idleScreenUIConf.content[0].value.label = np.getI18n('NOW_PLAYING_DISABLED');
        break;
      default:
        idleScreenUIConf.content[0].value.label = np.getI18n('NOW_PLAYING_KIOSK_ONLY');
        break;
    }
    idleScreenUIConf.content[1].value = idleScreen.waitTime;
    idleScreenUIConf.content[2].value = idleScreen.showLocation;
    idleScreenUIConf.content[3].value = idleScreen.showWeather;
    idleScreenUIConf.content[4].value = {
      value: idleScreen.mainAlignment
    };
    switch (idleScreen.mainAlignment) {
      case 'center':
        idleScreenUIConf.content[4].value.label = np.getI18n('NOW_PLAYING_POSITION_CENTER');
        break;
      case 'flex-end':
        idleScreenUIConf.content[4].value.label = np.getI18n('NOW_PLAYING_POSITION_RIGHT');
        break;
      case 'cycle':
        idleScreenUIConf.content[4].value.label = np.getI18n('NOW_PLAYING_CYCLE');
        break;
      default: // 'flex-start'
        idleScreenUIConf.content[4].value.label = np.getI18n('NOW_PLAYING_POSITION_LEFT');
    }
    idleScreenUIConf.content[5].value = idleScreen.mainAlignmentCycleInterval;
    idleScreenUIConf.content[6].value = {
      value: idleScreen.timeFormat,
      label: idleScreen.timeFormat == 'default' ? np.getI18n('NOW_PLAYING_DEFAULT') : np.getI18n('NOW_PLAYING_CUSTOM')
    };
    idleScreenUIConf.content[7].value = idleScreen.hour24;
    idleScreenUIConf.content[8].value = idleScreen.showSeconds;
    idleScreenUIConf.content[9].value = {
      value: idleScreen.fontSizes,
      label: idleScreen.fontSizes == 'auto' ? np.getI18n('NOW_PLAYING_AUTO') : np.getI18n('NOW_PLAYING_CUSTOM')
    };
    idleScreenUIConf.content[10].value = idleScreen.timeFontSize;
    idleScreenUIConf.content[11].value = idleScreen.dateFontSize;
    idleScreenUIConf.content[12].value = idleScreen.locationFontSize;
    idleScreenUIConf.content[13].value = idleScreen.weatherCurrentBaseFontSize;
    idleScreenUIConf.content[14].value = idleScreen.weatherForecastBaseFontSize;
    idleScreenUIConf.content[15].value = {
      value: idleScreen.fontColors,
      label: idleScreen.fontColors == 'default' ? np.getI18n('NOW_PLAYING_DEFAULT') : np.getI18n('NOW_PLAYING_CUSTOM')
    };
    idleScreenUIConf.content[16].value = idleScreen.timeColor;
    idleScreenUIConf.content[17].value = idleScreen.dateColor;
    idleScreenUIConf.content[18].value = idleScreen.locationColor;
    idleScreenUIConf.content[19].value = idleScreen.weatherCurrentColor;
    idleScreenUIConf.content[20].value = idleScreen.weatherForecastColor;
    idleScreenUIConf.content[21].value = {
      value: idleScreen.weatherIconSettings,
      label: idleScreen.weatherIconSettings == 'default' ? np.getI18n('NOW_PLAYING_DEFAULT') : np.getI18n('NOW_PLAYING_CUSTOM')
    };
    idleScreenUIConf.content[22].value = {
      value: idleScreen.weatherIconStyle
    };
    switch (idleScreen.weatherIconStyle) {
      case 'outline':
        idleScreenUIConf.content[22].value.label = np.getI18n('NOW_PLAYING_OUTLINE');
        break;
      case 'mono':
        idleScreenUIConf.content[22].value.label = np.getI18n('NOW_PLAYING_MONOCHROME');
        break;
      default:
        idleScreenUIConf.content[22].value.label = np.getI18n('NOW_PLAYING_FILLED');
        break;
    }
    idleScreenUIConf.content[23].value = idleScreen.weatherCurrentIconSize;
    idleScreenUIConf.content[24].value = idleScreen.weatherForecastIconSize;
    idleScreenUIConf.content[25].value = idleScreen.weatherCurrentIconMonoColor;
    idleScreenUIConf.content[26].value = idleScreen.weatherForecastIconMonoColor;
    idleScreenUIConf.content[27].value = idleScreen.weatherCurrentIconAnimate;
    idleScreenUIConf.content[28].value = {
      value: idleScreen.backgroundType
    };
    switch (idleScreen.backgroundType) {
      case 'color':
        idleScreenUIConf.content[28].value.label = np.getI18n('NOW_PLAYING_COLOR');
        break;
      case 'volumioBackground':
        idleScreenUIConf.content[28].value.label = np.getI18n('NOW_PLAYING_VOLUMIO_BACKGROUND');
        break;
      default:
        idleScreenUIConf.content[28].value.label = np.getI18n('NOW_PLAYING_UNSPLASH');
    }
    idleScreenUIConf.content[29].value = idleScreen.backgroundColor;
    if (idleScreenVolumioImage !== '' && !volumioBackgrounds.includes(idleScreenVolumioImage)) {
      idleScreenVolumioImage = ''; // Image no longer exists
    }
    idleScreenUIConf.content[30].value = {
      value: idleScreenVolumioImage,
      label: idleScreenVolumioImage
    };
    idleScreenUIConf.content[30].options = [];
    volumioBackgrounds.forEach((bg) => {
      idleScreenUIConf.content[30].options.push({
        value: bg,
        label: bg
      });
    });
    idleScreenUIConf.content[31].value = {
      value: idleScreen.volumioBackgroundFit
    };
    switch (idleScreen.volumioBackgroundFit) {
      case 'contain':
        idleScreenUIConf.content[31].value.label = np.getI18n('NOW_PLAYING_FIT_CONTAIN');
        break;
      case 'fill':
        idleScreenUIConf.content[31].value.label = np.getI18n('NOW_PLAYING_FIT_FILL');
        break;
      default:
        idleScreenUIConf.content[31].value.label = np.getI18n('NOW_PLAYING_FIT_COVER');
    }
    idleScreenUIConf.content[32].value = {
      value: idleScreen.volumioBackgroundPosition
    };
    switch (idleScreen.volumioBackgroundPosition) {
      case 'top':
        idleScreenUIConf.content[32].value.label = np.getI18n('NOW_PLAYING_POSITION_TOP');
        break;
      case 'left':
        idleScreenUIConf.content[32].value.label = np.getI18n('NOW_PLAYING_POSITION_LEFT');
        break;
      case 'bottom':
        idleScreenUIConf.content[32].value.label = np.getI18n('NOW_PLAYING_POSITION_BOTTOM');
        break;
      case 'right':
        idleScreenUIConf.content[32].value.label = np.getI18n('NOW_PLAYING_POSITION_RIGHT');
        break;
      default:
        idleScreenUIConf.content[32].value.label = np.getI18n('NOW_PLAYING_POSITION_CENTER');
    }
    idleScreenUIConf.content[33].value = idleScreen.volumioBackgroundBlur;
    idleScreenUIConf.content[34].value = idleScreen.volumioBackgroundScale;
    idleScreenUIConf.content[35].value = idleScreen.unsplashKeywords;
    idleScreenUIConf.content[36].value = idleScreen.unsplashKeywordsAppendDayPeriod;
    idleScreenUIConf.content[37].value = idleScreen.unsplashMatchScreenSize;
    idleScreenUIConf.content[38].value = idleScreen.unsplashRefreshInterval;
    idleScreenUIConf.content[39].value = idleScreen.unsplashBackgroundBlur;
    idleScreenUIConf.content[40].value = {
      value: idleScreen.backgroundOverlay
    };
    switch (idleScreen.backgroundOverlay) {
      case 'customColor':
        idleScreenUIConf.content[40].value.label = np.getI18n('NOW_PLAYING_CUSTOM_COLOR');
        break;
      case 'customGradient':
        idleScreenUIConf.content[40].value.label = np.getI18n('NOW_PLAYING_CUSTOM_GRADIENT');
        break;
      case 'none':
        idleScreenUIConf.content[40].value.label = np.getI18n('NOW_PLAYING_NONE');
        break;
      default:
        idleScreenUIConf.content[40].value.label = np.getI18n('NOW_PLAYING_DEFAULT');
    }
    idleScreenUIConf.content[41].value = idleScreen.backgroundOverlayColor;
    idleScreenUIConf.content[42].value = idleScreen.backgroundOverlayColorOpacity;
    idleScreenUIConf.content[43].value = idleScreen.backgroundOverlayGradient;
    idleScreenUIConf.content[44].value = idleScreen.backgroundOverlayGradientOpacity;
    idleScreenUIConf.content[45].value = {
      value: idleScreen.weatherBackground
    };
    switch (idleScreen.weatherBackground) {
      case 'customColor':
        idleScreenUIConf.content[45].value.label = np.getI18n('NOW_PLAYING_CUSTOM_COLOR');
        break;
      case 'customGradient':
        idleScreenUIConf.content[45].value.label = np.getI18n('NOW_PLAYING_CUSTOM_GRADIENT');
        break;
      case 'none':
        idleScreenUIConf.content[45].value.label = np.getI18n('NOW_PLAYING_NONE');
        break;
      default:
        idleScreenUIConf.content[45].value.label = np.getI18n('NOW_PLAYING_DEFAULT');
    }
    idleScreenUIConf.content[46].value = idleScreen.weatherBackgroundColor;
    idleScreenUIConf.content[47].value = idleScreen.weatherBackgroundColorOpacity;
    idleScreenUIConf.content[48].value = idleScreen.weatherBackgroundGradient;
    idleScreenUIConf.content[49].value = idleScreen.weatherBackgroundGradientOpacity;

    if (idleScreen.enabled === 'disabled') {
      idleScreenUIConf.content = [ idleScreenUIConf.content[0] ];
      idleScreenUIConf.saveButton.data = [ 'enabled' ];
    }

    /**
     * Extra Screens conf
     */
    const theme = CommonSettingsLoader.get(CommonSettingsCategory.Theme);
    extraScreensUIConf.content[0].value = {
      value: theme
    };
    switch (theme.active) {
      case 'glass':
        extraScreensUIConf.content[0].value.label = np.getI18n('NOW_PLAYING_GLASS');
        break;
      default:
        extraScreensUIConf.content[0].value.label = np.getI18n('NOW_PLAYING_DEFAULT');
    }

    /**
     * Kiosk conf
     */
    const kiosk = KioskUtils.checkVolumioKiosk();
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
      if (KioskUtils.volumioKioskBackupPathExists()) {
        kioskDesc += ` ${np.getI18n('NOW_PLAYING_DOC_KIOSK_RESTORE_BAK')}`;
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
      kioskUIConf.content = [ kioskButton ];
    }

    // Performance conf
    const performanceSettings = CommonSettingsLoader.get(CommonSettingsCategory.Performance);
    performanceUIConf.content[0].value = performanceSettings.transitionEffectsKiosk;
    performanceUIConf.content[1].value = performanceSettings.transitionEffectsOtherDevices;
    performanceUIConf.content[2].value = {
      value: performanceSettings.unmountScreensOnExit,
      label: performanceSettings.unmountScreensOnExit == 'default' ? np.getI18n('NOW_PLAYING_DEFAULT') : np.getI18n('NOW_PLAYING_CUSTOM')
    };
    performanceUIConf.content[3].value = performanceSettings.unmountNowPlayingScreenOnExit;
    performanceUIConf.content[4].value = performanceSettings.unmountBrowseScreenOnExit;
    performanceUIConf.content[5].value = performanceSettings.unmountQueueScreenOnExit;
    performanceUIConf.content[6].value = performanceSettings.unmountVolumioScreenOnExit;

    return uiconf;
  }

  configureVolumioKiosk(data: { display: 'nowPlaying' | 'default' }) {
    KioskUtils.configureVolumioKiosk(data.display).finally(() => {
      np.refreshUIConfig();
    });
  }

  restoreVolumioKioskBak() {
    KioskUtils.restoreVolumioKiosk().finally(() => {
      np.refreshUIConfig();
    });
  }

  configSaveDaemon(data: Record<string, any>) {
    const oldPort = np.getConfigValue('port');
    const port = parseInt(data['port'], 10);
    if (port < 1024 || port > 65353) {
      np.toast('error', np.getI18n('NOW_PLAYING_INVALID_PORT'));
      return;
    }

    if (oldPort !== port) {
      const modalData = {
        title: np.getI18n('NOW_PLAYING_CONFIGURATION'),
        message: np.getI18n('NOW_PLAYING_CONF_RESTART_CONFIRM'),
        size: 'lg',
        buttons: [
          {
            name: np.getI18n('NOW_PLAYING_NO'),
            class: 'btn btn-warning'
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
      np.broadcastMessage('openModal', modalData);
    }
    else {
      np.toast('success', np.getI18n('NOW_PLAYING_SETTINGS_SAVED'));
    }
  }

  configConfirmSaveDaemon(data: Record<string, any>) {
    // Obtain kiosk info before saving new port
    const kiosk = KioskUtils.checkVolumioKiosk();

    np.setConfigValue('port', data.port);

    this.#restartApp().then(() => {
      np.toast('success', np.getI18n('NOW_PLAYING_RESTARTED'));

      // Update cached plugin info and broadcast it
      np.delete('pluginInfo');
      this.#broadcastPluginInfo();

      /**
       * Check if kiosk script was set to show Now Playing, and update
       * to new port (do not restart volumio-kiosk service because
       * the screen will reload itself when app is started).
       */
      if (kiosk.exists && kiosk.display == 'nowPlaying') {
        KioskUtils.modifyVolumioKioskScript(data.oldPort, data.port, false);
      }

      np.refreshUIConfig();
    })
      .catch(() => {
        np.setConfigValue('port', data['oldPort']);
        np.refreshUIConfig();
      });
  }

  configSaveTextStyles(data: Record<string, any>) {
    const maxTitleLines = data.maxTitleLines !== '' ? parseInt(data.maxTitleLines, 10) : '';
    const maxArtistLines = data.maxArtistLines !== '' ? parseInt(data.maxArtistLines, 10) : '';
    const maxAlbumLines = data.maxAlbumLines !== '' ? parseInt(data.maxAlbumLines, 10) : '';
    const trackInfoTitleOrder = data.trackInfoTitleOrder !== '' ? parseInt(data.trackInfoTitleOrder, 10) : '';
    const trackInfoArtistOrder = data.trackInfoArtistOrder !== '' ? parseInt(data.trackInfoArtistOrder, 10) : '';
    const trackInfoAlbumOrder = data.trackInfoAlbumOrder !== '' ? parseInt(data.trackInfoAlbumOrder, 10) : '';
    const trackInfoMediaInfoOrder = data.trackInfoMediaInfoOrder !== '' ? parseInt(data.trackInfoMediaInfoOrder, 10) : '';
    const apply = {
      fontSizes: data.fontSizes.value,
      titleFontSize: data.titleFontSize,
      artistFontSize: data.artistFontSize,
      albumFontSize: data.albumFontSize,
      mediaInfoFontSize: data.mediaInfoFontSize,
      seekTimeFontSize: data.seekTimeFontSize,
      metadataFontSize: data.metadataFontSize,
      fontColors: data.fontColors.value,
      titleFontColor: data.titleFontColor,
      artistFontColor: data.artistFontColor,
      albumFontColor: data.albumFontColor,
      mediaInfoFontColor: data.mediaInfoFontColor,
      seekTimeFontColor: data.seekTimeFontColor,
      metadataFontColor: data.metadataFontColor,
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
      trackInfoMediaInfoOrder,
      trackInfoMarqueeTitle: data.trackInfoMarqueeTitle
    };
    const current = np.getConfigValue('screen.nowPlaying');
    const updated = Object.assign(current, apply);
    np.setConfigValue('screen.nowPlaying', updated);
    np.toast('success', np.getI18n('NOW_PLAYING_SETTINGS_SAVED'));

    this.#notifyCommonSettingsUpdated(CommonSettingsCategory.NowPlayingScreen);
  }

  configSaveWidgetStyles(data: Record<string, any>) {
    const apply = {
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
    const current = np.getConfigValue('screen.nowPlaying');
    const updated = Object.assign(current, apply);
    np.setConfigValue('screen.nowPlaying', updated);
    np.toast('success', np.getI18n('NOW_PLAYING_SETTINGS_SAVED'));

    this.#notifyCommonSettingsUpdated(CommonSettingsCategory.NowPlayingScreen);
  }

  #parseConfigSaveData(data: object) {
    const apply: Record<string, any> = {};
    for (const [ key, value ] of Object.entries(data)) {
      // Check if dropdown selection
      if (typeof value === 'object' && Reflect.has(value, 'value')) {
        apply[key] = value.value;
      }
      else {
        apply[key] = value;
      }
    }
    return apply;
  }

  configSaveAlbumartStyles(data: Record<string, any>) {
    const apply = this.#parseConfigSaveData(data);
    const current = np.getConfigValue('screen.nowPlaying');
    const normalizedCurrent = CommonSettingsLoader.get(CommonSettingsCategory.NowPlayingScreen);
    const refresh = normalizedCurrent.albumartVisibility !== apply.albumartVisibility;
    const updated = Object.assign(current, apply);
    np.setConfigValue('screen.nowPlaying', updated);
    np.toast('success', np.getI18n('NOW_PLAYING_SETTINGS_SAVED'));

    this.#notifyCommonSettingsUpdated(CommonSettingsCategory.NowPlayingScreen);

    if (refresh) {
      np.refreshUIConfig();
    }
  }

  configSaveBackgroundStyles(data: Record<string, any>) {
    const settings = {
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
    const current = np.getConfigValue('background');
    const updated = Object.assign(current, settings);
    np.setConfigValue('background', updated);
    np.toast('success', np.getI18n('NOW_PLAYING_SETTINGS_SAVED'));

    this.#notifyCommonSettingsUpdated(CommonSettingsCategory.Background);
  }

  configSaveActionPanelSettings(data: Record<string, any>) {
    const settings = {
      showVolumeSlider: data.showVolumeSlider
    };
    const current = np.getConfigValue('actionPanel');
    const updated = Object.assign(current, settings);
    np.setConfigValue('actionPanel', updated);
    np.toast('success', np.getI18n('NOW_PLAYING_SETTINGS_SAVED'));

    this.#notifyCommonSettingsUpdated(CommonSettingsCategory.ActionPanel);
  }

  configSaveDockedMenuSettings(data: Record<string, any>) {
    this.#configSaveDockedComponentSettings(data, 'dockedMenu');
  }

  configSaveDockedActionPanelTriggerSettings(data: Record<string, any>) {
    this.#configSaveDockedComponentSettings(data, 'dockedActionPanelTrigger');
  }

  configSaveDockedVolumeIndicatorSettings(data: Record<string, any>) {
    this.#configSaveDockedComponentSettings(data, 'dockedVolumeIndicator');
  }

  configSaveDockedClockSettings(data: Record<string, any>) {
    this.#configSaveDockedComponentSettings(data, 'dockedClock');
  }

  configSaveDockedWeatherSettings(data: Record<string, any>) {
    this.#configSaveDockedComponentSettings(data, 'dockedWeather');
  }

  #configSaveDockedComponentSettings(data: Record<string, any>, componentName: DockedComponentKey) {
    const apply = this.#parseConfigSaveData(data);
    const screen = np.getConfigValue('screen.nowPlaying');
    const current = screen[componentName] || {};
    const normalizedCurrent = CommonSettingsLoader.get(CommonSettingsCategory.NowPlayingScreen)[componentName];
    const refresh = normalizedCurrent.enabled !== apply.enabled;
    const updated = Object.assign(current, apply);
    screen[componentName] = updated;
    np.setConfigValue('screen.nowPlaying', screen);
    np.toast('success', np.getI18n('NOW_PLAYING_SETTINGS_SAVED'));

    this.#notifyCommonSettingsUpdated(CommonSettingsCategory.NowPlayingScreen);

    if (refresh) {
      np.refreshUIConfig();
    }
  }

  configSaveLocalizationSettings(data: Record<string, any>) {
    const settings: LocalizationSettings = {
      geoCoordinates: data.geoCoordinates,
      locale: data.locale.value,
      timezone: data.timezone.value,
      unitSystem: data.unitSystem.value
    };

    if (settings.locale === 'localeListDivider') {
      np.toast('error', np.getI18n('NOW_PLAYING_LOCALE_SELECTION_INVALID'));
      return;
    }
    if (settings.timezone === 'timezoneListDivider') {
      np.toast('error', np.getI18n('NOW_PLAYING_TIMEZONE_SELECTION_INVALID'));
      return;
    }

    let successMessage: string | null = np.getI18n('NOW_PLAYING_SETTINGS_SAVED');
    if (settings.timezone === 'matchGeoCoordinates') {
      const coord = ConfigHelper.parseCoordinates(settings.geoCoordinates || '');
      if (!coord) {
        np.toast('error', np.getI18n('NOW_PLAYING_INVALID_GEO_COORD'));
        return;
      }
      const matchTimezones = geoTZ.find(coord.lat, coord.lon);
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

    np.setConfigValue('localization', settings);
    if (successMessage) {
      np.toast('success', successMessage);
    }

    this.#configureWeatherApi();

    this.#notifyCommonSettingsUpdated(CommonSettingsCategory.Localization);
  }

  #configureWeatherApi() {
    const localization = CommonSettingsLoader.get(CommonSettingsCategory.Localization);
    weatherAPI.setConfig({
      coordinates: localization.geoCoordinates,
      units: localization.unitSystem
    });
  }

  configSaveMetadataServiceSettings(data: Record<string, any>) {
    const token = data['geniusAccessToken'].trim();
    np.setConfigValue('geniusAccessToken', token);
    metadataAPI.setAccessToken(token);
    np.toast('success', np.getI18n('NOW_PLAYING_SETTINGS_SAVED'));
  }

  configSaveIdleScreenSettings(data: Record<string, any>) {
    const apply = this.#parseConfigSaveData(data);
    if (apply.waitTime) {
      apply.waitTime = parseInt(apply.waitTime, 10);
    }
    apply.unsplashRefreshInterval = data.unsplashRefreshInterval ? parseInt(apply.unsplashRefreshInterval, 10) : 10;
    if (apply.waitTime < 10) {
      np.toast('error', np.getI18n('NOW_PLAYING_ERR_IDLE_SCREEN_WAIT_TIME'));
      return;
    }
    if (apply.unsplashRefreshInterval !== 0 && apply.unsplashRefreshInterval < 10) {
      np.toast('error', np.getI18n('NOW_PLAYING_ERR_UNSPLASH_REFRESH_INTERVAL'));
      return;
    }
    apply.mainAlignmentCycleInterval = data.mainAlignmentCycleInterval ? parseInt(apply.mainAlignmentCycleInterval, 10) : 60;
    if (apply.mainAlignmentCycleInterval !== 0 && apply.mainAlignmentCycleInterval < 10) {
      np.toast('error', np.getI18n('NOW_PLAYING_ERR_CYCLE_INTERVAL'));
      return;
    }

    const current = np.getConfigValue('screen.idle');
    const normalizedCurrent = CommonSettingsLoader.get(CommonSettingsCategory.IdleScreen);
    const refresh = (normalizedCurrent.enabled !== 'disabled' && apply.enabled === 'disabled') ||
      (normalizedCurrent.enabled === 'disabled' && apply.enabled !== 'disabled');
    const updated = Object.assign(current, apply);
    np.setConfigValue('screen.idle', updated);
    np.toast('success', np.getI18n('NOW_PLAYING_SETTINGS_SAVED'));

    this.#notifyCommonSettingsUpdated(CommonSettingsCategory.IdleScreen);

    if (refresh) {
      np.refreshUIConfig();
    }
  }

  configSaveExtraScreenSettings(data: Record<string, any>) {
    const theme: ThemeSettings = data.theme.value;
    np.setConfigValue('theme', theme);
    np.toast('success', np.getI18n('NOW_PLAYING_SETTINGS_SAVED'));

    this.#notifyCommonSettingsUpdated(CommonSettingsCategory.Theme);
  }

  configSavePerformanceSettings(data: Record<string, any>) {
    const settings: PerformanceSettings = {
      transitionEffectsKiosk: data.transitionEffectsKiosk,
      transitionEffectsOtherDevices: data.transitionEffectsOtherDevices,
      unmountScreensOnExit: data.unmountScreensOnExit.value,
      unmountNowPlayingScreenOnExit: data.unmountNowPlayingScreenOnExit,
      unmountBrowseScreenOnExit: data.unmountBrowseScreenOnExit,
      unmountQueueScreenOnExit: data.unmountQueueScreenOnExit,
      unmountVolumioScreenOnExit: data.unmountVolumioScreenOnExit
    };
    np.setConfigValue('performance', settings);
    np.toast('success', np.getI18n('NOW_PLAYING_SETTINGS_SAVED'));

    this.#notifyCommonSettingsUpdated(CommonSettingsCategory.Performance);
  }

  clearMetadataCache() {
    metadataAPI.clearCache();
    np.toast('success', np.getI18n('NOW_PLAYING_CACHE_CLEARED'));
  }

  clearWeatherCache() {
    weatherAPI.clearCache();
    np.toast('success', np.getI18n('NOW_PLAYING_CACHE_CLEARED'));
  }

  broadcastRefresh() {
    np.broadcastMessage('nowPlayingRefresh');
    np.toast('success', np.getI18n('NOW_PLAYING_BROADCASTED_COMMAND'));
  }

  #broadcastPluginInfo() {
    const {message, payload} = this.getPluginInfo();
    np.broadcastMessage(message, payload);
  }

  #notifyCommonSettingsUpdated(category: CommonSettingsCategory) {
    np.broadcastMessage('nowPlayingPushSettings', {
      category,
      data: CommonSettingsLoader.get(category)
    });
  }

  // Socket callMethod
  getPluginInfo() {
    return {
      message: 'nowPlayingPluginInfo',
      payload: SystemUtils.getPluginInfo()
    };
  }

  // Plugin lifecycle

  onVolumioStart() {
    const configFile = this.#commandRouter.pluginManager.getConfigurationFile(this.#context, 'config.json');
    this.#config = new vconf();
    this.#config.loadFile(configFile);

    return libQ.resolve(true);
  }

  onStart() {
    return jsPromiseToKew(this.#doOnStart());
  }

  async #doOnStart() {
    np.init(this.#context, this.#config);

    await ConfigUpdater.checkAndUpdate();

    metadataAPI.setAccessToken(np.getConfigValue('geniusAccessToken'));
    this.#configureWeatherApi();

    // Register language change listener
    this.#volumioLanguageChangeCallback = this.#onVolumioLanguageChanged.bind(this);
    this.#context.coreCommand.sharedVars.registerCallback('language_code', this.#volumioLanguageChangeCallback);

    await this.#startApp();

    const display = np.getConfigValue('kioskDisplay');
    if (display == 'nowPlaying') {
      const kiosk = KioskUtils.checkVolumioKiosk();
      if (kiosk.exists && kiosk.display == 'default') {
        await KioskUtils.modifyVolumioKioskScript(3000, np.getConfigValue('port'));
      }
    }
  }

  onStop() {
    return jsPromiseToKew(this.#doOnStop());
  }

  async #doOnStop() {
    this.#stopApp();

    // Remove language change listener (this is hacky but prevents a potential
    // Memory leak)
    if (this.#config.callbacks && this.#volumioLanguageChangeCallback) {
      this.#config.callbacks.delete('language_code', this.#volumioLanguageChangeCallback);
      this.#volumioLanguageChangeCallback = null;
    }

    // If kiosk is set to Now Playing, restore it back to default
    const kiosk = KioskUtils.checkVolumioKiosk();
    if (kiosk.exists && kiosk.display == 'nowPlaying') {
      try {
        await KioskUtils.modifyVolumioKioskScript(np.getConfigValue('port'), 3000);
      }
      catch (error) {
        // Do nothing
      }
    }

    np.reset();
  }

  getConfigurationFiles() {
    return [ 'config.json' ];
  }

  async #startApp() {
    try {
      await App.start();
    }
    catch (error: any) {
      np.toast('error', np.getI18n('NOW_PLAYING_DAEMON_START_ERR', error.message));
      throw error;
    }
  }

  #stopApp() {
    App.stop();
  }

  #restartApp() {
    this.#stopApp();
    return this.#startApp();
  }

  #onVolumioLanguageChanged() {
    // Push localization settings
    np.getLogger().info('[now-playing] Volumio language changed - pushing localization settings');
    this.#notifyCommonSettingsUpdated(CommonSettingsCategory.Localization);
  }
}

export = ControllerNowPlaying;
