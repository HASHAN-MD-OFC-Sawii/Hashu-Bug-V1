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
const { File } = require('megajs')
const axios = require('axios')
const { sms, downloadMediaMessage } = require('./lib/msg')
const prefix = config.PREFIX

const ownerNumber = ['94703457206', '94740137623']

// Express Setup
const express = require("express");
const app = express();
const port = process.env.PORT || 8000;

// =================== MULTI-SESSION LOGIC ============================

async function startAllSessions() {
    // config.SESSION_IDS එකේ තියෙන හැම එකකටම ලූප් එකක් දුවවනවා
    for (const [index, sessionId] of config.SESSION_IDS.entries()) {
        if (!sessionId) continue;
        
        const sessionPath = `./auth_info_baileys_${index + 1}`;
        
        // Session එක Download කරනවා
        if (!fs.existsSync(sessionPath + '/creds.json')) {
            console.log(`Downloading Session ${index + 1}...`);
            try {
                if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath);
                const filer = File.fromURL(`https://mega.nz/file/${sessionId}`);
                filer.download((err, data) => {
                    if (err) return console.log(`Error downloading session ${index + 1}:`, err);
                    fs.writeFileSync(sessionPath + '/creds.json', data);
                    console.log(`Session ${index + 1} downloaded ✅`);
                    connectToWA(sessionId, sessionPath, index + 1);
                });
            } catch (e) {
                console.log(`Mega download failed for Session ${index + 1}`);
            }
        } else {
            connectToWA(sessionId, sessionPath, index + 1);
        }
        await sleep(5000); // සෙෂන් දෙකක් අතර පොඩි විවේකයක් (Crash නොවෙන්න)
    }
}

async function connectToWA(sessionId, sessionPath, sessionNum) {
    console.log(`[Session ${sessionNum}] Connecting...`);
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
            console.log(`[Session ${sessionNum}] Bot Installed Successful ✅`);
            
            // Plugins load කරන එක මෙතන කරන්නේ නැතුව main එකේ කරලා තියෙන්නේ
            let up = `*HASHU-BUG-MD Session ${sessionNum} Connected ✅*\n\n*Prefix: ${prefix}*`;
            conn.sendMessage("94740137623@s.whatsapp.net", { image: { url: `https://files.catbox.moe/vbo0vq.png` }, caption: up });
        }
    });

    conn.ev.on('creds.update', saveCreds);

    conn.ev.on('messages.upsert', async (mek) => {
        mek = mek.messages[0];
        if (!mek.message) return;
        mek.message = (getContentType(mek.message) === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message;
        if (mek.key && mek.key.remoteJid === 'status@broadcast') return;
        
        const m = sms(conn, mek);
        const from = mek.key.remoteJid;
        const body = (getContentType(mek.message) === 'conversation') ? mek.message.conversation : (getContentType(mek.message) === 'extendedTextMessage') ? mek.message.extendedTextMessage.text : '';
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

        // ================= Plugin Handling =================
        const events = require('./command');
        const cmdName = isCmd ? body.slice(prefix.length).trim().split(" ")[0].toLowerCase() : false;
        
        if (isCmd) {
            const cmd = events.commands.find((cmd) => cmd.pattern === (cmdName)) || events.commands.find((cmd) => cmd.alias && cmd.alias.includes(cmdName));
            if (cmd) {
                if (cmd.react) conn.sendMessage(from, { react: { text: cmd.react, key: mek.key } });
                try {
                    // ඔයාගේ පරණ function parameters ටිකම මෙතනට පාස් කරනවා
                    cmd.function(conn, mek, m, { from, body, isCmd, command, args, q, sender, senderNumber, botNumber2, isOwner, reply });
                } catch (e) {
                    console.error("[PLUGIN ERROR] " + e);
                }
            }
        }
    });
}

// Plugins ටික එක පාරක් load කරනවා
const path = require('path');
fs.readdirSync("./plugins/").forEach((plugin) => {
    if (path.extname(plugin).toLowerCase() == ".js") {
        require("./plugins/" + plugin);
    }
});

app.get("/", (req, res) => {
    res.send("HASHU-BUG-MD Multi-Session Server started ✅");
});

app.listen(port, () => console.log(`Server listening on port ${port}`));

// ආරම්භය
startAllSessions();
