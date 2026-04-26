const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    jidNormalizedUser,
    getContentType,
    fetchLatestBaileysVersion,
    Browsers
} = require('@whiskeysockets/baileys')

const l = console.log
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson } = require('./lib/functions')
const fs = require('fs')
const P = require('pino')
const config = require('./config')
const qrcode = require('qrcode-terminal')
const util = require('util')
const { sms, downloadMediaMessage } = require('./lib/msg')
const axios = require('axios')
const { File } = require('megajs')
const prefix = config.PREFIX

const ownerNumber = ['94703457206', '94740137623']

// Express Setup for Hosting
const express = require("express");
const app = express();
const port = process.env.PORT || 8000;

app.get("/", (req, res) => {
    res.send("HASHAN-MD Multi-Session Server Active ✅");
});
app.listen(port, () => console.log(`Server listening on port ${port}`));

// =================== MULTI-SESSION LOGIC ============================

async function startAllBots() {
    // config.js එකේ අපි හදපු SESSION_IDS array එක හරහා ලූප් එකක් දුවවනවා
    for (let i = 0; i < config.SESSION_IDS.length; i++) {
        const sessdata = config.SESSION_IDS[i];
        const sessionNum = i + 1;
        const sessionPath = `./auth_info_baileys/temp_${sessionNum}`;

        if (!sessdata) continue;

        console.log(`[Session ${sessionNum}] Preparing connection...`);

        // 1. Session Folder එක නැත්නම් හදනවා
        if (!fs.existsSync(sessionPath)) {
            fs.mkdirSync(sessionPath, { recursive: true });
        }

        // 2. creds.json එක බානවා (Mega එකෙන්)
        if (!fs.existsSync(sessionPath + '/creds.json')) {
            console.log(`[Session ${sessionNum}] Downloading creds from Mega...`);
            try {
                const filer = File.fromURL(`https://mega.nz/file/${sessdata}`);
                const data = await new Promise((resolve, reject) => {
                    filer.download((err, data) => {
                        if (err) reject(err);
                        else resolve(data);
                    });
                });
                fs.writeFileSync(sessionPath + '/creds.json', data);
                console.log(`[Session ${sessionNum}] Session downloaded ✅`);
            } catch (e) {
                console.log(`[Session ${sessionNum}] Download Error: `, e.message);
                continue; // මේ සෙෂන් එකේ අවුලක් නම් ඊළඟ එකට යනවා
            }
        }

        // 3. Bot එක Connect කරනවා
        await connectToWA(sessdata, sessionPath, sessionNum);
        
        // සර්වර් එකට ලෝඩ් එක වැඩි නොවෙන්න පොඩි විවේකයක්
        await sleep(5000); 
    }
}

async function connectToWA(sessionId, sessionPath, sessionNum) {
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    var { version } = await fetchLatestBaileysVersion();

    const conn = makeWASocket({
        logger: P({ level: 'silent' }),
        printQRInTerminal: false,
        browser: Browsers.macOS("Firefox"),
        syncFullHistory: true,
        auth: state,
        version
    });

    conn.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            if (lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut) {
                connectToWA(sessionId, sessionPath, sessionNum);
            }
        } else if (connection === 'open') {
            console.log(`[Session ${sessionNum}] Connected Successful ✅`);
            
            let up = `*HASHAN-MD Session ${sessionNum} Connected ✅*\n\n*Prefix: ${prefix}*`;
            conn.sendMessage("94740137623@s.whatsapp.net", { 
                image: { url: `https://files.catbox.moe/vbo0vq.png` }, 
                caption: up 
            });
        }
    });

    conn.ev.on('creds.update', saveCreds);

    conn.ev.on('messages.upsert', async (mek) => {
        mek = mek.messages[0];
        if (!mek.message) return;
        mek.message = (getContentType(mek.message) === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message;
        if (mek.key && mek.key.remoteJid === 'status@broadcast') return;
        
        const m = sms(conn, mek);
        const type = getContentType(mek.message);
        const from = mek.key.remoteJid;
        const body = (type === 'conversation') ? mek.message.conversation : (type === 'extendedTextMessage') ? mek.message.extendedTextMessage.text : (type == 'imageMessage') && mek.message.imageMessage.caption ? mek.message.imageMessage.caption : (type == 'videoMessage') && mek.message.videoMessage.caption ? mek.message.videoMessage.caption : '';
        const isCmd = body.startsWith(prefix);
        const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : '';
        const args = body.trim().split(/ +/).slice(1);
        const q = args.join(' ');
        const sender = mek.key.fromMe ? (conn.user.id.split(':')[0] + '@s.whatsapp.net' || conn.user.id) : (mek.key.participant || mek.key.remoteJid);
        const senderNumber = sender.split('@')[0];
        const botNumber2 = await jidNormalizedUser(conn.user.id);
        const isOwner = ownerNumber.includes(senderNumber);

        const reply = (teks) => {
            conn.sendMessage(from, { text: teks }, { quoted: mek });
        }

        // Plugin Handling
        const events = require('./command');
        const cmdName = isCmd ? body.slice(prefix.length).trim().split(" ")[0].toLowerCase() : false;
        if (isCmd) {
            const cmd = events.commands.find((cmd) => cmd.pattern === (cmdName)) || events.commands.find((cmd) => cmd.alias && cmd.alias.includes(cmdName));
            if (cmd) {
                if (cmd.react) conn.sendMessage(from, { react: { text: cmd.react, key: mek.key } });
                try {
                    cmd.function(conn, mek, m, { from, body, isCmd, command, args, q, sender, senderNumber, botNumber2, isOwner, reply });
                } catch (e) {
                    console.error("[PLUGIN ERROR] " + e);
                }
            }
        }
    });
}

// Plugins loading (එක පාරක් load කළාම ඇති)
const path = require('path');
fs.readdirSync("./plugins/").forEach((plugin) => {
    if (path.extname(plugin).toLowerCase() == ".js") {
        require("./plugins/" + plugin);
    }
});

// වැඩේ පටන් ගමු!
startAllBots();
