import yahooFinance from 'yahoo-finance2';

export async function getStockData(symbol) {
  const quote = await yahooFinance.quote(symbol);
  return quote.regularMarketPrice;
}