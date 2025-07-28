import yahooFinance from 'yahoo-finance2';

const getStockData = async (stock) => {
  try {
    const quote = await yahooFinance.quote(stock);
    console.log(quote);
  } catch (error) {
    console.error(`Error fetching stock data for ${stock}:`, error);
  }
};

('AAPL');