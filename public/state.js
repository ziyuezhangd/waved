// state.js

// 统一存储所有全局数据
export const portfolioState = {
    totalValue: {},  // 后端返回的是 { Stocks, ETFs, Bonds, Cash } 
    totalCost: {},  // 后端返回的是 { stock, etf, bond }
    top3Symbols: {},
    portfolioDetails: {}
};