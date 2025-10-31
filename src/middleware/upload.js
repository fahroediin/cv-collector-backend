const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// Konfigurasi penyimpanan file dengan keamanan lebih baik
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Folder untuk menyimpan CV
  },
  filename: function (req, file, cb) {
    // Generate filename yang lebih aman dengan crypto random
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `cv-${timestamp}-${randomBytes}${ext}`);
  }
});

// Filter untuk hanya menerima file PDF dengan validasi lebih ketat
const fileFilter = (req, file, cb) => {
  // Validasi MIME type
  if (file.mimetype !== 'application/pdf') {
    return cb(new Error('Format file tidak didukung. Harap unggah file PDF'), false);
  }

  // Validasi ekstensi file
  const allowedExtensions = ['.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    return cb(new Error('Ekstensi file tidak valid. Hanya file PDF yang diperbolehkan'), false);
  }

  // Validasi nama file (tidak boleh mengandung karakter spesial berbahaya)
  const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (dangerousChars.test(file.originalname)) {
    return cb(new Error('Nama file mengandung karakter tidak valid'), false);
  }

  cb(null, true);
};

// Konfigurasi upload dengan batasan keamanan
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 1, // Maksimal 1 file per request
    fields: 10, // Maksimal 10 fields per request
    fieldNameSize: 100, // Maksimal panjang nama field
  }
});

// Error handler khusus untuk multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File terlalu besar. Maksimal ukuran file adalah 10MB',
        error: 'LIMIT_FILE_SIZE'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Terlalu banyak file. Hanya 1 file yang diperbolehkan per upload',
        error: 'LIMIT_FILE_COUNT'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'File tidak diharapkan. Pastikan hanya mengupload file dengan field "cv"',
        error: 'LIMIT_UNEXPECTED_FILE'
      });
    }
  }

  if (err.message.includes('Format file tidak didukung') ||
      err.message.includes('Ekstensi file tidak valid') ||
      err.message.includes('Nama file mengandung karakter tidak valid')) {
    return res.status(400).json({
      success: false,
      message: err.message,
      error: 'INVALID_FILE'
    });
  }

  next(err);
};

module.exports = { upload, handleMulterError };