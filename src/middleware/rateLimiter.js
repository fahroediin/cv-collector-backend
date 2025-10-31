const rateLimit = require('express-rate-limit');

// Rate limiting untuk upload CV - 10 uploads per menit per IP
const uploadRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 menit
  max: 10, // Maksimal 10 upload per menit per IP
  message: {
    success: false,
    message: 'Terlalu banyak upload. Maksimal 10 CV per menit per IP. Silakan coba lagi dalam beberapa saat.',
    error: 'TOO_MANY_UPLOADS',
    retryAfter: '1 menit'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    // Log ketika rate limit terlampaui
    console.warn(`Rate limit exceeded for IP: ${req.ip} at ${new Date().toISOString()}`);

    res.status(429).json({
      success: false,
      message: 'Terlalu banyak upload. Maksimal 10 CV per menit per IP. Silakan coba lagi dalam beberapa saat.',
      error: 'TOO_MANY_UPLOADS',
      retryAfter: '1 menit',
      limit: 10,
      windowMs: 60000 // 1 menit dalam milidetik
    });
  },
  // Skip untuk successful requests (untuk menghemat memory)
  skipSuccessfulRequests: false,
  // Skip untuk failed requests
  skipFailedRequests: false,
});

// Rate limiting untuk general API - 100 requests per 15 menit per IP
const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 100, // Maksimal 100 requests per 15 menit per IP
  message: {
    success: false,
    message: 'Terlalu banyak request. Maksimal 100 request per 15 menit per IP.',
    error: 'TOO_MANY_REQUESTS',
    retryAfter: '15 menit'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`General rate limit exceeded for IP: ${req.ip} at ${new Date().toISOString()}`);

    res.status(429).json({
      success: false,
      message: 'Terlalu banyak request. Silakan coba lagi dalam beberapa saat.',
      error: 'TOO_MANY_REQUESTS',
      retryAfter: '15 menit'
    });
  }
});

// Rate limiting yang lebih ketat untuk endpoints sensitif
const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 20, // Maksimal 20 requests per 15 menit per IP
  message: {
    success: false,
    message: 'Terlalu banyak request pada endpoint ini. Silakan coba lagi dalam 15 menit.',
    error: 'STRICT_RATE_LIMIT_EXCEEDED',
    retryAfter: '15 menit'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  uploadRateLimiter,
  generalRateLimiter,
  strictRateLimiter
};