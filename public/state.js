// state.js

// 全局状态对象
export const portfolioState = {
    totalPortfolioValue: {},
    totalReturn: {},
    daysChange: {},
    cash: 0,
    portfolioPerformance: {},
    allAssets: [],
};

// 事件总线
export const EventBus = {
  events: {},

  // 订阅事件
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  },

  // 取消订阅
  off(event, callback) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  },

  // 触发事件
  emit(event, data) {
    if (!this.events[event]) return;
    this.events[event].forEach(callback => callback(data));
  }
};

// 修改状态的函数
function emitUpdate() {
  EventBus.emit("portfolioUpdated", { ...portfolioState });
};
export function updateTotalPortfolioValue(value) {
  portfolioState.totalPortfolioValue = value;
  emitUpdate();
};
export function updateTotalReturn(value) {
  portfolioState.totalReturn = value;
  emitUpdate();
};
export function updateDaysChange(value) {
  portfolioState.daysChange = value;
  emitUpdate();
};
export function updateCash(amount) {
  portfolioState.cash = amount;
  emitUpdate();
};
export function updatePortfolioPerformance(performance) {
  portfolioState.portfolioPerformance = performance;
  emitUpdate();
};
export function updateAllAssets(assets) {
  portfolioState.allAssets = assets;
  emitUpdate();
};