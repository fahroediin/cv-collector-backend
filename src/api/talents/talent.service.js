const { sequelize } = require('../../config/database');
const { Talent, CV, Skill } = require('./talent.model');
const { extractDataFromCV } = require('../../services/ocr.service');

const syncTalentSkills = async (talent, skillNames, transaction) => {
  if (!skillNames || skillNames.length === 0) {
    return;
  }
  const skillInstances = await Promise.all(
    skillNames.map(name => Skill.findOrCreate({
      where: { name },
      transaction: transaction
    }))
  );
  const skills = skillInstances.map(result => result[0]);
  await talent.setSkills(skills, { transaction: transaction });
  console.log(`Skill untuk talent ${talent.email} telah disinkronkan dalam transaksi.`);
};

const processUploadedCV = async (filePath) => {
  const t = await sequelize.transaction();
  try {
    const data = await extractDataFromCV(filePath);
    if (!data.email) {
      console.error(`Proses gagal: Email tidak dapat diekstrak dari ${filePath}. File dilewati.`);
      await t.commit();
      return;
    }
    const talentData = {
        name: data.name, email: data.email, phoneNumber: data.phoneNumber,
        linkedinUrl: data.linkedinUrl, experience: data.experience, education: data.education,
    };
    let talent = await Talent.findOne({ where: { email: data.email }, transaction: t });
    let cvVersion = 1;
    if (talent) {
      console.log(`Talent ditemukan untuk email: ${data.email}. Memperbarui data...`);
      await talent.update(talentData, { transaction: t });
      const latestCV = await CV.findOne({ where: { TalentId: talent.id }, order: [['version', 'DESC']], transaction: t });
      cvVersion = latestCV ? latestCV.version + 1 : 1;
    } else {
      console.log(`Talent baru untuk email: ${data.email}. Membuat profil...`);
      talent = await Talent.create(talentData, { transaction: t });
    }
    await CV.create({ filePath: filePath, version: cvVersion, TalentId: talent.id }, { transaction: t });
    console.log(`CV versi ${cvVersion} untuk ${talent.email} berhasil disimpan.`);
    await syncTalentSkills(talent, data.skills, t);
    await t.commit();
    console.log(`Transaksi untuk ${data.email} berhasil di-commit.`);
    return talent;
  } catch (error) {
    await t.rollback();
    console.error(`Terjadi error saat memproses file ${filePath}, transaksi di-rollback:`, error.message);
  }
};

const getAllTalents = async () => {
  return await Talent.findAll({
    attributes: ['id', 'name', 'email', 'phoneNumber', 'status'],
    include: [{ model: Skill, as: 'skills', attributes: ['name'], through: { attributes: [] } }],
    order: [['createdAt', 'DESC']],
  });
};

// --- FUNGSI YANG DIPERBARUI ---
const getTalentById = async (id) => {
  return await Talent.findByPk(id, {
    // 'include' adalah kunci untuk menggabungkan data dari tabel lain
    include: [
      {
        model: CV,
        as: 'cvs', // Alias ini harus cocok dengan yang didefinisikan di talent.model.js
        attributes: ['id', 'filePath', 'version', 'createdAt']
      },
      {
        model: Skill,
        as: 'skills',
        attributes: ['name'],
        through: { attributes: [] } // Jangan sertakan data dari tabel pivot
      }
    ],
    order: [
        // Urutkan CV yang disertakan dari versi terbaru ke terlama
        [{ model: CV, as: 'cvs' }, 'version', 'DESC']
    ]
  });
};
// -----------------------------

const selectTalentsForAcademy = async (talentIds) => {
    const [affectedRows] = await Talent.update(
        { status: 'Kandidat Academy' },
        { where: { id: talentIds } }
    );
    return affectedRows;
};

module.exports = {
  processUploadedCV,
  getAllTalents,
  getTalentById,
  selectTalentsForAcademy,
};