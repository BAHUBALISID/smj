const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { verifyToken } = require('../middleware/auth');

router.get('/sales', verifyToken, reportController.getSalesReport);
router.get('/customers', verifyToken, reportController.getCustomerReport);
router.get('/gst', verifyToken, reportController.getGSTReport);
router.get('/products', verifyToken, reportController.getProductReport);
router.get('/payment-modes', verifyToken, reportController.getPaymentModeReport);
router.get('/export', verifyToken, reportController.exportReport);

module.exports = router;
