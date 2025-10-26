const fs = require('fs');
const pdf = require('pdf-parse');
const Tesseract = require('tesseract.js');

// --- Peta Skill yang Diperbarui berdasarkan CV ---
const SKILL_MAP = {
  'javascript': ['javascript', 'js'],
  'typescript': ['typescript', 'ts'],
  'python': ['python'],
  'java': ['java'],
  'react': ['react', 'reactjs', 'react.js'],
  'angular': ['angular', 'angularjs'],
  'vue.js': ['vue', 'vuejs', 'vue.js'],
  'node.js': ['node.js', 'nodejs', 'node js', 'backend development'],
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
  'ui/ux': ['ui/ux', 'ui ux', 'desain ui/ux', 'perancangan ui/ux', 'ui/ux designer'],
  'figma': ['figma'],
  'jira': ['jira'],
  'trello': ['trello'],
  'outsystems': ['outsystems'],
  'project management': ['project management', 'manajemen proyek', 'project manager'],
  'agile': ['agile', 'metodologi agile'],
  'scrum': ['scrum', 'scrum master', 'scrum frameworks'],
  'risk management': ['risk management', 'manajemen risiko'],
  'machine learning': ['machine learning', 'pembelajaran mesin', 'kecerdasan buatan'],
  'data analysis': ['data analysis', 'analisis data', 'analisa data'],
};

// --- Fungsi Helper Ekstraksi ---

const extractEmail = (text) => text.match(/[a-zA-Z0-B9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || null;
// Ganti fungsi lama dengan yang ini
const extractPhoneNumber = (text) => {
  // Pertama, hapus semua spasi, tanda kurung, dan strip dari teks
  const cleanedText = text.replace(/[\s()-]/g, '');
  // Kemudian, jalankan regex pada teks yang sudah bersih
  const phoneRegex = /(?:\+62|62|0)8[1-9][0-9]{7,10}/;
  const match = cleanedText.match(phoneRegex);
  return match ? match[0] : null;
};
const extractLinkedinUrl = (text) => text.match(/linkedin\.com\/in\/[a-zA-Z0-9_-]+/)?.[0] || null;

const extractName = (text) => {
  const lines = text.split('\n').filter(line => line.trim() !== '');
  // Cari baris pertama yang kemungkinan besar adalah nama (2-3 kata, mungkin kapital semua)
  for (const line of lines) {
    if (line.trim().match(/^[A-Z\s]{5,30}$/)) {
      return line.trim();
    }
  }
  return lines.length > 0 ? lines[0].trim() : 'Nama Tidak Ditemukan';
};

const extractSkills = (text) => {
  const lowerCaseText = text.toLowerCase();
  const foundSkills = new Set();
  for (const canonicalSkill in SKILL_MAP) {
    for (const alias of SKILL_MAP[canonicalSkill]) {
      const skillRegex = new RegExp(`\\b${alias.replace('.', '\\.')}\\b`, 'gi');
      if (lowerCaseText.match(skillRegex)) {
        foundSkills.add(canonicalSkill);
        break;
      }
    }
  }
  return Array.from(foundSkills);
};

const extractExperience = (text) => {
    const experiences = [];
    const lines = text.split('\n');
    const dateRegex = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Present|Saat ini)[\w\s,–-]{4,}/i;
    let currentExperience = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (dateRegex.test(line) && line.length < 40) { // Cek panjang untuk menghindari deskripsi
            if (currentExperience) experiences.push(currentExperience);
            
            // Logika untuk menemukan Judul dan Perusahaan (biasanya 1-2 baris di atas tanggal)
            const jobTitle = lines[i - 1]?.trim() || '';
            const company = lines[i - 2]?.trim() || '';

            currentExperience = {
                company: company,
                jobTitle: jobTitle,
                date: line,
                description: ''
            };
        } else if (currentExperience && line) {
            currentExperience.description += (line.startsWith('•') ? '\n' : ' ') + line;
        }
    }
    if (currentExperience) experiences.push(currentExperience);
    return experiences.map(exp => ({...exp, description: exp.description.trim()}));
};

// --- Fungsi Utama Ekstraksi ---

const extractDataFromCV = async (filePath) => {
  let rawText = '';
  const dataBuffer = fs.readFileSync(filePath);

  try {
    const data = await pdf(dataBuffer);
    if (data.text && data.text.trim().length > 50) {
      console.log('Ekstraksi berhasil menggunakan pdf-parse (text-based).');
      rawText = data.text;
    } else {
      console.log('Tidak ada teks ditemukan, beralih ke OCR Tesseract...');
      const result = await Tesseract.recognize(filePath, 'eng+ind', {
        logger: m => console.log(m.status, `${(m.progress * 100).toFixed(2)}%`),
      });
      rawText = result.data.text;
      console.log('Ekstraksi OCR selesai.');
    }

    if (!rawText) throw new Error('Tidak dapat mengekstrak teks dari file PDF.');

    const workExperienceSection = rawText.split(/WORK EXPERIENCE|PENGALAMAN KERJA/i)[1]?.split(/EDUCATION|PENDIDIKAN|SKILLS|KEAHLIAN/i)[0] || '';
    
    return {
      name: extractName(rawText),
      email: extractEmail(rawText),
      phoneNumber: extractPhoneNumber(rawText),
      linkedinUrl: extractLinkedinUrl(rawText),
      skills: extractSkills(rawText),
      experience: extractExperience(workExperienceSection),
      education: [], // Logika ekstraksi pendidikan bisa ditambahkan di sini
    };

  } catch (error) {
    console.error('Gagal memproses CV:', error);
    throw new Error('Gagal memproses file CV.');
  }
};

module.exports = { extractDataFromCV };