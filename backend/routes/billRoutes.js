const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const { verifyToken } = require('../middleware/auth');
const upload = require('../config/multer');

router.post('/create', verifyToken, upload.array('photos', 20), billController.createBill);
router.get('/token/:token', billController.getBillByToken);
router.get('/search', verifyToken, billController.searchBills);
router.get('/pending', verifyToken, billController.getPendingBills);
router.post('/:billId/payment', verifyToken, billController.addPayment);
router.get('/stats', verifyToken, billController.getBillStats);
router.post('/delete-by-year', verifyToken, billController.deleteBillsByYear);

module.exports = router;
