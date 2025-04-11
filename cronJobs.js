const cron = require('node-cron');
const { getAllCoins } = require('./database');
const { bot, channelId } = require('./bot');

// Mengirimkan pembaruan otomatis setiap jam
cron.schedule('0 * * * *', () => {
  getAllCoins(coins => {
    const message = coins.map(coin => 
      `🔹 *${coin.name}* (${coin.symbol})\n💲Price: $${coin.price}\n📈 24h: ${coin.change_24h}%\n🧃Volume: ${coin.volume}\n⏱️ Listed: ${coin.listed_at}\n🛰 Source: ${coin.source}`
    ).join("\n\n");
    
    bot.sendMessage(channelId, message);
  });
});
