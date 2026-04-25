const router = require('express').Router();
const ctrl = require('../controllers/lawyers.controller');
const { auth } = require('../middleware/auth');

router.use(auth);

// Avukat CRUD
router.get('/lawyers', ctrl.listLawyers);
router.get('/lawyers/:id', ctrl.getLawyer);
router.post('/lawyers', ctrl.createLawyer);
router.put('/lawyers/:id', ctrl.updateLawyer);
router.delete('/lawyers/:id', ctrl.removeLawyer);

// Dava CRUD
router.get('/cases', ctrl.listCases);
router.post('/cases', ctrl.createCase);
router.put('/cases/:id', ctrl.updateCase);
router.delete('/cases/:id', ctrl.removeCase);

module.exports = router;
