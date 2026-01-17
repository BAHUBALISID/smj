const bcrypt = require('bcryptjs');
const pool = require('../config/database');

const createUser = async (userData, createdBy) => {
  const { name, email, password, role, phone } = userData;
  
  const [existing] = await pool.execute(
    'SELECT id FROM users WHERE email = ?',
    [email]
  );
  
  if (existing.length > 0) {
    throw new Error('Email already exists');
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const [result] = await pool.execute(
    `INSERT INTO users (name, email, password, role, phone, created_at) 
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [name, email, hashedPassword, role, phone]
  );
  
  return result.insertId;
};

const getAllUsers = async (currentUserId) => {
  const [rows] = await pool.execute(
    `SELECT id, name, email, role, phone, is_active, 
     DATE_FORMAT(created_at, '%d/%m/%Y %H:%i:%s') as created_at 
     FROM users WHERE id != ? ORDER BY created_at DESC`,
    [currentUserId]
  );
  
  return rows;
};

const updateUserStatus = async (userId, isActive) => {
  await pool.execute(
    'UPDATE users SET is_active = ? WHERE id = ?',
    [isActive, userId]
  );
  
  return true;
};

const deleteUser = async (userId) => {
  const [user] = await pool.execute('SELECT role FROM users WHERE id = ?', [userId]);
  
  if (user.length === 0) {
    throw new Error('User not found');
  }
  
  if (user[0].role === 'admin') {
    const [adminCount] = await pool.execute(
      'SELECT COUNT(*) as count FROM users WHERE role = "admin" AND is_active = TRUE'
    );
    
    if (adminCount[0].count <= 1) {
      throw new Error('Cannot delete the only active admin');
    }
  }
  
  await pool.execute('DELETE FROM users WHERE id = ?', [userId]);
  
  return true;
};

const getUserStats = async () => {
  const [stats] = await pool.execute(
    `SELECT 
      COUNT(*) as total_users,
      SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_count,
      SUM(CASE WHEN role = 'manager' THEN 1 ELSE 0 END) as manager_count,
      SUM(CASE WHEN role = 'staff' THEN 1 ELSE 0 END) as staff_count,
      SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_count
     FROM users`
  );
  
  return stats[0];
};

module.exports = {
  createUser,
  getAllUsers,
  updateUserStatus,
  deleteUser,
  getUserStats
};
