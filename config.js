const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}

// උදාහරණයක් විදිහට Session IDs 5ක් (මේවා ඔයාගේ IDs වලින් වෙනස් කරන්න)
const defaultSessions = [
    "j9JkSBTS#VF7C8GFm2VpuW0WlJB8aJBw-EGqOYhbXNuwr4vkJop4", // Session 1
    "id2_example_mega_link_here",                          // Session 2
    "id3_example_mega_link_here",                          // Session 3
    "id4_example_mega_link_here",                          // Session 4
    "id5_example_mega_link_here"                           // Session 5
].join(',');

// Hosting එකේ SESSION_ID variable එක තිබ්බොත් ඒක ගන්නවා, නැත්නම් උඩ තියෙන default ටික ගන්නවා
const sessionInput = process.env.SESSION_ID || defaultSessions;

// IDs ටික Array එකකට වෙන් කරගන්නවා
const sessions = sessionInput.split(',').map(s => s.trim()).filter(id => id !== "");

module.exports = {
    SESSION_IDS: sessions, 
    PREFIX: process.env.PREFIX || ".",
    MODE: process.env.MODE || "public",
    ALIVE_IMG: process.env.ALIVE_IMG || "https://files.catbox.moe/vbo0vq.png",
    ALIVE_MSG: process.env.ALIVE_MSG || "Hello, HASHAN-MD Multi-Session is Active! 🤖",
};
