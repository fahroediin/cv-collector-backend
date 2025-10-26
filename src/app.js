const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { connectDB, sequelize } = require('./config/database');
const talentRoutes = require('./api/talents/talent.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.send('CV Collector API is running!');
});
app.use('/api/talents', talentRoutes);

// Error Handler (sederhana)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ message: err.message || 'Terjadi kesalahan pada server' });
});

// Sinkronisasi Database dan Jalankan Server
const startServer = async () => {
    await connectDB();
    // Sinkronisasi model dengan database
    await sequelize.sync({ alter: true }); // Gunakan { force: true } untuk reset saat development
    
    app.listen(PORT, () => {
        console.log(`Server berjalan di http://localhost:${PORT}`);
    });
};

startServer();