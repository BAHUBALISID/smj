const { sendWhatsApp, sendSMS } = require('../config/twilio');
const pool = require('../config/database');
const { formatDate } = require('../utils/dateTime');

const sendPaymentReminder = async (customerId, billId, reminderType = 'weekly') => {
  const [bill] = await pool.execute(
    `SELECT b.*, c.phone, c.name 
     FROM bills b
     JOIN customers c ON b.customer_id = c.id
     WHERE b.id = ? AND b.customer_id = ?`,
    [billId, customerId]
  );
  
  if (bill.length === 0) {
    throw new Error('Bill or customer not found');
  }
  
  const billData = bill[0];
  
  let message;
  
  if (reminderType === 'weekly') {
    message = `Dear ${billData.customer_name}, this is a reminder for your pending payment of Rs. ${billData.remaining_amount.toFixed(2)} for bill ${billData.bill_number}. Total amount: Rs. ${billData.total_amount.toFixed(2)}. Please visit Shree Mahakaleshwar Jewellers to complete your payment.`;
  } else if (reminderType === 'advance') {
    message = `Dear ${billData.customer_name}, your advance booking rate lock period ends on ${formatDate(billData.advance_lock_date)}. Please complete your payment before this date to avail locked rates. Remaining amount: Rs. ${billData.remaining_amount.toFixed(2)}.`;
  } else {
    message = `Dear ${billData.customer_name}, this is a reminder for your pending payment of Rs. ${billData.remaining_amount.toFixed(2)} for bill ${billData.bill_number}.`;
  }
  
  let result;
  
  try {
    result = await sendWhatsApp(billData.phone, message);
    
    if (!result.success) {
      result = await sendSMS(billData.phone, message);
    }
    
    await pool.execute(
      `INSERT INTO notification_logs 
       (customer_id, customer_name, customer_phone, notification_type, 
        message_type, message, status, twilio_sid, error_message) 
       VALUES (?, ?, ?, 'reminder', ?, ?, ?, ?, ?)`,
      [
        customerId, billData.customer_name, billData.phone,
        result.success ? (result.type || 'whatsapp') : 'sms',
        message, result.success ? 'sent' : 'failed',
        result.sid || null, result.error || null
      ]
    );
    
    return result;
  } catch (error) {
    await pool.execute(
      `INSERT INTO notification_logs 
       (customer_id, customer_name, customer_phone, notification_type, 
        message_type, message, status, error_message) 
       VALUES (?, ?, ?, 'reminder', 'whatsapp', ?, 'failed', ?)`,
      [customerId, billData.customer_name, billData.phone, message, error.message]
    );
    
    throw error;
  }
};

const sendBirthdayMessage = async (customerId) => {
  const [customer] = await pool.execute(
    'SELECT id, name, phone FROM customers WHERE id = ?',
    [customerId]
  );
  
  if (customer.length === 0) {
    throw new Error('Customer not found');
  }
  
  const customerData = customer[0];
  
  const message = `Happy Birthday ${customerData.name}! We hope you enjoy your special day and wish you a year filled with happiness, health, and success. Thank you for choosing Shree Mahakaleshwar Jewellers.`;
  
  let result;
  
  try {
    result = await sendWhatsApp(customerData.phone, message);
    
    if (!result.success) {
      result = await sendSMS(customerData.phone, message);
    }
    
    await pool.execute(
      `INSERT INTO notification_logs 
       (customer_id, customer_name, customer_phone, notification_type, 
        message_type, message, status, twilio_sid, error_message) 
       VALUES (?, ?, ?, 'birthday', ?, ?, ?, ?, ?)`,
      [
        customerId, customerData.name, customerData.phone,
        result.success ? (result.type || 'whatsapp') : 'sms',
        message, result.success ? 'sent' : 'failed',
        result.sid || null, result.error || null
      ]
    );
    
    return result;
  } catch (error) {
    await pool.execute(
      `INSERT INTO notification_logs 
       (customer_id, customer_name, customer_phone, notification_type, 
        message_type, message, status, error_message) 
       VALUES (?, ?, ?, 'birthday', 'whatsapp', ?, 'failed', ?)`,
      [customerId, customerData.name, customerData.phone, message, error.message]
    );
    
    throw error;
  }
};

const getNotificationLogs = async (page = 1, limit = 50) => {
  const offset = (page - 1) * limit;
  
  const [rows] = await pool.execute(
    `SELECT nl.*,
     DATE_FORMAT(nl.sent_at, '%d/%m/%Y %H:%i:%s') as sent_at_formatted
     FROM notification_logs nl
     ORDER BY nl.sent_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  
  const [countResult] = await pool.execute(
    'SELECT COUNT(*) as total FROM notification_logs'
  );
  
  return {
    logs: rows,
    total: countResult[0].total,
    page,
    limit
  };
};

const getNotificationStats = async (days = 30) => {
  const [stats] = await pool.execute(
    `SELECT 
      COUNT(*) as total_notifications,
      SUM(CASE WHEN status = 'sent' OR status = 'delivered' THEN 1 ELSE 0 END) as successful,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN notification_type = 'birthday' THEN 1 ELSE 0 END) as birthday,
      SUM(CASE WHEN notification_type = 'reminder' THEN 1 ELSE 0 END) as reminder,
      SUM(CASE WHEN message_type = 'whatsapp' THEN 1 ELSE 0 END) as whatsapp,
      SUM(CASE WHEN message_type = 'sms' THEN 1 ELSE 0 END) as sms
     FROM notification_logs 
     WHERE sent_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
    [days]
  );
  
  return stats[0];
};

module.exports = {
  sendPaymentReminder,
  sendBirthdayMessage,
  getNotificationLogs,
  getNotificationStats
};
