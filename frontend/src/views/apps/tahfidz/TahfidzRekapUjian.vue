<template>
  <div class="p-2 max-w-7xl mx-auto pb-12">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-slate-800">Rekap Ujian</h1>
      <p class="text-slate-500">
        Rekapan nilai UKJ, UPK, dan Ujian Akhir seluruh santri
      </p>
    </div>

    <!-- Category Tabs -->
    <div class="mb-4 flex gap-2 overflow-x-auto">
      <button
        v-for="t in tabs"
        :key="t.value"
        @click="selectTab(t.value)"
        class="px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap border transition-colors"
        :class="
          category === t.value
            ? 'bg-[#602515] text-white border-[#602515]'
            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
        "
      >
        {{ t.label }}
      </button>
    </div>

    <!-- Filters -->
    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1"
            >Grup Kelas</label
          >
          <select
            v-model="filters.classId"
            class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none"
          >
            <option value="">Semua Kelas</option>
            <option v-for="c in classesList" :key="c.id" :value="c.id">
              {{ c.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1"
            >Grup Halaqah</label
          >
          <select
            v-model="filters.halaqahId"
            class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none"
          >
            <option value="">Semua Halaqah</option>
            <option v-for="h in halaqahList" :key="h.id" :value="h.id">
              {{ h.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1"
            >Gender</label
          >
          <select
            v-model="filters.gender"
            class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none"
          >
            <option value="">Semua</option>
            <option value="male">Ikhwan</option>
            <option value="female">Akhwat</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1"
            >Tanggal Mulai</label
          >
          <input
            type="date"
            v-model="filters.startDate"
            class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1"
            >Tanggal Akhir</label
          >
          <input
            type="date"
            v-model="filters.endDate"
            class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none"
          />
        </div>
      </div>
      <p class="mt-3 text-xs text-slate-400">
        Kosongkan tanggal untuk menampilkan seluruh riwayat ujian.
      </p>
    </div>

    <!-- Summary -->
    <div
      v-if="summary"
      class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6"
    >
      <StatCard
        icon="solar:users-group-rounded-bold-duotone"
        color="indigo"
        label="Total Santri"
        :value="summary.totalStudents"
      />
      <StatCard
        icon="solar:check-circle-bold-duotone"
        color="emerald"
        label="Sudah Diuji"
        :value="summary.examinedStudents"
      />
      <StatCard
        icon="solar:clock-circle-bold-duotone"
        color="amber"
        label="Belum Diuji"
        :value="summary.notExaminedStudents"
      />
      <StatCard
        icon="solar:chart-2-bold-duotone"
        color="sky"
        label="Rata-rata Nilai"
        :value="summary.avgScore ?? '-'"
      />
      <StatCard
        v-if="hasTarget"
        icon="solar:danger-triangle-bold-duotone"
        color="rose"
        label="Di Bawah Target"
        :value="summary.belowTargetStudents"
      />
      <StatCard
        v-else
        icon="solar:document-text-bold-duotone"
        color="violet"
        label="Total Ujian"
        :value="summary.totalExams"
      />
    </div>

    <!-- Toolbar -->
    <div
      class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4 flex flex-wrap items-center gap-3"
    >
      <input
        v-model="search"
        type="text"
        placeholder="Cari nama / NIS..."
        class="flex-1 min-w-[180px] px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none"
      />
      <label
        v-if="hasTarget"
        class="flex items-center gap-2 text-sm text-slate-600 cursor-pointer"
      >
        <input
          type="checkbox"
          v-model="onlyBelowTarget"
          class="accent-[#602515] w-4 h-4"
        />
        Hanya di bawah target
      </label>
      <label
        class="flex items-center gap-2 text-sm text-slate-600 cursor-pointer"
      >
        <input
          type="checkbox"
          v-model="onlyNotExamined"
          class="accent-[#602515] w-4 h-4"
        />
        Hanya yang belum diuji
      </label>
      <button
        @click="exportToExcel"
        :disabled="!filteredRows.length"
        class="flex items-center gap-2 px-4 py-2 bg-[#107c41] text-white rounded-lg hover:bg-[#0c5e31] transition-colors disabled:opacity-50"
      >
        <Icon icon="solar:file-download-bold" />
        Export Excel
      </button>
    </div>

    <!-- Loading -->
    <div
      v-if="loading"
      class="h-64 flex items-center justify-center bg-white rounded-xl border border-slate-200"
    >
      <span class="text-slate-500 animate-pulse">Memuat data...</span>
    </div>

    <!-- Empty -->
    <div
      v-else-if="!filteredRows.length"
      class="h-48 flex items-center justify-center bg-white rounded-xl border border-slate-200 text-slate-400"
    >
      Tidak ada data yang sesuai.
    </div>

    <!-- Table -->
    <div
      v-else
      class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
    >
      <div class="overflow-x-auto max-h-[70vh]">
        <table class="w-full text-sm text-left">
          <thead class="bg-slate-50 text-slate-600 sticky top-0 z-10">
            <tr>
              <th class="p-3 w-12 text-center">No</th>
              <th class="p-3">Nama Santri</th>
              <th class="p-3">Kelas</th>
              <th class="p-3">Halaqah</th>
              <template v-if="category === 'UKJ'">
                <th class="p-3">Juz yang Sudah UKJ</th>
                <th class="p-3 text-center">Jumlah Juz</th>
                <th class="p-3 text-center">UKJ Terakhir</th>
              </template>
              <template v-else>
                <th v-if="category === 'UPK'" class="p-3 text-center">
                  Jumlah Ujian
                </th>
                <th v-if="category === 'UPK'" class="p-3 text-center">
                  Total Nilai
                </th>
                <th class="p-3 text-center">
                  {{ category === "UPK" ? "Rata-rata" : "Nilai" }}
                </th>
                <th class="p-3 text-center">Terakhir</th>
                <th class="p-3 text-center">Capaian Target</th>
                <th class="p-3 text-center">Status</th>
              </template>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="(r, i) in filteredRows"
              :key="r.studentId"
              class="hover:bg-slate-50"
              :class="{ 'bg-rose-50/40': r.belowTarget }"
            >
              <td class="p-3 text-center text-slate-400">{{ i + 1 }}</td>
              <td class="p-3">
                <div class="font-medium text-slate-800">{{ r.fullName }}</div>
                <div class="text-xs text-slate-400 font-mono">{{ r.nis }}</div>
              </td>
              <td class="p-3 text-slate-600">{{ r.className || "-" }}</td>
              <td class="p-3 text-slate-600">{{ r.halaqahName || "-" }}</td>

              <template v-if="category === 'UKJ'">
                <td class="p-3">
                  <div v-if="r.juzList?.length" class="flex flex-wrap gap-1">
                    <span
                      v-for="j in r.juzList"
                      :key="j.juz"
                      class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium"
                      :title="formatDate(j.date)"
                    >
                      Juz {{ j.juz }} · {{ j.score }}
                    </span>
                  </div>
                  <span v-else class="text-slate-300">-</span>
                </td>
                <td class="p-3 text-center font-semibold">
                  {{ r.juzList?.length || 0 }}
                </td>
                <td class="p-3 text-center text-slate-600">
                  {{ formatDate(r.lastDate) }}
                </td>
              </template>

              <template v-else>
                <td v-if="category === 'UPK'" class="p-3 text-center">
                  {{ r.examCount }}
                </td>
                <td v-if="category === 'UPK'" class="p-3 text-center">
                  {{ r.examCount ? r.totalScore : "-" }}
                </td>
                <td class="p-3 text-center font-semibold">
                  {{ r.avgScore ?? "-" }}
                </td>
                <td class="p-3 text-center text-slate-600">
                  <div v-if="r.examCount">
                    {{ r.lastScore }}
                    <div class="text-xs text-slate-400">
                      {{ formatDate(r.lastDate) }}
                    </div>
                  </div>
                  <span v-else class="text-slate-300">-</span>
                </td>
                <td class="p-3 text-center text-slate-600">
                  <template v-if="r.lastCapaianScore != null">
                    {{ r.lastCapaianPages ?? 0 }} hal
                    <div class="text-xs text-slate-400">
                      {{ r.lastCapaianScore }} / {{ capaianMax }}
                    </div>
                  </template>
                  <span v-else class="text-slate-300">-</span>
                </td>
                <td class="p-3 text-center">
                  <span
                    class="px-2 py-1 rounded-full text-xs font-medium"
                    :class="statusOf(r).class"
                    >{{ statusOf(r).label }}</span
                  >
                </td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="px-4 py-2 text-xs text-slate-400 border-t border-slate-100">
        Menampilkan {{ filteredRows.length }} dari {{ rows.length }} santri
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from "vue";
import { Icon } from "@iconify/vue";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import StatCard from "@/components/ui/StatCard.vue";
import { tahfidzApi, halaqahApi, academicApi } from "@/services/api";

const tabs = [
  { value: "UKJ", label: "UKJ" },
  { value: "UPK", label: "UPK" },
  { value: "UA", label: "Ujian Akhir" },
];

const category = ref("UKJ");
const loading = ref(false);
const rows = ref([]);
const summary = ref(null);
const halaqahList = ref([]);
const classesList = ref([]);

const search = ref("");
const onlyBelowTarget = ref(false);
const onlyNotExamined = ref(false);

const filters = reactive({
  classId: "",
  halaqahId: "",
  gender: "",
  startDate: "",
  endDate: "",
});

const hasTarget = computed(() => category.value !== "UKJ");
const capaianMax = computed(() => (category.value === "UPK" ? 30 : 10));
const categoryLabel = computed(
  () => tabs.find((t) => t.value === category.value)?.label || "",
);

function pad(n) {
  return String(n).padStart(2, "0");
}

// UPK is a periodic exam, so default to the current month; UKJ and Ujian
// Akhir default to the full history.
function applyDefaultDates() {
  if (category.value === "UPK") {
    const now = new Date();
    const y = now.getFullYear();
    const m = pad(now.getMonth() + 1);
    const last = new Date(y, now.getMonth() + 1, 0).getDate();
    filters.startDate = `${y}-${m}-01`;
    filters.endDate = `${y}-${m}-${pad(last)}`;
  } else {
    filters.startDate = "";
    filters.endDate = "";
  }
}

function selectTab(value) {
  if (category.value === value) return;
  category.value = value;
  onlyBelowTarget.value = false;
  const before = `${filters.startDate}|${filters.endDate}`;
  applyDefaultDates();
  // The filter watcher reloads when the dates change; otherwise reload here.
  if (before === `${filters.startDate}|${filters.endDate}`) load();
}

function formatDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusOf(r) {
  if (!r.examCount)
    return { label: "Belum diuji", class: "bg-slate-100 text-slate-500" };
  if (r.belowTarget)
    return { label: "Di bawah target", class: "bg-rose-100 text-rose-700" };
  if (r.lastCapaianScore == null)
    return { label: "-", class: "bg-slate-100 text-slate-500" };
  return { label: "Mencapai target", class: "bg-emerald-100 text-emerald-700" };
}

const filteredRows = computed(() => {
  const q = search.value.trim().toLowerCase();
  return rows.value.filter((r) => {
    if (q && !`${r.fullName} ${r.nis}`.toLowerCase().includes(q)) return false;
    if (onlyBelowTarget.value && !r.belowTarget) return false;
    if (onlyNotExamined.value && r.examCount > 0) return false;
    return true;
  });
});

let loadSeq = 0;
async function load() {
  const seq = ++loadSeq;
  loading.value = true;
  try {
    const params = { category: category.value };
    for (const key of ["classId", "halaqahId", "gender", "startDate", "endDate"]) {
      if (filters[key]) params[key] = filters[key];
    }
    const res = await tahfidzApi.getExamRecap(params);
    if (seq !== loadSeq) return; // a newer request superseded this one
    if (res.success) {
      rows.value = res.data.rows || [];
      summary.value = res.data.summary;
    } else {
      rows.value = [];
      summary.value = null;
    }
  } catch (e) {
    if (seq !== loadSeq) return;
    console.error("Failed to load exam recap:", e);
    rows.value = [];
    summary.value = null;
  } finally {
    if (seq === loadSeq) loading.value = false;
  }
}

async function exportToExcel() {
  const list = filteredRows.value;
  if (!list.length) return;

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet(`Rekap ${categoryLabel.value}`);

  const periode =
    filters.startDate || filters.endDate
      ? `${filters.startDate || "-"} s.d. ${filters.endDate || "-"}`
      : "Seluruh riwayat";
  ws.addRow([`REKAP UJIAN ${categoryLabel.value.toUpperCase()}`]).font = {
    bold: true,
    size: 14,
  };
  ws.addRow(["Periode", `: ${periode}`]);
  ws.addRow([]);

  let headers;
  let toRow;
  if (category.value === "UKJ") {
    headers = ["No", "NIS", "Nama Santri", "Kelas", "Halaqah", "Juz yang Sudah UKJ", "Jumlah Juz", "UKJ Terakhir"];
    toRow = (r, i) => [
      i + 1,
      r.nis,
      r.fullName,
      r.className || "-",
      r.halaqahName || "-",
      (r.juzList || []).map((j) => `Juz ${j.juz} (${j.score})`).join(", ") || "-",
      r.juzList?.length || 0,
      formatDate(r.lastDate),
    ];
  } else if (category.value === "UPK") {
    headers = ["No", "NIS", "Nama Santri", "Kelas", "Halaqah", "Jumlah Ujian", "Total Nilai", "Rata-rata", "Nilai Terakhir", "Capaian Terakhir (hal)", "Status"];
    toRow = (r, i) => [
      i + 1,
      r.nis,
      r.fullName,
      r.className || "-",
      r.halaqahName || "-",
      r.examCount,
      r.examCount ? r.totalScore : "-",
      r.avgScore ?? "-",
      r.lastScore ?? "-",
      r.lastCapaianScore != null ? `${r.lastCapaianPages ?? 0} (${r.lastCapaianScore}/30)` : "-",
      statusOf(r).label,
    ];
  } else {
    headers = ["No", "NIS", "Nama Santri", "Kelas", "Halaqah", "Nilai UA", "Capaian Terakhir (hal)", "Status"];
    toRow = (r, i) => [
      i + 1,
      r.nis,
      r.fullName,
      r.className || "-",
      r.halaqahName || "-",
      r.lastScore ?? "-",
      r.lastCapaianScore != null ? `${r.lastCapaianPages ?? 0} (${r.lastCapaianScore}/10)` : "-",
      statusOf(r).label,
    ];
  }

  const headerRow = ws.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  });

  list.forEach((r, i) => {
    const row = ws.addRow(toRow(r, i));
    row.eachCell((cell, col) => {
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      cell.alignment = { vertical: "middle", horizontal: col === 3 || col === 6 && category.value === "UKJ" ? "left" : "center", wrapText: true };
    });
    if (r.belowTarget) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
      });
    }
  });

  ws.columns.forEach((col, idx) => {
    col.width = idx === 0 ? 6 : idx === 2 ? 30 : idx === 5 && category.value === "UKJ" ? 40 : 16;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const dateStr = new Date().toISOString().split("T")[0];
  saveAs(new Blob([buffer]), `Rekap_${category.value}_${dateStr}.xlsx`);
}

async function loadLookups() {
  try {
    const [h, c] = await Promise.all([
      halaqahApi.getAll(),
      academicApi.getClasses(),
    ]);
    if (h.success) halaqahList.value = h.data || [];
    if (c.data) classesList.value = c.data;
  } catch (e) {
    console.error("Failed to load filter options:", e);
  }
}

watch(
  () => [
    filters.classId,
    filters.halaqahId,
    filters.gender,
    filters.startDate,
    filters.endDate,
  ],
  () => load(),
);

onMounted(() => {
  applyDefaultDates();
  loadLookups();
  load();
});
</script>
