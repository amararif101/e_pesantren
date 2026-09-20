<template>
  <div class="p-2 max-w-7xl mx-auto pb-12">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-slate-800">Mading Sertifikasi</h1>
      <p class="text-slate-500">
        Laporan status ujian sertifikasi per grup halaqah
      </p>
    </div>

    <!-- Filters -->
    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
        <!-- Halaqah Select -->
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1"
            >Grup Halaqah</label
          >
          <select
            v-model="filters.halaqahId"
            class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none"
            @change="loadReport"
          >
            <option value="">Pilih Grup</option>
            <option v-for="h in halaqahList" :key="h.id" :value="h.id">
              {{ h.name }}
            </option>
          </select>
        </div>

        <!-- Class Select -->
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1"
            >Grup Kelas</label
          >
          <select
            v-model="filters.classId"
            class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none"
            @change="loadReport"
          >
            <option value="">Semua Kelas</option>
            <option v-for="c in classesList" :key="c.id" :value="c.id">
              {{ c.name }}
            </option>
          </select>
        </div>

        <!-- Start Date -->
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1"
            >Tanggal Mulai</label
          >
          <input
            type="date"
            v-model="filters.startDate"
            class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none"
            @change="loadReport"
          />
        </div>

        <!-- End Date -->
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1"
            >Tanggal Akhir</label
          >
          <input
            type="date"
            v-model="filters.endDate"
            class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none"
            @change="loadReport"
          />
        </div>

        <!-- Gender -->
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1"
            >Gender</label
          >
          <select
            v-model="filters.gender"
            class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none"
            @change="loadReport"
          >
            <option value="">Semua</option>
            <option value="male">Ikhwan</option>
            <option value="female">Akhwat</option>
          </select>
        </div>
      </div>

      <!-- Actions -->
      <div
        class="mt-4 pt-4 border-t border-slate-100 flex flex-wrap justify-end gap-3 print:hidden"
        v-if="report"
      >
        <button
          @click="handlePrint"
          class="flex items-center gap-2 px-4 py-2 bg-[#602515] text-white rounded-lg hover:bg-[#4a1c10] transition-colors"
        >
          <Icon icon="solar:printer-bold-duotone" />
          Cetak
        </button>
        <button
          @click="handleDownloadPdf"
          :disabled="loading || pdfLoading"
          class="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          <Icon
            :icon="
              pdfLoading
                ? 'svg-spinners:ring-resize'
                : 'solar:file-download-bold'
            "
          />
          {{ pdfLoading ? "Generating..." : "Download PDF" }}
        </button>
        <button
          @click="exportToExcel"
          class="flex items-center gap-2 px-4 py-2 bg-[#107c41] text-white rounded-lg hover:bg-[#0c5e31] transition-colors"
        >
          <Icon icon="solar:file-download-bold" />
          Export Excel
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div
      v-if="loading"
      class="h-64 flex items-center justify-center bg-white rounded-xl border border-slate-200"
    >
      <span class="text-slate-500 animate-pulse">Memuat data...</span>
    </div>

    <!-- No Halaqah Selected -->
    <div
      v-else-if="!filters.halaqahId"
      class="h-64 flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200 text-slate-400"
    >
      <Icon icon="solar:diploma-verified-line-duotone" class="text-4xl mb-2" />
      <p>Pilih grup halaqah untuk melihat laporan</p>
    </div>

    <!-- Report Content -->
    <div v-else class="w-full">
      <div ref="reportContainer" class="w-full overflow-hidden">
        <div
          id="print-area"
          class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm origin-top-left transition-transform duration-200"
          :style="reportStyle"
        >
          <div class="pdf-page-wrapper">
            <!-- Report Header -->
            <div class="text-center pb-4 mb-6">
              <h2 class="text-xl font-bold uppercase">
                Status Ujian Sertifikasi Santri
              </h2>
              <h3 class="text-lg">Pondok Pesantren Minhajul Haq</h3>
            </div>

            <!-- Report Info -->
            <div class="grid grid-cols-2 gap-4 mb-6 text-sm">
              <div>
                <p>
                  <span class="font-semibold">Halaqah</span>:
                  {{ report?.halaqah?.name || "-" }}
                </p>
                <p>
                  <span class="font-semibold">Pengampu Halaqah</span>:
                  {{ report?.mentor?.fullName || "-" }}
                </p>
              </div>
              <div class="text-right">
                <p>
                  <span class="font-semibold">Sudah Ujian</span>:
                  {{ completedCount }}/{{ report?.members?.length || 0 }}
                  Santri
                </p>
                <p>
                  <span class="font-semibold">Periode</span>:
                  {{ formatDateRange() }}
                </p>
              </div>
            </div>

            <!-- Table -->
            <div class="overflow-x-auto">
              <table class="w-full text-sm border-collapse">
                <thead>
                  <tr class="bg-slate-100">
                    <th class="border p-2 text-center">No</th>
                    <th class="border p-2 text-left">Nama Lengkap</th>
                    <th class="border p-2 text-center">Kelas</th>
                    <th class="border p-2 text-center">Status</th>
                    <th class="border p-2 text-center">Tanggal Ujian</th>
                    <th class="border p-2 text-center">Nilai Akhir</th>
                    <th class="border p-2 text-center">Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(m, idx) in report?.members"
                    :key="m.studentId"
                    class="hover:bg-slate-50"
                  >
                    <td class="border p-2 text-center">{{ idx + 1 }}</td>
                    <td class="border p-2">{{ m.fullName }}</td>
                    <td class="border p-2 text-center">
                      {{ m.className || "-" }}
                    </td>
                    <td class="border p-2 text-center">
                      <span
                        class="px-2 py-0.5 rounded text-xs font-medium"
                        :class="
                          m.hasExam
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-500'
                        "
                      >
                        {{ m.hasExam ? "Sudah" : "Belum" }}
                      </span>
                    </td>
                    <td class="border p-2 text-center">
                      {{ formatExamDate(m.examDate) }}
                    </td>
                    <td class="border p-2 text-center font-bold">
                      {{ m.finalScore ?? "-" }}
                    </td>
                    <td class="border p-2 text-center">
                      <span
                        v-if="m.verdict"
                        :class="getVerdictClass(m.verdict)"
                        class="px-2 py-0.5 rounded text-xs font-medium"
                      >
                        {{ getVerdictLabel(m.verdict) }}
                      </span>
                      <span v-else>-</span>
                    </td>
                  </tr>
                  <tr v-if="!report?.members?.length">
                    <td
                      colspan="7"
                      class="border p-4 text-center text-slate-500 italic"
                    >
                      Tidak ada data anggota
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Legend -->
            <div class="mt-6 text-xs text-slate-600">
              <p class="font-semibold mb-1">Keterangan Verdict:</p>
              <p>
                <span class="px-1 bg-green-100 text-green-700 rounded"
                  >Lulus</span
                >
                |
                <span class="px-1 bg-red-100 text-red-700 rounded"
                  >Tidak Lulus</span
                >
                |
                <span class="px-1 bg-yellow-100 text-yellow-700 rounded"
                  >Bersyarat</span
                >
              </p>
            </div>

            <!-- Footer -->
            <div class="grid grid-cols-2 gap-8 text-center mt-12 text-sm">
              <div></div>
              <div>
                <p class="mb-16">
                  Purwakarta, {{ currentDate }}<br />Pengampu Halaqah,
                </p>
                <p class="font-bold inline-block min-w-[150px]">
                  {{ report?.mentor?.fullName || "_______________" }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from "vue";

import { Icon } from "@iconify/vue";
import { useElementSize } from "@vueuse/core";
import { tahfidzApi, halaqahApi, academicApi } from "@/services/api";
import { usePdfExport } from "@/composables/usePdfExport";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const loading = ref(false);
const halaqahList = ref([]);
const classesList = ref([]);
const report = ref(null);

const reportContainer = ref(null);
const { width: containerWidth } = useElementSize(reportContainer);

const scale = computed(() => {
  if (!containerWidth.value) return 1;
  const A4_WIDTH_PX = 794; // 210mm @ 96dpi
  const availableWidth = containerWidth.value;
  return availableWidth < A4_WIDTH_PX ? availableWidth / A4_WIDTH_PX : 1;
});

const reportStyle = computed(() => ({
  width: "210mm",
  minHeight: "297mm",
  transform: `scale(${scale.value})`,
  marginBottom: `-${(1 - scale.value) * 100}%`,
  transformOrigin: "top left",
}));

const filters = reactive({
  halaqahId: "",
  classId: "",
  startDate: getDefaultStartDate(),
  endDate: getDefaultEndDate(),
  gender: "",
});

// Default to current month
function getDefaultStartDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}-01`;
}

function getDefaultEndDate() {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}-${lastDay}`;
}

const currentDate = new Date().toLocaleDateString("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const completedCount = computed(
  () => report.value?.members?.filter((m) => m.hasExam).length || 0
);

async function loadHalaqahList() {
  try {
    const res = await halaqahApi.getAll();
    if (res.success) {
      halaqahList.value = res.data || [];
    }
  } catch (e) {
    console.error("Failed to load halaqah list:", e);
  }
}

async function loadClasses() {
  try {
    const res = await academicApi.getClasses();
    if (res.data) {
      classesList.value = res.data;
    }
  } catch (e) {
    console.error("Failed to load classes:", e);
  }
}

async function loadReport() {
  if (!filters.halaqahId || !filters.startDate || !filters.endDate) return;

  loading.value = true;
  try {
    const params = {
      halaqahId: filters.halaqahId,
      startDate: filters.startDate,
      endDate: filters.endDate,
    };
    if (filters.gender) {
      params.gender = filters.gender;
    }
    if (filters.classId) {
      params.classId = filters.classId;
    }
    const res = await tahfidzApi.getSertifikasiReport(params);
    if (res.success) {
      report.value = res.data;
    }
  } catch (e) {
    console.error("Failed to load report:", e);
  } finally {
    loading.value = false;
  }
}

function formatDateRange() {
  const start = new Date(filters.startDate).toLocaleDateString("id-ID");
  const end = new Date(filters.endDate).toLocaleDateString("id-ID");
  return `${start} s.d. ${end}`;
}

function formatExamDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID");
}

function getVerdictLabel(verdict) {
  if (verdict === "pass") return "Lulus";
  if (verdict === "fail") return "Tidak Lulus";
  if (verdict === "conditional") return "Bersyarat";
  return "-";
}

function getVerdictClass(verdict) {
  if (verdict === "pass") return "bg-green-100 text-green-700";
  if (verdict === "fail") return "bg-red-100 text-red-700";
  if (verdict === "conditional") return "bg-yellow-100 text-yellow-700";
  return "bg-slate-100 text-slate-500";
}

function handlePrint() {
  window.print();
}

// PDF Download
const { exportToPdf, pdfLoading } = usePdfExport();

async function handleDownloadPdf() {
  if (!report.value || !report.value.members.length) return;

  const element = document.getElementById("print-area");
  if (!element) {
    alert("Halaman mading belum siap. Mohon tunggu sebentar.");
    return;
  }

  try {
    await exportToPdf({
      selector: "#print-area",
      filename: `Mading_Sertifikasi_${report.value.halaqah.name.replace(
        /\s+/g,
        "_"
      )}_${filters.startDate}.pdf`,
      paddingMm: 0,
      includeArabicFont: false,
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    alert("Gagal generate PDF: " + error.message);
  }
}

async function exportToExcel() {
  if (!report.value?.members.length) return;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Sertifikasi");

  worksheet.columns = [
    { width: 5 }, // No
    { width: 30 }, // Nama
    { width: 12 }, // Kelas
    { width: 10 }, // Status
    { width: 15 }, // Tanggal Ujian
    { width: 12 }, // Nilai Akhir
    { width: 12 }, // Verdict
  ];

  let currentRow = 1;

  worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
  const titleCell = worksheet.getCell(`A${currentRow}`);
  titleCell.value = "LAPORAN STATUS UJIAN SERTIFIKASI SANTRI";
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  currentRow++;

  worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
  const subTitleCell = worksheet.getCell(`A${currentRow}`);
  subTitleCell.value = "PONDOK PESANTREN MINHAJUL HAQ PURWAKARTA";
  subTitleCell.font = { bold: true, size: 12 };
  subTitleCell.alignment = { horizontal: "center", vertical: "middle" };
  currentRow += 2;

  const addMetadata = (label, value) => {
    const labelCell = worksheet.getCell(`A${currentRow}`);
    labelCell.value = label;
    labelCell.font = { bold: true };
    const valueCell = worksheet.getCell(`C${currentRow}`);
    valueCell.value = ": " + value;
    valueCell.alignment = { horizontal: "left" };
    currentRow++;
  };

  addMetadata("Grup Halaqah", report.value?.halaqah?.name || "-");
  addMetadata("Pengampu", report.value?.mentor?.fullName || "-");
  addMetadata("Periode", formatDateRange());

  currentRow++;

  const headers = [
    "No",
    "Nama Lengkap",
    "Kelas",
    "Status",
    "Tanggal Ujian",
    "Nilai Akhir",
    "Verdict",
  ];
  const headerRow = worksheet.getRow(currentRow);
  headerRow.values = headers;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F5F9" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });
  currentRow++;

  report.value.members.forEach((m, idx) => {
    const rowValues = [
      idx + 1,
      m.fullName,
      m.className || "-",
      m.hasExam ? "Sudah" : "Belum",
      formatExamDate(m.examDate),
      m.finalScore ?? "-",
      getVerdictLabel(m.verdict),
    ];
    const row = worksheet.getRow(currentRow);
    row.values = rowValues;

    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: colNumber === 2 ? "left" : "center",
      };

      if (colNumber === 7) {
        let argb = null;
        if (m.verdict === "pass") argb = "FFDCFCE7";
        if (m.verdict === "fail") argb = "FFFEE2E2";
        if (m.verdict === "conditional") argb = "FFFEF9C3";
        if (argb) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
        }
      }
    });

    currentRow++;
  });

  currentRow += 2;

  const signCol = "E";
  let signRow = currentRow;
  worksheet.getCell(`${signCol}${signRow}`).value = `Purwakarta, ${currentDate}`;
  signRow++;
  worksheet.getCell(`${signCol}${signRow}`).value = "Pengampu Halaqah,";
  signRow += 5;
  worksheet.getCell(`${signCol}${signRow}`).value =
    report.value?.mentor?.fullName || "____________________";
  worksheet.getCell(`${signCol}${signRow}`).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const dateStr = new Date().toISOString().split("T")[0];
  saveAs(new Blob([buffer]), `Laporan_Sertifikasi_${dateStr}.xlsx`);
}

watch(
  () => filters.halaqahId,
  (newVal) => {
    if (newVal && filters.startDate && filters.endDate) {
      loadReport();
    }
  }
);

onMounted(() => {
  loadHalaqahList();
  loadClasses();
});
</script>
