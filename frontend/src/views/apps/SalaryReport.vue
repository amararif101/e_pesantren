<template>
  <div class="max-w-6xl mx-auto pb-12">
    <!-- DataTable -->
    <DataTable
      :items="paginatedData"
      :columns="columns"
      :loading="loading"
      :pagination="pagination"
      :viewMode="viewMode"
      title="Laporan Gaji Pegawai"
      description="Rekapitulasi perhitungan gaji pegawai berdasarkan absensi dan komponen tunjangan."
      icon="solar:bill-list-bold-duotone"
      :search="search"
      @update:search="search = $event"
      @update:limit="
        pagination.limit = $event;
        pagination.page = 1;
      "
      @page-change="pagination.page = $event"
      @update:viewMode="viewMode = $event"
      @sort="handleSort"
      :sortBy="sortBy"
      :sortOrder="sortOrder"
    >
      <!-- Header Actions -->
      <template #header-actions>
        <button
          @click="loadData"
          class="p-2 bg-amber-900 text-white hover:bg-amber-400 rounded-lg transition-colors"
          title="Refresh"
        >
          <Icon
            icon="lucide:refresh-cw"
            class="w-5 h-5"
            :class="{ 'animate-spin': loading }"
          />
        </button>
        <button
          @click="exportToExcel"
          :disabled="exporting || filteredData.length === 0"
          class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Icon
            v-if="exporting"
            icon="lucide:loader-2"
            class="w-4 h-4 animate-spin"
          />
          <Icon v-else icon="lucide:file-spreadsheet" class="w-4 h-4" />
          <span class="hidden sm:inline">Export Excel</span>
        </button>
      </template>

      <!-- Filters -->
      <template #filters>
        <div class="grid grid-cols-1 gap-4">
          <!-- Date Filters -->
          <div class="space-y-1">
            <label class="text-xs font-medium text-slate-500">Periode</label>
            <div class="flex flex-col sm:flex-row sm:items-center gap-2">
              <input
                v-model="filter.startDate"
                type="date"
                @change="loadData"
                class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-100"
              />
              <span class="text-slate-400 hidden sm:inline">-</span>
              <span class="text-xs text-slate-400 sm:hidden">Sampai</span>
              <input
                v-model="filter.endDate"
                type="date"
                @change="loadData"
                class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          <!-- Division Filter -->
          <div class="space-y-1">
            <label class="text-xs font-medium text-slate-500">Divisi</label>
            <select
              v-model="filter.divisionId"
              class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">Semua Divisi</option>
              <option v-for="div in divisions" :key="div.id" :value="div.id">
                {{ div.name }}
              </option>
            </select>
          </div>

          <!-- Grade Filter -->
          <div class="space-y-1">
            <label class="text-xs font-medium text-slate-500">Golongan</label>
            <select
              v-model="filter.gradeId"
              class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">Semua Golongan</option>
              <option v-for="g in grades" :key="g.id" :value="g.id">
                {{ g.name }}
              </option>
            </select>
          </div>

          <!-- Gender Filter -->
          <div class="space-y-1">
            <label class="text-xs font-medium text-slate-500">Gender</label>
            <select
              v-model="filter.gender"
              class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">Semua Gender</option>
              <option value="male">Ikhwan</option>
              <option value="female">Akhwat</option>
            </select>
          </div>
        </div>
      </template>
      <!-- Cell: Name -->
      <template #cell-name="{ item }">
        <div class="font-medium text-slate-800">
          {{ item.teacher.name }}
        </div>
        <div class="text-xs text-slate-500">
          {{ item.teacher.position || "Guru" }} •
          {{ item.teacher.yearsService }} Thn •
          {{ item.teacher.teachingHours || 0 }} Jam
        </div>
      </template>

      <!-- Cell: Grade -->
      <template #cell-grade="{ item }">
        <span
          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
        >
          {{ item.teacher.gradeName || "-" }}
        </span>
      </template>

      <!-- Cell: Base Salary -->
      <template #cell-baseSalary="{ item }">
        <span class="font-mono text-slate-600">
          {{ formatCurrency(item.baseSalary || 0) }}
        </span>
      </template>

      <!-- Cell: Attendance Days -->
      <template #cell-attendanceDays="{ item }">
        <span
          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
        >
          {{ item.attendance.days }} Hari
        </span>
      </template>

      <!-- Cell: Attendance Allowance -->
      <template #cell-attendanceTotal="{ item }">
        <span class="font-mono text-slate-600">
          {{ formatCurrency(item.attendance.total) }}
        </span>
      </template>

      <!-- Cell: Position Allowance -->
      <template #cell-allowancesPosition="{ item }">
        <span class="font-mono text-slate-600">
          {{ formatCurrency(item.allowances.position) }}
        </span>
      </template>

      <!-- Cell: Teaching Allowance -->
      <template #cell-allowancesTeaching="{ item }">
        <span class="font-mono text-slate-600">
          {{ formatCurrency(item.allowances.teaching || 0) }}
        </span>
      </template>

      <!-- Cell: Other Allowances -->
      <template #cell-allowancesOthers="{ item }">
        <span class="font-mono text-slate-600">
          {{
            formatCurrency(
              item.allowances.health +
                item.allowances.housing +
                item.allowances.transport +
                item.allowances.tenure +
                item.allowances.customTotal
            )
          }}
        </span>
      </template>

      <!-- Cell: Total Salary -->
      <template #cell-totalSalary="{ item }">
        <span class="font-mono font-bold text-emerald-600">
          {{ formatCurrency(item.totalSalary) }}
        </span>
      </template>

      <!-- Cell: Actions -->
      <template #cell-actions="{ item }">
        <button
          @click="openSlip(item)"
          class="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-900 text-white hover:bg-amber-400 hover:text-amber-900 rounded-lg text-xs font-medium transition-colors"
        >
          <Icon icon="lucide:printer" class="w-3.5 h-3.5" />
          Cetak
        </button>
      </template>

      <!-- Card Item View -->
      <template #card-item="{ item }">
        <div
          class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow h-full flex flex-col"
        >
          <div class="flex justify-between items-start mb-4">
            <div>
              <h3 class="font-bold text-slate-800">{{ item.teacher.name }}</h3>
              <p class="text-xs text-slate-500 mt-0.5">
                {{ item.teacher.position || "Guru" }} •
                {{ item.grade || "-" }} • {{ item.teacher.yearsService }} Thn
              </p>
            </div>
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              {{ item.attendance.days }} Hari
            </span>
          </div>

          <div class="space-y-2 text-sm border-t border-slate-100 pt-3 flex-1">
            <div class="flex justify-between">
              <span class="text-slate-500">Gaji Pokok</span>
              <span class="font-mono text-slate-700 font-medium">{{
                formatCurrency(item.baseSalary)
              }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Tunjangan Kehadiran</span>
              <span class="font-mono text-slate-700">{{
                formatCurrency(item.attendance.total)
              }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Tunjangan Jabatan</span>
              <span class="font-mono text-slate-700">{{
                formatCurrency(item.allowances.position)
              }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Tun. Jam Ajar</span>
              <span class="font-mono text-slate-700">{{
                formatCurrency(item.allowances.teaching || 0)
              }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Tunjangan Lainnya</span>
              <span class="font-mono text-slate-700">
                {{
                  formatCurrency(
                    item.allowances.health +
                      item.allowances.housing +
                      item.allowances.transport +
                      item.allowances.tenure +
                      item.allowances.customTotal
                  )
                }}
              </span>
            </div>
          </div>

          <div
            class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between"
          >
            <div>
              <p class="text-xs text-slate-500">Total Gaji</p>
              <p class="font-bold text-emerald-600 text-lg">
                {{ formatCurrency(item.totalSalary) }}
              </p>
            </div>
            <button
              @click="openSlip(item)"
              class="p-2 bg-amber-900 text-white hover:bg-amber-400 hover:text-amber-900 rounded-lg transition-colors"
              title="Cetak Slip"
            >
              <Icon icon="lucide:printer" class="w-5 h-5" />
            </button>
          </div>
        </div>
      </template>
    </DataTable>

    <!-- MODAL SLIP -->
    <div
      v-if="selectedRow"
      class="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-black/70 overflow-y-auto"
    >
      <div
        class="bg-slate-200 rounded-xl max-h-[90vh] overflow-y-auto w-full max-w-4xl relative shadow-2xl"
      >
        <div
          class="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center"
        >
          <h3 class="font-bold text-slate-800">Preview Slip Gaji</h3>
          <div class="flex items-center gap-2">
            <button
              @click="downloadPDF"
              class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
              :disabled="downloading"
            >
              <Icon
                v-if="downloading === 'pdf'"
                icon="lucide:loader-2"
                class="w-4 h-4 animate-spin"
              />
              <Icon v-else icon="lucide:file-text" class="w-4 h-4" />
              PDF
            </button>
            <button
              @click="downloadPNG"
              class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
              :disabled="downloading"
            >
              <Icon
                v-if="downloading === 'png'"
                icon="lucide:loader-2"
                class="w-4 h-4 animate-spin"
              />
              <Icon v-else icon="lucide:image" class="w-4 h-4" />
              PNG
            </button>
            <button
              @click="selectedRow = null"
              class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <Icon icon="lucide:x" class="w-5 h-5" />
            </button>
          </div>
        </div>

        <div class="p-8 flex justify-center">
          <SalarySlip
            id="salary-slip-node"
            :data="selectedRow"
            :period="filter"
            :institution="institutionSettings"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from "vue";
import { Icon } from "@iconify/vue";
import {
  salaryApi,
  settingsApi,
  divisionsApi,
  salaryGradesApi,
} from "@/services/api";
import SalarySlip from "@/components/SalarySlip.vue";
import DataTable from "@/components/ui/DataTable.vue";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import ExcelJS from "exceljs/dist/exceljs.min.js";
import { saveAs } from "file-saver";

const now = new Date();
const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

const filter = reactive({
  startDate: firstDayOfMonth.toISOString().split("T")[0],
  endDate: lastDayOfMonth.toISOString().split("T")[0],
  divisionId: "",
  gradeId: "",
  gender: "",
});

const reportData = ref([]);
const divisions = ref([]);
const grades = ref([]);
const institutionSettings = ref({});

const loading = ref(true);
const exporting = ref(false);
const error = ref(null);
const selectedRow = ref(null);
const downloading = ref(null);

// DataTable State
const viewMode = ref(window.innerWidth < 768 ? "card" : "table");
const search = ref("");
const sortBy = ref("");
const sortOrder = ref("asc");
const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
});

const columns = [
  { field: "name", label: "Nama Pegawai", sortable: true },
  { field: "grade", label: "Golongan", sortable: true },
  { field: "baseSalary", label: "Gaji Pokok", sortable: true, align: "right" },
  {
    field: "attendanceDays",
    label: "Kehadiran",
    sortable: true,
    align: "center",
  },
  {
    field: "attendanceTotal",
    label: "Tun. Kehadiran",
    sortable: true,
    align: "right",
  },
  {
    field: "allowancesPosition",
    label: "Tun. Jabatan",
    sortable: true,
    align: "right",
  },
  {
    field: "allowancesTeaching",
    label: "Tun. Jam Ajar",
    sortable: true,
    align: "right",
  },
  {
    field: "allowancesOthers",
    label: "Tun. Lainnya",
    sortable: false,
    align: "right",
  },
  {
    field: "totalSalary",
    label: "Total Gaji",
    sortable: true,
    align: "right",
    headerClass: "font-bold text-slate-800",
  },
  { field: "actions", label: "Aksi", sortable: false, align: "center" },
];

const formatCurrency = (val) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(val);

// 1. Initial Filtering (by explicit filters)
const filteredData = computed(() => {
  let result = reportData.value;

  if (filter.divisionId) {
    const divId = parseInt(filter.divisionId);
    result = result.filter((row) => row.teacher.divisionId === divId);
  }
  if (filter.gradeId) {
    const gId = parseInt(filter.gradeId);
    result = result.filter((row) => row.teacher.salaryGradeId === gId);
  }
  if (filter.gender) {
    result = result.filter((row) => row.teacher.gender === filter.gender);
  }

  return result;
});

// 2. Search & Sort (for DataTable)
const processedData = computed(() => {
  let data = [...filteredData.value];

  // Search
  if (search.value) {
    const q = search.value.toLowerCase();
    data = data.filter((row) => row.teacher.name.toLowerCase().includes(q));
  }

  // Sort
  if (sortBy.value) {
    data.sort((a, b) => {
      let aVal, bVal;

      switch (sortBy.value) {
        case "name":
          aVal = a.teacher.name;
          bVal = b.teacher.name;
          break;
        case "grade":
          aVal = a.teacher.gradeName || "";
          bVal = b.teacher.gradeName || "";
          break;
        case "baseSalary":
          aVal = a.baseSalary || 0;
          bVal = b.baseSalary || 0;
          break;
        case "attendanceDays":
          aVal = a.attendance.days;
          bVal = b.attendance.days;
          break;
        case "attendanceTotal":
          aVal = a.attendance.total;
          bVal = b.attendance.total;
          break;
        case "allowancesPosition":
          aVal = a.allowances.position;
          bVal = b.allowances.position;
          break;
        case "allowancesTeaching":
          aVal = a.allowances.teaching || 0;
          bVal = b.allowances.teaching || 0;
          break;
        case "totalSalary":
          aVal = a.totalSalary;
          bVal = b.totalSalary;
          break;
        default:
          return 0;
      }

      const modifier = sortOrder.value === "asc" ? 1 : -1;
      if (typeof aVal === "string") return aVal.localeCompare(bVal) * modifier;
      return (aVal - bVal) * modifier;
    });
  }

  return data;
});

// 3. Pagination
const paginatedData = computed(() => {
  const start = (pagination.page - 1) * pagination.limit;
  const end = start + pagination.limit;

  pagination.total = processedData.value.length;
  pagination.totalPages = Math.ceil(pagination.total / pagination.limit);

  return processedData.value.slice(start, end);
});

watch([search], () => {
  pagination.page = 1;
});

function handleSort(field) {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
  } else {
    sortBy.value = field;
    sortOrder.value = "asc";
  }
}

async function loadData() {
  loading.value = true;
  error.value = null;
  try {
    const startDateObj = new Date(filter.startDate);
    const month = startDateObj.getMonth() + 1;
    const year = startDateObj.getFullYear();

    const [resReport, resSettings, resDivisions, resGrades] = await Promise.all(
      [
        salaryApi.getReport(month, year),
        settingsApi.getAll(),
        divisionsApi.getAll(),
        salaryGradesApi.getAll(),
      ]
    );

    if (resReport.success) reportData.value = resReport.data.rows;
    if (resSettings.success) institutionSettings.value = resSettings.data;
    if (resDivisions.success) divisions.value = resDivisions.data;
    if (resGrades.success) grades.value = resGrades.data;
  } catch (err) {
    console.error(err);
    error.value = "Gagal memuat data laporan gaji.";
  } finally {
    loading.value = false;
  }
}

function openSlip(row) {
  selectedRow.value = row;
}

// Export logic remains mostly the same, using filteredData (not paginated)
async function exportToExcel() {
  if (filteredData.value.length === 0) return;

  exporting.value = true;

  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Laporan Gaji");

    const startDate = new Date(filter.startDate);
    const endDate = new Date(filter.endDate);
    const periodText = `Periode: ${startDate.toLocaleDateString(
      "id-ID"
    )} - ${endDate.toLocaleDateString("id-ID")}`;

    sheet.mergeCells("A1:Q1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = "LAPORAN GAJI PEGAWAI";
    titleCell.font = { bold: true, size: 16, color: { argb: "FF1E293B" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(1).height = 30;

    sheet.mergeCells("A2:Q2");
    const periodCell = sheet.getCell("A2");
    periodCell.value = periodText;
    periodCell.font = { size: 11, color: { argb: "FF64748B" } };
    periodCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(2).height = 20;

    sheet.getRow(3).height = 10;

    const headers = [
      "No",
      "Nama Pegawai",
      "Jabatan",
      "Golongan",
      "Masa Kerja",
      "Jam Mengajar",
      "Gaji Pokok",
      "Hari Hadir",
      "Tun. Kehadiran",
      "Tun. Jabatan",
      "Tun. Jam Ajar",
      "Tun. Kesehatan",
      "Tun. Perumahan",
      "Tun. Transport",
      "Tun. Masa Kerja",
      "Tun. Lainnya",
      "Total Gaji",
    ];

    const headerRow = sheet.getRow(4);
    headers.forEach((header, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4F46E5" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin", color: { argb: "FF94A3B8" } },
        left: { style: "thin", color: { argb: "FF94A3B8" } },
        bottom: { style: "thin", color: { argb: "FF94A3B8" } },
        right: { style: "thin", color: { argb: "FF94A3B8" } },
      };
    });
    headerRow.height = 25;

    sheet.columns = [
      { key: "no", width: 5 },
      { key: "name", width: 30 },
      { key: "position", width: 18 },
      { key: "grade", width: 15 },
      { key: "years", width: 12 },
      { key: "teachingHours", width: 12 },
      { key: "baseSalary", width: 18 },
      { key: "days", width: 12 },
      { key: "attendance", width: 18 },
      { key: "posAllow", width: 18 },
      { key: "teachAllow", width: 18 },
      { key: "health", width: 18 },
      { key: "housing", width: 18 },
      { key: "transport", width: 18 },
      { key: "tenure", width: 18 },
      { key: "custom", width: 18 },
      { key: "total", width: 20 },
    ];

    filteredData.value.forEach((row, index) => {
      const dataRow = sheet.addRow([
        index + 1,
        row.teacher.name,
        row.teacher.position || "Guru",
        row.teacher.gradeName || "-",
        row.teacher.yearsService,
        row.teacher.teachingHours || 0,
        row.baseSalary || 0,
        row.attendance.days,
        row.attendance.total,
        row.allowances.position,
        row.allowances.teaching || 0,
        row.allowances.health,
        row.allowances.housing,
        row.allowances.transport,
        row.allowances.tenure,
        row.allowances.customTotal,
        row.totalSalary,
      ]);

      dataRow.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };

        if (index % 2 === 1) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF8FAFC" },
          };
        }

        if (colNumber >= 7 && colNumber <= 17) {
          cell.numFmt = "#,##0";
          cell.alignment = { horizontal: "right" };
        }

        if (
          colNumber === 1 ||
          colNumber === 5 ||
          colNumber === 6 ||
          colNumber === 8
        ) {
          cell.alignment = { horizontal: "center" };
        }

        if (colNumber === 17) {
          cell.font = { bold: true, color: { argb: "FF059669" } };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFD1FAE5" },
          };
        }
      });
    });

    const summaryRowIndex = sheet.rowCount + 1;
    const summaryRow = sheet.getRow(summaryRowIndex);

    const totalBaseSalary = filteredData.value.reduce(
      (sum, r) => sum + (r.baseSalary || 0),
      0
    );
    const totalAttendance = filteredData.value.reduce(
      (sum, r) => sum + r.attendance.total,
      0
    );
    const totalPosition = filteredData.value.reduce(
      (sum, r) => sum + r.allowances.position,
      0
    );
    const totalTeaching = filteredData.value.reduce(
      (sum, r) => sum + (r.allowances.teaching || 0),
      0
    );
    const totalHealth = filteredData.value.reduce(
      (sum, r) => sum + r.allowances.health,
      0
    );
    const totalHousing = filteredData.value.reduce(
      (sum, r) => sum + r.allowances.housing,
      0
    );
    const totalTransport = filteredData.value.reduce(
      (sum, r) => sum + r.allowances.transport,
      0
    );
    const totalTenure = filteredData.value.reduce(
      (sum, r) => sum + r.allowances.tenure,
      0
    );
    const totalCustom = filteredData.value.reduce(
      (sum, r) => sum + r.allowances.customTotal,
      0
    );
    const totalSalary = filteredData.value.reduce(
      (sum, r) => sum + r.totalSalary,
      0
    );

    sheet.mergeCells(`A${summaryRowIndex}:F${summaryRowIndex}`);
    summaryRow.getCell(1).value = "TOTAL";
    summaryRow.getCell(1).font = { bold: true };
    summaryRow.getCell(1).alignment = { horizontal: "center" };
    summaryRow.getCell(7).value = totalBaseSalary;
    summaryRow.getCell(9).value = totalAttendance;
    summaryRow.getCell(10).value = totalPosition;
    summaryRow.getCell(11).value = totalTeaching;
    summaryRow.getCell(12).value = totalHealth;
    summaryRow.getCell(13).value = totalHousing;
    summaryRow.getCell(14).value = totalTransport;
    summaryRow.getCell(15).value = totalTenure;
    summaryRow.getCell(16).value = totalCustom;
    summaryRow.getCell(17).value = totalSalary;

    for (let colNumber = 1; colNumber <= 17; colNumber++) {
      const cell = summaryRow.getCell(colNumber);
      cell.font = { bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E7FF" },
      };
      cell.border = {
        top: { style: "medium", color: { argb: "FF4F46E5" } },
        left: { style: "thin", color: { argb: "FF94A3B8" } },
        bottom: { style: "medium", color: { argb: "FF4F46E5" } },
        right: { style: "thin", color: { argb: "FF94A3B8" } },
      };
      if (colNumber >= 7) {
        cell.numFmt = "#,##0";
        cell.alignment = { horizontal: "right" };
      }
      if (colNumber === 17) {
        cell.font = { bold: true, color: { argb: "FF059669" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFD1FAE5" },
        };
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const filename = `Laporan_Gaji_${startDate.toISOString().split("T")[0]}_${
      endDate.toISOString().split("T")[0]
    }.xlsx`;
    saveAs(blob, filename);
  } catch (err) {
    console.error("Export failed:", err);
    alert("Gagal mengekspor ke Excel.");
  } finally {
    exporting.value = false;
  }
}

async function downloadPDF() {
  downloading.value = "pdf";
  const element = document.getElementById("salary-slip-node");
  if (!element) return;
  try {
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Slip_Gaji_${selectedRow.value.teacher.name}.pdf`);
  } catch (e) {
    console.error(e);
  } finally {
    downloading.value = null;
  }
}

async function downloadPNG() {
  downloading.value = "png";
  const element = document.getElementById("salary-slip-node");
  if (!element) return;
  try {
    const canvas = await html2canvas(element, { scale: 2 });
    canvas.toBlob((blob) => {
      saveAs(blob, `Slip_Gaji_${selectedRow.value.teacher.name}.png`);
    });
  } catch (e) {
    console.error(e);
  } finally {
    downloading.value = null;
  }
}

onMounted(() => {
  loadData();
});
</script>
