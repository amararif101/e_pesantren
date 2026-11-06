<template>
  <div
    v-if="isOpen && leave"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto"
    @click.self="$emit('close')"
  >
    <div
      class="bg-slate-100 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden border border-slate-200"
    >
      <!-- Top Action Bar -->
      <div
        class="bg-white px-4 sm:px-6 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 flex-shrink-0"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-xl bg-[#602515]/10 text-[#602515] flex items-center justify-center"
          >
            <Icon icon="solar:document-text-bold-duotone" class="w-6 h-6" />
          </div>
          <div>
            <h3 class="font-bold text-slate-800 text-sm sm:text-base">
              Surat Izin Jalan & QR Code Santri (A4 Resmi)
            </h3>
            <p class="text-xs text-slate-500">
              No. Surat:
              <span class="font-mono font-semibold text-slate-700">{{
                leave.leaveNumber || "-"
              }}</span>
              • Kode QR:
              <span class="font-mono font-semibold text-[#602515]">{{
                leave.qrToken || "-"
              }}</span>
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Toggle Kop Gambar / Kop Teks jika gambar kop ada di Pengaturan Akademik -->
          <button
            v-if="academicHeaderUrl"
            @click="useImageHeader = !useImageHeader"
            type="button"
            class="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
            :title="useImageHeader ? 'Beralih ke Kop Format Teks' : 'Beralih ke Kop Gambar Pengaturan Akademik'"
          >
            <Icon
              :icon="useImageHeader ? 'solar:gallery-bold-duotone' : 'solar:text-bold-duotone'"
              class="w-4 h-4 text-[#602515]"
            />
            {{
              useImageHeader
                ? isCustomKesantrian
                  ? "Kop: Khusus Kesantrian"
                  : "Kop: Gambar (Akademik)"
                : "Kop: Format Teks"
            }}
          </button>

          <button
            @click="copyToken"
            type="button"
            class="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Icon
              :icon="copied ? 'solar:check-read-bold' : 'solar:copy-line-duotone'"
              class="w-4 h-4 text-[#602515]"
            />
            {{ copied ? "Kode Tersalin" : "Salin Kode QR" }}
          </button>
          <button
            @click="printLetter"
            type="button"
            class="px-4 py-2 rounded-xl bg-[#602515] hover:bg-[#7a311d] text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-[#602515]/20 transition"
          >
            <Icon icon="solar:printer-bold-duotone" class="w-4 h-4" />
            Cetak Surat (A4)
          </button>
          <button
            @click="$emit('close')"
            type="button"
            class="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <Icon icon="solar:close-circle-bold" class="w-6 h-6" />
          </button>
        </div>
      </div>

      <!-- Scrollable A4 Preview Area (Margin Atas Ditarik ke Atas) -->
      <div class="flex-1 overflow-y-auto p-3 sm:p-5 flex justify-center bg-slate-200/70">
        <div
          ref="printAreaRef"
          class="bg-white text-slate-900 shadow-xl border border-slate-300 w-full max-w-[210mm] px-6 sm:px-10 pt-5 pb-7 rounded-sm letter-preview-container"
          style="font-family: 'Times New Roman', Times, serif"
        >
          <!-- PILIHAN 1: KOP DARI GAMBAR (TANPA GARIS HITAM KARENA GAMBAR KOP SUDAH PUNYA PEMBATAS SENDIRI) -->
          <div
            v-if="useImageHeader && academicHeaderUrl"
            class="mb-3 text-center"
          >
            <img
              :src="academicHeaderUrl"
              alt="Kop Surat Resmi"
              class="w-full max-h-32 object-contain mx-auto"
            />
          </div>

          <!-- PILIHAN 2: KOP SURAT FORMAT TEKS BAWAAN (JIKA BELUM ADA GAMBAR ATAU MEMILIH TEKS) -->
          <div v-else class="border-b-4 border-double border-slate-900 pb-3 mb-4">
            <div class="flex items-center gap-4">
              <div
                v-if="logoUrl"
                class="w-20 h-20 flex-shrink-0 flex items-center justify-center"
              >
                <img
                  :src="logoUrl"
                  alt="Logo Pesantren"
                  class="max-w-full max-h-full object-contain"
                />
              </div>
              <div class="flex-1 text-center">
                <p
                  v-if="institution.foundationName"
                  class="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 m-0"
                >
                  {{ institution.foundationName }}
                </p>
                <h1
                  class="text-lg sm:text-2xl font-extrabold uppercase tracking-wide text-slate-900 leading-tight m-0"
                >
                  {{ institution.name || "PONDOK PESANTREN" }}
                </h1>
                <p class="text-xs sm:text-sm font-semibold uppercase tracking-widest text-slate-800 mt-0.5 m-0">
                  BAGIAN KESANTRIAN & PENGASUHAN SANTRI
                </p>
                <p
                  v-if="institution.address"
                  class="text-[11px] text-slate-600 mt-1 leading-snug m-0"
                >
                  {{ institution.address }}
                </p>
                <p
                  v-if="institution.contact || institution.number"
                  class="text-[11px] text-slate-600 m-0"
                >
                  <span v-if="institution.number">{{ institution.number }}</span>
                  <span v-if="institution.number && institution.contact"> • </span>
                  <span v-if="institution.contact">{{ institution.contact }}</span>
                </p>
              </div>
              <div v-if="logoUrl" class="w-16 hidden sm:block"></div>
            </div>
          </div>

          <!-- JUDUL SURAT -->
          <div class="text-center mb-4">
            <h2
              class="text-base sm:text-lg font-bold uppercase underline tracking-wider text-slate-900 m-0"
            >
              SURAT IZIN JALAN / PULANG SANTRI
            </h2>
            <p class="text-xs sm:text-sm font-semibold text-slate-700 mt-1 m-0">
              Nomor: {{ leave.leaveNumber || `00${leave.id}/SIJ-KSN/2026` }}
            </p>
          </div>

          <!-- KALIMAT PEMBUKA -->
          <p class="text-xs sm:text-sm leading-relaxed mb-3 text-justify">
            <em>Bismillahirrahmanirrahim.</em><br />
            Yang bertanda tangan di bawah ini, Bagian Kesantrian / Pengasuhan
            <strong>{{ institution.name || "Pondok Pesantren" }}</strong>, menerangkan
            bahwa santri berikut:
          </p>

          <!-- TABEL IDENTITAS SANTRI -->
          <div class="mb-4">
            <template v-if="leave.items?.length === 1">
              <table class="w-full text-xs sm:text-sm border-collapse">
                <tbody>
                  <tr>
                    <td class="py-1 w-44 font-semibold text-slate-700">Nama Lengkap</td>
                    <td class="py-1 w-4">:</td>
                    <td class="py-1 font-bold text-slate-900 uppercase">
                      {{ firstStudent?.fullName || "-" }}
                    </td>
                  </tr>
                  <tr>
                    <td class="py-1 font-semibold text-slate-700">Nomor Induk (NIS)</td>
                    <td class="py-1">:</td>
                    <td class="py-1 font-semibold text-slate-800">
                      {{ firstStudent?.nis || "-" }}
                    </td>
                  </tr>
                  <tr>
                    <td class="py-1 font-semibold text-slate-700">Jenis Kelamin</td>
                    <td class="py-1">:</td>
                    <td class="py-1 text-slate-800">
                      {{
                        firstStudent?.gender === "male"
                          ? "Ikhwan (Laki-laki)"
                          : firstStudent?.gender === "female"
                          ? "Akhwat (Perempuan)"
                          : "-"
                      }}
                    </td>
                  </tr>
                  <tr>
                    <td class="py-1 font-semibold text-slate-700">Kelas / Kamar</td>
                    <td class="py-1">:</td>
                    <td class="py-1 text-slate-800">
                      {{ firstStudent?.className || "-" }} /
                      {{ firstStudent?.roomName || "-" }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </template>

            <!-- Jika Izin Kolektif (>1 santri) -->
            <template v-else>
              <table class="w-full text-xs sm:text-sm border border-slate-400 border-collapse">
                <thead>
                  <tr class="bg-slate-100">
                    <th class="border border-slate-400 px-2.5 py-1.5 text-center w-10">No</th>
                    <th class="border border-slate-400 px-3 py-1.5 text-left">Nama Santri</th>
                    <th class="border border-slate-400 px-3 py-1.5 text-left">NIS</th>
                    <th class="border border-slate-400 px-3 py-1.5 text-left">Kelas / Kamar</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, idx) in leave.items" :key="item.id || idx">
                    <td class="border border-slate-400 px-2.5 py-1.5 text-center">
                      {{ idx + 1 }}
                    </td>
                    <td class="border border-slate-400 px-3 py-1.5 font-bold">
                      {{ item.student?.fullName || "-" }}
                    </td>
                    <td class="border border-slate-400 px-3 py-1.5">
                      {{ item.student?.nis || "-" }}
                    </td>
                    <td class="border border-slate-400 px-3 py-1.5">
                      {{ item.student?.className || "-" }} /
                      {{ item.student?.roomName || "-" }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </template>
          </div>

          <!-- DETAIL PERIZINAN & BATAS WAKTU -->
          <p class="text-xs sm:text-sm mb-2">
            Telah diberikan izin untuk meninggalkan lingkungan pondok pesantren dengan rincian
            sebagai berikut:
          </p>

          <div class="border border-slate-400 rounded-lg p-3 mb-4 bg-slate-50/60">
            <table class="w-full text-xs sm:text-sm border-collapse">
              <tbody>
                <tr>
                  <td class="py-1 w-44 font-semibold text-slate-700">Kategori Perizinan</td>
                  <td class="py-1 w-4">:</td>
                  <td class="py-1 font-bold uppercase text-slate-900">
                    {{ categoryLabel }}
                  </td>
                </tr>
                <tr>
                  <td class="py-1 font-semibold text-slate-700">Keperluan / Alasan</td>
                  <td class="py-1">:</td>
                  <td class="py-1 text-slate-900 font-medium">{{ leave.reason || "-" }}</td>
                </tr>
                <tr v-if="leave.destination">
                  <td class="py-1 font-semibold text-slate-700">Alamat Tujuan</td>
                  <td class="py-1">:</td>
                  <td class="py-1 text-slate-800">{{ leave.destination }}</td>
                </tr>
                <tr>
                  <td class="py-1 font-semibold text-slate-700">Jadwal Keluar / Dijemput</td>
                  <td class="py-1">:</td>
                  <td class="py-1 font-semibold text-slate-900">
                    {{ formatFullDate(leave.startDate) }} — Pukul
                    {{ leave.startTime || "08:00" }} WIB
                  </td>
                </tr>
                <tr>
                  <td class="py-1 font-bold text-red-800">Batas Waktu Kembali</td>
                  <td class="py-1 font-bold text-red-800">:</td>
                  <td class="py-1 font-bold text-red-800 underline">
                    {{ formatFullDate(leave.endDate) }} — Maksimal Pukul
                    {{ leave.endTime || "17:00" }} WIB
                  </td>
                </tr>
                <tr v-if="leave.pickupName">
                  <td class="py-1 font-semibold text-slate-700">Penjemput / Pendamping</td>
                  <td class="py-1">:</td>
                  <td class="py-1 text-slate-800">
                    <strong>{{ leave.pickupName }}</strong>
                    <span v-if="leave.pickupRelation"> ({{ leave.pickupRelation }})</span>
                    <span v-if="leave.pickupPhone"> • Telp/WA: {{ leave.pickupPhone }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- BOX QR CODE & LOG VERIFIKASI GERBANG/KESANTRIAN -->
          <div
            class="border-2 border-slate-800 rounded-xl p-3.5 mb-5 flex flex-col sm:flex-row items-center gap-4 bg-white"
          >
            <div class="flex flex-col items-center flex-shrink-0">
              <img
                :src="qrDataUrl"
                alt="QR Code Surat Izin"
                class="w-28 h-28 border border-slate-300 p-1 rounded bg-white"
              />
              <span class="font-mono text-[11px] font-bold tracking-wider mt-1 text-slate-800">
                {{ leave.qrToken }}
              </span>
            </div>

            <div class="flex-1 text-xs space-y-1.5">
              <div class="font-bold text-slate-900 uppercase tracking-wide border-b border-slate-300 pb-1">
                PROSEDUR PEMINDAIAN (SCAN QR CODE KESANTRIAN)
              </div>
              <ol class="list-decimal list-inside space-y-0.5 text-slate-700 leading-snug">
                <li>
                  <strong>Scan Pertama (Saat Keluar):</strong> Wajib di-scan oleh Bagian
                  Kesantrian sebelum santri meninggalkan pondok.
                </li>
                <li>
                  <strong>Scan Kedua (Saat Kembali):</strong> Surat ini wajib dibawa kembali dan
                  di-scan ulang saat santri tiba di pondok sebagai bukti kehadiran.
                </li>
                <li>
                  <strong>Ketentuan Disiplin:</strong> Keterlambatan kembali melewati batas waktu
                  yang tertera di atas akan tercatat otomatis dan dikenakan
                  <strong>Poin Pelanggaran Kedisiplinan</strong>.
                </li>
              </ol>

              <!-- Catatan Waktu Riil Scan -->
              <div class="grid grid-cols-2 gap-2 pt-1.5 border-t border-dashed border-slate-300 text-[11px]">
                <div>
                  <span class="text-slate-500 block">Waktu Aktual Keluar (Scan 1):</span>
                  <strong class="text-slate-800">
                    {{
                      leave.checkedOutAt
                        ? formatDateTime(leave.checkedOutAt)
                        : "................................."
                    }}
                  </strong>
                </div>
                <div>
                  <span class="text-slate-500 block">Waktu Aktual Kembali (Scan 2):</span>
                  <strong
                    :class="
                      leave.status === 'returned_late' ? 'text-red-700' : 'text-slate-800'
                    "
                  >
                    {{
                      leave.checkedInAt
                        ? formatDateTime(leave.checkedInAt)
                        : "................................."
                    }}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          <!-- TANDA TANGAN RESMI -->
          <div class="pt-1">
            <div class="text-right text-xs sm:text-sm mb-2">
              Diterbitkan pada: {{ formatFullDate(leave.approvedAt || leave.createdAt) }}
            </div>

            <div class="grid grid-cols-3 gap-4 text-center text-xs sm:text-sm">
              <div>
                <p class="font-semibold text-slate-700 mb-11">Orang Tua / Penjemput,</p>
                <p class="font-bold underline text-slate-900">
                  {{ leave.pickupName || firstStudent?.fatherName || "( ............................ )" }}
                </p>
                <p class="text-[11px] text-slate-500">Wali Santri / Penjemput</p>
              </div>

              <div>
                <p class="font-semibold text-slate-700 mb-11">Santri Bersangkutan,</p>
                <p class="font-bold underline text-slate-900">
                  {{
                    leave.items?.length === 1
                      ? firstStudent?.fullName
                      : "( Perwakilan Santri )"
                  }}
                </p>
                <p class="text-[11px] text-slate-500">
                  NIS: {{ firstStudent?.nis || "-" }}
                </p>
              </div>

              <div>
                <p class="font-semibold text-slate-700 mb-11">Bagian Kesantrian,</p>
                <p class="font-bold underline text-slate-900">
                  ( Petugas Kesantrian )
                </p>
                <p class="text-[11px] text-slate-500">Pengasuhan & Perizinan</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { Icon } from "@iconify/vue";
import { settingsApi, studentLeavesApi } from "@/services/api.js";
import { generateQrSvgDataUrl } from "@/utils/qrcode.js";

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  leave: { type: Object, default: null },
});

defineEmits(["close"]);

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const printAreaRef = ref(null);
const copied = ref(false);

const academicHeaderLogo = ref("");
const isCustomKesantrian = ref(false);
const useImageHeader = ref(true);

const institution = reactive({
  name: "PONDOK PESANTREN",
  foundationName: "",
  address: "",
  number: "",
  contact: "",
  logo: "",
});

const logoUrl = computed(() => {
  if (!institution.logo) return null;
  if (institution.logo.startsWith("http") || institution.logo.startsWith("data:")) {
    return institution.logo;
  }
  if (institution.logo.startsWith("/api/uploads")) {
    return `${BASE_URL}${institution.logo}`;
  }
  if (institution.logo.startsWith("uploads/")) {
    return `${BASE_URL}/api/${institution.logo}`;
  }
  return institution.logo;
});

const academicHeaderUrl = computed(() => {
  const logo = academicHeaderLogo.value;
  if (!logo) return null;
  if (logo.startsWith("http") || logo.startsWith("data:")) return logo;
  if (logo.startsWith("/")) return `${BASE_URL}${logo}`;
  if (logo.startsWith("uploads/")) return `${BASE_URL}/api/${logo}`;
  return `${BASE_URL}/api/uploads/${logo}`;
});

const firstStudent = computed(() => props.leave?.items?.[0]?.student || null);

const categoryLabel = computed(() => {
  const cat = props.leave?.leaveCategory;
  if (cat === "keluar") return "Izin Keluar Komplek (Tidak Menginap)";
  if (cat === "sakit" || props.leave?.type === "sick") return "Izin Sakit / Pemeriksaan Medis";
  if (cat === "kegiatan") return "Izin Kegiatan / Dispensasi Pondok";
  return "Izin Pulang (Menginap)";
});

const qrDataUrl = computed(() => {
  const token = props.leave?.qrToken || `SLV-${props.leave?.id || 0}`;
  return generateQrSvgDataUrl(token, { margin: 2 });
});

function formatFullDate(dateVal) {
  if (!dateVal) return "-";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(dateVal) {
  if (!dateVal) return "-";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function copyToken() {
  if (!props.leave?.qrToken) return;
  try {
    await navigator.clipboard.writeText(props.leave.qrToken);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (e) {
    console.warn("Clipboard error:", e);
  }
}

function printLetter() {
  if (!printAreaRef.value) return;
  const htmlContent = printAreaRef.value.innerHTML;
  const printWindow = window.open("", "_blank", "width=880,height=1050");
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Surat Izin Santri - ${props.leave?.leaveNumber || props.leave?.qrToken || ""}</title>
        <script src="https://cdn.tailwindcss.com"><\/script>
        <style>
          @page {
            size: A4 portrait;
            margin: 7mm 12mm 7mm 12mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: 'Times New Roman', Times, serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0 !important;
            padding: 0 !important;
          }
          .letter-print-wrapper {
            width: 100%;
            max-width: 186mm;
            margin: 0 auto;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
          }
        </style>
      </head>
      <body>
        <div class="letter-print-wrapper">
          ${htmlContent}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        <\/script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

async function loadInstitutionSettings() {
  try {
    const [publicRes, headerRes] = await Promise.allSettled([
      settingsApi.getPublic(),
      studentLeavesApi.getHeaderLogo(),
    ]);

    if (publicRes.status === "fulfilled" && publicRes.value?.success && publicRes.value.data) {
      const data = publicRes.value.data;
      if (data.institution_name) institution.name = data.institution_name;
      if (data.foundation_name) institution.foundationName = data.foundation_name;
      if (data.institution_logo) institution.logo = data.institution_logo;
      if (data.institution_address) institution.address = data.institution_address;
    }

    if (
      headerRes.status === "fulfilled" &&
      headerRes.value?.success &&
      headerRes.value.data?.activeLogo
    ) {
      academicHeaderLogo.value = headerRes.value.data.activeLogo;
      isCustomKesantrian.value = !!headerRes.value.data.isCustomKesantrian;
      useImageHeader.value = true;
    } else {
      useImageHeader.value = false;
    }
  } catch (e) {
    console.warn("Load settings warning:", e);
  }
}

onMounted(() => {
  loadInstitutionSettings();
});
</script>

<style scoped>
.letter-preview-container {
  page-break-inside: avoid;
  page-break-after: avoid;
}

@media print {
  body * {
    visibility: hidden !important;
  }
  .letter-preview-container,
  .letter-preview-container * {
    visibility: visible !important;
  }
  .letter-preview-container {
    position: fixed !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    max-width: 186mm !important;
    margin: 0 auto !important;
    padding: 7mm 12mm !important;
    border: none !important;
    box-shadow: none !important;
    background: #ffffff !important;
    z-index: 999999 !important;
    page-break-inside: avoid !important;
    page-break-after: avoid !important;
  }
  @page {
    size: A4 portrait;
    margin: 7mm 12mm 7mm 12mm;
  }
}
</style>
