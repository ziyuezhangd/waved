-- =====================================================================
-- Trading Journal Database Setup
--
-- This script creates a database and tables for tracking personal
-- trades, managing cash flow, and recording daily asset totals.
--
-- To use:
-- 1. Open MySQL Workbench.
-- 2. Go to File > Open SQL Script... and select this file.
-- 3. Execute the entire script.
-- =====================================================================

-- Drop the database if it already exists to start fresh
DROP DATABASE IF EXISTS `trading_journal`;

-- Create a new database for the trading journal
CREATE DATABASE `trading_journal`;

-- Select the newly created database for use
USE `trading_journal`;

-- =====================================================================
-- Trades Table
--
-- This table records all buy and sell transactions for assets like
-- stocks, ETFs, and bonds.
-- =====================================================================
CREATE TABLE `trades` (
    `trade_id` INT AUTO_INCREMENT PRIMARY KEY,
    `asset_symbol` VARCHAR(20) NOT NULL,
    `trade_time` DATETIME NOT NULL,
    `asset_type` ENUM('stock', 'etf', 'bond') NOT NULL,
    `asset_name` VARCHAR(255) NULL,
    `trade_type` ENUM('buy', 'sell') NOT NULL,
    `quantity` DECIMAL(18, 8) NOT NULL COMMENT 'Number of shares or units traded',
    `price_per_unit` DECIMAL(18, 8) NOT NULL COMMENT 'Price per single share or unit',
    `total_amount` DECIMAL(18, 4) GENERATED ALWAYS AS (`quantity` * `price_per_unit`) STORED COMMENT 'Total value of the trade',
    `notes` TEXT NULL COMMENT 'Optional notes for the trade',
    INDEX `idx_asset_symbol` (`asset_symbol`),
    INDEX `idx_trade_time` (`trade_time`),
    INDEX `idx_asset_type` (`asset_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Records individual asset trades.';


-- =====================================================================
-- Cash Flow Table
--
-- This table tracks all cash movements, including deposits,
-- withdrawals, dividends, and interest payments. This provides a
-- clear record of your cash balance changes over time.
-- =====================================================================
CREATE TABLE `cash_flow` (
    `cash_flow_id` INT AUTO_INCREMENT PRIMARY KEY,
    `transaction_time` DATETIME NOT NULL,
    `transaction_type` ENUM('deposit', 'withdrawal', 'dividend', 'interest', 'trade_settlement') NOT NULL,
    `amount` DECIMAL(18, 4) NOT NULL COMMENT 'Positive for inflows (deposits, dividends), negative for outflows (withdrawals)',
    `related_trade_id` INT NULL COMMENT 'Foreign key linking to the trades table if the cash flow is related to a trade',
    `notes` TEXT NULL COMMENT 'Optional notes for the cash transaction',
    INDEX `idx_transaction_time` (`transaction_time`),
    FOREIGN KEY (`related_trade_id`) REFERENCES `trades`(`trade_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Records all cash transactions.';


-- =====================================================================
-- Daily Asset Summary Table
--
-- This table stores a snapshot of the total asset value at the end
-- of each day. This is useful for tracking portfolio growth over time.
-- =====================================================================
CREATE TABLE `daily_asset_summary` (
    `summary_id` INT AUTO_INCREMENT PRIMARY KEY,
    `record_date` DATE NOT NULL UNIQUE COMMENT 'The date of the asset summary, ensuring one record per day.',
    `total_asset_value` DECIMAL(18, 4) NOT NULL COMMENT 'The total value of all assets (stocks, ETFs, bonds, and cash) on this date.',
    INDEX `idx_record_date` (`record_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Records the total portfolio value on a daily basis.';


-- =====================================================================
-- Example Data Insertion (Optional)
--
-- You can uncomment and run these lines to see how the tables work
-- with some sample data.
-- =====================================================================

/*
-- Example 1: Buying a stock
INSERT INTO `trades` (asset_symbol, trade_time, asset_type, asset_name, trade_type, quantity, price_per_unit, notes)
VALUES ('AAPL', '2023-10-26 10:00:00', 'stock', 'Apple Inc.', 'buy', 10, 170.50, 'Initial purchase');

-- Get the last inserted trade_id
SET @last_trade_id = LAST_INSERT_ID();

-- Record the corresponding cash settlement for the trade
INSERT INTO `cash_flow` (transaction_time, transaction_type, amount, related_trade_id, notes)
VALUES ('2023-10-26 10:00:00', 'trade_settlement', -1705.00, @last_trade_id, 'Cash used for AAPL purchase');


-- Example 2: Receiving a dividend
INSERT INTO `cash_flow` (transaction_time, transaction_type, amount, notes)
VALUES ('2023-11-15 09:30:00', 'dividend', 2.40, 'Dividend from AAPL');


-- Example 3: Selling an ETF
INSERT INTO `trades` (asset_symbol, trade_time, asset_type, asset_name, trade_type, quantity, price_per_unit, notes)
VALUES ('SPY', '2023-11-20 14:15:00', 'etf', 'SPDR S&P 500 ETF Trust', 'sell', 5, 450.75, 'Taking some profits');

SET @last_trade_id = LAST_INSERT_ID();

INSERT INTO `cash_flow` (transaction_time, transaction_type, amount, related_trade_id, notes)
VALUES ('2023-11-20 14:15:00', 'trade_settlement', 2253.75, @last_trade_id, 'Cash received from SPY sale');


-- Example 4: Recording end-of-day asset totals
INSERT INTO `daily_asset_summary` (record_date, total_asset_value)
VALUES
('2023-10-26', 10000.00),
('2023-10-27', 10150.25),
('2023-10-28', 10120.50);

*/
-- portfolio auto-generated definition
create table portfolio
(
    asset_type     enum ('stock', 'etf', 'bond') not null,
    asset_symbol   varchar(20)                   not null
        primary key,
    asset_name     varchar(255)                  not null,
    quantity       decimal(18, 8)                not null,
    avg_purchase_price decimal(18, 8)                not null
);

/*
INSERT INTO portfolio (asset_symbol, asset_type, asset_name, quantity, avg_purchase_price) VALUES
                                                                                           ('AAPL', 'stock', 'Apple Inc.', 50, 145.30),
                                                                                           ('MSFT', 'stock', 'Microsoft Corp.', 30, 310.00),
                                                                                           ('TSLA', 'stock', 'Tesla Inc.', 20, 245.50),
                                                                                           ('VUG', 'etf', 'Vanguard Growth ETF', 40, 285.00),
                                                                                           ('AGG', 'bond', 'iShares Core U.S. Aggregate Bond', 60, 98.50);
 */


-- =====================================================================
-- End of Script
-- =====================================================================
