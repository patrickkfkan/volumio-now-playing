import np from '../NowPlayingContext';
import { assignObjectEmptyProps } from '../utils/Misc';
import ConfigHelper from './ConfigHelper';
import { CommonSettingsCategory, CommonSettingsOf, DefaultSettings } from 'now-playing-common';

export default class CommonSettingsLoader {

  static get<T extends CommonSettingsCategory>(category: T) {
    if (category === CommonSettingsCategory.Localization) {
      return this.#getLocalizationSettings() as unknown as CommonSettingsOf<T>;
    }

    return this.#getDefaultNormalized(category);
  }

  static #getLocalizationSettings() {
    const localization = this.#getDefaultNormalized(CommonSettingsCategory.Localization);

    switch (localization.locale) {
      case 'matchVolumio':
        localization.resolvedLocale = ConfigHelper.getVolumioLocale();
        break;
      case 'matchClient':
      case 'localeListDivider':
        localization.resolvedLocale = null;
        break;
      default:
        localization.resolvedLocale = localization.locale;
    }

    switch (localization.timezone) {
      case 'matchClient':
      case 'timezoneListDivider':
        localization.resolvedTimezone = null;
        break;
      case 'matchGeoCoordinates':
        localization.resolvedTimezone = localization.geoTimezone || null;
        break;
      default:
        localization.resolvedTimezone = localization.timezone;
    }

    return localization;
  }

  static #getDefaultNormalized<T extends CommonSettingsCategory>(category: T): CommonSettingsOf<T> {
    const settings = np.getConfigValue(category);
    const merged = assignObjectEmptyProps({}, settings, DefaultSettings[category]);
    return merged;
  }
}
