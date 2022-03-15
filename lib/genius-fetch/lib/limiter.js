const Bottleneck = require('bottleneck');

class Limiter {
  constructor(options = {}) {
    this._limiter = new Bottleneck(options);
    this._enabled = true;
  }

  isEnabled() {
    return this._enabled;
  }

  setEnabled(value) {
    this._enabled = value;
  }

  schedule(fn, ...args) {
    if (this.isEnabled()) {
      return this._limiter.schedule(fn, ...args);
    }
    else {
      return fn(...args);
    }  
  }

  setOptions(options) {
    this._limiter.updateSettings(options);  
  }
}

module.exports = Limiter;
