-- Create database
CREATE DATABASE IF NOT EXISTS jewellery_db;
USE jewellery_db;

-- Users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'manager', 'staff') DEFAULT 'staff',
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Customers table
CREATE TABLE customers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    phone_alt VARCHAR(20),
    aadhaar VARCHAR(12),
    pan VARCHAR(10),
    gst_number VARCHAR(15),
    address TEXT,
    date_of_birth DATE,
    notes TEXT,
    total_purchases DECIMAL(12,2) DEFAULT 0,
    last_purchase_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_phone (phone),
    INDEX idx_name (name)
);

-- Inventory (product names only)
CREATE TABLE inventory (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50),
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_name (name)
);

-- Metal rates table
CREATE TABLE metal_rates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    metal_type ENUM('GOLD', 'SILVER', 'DIAMOND', 'PLATINUM', 'OTHER') NOT NULL,
    purity VARCHAR(20) NOT NULL,
    rate_per_gm DECIMAL(10,2) NOT NULL,
    auto_calculate BOOLEAN DEFAULT FALSE,
    base_metal VARCHAR(20),
    base_purity VARCHAR(20),
    effective_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_metal_purity (metal_type, purity),
    INDEX idx_effective (effective_from)
);

-- Bills table
CREATE TABLE bills (
    id INT PRIMARY KEY AUTO_INCREMENT,
    bill_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INT,
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_aadhaar VARCHAR(12),
    customer_pan VARCHAR(10),
    customer_gst VARCHAR(15),
    customer_address TEXT,
    bill_type ENUM('normal', 'advance') DEFAULT 'normal',
    bill_status ENUM('pending', 'partial', 'paid') DEFAULT 'paid',
    gst_type ENUM('none', 'intra_state', 'inter_state') DEFAULT 'none',
    gst_number VARCHAR(15),
    business_name VARCHAR(200),
    business_address TEXT,
    total_gross_weight DECIMAL(10,3) DEFAULT 0,
    total_net_weight DECIMAL(10,3) DEFAULT 0,
    total_metal_value DECIMAL(12,2) DEFAULT 0,
    total_making_charges DECIMAL(12,2) DEFAULT 0,
    total_discount DECIMAL(12,2) DEFAULT 0,
    total_stone_charge DECIMAL(12,2) DEFAULT 0,
    total_huid_charge DECIMAL(12,2) DEFAULT 0,
    total_taxable_value DECIMAL(12,2) DEFAULT 0,
    total_cgst DECIMAL(12,2) DEFAULT 0,
    total_sgst DECIMAL(12,2) DEFAULT 0,
    total_igst DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    remaining_amount DECIMAL(12,2) DEFAULT 0,
    advance_lock_date DATE,
    notes TEXT,
    qr_token VARCHAR(100) UNIQUE,
    created_by INT,
    created_by_role VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_bill_number (bill_number),
    INDEX idx_customer_phone (customer_phone),
    INDEX idx_created_at (created_at),
    INDEX idx_status (bill_status)
);

-- Bill items table
CREATE TABLE bill_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    bill_id INT NOT NULL,
    item_index INT NOT NULL,
    description VARCHAR(500) NOT NULL,
    metal_type ENUM('GOLD', 'SILVER', 'DIAMOND', 'PLATINUM', 'OTHER') NOT NULL,
    purity VARCHAR(20) NOT NULL,
    unit ENUM('GM', 'PCS') DEFAULT 'GM',
    quantity DECIMAL(10,3) DEFAULT 1,
    gross_weight DECIMAL(10,3) DEFAULT 0,
    less_weight DECIMAL(10,3) DEFAULT 0,
    net_weight DECIMAL(10,3) DEFAULT 0,
    loss_reason ENUM('NONE', 'DIAMOND', 'STONE', 'POLISH', 'DUST', 'REFINING', 'OTHER') DEFAULT 'NONE',
    loss_note TEXT,
    making_type VARCHAR(50),
    making_charges DECIMAL(10,2) DEFAULT 0,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    stone_charge DECIMAL(10,2) DEFAULT 0,
    huid_charge DECIMAL(10,2) DEFAULT 0,
    huid_number VARCHAR(50),
    diamond_certificate VARCHAR(100),
    metal_rate DECIMAL(10,2) NOT NULL,
    metal_value DECIMAL(12,2) DEFAULT 0,
    gst_percent DECIMAL(5,2) DEFAULT 0,
    making_gst_percent DECIMAL(5,2) DEFAULT 0,
    taxable_value DECIMAL(12,2) DEFAULT 0,
    cgst DECIMAL(12,2) DEFAULT 0,
    sgst DECIMAL(12,2) DEFAULT 0,
    igst DECIMAL(12,2) DEFAULT 0,
    item_total DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
    INDEX idx_bill_id (bill_id)
);

-- Bill item photos
CREATE TABLE bill_item_photos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    bill_item_id INT NOT NULL,
    photo_path VARCHAR(500) NOT NULL,
    photo_type ENUM('item', 'certificate') DEFAULT 'item',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bill_item_id) REFERENCES bill_items(id) ON DELETE CASCADE
);

-- Bill payments
CREATE TABLE bill_payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    bill_id INT NOT NULL,
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_mode ENUM('cash', 'card', 'upi', 'bank_transfer', 'cheque') DEFAULT 'cash',
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    transaction_id VARCHAR(100),
    cheque_number VARCHAR(50),
    bank_name VARCHAR(100),
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Exchanges table
CREATE TABLE exchanges (
    id INT PRIMARY KEY AUTO_INCREMENT,
    exchange_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INT,
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    old_bill_number VARCHAR(50),
    old_item_description TEXT,
    settlement_type ENUM('cash', 'new_item') NOT NULL,
    cash_amount DECIMAL(12,2) DEFAULT 0,
    cash_payment_mode VARCHAR(50),
    total_old_value DECIMAL(12,2) DEFAULT 0,
    total_new_value DECIMAL(12,2) DEFAULT 0,
    difference_amount DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    qr_token VARCHAR(100) UNIQUE,
    created_by INT,
    created_by_role VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_exchange_number (exchange_number)
);

-- Exchange items (new items)
CREATE TABLE exchange_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    exchange_id INT NOT NULL,
    description VARCHAR(500) NOT NULL,
    metal_type ENUM('GOLD', 'SILVER', 'DIAMOND', 'PLATINUM', 'OTHER') NOT NULL,
    purity VARCHAR(20) NOT NULL,
    unit ENUM('GM', 'PCS') DEFAULT 'GM',
    quantity DECIMAL(10,3) DEFAULT 1,
    gross_weight DECIMAL(10,3) DEFAULT 0,
    less_weight DECIMAL(10,3) DEFAULT 0,
    net_weight DECIMAL(10,3) DEFAULT 0,
    making_type VARCHAR(50),
    making_charges DECIMAL(10,2) DEFAULT 0,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    stone_charge DECIMAL(10,2) DEFAULT 0,
    huid_charge DECIMAL(10,2) DEFAULT 0,
    huid_number VARCHAR(50),
    diamond_certificate VARCHAR(100),
    metal_rate DECIMAL(10,2) NOT NULL,
    metal_value DECIMAL(12,2) DEFAULT 0,
    item_total DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exchange_id) REFERENCES exchanges(id) ON DELETE CASCADE
);

-- Exchange photos
CREATE TABLE exchange_photos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    exchange_id INT NOT NULL,
    photo_path VARCHAR(500) NOT NULL,
    photo_type ENUM('old_item', 'new_item') NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exchange_id) REFERENCES exchanges(id) ON DELETE CASCADE
);

-- Settings table
CREATE TABLE settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(50),
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- SMS/WhatsApp logs
CREATE TABLE notification_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT,
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    notification_type ENUM('birthday', 'reminder', 'payment'),
    message_type ENUM('whatsapp', 'sms'),
    message TEXT,
    status ENUM('sent', 'failed', 'delivered', 'undelivered'),
    twilio_sid VARCHAR(100),
    error_message TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Insert default admin user (password: Admin@123)
INSERT INTO users (name, email, password, role, phone, is_active) VALUES
('Administrator', 'admin@mahakaleshwar.com', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrqK3.7Zg.5L7H6QoYVn7iGtQ2WqJXW', 'admin', '9999999999', TRUE);

-- Insert default metal rates
INSERT INTO metal_rates (metal_type, purity, rate_per_gm, auto_calculate, is_active) VALUES
('GOLD', '24K', 6000.00, FALSE, TRUE),
('GOLD', '22K', 5500.00, TRUE, TRUE),
('GOLD', '18K', 4500.00, TRUE, TRUE),
('GOLD', '14K', 3500.00, TRUE, TRUE),
('GOLD', '10K', 2500.00, TRUE, TRUE),
('GOLD', '8K', 2000.00, TRUE, TRUE),
('SILVER', '999', 80.00, FALSE, TRUE),
('SILVER', '925', 74.00, TRUE, TRUE),
('SILVER', '900', 72.00, TRUE, TRUE),
('SILVER', '800', 64.00, TRUE, TRUE),
('DIAMOND', 'VVS', 50000.00, FALSE, TRUE),
('DIAMOND', 'VS', 30000.00, FALSE, TRUE),
('DIAMOND', 'SI', 15000.00, FALSE, TRUE),
('DIAMOND', 'I', 8000.00, FALSE, TRUE),
('PLATINUM', '950', 3500.00, FALSE, TRUE),
('PLATINUM', '900', 3300.00, TRUE, TRUE);

-- Insert default inventory items
INSERT INTO inventory (name, category) VALUES
('Gold Necklace', 'NECKLACE'),
('Gold Bracelet', 'BRACELET'),
('Gold Ring', 'RING'),
('Gold Earrings', 'EARRINGS'),
('Silver Chain', 'CHAIN'),
('Diamond Ring', 'DIAMOND'),
('Platinum Pendant', 'PENDANT'),
('Gold Bangles', 'BANGLE'),
('Silver Anklet', 'ANKLET'),
('Gold Mangalsutra', 'MANGALSUTRA');
