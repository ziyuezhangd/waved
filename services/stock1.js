import yahooFinance from 'yahoo-finance2';
import { pool } from '../connectionPool.js';


// 查询实时价格
export async function getStockData(symbol) {
  const quote = await yahooFinance.quote(symbol);
  return quote.regularMarketPrice;
}