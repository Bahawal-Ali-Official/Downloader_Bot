require('dotenv').config();
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const youtubedl = require('youtube-dl-exec');
const axios = require('axios');
const crypto = require('crypto');
const mime = require('mime-types');
const yts = require('yt-search');
const si = require('systeminformation');
const ytdl = require('@distube/ytdl-core');

const tmpDir = path.join(__dirname, 'tmp');
if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir);
}

const searchState = {};
const formatState = {};
const downloadQueue = [];
let isProcessingQueue = false;
let isBotActive = true;
const ADMIN_NUMBER = process.env.ADMIN_NUMBER ? process.env.ADMIN_NUMBER.replace('+', '').trim() : '';

function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
        '.mp4': 'video/mp4',
        '.mp3': 'audio/mpeg',
        '.m4a': 'audio/mp4',
        '.mkv': 'video/x-matroska',
        '.webm': 'video/webm',
        '.jpg': 'image/jpeg',
        '.png': 'image/png',
        '.pdf': 'application/pdf',
        '.zip': 'application/zip',
    };
    return mimeTypes[ext] || 'application/octet-stream';
}

async function downloadWithAxios(url, outputPath) {
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });
    const contentLength = response.headers['content-length'];
    if (contentLength && parseInt(contentLength) > 1024 * 1024 * 1024) {
        throw new Error('File exceeds 1GB limit.');
    }
    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

async function processDownload(task) {
    const { url, formatOption, msg, sock } = task;
    await sock.sendMessage(msg.key.remoteJid, { text: '⏳ Processing your download. Please wait.' }, { quoted: msg });
    
    const id = crypto.randomBytes(8).toString('hex');
    const outputTemplate = path.join(tmpDir, `${id}.%(ext)s`);
    const fallbackOutputPath = path.join(tmpDir, `${id}.bin`);
    const isMediaLink = /(youtube\.com|youtu\.be|instagram\.com|facebook\.com|fb\.com|twitter\.com|x\.com|tiktok\.com|reddit\.com)/i.test(url);
    const isYouTube = /(youtube\.com|youtu\.be)/i.test(url);
    
    try {
        let downloadSuccess = false;
        let ytFormat = 'best[ext=mp4]/best';
        
        if (formatOption === 1) ytFormat = 'bestaudio[ext=m4a]/bestaudio/best';
        else if (formatOption === 2) ytFormat = 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';
        else if (formatOption === 3) ytFormat = 'best[height<=720][ext=mp4]/best';
        else if (formatOption === 4) ytFormat = 'best[height<=480][ext=mp4]/best';

        if (isYouTube && (formatOption === 1 || formatOption === 3 || formatOption === 4)) {
            const ytdlFile = path.join(tmpDir, `${id}.mp4`);
            const writer = fs.createWriteStream(ytdlFile);
            try {
                let filterOpt = format => format.container === 'mp4' && format.hasAudio && format.hasVideo;
                if (formatOption === 1) filterOpt = 'audioonly';
                const stream = ytdl(url, { filter: filterOpt });
                stream.pipe(writer);
                await new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                    stream.on('error', reject);
                });
                downloadSuccess = true;
            } catch (err) {
                writer.close();
                if (fs.existsSync(ytdlFile)) fs.unlinkSync(ytdlFile);
            }
        }

        if (!downloadSuccess) {
            try {
                await youtubedl(url, {
                    noWarnings: true,
                    maxFilesize: '1G',
                    format: ytFormat,
                    noPlaylist: true,
                    output: outputTemplate,
                });
                downloadSuccess = true;
            } catch (ytError) {
                if (isMediaLink) {
                    throw new Error("Unable to download from this platform (HTTP 403 or blocked).");
                }
                await downloadWithAxios(url, fallbackOutputPath);
                downloadSuccess = true;
            }
        }

        const files = fs.readdirSync(tmpDir).filter(f => f.startsWith(id)).filter(f => fs.statSync(path.join(tmpDir, f)).size > 0);
        if (files.length === 0) {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Failed to download. File might be unsupported or exceed 1GB.' }, { quoted: msg });
            return;
        }

        const downloadedFile = path.join(tmpDir, files[0]);
        const stats = fs.statSync(downloadedFile);
        if (stats.size > 1024 * 1024 * 1024) {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ File exceeds 1GB limit.' }, { quoted: msg });
            fs.unlinkSync(downloadedFile);
            return;
        }

        await sock.sendMessage(msg.key.remoteJid, { text: '✅ Uploading to WhatsApp...' }, { quoted: msg });
        const mimeType = getMimeType(downloadedFile);
        const fileName = files[0].replace(`${id}.`, 'download.');
        await sock.sendMessage(msg.key.remoteJid, { document: { url: downloadedFile }, mimetype: mimeType, fileName: fileName }, { quoted: msg });
        fs.unlinkSync(downloadedFile);
    } catch (err) {
        await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${err.message}` }, { quoted: msg });
        const files = fs.readdirSync(tmpDir).filter(f => f.startsWith(id));
        files.forEach(f => {
            try { fs.unlinkSync(path.join(tmpDir, f)); } catch(e){}
        });
    }
}

async function processQueue() {
    if (downloadQueue.length === 0) {
        isProcessingQueue = false;
        return;
    }
    isProcessingQueue = true;
    const task = downloadQueue.shift();
    try {
        await processDownload(task);
    } catch (e) {}
    processQueue();
}

async function addToQueue(task) {
    downloadQueue.push(task);
    const pos = downloadQueue.length;
    let txt = pos === 1 ? "⏳ Request queued. You are next." : `⏳ Request queued. Position: ${pos}`;
    await task.sock.sendMessage(task.msg.key.remoteJid, { text: txt }, { quoted: task.msg });
    if (!isProcessingQueue) {
        processQueue();
    }
}

function promptFormatSelection(url, msg, sock, sender) {
    formatState[sender] = url;
    const formatText = `*Select Format:*\n\n1. 🎵 Audio (MP3/M4A)\n2. 🎬 Video 1080p\n3. 🎬 Video 720p\n4. 🎬 Video 480p\n\nReply with 1-4.`;
    sock.sendMessage(msg.key.remoteJid, { text: formatText }, { quoted: msg });
}

let isPairingRequested = false;

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ['Downloader_Bot', 'Chrome', '1.0.0']
    });

    if (!sock.authState.creds.registered && !isPairingRequested) {
        const BOT_NUMBER = process.env.BOT_NUMBER ? process.env.BOT_NUMBER.replace(/[^0-9]/g, '') : '';
        if (BOT_NUMBER) {
            isPairingRequested = true;
            setTimeout(async () => {
                try {
                    const code = await sock.requestPairingCode(BOT_NUMBER);
                    console.log(`\n\n========================================`);
                    console.log(`YOUR PAIRING CODE IS: ${code}`);
                    console.log(`========================================\n\n`);
                } catch (err) {
                    isPairingRequested = false;
                    if (String(err).includes('428')) {
                        console.error(`\n========================================`);
                        console.error(`[ERROR 428] WHATSAPP RATE LIMIT TRIGGERED`);
                        console.error(`You have requested too many codes too fast.`);
                        console.error(`Please wait 5-10 minutes, then run the installer again.`);
                        console.error(`========================================\n`);
                    } else {
                        console.error(`Failed to get code: ${err?.message || err}`);
                    }
                }
            }, 3000);
        } else {
            console.error("BOT_NUMBER is not defined in .env. Cannot request pairing code.");
        }
    }

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('Bot is ready and connected!');
        }
    });
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const text = msg.message.conversation || (msg.message.extendedTextMessage && msg.message.extendedTextMessage.text) || '';
        const sender = msg.key.participant || msg.key.remoteJid;
        const senderNumber = sender.split('@')[0];
        const isAdmin = senderNumber === ADMIN_NUMBER;

        if (text === '/stop' && isAdmin) {
            isBotActive = false;
            await sock.sendMessage(msg.key.remoteJid, { text: '🛑 Bot stopped.' }, { quoted: msg });
            return;
        }
        if (text === '/start' && isAdmin) {
            isBotActive = true;
            await sock.sendMessage(msg.key.remoteJid, { text: '✅ Bot started.' }, { quoted: msg });
            return;
        }
        if (!isBotActive && !isAdmin) return;

        if (text.startsWith('/download ')) {
            const url = text.split(' ')[1];
            if (!url || !isValidUrl(url)) {
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ Invalid URL. Usage: /download <link>' }, { quoted: msg });
                return;
            }
            promptFormatSelection(url, msg, sock, sender);
        } else if (text.startsWith('/ytsearch ')) {
            const query = text.replace('/ytsearch ', '').trim();
            if (!query) {
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ Missing query. Usage: /ytsearch <query>' }, { quoted: msg });
                return;
            }
            await sock.sendMessage(msg.key.remoteJid, { text: `🔍 Searching...` }, { quoted: msg });
            try {
                const r = await yts(query);
                const videos = r.videos.slice(0, 5);
                if (videos.length === 0) {
                    await sock.sendMessage(msg.key.remoteJid, { text: '❌ No results found.' }, { quoted: msg });
                    return;
                }
                searchState[sender] = videos.map(v => v.url);
                let replyText = `*Search Results:*\n\n`;
                videos.forEach((v, i) => { replyText += `*${i + 1}.* ${v.title} (${v.timestamp})\n`; });
                replyText += `\nReply with 1-5 to select.`;
                await sock.sendMessage(msg.key.remoteJid, { text: replyText }, { quoted: msg });
            } catch (err) {
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ Search error.' }, { quoted: msg });
            }
        } else if (text === '/help') {
            const helpText = `*Help*\n\n*/download <link>* - Download media\n*/ytsearch <query>* - Search YouTube\n*/health* - Server status\n*/help* - Show help`;
            await sock.sendMessage(msg.key.remoteJid, { text: helpText }, { quoted: msg });
        } else if (text === '/health') {
            try {
                const mem = await si.mem();
                const load = await si.currentLoad();
                const totalRam = (mem.total + mem.swaptotal) / (1024 ** 3);
                const freeRam = (mem.free + mem.swapfree) / (1024 ** 3);
                const cpuUsage = load.currentLoad.toFixed(2);
                const healthText = `*Status*\n\n*CPU:* ${cpuUsage}%\n*RAM:* ${totalRam.toFixed(2)} GB\n*Free RAM:* ${freeRam.toFixed(2)} GB\n*Queue:* ${downloadQueue.length}`;
                await sock.sendMessage(msg.key.remoteJid, { text: healthText }, { quoted: msg });
            } catch (err) {
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ Error fetching status.' }, { quoted: msg });
            }
        } else {
            const numberMatch = text.match(/^[1-5]$/);
            if (numberMatch) {
                const selection = parseInt(numberMatch[0]);
                if (formatState[sender] && selection >= 1 && selection <= 4) {
                    const urlToDownload = formatState[sender];
                    delete formatState[sender];
                    addToQueue({ url: urlToDownload, formatOption: selection, msg: msg, sock: sock });
                } else if (searchState[sender]) {
                    const index = selection - 1;
                    const selectedUrl = searchState[sender][index];
                    if (selectedUrl) {
                        delete searchState[sender];
                        promptFormatSelection(selectedUrl, msg, sock, sender);
                    }
                }
            }
        }
    });
}

startBot();
