const pool = require('../config/database');
const { generateBillNumber, generatePaymentNumber } = require('../utils/billNumberGenerator');
const { generateToken } = require('../utils/qrToken');
const { getLatestRate } = require('../utils/rateEngine');
const { calculateNetWeight, calculateMetalValue, calculateMakingCharges, calculateTax, calculateItemTotal, generateBillSummary } = require('../utils/calculations');
const fs = require('fs');
const path = require('path');

const createBill = async (billData, items, photos, userId, userRole) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const billNumber = await generateBillNumber();
    const qrToken = generateToken();
    
    let customerId = null;
    
    if (billData.customer_phone) {
      const [existingCustomer] = await connection.execute(
        'SELECT id FROM customers WHERE phone = ?',
        [billData.customer_phone]
      );
      
      if (existingCustomer.length > 0) {
        customerId = existingCustomer[0].id;
        
        await connection.execute(
          `UPDATE customers 
           SET total_purchases = total_purchases + ?, 
               last_purchase_date = CURDATE() 
           WHERE id = ?`,
          [billData.total_amount, customerId]
        );
      } else {
        const [newCustomer] = await connection.execute(
          `INSERT INTO customers 
           (name, phone, aadhaar, pan, gst_number, address, total_purchases, last_purchase_date) 
           VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE())`,
          [billData.customer_name, billData.customer_phone, 
           billData.customer_aadhaar, billData.customer_pan, 
           billData.customer_gst, billData.customer_address, 
           billData.total_amount]
        );
        
        customerId = newCustomer.insertId;
      }
    }
    
    const [billResult] = await connection.execute(
      `INSERT INTO bills 
       (bill_number, customer_id, customer_name, customer_phone, 
        customer_aadhaar, customer_pan, customer_gst, customer_address,
        bill_type, bill_status, gst_type, gst_number, business_name, business_address,
        total_gross_weight, total_net_weight, total_metal_value, total_making_charges,
        total_discount, total_stone_charge, total_huid_charge, total_taxable_value,
        total_cgst, total_sgst, total_igst, total_amount, paid_amount, remaining_amount,
        advance_lock_date, notes, qr_token, created_by, created_by_role) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        billNumber, customerId, billData.customer_name, billData.customer_phone,
        billData.customer_aadhaar, billData.customer_pan, billData.customer_gst, billData.customer_address,
        billData.bill_type, billData.bill_status, billData.gst_type, billData.gst_number,
        billData.business_name, billData.business_address,
        billData.total_gross_weight, billData.total_net_weight, billData.total_metal_value,
        billData.total_making_charges, billData.total_discount, billData.total_stone_charge,
        billData.total_huid_charge, billData.total_taxable_value, billData.total_cgst,
        billData.total_sgst, billData.total_igst, billData.total_amount, billData.paid_amount,
        billData.remaining_amount, billData.advance_lock_date, billData.notes, qrToken,
        userId, userRole
      ]
    );
    
    const billId = billResult.insertId;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      const metalRate = await getLatestRate(item.metal_type, item.purity);
      
      const netWeight = calculateNetWeight(item.gross_weight, item.less_weight);
      const metalValue = calculateMetalValue(netWeight, metalRate);
      const makingCharges = calculateMakingCharges(item.making_charges, item.discount_percent);
      
      const taxableValue = metalValue + makingCharges + item.stone_charge + item.huid_charge;
      
      const tax = calculateTax(taxableValue, item.gst_percent, billData.gst_type);
      const itemTotal = calculateItemTotal(metalValue, makingCharges, item.stone_charge, item.huid_charge, tax.cgst, tax.sgst, tax.igst);
      
      const [itemResult] = await connection.execute(
        `INSERT INTO bill_items 
         (bill_id, item_index, description, metal_type, purity, unit, quantity,
          gross_weight, less_weight, net_weight, loss_reason, loss_note, making_type,
          making_charges, discount_percent, stone_charge, huid_charge, huid_number,
          diamond_certificate, metal_rate, metal_value, gst_percent, making_gst_percent,
          taxable_value, cgst, sgst, igst, item_total, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          billId, i, item.description, item.metal_type, item.purity, item.unit, item.quantity,
          item.gross_weight, item.less_weight, netWeight, item.loss_reason, item.loss_note,
          item.making_type, item.making_charges, item.discount_percent, item.stone_charge,
          item.huid_charge, item.huid_number, item.diamond_certificate, metalRate, metalValue,
          item.gst_percent, item.making_gst_percent, taxableValue, tax.cgst, tax.sgst, tax.igst,
          itemTotal, item.notes
        ]
      );
      
      const itemId = itemResult.insertId;
      
      if (photos[i] && photos[i].length > 0) {
        for (const photo of photos[i]) {
          await connection.execute(
            'INSERT INTO bill_item_photos (bill_item_id, photo_path) VALUES (?, ?)',
            [itemId, photo]
          );
        }
      }
    }
    
    if (billData.paid_amount > 0) {
      const paymentNumber = await generatePaymentNumber();
      
      await connection.execute(
        `INSERT INTO bill_payments 
         (bill_id, payment_number, amount, payment_mode, created_by) 
         VALUES (?, ?, ?, ?, ?)`,
        [billId, paymentNumber, billData.paid_amount, billData.payment_mode, userId]
      );
    }
    
    await connection.commit();
    
    return {
      billId,
      billNumber,
      qrToken
    };
    
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const getBillByToken = async (token) => {
  const [bills] = await pool.execute(
    `SELECT b.*, 
     DATE_FORMAT(b.created_at, '%d/%m/%Y %H:%i:%s') as created_at_formatted,
     DATE_FORMAT(b.advance_lock_date, '%d/%m/%Y') as advance_lock_date_formatted,
     u.name as created_by_name
     FROM bills b
     LEFT JOIN users u ON b.created_by = u.id
     WHERE b.qr_token = ?`,
    [token]
  );
  
  if (bills.length === 0) {
    throw new Error('Bill not found');
  }
  
  const bill = bills[0];
  
  const [items] = await pool.execute(
    `SELECT *,
     DATE_FORMAT(created_at, '%d/%m/%Y %H:%i:%s') as created_at
     FROM bill_items 
     WHERE bill_id = ? 
     ORDER BY item_index`,
    [bill.id]
  );
  
  const [photos] = await pool.execute(
    `SELECT bip.*, bi.item_index
     FROM bill_item_photos bip
     JOIN bill_items bi ON bip.bill_item_id = bi.id
     WHERE bi.bill_id = ?
     ORDER BY bi.item_index, bip.created_at`,
    [bill.id]
  );
  
  const [payments] = await pool.execute(
    `SELECT *,
     DATE_FORMAT(payment_date, '%d/%m/%Y %H:%i:%s') as payment_date_formatted
     FROM bill_payments 
     WHERE bill_id = ? 
     ORDER BY created_at`,
    [bill.id]
  );
  
  bill.items = items;
  bill.photos = photos;
  bill.payments = payments;
  
  return bill;
};

const searchBills = async (searchTerm, limit = 20) => {
  const [rows] = await pool.execute(
    `SELECT b.id, b.bill_number, b.customer_name, b.customer_phone,
     b.total_amount, b.bill_status, b.bill_type,
     DATE_FORMAT(b.created_at, '%d/%m/%Y %H:%i:%s') as created_at
     FROM bills b
     WHERE b.bill_number LIKE ? OR b.customer_name LIKE ? OR b.customer_phone LIKE ?
     ORDER BY b.created_at DESC
     LIMIT ?`,
    [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, limit]
  );
  
  return rows;
};

const getPendingBills = async (page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  
  const [rows] = await pool.execute(
    `SELECT b.*,
     DATE_FORMAT(b.created_at, '%d/%m/%Y %H:%i:%s') as created_at,
     SUM(bp.amount) as total_paid
     FROM bills b
     LEFT JOIN bill_payments bp ON b.id = bp.bill_id
     WHERE b.bill_status IN ('pending', 'partial') AND b.remaining_amount > 0
     GROUP BY b.id
     ORDER BY b.created_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  
  const [countResult] = await pool.execute(
    `SELECT COUNT(*) as total 
     FROM bills 
     WHERE bill_status IN ('pending', 'partial') AND remaining_amount > 0`
  );
  
  return {
    bills: rows,
    total: countResult[0].total,
    page,
    limit
  };
};

const addPayment = async (billId, paymentData, userId) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const paymentNumber = await generatePaymentNumber();
    
    await connection.execute(
      `INSERT INTO bill_payments 
       (bill_id, payment_number, amount, payment_mode, transaction_id, 
        cheque_number, bank_name, notes, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        billId, paymentNumber, paymentData.amount, paymentData.payment_mode,
        paymentData.transaction_id, paymentData.cheque_number,
        paymentData.bank_name, paymentData.notes, userId
      ]
    );
    
    const [bill] = await connection.execute(
      'SELECT paid_amount, remaining_amount, total_amount FROM bills WHERE id = ?',
      [billId]
    );
    
    if (bill.length === 0) {
      throw new Error('Bill not found');
    }
    
    const newPaidAmount = parseFloat(bill[0].paid_amount) + parseFloat(paymentData.amount);
    const newRemainingAmount = parseFloat(bill[0].total_amount) - newPaidAmount;
    
    let newStatus = 'partial';
    if (newRemainingAmount <= 0) {
      newStatus = 'paid';
    } else if (newPaidAmount > 0) {
      newStatus = 'partial';
    } else {
      newStatus = 'pending';
    }
    
    await connection.execute(
      `UPDATE bills 
       SET paid_amount = ?, remaining_amount = ?, bill_status = ? 
       WHERE id = ?`,
      [newPaidAmount, newRemainingAmount, newStatus, billId]
    );
    
    await connection.commit();
    
    return {
      paymentNumber,
      newPaidAmount,
      newRemainingAmount,
      newStatus
    };
    
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const getBillStats = async (startDate, endDate) => {
  const [stats] = await pool.execute(
    `SELECT 
      COUNT(*) as total_bills,
      SUM(total_amount) as total_sales,
      SUM(paid_amount) as total_paid,
      SUM(remaining_amount) as total_pending,
      COUNT(CASE WHEN bill_type = 'advance' THEN 1 END) as advance_bills,
      COUNT(CASE WHEN bill_status = 'pending' THEN 1 END) as pending_bills,
      COUNT(CASE WHEN bill_status = 'partial' THEN 1 END) as partial_bills,
      COUNT(CASE WHEN bill_status = 'paid' THEN 1 END) as paid_bills,
      AVG(total_amount) as avg_bill_value
     FROM bills 
     WHERE created_at BETWEEN ? AND ?`,
    [startDate, endDate]
  );
  
  return stats[0];
};

const deleteBillsByYear = async (years, userId) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    for (const year of years) {
      await connection.execute(
        `UPDATE bills 
         SET is_deleted = TRUE, deleted_by = ?, deleted_at = NOW() 
         WHERE YEAR(created_at) = ?`,
        [userId, year]
      );
    }
    
    await connection.commit();
    
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  createBill,
  getBillByToken,
  searchBills,
  getPendingBills,
  addPayment,
  getBillStats,
  deleteBillsByYear
};
