export interface OpenMeteoAPIConstructorOptions {
    lat?: number;
    lon?: number;
    lang?: string;
    units?: 'metric' | 'imperial';
}
export interface OpenMeteoAPIGetWeatherResult {
    location: {
        name?: string;
        country?: string;
    };
    current: {
        temp: {
            now?: number;
            min?: number;
            max?: number;
        };
        humidity?: number;
        windSpeed?: number;
        icon?: string;
    };
    daily: {
        temp: {
            min?: number;
            max?: number;
        };
        humidity?: number;
        windSpeed?: number;
        icon?: string;
        dateTimeMillis?: number;
    }[];
    hourly: {
        temp?: number;
        humidity?: number;
        windSpeed?: number;
        icon?: string;
        dateTimeMillis?: number;
    }[];
}
export default class OpenMeteoAPI {
    #private;
    constructor(args?: OpenMeteoAPIConstructorOptions);
    setCoordinates(lat: number, lon: number): void;
    setTimzone(tz: string | undefined): void;
    setLang(lang: string): void;
    setUnits(units: 'metric' | 'imperial'): void;
    getWeather(): Promise<OpenMeteoAPIGetWeatherResult>;
    private sanitizeWeatherApiResponse;
}
//# sourceMappingURL=index.d.ts.map