import express from 'express';
import path from 'path';
import cors from 'cors';
import { pool } from './connectionPool.js'; // Import the connection pool

// Note: The services/stock1.js and services/mockDB.js and their endpoints are kept as they were.
import { getStockData } from './services/stock1.js';


import { getAllAssets, getAllPortfolio } from "./services/mockDB.js";
// import { mysqlConnection } from './mysql.js'; // Import the
import yahooFinance from 'yahoo-finance2';
// import mysql from 'mysql2'; // Import mysql2

// This is kept from your version, but is not used by the new endpoints
// mysqlConnection();


const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Access static files in public directory
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, 'public')));


// --- Existing API Endpoints (Unchanged) ---

app.get('/api/stock/:symbol', async (req, res) => {
  try {
    const price = await getStockData(req.params.symbol);
    res.json({ price });
  } catch (err) {
    console.error('Error in getStockData:', err); // Add this line
    res.status(500).json({ error: 'Failed to fetch stock data' });
  }
});

// Provide real total intraday data
app.get('/api/portfolio/performance', async (req, res) => {
  const { range } = req.query; // '1D', '1W', '1M'
  let sql = '';
  if (range === '1D') {
    sql = "SELECT time, total_value FROM intraday_asset_summary WHERE DATE(time) = CURDATE() ORDER BY time ASC";
  } else if (range === '1W') {
    sql = "SELECT DATE(time) as time, SUM(total_value)/COUNT(*) as total_value FROM intraday_asset_summary WHERE time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) GROUP BY DATE(time) ORDER BY time ASC";
  } else if (range === '1M') {
    sql = "SELECT DATE(time) as time, SUM(total_value)/COUNT(*) as total_value FROM intraday_asset_summary WHERE time >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) GROUP BY DATE(time) ORDER BY time ASC";
  } else {
    return res.status(400).json({ error: 'Invalid range.' });
  }
  try {
    const [rows] = await pool.query(sql);
    res.json({
      xAxis: rows.map(r => r.time),
      series: [rows.map(r => r.total_value)]
    });
  } catch (err) {
    console.error('Error in getPortfolioPerformance:', err);
    res.status(500).json({ error: 'Failed to fetch portfolio performance' });
  }
});

// --- New API Endpoints ---
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

// // --- Get Stock Info for Distinct Symbols from Database ---
// app.get('/api/allPortfolio', async (req, res) => {
//   let connection;
//   try {
//     connection = await pool.getConnection();
//     const [rows] = await connection.query('SELECT DISTINCT asset_symbol, asset_type FROM trades');
//     const symbolsWithType = rows.filter(row => row.asset_symbol);
//
//     if (symbolsWithType.length === 0) {
//       return res.status(404).json({ error: 'No asset symbols found in database' });
//     }
//
//     const results = await Promise.all(
//       symbolsWithType.map(async ({ asset_symbol, asset_type }) => {
//         try {
//           const quote = await yahooFinance.quote(asset_symbol);
//           if (!quote) return { symbol: asset_symbol, error: 'Not found', asset_type };
//           return {
//             symbol: quote.symbol,
//             name: quote.longName || quote.shortName,
//             price: quote.regularMarketPrice,
//             currency: quote.currency,
//             marketState: quote.marketState,
//             asset_type
//           };
//         } catch (err) {
//           return { symbol: asset_symbol, error: err.message, asset_type };
//         }
//       })
//     );
//     res.json(results);
//   } catch (err) {
//     console.error('Error in GET /api/stocks:', err);
//     res.status(500).json({ error: 'Server error fetching stocks' });
//   } finally {
//     if (connection) connection.release();
//   }
// });

app.get('/api/db-test', (req, res) => {
  const connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'n3u3da!',
  });
  connection.connect((err) => {
    if (err) {
      console.error('Error connecting to MySQL for test:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to connect to the database.',
        error: err.code,
      });
    }
    console.log('Database connection test was successful.');
    res.json({
      success: true,
      message: 'Successfully connected to the database.',
    });
    connection.end();
  });
});


// =====================================================================
// == DATABASE ENDPOINTS (WITH FIX)
// =====================================================================

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

        // =====================================================================
        // == THE FIX IS HERE: Manually building the query
        // =====================================================================
        const dailySummaryData = [
            [new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0,10), 96580.00],
            [new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0,10), 98200.50],
            [new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().slice(0,10), 99500.75]
        ];

        // 1. Create a string of placeholders like '(?, ?), (?, ?), (?, ?)'
        const placeholders = dailySummaryData.map(() => '(?, ?)').join(', ');

        // 2. Create the full SQL string
        const sql = `INSERT INTO daily_asset_summary (record_date, total_asset_value) VALUES ${placeholders}`;

        // 3. Flatten the data array from [[a, b], [c, d]] to [a, b, c, d]
        const flatData = dailySummaryData.flat();

        // 4. Execute the query. We can use .execute() again because the SQL is now standard.
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


// --- Get All Trades ---
app.get('/api/trades', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM `trades` ORDER BY `trade_time` DESC');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching trades:', err);
        res.status(500).json({ error: 'Failed to fetch trades' });
    }
});


// --- Get All Cash Flow ---
app.get('/api/cash-flow', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM `cash_flow` ORDER BY `transaction_time` DESC');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching cash flow:', err);
        res.status(500).json({ error: 'Failed to fetch cash flow data' });
    }
});


// --- Get All Daily Asset Summaries ---
app.get('/api/daily-summary', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM `daily_asset_summary` ORDER BY `record_date` DESC');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching daily summaries:', err);
        res.status(500).json({ error: 'Failed to fetch daily asset summaries' });
    }
});

// 获取完整资产信息 + 当前价格 + 总价值 + 涨跌幅
app.get('/api/all-portfolio', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();

        // 查询portfolio表中所有资产
        const [rows] = await connection.query('SELECT * FROM portfolio');

        // 遍历每一项，用yahoo finance查询当前价格并计算总值和performance
        const enriched = await Promise.all(rows.map(async (row) => {
            const { asset_symbol, quantity, avg_purchase_price, asset_type, asset_name } = row;

            try {
                const quote = await yahooFinance.quote(asset_symbol);
                const current_price = quote?.regularMarketPrice ?? null;

                let total_value = null;
                let performance = null;

                if (current_price !== null) {
                    total_value = current_price * Number(quantity);
                    const change_pct = ((current_price - Number(avg_purchase_price)) / Number(avg_purchase_price)) * 100;
                    performance = `${change_pct >= 0 ? '+' : ''}${change_pct.toFixed(2)}%`;
                }

                return {
                    asset_symbol,
                    asset_type,
                    asset_name,
                    quantity,
                    avg_purchase_price,
                    current_price,
                    total_value,
                    performance
                };
            } catch (err) {
                return {
                    asset_symbol,
                    asset_type,
                    asset_name,
                    quantity,
                    avg_purchase_price,
                    error: `Failed to fetch price: ${err.message}`
                };
            }
        }));

        res.json(enriched);
    } catch (err) {
        console.error('Error fetching enriched portfolio:', err);
        res.status(500).json({ error: 'Server error.' });
    } finally {
        if (connection) connection.release();
    }
});

app.post('/api/buy-asset', async (req, res) => {
    const { asset_symbol, asset_type, quantity, price_per_unit, purchase_date } = req.body;
    let connection;

    if (!asset_symbol || !quantity || !price_per_unit) {
        return res.status(400).json({ error: 'Missing required fields (asset_symbol, quantity, price_per_unit)' });
    }

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [portfolioRows] = await connection.query(
            'SELECT * FROM portfolio WHERE asset_symbol = ?',
            [asset_symbol]
        );

        // 设置 trade_time：使用传入时间或默认当前时间
        const trade_time = purchase_date ? new Date(purchase_date) : new Date();

        // ====== 已存在资产：更新 portfolio + 新增 trade ======
        if (portfolioRows.length > 0) {
            const existing = portfolioRows[0];
            const totalQuantity = Number(existing.quantity) + Number(quantity);
            const newAvgPrice = (
                (Number(existing.quantity) * Number(existing.avg_purchase_price)) +
                (Number(quantity) * Number(price_per_unit))
            ) / totalQuantity;

            await connection.query(
                'UPDATE portfolio SET quantity = ?, avg_purchase_price = ? WHERE asset_symbol = ?',
                [totalQuantity, newAvgPrice, asset_symbol]
            );

            await connection.query(
                'INSERT INTO trades (asset_symbol, trade_time, asset_type, asset_name, trade_type, quantity, price_per_unit, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [asset_symbol, trade_time, existing.asset_type, existing.asset_name, 'buy', quantity, price_per_unit, 'Additional buy']
            );

            await connection.commit();
            return res.status(200).json({ message: 'Updated portfolio and recorded trade.' });
        }

        // ====== 新资产：先验证 Yahoo Finance 符号是否合法 ======
        const quote = await yahooFinance.quote(asset_symbol);
        if (!quote || !quote.symbol) {
            await connection.rollback();
            return res.status(400).json({ error: 'Invalid symbol, not found on Yahoo Finance.' });
        }

        const asset_name = quote.longName || quote.shortName || asset_symbol;
        const quoteType = quote.quoteType;
        let resolvedType = 'stock';
        if (quoteType === 'ETF') resolvedType = 'etf';
        else if (quoteType === 'BOND') resolvedType = 'bond';

        await connection.query(
            'INSERT INTO portfolio (asset_symbol, asset_type, asset_name, quantity, avg_purchase_price) VALUES (?, ?, ?, ?, ?)',
            [asset_symbol, resolvedType, asset_name, quantity, price_per_unit]
        );

        await connection.query(
            'INSERT INTO trades (asset_symbol, trade_time, asset_type, asset_name, trade_type, quantity, price_per_unit, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [asset_symbol, trade_time, resolvedType, asset_name, 'buy', quantity, price_per_unit, 'Initial purchase']
        );

        await connection.commit();
        res.status(201).json({ message: 'New asset added and trade recorded.' });

    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Error in /api/buy-asset:', err);
        res.status(500).json({ error: 'Server error.' });
    } finally {
        if (connection) connection.release();
    }
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});