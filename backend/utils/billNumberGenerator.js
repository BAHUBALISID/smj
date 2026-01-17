const pool = require('../config/database');

const generateBillNumber = async () => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  
  const [result] = await pool.execute(
    `SELECT COUNT(*) as count FROM bills 
     WHERE bill_number LIKE ? AND YEAR(created_at) = YEAR(CURRENT_DATE())`,
    [`SMJ/${year}${month}/%`]
  );
  
  const count = result[0].count + 1;
  const serial = count.toString().padStart(4, '0');
  
  return `SMJ/${year}${month}/${serial}`;
};

const generatePaymentNumber = async () => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  
  const [result] = await pool.execute(
    `SELECT COUNT(*) as count FROM bill_payments 
     WHERE payment_number LIKE ? AND YEAR(created_at) = YEAR(CURRENT_DATE())`,
    [`PAY/${year}${month}/%`]
  );
  
  const count = result[0].count + 1;
  const serial = count.toString().padStart(4, '0');
  
  return `PAY/${year}${month}/${serial}`;
};

module.exports = {
  generateBillNumber,
  generatePaymentNumber
};
