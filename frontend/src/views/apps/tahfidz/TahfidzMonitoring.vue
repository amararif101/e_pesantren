<template>
  <div class="max-w-7xl mx-auto pb-12 flex flex-col gap-6">
    <!-- Header -->
    <div
      class="p-2 flex flex-col md:flex-row md:items-center justify-between gap-4"
    >
      <div>
        <h1 class="text-2xl font-bold text-slate-800">
          Dashboard Monitoring Tahfidz
        </h1>
        <p class="text-slate-500">
          Ringkasan kehadiran, setoran, dan capaian hafalan santri
        </p>
      </div>
      <div class="flex items-center gap-2">
        <input
          type="date"
          v-model="selectedDate"
          @change="loadDashboard"
          class="px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none text-sm"
        />
        <button
          @click="exportToExcel"
          :disabled="!data"
          class="flex items-center gap-2 px-4 py-2 bg-[#107c41] text-white rounded-lg hover:bg-[#0c5e31] transition-colors text-sm disabled:opacity-50"
        >
          <Icon icon="solar:file-download-bold" />
          Export
        </button>
      </div>
    </div>

    <div v-if="loading" class="p-2 text-center text-slate-400 py-12">
      Memuat data monitoring...
    </div>

    <template v-else-if="data">
      <!-- KPI Row -->
      <div class="p-2 grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          icon="solar:users-group-rounded-bold"
          color="indigo"
          label="Santri Aktif"
          :value="data.dailySubmission.summary.totalActiveStudents"
        />
        <StatCard
          icon="solar:user-check-line-duotone"
          color="emerald"
          label="Mentor Hadir"
          :value="`${data.mentorAttendance.summary.present + data.mentorAttendance.summary.late}/${data.mentorAttendance.total}`"
        />
        <StatCard
          icon="solar:health-line-duotone"
          color="rose"
          label="Sakit Hari Ini"
          :value="data.studentHealth.sakit.count"
        />
        <StatCard
          icon="solar:calendar-bold"
          color="amber"
          label="Izin Hari Ini"
          :value="data.studentHealth.izin.count"
        />
        <StatCard
          icon="solar:danger-triangle-line-duotone"
          color="orange"
          label="Terblokir UKJ"
          :value="data.ukjBlocked.count"
        />
      </div>

      <!-- Belum Setor -->
      <div class="p-2">
        <h2 class="text-lg font-bold text-slate-800 mb-3">
          Belum Setor Hari Ini
          <span class="text-sm font-normal text-slate-400">
            (di luar santri sakit/izin/alpha, {{ data.dailySubmission.summary.excusedCount }} santri dikecualikan)
          </span>
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            icon="solar:book-bookmark-bold-duotone"
            color="sky"
            label="Belum Setor Taqdim (Baru)"
            :value="data.dailySubmission.summary.ziyadahMissing"
          />
          <StatCard
            icon="solar:refresh-bold-duotone"
            color="violet"
            label="Belum Setor Sabqi"
            :value="data.dailySubmission.summary.sabqiMissing"
          />
          <StatCard
            icon="solar:restart-bold-duotone"
            color="fuchsia"
            label="Belum Setor Manzil"
            :value="data.dailySubmission.summary.manzilMissing"
          />
        </div>
      </div>

      <!-- Achievement -->
      <div class="p-2">
        <h2 class="text-lg font-bold text-slate-800 mb-3">
          Pencapaian Hafalan Bulan Ini
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <StatCard
            icon="solar:book-2-bold-duotone"
            color="teal"
            label="Total Halaman Dihafal (Taqdim)"
            :value="data.achievement.totalPagesThisMonth"
          />
          <StatCard
            icon="solar:graph-up-bold-duotone"
            color="lime"
            label="Rata-rata Capaian vs Target"
            :value="`${data.achievement.averagePercentage}%`"
          />
        </div>
        <div
          class="bg-white p-6 rounded-xl border border-slate-100 shadow-sm"
        >
          <h3 class="text-md font-semibold text-slate-800 mb-4">
            Capaian per Grup Halaqah (%)
          </h3>
          <div class="h-72">
            <BarChart
              :labels="data.achievement.perHalaqah.map((h) => h.halaqahName)"
              :datasets="[
                {
                  label: 'Capaian vs Target (%)',
                  backgroundColor: '#602515',
                  data: data.achievement.perHalaqah.map((h) => h.percentage),
                },
              ]"
            />
          </div>
        </div>
      </div>

      <!-- Mentor Attendance & Health -->
      <div class="p-2 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div
          class="bg-white p-6 rounded-xl border border-slate-100 shadow-sm"
        >
          <h3 class="text-md font-semibold text-slate-800 mb-4">
            Kehadiran Mentor Halaqoh (Bulan Ini)
          </h3>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-slate-500 border-b">
                  <th class="py-2 pr-2">Halaqah</th>
                  <th class="py-2 pr-2">Mentor</th>
                  <th class="py-2 pr-2 text-center">Hadir</th>
                  <th class="py-2 pr-2 text-center">Telat</th>
                  <th class="py-2 text-center">Tidak Hadir</th>
                </tr>
              </thead>
              <tbody>
                <template
                  v-for="h in data.mentorAttendance.monthlyPerHalaqah"
                  :key="h.halaqahId"
                >
                  <tr
                    v-for="(m, idx) in h.mentors"
                    :key="m.teacherId"
                    class="border-b border-slate-50"
                  >
                    <td class="py-2 pr-2 text-slate-700">
                      {{ idx === 0 ? h.halaqahName : "" }}
                    </td>
                    <td class="py-2 pr-2 text-slate-700">
                      {{ m.fullName }}
                    </td>
                    <td class="py-2 pr-2 text-center text-emerald-600 font-medium">
                      {{ m.present }}
                    </td>
                    <td class="py-2 pr-2 text-center text-amber-600 font-medium">
                      {{ m.late }}
                    </td>
                    <td class="py-2 text-center text-rose-600 font-medium">
                      {{ m.absent }}
                    </td>
                  </tr>
                  <tr v-if="!h.mentors.length">
                    <td class="py-2 pr-2 text-slate-700">{{ h.halaqahName }}</td>
                    <td class="py-2 pr-2 text-slate-400" colspan="4">
                      Belum ada pengampu
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>

        <div
          class="bg-white p-6 rounded-xl border border-slate-100 shadow-sm"
        >
          <h3 class="text-md font-semibold text-slate-800 mb-4">
            Santri Sakit & Izin (Bulan Ini)
          </h3>
          <div v-if="!data.studentHealth.sakit.monthList.length && !data.studentHealth.izin.monthList.length" class="text-slate-400 text-sm py-6 text-center">
            Tidak ada santri sakit/izin bulan ini.
          </div>
          <div v-else class="space-y-1 max-h-72 overflow-y-auto">
            <div
              v-for="(s, i) in data.studentHealth.sakit.monthList"
              :key="'sakit-' + s.studentId + '-' + i"
              class="flex items-center justify-between py-2 border-b border-slate-50 text-sm"
            >
              <span class="text-slate-700">{{ s.fullName }}</span>
              <span class="text-slate-400">{{ s.halaqahName }}</span>
              <span class="text-slate-400">{{ s.date }}</span>
              <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-600">Sakit</span>
            </div>
            <div
              v-for="(s, i) in data.studentHealth.izin.monthList"
              :key="'izin-' + s.studentId + '-' + i"
              class="flex items-center justify-between py-2 border-b border-slate-50 text-sm"
            >
              <span class="text-slate-700">{{ s.fullName }}</span>
              <span class="text-slate-400">{{ s.halaqahName }}</span>
              <span class="text-slate-400">{{ s.date }}</span>
              <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600">Izin</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Trend Chart -->
      <div class="p-2">
        <div
          class="bg-white p-6 rounded-xl border border-slate-100 shadow-sm"
        >
          <h3 class="text-md font-semibold text-slate-800 mb-4">
            Tren Setoran 30 Hari Terakhir
          </h3>
          <div class="h-64">
            <LineChart
              :labels="data.weeklyTrend.map((t) => formatShortDate(t.date))"
              :datasets="[
                {
                  label: 'Jumlah Setoran',
                  borderColor: '#602515',
                  backgroundColor: 'rgba(96, 37, 21, 0.1)',
                  data: data.weeklyTrend.map((t) => t.count),
                  tension: 0.3,
                  fill: true,
                },
              ]"
            />
          </div>
        </div>
      </div>

      <!-- Leaderboard & At Risk -->
      <div class="p-2 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div
          class="bg-white p-6 rounded-xl border border-slate-100 shadow-sm"
        >
          <h3 class="text-md font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Icon icon="solar:cup-line-duotone" class="text-xl text-amber-500" />
            Leaderboard Santri Bulan Ini
          </h3>
          <div v-if="!data.leaderboard.length" class="text-slate-400 text-sm py-6 text-center">
            Belum ada data setoran bulan ini.
          </div>
          <div v-else class="space-y-1">
            <div
              v-for="(s, idx) in data.leaderboard"
              :key="s.studentId"
              class="flex items-center justify-between py-2 border-b border-slate-50 text-sm"
            >
              <div class="flex items-center gap-3">
                <span
                  class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  :class="idx < 3 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'"
                  >{{ idx + 1 }}</span
                >
                <div>
                  <div class="text-slate-700 font-medium">{{ s.fullName }}</div>
                  <div class="text-slate-400 text-xs">{{ s.halaqahName }}</div>
                </div>
              </div>
              <span class="font-semibold text-slate-800">{{ s.totalPages }} Hal</span>
            </div>
          </div>
        </div>

        <div
          class="bg-white p-6 rounded-xl border border-slate-100 shadow-sm"
        >
          <h3 class="text-md font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Icon icon="solar:danger-triangle-line-duotone" class="text-xl text-orange-500" />
            Santri Berisiko (Belum Setor ≥3 Hari)
          </h3>
          <div v-if="!data.atRisk.length" class="text-slate-400 text-sm py-6 text-center">
            Tidak ada santri berisiko saat ini.
          </div>
          <div v-else class="space-y-1 max-h-72 overflow-y-auto">
            <div
              v-for="s in data.atRisk"
              :key="s.studentId"
              class="flex items-center justify-between py-2 border-b border-slate-50 text-sm"
            >
              <div>
                <div class="text-slate-700 font-medium">{{ s.fullName }}</div>
                <div class="text-slate-400 text-xs">{{ s.halaqahName }}</div>
              </div>
              <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-600">
                {{ s.daysSinceLastSubmission === null ? "Belum pernah setor" : `${s.daysSinceLastSubmission} hari` }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Halaqah Summary Table -->
      <div class="p-2">
        <div
          class="bg-white p-6 rounded-xl border border-slate-100 shadow-sm overflow-x-auto"
        >
          <h3 class="text-md font-semibold text-slate-800 mb-4">
            Ringkasan Semua Grup Halaqah
          </h3>
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-slate-500 border-b">
                <th class="py-2 pr-2">Halaqah</th>
                <th class="py-2 pr-2">Mentor</th>
                <th class="py-2 pr-2 text-center">Santri</th>
                <th class="py-2 pr-2 text-center">Setor Hari Ini</th>
                <th class="py-2 pr-2 text-center">Capaian</th>
                <th class="py-2 text-center">Belum Setor (Z/S/M)</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="h in data.halaqahSummary"
                :key="h.halaqahId"
                class="border-b border-slate-50"
              >
                <td class="py-2 pr-2 text-slate-700 font-medium">{{ h.halaqahName }}</td>
                <td class="py-2 pr-2 text-slate-600">{{ h.mentorName }}</td>
                <td class="py-2 pr-2 text-center text-slate-600">{{ h.totalStudents }}</td>
                <td class="py-2 pr-2 text-center text-slate-600">{{ h.presentToday }}/{{ h.totalStudents }}</td>
                <td class="py-2 pr-2 text-center text-slate-600">{{ h.achievementPercentage }}%</td>
                <td class="py-2 text-center text-slate-600">
                  {{ h.ziyadahMissing }}/{{ h.sabqiMissing }}/{{ h.manzilMissing }}
                </td>
              </tr>
              <tr v-if="!data.halaqahSummary.length">
                <td colspan="6" class="py-6 text-center text-slate-400">
                  Belum ada grup halaqah aktif.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { Icon } from "@iconify/vue";
import { tahfidzApi } from "@/services/api";
import BarChart from "@/components/charts/BarChart.vue";
import LineChart from "@/components/charts/LineChart.vue";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import StatCard from "@/components/ui/StatCard.vue";

const loading = ref(false);
const data = ref(null);
const selectedDate = ref(new Date().toISOString().split("T")[0]);

function formatShortDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function styleHeaderRow(row) {
  row.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F5F9" },
    };
  });
}

async function exportToExcel() {
  if (!data.value) return;
  const d = data.value;
  const workbook = new ExcelJS.Workbook();

  // --- Ringkasan ---
  const summarySheet = workbook.addWorksheet("Ringkasan");
  summarySheet.columns = [{ width: 30 }, { width: 20 }];
  summarySheet.addRows([
    ["Tanggal", d.date],
    ["Santri Aktif", d.dailySubmission.summary.totalActiveStudents],
    [
      "Mentor Hadir",
      `${d.mentorAttendance.summary.present + d.mentorAttendance.summary.late}/${d.mentorAttendance.total}`,
    ],
    ["Sakit Hari Ini", d.studentHealth.sakit.count],
    ["Izin Hari Ini", d.studentHealth.izin.count],
    ["Terblokir UKJ", d.ukjBlocked.count],
    ["Belum Setor Taqdim (Baru)", d.dailySubmission.summary.ziyadahMissing],
    ["Belum Setor Sabqi", d.dailySubmission.summary.sabqiMissing],
    ["Belum Setor Manzil", d.dailySubmission.summary.manzilMissing],
    ["Total Halaman Dihafal Bulan Ini (Taqdim)", d.achievement.totalPagesThisMonth],
    ["Rata-rata Capaian vs Target", `${d.achievement.averagePercentage}%`],
  ]);

  // --- Ringkasan Halaqah ---
  const halaqahSheet = workbook.addWorksheet("Ringkasan Halaqah");
  halaqahSheet.columns = [
    { header: "Halaqah", key: "halaqahName", width: 20 },
    { header: "Mentor", key: "mentorName", width: 20 },
    { header: "Santri", key: "totalStudents", width: 10 },
    { header: "Setor Hari Ini", key: "presentToday", width: 14 },
    { header: "Capaian (%)", key: "achievementPercentage", width: 12 },
    { header: "Belum Ziyadah", key: "ziyadahMissing", width: 14 },
    { header: "Belum Sabqi", key: "sabqiMissing", width: 12 },
    { header: "Belum Manzil", key: "manzilMissing", width: 12 },
  ];
  styleHeaderRow(halaqahSheet.getRow(1));
  d.halaqahSummary.forEach((h) => halaqahSheet.addRow(h));

  // --- Kehadiran Mentor (Bulan Ini) ---
  const mentorSheet = workbook.addWorksheet("Kehadiran Mentor");
  mentorSheet.columns = [
    { header: "Halaqah", key: "halaqahName", width: 20 },
    { header: "Mentor", key: "fullName", width: 20 },
    { header: "Hadir", key: "present", width: 10 },
    { header: "Telat", key: "late", width: 10 },
    { header: "Tidak Hadir", key: "absent", width: 12 },
  ];
  styleHeaderRow(mentorSheet.getRow(1));
  d.mentorAttendance.monthlyPerHalaqah.forEach((h) => {
    h.mentors.forEach((m) =>
      mentorSheet.addRow({
        halaqahName: h.halaqahName,
        fullName: m.fullName,
        present: m.present,
        late: m.late,
        absent: m.absent,
      }),
    );
  });

  // --- Sakit & Izin (Bulan Ini) ---
  const healthSheet = workbook.addWorksheet("Sakit & Izin");
  healthSheet.columns = [
    { header: "Nama Santri", key: "fullName", width: 25 },
    { header: "Halaqah", key: "halaqahName", width: 20 },
    { header: "Tanggal", key: "date", width: 14 },
    { header: "Jenis", key: "jenis", width: 10 },
  ];
  styleHeaderRow(healthSheet.getRow(1));
  d.studentHealth.sakit.monthList.forEach((s) =>
    healthSheet.addRow({ ...s, jenis: "Sakit" }),
  );
  d.studentHealth.izin.monthList.forEach((s) =>
    healthSheet.addRow({ ...s, jenis: "Izin" }),
  );

  // --- Santri Berisiko ---
  const riskSheet = workbook.addWorksheet("Santri Berisiko");
  riskSheet.columns = [
    { header: "Nama Santri", key: "fullName", width: 25 },
    { header: "Halaqah", key: "halaqahName", width: 20 },
    { header: "Hari Sejak Setor Terakhir", key: "daysSinceLastSubmission", width: 22 },
  ];
  styleHeaderRow(riskSheet.getRow(1));
  d.atRisk.forEach((s) => riskSheet.addRow(s));

  // --- Leaderboard ---
  const leaderboardSheet = workbook.addWorksheet("Leaderboard");
  leaderboardSheet.columns = [
    { header: "Nama Santri", key: "fullName", width: 25 },
    { header: "Halaqah", key: "halaqahName", width: 20 },
    { header: "Total Halaman", key: "totalPages", width: 14 },
  ];
  styleHeaderRow(leaderboardSheet.getRow(1));
  d.leaderboard.forEach((s) => leaderboardSheet.addRow(s));

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `Dashboard_Monitoring_Tahfidz_${d.date}.xlsx`);
}

async function loadDashboard() {
  loading.value = true;
  try {
    const res = await tahfidzApi.getMonitoringDashboard(selectedDate.value);
    if (res.success) {
      data.value = res.data;
    }
  } catch (e) {
    console.error("Failed to load monitoring dashboard:", e);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadDashboard();
});
</script>
