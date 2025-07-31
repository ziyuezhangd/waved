const mockAllAssets = {
    "Stocks": 22000,
    "ETFs": 15000,
    "Bonds": 8000,
    "Cash": 5000,
};
const mockAllReturns = {
    "Stocks": 3600,
    "ETFs": 1800,
    "Bonds": 400,
};
const mockCash = 70000;
const mockAllSymbols = ["AAPL", "AMZN", "TSLA", "MSFT", "SPY", "BND", "AGG", "^IRX", "ZN=F"];
const mockAllPortfolio = [
    {"asset_symbol": "AAPL","asset_name": "Apple Inc.","asset_type": "stock","price_per_unit": 150.25,"quantity": 100,"total_amount": 15025},
    {"asset_symbol": "AMZN","asset_name": "Amazon.com Inc.","asset_type": "stock","price_per_unit": 3200.50,"quantity": 50,"total_amount": 160025},
    {"asset_symbol": "TSLA","asset_name": "Tesla Inc.","asset_type": "stock","price_per_unit": 700.75,"quantity": 30,"total_amount": 21022.5},
    {"asset_symbol": "MSFT","asset_name": "Microsoft Corporation","asset_type": "stock","price_per_unit": 280.00,"quantity": 40,"total_amount": 11200},
    {"asset_symbol": "SPY", "asset_name": "SPDR S&P 500 ETF Trust","asset_type": "etf","price_per_unit": 450.00,"quantity": 20,"total_amount": 9000},
    {"asset_symbol": "BND","asset_name": "Vanguard Total Bond Market ETF","asset_type": "etf","price_per_unit": 85.00,"quantity": 100,"total_amount": 8500},
    {"asset_symbol": "AGG","asset_name": "iShares Core U.S. Aggregate Bond ETF","asset_type": "etf","price_per_unit": 110.00,"quantity": 50,"total_amount": 5500},
    {"asset_symbol": "^IRX","asset_name": "CBOE Interest Rate 10 Year","asset_type": "bond","price_per_unit": 120.00,"quantity": 25,"total_amount": 3000},
    {"asset_symbol": "ZN=F","asset_name": "CBOT 10 Year T-Note","asset_type": "bond","price_per_unit": 130.00,"quantity": 20,"total_amount": 2600}
];


// Returns data for all assets (example:{"Stocks": 22000, "ETFs": 15000, "Bonds": 8000, "Cash": 5000,})
export const getAllAssets = async () => {
    return mockAllAssets;
};

// Returns data for all returns (example:{"Stocks": 3600, "ETFs": 1800, "Bonds": 400,})
export const getAllReturns = async () => {
    return mockAllReturns;
};

// Returns cash amount (example: 70000)
export const getCash = async () => {
    return mockCash;
};

// Returns data for all symbols (example: ["AAPL", "AMZN", "TSLA", "MSFT", "SPY", "BND", "AGG", "^IRX", "ZN=F"])
export const getAllSymbols = async () => {
    return mockAllSymbols;
};

// Returns data for all portfolio (fields: asset_symbol, asset_name, asset_type, price_per_unit, quantity, total_amount)
// NOTE: 此处需要计算! 每个资产可能从数据库返回多条交易记录，需根据buy/sell计算总量、均价和总金额再返回
export const getAllPortfolio = async () => {
    return mockAllPortfolio;
};

// Returns data for a single asset in portfolio (fields: asset_symbol, asset_name, asset_type, price_per_unit, quantity, total_amount)
// NOTE: 此处需要计算! 每个资产可能从数据库返回多条交易记录，需根据buy/sell计算总量、均价和总金额再返回
export const getSinglePortfolio = async (symbol) => {
    const asset = mockAllPortfolio.find(asset => asset.asset_symbol === symbol);
    if (!asset) {
        throw new Error(`Asset with symbol ${symbol} not found`);
    }
    return asset;
};

export const addPortfolio = async (symbol, quantity, price, trade_time) => {
    console.log("Adding completed.");
};

export const deletePortfolio = async (symbol) => {
    console.log("Deleting completed.");
};

export const updatePortfolio = async (symbol, quantity, price, trade_time) => {
    console.log("Updating completed.");
}