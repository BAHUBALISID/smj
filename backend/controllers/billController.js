const billService = require('../services/billService');
const upload = require('../config/multer');
const path = require('path');

const createBill = async (req, res) => {
  try {
    const billData = JSON.parse(req.body.billData);
    const items = JSON.parse(req.body.items);
    const photos = JSON.parse(req.body.photos || '[]');
    const userId = req.user.id;
    const userRole = req.user.role;
    
    if (!billData.customer_name || !billData.customer_phone) {
      return res.status(400).json({ error: 'Customer name and phone are required' });
    }
    
    const uploadedFiles = req.files || [];
    const fileMap = {};
    
    uploadedFiles.forEach(file => {
      const itemIndex = file.fieldname.split('-')[1];
      if (!fileMap[itemIndex]) {
        fileMap[itemIndex] = [];
      }
      fileMap[itemIndex].push(path.join('bills', file.filename));
    });
    
    const finalPhotos = items.map((item, index) => {
      return fileMap[index] || [];
    });
    
    const result = await billService.createBill(billData, items, finalPhotos, userId, userRole);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getBillByToken = async (req, res) => {
  try {
    const { token } = req.params;
    const bill = await billService.getBillByToken(token);
    res.json(bill);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

const searchBills = async (req, res) => {
  try {
    const { search, limit } = req.query;
    const searchTerm = search || '';
    const limitNum = parseInt(limit) || 20;
    
    const bills = await billService.searchBills(searchTerm, limitNum);
    res.json(bills);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getPendingBills = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    
    const result = await billService.getPendingBills(pageNum, limitNum);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const addPayment = async (req, res) => {
  try {
    const { billId } = req.params;
    const paymentData = req.body;
    const userId = req.user.id;
    
    if (!paymentData.amount || !paymentData.payment_mode) {
      return res.status(400).json({ error: 'Amount and payment mode are required' });
    }
    
    const result = await billService.addPayment(billId, paymentData, userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getBillStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
      startDate = thirtyDaysAgo.toISOString().split('T')[0];
      endDate = today.toISOString().split('T')[0];
    }
    
    const stats = await billService.getBillStats(startDate, endDate);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteBillsByYear = async (req, res) => {
  try {
    const { years } = req.body;
    const userId = req.user.id;
    
    if (!years || !Array.isArray(years) || years.length === 0) {
      return res.status(400).json({ error: 'Years array is required' });
    }
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can delete bills' });
    }
    
    await billService.deleteBillsByYear(years, userId);
    res.json({ message: 'Bills deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  createBill,
  getBillByToken,
  searchBills,
  getPendingBills,
  addPayment,
  getBillStats,
  deleteBillsByYear
};
