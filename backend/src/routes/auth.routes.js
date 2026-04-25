const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { auth, requireRole } = require('../middleware/auth');

router.post('/login', ctrl.login);
// Yeni kullanıcı sadece admin tarafından oluşturulabilir
router.post('/register', auth, requireRole('admin'), ctrl.register);
router.get('/me', auth, ctrl.me);
router.put('/change-password', auth, ctrl.changePassword);

module.exports = router;
