import express from 'express';
import path from 'path';
import cors from 'cors';
import yahooFinance from 'yahoo-finance2';
import { pool } from './connectionPool.js'; // The single source for DB connections

// Note: The services/stock1.js and services/mockDB.js imports are kept as they were.
import { getStockData } from './services/stock1.js';
import { getAllAssets, getAllPortfolio } from "./services/mockDB.js";
// Note: The direct import of mysql2 is no longer needed for endpoints, but db-test can use it for type info if needed.
// We'll leave it for now as it doesn't harm anything.
import mysql from 'mysql2'; 

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Access static files in public directory
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, 'public')));


// --- API Endpoints ---

app.get('/api/stock/:symbol', async (req, res) => {
  try {
    const price = await getStockData(req.params.symbol);
    res.json({ price });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stock data' });
  }
});

app.get('/api/allAsset', async (req, res) => {
  try {
    const asset = await getAllAssets();
    res.json({asset})
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch asset data' });
  }
});

app.get('/api/portfolio', async (req, res) => {
  try {
    const portfolio = await getAllPortfolio();
    res.json(portfolio);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch portfolio data' });
  }
});

app.post('/api/stocks', async (req, res) => {
  const symbols = req.body.symbols;
  if (!Array.isArray(symbols) || symbols.length === 0) {
    return res.status(400).json({ error: 'No symbols provided' });
  }
  try {
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const quote = await yahooFinance.quote(symbol);
          if (!quote) return { symbol, error: 'Not found' };
          return {
            symbol: quote.symbol,
            name: quote.longName || quote.shortName,
            price: quote.regularMarketPrice,
            currency: quote.currency,
            marketState: quote.marketState
          };
        } catch (err) {
          return { symbol, error: err.message };
        }
      })
    );
    res.json(results);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// --- Database Endpoints ---

// Updated to use the connection pool for a more realistic test
app.get('/api/db-test', async (req, res) => {
  let connection;
  try {
    // Get a connection from the pool
    connection = await pool.getConnection();
    console.log('Database connection test was successful via pool.');
    res.json({
      success: true,
      message: 'Successfully connected to the database via pool.',
    });
  } catch (err) {
    console.error('Error connecting to MySQL via pool:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to connect to the database via pool.',
      error: err.code,
    });
  } finally {
    // IMPORTANT: Always release the connection back to the pool
    if (connection) connection.release();
  }
});

app.post('/api/generate-sample-data', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log("Starting database transaction to generate sample data.");
        await connection.beginTransaction();

        await connection.execute('DELETE FROM `daily_asset_summary`');
        await connection.execute('DELETE FROM `cash_flow`');
        await connection.execute('DELETE FROM `trades`');
        console.log("Cleared existing data from tables.");

        await connection.execute(
            `INSERT INTO cash_flow (transaction_time, transaction_type, amount, notes) VALUES (?, ?, ?, ?)`,
            [new Date(), 'deposit', 100000.00, 'Initial capital deposit']
        );
        console.log("Inserted initial deposit.");

        const aaplQuote = await yahooFinance.quote('AAPL');
        const aaplBuyPrice = aaplQuote.regularMarketPrice;
        const aaplBuyQuantity = 20;
        const aaplBuyTotal = aaplBuyQuantity * aaplBuyPrice;
        
        const [aaplTradeResult] = await connection.execute(
            `INSERT INTO trades (asset_symbol, trade_time, asset_type, asset_name, trade_type, quantity, price_per_unit, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            ['AAPL', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), 'stock', aaplQuote.longName, 'buy', aaplBuyQuantity, aaplBuyPrice, 'Long-term holding']
        );
        const aaplTradeId = aaplTradeResult.insertId;
        
        await connection.execute(
            `INSERT INTO cash_flow (transaction_time, transaction_type, amount, related_trade_id, notes) VALUES (?, ?, ?, ?, ?)`,
            [new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), 'trade_settlement', -aaplBuyTotal, aaplTradeId, 'Cash used for AAPL purchase']
        );
        console.log("Generated 'buy' trade for AAPL.");

        const msftQuote = await yahooFinance.quote('MSFT');
        const msftBuyPrice = msftQuote.regularMarketPrice;
        const msftBuyQuantity = 15;
        const msftBuyTotal = msftBuyQuantity * msftBuyPrice;

        const [msftTradeResult] = await connection.execute(
            `INSERT INTO trades (asset_symbol, trade_time, asset_type, asset_name, trade_type, quantity, price_per_unit, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            ['MSFT', new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), 'stock', msftQuote.longName, 'buy', msftBuyQuantity, msftBuyPrice, 'Diversification into tech']
        );
        const msftTradeId = msftTradeResult.insertId;

        await connection.execute(
            `INSERT INTO cash_flow (transaction_time, transaction_type, amount, related_trade_id, notes) VALUES (?, ?, ?, ?, ?)`,
            [new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), 'trade_settlement', -msftBuyTotal, msftTradeId, 'Cash used for MSFT purchase']
        );
        console.log("Generated 'buy' trade for MSFT.");

        await connection.execute(
            `INSERT INTO cash_flow (transaction_time, transaction_type, amount, notes) VALUES (?, ?, ?, ?)`,
            [new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), 'dividend', 25.50, 'Quarterly dividend from AAPL']
        );
        console.log("Generated dividend payment.");
        
        const dailySummaryData = [
            [new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0,10), 96580.00],
            [new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0,10), 98200.50],
            [new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().slice(0,10), 99500.75]
        ];
        
        const placeholders = dailySummaryData.map(() => '(?, ?)').join(', ');
        const sql = `INSERT INTO daily_asset_summary (record_date, total_asset_value) VALUES ${placeholders}`;
        const flatData = dailySummaryData.flat();

        await connection.execute(sql, flatData);
        
        console.log("Inserted daily asset summaries.");

        await connection.commit();
        console.log("Transaction committed successfully.");
        res.status(201).json({ message: 'Sample data generated successfully.' });

    } catch (err) {
        console.error('Error during data generation:', err);
        if (connection) await connection.rollback();
        res.status(500).json({ error: 'Failed to generate sample data.', details: err.message });
    } finally {
        if (connection) connection.release();
    }
});


app.get('/api/trades', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM `trades` ORDER BY `trade_time` DESC');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching trades:', err);
        res.status(500).json({ error: 'Failed to fetch trades' });
    }
});


app.get('/api/cash-flow', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM `cash_flow` ORDER BY `transaction_time` DESC');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching cash flow:', err);
        res.status(500).json({ error: 'Failed to fetch cash flow data' });
    }
});


app.get('/api/daily-summary', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM `daily_asset_summary` ORDER BY `record_date` DESC');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching daily summaries:', err);
        res.status(500).json({ error: 'Failed to fetch daily asset summaries' });
    }
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
