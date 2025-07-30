import yahooFinance from 'yahoo-finance2';
import { pool } from '../connectionPool.js';


// 查询实时价格
export async function getStockData(symbol) {
  const quote = await yahooFinance.quote(symbol);
  return quote.regularMarketPrice;
}

// 查询分时数据（可根据实际需求改为数据库查询）
export async function getIntradayData(symbol, period = '1d', interval = '1m') {
  try {
    const [rows] = await pool.query(
      'SELECT time, price FROM intraday_prices WHERE symbol = ? ORDER BY time ASC',
      [symbol]
    );
    return {
      times: rows.map(r => r.time),      // 假设 time 已经是字符串（如 '09:30'）
      prices: rows.map(r => r.price)
    };
  } catch (err) {
    console.error('Error in getIntradayData:', err);
    return { times: [], prices: [] };
  }
}