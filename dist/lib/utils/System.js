"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileExists = fileExists;
exports.dirExists = dirExists;
exports.findInFile = findInFile;
exports.replaceInFile = replaceInFile;
exports.copyFile = copyFile;
exports.isSystemdServiceActive = isSystemdServiceActive;
exports.restartSystemdService = restartSystemdService;
exports.readdir = readdir;
exports.getPluginVersion = getPluginVersion;
exports.getPluginInfo = getPluginInfo;
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const package_json_1 = __importDefault(require("../../../package.json"));
const NowPlayingContext_1 = __importDefault(require("../NowPlayingContext"));
function fileExists(path) {
    try {
        return fs_1.default.existsSync(path) && fs_1.default.lstatSync(path).isFile();
    }
    catch (error) {
        return false;
    }
}
function dirExists(path) {
    try {
        return fs_1.default.existsSync(path) && fs_1.default.lstatSync(path).isDirectory();
    }
    catch (error) {
        return false;
    }
}
function findInFile(path, str) {
    const contents = fs_1.default.readFileSync(path).toString();
    const regex = new RegExp(`\\b${str}\\b`, 'gm');
    return regex.test(contents);
}
function replaceInFile(path, search, replace) {
    const cmd = `echo volumio | sudo -S sed -i 's/${search}/${replace}/g' "${path}"`;
    return (0, child_process_1.execSync)(cmd, { uid: 1000, gid: 1000 });
}
function copyFile(src, dest, opts) {
    const asRoot = !!opts?.asRoot;
    const createDestDirIfNotExists = !!opts?.createDestDirIfNotExists;
    const cmdPrefix = asRoot ? 'echo volumio | sudo -S' : '';
    if (createDestDirIfNotExists) {
        const p = path_1.default.parse(dest);
        (0, child_process_1.execSync)(`${cmdPrefix} mkdir -p "${p.dir}"`);
    }
    (0, child_process_1.execSync)(`${cmdPrefix} cp "${src}" "${dest}"`);
}
function systemctl(cmd, service) {
    return new Promise((resolve, reject) => {
        const fullCmd = `/usr/bin/sudo /bin/systemctl ${cmd} ${service}`;
        NowPlayingContext_1.default.getLogger().info(`[now-playing] Executing ${fullCmd}`);
        (0, child_process_1.exec)(fullCmd, { uid: 1000, gid: 1000 }, function (error, stdout, stderr) {
            if (error) {
                NowPlayingContext_1.default.getLogger().error(NowPlayingContext_1.default.getErrorMessage(`[now-playing] Failed to execute systemctl command ${cmd} on ${service}: ${stderr.toString()}`, error));
                reject(error);
            }
            else {
                resolve(stdout.toString());
            }
        });
    });
}
async function isSystemdServiceActive(service) {
    const out = await systemctl('status', service);
    return out.indexOf('active') >= 0 && out.indexOf('inactive') == -1;
}
function restartSystemdService(service) {
    return systemctl('restart', service);
}
function readdir(path, ignoreIfContains) {
    let files = fs_1.default.readdirSync(path);
    if (ignoreIfContains) {
        files = files.filter((f) => f.indexOf(ignoreIfContains) < 0);
    }
    return files;
}
function getPluginVersion() {
    return package_json_1.default.version || null;
}
function getPluginInfo() {
    let cached = NowPlayingContext_1.default.get('pluginInfo');
    if (!cached) {
        const appPort = NowPlayingContext_1.default.getConfigValue('port');
        const version = getPluginVersion();
        const thisDevice = NowPlayingContext_1.default.getDeviceInfo();
        const appUrl = `${thisDevice.host}:${appPort}`;
        const previewUrl = `${appUrl}/preview`;
        const apiPath = `${appUrl}/api`;
        cached = {
            appPort, version, appUrl, previewUrl, apiPath
        };
        NowPlayingContext_1.default.set('pluginInfo', cached);
    }
    return cached;
}
//# sourceMappingURL=System.js.map