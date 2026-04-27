const router = require('express').Router();
const ctrl = require('../controllers/documents.controller');
const { auth } = require('../middleware/auth');

router.use(auth);
router.get('/', ctrl.list);
router.get('/:id/download', ctrl.download);
router.post('/', ctrl.upload.single('file'), ctrl.uploadDocument);
router.delete('/:id', ctrl.remove);

module.exports = router;const fs = require('fs');
const path = require('path');
const multer = require('multer');
const router = require('express').Router();
const ctrl = require('../controllers/documents.controller');
const { auth } = require('../middleware/auth');

const uploadDir = path.resolve(process.cwd(), 'uploads', 'documents');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.use(auth);
router.get('/', ctrl.list);
router.post('/', upload.single('file'), ctrl.create);
router.get('/:id/file', ctrl.download);
router.delete('/:id', ctrl.remove);

module.exports = router;