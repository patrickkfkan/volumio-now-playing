const OpenWeatherAPI = require("openweather-api-node");
const md5 = require('md5');
const { parseCoordinates } = require("../config");
const np = require(nowPlayingPluginLibRoot + '/np');
const Cache = require(nowPlayingPluginLibRoot + '/cache');

const WEATHER_ICONS_BASE_PATH = '/assets/weather-icons';
const ICON_CODE_MAPPINGS = {
  '01d': 'clear-day.svg',
  '01n': 'clear-night.svg',
  '02d': 'partly-cloudy-day.svg',
  '02n': 'partly-cloudy-night.svg',
  '03d': 'cloudy.svg',
  '03n': 'cloudy.svg',
  '04d': 'overcast-day.svg',
  '04n': 'overcast-night.svg',
  '09d': 'partly-cloudy-day-drizzle.svg',
  '09n': 'partly-cloudy-night-drizzle.svg',
  '10d': 'partly-cloudy-day-rain.svg',
  '10n': 'partly-cloudy-night-rain.svg',
  '11d': 'thunderstorms-day.svg',
  '11n': 'thunderstorms-night.svg',
  '13d': 'partly-cloudy-day-snow.svg',
  '13n': 'partly-cloudy-night-snow.svg',
  '50d': 'mist.svg',
  '50n': 'mist.svg'
};

const fetchPromises = {};

const api = new OpenWeatherAPI({});
const weatherCache = new Cache(
  { weather: 600 },
  { weather: 10 });

let currentApiKey = null;
let currentCoordinates = {};
let currentUnits = null;
let ready = false;

function clearCache() {
  weatherCache.clear();
}

function config({ apiKey, coordinates, units = 'metric' }) {
  let coord = parseCoordinates(coordinates);
  ready = coord && apiKey;
  if (!ready) {
    return;
  }
  let configChanged = false;
  if (coord.lat !== currentCoordinates.lat || coord.lon !== currentCoordinates.lon) {
    api.setLocationByCoordinates(coord.lat, coord.lon);
    configChanged = true;
  }
  if (apiKey && currentApiKey !== apiKey) {
    api.setKey(apiKey);
    configChanged = true;
  }
  if (currentUnits !== units) {
    api.setUnits(units);
  }
  if (configChanged) {
    currentApiKey = apiKey;
    currentCoordinates = coord;
    currentUnits = units;

    // Refresh info
    fetchInfo();
    // TODO:
    // broadcast to notify change?
  }
}

function getFetchPromise(callback) {
  const key = md5(JSON.stringify(currentCoordinates));
  if (fetchPromises[key]) {
    return fetchPromises[key];
  }
  else {
    const promise = callback();
    fetchPromises[key] = promise;
    promise.finally(() => {
      delete fetchPromises[key];
    });
    return promise;
  }
}

function getWeatherIconPath(iconCode, style, animated) {
  if (ICON_CODE_MAPPINGS[iconCode]) {
    return `${WEATHER_ICONS_BASE_PATH}/${style}/svg${(!animated ? '-static' : '')}/${ICON_CODE_MAPPINGS[iconCode]}`;
  }
  else {
    return null;
  }
};

function getWeatherIconUrls(appUrl, iconCode) {
  return {
    'filledStatic': appUrl + getWeatherIconPath(iconCode, 'fill', false),
    'filledAnimated': appUrl + getWeatherIconPath(iconCode, 'fill', true),
    'outlineStatic': appUrl + getWeatherIconPath(iconCode, 'line', false),
    'outlineAnimated': appUrl + getWeatherIconPath(iconCode, 'line', true),
    'monoStatic': appUrl + getWeatherIconPath(iconCode, 'monochrome', false),
    'monoAnimated': appUrl + getWeatherIconPath(iconCode, 'monochrome', true)
  };
}

function parseLocation(data) {
  return {
    name: data.name,
    localNames: data.local_names,
    state: data.state,
    country: data.country
  };
}

function parseCurrent(data) {
  const currentData = data.current.weather;
  const appUrl = np.get('pluginInfo').appUrl;
  const result = {
    temp: Math.round(currentData.temp.cur),
    description: currentData.description,
    iconUrl: getWeatherIconUrls(appUrl, currentData.icon.raw)
  };
  return result;
}

function parseForecast(data) {
  const appUrl = np.get('pluginInfo').appUrl;
  const forecast = [];
  for (const dailyData of data.daily) {
    const dailyWeather = dailyData.weather;
    forecast.push({
      temp: {
        min: Math.round(dailyWeather.temp.min),
        max: Math.round(dailyWeather.temp.max)
      },
      iconUrl: getWeatherIconUrls(appUrl, dailyWeather.icon.raw),
      dateTimeMillis: dailyData.dt_raw * 1000
    });
  }
  return forecast.slice(1);
}

async function doFetchInfo() {
  return getFetchPromise(async() => {
    const location = await api.getLocation();
    const weather = await api.getEverything();

    return {
      location: parseLocation(location),
      current: parseCurrent(weather),
      forecast: parseForecast(weather)
    };
  });
}

async function fetchInfo() {
  if (!ready) {
    return Promise.reject(np.getI18n('NOW_PLAYING_ERR_WEATHER_MISCONFIG'));
  }
  try {
    let info = {};
    const cacheKey = md5(JSON.stringify(currentCoordinates));
    info = await weatherCache.getOrSet('weather', cacheKey, () => doFetchInfo());
    return Promise.resolve(info);
  } catch (e) {
    msg = np.getI18n('NOW_PLAYING_ERR_WEATHER_FETCH') + (e.message ? `: ${e.message}` : '');
    return Promise.reject(msg);
  }
}

module.exports = {
  config,
  fetchInfo,
  clearCache
};
