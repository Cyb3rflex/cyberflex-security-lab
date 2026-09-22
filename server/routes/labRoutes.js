const express = require('express');
const router = express.Router();
const labController = require('../controllers/labController');

router.get('/missions', labController.getMissions);
router.get('/missions/:id', labController.getMissionById);
router.post('/missions/:id/hint', labController.requestHint);
router.post('/missions/:id/flag', labController.submitFlag);
router.get('/profile', labController.getStudentProfile);
router.post('/defensive/toggle', labController.toggleDefensivePatch);
router.post('/defensive/verify', labController.verifyDefensivePatch);

module.exports = router;
