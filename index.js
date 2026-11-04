const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.WEBSITE_URL || "https://eyadalantabli-crypto.github.io"
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    name: "SHADOW BOT",
    status: "SERVER_ONLINE",
    message: "Shadow server is running"
  });
});

app.get("/api/status", (req, res) => {
  res.json({
    server: "online",
    bot: "not_connected",
    whatsapp: "not_connected"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`SHADOW BOT server running on port ${PORT}`);
});
