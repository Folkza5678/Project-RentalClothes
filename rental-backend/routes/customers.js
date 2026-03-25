// routes/customers.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/customerController');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.get('/',    authMiddleware, adminOnly, ctrl.getAll);
router.get('/:id', authMiddleware, adminOnly, ctrl.getOne);
router.patch('/:id/blacklist', authMiddleware, adminOnly, ctrl.toggleBlacklist);

module.exports = router;