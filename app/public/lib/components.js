import * as util from './util.js';
import { registry } from './registry.js';

export class Background {
  constructor(el) {
    this.el = el;
  }

  static init(el) {
    return new Background(el);
  }

  setImage(src) {
    util.setCSSVariable('--default-background-image', `url("${ src }")`, this);
  }
}

export class ActionPanel {
  constructor(panel) {
    this.el = panel;
    this.slideVolumeTimer = null;
    this.slideVolumeValue = 0;

    const html = `
    <div class="volume">
      <span class="material-icons mute">volume_mute</span>
      <div class="volume-slider-wrapper">       
        <div class="volume-slider"></div>
      </div>
      <span class="material-icons max">volume_up</span>
    </div>
    <div class="actions-wrapper">
      <div class="screen-switcher">
        <div class="label-wrapper">
          <div class="label"><span class="material-icons">tv</span></div>
        </div>
        <div class="switches-wrapper">
          <div class="switch" data-screen="browseMusic"><span class="material-icons">library_music</span></div>
          <div class="switch" data-screen="nowPlaying"><span class="material-icons">art_track</span></div>
          <div class="switch" data-screen="queue"><span class="material-icons">queue_music</span></div>
        </div>
      </div>
      <div class="extra-switches-wrapper">
        <div class="action refresh"><span class="material-icons">refresh</span></div>
        <div class="action switch"><img src="/assets/volumio-icon.png" title=""></img></div>
      </div>
    </div>
    `;

    let self = this;
    let panelEl = $(this.el);

    panelEl.html(html);
    $('.action.refresh i', panelEl).attr('title', registry.i18n['REFRESH']);
    $('.action.switch img', panelEl).attr('title', registry.i18n['SWITCH_TO_VOLUMIO']);

    // Socket events
    registry.state.on('stateChanged', state => {
      self.updateVolumeSlider(state);
    });
    
    $(document).ready( () => {
      panelEl.dialog({
        classes: {
          "ui-dialog": "action-panel-container",
        },
        autoOpen: false,
        width: "80%",
        modal: true,
        resizable: false,
        draggable: false,
        position: {
          my: "center top",
          at: "center top",
        },
        show: {
          effect: "drop",
          direction: "up",
          duration: 100,
        },
        hide: {
          effect: "drop",
          direction: "up",
          duration: 100,
        },
        open: () => {
          // close popup when tapped outside
          $(".ui-widget-overlay").on("click", () => {
            self.hide();
          });
        },
        beforeClose: () => {
          util.setScreenBlur(false);
        },
      });
  
      $('.volume-slider', panelEl).slider({
        orientation: 'horizontal',
        range: 'min',
        min: 0,
        max: 100,
        start: self.beginSlideVolume.bind(self),
        stop: self.endSlideVolume.bind(self),
        change: self.setVolume.bind(self),
        slide: self.slideVolume.bind(self)
      });
  
      $('.max', panelEl).on('click', () => {
        registry.socket.emit('volume', 100);
      });
  
      $('.mute', panelEl).on('click', function() {
        if ($(this).hasClass('active')) {
          registry.socket.emit('unmute');
        }
        else {
          registry.socket.emit('mute');
        }
      });
  
      $('.action.refresh', panelEl).on('click', function() {
        util.refresh();
      });
  
      $('.action.switch', panelEl).on('click', function() {
        self.switchToVolumioInterface();
      });

      $('.screen-switcher .switch', panelEl).on('click', function() {
        self.hide();
        let screen = $(this).data('screen');
        let screenOpts = {};
        if (screen === 'queue') {
          screenOpts.keepCurrentOpen = true;
          screenOpts.showEffect = 'slideUp';
        }
        registry.screens.manager.switch(registry.screens[screen], screenOpts);
      });

      registry.screens.manager.on('screenChanged', (current, previous) => {
        $('.screen-switcher .switch.active', panelEl).removeClass('active');
        $(`.screen-switcher .switch[data-screen="${ current.getScreenName() }"]`, panelEl).addClass('active');
      })
    });
  }

  static init(data) {
    return new ActionPanel(data);
  }

  show() {
    util.setScreenBlur(true);
    $(this.el).dialog("open");
  }

  hide() {
    if (this.isOpen()) {
      $(this.el).dialog("close");
    }
  }

  isOpen() {
    return $(this.el).dialog("isOpen");
  }

  switchToVolumioInterface() {
    window.location.href = '/volumio';
  }

  updateVolumeSlider(state) {
    let panelEl = $(this.el);
    let volumeSlider = $('.volume-slider', panelEl);
    if (!volumeSlider.data('sliding')) {
      volumeSlider.slider('option', 'value', state.volume);
    }
    if (state.disableVolumeControl) {
      $('.volume', panelEl).addClass('disabled');
    }
    else {
      $('.volume', panelEl).removeClass('disabled');
    }
    if (state.mute) {
      $('.mute', panelEl).addClass('active');
      $('.volume-slider', panelEl).addClass('muted');
    }
    else {
      $('.mute', panelEl).removeClass('active');
      $('.volume-slider', panelEl).removeClass('muted');
    }
  }

  setVolume(event, ui) {
    if (!event.originalEvent) { // No original event if programatically changed value
      return;
    }
    registry.socket.emit('volume', (ui.value));
  }
  
  slideVolume(event, ui) {
    this.slideVolumeValue = ui.value;
  }

  beginSlideVolume(event, ui) {
    if (this.slideVolumeTimer) {
      clearInterval(this.slideVolumeTimer);
    }
    this.slideVolumeValue = ui.value;
    this.slideVolumeTimer = setInterval(() => {
      registry.socket.emit('volume', this.slideVolumeValue);
    }, 300);
    let panelEl = $(this.el);
    $('.volume-slider', panelEl).data('sliding', true);
  }

  endSlideVolume(event, ui) {
    if (this.slideVolumeTimer) {
      clearInterval(this.slideVolumeTimer);
    }
    let panelEl = $(this.el);
    $('.volume-slider', panelEl).data('sliding', false);
  }
}

export class VolumeIndicator {

  constructor(el) {
    this.el = el;
    this.oldVolume = null;
    this.autohideTimer = null;

    const html = `
    <div class="circle-wrapper">
      <svg>
        <circle class="primary" cx="50%" cy="50%" r="3.5em"></circle>
        <circle class="highlight" cx="50%" cy="50%" r="3.5em" pathLength="100"></circle>
      </svg>
    </div>
    <div class="level-text"></div>
    `;
    
    let self = this;
    let _el = $(self.el);
    _el.html(html);
    
    // Socket events
    registry.state.on('stateChanged', state => {
      self.update(state);
    });

    $(document).ready( () => {
      _el.on('click', function() {
        self.hide();
      });
    });
  }

  static init(el) {
    return new VolumeIndicator(el);
  }

  update(state) {
    if (registry.ui.actionPanel.isOpen()) {
      return;
    }
    let oldVolume = this.oldVolume;
    let volumeChanged = oldVolume ? (oldVolume.level !== state.volume || oldVolume.mute !== state.mute) : true;
    if (volumeChanged) {
      let volumeIndicator = $(this.el);
      util.setCSSVariable('--volume-level', state.volume + 'px', this);
      let levelText;
      if (state.mute) {
        levelText = `<span class="material-icons">volume_off</span>`;
        volumeIndicator.addClass('muted');
      }
      else {
        levelText = `<span class="material-icons">volume_up</span> ${ state.volume }%`;
        volumeIndicator.removeClass('muted');
      }
      $('.level-text', volumeIndicator).html(levelText);
      if (oldVolume) {
        this.show();
      }
      this.oldVolume = {
        level: state.volume,
        mute: state.mute
      };
    }
  }

  show() {
    let self = this;
    if (self.autohideTimer) {
      clearTimeout(self.autohideTimer);
      self.autohideTimer = null;
    }
    else {
      $(self.el).fadeIn(200);
    }
    self.autohideTimer = setTimeout( () => {
      self.hide();
    }, 1500);
  }

  hide(duration = 200) {
    if (this.autohideTimer) {
      clearTimeout(this.autohideTimer);
      this.autohideTimer = null;
    }
    $(this.el).fadeOut(duration);
  }
}

export class DisconnectIndicator {
  constructor(el) {
    this.el = el;

    const html = `
    <i class="fa fa-spinner fa-spin"></i>
    `;

    $(this.el).html(html);

    let self = this;
    let socket = registry.socket;
    socket.on('connect', () => {
      self.hide();
    }); 

    socket.on('disconnect', () => {
      self.show();
    }); 
  }

  static init(el) {
    return new DisconnectIndicator(el);
  }

  show() {
    registry.ui.actionPanel.hide();
    $(this.el).addClass('active');
    util.trackTimer.stop();
  }

  hide() {
    $(this.el).removeClass('active');
  }
}

export class TrackBar {
  constructor(el) {
    this.el = el;
    this.albumartHandle = null;

    const html = `
    <div class="seekbar-wrapper">
      <div class="seekbar"></div>
    </div>
    <div class="main">
      <div class="albumart"></div>
      <div class="track-info">
        <span class="title"></span>
        <span class="artist-album"></span>
        <div class="media-info"><img class="format-icon" /><span class="quality"></span></div>     
      </div>
      <div class="controls">
        <!--<button class="repeat"><i class="fa fa-repeat"></i></button>-->
        <button class="queue"><span class="material-icons">queue_music</span></button>
        <button class="previous"><span class="material-icons">skip_previous</span></button>
        <button class="play"><span class="material-icons">play</span></button>
        <button class="next"><span class="material-icons">skip_next</span></button>
        <!--<button class="random"><i class="fa fa-random"></i></button>-->
      </div>
    </div>
    `;

    let trackBar = $(this.el);
    trackBar.html(html);

    util.trackTimer.attach(`${ this.el } .seekbar`);

    let self = this;
    let socket = registry.socket;
    registry.state.on('stateChanged', state => {
      if ( (state.title == undefined || state.title === '') &&
          (state.artist == undefined || state.artist === '') &&
          (state.album == undefined || state.album === '') ) {
        $('.track-info', trackBar).hide();
      }
      else {
        $('.track-info', trackBar).show();
      }

      self.refreshTrackInfo(state);
      self.refreshSeekbar(state);
      self.refreshControls(state);
    });

    $(document).ready( () => {
      $('.seekbar', trackBar).slider({
        orientation: 'horizontal',
        range: 'min',
        change: self.seekTo.bind(self),
        slide: self.seeking.bind(self)
      });

      $('.albumart, .title, .artist-album', trackBar).on('click', () => {
        registry.screens.manager.switch(registry.screens.nowPlaying);
      })

      let controls = $('.controls', trackBar);
  
/*      $('.repeat', controls).on('click', () => {
        let state = registry.state.get();
        if (state == null) {
          return;
        }
        let repeat = state.repeat ? (state.repeatSingle ? false : true) : true;
        let repeatSingle = repeat && state.repeat;
        socket.emit('setRepeat', { value: repeat, repeatSingle });
      });
  
      $('.random', controls).on('click', () => {
        let state = registry.state.get();
        if (state == null) {
          return;
        }
        socket.emit('setRandom', { value: !state.random });
      });*/

      $('.queue', controls).on('click', function() {
        if (!$(this).hasClass('active')) {
          registry.screens.manager.switch(registry.screens.queue, {
            showEffect: 'slideUp',
            keepCurrentOpen: true
          });
        }
        else {
          registry.screens.manager.closeCurrent();
        }
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

      registry.screens.manager.on('screenChanged', (current, previous) => {
        if (current.getScreenName() === 'queue') {
          $('.queue', controls).addClass('active');
        }
        else {
          $('.queue', controls).removeClass('active');
        }
      })

      trackBar.swipe({
        swipeUp: () => {
          registry.screens.manager.switch(registry.screens.queue, {
            showEffect: 'slideUp',
            keepCurrentOpen: true
          });
        }
      })
    })
  }

  static init(el) {
    return new TrackBar(el);
  }

  refreshTrackInfo(state) {
    let trackBar = $(this.el);
    if (this.albumartHandle) {
      util.imageLoader.cancel(this.albumartHandle);
    }
    let albumartUrl = state.albumart;
    if (albumartUrl.startsWith('/')) {
      albumartUrl = registry.app.host + albumartUrl;
    }
    // load img into cache first to reduce flicker
    this.albumartHandle = util.imageLoader.load(albumartUrl, (src) => { 
      $('.albumart', trackBar).html(`<img src="${ src }"/>`);
    });

    let trackInfo = $('.track-info', trackBar);
    $('.title', trackInfo).text(state.title || '');

    let artistAlbum = state.artist || '';
    if (state.album) {
      artistAlbum += artistAlbum ? ' - ' : '';
      artistAlbum += state.album;
    }
    $('.artist-album', trackInfo).text(artistAlbum);

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

    let trackBar = $(this.el);
    let seekbarWrapper = $('.seekbar-wrapper', trackBar);
    if (state.duration == 0 || state.status == 'stop') {
      seekbarWrapper.css('visibility', 'hidden');
      trackBar.addClass('seekbar-hidden');
      return;
    }
    else {
      seekbarWrapper.css('visibility', 'visible');
      trackBar.removeClass('seekbar-hidden');
    }

    let duration = (state.duration || 0) * 1000;
    let seek = state.seek || 0;
    let seekbar = $('.seekbar', seekbarWrapper);
    seekbar.slider('option', 'max', duration);
    seekbar.slider('option', 'value', seek);

    if (state.status == 'play') {
      util.trackTimer.start();
    }
  }

  refreshControls(state) {
    let trackBar = $(this.el);
    let controls = $('.controls', trackBar);
    let icon = 'play_arrow';
    if (state.status == 'play') {
      icon = state.duration ? 'pause' : 'stop';
    }
    $('button.play span', controls).html(icon);

/*
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
    }*/
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
  }

  show() {
    $(this.el).show('slide', { direction: 'down' }, 100);
  }

  hide() {
    $(this.el).hide('slide', { direction: 'down' }, 100);
  }
}
