const rateService = require('../services/rateService');

const updateRate = async (req, res) => {
  try {
    const { metalType, purity, rate } = req.body;
    const userId = req.user.id;
    
    if (!metalType || !purity || !rate) {
      return res.status(400).json({ error: 'Metal type, purity, and rate are required' });
    }
    
    await rateService.updateRate(metalType, purity, parseFloat(rate), userId);
    res.json({ message: 'Rate updated successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getRates = async (req, res) => {
  try {
    const rates = await rateService.getAllRates();
    res.json(rates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getRateHistory = async (req, res) => {
  try {
    const { metalType, purity, limit } = req.query;
    
    if (!metalType || !purity) {
      return res.status(400).json({ error: 'Metal type and purity are required' });
    }
    
    const limitNum = parseInt(limit) || 10;
    const history = await rateService.getRateHistory(metalType, purity, limitNum);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const addCustomMetal = async (req, res) => {
  try {
    const { metalName, purity, rate } = req.body;
    const userId = req.user.id;
    
    if (!metalName || !purity || !rate) {
      return res.status(400).json({ error: 'Metal name, purity, and rate are required' });
    }
    
    const metalId = await rateService.addCustomMetal(metalName, purity, parseFloat(rate), userId);
    res.json({ message: 'Custom metal added successfully', metalId });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getRateSummary = async (req, res) => {
  try {
    const summary = await rateService.getRateSummary();
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  updateRate,
  getRates,
  getRateHistory,
  addCustomMetal,
  getRateSummary
};
