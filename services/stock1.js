import yahooFinance from 'yahoo-finance2';

/* export async function getStockData(symbol) {
  const quote = await yahooFinance.quote(symbol);
  return quote.regularMarketPrice;
} */

/* export async function getIntradayData(symbol) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(),9, 30);
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(),16, 0);

  const result = await yahooFinance._chart(
    symbol,
    {
      period1: start,
      period2: end,
      interval: '1m',
    }
  );

  return {
    times: result.timestamp.map(ts => new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
    prices: result.indicators.quote[0].close,
  };


}; */
//temporarily mock
export async function getIntradayData(symbol, period = '1d', interval = '1m') {
  // Use yahooFinance2 _chart API
  const result = await yahooFinance._chart(
    symbol,
    { period, interval }
  );
  return {
    times: result.timestamp.map(ts => new Date(ts * 1000).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: '2-digit', day: '2-digit' })),
    prices: result.indicators.quote[0].close,
  };
}
export async function getStockData(symbol) {
  return 123.45; // Always return a fake price for testing
}
