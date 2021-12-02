import * as util from '../util.js';
import { registry } from '../registry.js';

/**
 * navigation:
 * - info, e.g.:
 *   - service: 'mpd',
 *   - artist: isOrphanAlbum ? '*' : artist,
 *   - album: album,
 *   - albumart: albumart,
 *   - year: isOrphanAlbum ? '' : year,
 *   - genre: isOrphanAlbum ? '' : genre,
 *   - type: 'album',
 *   - trackType: albumTrackType,
 *   - duration: duration
 * - lists (each represented by a <section>)
 *   - availableListViews
 *   - title
 *   - items
 *     - album, albumart, artist, service, title, type, uri
 * - prev.uri
 */

export class BrowseMusicScreen {
  constructor(el) {
    this.el = el;
    this.browseSources = [];
    this.currentLocation = { type: 'browse', uri: '' };
    this.currentService = null;

    const html = `
      <div class="contents">
        <div class="header">
          <div class="actions">
            <button class="action home"><i class="fa fa-home"></i></button>
            <button class="action back"><i class="fa fa-arrow-left"></i></button>
            <button class="action list-view-toggle" data-current="list"><i class="fa"></i></button>
            <div class="icon-text-input">
              <input type="text" class="action search" />
              <i class="fa fa-search"></i>
            </div>
            <button class="action close"><i class="fa fa-times-circle"></i></button>
          </div>
        </div>
        <div class="navigation">
        </div>
      </div>
    `;

    let screen = $(this.el);
    screen.html(html);
    screen.data('screenName', this.getScreenName());

    let self = this;
    let socket = registry.socket;
    
    socket.on('pushBrowseSources', data => {
      self.browseSources = data;
      self.showBrowseSources();
    });

    socket.on('pushBrowseLibrary', data => {
      // Only handle search results.
      // For browsing library we use REST API
      if (data.navigation && data.navigation.isSearchResult) {
        self.showSearchResults(data);
      }
    })
    
    $('.navigation', screen).on('click', 'section .items .item', function() {
      self.handleItemClick($(this));
      return false;
    });

    $('.navigation', screen).on('click', 'section .items .item .action.play', function() {
      self.handleItemPlayButtonClicked($(this).parents('.item'));
      return false;
    });

    $('.navigation', screen).on('click', '.info-header .action.play', function() {
      self.handleInfoHeaderPlayButtonClicked($(this).parents('.info-header'));
      return false;
    });

    $('.action.list-view-toggle', screen).on('click', function() {
      let current = $(this).attr('data-current');
      let toggled = current == 'list' ? 'grid' : 'list';
      $(this).attr('data-current', toggled);
      $('section:not(.fixed-list-view)', screen).toggleClass('list grid');
    })

    $('.action.close', screen).on('click', function() {
      util.setActiveScreen(registry.screens.nowPlaying);
    });
    
    $('.action.home', screen).on('click', function() {
      self.browse('', () => {
        self.setCurrentService(null);
      });
    });

    $('.action.back', screen).on('click', function() {
      let uri = $(this).data('uri') || '';
      self.browse(uri, () => {
        if (uri === '' || uri === '/') {
          self.setCurrentService(null);
        }
      });
    })

    $('.action.search', screen).on('input', function() {
      let inputTimer = $(this).data('inputTimer');
      if (inputTimer) {
        clearTimeout(inputTimer);
        $(this).data('inputTimer', null);
      }
      let query = $(this).val().trim();
      if (query.length >= 3) {
        inputTimer = setTimeout(() => {
          self.search(query);
        }, 500);
        $(this).data('inputTimer', inputTimer);
      }
    })
  }

  static init(el) {
    return new BrowseMusicScreen(el);
  }

  getScreenName() {
    return 'browseMusic';
  }

  getDefaultShowEffect() {
    return 'slideDown';
  }

  usesTrackBar() {
    return true;
  }

  showBrowseSources() {
    if (this.currentLocation.type !== 'browse' || (this.currentLocation.uri !== '/' && this.currentLocation.uri !== '')) {
      return;
    }

    let sources = this.browseSources;
    let section = this.createSection({
      items: sources,
      availableListViews: ['grid']
    });

    let screen = $(this.el);
    $('.navigation', screen).empty().append(section);
    $('.action.list-view-toggle', screen).hide();
    $('.action.back', screen).data('uri', '');
    this.scrollToTop();
  }

  createInfoHeader(data) {
    const excludeItemTypes = [
      'play-playlist'
    ];
    if (excludeItemTypes.includes(data.type)) {
      return;
    }

    let html = `
      <div class="info-header">
        <div class="bg">
          <img src="" />
        </div>
        <div class="main">
          <div class="albumart"></div>
          <div class="info">
            <div class="title"></div>
            <div class="artist"></div>
            <div class="media-info"></div>
            <div class="buttons"></div>
          </div>
        </div>
      </div>
    `;

    let infoEl = $(html);

    let fallbackImgSrc = registry.app.host + '/albumart';
    let albumartUrl = data.albumart || fallbackImgSrc;
    if (albumartUrl.startsWith('/')) {
      albumartUrl = registry.app.host + albumartUrl;
    }
    let fallbackImgJS = `onerror="if (this.src != '${ fallbackImgSrc }') this.src = '${ fallbackImgSrc }';"`;

    $('.albumart', infoEl).html(`<img src="${ albumartUrl }" ${ fallbackImgJS }/>`);
    $('.bg', infoEl).html(`<img src="${ albumartUrl }" ${ fallbackImgJS }/>`);

    let titleText = data.title || data.album || data.artist || '';
    let titleIsArtist = !data.title && !data.album && data.artist;
    let artistText = titleIsArtist ? '' : data.artist || '';
    let mediaInfoFields = ['year', 'duration', 'genre', 'trackType'];
    let mediaInfoComponents = [];
    mediaInfoFields.forEach( field => {
      if (data[field]) {
        mediaInfoComponents.push(`<span>${ data[field] }</span>`);
      }
    });
    let dotHtml = '<i class="fa fa-circle dot"></i>';
    $('.title', infoEl).text(titleText);
    $('.artist', infoEl).text(artistText);
    $('.media-info', infoEl).html(mediaInfoComponents.join(dotHtml));

    let buttons = $('.buttons', infoEl);
    if (this.hasPlayButton(data)) {
      let playButtonHtml = '<button class="action play"><i class="fa fa-play"></i>Play</button>';
      buttons.append($(playButtonHtml));
    }

    infoEl.data('raw', data);

    return infoEl;
  }

  createSection(data) {
    let self = this;
    let title = data.title || '';
    let availableListViews = data.availableListViews;;
    if (!Array.isArray(availableListViews) || availableListViews.length == 0) {
      availableListViews = ['list', 'grid'];
    }
    let items = data.items || [];
    let preferredListView = $(`${ self.el } .action.list-view-toggle`).attr('data-current');
    let listView = availableListViews.includes(preferredListView) ? preferredListView : availableListViews[0];
    let sectionClasses = '';
    if (!title) {
      sectionClasses += ' no-title';
    }
    if (availableListViews.length === 1) {
      sectionClasses += ' fixed-list-view';
    }
    let html = `
      <section class="${ listView }${ sectionClasses }">
        <div class="title">${ title }</div>
        <div class="items"></div>
      </section>
    `;
    let section = $(html);
    let itemList = $('.items', section);
    let hasAlbum = false,
        hasArtist = false,
        hasDuration = false,
        hasEllipsis = false;
    items.forEach( (item, index) => {
      let itemEl = self.createItem(item);
      itemEl.data('index', index);
      itemList.append(itemEl);
      if (item.album) { hasAlbum = true; }
      if (item.artist) { hasArtist = true; }
      if (item.duration) { hasDuration = true; }
      //TODO: hasEllipsis - menu
    });
    if (!hasAlbum) { itemList.addClass('no-album'); }
    if (!hasArtist) { itemList.addClass('no-artist'); }
    if (!hasDuration) { itemList.addClass('no-duration'); }
    if (!hasEllipsis) { itemList.addClass('no-ellipsis'); }

    section.data('raw', data);

    return section;
    // TODO: If no items then display No Results as title
  }

  createItem(data) {
    let title = data.title || data.name || '';
    let album = data.album || '';
    let artist = data.artist || '';
    let duration = data.duration ? util.secondsToString(data.duration) : '';

    let itemClasses = '';
    if (!album) {
      itemClasses += ' no-album';
    }
    if (!artist) {
      itemClasses += ' no-artist';
    }

    let albumArtist = data.album || '';
    if (data.artist) {
      albumArtist += albumArtist ? ' - ' : '';
      albumArtist += data.artist;
    }

    let html = `
      <div class="item ${ itemClasses }">
        <div class="albumart">
        </div>
        <div class="title-album-artist">
          <div class="text title">${ title }</div>
          <div class="text album">${ album }</div>
          <div class="text artist">${ artist }</div>
          <div class="text album-artist">${ albumArtist }</div>
        </div>
        <div class="text duration">${ duration }</div>
        <div class="ellipsis"><button class="menu-trigger"><i class="fa fa-ellipsis-v"></i></button></div>
      </div>
    `;
    let item = $(html);

    if (data.albumart || (!data.icon && data.tracknumber == undefined)) {
      let fallbackImgSrc = registry.app.host + '/albumart';
      let albumartUrl = data.albumart || fallbackImgSrc;
      if (albumartUrl.startsWith('/')) {
        albumartUrl = registry.app.host + albumartUrl;
      }
      let fallbackImgJS = `onerror="if (this.src != '${ fallbackImgSrc }') this.src = '${ fallbackImgSrc }';"`;
      $('.albumart', item).html(`<img src="${ albumartUrl }" ${ fallbackImgJS }/>`);
    }
    else if (data.icon) {
      let iconHtml = `<div class="icon"><i class="${ data.icon }"></i></div>`;
      $('.albumart', item).html(iconHtml);
    }
    else { // track number
      let trackNumberHtml = `<div class="track-number">${ data.tracknumber }</div>`;
      $('.albumart', item).html(trackNumberHtml);
    }

    if (this.hasPlayButton(data)) {
      let buttonContainerHtml = `
        <div class="button-container">
          <button class="action play"><i class="fa fa-play"></i></button>
        </div>`;
      let buttonContainer = $(buttonContainerHtml);
      $('.albumart', item).append(buttonContainer);
    }

    item.data('raw', data);

    return item;
  }

  handleItemClick(itemEl) {
    let item = itemEl.data('raw');
    if (!item.uri) {
      return;
    }

    if (this.isPlayOnDirectClick(item.type)) {
      this.doPlayOnClick(itemEl);
    }
    else {
      let prevServiceName = this.currentService ? this.currentService.name : '';
      this.browse(item.uri, () => {
        if (!item.service && !item.plugin_name) {
          this.setCurrentService(null);
        }
        else if (item.plugin_name) { // itemEl refers to a browse source
          this.setCurrentService({
            name: item.plugin_name,
            prettyName: item.plugin_name !== 'mpd' ? item.name : 'Music Library'
          });
        }
        else if (item.service !== prevServiceName) {
          let prettyName = '';
          if (item.service === 'mpd') {
            prettyName = 'Music Library';
          }
          else {
            let itemService = this.browseSources.find(source => source.plugin_name === item.service);
            prettyName = itemService ? itemService.name : '';
          }
          this.setCurrentService({
            name: item.service,
            prettyName
          });
        }
      });
    }

/*    if (data.type !== 'song' && data.type !== 'webradio' && data.type !== 'mywebradio' && data.type !== 'cuesong' && data.type !== 'album' && data.type !== 'artist' && data.type !== 'cd' && data.type !== 'play-playlist') {
      this.browse(data.uri);
    } else if (data.type === 'webradio' || data.type === 'mywebradio' || data.type === 'album' || data.type === 'artist') {
      this.play(item, list, itemIndex);
    } else if (data.type === 'song') {
      this.playItemsList(item, list, itemIndex);
    } else if (data.type === 'cuesong') {
      this.playQueueService.addPlayCue(item);
    } else if (data.type === 'cd') {
      this.playQueueService.replaceAndPlay(item);
    } else if ( data.type === 'play-playlist') {
      this.playQueueService.playPlaylist({title: data.name});
    }*/
  }

  handleItemPlayButtonClicked(itemEl) {
    this.doPlayOnClick(itemEl);
  }

  handleInfoHeaderPlayButtonClicked(infoHeaderEl) {
    this.doPlayOnClick(infoHeaderEl);
  }

  // Should item of the given type play when clicked directly (i.e. not using the play button)
  isPlayOnDirectClick(itemType) {
    const playOnDirectClickTypes = [
      'song',
      'webradio',
      'mywebradio',
      'cuesong'/*,
      'cd' // What's this? Can see in Volumio UI code but not in the backend...Leaving it out until I know how it's actually used
      */
    ]
    return playOnDirectClickTypes.includes(itemType);
  }

  // Based on:
  // https://github.com/volumio/Volumio2-UI/blob/master/src/app/browse-music/browse-music.controller.js
  hasPlayButton(item) {
    if (!item) {
      return false;
    }
    // We avoid that by mistake one clicks on play all NAS or USB, freezing volumio
    if ((item.type === 'folder' && item.uri && item.uri.startsWith('music-library/') && item.uri.split('/').length < 4 ) ||
        item.disablePlayButton === true) {
      return false;
    }
    const playButtonTypes = [
      'folder',
      'album',
      'artist',
      'song',
      'mywebradio',
      'webradio',
      'playlist',
      'cuesong',
      'remdisk',
      'cuefile',
      'folder-with-favourites',
      'internal-folder'
    ]
    return playButtonTypes.includes(item.type);
  }

  showBrowseLibrary(data) {
    let self = this;
    if (!data.navigation) {
      return;
    }
    let screen = $(self.el);
    let nav = $('.navigation', screen);
    nav.empty();
    if (data.navigation.info) {
      nav.append(self.createInfoHeader(data.navigation.info));
    }
    if (Array.isArray(data.navigation.lists)) {
      data.navigation.lists.forEach( list => {
        let section = self.createSection(list);
        nav.append(section);
      })
      if ($('section:not(.fixed-list-view)', nav).length > 0) {
        $('.action.list-view-toggle', screen).show();
      }
      else {
        $('.action.list-view-toggle', screen).hide();
      }
    }
    let prev = data.navigation.prev || { uri: '' };
    // prev info only has 'uri' field. We assume it points back to
    // the current service (or null if the uri value is empty). Or...
    // perhaps we can get the service from the uri?
    $('.action.back', screen).data('uri', prev.uri || '');
    self.scrollToTop();
  }

  showSearchResults(data) {
    let screen = $(this.el);
    let searchInputValue = $('.action.search', screen).val().trim();
    if (this.currentLocation.type !== 'search' || this.currentLocation.query !== searchInputValue) {
      return;
    }
    this.showBrowseLibrary(data);
    this.stopFakeLoadingBar(true);
  }

  requestRestApi(url, callback) {
    let self = this;
    self.stopFakeLoadingBar();
    if (url === '' || url === '/') {
      self.showBrowseSources();
    }
    else {
      self.startFakeLoadingBar();
      $.getJSON(url, data => {
        if (callback) {
          callback(data);
        }
      });
    }
  }

  browse(uri, callback) {
    const doCallback = (uri, data) => {
      if (callback) {
        callback(uri, data);
      }
    }
    let self = this;
    self.currentLocation = {
      type: 'browse',
      uri: uri
    };
    self.stopFakeLoadingBar();
    if (uri === '' || uri === '/') {
      self.showBrowseSources();
      doCallback(uri, self.browseSources);
    }
    else {
      // Double encode uri because Volumio will decode it after
      // it has already been decoded by Express query parser.
      let requestUrl = `${ registry.app.host }/api/v1/browse?uri=${ encodeURIComponent(encodeURIComponent(uri)) }`;
      self.startFakeLoadingBar();
      self.requestRestApi(requestUrl, data => {
        if (self.currentLocation.type === 'browse' && self.currentLocation.uri === uri) {
          self.showBrowseLibrary(data);
          self.stopFakeLoadingBar(true);
          doCallback(uri, data);
        }
      });
    }
  }

  search(query) {
    // Volumio REST API for search does NOT have the same implementation as Websocket API!
    // Must use Websocket because REST API does not allow for source-specific searching.
    let payload = {
      value: query
      // In Volumio musiclibrary.js, the payload also has a 'uri' field - what is it used for???
    }
    if (this.currentService) {
      payload.service = this.currentService.name;
    }
    this.currentLocation = {
      type: 'search',
      service: this.currentService,
      query
    }
    this.startFakeLoadingBar();
    registry.socket.emit('search', payload);
  }

  setCurrentService(service) {
    this.currentService = service;
    let screen = $(this.el);
    $('.action.search', screen).attr('placeholder', service ? service.prettyName : '');
  }

  scrollToTop() {
    let screen = $(this.el);
    $('.navigation', screen).scrollTop(0);
  }

  doPlayOnClick(itemEl) {
    let socket = registry.socket;
    let item = itemEl.data('raw');

    if (item.type === 'cuesong') {
      socket.emit('addPlayCue', {
        uri: item.uri,
        number: item.number,
        service: (item.service || null)
      });
    }
    else if (item.type === 'playlist') {
      socket.emit('playPlaylist', {
        name: item.title
      });
    }
    else {
      let list;
      let index;
      let playEntireListTypes = [
        'song'
      ];
      let playEntireList = playEntireListTypes.includes(item.type);
      if (playEntireList) {
        list = itemEl.parents('section').data('raw');
        index = itemEl.data('index');
      }
      if (list && list.items && index != undefined) {
        socket.emit('playItemsList', {
          item,
          list: list.items,
          index
        });
      }
      else {
        socket.emit('playItemsList', { item });
      }
      
    }
  }

  startFakeLoadingBar() {
    let self = this;
    let screen = $(self.el);
    self.stopFakeLoadingBar();
    screen.addClass('loading');
    // Based on https://codepen.io/1117/pen/zYxbqxO
    let step = 0.5;
    let currentProgress = 0;
    let timer = setInterval(function() {
      currentProgress += step;
      let progress = Math.round(Math.atan(currentProgress) / (Math.PI / 2) * 100 * 1000) / 1000;
      util.setCSSVariable('--loading-percent', progress + '%', self);
      if (progress >= 100){
          self.stopFakeLoadingBar();
      }
      else if (progress >= 70) {
          step = 0.1;
      }
    }, 100);
    screen.data('loading-timer', timer);
  }

  stopFakeLoadingBar(complete = false) {
    let screen = $(this.el);
    let loadingTimer = screen.data('loading-timer');
    if (loadingTimer) {
      clearInterval(loadingTimer);
      screen.data('loading-timer', null);
    }
    let hideTimer = screen.data('hide-timer');
    if (hideTimer) {
      clearTimeout(hideTimer);
      screen.data('hide-timer', null);
    }

    const cleanup = () => {
      screen.data('hide-timer', null);
      util.setCSSVariable('--loading-percent', '0', this);
      screen.removeClass('loading');
    };

    if (complete) {
      util.setCSSVariable('--loading-percent', '100%', this);
      hideTimer = setTimeout(() => {
        cleanup();
      }, 200);
      screen.data('hide-timer', hideTimer);
    }
    else {
      cleanup();
    }
  }
}
