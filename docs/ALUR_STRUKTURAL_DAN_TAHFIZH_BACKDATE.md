# Dokumentasi Arsitektur & Alur Kerja: Jabatan Struktural Pesantren vs Divisi Gaji Kepegawaian & Approval Backdate Tahfizh

Dokumen ini menjelaskan latar belakang masalah, arsitektur pemisahan database, dokumentasi RESTful API, serta alur kerja (*workflow*) **Jabatan Struktural Pesantren** dan **Pengajuan/Approval Input Setoran Tahfizh Terlewat (Backdate)**.

---

## 1. Latar Belakang Masalah

1. **Bentrok Fungsi pada Menu `Guru > Divisi` (`divisions` & `teacher_divisions`):**
   - Bagian **Kepegawaian / Keuangan** menggunakan menu `Guru > Divisi` untuk pengelompokkan **perhitungan gaji** dan **aturan absensi (geofencing)**. Aturan di tabel tersebut bersifat **1 Guru = 1 Divisi** (jika guru dimasukkan ke divisi lain, maka keanggotaan divisi sebelumnya otomatis terhapus/dipindahkan).
   - Di sisi lain, pada struktur organisasi pondok pesantren (sesuai data `GURU BARU/KELUAR` Pondok Pesantren Minhajul Haq), **1 Ustadz/Guru hampir selalu merangkap beberapa peran struktural sekaligus** (contoh: *Divisi MS* -> *Bagian Pendulum* -> *Kepala PJ Tahfizh* atau *Anggota PJ Tahfizh* + *Wali Kelas* + *Guru Diniyah*).
2. **Kendala Otorisasi Input Tahfizh yang Terlewat Harinya (Backdate):**
   - Sebelumnya, pengecekan `canBackdateTahfidzDeposit` hanya mengecek apakah nama divisi gaji guru mengandung kata `"tahfidz"`. Akibatnya, Kepala PJ Tahfizh atau PJ Tahfizh yang berada di divisi gaji `MS` / `Pendulum` tidak dikenali sistem, dan musyrif halaqah yang lupa menginput setoran kemarin tidak memiliki alur pengajuan konfirmasi di aplikasi.

---

## 2. Solusi Arsitektur Database (Drizzle ORM)

Database dipisahkan secara tegas menjadi **2 domain independen**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    TABEL MASTER GURU (teachers)                         │
└──────────────────┬───────────────────────────────────┬──────────────────┘
                   │                                   │
    1 Guru = 1 Grup│(Kepegawaian / Payroll)            │ 1 Guru = Banyak Jabatan (N:M)
                   ▼                                   ▼
┌─────────────────────────────────────┐ ┌─────────────────────────────────┐
│ DOMAIN KEPEGAWAIAN & GAJI (TETAP)   │ │ DOMAIN STRUKTURAL PESANTREN     │
│ - divisions (Menu Guru > Divisi)    │ │ (TABEL BARU - TERPISAH)         │
│ - teacher_divisions                 │ │ - structural_units              │
│ - salary_grades (Golongan Gaji)     │ │ - structural_roles              │
│ - position_allowances (Tunjangan)   │ │ - teacher_structural_assignments│
└─────────────────────────────────────┘ └────────────────┬────────────────┘
                                                         │
                                                         │ Otoritas Approve Backdate
                                                         ▼
                                        ┌─────────────────────────────────┐
                                        │ APPROVAL INPUT TAHFIZH TERLEWAT │
                                        │ - tahfidz_backdate_requests     │
                                        └─────────────────────────────────┘
```

### Daftar Tabel Baru:
1. **`structural_units`** (`backend/src/db/schema/structural-roles.ts`)
   - Menyimpan pohon hierarki unit/bagian di pesantren (`parent_id` self-referencing).
   - Contoh: `PPMH` -> `MS` -> `Bagian Pendulum (Pendidikan & Kurikulum)` -> `PJ Tahfizh`.
2. **`structural_roles`** (`backend/src/db/schema/structural-roles.ts`)
   - Menyimpan master jabatan struktural (`code`, `name`, `scope`, `rank_level`, `default_unit_id`, `can_backdate_tahfidz`).
   - Jabatan dengan `can_backdate_tahfidz = true` secara default:
     - `MUDIR_PPMH` (Mudir PPMH)
     - `KEPALA_MS` (Kepala MS)
     - `KABAG_PENDULUM` (Kepala Bagian Pendidikan dan Kurikulum)
     - `KEPALA_PJ_TAHFIZH` (Kepala PJ Tahfizh)
     - `PJ_TAHFIZH` (Anggota PJ Tahfizh)
3. **`teacher_structural_assignments`** (`backend/src/db/schema/structural-roles.ts`)
   - Tabel pivot *Many-to-Many* yang menghubungkan guru (`teacher_id`) dengan jabatan struktural (`structural_role_id`) dan unitnya (`structural_unit_id`).
   - Mendukung rangkap jabatan (*multi-role*) tanpa menyentuh tabel `divisions` milik bagian gaji.
4. **`tahfidz_backdate_requests`** (`backend/src/db/schema/tahfidz.ts`)
   - Menyimpan pengajuan izin buka kunci input setoran tahfizh untuk tanggal yang terlewat (`teacher_id`, `halaqah_id`, `requested_date`, `reason`, `status`: `'pending' | 'approved' | 'rejected'`, `reviewed_by_teacher_id`, `reviewed_at`).

---

## 3. Alur Kerja (Workflow) Pengaturan Jabatan Struktural

1. **Siapa yang Bisa Mengakses Pengaturan Struktural?**
   - Hanya **Admin** (`role = 'admin'`) melalui menu Sidebar: **`Apps` > `Guru` > `Jabatan Struktural` (`/apps/structural`)**.
2. **Langkah Setup Awal (1 Klik):**
   - Admin membuka **`Guru > Jabatan Struktural`**, lalu klik tombol **"Muat Struktur Default PPMH"** di pojok kanan atas.
   - Sistem otomatis mengisi seluruh daftar Unit/Bagian dan Jabatan Struktural sesuai struktur Pondok Pesantren Minhajul Haq.
3. **Menunjuk Guru ke Jabatan Struktural:**
   - Pada baris jabatan (misal: *Kepala Bagian Pendidikan dan Kurikulum*, *Kepala PJ Tahfizh*, atau *Anggota PJ Tahfizh*), Admin klik tombol **`Kelola Pejabat`**.
   - Pilih guru dari daftar di sebelah kiri untuk dimasukkan ke daftar pejabat aktif di sebelah kanan.
   - Satu guru bebas dimasukkan ke lebih dari satu jabatan struktural tanpa mengubah kelompok Divisi Gaji mereka di menu `Guru > Divisi`.

---

## 4. Alur Kerja (Workflow) Input Setoran Tahfizh yang Terlewat Harinya

Ketika seorang ustadz membuka menu **`Tahfidz` > `Input per Halaqah` (`/apps/tahfidz/halaqah`)** dan memilih tanggal kemarin / tanggal yang sudah lewat di kalender:

### Skenario A: User adalah Pejabat Berwenang (Langsung Lolos)
Jika user yang login adalah **Admin**, **Mudir PPMH**, **Kepala MS**, **Kepala Bagian Pendidikan dan Kurikulum**, **Kepala PJ Tahfizh**, atau **PJ Tahfizh**:
- Tidak ada popup penghalang.
- User langsung bisa menginput atau mengedit setoran tahfizh di tanggal manapun.
- Jika ada musyrif halaqah yang mengajukan izin input terlambat, di bagian atas halaman akan muncul banner kuning **"X Pengajuan Izin Input Terlambat Menunggu Persetujuan"** dengan tombol **"Lihat & Approve"** untuk menyetujui (`Approve`) atau menolak (`Tolak`).

### Skenario B: User adalah Musyrif / Pengampu Halaqah Biasa
1. **Belum Ada Pengajuan (`status = none` / `rejected`):**
   - Saat musyrif mengklik santri untuk menginput di tanggal yang sudah lewat, muncul **Popup Modal "Izin Input Tahfizh Terlewat"**.
   - Musyrif mengisi **Alasan Terlambat Menginput**, lalu klik **"Ajukan ke PJ Tahfizh"**.
2. **Selama Menunggu Persetujuan (`status = pending`):**
   - Selama Kepala PJ Tahfizh / PJ Tahfizh / Kabag Pendidikan & Kurikulum belum meng-approve, setiap kali diklik akan tampil **Popup Modal "Menunggu Persetujuan"** beserta detail tanggal, halaqah, alasan yang diajukan, dan tombol **"Cek Status Terbaru"**.
3. **Setelah Di-Approve (`status = approved`):**
   - Begitu di-approve oleh Kepala PJ Tahfizh / PJ Tahfizh / Kabag Pendidikan & Kurikulum, **popup pengajuan otomatis hilang**.
   - Saat musyrif mengklik santri pada tanggal tersebut, **langsung terbuka form input setoran Tahfizh** untuk seluruh santri di halaqahnya seperti biasa.

---

## 5. Daftar Endpoint RESTful API Baru

### A. Endpoint Struktural Pesantren (`/api/structural`)
| Method | Endpoint | Akses | Deskripsi |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/structural/me` | Semua User Login | Mengambil jabatan struktural user yang sedang login & flag `canBackdateTahfidz` |
| `POST` | `/api/structural/seed-defaults` | Admin Only | Mengisi master unit & jabatan struktural default PPMH |
| `GET` | `/api/structural/units` | Semua User Login | Daftar unit/bagian struktural (`?format=tree` untuk pohon hierarki) |
| `POST` | `/api/structural/units` | Admin Only | Membuat unit/bagian struktural baru |
| `PUT` | `/api/structural/units/:id` | Admin Only | Mengubah unit/bagian struktural |
| `DELETE` | `/api/structural/units/:id` | Admin Only | Menghapus unit/bagian struktural |
| `GET` | `/api/structural/roles` | Semua User Login | Daftar master jabatan struktural beserta jumlah pejabat aktif |
| `GET` | `/api/structural/roles/:id` | Semua User Login | Detail jabatan beserta daftar guru yang sedang menjabat |
| `POST` | `/api/structural/roles` | Admin Only | Membuat master jabatan struktural baru |
| `PUT` | `/api/structural/roles/:id` | Admin Only | Mengubah master jabatan struktural |
| `DELETE` | `/api/structural/roles/:id` | Admin Only | Menghapus master jabatan struktural |
| `GET` | `/api/structural/assignments` | Semua User Login | Daftar penugasan jabatan struktural guru (bisa difilter per guru/unit/role) |
| `POST` | `/api/structural/assignments` | Admin Only | Menambahkan jabatan struktural ke seorang guru |
| `PUT` | `/api/structural/assignments/:id` | Admin Only | Mengubah detail penugasan jabatan guru |
| `DELETE` | `/api/structural/assignments/:id` | Admin Only | Mencopot jabatan struktural dari seorang guru |
| `PUT` | `/api/structural/teachers/:id/sync` | Admin Only | Bulk sync seluruh jabatan struktural milik seorang guru |

### B. Endpoint Pengajuan & Approval Backdate Tahfizh (`/api/tahfidz`)
| Method | Endpoint | Akses | Deskripsi |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/tahfidz/backdate-status` | Semua User Login | Cek status akses input tanggal mundur (`?date=YYYY-MM-DD&halaqahId=1`) |
| `GET` | `/api/tahfidz/backdate-requests` | Semua User Login | Daftar pengajuan izin input terlambat (`?status=pending`) |
| `POST` | `/api/tahfidz/backdate-requests` | Musyrif / Guru | Mengirim pengajuan izin input tanggal mundur (`{ requestedDate, halaqahId, reason }`) |
| `PUT` | `/api/tahfidz/backdate-requests/:id/review` | Kepala/PJ Tahfizh, Kabag Pendulum, Kepala MS, Mudir, Admin | Menyetujui (`approved`) atau menolak (`rejected`) pengajuan musyrif |

---

## 6. File yang Dibuat & Diperbarui

- **Database & Backend:**
  - `backend/src/db/schema/structural-roles.ts` *(Baru)*
  - `backend/src/db/schema/tahfidz.ts` *(Update: tambah `tahfidz_backdate_requests`)*
  - `backend/src/db/schema/relations.ts` & `backend/src/db/schema/index.ts` *(Update)*
  - `backend/drizzle/0023_add_structural_role_hierarchy.sql` & `backend/drizzle/meta/_journal.json` *(Baru/Update)*
  - `backend/src/validators/structural.ts` *(Baru)*
  - `backend/src/routes/structural.ts` *(Baru)*
  - `backend/src/utils/tahfidz-permission.ts` *(Update)*
  - `backend/src/routes/tahfidz.ts` *(Update)*
  - `backend/src/routes/teachers.ts`, `backend/src/routes/roles.ts`, `backend/src/utils/permissions.ts`, `backend/src/routes/index.ts`, `backend/src/index.ts`, `backend/src/config/api-docs.ts` *(Update)*
- **Frontend:**
  - `frontend/src/views/apps/StructuralRoles.vue` *(Baru - Halaman `Guru > Jabatan Struktural`)*
  - `frontend/src/views/apps/tahfidz/TahfidzHalaqah.vue` *(Update - Modal pengajuan & approval backdate tahfizh)*
  - `frontend/src/services/api.js` *(Update - `structuralApi` & `tahfidzApi` backdate methods)*
  - `frontend/src/components/layout/Sidebar.vue` & `frontend/src/router/index.js` *(Update)*
