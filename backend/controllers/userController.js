const userService = require('../services/userService');

const createUser = async (req, res) => {
  try {
    const userData = req.body;
    const createdBy = req.user.id;
    
    if (!userData.name || !userData.email || !userData.password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    
    const userId = await userService.createUser(userData, createdBy);
    res.json({ message: 'User created successfully', userId });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const users = await userService.getAllUsers(currentUserId);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;
    
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }
    
    await userService.updateUserStatus(userId, isActive);
    res.json({ message: 'User status updated successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    await userService.deleteUser(userId);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getUserStats = async (req, res) => {
  try {
    const stats = await userService.getUserStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createUser,
  getUsers,
  updateUserStatus,
  deleteUser,
  getUserStats
};
