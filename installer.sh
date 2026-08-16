#!/bin/bash
set -e

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root using sudo."
  exit 1
fi

echo ""
echo "========================================="
echo "  WhatsApp Downloader Bot - Installer"
echo "========================================="
echo ""

echo "[1/7] Stopping all existing bot processes..."
pm2 kill 2>/dev/null || true
rm -rf /root/.pm2 2>/dev/null || true
rm -rf ~/.pm2 2>/dev/null || true

echo "[2/7] Cleaning old session data..."
rm -rf auth_info_baileys
rm -rf tmp
rm -rf node_modules
rm -f qr.png

echo "[3/7] Installing system dependencies..."
apt-get update -qq
apt-get install -y -qq curl ffmpeg python3 > /dev/null 2>&1
apt-get install -y -qq python-is-python3 > /dev/null 2>&1 || true

NODE_VERSION=$(node -v 2>/dev/null | cut -d'.' -f1 | tr -d 'v')
if [ -z "$NODE_VERSION" ] || [ "$NODE_VERSION" -lt 20 ]; then
  echo "[4/7] Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
  apt-get install -y -qq nodejs > /dev/null 2>&1
else
  echo "[4/7] Node.js $NODE_VERSION already installed. Skipping."
fi

echo "[5/7] Pulling latest code from GitHub..."
git reset --hard HEAD > /dev/null 2>&1 || true
git pull > /dev/null 2>&1 || true

if [ ! -f .env ]; then
  echo ""
  echo "========================================="
  echo "  First time setup"
  echo "  Use country code without + sign"
  echo "  Example: 923001234567"
  echo "========================================="
  echo ""
  read -p "Enter Admin WhatsApp Number: " admin_num
  read -p "Enter Bot WhatsApp Number (the number to link): " bot_num
  echo ""
  echo "Choose authentication method:"
  echo "  1) QR Code (scan from phone camera)"
  echo "  2) Pairing Code (type 8-digit code on phone)"
  echo ""
  read -p "Enter 1 or 2: " auth_choice
  if [ "$auth_choice" = "2" ]; then
    auth_method="code"
  else
    auth_method="qr"
  fi
  echo "ADMIN_NUMBER=$admin_num" > .env
  echo "BOT_NUMBER=$bot_num" >> .env
  echo "AUTH_METHOD=$auth_method" >> .env
  echo ""
  
  echo "========================================="
  echo "  (Optional) External Download API URL"
  echo "  If your VM is getting blocked by YouTube (HTTP 403),"
  echo "  you can host the python API on Vercel/Render"
  echo "  and paste its URL here to bypass the block."
  echo "  Example: https://my-video-api.vercel.app"
  echo "  Leave empty to download locally."
  echo "========================================="
  read -p "Enter API URL (or press Enter to skip): " api_url
  if [ -n "$api_url" ]; then
    echo "API_URL=$api_url" >> .env
  fi
  echo ""
fi

echo "[6/7] Installing node modules..."
export YOUTUBE_DL_SKIP_PYTHON_CHECK=1
npm install --production > /dev/null 2>&1
npm install -g pm2 > /dev/null 2>&1

echo "[7/7] Starting bot..."
echo ""
pm2 start index.js --name "whatsapp-bot" --restart-delay=15000 --max-restarts=5
pm2 save
pm2 startup > /dev/null 2>&1 || true

echo ""
echo "========================================="
echo "  Bot started! Showing logs below..."
echo "  Wait for your QR or PAIRING CODE."
echo "  Press Ctrl+C to exit logs (bot stays running)."
echo "========================================="
echo ""

sleep 2
pm2 logs whatsapp-bot --lines 50
