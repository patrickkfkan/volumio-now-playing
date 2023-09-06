import path from 'path';
import np from '../NowPlayingContext';
import FSMonitor from './FSMonitor';
import { VUMeter } from 'now-playing-common';
import VUMeterConfigParser from './VUMeterConfigParser';
import { rnd } from './Misc';
import { listDirectories } from './System';

export const VU_METER_TEMPLATE_PATH = '/data/INTERNAL/NowPlayingPlugin/VU Meter Templates';

class VUMeterTemplateMonitor extends FSMonitor<['addDir', 'unlinkDir']> {

  name = 'VUMeterTemplateMonitor';

  #templates: Array<{name: string; meters: VUMeter[]}>;
  #isSorted: boolean;

  constructor() {
    super(VU_METER_TEMPLATE_PATH, [ 'addDir', 'unlinkDir' ]);
    this.#templates = [];
    this.#isSorted = false;
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
    super.stop();
    this.#templates = [];
    this.#isSorted = false;
  }

  protected handleEvent(event: 'addDir' | 'unlinkDir', _path: string): void {
    const { base: template } = path.parse(_path);

    np.getLogger().info(`[now-playing] VUMeterTemplateMonitor captured '${event}': ${template}`);

    switch (event) {
      case 'addDir':
        const config = VUMeterConfigParser.getConfig(template);
        if (config.meters) {
          this.#templates.push({
            name: template,
            meters: config.meters
          });
        }
        this.#isSorted = false;
        break;
      case 'unlinkDir':
        const index = this.#templates.findIndex((t) => t.name === template);
        if (index >= 0) {
          this.#templates.splice(index, 1);
        }
        break;
      default:
    }
  }

  #sortTemplates() {
    this.#templates.sort((t1, t2) => t1.name.localeCompare(t2.name));
    this.#isSorted = true;
  }
}

const vuMeterTemplateMonitor = new VUMeterTemplateMonitor();

export default vuMeterTemplateMonitor;
