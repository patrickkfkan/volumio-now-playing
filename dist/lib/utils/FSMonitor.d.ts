export default abstract class FSMonitor {
    #private;
    abstract name: string;
    constructor(monitorDir: string);
    start(): void;
    stop(): Promise<void>;
    get status(): "running" | "stopped";
    protected abstract handleEvent(event: 'add' | 'unlink' | 'addDir' | 'unlinkDir', path: string): void;
}
//# sourceMappingURL=FSMonitor.d.ts.map