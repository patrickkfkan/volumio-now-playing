export default class OpenStreetMapAPI {
    #private;
    /**
     * Note 'country` is always undefined. Back in the days of using OpenWeatherMap API to fetch weather + location data,
     * the `country` value is the country code returned by said API.
     * Since OpenStreetMap API returns the full country name, we don't need the `country` property anymore. But we leave it
     * there for compatibility with the Weather API.
     * @param lat
     * @param lon
     * @param lang
     * @returns
     */
    static reverse(lat: number, lon: number, lang?: string): Promise<{
        name?: string;
        country?: string;
    }>;
}
//# sourceMappingURL=index.d.ts.map