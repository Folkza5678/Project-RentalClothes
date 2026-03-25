const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/productController');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const multer   = require('multer');
const path     = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, process.env.UPLOAD_PATH || 'uploads/'),
  filename:    (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage, limits: { fileSize: process.env.MAX_FILE_SIZE || 5242880 } });

router.get('/',    ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.post('/',   authMiddleware, adminOnly, upload.array('images', 5), ctrl.create);
router.put('/:id', authMiddleware, adminOnly, upload.array('images', 5), ctrl.update);
router.delete('/:id', authMiddleware, adminOnly, ctrl.remove);

module.exports = router;