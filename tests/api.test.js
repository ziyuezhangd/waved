import { describe, test, expect, beforeAll, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import yahooFinance from 'yahoo-finance2'; // This now imports the MOCK automatically
import { app, server, pool } from '../index.js';

// Helper function
const getCurrentCash = async () => {
    const [[{ balance }]] = await pool.query('SELECT SUM(amount) AS balance FROM cash_flow');
    return parseFloat(balance) || 0;
};

// =====================================================================
// == Test Suite Setup
// =====================================================================

beforeEach(async () => {
    // Clear mock history and set a default return value for each test
    yahooFinance.quote.mockClear();
    yahooFinance.quote.mockResolvedValue({
        symbol: 'GOOG',
        longName: 'Alphabet Inc.',
        regularMarketPrice: 210.50,
        quoteType: 'EQUITY',
    });

    // Database cleanup
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
        await connection.execute('SET FOREIGN_KEY_CHECKS = 0;');
        await connection.execute('TRUNCATE TABLE `trades`;');
        await connection.execute('TRUNCATE TABLE `cash_flow`;');
        await connection.execute('TRUNCATE TABLE `portfolio`;');
        await connection.execute('TRUNCATE TABLE `daily_asset_summary`;');
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1;');
        await connection.execute(
            `INSERT INTO cash_flow (transaction_time, transaction_type, amount, notes) VALUES (?, ?, ?, ?)`,
            [new Date(), 'deposit', 50000.00, 'Initial test deposit']
        );
        await connection.commit();
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
});

afterAll(async () => {
    await pool.end();
    server.close();
}, 10000);

// =====================================================================
// == Test Cases
// =====================================================================

describe('Trading API Endpoints', () => {
    test('POST /api/buy-asset should add a new asset to the portfolio', async () => {
        const response = await request(app)
            .post('/api/buy-asset')
            .send({
                asset_symbol: 'GOOG',
                asset_type: 'stock',
                quantity: 10,
                price_per_unit: 210.50
            });

        expect(response.statusCode).toBe(201);
        expect(yahooFinance.quote).toHaveBeenCalledWith('GOOG');
        const [portfolioRows] = await pool.query('SELECT * FROM portfolio WHERE asset_symbol = ?', ['GOOG']);
        expect(portfolioRows[0].asset_name).toBe('Alphabet Inc.');
    });

    test('POST /api/sell-asset should reduce quantity of an existing asset', async () => {
        // Override the default mock for this test's setup
        yahooFinance.quote.mockResolvedValue({
            symbol: 'MSFT',
            longName: 'Microsoft Corporation',
        });
        
        await request(app)
            .post('/api/buy-asset')
            .send({ asset_symbol: 'MSFT', asset_type: 'stock', quantity: 20, price_per_unit: 400.00 });

        const response = await request(app)
            .post('/api/sell-asset')
            .send({
                asset_symbol: 'MSFT',
                quantity: 5,
                price_per_unit: 410.00
            });

        expect(response.statusCode).toBe(200);
        const [portfolioRows] = await pool.query('SELECT * FROM portfolio WHERE asset_symbol = ?', ['MSFT']);
        expect(parseFloat(portfolioRows[0].quantity)).toBe(15);
    });

    test('POST /api/sell-asset should fail if trying to sell more than available quantity', async () => {
        // Override the default mock for this test's setup
        yahooFinance.quote.mockResolvedValue({
            symbol: 'NVDA',
            longName: 'NVIDIA Corporation',
        });

        await request(app)
            .post('/api/buy-asset')
            .send({ asset_symbol: 'NVDA', asset_type: 'stock', quantity: 10, price_per_unit: 900.00 });

        const response = await request(app)
            .post('/api/sell-asset')
            .send({
                asset_symbol: 'NVDA',
                quantity: 15,
                price_per_unit: 910.00
            });

        expect(response.statusCode).toBe(400);
        expect(response.body.error).toContain('Not enough quantity to sell');
    });
});

describe('POST /api/cash-flow', () => {
    test('should record a new deposit and increase the cash balance', async () => {
        const initialCash = await getCurrentCash();
        const depositAmount = 5000;

        const response = await request(app)
            .post('/api/cash-flow')
            .send({
                transaction_type: 'deposit',
                amount: depositAmount,
                notes: 'Test deposit'
            });
        
        expect(response.statusCode).toBe(201);
        expect(response.body.message).toContain('recorded successfully');

        const finalCash = await getCurrentCash();
        expect(finalCash).toBe(initialCash + depositAmount);
    });

    test('should return a 400 error for withdrawals exceeding the cash balance', async () => {
        const initialCash = await getCurrentCash();
        const withdrawalAmount = initialCash + 1000; // An impossible amount

        const response = await request(app)
            .post('/api/cash-flow')
            .send({
                transaction_type: 'withdrawal',
                amount: withdrawalAmount,
            });
        
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toContain('Insufficient cash balance for withdrawal');
    });
});


describe('GET /api/all-portfolio', () => {
    test('should return portfolio with current price and performance data', async () => {
        // Setup: Insert a known asset directly into the DB for this test
        await pool.execute(
            'INSERT INTO portfolio (asset_symbol, asset_type, asset_name, quantity, avg_purchase_price) VALUES (?, ?, ?, ?, ?)',
            ['AAPL', 'stock', 'Apple Inc.', 10, 150.00]
        );

        // Mock the price for the asset we just inserted
        yahooFinance.quote.mockResolvedValue({
            symbol: 'AAPL',
            regularMarketPrice: 170.00, // Current price is higher than purchase price
        });

        const response = await request(app).get('/api/all-portfolio');

        expect(response.statusCode).toBe(200);
        expect(response.body).toBeInstanceOf(Array);
        expect(response.body.length).toBe(1);

        const asset = response.body[0];
        expect(asset.asset_symbol).toBe('AAPL');
        expect(asset.current_price).toBe(170.00);
        expect(asset.total_value).toBe(1700.00); // 10 shares * $170
        expect(asset.performance).toBe('+13.33%'); // ((170-150)/150)*100
    });
});


describe('GET /api/portfolio-summary', () => {
    test('should return an aggregated summary of asset values by type', async () => {
        // Setup: Insert a stock and an ETF
        await pool.execute(
            'INSERT INTO portfolio (asset_symbol, asset_type, asset_name, quantity, avg_purchase_price) VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)',
            ['GOOG', 'stock', 'Google', 10, 100.00, 'SPY', 'etf', 'S&P 500 ETF', 20, 300.00]
        );

        // Mock prices for all assets in the portfolio
        yahooFinance.quote.mockImplementation(symbol => {
            if (symbol === 'GOOG') {
                return Promise.resolve({ regularMarketPrice: 110.00 });
            }
            if (symbol === 'SPY') {
                return Promise.resolve({ regularMarketPrice: 310.00 });
            }
            return Promise.resolve({});
        });

        const response = await request(app).get('/api/portfolio-summary');
        
        expect(response.statusCode).toBe(200);

        const summary = response.body;
        expect(summary.Stocks).toBeCloseTo(1100.00);  // 10 * $110
        expect(summary.ETFs).toBeCloseTo(6200.00);   // 20 * $310
        expect(summary.Bonds).toBe(0);
        expect(summary.Cash).toBe(50000.00);
    });
});


describe('GET /api/get-cost', () => {
    test('should return the total purchase cost for each asset type', async () => {
        // Setup: Insert assets with known purchase costs
        await pool.execute(
            'INSERT INTO portfolio (asset_symbol, asset_type, asset_name, quantity, avg_purchase_price) VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)',
            ['GOOG', 'stock', 'Google', 10, 100.00, 'MSFT', 'stock', 'Microsoft', 5, 200.00]
        );

        const response = await request(app).get('/api/get-cost');

        expect(response.statusCode).toBe(200);
        
        const costs = response.body;
        // Total stock cost = (10 * 100) + (5 * 200) = 1000 + 1000 = 2000
        expect(costs.stock).toBe(2000);
        expect(costs.etf).toBe(0);
        expect(costs.bond).toBe(0);
    });
});