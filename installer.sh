#!/bin/bash
set -e

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root using sudo."
  exit
fi

apt-get update
apt-get install -y curl ffmpeg python3 python-is-python3

if ! command -v node > /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

if ! command -v pm2 > /dev/null; then
  npm install -g pm2
fi

if [ ! -f .env ]; then
  read -p "Enter Admin WhatsApp Number (e.g. 923001234567): " admin_num
  read -p "Enter Bot WhatsApp Number (e.g. 923001234567): " bot_num
  echo "ADMIN_NUMBER=$admin_num" > .env
  echo "BOT_NUMBER=$bot_num" >> .env
fi

export YOUTUBE_DL_SKIP_PYTHON_CHECK=1
npm install

pm2 delete whatsapp-bot || true
pm2 start index.js --name "whatsapp-bot"
pm2 save
pm2 startup

pm2 logs whatsapp-bot
