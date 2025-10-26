const express = require('express');
const router = express.Router();
const talentController = require('./talent.controller');
const upload = require('../../middleware/upload');

// US-01: Mengunggah CV
router.post('/upload', upload.single('cv'), talentController.uploadCV);

// US-03: Melihat daftar talent
router.get('/', talentController.getTalents);

// US-04: Melihat detail talent
router.get('/:id', talentController.getTalentDetail);

// US-05: Memilih talent untuk academy
router.patch('/select-academy', talentController.setAcademyCandidates);

module.exports = router;