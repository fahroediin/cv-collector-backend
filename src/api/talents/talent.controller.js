const talentService = require('./talent.service');

const uploadCV = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Silakan pilih file CV untuk diunggah' });
    }
    // Proses dimulai di latar belakang (tanpa menunggu selesai)
    talentService.processUploadedCV(req.file.path);

    res.status(202).json({ message: 'CV berhasil diunggah dan sedang diproses' });
  } catch (error) {
    next(error);
  }
};

const getTalents = async (req, res, next) => {
  try {
    const talents = await talentService.getAllTalents();
    res.status(200).json(talents);
  } catch (error) {
    next(error);
  }
};

const getTalentDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const talent = await talentService.getTalentById(id);
    if (!talent) {
      return res.status(404).json({ message: 'Talent tidak ditemukan' });
    }
    res.status(200).json(talent);
  } catch (error) {
    next(error);
  }
};

const setAcademyCandidates = async (req, res, next) => {
    try {
        const { talentIds } = req.body; // Diharapkan array of IDs: [1, 2, 3]
        if (!talentIds || talentIds.length === 0) {
            return res.status(400).json({ message: 'Silakan pilih minimal satu talent' });
        }
        await talentService.selectTalentsForAcademy(talentIds);
        res.status(200).json({ message: 'Talent berhasil ditandai sebagai kandidat academy' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
  uploadCV,
  getTalents,
  getTalentDetail,
  setAcademyCandidates,
};