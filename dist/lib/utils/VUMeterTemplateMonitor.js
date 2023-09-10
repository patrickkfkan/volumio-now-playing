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
var _VUMeterTemplateMonitor_instances, _VUMeterTemplateMonitor_templateFolderMonitors, _VUMeterTemplateMonitor_templates, _VUMeterTemplateMonitor_isSorted, _VUMeterTemplateMonitor_queue, _VUMeterTemplateMonitor_isTemplateUpdating, _VUMeterTemplateMonitor_removeTemplateFolderMonitor, _VUMeterTemplateMonitor_sortTemplates, _VUMeterTemplateMonitor_addTemplateFolderMonitor, _VUMeterTemplateMonitor_removeTemplate;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VU_METER_TEMPLATE_PATH = void 0;
const path_1 = __importDefault(require("path"));
const NowPlayingContext_1 = __importDefault(require("../NowPlayingContext"));
const FSMonitor_1 = __importDefault(require("./FSMonitor"));
const VUMeterConfigParser_1 = __importDefault(require("./VUMeterConfigParser"));
const Misc_1 = require("./Misc");
const System_1 = require("./System");
const chokidar_1 = __importDefault(require("chokidar"));
const queue_1 = __importDefault(require("queue"));
exports.VU_METER_TEMPLATE_PATH = '/data/INTERNAL/NowPlayingPlugin/VU Meter Templates';
class VUMeterTemplateMonitor extends FSMonitor_1.default {
    constructor() {
        super(exports.VU_METER_TEMPLATE_PATH, ['addDir', 'unlinkDir']);
        _VUMeterTemplateMonitor_instances.add(this);
        this.name = 'VUMeterTemplateMonitor';
        _VUMeterTemplateMonitor_templateFolderMonitors.set(this, void 0);
        _VUMeterTemplateMonitor_templates.set(this, void 0);
        _VUMeterTemplateMonitor_isSorted.set(this, void 0);
        _VUMeterTemplateMonitor_queue.set(this, void 0);
        _VUMeterTemplateMonitor_isTemplateUpdating.set(this, void 0);
        __classPrivateFieldSet(this, _VUMeterTemplateMonitor_templateFolderMonitors, {}, "f");
        __classPrivateFieldSet(this, _VUMeterTemplateMonitor_templates, [], "f");
        __classPrivateFieldSet(this, _VUMeterTemplateMonitor_isSorted, false, "f");
        __classPrivateFieldSet(this, _VUMeterTemplateMonitor_queue, new queue_1.default({
            concurrency: 1,
            autostart: true
        }), "f");
        __classPrivateFieldSet(this, _VUMeterTemplateMonitor_isTemplateUpdating, false, "f");
    }
    getTemplates() {
        if (this.status === 'stopped') {
            NowPlayingContext_1.default.getLogger().warn('[now-playing] VUMeterTemplateMonitor is not running. Returning empty image list.');
            return [];
        }
        if (!__classPrivateFieldGet(this, _VUMeterTemplateMonitor_isSorted, "f")) {
            __classPrivateFieldGet(this, _VUMeterTemplateMonitor_instances, "m", _VUMeterTemplateMonitor_sortTemplates).call(this);
        }
        return __classPrivateFieldGet(this, _VUMeterTemplateMonitor_templates, "f");
    }
    async getRandomTemplate() {
        if (this.status === 'initializing') {
            NowPlayingContext_1.default.getLogger().info('[now-playing] Getting random template directly from template path');
            const directories = await (0, System_1.listDirectories)(exports.VU_METER_TEMPLATE_PATH);
            if (directories.length === 0) {
                return null;
            }
            return directories[(0, Misc_1.rnd)(0, directories.length - 1)];
        }
        if (__classPrivateFieldGet(this, _VUMeterTemplateMonitor_templates, "f").length > 0) {
            NowPlayingContext_1.default.getLogger().info('[now-playing] Getting random template from loaded templates');
            return __classPrivateFieldGet(this, _VUMeterTemplateMonitor_templates, "f")[(0, Misc_1.rnd)(0, __classPrivateFieldGet(this, _VUMeterTemplateMonitor_templates, "f").length - 1)].name;
        }
        return null;
    }
    async stop() {
        __classPrivateFieldGet(this, _VUMeterTemplateMonitor_queue, "f").end();
        const closeMonitorPromises = Object.keys(__classPrivateFieldGet(this, _VUMeterTemplateMonitor_templateFolderMonitors, "f")).map((t) => __classPrivateFieldGet(this, _VUMeterTemplateMonitor_instances, "m", _VUMeterTemplateMonitor_removeTemplateFolderMonitor).call(this, t));
        await Promise.all(closeMonitorPromises);
        __classPrivateFieldSet(this, _VUMeterTemplateMonitor_templateFolderMonitors, {}, "f");
        await super.stop();
        __classPrivateFieldSet(this, _VUMeterTemplateMonitor_templates, [], "f");
        __classPrivateFieldSet(this, _VUMeterTemplateMonitor_isSorted, false, "f");
        __classPrivateFieldSet(this, _VUMeterTemplateMonitor_isTemplateUpdating, false, "f");
    }
    handleEvent(event, _path) {
        const { base: template } = path_1.default.parse(_path);
        NowPlayingContext_1.default.getLogger().info(`[now-playing] VUMeterTemplateMonitor captured '${event}': ${template}`);
        switch (event) {
            case 'addDir':
                __classPrivateFieldGet(this, _VUMeterTemplateMonitor_queue, "f").push(() => __classPrivateFieldGet(this, _VUMeterTemplateMonitor_instances, "m", _VUMeterTemplateMonitor_addTemplateFolderMonitor).call(this, template));
                break;
            case 'unlinkDir':
                __classPrivateFieldGet(this, _VUMeterTemplateMonitor_queue, "f").push(async () => {
                    await __classPrivateFieldGet(this, _VUMeterTemplateMonitor_instances, "m", _VUMeterTemplateMonitor_removeTemplateFolderMonitor).call(this, template);
                    __classPrivateFieldGet(this, _VUMeterTemplateMonitor_instances, "m", _VUMeterTemplateMonitor_removeTemplate).call(this, template);
                });
                break;
        }
    }
    get status() {
        const mainStatus = super.status;
        if (__classPrivateFieldGet(this, _VUMeterTemplateMonitor_isTemplateUpdating, "f") && mainStatus === 'running') {
            return 'updating';
        }
        return mainStatus;
    }
}
_VUMeterTemplateMonitor_templateFolderMonitors = new WeakMap(), _VUMeterTemplateMonitor_templates = new WeakMap(), _VUMeterTemplateMonitor_isSorted = new WeakMap(), _VUMeterTemplateMonitor_queue = new WeakMap(), _VUMeterTemplateMonitor_isTemplateUpdating = new WeakMap(), _VUMeterTemplateMonitor_instances = new WeakSet(), _VUMeterTemplateMonitor_removeTemplateFolderMonitor = async function _VUMeterTemplateMonitor_removeTemplateFolderMonitor(template) {
    const monitor = __classPrivateFieldGet(this, _VUMeterTemplateMonitor_templateFolderMonitors, "f")[template];
    if (monitor) {
        try {
            monitor.removeAllListeners();
            await monitor.close();
        }
        catch (error) {
            NowPlayingContext_1.default.getLogger().warn(NowPlayingContext_1.default.getErrorMessage(`[now-playing] VUMeterTemplateMonitor failed to close template folder monitor for '${template}':`, error, true));
        }
        finally {
            delete __classPrivateFieldGet(this, _VUMeterTemplateMonitor_templateFolderMonitors, "f")[template];
        }
    }
}, _VUMeterTemplateMonitor_sortTemplates = function _VUMeterTemplateMonitor_sortTemplates() {
    __classPrivateFieldGet(this, _VUMeterTemplateMonitor_templates, "f").sort((t1, t2) => t1.name.localeCompare(t2.name));
    __classPrivateFieldSet(this, _VUMeterTemplateMonitor_isSorted, true, "f");
}, _VUMeterTemplateMonitor_addTemplateFolderMonitor = async function _VUMeterTemplateMonitor_addTemplateFolderMonitor(template) {
    await __classPrivateFieldGet(this, _VUMeterTemplateMonitor_instances, "m", _VUMeterTemplateMonitor_removeTemplateFolderMonitor).call(this, template);
    const templatePath = `${exports.VU_METER_TEMPLATE_PATH}/${template}`;
    const monitor = chokidar_1.default.watch(templatePath);
    __classPrivateFieldGet(this, _VUMeterTemplateMonitor_templateFolderMonitors, "f")[template] = monitor;
    const _parseAndAdd = (silent = false) => {
        if (!__classPrivateFieldGet(this, _VUMeterTemplateMonitor_templates, "f").find((t) => t.name === template)) {
            __classPrivateFieldSet(this, _VUMeterTemplateMonitor_isTemplateUpdating, true, "f");
            const config = VUMeterConfigParser_1.default.getConfig(template);
            if (config.meters) {
                __classPrivateFieldGet(this, _VUMeterTemplateMonitor_templates, "f").push({
                    name: template,
                    meters: config.meters
                });
                __classPrivateFieldSet(this, _VUMeterTemplateMonitor_isSorted, false, "f");
                if (!silent) {
                    NowPlayingContext_1.default.getLogger().info(`[now-playing] Added VU meter template '${template}'`);
                }
            }
            __classPrivateFieldSet(this, _VUMeterTemplateMonitor_isTemplateUpdating, false, "f");
        }
    };
    const _remove = (silent = false) => {
        __classPrivateFieldSet(this, _VUMeterTemplateMonitor_isTemplateUpdating, true, "f");
        __classPrivateFieldGet(this, _VUMeterTemplateMonitor_instances, "m", _VUMeterTemplateMonitor_removeTemplate).call(this, template, silent);
        __classPrivateFieldSet(this, _VUMeterTemplateMonitor_isTemplateUpdating, false, "f");
    };
    const _refresh = (silent = false) => {
        _remove(true);
        _parseAndAdd(true);
        if (!silent) {
            NowPlayingContext_1.default.getLogger().info(`[now-playing] Refreshed VU meter template '${template}'`);
        }
    };
    const _isMeterTxt = (_path) => {
        const { base } = path_1.default.parse(_path);
        return base === 'meters.txt';
    };
    monitor.on('add', (_path) => {
        if (_isMeterTxt(_path)) {
            _parseAndAdd();
        }
    });
    monitor.on('unlink', (_path) => {
        if (_isMeterTxt(_path)) {
            _remove();
        }
    });
    monitor.on('change', (_path) => {
        if (_isMeterTxt(_path)) {
            _refresh();
        }
    });
    return monitor;
}, _VUMeterTemplateMonitor_removeTemplate = function _VUMeterTemplateMonitor_removeTemplate(template, silent = false) {
    const index = __classPrivateFieldGet(this, _VUMeterTemplateMonitor_templates, "f").findIndex((t) => t.name === template);
    if (index >= 0) {
        __classPrivateFieldGet(this, _VUMeterTemplateMonitor_templates, "f").splice(index, 1);
        if (!silent) {
            NowPlayingContext_1.default.getLogger().info(`[now-playing] Removed VU meter template '${template}'`);
        }
    }
};
const vuMeterTemplateMonitor = new VUMeterTemplateMonitor();
exports.default = vuMeterTemplateMonitor;
//# sourceMappingURL=VUMeterTemplateMonitor.js.map