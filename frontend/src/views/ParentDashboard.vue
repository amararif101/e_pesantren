<template>
  <div class="min-h-screen bg-slate-50">
    <!-- Header -->
    <div class="bg-white border-b shadow-sm sticky top-0 z-10">
      <div class="max-w-7xl mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center"
            >
              <Icon
                icon="solar:users-group-rounded-line-duotone"
                class="w-6 h-6 text-primary-600"
              />
            </div>
            <div>
              <h1 class="text-xl font-semibold text-slate-800">
                Dashboard Orang Tua
              </h1>
              <p class="text-sm text-slate-500">
                Pantau perkembangan anak Anda
              </p>
            </div>
          </div>
          <button
            @click="logout"
            class="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Icon icon="solar:logout-2-line-duotone" class="w-5 h-5" />
            Keluar
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <Icon
          icon="svg-spinners:ring-resize"
          class="w-12 h-12 text-primary-600 mx-auto mb-4"
        />
        <p class="text-slate-500">Memuat data...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="max-w-7xl mx-auto px-4 py-10">
      <div class="bg-red-50 rounded-xl p-6 text-center">
        <Icon
          icon="solar:danger-triangle-line-duotone"
          class="w-12 h-12 text-red-500 mx-auto mb-4"
        />
        <p class="text-red-600 font-medium">{{ error }}</p>
        <button
          @click="loadData"
          class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Coba Lagi
        </button>
      </div>
    </div>

    <!-- No Children State -->
    <div v-else-if="children.length === 0" class="max-w-7xl mx-auto px-4 py-10">
      <div class="bg-yellow-50 rounded-xl p-6 text-center">
        <Icon
          icon="solar:user-cross-line-duotone"
          class="w-12 h-12 text-yellow-500 mx-auto mb-4"
        />
        <p class="text-yellow-700 font-medium">
          Belum ada data anak yang terhubung dengan akun Anda
        </p>
        <p class="text-yellow-600 text-sm mt-2">
          Silakan hubungi pihak pesantren untuk menghubungkan data anak Anda
        </p>
      </div>
    </div>

    <!-- Children Cards -->
    <div v-else class="max-w-7xl mx-auto px-4 py-6">
      <div class="space-y-6">
        <div
          v-for="child in children"
          :key="child.id"
          class="bg-white rounded-2xl shadow-sm border overflow-hidden"
        >
          <!-- Child Header -->
          <div class="bg-gradient-to-r from-primary-600 to-primary-700 p-4">
            <div class="flex items-center gap-4">
              <div
                class="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center overflow-hidden"
              >
                <img
                  v-if="child.photo"
                  :src="getPhotoUrl(child.photo)"
                  :alt="child.fullName"
                  class="w-full h-full object-cover"
                />
                <Icon
                  v-else
                  icon="solar:user-circle-line-duotone"
                  class="w-10 h-10 text-white"
                />
              </div>
              <div class="flex-1 text-white">
                <h2 class="text-lg font-semibold">{{ child.fullName }}</h2>
                <p v-if="child.fullNameAr" class="text-sm text-white/80 rtl">
                  {{ child.fullNameAr }}
                </p>
                <div class="flex items-center gap-3 mt-1 text-sm text-white/80">
                  <span>NIS: {{ child.nis }}</span>
                  <span v-if="child.className"
                    >• Kelas {{ child.className }}</span
                  >
                </div>
              </div>
              <!-- Report Card Buttons -->
              <div class="flex items-center gap-2">
                <button
                  @click="openAcademicReport(child)"
                  class="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-colors"
                  title="Rapor Pesantren"
                >
                  <Icon
                    icon="solar:document-text-line-duotone"
                    class="w-4 h-4"
                  />
                  <span class="hidden sm:inline">Rapor Pesantren</span>
                </button>
                <button
                  @click="openTahfidzReport(child)"
                  class="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-colors"
                  title="Rapor Tahfidz"
                >
                  <Icon icon="solar:book-2-line-duotone" class="w-4 h-4" />
                  <span class="hidden sm:inline">Rapor Tahfidz</span>
                </button>
              </div>
              <button
                @click="toggleChildExpand(child.id)"
                class="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <Icon
                  :icon="
                    expandedChildren.includes(child.id)
                      ? 'solar:alt-arrow-up-line-duotone'
                      : 'solar:alt-arrow-down-line-duotone'
                  "
                  class="w-6 h-6 text-white"
                />
              </button>
            </div>
          </div>

          <!-- Summary Cards (Always visible) -->
          <div class="p-4">
            <div v-if="!childSummaries[child.id]" class="text-center py-4">
              <Icon
                icon="svg-spinners:ring-resize"
                class="w-6 h-6 text-primary-600 mx-auto"
              />
            </div>
            <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <!-- Academic -->
              <StatCard
                icon="solar:diploma-line-duotone"
                color="blue"
                label="Akademik"
                :value="childSummaries[child.id]?.academic?.averageScore || '-'"
                caption="Rata-rata nilai"
                class="cursor-pointer hover:border-blue-300 transition-colors"
                @click="showDetail(child.id, 'academic')"
              />

              <!-- Discipline -->
              <StatCard
                icon="solar:medal-ribbons-star-line-duotone"
                color="amber"
                label="Kedisiplinan"
                :value="childSummaries[child.id]?.discipline?.netPoints || 0"
                :value-class="
                  (childSummaries[child.id]?.discipline?.netPoints || 0) >= 0
                    ? 'text-green-700'
                    : 'text-red-700'
                "
                caption="Poin bersih"
                class="cursor-pointer hover:border-amber-300 transition-colors"
                @click="showDetail(child.id, 'discipline')"
              />

              <!-- Clinic -->
              <StatCard
                icon="solar:health-line-duotone"
                color="emerald"
                label="Kesehatan"
                :value="childSummaries[child.id]?.clinic?.visitsCount || 0"
                caption="Kunjungan klinik"
                class="cursor-pointer hover:border-emerald-300 transition-colors"
                @click="showDetail(child.id, 'clinic')"
              />

              <!-- Tahfidz -->
              <StatCard
                icon="solar:book-bookmark-line-duotone"
                color="purple"
                label="Tahfidz"
                :value="
                  Number(
                    childSummaries[child.id]?.tahfidz?.totalPages || 0
                  ).toFixed(1)
                "
                caption="Halaman setor"
                class="cursor-pointer hover:border-purple-300 transition-colors"
                @click="showDetail(child.id, 'tahfidz')"
              />
            </div>
          </div>

          <!-- Expanded Detail Section -->
          <div v-if="expandedChildren.includes(child.id)" class="border-t">
            <!-- Tabs -->
            <div class="flex overflow-x-auto bg-slate-50 border-b">
              <button
                v-for="tab in tabs"
                :key="tab.id"
                @click="childTabs[child.id] = tab.id"
                :class="[
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                  childTabs[child.id] === tab.id
                    ? 'border-primary-600 text-primary-600 bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900',
                ]"
              >
                <Icon :icon="tab.icon" class="w-4 h-4" />
                {{ tab.label }}
              </button>
            </div>

            <!-- Tab Content -->
            <div class="p-4">
              <!-- Loading detail -->
              <div v-if="loadingDetail[child.id]" class="text-center py-8">
                <Icon
                  icon="svg-spinners:ring-resize"
                  class="w-8 h-8 text-primary-600 mx-auto"
                />
              </div>

              <!-- Academic Tab -->
              <div
                v-else-if="childTabs[child.id] === 'academic'"
                class="space-y-4"
              >
                <div
                  v-if="!childDetails[child.id]?.academic?.grades?.length"
                  class="text-center py-8 text-slate-500"
                >
                  Belum ada data nilai
                </div>
                <div v-else class="overflow-x-auto">
                  <table class="w-full text-sm">
                    <thead class="bg-slate-50">
                      <tr>
                        <th class="text-left p-3 font-medium text-slate-600">
                          Mata Pelajaran
                        </th>
                        <th class="text-center p-3 font-medium text-slate-600">
                          Rata-rata
                        </th>
                        <th class="text-center p-3 font-medium text-slate-600">
                          Predikat
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="grade in childDetails[
                          child.id
                        ]?.academic?.grades.slice(0, 10)"
                        :key="grade.id"
                        class="border-b"
                      >
                        <td class="p-3">{{ grade.subjectName || "-" }}</td>
                        <td class="p-3 text-center font-medium">
                          {{ grade.averageScore || "-" }}
                        </td>
                        <td class="p-3 text-center">
                          <span
                            class="px-2 py-1 rounded-full text-xs font-medium"
                            :class="getGradeColor(grade.letterGrade)"
                          >
                            {{ grade.letterGrade || "-" }}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Discipline Tab -->
              <div
                v-else-if="childTabs[child.id] === 'discipline'"
                class="space-y-4"
              >
                <!-- Warnings -->
                <div
                  v-if="childDetails[child.id]?.discipline?.warnings?.length"
                  class="mb-4"
                >
                  <h4 class="font-medium text-slate-700 mb-2">
                    Surat Peringatan Aktif
                  </h4>
                  <div
                    v-for="warning in childDetails[
                      child.id
                    ].discipline.warnings.filter((w) => w.status === 'active')"
                    :key="warning.id"
                    class="bg-red-50 rounded-lg p-3 mb-2"
                  >
                    <div class="flex items-center gap-2">
                      <Icon
                        icon="solar:danger-triangle-line-duotone"
                        class="w-5 h-5 text-red-600"
                      />
                      <span class="font-medium text-red-700"
                        >SP {{ warning.spLevel }}</span
                      >
                      <span class="text-sm text-red-600"
                        >- {{ formatDate(warning.issueDate) }}</span
                      >
                    </div>
                    <p class="text-sm text-red-600 mt-1">
                      {{ warning.reason }}
                    </p>
                  </div>
                </div>

                <!-- R&P History -->
                <div
                  v-if="
                    !childDetails[child.id]?.discipline?.rewardsPunishments
                      ?.length
                  "
                  class="text-center py-8 text-slate-500"
                >
                  Belum ada catatan kedisiplinan
                </div>
                <div v-else class="space-y-2">
                  <div
                    v-for="rp in childDetails[
                      child.id
                    ].discipline.rewardsPunishments.slice(0, 10)"
                    :key="rp.id"
                    :class="[
                      'rounded-lg p-3 flex items-start gap-3',
                      rp.type === 'reward' ? 'bg-green-50' : 'bg-red-50',
                    ]"
                  >
                    <Icon
                      :icon="
                        rp.type === 'reward'
                          ? 'solar:star-line-duotone'
                          : 'solar:danger-circle-line-duotone'
                      "
                      :class="[
                        'w-5 h-5 mt-0.5',
                        rp.type === 'reward'
                          ? 'text-green-600'
                          : 'text-red-600',
                      ]"
                    />
                    <div class="flex-1">
                      <div class="flex items-center justify-between">
                        <span
                          :class="[
                            'font-medium',
                            rp.type === 'reward'
                              ? 'text-green-700'
                              : 'text-red-700',
                          ]"
                        >
                          {{ rp.title }}
                        </span>
                        <span
                          :class="[
                            'text-sm font-bold',
                            rp.type === 'reward'
                              ? 'text-green-600'
                              : 'text-red-600',
                          ]"
                        >
                          {{ rp.type === "reward" ? "+" : "" }}{{ rp.points }}
                        </span>
                      </div>
                      <p class="text-sm text-slate-600 mt-1">
                        {{ formatDate(rp.date) }} • {{ rp.category }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Clinic Tab -->
              <div
                v-else-if="childTabs[child.id] === 'clinic'"
                class="space-y-4"
              >
                <div
                  v-if="!childDetails[child.id]?.clinic?.examinations?.length"
                  class="text-center py-8 text-slate-500"
                >
                  Belum ada riwayat pemeriksaan
                </div>
                <div v-else class="space-y-3">
                  <div
                    v-for="exam in childDetails[
                      child.id
                    ].clinic.examinations.slice(0, 10)"
                    :key="exam.id"
                    class="bg-slate-50 rounded-lg p-4"
                  >
                    <div class="flex items-center justify-between mb-2">
                      <span class="font-medium text-slate-800">{{
                        formatDate(exam.examinationDate)
                      }}</span>
                      <span
                        v-if="exam.isInpatient"
                        class="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full"
                        >Rawat Inap</span
                      >
                    </div>
                    <div
                      v-if="exam.symptoms"
                      class="text-sm text-slate-600 mb-1"
                    >
                      <span class="font-medium">Keluhan:</span>
                      {{ exam.symptoms }}
                    </div>
                    <div
                      v-if="exam.diagnosis"
                      class="text-sm text-slate-600 mb-1"
                    >
                      <span class="font-medium">Diagnosis:</span>
                      {{ exam.diagnosis }}
                    </div>
                    <div v-if="exam.treatment" class="text-sm text-slate-600">
                      <span class="font-medium">Tindakan:</span>
                      {{ exam.treatment }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Tahfidz Tab -->
              <div
                v-else-if="childTabs[child.id] === 'tahfidz'"
                class="space-y-4"
              >
                <!-- Exams -->
                <div
                  v-if="childDetails[child.id]?.tahfidz?.exams?.length"
                  class="mb-4"
                >
                  <h4 class="font-medium text-slate-700 mb-2">
                    Hasil Ujian Tahfidz
                  </h4>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div
                      v-for="exam in childDetails[child.id].tahfidz.exams.slice(
                        0,
                        4
                      )"
                      :key="exam.id"
                      :class="[
                        'rounded-lg p-3',
                        exam.verdict === 'pass'
                          ? 'bg-green-50'
                          : exam.verdict === 'fail'
                          ? 'bg-red-50'
                          : 'bg-yellow-50',
                      ]"
                    >
                      <div class="flex items-center justify-between">
                        <span class="font-medium text-slate-800">{{
                          exam.examType
                        }}</span>
                        <span
                          :class="[
                            'text-sm px-2 py-0.5 rounded-full font-medium',
                            exam.verdict === 'pass'
                              ? 'bg-green-200 text-green-700'
                              : exam.verdict === 'fail'
                              ? 'bg-red-200 text-red-700'
                              : 'bg-yellow-200 text-yellow-700',
                          ]"
                        >
                          {{
                            exam.verdict === "pass"
                              ? "Lulus"
                              : exam.verdict === "fail"
                              ? "Tidak Lulus"
                              : "Bersyarat"
                          }}
                        </span>
                      </div>
                      <p class="text-sm text-slate-600 mt-1">
                        {{ formatDate(exam.examDate) }} • Nilai:
                        {{ exam.finalScore }}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Recent Deposits -->
                <div>
                  <h4 class="font-medium text-slate-700 mb-2">
                    Setoran Terakhir
                  </h4>
                  <div
                    v-if="!childDetails[child.id]?.tahfidz?.deposits?.length"
                    class="text-center py-4 text-slate-500"
                  >
                    Belum ada data setoran
                  </div>
                  <div v-else class="space-y-2">
                    <div
                      v-for="deposit in childDetails[
                        child.id
                      ].tahfidz.deposits.slice(0, 5)"
                      :key="deposit.id"
                      class="bg-slate-50 rounded-lg p-3 flex items-center gap-3"
                    >
                      <div
                        :class="[
                          'w-10 h-10 rounded-full flex items-center justify-center',
                          deposit.type === 'ziyadah'
                            ? 'bg-purple-100'
                            : deposit.type === 'sabqi'
                            ? 'bg-teal-100'
                            : deposit.type === 'manzil'
                            ? 'bg-indigo-100'
                            : deposit.type === 'murajaah'
                            ? 'bg-blue-100'
                            : deposit.type === 'tidak_setor'
                            ? 'bg-orange-100'
                            : 'bg-slate-200',
                        ]"
                      >
                        <Icon
                          :icon="
                            deposit.type === 'ziyadah'
                              ? 'solar:add-circle-line-duotone'
                              : deposit.type === 'sabqi' ||
                                deposit.type === 'manzil'
                              ? 'solar:refresh-circle-line-duotone'
                              : deposit.type === 'murajaah'
                              ? 'solar:refresh-circle-line-duotone'
                              : deposit.type === 'tidak_setor'
                              ? 'solar:close-circle-line-duotone'
                              : 'solar:calendar-mark-line-duotone'
                          "
                          :class="[
                            'w-5 h-5',
                            deposit.type === 'ziyadah'
                              ? 'text-purple-600'
                              : deposit.type === 'sabqi'
                              ? 'text-teal-600'
                              : deposit.type === 'manzil'
                              ? 'text-indigo-600'
                              : deposit.type === 'murajaah'
                              ? 'text-blue-600'
                              : deposit.type === 'tidak_setor'
                              ? 'text-orange-600'
                              : 'text-slate-500',
                          ]"
                        />
                      </div>
                      <div class="flex-1">
                        <div class="flex items-center justify-between">
                          <span class="font-medium text-slate-800 capitalize">{{
                            deposit.type === "ziyadah"
                              ? "Taqdim"
                              : deposit.type === "tidak_setor"
                                ? "Tidak Setor"
                                : deposit.type === "sabqi"
                                  ? `Sabqi (${deposit.isCompleted ? "Sudah" : "Belum"})`
                                  : deposit.type === "manzil"
                                    ? `Manzil (${deposit.isCompleted ? "Sudah" : "Belum"})`
                                    : deposit.type
                          }}</span>
                          <span class="text-sm text-slate-500">{{
                            formatDateTime(deposit.depositDate)
                          }}</span>
                        </div>
                        <p class="text-sm text-slate-600">
                          <span v-if="deposit.totalPages"
                            >{{ deposit.totalPages }} halaman</span
                          >
                          <span v-if="deposit.fluency">
                            • {{ deposit.fluency }}</span
                          >
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import { Icon } from "@iconify/vue";
import StatCard from "@/components/ui/StatCard.vue";
import { authApi, parentDashboardApi } from "@/services/api.js";

const router = useRouter();
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

// State
const isLoading = ref(true);
const error = ref(null);
const children = ref([]);
const childSummaries = reactive({});
const childDetails = reactive({});
const childTabs = reactive({});
const loadingDetail = reactive({});
const expandedChildren = ref([]);

const tabs = [
  { id: "academic", label: "Akademik", icon: "solar:diploma-line-duotone" },
  {
    id: "discipline",
    label: "Kedisiplinan",
    icon: "solar:medal-ribbons-star-line-duotone",
  },
  { id: "clinic", label: "Kesehatan", icon: "solar:health-line-duotone" },
  { id: "tahfidz", label: "Tahfidz", icon: "solar:book-bookmark-line-duotone" },
];

// Methods
function getPhotoUrl(photo) {
  if (!photo) return null;
  if (photo.startsWith("http")) return photo;
  if (photo.startsWith("/api/")) return `${BASE_URL}${photo}`;
  return `${BASE_URL}/api/${photo}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getGradeColor(grade) {
  if (!grade) return "bg-slate-100 text-slate-600";
  if (grade.startsWith("A")) return "bg-green-100 text-green-700";
  if (grade.startsWith("B")) return "bg-blue-100 text-blue-700";
  if (grade.startsWith("C")) return "bg-yellow-100 text-yellow-700";
  if (grade.startsWith("D")) return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}

async function loadData() {
  isLoading.value = true;
  error.value = null;

  try {
    const res = await parentDashboardApi.getChildren();
    if (res.success) {
      children.value = res.data;

      // Load summaries for each child
      for (const child of res.data) {
        childTabs[child.id] = "academic";
        loadChildSummary(child.id);
      }
    } else {
      error.value = res.message || "Gagal memuat data";
    }
  } catch (e) {
    console.error("Load data error:", e);
    error.value = e.message || "Gagal memuat data";
  } finally {
    isLoading.value = false;
  }
}

async function loadChildSummary(childId) {
  try {
    const res = await parentDashboardApi.getChildSummary(childId);
    if (res.success) {
      childSummaries[childId] = res.data;
    }
  } catch (e) {
    console.error("Load summary error:", e);
  }
}

async function toggleChildExpand(childId) {
  const idx = expandedChildren.value.indexOf(childId);
  if (idx >= 0) {
    expandedChildren.value.splice(idx, 1);
  } else {
    expandedChildren.value.push(childId);
    // Load detail data when expanding
    loadChildDetail(childId, childTabs[childId] || "academic");
  }
}

async function showDetail(childId, tab) {
  childTabs[childId] = tab;
  if (!expandedChildren.value.includes(childId)) {
    expandedChildren.value.push(childId);
  }
  loadChildDetail(childId, tab);
}

async function loadChildDetail(childId, tab) {
  // Check if already loaded
  if (childDetails[childId]?.[tab]) return;

  loadingDetail[childId] = true;

  try {
    let res;
    switch (tab) {
      case "academic":
        res = await parentDashboardApi.getChildAcademic(childId);
        break;
      case "discipline":
        res = await parentDashboardApi.getChildDiscipline(childId);
        break;
      case "clinic":
        res = await parentDashboardApi.getChildClinic(childId);
        break;
      case "tahfidz":
        res = await parentDashboardApi.getChildTahfidz(childId);
        break;
    }

    if (res?.success) {
      if (!childDetails[childId]) {
        childDetails[childId] = {};
      }
      childDetails[childId][tab] = res.data;
    }
  } catch (e) {
    console.error(`Load ${tab} error:`, e);
  } finally {
    loadingDetail[childId] = false;
  }
}

function openAcademicReport(child) {
  // Navigate to academic report card with student pre-selected
  router.push({
    path: "/parent-dashboard/report-card",
    query: { studentId: child.id, studentName: child.fullName },
  });
}

function openTahfidzReport(child) {
  // Navigate to tahfidz report with student pre-selected
  router.push({
    path: "/parent-dashboard/tahfidz-report",
    query: { studentId: child.id, studentName: child.fullName },
  });
}

async function logout() {
  try {
    await authApi.logout();
  } finally {
    router.push("/login");
  }
}

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.rtl {
  direction: rtl;
  font-family: "Amiri", serif;
}
</style>
