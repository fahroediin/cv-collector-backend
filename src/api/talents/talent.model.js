const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

// Impor model lain yang diperlukan untuk mendefinisikan relasi
const { Skill } = require('../skills/skill.model');
const { TalentSkill } = require('../skills/talentSkill.model');

// =================================================================
// Definisi Model: Talent
// =================================================================
// Tabel utama yang berisi semua data profil talent.
const Talent = sequelize.define('Talent', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true, // Setiap talent harus memiliki email yang unik
    validate: {
      isEmail: true, // Validasi format email bawaan dari Sequelize
    },
  },
  phoneNumber: {
    type: DataTypes.STRING, // Menggunakan STRING lebih aman untuk nomor telepon
    allowNull: true,
  },
  linkedinUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'New', // Status default saat talent pertama kali dibuat
  },
});

// =================================================================
// Definisi Model: CV
// =================================================================
// Tabel ini menyimpan riwayat (versi) dari setiap file CV yang
// diunggah untuk seorang talent.
const CV = sequelize.define('CV', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    filePath: {
        type: DataTypes.STRING,
        allowNull: false, // Path ke file fisik yang disimpan di server
    },
    version: {
        type: DataTypes.INTEGER,
        allowNull: false, // Nomor versi, misal: 1, 2, 3, dst.
    },
});

// =================================================================
// Definisi Relasi (Associations)
// =================================================================

// 1. Relasi One-to-Many: Talent -> CV
// Seorang Talent dapat memiliki banyak (hasMany) CV.
Talent.hasMany(CV, {
  as: 'cvs', // Alias ini digunakan saat melakukan query (e.g., include: 'cvs')
  foreignKey: 'talentId' // Kunci asing di tabel CV
});
// Setiap CV dimiliki oleh satu (belongsTo) Talent.
CV.belongsTo(Talent, {
  foreignKey: 'talentId'
});


// 2. Relasi Many-to-Many: Talent <-> Skill
// Seorang Talent dapat memiliki banyak (belongsToMany) Skill.
Talent.belongsToMany(Skill, {
  through: TalentSkill,      // Melalui tabel pivot 'TalentSkill'
  as: 'skills',              // Alias untuk query
  foreignKey: 'talentId',    // Kunci asing di tabel pivot yang merujuk ke Talent
});
// Sebuah Skill dapat dimiliki oleh banyak (belongsToMany) Talent.
Skill.belongsToMany(Talent, {
  through: TalentSkill,      // Melalui tabel pivot yang sama
  as: 'talents',             // Alias untuk query dari sisi Skill
  foreignKey: 'skillId',     // Kunci asing di tabel pivot yang merujuk ke Skill
});


// =================================================================
// Ekspor Model
// =================================================================
// Ekspor model yang didefinisikan di file ini agar bisa digunakan
// di bagian lain aplikasi.
module.exports = {
  Talent,
  CV,
  Skill,      // Diekspor ulang agar mudah diakses dari satu tempat
  TalentSkill // Diekspor ulang agar mudah diakses dari satu tempat
};