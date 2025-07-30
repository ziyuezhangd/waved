import express from 'express';
import path from 'path';
import cors from 'cors';
import { pool } from './connectionPool.js'; // Import the connection pool

// Note: The services/stock1.js and services/mockDB.js and their endpoints are kept as they were.
import { getStockData } from './services/stock1.js';


import { getAllAssets, getAllPortfolio, getAllReturns } from "./services/mockDB.js";
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
    sql = "SELECT time, total_value FROM daily_asset_summary WHERE DATE(time) = CURDATE() ORDER BY time ASC";
  } else if (range === '1W') {
    sql = "SELECT DATE(time) as time, SUM(total_value)/COUNT(*) as total_value FROM daily_asset_summary WHERE time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) GROUP BY DATE(time) ORDER BY time ASC";
  } else if (range === '1M') {
    sql = "SELECT DATE(time) as time, SUM(total_value)/COUNT(*) as total_value FROM daily_asset_summary WHERE time >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) GROUP BY DATE(time) ORDER BY time ASC";
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

app.get('/api/allReturn', async (req, res) => {
  try {
    const returns = await getAllReturns();
    res.json({returns})
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

// 计算当前现金余额（使用数据库连接）
async function getCurrentCashAmount(connection) {
    const [[{ balance }]] = await connection.query('SELECT SUM(amount) AS balance FROM cash_flow');
    return balance ?? 0;
}

app.get('/api/cash-amount', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const balance = await getCurrentCashAmount(connection);
        res.json({ balance });
    } catch (err) {
        console.error('Error calculating cash amount:', err);
        res.status(500).json({ error: 'Failed to calculate cash amount.' });
    } finally {
        if (connection) connection.release();
    }
});

app.post('/api/buy-asset', async (req, res) => {
    const { asset_symbol, asset_type, quantity, price_per_unit, purchase_date } = req.body;
    let connection;

    if (!asset_type || !asset_symbol || !quantity || !price_per_unit) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    if (Number(quantity) <= 0 || Number(price_per_unit) <= 0) {
        return res.status(400).json({ error: 'Quantity and price per unit must be greater than 0.' });
    }

    const trade_time = purchase_date ? new Date(purchase_date) : new Date();
    const totalCost = Number(quantity) * Number(price_per_unit);

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // ✅ 检查现金余额是否足够
        const currentBalance = await getCurrentCashAmount(connection);
        if (currentBalance < totalCost) {
            await connection.rollback();
            return res.status(400).json({ error: 'Insufficient cash balance for this purchase.' });
        }

        const [portfolioRows] = await connection.query(
            'SELECT * FROM portfolio WHERE asset_symbol = ?',
            [asset_symbol]
        );

        if (portfolioRows.length > 0) {
            // 已存在资产，更新 portfolio
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

            // 插入 trades 记录
            const [tradeResult] = await connection.query(
                'INSERT INTO trades (asset_symbol, trade_time, asset_type, asset_name, trade_type, quantity, price_per_unit, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [asset_symbol, trade_time, existing.asset_type, existing.asset_name, 'buy', quantity, price_per_unit, 'Additional buy']
            );
            const tradeId = tradeResult.insertId;

            // 插入 cash_flow 记录
            await connection.query(
                'INSERT INTO cash_flow (transaction_time, transaction_type, amount, related_trade_id, notes) VALUES (?, ?, ?, ?, ?)',
                [trade_time, 'trade_settlement', -totalCost, tradeId, `Cash used for ${asset_symbol} purchase`]
            );

            await connection.commit();
            return res.status(200).json({ message: 'Updated portfolio and recorded trade.' });
        }

        // 新资产，先验证 symbol 是否有效
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

        // 插入 portfolio
        await connection.query(
            'INSERT INTO portfolio (asset_symbol, asset_type, asset_name, quantity, avg_purchase_price) VALUES (?, ?, ?, ?, ?)',
            [asset_symbol, resolvedType, asset_name, quantity, price_per_unit]
        );

        // 插入 trades
        const [tradeResult] = await connection.query(
            'INSERT INTO trades (asset_symbol, trade_time, asset_type, asset_name, trade_type, quantity, price_per_unit, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [asset_symbol, trade_time, resolvedType, asset_name, 'buy', quantity, price_per_unit, 'Initial purchase']
        );
        const tradeId = tradeResult.insertId;

        // 插入 cash_flow
        await connection.query(
            'INSERT INTO cash_flow (transaction_time, transaction_type, amount, related_trade_id, notes) VALUES (?, ?, ?, ?, ?)',
            [trade_time, 'trade_settlement', -totalCost, tradeId, `Cash used for ${asset_symbol} purchase`]
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

app.post('/api/sell-asset', async (req, res) => {
  const { asset_symbol, quantity, price_per_unit, sell_date } = req.body;
  let connection;

  // Basic input validation
  if (!asset_symbol || !quantity || !price_per_unit) {
      return res.status(400).json({ error: 'Missing required fields: asset_symbol, quantity, and price_per_unit are required.' });
  }

  const trade_time = sell_date ? new Date(sell_date) : new Date();
  const sellQuantity = Number(quantity);
  const sellPrice = Number(price_per_unit);

  try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      // 1. Check if the asset exists in the portfolio
      const [portfolioRows] = await connection.query(
          'SELECT * FROM portfolio WHERE asset_symbol = ?',
          [asset_symbol]
      );

      if (portfolioRows.length === 0) {
          await connection.rollback(); // Good practice to rollback even if no changes were made
          return res.status(404).json({ error: `Asset ${asset_symbol} not found in your portfolio.` });
      }

      const existingAsset = portfolioRows[0];
      const existingQuantity = Number(existingAsset.quantity);

      // 2. Check if there is enough quantity to sell
      if (existingQuantity < sellQuantity) {
          await connection.rollback();
          return res.status(400).json({ error: `Not enough quantity to sell. You have ${existingQuantity}, but tried to sell ${sellQuantity}.` });
      }

      const newQuantity = existingQuantity - sellQuantity;

      // 3. Update or delete the portfolio record
      if (newQuantity === 0) {
          // If selling all, remove the asset from the portfolio
          await connection.query(
              'DELETE FROM portfolio WHERE asset_symbol = ?',
              [asset_symbol]
          );
      } else {
          // Otherwise, just update the quantity
          await connection.query(
              'UPDATE portfolio SET quantity = ? WHERE asset_symbol = ?',
              [newQuantity, asset_symbol]
          );
      }

      // 4. Insert the 'sell' transaction into the trades table
      const [tradeResult] = await connection.query(
          'INSERT INTO trades (asset_symbol, trade_time, asset_type, asset_name, trade_type, quantity, price_per_unit, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [asset_symbol, trade_time, existingAsset.asset_type, existingAsset.asset_name, 'sell', sellQuantity, sellPrice, 'Asset sale']
      );
      const tradeId = tradeResult.insertId;

      // 5. Record the cash inflow from the sale
      const cashInflow = sellQuantity * sellPrice;
      await connection.query(
          'INSERT INTO cash_flow (transaction_time, transaction_type, amount, related_trade_id, notes) VALUES (?, ?, ?, ?, ?)',
          [trade_time, 'trade_settlement', cashInflow, tradeId, `Cash received from ${asset_symbol} sale`]
      );

      await connection.commit();
      res.status(200).json({ message: 'Asset sold successfully and trade recorded.' });

  } catch (err) {
      if (connection) await connection.rollback();
      console.error('Error in /api/sell-asset:', err);
      res.status(500).json({ error: 'Server error during the sell transaction.', details: err.message });
  } finally {
      if (connection) connection.release();
  }
});

app.get('/api/portfolio-summary', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();

        // 查询portfolio中的当前价格和资产类别
        const [portfolioRows] = await connection.query('SELECT * FROM portfolio');

        // 获取所有 symbol 的最新价格
        const priceMap = {};
        await Promise.all(portfolioRows.map(async row => {
            try {
                const quote = await yahooFinance.quote(row.asset_symbol);
                if (quote && quote.regularMarketPrice) {
                    priceMap[row.asset_symbol] = quote.regularMarketPrice;
                }
            } catch (e) {
                console.warn(`Failed to fetch price for ${row.asset_symbol}:`, e.message);
                priceMap[row.asset_symbol] = 0;
            }
        }));

        // 分类汇总
        const summary = {
            Stocks: 0,
            ETFs: 0,
            Bonds: 0,
            Cash: 0 // 稍后计算
        };

        for (const row of portfolioRows) {
            const price = priceMap[row.asset_symbol] ?? 0;
            const value = price * Number(row.quantity);

            if (row.asset_type === 'stock') summary.Stocks += value;
            else if (row.asset_type === 'etf') summary.ETFs += value;
            else if (row.asset_type === 'bond') summary.Bonds += value;
        }

        // 获取现金余额
        const cash = await getCurrentCashAmount(connection);
        summary.Cash = cash;

        res.json(summary);
    } catch (err) {
        console.error('Error in /api/portfolio-summary:', err);
        res.status(500).json({ error: 'Failed to compute portfolio summary.' });
    } finally {
        if (connection) connection.release();
    }
});

app.get('/api/get-cost', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();

        // SQL query to calculate the total cost for each asset type
        const query = `
            SELECT
                asset_type,
                SUM(quantity * avg_purchase_price) AS total_cost
            FROM
                portfolio
            GROUP BY
                asset_type;
        `;

        const [rows] = await connection.query(query);

        // Initialize a result object with default values
        const costs = {
            stock: 0,
            etf: 0,
            bond: 0
        };

        // Populate the result object with data from the database
        for (const row of rows) {
            if (costs.hasOwnProperty(row.asset_type)) {
                costs[row.asset_type] = parseFloat(row.total_cost);
            }
        }

        res.json(costs);

    } catch (err) {
        console.error('Error in /api/get-cost:', err);
        res.status(500).json({ error: 'Server error fetching asset costs.', details: err.message });
    } finally {
        if (connection) connection.release();
    }
});

app.post('/api/cash-flow', async (req, res) => {
    const { transaction_type, amount, notes } = req.body;
    const allowedTypes = ['deposit', 'withdrawal'];

    // ✅ 校验输入
    if (!transaction_type || !amount) {
        return res.status(400).json({ error: 'transaction_type and amount are required.' });
    }

    if (!allowedTypes.includes(transaction_type)) {
        return res.status(400).json({ error: 'Invalid transaction_type. Must be deposit or withdrawal.' });
    }

    if (Number(amount) <= 0) {
        return res.status(400).json({ error: 'Amount must be greater than 0.' });
    }

    let connection;
    try {
        connection = await pool.getConnection();

        // ✅ 提前在 connection 获取后再做余额检查
        if (transaction_type === 'withdrawal') {
            const currentBalance = await getCurrentCashAmount(connection);
            if (Number(amount) > currentBalance) {
                return res.status(400).json({ error: 'Insufficient cash balance for withdrawal.' });
            }
        }

        const now = new Date();
        await connection.query(
            `INSERT INTO cash_flow (transaction_time, transaction_type, amount, notes)
             VALUES (?, ?, ?, ?)`,
            [
                now,
                transaction_type,
                transaction_type === 'withdrawal' ? -Number(amount) : Number(amount),
                notes || `Cash ${transaction_type}`
            ]
        );

        res.status(201).json({ message: `Cash ${transaction_type} recorded successfully.` });
    } catch (err) {
        console.error('Error in /api/cash-flow:', err);
        res.status(500).json({ error: 'Failed to record cash flow.' });
    } finally {
        if (connection) connection.release();
    }
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});