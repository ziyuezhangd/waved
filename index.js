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
    res.status(500).json({ error: 'Failed to fetch stock data' });
  }
});

// Provide real intraday data
app.get('/api/stock/intraday/:symbol', async (req, res) => {
  const {range} = req.query;
  if (range === '1D') {
    try {
      const { times, prices } = await getIntradayData(req.params.symbol);
      res.json({ 
        xAxis: times,
        series: [prices]
       });
    }catch (err) {
      res.status(500).json({ error: 'Failed to fetch intraday data' });
    }
  } else {
    res.status(400).json({ error: 'Invalid range.'});
  }
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

