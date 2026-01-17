const pool = require('../config/database');

const addInventoryItem = async (name, category, createdBy) => {
  const [existing] = await pool.execute(
    'SELECT id FROM inventory WHERE LOWER(name) = LOWER(?)',
    [name]
  );
  
  if (existing.length > 0) {
    throw new Error('Item already exists in inventory');
  }
  
  const [result] = await pool.execute(
    'INSERT INTO inventory (name, category, created_by) VALUES (?, ?, ?)',
    [name, category, createdBy]
  );
  
  return result.insertId;
};

const searchInventory = async (searchTerm, limit = 20) => {
  const [rows] = await pool.execute(
    `SELECT id, name, category, 
     DATE_FORMAT(created_at, '%d/%m/%Y %H:%i:%s') as created_at
     FROM inventory 
     WHERE name LIKE ? 
     ORDER BY name ASC 
     LIMIT ?`,
    [`%${searchTerm}%`, limit]
  );
  
  return rows;
};

const getAllInventory = async (page = 1, limit = 50) => {
  const offset = (page - 1) * limit;
  
  const [rows] = await pool.execute(
    `SELECT i.*, u.name as created_by_name,
     DATE_FORMAT(i.created_at, '%d/%m/%Y %H:%i:%s') as created_at
     FROM inventory i
     LEFT JOIN users u ON i.created_by = u.id
     ORDER BY i.created_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  
  const [countResult] = await pool.execute(
    'SELECT COUNT(*) as total FROM inventory'
  );
  
  return {
    items: rows,
    total: countResult[0].total,
    page,
    limit
  };
};

const deleteInventoryItem = async (itemId) => {
  const [result] = await pool.execute(
    'DELETE FROM inventory WHERE id = ?',
    [itemId]
  );
  
  return result.affectedRows > 0;
};

const getInventoryStats = async () => {
  const [stats] = await pool.execute(
    `SELECT 
      COUNT(*) as total_items,
      COUNT(DISTINCT category) as categories_count,
      MAX(created_at) as last_added
     FROM inventory`
  );
  
  return stats[0];
};

module.exports = {
  addInventoryItem,
  searchInventory,
  getAllInventory,
  deleteInventoryItem,
  getInventoryStats
};
