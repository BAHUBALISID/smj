const notificationService = require('../services/notificationService');
const pool = require('../config/database');

const sendBirthdayMessage = async (req, res) => {
  try {
    const { customerId } = req.params;
    
    const result = await notificationService.sendBirthdayMessage(customerId);
    res.json({ message: 'Birthday message sent successfully', result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const sendPaymentReminder = async (req, res) => {
  try {
    const { customerId, billId } = req.params;
    const { reminderType } = req.body;
    
    const result = await notificationService.sendPaymentReminder(customerId, billId, reminderType);
    res.json({ message: 'Payment reminder sent successfully', result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getNotificationLogs = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;
    
    const result = await notificationService.getNotificationLogs(pageNum, limitNum);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getNotificationStats = async (req, res) => {
  try {
    const { days } = req.query;
    const daysNum = parseInt(days) || 30;
    
    const stats = await notificationService.getNotificationStats(daysNum);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getSystemStats = async (req, res) => {
  try {
    const [billStats] = await pool.execute(
      `SELECT 
        COUNT(*) as total_bills,
        SUM(total_amount) as total_sales,
        SUM(remaining_amount) as total_pending,
        COUNT(CASE WHEN bill_status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN bill_status = 'partial' THEN 1 END) as partial_count
       FROM bills 
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );
    
    const [customerStats] = await pool.execute(
      `SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN date_of_birth IS NOT NULL THEN 1 END) as birthday_count,
        COUNT(CASE WHEN gst_number IS NOT NULL THEN 1 END) as gst_count
       FROM customers`
    );
    
    const [exchangeStats] = await pool.execute(
      `SELECT 
        COUNT(*) as total_exchanges,
        SUM(difference_amount) as total_difference
       FROM exchanges 
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );
    
    const [userStats] = await pool.execute(
      `SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
        COUNT(CASE WHEN role = 'staff' THEN 1 END) as staff_count
       FROM users 
       WHERE is_active = TRUE`
    );
    
    res.json({
      bills: billStats[0],
      customers: customerStats[0],
      exchanges: exchangeStats[0],
      users: userStats[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  sendBirthdayMessage,
  sendPaymentReminder,
  getNotificationLogs,
  getNotificationStats,
  getSystemStats
};
