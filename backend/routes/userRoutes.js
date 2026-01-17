const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminOnly');

router.post('/create', verifyToken, adminOnly, userController.createUser);
router.get('/all', verifyToken, adminOnly, userController.getUsers);
router.put('/:userId/status', verifyToken, adminOnly, userController.updateUserStatus);
router.delete('/:userId', verifyToken, adminOnly, userController.deleteUser);
router.get('/stats', verifyToken, adminOnly, userController.getUserStats);

module.exports = router;
