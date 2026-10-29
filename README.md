# Geo Entity Manager

[![Go Version](https://img.shields.io/badge/Go-1.22+-00ADD8?style=flat&logo=go)](https://golang.org)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat&logo=postgresql)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker)](https://www.docker.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Platform web fullstack untuk visualisasi, pemantauan, dan pengelolaan entitas bergeolokasi (armada logistik, perangkat IoT, sensor lingkungan, fasilitas industri, hingga drone patroli) di atas peta interaktif berbasis koordinat standar.

Aplikasi ini mengintegrasikan antarmuka peta interaktif dengan backend Go/Gin dan basis data PostgreSQL, dilengkapi klasifikasi tipe dinamis, pencarian alamat (geocoding), serta validasi skema di sisi klien dan server.

---

## Fitur Utama

* **Visualisasi Spasial & Custom Marker:** Peta interaktif Leaflet dengan marker pin SVG bertema warna unik per tipe entitas serta indikator status operasional (*active*, *maintenance*, *inactive*).
* **Pencarian Tempat & Map Coordinate Picker:** Temukan lokasi menggunakan kotak pencarian alamat instan (OpenStreetMap Nominatim) atau klik titik pada peta untuk mengisi otomatis koordinat *latitude* dan *longitude* ke formulir.
* **Dynamic Entity Classification & Unique Color Assignment:** Pengguna dapat memilih tipe entitas dari saran bawaan (`vehicle`, `iot_sensor`, `iot_device`, `facility`, `drone`), menambahkan kategori baru yang otomatis mendapatkan **warna unik baru** tanpa bertabrakan, atau menghapus tipe yang tidak lagi terpakai melalui *Dropdown Combobox* berkonfirmasi.
* **Manajemen CRUD:** Tambah, lihat detail, perbarui atribut/metadata, dan hapus data (*soft delete*) dengan pembaruan instan pada peta dan sidebar.
* **Drawer Inspeksi Non-Modal:** Panel detail samping yang bersih (*flat border*) memungkinkan eksplorasi atribut dan metadata JSONB sambil tetap dapat berinteraksi dengan peta.
* **Validasi Skema Klien & Server:** Penegakan aturan ketat dan selaras di Frontend (Zod) dan Backend (Go Validator) untuk rentang koordinat valid (`-90 <= lat <= 90`, `-180 <= lng <= 180`), format JSON, dan panjang karakter.

---

## Struktur Direktori

```text
.
├── backend-entity-service/           # Layanan REST API Go (Gin + GORM)
│   ├── cmd/server/main.go            # Entrypoint binary & wiring
│   └── internal/                     # Private packages (config, database, models, repository, handlers, server, validator)
├── frontend-entity-service/          # Aplikasi SPA React + TypeScript + Vite
│   ├── src/                          # Komponen UI, peta Leaflet, Zustand store, Zod schema, & repository HTTP
│   └── scripts/check-ui-guidelines.mjs # Linter otomatis aturan desain UI
├── docs/                             # Dokumentasi PRD, arsitektur teknis, & panduan agent
├── AGENTS.md                         # Instruksi standar kode & arsitektur untuk AI agent
└── docker-compose.yml                # Orkestrasi kontainer Postgres, Backend, & Frontend
```

---

## Arsitektur & Pilihan Teknologi

| Komponen | Pilihan Teknologi | Alasan Pemilihan |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 18 + TypeScript + Vite** | Type-safety end-to-end mencegah kesalahan struktur koordinat; Vite menyediakan proses kompilasi dan HMR cepat. |
| **Peta Spasial** | **Leaflet (`react-leaflet`)** | Library pemetaan open-source yang ringan, stabil, dan independen tanpa dependensi API key berbayar. |
| **State Management** | **Zustand** | Manajemen state terpusat yang ringkas dan reaktif, menyinkronkan interaksi peta, sidebar, dan dialog. |
| **Form & Validasi UI** | **React Hook Form + Zod** | Menjamin performa formulir tanpa re-render berlebih dengan deklarasi skema validasi yang selaras dengan aturan server. |
| **Komponen Antarmuka** | **Tailwind CSS + `shadcn/ui` (Radix)** | Komponen berbasis primitif aksesibel (WAI-ARIA) dengan token warna semantik dan pemisahan arsitektur yang rapi. |
| **Backend API** | **Go (Golang 1.22+) + Gin** | Bahasa terkompilasi dengan efisiensi memori tinggi, arsitektur modular, dan routing cepat. |
| **Data Access & ORM** | **GORM + `gorm.io/datatypes`** | Mempercepat produktivitas kueri, migrasi otomatis, soft delete, serta dukungan native tipe data UUID dan JSONB. |
| **Basis Data** | **PostgreSQL 16 Alpine** | Basis data relasional ACID dengan indeks B-Tree untuk koordinat/status serta indeks GIN untuk kolom metadata JSONB. |
| **Kontainerisasi** | **Docker & Docker Compose** | Menjamin konsistensi lingkungan pengembangan dan kemudahan menjalankan seluruh stack dalam satu perintah. |

---

## Panduan Menjalankan Aplikasi

### 1. Menggunakan Docker Compose (Direkomendasikan)

Pastikan Docker Desktop / Docker Engine telah berjalan di perangkat Anda:

```bash
# 1. Salin konfigurasi environment
cp .env.example .env

# 2. Bangun dan jalankan seluruh layanan di latar belakang
docker compose up -d --build
```

Setelah proses selesai, akses layanan pada tautan berikut:
* **Frontend Web Dashboard:** `http://localhost:5173`
* **Backend REST API:** `http://localhost:8080/api/v1`
* **Health Check Endpoint:** `http://localhost:8080/api/v1/health`

Untuk menghentikan seluruh layanan:
```bash
docker compose down
```

---

### 2. Menjalankan Secara Manual (Local Development)

#### Prasyarat
* **Go** versi `1.22+`
* **Node.js** versi `20+` & `npm`
* **PostgreSQL** versi `14+` / `16+` berjalan pada port `5432`

#### Langkah 1: Siapkan Database
Buat database pada PostgreSQL lokal:
```bash
psql -U postgres -c "CREATE DATABASE geo_entity_db;"
```

#### Langkah 2: Jalankan Backend (Entity Service)
```bash
cd backend-entity-service
go mod tidy
go run ./cmd/server
```
*Backend akan otomatis menjalankan migrasi skema tabel, membuat constraint/indeks, serta mengisi 5 data sampel awal (*seeding*) pada start pertama.*

#### Langkah 3: Jalankan Frontend (Web Dashboard)
Buka terminal baru:
```bash
cd frontend-entity-service
npm install
npm run dev
```
Buka browser pada alamat `http://localhost:5173`.

---

## Pengujian & Kualitas Kode

Proyek ini dilengkapi dengan suite pengujian otomatis di kedua sisi:

```bash
# 1. Pengujian Unit Backend (Go httptest + testify)
cd backend-entity-service
go test -v ./...

# 2. Pengujian Validasi Skema Frontend (Jest + ts-jest)
cd frontend-entity-service
npm test

# 3. Audit Aturan Desain & Linter UI (Bebas raw colors, margin luar, dll.)
cd frontend-entity-service
npm run lint:ui
```

---

## Referensi Endpoint API

Seluruh endpoint bernaung di bawah prefix `/api/v1` dan merespons dalam format amplop JSON standar:

| Method | Endpoint | Fungsi |
| :--- | :--- | :--- |
| `GET` | `/health` | Memeriksa status kesehatan server dan koneksi pool PostgreSQL |
| `GET` | `/entities` | Mengambil daftar entitas dengan filter opsional (`?type=`, `?status=`, `?search=`) |
| `GET` | `/entities/types` | Mengambil daftar agregasi kategori tipe entitas unik |
| `DELETE` | `/entities/types/:type` | Menghapus kategori tipe entitas jika tidak sedang digunakan oleh entitas aktif (`409 Conflict` bila masih dipakai) |
| `GET` | `/entities/:id` | Mengambil detail spesifik satu entitas berdasarkan UUIDv4 |
| `POST` | `/entities` | Mendaftarkan entitas baru dengan validasi skema menyeluruh |
| `PUT` | `/entities/:id` | Memperbarui atribut, koordinat, atau metadata entitas |
| `DELETE` | `/entities/:id` | Menghapus entitas dari pemantauan aktif (*soft delete*) |

### Contoh Pengujian Cepat via cURL

```bash
# 1. Cek kesehatan sistem dan konektivitas database
curl -s http://localhost:8080/api/v1/health | jq

# 2. Ambil entitas berstatus aktif dengan kategori vehicle
curl -s "http://localhost:8080/api/v1/entities?type=vehicle&status=active" | jq

# 3. Daftarkan entitas baru dengan tipe kustom dan metadata JSON
curl -s -X POST http://localhost:8080/api/v1/entities \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Kapal Patroli Laut 08",
    "type": "maritime_vessel",
    "status": "active",
    "latitude": -5.9821,
    "longitude": 106.6120,
    "description": "Patroli perairan teluk Jakarta",
    "metadata": {"fuel_pct": 82, "radar": "online"}
  }' | jq
```

---

## Dokumentasi Teknis & Arsitektur Lanjutan

Untuk rincian arsitektur yang lebih mendalam, diagram alur, dan pemodelan relasional, silakan telusuri berkas di direktori `docs/`:

* **[docs/architecture.md](docs/architecture.md):** Diagram alur sekuens interaksi data, pemodelan skema database (ERD), aturan koordinat, tata kelola UI/UX, dan kamus variabel lingkungan.
* **[docs/prd.md](docs/prd.md):** Dokumen spesifikasi kebutuhan produk komprehensif, justifikasi teknis, dan matriks risiko.
* **[AGENTS.md](AGENTS.md):** Panduan instruksi, aturan arsitektur, standar kode, dan batasan keamanan untuk AI coding agent.

---

## Pemecahan Masalah (Troubleshooting & FAQ)

* **Apabila Port 5432 atau 8080 bentrok dengan service lokal**
  * Ubah mapping port host pada berkas `.env` (misal: `DB_PORT=5433` atau `PORT=8081`), lalu restart kontainer dengan `docker compose up -d`.
* **Bagaimana cara mereset dan memuat ulang data awal (*seed*)?**
  * Hapus volume database dan bangun ulang:
    ```bash
    docker compose down -v
    docker compose up -d --build
    ```
    Backend akan otomatis membuat skema bersih dan mengisi 5 entitas sampel awal.
* **Tampilan peta tidak memuat *tiles* dengan benar?**
  * Pastikan perangkat terhubung ke internet karena Leaflet memuat tile peta OpenStreetMap standar secara daring.

---

## Workflow Penggunaan Agentic AI

Sesuai instruksi pengerjaan *take-home test*, Agentic AI dimanfaatkan sebagai mitra pemrograman (*pair programming*) terstruktur:

1. **Penyusunan Spesifikasi & Scaffolding:** Membantu penyusunan draf awal spesifikasi kebutuhan ([docs/prd.md](docs/prd.md)), kontrak endpoint REST API, dan kerangka dasar direktori proyek.
2. **Implementasi Berbasis Panduan:** Menghasilkan boilerplate CRUD backend, skema validasi validator, serta komponen antarmuka dengan mengikuti panduan arsitektur pada [AGENTS.md](AGENTS.md).
3. **Refaktorisasi & Pengujian:** Membantu penulisan unit test (`entity_test.go` dan `entitySchema.test.ts`), perapian struktur direktori modular, dan audit pedoman UI.

Seluruh keputusan desain, pemodelan basis data, penanganan koordinat WGS, penyesuaian detail UX, serta verifikasi pengujian dikendalikan dan ditinjau langsung oleh pengembang. Dokumentasi instruksi AI tersedia pada berkas [AGENTS.md](AGENTS.md).
