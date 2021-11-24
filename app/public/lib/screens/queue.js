import * as util from './../util.js';
import { registry } from './../registry.js';

export class QueueScreen {
  constructor(el) {
    this.el = el;

    const html = `
      <div class="contents">
        <div class="header">
          <div class="actions">
            <button class="action clear"><i class="fa fa-trash-o"></i></button>
            <button class="action close"><i class="fa fa-times-circle"></i></button>
          </div>
        </div>
        <div class="items">
        </div>
      </div>
    `;

    let screen = $(this.el);
    screen.html(html);
    screen.data('screenName', this.getScreenName());

    let self = this;
    let socket = registry.socket;
    socket.on("pushQueue", (data) => {
      self.setItems(data);

      // TODO: move to current position
    });

    $('.items', screen).on('click', '.item', function() {
      socket.emit('play', { value: $(this).data('position') });
    });

    $('.items', screen).on('click', 'button.remove', function() {
      let item = $(this).parents('.item');
      socket.emit('removeFromQueue', { value: item.data('position') });
    });

    $('.action.clear', screen).on('click', function() {
      socket.emit('clearQueue');
    })

    $('.action.close', screen).on('click', function() {
      util.setActiveScreen(registry.screens.nowPlaying);
    })
    
  }

  static init(el) {
    return new QueueScreen(el);
  }

  getScreenName() {
    return 'queue';
  }

  getDefaultShowEffect() {
    return 'slideDown';
  }

  usesTrackBar() {
    return true;
  }

  setItems(data) {
    let self = this;
    let screen = $(self.el);
    let itemList = $(".items", screen);
    itemList.html("");
    data.forEach( (track, index) => {
      let item = self.createItem(track);
      item.data('position', index);
      itemList.append(item);
    });
  }

  createItem(data) {
    let fallbackImgSrc = registry.app.host + '/albumart';
    let fallbackImgJS = `onerror="if (this.src != '${ fallbackImgSrc }') this.src = '${ fallbackImgSrc }';"`;
    let itemHtml = `
        <div class="item">
            <div class="albumart"><img src="" ${ fallbackImgJS } /></div>
            <div class="track-info">
                <span class="title"></span>
                <span class="artist-album"></span>
            </div>
            <div class="actions">
                <button class="remove"><i class="fa fa-times"></i></button>
            </div>
        </div>
      `;

    let item = $(itemHtml);

    $('.albumart img', item).attr('src', data.albumart);

    let trackInfo = $(".track-info", item);
    $('.title', trackInfo).text(data.title);

    let artistAlbum = data.artist || "";
    if (data.album) {
      artistAlbum += artistAlbum ? " - " : "";
      artistAlbum += data.album;
    }
    $('.artist-album', trackInfo).text(artistAlbum);

    return item;
  }
}
