const { Talent, CV, Skill } = require('./talent.model');
const { extractDataFromCV } = require('../../services/ocr.service');

/**
 * Menangani logika untuk mencari atau membuat skill di database,
 * lalu menyinkronkannya dengan profil talent.
 * @param {object} talent - Instance Sequelize dari model Talent.
 * @param {string[]} skillNames - Array berisi nama skill dari hasil ekstraksi CV.
 */
const syncTalentSkills = async (talent, skillNames) => {
  if (!skillNames || skillNames.length === 0) {
    return;
  }

  // Cari atau buat setiap skill dalam database
  const skillInstances = await Promise.all(
    skillNames.map(name => Skill.findOrCreate({ where: { name } }))
  );

  // `findOrCreate` mengembalikan array [instance, created], kita hanya butuh instance-nya
  const skills = skillInstances.map(result => result[0]);

  // `setSkills` adalah method magic dari Sequelize untuk relasi many-to-many.
  // Ini akan secara otomatis menghapus relasi lama dan menambahkan yang baru.
  await talent.setSkills(skills);
  console.log(`Skill untuk talent ${talent.email} telah disinkronkan.`);
};

/**
 * Memproses file CV yang diunggah, mengekstrak data, membuat atau memperbarui
 * profil talent, dan menyimpan versi CV.
 * @param {string} filePath - Path ke file CV yang diunggah.
 */
const processUploadedCV = async (filePath) => {
  try {
    const data = await extractDataFromCV(filePath);

    // Email adalah kunci. Jika tidak ditemukan, proses tidak bisa dilanjutkan.
    if (!data.email) {
      console.error(`Proses gagal: Email tidak dapat diekstrak dari ${filePath}. File dilewati.`);
      return;
    }

    let talent = await Talent.findOne({ where: { email: data.email } });
    let cvVersion = 1;

    if (talent) {
      // --- TALENT SUDAH ADA ---
      console.log(`Talent ditemukan untuk email: ${data.email}. Memperbarui data...`);
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
      // --- TALENT BARU ---
      console.log(`Talent baru untuk email: ${data.email}. Membuat profil...`);
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
    console.log(`CV versi ${cvVersion} untuk ${talent.email} berhasil disimpan.`);

    // Sinkronkan skill talent
    await syncTalentSkills(talent, data.skills);

    return talent;
  } catch (error) {
      console.error(`Terjadi error saat memproses file ${filePath}:`, error.message);
  }
};

/**
 * Mengambil semua data talent dari database beserta skill mereka.
 * @returns {Promise<Array>} Array berisi objek talent.
 */
const getAllTalents = async () => {
  return await Talent.findAll({
    attributes: ['id', 'name', 'email', 'phoneNumber', 'status'],
    include: [{
      model: Skill,
      as: 'skills',
      attributes: ['name'],
      through: { attributes: [] } // Tidak menyertakan data dari tabel pivot
    }],
    order: [['createdAt', 'DESC']],
  });
};

/**
 * Mengambil data detail satu talent berdasarkan ID, termasuk semua versi CV dan skill.
 * @param {number} id - ID dari talent.
 * @returns {Promise<object|null>} Objek talent atau null jika tidak ditemukan.
 */
const getTalentById = async (id) => {
  return await Talent.findByPk(id, {
    include: [
      {
        model: CV,
        as: 'cvs', // Alias dari relasi
        attributes: ['id', 'filePath', 'version', 'createdAt']
      },
      {
        model: Skill,
        as: 'skills',
        attributes: ['name'],
        through: { attributes: [] }
      }
    ],
    order: [
        [{ model: CV, as: 'cvs' }, 'version', 'DESC'] // Urutkan CV dari yang terbaru
    ]
  });
};

/**
 * Mengubah status beberapa talent menjadi 'Kandidat Academy'.
 * @param {number[]} talentIds - Array berisi ID talent yang akan diubah statusnya.
 * @returns {Promise<Array>} Hasil dari operasi update.
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