# Rekomendasi Implementasi Prioritas - CV Collector Backend

## 🚨 IMMEDIATE FIXES (Implementasi 1-2 Minggu)

### 1. Fix File Upload Security - CRITICAL

**Masalah**: Tidak ada batasan ukuran file dan validasi keamanan

**Solusi**:
```javascript
// src/middleware/upload.js
const crypto = require('crypto');
const path = require('path');

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      // Secure filename generation
      const uniqueSuffix = crypto.randomBytes(16).toString('hex');
      const timestamp = Date.now();
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `cv-${timestamp}-${uniqueSuffix}${ext}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    // Enhanced file validation
    const allowedMimes = ['application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file PDF yang diperbolehkan'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Max 1 file per request
  }
});
```

### 2. Add Rate Limiting - CRITICAL

**Install**:
```bash
npm install express-rate-limit helmet express-validator
```

**Implementasi**:
```javascript
// src/middleware/security.js
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// General rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Terlalu banyak request. Coba lagi dalam 15 menit.'
  }
});

// Upload rate limiting (stricter)
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit uploads
  message: {
    error: 'Terlalu banyak upload. Maksimal 10 CV per jam.'
  }
});

// Security headers
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

app.use('/api/', generalLimiter);
app.use('/api/talents/upload', uploadLimiter);
```

### 3. Fix CORS Configuration - MEDIUM

```javascript
// src/config/cors.js
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

### 4. Add Input Validation - HIGH

**Install**:
```bash
npm install joi
```

**Implementasi**:
```javascript
// src/validators/talent.validator.js
const Joi = require('joi');

const uploadSchema = Joi.object({
  // File validation done by multer
});

const selectAcademySchema = Joi.object({
  talentIds: Joi.array()
    .items(Joi.number().integer().positive())
    .min(1)
    .max(50)
    .required()
    .messages({
      'array.base': 'talentIds harus berupa array',
      'array.min': 'Pilih minimal 1 talent',
      'array.max': 'Maksimal 50 talent sekaligus',
      'number.base': 'ID talent harus berupa angka'
    })
});

module.exports = {
  uploadSchema,
  selectAcademySchema
};
```

**Update Controller**:
```javascript
// src/api/talents/talent.controller.js
const { selectAcademySchema } = require('../../validators/talent.validator');

const setAcademyCandidates = async (req, res, next) => {
  try {
    const { error, value } = selectAcademySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: 'Data tidak valid',
        details: error.details[0].message
      });
    }

    const { talentIds } = value;
    const result = await talentService.selectTalentsForAcademy(talentIds);

    res.status(200).json({
      message: 'Talent berhasil ditandai sebagai kandidat academy',
      affectedRows: result
    });
  } catch (error) {
    next(error);
  }
};
```

---

## 🟡 SHORT-TERM FIXES (Implementasi 1 Bulan)

### 5. Implement Proper Error Handling - HIGH

```javascript
// src/utils/errors.js
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, field) {
    super(message, 400);
    this.field = field;
  }
}

class NotFoundError extends AppError {
  constructor(resource) {
    super(`${resource} tidak ditemukan`, 404);
  }
}

class ProcessingError extends AppError {
  constructor(message) {
    super(`Gagal memproses CV: ${message}`, 422);
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  ProcessingError
};
```

```javascript
// src/middleware/errorHandler.js
const { AppError } = require('../utils/errors');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error untuk debugging
  console.error({
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    const message = err.errors.map(val => val.message).join(', ');
    error = new AppError(message, 400);
  }

  // Sequelize unique constraint
  if (err.name === 'SequelizeUniqueConstraintError') {
    const message = 'Data sudah ada dalam sistem';
    error = new AppError(message, 409);
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File terlalu besar. Maksimal 10MB';
    error = new AppError(message, 400);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Terjadi kesalahan pada server',
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      error: error
    })
  });
};

module.exports = errorHandler;
```

### 6. Add Structured Logging - HIGH

**Install**:
```bash
npm install winston winston-daily-rotate-file
```

**Implementasi**:
```javascript
// src/config/logger.js
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
      let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

      if (Object.keys(meta).length > 0) {
        log += ` ${JSON.stringify(meta)}`;
      }

      if (stack) {
        log += `\n${stack}`;
      }

      return log;
    })
  ),
  transports: [
    // Daily rotate files
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d'
    }),
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    }),
    // Console output for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

module.exports = logger;
```

**Update Service**:
```javascript
// src/services/ocr.service.js
const logger = require('../config/logger');

const extractDataFromCV = async (filePath) => {
  const startTime = Date.now();
  logger.info(`Memulai proses CV: ${filePath}`);

  try {
    // ... existing logic ...

    const processingTime = Date.now() - startTime;
    logger.info(`CV berhasil diproses: ${filePath}`, {
      processingTime,
      extractedData: {
        name: data.name,
        email: data.email,
        skillsCount: data.skills.length,
        experienceCount: data.experience.length
      }
    });

    return data;
  } catch (error) {
    logger.error(`Gagal memproses CV: ${filePath}`, {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};
```

### 7. Add Health Check Endpoint - MEDIUM

```javascript
// src/routes/health.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/database');
const logger = require('../config/logger');

const router = express.Router();

router.get('/health', async (req, res) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  };

  try {
    // Check database connection
    await sequelize.authenticate();
    healthCheck.database = 'connected';

    // Check upload directory
    const uploadDir = path.join(__dirname, '..', '..', 'uploads');
    const stats = fs.statSync(uploadDir);
    healthCheck.uploadDirectory = 'accessible';

    // Check available disk space (optional)
    const diskUsage = process.platform === 'win32'
      ? 'N/A (Windows)'
      : await checkDiskUsage();
    healthCheck.diskSpace = diskUsage;

    res.status(200).json(healthCheck);
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    healthCheck.status = 'unhealthy';
    healthCheck.error = error.message;
    res.status(503).json(healthCheck);
  }
});

router.get('/ready', async (req, res) => {
  // Check if application is ready to serve requests
  try {
    await sequelize.authenticate();
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: 'Database not available'
    });
  }
});

module.exports = router;
```

---

## 🟢 MEDIUM-TERM IMPROVEMENTS (Implementasi 2-3 Bulan)

### 8. Add Basic Authentication

**Install**:
```bash
npm install jsonwebtoken bcryptjs
```

**Implementasi**:
```javascript
// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const { promisify } = require('util');

const protect = async (req, res, next) => {
  try {
    // 1) Get token and check if it exists
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        message: 'Anda tidak memiliki akses. Silakan login terlebih dahulu.'
      });
    }

    // 2) Verification token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3) Check if user still exists (simplified for now)
    // In production, you'd check against database

    // 4) Grant access to protected route
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      message: 'Token tidak valid atau sudah kadaluarsa.'
    });
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Anda tidak memiliki izin untuk melakukan aksi ini.'
      });
    }
    next();
  };
};

module.exports = { protect, restrictTo };
```

### 9. Add File Cleanup Job

```javascript
// src/jobs/cleanup.js
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const logger = require('../config/logger');
const { sequelize } = require('../config/database');

const cleanupOldFiles = async () => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days old

    // Get CVs older than 30 days
    const oldCVs = await CV.findAll({
      where: {
        createdAt: {
          [sequelize.Op.lt]: cutoffDate
        }
      }
    });

    let deletedFiles = 0;
    let deletedRecords = 0;

    for (const cv of oldCVs) {
      try {
        // Delete physical file
        if (fs.existsSync(cv.filePath)) {
          fs.unlinkSync(cv.filePath);
          deletedFiles++;
        }

        // Delete database record
        await cv.destroy();
        deletedRecords++;
      } catch (error) {
        logger.error(`Gagal menghapus CV ${cv.id}:`, error);
      }
    }

    logger.info(`Cleanup completed: ${deletedFiles} files, ${deletedRecords} records deleted`);
  } catch (error) {
    logger.error('Cleanup job failed:', error);
  }
};

// Schedule cleanup every day at 2 AM
cron.schedule('0 2 * * *', cleanupOldFiles);

module.exports = { cleanupOldFiles };
```

### 10. Environment Configuration

**Update .env**:
```bash
# Server Configuration
NODE_ENV=development
PORT=3001

# Database
DB_STORAGE=./database.sqlite

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Logging
LOG_LEVEL=info

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
UPLOAD_RATE_LIMIT_MAX=10

# Health Check
HEALTH_CHECK_ENABLED=true
```

**Create .env.example**:
```bash
# Copy this file to .env and update the values
NODE_ENV=development
PORT=3001
DB_STORAGE=./database.sqlite
JWT_SECRET=change-this-in-production
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=http://localhost:3000
LOG_LEVEL=info
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
UPLOAD_RATE_LIMIT_MAX=10
HEALTH_CHECK_ENABLED=true
```

---

## 📋 IMPLEMENTATION CHECKLIST

### Week 1
- [ ] Install security packages (helmet, express-rate-limit, express-validator, joi)
- [ ] Fix file upload security middleware
- [ ] Add rate limiting
- [ ] Fix CORS configuration
- [ ] Update .env configuration

### Week 2
- [ ] Implement input validation
- [ ] Create custom error classes
- [ ] Add proper error handler middleware
- [ ] Set up structured logging
- [ ] Add health check endpoint

### Month 1
- [ ] Add basic authentication system
- [ ] Implement file cleanup job
- [ ] Create API documentation (Swagger/OpenAPI)
- [ ] Add basic unit tests
- [ ] Set up development environment

### Month 2
- [ ] Migrate to PostgreSQL (optional for production)
- [ ] Add caching layer
- [ ] Implement comprehensive monitoring
- [ ] Add integration tests
- [ ] Create deployment pipeline

---

## 🧪 Testing Commands

**After implementing fixes, run these tests**:

```bash
# Test file upload security
curl -X POST -F "cv=@largefile.pdf" http://localhost:3001/api/talents/upload

# Test rate limiting
for i in {1..105}; do curl http://localhost:3001/api/talents; done

# Test CORS
curl -H "Origin: http://malicious-site.com" http://localhost:3001/api/talents

# Test health check
curl http://localhost:3001/health

# Test validation
curl -X PATCH -H "Content-Type: application/json" \
  -d '{"talentIds": []}' \
  http://localhost:3001/api/talents/select-academy
```

---

## ⚠️ Notes

1. **Backup database sebelum implementasi changes**
2. **Test di development environment terlebih dahulu**
3. **Monitor error logs setelah deployment**
4. **Consider security audit untuk production deployment**
5. **Regular updates untuk dependencies**

---

*Implementation Guide created: October 31, 2025*
*Priority Level: CRITICAL -> MEDIUM -> LOW*
*Estimated Total Implementation Time: 2-3 months*