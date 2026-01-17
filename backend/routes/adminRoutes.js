const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken } = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminOnly');

router.post('/birthday/:customerId', verifyToken, adminOnly, adminController.sendBirthdayMessage);
router.post('/reminder/:customerId/:billId', verifyToken, adminOnly, adminController.sendPaymentReminder);
router.get('/notifications', verifyToken, adminOnly, adminController.getNotificationLogs);
router.get('/notifications/stats', verifyToken, adminOnly, adminController.getNotificationStats);
router.get('/system-stats', verifyToken, adminOnly, adminController.getSystemStats);

module.exports = router;
