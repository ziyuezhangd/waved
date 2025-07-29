import express from 'express';
import path from 'path';
import cors from 'cors';
import { getStockData } from './services/stock1.js';
import { getIntradayData } from './services/stock1.js';

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
    console.error('Error in getStockData:', err); // Add this line
    res.status(500).json({ error: 'Failed to fetch stock data' });
  }
});

// Provide real intraday data
app.get('/api/stock/intraday/:symbol', async (req, res) => {
  const { range } = req.query;
  try {
    let times, prices;
    if (range === '1D') {
      ({ times, prices } = await getIntradayData(req.params.symbol, '1d', '1m'));
    } else if (range === '1W') {
      ({ times, prices } = await getIntradayData(req.params.symbol, '5d', '5m'));
    } else if (range === '1M') {
      ({ times, prices } = await getIntradayData(req.params.symbol, '1mo', '1d'));
    } else {
      return res.status(400).json({ error: 'Invalid range.' });
    }
    res.json({
      xAxis: times,
      series: [prices]
    });
  } catch (err) {
    console.error('Error in getIntradayData:', err);
    res.status(500).json({ error: 'Failed to fetch intraday data' });
  }
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

