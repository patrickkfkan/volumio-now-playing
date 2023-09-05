import path from 'path';
import np from '../NowPlayingContext';
import FSMonitor from './FSMonitor';

const MY_BACKGROUNDS_PATH = '/data/INTERNAL/NowPlayingPlugin/My Backgrounds';
const ACCEPT_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif'
];

class MyBackgroundMonitor extends FSMonitor {

  name = 'MyBackgroundMonitor';

  #images: Array<{name: string; path: string}>;
  #isSorted: boolean;

  constructor() {
    super(MY_BACKGROUNDS_PATH);
    this.#images = [];
    this.#isSorted = false;
  }

  getImages() {
    if (this.status !== 'running') {
      np.getLogger().warn('[now-playing] MyBackgroundMonitor is not running. Returning empty image list.');
      return [];
    }
    if (!this.#isSorted) {
      this.#sortImages();
    }
    return this.#images;
  }

  async stop() {
    super.stop();
    this.#images = [];
    this.#isSorted = false;
  }

  protected handleEvent(event: 'add' | 'unlink' | 'addDir' | 'unlinkDir', _path: string): void {
    if (event !== 'add' && event !== 'unlink') {
      return ;
    }
    const { ext, base } = path.parse(_path);

    try {
      if (!ACCEPT_EXTENSIONS.includes(ext)) {
        return;
      }
    }
    catch (error) {
      np.getLogger().info(np.getErrorMessage(`[now-playing] MyBackgroundMonitor failed to stat '${_path}':`, error, true));
      return;
    }

    np.getLogger().info(`[now-playing] MyBackgroundMonitor captured '${event}': ${base}`);

    switch (event) {
      case 'add':
        this.#images.push({
          name: base,
          path: path.resolve(_path)
        });
        this.#isSorted = false;
        break;
      case 'unlink':
        const index = this.#images.findIndex((image) => image.name === base);
        if (index >= 0) {
          this.#images.splice(index, 1);
        }
        break;
      default:
    }
  }

  #sortImages() {
    this.#images.sort((img1, img2) => img1.name.localeCompare(img2.name));
    this.#isSorted = true;
  }
}

const myBackgroundMonitor = new MyBackgroundMonitor();

export default myBackgroundMonitor;
