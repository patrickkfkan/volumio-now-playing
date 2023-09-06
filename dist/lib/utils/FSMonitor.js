"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
var _FSMonitor_instances, _FSMonitor_status, _FSMonitor_events, _FSMonitor_watcher, _FSMonitor_monitorDir, _FSMonitor_preHandleEvent;
Object.defineProperty(exports, "__esModule", { value: true });
const SystemUtils = __importStar(require("./System"));
const NowPlayingContext_1 = __importDefault(require("../NowPlayingContext"));
const chokidar_1 = __importDefault(require("chokidar"));
class FSMonitor {
    constructor(monitorDir, events) {
        _FSMonitor_instances.add(this);
        _FSMonitor_status.set(this, void 0);
        _FSMonitor_events.set(this, void 0);
        _FSMonitor_watcher.set(this, void 0);
        _FSMonitor_monitorDir.set(this, void 0);
        __classPrivateFieldSet(this, _FSMonitor_monitorDir, monitorDir, "f");
        __classPrivateFieldSet(this, _FSMonitor_events, events, "f");
        __classPrivateFieldSet(this, _FSMonitor_status, 'stopped', "f");
        __classPrivateFieldSet(this, _FSMonitor_watcher, null, "f");
    }
    start() {
        if (!SystemUtils.dirExists(__classPrivateFieldGet(this, _FSMonitor_monitorDir, "f"))) {
            NowPlayingContext_1.default.getLogger().warn(`[now-playing] ${__classPrivateFieldGet(this, _FSMonitor_monitorDir, "f")} does not exist. ${this.name} will not start.`);
            return;
        }
        NowPlayingContext_1.default.getLogger().info(`[now-playing] ${this.name} commencing initial scanning of ${__classPrivateFieldGet(this, _FSMonitor_monitorDir, "f")}`);
        __classPrivateFieldSet(this, _FSMonitor_watcher, chokidar_1.default.watch(__classPrivateFieldGet(this, _FSMonitor_monitorDir, "f")), "f");
        if (__classPrivateFieldGet(this, _FSMonitor_events, "f").includes('add')) {
            __classPrivateFieldGet(this, _FSMonitor_watcher, "f").on('add', __classPrivateFieldGet(this, _FSMonitor_instances, "m", _FSMonitor_preHandleEvent).bind(this, 'add'));
        }
        if (__classPrivateFieldGet(this, _FSMonitor_events, "f").includes('unlink')) {
            __classPrivateFieldGet(this, _FSMonitor_watcher, "f").on('unlink', __classPrivateFieldGet(this, _FSMonitor_instances, "m", _FSMonitor_preHandleEvent).bind(this, 'unlink'));
        }
        if (__classPrivateFieldGet(this, _FSMonitor_events, "f").includes('addDir')) {
            __classPrivateFieldGet(this, _FSMonitor_watcher, "f").on('addDir', __classPrivateFieldGet(this, _FSMonitor_instances, "m", _FSMonitor_preHandleEvent).bind(this, 'addDir'));
        }
        if (__classPrivateFieldGet(this, _FSMonitor_events, "f").includes('unlinkDir')) {
            __classPrivateFieldGet(this, _FSMonitor_watcher, "f").on('unlinkDir', __classPrivateFieldGet(this, _FSMonitor_instances, "m", _FSMonitor_preHandleEvent).bind(this, 'unlinkDir'));
        }
        __classPrivateFieldGet(this, _FSMonitor_watcher, "f").on('ready', () => {
            NowPlayingContext_1.default.getLogger().info(`[now-playing] ${this.name} has completed initial scanning`);
            NowPlayingContext_1.default.getLogger().info(`[now-playing] ${this.name} is now watching ${__classPrivateFieldGet(this, _FSMonitor_monitorDir, "f")}`);
            __classPrivateFieldSet(this, _FSMonitor_status, 'running', "f");
        });
        __classPrivateFieldSet(this, _FSMonitor_status, 'initializing', "f");
    }
    async stop() {
        if (__classPrivateFieldGet(this, _FSMonitor_watcher, "f")) {
            await __classPrivateFieldGet(this, _FSMonitor_watcher, "f").close();
            __classPrivateFieldSet(this, _FSMonitor_watcher, null, "f");
        }
        __classPrivateFieldSet(this, _FSMonitor_status, 'stopped', "f");
        NowPlayingContext_1.default.getLogger().warn(`[now-playing] ${this.name} stopped`);
    }
    get status() {
        return __classPrivateFieldGet(this, _FSMonitor_status, "f");
    }
}
exports.default = FSMonitor;
_FSMonitor_status = new WeakMap(), _FSMonitor_events = new WeakMap(), _FSMonitor_watcher = new WeakMap(), _FSMonitor_monitorDir = new WeakMap(), _FSMonitor_instances = new WeakSet(), _FSMonitor_preHandleEvent = function _FSMonitor_preHandleEvent(event, path) {
    const oldStatus = __classPrivateFieldGet(this, _FSMonitor_status, "f");
    if (oldStatus === 'running') {
        __classPrivateFieldSet(this, _FSMonitor_status, 'updating', "f");
    }
    this.handleEvent(event, path);
    __classPrivateFieldSet(this, _FSMonitor_status, oldStatus, "f");
};
//# sourceMappingURL=FSMonitor.js.map