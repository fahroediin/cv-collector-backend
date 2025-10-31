const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { connectDB, sequelize } = require('./config/database');
const talentRoutes = require('./api/talents/talent.routes');
const healthRoutes = require('./routes/health');
// const { uploadRateLimiter, generalRateLimiter } = require('./middleware/simpleRateLimiter');
const { handleMulterError } = require('./middleware/upload');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// General rate limiting untuk semua API endpoints (disabled for testing file size)
// app.use('/api/', generalRateLimiter);

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check routes (tidak perlu rate limiting)
app.use('/', healthRoutes);

// API root
app.get('/', (req, res) => {
  res.json({
    message: 'CV Collector API is running!',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/health',
      ready: '/ready',
      live: '/live',
      api: {
        talents: '/api/talents',
        upload: 'POST /api/talents/upload'
      }
    }
  });
});

// Apply upload rate limiting untuk upload endpoint (disabled for testing file size)
// app.use('/api/talents/upload', uploadRateLimiter);

// API routes
app.use('/api/talents', talentRoutes);

// Enhanced Error Handler
app.use((err, req, res, next) => {
  // Log error dengan lebih detail
  console.error({
    timestamp: new Date().toISOString(),
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Handle multer errors secara spesifik
  if (err.name === 'MulterError' || err.message.includes('Format file') || err.message.includes('Ekstensi file')) {
    return handleMulterError(err, req, res, next);
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  const response = {
    success: false,
    message: err.message || 'Terjadi kesalahan pada server',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: {
        method: req.method,
        url: req.url,
        ip: req.ip
      }
    })
  };

  res.status(statusCode).json(response);
});

// 404 Handler untuk routes yang tidak ada
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint tidak ditemukan',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /ready',
      'GET /live',
      'GET /api/talents',
      'GET /api/talents/:id',
      'POST /api/talents/upload',
      'PATCH /api/talents/select-academy'
    ]
  });
});

// =================================================================
// BAGIAN YANG DITAMBAHKAN
// =================================================================
// Fungsi untuk memastikan direktori 'uploads' ada
const ensureUploadsDirExists = () => {
  const dir = path.join(__dirname, '..', 'uploads'); // Path ke folder uploads di root
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
    console.log(`Direktori '${dir}' berhasil dibuat.`);
  }
};
// =================================================================

// Sinkronisasi Database dan Jalankan Server
const startServer = async () => {
    await connectDB();
    // Sinkronisasi model dengan database
    await sequelize.sync({ alter: true });

    ensureUploadsDirExists(); // <-- Panggil fungsi di sini

    app.listen(PORT, () => {
        console.log(`Server berjalan di http://localhost:${PORT}`);
    });
};

startServer();