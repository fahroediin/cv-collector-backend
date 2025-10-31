const rateLimit = require('express-rate-limit');

// Simple rate limiter untuk upload CV - 10 uploads per menit per IP
const uploadRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 menit
  max: 10, // Maksimal 10 upload per menit per IP
  message: {
    success: false,
    message: 'Terlalu banyak upload. Maksimal 10 CV per menit per IP. Silakan coba lagi dalam beberapa saat.',
    error: 'TOO_MANY_UPLOADS',
    retryAfter: '1 menit'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`Upload rate limit exceeded for IP: ${req.ip} at ${new Date().toISOString()}`);
    res.status(429).json({
      success: false,
      message: 'Terlalu banyak upload. Maksimal 10 CV per menit per IP. Silakan coba lagi dalam beberapa saat.',
      error: 'TOO_MANY_UPLOADS',
      retryAfter: '1 menit'
    });
  }
});

// General rate limiter - 100 requests per 15 menit per IP
const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 100,
  message: {
    success: false,
    message: 'Terlalu banyak request. Silakan coba lagi dalam 15 menit.',
    error: 'TOO_MANY_REQUESTS',
    retryAfter: '15 menit'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`General rate limit exceeded for IP: ${req.ip} at ${new Date().toISOString()}`);
    res.status(429).json({
      success: false,
      message: 'Terlalu banyak request. Silakan coba lagi dalam 15 menit.',
      error: 'TOO_MANY_REQUESTS',
      retryAfter: '15 menit'
    });
  }
});

module.exports = {
  uploadRateLimiter,
  generalRateLimiter
};