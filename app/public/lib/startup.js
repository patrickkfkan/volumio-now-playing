import * as Components from './components.js';
import { State } from './state.js';
import { NowPlayingScreen } from './screens/np.js';
import { QueueScreen } from './screens/queue.js';
import { refresh } from './util.js';
import { registry } from './registry.js';

export function init(data) {
  registry.app = Object.assign({}, data.app);
  registry.socket = getSocket();
  registry.i18n = data.i18n || {};
  registry.state = State.init();
  if (data.ui) {
    registry.ui = {};
    registry.ui.background = Components.Background.init(data.ui.background);
    registry.ui.actionPanel = Components.ActionPanel.init(data.ui.actionPanel);
    registry.ui.volumeIndicator = Components.VolumeIndicator.init(data.ui.volumeIndicator);
    registry.ui.disconnectIndicator = Components.DisconnectIndicator.init(data.ui.disconnectIndicator);
    registry.ui.trackBar = Components.TrackBar.init(data.ui.trackBar);
  }
  if (data.screens) {
    registry.screens = {};
    registry.screens.nowPlaying = NowPlayingScreen.init(data.screens.nowPlaying);
    registry.screens.queue = QueueScreen.init(data.screens.queue);

    $(window).on('resize', () => {
      // Resize active screen that has the trackbar showing
      let trackBar = $(registry.ui.trackBar.el);
      if (trackBar.is(':visible')) {
        let screen = $('#screen-wrapper .screen.active');
        let trackBarHeight = trackBar.css('height');
        screen.css('height', `calc(100% - ${ trackBarHeight }`);
      }
    });
  }
}

let _socket;
function getSocket() {
  if (!_socket) {
    _socket = io.connect(registry.app.host, { autoConnect: false });

    _socket.on("nowPlayingPluginInfo", (info) => {
      if (`${info.appPort}` !== registry.app.port) {
        let href = window.location.href.replace(
          `:${ registry.app.port }`,
          `:${ info.appPort }`
        );
        window.location.href = href;
      } else if (info.pluginVersion !== registry.app.version) {
        refresh();
      }
    });

    _socket.on('connect', () => {
      _socket.emit('getState');
      _socket.emit('getQueue');
    });

    _socket.on('reconnect', () => {
      _socket.emit('getState');
      _socket.emit('getQueue');
    });

    _socket.on("reconnect", () => {
      _socket.emit("callMethod", {
        endpoint: "user_interface/now_playing",
        method: "broadcastPluginInfo",
      });
    });

    _socket.on("nowPlayingRefresh", () => {
      refresh();
    });
  }

  return _socket;
}
