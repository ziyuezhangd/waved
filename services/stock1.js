import yahooFinance from 'yahoo-finance2';

// 查询实时价格
export async function getStockData(symbol) {
  const quote = await yahooFinance.quote(symbol);
  return quote.regularMarketPrice;
}

// 查询分时数据（可根据实际需求改为数据库查询）
export async function getIntradayData(symbol, period = '1d', interval = '1m') {
  try {
    const result = await yahooFinance._chart(
      symbol,
      { period, interval }
    );
    console.log('Yahoo result:', JSON.stringify(result)); // 打印完整返回
    if (!result.timestamp || !result.indicators?.quote?.[0]?.close) {
      throw new Error('No data from Yahoo');
    }
    return {
      times: result.timestamp.map(ts =>
        new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      ),
      prices: result.indicators.quote[0].close
    };
  } catch (err) {
    console.error('Error in getIntradayData:', err);
    return { times: [], prices: [] };
  }
}