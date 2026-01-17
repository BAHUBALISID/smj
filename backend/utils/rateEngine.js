const pool = require('../config/database');

const getLatestRate = async (metalType, purity) => {
  const [rows] = await pool.execute(
    `SELECT rate_per_gm, auto_calculate, base_metal, base_purity 
     FROM metal_rates 
     WHERE metal_type = ? AND purity = ? AND is_active = TRUE 
     ORDER BY effective_from DESC LIMIT 1`,
    [metalType, purity]
  );
  
  if (rows.length === 0) return null;
  
  const rate = rows[0];
  
  if (rate.auto_calculate && rate.base_metal && rate.base_purity) {
    const baseRate = await getLatestRate(rate.base_metal, rate.base_purity);
    if (baseRate) {
      const purityRatio = parseFloat(purity) / parseFloat(rate.base_purity);
      return parseFloat((baseRate.rate_per_gm * purityRatio).toFixed(2));
    }
  }
  
  return rate.rate_per_gm;
};

const calculateGoldRate = async (purity) => {
  const base24k = await getLatestRate('GOLD', '24K');
  if (!base24k) return null;
  
  const purityMap = {
    '22K': (22/24) * base24k,
    '18K': (18/24) * base24k,
    '14K': (14/24) * base24k,
    '10K': (10/24) * base24k,
    '8K': (8/24) * base24k
  };
  
  return purityMap[purity] || null;
};

const calculateSilverRate = async (purity) => {
  const base999 = await getLatestRate('SILVER', '999');
  if (!base999) return null;
  
  const purityDecimal = parseFloat(purity) / 1000;
  return parseFloat((base999 * purityDecimal).toFixed(2));
};

const updateAutoRates = async (metalType, basePurity, newRate, userId) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const now = new Date();
    
    await connection.execute(
      `UPDATE metal_rates SET is_active = FALSE 
       WHERE metal_type = ? AND purity = ? AND is_active = TRUE`,
      [metalType, basePurity]
    );
    
    await connection.execute(
      `INSERT INTO metal_rates 
       (metal_type, purity, rate_per_gm, auto_calculate, created_by, effective_from) 
       VALUES (?, ?, ?, FALSE, ?, ?)`,
      [metalType, basePurity, newRate, userId, now]
    );
    
    if (metalType === 'GOLD' && basePurity === '24K') {
      const purities = ['22K', '18K', '14K', '10K', '8K'];
      
      for (const purity of purities) {
        await connection.execute(
          `UPDATE metal_rates SET is_active = FALSE 
           WHERE metal_type = 'GOLD' AND purity = ? AND is_active = TRUE`,
          [purity]
        );
        
        const calculatedRate = await calculateGoldRate(purity);
        
        await connection.execute(
          `INSERT INTO metal_rates 
           (metal_type, purity, rate_per_gm, auto_calculate, base_metal, base_purity, created_by, effective_from) 
           VALUES ('GOLD', ?, ?, TRUE, 'GOLD', '24K', ?, ?)`,
          [purity, calculatedRate, userId, now]
        );
      }
    }
    
    if (metalType === 'SILVER' && basePurity === '999') {
      const purities = ['925', '900', '800'];
      
      for (const purity of purities) {
        await connection.execute(
          `UPDATE metal_rates SET is_active = FALSE 
           WHERE metal_type = 'SILVER' AND purity = ? AND is_active = TRUE`,
          [purity]
        );
        
        const calculatedRate = await calculateSilverRate(purity);
        
        await connection.execute(
          `INSERT INTO metal_rates 
           (metal_type, purity, rate_per_gm, auto_calculate, base_metal, base_purity, created_by, effective_from) 
           VALUES ('SILVER', ?, ?, TRUE, 'SILVER', '999', ?, ?)`,
          [purity, calculatedRate, userId, now]
        );
      }
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

const getAllRates = async () => {
  const [rows] = await pool.execute(
    `SELECT mr.*, u.name as updated_by_name 
     FROM metal_rates mr 
     LEFT JOIN users u ON mr.created_by = u.id 
     WHERE mr.is_active = TRUE 
     ORDER BY mr.metal_type, mr.purity`
  );
  return rows;
};

module.exports = {
  getLatestRate,
  calculateGoldRate,
  calculateSilverRate,
  updateAutoRates,
  getAllRates
};
