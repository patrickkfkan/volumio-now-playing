import * as SystemUtils from './System';
import np from '../NowPlayingContext';
import chokidar from 'chokidar';

export default abstract class FSMonitor {

  abstract name: string;
  #status: 'running' | 'stopped';
  #watcher: ReturnType<typeof chokidar['watch']> | null;
  #monitorDir: string;

  constructor(monitorDir: string) {
    this.#monitorDir = monitorDir;
    this.#status = 'stopped';
    this.#watcher = null;
  }

  start() {
    if (!SystemUtils.dirExists(this.#monitorDir)) {
      np.getLogger().warn(`[now-playing] ${this.#monitorDir} does not exist. ${this.name} will not start.`);
      return;
    }
    this.#watcher = chokidar.watch(this.#monitorDir);
    this.#watcher.on('add', this.handleEvent.bind(this, 'add'));
    this.#watcher.on('unlink', this.handleEvent.bind(this, 'unlink'));
    this.#watcher.on('addDir', this.handleEvent.bind(this, 'addDir'));
    this.#watcher.on('unlinkDir', this.handleEvent.bind(this, 'unlinkDir'));
    np.getLogger().warn(`[now-playing] ${this.name} is now watching ${this.#monitorDir}`);
    this.#status = 'running';
  }

  async stop() {
    if (this.#watcher) {
      await this.#watcher.close();
      this.#watcher = null;
    }
    this.#status = 'stopped';
    np.getLogger().warn(`[now-playing] ${this.name} stopped`);
  }

  get status() {
    return this.#status;
  }

  protected abstract handleEvent(event: 'add' | 'unlink' | 'addDir' | 'unlinkDir', path: string): void;
}
