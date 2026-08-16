# WhatsApp Downloader Bot (v2.0)

A powerful WhatsApp bot capable of downloading media from various platforms (YouTube, Instagram, Facebook, etc.) and searching YouTube directly from WhatsApp.

## Features
- **Platform Support:** Downloads from YouTube, Instagram, Facebook, Twitter/X, TikTok, Reddit, and direct URLs.
- **Format Selection:** Choose between Audio, 1080p, 720p, or 480p formats before downloading.
- **Queue System:** Sequential downloading prevents server crashes and memory overloads on small VMs.
- **Admin Controls:** Stop and start the bot globally via admin-only commands.
- **Security:** Built-in URL validation and auto-cleanup of temporary/failed files.

## Deployment on Oracle VM (Ubuntu/Linux)

Follow these steps to deploy the bot on your Virtual Machine:

### 1. Clone the Repository
```bash
git clone <your-repo-link>
cd Downloader_Bot
```

### 2. Setup Environment Variables
Create a `.env` file from the example and set your Admin WhatsApp number.
```bash
cp .env.example .env
nano .env 
# Add your number like this: ADMIN_NUMBER=92300000000 (No '+' sign)
```

### 3. Install Node Dependencies
```bash
npm install
```

### 4. Install FFmpeg (Important!)
FFmpeg is required for the bot to properly merge high-quality video (1080p) and audio formats.
```bash
sudo apt update
sudo apt install ffmpeg -y
```

### 5. Start and Connect the Bot
Start the bot for the first time to generate the QR code:
```bash
npm start
```
A QR code will appear in the terminal. Open WhatsApp on your phone -> Linked Devices -> Link a Device, and scan the QR code. The session will be saved locally.

### 6. Run in Background (24/7)
To keep the bot running indefinitely even after you close your SSH terminal, install and use `pm2`:
```bash
sudo npm install -g pm2
pm2 start index.js --name "whatsapp-bot"
pm2 save
pm2 startup
```

## Available Commands
- `/download <link>` - Send a supported link to download.
- `/ytsearch <song/video name>` - Search YouTube and get top 5 results.
- `/health` - Check bot server RAM, CPU status, and queue length.
- `/help` - View the help message.
- `/stop` - *(Admin only)* Stops accepting new requests.
- `/start` - *(Admin only)* Resumes bot operations.
