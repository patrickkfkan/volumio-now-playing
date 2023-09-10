import path from 'path';
import np from '../NowPlayingContext';
import FSMonitor from './FSMonitor';
import { VUMeter } from 'now-playing-common';
import VUMeterConfigParser from './VUMeterConfigParser';
import { rnd } from './Misc';
import { listDirectories } from './System';
import chokidar from 'chokidar';
import Queue from 'queue';

export const VU_METER_TEMPLATE_PATH = '/data/INTERNAL/NowPlayingPlugin/VU Meter Templates';

class VUMeterTemplateMonitor extends FSMonitor<['addDir', 'unlinkDir']> {

  name = 'VUMeterTemplateMonitor';

  #templateFolderMonitors: Record<string, ReturnType<typeof chokidar['watch']>>;
  #templates: Array<{name: string; meters: VUMeter[]}>;
  #isSorted: boolean;
  #queue: Queue;
  #isTemplateUpdating: boolean;

  constructor() {
    super(VU_METER_TEMPLATE_PATH, [ 'addDir', 'unlinkDir' ]);
    this.#templateFolderMonitors = {};
    this.#templates = [];
    this.#isSorted = false;
    this.#queue = new Queue({
      concurrency: 1,
      autostart: true
    });
    this.#isTemplateUpdating = false;
  }

  getTemplates() {
    if (this.status === 'stopped') {
      np.getLogger().warn('[now-playing] VUMeterTemplateMonitor is not running. Returning empty image list.');
      return [];
    }
    if (!this.#isSorted) {
      this.#sortTemplates();
    }
    return this.#templates;
  }

  async getRandomTemplate() {
    if (this.status === 'initializing') {
      np.getLogger().info('[now-playing] Getting random template directly from template path');
      const directories = await listDirectories(VU_METER_TEMPLATE_PATH);
      if (directories.length === 0) {
        return null;
      }
      return directories[rnd(0, directories.length - 1)];
    }

    if (this.#templates.length > 0) {
      np.getLogger().info('[now-playing] Getting random template from loaded templates');
      return this.#templates[rnd(0, this.#templates.length - 1)].name;
    }

    return null;
  }

  async stop() {
    this.#queue.end();
    const closeMonitorPromises = Object.keys(this.#templateFolderMonitors).map((t) => this.#removeTemplateFolderMonitor(t));
    await Promise.all(closeMonitorPromises);
    this.#templateFolderMonitors = {};
    await super.stop();
    this.#templates = [];
    this.#isSorted = false;
    this.#isTemplateUpdating = false;
  }

  async #removeTemplateFolderMonitor(template: string) {
    const monitor = this.#templateFolderMonitors[template];
    if (monitor) {
      try {
        monitor.removeAllListeners();
        await monitor.close();
      }
      catch (error) {
        np.getLogger().warn(np.getErrorMessage(
          `[now-playing] VUMeterTemplateMonitor failed to close template folder monitor for '${template}':`, error, true));
      }
      finally {
        delete this.#templateFolderMonitors[template];
      }
    }
  }

  protected handleEvent(event: 'addDir' | 'unlinkDir', _path: string): void {
    const { base: template } = path.parse(_path);

    np.getLogger().info(`[now-playing] VUMeterTemplateMonitor captured '${event}': ${template}`);

    switch (event) {
      case 'addDir':
        this.#queue.push(() => this.#addTemplateFolderMonitor(template));
        break;
      case 'unlinkDir':
        this.#queue.push(async () => {
          await this.#removeTemplateFolderMonitor(template);
          this.#removeTemplate(template);
        });
        break;
    }
  }

  #sortTemplates() {
    this.#templates.sort((t1, t2) => t1.name.localeCompare(t2.name));
    this.#isSorted = true;
  }

  async #addTemplateFolderMonitor(template: string) {
    await this.#removeTemplateFolderMonitor(template);
    const templatePath = `${VU_METER_TEMPLATE_PATH}/${template}`;
    const monitor = chokidar.watch(templatePath);
    this.#templateFolderMonitors[template] = monitor;

    const _parseAndAdd = (silent = false) => {
      if (!this.#templates.find((t) => t.name === template)) {
        this.#isTemplateUpdating = true;
        const config = VUMeterConfigParser.getConfig(template);
        if (config.meters) {
          this.#templates.push({
            name: template,
            meters: config.meters
          });
          this.#isSorted = false;
          if (!silent) {
            np.getLogger().info(`[now-playing] Added VU meter template '${template}'`);
          }
        }
        this.#isTemplateUpdating = false;
      }
    };

    const _remove = (silent = false) => {
      this.#isTemplateUpdating = true;
      this.#removeTemplate(template, silent);
      this.#isTemplateUpdating = false;
    };

    const _refresh = (silent = false) => {
      _remove(true);
      _parseAndAdd(true);
      if (!silent) {
        np.getLogger().info(`[now-playing] Refreshed VU meter template '${template}'`);
      }
    };

    const _isMeterTxt = (_path: string) => {
      const { base } = path.parse(_path);
      return base === 'meters.txt';
    };

    monitor.on('add', (_path: string) => {
      if (_isMeterTxt(_path)) {
        _parseAndAdd();
      }
    });

    monitor.on('unlink', (_path: string) => {
      if (_isMeterTxt(_path)) {
        _remove();
      }
    });

    monitor.on('change', (_path: string) => {
      if (_isMeterTxt(_path)) {
        _refresh();
      }
    });

    return monitor;
  }

  #removeTemplate(template: string, silent = false) {
    const index = this.#templates.findIndex((t) => t.name === template);
    if (index >= 0) {
      this.#templates.splice(index, 1);
      if (!silent) {
        np.getLogger().info(`[now-playing] Removed VU meter template '${template}'`);
      }
    }
  }

  get status() {
    const mainStatus = super.status;
    if (this.#isTemplateUpdating && mainStatus === 'running') {
      return 'updating';
    }
    return mainStatus;
  }
}

const vuMeterTemplateMonitor = new VUMeterTemplateMonitor();

export default vuMeterTemplateMonitor;
