#!/bin/bash

USER_DIR="/data/INTERNAL/NowPlayingPlugin"
CONFIG_BAK_DIR="${USER_DIR}/Settings Backups"
MY_BG_DIR="${USER_DIR}/My Backgrounds"
VU_METER_TEMPLATE_DIR="${USER_DIR}/VU Meter Templates"

echo "Installing geo-tz node dependency"
cd /data/plugins/user_interface/now_playing
# Remove geo-tz from devDependencies
sed -i '/"geo-tz"/d' package.json
npm i --production --save geo-tz@"^7.0.1"

echo "Creating user directories (if not exist)"
mkdir -p "${CONFIG_BAK_DIR}"
mkdir -p "${MY_BG_DIR}"
mkdir -p "${VU_METER_TEMPLATE_DIR}"
chmod 777 "${USER_DIR}"
chmod 777 "${CONFIG_BAK_DIR}"
chmod 777 "${MY_BG_DIR}"
chmod 777 "${VU_METER_TEMPLATE_DIR}"

echo "Now Playing plugin installed"
echo "plugininstallend"
