const parser = require('./parser');
const fetch = require('node-fetch');
const {stringSimilarity} = require('string-similarity-js');
const Limiter = require('./limiter');
const Cache = require('./cache');
const unescapeJS = require('unescape-js');

const DEV_API_BASE_URL = 'https://api.genius.com';
const WEB_API_BASE_URL = 'https://genius.com/api';

const DEFAULT_CONFIG = {
  rateLimiterEnabled: true,
  rateLimiterOptions: {
    maxConcurrent: 5,
    minTime: 100
  },
  cacheEnabled: true,
  cacheTTL: 3600,
  maxCacheEntries: 200,
  debug: false
};

const MAX_PER_PAGE = 20;
const MAX_LIMIT = 50;
const DEFAULT_BEST_MATCH_SAMPLE_SIZE = 20;

const STRIP_PARENTHESES = /\((?:[^)(]|\([^)(]*\))*\)/gm;

class Genius {
  constructor(config = {}) {
    this._limiter = new Limiter();
    this._cache = new Cache();
    this.config(DEFAULT_CONFIG);
    this.config(config);
  }

  config(options) {
    if (options.accessToken) {
      this._requestHeaders = new fetch.Headers({
        'Authorization': `Bearer ${options.accessToken}`
      });
    }

    if (options.debug !== undefined) {
      this._debugEnabled = options.debug;
      this._cache.setDebug(options.debug);
    }

    if (options.rateLimiterEnabled !== undefined) {
      this._limiter.setEnabled(options.rateLimiterEnabled);
    }

    if (options.rateLimiterOptions) {
      this._limiter.setOptions(options.rateLimiterOptions);
    }

    if (options.cacheEnabled !== undefined) {
      this._cache.setEnabled(options.cacheEnabled);
    }

    if (options.cacheTTL !== undefined) {
      this._cache.setTTL('res', options.cacheTTL);
    }

    if (options.maxCacheEntries !== undefined) {
      this._cache.setMaxEntries('res', options.maxCacheEntries);
    }
  }

  clearCache() {
    this._cache.clear('res');
  }

  async _search(q, type, options = {}, qIndex = 0) {
    const {limit = 10, offset = 0} = options;
    const _limit = Math.min(limit, MAX_LIMIT);
    const pageStart = Math.trunc(offset / MAX_PER_PAGE) + 1;
    const pageStartOffset = offset % MAX_PER_PAGE;
    const pageEnd = Math.trunc((offset + limit) / MAX_PER_PAGE) + ((offset + limit) % MAX_PER_PAGE > 0 ? 1 : 0);
    const endpoint = `/search/${type}`;
    const currentQ = Array.isArray(q) ? q[qIndex] || null : q;
    const result = {
      q: currentQ,
      hits: [],
      limit: _limit,
      offset
    };
    if (!currentQ) {
      return result;
    }
    this._debug(`[genius-fetch] _search(): q='${currentQ}' type=${type} limit=${_limit} offset=${offset}`);
    this._debug(`[genius-fetch] _search(): Fetching hits from pages ${pageStart} to ${pageEnd} of search results`);
    const fetches = [];
    for (let page = pageStart; page <= pageEnd; page++) {
      fetches.push(this._fetchWebApiEndpoint(endpoint, {
        q: currentQ, 
        per_page: MAX_PER_PAGE,
        page}));
    }
    const searchResults = await Promise.all(fetches);
    const handleSearchResults = (results) => {
      if (results.response) {
        if (Array.isArray(results.response.sections)) {
          const section = results.response.sections.find(s => s.type === type);
          if (section && Array.isArray(section.hits)) {
            return section.hits;
          }
        }
        this._debug(`[genius-fetch] _search(): Warning - response missing expected props.`);
        return [];
      }
      else {
        this._throwError('[genius-fetch] Search error.', results);
      }
    };
    const allHits = [];
    searchResults.forEach(results => {
      allHits.push(...handleSearchResults(results));
    });
    if (allHits.length === 0) {
      this._debug(`[genius-fetch] _search(): No hits for '${currentQ}'`);
      if (Array.isArray(q) && qIndex + 1 < q.length) {
        this._debug(`[genius-fetch] _search(): Retrying with next in q array`);
        return this._search(q, type, options, qIndex + 1);
      }
    }
    else {
      result.hits = allHits.slice(pageStartOffset, pageStartOffset + _limit);
    }
    this._debug(`[genius-fetch] _search(): Returning ${result.hits.length} of total ${allHits.length} hits, starting from offset ${pageStartOffset}`);
    return result;
  }

  _parseItem(data, type, textFormat) {
    this._debug(`[genius-fetch] _parseItem(): Parsing ${type} with id=${data.id}`);
    switch (type) {
      case 'song':
        return parser.parseSong(data,textFormat);
      case 'album':
        return parser.parseAlbum(data, textFormat);
      case 'artist':
        return parser.parseArtist(data, textFormat);
      default:
        this._debug(`[genius-fetch] _parseItem(): Warning - unrecognized type '${type}'`);    
        return null;          
    }
  }

  async _searchAndParse(q, type, options = {}) {
    const {textFormat = 'html', raw = false, obtainFullInfo = false} = options;
    const {q: searchedQ, hits, limit, offset} = await this._search(q, type, options);
    const fetches = [];
    if (obtainFullInfo) {
      for (const hit of hits) {
        if (hit.type === 'song') {
          fetches.push(this.getSongById(hit.result.id, {textFormat, raw}));
        }
        else if (hit.type === 'album') {
          fetches.push(this.getAlbumById(hit.result.id, {textFormat, raw}));
        }
        else if (hit.type === 'artist') {
          fetches.push(this.getArtistById(hit.result.id, {textFormat, raw}));
        }
        else {
          this._debug(`[genius-fetch] _searchAndParse(): Warning - unrecognized type '${hit.type}'`);    
        }
      }
    }
    else {
      for (const hit of hits) {
        if (raw) {
          fetches.push(Promise.resolve(hit.result));
        }
        else {
          const parsed = this._parseItem(hit.result, hit.type, textFormat);
          if (parsed !== null) {
            fetches.push(Promise.resolve(parsed));
          }
        }
      }
    }
    const items = (await Promise.all(fetches)).filter(item => item !== null);
    this._debug(`[genius-fetch] _searchAndParse(): Processed ${items.length} items.`);
    return {
      q: searchedQ,
      items,
      limit,
      offset
    };
  }

  async _getItemById(id, type, options = {}) {
    this._debug(`[genius-fetch] _getItemById(): type=${type} id=${id}`);
    const {textFormat = 'html', raw = false} = options;
    const endpoint = `/${type}s/${id}`;
    const fetchOp = await this._fetchDevApiEndpoint(endpoint, {text_format: textFormat});
    if (fetchOp.response) {
      const data = fetchOp.response[type];
      return raw ? data : this._parseItem(data, type, textFormat);
    }
    else if (fetchOp.meta && fetchOp.meta.status === 404) {
      this._debug(`[genius-fetch] _getItemById(): 404 Not Found for type=${type} id=${id}`);
      return null;
    }
    else {
      this._throwError(`[genius-fetch] Unable to fetch ${type} with id=${id}.`, fetchOp);
    }
  }

  _checkBestMatchOptions(options) {
    const {limit = 10, sampleSize = DEFAULT_BEST_MATCH_SAMPLE_SIZE} = options;
    const _limit = Math.min(limit, MAX_LIMIT);
    const _sampleSize = Math.max(Math.min(sampleSize, MAX_LIMIT), _limit);
    return {
      ...options,
      limit: _limit,
      sampleSize: _sampleSize
    };
  }

  _generateMatchScoreAndSort(items, compareValueCallbacks, debugItemTitle, limit = 10) {
    const parenthesisRegExp = /\(|\)/gm; // Remove parentheses before matching
    const {compareValue, compareWith, postCompare} = compareValueCallbacks;
    const _compareValue = compareValue().replace(parenthesisRegExp, '');
    this._debug(`[genius-fetch] _generateMatchScoreAndSort(): Obtaining match scores with compare value '${_compareValue}'...`);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const compareWithValue = compareWith(item).replace(parenthesisRegExp, '');
      const matchScore = stringSimilarity(_compareValue, compareWithValue);
      if (postCompare) {
        item.matchScore = postCompare(item, matchScore);
      }
      else {
        item.matchScore = matchScore;
      }
      this._debug(`${i}. [genius-fetch] _generateMatchScoreAndSort(): Compare with #${item.id} - '${compareWithValue}'; score: ${item.matchScore}`);
    }
    const comparator = (item1, item2) => (item2.matchScore - item1.matchScore);
    const sorted = items.sort(comparator);
    this._debug(`[genius-fetch] _generateMatchScoreAndSort(): ------ Items ordered by match score ------`);
    sorted.forEach((item, i) => {
      this._debug(`[genius-fetch] ${i}. #${item.id} - '${debugItemTitle(item)}'; score: ${item.matchScore}`)
      delete item.matchScore;
    });
    const results = sorted.slice(0, limit);
    this._debug(`[genius-fetch] _generateMatchScoreAndSort(): Returning ${results.length} items.`);
    return results;
  }

  // Songs

  async getSongById(id, options = {}) {
    return this._getItemById(id, 'song', options);
  }

  async getSongsByName(name, options = {}) {
    return this._searchAndParse(name, 'song', options);
  }

  async getSongsByBestMatch(matchParams = {}, options = {}) {
    const {name, artist, album} = matchParams;
    const {limit, textFormat, sampleSize, obtainFullInfo = false} = this._checkBestMatchOptions(options);
    if (!name) {
      this._throwError('[genius-fetch] getSongsByBestMatch(): name not specified in matchParams');
    }
    if (!artist && !album) {
      this._throwError(`[genius-fetch] getSongsByBestMatch(): You must specify at least 'artist' or 'album' in matchParams`);
    }
    this._debug(`[genius-fetch] getSongsByBestMatch(): name='${name}' artist='${artist}' album='${album}' limit=${limit} sampleSize=${sampleSize}`);

    const searchNames = this._getBestMatchSearchNames(matchParams);
    const matchRequiresFullInfo = album;
    const songs = await this._searchAndParse(searchNames, 'song', {textFormat, limit: sampleSize, obtainFullInfo: matchRequiresFullInfo});
    if (songs.items.length > 0) {
      const compareValue = () => (name + ' ' + (artist || '') + ' ' + (album || ''));
      const compareWith = (item) => {
        return item.title.full +  ' ' + 
          //(artist ? song.artists.text : '') + ' ' +  // No need to include this because full title already has it
          (album && item.album ? item.album.title.full : '');
      };
      const debugItemTitle = (item) => item.title.full;
      const sortedItems = this._generateMatchScoreAndSort(songs.items, {compareValue, compareWith}, debugItemTitle, limit);
      if (obtainFullInfo && !matchRequiresFullInfo) {
        const fetches = sortedItems.map( item => this.getSongById(item.id, {textFormat}) );
        return await Promise.all(fetches);
      }
      else {
        return sortedItems;
      }
    }
    else {
      this._debug(`[genius-fetch] getSongsByBestMatch(): No items found. Returning empty result.`);
      return [];
    }
  }

  async getSongByBestMatch(matchParams, options = {}) {
    const songs = await this.getSongsByBestMatch(matchParams, {...options, limit: 1});
    return songs.length > 0 ? songs[0] : null;
  }

  // Albums 

  async getAlbumById(id, options) {
    return this._getItemById(id, 'album', options);
  }

  async getAlbumsByName(name, options) {
    return this._searchAndParse(name, 'album', options);
  }

  async getAlbumsByBestMatch(matchParams = {}, options = {}) {
    const {name, artist, releaseYear, releaseMonth, releaseDay} = matchParams;
    const {limit, textFormat, sampleSize, obtainFullInfo = false} = this._checkBestMatchOptions(options);
    if (!name) {
      this._throwError('[genius-fetch] getAlbumsByBestMatch(): name not specified in matchParams');
    }
    if (!artist && !releaseDay && !releaseMonth && !releaseYear) {
      this._throwError(`[genius-fetch] getAlbumsByBestMatch(): You must specify at least 'artist', 'releaseYear', 'releaseMonth' or 'releaseDay' in matchParams`);
    }
    this._debug(`[genius-fetch] getAlbumsByBestMatch(): name='${name}' artist='${artist}' releaseYear='${releaseYear}' releaseMonth='${releaseMonth}' releaseDay='${releaseDay}' limit=${limit} sampleSize=${sampleSize}`);

    const searchNames = this._getBestMatchSearchNames(matchParams);
    const matchRequiresFullInfo = (releaseYear || releaseMonth || releaseDay);
    const albums = await this._searchAndParse(searchNames, 'album', {textFormat, limit: sampleSize, obtainFullInfo: matchRequiresFullInfo});
    if (albums.items.length > 0) {
      const compareValue = () => (name + ' ' + (artist || ''));
      const compareWith = (item) => {
        return item.title.full; 
          //(artist ? item.artist.name : '') + ' ' +  // No need to include this because full title already has it
      };
      const getDateScore = (year, month, day) => {
        let yearScore = releaseYear ? (releaseYear === year ? 1 : 0.8) : 1;
        let monthScore = releaseMonth ? (releaseMonth === month ? 1 : 0.8) : 1;
        let dayScore = releaseDay ? (releaseDay === day ? 1 : 0.8) : 1;
        return yearScore * monthScore * monthScore * dayScore;
      };
      const postCompare = (item, matchScore) => {
        const {year, month, day} = item.releaseDate || {};
        return getDateScore(year, month, day) * matchScore;
      };
      const debugItemTitle = (item) => item.title.full;
      const sortedItems = this._generateMatchScoreAndSort(albums.items, {compareValue, compareWith, postCompare}, debugItemTitle, limit);
      if (obtainFullInfo && !matchRequiresFullInfo) {
        const fetches = sortedItems.map( item => this.getAlbumById(item.id, {textFormat}) );
        return await Promise.all(fetches);
      }
      else {
        return sortedItems;
      }
    }
    else {
      this._debug(`[genius-fetch] getAlbumsByBestMatch(): No items found. Returning empty result.`);
      return [];
    }
  }

  async getAlbumByBestMatch(matchParams, options) {
    const albums = await this.getAlbumsByBestMatch(matchParams, {...options, limit: 1});
    return albums.length > 0 ? albums[0] : null;
  }

  // Artists

  async getArtistsByName(name, options = {}) {
    return this._searchAndParse(name, 'artist', options);
  }

  async getArtistById(id, options) {
    return this._getItemById(id, 'artist', options);
  }

  _getBestMatchSearchNames(matchParams = {}) {
    const {name, artist} = matchParams;
    const retryName = name.replace(STRIP_PARENTHESES, '').trim();
    const searchNames = [
      name + (artist ? ' ' + artist : ''),
    ];
    if (retryName !== '') {
      searchNames.push(retryName + (artist ? ' ' + artist : ''));
    }
    if (artist) {
      searchNames.push(name);
      if (retryName !== '') {
        searchNames.push(retryName);
      }
    }
    return searchNames;
  }

  async _fetchDevApiEndpoint(endpoint, params) {
    if (!this._requestHeaders) {
      this._throwError('[genius-fetch] Error: accessToken not specified in config.');
    }
    const url = DEV_API_BASE_URL + endpoint + (params ? '?' + (new URLSearchParams(params).toString()) : '');
    this._debug(`[genius-fetch] _fetchDevApiEndpoint(): Requesting: ${url}`);
    return this._cache.getOrSet('res', url, async () => {
      const res = await this._limiter.schedule(fetch, url, {
        headers: this._requestHeaders
      });
      this._debug(`[genius-fetch] _fetchDevApiEndpoint(): Response received from: ${url}`);
      return res.json();
    });
  }

  async _fetchWebApiEndpoint(endpoint, params) {
    const url = WEB_API_BASE_URL + endpoint + (params ? '?' + (new URLSearchParams(params).toString()) : '');
    this._debug(`[genius-fetch] _fetchWebApiEndpoint(): Requesting: ${url}`);
    return this._cache.getOrSet('res', url, async () => {
      const res = await this._limiter.schedule(fetch, url);
      this._debug(`[genius-fetch] _fetchWebApiEndpoint(): Response received from: ${url}`);
      return res.json();
    });
  }

  async parseSongEmbed(embedValue) {
    if (!embedValue) {
      return null;
    }
    const result = {
      linkElements: [],
      contentParts: []
    };
    const embedJSRegexp = /<script.*?src='(.*?)'><\/script>/gm;
    const embedJSMatch = embedJSRegexp.exec(embedValue);
    const matchUrl = embedJSMatch.find( url => url.startsWith('//genius.com') && url.endsWith('embed.js') );
    if (matchUrl) {
      const jsUrl = 'https:' + matchUrl;
      this._debug(`[genius-fetch] parseSongEmbed(): Found embed.js URL: ${jsUrl}. Retrieving contents...`);
      const res = await this._limiter.schedule(fetch, jsUrl);
      const jsContents = await res.text();

      // Get <link> elements (e.g. stylesheets)
      const linkElRegexp = /<link href=.*?\/>/gm;
      const linkElMatch = jsContents.match(linkElRegexp);
      result.linkElements = linkElMatch.map( link => unescapeJS(link) );
      this._debug(`[genius-fetch] parseSongEmbed(): Found ${result.linkElements.length} <link> elements`);

      // Get contents
      result.contentParts = this._getSongEmbedContents(jsContents);
      this._debug(`[genius-fetch] parseSongEmbed(): Found ${result.contentParts.length} content parts`);

      return result;
    }
    else {
      this._debug(`[genius-fetch] parseSongEmbed(): Could not find embed.js URL`);
      return null;
    }
  }

  _getSongEmbedContents(js) {
    // Regexp for getting value passed to 'JSON.parse(...)'
    const jsonStrRegExp = /json\.parse\((?:'|")(.*?)(?<!\\)(?:'|")/gmi;

    const parts = [];
    const matches = js.matchAll(jsonStrRegExp);
    for (const match of matches) {
      try {
        parts.push(JSON.parse(unescapeJS(match[1])));
      } catch (e) {
        this._debug(`[genius-fetch] _getSongEmbedContents(): Warning - Failed to parse JSON string`);
      }
    }
    return parts;
  }

  _debug(msg) {
    if (this._debugEnabled) {
      console.log(msg);
    }
  }
  
  _throwError(errMsg, res) {
    const {meta, error, error_description: errorDescription} = res || {};
    const {status: metaStatus, message: metaMessage} = meta || {};
    const err = error ? 
      new Error(errMsg + (` Response: ${error} - ${errorDescription}`))
      :
      new Error(errMsg + (meta ? `Response: ${metaStatus} - ${metaMessage}` : ''));
    if (error) {
      err.statusCode = error;
      err.statusMessage = errorDescription;
    }
    else if (meta) {
      err.statusCode = metaStatus;
      err.statusMessage = metaMessage;
    }
    throw err;
  }
}

Genius.MAX_LIMIT = MAX_LIMIT;

module.exports = Genius;
