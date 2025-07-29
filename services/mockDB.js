const mockAllAssets = {
    "Stocks": 22000,
    "ETFs": 15000,
    "Bonds": 8000,
    "Cash": 5000,
};
const mockCash = 70000;



export const getAllAssets = async () => {
    return mockAllAssets;
};

export const getCash = async () => {
    return mockCash;
};