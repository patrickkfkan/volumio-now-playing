import FSMonitor from './FSMonitor';
declare class MyBackgroundMonitor extends FSMonitor<['add', 'unlink']> {
    #private;
    name: string;
    constructor();
    getImages(): {
        name: string;
        path: string;
    }[];
    stop(): Promise<void>;
    protected handleEvent(event: 'add' | 'unlink', _path: string): void;
}
declare const myBackgroundMonitor: MyBackgroundMonitor;
export default myBackgroundMonitor;
//# sourceMappingURL=MyBackgroundMonitor.d.ts.map