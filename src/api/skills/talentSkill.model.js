const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

// Ini adalah model untuk tabel pivot
const TalentSkill = sequelize.define('TalentSkill', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
});

module.exports = { TalentSkill };