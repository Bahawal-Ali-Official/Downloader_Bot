# WhatsApp Downloader Bot (v2.0)

A powerful WhatsApp bot capable of downloading media from various platforms (YouTube, Instagram, Facebook, etc.) and searching YouTube directly from WhatsApp.

## Features
- **Platform Support:** Downloads from YouTube, Instagram, Facebook, Twitter/X, TikTok, Reddit, and direct URLs.
- **Format Selection:** Choose between Audio, 1080p, 720p, or 480p formats before downloading.
- **Queue System:** Sequential downloading prevents server crashes and memory overloads on small VMs.
- **Admin Controls:** Stop and start the bot globally via admin-only commands.
- **Security:** Built-in URL validation and auto-cleanup of temporary/failed files.

## Automated Deployment (Oracle VM / Ubuntu / Debian)

The bot comes with a smart auto-installer script that handles everything automatically. It will install all system dependencies (Node.js, Python, FFmpeg), configure your environment variables, bypass errors, and start the bot permanently in the background.

### 1. Clone the Repository
```bash
git clone <your-repo-link>
cd Downloader_Bot
```

### 2. Run the Auto-Installer
Execute the script as the root user.
```bash
sudo bash installer.sh
```

During the installation, the script will prompt you in the terminal to enter your Admin WhatsApp number and the Bot's WhatsApp number. Type them and press Enter.

### 3. Connect the Bot
Once the installer finishes, it will automatically open the logs. You will see an 8-character Pairing Code printed on the screen.

Open WhatsApp on your phone -> Linked Devices -> Link a Device -> Tap "Link with phone number instead" -> Enter the 8-character code.

Press `Ctrl+C` to exit the logs. The bot is managed by `pm2` and will run continuously 24/7, even if your VM reboots.

## Available Commands
- `/download <link>` - Send a supported link to download.
- `/ytsearch <song/video name>` - Search YouTube and get top 5 results.
- `/health` - Check bot server RAM, CPU status, and queue length.
- `/help` - View the help message.
- `/stop` - Admin only. Stops accepting new requests.
- `/start` - Admin only. Resumes bot operations.
