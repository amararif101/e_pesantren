export const apiMeta = {
  name: "Sistem Informasi Manajemen Pesantren API",
  version: "1.0.0",
  description:
    "RESTful API backend untuk modul akademik, santri, guru, tahfidz, klinik, absensi, keuangan, dan operasional pesantren.",
};

export type ApiSection = {
  key: string;
  basePath: string;
  description: string;
};

export const apiSections: ApiSection[] = [
  { key: "auth", basePath: "/api/auth", description: "Autentikasi dan otorisasi dasar" },
  { key: "students", basePath: "/api/students", description: "Master data santri dan relasi akademik" },
  { key: "parents", basePath: "/api/parents", description: "Master data orang tua/wali" },
  { key: "teachers", basePath: "/api/teachers", description: "Master data guru dan pegawai" },
  { key: "users", basePath: "/api/users", description: "Manajemen akun pengguna" },
  { key: "permissions", basePath: "/api/permissions", description: "RBAC role dan permission" },
  { key: "roles", basePath: "/api/roles", description: "Peran dan kontrol akses" },
  { key: "academic", basePath: "/api/academic", description: "Kelas, mapel, jadwal, nilai, rapor" },
  { key: "academicPeriods", basePath: "/api/academic-periods", description: "Registry tahun ajaran/semester, status aktif, lock, archive, dan guard multi-tahun" },
  { key: "academicSettings", basePath: "/api/academic-settings", description: "Konfigurasi akademik" },
  { key: "attendance", basePath: "/api/attendance", description: "Absensi santri dan guru" },
  { key: "studentLeaves", basePath: "/api/student-leaves", description: "Izin/sakit santri" },
  { key: "quran", basePath: "/api/quran", description: "Hafalan Al-Qur'an umum" },
  { key: "tahfidz", basePath: "/api/tahfidz", description: "Setoran, ujian, dan laporan tahfidz" },
  { key: "halaqah", basePath: "/api/halaqah", description: "Kelompok halaqah, mentor, anggota" },
  { key: "clinic", basePath: "/api/clinic", description: "Klinik, pasien, pemeriksaan, rawat inap, obat" },
  { key: "rooms", basePath: "/api/rooms", description: "Kamar dan pengasuhan" },
  { key: "divisions", basePath: "/api/divisions", description: "Divisi kepegawaian (pengelompokan gaji & absensi)" },
  { key: "structural", basePath: "/api/structural", description: "Hirarki struktur organisasi, bagian/PJ, dan jabatan struktural pesantren" },
  { key: "salary", basePath: "/api/salary", description: "Payroll dan komponen gaji" },
  { key: "salaryReports", basePath: "/api/salary/reports", description: "Laporan payroll" },
  { key: "salaryGrades", basePath: "/api/salary-grades", description: "Grade gaji dan allowance" },
  { key: "savings", basePath: "/api/savings", description: "Tabungan dan rekening" },
  { key: "rewards", basePath: "/api/rewards", description: "Reward siswa" },
  { key: "punishments", basePath: "/api/punishments", description: "Punishment dan poin pelanggaran" },
  { key: "warnings", basePath: "/api/warnings", description: "Surat peringatan dan statusnya" },
  { key: "rules", basePath: "/api/rules", description: "Aturan dan rule point" },
  { key: "notifications", basePath: "/api/notifications", description: "Inbox notifikasi pengguna" },
  { key: "push", basePath: "/api/push", description: "Push subscription dan delivery" },
  { key: "chat", basePath: "/api/chat", description: "Percakapan, pesan, reaksi, attachment" },
  { key: "informationBoard", basePath: "/api/information-board", description: "Mading/information board" },
  { key: "homeroomNotes", basePath: "/api/homeroom-notes", description: "Catatan wali kelas per semester" },
  { key: "parentDashboard", basePath: "/api/parent-dashboard", description: "Ringkasan data untuk portal orang tua" },
  { key: "analytics", basePath: "/api/analytics", description: "Agregasi dan insight dashboard" },
  { key: "uploads", basePath: "/api/uploads", description: "Upload file dan media pendukung" },
  { key: "pdf", basePath: "/api/pdf", description: "Dokumen PDF/report generator" },
  { key: "settings", basePath: "/api/settings", description: "Key-value settings aplikasi" },
  { key: "utils", basePath: "/api/utils", description: "Utility endpoint internal aplikasi" },
  { key: "wilayah", basePath: "/api/wilayah", description: "Referensi wilayah/alamat" },
];

export function buildOpenApiDocument(baseUrl: string) {
  const paths = Object.fromEntries(
    apiSections.map((section) => [
      section.basePath,
      {
        get: {
          tags: [section.key],
          summary: `Entrypoint ${section.key}`,
          description: section.description,
          responses: {
            "200": {
              description: "OK",
            },
            "401": {
              description: "Unauthorized",
            },
            "403": {
              description: "Forbidden",
            },
          },
        },
      },
    ])
  );

  return {
    openapi: "3.1.0",
    info: {
      title: apiMeta.name,
      version: apiMeta.version,
      description: apiMeta.description,
    },
    servers: [{ url: baseUrl }],
    tags: apiSections.map((section) => ({
      name: section.key,
      description: section.description,
    })),
    paths: {
      "/": {
        get: {
          tags: ["system"],
          summary: "Root health and service info",
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/health": {
        get: {
          tags: ["system"],
          summary: "Health check",
          responses: { "200": { description: "Healthy" } },
        },
      },
      "/api/openapi.json": {
        get: {
          tags: ["system"],
          summary: "OpenAPI document",
          responses: { "200": { description: "OpenAPI JSON" } },
        },
      },
      "/api/docs": {
        get: {
          tags: ["system"],
          summary: "Human-readable API docs",
          responses: { "200": { description: "HTML documentation" } },
        },
      },
      ...paths,
    },
  };
}

export function buildDocsHtml(baseUrl: string) {
  const sectionItems = apiSections
    .map(
      (section) => `
        <tr>
          <td><code>GET</code></td>
          <td><code>${section.basePath}</code></td>
          <td>${section.description}</td>
        </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${apiMeta.name} Docs</title>
    <style>
      body { font-family: Inter, Arial, sans-serif; margin: 0; background: #0b1020; color: #e5e7eb; }
      .wrap { max-width: 1100px; margin: 0 auto; padding: 32px 20px 48px; }
      h1, h2 { margin-bottom: 8px; }
      p { color: #cbd5e1; }
      .card { background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px; margin-top: 20px; }
      .pill { display: inline-block; padding: 6px 10px; border-radius: 999px; background: #1d4ed8; color: white; font-size: 12px; margin-right: 8px; }
      a { color: #93c5fd; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th, td { text-align: left; padding: 12px; border-bottom: 1px solid #1f2937; vertical-align: top; }
      th { color: #93c5fd; }
      code { color: #fde68a; }
      .muted { color: #94a3b8; font-size: 14px; }
      ul { line-height: 1.6; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <span class="pill">RESTful MVP Docs</span>
      <span class="pill">OpenAPI 3.1</span>
      <h1>${apiMeta.name}</h1>
      <p>${apiMeta.description}</p>

      <div class="card">
        <h2>Base URL</h2>
        <p><code>${baseUrl}</code></p>
        <p class="muted">JSON machine-readable: <a href="${baseUrl}/api/openapi.json">/api/openapi.json</a></p>
      </div>

      <div class="card">
        <h2>Standar respons saat ini</h2>
        <ul>
          <li>Umumnya memakai bentuk <code>{ success, message?, data? }</code>.</li>
          <li>Route yang butuh autentikasi menggunakan header <code>Authorization: Bearer &lt;jwt&gt;</code>.</li>
          <li>Belum semua modul konsisten penuh untuk status code dan envelope error; ini fondasi dokumentasi awal.</li>
        </ul>
      </div>

      <div class="card">
        <h2>Katalog endpoint utama</h2>
        <table>
          <thead>
            <tr>
              <th>Method</th>
              <th>Path</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>GET</code></td>
              <td><code>/api/health</code></td>
              <td>Health check backend</td>
            </tr>
            <tr>
              <td><code>GET</code></td>
              <td><code>/api/docs</code></td>
              <td>Dokumentasi HTML sederhana</td>
            </tr>
            <tr>
              <td><code>GET</code></td>
              <td><code>/api/openapi.json</code></td>
              <td>Dokumen OpenAPI JSON</td>
            </tr>
            ${sectionItems}
          </tbody>
        </table>
      </div>
    </div>
  </body>
</html>`;
}
