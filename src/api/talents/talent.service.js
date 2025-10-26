const { Talent, CV } = require('./talent.model');
// const { Skill, TalentSkill } = require('../skills/skill.model'); // Impor jika sudah dibuat
const { extractDataFromCV } = require('../../services/ocr.service');

// US-01 & US-02: Mengunggah dan memproses CV
const processUploadedCV = async (filePath) => {
  const data = await extractDataFromCV(filePath);

  // Cek apakah talent sudah ada berdasarkan email
  let talent = await Talent.findOne({ where: { email: data.email } });
  let cvVersion = 1;

  if (talent) {
    // Talent sudah ada, update data dan tambah versi CV
    await talent.update({
      name: data.name,
      phoneNumber: data.phoneNumber,
    });
    const latestCV = await CV.findOne({
        where: { TalentId: talent.id },
        order: [['version', 'DESC']]
    });
    cvVersion = latestCV ? latestCV.version + 1 : 1;
  } else {
    // Talent baru, buat entri baru
    talent = await Talent.create({
      name: data.name,
      email: data.email,
      phoneNumber: data.phoneNumber,
    });
  }

  // Simpan file CV sebagai versi baru
  await CV.create({
    filePath: filePath,
    version: cvVersion,
    TalentId: talent.id,
  });

  // Logika untuk menyimpan/update skill (membutuhkan model Skill & TalentSkill)
  // ...

  return talent;
};

// US-03: Melihat semua talent
const getAllTalents = async () => {
  return await Talent.findAll({
    include: [CV] // Sertakan data CV
  });
};

// US-04: Melihat detail talent
const getTalentById = async (id) => {
  return await Talent.findByPk(id, {
    include: [CV] // Sertakan semua versi CV
  });
};

// US-05: Memilih talent untuk academy
const selectTalentsForAcademy = async (talentIds) => {
    const result = await Talent.update(
        { status: 'Kandidat Academy' },
        { where: { id: talentIds } }
    );
    return result;
};


module.exports = {
  processUploadedCV,
  getAllTalents,
  getTalentById,
  selectTalentsForAcademy,
};