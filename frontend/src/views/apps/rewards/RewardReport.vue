<template>
  <div class="px-2">
    <!-- Header -->
    <div
      class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6"
    >
      <div>
        <h1 class="text-2xl font-bold text-slate-800">Laporan Kedisiplinan</h1>
        <p class="text-slate-500 text-sm mt-1">
          Rekapitulasi poin penghargaan dan pelanggaran santri.
        </p>
      </div>
      <!-- <div class="flex gap-2">
        <button
          @click="printReport"
          class="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-2"
        >
          <Icon icon="solar:printer-bold" />
          Cetak Laporan
        </button>
      </div> -->
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <StatCard
        icon="solar:medal-star-bold"
        color="green"
        label="Total Penghargaan"
        :value="totalRewards"
      />
      <StatCard
        icon="solar:danger-circle-bold"
        color="red"
        label="Total Pelanggaran"
        :value="totalPunishments"
      />
      <StatCard
        icon="solar:shield-warning-bold"
        color="orange"
        label="Total SP"
        :value="totalSP"
      />
      <StatCard
        icon="solar:users-group-rounded-bold"
        color="blue"
        label="Santri Terlibat"
        :value="uniqueStudents"
      />
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 mb-4 border-b border-slate-200">
      <button
        @click="activeTab = 'history'"
        class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
        :class="
          activeTab === 'history'
            ? 'border-primary text-primary'
            : 'border-transparent text-slate-500 hover:text-slate-700'
        "
      >
        Riwayat Transaksi
      </button>
      <button
        @click="activeTab = 'summary'"
        class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
        :class="
          activeTab === 'summary'
            ? 'border-primary text-primary'
            : 'border-transparent text-slate-500 hover:text-slate-700'
        "
      >
        Rekapitulasi Poin Santri
      </button>
    </div>

    <!-- Filter Bar -->
    <div
      class="flex flex-col md:flex-row gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200"
    >
      <div class="w-full md:w-48">
        <select
          v-model="filters.type"
          class="w-full px-3 py-2 border rounded-lg outline-none"
        >
          <option value="all">Semua Tipe</option>
          <option value="reward">Penghargaan</option>
          <option value="punishment">Pelanggaran</option>
        </select>
      </div>
      <!-- Date Filter: Responsive -->
      <div
        class="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto flex-1"
      >
        <input
          v-model="filters.startDate"
          type="date"
          class="w-full sm:w-auto px-3 py-2 border rounded-lg outline-none"
        />
        <span class="text-slate-400 hidden sm:inline">-</span>
        <span class="text-slate-400 sm:hidden">s/d</span>
        <input
          v-model="filters.endDate"
          type="date"
          class="w-full sm:w-auto px-3 py-2 border rounded-lg outline-none"
        />
      </div>
    </div>

    <!-- View: History -->
    <DataTable
      v-if="activeTab === 'history'"
      :loading="loading"
      :items="paginatedHistory"
      :columns="historyColumns"
      :viewMode="viewMode"
      :search="filters.search"
      :hideFilter="true"
      :pagination="{
        page: currentPage,
        limit: itemsPerPage,
        total: filteredHistory.length,
        totalPages: Math.ceil(filteredHistory.length / itemsPerPage),
      }"
      @update:viewMode="viewMode = $event"
      @update:search="filters.search = $event"
      @update:limit="itemsPerPage = $event"
      @page-change="currentPage = $event"
    >
      <template #header-actions>
        <!-- Keep external actions -->
      </template>

      <!-- Date -->
      <template #cell-date="{ item }">
        <span class="text-slate-500 whitespace-nowrap">{{
          formatDate(item.date)
        }}</span>
      </template>

      <!-- Student -->
      <template #cell-student="{ item }">
        <div>
          <div class="font-medium">{{ item.student?.fullName }}</div>
          <div class="text-xs text-slate-500">
            NIS: {{ item.student?.nis || "-" }}
          </div>
        </div>
      </template>

      <!-- Class -->
      <template #cell-class="{ item }">
        <div>
          <div class="font-medium">{{ item.student?.class?.name || "-" }}</div>
          <div class="text-xs text-slate-500">
            Kelas {{ item.student?.class?.grade || "-" }}
          </div>
        </div>
      </template>

      <!-- Room -->
      <template #cell-room="{ item }">
        <span>{{ item.student?.room?.name || "-" }}</span>
      </template>

      <!-- Type & Category -->
      <template #cell-type="{ item }">
        <span
          class="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border border-transparent"
          :class="
            item.type === 'reward'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          "
        >
          <Icon
            :icon="
              item.type === 'reward'
                ? 'solar:medal-star-bold'
                : 'solar:danger-circle-bold'
            "
          />
          {{ item.type === "reward" ? "Reward" : "Punishment" }}
        </span>
        <div class="text-xs text-slate-500 mt-1">{{ item.category }}</div>
      </template>

      <!-- Title / Desc -->
      <template #cell-title="{ item }">
        <div class="font-medium text-slate-700">{{ item.title }}</div>
        <div class="text-xs text-slate-500 truncate max-w-xs">
          {{ item.description || item.notes }}
        </div>
      </template>

      <!-- Points -->
      <template #cell-points="{ item }">
        <span
          class="font-bold"
          :class="item.type === 'reward' ? 'text-green-600' : 'text-red-600'"
        >
          {{ item.type === "reward" ? "+" : "-" }}{{ item.points }}
        </span>
      </template>

      <!-- Actions -->
      <template #cell-actions="{ item }">
        <div class="flex items-center justify-end gap-2">
          <button
            @click="handleEdit(item)"
            class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit"
          >
            <Icon icon="solar:pen-bold" class="w-4 h-4" />
          </button>
          <button
            @click="handleDelete(item)"
            class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Hapus"
          >
            <Icon icon="solar:trash-bin-trash-bold" class="w-4 h-4" />
          </button>
        </div>
      </template>

      <!-- Card Item Slot -->
      <template #card-item="{ item }">
        <div
          class="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden h-full flex flex-col"
        >
          <!-- colored strip -->
          <div
            class="absolute left-0 top-0 bottom-0 w-1.5"
            :class="item.type === 'reward' ? 'bg-green-500' : 'bg-red-500'"
          ></div>

          <div class="p-4 pl-5 flex-1 flex flex-col gap-3">
            <!-- Header: Badge & Date -->
            <div class="flex justify-between items-start">
              <span
                class="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                :class="
                  item.type === 'reward'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                "
              >
                {{ item.type }}
              </span>
              <span class="text-xs text-slate-400 font-medium">{{
                formatDate(item.date)
              }}</span>
            </div>

            <!-- Student Info -->
            <div>
              <div
                class="font-bold text-slate-800 text-base leading-tight mb-0.5 line-clamp-1"
              >
                {{ item.student?.fullName }}
              </div>
              <div class="text-xs text-slate-500 flex items-center gap-1.5">
                <span>{{ item.student?.class?.name || "-" }}</span>
                <span class="w-1 h-1 rounded-full bg-slate-300"></span>
                <span>{{ item.student?.room?.name || "-" }}</span>
              </div>
            </div>

            <!-- Desc -->
            <div>
              <div class="text-xs font-semibold text-slate-700 mb-0.5">
                {{ item.category }}
              </div>
              <div class="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                {{ item.description || item.notes || "-" }}
              </div>
            </div>
          </div>

          <!-- Footer: Points & Actions -->
          <div
            class="px-3 py-2 bg-slate-50 border-t border-slate-100 flex justify-between items-center ml-1.5"
          >
            <div
              class="font-bold text-lg"
              :class="
                item.type === 'reward' ? 'text-green-600' : 'text-red-600'
              "
            >
              {{ item.type === "reward" ? "+" : "-" }}{{ item.points }}
              <span class="text-xs font-normal text-slate-400">Poin</span>
            </div>

            <div class="flex items-center gap-1">
              <button
                @click.stop="handleEdit(item)"
                class="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-full transition-colors shadow-sm border border-transparent hover:border-slate-200"
                title="Edit"
              >
                <Icon icon="solar:pen-bold" class="w-4 h-4" />
              </button>
              <button
                @click.stop="handleDelete(item)"
                class="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-full transition-colors shadow-sm border border-transparent hover:border-slate-200"
                title="Hapus"
              >
                <Icon icon="solar:trash-bin-trash-bold" class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </template>
    </DataTable>

    <!-- Table: Summary -->
    <DataTable
      v-else
      :loading="loading"
      :items="paginatedSummary"
      :columns="summaryColumns"
      viewMode="table"
      :search="filters.search"
      :hideFilter="true"
      :pagination="{
        page: currentPage,
        limit: itemsPerPage,
        total: filteredSummary.length,
        totalPages: Math.ceil(filteredSummary.length / itemsPerPage),
      }"
      @update:search="filters.search = $event"
      @update:limit="itemsPerPage = $event"
      @page-change="currentPage = $event"
    >
      <template #header-actions></template>

      <template #cell-totalReward="{ item }">
        <span class="text-green-600 font-semibold">{{ item.totalReward }}</span>
      </template>

      <template #cell-totalPunishment="{ item }">
        <span class="text-red-600 font-semibold">{{
          item.totalPunishment
        }}</span>
      </template>

      <template #cell-netPoints="{ item }">
        <span
          class="font-bold"
          :class="item.netPoints >= 0 ? 'text-green-600' : 'text-red-600'"
        >
          {{ item.netPoints > 0 ? "+" : "" }}{{ item.netPoints }}
        </span>
      </template>
    </DataTable>

    <!-- Edit Modal -->
    <div
      v-if="showEditModal"
      class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <div
        class="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div
          class="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10"
        >
          <h3 class="text-lg font-bold text-slate-800">Edit Data</h3>
          <button
            @click="showEditModal = false"
            class="text-slate-400 hover:text-slate-600"
          >
            <Icon icon="solar:close-circle-bold" class="w-6 h-6" />
          </button>
        </div>
        <div>
          <RewardPunishmentForm
            :students="students"
            :rules="rules"
            mode="edit"
            :initialData="editingItem"
            :submitting="submitting"
            @submit="handleStartEditSubmit"
            @cancel="showEditModal = false"
          />
        </div>
      </div>
    </div>

    <StatusModal
      :isOpen="statusModal.isOpen"
      :type="statusModal.status"
      :title="statusModal.title"
      :message="statusModal.message"
      @close="statusModal.isOpen = false"
    />

    <ConfirmModal
      :isOpen="confirmModal.isOpen"
      :title="confirmModal.title"
      :message="confirmModal.message"
      @confirm="confirmModal.onConfirm"
      @cancel="confirmModal.isOpen = false"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from "vue";
import { Icon } from "@iconify/vue";
import StatCard from "@/components/ui/StatCard.vue";
import { rewardsApi, warningsApi, studentsApi, rulesApi } from "@/services/api";
import DataTable from "@/components/ui/DataTable.vue";
import RewardPunishmentForm from "@/components/domain/rewards/RewardPunishmentForm.vue";
import StatusModal from "@/components/ui/StatusModal.vue";
import ConfirmModal from "@/components/ui/ConfirmModal.vue";

const activeTab = ref("history"); // 'history' | 'summary'
const viewMode = ref("table"); // 'table' | 'card'
const rawData = ref([]);
const rawWarnings = ref([]);
const loading = ref(false);

// Pagination State
const currentPage = ref(1);
const itemsPerPage = ref(10);

const filters = reactive({
  search: "",
  type: "all",
  startDate: "",
  endDate: "",
});

// Edit/Delete State
const showEditModal = ref(false);
const editingItem = ref(null);
const submitting = ref(false);
const students = ref([]);
const rules = ref([]);

const statusModal = reactive({
  isOpen: false,
  status: "success",
  title: "",
  message: "",
});

const confirmModal = reactive({
  isOpen: false,
  title: "",
  message: "",
  onConfirm: () => {},
});

// Load dependencies for form
const dependenciesLoaded = ref(false);
async function loadDependencies() {
  if (dependenciesLoaded.value) return;
  try {
    const [sRes, rRes] = await Promise.all([
      studentsApi.getAll(),
      rulesApi.getAll(),
    ]);
    if (sRes.data) {
      if (Array.isArray(sRes.data)) students.value = sRes.data;
      else if (sRes.data.data) students.value = sRes.data.data;
    }
    if (rRes.success) rules.value = rRes.data;
    dependenciesLoaded.value = true;
  } catch (e) {
    console.error("Failed to load dependencies", e);
  }
}

async function handleEdit(item) {
  await loadDependencies();
  editingItem.value = JSON.parse(JSON.stringify(item));
  showEditModal.value = true;
}

function handleDelete(item) {
  confirmModal.title = "Hapus Data";
  confirmModal.message = `Apakah Anda yakin ingin menghapus data ${item.type} ini?`;
  confirmModal.onConfirm = async () => {
    try {
      await rewardsApi.delete(item.id, item.type);
      statusModal.status = "success";
      statusModal.title = "Berhasil";
      statusModal.message = "Data berhasil dihapus";
      statusModal.isOpen = true;
      fetchData();
    } catch (err) {
      statusModal.status = "error";
      statusModal.title = "Gagal";
      statusModal.message = err.message || "Gagal menghapus data";
      statusModal.isOpen = true;
    } finally {
      confirmModal.isOpen = false;
    }
  };
  confirmModal.isOpen = true;
}

async function handleStartEditSubmit(payload) {
  submitting.value = true;
  try {
    const { formData, students: selectedStudents, images } = payload;

    if (selectedStudents.length === 0) throw new Error("Santri harus dipilih");

    const updatePayload = {
      ...formData,
      type: editingItem.value.type, // Strictly use original type
      points: formData.points,
      images: images,
      studentId: selectedStudents[0].id,
    };

    await rewardsApi.update(editingItem.value.id, updatePayload);

    statusModal.status = "success";
    statusModal.title = "Berhasil";
    statusModal.message = "Data berhasil diperbarui";
    statusModal.isOpen = true;
    showEditModal.value = false;
    fetchData();
  } catch (err) {
    statusModal.status = "error";
    statusModal.title = "Gagal";
    statusModal.message = err.message || "Gagal memperbarui data";
    statusModal.isOpen = true;
  } finally {
    submitting.value = false;
  }
}

const historyColumns = [
  { field: "date", label: "Tanggal", sortable: true },
  { field: "student", label: "Santri", sortable: true },
  { field: "class", label: "Kelas/Tingkat", sortable: true },
  { field: "room", label: "Kamar", sortable: true },
  { field: "type", label: "Tipe & Kategori", sortable: true },
  { field: "title", label: "Uraian / Judul", sortable: true },
  { field: "points", label: "Poin", sortable: true, align: "right" },
  { field: "actions", label: "", sortable: false, align: "right" },
];

const summaryColumns = [
  { field: "name", label: "Santri", sortable: true },
  { field: "className", label: "Kelas", sortable: true },
  { field: "roomName", label: "Kamar", sortable: true },
  {
    field: "totalReward",
    label: "Total Reward",
    sortable: true,
    align: "center",
  },
  {
    field: "totalPunishment",
    label: "Total Punishment",
    sortable: true,
    align: "center",
  },
  { field: "netPoints", label: "Poin Bersih", sortable: true, align: "center" },
];

// Helpers
const formatDate = (d) => new Date(d).toLocaleDateString("id-ID");

const baseFilteredData = computed(() => {
  let res = rawData.value;

  // Filter Type
  if (filters.type !== "all") {
    res = res.filter((r) => r.type === filters.type);
  }
  // Filter Search
  if (filters.search) {
    const q = filters.search.toLowerCase();
    res = res.filter(
      (r) =>
        r.student?.fullName?.toLowerCase().includes(q) ||
        r.title?.toLowerCase().includes(q),
    );
  }
  // Filter Date
  if (filters.startDate) {
    res = res.filter((r) => r.date >= filters.startDate);
  }
  if (filters.endDate) {
    res = res.filter((r) => r.date <= filters.endDate);
  }
  return res;
});

const uniqueStudents = computed(() => {
  return new Set(baseFilteredData.value.map((r) => r.studentId)).size;
});
const totalRewards = computed(
  () => baseFilteredData.value.filter((r) => r.type === "reward").length,
);
const totalPunishments = computed(
  () => baseFilteredData.value.filter((r) => r.type === "punishment").length,
);

const totalSP = computed(() => {
  let res = rawWarnings.value;

  // Apply filters
  // Type: if 'reward', excluded. if 'all' or 'punishment', included.
  if (filters.type === "reward") return 0;

  // Search
  if (filters.search) {
    const q = filters.search.toLowerCase();
    res = res.filter(
      (w) =>
        w.student?.fullName?.toLowerCase().includes(q) ||
        w.student?.nis?.toLowerCase().includes(q),
    );
  }

  // Date
  if (filters.startDate) {
    res = res.filter((w) => w.issueDate >= filters.startDate);
  }
  if (filters.endDate) {
    res = res.filter((w) => w.issueDate <= filters.endDate);
  }

  return res.length;
});

const filteredHistory = computed(() => {
  // Sort Date DESC
  return [...baseFilteredData.value].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );
});

const paginatedHistory = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredHistory.value.slice(start, end);
});

const filteredSummary = computed(() => {
  // Group by student
  const map = {}; // studentId -> { name, className, totalReward, totalPunishment }

  // Use filteredHistory so summary reflects filters (e.g. date range)
  const source = filteredHistory.value;

  for (const r of source) {
    if (!map[r.studentId]) {
      map[r.studentId] = {
        studentId: r.studentId,
        name: r.student?.fullName || r.studentId,
        nis: r.student?.nis,
        className: r.student?.class?.name,
        grade: r.student?.class?.grade,
        roomName: r.student?.room?.name || "-",
        totalReward: 0,
        totalPunishment: 0,
      };
    }
    if (r.type === "reward") map[r.studentId].totalReward += r.points;
    else map[r.studentId].totalPunishment += r.points;
  }

  const res = Object.values(map)
    .map((s) => ({
      ...s,
      netPoints: s.totalReward - s.totalPunishment,
    }))
    .sort((a, b) => b.netPoints - a.netPoints);

  return res;
});

const paginatedSummary = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredSummary.value.slice(start, end);
});

// Watch activeTab to reset page
watch(activeTab, () => {
  currentPage.value = 1;
});

async function fetchData() {
  loading.value = true;
  try {
    const [rewardsRes, warningsRes] = await Promise.all([
      rewardsApi.getAll(),
      warningsApi.getAll(),
    ]);

    if (rewardsRes.data && Array.isArray(rewardsRes.data)) {
      rawData.value = rewardsRes.data;
    }
    if (warningsRes.success && Array.isArray(warningsRes.data)) {
      rawWarnings.value = warningsRes.data;
    }
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
}

function printReport() {
  window.print();
}

onMounted(() => {
  fetchData();
});
</script>
