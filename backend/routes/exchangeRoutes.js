const express = require('express');
const router = express.Router();
const exchangeController = require('../controllers/exchangeController');
const { verifyToken } = require('../middleware/auth');
const upload = require('../config/multer');

router.post('/create', verifyToken, upload.array('photos', 20), exchangeController.createExchange);
router.get('/token/:token', exchangeController.getExchangeByToken);
router.get('/search', verifyToken, exchangeController.searchExchanges);
router.get('/stats', verifyToken, exchangeController.getExchangeStats);

module.exports = router;
