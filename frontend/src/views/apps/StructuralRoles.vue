<template>
  <div class="space-y-4">
    <!-- Top Info & Tabs Bar -->
    <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-xl bg-amber-50 text-[#602515] flex items-center justify-center shrink-0 mt-0.5">
          <Icon icon="solar:user-id-bold-duotone" class="text-2xl" />
        </div>
        <div>
          <h2 class="font-bold text-slate-800 text-base">
            Pengaturan Jabatan Struktural Pesantren
          </h2>
          <p class="text-xs text-slate-500 leading-relaxed">
            Kelola jabatan struktural & PJ (Mudir, Kepala MS, Kabag Pendidikan & Kurikulum, Kepala/PJ Tahfizh, dll.) secara
            <strong>terpisah dari Divisi Gaji Kepegawaian</strong>. Satu guru dapat memegang lebih dari satu jabatan struktural.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 shrink-0 flex-wrap">
        <button
          @click="handleSeedDefaults"
          :disabled="seeding"
          class="px-3.5 py-2 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          title="Isi otomatis master Unit & Jabatan sesuai struktur Pondok Pesantren"
        >
          <Icon
            :icon="seeding ? 'solar:spinner-bold' : 'solar:magic-stick-3-bold-duotone'"
            :class="{ 'animate-spin': seeding }"
            class="text-base"
          />
          <span>{{ seeding ? "Memuat..." : "Muat Struktur Default PPMH" }}</span>
        </button>

        <div class="inline-flex rounded-lg bg-slate-100 p-1">
          <button
            @click="activeTab = 'roles'"
            class="px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
            :class="
              activeTab === 'roles'
                ? 'bg-[#602515] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            "
          >
            Jabatan & Pejabat ({{ roles.length }})
          </button>
          <button
            @click="activeTab = 'units'"
            class="px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
            :class="
              activeTab === 'units'
                ? 'bg-[#602515] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            "
          >
            Unit / Bagian ({{ units.length }})
          </button>
        </div>
      </div>
    </div>

    <!-- TAB 1: JABATAN STRUKTURAL & PENUGASAN GURU -->
    <div v-if="activeTab === 'roles'">
      <DataTable
        title="Jabatan Struktural & PJ"
        description="Atur daftar jabatan struktural pesantren, hak akses backdate tahfizh, dan guru yang menjabat"
        icon="solar:medal-star-bold-duotone"
        :columns="roleColumns"
        :items="paginatedRoles"
        :loading="loadingRoles"
        :pagination="rolePagination"
        :viewMode="viewMode"
        :searchQuery="searchQuery"
        @search="onSearchInput"
        @update:limit="changeLimit"
        @page-change="changePage"
        @update:viewMode="(v) => (viewMode = v)"
      >
        <template #header-actions>
          <button
            @click="openCreateRole"
            class="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-all shadow-sm hover:shadow-md"
            style="background: #602515"
          >
            <Icon icon="solar:add-circle-bold-duotone" class="text-lg" />
            <span>Tambah Jabatan</span>
          </button>
        </template>

        <!-- Cell: Unit -->
        <template #cell-unitName="{ item }">
          <span
            v-if="item.defaultUnitName"
            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700"
          >
            {{ item.defaultUnitName }}
          </span>
          <span v-else class="text-xs text-slate-400">-</span>
        </template>

        <!-- Cell: Backdate Tahfizh Permission -->
        <template #cell-canBackdateTahfidz="{ item }">
          <span
            v-if="item.canBackdateTahfidz"
            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
          >
            <Icon icon="solar:verified-check-bold" class="text-sm" />
            Bisa Approve & Input Backdate
          </span>
          <span v-else class="text-xs text-slate-400">Standar</span>
        </template>

        <!-- Cell: Members / Pejabat -->
        <template #cell-members="{ item }">
          <button
            @click="openAssigneesModal(item)"
            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors border border-amber-200"
          >
            <Icon icon="solar:users-group-rounded-bold-duotone" class="text-sm" />
            {{ item.activeAssigneesCount || 0 }} guru menjabat
          </button>
        </template>

        <!-- Cell: Action -->
        <template #cell-action="{ item }">
          <div class="flex items-center gap-1">
            <button
              @click="openAssigneesModal(item)"
              class="p-2 rounded-lg hover:bg-amber-50 text-slate-500 hover:text-[#602515] transition-colors"
              title="Kelola Guru yang Menjabat"
            >
              <Icon icon="solar:user-plus-bold-duotone" />
            </button>
            <button
              @click="openEditRole(item)"
              class="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-amber-600 transition-colors"
              title="Edit Jabatan"
            >
              <Icon icon="solar:pen-2-bold-duotone" />
            </button>
            <button
              @click="confirmDeleteRole(item)"
              class="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-600 transition-colors"
              title="Hapus Jabatan"
            >
              <Icon icon="solar:trash-bin-trash-bold-duotone" />
            </button>
          </div>
        </template>

        <!-- Grid View Card -->
        <template #card-item="{ item }">
          <div class="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow flex flex-col relative">
            <div class="absolute top-3 right-3 flex gap-1">
              <button
                @click="openEditRole(item)"
                class="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
              >
                <Icon icon="solar:pen-2-bold-duotone" class="text-lg" />
              </button>
              <button
                @click="confirmDeleteRole(item)"
                class="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              >
                <Icon icon="solar:trash-bin-trash-bold-duotone" class="text-lg" />
              </button>
            </div>

            <div class="mb-3 pr-14">
              <span class="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                {{ item.code }}
              </span>
              <h3 class="font-bold text-slate-800 text-base mt-1.5">
                {{ item.name }}
              </h3>
              <p class="text-xs text-slate-500 mt-0.5">
                Unit: <strong>{{ item.defaultUnitName || "Lintas Unit" }}</strong>
              </p>
            </div>

            <div class="mb-3">
              <span
                v-if="item.canBackdateTahfidz"
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
              >
                <Icon icon="solar:verified-check-bold" />
                Akses Approve & Backdate Tahfizh
              </span>
            </div>

            <p class="text-xs text-slate-600 mb-4 line-clamp-2 min-h-[32px]">
              {{ item.description || "Tidak ada deskripsi" }}
            </p>

            <div class="mt-auto pt-3 border-t">
              <button
                @click="openAssigneesModal(item)"
                class="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#602515] hover:bg-[#4a1c10] text-white transition-colors text-xs font-semibold"
              >
                <Icon icon="solar:users-group-rounded-bold-duotone" />
                Kelola Pejabat ({{ item.activeAssigneesCount || 0 }} Guru)
              </button>
            </div>
          </div>
        </template>
      </DataTable>
    </div>

    <!-- TAB 2: UNIT / BAGIAN ORGANISASI -->
    <div v-else>
      <DataTable
        title="Unit & Bagian Struktural"
        description="Hierarki unit organisasi pesantren (Lembaga, Divisi Pendidikan, Madrasah, Bagian, Unit PJ)"
        icon="solar:buildings-3-bold-duotone"
        :columns="unitColumns"
        :items="units"
        :loading="loadingUnits"
        :viewMode="viewMode"
        :searchQuery="unitSearchQuery"
        @search="(q) => (unitSearchQuery = q)"
        @update:viewMode="(v) => (viewMode = v)"
      >
        <template #header-actions>
          <button
            @click="openCreateUnit"
            class="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-all shadow-sm hover:shadow-md"
            style="background: #602515"
          >
            <Icon icon="solar:add-circle-bold-duotone" class="text-lg" />
            <span>Tambah Unit / Bagian</span>
          </button>
        </template>

        <template #cell-type="{ item }">
          <span class="px-2.5 py-1 rounded-md text-xs font-semibold uppercase bg-amber-50 text-amber-800">
            {{ formatUnitType(item.type) }}
          </span>
        </template>

        <template #cell-parent="{ item }">
          <span class="text-xs text-slate-600">
            {{ getUnitNameById(item.parentId) || "-" }}
          </span>
        </template>

        <template #cell-action="{ item }">
          <div class="flex items-center gap-1">
            <button
              @click="openEditUnit(item)"
              class="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-amber-600 transition-colors"
            >
              <Icon icon="solar:pen-2-bold-duotone" />
            </button>
            <button
              @click="deleteUnitItem(item)"
              class="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-600 transition-colors"
            >
              <Icon icon="solar:trash-bin-trash-bold-duotone" />
            </button>
          </div>
        </template>
      </DataTable>
    </div>

    <!-- MODAL CREATE / EDIT JABATAN STRUKTURAL -->
    <Teleport to="body">
      <div
        v-if="roleModal.show"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      >
        <div class="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
          <div class="p-4 border-b flex items-center justify-between bg-slate-50">
            <h3 class="font-bold text-slate-800">
              {{ roleModal.mode === "create" ? "Tambah Jabatan Struktural" : "Edit Jabatan Struktural" }}
            </h3>
            <button @click="roleModal.show = false" class="p-1.5 rounded-lg hover:bg-slate-200">
              <Icon icon="solar:close-circle-line-duotone" class="text-xl text-slate-500" />
            </button>
          </div>

          <form @submit.prevent="submitRoleForm" class="p-6 space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nama Jabatan *
                </label>
                <input
                  v-model="roleForm.name"
                  @input="autoFillRoleCode"
                  type="text"
                  required
                  placeholder="Contoh: Kepala PJ Tahfizh"
                  class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#602515]"
                />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Kode Jabatan *
                </label>
                <input
                  v-model="roleForm.code"
                  type="text"
                  required
                  placeholder="Contoh: KEPALA_PJ_TAHFIZH"
                  class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:border-[#602515]"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Unit / Bagian Default
                </label>
                <select
                  v-model="roleForm.defaultUnitId"
                  class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#602515]"
                >
                  <option :value="null">-- Pilih Unit / Bagian --</option>
                  <option v-for="u in units" :key="u.id" :value="u.id">
                    {{ u.name }} ({{ u.code }})
                  </option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Cakupan & Level Hierarki
                </label>
                <select
                  v-model.number="roleForm.rankLevel"
                  class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#602515]"
                >
                  <option :value="1">Level 1 - Pimpinan Pesantren (Mudir/Sekretaris)</option>
                  <option :value="2">Level 2 - Kepala Divisi / Kabag (MS, Pendulum, dll.)</option>
                  <option :value="3">Level 3 - Kepala Sekolah / Kepala PJ</option>
                  <option :value="4">Level 4 - Anggota PJ / Koordinator Unit</option>
                  <option :value="5">Level 5 - Fungsional (Wali Kelas / Pengajar / Musyrif)</option>
                </select>
              </div>
            </div>

            <div class="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
              <label class="flex items-start gap-3 cursor-pointer">
                <input
                  v-model="roleForm.canBackdateTahfidz"
                  type="checkbox"
                  class="mt-1 w-4 h-4 accent-[#602515] rounded"
                />
                <div>
                  <span class="block text-sm font-bold text-emerald-950">
                    Hak Akses Konfirmasi (Approve) & Input Backdate Tahfizh
                  </span>
                  <span class="block text-xs text-emerald-800 mt-0.5">
                    Centang jika pejabat di role ini (seperti Kepala PJ Tahfizh, PJ Tahfizh, Kabag Pendidikan & Kurikulum, Kepala MS, Mudir) berhak meng-approve pengajuan izin input tahfizh yang terlewat dan bebas input tanggal mundur.
                  </span>
                </div>
              </label>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
                Deskripsi
              </label>
              <textarea
                v-model="roleForm.description"
                rows="2"
                placeholder="Keterangan tugas jabatan..."
                class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#602515]"
              ></textarea>
            </div>

            <div class="pt-4 border-t flex justify-end gap-2">
              <button
                type="button"
                @click="roleModal.show = false"
                class="px-4 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                :disabled="saving"
                class="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#602515] hover:bg-[#4a1c10] disabled:opacity-50"
              >
                {{ saving ? "Menyimpan..." : "Simpan Jabatan" }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- MODAL CREATE / EDIT UNIT STRUKTURAL -->
    <Teleport to="body">
      <div
        v-if="unitModal.show"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      >
        <div class="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
          <div class="p-4 border-b flex items-center justify-between bg-slate-50">
            <h3 class="font-bold text-slate-800">
              {{ unitModal.mode === "create" ? "Tambah Unit / Bagian" : "Edit Unit / Bagian" }}
            </h3>
            <button @click="unitModal.show = false" class="p-1.5 rounded-lg hover:bg-slate-200">
              <Icon icon="solar:close-circle-line-duotone" class="text-xl text-slate-500" />
            </button>
          </div>

          <form @submit.prevent="submitUnitForm" class="p-6 space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nama Unit / Bagian *
                </label>
                <input
                  v-model="unitForm.name"
                  type="text"
                  required
                  placeholder="Contoh: Bagian Pendulum"
                  class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Kode Unit *
                </label>
                <input
                  v-model="unitForm.code"
                  type="text"
                  required
                  placeholder="Contoh: BAG_PENDULUM"
                  class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono uppercase"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tipe Unit
                </label>
                <select
                  v-model="unitForm.type"
                  class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="institution">Lembaga Induk (PPMH)</option>
                  <option value="division">Divisi Pendidikan (MS, MT, MI, dll.)</option>
                  <option value="madrasah">Homabase Madrasah (MA, MTs, MU, MD)</option>
                  <option value="department">Bagian (Pendulum, Pengasuhan)</option>
                  <option value="unit">Unit / PJ (PJ Tahfizh, PJ Bahasa, dll.)</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Unit Induk (Parent)
                </label>
                <select
                  v-model="unitForm.parentId"
                  class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option :value="null">-- Tanpa Induk (Root) --</option>
                  <option v-for="u in units" :key="u.id" :value="u.id">
                    {{ u.name }}
                  </option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
                Deskripsi
              </label>
              <textarea
                v-model="unitForm.description"
                rows="2"
                class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              ></textarea>
            </div>

            <div class="pt-4 border-t flex justify-end gap-2">
              <button
                type="button"
                @click="unitModal.show = false"
                class="px-4 py-2 border rounded-lg text-sm text-slate-600"
              >
                Batal
              </button>
              <button
                type="submit"
                :disabled="saving"
                class="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#602515]"
              >
                {{ saving ? "Menyimpan..." : "Simpan Unit" }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- SIDE-BY-SIDE PICKER: KELOLA PEJABAT / GURU PADA JABATAN STRUKTURAL -->
    <SideBySidePicker
      :show="assigneesModal.show"
      :title="`Pejabat: ${assigneesModal.roleItem?.name || ''}`"
      header-icon="solar:medal-star-bold-duotone"
      available-title="Daftar Guru (Bisa Rangkap Jabatan)"
      selected-title="Guru yang Menjabat"
      item-label="guru"
      :available-items="availableTeachersForRole"
      :selected-items="assigneesModal.assignees"
      display-field="fullName"
      sub-field="nip"
      meta-field="payrollDivisionLabel"
      :loading-available="loadingTeachers"
      :loading-selected="assigneesModal.loading"
      :error="assigneesModal.error"
      @close="closeAssigneesModal"
      @add="addTeacherToRole"
      @remove="removeTeacherFromRole"
    />

    <!-- Confirm Delete Role -->
    <ConfirmModal
      :isOpen="confirmDelete.show"
      title="Hapus Jabatan Struktural"
      :message="`Yakin ingin menghapus jabatan '${confirmDelete.item?.name}'?`"
      confirmText="Ya, Hapus"
      cancelText="Batal"
      @confirm="executeDeleteRole"
      @cancel="confirmDelete.show = false"
    />

    <!-- Status Modal -->
    <StatusModal
      :isOpen="statusModal.show"
      :type="statusModal.type"
      :title="statusModal.title"
      :message="statusModal.message"
      @close="statusModal.show = false"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { Icon } from "@iconify/vue";
import DataTable from "@/components/ui/DataTable.vue";
import SideBySidePicker from "@/components/ui/SideBySidePicker.vue";
import ConfirmModal from "@/components/ui/ConfirmModal.vue";
import StatusModal from "@/components/ui/StatusModal.vue";
import { structuralApi, teachersApi } from "@/services/api";

const activeTab = ref("roles");
const viewMode = ref("list");
const searchQuery = ref("");
const unitSearchQuery = ref("");

const roles = ref([]);
const units = ref([]);
const allTeachers = ref([]);

const loadingRoles = ref(false);
const loadingUnits = ref(false);
const loadingTeachers = ref(false);
const saving = ref(false);
const seeding = ref(false);

const rolePagination = reactive({
  page: 1,
  limit: 15,
  total: 0,
  totalPages: 1,
});

const roleColumns = [
  { key: "name", label: "Nama Jabatan Struktural", sortable: true },
  { key: "code", label: "Kode", sortable: true },
  { key: "unitName", label: "Unit / Bagian Induk" },
  { key: "canBackdateTahfidz", label: "Otoritas Tahfizh" },
  { key: "members", label: "Pejabat Aktif" },
  { key: "action", label: "Aksi" },
];

const unitColumns = [
  { key: "name", label: "Nama Unit / Bagian", sortable: true },
  { key: "code", label: "Kode", sortable: true },
  { key: "type", label: "Tipe" },
  { key: "parent", label: "Unit Induk" },
  { key: "description", label: "Deskripsi" },
  { key: "action", label: "Aksi" },
];

const statusModal = reactive({
  show: false,
  type: "success",
  title: "",
  message: "",
});

function showNotice(type, title, message) {
  statusModal.type = type;
  statusModal.title = title;
  statusModal.message = message;
  statusModal.show = true;
}

const filteredRoles = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return roles.value;
  return roles.value.filter(
    (r) =>
      r.name.toLowerCase().includes(q) ||
      r.code.toLowerCase().includes(q) ||
      (r.defaultUnitName || "").toLowerCase().includes(q)
  );
});

const paginatedRoles = computed(() => {
  const total = filteredRoles.value.length;
  rolePagination.total = total;
  rolePagination.totalPages = Math.max(1, Math.ceil(total / rolePagination.limit));
  const start = (rolePagination.page - 1) * rolePagination.limit;
  return filteredRoles.value.slice(start, start + rolePagination.limit);
});

function onSearchInput(q) {
  searchQuery.value = q;
  rolePagination.page = 1;
}
function changeLimit(l) {
  rolePagination.limit = l;
  rolePagination.page = 1;
}
function changePage(p) {
  rolePagination.page = p;
}

function getUnitNameById(id) {
  if (!id) return null;
  const found = units.value.find((u) => u.id === id);
  return found ? found.name : null;
}

function formatUnitType(type) {
  const map = {
    institution: "Lembaga Induk",
    division: "Divisi Pendidikan",
    madrasah: "Homabase Madrasah",
    department: "Bagian",
    unit: "Unit / PJ",
  };
  return map[type] || type;
}

async function loadAllData() {
  loadingRoles.value = true;
  loadingUnits.value = true;
  try {
    const [rolesRes, unitsRes] = await Promise.all([
      structuralApi.getRoles({ activeOnly: "false" }),
      structuralApi.getUnits({ activeOnly: "false" }),
    ]);
    roles.value = rolesRes?.data || [];
    units.value = unitsRes?.data || [];
  } catch (e) {
    console.error("Failed to load structural data:", e);
  } finally {
    loadingRoles.value = false;
    loadingUnits.value = false;
  }
}

async function handleSeedDefaults() {
  seeding.value = true;
  try {
    const res = await structuralApi.seedDefaults();
    await loadAllData();
    showNotice(
      "success",
      "Struktur Default Berhasil Dimuat",
      res.message ||
        "Master Unit & Jabatan Struktural (termasuk Kepala Bagian Pendidikan & Kurikulum, Kepala PJ Tahfizh, PJ Tahfizh, dll.) siap digunakan."
    );
  } catch (e) {
    showNotice("failed", "Gagal Memuat Default", e.message || "Terjadi kesalahan");
  } finally {
    seeding.value = false;
  }
}

// --- Role Modal ---
const roleModal = reactive({ show: false, mode: "create", id: null });
const roleForm = reactive({
  code: "",
  name: "",
  scope: "unit",
  rankLevel: 3,
  defaultUnitId: null,
  canBackdateTahfidz: false,
  description: "",
});

function autoFillRoleCode() {
  if (roleModal.mode === "create") {
    roleForm.code = roleForm.name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 50);
  }
}

function openCreateRole() {
  roleModal.mode = "create";
  roleModal.id = null;
  roleForm.code = "";
  roleForm.name = "";
  roleForm.scope = "unit";
  roleForm.rankLevel = 3;
  roleForm.defaultUnitId = null;
  roleForm.canBackdateTahfidz = false;
  roleForm.description = "";
  roleModal.show = true;
}

function openEditRole(item) {
  roleModal.mode = "edit";
  roleModal.id = item.id;
  roleForm.code = item.code;
  roleForm.name = item.name;
  roleForm.scope = item.scope || "unit";
  roleForm.rankLevel = item.rankLevel ?? 3;
  roleForm.defaultUnitId = item.defaultUnitId ?? null;
  roleForm.canBackdateTahfidz = !!item.canBackdateTahfidz;
  roleForm.description = item.description || "";
  roleModal.show = true;
}

async function submitRoleForm() {
  saving.value = true;
  try {
    const payload = {
      code: roleForm.code.trim().toUpperCase(),
      name: roleForm.name.trim(),
      scope: roleForm.scope,
      rankLevel: roleForm.rankLevel,
      defaultUnitId: roleForm.defaultUnitId || null,
      canBackdateTahfidz: roleForm.canBackdateTahfidz,
      description: roleForm.description || null,
    };

    if (roleModal.mode === "create") {
      await structuralApi.createRole(payload);
    } else {
      await structuralApi.updateRole(roleModal.id, payload);
    }

    roleModal.show = false;
    await loadAllData();
    showNotice("success", "Berhasil", "Data jabatan struktural berhasil disimpan.");
  } catch (e) {
    showNotice("failed", "Gagal Menyimpan", e.message || "Terjadi kesalahan");
  } finally {
    saving.value = false;
  }
}

const confirmDelete = reactive({ show: false, item: null });
function confirmDeleteRole(item) {
  confirmDelete.item = item;
  confirmDelete.show = true;
}
async function executeDeleteRole() {
  if (!confirmDelete.item) return;
  try {
    await structuralApi.deleteRole(confirmDelete.item.id);
    confirmDelete.show = false;
    await loadAllData();
    showNotice("success", "Berhasil", "Jabatan struktural berhasil dihapus.");
  } catch (e) {
    confirmDelete.show = false;
    showNotice("failed", "Gagal Menghapus", e.message || "Terjadi kesalahan");
  }
}

// --- Unit Modal ---
const unitModal = reactive({ show: false, mode: "create", id: null });
const unitForm = reactive({
  code: "",
  name: "",
  type: "unit",
  parentId: null,
  description: "",
});

function openCreateUnit() {
  unitModal.mode = "create";
  unitModal.id = null;
  unitForm.code = "";
  unitForm.name = "";
  unitForm.type = "unit";
  unitForm.parentId = null;
  unitForm.description = "";
  unitModal.show = true;
}

function openEditUnit(item) {
  unitModal.mode = "edit";
  unitModal.id = item.id;
  unitForm.code = item.code;
  unitForm.name = item.name;
  unitForm.type = item.type || "unit";
  unitForm.parentId = item.parentId ?? null;
  unitForm.description = item.description || "";
  unitModal.show = true;
}

async function submitUnitForm() {
  saving.value = true;
  try {
    const payload = {
      code: unitForm.code.trim().toUpperCase(),
      name: unitForm.name.trim(),
      type: unitForm.type,
      parentId: unitForm.parentId || null,
      description: unitForm.description || null,
    };
    if (unitModal.mode === "create") {
      await structuralApi.createUnit(payload);
    } else {
      await structuralApi.updateUnit(unitModal.id, payload);
    }
    unitModal.show = false;
    await loadAllData();
    showNotice("success", "Berhasil", "Unit/Bagian struktural berhasil disimpan.");
  } catch (e) {
    showNotice("failed", "Gagal Menyimpan", e.message || "Terjadi kesalahan");
  } finally {
    saving.value = false;
  }
}

async function deleteUnitItem(item) {
  try {
    await structuralApi.deleteUnit(item.id);
    await loadAllData();
    showNotice("success", "Berhasil", "Unit berhasil dihapus.");
  } catch (e) {
    showNotice("failed", "Tidak Dapat Dihapus", e.message || "Pastikan unit tidak memiliki sub-unit.");
  }
}

// --- Assignees (Side-by-Side Picker) ---
const assigneesModal = reactive({
  show: false,
  roleItem: null,
  assignees: [], // Array of { id: teacherId, assignmentId, fullName, nip }
  loading: false,
  error: "",
});

async function ensureTeachersLoaded() {
  if (allTeachers.value.length > 0) return;
  loadingTeachers.value = true;
  try {
    const res = await teachersApi.getAll({ limit: 500 });
    allTeachers.value = (res?.data || []).map((t) => ({
      ...t,
      payrollDivisionLabel: t.divisionName ? `Divisi Gaji: ${t.divisionName}` : "Tanpa Divisi Gaji",
    }));
  } catch (e) {
    console.error("Failed to load teachers:", e);
  } finally {
    loadingTeachers.value = false;
  }
}

const availableTeachersForRole = computed(() => {
  const assignedIds = new Set(assigneesModal.assignees.map((a) => a.id));
  return allTeachers.value.filter((t) => !assignedIds.has(t.id));
});

async function openAssigneesModal(roleItem) {
  assigneesModal.roleItem = roleItem;
  assigneesModal.error = "";
  assigneesModal.show = true;
  assigneesModal.loading = true;

  await ensureTeachersLoaded();

  try {
    const res = await structuralApi.getRoleById(roleItem.id);
    const rawHolders = res?.data?.holders || res?.data?.assignments || [];
    assigneesModal.assignees = rawHolders
      .filter((a) => a.status === "active")
      .map((a) => ({
        id: a.teacherId || a.id,
        assignmentId: a.assignmentId || a.id,
        fullName: a.fullName || a.teacherName,
        nip: a.nip || a.teacherNip || "-",
        payrollDivisionLabel: a.unitName || roleItem.defaultUnitName || "",
      }));
  } catch (e) {
    assigneesModal.error = e.message || "Gagal memuat pejabat";
  } finally {
    assigneesModal.loading = false;
  }
}

function closeAssigneesModal() {
  assigneesModal.show = false;
  assigneesModal.roleItem = null;
  assigneesModal.assignees = [];
  loadAllData();
}

async function addTeacherToRole(teacher) {
  if (!assigneesModal.roleItem || assigneesModal.loading) return;
  assigneesModal.error = "";
  assigneesModal.loading = true;
  try {
    await structuralApi.createAssignment({
      teacherId: teacher.id,
      structuralRoleId: assigneesModal.roleItem.id,
      structuralUnitId: assigneesModal.roleItem.defaultUnitId || null,
      status: "active",
    });
    await openAssigneesModal(assigneesModal.roleItem);
  } catch (e) {
    assigneesModal.error = e.message || "Gagal menambahkan guru ke jabatan ini";
    assigneesModal.loading = false;
  }
}

async function removeTeacherFromRole(assigneeItem) {
  if (!assigneeItem?.assignmentId || assigneesModal.loading) return;
  assigneesModal.error = "";
  assigneesModal.loading = true;
  try {
    await structuralApi.deleteAssignment(assigneeItem.assignmentId);
    await openAssigneesModal(assigneesModal.roleItem);
  } catch (e) {
    assigneesModal.error = e.message || "Gagal mencopot jabatan";
    assigneesModal.loading = false;
  }
}

onMounted(() => {
  loadAllData();
});
</script>
