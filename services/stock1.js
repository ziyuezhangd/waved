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
  if (period === '1d') {
    return {
      times: ['09:30', '09:31', '09:32'],
      prices: [123.45, 123.55, 123.65]
    };
  } else if (period === '5d') {
    return {
      times: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      prices: [120, 121, 122, 123, 124]
    };
  } else if (period === '1mo') {
    return {
      times: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      prices: [110, 115, 120, 125]
    };
  }
  return { times: [], prices: [] };
};
export async function getStockData(symbol) {
  return 123.45; // Always return a fake price for testing
}
