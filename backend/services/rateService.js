const pool = require('../config/database');
const { updateAutoRates, getAllRates } = require('../utils/rateEngine');

const updateRate = async (metalType, purity, rate, userId) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const now = new Date();
    
    await connection.execute(
      `UPDATE metal_rates SET is_active = FALSE 
       WHERE metal_type = ? AND purity = ? AND is_active = TRUE`,
      [metalType, purity]
    );
    
    await connection.execute(
      `INSERT INTO metal_rates 
       (metal_type, purity, rate_per_gm, auto_calculate, created_by, effective_from) 
       VALUES (?, ?, ?, FALSE, ?, ?)`,
      [metalType, purity, rate, userId, now]
    );
    
    if ((metalType === 'GOLD' && purity === '24K') || 
        (metalType === 'SILVER' && purity === '999')) {
      await updateAutoRates(metalType, purity, rate, userId);
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

const getRateHistory = async (metalType, purity, limit = 10) => {
  const [rows] = await pool.execute(
    `SELECT mr.*, u.name as updated_by_name,
     DATE_FORMAT(mr.effective_from, '%d/%m/%Y %H:%i:%s') as effective_from_formatted
     FROM metal_rates mr
     LEFT JOIN users u ON mr.created_by = u.id
     WHERE mr.metal_type = ? AND mr.purity = ?
     ORDER BY mr.effective_from DESC
     LIMIT ?`,
    [metalType, purity, limit]
  );
  
  return rows;
};

const addCustomMetal = async (metalName, purity, rate, userId) => {
  const [existing] = await pool.execute(
    'SELECT id FROM metal_rates WHERE metal_type = ? AND purity = ? AND is_active = TRUE',
    [metalName.toUpperCase(), purity]
  );
  
  if (existing.length > 0) {
    throw new Error('Rate for this metal and purity already exists');
  }
  
  const [result] = await pool.execute(
    `INSERT INTO metal_rates 
     (metal_type, purity, rate_per_gm, auto_calculate, created_by, effective_from) 
     VALUES (?, ?, ?, FALSE, ?, NOW())`,
    [metalName.toUpperCase(), purity, rate, userId]
  );
  
  return result.insertId;
};

const getRateSummary = async () => {
  const [rows] = await pool.execute(
    `SELECT 
      metal_type,
      COUNT(DISTINCT purity) as purity_count,
      MAX(effective_from) as latest_update
     FROM metal_rates 
     WHERE is_active = TRUE
     GROUP BY metal_type`
  );
  
  return rows;
};

module.exports = {
  updateRate,
  getRateHistory,
  addCustomMetal,
  getAllRates,
  getRateSummary
};
