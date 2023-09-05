import express from 'express';
import fetch from 'node-fetch';
import { promisify } from 'util';
import { pipeline } from 'stream';
import np from '../NowPlayingContext';

export async function proxyRequest(url: string, res: express.Response) {
  np.getLogger().info(`[now-playing] Proxy request: ${url}`);
  const streamPipeline = promisify(pipeline);
  try {
    const response = await fetch(url);
    if (!response.ok || !response.body) {
      return res.send(response.status);
    }
    await streamPipeline(response.body, res);
  }
  catch (error) {
    np.getLogger().error(np.getErrorMessage('[now-playing] Proxy error:', error));
    return res.send(500);
  }
}
