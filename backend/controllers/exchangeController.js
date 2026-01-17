const exchangeService = require('../services/exchangeService');
const upload = require('../config/multer');
const path = require('path');

const createExchange = async (req, res) => {
  try {
    const exchangeData = JSON.parse(req.body.exchangeData);
    const items = JSON.parse(req.body.items);
    const photos = JSON.parse(req.body.photos || '[]');
    const userId = req.user.id;
    const userRole = req.user.role;
    
    if (!exchangeData.customer_name || !exchangeData.customer_phone) {
      return res.status(400).json({ error: 'Customer name and phone are required' });
    }
    
    if (!exchangeData.settlement_type) {
      return res.status(400).json({ error: 'Settlement type is required' });
    }
    
    const uploadedFiles = req.files || [];
    const finalPhotos = [];
    
    uploadedFiles.forEach(file => {
      const photoType = file.fieldname.split('-')[0];
      const description = file.originalname;
      
      finalPhotos.push({
        path: path.join('exchanges', file.filename),
        type: photoType,
        description
      });
    });
    
    const result = await exchangeService.createExchange(exchangeData, items, finalPhotos, userId, userRole);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getExchangeByToken = async (req, res) => {
  try {
    const { token } = req.params;
    const exchange = await exchangeService.getExchangeByToken(token);
    res.json(exchange);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

const searchExchanges = async (req, res) => {
  try {
    const { search, limit } = req.query;
    const searchTerm = search || '';
    const limitNum = parseInt(limit) || 20;
    
    const exchanges = await exchangeService.searchExchanges(searchTerm, limitNum);
    res.json(exchanges);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getExchangeStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
      startDate = thirtyDaysAgo.toISOString().split('T')[0];
      endDate = today.toISOString().split('T')[0];
    }
    
    const stats = await exchangeService.getExchangeStats(startDate, endDate);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createExchange,
  getExchangeByToken,
  searchExchanges,
  getExchangeStats
};
