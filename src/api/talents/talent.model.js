const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

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
  },
  linkedinUrl: {
    type: DataTypes.STRING,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'New', // Contoh status: New, Kandidat Academy
  },
});

// Definisikan juga model untuk CV Versioning
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

Talent.hasMany(CV);
CV.belongsTo(Talent);

module.exports = { Talent, CV };