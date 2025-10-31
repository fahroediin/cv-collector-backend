const express = require('express');
const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/database');

const router = express.Router();

// Health check endpoint - basic status
router.get('/health', async (req, res) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    memory: process.memoryUsage(),
    platform: process.platform,
    nodeVersion: process.version
  };

  try {
    // Check database connection
    await sequelize.authenticate();
    healthCheck.database = {
      status: 'connected',
      dialect: sequelize.getDialect()
    };

    // Check upload directory
    const uploadDir = path.join(__dirname, '..', '..', 'uploads');
    try {
      const stats = fs.statSync(uploadDir);
      healthCheck.uploadDirectory = {
        status: 'accessible',
        path: uploadDir,
        exists: true,
        writable: stats.mode & 0o200 // Check write permission
      };
    } catch (error) {
      healthCheck.uploadDirectory = {
        status: 'not accessible',
        path: uploadDir,
        exists: false,
        error: error.message
      };
    }

    // Check uploaded files count
    try {
      const files = fs.readdirSync(uploadDir);
      healthCheck.uploadDirectory.fileCount = files.length;
      healthCheck.uploadDirectory.totalSize = files.reduce((total, file) => {
        try {
          const filePath = path.join(uploadDir, file);
          const stats = fs.statSync(filePath);
          return total + stats.size;
        } catch (error) {
          return total;
        }
      }, 0);
    } catch (error) {
      healthCheck.uploadDirectory.fileCount = 0;
      healthCheck.uploadDirectory.totalSize = 0;
    }

    res.status(200).json(healthCheck);
  } catch (error) {
    console.error('Health check failed:', error);
    healthCheck.status = 'unhealthy';
    healthCheck.error = {
      message: error.message,
      type: error.constructor.name
    };

    res.status(503).json(healthCheck);
  }
});

// Readiness check - lebih detail untuk readiness probe
router.get('/ready', async (req, res) => {
  const readyCheck = {
    status: 'ready',
    timestamp: new Date().toISOString(),
    checks: {}
  };

  try {
    // Database readiness check
    try {
      await sequelize.authenticate();
      // Test query
      await sequelize.query('SELECT 1');
      readyCheck.checks.database = {
        status: 'ready',
        responseTime: Date.now()
      };
    } catch (error) {
      readyCheck.checks.database = {
        status: 'not ready',
        error: error.message
      };
      readyCheck.status = 'not ready';
    }

    // File system readiness check
    const uploadDir = path.join(__dirname, '..', '..', 'uploads');
    try {
      // Test write access
      const testFile = path.join(uploadDir, '.health-check');
      fs.writeFileSync(testFile, 'health check');
      fs.unlinkSync(testFile);

      readyCheck.checks.uploadDirectory = {
        status: 'ready',
        writable: true
      };
    } catch (error) {
      readyCheck.checks.uploadDirectory = {
        status: 'not ready',
        writable: false,
        error: error.message
      };
      readyCheck.status = 'not ready';
    }

    // Memory check
    const memoryUsage = process.memoryUsage();
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    readyCheck.checks.memory = {
      status: memoryUsagePercent < 90 ? 'ready' : 'warning',
      usage: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
      },
      usagePercent: `${Math.round(memoryUsagePercent)}%`
    };

    const statusCode = readyCheck.status === 'ready' ? 200 : 503;
    res.status(statusCode).json(readyCheck);

  } catch (error) {
    readyCheck.status = 'not ready';
    readyCheck.error = error.message;
    res.status(503).json(readyCheck);
  }
});

// Liveness check - simple check untuk container health
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Detailed system information (hanya untuk development/admin)
router.get('/info', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      message: 'Endpoint tidak tersedia di production'
    });
  }

  const systemInfo = {
    timestamp: new Date().toISOString(),
    system: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      uptime: process.uptime()
    },
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    environment: process.env.NODE_ENV,
    database: {
      dialect: sequelize.getDialect(),
      storage: sequelize.config.storage
    },
    uploadConfig: {
      maxFileSize: '10MB',
      allowedFormats: ['PDF']
    }
  };

  res.status(200).json(systemInfo);
});

module.exports = router;