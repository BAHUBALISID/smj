const cron = require('node-cron');
const pool = require('../config/database');
const { sendWhatsApp, sendSMS } = require('../config/twilio');

const scheduleWeeklyReminders = () => {
  cron.schedule('0 10 * * 1', async () => {
    try {
      const [pendingBills] = await pool.execute(
        `SELECT b.*, c.phone, c.name 
         FROM bills b
         JOIN customers c ON b.customer_id = c.id
         WHERE b.bill_status IN ('pending', 'partial') 
           AND b.remaining_amount > 0
           AND b.created_at <= DATE_SUB(NOW(), INTERVAL 7 DAY)`
      );
      
      for (const bill of pendingBills) {
        const message = `Dear ${bill.customer_name}, this is a weekly reminder for your pending payment of Rs. ${bill.remaining_amount.toFixed(2)} for bill ${bill.bill_number}. Total amount: Rs. ${bill.total_amount.toFixed(2)}. Please visit Shree Mahakaleshwar Jewellers to complete your payment.`;
        
        let result;
        
        try {
          result = await sendWhatsApp(bill.phone, message);
          
          if (!result.success) {
            result = await sendSMS(bill.phone, message);
          }
          
          await pool.execute(
            `INSERT INTO notification_logs 
             (customer_id, customer_name, customer_phone, notification_type, 
              message_type, message, status, twilio_sid) 
             VALUES (?, ?, ?, 'reminder', ?, ?, ?, ?)`,
            [
              bill.customer_id, bill.customer_name, bill.phone,
              result.success ? 'whatsapp' : 'sms',
              message, result.success ? 'sent' : 'failed',
              result.sid || null
            ]
          );
        } catch (error) {
          console.error(`Failed to send reminder for bill ${bill.bill_number}:`, error);
          
          await pool.execute(
            `INSERT INTO notification_logs 
             (customer_id, customer_name, customer_phone, notification_type, 
              message_type, message, status, error_message) 
             VALUES (?, ?, ?, 'reminder', 'whatsapp', ?, 'failed', ?)`,
            [bill.customer_id, bill.customer_name, bill.phone, message, error.message]
          );
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log(`Sent ${pendingBills.length} weekly reminders`);
    } catch (error) {
      console.error('Error in weekly reminder scheduler:', error);
    }
  });
};

const scheduleAdvanceLockReminders = () => {
  cron.schedule('0 11 * * *', async () => {
    try {
      const [advanceBills] = await pool.execute(
        `SELECT b.*, c.phone, c.name 
         FROM bills b
         JOIN customers c ON b.customer_id = c.id
         WHERE b.bill_type = 'advance' 
           AND b.bill_status != 'paid'
           AND b.advance_lock_date = DATE_ADD(CURDATE(), INTERVAL 3 DAY)`
      );
      
      for (const bill of advanceBills) {
        const message = `Dear ${bill.customer_name}, your advance booking rate lock period ends in 3 days (on ${new Date(bill.advance_lock_date).toLocaleDateString('en-IN')}). Please complete your payment before this date to avail locked rates. Remaining amount: Rs. ${bill.remaining_amount.toFixed(2)}.`;
        
        let result;
        
        try {
          result = await sendWhatsApp(bill.phone, message);
          
          if (!result.success) {
            result = await sendSMS(bill.phone, message);
          }
          
          await pool.execute(
            `INSERT INTO notification_logs 
             (customer_id, customer_name, customer_phone, notification_type, 
              message_type, message, status, twilio_sid) 
             VALUES (?, ?, ?, 'reminder', ?, ?, ?, ?)`,
            [
              bill.customer_id, bill.customer_name, bill.phone,
              result.success ? 'whatsapp' : 'sms',
              message, result.success ? 'sent' : 'failed',
              result.sid || null
            ]
          );
        } catch (error) {
          console.error(`Failed to send advance reminder for bill ${bill.bill_number}:`, error);
          
          await pool.execute(
            `INSERT INTO notification_logs 
             (customer_id, customer_name, customer_phone, notification_type, 
              message_type, message, status, error_message) 
             VALUES (?, ?, ?, 'reminder', 'whatsapp', ?, 'failed', ?)`,
            [bill.customer_id, bill.customer_name, bill.phone, message, error.message]
          );
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log(`Sent ${advanceBills.length} advance lock reminders`);
    } catch (error) {
      console.error('Error in advance lock reminder scheduler:', error);
    }
  });
};

const startSchedulers = () => {
  scheduleWeeklyReminders();
  scheduleAdvanceLockReminders();
  console.log('Reminder schedulers started');
};

module.exports = {
  startSchedulers
};
