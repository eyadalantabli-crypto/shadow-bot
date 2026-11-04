const express = require("express");
const cors = require("cors");
const path = require("path");
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const pino = require("pino");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.WEBSITE_URL || "https://eyadalantabli-crypto.github.io"
}));

app.use(express.json());

// حالات البوت
let sock;
let botStatus = "disconnected";
let pairingCode = null;

// دالة تشغيل الاتصال بالواتساب
async function startShadowBot(targetPhoneNumber = null) {
  const { state, saveCreds } = await useMultiFileAuthState("./auth_info_baileys");
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    auth: state,
    printQRInTerminal: false
  });

  // إذا طلب المستخدم ربط رقم برمز اقتران (Pairing Code)
  if (targetPhoneNumber && !sock.authState.creds.registered) {
    setTimeout(async () => {
      try {
        let code = await sock.requestPairingCode(targetPhoneNumber);
        pairingCode = code?.match(/.{1,4}/g)?.join("-") || code;
        console.log(`✨ رمز الاقتران الخاص بك: ${pairingCode}`);
      } catch (err) {
        console.error("خطأ في توليد رمز الاقتران:", err);
      }
    }, 3000);
  }

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "connecting") {
      botStatus = "connecting";
    } else if (connection === "open") {
      botStatus = "connected";
      pairingCode = null;
      console.log("✅ تم اتصال SHADOW BOT بنجاح!");
    } else if (connection === "close") {
      botStatus = "disconnected";
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log("⚠️ انقطع الاتصال، جاري إعادة المحاولة...", shouldReconnect);
      if (shouldReconnect) {
        startShadowBot();
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);

  // استقبال الرسائل ومعالجتها
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;
    
    const messageContent = m.message.conversation || m.message.extendedTextMessage?.text;
    const sender = m.key.remoteJid;

    console.log(`📩 رسالة واردة من ${sender}: ${messageContent}`);

    // رد تجريبي بسيط للتأكد من عمل البوت
    if (messageContent === ".shadow" || messageContent === "!menu") {
      await sock.sendMessage(sender, { text: "𓆩♛𓆪 **SHADOW BOT** يعمل بنجاح وكفاءة تامة! 🍷❄️" });
    }
  });
}

// تشغيل البوت عند بدء تشغيل السيرفر
startShadowBot();

// المسارات (Endpoints)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/api/status", (req, res) => {
  res.json({
    server: "online",
    bot: botStatus,
    whatsapp: botStatus === "connected" ? "connected" : "not_connected",
    pairingCode: pairingCode
  });
});

// نقطة نهاية لربط رقم الهاتف
app.post("/api/connect", async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: "الرجاء إدخال رقم الواتساب مع رمز الدولة" });
  }

  try {
    // إعادة تشغيل الاتصال بالرقم الجديد للحصول على الكود
    await startShadowBot(phone);
    res.json({ success: true, message: "جاري توليد رمز الاقتران...", phone });
  } catch (err) {
    res.status(500).json({ error: "فشل في توليد رمز الاقتران", details: err.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`SHADOW BOT server running on port ${PORT}`);
});
