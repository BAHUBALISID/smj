const express = require('express');
const router = express.Router();
const rateController = require('../controllers/rateController');
const { verifyToken } = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminOnly');

router.post('/update', verifyToken, adminOnly, rateController.updateRate);
router.get('/all', verifyToken, rateController.getRates);
router.get('/history', verifyToken, adminOnly, rateController.getRateHistory);
router.post('/custom', verifyToken, adminOnly, rateController.addCustomMetal);
router.get('/summary', verifyToken, rateController.getRateSummary);

module.exports = router;
