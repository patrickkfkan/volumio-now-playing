import { registry } from './../registry.js';
import * as util from './../util.js';

export class NowPlayingScreen {
  constructor(el) {
    this.el = el;
    this.albumartHandle = null;

    const html = `
    <div class="contents">
      <div class="albumart"></div>
      <div class="track-info">
        <div class="text">
          <span class="title"></span>
          <span class="artist"></span>
          <span class="album"></span>
          <div class="media-info"><img class="format-icon" /><span class="quality"></span></div>
        </div>
        <div class="controls">
          <button class="repeat"><i class="fa fa-repeat"></i></button>
          <button class="previous"><i class="fa fa-step-backward"></i></button>
          <button class="play"><i class="fa fa-play"></i></button>
          <button class="next"><i class="fa fa-step-forward"></i></button>
          <button class="random"><i class="fa fa-random"></i></button>
        </div>
        <div class="seekbar-wrapper">
          <div class="seekbar"></div>
          <span class="seek"></span><span class="duration"></span>
        </div>
      </div>
    </div>
    `;

    let screen = $(this.el);
    screen.html(html);

    util.trackTimer.attach(`${ this.el } .seekbar`);

    let self = this;
    let socket = registry.socket;
    let currentState = null;
    socket.on('pushState', state => {
      // console.log(state);

      if ( (state.title == undefined || state.title === '') &&
          (state.artist == undefined || state.artist === '') &&
          (state.album == undefined || state.album === '') ) {
        $('.track-info', screen).addClass('controls-only');
      }
      else {
        $('.track-info', screen).removeClass('controls-only');
      }

      self.refreshTrackInfo(state);
      self.refreshSeekbar(state);
      self.refreshControls(state);

      currentState = state;
    });

    $(document).ready( () => {
      $('.seekbar', screen).slider({
        orientation: 'horizontal',
        range: 'min',
        change: self.seekTo.bind(self),
        slide: self.seeking.bind(self)
      });

      let controls = $('.controls', screen);
  
      $('.repeat', controls).on('click', () => {
        if (!currentState) {
          return;
        }
        let repeat = currentState.repeat ? (currentState.repeatSingle ? false : true) : true;
        let repeatSingle = repeat && currentState.repeat;
        socket.emit('setRepeat', { value: repeat, repeatSingle });
      });
  
      $('.random', controls).on('click', () => {
        if (!currentState) {
          return;
        }
        socket.emit('setRandom', { value: !currentState.random });
      });
  
      $('.previous', controls).on('click', () => {
        socket.emit('prev');
      });
  
      $('.play', controls).on('click', () => {
        socket.emit('toggle');
      });
  
      $('.next', controls).on('click', () => {
        socket.emit('next');
      });
  
      // Calling this due to legacy Chromium on Volumio 2.x
      self.setDefaultSizes();
      $(window).on('resize', () => { // Necessary for preview
        self.setDefaultSizes();
      });
    })
  }

  static init(el) {
    return new NowPlayingScreen(el);
  }

  // UI function due to legacy Chromium on Volumio 2.x
  setDefaultSizes() {
    /**
     * Legacy Chromium on Volumio 2.x doesn't support min() css.
     * Need to use JS to find out the default dimensions for
     * - albumart img
     */
    let vw = $(window).width();
    let vh = $(window).height();
    let orientation = vw > vh ? 'landscape' : 'portrait';
    let albumartSize;

    if (orientation == 'landscape') {
      albumartSize = Math.min(0.4 * vw, 0.8 * vh) + 'px';
    }
    else {
      albumartSize = Math.min(0.4 * vh, 0.8 * vw) + 'px';
    }

    util.setCSSVariable('--default-albumart-width', albumartSize, this);
    util.setCSSVariable('--default-albumart-height', albumartSize, this);
  }

  // Functions for refreshing UI components
  refreshTrackInfo(state) {
    let screen = $(this.el);
    if (this.albumartHandle) {
      util.imageLoader.cancel(this.albumartHandle);
    }
    let albumartUrl = state.albumart;
    if (albumartUrl.startsWith('/')) {
      albumartUrl = registry.app.host + albumartUrl;
    }
    // load img into cache first to reduce flicker
    this.albumartHandle = util.imageLoader.load(albumartUrl, (src) => { 
      registry.ui.background.setImage(src);
      $('.albumart', screen).html(`<img src="${ src }"/>`);
    });

    let trackInfo = $('.track-info', screen);
    $('.title', trackInfo).text(state.title || '');
    $('.artist', trackInfo).text(state.artist || '');
    $('.album', trackInfo).text(state.album || '');

    let mediaInfo = $('.media-info', trackInfo);
    let mediaInfoText;
    if (state.trackType == 'webradio') {
      mediaInfoText = state.bitrate || '';
    }
    else {
      let mediaInfoValues = [];
      ['bitdepth', 'samplerate'].forEach( prop => {
        if (state[prop]) {
          mediaInfoValues.push(state[prop]);
        }
      });
      mediaInfoText = mediaInfoValues.join(' ');
    }
    $('.quality', mediaInfo).text(mediaInfoText);

    let mediaFormatIcon = util.getMediaFormatIcon(state.trackType);
    if (mediaFormatIcon) {
      $('.format-icon', mediaInfo).attr('src', mediaFormatIcon).show();
    }
    else {
      $('.format-icon', mediaInfo).hide();
    }
  }

  refreshSeekbar(state) {
    util.trackTimer.stop();

    let screen = $(this.el);
    let seekbarWrapper = $('.seekbar-wrapper', screen);
    if (state.duration == 0 || state.status == 'stop') {
      seekbarWrapper.css('visibility', 'hidden');
      return;
    }
    else {
      seekbarWrapper.css('visibility', 'visible');
    }

    let duration = (state.duration || 0) * 1000;
    let seek = state.seek || 0;
    let seekbar = $('.seekbar', seekbarWrapper);
    seekbar.slider('option', 'max', duration);
    seekbar.slider('option', 'value', seek);

    $('.seek', seekbarWrapper).text(util.timeToString(seek));
    $('.duration', seekbarWrapper).text(util.timeToString(duration));

    if (state.status == 'play') {
      util.trackTimer.start();
    }
  }

  refreshControls(state) {
    let screen = $(this.el);
    let controls = $('.controls', screen);
    if (state.status == 'play') {
      let i = state.duration ? 'fa fa-pause' : 'fa fa-stop';
      $('button.play', controls).html(`<i class="${i}"></i>`);
    }
    else {
      $('button.play', controls).html('<i class="fa fa-play"></i>');
    }

    let repeatEl = $('button.repeat', controls);
    if (state.repeat) {
      repeatEl.addClass('active');
      $('i', repeatEl).html(state.repeatSingle ? '1' : '');
    }
    else {
      repeatEl.removeClass('active');
      $('i', repeatEl).html('');
    }

    let randomEl = $('button.random', controls);
    if (state.random) {
      randomEl.addClass('active');
    }
    else {
      randomEl.removeClass('active');
    }
  }

  // Handle seekbar events
  seekTo(event, ui) {
    if (!event.originalEvent) { // No original event if programatically changed value
      return;
    }
    util.trackTimer.stop();
    registry.socket.emit('seek', (ui.value / 1000));
  }

  seeking(event, ui) {
    util.trackTimer.stop();

    let screen = $(this.el);
    let seek = ui.value;
    $('.seekbar-wrapper .seek', screen).text(util.timeToString(seek));
  }
}
