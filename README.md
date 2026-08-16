# WhatsApp Downloader Bot (v2.0)

A powerful WhatsApp bot capable of downloading media from various platforms (YouTube, Instagram, Facebook, etc.) and searching YouTube directly from WhatsApp.

## Features
- **Platform Support:** Downloads from YouTube, Instagram, Facebook, Twitter/X, TikTok, Reddit, and direct URLs.
- **Format Selection:** Choose between Audio, 1080p, 720p, or 480p formats before downloading.
- **Queue System:** Sequential downloading prevents server crashes and memory overloads on small VMs.
- **Admin Controls:** Stop and start the bot globally via admin-only commands.
- **Security:** Built-in URL validation and auto-cleanup of temporary/failed files.

## Deployment with Docker (Single Command Setup)

The bot is fully containerized. You do not need to install Node.js, Python, or FFmpeg on your host machine. Everything runs securely inside the container.

### 1. Clone the Repository
```bash
git clone <your-repo-link>
cd Downloader_Bot
```

### 2. Setup Environment Variables
Create a `.env` file and set your Admin WhatsApp number. Do not use the '+' sign.
```bash
cp .env.example .env
nano .env 
```

### 3. Deploy the Bot
Start the bot using Docker Compose. This single command will build the image, install all requirements internally, and start the bot in the background.
```bash
docker-compose up -d --build
```

### 4. Scan the QR Code
To connect the bot to your WhatsApp, you need to scan the QR code. View the live container logs to see the QR code:
```bash
docker-compose logs -f
```
Scan the QR code using your phone (WhatsApp -> Linked Devices -> Link a Device). 

Press `Ctrl+C` to exit the logs. The bot will continue running in the background automatically 24/7.

## Available Commands
- `/download <link>` - Send a supported link to download.
- `/ytsearch <song/video name>` - Search YouTube and get top 5 results.
- `/health` - Check bot server RAM, CPU status, and queue length.
- `/help` - View the help message.
- `/stop` - Admin only. Stops accepting new requests.
- `/start` - Admin only. Resumes bot operations.
