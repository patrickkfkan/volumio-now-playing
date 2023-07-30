#!/bin/bash
echo "Installing geo-tz node dependency"
cd /data/plugins/user_interface/now_playing
npm install --save geo-tz@"^7.0.1"
echo "Creating user directories (if not exist)"
mkdir -p "/data/INTERNAL/NowPlayingPlugin/Settings Backups"
mkdir -p "/data/INTERNAL/NowPlayingPlugin/My Backgrounds"
chmod -R 777 "/data/INTERNAL/NowPlayingPlugin"
echo "Now Playing plugin installed"
echo "plugininstallend"
