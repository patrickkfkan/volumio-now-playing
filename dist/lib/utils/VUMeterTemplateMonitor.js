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
var _VUMeterTemplateMonitor_instances, _VUMeterTemplateMonitor_templates, _VUMeterTemplateMonitor_isSorted, _VUMeterTemplateMonitor_sortTemplates;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VU_METER_TEMPLATE_PATH = void 0;
const path_1 = __importDefault(require("path"));
const NowPlayingContext_1 = __importDefault(require("../NowPlayingContext"));
const FSMonitor_1 = __importDefault(require("./FSMonitor"));
const VUMeterConfigParser_1 = __importDefault(require("./VUMeterConfigParser"));
exports.VU_METER_TEMPLATE_PATH = '/data/INTERNAL/NowPlayingPlugin/VU Meter Templates';
class VUMeterTemplateMonitor extends FSMonitor_1.default {
    constructor() {
        super(exports.VU_METER_TEMPLATE_PATH);
        _VUMeterTemplateMonitor_instances.add(this);
        this.name = 'VUMeterTemplateMonitor';
        _VUMeterTemplateMonitor_templates.set(this, void 0);
        _VUMeterTemplateMonitor_isSorted.set(this, void 0);
        __classPrivateFieldSet(this, _VUMeterTemplateMonitor_templates, [], "f");
        __classPrivateFieldSet(this, _VUMeterTemplateMonitor_isSorted, false, "f");
    }
    getTemplates() {
        if (this.status !== 'running') {
            NowPlayingContext_1.default.getLogger().warn('[now-playing] VUMeterTemplateMonitor is not running. Returning empty image list.');
            return [];
        }
        if (!__classPrivateFieldGet(this, _VUMeterTemplateMonitor_isSorted, "f")) {
            __classPrivateFieldGet(this, _VUMeterTemplateMonitor_instances, "m", _VUMeterTemplateMonitor_sortTemplates).call(this);
        }
        return __classPrivateFieldGet(this, _VUMeterTemplateMonitor_templates, "f");
    }
    async stop() {
        super.stop();
        __classPrivateFieldSet(this, _VUMeterTemplateMonitor_templates, [], "f");
        __classPrivateFieldSet(this, _VUMeterTemplateMonitor_isSorted, false, "f");
    }
    handleEvent(event, _path) {
        if (event !== 'addDir' && event !== 'unlinkDir') {
            return;
        }
        const { base: template } = path_1.default.parse(_path);
        NowPlayingContext_1.default.getLogger().info(`[now-playing] VUMeterTemplateMonitor captured '${event}': ${template}`);
        switch (event) {
            case 'addDir':
                const config = VUMeterConfigParser_1.default.getConfig(template);
                if (config.meters) {
                    __classPrivateFieldGet(this, _VUMeterTemplateMonitor_templates, "f").push({
                        name: template,
                        meters: config.meters
                    });
                }
                __classPrivateFieldSet(this, _VUMeterTemplateMonitor_isSorted, false, "f");
                break;
            case 'unlinkDir':
                const index = __classPrivateFieldGet(this, _VUMeterTemplateMonitor_templates, "f").findIndex((t) => t.name === template);
                if (index >= 0) {
                    __classPrivateFieldGet(this, _VUMeterTemplateMonitor_templates, "f").splice(index, 1);
                }
                break;
            default:
        }
    }
}
_VUMeterTemplateMonitor_templates = new WeakMap(), _VUMeterTemplateMonitor_isSorted = new WeakMap(), _VUMeterTemplateMonitor_instances = new WeakSet(), _VUMeterTemplateMonitor_sortTemplates = function _VUMeterTemplateMonitor_sortTemplates() {
    __classPrivateFieldGet(this, _VUMeterTemplateMonitor_templates, "f").sort((t1, t2) => t1.name.localeCompare(t2.name));
    __classPrivateFieldSet(this, _VUMeterTemplateMonitor_isSorted, true, "f");
};
const vuMeterTemplateMonitor = new VUMeterTemplateMonitor();
exports.default = vuMeterTemplateMonitor;
//# sourceMappingURL=VUMeterTemplateMonitor.js.map