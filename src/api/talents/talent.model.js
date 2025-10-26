const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

// Impor model lain yang diperlukan untuk mendefinisikan relasi
const { Skill } = require('../skills/skill.model');
const { TalentSkill } = require('../skills/talentSkill.model');

// =================================================================
// Definisi Model: Talent
// =================================================================
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
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  linkedinUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'New',
  },
  experience: {
    type: DataTypes.JSON, // Menyimpan array objek riwayat pekerjaan
    allowNull: true,
  },
  education: {
    type: DataTypes.JSON, // Menyimpan array objek riwayat pendidikan
    allowNull: true,
  },
});

// =================================================================
// Definisi Model: CV
// =================================================================
const CV = sequelize.define('CV', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    filePath: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    version: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
});

// =================================================================
// Definisi Relasi (Associations)
// =================================================================

// 1. Relasi One-to-Many: Talent -> CV
Talent.hasMany(CV, {
  as: 'cvs',
  foreignKey: 'talentId'
});
CV.belongsTo(Talent, {
  foreignKey: 'talentId'
});

// 2. Relasi Many-to-Many: Talent <-> Skill
Talent.belongsToMany(Skill, {
  through: TalentSkill,
  as: 'skills',
  foreignKey: 'talentId',
});
Skill.belongsToMany(Talent, {
  through: TalentSkill,
  as: 'talents',
  foreignKey: 'skillId',
});

// =================================================================
// Ekspor Model
// =================================================================
module.exports = {
  Talent,
  CV,
  Skill,
  TalentSkill
};