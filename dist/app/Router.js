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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const handler = __importStar(require("./Handler"));
const router = express_1.default.Router();
router.get('/', (req, res) => {
    handler.index(req, res);
});
router.get('/preview', (req, res) => {
    handler.preview(req, res);
});
router.get('/mybg', (req, res) => {
    handler.myBackground(req.query, res);
});
router.get('/vumeter/:template?/:file?', (req, res) => {
    const { template, file } = req.params;
    handler.vu('get', { template, file }, res);
});
router.put('/vumeter', (req, res) => {
    handler.vu('put', req.body, res);
});
router.get('/sys_asset/font/:file', (req, res) => {
    const { file } = req.params;
    handler.sysAsset('font', file, res);
});
router.get('/sys_asset/format_icon/:file', (req, res) => {
    const { file } = req.params;
    handler.sysAsset('formatIcon', file, res);
});
router.get('/proxy', (req, res) => {
    handler.proxy(req.query, res);
});
router.post('/api/:apiName/:method', (req, res) => {
    const { apiName, method } = req.params;
    handler.api(apiName, method, req.body, res);
});
router.get('/api/:apiName/:method', (req, res) => {
    const { apiName, method } = req.params;
    handler.api(apiName, method, req.query, res);
});
exports.default = router;
//# sourceMappingURL=Router.js.map