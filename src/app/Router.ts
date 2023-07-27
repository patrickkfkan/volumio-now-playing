import express from 'express';

import * as handler from './Handler';

const router = express.Router();

router.get('/', (req, res) => {
  handler.index(req, res);
});

router.get('/preview', (req, res) => {
  handler.preview(req, res);
});

router.get('/volumio', (req, res) => {
  handler.volumio(req, res);
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