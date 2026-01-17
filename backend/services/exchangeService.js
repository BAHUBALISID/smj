const pool = require('../config/database');
const { generateExchangeNumber } = require('../utils/exchangeNumberGenerator');
const { generateToken } = require('../utils/qrToken');
const { getLatestRate } = require('../utils/rateEngine');
const { calculateNetWeight, calculateMetalValue, calculateMakingCharges, calculateItemTotal } = require('../utils/calculations');

const createExchange = async (exchangeData, items, photos, userId, userRole) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const exchangeNumber = await generateExchangeNumber();
    const qrToken = generateToken();
    
    let customerId = null;
    
    if (exchangeData.customer_phone) {
      const [existingCustomer] = await connection.execute(
        'SELECT id FROM customers WHERE phone = ?',
        [exchangeData.customer_phone]
      );
      
      if (existingCustomer.length > 0) {
        customerId = existingCustomer[0].id;
      } else {
        const [newCustomer] = await connection.execute(
          'INSERT INTO customers (name, phone) VALUES (?, ?)',
          [exchangeData.customer_name, exchangeData.customer_phone]
        );
        
        customerId = newCustomer.insertId;
      }
    }
    
    const [exchangeResult] = await connection.execute(
      `INSERT INTO exchanges 
       (exchange_number, customer_id, customer_name, customer_phone,
        old_bill_number, old_item_description, settlement_type,
        cash_amount, cash_payment_mode, total_old_value, total_new_value,
        difference_amount, notes, qr_token, created_by, created_by_role) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        exchangeNumber, customerId, exchangeData.customer_name, exchangeData.customer_phone,
        exchangeData.old_bill_number, exchangeData.old_item_description, exchangeData.settlement_type,
        exchangeData.cash_amount, exchangeData.cash_payment_mode, exchangeData.total_old_value,
        exchangeData.total_new_value, exchangeData.difference_amount, exchangeData.notes,
        qrToken, userId, userRole
      ]
    );
    
    const exchangeId = exchangeResult.insertId;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      const metalRate = await getLatestRate(item.metal_type, item.purity);
      
      const netWeight = calculateNetWeight(item.gross_weight, item.less_weight);
      const metalValue = calculateMetalValue(netWeight, metalRate);
      const makingCharges = calculateMakingCharges(item.making_charges, item.discount_percent);
      
      const itemTotal = calculateItemTotal(metalValue, makingCharges, item.stone_charge, item.huid_charge, 0, 0, 0);
      
      await connection.execute(
        `INSERT INTO exchange_items 
         (exchange_id, description, metal_type, purity, unit, quantity,
          gross_weight, less_weight, net_weight, making_type, making_charges,
          discount_percent, stone_charge, huid_charge, huid_number,
          diamond_certificate, metal_rate, metal_value, item_total, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          exchangeId, item.description, item.metal_type, item.purity, item.unit, item.quantity,
          item.gross_weight, item.less_weight, netWeight, item.making_type, item.making_charges,
          item.discount_percent, item.stone_charge, item.huid_charge, item.huid_number,
          item.diamond_certificate, metalRate, metalValue, itemTotal, item.notes
        ]
      );
    }
    
    for (const photo of photos) {
      await connection.execute(
        'INSERT INTO exchange_photos (exchange_id, photo_path, photo_type, description) VALUES (?, ?, ?, ?)',
        [exchangeId, photo.path, photo.type, photo.description]
      );
    }
    
    await connection.commit();
    
    return {
      exchangeId,
      exchangeNumber,
      qrToken
    };
    
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const getExchangeByToken = async (token) => {
  const [exchanges] = await pool.execute(
    `SELECT e.*,
     DATE_FORMAT(e.created_at, '%d/%m/%Y %H:%i:%s') as created_at_formatted,
     u.name as created_by_name
     FROM exchanges e
     LEFT JOIN users u ON e.created_by = u.id
     WHERE e.qr_token = ?`,
    [token]
  );
  
  if (exchanges.length === 0) {
    throw new Error('Exchange not found');
  }
  
  const exchange = exchanges[0];
  
  const [items] = await pool.execute(
    `SELECT *
     FROM exchange_items 
     WHERE exchange_id = ? 
     ORDER BY id`,
    [exchange.id]
  );
  
  const [photos] = await pool.execute(
    `SELECT *
     FROM exchange_photos 
     WHERE exchange_id = ? 
     ORDER BY photo_type, created_at`,
    [exchange.id]
  );
  
  exchange.items = items;
  exchange.photos = photos;
  
  return exchange;
};

const searchExchanges = async (searchTerm, limit = 20) => {
  const [rows] = await pool.execute(
    `SELECT e.id, e.exchange_number, e.customer_name, e.customer_phone,
     e.settlement_type, e.total_old_value, e.total_new_value, e.difference_amount,
     DATE_FORMAT(e.created_at, '%d/%m/%Y %H:%i:%s') as created_at
     FROM exchanges e
     WHERE e.exchange_number LIKE ? OR e.customer_name LIKE ? OR e.customer_phone LIKE ?
     ORDER BY e.created_at DESC
     LIMIT ?`,
    [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, limit]
  );
  
  return rows;
};

const getExchangeStats = async (startDate, endDate) => {
  const [stats] = await pool.execute(
    `SELECT 
      COUNT(*) as total_exchanges,
      SUM(CASE WHEN settlement_type = 'cash' THEN 1 ELSE 0 END) as cash_settlements,
      SUM(CASE WHEN settlement_type = 'new_item' THEN 1 ELSE 0 END) as item_settlements,
      SUM(total_old_value) as total_old_value,
      SUM(total_new_value) as total_new_value,
      SUM(difference_amount) as total_difference,
      AVG(difference_amount) as avg_difference
     FROM exchanges 
     WHERE created_at BETWEEN ? AND ?`,
    [startDate, endDate]
  );
  
  return stats[0];
};

module.exports = {
  createExchange,
  getExchangeByToken,
  searchExchanges,
  getExchangeStats
};
