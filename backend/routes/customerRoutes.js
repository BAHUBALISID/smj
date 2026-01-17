const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { verifyToken } = require('../middleware/auth');

router.post('/create', verifyToken, customerController.createCustomer);
router.get('/search', verifyToken, customerController.searchCustomers);
router.get('/:customerId', verifyToken, customerController.getCustomer);
router.put('/:customerId', verifyToken, customerController.updateCustomer);
router.get('/:customerId/history', verifyToken, customerController.getCustomerHistory);
router.get('/stats/summary', verifyToken, customerController.getCustomerStats);

module.exports = router;
