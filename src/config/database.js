const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.DB_STORAGE || 'database.sqlite',
  logging: false,
  // --- TAMBAHKAN BARIS INI ---
  dialectOptions: {
    timeout: 5000, // Waktu tunggu dalam milidetik (5 detik)
  },
  // ---------------------------
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