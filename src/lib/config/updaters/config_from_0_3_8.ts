import { ThemeSettings } from 'now-playing-common';
import np from '../../NowPlayingContext';

/**
 * Update:
 * - `theme`: from string to { active: string; }
 */

const TO_VERSION = '0.4.0';

export function update() {
  const theme = np.getConfigValue('theme') as any;
  if (typeof theme === 'string') {
    np.getLogger().info('[now-playing] Updating config value for \'theme\'');
    const newTheme: ThemeSettings = {
      active: theme
    };
    np.setConfigValue('theme', newTheme);
  }
  np.getLogger().info(`[now-playing] Updating config version to ${TO_VERSION}`);
  np.setConfigValue('configVersion', TO_VERSION);
  np.getLogger().info('[now-playing] Update complete');
}
