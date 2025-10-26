const { sequelize } = require('../../config/database'); // Impor instance sequelize untuk transaksi
const { Talent, CV, Skill } = require('./talent.model');
const { extractDataFromCV } = require('../../services/ocr.service');

/**
 * Menangani logika untuk mencari atau membuat skill di database,
 * lalu menyinkronkannya dengan profil talent sebagai bagian dari transaksi.
 * @param {object} talent - Instance Sequelize dari model Talent.
 * @param {string[]} skillNames - Array berisi nama skill dari hasil ekstraksi CV.
 * @param {object} transaction - Instance transaksi Sequelize.
 */
const syncTalentSkills = async (talent, skillNames, transaction) => {
  if (!skillNames || skillNames.length === 0) {
    return;
  }

  // Cari atau buat setiap skill dalam database
  const skillInstances = await Promise.all(
    skillNames.map(name => Skill.findOrCreate({
      where: { name },
      transaction: transaction // Lewatkan transaksi ke setiap operasi
    }))
  );

  // `findOrCreate` mengembalikan array [instance, created], kita hanya butuh instance-nya
  const skills = skillInstances.map(result => result[0]);

  // `setSkills` akan secara otomatis mengelola tabel pivot (TalentSkill)
  await talent.setSkills(skills, { transaction: transaction }); // Lewatkan transaksi
  console.log(`Skill untuk talent ${talent.email} telah disinkronkan dalam transaksi.`);
};

/**
 * Memproses file CV yang diunggah dalam satu transaksi database atomik.
 * @param {string} filePath - Path ke file CV yang diungah.
 */
const processUploadedCV = async (filePath) => {
  // 1. Mulai transaksi
  const t = await sequelize.transaction();

  try {
    // Operasi non-database bisa dilakukan di luar, tapi lebih aman di dalam try/catch utama
    const data = await extractDataFromCV(filePath);

    if (!data.email) {
      console.error(`Proses gagal: Email tidak dapat diekstrak dari ${filePath}. File dilewati.`);
      // Tidak perlu rollback karena belum ada operasi DB, cukup hentikan proses
      await t.commit(); // Commit transaksi kosong
      return;
    }

    let talent = await Talent.findOne({ where: { email: data.email }, transaction: t });
    let cvVersion = 1;

    if (talent) {
      // --- TALENT SUDAH ADA ---
      console.log(`Talent ditemukan untuk email: ${data.email}. Memperbarui data...`);
      await talent.update({
        name: data.name,
        phoneNumber: data.phoneNumber,
      }, { transaction: t }); // Lewatkan transaksi

      const latestCV = await CV.findOne({
          where: { TalentId: talent.id },
          order: [['version', 'DESC']],
          transaction: t,
      });
      cvVersion = latestCV ? latestCV.version + 1 : 1;
    } else {
      // --- TALENT BARU ---
      console.log(`Talent baru untuk email: ${data.email}. Membuat profil...`);
      talent = await Talent.create({
        name: data.name,
        email: data.email,
        phoneNumber: data.phoneNumber,
      }, { transaction: t }); // Lewatkan transaksi
    }

    // Buat entri CV baru
    await CV.create({
      filePath: filePath,
      version: cvVersion,
      TalentId: talent.id,
    }, { transaction: t }); // Lewatkan transaksi
    console.log(`CV versi ${cvVersion} untuk ${talent.email} berhasil disimpan.`);

    // Sinkronkan skill talent
    await syncTalentSkills(talent, data.skills, t);

    // 2. Jika semua operasi di atas berhasil, commit transaksi
    await t.commit();
    console.log(`Transaksi untuk ${data.email} berhasil di-commit.`);

    return talent;
  } catch (error) {
    // 3. Jika ada satu saja error, batalkan semua operasi yang sudah dilakukan
    await t.rollback();
    console.error(`Terjadi error saat memproses file ${filePath}, transaksi di-rollback:`, error.message);
  }
};

/**
 * Mengambil semua data talent dari database beserta skill mereka.
 * (Operasi baca tidak memerlukan transaksi)
 */
const getAllTalents = async () => {
  return await Talent.findAll({
    attributes: ['id', 'name', 'email', 'phoneNumber', 'status'],
    include: [{
      model: Skill,
      as: 'skills',
      attributes: ['name'],
      through: { attributes: [] }
    }],
    order: [['createdAt', 'DESC']],
  });
};

/**
 * Mengambil data detail satu talent berdasarkan ID.
 * (Operasi baca tidak memerlukan transaksi)
 */
const getTalentById = async (id) => {
  return await Talent.findByPk(id, {
    include: [
      { model: CV, as: 'cvs', attributes: ['id', 'filePath', 'version', 'createdAt'] },
      { model: Skill, as: 'skills', attributes: ['name'], through: { attributes: [] } }
    ],
    order: [[{ model: CV, as: 'cvs' }, 'version', 'DESC']]
  });
};

/**
 * Mengubah status beberapa talent menjadi 'Kandidat Academy'.
 * (Operasi tunggal, transaksi tidak wajib tapi bisa ditambahkan untuk konsistensi)
 */
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