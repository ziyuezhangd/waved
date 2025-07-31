// chartInit
    document.addEventListener('DOMContentLoaded', function() {
        const portfolioChart = echarts.init(document.getElementById('portfolioChart'));
        const allocationChart = echarts.init(document.getElementById('allocationChart'));

        //Initial chart options
        let currrentSymbol = 'null';

        // 初始配置
        const portfolioOption = {
            animation: false,
            grid: { left: 60, right: 20, top: 40, bottom: 50 },
            xAxis: {
                type: 'category',
                data: [],
                name: 'Date',
                nameLocation: 'middle',
                nameGap: 25,
                axisLabel: {
                    color: '#6b7280',
                    formatter: function (value) {
                        return value.slice(5); // 显示 MM-DD
                    }
                }
            },
            yAxis: {
                type: 'value',
                name: 'Price (USD)',       // 纵轴标题
                nameLocation: 'middle',
                nameGap: 40,
                axisLabel: { color: '#6b7280' },
                min: function (value) {
                    const raw = value.min * 0.98;
                    return Math.floor(raw / 10) * 10;
                },
                max: function (value) {
                    const raw = value.max * 1.02;
                    return Math.ceil(raw / 10) * 10;
                }
            },
            series: [{
                name: 'Price',
                data: [],
                type: 'line',
                smooth: true,
                symbol: 'none',
                lineStyle: { color: '#1e40af', width: 3 }
            }],
            tooltip: { trigger: 'axis' }
        };
        portfolioChart.setOption(portfolioOption);

        async function fetchPerformanceData(symbol) {
            const res = await fetch(`/api/history_data/${symbol}`);
            return await res.json();
        }

        async function updatePortfolioChart(symbol) {
            try {
                const dataObj = await fetchPerformanceData(symbol);

                // 把对象转成数组并按日期排序
                const entries = Object.entries(dataObj).sort((a, b) => new Date(a[0]) - new Date(b[0]));
                const xAxisData = entries.map(e => e[0]);  // 日期
                const seriesData = entries.map(e => e[1]); // 价格

                portfolioOption.xAxis.data = xAxisData;
                portfolioOption.series[0].data = seriesData;

                portfolioChart.setOption(portfolioOption);
            } catch (e) {
                console.error("Error fetching chart data:", e);
            }
        }

        // 动态生成按钮并绑定事件
        async function initStockButtons() {
            try {
                const res = await fetch('/api/top-3-stock-symbols');
                const data = await res.json(); // { symbols: ["AAPL", "TSLA", "MSFT"] }

                const topSymbols = data.symbols || ["AAPL", "TSLA", "NVDA"];
                // const topSymbols = ["AAPL", "TSLA", "MSFT"];

                const btnContainer = document.querySelector('.lg\\:col-span-2 .flex.space-x-2');
                btnContainer.innerHTML = '';

                topSymbols.forEach((symbol, idx) => {
                    const btn = document.createElement('button');
                    btn.textContent = symbol;
                    btn.className = `px-3 py-1 text-sm font-medium rounded-button ${
                        idx === 0 ? 'text-primary bg-primary/10' : 'text-gray-600 hover:text-primary'
                    }`;

                    btn.addEventListener('click', () => {
                        // 更新按钮样式
                        btnContainer.querySelectorAll('button').forEach(b => {
                            b.className = 'px-3 py-1 text-sm font-medium text-gray-600 hover:text-primary rounded-button';
                        });
                        btn.className = 'px-3 py-1 text-sm font-medium text-primary bg-primary/10 rounded-button';

                        currentSymbol = symbol;
                        updatePortfolioChart(symbol);
                    });

                    btnContainer.appendChild(btn);
                });

                // 默认点击第一个按钮
                if (btnContainer.firstChild) {
                    btnContainer.firstChild.click();
                }
            } catch (err) {
                console.error('Failed to load holdings:', err);
            }
        }

        initStockButtons();

        // 动态获取资产分布数据并绘制饼图
        async function drawAllocationChart() {
            try {
                const res = await fetch('/api/portfolio-summary');
                const asset  = await res.json();

                const data = [
                    { value: asset.Stocks, name: 'Stocks', itemStyle: { color: 'rgba(87, 181, 231, 1)' } },
                    { value: asset.ETFs, name: 'ETFs', itemStyle: { color: 'rgba(141, 211, 199, 1)' } },
                    { value: asset.Bonds, name: 'Bonds', itemStyle: { color: 'rgba(251, 191, 114, 1)' } },
                    { value: asset.Cash, name: 'Cash', itemStyle: { color: 'rgba(252, 141, 98, 1)' } },
                ];

                const allocationChart = echarts.init(document.getElementById('allocationChart'));
                allocationChart.setOption({
                    animation: false,
                    series: [{
                        type: 'pie',
                        radius: ['40%', '70%'],
                        center: ['50%', '50%'],
                        data,
                        label: {
                            show: true,
                            formatter: '{b}', // 显示 name
                            fontSize: 12,
                            color: '#1f2937',
                            overflow: 'truncate', // 截断不要换行
                            width: 80, // 给定宽度（可按需调整）
                        },
                        labelLine: {
                            show: true,
                            length: 15,
                            length2: 10,
                            lineStyle: {
                                color: '#999'
                            }
                        },
                        itemStyle: { borderRadius: 4 }
                    }],
                    tooltip: {
                        trigger: 'item',
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        borderColor: '#e5e7eb',
                        textStyle: { color: '#1f2937' }
                    }
                });
            } catch (err) {
                console.error('Failed to draw allocation chart:', err);
            }
        }

        drawAllocationChart();

        window.addEventListener('resize', function() {
            portfolioChart.resize();
            const allocationChart = echarts.getInstanceByDom(document.getElementById('allocationChart'));
            if (allocationChart) allocationChart.resize();
        });
    });
// manageCashControls
    <script id="manageCashControls">
        document.addEventListener('DOMContentLoaded', async function() {
            const addAssetBtn = document.getElementById('addAssetBtn');
            const modal = document.getElementById('addAssetModal');
            const closeModal = document.getElementById('closeModal');
            const cancelBtn = document.getElementById('cancelBtn');
            const manageCashBtn = document.getElementById('manageCashBtn');
            const cashModal = document.getElementById('manageCashModal');
            const closeCashBtns = document.querySelectorAll('.closeCashModal');
            const depositBtn = document.getElementById('depositBtn');
            const withdrawBtn = document.getElementById('withdrawBtn');
            const manageCashForm = document.getElementById('manageCashForm');
            const cashAmountInput = document.getElementById('cashAmount');
            let transactionType = 'deposit';
            const res1 = await fetch('/api/cash-amount');
            const cash = await res1.json(); // 后端返回的是 { balance: 1000.00 }
            let currentCash = await Number(cash.balance) || 0.00; // 确保有初始值
            const cashValueElement = document.getElementById('cashValue');
            manageCashBtn.addEventListener('click', function() {
                cashModal.classList.remove('hidden');
            });
            closeCashBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    cashModal.classList.add('hidden');
                    resetCashForm();
                });
            });
            cashModal.addEventListener('click', function(e) {
                if (e.target === cashModal) {
                    cashModal.classList.add('hidden');
                    resetCashForm();
                }
            });
            depositBtn.addEventListener('click', function() {
                transactionType = 'deposit';
                depositBtn.classList.add('bg-primary', 'text-white');
                depositBtn.classList.remove('text-gray-700');
                withdrawBtn.classList.remove('bg-primary', 'text-white');
                withdrawBtn.classList.add('text-gray-700');
            });
            withdrawBtn.addEventListener('click', function() {
                transactionType = 'withdrawal';
                withdrawBtn.classList.add('bg-primary', 'text-white');
                withdrawBtn.classList.remove('text-gray-700');
                depositBtn.classList.remove('bg-primary', 'text-white');
                depositBtn.classList.add('text-gray-700');
            });
            manageCashForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                const amount = parseFloat(cashAmountInput.value);
                if (isNaN(amount) || amount <= 0) {
                    cashAmountInput.classList.add('border-red-500');
                    return;
                }
                if (transactionType === 'withdrawal' && amount > currentCash) {
                    cashAmountInput.classList.add('border-red-500');
                    return;
                }
                currentCash = transactionType === 'deposit' ? currentCash + amount : currentCash - amount;
                cashValueElement.textContent = `$${currentCash.toFixed(2)}`;
                // updateCashInChart();

                // 后端调用
                const message = {
                    transaction_type: transactionType,
                    amount: amount,
                }
                console.log(message);
                const res2 = await fetch("/api/cash-flow", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(message)
                });
                const data2 = await res2.json();
                console.log(data2);

                cashModal.classList.add('hidden');
                resetCashForm();
            });
            // 重置现金表单
            function resetCashForm() {
                cashAmountInput.value = '';
                cashAmountInput.classList.remove('border-red-500');
                transactionType = 'deposit';
                depositBtn.classList.add('bg-primary', 'text-white');
                depositBtn.classList.remove('text-gray-700');
                withdrawBtn.classList.remove('bg-primary', 'text-white');
                withdrawBtn.classList.add('text-gray-700');
            }
            // 更新现金在投资组合图表中的显示
            // function updateCashInChart() {
            //     const portfolioChart = echarts.getInstanceByDom(document.getElementById('portfolioChart'));
            //     const option = portfolioChart.getOption();
            //     const lastCashValue = option.series[4].data[option.series[4].data.length - 1];
            //     option.series[4].data[option.series[4].data.length - 1] = currentCash;
            //     option.series[0].data[option.series[0].data.length - 1] =
            //     option.series[0].data[option.series[0].data.length - 1] - lastCashValue + currentCash;
            //     portfolioChart.setOption(option);
            // }
            addAssetBtn.addEventListener('click', function() {
                modal.classList.remove('hidden');
            });
            closeModal.addEventListener('click', function() {
                modal.classList.add('hidden');
            });
            cancelBtn.addEventListener('click', function() {
                modal.classList.add('hidden');
            });
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        });
    </script>
    <script id="portfolioTableControls">
        // 加载投资组合表格数据
        async function loadPortfolioTable() {
            try {
                const response = await fetch('/api/all-portfolio');
                const data = await response.json();
                const tbody = document.getElementById("portfolio-body");
                tbody.innerHTML = "";

                for (const item of data) {
                    // 设置颜色
                    const isPositive = String(item.performance).trim().charAt(0) === '+';
                    const badgeColor = isPositive ? "green" : "red";

                    // 创建表格行
                    const row = document.createElement("tr");
                    let color = "blue";
                    if (item.asset_type === "etf") {
                        color = "purple";
                    } else if (item.asset_type === "bond") {
                        color = "yellow";
                    }

                    row.innerHTML = `
                        <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                        <div class="w-8 h-8 flex items-center justify-center bg-${color}-100 rounded-lg mr-3">
                        <i class="ri-${item.asset_type}-line text-${color}-600 text-sm"></i>
                        </div>
                        <div>
                        <div class="text-sm font-medium text-gray-900">${item.asset_name}</div>
                        <div class="text-sm text-gray-500 symbol">${item.asset_symbol}</div>
                        </div>
                        </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${Number(item.quantity).toFixed(0)}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">$${Number(item.avg_purchase_price).toFixed(2)}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" id="price-${item.asset_symbol}">$${Number(item.current_price).toFixed(2)}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">$${Number(item.total_value).toFixed(2)}</td>
                        <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${badgeColor}-100 text-${badgeColor}-800">
                        ${item.performance}
                        </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button class="text-primary hover:text-primary/80 buy-btn">Buy</button>
                        <button class="text-red-600 hover:text-red-800 sell-btn">Sell</button>
                        </td>
                    `;

                    tbody.appendChild(row);
                }

            } catch(err) {
                console.error("Failed to load portfolio", err);
            }
        };

        document.addEventListener("DOMContentLoaded", async function () {
            await loadPortfolioTable(); // 先加载表格

            // 绑定时间按钮事件
            const timeButtons = document.querySelectorAll('.lg\\:col-span-2 button');
            timeButtons.forEach(button => {
            button.addEventListener('click', function () {
                timeButtons.forEach(btn => {
                btn.classList.remove('text-primary', 'bg-primary/10');
                btn.classList.add('text-gray-600');
                });
                this.classList.remove('text-gray-600');
                this.classList.add('text-primary', 'bg-primary/10');
                });
            });

            // 绑定资产类别按钮事件
            const categoryButtons = document.querySelectorAll('.category-btn');
            categoryButtons.forEach(button => {
                button.addEventListener('click', function () {
                    categoryButtons.forEach(btn => {
                        btn.classList.remove('text-primary', 'bg-primary/10');
                        btn.classList.add('text-gray-600');
                    });
                    this.classList.remove('text-gray-600');
                    this.classList.add('text-primary', 'bg-primary/10');

                    const category = this.textContent.trim();
                    const rows = document.querySelectorAll("tbody tr"); // 每次点击时重新获取行

                    rows.forEach(row => {
                        const icon = row.querySelector(".ri-stock-line, .ri-etf-line, .ri-bond-line");
                        if (!icon) return;

                        const isStock = icon.classList.contains("ri-stock-line");
                        const isETF = icon.classList.contains("ri-etf-line");
                        const isBond = icon.classList.contains("ri-bond-line");

                        if (category === "All Assets" ||
                            (category === "Stocks" && isStock) ||
                            (category === "ETFs" && isETF) ||
                            (category === "Bonds" && isBond)) {
                            row.style.display = "";
                        } else {
                            row.style.display = "none";
                        }
                    });
                });
            });
        });
    </script>
// Total Value
        // async function updateTotalValue() {
        //     try {
        //         const res = await fetch('/api/portfolio-summary');
        //         const asset  = await res.json(); // 确保后端返回的是 { Stocks, ETFs, Bonds, Cash } 

        //         const formatter = new Intl.NumberFormat('en-US', {
        //             style: 'currency',
        //             currency: 'USD',
        //         });

        //         // 更新资产分类的数值
        //         document.getElementById('stocksValue').textContent = formatter.format(asset.Stocks);
        //         document.getElementById('etfsValue').textContent = formatter.format(asset.ETFs);
        //         document.getElementById('bondsValue').textContent = formatter.format(asset.Bonds);
        //         document.getElementById('cashValue').textContent = formatter.format(Number(asset.Cash).toFixed(2));
        //         document.getElementById('cashValue1').textContent = formatter.format(Number(asset.Cash).toFixed(2));

        //         // 更新总资产
        //         const total = asset.Stocks + asset.ETFs + asset.Bonds + Number(asset.Cash);
        //         document.getElementById('totalValue').textContent = formatter.format(total);
        //     } catch (err) {
        //         console.error('Failed to fetch asset data:', err);
        //     }
        // }

        // window.addEventListener('DOMContentLoaded', updateTotalValue);

// Total Return
        // async function updateTotalReturn() {
        //     try {
        //         const res = await fetch('/api/portfolio-summary');
        //         const value = await res.json(); // 后端返回的是 {  Stocks, ETFs, Bonds }
        //         console.log(value);
        //         const res1 = await fetch('/api/get-cost');  // 后端返回的是 { stock, etf, bond }
        //         const cost = await res1.json();
        //         console.log(cost)

        //         const formatter = new Intl.NumberFormat('en-US', {
        //             style: 'currency',
        //             currency: 'USD',
        //         });
        //         // 计算每类的收益
        //         const stocksReturn = value.Stocks - cost.stock;
        //         const etfsReturn = value.ETFs - cost.etf;
        //         const bondsReturn = value.Bonds - cost.bond;
        //         // 计算每类的百分比
        //         const stocksPercent = (stocksReturn / cost.stock) * 100;
        //         const etfsPercent = (etfsReturn / cost.etf) * 100;
        //         const bondsPercent = (bondsReturn / cost.bond) * 100;

        //         // 设置函数：更新百分比文本和颜色
        //         function setPercent(id, percent) {
        //             const el = document.getElementById(id);
        //             const sign = percent > 0 ? '+' : percent < 0 ? '-' : '';
        //             el.textContent = sign + Math.abs(percent).toFixed(2) + '%';

        //             el.classList.remove('text-green-600', 'text-red-600');
        //             if (percent > 0) {
        //                 el.classList.add('text-green-600');
        //             } else if (percent < 0) {
        //                 el.classList.add('text-red-600');
        //             } else {
        //                 el.classList.add('text-gray-600'); // 0 时灰色
        //             }
        //         }

        //         // 更新资产分类的数值
        //         document.getElementById('stocksReturn').textContent = formatter.format(stocksReturn);
        //         document.getElementById('etfsReturn').textContent = formatter.format(etfsReturn);
        //         document.getElementById('bondsReturn').textContent = formatter.format(bondsReturn);
        //         setPercent('stocksReturnPercent', stocksPercent);
        //         setPercent('etfsReturnPercent', etfsPercent);
        //         setPercent('bondsReturnPercent', bondsPercent);

        //         // 更新总资产
        //         const total = stocksReturn + etfsReturn + bondsReturn;
        //         document.getElementById('totalReturn').textContent = formatter.format(total);
        //     } catch (err) {
        //         console.error('Failed to fetch return data:', err);
        //     }
        // }
        // window.addEventListener('DOMContentLoaded', updateTotalReturn);

// Buy Sell
    <script id="buySellControls">
        function createTradeModal() {
            const modalHTML = `
                <div id="trade-modal" class="fixed inset-0 flex items-center justify-center bg-black/50 hidden">
                    <div class="bg-white p-6 rounded-lg shadow-lg w-96">
                        <h2 id="trade-title" class="text-xl font-semibold mb-4">Trade Asset</h2>
                        <label class="block mb-2">Quantity:</label>
                        <input id="trade-quantity" type="number" class="border p-2 w-full mb-3" />

                        <label class="block mb-2">Price:</label>
                        <input id="trade-price" type="number" class="border p-2 w-full mb-3" />

                        <label class="block mb-2">Date:</label>
                        <input id="trade-date" type="date" class="border p-2 w-full mb-3" />

                        <div class="flex justify-end space-x-3">
                            <button id="cancel-trade" class="px-4 py-2 bg-gray-300 rounded">Cancel</button>
                            <button id="confirm-trade" class="px-4 py-2 bg-blue-500 text-white rounded">Confirm</button>
                        </div>
                    </div>
                </div>
                `;
            document.body.insertAdjacentHTML("beforeend", modalHTML);
        }

        // 页面加载完后插入弹窗
        document.addEventListener("DOMContentLoaded", () => {
            createTradeModal();
            let currentTrade = { action: "", symbol: "", name:"", type: "" };

            // 给 Buy/Sell 按钮绑定事件
            document.addEventListener("click", (e) => {
                if (e.target.classList.contains("buy-btn") || e.target.classList.contains("sell-btn")) {
                    const isBuy = e.target.classList.contains("buy-btn");
                    currentTrade.action = isBuy ? "buy" : "sell";
                    // 获取当前行的基础信息
                    const row = e.target.closest("tr");
                    currentTrade.symbol = row.querySelector("td .symbol").textContent.trim();
                    const icon = row.querySelector("td i");
                    const className = icon.className;
                    const match = className.match(/ri-(.*?)-line/);
                    const assetType = match ? match[1] : null;
                    currentTrade.type = row.querySelector("td i").className.match(/ri-(.*?)-line/)[1];
                    document.getElementById("trade-title").textContent = isBuy ? "Buy Asset" : "Sell Asset";
                    document.getElementById("trade-quantity").value = "";
                    document.getElementById("trade-price").value = "";
                    document.getElementById("trade-modal").classList.remove("hidden");
                    
                }
            });

            // 绑定弹窗按钮事件
            // Cancel关闭弹窗
            document.getElementById("cancel-trade").addEventListener("click", () => {
                document.getElementById("trade-modal").classList.add("hidden");
            });
            // Confirm确认交易
            document.getElementById("confirm-trade").addEventListener("click", async () => {
                const quantity = parseInt(document.getElementById("trade-quantity").value);
                const price = parseFloat(document.getElementById("trade-price").value);
                const tradeDate = document.getElementById("trade-date").value;

                const payload = {
                    asset_symbol: currentTrade.symbol,
                    asset_type: currentTrade.type,
                    quantity: quantity,
                    price_per_unit: price,
                    trade_date: tradeDate,
                    action: currentTrade.action
                };
                console.log(payload);

                try {
                    let url = '/api/';
                    if (payload.action === "buy") {
                        url += 'buy-asset';
                    } else {
                        url += 'sell-asset';
                    }
                    const res = await fetch(url, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload)
                    });
                    const result = await res.json();
                    console.log("Trade success:", result);
                } catch (err) {
                    console.error("Trade failed:", err);
                }
                document.getElementById("trade-modal").classList.add("hidden");
            });
        });
    </script>
    <script id="addAssetControls">
        document.addEventListener("DOMContentLoaded", () => {
            const modal = document.getElementById("addAssetModal");
            const openBtn = document.getElementById("openAddAsset");
            const closeBtn = document.getElementById("closeModal");
            const cancelBtn = document.getElementById("cancelBtn");
            const form = modal.querySelector("form");

            // 打开弹窗
            openBtn.addEventListener("click", () => {
                modal.classList.remove("hidden");
            });

            // 关闭弹窗
            function closeModal() {
                modal.classList.add("hidden");
            }
            closeBtn.addEventListener("click", closeModal);
            cancelBtn.addEventListener("click", closeModal);

            // 提交表单
            form.addEventListener("submit", async (e) => {
                e.preventDefault();

                const assetType = document.getElementById("asset-type").value;
                const assetSymbol = form.querySelector("input[placeholder='e.g., AAPL']").value.trim();
                const quantity = parseInt(form.querySelector("input[placeholder='Enter quantity']").value);
                const purchasePrice = parseFloat(form.querySelector("input[placeholder='Enter purchase price']").value);
                const purchaseDate = form.querySelector("input[type='date']").value;

                const payload = { 
                    "asset_symbol":assetSymbol, 
                    "asset_type": assetType, 
                    "quantity": quantity, 
                    "price_per_unit": purchasePrice, 
                    "purchase_date": purchaseDate 
                };
                console.log(payload);

                // 请求后端
                try {
                    const res = await fetch("/api/buy-asset", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload)
                    });
                    const result = await res.json();
                    console.log("Trade success:", result);
                } catch (err) {
                    console.error("Trade failed:", err);
                }

                closeModal();
            });
        });
    </script>