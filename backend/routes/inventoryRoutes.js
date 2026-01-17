const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { verifyToken } = require('../middleware/auth');

router.post('/add', verifyToken, inventoryController.addItem);
router.get('/search', verifyToken, inventoryController.searchItems);
router.get('/all', verifyToken, inventoryController.getItems);
router.delete('/:itemId', verifyToken, inventoryController.deleteItem);
router.get('/stats', verifyToken, inventoryController.getInventoryStats);

module.exports = router;
