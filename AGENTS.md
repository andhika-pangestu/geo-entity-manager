# AGENTS.md

Panduan resmi instruksi, aturan arsitektur, dan konteks kerja untuk AI coding agent (Cursor, Claude Code, Aider, Codex, Antigravity) saat membaca, memodifikasi, atau menambahkan kode pada repositori **Geo Entity Manager**.

---

## 1. Project Overview

**Geo Entity Manager** adalah platform web fullstack untuk memantau dan mengelola objek/aset bergeolokasi (kendaraan, sensor IoT, fasilitas, drone) di atas peta interaktif dengan koordinat, klasifikasi tipe dinamis, dan validasi ganda.

### Tech Stack Utama
* **Backend:** Go (Golang 1.22+), Gin Web Framework, GORM, PostgreSQL 16 Alpine.
* **Frontend:** React 18, TypeScript 5.6, Vite, Leaflet (`react-leaflet`), Tailwind CSS, `shadcn/ui` (Radix Primitives), Zustand, React Hook Form, Zod.
* **DevOps:** Docker & Docker Compose multi-stage build.

### Struktur Direktori Inti
```text
.
├── backend-entity-service/
│   ├── cmd/server/main.go            # Entrypoint binary & wiring
│   └── internal/                     # Private Go packages
│       ├── config/                   # 12-factor env configuration
│       ├── database/                 # Postgres connection, migrate, seed
│       ├── models/                   # GORM entities, DTOs, validation tags
│       ├── repository/               # Data access layer (GORM queries)
│       ├── handlers/                 # Gin controllers (HTTP context & response)
│       ├── server/                   # HTTP server lifecycle, routes, CORS
│       └── validator/                # Validation error message formatter
├── frontend-entity-service/
│   ├── src/
│   │   ├── api/                      # Axios instance & HttpEntityRepository
│   │   ├── components/
│   │   │   ├── ui/                   # Primitif atomik shadcn/ui murni
│   │   │   ├── shared/               # Wrapper komposisi (Modal, FormField, StatCard)
│   │   │   ├── layout/               # Navbar & header
│   │   │   ├── entity/               # Fitur entitas (Sidebar, Card, DetailSheet, Form)
│   │   │   └── map/                  # Kanvas Leaflet, toolbar, marker, search
│   │   ├── store/useEntityStore.ts   # Single source of truth Zustand store
│   │   ├── schemas/                  # Zod validation schemas & tests
│   │   ├── types/entity.ts           # Domain models, ApiResponse<T>, Repository<T>
│   │   └── lib/                      # utils.ts (cn), mapIcons.ts (SVG DivIcon)
│   └── scripts/check-ui-guidelines.mjs # Linter otomatis aturan desain UI
└── docs/                             # PRD, arsitektur teknis, & requirement
```

---

## 2. Perintah Build dan Tes (Build & Test Commands)

Pastikan memverifikasi perubahan kode dengan menjalankan perintah berikut:

### Backend (Go - backend-entity-service)
```bash
# Menjalankan server lokal
cd backend-entity-service && go run ./cmd/server

# Verifikasi sintaks dan vetting
cd backend-entity-service && go vet ./...

# Menjalankan unit test handler & validasi
cd backend-entity-service && go test -v ./...
```

### Frontend (React + TypeScript - frontend-entity-service)
```bash
# Menjalankan dev server Vite
cd frontend-entity-service && npm run dev

# Audit aturan UI/UX (Wajib lulus: no raw colors, no outer margins)
cd frontend-entity-service && npm run lint:ui

# Menjalankan unit test validasi Zod
cd frontend-entity-service && npm test -- --watchAll=false

# Kompilasi TypeScript & production build
cd frontend-entity-service && npm run build
```

### Lingkungan Kontainer (Docker Compose)
```bash
# Membangun dan menjalankan seluruh service di latar belakang
docker compose up -d --build

# Menghentikan kontainer
docker compose down
```

---

## 3. Standar dan Gaya Kode (Coding Style)

### Backend (Go)
* **Format:** Menggunakan format standar `gofmt` (indentasi tab).
* **Prinsip *"Accept interfaces, return structs"*:** `EntityHandler` menerima interface `EntityStore`, bukan struct database konkret.
* **Error Wrapping:** Semua error pada lapisan repository/database dibungkus menggunakan `fmt.Errorf("konteks: %w", err)`.
* **Immutability:** Gunakan fungsi transformer seperti `input.ApplyTo(existing)` saat memproses payload update.
* **Functional Options:** Inisialisasi HTTP server menggunakan pola `server.WithPort(...)`.

### Frontend (TypeScript + React)
* **Format:** Single quotes (`'`), 2 spasi indentasi.
* **Type Safety:** Hindari `any`. Gunakan `unknown` dengan type narrowing yang aman. Properti domain didefinisikan sebagai `readonly`.
* **Immutability Zustand:** Hindari mutasi state secara in-place. Kembalikan salinan baru: `[newItem, ...state.entities]`, `{ ...entity }`.
* **Pemberantasan Warna Mentah (*No Raw Colors*):** Gunakan token semantik HSL (`bg-background`, `text-foreground`, `border-border`, `bg-card`).
* **Bebas Margin Luar (*No Outer Margins*):** Komponen reusable tidak boleh memiliki margin luar (`m-*`, `mt-*`, `mb-*`). Gunakan `gap-*` atau padding pada container induk.
* **Komposisi Radix:** Gunakan prop `asChild` pada button/trigger untuk mencegah nesting elemen HTML interaktif yang tidak valid.
* **Flat Inspection Cards:** Panel inspeksi detail (`EntityDetailSheet`) menggunakan kartu flat (`shadow-none`) agar serasi dengan panel drawer.

---

## 4. Persyaratan Pengujian (Testing Requirements)

* **Unit Test:** Setiap penambahan field model baru, endpoint baru, atau logika validasi wajib disertai unit test.
* **Backend:** Pengujian unit handler ditulis di `backend-entity-service/internal/handlers/entity_test.go` menggunakan `httptest` dan in-memory store. Unit test tidak bergantung pada database PostgreSQL fisik.
* **Frontend:** Pengujian validasi skema ditulis di `frontend-entity-service/src/schemas/entitySchema.test.ts` menggunakan Jest. Menguji batas koordinat, batas panjang teks, dan format JSON metadata.
* **UI Linter Gate:** Perintah `npm run lint:ui` harus menghasilkan 0 violations sebelum kode dianggap selesai.

---

## 5. Keputusan Arsitektur & Penempatan Berkas

Letakkan berkas baru sesuai aturan modularitas berikut:

* **Primitif UI Murni (`frontend-entity-service/src/components/ui/*`):** Hanya untuk komponen primitif generik standar shadcn/ui. Dilarang memasukkan logika domain atau pemanggilan API ke dalam folder ini.
* **Komponen Bersama (`frontend-entity-service/src/components/shared/*`):** Wrapper komposisi yang dipakai berulang di berbagai halaman (`Modal`, `FormField`, `StatCard`, `EmptyState`).
* **Fitur Domain:**
  * Komponen peta, toolbar, dan marker diletakkan di `src/components/map/*`.
  * Komponen daftar entitas, kartu, modal formulir, dan drawer detail diletakkan di `src/components/entity/*`.
* **Akses Data & API:** Seluruh request HTTP melewati `src/api/axios.ts` (`HttpEntityRepository`). Hindari memanggil `axios` atau `fetch` langsung di dalam komponen UI.
* **Backend DB Queries:** Kueri GORM berada di `internal/repository/*`, bukan di dalam handler.

---

## 6. Zona "Jangan Sentuh" & Keamanan (Security Rules)

* **Dilarang Menghapus atau Mengubah File Sensitif:** Jangan mengubah atau membocorkan isi berkas `.env` atau kredensial.
* **Dilarang Mengubah `.gitignore`:** Jangan menghapus pola keamanan di `.gitignore` yang memblokir build output, `.env`, atau temporary files.
* **Pertahankan Koordinat:** Urutan koordinat di seluruh lapisan sistem (Frontend, DTO, Database) terkunci pada format **`[Latitude, Longitude]`**. Jangan pernah mengubahnya menjadi `[Longitude, Latitude]`.

---

## 7. Aturan Git & Konvensi Commit (Commit Guidelines)

Gunakan format **Conventional Commits**:
`type(scope): deskripsi singkat imperatif`

* **Tipe yang Diizinkan:**
  * `feat`: Fitur fungsionalitas baru (misal: `feat(map): add place search autocomplete`)
  * `fix`: Perbaikan bug atau galat (misal: `fix(sheet): resolve footer overlap and add shadow-none`)
  * `refactor`: Simplifikasi atau pembersihan kode tanpa mengubah perilaku (misal: `refactor(backend): consolidate entity store interface`)
  * `test`: Penambahan atau penyesuaian unit test (misal: `test(schema): add test case for coordinate boundary checks`)
  * `docs`: Pembaruan dokumentasi (misal: `docs: update architecture and agents guide`)
  * `style`: Penyesuaian styling sesuai pedoman UI (misal: `style(badge): enforce border-only status dot styling`)

### Checklist Sebelum Selesai:
1. `cd backend-entity-service && go vet ./... && go test ./...` -> PASS
2. `cd frontend-entity-service && npm run lint:ui && npm test -- --watchAll=false && npm run build` -> PASS
3. Pastikan tidak ada berkas sementara, cache `.tsbuildinfo`, atau `console.log` yang tertinggal.

