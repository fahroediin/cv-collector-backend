const fs = require('fs');
const pdf = require('pdf-parse');
const Tesseract = require('tesseract.js');

// Peta Skill (tidak ada perubahan)
const SKILL_MAP = {
  'javascript': ['javascript', 'js'], 'typescript': ['typescript', 'ts'], 'python': ['python'], 'java': ['java'], 'react': ['react', 'reactjs', 'react.js'], 'angular': ['angular', 'angularjs'], 'vue.js': ['vue', 'vuejs', 'vue.js'], 'node.js': ['node.js', 'nodejs', 'node js', 'backend development'], 'html': ['html', 'html5'], 'css': ['css', 'css3'], 'sql': ['sql'], 'mysql': ['mysql'], 'postgresql': ['postgresql', 'postgres'], 'mongodb': ['mongodb', 'mongo'], 'docker': ['docker'], 'kubernetes': ['kubernetes', 'k8s'], 'aws': ['aws', 'amazon web services'], 'git': ['git', 'github', 'gitlab'], 'ui/ux': ['ui/ux', 'ui ux', 'desain ui/ux', 'perancangan ui/ux', 'ui/ux designer'], 'figma': ['figma'], 'jira': ['jira'], 'trello': ['trello'], 'outsystems': ['outsystems'], 'project management': ['project management', 'manajemen proyek', 'project manager'], 'agile': ['agile', 'metodologi agile'], 'scrum': ['scrum', 'scrum master', 'scrum frameworks'], 'risk management': ['risk management', 'manajemen risiko'], 'machine learning': ['machine learning', 'pembelajaran mesin', 'kecerdasan buatan'], 'data analysis': ['data analysis', 'analisis data', 'analisa data'],
};

// --- Fungsi Helper Ekstraksi (Dasar) ---
const extractEmail = (text) => text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || null;
const extractPhoneNumber = (text) => {
  const cleanedText = text.replace(/[\s()-]/g, '');
  return cleanedText.match(/(?:\+62|62|0)8[1-9][0-9]{7,10}/)?.[0] || null;
};
const extractLinkedinUrl = (text) => text.match(/linkedin\.com\/in\/[a-zA-Z0-9_-]+/)?.[0] || null;
const extractName = (text) => text.match(/^[A-Z\s]{5,30}/)?.[0].trim() || text.split('\n')[0].trim();
const extractSkills = (text) => {
  const lowerCaseText = text.toLowerCase();
  const foundSkills = new Set();
  for (const canonicalSkill in SKILL_MAP) {
    for (const alias of SKILL_MAP[canonicalSkill]) {
      if (lowerCaseText.includes(alias)) foundSkills.add(canonicalSkill);
    }
  }
  return Array.from(foundSkills);
};

// --- FUNGSI PARSING YANG DIPERBAIKI SECARA DEFINITIF ---

const parseExperience = (fullText) => {
    const experiences = [];
    const lines = fullText.split('\n').filter(line => line.trim());
    const dateRegex = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Present|Saat ini|Sept).*\d{4}/i;
    const sectionEndRegex = /^(EDUCATION|SKILLS|CERTIFICATES)$/i;

    let inExperienceSection = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Mulai mencari setelah menemukan "WORK EXPERIENCE"
        if (/^WORK EXPERIENCE$/i.test(line)) {
            inExperienceSection = true;
            continue;
        }

        // Berhenti mencari jika sudah menemukan bagian selanjutnya
        if (inExperienceSection && sectionEndRegex.test(line)) {
            break;
        }

        if (inExperienceSection) {
            const match = line.match(dateRegex);
            if (match) {
                const date = match[0].trim();
                const company = line.replace(date, '').trim();
                const jobTitle = lines[i + 1]?.trim() || '';

                let description = '';
                let j = i + 2;
                while (j < lines.length) {
                    const nextLine = lines[j].trim();
                    if (dateRegex.test(nextLine) || sectionEndRegex.test(nextLine)) {
                        break;
                    }
                    description += nextLine + '\n';
                    j++;
                }
                
                if (company && jobTitle) {
                    experiences.push({ company, jobTitle, date, description: description.trim() });
                }
            }
        }
    }
    return experiences;
};

const parseEducation = (fullText) => {
    const educations = [];
    const lines = fullText.split('\n').filter(line => line.trim());
    const dateRegex = /(\d{4}\s*–\s*\d{4})/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const match = line.match(dateRegex);
        if (match) {
            const date = match[0];
            const school = line.replace(date, '').trim();
            const degree = lines[i + 1]?.trim() || '';

            if (school && degree) {
                educations.push({ school, degree, date });
            }
        }
    }
    return educations;
};

// --- Fungsi Utama Ekstraksi ---

const extractDataFromCV = async (filePath) => {
  let rawText = '';
  const dataBuffer = fs.readFileSync(filePath);

  try {
    const data = await pdf(dataBuffer);
    rawText = data.text || '';
    if (rawText.trim().length < 50) {
      console.log('Teks dari pdf-parse kosong, beralih ke OCR Tesseract...');
      const result = await Tesseract.recognize(filePath, 'eng+ind');
      rawText = result.data.text;
      console.log('Ekstraksi OCR selesai.');
    }

    if (!rawText) throw new Error('Tidak dapat mengekstrak teks dari file PDF.');

    return {
      name: extractName(rawText),
      email: extractEmail(rawText),
      phoneNumber: extractPhoneNumber(rawText),
      linkedinUrl: extractLinkedinUrl(rawText),
      skills: extractSkills(rawText),
      experience: parseExperience(rawText),
      education: parseEducation(rawText),
    };

  } catch (error) {
    console.error('Gagal memproses CV:', error);
    throw new Error('Gagal memproses file CV.');
  }
};

module.exports = { extractDataFromCV };

// // ----- KODE KHUSUS UNTUK DEBUGGING -----
// const fs = require('fs');
// const pdf = require('pdf-parse');

// const extractDataFromCV = async (filePath) => {
//   try {
//     const dataBuffer = fs.readFileSync(filePath);
//     const data = await pdf(dataBuffer);
//     const rawText = data.text || '';

//     // BARIS PALING PENTING: MENCETAK TEKS MENTAH KE KONSOL
//     console.log("\n\n\n--- MULAI TEKS MENTAH DARI PDF (MOHON SALIN SEMUA DI BAWAH INI) ---\n");
//     console.log(rawText);
//     console.log("\n--- AKHIR TEKS MENTAH DARI PDF (MOHON SALIN SEMUA DI ATAS INI) ---\n\n\n");

//     // Untuk sementara, kita kembalikan data kosong agar tidak error
//     return {
//       name: 'DEBUG',
//       email: `debug-${Date.now()}@test.com`,
//       phoneNumber: null,
//       linkedinUrl: null,
//       skills: [],
//       experience: [],
//       education: [],
//     };
//   } catch (error) {
//     console.error('Gagal memproses CV untuk debug:', error);
//     throw new Error('Gagal memproses file CV untuk debug.');
//   }
// };

// module.exports = { extractDataFromCV };