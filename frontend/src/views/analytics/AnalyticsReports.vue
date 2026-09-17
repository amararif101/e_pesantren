<template>
  <div class="max-w-7xl mx-auto pb-10">
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
      <div
        class="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 class="text-2xl font-semibold mb-1 text-slate-800">
            Analytics & Rekap Data
          </h1>
          <p class="text-slate-500 text-sm">
            Ringkasan data operasional pondok pesantren
          </p>
        </div>

        <!-- Filters -->
        <!-- Filters Section -->
        <div class="bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
          <div class="flex flex-wrap items-center gap-4">
            <!-- Filter Type Group -->
            <div class="flex items-center gap-2 group w-full md:w-auto">
              <div
                class="hidden md:flex p-2.5 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-400 group-focus-within:text-[#602515] group-focus-within:border-[#602515]/20 transition-all duration-300"
              >
                <span
                  class="iconify text-xl"
                  data-icon="mdi:calendar-range"
                ></span>
              </div>
              <div class="w-full md:w-48">
                <select
                  v-model="filterType"
                  class="w-full border-slate-200 bg-white rounded-xl text-sm focus:ring-4 focus:ring-[#602515]/10 focus:border-[#602515] transition-all duration-300 cursor-pointer py-2.5"
                >
                  <option value="today">Hari Ini</option>
                  <option value="this_week">Pekan Ini</option>
                  <option value="this_month">Bulan Ini</option>
                  <option value="semester">Semester</option>
                  <option value="yearly">Tahun Ajaran</option>
                  <option value="custom">Kustom Tanggal</option>
                </select>
              </div>
            </div>

            <!-- Dynamic Filters with Transition -->
            <TransitionGroup
              name="filter-list"
              tag="div"
              class="flex flex-wrap items-center gap-3 w-full md:w-auto"
            >
              <!-- Academic Year -->
              <div
                v-if="filterType === 'semester' || filterType === 'yearly'"
                key="academic-year"
                class="flex items-center gap-2 group w-full md:w-auto"
              >
                <div
                  class="hidden md:flex p-2.5 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-400 group-focus-within:text-[#602515] group-focus-within:border-[#602515]/20 transition-all duration-300"
                >
                  <span
                    class="iconify text-xl"
                    data-icon="mdi:school-outline"
                  ></span>
                </div>
                <div class="w-full md:w-44">
                  <select
                    v-model="selectedAcademicYear"
                    class="w-full border-slate-200 bg-white rounded-xl text-sm focus:ring-4 focus:ring-[#602515]/10 focus:border-[#602515] transition-all duration-300 cursor-pointer py-2.5"
                  >
                    <option value="">Pilih Tahun Ajaran</option>
                    <option
                      v-for="year in filterOptions.academicYears"
                      :key="year"
                      :value="year"
                    >
                      {{ year }}
                    </option>
                  </select>
                </div>
              </div>

              <!-- Semester -->
              <div
                v-if="filterType === 'semester'"
                key="semester"
                class="flex items-center gap-2 group w-full md:w-auto"
              >
                <div
                  class="hidden md:flex p-2.5 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-400 group-focus-within:text-[#602515] group-focus-within:border-[#602515]/20 transition-all duration-300"
                >
                  <span
                    class="iconify text-xl"
                    data-icon="mdi:book-open-variant"
                  ></span>
                </div>
                <div class="w-full md:w-36">
                  <select
                    v-model="selectedSemester"
                    class="w-full border-slate-200 bg-white rounded-xl text-sm focus:ring-4 focus:ring-[#602515]/10 focus:border-[#602515] transition-all duration-300 cursor-pointer py-2.5"
                  >
                    <option value="">Pilih Semester</option>
                    <option
                      v-for="sem in filterOptions.semesters"
                      :key="sem.value"
                      :value="sem.value"
                    >
                      {{ sem.label }}
                    </option>
                  </select>
                </div>
              </div>

              <!-- Custom Dates -->
              <div
                v-if="filterType === 'custom'"
                key="custom-dates"
                class="w-full md:w-auto"
              >
                <div
                  class="flex flex-col md:flex-row items-stretch md:items-center gap-2 bg-white p-3 md:p-1 md:pr-4 rounded-xl border border-slate-200 shadow-sm focus-within:ring-4 focus-within:ring-[#602515]/10 focus-within:border-[#602515] transition-all duration-300"
                >
                  <div
                    class="hidden md:flex p-2 text-slate-400 group-focus-within:text-[#602515]"
                  >
                    <span
                      class="iconify text-xl"
                      data-icon="mdi:calendar-edit"
                    ></span>
                  </div>

                  <!-- Start Date -->
                  <input
                    type="date"
                    v-model="customStartDate"
                    class="border-0 bg-slate-50 md:bg-transparent rounded-lg md:rounded-none p-2.5 md:p-1 text-sm focus:ring-0 w-full md:w-32"
                  />

                  <!-- Divider -->
                  <div class="flex justify-center md:block">
                    <span
                      class="text-[10px] text-slate-400 font-bold md:hidden uppercase tracking-widest"
                      >Hingga</span
                    >
                    <span class="text-slate-300 font-bold hidden md:inline"
                      >/</span
                    >
                  </div>

                  <!-- End Date -->
                  <input
                    type="date"
                    v-model="customEndDate"
                    class="border-0 bg-slate-50 md:bg-transparent rounded-lg md:rounded-none p-2.5 md:p-1 text-sm focus:ring-0 w-full md:w-32"
                  />
                </div>
              </div>
            </TransitionGroup>

            <!-- Apply Button -->
            <button
              @click="fetchData"
              class="md:ml-auto w-full md:w-auto px-8 py-3 bg-[#602515] text-white rounded-xl text-sm font-bold hover:bg-[#4a1c10] active:scale-95 shadow-lg shadow-[#602515]/20 transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed group overflow-hidden relative"
              :disabled="loading"
            >
              <div
                class="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"
              ></div>
              <span v-if="loading" class="animate-spin text-xl relative z-10">
                <span class="iconify" data-icon="mdi:loading"></span>
              </span>
              <span
                v-else
                class="iconify text-xl group-hover:rotate-12 transition-transform duration-300 relative z-10"
                data-icon="mdi:filter-variant"
              ></span>
              <span class="relative z-10">Terapkan Filter</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-20">
      <div class="animate-spin text-4xl text-blue-600">
        <span class="iconify" data-icon="mdi:loading"></span>
      </div>
    </div>

    <!-- Dashboard Content -->
    <div v-else-if="recapData" class="space-y-8">
      <!-- Top Metrics -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- Total Siswa Card -->
        <div
          class="group bg-gradient-to-br from-white to-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex items-center gap-5"
        >
          <div
            class="p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300"
          >
            <span class="iconify text-3xl" data-icon="mdi:account-group"></span>
          </div>
          <div>
            <p
              class="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1"
            >
              Total Siswa Aktif
            </p>
            <p class="text-3xl font-black text-slate-800 tracking-tight">
              {{ recapData.siswa.totalActive }}
            </p>
          </div>
        </div>

        <!-- Total Pegawai Card -->
        <div
          class="group bg-gradient-to-br from-white to-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex items-center gap-5"
        >
          <div
            class="p-4 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300"
          >
            <span class="iconify text-3xl" data-icon="mdi:account-tie"></span>
          </div>
          <div>
            <p
              class="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1"
            >
              Total Pegawai
            </p>
            <p class="text-3xl font-black text-slate-800 tracking-tight">
              {{ recapData.sdm.teachers + recapData.sdm.staff }}
            </p>
          </div>
        </div>

        <!-- Total Kamar Card -->
        <div
          class="group bg-gradient-to-br from-white to-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex items-center gap-5"
        >
          <div
            class="p-4 bg-orange-50 text-orange-600 rounded-2xl group-hover:bg-orange-600 group-hover:text-white transition-colors duration-300"
          >
            <span class="iconify text-3xl" data-icon="mdi:door-closed"></span>
          </div>
          <div>
            <p
              class="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1"
            >
              Total Kamar
            </p>
            <div class="flex items-baseline gap-2">
              <p class="text-3xl font-black text-slate-800 tracking-tight">
                {{ recapData.kamar.totalRooms }}
              </p>
              <span class="text-xs text-slate-400 font-medium whitespace-nowrap"
                >({{ recapData.kamar.totalCapacity }} Kapasitas)</span
              >
            </div>
          </div>
        </div>

        <!-- Total Kelas Card -->
        <div
          class="group bg-gradient-to-br from-white to-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex items-center gap-5"
        >
          <div
            class="p-4 bg-purple-50 text-purple-600 rounded-2xl group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300"
          >
            <span
              class="iconify text-3xl"
              data-icon="mdi:google-classroom"
            ></span>
          </div>
          <div>
            <p
              class="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1"
            >
              Total Kelas
            </p>
            <p class="text-3xl font-black text-slate-800 tracking-tight">
              {{ recapData.kelas.totalClasses }}
            </p>
          </div>
        </div>
      </div>

      <!-- SECTION: SDM -->
      <div>
        <h2 class="text-xl font-bold text-slate-800 mb-4 pb-2 px-2 border-b">
          Data SDM & Kepegawaian
        </h2>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div
            class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"
          >
            <h3 class="text-md font-semibold text-slate-800 mb-4">
              Komposisi SDM
            </h3>
            <div class="h-64">
              <DoughnutChart
                :labels="['Guru', 'Staf', 'Laki-laki', 'Perempuan']"
                :datasets="[
                  {
                    backgroundColor: [
                      '#3b82f6',
                      '#10b981',
                      '#6366f1',
                      '#ec4899',
                    ],
                    data: [
                      recapData.sdm.teachers,
                      recapData.sdm.staff,
                      recapData.sdm.male,
                      recapData.sdm.female,
                    ],
                  },
                ]"
              />
            </div>
          </div>
          <div
            class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"
          >
            <h3 class="text-md font-semibold text-slate-800 mb-4">
              Sebaran SDM per Divisi
            </h3>
            <div class="h-64">
              <BarChart
                :labels="Object.keys(recapData.sdm.byDivision)"
                :datasets="[
                  {
                    label: 'Jumlah Pegawai',
                    backgroundColor: '#8b5cf6',
                    data: Object.values(recapData.sdm.byDivision),
                  },
                ]"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- SECTION: Siswa -->
      <div>
        <h2 class="text-xl font-bold text-slate-800 mb-4 pb-2 px-2 border-b">
          Data Kesantrian / Siswa
        </h2>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div
            class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"
          >
            <h3 class="text-md font-semibold text-slate-800 mb-4">
              Siswa Aktif per Rombel & Gender
            </h3>
            <div class="h-80">
              <BarChart
                :labels="Object.keys(recapData.siswa.byClassAndGender)"
                :datasets="[
                  {
                    label: 'Laki-laki',
                    backgroundColor: '#3b82f6',
                    data: Object.values(recapData.siswa.byClassAndGender).map(
                      (d) => d.male,
                    ),
                  },
                  {
                    label: 'Perempuan',
                    backgroundColor: '#ec4899',
                    data: Object.values(recapData.siswa.byClassAndGender).map(
                      (d) => d.female,
                    ),
                  },
                ]"
                :options="{ responsive: true, maintainAspectRatio: false }"
              />
            </div>
          </div>
          <div
            class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"
          >
            <h3 class="text-md font-semibold text-slate-800 mb-4">
              Status Siswa
            </h3>
            <div class="h-80">
              <BarChart
                :labels="Object.keys(recapData.siswa.statusBreakdown)"
                :datasets="[
                  {
                    label: 'Jumlah Siswa',
                    backgroundColor: '#10b981',
                    data: Object.values(recapData.siswa.statusBreakdown),
                  },
                ]"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- SECTION: Kedisiplinan -->
      <div>
        <h2 class="text-xl font-bold text-slate-800 mb-4 pb-2 px-2 border-b">
          Data Kedisiplinan
        </h2>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div
            class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"
          >
            <h3 class="text-md font-semibold text-slate-800 mb-4">
              Berdasarkan Gender
            </h3>
            <div class="h-64">
              <BarChart
                :labels="Object.keys(recapData.kedisiplinan.byGender)"
                :datasets="[
                  {
                    label: 'Penghargaan',
                    backgroundColor: '#10b981',
                    data: Object.values(recapData.kedisiplinan.byGender).map(
                      (d) => d.reward,
                    ),
                  },
                  {
                    label: 'Pelanggaran',
                    backgroundColor: '#ef4444',
                    data: Object.values(recapData.kedisiplinan.byGender).map(
                      (d) => d.punishment,
                    ),
                  },
                ]"
              />
            </div>
          </div>
          <div
            class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"
          >
            <h3 class="text-md font-semibold text-slate-800 mb-4">
              Berdasarkan Kelas
            </h3>
            <div class="h-64">
              <BarChart
                :labels="Object.keys(recapData.kedisiplinan.byClass)"
                :datasets="[
                  {
                    label: 'Penghargaan',
                    backgroundColor: '#10b981',
                    data: Object.values(recapData.kedisiplinan.byClass).map(
                      (d) => d.reward,
                    ),
                  },
                  {
                    label: 'Pelanggaran',
                    backgroundColor: '#ef4444',
                    data: Object.values(recapData.kedisiplinan.byClass).map(
                      (d) => d.punishment,
                    ),
                  },
                ]"
              />
            </div>
          </div>
          <div
            class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"
          >
            <h3 class="text-md font-semibold text-slate-800 mb-4">
              Berdasarkan Kamar
            </h3>
            <div class="h-64">
              <BarChart
                :labels="Object.keys(recapData.kedisiplinan.byRoom)"
                :datasets="[
                  {
                    label: 'Penghargaan',
                    backgroundColor: '#10b981',
                    data: Object.values(recapData.kedisiplinan.byRoom).map(
                      (d) => d.reward,
                    ),
                  },
                  {
                    label: 'Pelanggaran',
                    backgroundColor: '#ef4444',
                    data: Object.values(recapData.kedisiplinan.byRoom).map(
                      (d) => d.punishment,
                    ),
                  },
                ]"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- SECTION: Tahfidz -->
      <div>
        <h2 class="text-xl font-bold text-slate-800 mb-4 pb-2 px-2 border-b">
          Data Tahfidz
        </h2>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div
            class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"
          >
            <h3 class="text-md font-semibold text-slate-800 mb-4">
              Frekuensi Setoran (Taqdim/Murajaah/dll)
            </h3>
            <div class="h-64">
              <BarChart
                :labels="Object.keys(recapData.tahfidz.deposits)"
                :datasets="[
                  {
                    label: 'Jumlah Setoran',
                    backgroundColor: '#14b8a6',
                    data: Object.values(recapData.tahfidz.deposits),
                  },
                ]"
              />
            </div>
          </div>
          <div
            class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"
          >
            <h3 class="text-md font-semibold text-slate-800 mb-4">
              Capaian Hafalan per Grup Halaqah
            </h3>
            <div class="h-64">
              <BarChart
                :labels="Object.keys(recapData.tahfidz.byHalaqah)"
                :datasets="[
                  {
                    label: 'Total Halaman Disetorkan',
                    backgroundColor: '#0ea5e9',
                    data: Object.values(recapData.tahfidz.byHalaqah),
                  },
                ]"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- SECTION: Perizinan & Klinik -->
      <div>
        <h2 class="text-xl font-bold text-slate-800 mb-4 pb-2 px-2 border-b">
          Data Perizinan Pegawai & Kesehatan
        </h2>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div
            class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"
          >
            <h3 class="text-md font-semibold text-slate-800 mb-4">
              Izin Pegawai per Divisi
            </h3>
            <div class="h-64">
              <BarChart
                :labels="Object.keys(recapData.perizinan.byDivisionAndType)"
                :datasets="[
                  {
                    label: 'Sakit',
                    backgroundColor: '#f59e0b',
                    data: Object.values(
                      recapData.perizinan.byDivisionAndType,
                    ).map((d) => d.sakit || 0),
                  },
                  {
                    label: 'Izin',
                    backgroundColor: '#3b82f6',
                    data: Object.values(
                      recapData.perizinan.byDivisionAndType,
                    ).map((d) => d.izin || 0),
                  },
                  {
                    label: 'Cuti',
                    backgroundColor: '#ec4899',
                    data: Object.values(
                      recapData.perizinan.byDivisionAndType,
                    ).map((d) => d.cuti || 0),
                  },
                ]"
              />
            </div>
          </div>
          <div
            class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"
          >
            <h3 class="text-md font-semibold text-slate-800 mb-4">
              Izin Pegawai per Gender
            </h3>
            <div class="h-64">
              <BarChart
                :labels="Object.keys(recapData.perizinan.byGenderAndType)"
                :datasets="[
                  {
                    label: 'Sakit',
                    backgroundColor: '#f59e0b',
                    data: Object.values(
                      recapData.perizinan.byGenderAndType,
                    ).map((d) => d.sakit || 0),
                  },
                  {
                    label: 'Izin',
                    backgroundColor: '#3b82f6',
                    data: Object.values(
                      recapData.perizinan.byGenderAndType,
                    ).map((d) => d.izin || 0),
                  },
                  {
                    label: 'Cuti',
                    backgroundColor: '#ec4899',
                    data: Object.values(
                      recapData.perizinan.byGenderAndType,
                    ).map((d) => d.cuti || 0),
                  },
                ]"
              />
            </div>
          </div>
          <div
            class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col"
          >
            <h3 class="text-md font-semibold text-slate-800 mb-4">
              Kunjungan Klinik
            </h3>
            <div class="flex-grow">
              <DoughnutChart
                :labels="
                  Object.keys(recapData.kesehatan.examinationsByType).map((k) =>
                    mapPatientType(k),
                  )
                "
                :datasets="[
                  {
                    backgroundColor: ['#3b82f6', '#f43f5e', '#8b5cf6'],
                    data: Object.values(recapData.kesehatan.examinationsByType),
                  },
                ]"
              />
            </div>
            <div
              class="mt-4 pt-4 border-t border-slate-100 flex justify-between"
            >
              <span class="text-sm text-slate-600"
                >Total Kunjungan:
                <strong class="text-slate-800">{{
                  recapData.kesehatan.totalExaminations
                }}</strong></span
              >
              <span class="text-sm text-rose-600 font-medium"
                >Obat Menipis: {{ recapData.kesehatan.lowStockMedicines }}</span
              >
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { analyticsApi } from "@/services/api";
import BarChart from "@/components/charts/BarChart.vue";
import DoughnutChart from "@/components/charts/DoughnutChart.vue";

// Filter state
const filterType = ref("this_month");
const selectedAcademicYear = ref("");
const selectedSemester = ref("");
const customStartDate = ref("");
const customEndDate = ref("");
const filterOptions = ref({ academicYears: [], semesters: [] });

// Data state
const loading = ref(false);
const recapData = ref(null);

// Get current date strings
const getToday = () => new Date().toISOString().split("T")[0];

const getStartOfWeek = () => {
  const d = new Date();
  const day = d.getDay(),
    diff = d.getDate() - day + (day == 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().split("T")[0];
};

const getStartOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
};

const getEndOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];
};

const mapPatientType = (type) => {
  if (type === "student") return "Siswa/Santri";
  if (type === "teacher") return "Pegawai/Guru";
  if (type === "external") return "Pasien Luar";
  return type;
};

const fetchFilters = async () => {
  try {
    const res = await analyticsApi.getFilters();
    if (res.success) {
      filterOptions.value = res.data;
      if (res.data.academicYears.length > 0) {
        selectedAcademicYear.value = res.data.academicYears[0];
      }
    }
  } catch (error) {
    console.error(error);
  }
};

const fetchData = async () => {
  loading.value = true;
  try {
    const params = {};
    const today = getToday();

    switch (filterType.value) {
      case "today":
        params.startDate = today;
        params.endDate = today;
        break;
      case "this_week":
        params.startDate = getStartOfWeek();
        params.endDate = today;
        break;
      case "this_month":
        params.startDate = getStartOfMonth();
        params.endDate = getEndOfMonth();
        break;
      case "semester":
        params.academicYear = selectedAcademicYear.value;
        params.semester = selectedSemester.value;
        break;
      case "yearly":
        params.academicYear = selectedAcademicYear.value;
        break;
      case "custom":
        params.startDate = customStartDate.value;
        params.endDate = customEndDate.value;
        break;
    }

    const res = await analyticsApi.getRecap(params);
    if (res.success) {
      recapData.value = res.data;
    }
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  await fetchFilters();
  await fetchData();
});
</script>

<style scoped>
.filter-list-enter-active,
.filter-list-leave-active {
  transition: all 0.3s ease;
}
.filter-list-enter-from,
.filter-list-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}
.filter-list-move {
  transition: transform 0.3s ease;
}
</style>
