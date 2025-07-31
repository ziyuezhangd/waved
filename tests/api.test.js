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