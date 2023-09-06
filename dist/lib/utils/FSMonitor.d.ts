export type FSMonitorEvent = 'add' | 'unlink' | 'addDir' | 'unlinkDir';
export default abstract class FSMonitor<T extends FSMonitorEvent[]> {
    #private;
    abstract name: string;
    constructor(monitorDir: string, events: T);
    start(): void;
    stop(): Promise<void>;
    get status(): "initializing" | "running" | "updating" | "stopped";
    protected abstract handleEvent(event: T[number], path: string): void;
}
//# sourceMappingURL=FSMonitor.d.ts.map