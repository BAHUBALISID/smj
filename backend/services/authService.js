const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { generateToken } = require('../config/jwt');

const login = async (email, password) => {
  const [rows] = await pool.execute(
    'SELECT id, name, email, password, role, phone, is_active FROM users WHERE email = ?',
    [email]
  );
  
  if (rows.length === 0) {
    throw new Error('Invalid credentials');
  }
  
  const user = rows[0];
  
  if (!user.is_active) {
    throw new Error('Account is deactivated');
  }
  
  const validPassword = await bcrypt.compare(password, user.password);
  
  if (!validPassword) {
    throw new Error('Invalid credentials');
  }
  
  const token = generateToken(user);
  
  delete user.password;
  
  return {
    user,
    token
  };
};

const changePassword = async (userId, oldPassword, newPassword) => {
  const [rows] = await pool.execute(
    'SELECT password FROM users WHERE id = ?',
    [userId]
  );
  
  if (rows.length === 0) {
    throw new Error('User not found');
  }
  
  const validPassword = await bcrypt.compare(oldPassword, rows[0].password);
  
  if (!validPassword) {
    throw new Error('Current password is incorrect');
  }
  
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  await pool.execute(
    'UPDATE users SET password = ? WHERE id = ?',
    [hashedPassword, userId]
  );
  
  return true;
};

module.exports = {
  login,
  changePassword
};
