const axios = require('axios');
const fs = require('fs');
const { insertCoin } = require('./database');

const FETCH_TRACK_FILE = './last_fetch.json';

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getLastFetchTime() {
  try {
    const data = fs.readFileSync(FETCH_TRACK_FILE, 'utf-8');
    return new Date(JSON.parse(data).last_fetch);
  } catch {
    return new Date('2000-01-01T00:00:00Z'); // default lama
  }
}

function updateLastFetchTime() {
  fs.writeFileSync(FETCH_TRACK_FILE, JSON.stringify({ last_fetch: new Date().toISOString() }));
}

async function fetchAllCoinsWithDelay() {
  const allCoins = [];
  const perPage = 250;
  const maxPerMinute = 45;
  const delayMs = 2500;
  let page = 1;
  let requestCount = 0;
  let startTime = Date.now();

  const lastFetch = getLastFetchTime();

  while (true) {
    if (requestCount >= maxPerMinute) {
      const elapsed = Date.now() - startTime;
      if (elapsed < 60000) {
        const wait = 60000 - elapsed;
        console.log(`⏳ Reached ${maxPerMinute} requests. Waiting ${Math.round(wait / 1000)}s...`);
        await delay(wait);
      }
      requestCount = 0;
      startTime = Date.now();
    }

    console.log(`📦 Fetching page ${page}...`);

    try {
      const res = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_asc',
          per_page: perPage,
          page,
          price_change_percentage: '1h,24h,7d,30d'
        }
      });

      const coins = res.data;
      if (!coins.length) break;

      const filtered = coins.filter(c =>
        (c.price_change_percentage_24h_in_currency > 0 || c.price_change_percentage_7d_in_currency > 0) &&
        c.current_price > 0
      );

      for (const coin of filtered) {
        const listedTime = new Date(); // bisa diganti ke genesis_date jika ingin lebih akurat

        if (listedTime <= lastFetch) continue;

        const data = {
          name: coin.name,
          symbol: coin.symbol.toUpperCase(),
          price: coin.current_price,
          change_1h: coin.price_change_percentage_1h_in_currency ?? 0,
          change_24h: coin.price_change_percentage_24h_in_currency ?? 0,
          change_7d: coin.price_change_percentage_7d_in_currency ?? 0,
          change_30d: coin.price_change_percentage_30d_in_currency ?? 0,
          volume: coin.total_volume ?? 0,
          market_cap: coin.market_cap ?? 0,
          ath: coin.ath ?? 0,
          ath_change: coin.ath_change_percentage ?? 0,
          circulating_supply: coin.circulating_supply ?? 0,
          max_supply: coin.max_supply ?? 0,
          image: coin.image,
          listed_at: listedTime.toISOString(),
          source: "CoinGecko"
        };

        await insertCoin(data);
        allCoins.push(data);
      }

      requestCount++;
      await delay(delayMs);
      page++;

    } catch (err) {
      if (err.response?.status === 429) {
        console.log(`⚠️ Rate limit hit (429). Waiting 60 seconds before retrying page ${page}...`);
        await delay(60000);
        continue;
      } else {
        console.error(`❌ Error on page ${page}:`, err.message);
        break;
      }
    }
  }

  updateLastFetchTime();
  console.log(`✅ Total coins stored: ${allCoins.length}`);
  return allCoins;
}

module.exports = { fetchAllCoinsWithDelay };
