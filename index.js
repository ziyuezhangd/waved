import express from 'express';
import path from 'path';
import cors from 'cors';
import { getStockData } from './services/stock1.js';
import { getAllAssets} from "./services/mockDB.js";
import { mysqlConnection } from './mysql.js'; // Import the
import yahooFinance from 'yahoo-finance2';
import mysql from 'mysql2'; // Import mysql2
mysqlConnection();
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());


// Access static files in public directory (HTML, CSS, JS files etc.)
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, 'public')));
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

app.use(express.json()); // 确保可以解析 JSON 请求体

app.use(express.json()); // 确保可以解析 JSON 请求体

// retrieve stock data for multiple symbols
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

            if (!quote) {
              return { symbol, error: 'Not found' };
            }

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

app.get('/api/db-test', (req, res) => {
  // Create a new connection for the test
  const connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'n3u3da!',
  });

  // Attempt to connect to the database
  connection.connect((err) => {
    if (err) {
      // If there's an error, log it and send a server error response
      console.error('Error connecting to MySQL for test:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to connect to the database.',
        error: err.code, // Send back the error code (e.g., 'ECONNREFUSED')
      });
    }

    // If the connection is successful, send a success response
    console.log('Database connection test was successful.');
    res.json({
      success: true,
      message: 'Successfully connected to the database.',
    });

    // Important: Close the connection after the test
    connection.end();
  });
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});



