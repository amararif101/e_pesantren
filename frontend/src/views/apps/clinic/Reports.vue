<template>
  <div class="flex px-2 flex-col gap-2">
    <div
      class="flex flex-col md:flex-row md:items-center justify-between gap-4"
    >
      <div>
        <h1 class="text-2xl font-bold text-slate-800">Laporan Klinik</h1>
        <p class="text-slate-500">
          Rekapitulasi kunjungan, diagnosa penyakit, dan ekspor data pemeriksaan.
        </p>
      </div>

      <!-- Date Filter & Actions -->
      <div
        class="flex flex-wrap items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm"
      >
        <input
          type="date"
          v-model="filters.startDate"
          class="text-sm border-none focus:ring-0 text-slate-600"
          title="Tanggal Mulai"
        />
        <span class="text-slate-400">-</span>
        <input
          type="date"
          v-model="filters.endDate"
          class="text-sm border-none focus:ring-0 text-slate-600"
          title="Tanggal Akhir"
        />
        <select
          v-model="filters.patientType"
          class="text-sm border-none focus:ring-0 text-slate-600 bg-transparent"
        >
          <option value="">Semua Tipe</option>
          <option value="student">Santri</option>
          <option value="teacher">Guru</option>
          <option value="external">Umum</option>
        </select>
        <select
          v-model="filters.gender"
          class="text-sm border-none focus:ring-0 text-slate-600 bg-transparent"
        >
          <option value="">Semua JK</option>
          <option value="L">Ikhwan</option>
          <option value="P">Akhwat</option>
        </select>

        <button
          @click="fetchReports"
          :disabled="loading"
          class="px-3.5 py-1.5 bg-[#602515] text-white rounded-lg text-sm hover:bg-[#4a1d10] transition flex items-center gap-1.5 font-medium shadow-sm disabled:opacity-50"
        >
          <Icon v-if="loading" icon="solar:spinner-line-duotone" class="animate-spin text-sm" />
          <span>Tampilkan</span>
        </button>

        <button
          @click="exportRangeExcel"
          :disabled="exportingRange"
          class="px-3.5 py-1.5 bg-emerald-700 text-white rounded-lg text-sm hover:bg-emerald-800 transition flex items-center gap-1.5 font-medium shadow-sm disabled:opacity-50"
          title="Export Semua Data Pemeriksaan Rentang Tanggal Ini ke Excel"
        >
          <Icon v-if="!exportingRange" icon="solar:file-download-bold" class="text-base" />
          <Icon v-else icon="solar:spinner-line-duotone" class="text-base animate-spin" />
          <span>{{ exportingRange ? "Mengunduh..." : "Export Excel" }}</span>
        </button>
      </div>
    </div>

    <!-- Stats Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        icon="solar:users-group-rounded-bold-duotone"
        color="blue"
        label="Total Kunjungan"
        :value="totalVisits"
      />
      <StatCard
        icon="solar:heart-pulse-bold-duotone"
        color="red"
        label="Diagnosa Terbanyak"
        :value="topDisease"
      />
      <StatCard
        icon="solar:user-id-bold-duotone"
        color="amber"
        label="Mayoritas Pasien"
        :value="topPatientType"
      />
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Top 10 Diseases -->
      <div
        class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden"
      >
        <div
          class="p-4 border-b border-slate-100 font-bold text-slate-800 flex justify-between items-center"
        >
          <h3>10 Diagnosa Penyakit Terbanyak</h3>
          <Icon icon="solar:virus-bold-duotone" class="text-slate-400" />
        </div>
        <div class="p-4 space-y-4">
          <div
            v-if="reports.diseases.length === 0"
            class="text-center text-slate-400 py-8 text-sm"
          >
            Tidak ada data pada periode ini
          </div>
          <div
            v-for="(item, idx) in reports.diseases"
            :key="idx"
            class="relative group"
          >
            <div class="flex justify-between text-sm mb-1">
              <span class="font-medium text-slate-700"
                >{{ idx + 1 }}. {{ item.name }}</span
              >
              <span class="font-bold text-slate-600">{{ item.count }}</span>
            </div>
            <div class="w-full bg-slate-100 rounded-full h-2">
              <div
                class="bg-blue-500 h-2 rounded-full transition-all duration-500"
                :style="{ width: `${(item.count / maxDiseaseCount) * 100}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Visits Trend & Patient Type -->
      <div class="space-y-6">
        <!-- Patient Types -->
        <div
          class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden"
        >
          <div class="p-4 border-b border-slate-100 font-bold text-slate-800">
            Distribusi Tipe Pasien
          </div>
          <div class="p-4 grid grid-cols-3 gap-4">
            <div
              v-for="pt in patientDistribution"
              :key="pt.label"
              class="text-center p-3 rounded-lg border border-slate-50 bg-slate-50/50"
            >
              <div class="text-xs text-slate-500 mb-1 font-semibold uppercase">
                {{ pt.label }}
              </div>
              <div class="text-xl font-bold" :class="pt.color">
                {{ pt.count }}
              </div>
              <div class="text-[10px] text-slate-400">{{ pt.percent }}%</div>
            </div>
          </div>
        </div>

        <!-- Daily Visits Table -->
        <div
          class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex-1"
        >
          <div class="p-4 border-b border-slate-100 flex justify-between items-center">
            <div>
              <div class="font-bold text-slate-800">
                Kunjungan Harian (Detail)
              </div>
              <p class="text-xs text-slate-400 mt-0.5">
                Klik pada baris tanggal untuk melihat rincian pasien
              </p>
            </div>
            <Icon icon="solar:calendar-date-bold-duotone" class="text-slate-400 text-xl" />
          </div>
          <div class="max-h-[300px] overflow-y-auto">
            <table class="w-full text-sm">
              <thead class="bg-slate-50 text-slate-500 sticky top-0 z-10">
                <tr>
                  <th class="text-left py-2.5 px-4 font-semibold">Tanggal</th>
                  <th class="text-right py-2.5 px-4 font-semibold">Jumlah Kunjungan</th>
                  <th class="text-center py-2.5 px-3 w-16 font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr
                  v-for="(v, i) in reports.visits"
                  :key="i"
                  @click="openDailyModal(v.date, v.count)"
                  class="cursor-pointer hover:bg-amber-50/80 transition-colors group"
                >
                  <td class="py-2.5 px-4 text-slate-700 font-medium flex items-center gap-2">
                    <Icon icon="solar:calendar-bold" class="text-slate-400 group-hover:text-[#602515] transition text-base" />
                    <span>{{ formatDate(v.date) }}</span>
                  </td>
                  <td class="py-2.5 px-4 text-slate-800 font-semibold text-right">
                    <span class="inline-block px-2.5 py-0.5 rounded-full text-xs bg-slate-100 group-hover:bg-amber-100 group-hover:text-amber-900 transition font-bold">
                      {{ v.count }} Pasien
                    </span>
                  </td>
                  <td class="py-2.5 px-3 text-center">
                    <button
                      class="p-1 rounded text-slate-400 group-hover:text-[#602515] group-hover:bg-white transition shadow-none group-hover:shadow-sm"
                      title="Lihat rincian pasien"
                    >
                      <Icon icon="solar:arrow-right-up-linear" class="text-base" />
                    </button>
                  </td>
                </tr>
                <tr v-if="reports.visits.length === 0">
                  <td colspan="3" class="text-center py-6 text-slate-400">
                    Tidak ada data pada periode ini
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal Detail Kunjungan Harian -->
  <Teleport to="body">
    <div
      v-if="dailyModal.show"
      class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
    >
      <div
        class="absolute inset-0 bg-black/50 backdrop-blur-sm"
        @click="dailyModal.show = false"
      ></div>
      <div
        class="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up relative z-10 flex flex-col max-h-[90vh] border border-slate-100"
      >
        <!-- Header -->
        <div
          class="p-5 border-b border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
        >
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-amber-100/70 text-[#602515] rounded-xl">
              <Icon icon="solar:calendar-date-bold" class="text-2xl" />
            </div>
            <div>
              <h3 class="font-bold text-slate-800 text-lg">
                Rincian Pasien Berobat
              </h3>
              <p class="text-xs text-slate-500 font-medium mt-0.5">
                Tanggal: <span class="font-bold text-slate-700">{{ formatFullDate(dailyModal.date) }}</span> • Total <span class="font-bold text-[#602515]">{{ dailyModal.items.length }} Pasien</span>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              @click="exportDailyExcel"
              :disabled="dailyModal.exporting || dailyModal.items.length === 0"
              class="px-3.5 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition flex items-center gap-2 text-xs font-medium shadow-sm disabled:opacity-50"
            >
              <Icon v-if="!dailyModal.exporting" icon="solar:file-download-bold" class="text-base" />
              <Icon v-else icon="solar:spinner-line-duotone" class="text-base animate-spin" />
              <span>Export Excel Hari Ini</span>
            </button>
            <button
              @click="dailyModal.show = false"
              class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 text-lg font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Filter Info & Search Bar -->
        <div class="px-5 py-2.5 bg-amber-50/40 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div class="flex items-center gap-2 text-slate-600">
            <span class="font-semibold text-slate-500">Filter Aktif:</span>
            <span class="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
              Kategori: {{ filters.patientType ? patientTypeLabel(filters.patientType) : 'Semua' }}
            </span>
            <span class="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
              Gender: {{ filters.gender ? (filters.gender === 'L' ? 'Ikhwan' : 'Akhwat') : 'Semua' }}
            </span>
          </div>
          <div class="relative w-full sm:w-64">
            <input
              v-model="dailyModal.search"
              type="text"
              placeholder="Cari nama, kelas, atau diagnosa..."
              class="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#602515] focus:border-[#602515]"
            />
            <Icon icon="solar:magnifer-linear" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
          </div>
        </div>

        <!-- Body Table -->
        <div class="flex-1 overflow-y-auto p-5 custom-scrollbar">
          <div v-if="dailyModal.loading" class="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
            <Icon icon="solar:spinner-line-duotone" class="text-3xl animate-spin text-[#602515]" />
            <p class="text-xs">Memuat data pemeriksaan pasien...</p>
          </div>

          <div v-else-if="filteredDailyItems.length === 0" class="text-center py-16 text-slate-400">
            <Icon icon="solar:clipboard-remove-linear" class="text-4xl mx-auto mb-2 text-slate-300" />
            <p class="text-sm font-medium">Tidak ada data pemeriksaan ditemukan</p>
          </div>

          <div v-else class="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table class="w-full text-left border-collapse text-xs">
              <thead class="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold sticky top-0 z-10">
                <tr>
                  <th class="py-3 px-3 w-10 text-center">No</th>
                  <th class="py-3 px-3">Pasien</th>
                  <th class="py-3 px-3">Kelas / Kamar / Halaqah</th>
                  <th class="py-3 px-3">Keluhan</th>
                  <th class="py-3 px-3">Diagnosa</th>
                  <th class="py-3 px-3">Penanganan & Obat</th>
                  <th class="py-3 px-3">Pemeriksa</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr
                  v-for="(item, idx) in filteredDailyItems"
                  :key="item.id || idx"
                  class="hover:bg-slate-50/80 transition"
                >
                  <td class="py-3 px-3 text-center font-medium text-slate-400">
                    {{ idx + 1 }}
                  </td>
                  <td class="py-3 px-3">
                    <div class="font-bold text-slate-800 text-sm">
                      {{ item.student?.fullName || item.patientName || item.studentId || "-" }}
                    </div>
                    <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span
                        class="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                        :class="item.patientType === 'student' ? 'bg-blue-50 text-blue-700 border border-blue-200' : (item.patientType === 'teacher' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-700 border border-slate-200')"
                      >
                        {{ item.patientType === 'student' ? 'Santri' : (item.patientType === 'teacher' ? 'Guru' : 'Umum') }}
                      </span>
                      <span v-if="item.patientGender || item.gender" class="text-[10px] text-slate-400">
                        {{ (item.patientGender || item.gender) === 'L' ? 'Ikhwan' : 'Akhwat' }}
                      </span>
                      <span v-if="item.hasSickLeave" class="px-1.5 py-0.2 rounded text-[9px] bg-rose-50 text-rose-700 font-semibold border border-rose-200">
                        Izin Sakit
                      </span>
                      <span v-if="item.isInpatient" class="px-1.5 py-0.2 rounded text-[9px] bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                        Rawat Inap
                      </span>
                    </div>
                  </td>
                  <td class="py-3 px-3 text-slate-600">
                    <div v-if="item.class" class="font-medium text-slate-800">
                      {{ item.class.name }}
                    </div>
                    <div v-if="item.room" class="text-[11px] text-slate-500">
                      Kamar: {{ item.room.name }}
                    </div>
                    <div v-if="item.halaqah" class="text-[11px] text-slate-400">
                      {{ item.halaqah.name }}
                    </div>
                    <span v-if="!item.class && !item.room && !item.halaqah" class="text-slate-400 italic">
                      -
                    </span>
                  </td>
                  <td class="py-3 px-3 text-slate-700 max-w-[200px]">
                    <div class="line-clamp-3">
                      {{ item.complaint || item.symptoms || "-" }}
                    </div>
                  </td>
                  <td class="py-3 px-3">
                    <span class="px-2 py-1 rounded bg-slate-100 text-slate-800 font-medium border border-slate-200 inline-block max-w-[180px] truncate" :title="item.diagnosis">
                      {{ item.diagnosis || "-" }}
                    </span>
                  </td>
                  <td class="py-3 px-3 text-slate-700 max-w-[220px]">
                    <div class="font-mono text-[11px] whitespace-pre-wrap line-clamp-3 text-slate-800">
                      {{ item.prescribedMedicinesText || formatMedicines(item) }}
                    </div>
                  </td>
                  <td class="py-3 px-3 text-slate-600">
                    <span class="font-medium">
                      {{ item.examinerName && item.examinerName !== '-' ? item.examinerName : '-' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs">
          <span class="text-slate-500">
            Menampilkan {{ filteredDailyItems.length }} dari {{ dailyModal.items.length }} pasien
          </span>
          <button
            @click="dailyModal.show = false"
            class="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-medium transition shadow-sm"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <StatusModal
    :isOpen="statusModal.open"
    :type="statusModal.status"
    :message="statusModal.message"
    :title="statusModal.title"
    @close="statusModal.open = false"
  />
</template>

<script setup>
import { ref, reactive, onMounted, computed } from "vue";
import { Icon } from "@iconify/vue";
import StatCard from "@/components/ui/StatCard.vue";
import StatusModal from "@/components/ui/StatusModal.vue";
import { clinicApi, settingsApi, request } from "@/services/api";
import ExcelJS from "exceljs/dist/exceljs.min.js";
import { saveAs } from "file-saver";

const loading = ref(false);
const exportingRange = ref(false);
const institutionName = ref("");

const filters = reactive({
  startDate: new Date(new Date().setDate(new Date().getDate() - 30))
    .toISOString()
    .split("T")[0],
  endDate: new Date().toISOString().split("T")[0],
  patientType: "", // "" | student | teacher | external
  gender: "", // "" | L | P
});

const statusModal = reactive({
  open: false,
  status: "success",
  title: "",
  message: "",
});

const reports = reactive({
  visits: [],
  diseases: [],
  patientTypes: [],
});

const dailyModal = reactive({
  show: false,
  date: "",
  count: 0,
  loading: false,
  exporting: false,
  search: "",
  items: [],
});

const totalVisits = computed(() =>
  reports.visits.reduce((acc, curr) => acc + Number(curr.count), 0),
);
const maxDiseaseCount = computed(() =>
  Math.max(...reports.diseases.map((d) => Number(d.count)), 1),
);
const topDisease = computed(() =>
  reports.diseases.length > 0 ? reports.diseases[0].name : "-",
);
const topPatientType = computed(() => {
  if (!reports.patientTypes.length) return "-";
  const sorted = [...reports.patientTypes].sort(
    (a, b) => Number(b.count) - Number(a.count),
  );
  const map = { student: "Santri", teacher: "Guru", external: "Umum" };
  return map[sorted[0].type] || sorted[0].type;
});

const patientDistribution = computed(() => {
  const total =
    reports.patientTypes.reduce((acc, curr) => acc + Number(curr.count), 0) ||
    1;
  const map = { student: "Santri", teacher: "Guru", external: "Umum" };
  const colors = {
    student: "text-blue-600",
    teacher: "text-amber-600",
    external: "text-slate-600",
  };

  const types = ["student", "teacher", "external"];
  return types.map((t) => {
    const found = reports.patientTypes.find((p) => p.type === t);
    const count = found ? Number(found.count) : 0;
    return {
      label: map[t],
      count: count,
      percent: Math.round((count / total) * 100),
      color: colors[t],
    };
  });
});

const filteredDailyItems = computed(() => {
  if (!dailyModal.search) return dailyModal.items;
  const q = dailyModal.search.toLowerCase().trim();
  return dailyModal.items.filter((item) => {
    const name = (item.student?.fullName || item.patientName || item.studentId || "").toLowerCase();
    const diagnosis = (item.diagnosis || "").toLowerCase();
    const complaint = (item.complaint || item.symptoms || "").toLowerCase();
    const className = (item.class?.name || "").toLowerCase();
    const roomName = (item.room?.name || "").toLowerCase();
    return (
      name.includes(q) ||
      diagnosis.includes(q) ||
      complaint.includes(q) ||
      className.includes(q) ||
      roomName.includes(q)
    );
  });
});

function patientTypeLabel(t) {
  if (t === "student") return "Santri";
  if (t === "teacher") return "Guru/Staf";
  if (t === "external") return "Umum";
  return "Semua";
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatFullDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatMedicines(item) {
  if (Array.isArray(item.consumedMedicines) && item.consumedMedicines.length > 0) {
    return item.consumedMedicines
      .map((m) => `${m.name} (${m.quantity} ${m.unit || "pcs"})`)
      .join(", ");
  }
  return item.treatment || "-";
}

async function fetchReports() {
  loading.value = true;
  try {
    const query = new URLSearchParams(filters).toString();
    const res = await request(`/api/clinic/reports/summary?${query}`);
    if (res.success) {
      reports.visits = res.data.visits || [];
      reports.diseases = res.data.diseases || [];
      reports.patientTypes = res.data.patientTypes || [];
    }
  } catch (e) {
    console.error(e);
    statusModal.status = "error";
    statusModal.title = "Gagal";
    statusModal.message = "Gagal memuat laporan";
    statusModal.open = true;
  } finally {
    loading.value = false;
  }
}

async function openDailyModal(date, count) {
  dailyModal.date = date;
  dailyModal.count = count;
  dailyModal.search = "";
  dailyModal.items = [];
  dailyModal.show = true;
  dailyModal.loading = true;

  try {
    const params = {
      date: date,
      patientType: filters.patientType || undefined,
      gender: filters.gender || undefined,
      limit: "all",
    };
    const res = await clinicApi.getExaminations(params);
    dailyModal.items = Array.isArray(res?.data) ? res.data : [];
  } catch (e) {
    console.error("Failed to load daily patients", e);
    dailyModal.items = [];
  } finally {
    dailyModal.loading = false;
  }
}

async function generateExcelFile(items, filenameSuffix, titlePeriod) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Data Pemeriksaan");
  sheet.views = [{ showGridLines: true }];

  // 1. Title Rows
  sheet.addRow([institutionName.value || "KLINIK PESANTREN"]);
  sheet.addRow(["LAPORAN REKAPITULASI PEMERIKSAAN KESEHATAN"]);
  sheet.addRow([`Periode: ${titlePeriod}`]);
  sheet.addRow([
    `Filter: Kategori (${patientTypeLabel(filters.patientType)}), Gender (${
      filters.gender ? (filters.gender === "L" ? "Ikhwan" : "Akhwat") : "Semua"
    })`,
  ]);
  sheet.addRow([`Total Data: ${items.length} Pasien`]);
  sheet.addRow([]); // Empty row

  // Style Title Header
  sheet.getCell("A1").font = { bold: true, size: 14, color: { argb: "602515" } };
  sheet.getCell("A2").font = { bold: true, size: 12 };
  sheet.getCell("A3").font = { italic: true, size: 10, color: { argb: "555555" } };
  sheet.getCell("A4").font = { italic: true, size: 10, color: { argb: "555555" } };
  sheet.getCell("A5").font = { bold: true, size: 10, color: { argb: "333333" } };

  // 2. Table Headers
  const headers = [
    "No",
    "Waktu / Tanggal",
    "Nama Pasien",
    "Kategori",
    "Kelas / Rombel",
    "Grup Halaqah",
    "Kamar Asrama",
    "Dokter / Pemeriksa",
    "Keluhan Utama",
    "Diagnosa",
    "Penanganan & Resep Obat",
  ];

  const headerRow = sheet.addRow(headers);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFF" }, size: 10 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "602515" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // 3. Data Rows
  items.forEach((item, index) => {
    const medText =
      item.prescribedMedicinesText ||
      (Array.isArray(item.consumedMedicines) && item.consumedMedicines.length > 0
        ? item.consumedMedicines
            .map((m) => `${m.name} (${m.quantity} ${m.unit || "pcs"})`)
            .join(", ")
        : item.treatment || "-");

    const dateStr = item.date
      ? new Date(item.date).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-";

    const typeStr =
      item.patientType === "student"
        ? "Santri"
        : item.patientType === "teacher"
        ? "Guru/Staf"
        : "Umum";

    const row = sheet.addRow([
      index + 1,
      dateStr,
      item.student?.fullName || item.patientName || item.studentId || "-",
      typeStr,
      item.class?.name || "-",
      item.halaqah?.name || "-",
      item.room?.name || "-",
      item.examinerName && item.examinerName !== "-" ? item.examinerName : "-",
      item.complaint || item.symptoms || "-",
      item.diagnosis || "-",
      medText,
    ]);

    row.height = 24;
    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: "thin", color: { argb: "E2E8F0" } },
        left: { style: "thin", color: { argb: "E2E8F0" } },
        bottom: { style: "thin", color: { argb: "E2E8F0" } },
        right: { style: "thin", color: { argb: "E2E8F0" } },
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: colNumber === 1 ? "center" : colNumber === 2 ? "center" : "left",
        wrapText: true,
      };
    });
  });

  // 4. Auto Column Widths
  sheet.columns = [
    { width: 6 },  // No
    { width: 18 }, // Tanggal & Waktu
    { width: 26 }, // Nama Pasien
    { width: 12 }, // Kategori
    { width: 16 }, // Kelas
    { width: 18 }, // Halaqah
    { width: 16 }, // Kamar
    { width: 22 }, // Pemeriksa
    { width: 30 }, // Keluhan
    { width: 26 }, // Diagnosa
    { width: 34 }, // Penanganan & Resep Obat
  ];

  const buf = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `Laporan_Pemeriksaan_Klinik_${filenameSuffix}.xlsx`);
}

async function exportRangeExcel() {
  exportingRange.value = true;
  try {
    const params = {
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      patientType: filters.patientType || undefined,
      gender: filters.gender || undefined,
      limit: "all",
    };

    const res = await clinicApi.getExaminations(params);
    const items = Array.isArray(res?.data) ? res.data : [];

    if (items.length === 0) {
      statusModal.status = "error";
      statusModal.title = "Tidak Ada Data";
      statusModal.message = "Tidak ada data pemeriksaan pada rentang tanggal dan filter ini.";
      statusModal.open = true;
      return;
    }

    const periodStr = `${filters.startDate || "Awal"} s.d ${filters.endDate || "Akhir"}`;
    const filenameSuffix = `${filters.startDate}_sd_${filters.endDate}`;
    await generateExcelFile(items, filenameSuffix, periodStr);

    statusModal.status = "success";
    statusModal.title = "Berhasil";
    statusModal.message = `Laporan ${items.length} data pemeriksaan berhasil diekspor ke Excel.`;
    statusModal.open = true;
  } catch (e) {
    console.error("Failed export range excel", e);
    statusModal.status = "error";
    statusModal.title = "Gagal Ekspor";
    statusModal.message = e.message || "Gagal mengunduh file Excel.";
    statusModal.open = true;
  } finally {
    exportingRange.value = false;
  }
}

async function exportDailyExcel() {
  dailyModal.exporting = true;
  try {
    const items = dailyModal.items;
    if (items.length === 0) return;

    const dateStr = dailyModal.date;
    const periodStr = formatFullDate(dateStr);
    const filenameSuffix = dateStr;
    await generateExcelFile(items, filenameSuffix, periodStr);
  } catch (e) {
    console.error("Failed daily export excel", e);
  } finally {
    dailyModal.exporting = false;
  }
}

async function loadInstitutionSettings() {
  try {
    const res = await settingsApi.getAll();
    if (res.success && res.data?.institution_name) {
      institutionName.value = res.data.institution_name;
    }
  } catch (e) {
    console.debug("Failed to load institution name", e);
  }
}

onMounted(() => {
  fetchReports();
  loadInstitutionSettings();
});
</script>

<style scoped>
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-in-up {
  animation: fadeInUp 0.25s ease-out;
}
</style>
