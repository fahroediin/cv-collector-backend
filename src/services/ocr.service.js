const fs = require('fs');
const pdf = require('pdf-parse');
const Tesseract = require('tesseract.js');

// --- Peta Skill Bilingual ---
// Kunci adalah nama skill kanonis (yang akan disimpan di DB).
// Value adalah array alias dalam bahasa Inggris dan Indonesia.
const SKILL_MAP = {
  'javascript': ['javascript', 'js'],
  'typescript': ['typescript', 'ts'],
  'python': ['python'],
  'java': ['java'],
  'react': ['react', 'reactjs', 'react.js'],
  'angular': ['angular', 'angularjs'],
  'vue.js': ['vue', 'vuejs', 'vue.js'],
  'node.js': ['node.js', 'nodejs', 'node js'],
  'html': ['html', 'html5'],
  'css': ['css', 'css3'],
  'sql': ['sql'],
  'mysql': ['mysql'],
  'postgresql': ['postgresql', 'postgres'],
  'mongodb': ['mongodb', 'mongo'],
  'docker': ['docker'],
  'kubernetes': ['kubernetes', 'k8s'],
  'aws': ['aws', 'amazon web services'],
  'git': ['git', 'github', 'gitlab'],
  'ui/ux': ['ui/ux', 'ui ux', 'desain ui/ux', 'perancangan ui/ux'],
  'figma': ['figma'],
  'product management': ['product management', 'manajemen produk'],
  'agile': ['agile', 'metodologi agile'],
  'scrum': ['scrum'],
  'machine learning': ['machine learning', 'pembelajaran mesin', 'kecerdasan buatan'],
  'data analysis': ['data analysis', 'analisis data', 'analisa data'],
};

// --- Fungsi Helper (Regex tidak perlu diubah, cukup universal) ---

const extractEmail = (text) => {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const match = text.match(emailRegex);
  return match ? match[0] : null;
};

const extractPhoneNumber = (text) => {
  const phoneRegex = /(?:\+62|62|0)8[1-9][0-9]{7,10}/g;
  const match = text.match(phoneRegex);
  return match ? match[0] : null;
};

const extractName = (text, email) => {
    if (email) {
        const nameFromEmail = email.split('@')[0].replace(/[._0-9]/g, ' ');
        return nameFromEmail.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
    const lines = text.split('\n').filter(line => line.trim() !== '');
    return lines.length > 0 ? lines[0].trim() : 'Nama Tidak Ditemukan';
};

/**
 * Mengekstrak skill dari teks dengan mencocokkan alias dari SKILL_MAP.
 * @param {string} text - Teks mentah dari CV.
 * @returns {string[]} Array berisi nama skill kanonis yang ditemukan.
 */
const extractSkills = (text) => {
  const lowerCaseText = text.toLowerCase();
  const foundSkills = new Set(); // Menggunakan Set untuk menghindari duplikasi

  // Iterasi melalui setiap skill kanonis di peta
  for (const canonicalSkill in SKILL_MAP) {
    const aliases = SKILL_MAP[canonicalSkill];
    
    // Cek setiap alias untuk skill tersebut
    for (const alias of aliases) {
      const skillRegex = new RegExp(`\\b${alias.replace('.', '\\.')}\\b`, 'g');
      if (lowerCaseText.match(skillRegex)) {
        foundSkills.add(canonicalSkill); // Tambahkan nama kanonisnya
        break; // Jika satu alias ditemukan, lanjut ke skill kanonis berikutnya
      }
    }
  }

  return Array.from(foundSkills);
};


// --- Fungsi Utama Ekstraksi ---

const extractDataFromCV = async (filePath) => {
  let rawText = '';
  const dataBuffer = fs.readFileSync(filePath);

  try {
    // 1. Coba ekstrak teks menggunakan pdf-parse
    const data = await pdf(dataBuffer);
    if (data.text && data.text.trim().length > 50) {
      console.log('Ekstraksi berhasil menggunakan pdf-parse (text-based).');
      rawText = data.text;
    } else {
      // 2. Fallback ke Tesseract OCR jika tidak ada teks
      console.log('Tidak ada teks ditemukan, beralih ke OCR Tesseract...');
      const result = await Tesseract.recognize(
        filePath,
        'eng+ind', // <-- PERUBAHAN KUNCI: Kenali Bahasa Inggris DAN Indonesia
        {
          logger: m => console.log(m.status, `${(m.progress * 100).toFixed(2)}%`),
        }
      );
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
    const skills = extractSkills(rawText); // Menggunakan fungsi extractSkills yang baru

    return {
      name,
      email,
      phoneNumber,
      skills,
      experience: [], 
    };

  } catch (error) {
    console.error('Gagal memproses CV:', error);
    throw new Error('Gagal memproses file CV.');
  }
};

module.exports = { extractDataFromCV };