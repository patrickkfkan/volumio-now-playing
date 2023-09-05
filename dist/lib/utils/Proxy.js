"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.proxyRequest = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const util_1 = require("util");
const stream_1 = require("stream");
const NowPlayingContext_1 = __importDefault(require("../NowPlayingContext"));
async function proxyRequest(url, res) {
    NowPlayingContext_1.default.getLogger().info(`[now-playing] Proxy request: ${url}`);
    const streamPipeline = (0, util_1.promisify)(stream_1.pipeline);
    try {
        const response = await (0, node_fetch_1.default)(url);
        if (!response.ok || !response.body) {
            return res.send(response.status);
        }
        await streamPipeline(response.body, res);
    }
    catch (error) {
        NowPlayingContext_1.default.getLogger().error(NowPlayingContext_1.default.getErrorMessage('[now-playing] Proxy error:', error));
        return res.send(500);
    }
}
exports.proxyRequest = proxyRequest;
//# sourceMappingURL=Proxy.js.map