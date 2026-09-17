<template>
  <div class="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
    <!-- Header -->
    <div
      class="flex flex-col md:flex-row md:items-center justify-between gap-4"
    >
      <div>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">
          Rekap Absensi Guru
        </h1>
        <p class="text-slate-500 mt-1">
          Data kehadiran seluruh guru untuk keperluan rekapitulasi.
        </p>
      </div>
      <div class="flex items-center gap-3">
        <input
          v-model="filterDate"
          type="date"
          class="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
        />
        <button
          @click="exportData"
          class="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
        >
          <Icon icon="lucide:download" class="w-4 h-4" />
          Export
        </button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        icon="lucide:user-check"
        color="emerald"
        label="Hadir"
        :value="stats.present"
      />
      <StatCard
        icon="lucide:clock"
        color="amber"
        label="Terlambat"
        :value="stats.late"
      />
      <StatCard
        icon="lucide:user-x"
        color="rose"
        label="Tidak Hadir"
        :value="stats.absent"
      />
      <StatCard
        icon="lucide:users"
        color="indigo"
        label="Total Record"
        :value="stats.total"
      />
    </div>

    <!-- Data Table -->
    <div
      class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
    >
      <div class="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <h3 class="font-semibold text-slate-800">Data Absensi</h3>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr
              class="text-left text-xs font-semibold text-slate-500 bg-slate-50/50 uppercase tracking-wider border-b border-slate-100"
            >
              <th class="px-4 md:px-6 py-3">Nama Guru</th>
              <th class="hidden md:table-cell px-4 md:px-6 py-3">Divisi</th>
              <th class="px-4 md:px-6 py-3">Tanggal</th>
              <th class="px-4 md:px-6 py-3">Jam Masuk</th>
              <th class="hidden md:table-cell px-4 md:px-6 py-3">
                Lokasi Masuk
              </th>
              <th class="px-4 md:px-6 py-3">Jam Pulang</th>
              <th class="hidden md:table-cell px-4 md:px-6 py-3">
                Lokasi Pulang
              </th>
              <th class="px-4 md:px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-sm">
            <tr
              v-for="item in filteredAttendances"
              :key="item.id"
              class="hover:bg-slate-50/50 transition-colors"
            >
              <td class="px-4 md:px-6 py-3 font-medium text-slate-900">
                {{ item.teacherName || getTeacherName(item.teacherId) }}
              </td>
              <td class="hidden md:table-cell px-4 md:px-6 py-3 text-slate-600">
                {{ item.teacherDivision || "-" }}
              </td>
              <td class="px-4 md:px-6 py-3 text-slate-600">
                {{ formatDate(item.date) }}
              </td>
              <td class="px-4 md:px-6 py-3 text-emerald-600 font-medium">
                {{ item.checkIn || "-" }}
              </td>
              <td
                class="hidden md:table-cell px-4 md:px-6 py-3 text-slate-500 text-xs"
              >
                <span v-if="item.checkInLatitude">
                  {{ Number(item.checkInLatitude).toFixed(4) }},
                  {{ Number(item.checkInLongitude).toFixed(4) }}
                </span>
                <span v-else>-</span>
              </td>
              <td class="px-4 md:px-6 py-3 text-rose-600 font-medium">
                {{ item.checkOut || "-" }}
              </td>
              <td
                class="hidden md:table-cell px-4 md:px-6 py-3 text-slate-500 text-xs"
              >
                <span v-if="item.checkOutLatitude">
                  {{ Number(item.checkOutLatitude).toFixed(4) }},
                  {{ Number(item.checkOutLongitude).toFixed(4) }}
                </span>
                <span v-else>-</span>
              </td>
              <td class="px-4 md:px-6 py-3">
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
                  :class="{
                    'bg-emerald-100 text-emerald-800':
                      item.status === 'present',
                    'bg-amber-100 text-amber-800': item.status === 'late',
                    'bg-rose-100 text-rose-800': item.status === 'absent',
                  }"
                >
                  {{ statusLabel(item.status) }}
                </span>
              </td>
            </tr>
            <tr v-if="filteredAttendances.length === 0">
              <td colspan="8" class="px-6 py-8 text-center text-slate-500">
                Tidak ada data absensi.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { Icon } from "@iconify/vue";
import StatCard from "@/components/ui/StatCard.vue";
import { attendanceApi, teachersApi } from "@/services/api.js";

const attendances = ref([]);
const teachers = ref([]);
const loading = ref(false);
const filterDate = ref("");

// Stats
const stats = computed(() => {
  const data = filteredAttendances.value;
  return {
    present: data.filter((a) => a.status === "present").length,
    late: data.filter((a) => a.status === "late").length,
    absent: data.filter((a) => a.status === "absent").length,
    total: data.length,
  };
});

// Filtered attendances
const filteredAttendances = computed(() => {
  if (!filterDate.value) {
    return attendances.value.slice().sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      if (dateB - dateA !== 0) return dateB - dateA;
      return b.id - a.id;
    });
  }
  return attendances.value
    .filter((a) => a.date && String(a.date).startsWith(filterDate.value))
    .sort((a, b) => b.id - a.id);
});

function getTeacherName(teacherId) {
  const teacher = teachers.value.find((t) => t.id === teacherId);
  return teacher?.name || `Guru #${teacherId}`;
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

function statusLabel(status) {
  const labels = {
    present: "Hadir",
    late: "Terlambat",
    absent: "Tidak Hadir",
    sick: "Sakit",
    permitted: "Izin",
  };
  return labels[status] || status;
}

async function fetchData() {
  loading.value = true;
  try {
    const [attRes, teacherRes] = await Promise.all([
      attendanceApi.getTeacherAttendance(),
      teachersApi.getAll(),
    ]);
    attendances.value = Array.isArray(attRes?.data) ? attRes.data : [];
    teachers.value = Array.isArray(teacherRes?.data) ? teacherRes.data : [];
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

function exportData() {
  // Simple CSV export
  const headers = [
    "Nama Guru",
    "Divisi",
    "Tanggal",
    "Jam Masuk",
    "Jam Pulang",
    "Status",
  ];
  const rows = filteredAttendances.value.map((item) => [
    item.teacherName || getTeacherName(item.teacherId),
    item.teacherDivision || "",
    item.date,
    item.checkIn || "",
    item.checkOut || "",
    item.status,
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `absensi-guru-${filterDate.value || "all"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

onMounted(() => {
  fetchData();
});
</script>
