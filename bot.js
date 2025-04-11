require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { fetchAllCoinsWithDelay } = require('./coingecko');
const { insertCoin, getAllCoins, getUptrendCoins } = require('./database');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Fungsi untuk menunda eksekusi
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatCoinsMessage(coins) {
  return coins.map(c =>
    `🔹 *${c.name}* (${c.symbol})\n` +
    `💵 Price: $${c.price.toFixed(6)}\n` +
    `📈 Change: 1h: ${c.change_1h.toFixed(2)}% | 24h: ${c.change_24h.toFixed(2)}% | 7d: ${c.change_7d.toFixed(2)}% | 30d: ${c.change_30d.toFixed(2)}%\n` +
    `📊 Market Cap: $${(c.market_cap || 0).toLocaleString()}\n` +
    `💧 Volume: $${(c.volume || 0).toLocaleString()}\n` +
    `🔝 ATH: $${c.ath} (${c.ath_change.toFixed(2)}%)\n` +
    `🪙 Supply: ${Math.round(c.circulating_supply || 0)} / ${Math.round(c.max_supply || 0)}\n` +
    `📡 Source: ${c.source}`
  ).join("\n\n");
}

function splitMessage(text, maxLength = 4096) {
  const parts = [];
  while (text.length > maxLength) {
    let split = text.lastIndexOf('\n\n', maxLength);
    if (split === -1) split = maxLength;
    parts.push(text.slice(0, split));
    text = text.slice(split);
  }
  parts.push(text);
  return parts;
}

// Handler untuk perintah /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const message = `
👋 *Selamat datang di CryptoBot!*

Bot ini bisa membantu Anda memantau koin-koin baru dan yang sedang naik daun 🚀

📌 *Perintah yang tersedia:*
/newgems - Menampilkan koin baru yang potensial (listing baru)
/listcoins - Menampilkan semua koin yang tersimpan di database
/uptrendcoingecko - Menampilkan koin dengan tren naik (1h, 24h, 7d, 30d)
/help - Menampilkan daftar semua perintah

🛠 Sumber data: CoinGecko
  `;
  await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
});

// Handler untuk perintah /newgems
bot.onText(/\/newgems/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const coins = await fetchAllCoinsWithDelay();
    const message = formatCoinsMessage(coins);
    const parts = splitMessage(message);
    for (const part of parts) {
      await bot.sendMessage(chatId, part, { parse_mode: "Markdown", disable_web_page_preview: false });
      await delay(1000); // Tambahkan delay 1 detik antara setiap pesan
    }
  } catch (err) {
    console.error(err);
    await bot.sendMessage(chatId, "❌ Gagal mengambil data.");
  }
});

// Handler untuk perintah /listcoins
bot.onText(/\/listcoins/, (msg) => {
  const chatId = msg.chat.id;
  getAllCoins(async (coins) => {
    if (!coins.length) {
      return bot.sendMessage(chatId, "📭 Tidak ada koin tersimpan.");
    }
    const message = formatCoinsMessage(coins);
    const parts = splitMessage(message);
    for (const part of parts) {
      await bot.sendMessage(chatId, part, { parse_mode: "Markdown", disable_web_page_preview: false });
      await delay(1000); // Tambahkan delay 1 detik antara setiap pesan
    }
  });
});

// Handler untuk perintah /uptrendcoingecko
bot.onText(/\/uptrendcoingecko/, (msg) => {
  const chatId = msg.chat.id;

  getUptrendCoins(async (coins) => {
    if (!coins.length) {
      return bot.sendMessage(chatId, "📉 Tidak ada coin uptrend saat ini.");
    }

    const message = formatCoinsMessage(coins);
    const parts = splitMessage(message);

    for (const part of parts) {
      await bot.sendMessage(chatId, part, {
        parse_mode: "Markdown",
        disable_web_page_preview: false
      });
      await delay(1000); // Tambahkan delay 1 detik antara setiap pesan
    }
  });
});