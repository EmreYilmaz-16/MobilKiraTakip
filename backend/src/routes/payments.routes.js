const router = require('express').Router();
const ctrl = require('../controllers/payments.controller');
const { auth } = require('../middleware/auth');

router.use(auth);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.post('/generate-monthly', ctrl.generateMonthly);
router.put('/:id/mark-paid', ctrl.markPaid);

module.exports = router;
