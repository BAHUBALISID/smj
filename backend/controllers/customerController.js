const customerService = require('../services/customerService');

const createCustomer = async (req, res) => {
  try {
    const customerData = req.body;
    
    if (!customerData.name || !customerData.phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }
    
    const customerId = await customerService.createCustomer(customerData);
    res.json({ message: 'Customer created successfully', customerId });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const searchCustomers = async (req, res) => {
  try {
    const { search, limit } = req.query;
    const searchTerm = search || '';
    const limitNum = parseInt(limit) || 20;
    
    const customers = await customerService.searchCustomers(searchTerm, limitNum);
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const customer = await customerService.getCustomerById(customerId);
    res.json(customer);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const customerData = req.body;
    
    if (!customerData.name || !customerData.phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }
    
    await customerService.updateCustomer(customerId, customerData);
    res.json({ message: 'Customer updated successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getCustomerHistory = async (req, res) => {
  try {
    const { customerId } = req.params;
    const history = await customerService.getCustomerPurchaseHistory(customerId);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getCustomerStats = async (req, res) => {
  try {
    const stats = await customerService.getCustomerStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createCustomer,
  searchCustomers,
  getCustomer,
  updateCustomer,
  getCustomerHistory,
  getCustomerStats
};
