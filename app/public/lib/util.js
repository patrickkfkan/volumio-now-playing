import { registry } from './registry.js';

// Util functions / class
export function timeToString(ms) {
  let mm = Math.trunc(ms / 1000 / 60);
  let ss = `${Math.trunc((ms / 1000) % 60)}`;
  if (ss.length == 1) {
    ss = '0' + ss;
  }
  return `${mm}:${ss}`;
}

// Track timer for incrementing seekbar position at 1s interval
class TrackTimer {
  constructor() {
    this.trackTimer = null;
    this.trackTimerSliders = [];
  }

  attach(slider) {
    if (!this.trackTimerSliders.includes(slider)) {
      this.trackTimerSliders.push(slider);
    }
  }

  start() {
    if (this.trackTimer) {
      return;
    }
    else {
      this.trackTimer = setInterval(() => {
        if (this.trackTimerSliders.length > 0) {
          $(this.trackTimerSliders.join(',')).each( (index, el) => {
            el = $(el);
            let seek = el.slider('option', 'value') + 1000;
            el.siblings('.seek').text(timeToString(seek));
            el.slider('option', 'value', seek);
          })
        }
      }, 1000);
    }
  }

  stop() {
    if (this.trackTimer) {
      clearInterval(this.trackTimer);
      this.trackTimer = null;
    }
  }
}

class ImageLoader {
  constructor() {
    this.handles = {};
    this.handleCount = 0;
  }

  load(src, onload, onerror, fallback = true, handle) {
    this.handleCount++;
    if (!handle) {
      handle = {
        id: 'il' + this.handleCount
      };
    }
    this.handles[handle.id] = handle;
    let img = new Image();
    img.onload = () => {
      if (!this.isCancelled(handle)) {
        delete this.handles[handle.id];
        if (onload) {
          onload(src);
        }
      }
    }
    img.onerror = () => {
      if (!this.isCancelled(handle)) {
        if (fallback) {
          this.load(registry.app.host + '/albumart', onload, onerror, false, handle);
        }
        else {
          delete this.handles[handle.id];
          if (onerror) {
            onerror(src);
          }
        }
      }
    }
    img.src = src;

    return handle;
  }

  cancel(handle) {'<%- host %>'
    delete this.handles[handle.id];
  }

  isCancelled(handle) {
    return this.handles[handle.id] ? false : true;
  }
}

export function getMediaFormatIcon(trackType) {
  if (!trackType) {
    return null;
  }
  let url;
  switch (trackType) {
    case 'dff':
    case 'dsf':
      url = 'dsd';
      break;
    case 'ogg':
    case 'oga':
      url = 'ogg';
      break;
    case 'wv':
      url = 'wavpack'
      break;
    case 'aac':
    case 'aiff':
    case 'alac':
    case 'dsd':
    case 'dts':
    case 'flac':
    case 'm4a':
    case 'mp3':
    case 'mp4':
    case 'opus':
    case 'spotify':
    case 'wav':
    case 'wawpack':
    case 'airplay':
    case 'YouTube':
    case 'rr':
    case 'bt':
    case 'cd':
    case 'tidal':
    case 'qobuz':
    case 'mg':
    case 'mb':
    case 'wma':
    case 'qobuz':
    case 'tidal':
      url = trackType
      break;
    default:
      url = null;
  }
  if (url) {
    return `${ registry.app.host }/app/assets-common/format-icons/${ url }.svg`;
  }
  else {
    return null;
  }
}

export function setCSSVariable(varName, value, target = 'root') {
  let style = target === 'root' ? document.documentElement.style : $(target.el).prop('style');
  if (style) {
    style.setProperty(varName, value);
  }
}

export function refresh() {
  window.location.reload();
}

export function setScreenBlur(blur = true) {
  if (blur) {
    $("#screen-wrapper").addClass("blur");
  }
  else {
    $("#screen-wrapper").removeClass("blur");
  }
}

export let trackTimer = new TrackTimer();
export let imageLoader = new ImageLoader();
