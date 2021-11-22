import { refresh, setCSSVariable, trackTimer, setScreenBlur } from './util.js';
import { registry } from './registry.js';

export class Background {
  constructor(el) {
    this.el = el;
  }

  static init(el) {
    return new Background(el);
  }

  setImage(src) {
    setCSSVariable('--default-background-image', `url("${ src }")`, this);
  }
}

export class ActionPanel {
  constructor({panel, trigger, swipe}) {
    this.el = panel;
    this.slideVolumeTimer = null;
    this.slideVolumeValue = 0;

    const html = `
    <div class="volume">
      <i class="fa fa-volume-off mute"></i>
      <div class="volume-slider-wrapper">       
        <div class="volume-slider"></div>
      </div>
      <i class="fa fa-volume-up max"></i>
    </div>
    <div class="actions-wrapper">
      <div class="action refresh"><i class="fa fa-refresh" title=""></i></div>
      <div class="action switch"><img src="/assets/volumio-icon.png" title=""></img></div>
    </div>
    `;

    let self = this;
    let panelEl = $(this.el);

    panelEl.html(html);
    $('.action.refresh i', panelEl).attr('title', registry.i18n['REFRESH']);
    $('.action.switch img', panelEl).attr('title', registry.i18n['SWITCH_TO_VOLUMIO']);

    // Socket events
    registry.socket.on('pushState', state => {
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
          setScreenBlur(false);
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
  
      $('.refresh', panelEl).on('click', function() {
        refresh();
      });
  
      $('.switch', panelEl).on('click', function() {
        self.switchToVolumioInterface();
      });
  
      $(trigger).on('click', () => {
        self.show();
      });
  
      $(swipe).swipe({
        swipeDown: () => {
          self.show();
        }
      });
    });
  }

  static init(data) {
    return new ActionPanel(data);
  }

  show() {
    setScreenBlur(true);
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
    registry.socket.on('pushState', state => {
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
      setCSSVariable('--volume-level', state.volume, this);
      let levelText;
      if (state.mute) {
        levelText = `<i class="fa fa-volume-off"></i>`;
        volumeIndicator.addClass('muted');
      }
      else {
        levelText = `<i class="fa fa-volume-up"></i> ${ state.volume }%`;
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
    trackTimer.stop();
  }

  hide() {
    $(this.el).removeClass('active');
  }
}