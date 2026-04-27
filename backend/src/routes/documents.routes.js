const router = require('express').Router();
const ctrl = require('../controllers/documents.controller');
const { auth } = require('../middleware/auth');

router.use(auth);
router.get('/', ctrl.list);
router.get('/:id/download', ctrl.download);
router.post('/', ctrl.upload.single('file'), ctrl.uploadDocument);
router.delete('/:id', ctrl.remove);

module.exports = router;