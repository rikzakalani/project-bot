const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./coins.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS coins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    symbol TEXT,
    price REAL,
    change_1h REAL,
    change_24h REAL,
    change_7d REAL,
    change_30d REAL,
    volume REAL,
    market_cap REAL,
    ath REAL,
    ath_change REAL,
    circulating_supply REAL,
    max_supply REAL,
    image TEXT,
    source TEXT,
    listed_at TEXT
  )`);
});

async function insertCoin(data) {
  const stmt = db.prepare(`INSERT INTO coins (
    name, symbol, price, change_1h, change_24h, change_7d, change_30d,
    volume, market_cap, ath, ath_change, circulating_supply, max_supply,
    image, source, listed_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  stmt.run([
    data.name, data.symbol, data.price, data.change_1h, data.change_24h, data.change_7d,
    data.change_30d, data.volume, data.market_cap, data.ath, data.ath_change,
    data.circulating_supply, data.max_supply, data.image, data.source, data.listed_at
  ]);

  stmt.finalize();
}

function getAllCoins(callback) {
  db.all("SELECT * FROM coins ORDER BY price ASC LIMIT 90", [], (err, rows) => {
    if (err) {
      console.error(err);
      callback([]);
    } else {
      callback(rows);
    }
  });
}

function getUptrendCoins(callback) {
  db.all(`
    SELECT * FROM coins
    WHERE 
      change_1h > 0 AND 
      change_24h > 0 AND 
      change_7d > 0 AND 
      change_30d > 0 AND
      volume > 100000 AND
      market_cap > 100000 AND
      ath > 0 AND
      ath_change > -15 AND
      source = 'CoinGecko'
    ORDER BY price ASC LIMIT 50
  `, [], (err, rows) => {
    if (err) {
      console.error(err);
      callback([]);
    } else {
      callback(rows);
    }
  });
}



module.exports = {
  insertCoin,
  getAllCoins,
  getUptrendCoins
}
