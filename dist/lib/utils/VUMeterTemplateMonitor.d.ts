import FSMonitor from './FSMonitor';
import { VUMeter } from 'now-playing-common';
export declare const VU_METER_TEMPLATE_PATH = "/data/INTERNAL/NowPlayingPlugin/VU Meter Templates";
declare class VUMeterTemplateMonitor extends FSMonitor<['addDir', 'unlinkDir']> {
    #private;
    name: string;
    constructor();
    getTemplates(): {
        name: string;
        meters: VUMeter[];
    }[];
    getRandomTemplate(): Promise<string | null>;
    stop(): Promise<void>;
    protected handleEvent(event: 'addDir' | 'unlinkDir', _path: string): void;
}
declare const vuMeterTemplateMonitor: VUMeterTemplateMonitor;
export default vuMeterTemplateMonitor;
//# sourceMappingURL=VUMeterTemplateMonitor.d.ts.map