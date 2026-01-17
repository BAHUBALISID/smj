const pool = require('../config/database');
const { formatDate } = require('../utils/dateTime');

const createCustomer = async (customerData) => {
  const {
    name,
    phone,
    phone_alt,
    aadhaar,
    pan,
    gst_number,
    address,
    date_of_birth,
    notes
  } = customerData;
  
  const [existing] = await pool.execute(
    'SELECT id FROM customers WHERE phone = ?',
    [phone]
  );
  
  if (existing.length > 0) {
    throw new Error('Customer with this phone already exists');
  }
  
  const [result] = await pool.execute(
    `INSERT INTO customers 
     (name, phone, phone_alt, aadhaar, pan, gst_number, address, date_of_birth, notes) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, phone, phone_alt, aadhaar, pan, gst_number, address, date_of_birth, notes]
  );
  
  return result.insertId;
};

const searchCustomers = async (searchTerm, limit = 20) => {
  const [rows] = await pool.execute(
    `SELECT id, name, phone, phone_alt, 
     DATE_FORMAT(date_of_birth, '%d/%m/%Y') as date_of_birth,
     total_purchases, 
     DATE_FORMAT(last_purchase_date, '%d/%m/%Y') as last_purchase_date,
     DATE_FORMAT(created_at, '%d/%m/%Y %H:%i:%s') as created_at
     FROM customers 
     WHERE name LIKE ? OR phone LIKE ? 
     ORDER BY last_purchase_date DESC, created_at DESC 
     LIMIT ?`,
    [`%${searchTerm}%`, `%${searchTerm}%`, limit]
  );
  
  return rows;
};

const getCustomerById = async (customerId) => {
  const [rows] = await pool.execute(
    `SELECT *, 
     DATE_FORMAT(date_of_birth, '%d/%m/%Y') as date_of_birth,
     DATE_FORMAT(created_at, '%d/%m/%Y %H:%i:%s') as created_at
     FROM customers WHERE id = ?`,
    [customerId]
  );
  
  if (rows.length === 0) {
    throw new Error('Customer not found');
  }
  
  return rows[0];
};

const updateCustomer = async (customerId, customerData) => {
  const {
    name,
    phone,
    phone_alt,
    aadhaar,
    pan,
    gst_number,
    address,
    date_of_birth,
    notes
  } = customerData;
  
  await pool.execute(
    `UPDATE customers 
     SET name = ?, phone = ?, phone_alt = ?, aadhaar = ?, pan = ?, 
         gst_number = ?, address = ?, date_of_birth = ?, notes = ?, 
         updated_at = NOW() 
     WHERE id = ?`,
    [name, phone, phone_alt, aadhaar, pan, gst_number, address, date_of_birth, notes, customerId]
  );
  
  return true;
};

const getCustomerPurchaseHistory = async (customerId) => {
  const [bills] = await pool.execute(
    `SELECT 
       b.id,
       b.bill_number,
       b.bill_type,
       b.bill_status,
       b.total_amount,
       b.paid_amount,
       b.remaining_amount,
       b.total_net_weight,
       DATE_FORMAT(b.created_at, '%d/%m/%Y %H:%i:%s') as created_at,
       GROUP_CONCAT(DISTINCT bi.description) as items
     FROM bills b
     LEFT JOIN bill_items bi ON b.id = bi.bill_id
     WHERE b.customer_id = ?
     GROUP BY b.id
     ORDER BY b.created_at DESC`,
    [customerId]
  );
  
  const [exchanges] = await pool.execute(
    `SELECT 
       e.id,
       e.exchange_number,
       e.settlement_type,
       e.total_old_value,
       e.total_new_value,
       e.difference_amount,
       DATE_FORMAT(e.created_at, '%d/%m/%Y %H:%i:%s') as created_at
     FROM exchanges e
     WHERE e.customer_id = ?
     ORDER BY e.created_at DESC`,
    [customerId]
  );
  
  return { bills, exchanges };
};

const getTodaysBirthdays = async () => {
  const [rows] = await pool.execute(
    `SELECT id, name, phone 
     FROM customers 
     WHERE MONTH(date_of_birth) = MONTH(CURRENT_DATE()) 
     AND DAY(date_of_birth) = DAY(CURRENT_DATE())
     AND phone IS NOT NULL AND phone != ''`
  );
  
  return rows;
};

const getCustomerStats = async () => {
  const [stats] = await pool.execute(
    `SELECT 
      COUNT(*) as total_customers,
      COUNT(CASE WHEN date_of_birth IS NOT NULL THEN 1 END) as has_dob,
      COUNT(CASE WHEN gst_number IS NOT NULL THEN 1 END) as has_gst,
      COUNT(CASE WHEN total_purchases > 0 THEN 1 END) as has_purchases,
      SUM(total_purchases) as total_sales,
      AVG(total_purchases) as avg_sales
     FROM customers`
  );
  
  return stats[0];
};

module.exports = {
  createCustomer,
  searchCustomers,
  getCustomerById,
  updateCustomer,
  getCustomerPurchaseHistory,
  getTodaysBirthdays,
  getCustomerStats
};
