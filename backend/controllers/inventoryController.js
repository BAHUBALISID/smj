const inventoryService = require('../services/inventoryService');

const addItem = async (req, res) => {
  try {
    const { name, category } = req.body;
    const createdBy = req.user.id;
    
    if (!name) {
      return res.status(400).json({ error: 'Item name is required' });
    }
    
    const itemId = await inventoryService.addInventoryItem(name, category, createdBy);
    res.json({ message: 'Item added successfully', itemId });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const searchItems = async (req, res) => {
  try {
    const { search, limit } = req.query;
    const searchTerm = search || '';
    const limitNum = parseInt(limit) || 20;
    
    const items = await inventoryService.searchInventory(searchTerm, limitNum);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getItems = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;
    
    const result = await inventoryService.getAllInventory(pageNum, limitNum);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    
    const success = await inventoryService.deleteInventoryItem(itemId);
    if (!success) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getInventoryStats = async (req, res) => {
  try {
    const stats = await inventoryService.getInventoryStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  addItem,
  searchItems,
  getItems,
  deleteItem,
  getInventoryStats
};
