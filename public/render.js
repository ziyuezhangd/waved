// render.js

import { portfolioState } from "./state.js";

// 更新状态时调用的对应渲染函数
async function renderTotalValue() {
    try {
        const { totalValue } = portfolioState; 

        const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        });

        // 更新资产分类的数值
        document.getElementById('stocksValue').textContent = formatter.format(totalValue.Stocks);
        document.getElementById('etfsValue').textContent = formatter.format(totalValue.ETFs);
        document.getElementById('bondsValue').textContent = formatter.format(totalValue.Bonds);
        document.getElementById('cashValue').textContent = formatter.format(Number(totalValue.Cash).toFixed(2));

        // 更新总资产
        const total = totalValue.Stocks + totalValue.ETFs + totalValue.Bonds + Number(totalValue.Cash);
        document.getElementById('totalValue').textContent = formatter.format(total);
    } catch (err) {
        console.error('Failed to fetch total value data:', err);
    }
}

async function renderTotalReturn() {
    try {
        const { totalValue, totalCost } = portfolioState; 

        const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        });

        // 计算每类的收益
        const stocksReturn = totalValue.Stocks - totalCost.stock;
        const etfsReturn = totalValue.ETFs - totalCost.etf;
        const bondsReturn = totalValue.Bonds - totalCost.bond;
        // 计算每类的百分比
        const stocksPercent = (stocksReturn / totalCost.stock) * 100;
        const etfsPercent = (etfsReturn / totalCost.etf) * 100;
        const bondsPercent = (bondsReturn / totalCost.bond) * 100;

        // 设置函数：更新百分比文本和颜色
        function setPercent(id, percent) {
            const el = document.getElementById(id);
            const sign = percent > 0 ? '+' : percent < 0 ? '-' : '';
            el.textContent = sign + Math.abs(percent).toFixed(2) + '%';

            el.classList.remove('text-green-600', 'text-red-600');
            if (percent > 0) {
                el.classList.add('text-green-600');
            } else if (percent < 0) {
                el.classList.add('text-red-600');
            } else {
                el.classList.add('text-gray-600'); // 0 时灰色
            }
        }

        // 更新资产分类的数值
        document.getElementById('stocksReturn').textContent = formatter.format(stocksReturn);
        document.getElementById('etfsReturn').textContent = formatter.format(etfsReturn);
        document.getElementById('bondsReturn').textContent = formatter.format(bondsReturn);
        setPercent('stocksReturnPercent', stocksPercent);
        setPercent('etfsReturnPercent', etfsPercent);
        setPercent('bondsReturnPercent', bondsPercent);

        // 更新总资产
        const total = stocksReturn + etfsReturn + bondsReturn;
        document.getElementById('totalReturn').textContent = formatter.format(total);
    } catch (err) {
        console.error('Failed to fetch total return data:', err);
    }
}

async function renderCash() {
    try {
        const { totalValue } = portfolioState;
        let cash = Number(totalValue.Cash) || 0;

        document.getElementById('cashValue').textContent = formatter.format(cash.toFixed(2));
    } catch (err) {
        console.error('Failed to fetch cash data:', err);
    }
}

async function renderStockPerformance() {

}

async function renderAssetAllocation() {

}

async function renderPortfolio() {
    
}


export function updateCash() {
  renderTotalValue();
  renderCash();
  renderAssetAllocation();
}

export function updateAssets() {
  renderTotalValue();
  renderTotalReturn();
  renderCash();
  renderStockPerformance();
  renderAssetAllocation();
  renderPortfolio();
}
