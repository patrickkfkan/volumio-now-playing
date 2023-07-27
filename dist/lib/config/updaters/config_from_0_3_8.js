"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.update = void 0;
const NowPlayingContext_1 = __importDefault(require("../../NowPlayingContext"));
/**
 * Update:
 * - `theme`: from string to { active: string; }
 */
const TO_VERSION = '0.4.0';
function update() {
    const theme = NowPlayingContext_1.default.getConfigValue('theme');
    if (typeof theme === 'string') {
        NowPlayingContext_1.default.getLogger().info('[now-playing] Updating config value for \'theme\'');
        const newTheme = {
            active: theme
        };
        NowPlayingContext_1.default.setConfigValue('theme', newTheme);
    }
    NowPlayingContext_1.default.getLogger().info(`[now-playing] Updating config version to ${TO_VERSION}`);
    NowPlayingContext_1.default.setConfigValue('configVersion', TO_VERSION);
    NowPlayingContext_1.default.getLogger().info('[now-playing] Update complete');
}
exports.update = update;
//# sourceMappingURL=config_from_0_3_8.js.map