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
    this.currentUri = '';

    const html = `
      <div class="contents">
        <div class="header">
          <div class="actions">
            <button class="action home"><i class="fa fa-home"></i></button>
            <button class="action back"><i class="fa fa-arrow-left"></i></button>
            <button class="action list-view-toggle" data-current="list"><i class="fa"></i></button>
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
    
    $('.navigation', screen).on('click', 'section .items .item', function() {
      self.handleItemClick($(this));
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
      self.browse('');
    });

    $('.action.back', screen).on('click', function() {
      let uri = $(this).data('uri') || '';
      self.browse(uri);
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
    if (this.currentUri !== '' && this.currentUri !== '/') {
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

    let html = `
      <div class="item ${ itemClasses }">
        <div class="albumart">
        </div>
        <div class="title-album-artist">
          <div class="text title">${ title }</div>
          <div class="text album">${ album }</div>
          <div class="text artist">${ artist }</div>
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
      this.browse(item.uri);
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

  handlePlayButtonClicked(item) {

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

  showBrowseLibrary(data) {
    // TODO: show info if any
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
    $('.action.back', screen).data('uri', prev.uri || '');
    self.scrollToTop();
  }

  browse(uri) {
    let self = this;
    self.currentUri = uri;
    self.stopFakeLoadingBar();
    if (uri === '' || uri === '/') {
      self.showBrowseSources();
    }
    else {
      // Double encode uri because Volumio will decode it after
      // it has already been decoded by Express query parser.
      let requestUrl = `${ registry.app.host }/api/v1/browse?uri=${ encodeURIComponent(encodeURIComponent(uri)) }`;
      self.startFakeLoadingBar();
      $.getJSON(requestUrl, function(data) {
        if (self.currentUri === uri) {
          self.showBrowseLibrary(data);
          self.stopFakeLoadingBar(true);
        }
      });
    }
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
    else {
      let list;
      let index;
      let playEntireList = !(item.type === 'webradio' || item.type === 'mywebradio');
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
