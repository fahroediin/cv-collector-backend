const fs = require('fs');
const pdf = require('pdf-parse');
const Tesseract = require('tesseract.js');

// --- Daftar Skill untuk Pencocokan ---
// Daftar ini bisa diperluas atau dipindahkan ke database
const SKILL_LIST = [
  'javascript', 'typescript', 'python', 'java', 'c#', 'php', 'ruby', 'go',
  'react', 'angular', 'vue.js', 'next.js', 'node.js', 'express', 'django', 'flask', 'laravel',
  'spring boot', 'html', 'css', 'sass', 'tailwind css', 'bootstrap',
  'sql', 'mysql', 'postgresql', 'mongodb', 'redis',
  'docker', 'kubernetes', 'aws', 'google cloud', 'azure', 'git',
  'ui/ux', 'figma', 'adobe xd', 'sketch', 'product management', 'agile', 'scrum',
  'data analysis', 'machine learning', 'tensorflow', 'pytorch'
];

// --- Fungsi Helper dengan Regex ---

const extractEmail = (text) => {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const match = text.match(emailRegex);
  return match ? match[0] : null;
};

const extractPhoneNumber = (text) => {
  // Regex ini mencoba menangkap berbagai format nomor telepon Indonesia
  const phoneRegex = /(?:\+62|62|0)8[1-9][0-9]{7,10}/g;
  const match = text.match(phoneRegex);
  return match ? match[0] : null;
};

const extractName = (text, email) => {
    // Ekstraksi nama adalah yang paling sulit dan tidak pasti.
    // Strategi 1: Ambil dari email
    if (email) {
        const nameFromEmail = email.split('@')[0].replace(/[._0-9]/g, ' ');
        // Capitalize each word
        return nameFromEmail.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
    // Strategi 2: Ambil baris pertama yang tidak kosong dari teks
    const lines = text.split('\n').filter(line => line.trim() !== '');
    return lines.length > 0 ? lines[0].trim() : 'Nama Tidak Ditemukan';
};

const extractSkills = (text) => {
  const lowerCaseText = text.toLowerCase();
  const foundSkills = new Set(); // Menggunakan Set untuk menghindari duplikasi

  SKILL_LIST.forEach(skill => {
    // Menggunakan word boundary (\b) agar tidak salah mencocokkan (misal: "go" di dalam "google")
    const skillRegex = new RegExp(`\\b${skill}\\b`, 'g');
    if (lowerCaseText.match(skillRegex)) {
      foundSkills.add(skill);
    }
  });

  return Array.from(foundSkills);
};


// --- Fungsi Utama Ekstraksi ---

const extractDataFromCV = async (filePath) => {
  let rawText = '';
  const dataBuffer = fs.readFileSync(filePath);

  try {
    // 1. Coba ekstrak teks menggunakan pdf-parse (untuk PDF native)
    const data = await pdf(dataBuffer);
    if (data.text && data.text.trim().length > 50) { // Cek jika ada teks yang cukup
      console.log('Ekstraksi berhasil menggunakan pdf-parse (text-based).');
      rawText = data.text;
    } else {
      // 2. Jika tidak ada teks, fallback ke Tesseract OCR (untuk PDF scanned)
      console.log('Tidak ada teks ditemukan, beralih ke OCR Tesseract...');
      const result = await Tesseract.recognize(filePath, 'eng', {
        logger: m => console.log(m.status, `${(m.progress * 100).toFixed(2)}%`),
      });
      rawText = result.data.text;
      console.log('Ekstraksi OCR selesai.');
    }

    if (!rawText) {
        throw new Error('Tidak dapat mengekstrak teks dari file PDF.');
    }

    // 3. Ekstrak informasi terstruktur dari teks mentah
    const email = extractEmail(rawText);
    const phoneNumber = extractPhoneNumber(rawText);
    const name = extractName(rawText, email);
    const skills = extractSkills(rawText);

    return {
      name,
      email,
      phoneNumber,
      skills,
      // Ekstraksi experience lebih kompleks, bisa ditambahkan di sini nanti
      experience: [], 
    };

  } catch (error) {
    console.error('Gagal memproses CV:', error);
    throw new Error('Gagal memproses file CV.');
  }
};

module.exports = { extractDataFromCV };