const pool = require('../config/database');

const generateExchangeNumber = async () => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  
  const [result] = await pool.execute(
    `SELECT COUNT(*) as count FROM exchanges 
     WHERE exchange_number LIKE ? AND YEAR(created_at) = YEAR(CURRENT_DATE())`,
    [`EX/${year}${month}/%`]
  );
  
  const count = result[0].count + 1;
  const serial = count.toString().padStart(4, '0');
  
  return `EX/${year}${month}/${serial}`;
};

module.exports = { generateExchangeNumber };
