```markdown
# CV Collector Backend

Aplikasi backend sederhana yang dibangun dengan Express.js untuk mengelola dan memproses CV talent. Aplikasi ini dirancang untuk menerima unggahan CV, mengekstrak informasi penting secara otomatis menggunakan OCR, dan menyajikannya melalui REST API untuk manajemen talent.

## Fitur Utama (Fungsionalitas)

-   **Unggah CV**: Menerima unggahan file CV dalam format PDF.
-   **Ekstraksi Data Otomatis**:
    -   Membaca PDF berbasis teks secara langsung untuk kecepatan dan akurasi.
    -   Menggunakan Tesseract.js OCR sebagai fallback untuk memproses PDF hasil *scan* (berbasis gambar).
-   **Dukungan Multi-Bahasa**: Mampu memproses CV yang ditulis dalam **Bahasa Indonesia** dan **Bahasa Inggris**.
-   **Manajemen Talent**: Menyimpan profil talent yang diekstrak ke dalam database, termasuk informasi kontak dan daftar skill.
-   **Versioning CV**: Setiap CV yang diunggah untuk talent yang sudah ada akan disimpan sebagai versi baru, tidak menimpa data lama.
-   **Manajemen Skill**: Mengidentifikasi skill dari CV dan menghubungkannya ke profil talent (relasi Many-to-Many).
-   **Seleksi Akademi**: Memungkinkan manajer untuk menandai talent potensial sebagai kandidat untuk program akademi.

## Teknologi yang Digunakan

-   **Backend**: Node.js, Express.js
-   **Database**: SQLite (via Sequelize ORM)
-   **File Upload**: Multer
-   **PDF Processing**:
    -   `pdf-parse` untuk PDF berbasis teks.
    -   `tesseract.js` untuk OCR pada PDF berbasis gambar.
-   **Environment Variables**: dotenv

## Instalasi dan Konfigurasi

1.  **Clone repository ini:**
    ```bash
    git clone <url-repository-anda>
    cd cv-collector-backend
    ```

2.  **Install semua dependensi:**
    ```bash
    npm install
    ```

3.  **Buat file konfigurasi environment:**
    Buat file bernama `.env` di root folder proyek dan isi dengan konten berikut.
    ```.env
    PORT=3001
    DB_STORAGE=./database.sqlite
    ```
    -   `PORT`: Port tempat server akan berjalan.
    -   `DB_STORAGE`: Path ke file database SQLite yang akan dibuat secara otomatis.

## Menjalankan Aplikasi

Untuk menjalankan server dalam mode development, gunakan perintah:

```bash
node src/app.js
```

Server akan berjalan di `http://localhost:3001` (atau port yang Anda tentukan di `.env`).

---

## Dokumentasi API (Cara Interaksi)

Berikut adalah detail endpoint yang tersedia untuk berinteraksi dengan backend.

### 1. Mengunggah CV Talent

Endpoint ini digunakan untuk mengunggah satu file CV. Proses ekstraksi data akan berjalan di latar belakang.

-   **URL**: `/api/talents/upload`
-   **Method**: `POST`
-   **Tipe Request**: `multipart/form-data`
-   **Form Field**:
    -   `cv`: File PDF yang akan diunggah.

---

-   **Contoh Response Sukses (`202 Accepted`)**
    Server menerima file dan akan memprosesnya.
    ```json
    {
        "message": "CV berhasil diunggah dan sedang diproses"
    }
    ```

-   **Contoh Response Gagal (`400 Bad Request`)**
    -   Jika format file bukan PDF:
        ```json
        {
            "message": "Format file tidak didukung. Harap unggah file PDF"
        }
        ```
    -   Jika tidak ada file yang diunggah:
        ```json
        {
            "message": "Silakan pilih file CV untuk diunggah"
        }
        ```

### 2. Melihat Daftar Semua Talent

Mengambil daftar semua talent yang ada di database beserta skill utama mereka.

-   **URL**: `/api/talents`
-   **Method**: `GET`

---

-   **Contoh Response Sukses (`200 OK`)**
    ```json
    [
        {
            "id": 1,
            "name": "Budi Santoso",
            "email": "budi.santoso@example.com",
            "phoneNumber": "081234567890",
            "status": "New",
            "skills": [
                { "name": "javascript" },
                { "name": "react" },
                { "name": "node.js" }
            ]
        },
        {
            "id": 2,
            "name": "Jane Doe",
            "email": "jane.doe@example.com",
            "phoneNumber": "089876543210",
            "status": "Kandidat Academy",
            "skills": [
                { "name": "python" },
                { "name": "data analysis" }
            ]
        }
    ]
    ```

### 3. Melihat Detail Talent

Mengambil informasi lengkap dari satu talent berdasarkan ID-nya, termasuk riwayat versi CV dan semua skill.

-   **URL**: `/api/talents/:id`
-   **Method**: `GET`
-   **URL Params**:
    -   `id` (required): ID unik dari talent.

---

-   **Contoh Response Sukses (`200 OK`)**
    ```json
    {
        "id": 1,
        "name": "Budi Santoso",
        "email": "budi.santoso@example.com",
        "phoneNumber": "081234567890",
        "linkedinUrl": null,
        "status": "New",
        "createdAt": "2025-10-26T10:00:00.000Z",
        "updatedAt": "2025-10-26T10:00:00.000Z",
        "cvs": [
            {
                "id": 2,
                "filePath": "uploads/cv-1698314400000.pdf",
                "version": 2,
                "createdAt": "2025-10-26T10:00:00.000Z"
            },
            {
                "id": 1,
                "filePath": "uploads/cv-1698310800000.pdf",
                "version": 1,
                "createdAt": "2025-10-25T09:00:00.000Z"
            }
        ],
        "skills": [
            { "name": "javascript" },
            { "name": "react" },
            { "name": "node.js" }
        ]
    }
    ```

-   **Contoh Response Gagal (`404 Not Found`)**
    ```json
    {
        "message": "Talent tidak ditemukan"
    }
    ```

### 4. Memilih Talent untuk Akademi

Menandai satu atau beberapa talent sebagai "Kandidat Academy".

-   **URL**: `/api/talents/select-academy`
-   **Method**: `PATCH`
-   **Tipe Request**: `application/json`
-   **Request Body**:
    ```json
    {
        "talentIds":
    }
    ```
    -   `talentIds` (required): Array berisi ID talent yang akan diubah statusnya.

---

-   **Contoh Response Sukses (`200 OK`)**
    ```json
    {
        "message": "Talent berhasil ditandai sebagai kandidat academy"
    }
    ```

-   **Contoh Response Gagal (`400 Bad Request`)**
    Jika `talentIds` kosong atau tidak dikirim.
    ```json
    {
        "message": "Silakan pilih minimal satu talent"
    }
    ```

## Struktur Proyek

```
cv-collector-backend/
├── src/
│   ├── api/
│   │   ├── talents/      # Modul untuk talent (controller, service, routes, model)
│   │   └── skills/       # Modul untuk skill (model)
│   ├── config/           # Konfigurasi (database)
│   ├── middleware/       # Middleware (file upload, error handling)
│   ├── services/         # Layanan inti (OCR, parsing)
│   └── app.js            # Entry point aplikasi Express
├── uploads/              # Folder tempat CV yang diunggah disimpan
├── .env                  # File environment variables
└── package.json
```
```