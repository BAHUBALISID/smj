const cron = require('node-cron');
const pool = require('../config/database');
const { sendWhatsApp, sendSMS } = require('../config/twilio');

const scheduleBirthdayMessages = () => {
  cron.schedule('0 9 * * *', async () => {
    try {
      const [customers] = await pool.execute(
        `SELECT id, name, phone 
         FROM customers 
         WHERE MONTH(date_of_birth) = MONTH(CURRENT_DATE()) 
           AND DAY(date_of_birth) = DAY(CURRENT_DATE())
           AND phone IS NOT NULL 
           AND phone != ''`
      );
      
      for (const customer of customers) {
        const message = `Happy Birthday ${customer.name}! We hope you enjoy your special day and wish you a year filled with happiness, health, and success. Thank you for choosing Shree Mahakaleshwar Jewellers.`;
        
        let result;
        
        try {
          result = await sendWhatsApp(customer.phone, message);
          
          if (!result.success) {
            result = await sendSMS(customer.phone, message);
          }
          
          await pool.execute(
            `INSERT INTO notification_logs 
             (customer_id, customer_name, customer_phone, notification_type, 
              message_type, message, status, twilio_sid) 
             VALUES (?, ?, ?, 'birthday', ?, ?, ?, ?)`,
            [
              customer.id, customer.name, customer.phone,
              result.success ? 'whatsapp' : 'sms',
              message, result.success ? 'sent' : 'failed',
              result.sid || null
            ]
          );
          
          console.log(`Sent birthday message to ${customer.name}`);
        } catch (error) {
          console.error(`Failed to send birthday message to ${customer.name}:`, error);
          
          await pool.execute(
            `INSERT INTO notification_logs 
             (customer_id, customer_name, customer_phone, notification_type, 
              message_type, message, status, error_message) 
             VALUES (?, ?, ?, 'birthday', 'whatsapp', ?, 'failed', ?)`,
            [customer.id, customer.name, customer.phone, message, error.message]
          );
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log(`Sent ${customers.length} birthday messages`);
    } catch (error) {
      console.error('Error in birthday scheduler:', error);
    }
  });
};

const startScheduler = () => {
  scheduleBirthdayMessages();
  console.log('Birthday scheduler started');
};

module.exports = {
  startScheduler
};
