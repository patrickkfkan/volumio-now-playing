import express from 'express';

import * as handler from './Handler';

const router = express.Router();

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
  const {template, file} = req.params;
  handler.vu('get', { template, file }, res);
});

router.put('/vumeter', (req, res) => {
  handler.vu('put', req.body, res);
});

router.get('/sys_asset/font/:file', (req, res) => {
  const {file} = req.params;
  handler.sysAsset('font', file, res);
});

router.get('/sys_asset/format_icon/:file', (req, res) => {
  const {file} = req.params;
  handler.sysAsset('formatIcon', file, res);
});

router.get('/proxy', (req, res) => {
  handler.proxy(req.query, res);
});

router.post('/api/:apiName/:method', (req, res) => {
  const {apiName, method} = req.params;
  handler.api(apiName, method, req.body, res);
});

router.get('/api/:apiName/:method', (req, res) => {
  const {apiName, method} = req.params;
  handler.api(apiName, method, req.query, res);
});

export default router;
