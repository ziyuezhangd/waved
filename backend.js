// backend/index.js
import express from 'express';
import yahooFinance from 'yahoo-finance2';
import cors from 'cors';

const app = express();
app.use(cors()); // Enable CORS for all routes

const PORT = 3000;

// retrieve stock data by symbol
app.get('/api/stock/:symbol', async (req, res) => {
  const symbol = req.params.symbol;

  try {
    // retrieve stock data using yahoo-finance2
    const quote = await yahooFinance.quote(symbol);

    if (!quote) {
      return res.status(404).json({ error: 'cannot find the stock' });
    }

    
    const result = {
      symbol: quote.symbol,
      name: quote.longName || quote.shortName,
      price: quote.regularMarketPrice,
      currency: quote.currency,
      marketState: quote.marketState
    };

    // return result
    res.json(result);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running at：http://localhost:${PORT}`);
});
