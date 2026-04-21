const router = require('express').Router();
const ctrl = require('../controllers/contracts.controller');
const { auth } = require('../middleware/auth');

router.use(auth);
router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);

module.exports = router;
