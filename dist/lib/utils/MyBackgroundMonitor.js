"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _MyBackgroundMonitor_instances, _MyBackgroundMonitor_images, _MyBackgroundMonitor_isSorted, _MyBackgroundMonitor_sortImages;
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const NowPlayingContext_1 = __importDefault(require("../NowPlayingContext"));
const FSMonitor_1 = __importDefault(require("./FSMonitor"));
const MY_BACKGROUNDS_PATH = '/data/INTERNAL/NowPlayingPlugin/My Backgrounds';
const ACCEPT_EXTENSIONS = [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif'
];
class MyBackgroundMonitor extends FSMonitor_1.default {
    constructor() {
        super(MY_BACKGROUNDS_PATH);
        _MyBackgroundMonitor_instances.add(this);
        this.name = 'MyBackgroundMonitor';
        _MyBackgroundMonitor_images.set(this, void 0);
        _MyBackgroundMonitor_isSorted.set(this, void 0);
        __classPrivateFieldSet(this, _MyBackgroundMonitor_images, [], "f");
        __classPrivateFieldSet(this, _MyBackgroundMonitor_isSorted, false, "f");
    }
    getImages() {
        if (this.status !== 'running') {
            NowPlayingContext_1.default.getLogger().warn('[now-playing] MyBackgroundMonitor is not running. Returning empty image list.');
            return [];
        }
        if (!__classPrivateFieldGet(this, _MyBackgroundMonitor_isSorted, "f")) {
            __classPrivateFieldGet(this, _MyBackgroundMonitor_instances, "m", _MyBackgroundMonitor_sortImages).call(this);
        }
        return __classPrivateFieldGet(this, _MyBackgroundMonitor_images, "f");
    }
    async stop() {
        super.stop();
        __classPrivateFieldSet(this, _MyBackgroundMonitor_images, [], "f");
        __classPrivateFieldSet(this, _MyBackgroundMonitor_isSorted, false, "f");
    }
    handleEvent(event, _path) {
        if (event !== 'add' && event !== 'unlink') {
            return;
        }
        const { ext, base } = path_1.default.parse(_path);
        try {
            if (!ACCEPT_EXTENSIONS.includes(ext)) {
                return;
            }
        }
        catch (error) {
            NowPlayingContext_1.default.getLogger().info(NowPlayingContext_1.default.getErrorMessage(`[now-playing] MyBackgroundMonitor failed to stat '${_path}':`, error, true));
            return;
        }
        NowPlayingContext_1.default.getLogger().info(`[now-playing] MyBackgroundMonitor captured '${event}': ${base}`);
        switch (event) {
            case 'add':
                __classPrivateFieldGet(this, _MyBackgroundMonitor_images, "f").push({
                    name: base,
                    path: path_1.default.resolve(_path)
                });
                __classPrivateFieldSet(this, _MyBackgroundMonitor_isSorted, false, "f");
                break;
            case 'unlink':
                const index = __classPrivateFieldGet(this, _MyBackgroundMonitor_images, "f").findIndex((image) => image.name === base);
                if (index >= 0) {
                    __classPrivateFieldGet(this, _MyBackgroundMonitor_images, "f").splice(index, 1);
                }
                break;
            default:
        }
    }
}
_MyBackgroundMonitor_images = new WeakMap(), _MyBackgroundMonitor_isSorted = new WeakMap(), _MyBackgroundMonitor_instances = new WeakSet(), _MyBackgroundMonitor_sortImages = function _MyBackgroundMonitor_sortImages() {
    __classPrivateFieldGet(this, _MyBackgroundMonitor_images, "f").sort((img1, img2) => img1.name.localeCompare(img2.name));
    __classPrivateFieldSet(this, _MyBackgroundMonitor_isSorted, true, "f");
};
const myBackgroundMonitor = new MyBackgroundMonitor();
exports.default = myBackgroundMonitor;
//# sourceMappingURL=MyBackgroundMonitor.js.map