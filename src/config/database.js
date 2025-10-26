const { Sequelize } = require('sequelize');
require('dotenv').config();

// Inisialisasi Sequelize untuk SQLite
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.DB_STORAGE || 'database.sqlite', // Menggunakan path dari .env
  logging: false, // Matikan logging SQL di console agar tidak terlalu ramai
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('Koneksi database SQLite berhasil.');
  } catch (error) {
    console.error('Tidak dapat terhubung ke database SQLite:', error);
  }
};

module.exports = { sequelize, connectDB };