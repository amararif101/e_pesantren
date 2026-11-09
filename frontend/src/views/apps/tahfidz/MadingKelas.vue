<template>
  <div class="p-2 max-w-7xl mx-auto pb-12">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-slate-800">Mading Hafalan per Kelas</h1>
      <p class="text-slate-500">
        Capaian hafalan seluruh santri, dikelompokkan per kelas
      </p>
    </div>

    <!-- Filters -->
    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
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
        Hafalan periode dan target dihitung untuk rentang tanggal di atas
        (default bulan ini). Total hafalan dan posisi terakhir mencakup seluruh
        riwayat setoran Taqdim.
      </p>
    </div>

    <!-- Summary -->
    <div v-if="summary" class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard
        icon="solar:users-group-rounded-bold-duotone"
        color="indigo"
        label="Total Santri"
        :value="summary.totalStudents"
      />
      <StatCard
        icon="solar:check-circle-bold-duotone"
        color="emerald"
        label="Sesuai / Melebihi Target"
        :value="summary.achieved"
      />
      <StatCard
        icon="solar:danger-triangle-bold-duotone"
        color="amber"
        label="Di Bawah Target"
        :value="summary.below"
      />
      <StatCard
        icon="solar:book-2-bold-duotone"
        color="teal"
        label="Halaman Periode Ini"
        :value="summary.totalPeriodPages"
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
        class="flex items-center gap-2 text-sm text-slate-600 cursor-pointer"
      >
        <input
          type="checkbox"
          v-model="onlyBelow"
          class="accent-[#602515] w-4 h-4"
        />
        Hanya di bawah target
      </label>
      <button
        @click="exportToExcel"
        :disabled="!visibleClasses.length"
        class="flex items-center gap-2 px-4 py-2 bg-[#107c41] text-white rounded-lg hover:bg-[#0c5e31] transition-colors disabled:opacity-50"
      >
        <Icon icon="solar:file-download-bold" />
        Export Excel
      </button>
    </div>

    <div
      v-if="loading"
      class="h-64 flex items-center justify-center bg-white rounded-xl border border-slate-200"
    >
      <span class="text-slate-500 animate-pulse">Memuat data...</span>
    </div>

    <div
      v-else-if="!visibleClasses.length"
      class="h-48 flex items-center justify-center bg-white rounded-xl border border-slate-200 text-slate-400"
    >
      Tidak ada data yang sesuai.
    </div>

    <!-- One card per class -->
    <div v-else class="space-y-6">
      <div
        v-for="k in visibleClasses"
        :key="k.classId ?? 'none'"
        class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
      >
        <div
          class="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2"
        >
          <h2 class="font-bold text-slate-800">
            {{ k.className }}
            <span class="text-sm font-normal text-slate-400"
              >({{ k.students.length }} santri)</span
            >
          </h2>
          <span class="text-xs text-slate-500">
            {{ k.students.filter((s) => s.status === "DT").length }} di bawah
            target
          </span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="text-slate-600 border-b bg-white">
              <tr>
                <th class="p-3 w-12 text-center">No</th>
                <th class="p-3">Nama Santri</th>
                <th class="p-3">Halaqah</th>
                <th class="p-3 text-center">Hafalan Periode (hal)</th>
                <th class="p-3 text-center">Target</th>
                <th class="p-3 text-center">Ket</th>
                <th class="p-3 text-center">Total Hafalan (hal)</th>
                <th class="p-3 text-center">Juz</th>
                <th class="p-3">Posisi Terakhir</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="(s, i) in k.students"
                :key="s.studentId"
                class="hover:bg-slate-50"
              >
                <td class="p-3 text-center text-slate-400">{{ i + 1 }}</td>
                <td class="p-3">
                  <div class="font-medium text-slate-800">{{ s.fullName }}</div>
                  <div class="text-xs text-slate-400 font-mono">{{ s.nis }}</div>
                </td>
                <td class="p-3 text-slate-600">{{ s.halaqahName || "-" }}</td>
                <td class="p-3 text-center font-semibold">{{ s.periodPages }}</td>
                <td class="p-3 text-center text-slate-600">{{ s.targetPages }}</td>
                <td class="p-3 text-center">
                  <span
                    class="px-2 py-0.5 rounded text-xs font-medium"
                    :class="statusClass(s.status)"
                    >{{ s.status }}</span
                  >
                </td>
                <td class="p-3 text-center">{{ s.totalPages }}</td>
                <td class="p-3 text-center">{{ s.totalJuz }}</td>
                <td class="p-3 text-slate-600">{{ positionText(s.lastPosition) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="text-xs text-slate-500 px-1">
        <span class="px-1 bg-green-100 text-green-700 rounded">ST</span> Sesuai
        Target &nbsp;
        <span class="px-1 bg-yellow-100 text-yellow-700 rounded">DT</span> Di
        Bawah Target &nbsp;
        <span class="px-1 bg-blue-100 text-blue-700 rounded">MT</span> Melebihi
        Target &nbsp;|&nbsp; 1 juz dihitung 20 halaman.
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
import { tahfidzApi, academicApi, quranApi } from "@/services/api";

const loading = ref(false);
const classesList = ref([]);
const classGroups = ref([]);
const summary = ref(null);
const period = ref(null);
const surahNames = ref({});

const search = ref("");
const onlyBelow = ref(false);

function pad(n) {
  return String(n).padStart(2, "0");
}
function defaultStart() {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-01`;
}
function defaultEnd() {
  const n = new Date();
  const last = new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(last)}`;
}

const filters = reactive({
  classId: "",
  gender: "",
  startDate: defaultStart(),
  endDate: defaultEnd(),
});

const STATUS_CLASS = {
  ST: "bg-green-100 text-green-700",
  DT: "bg-yellow-100 text-yellow-700",
  MT: "bg-blue-100 text-blue-700",
};
function statusClass(s) {
  return STATUS_CLASS[s] || "bg-slate-100 text-slate-500";
}

function positionText(p) {
  if (!p) return "-";
  const parts = [];
  if (p.surah) {
    const name = surahNames.value[p.surah] || `Surah ${p.surah}`;
    parts.push(p.ayat ? `${name} ayat ${p.ayat}` : name);
  }
  const detail = [];
  if (p.juz) detail.push(`Juz ${p.juz}`);
  if (p.page) detail.push(`hal. ${p.page}`);
  if (!parts.length && !detail.length) return "-";
  return detail.length
    ? `${parts.join(" ")}${parts.length ? " " : ""}(${detail.join(", ")})`
    : parts.join(" ");
}

const visibleClasses = computed(() => {
  const q = search.value.trim().toLowerCase();
  return classGroups.value
    .map((k) => ({
      ...k,
      students: k.students.filter((s) => {
        if (q && !`${s.fullName} ${s.nis}`.toLowerCase().includes(q)) return false;
        if (onlyBelow.value && s.status !== "DT") return false;
        return true;
      }),
    }))
    .filter((k) => k.students.length);
});

let seq = 0;
async function load() {
  const mine = ++seq;
  loading.value = true;
  try {
    const params = {};
    for (const key of ["classId", "gender", "startDate", "endDate"]) {
      if (filters[key]) params[key] = filters[key];
    }
    const res = await tahfidzApi.getClassReport(params);
    if (mine !== seq) return;
    if (res.success) {
      classGroups.value = res.data.classes || [];
      summary.value = res.data.summary;
      period.value = res.data.period;
    } else {
      classGroups.value = [];
      summary.value = null;
    }
  } catch (e) {
    if (mine !== seq) return;
    console.error("Failed to load class report:", e);
    classGroups.value = [];
    summary.value = null;
  } finally {
    if (mine === seq) loading.value = false;
  }
}

async function loadLookups() {
  try {
    const res = await academicApi.getClasses();
    if (res.data) classesList.value = res.data;
  } catch (e) {
    console.error("Failed to load classes:", e);
  }
  // Surah names are only for display; positions fall back to "Surah N"
  try {
    const res = await quranApi.getSurahs();
    if (res.success) {
      surahNames.value = Object.fromEntries(
        (res.data || []).map((s) => [s.sora, s.sora_name_en]),
      );
    }
  } catch (e) {
    console.error("Failed to load surah names:", e);
  }
}

async function exportToExcel() {
  if (!visibleClasses.value.length) return;
  const workbook = new ExcelJS.Workbook();
  const headers = [
    "No",
    "NIS",
    "Nama Santri",
    "Kelas",
    "Halaqah",
    "Hafalan Periode (hal)",
    "Target (hal)",
    "Ket",
    "Total Hafalan (hal)",
    "Juz",
    "Posisi Terakhir",
  ];

  const styleSheet = (ws) => {
    const header = ws.getRow(ws.rowCount);
    header.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    });
    ws.columns.forEach((col, idx) => {
      col.width = [6, 14, 30, 18, 20, 16, 12, 8, 16, 8, 38][idx];
    });
  };

  const rowOf = (k, s, i) => [
    i + 1,
    s.nis,
    s.fullName,
    k.className,
    s.halaqahName || "-",
    s.periodPages,
    s.targetPages,
    s.status,
    s.totalPages,
    s.totalJuz,
    positionText(s.lastPosition),
  ];

  const periodText = `${filters.startDate} s.d. ${filters.endDate}`;

  // Sheet 1: every santri, all classes
  const all = workbook.addWorksheet("Rekap Seluruh Santri");
  all.addRow(["REKAP HAFALAN SELURUH SANTRI"]).font = { bold: true, size: 14 };
  all.addRow(["Periode", `: ${periodText}`]);
  all.addRow([]);
  all.addRow(headers);
  styleSheet(all);
  let n = 0;
  visibleClasses.value.forEach((k) =>
    k.students.forEach((s) => all.addRow(rowOf(k, s, n++))),
  );

  // One sheet per class
  const usedNames = new Set(["Rekap Seluruh Santri"]);
  visibleClasses.value.forEach((k) => {
    let name = k.className.replace(/[\\/?*[\]:]/g, "-").slice(0, 28) || "Kelas";
    let candidate = name;
    let c = 2;
    while (usedNames.has(candidate)) candidate = `${name} (${c++})`;
    usedNames.add(candidate);

    const ws = workbook.addWorksheet(candidate);
    ws.addRow([`MADING HAFALAN - ${k.className}`]).font = { bold: true, size: 14 };
    ws.addRow(["Periode", `: ${periodText}`]);
    ws.addRow([]);
    ws.addRow(headers);
    styleSheet(ws);
    k.students.forEach((s, i) => ws.addRow(rowOf(k, s, i)));
  });

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer]),
    `Mading_Hafalan_Kelas_${new Date().toISOString().split("T")[0]}.xlsx`,
  );
}

watch(
  () => [filters.classId, filters.gender, filters.startDate, filters.endDate],
  () => load(),
);

onMounted(() => {
  loadLookups();
  load();
});
</script>
