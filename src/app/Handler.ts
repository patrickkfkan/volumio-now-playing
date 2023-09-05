import ejs from 'ejs';
import express from 'express';
import fs from 'fs';
import path from 'path';
import np from '../lib/NowPlayingContext';
import { PluginInfo, getPluginInfo } from '../lib/utils/System';
import metadataAPI from '../lib/api/MetadataAPI';
import settingsAPI from '../lib/api/SettingsAPI';
import weatherAPI from '../lib/api/WeatherAPI';
import unsplashAPI from '../lib/api/UnsplashAPI';
import CommonSettingsLoader from '../lib/config/CommonSettingsLoader';
import { CommonSettingsCategory } from 'now-playing-common';
import myBackgroundMonitor from '../lib/utils/MyBackgroundMonitor';
import { rnd } from '../lib/utils/Misc';
import * as SystemUtils from '../lib/utils/System';
import VUMeterConfigParser from '../lib/utils/VUMeterConfigParser';
import vuMeterTemplateMonitor, { VU_METER_TEMPLATE_PATH } from '../lib/utils/VUMeterTemplateMonitor';
import { proxyRequest } from '../lib/utils/Proxy';

const VU_ASSET_EXT = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif'
];

const SYS_ASSET_PATHS = {
  font: '/volumio/http/www3/app/themes/volumio3/assets/variants/volumio/fonts',
  formatIcon: '/volumio/http/www3/app/assets-common/format-icons'
};
const SYS_ASSET_EXTS = {
  font: [
    '.ttf',
    '.eot',
    '.woff',
    '.woff2'
  ],
  formatIcon: [ '.svg' ]
};

interface RenderViewData {
  i18n?: typeof np['getI18n'];
  host?: string;
  pluginInfo?: PluginInfo;
  [k: string]: any;
}

const APIs: Record<string, any> = {
  metadata: metadataAPI,
  settings: settingsAPI,
  weather: weatherAPI,
  unsplash: unsplashAPI
};

export async function index(req: express.Request, res: express.Response) {
  const html = await renderView('index', req, {
    settings: {
      [CommonSettingsCategory.Startup]: CommonSettingsLoader.get(CommonSettingsCategory.Startup),
      [CommonSettingsCategory.NowPlayingScreen]: CommonSettingsLoader.get(CommonSettingsCategory.NowPlayingScreen),
      [CommonSettingsCategory.IdleScreen]: CommonSettingsLoader.get(CommonSettingsCategory.IdleScreen),
      [CommonSettingsCategory.Background]: CommonSettingsLoader.get(CommonSettingsCategory.Background),
      [CommonSettingsCategory.ActionPanel]: CommonSettingsLoader.get(CommonSettingsCategory.ActionPanel),
      [CommonSettingsCategory.Theme]: CommonSettingsLoader.get(CommonSettingsCategory.Theme),
      [CommonSettingsCategory.Performance]: CommonSettingsLoader.get(CommonSettingsCategory.Performance),
      [CommonSettingsCategory.Localization]: CommonSettingsLoader.get(CommonSettingsCategory.Localization)
    }
  });
  res.send(html);
}

export async function preview(req: express.Request, res: express.Response) {
  const html = await renderView('preview', req, {
    nowPlayingUrl: getNowPlayingURL(req)
  });
  res.send(html);
}

export async function myBackground(params: Record<string, any>, res: express.Response) {
  const images = myBackgroundMonitor.getImages();
  if (images.length === 0) {
    np.getLogger().error('[now-playing] No images found in My Backgrounds');
    res.send(404);
    return;
  }
  let targetImage: typeof images[number] | undefined;
  const { file } = params;
  if (file) {
    targetImage = images.find((img) => img.name === file);
    if (!targetImage) {
      np.getLogger().error(`[now-playing] Image '${file}' not found in My Backgrounds`);
      res.send(404);
      return;
    }
  }
  else {
    const rndIndex = rnd(0, images.length - 1);
    targetImage = images[rndIndex];
    np.getLogger().info(`[now-playing] Random My Background image: '${targetImage.name}'`);
  }
  if (!SystemUtils.fileExists(targetImage.path)) {
    np.getLogger().error(`[now-playing] Path to My Background image '${targetImage.path}' not found`);
    res.send(404);
    return;
  }
  try {
    fs.createReadStream(targetImage.path).pipe(res);
  }
  catch (error: any) {
    np.getLogger().error(np.getErrorMessage(`[now-playing] Error piping ${targetImage.path} to response`, error, true));
    res.send(400);

  }
}

export async function vu(reqType: 'get' | 'put', params: Record<string, any>, res: express.Response) {
  if (reqType === 'put') {
    np.broadcastMessage('nowPlayingVUMeterData', params);
    return res.send(200);
  }
  let { template } = params;
  if (!template) {
    const templates = vuMeterTemplateMonitor.getTemplates();
    if (templates.length === 0) {
      return res.send({
        error: np.getI18n('NOW_PLAYING_ERR_NO_VU_METER_TEMPLATE')
      });
    }
    template = templates[rnd(0, templates.length - 1)].name;
  }
  const { file } = params;
  if (!file) {
    const config = VUMeterConfigParser.getConfig(template);
    return res.json(config);
  }
  const assetPath = `${VU_METER_TEMPLATE_PATH}/${template}/${file}`;
  if (!SystemUtils.fileExists(assetPath) || !VU_ASSET_EXT.includes(path.parse(assetPath).ext)) {
    return res.send(404);
  }
  try {
    fs.createReadStream(assetPath).pipe(res);
  }
  catch (error: any) {
    np.getLogger().error(np.getErrorMessage(`[now-playing] Error piping ${assetPath} to response`, error, true));
    return res.send(400);
  }
}

export async function sysAsset(type: 'font' | 'formatIcon', file: string, res: express.Response) {
  const assetPath = `${SYS_ASSET_PATHS[type]}/${file}`;
  if (!SystemUtils.fileExists(assetPath) || !SYS_ASSET_EXTS[type].includes(path.parse(assetPath).ext)) {
    return res.send(404);
  }
  try {
    fs.createReadStream(assetPath).pipe(res);
  }
  catch (error: any) {
    np.getLogger().error(np.getErrorMessage(`[now-playing] Error piping ${assetPath} to response`, error, true));
    return res.send(400);
  }
}

export async function proxy(params: Record<string, any>, res: express.Response) {
  const { url } = params;
  if (!url) {
    return res.send(500);
  }
  return proxyRequest(url, res);
}

export async function api(apiName: string, method: string, params: Record<string, any>, res: express.Response) {
  const api = apiName && method ? APIs[apiName] as any : null;
  const fn = api && typeof api[method] === 'function' ? api[method] : null;
  if (fn) {
    try {
      const result = await fn.call(api, params);
      res.json({
        success: true,
        data: result
      });
    }
    catch (e: any) {
      np.getLogger().error(np.getErrorMessage(`[now-playing] API endpoint ${apiName}/${method} returned error:`, e, true));
      res.json({
        success: false,
        error: e.message || e
      });
    }
  }
  else {
    res.json({
      success: false,
      error: `Invalid API endpoint ${apiName}/${method}`
    });
  }
}

function getNowPlayingURL(req: express.Request) {
  return `${req.protocol}://${req.hostname}:${np.getConfigValue('port')}`;
}

function renderView(name: string, req: express.Request, data: RenderViewData = {}) {
  if (!data.i18n) {
    data.i18n = np.getI18n.bind(np);
  }
  if (!data.host) {
    data.host = `${req.protocol}://${req.hostname}:3000`;
  }
  if (!data.pluginInfo) {
    data.pluginInfo = getPluginInfo();
  }
  return new Promise((resolve, reject) => {
    ejs.renderFile(`${__dirname}/views/${name}.ejs`, data, {}, (err, str) => {
      if (err) {
        reject(err);
      }
      else {
        resolve(str);
      }
    });
  });
}
