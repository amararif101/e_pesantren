<template>
  <div>
    <!-- Data Table -->
    <DataTable
      title="Guru / Ustadz"
      description="Kelola data guru dan tenaga pengajar"
      icon="solar:square-academic-cap-bold-duotone"
      :columns="columns"
      :items="teachers"
      :loading="loading"
      :pagination="pagination"
      :viewMode="viewMode"
      :search="searchQuery"
      @update:search="onSearchInput"
      @update:limit="changeLimit"
      @page-change="changePage"
      @update:viewMode="(v) => (viewMode = v)"
    >
      <!-- Filters Slot -->
      <template #filters="{ close }">
        <div class="space-y-4">
          <h3 class="font-semibold text-slate-800">Filter Data</h3>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1"
              >Status</label
            >
            <select
              v-model="statusFilter"
              class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#602515]"
            >
              <option value="">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Tidak Aktif</option>
              <option value="retired">Pensiun</option>
            </select>
          </div>

          <div class="pt-2 flex gap-2">
            <button
              @click="resetFilters"
              class="flex-1 px-3 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Reset
            </button>
            <button
              @click="close"
              class="flex-1 px-3 py-2 text-sm text-white bg-[#602515] hover:bg-[#4a1d10] rounded-lg transition-colors"
            >
              Terapkan
            </button>
          </div>
        </div>
      </template>

      <!-- Header Actions -->
      <template #header-actions>
        <div class="flex items-center gap-3">
          <button
            @click="openImport"
            class="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-green-50 text-green-700 hover:bg-green-100 transition-colors border border-green-200"
          >
            <Icon icon="solar:file-send-bold-duotone" class="text-lg" />
            <span>Import Excel</span>
          </button>

          <button
            @click="openCreate"
            class="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-all shadow-sm hover:shadow-md"
            style="background: #602515"
          >
            <Icon icon="solar:add-circle-bold-duotone" class="text-lg" />
            <span>Tambah Guru</span>
          </button>
        </div>
      </template>

      <!-- existing view modal ... -->
      <template #cell-fullName="{ item }">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-full bg-[#602515] text-white flex items-center justify-center text-sm font-medium border border-slate-100"
          >
            {{ getInitials(item.fullName) }}
          </div>
          <div>
            <div class="font-medium text-slate-800">{{ item.fullName }}</div>
            <div class="text-xs text-slate-500 font-mono">
              {{ item.nip || "Tanpa NIP" }}
            </div>
          </div>
        </div>
      </template>

      <!-- Cell: Status -->
      <template #cell-status="{ item }">
        <span
          class="px-2.5 py-1 rounded-full text-xs font-medium"
          :class="{
            'bg-green-100 text-green-800': item.status === 'active',
            'bg-red-100 text-red-800': item.status === 'inactive',
            'bg-slate-100 text-slate-800': item.status === 'retired',
          }"
        >
          {{
            item.status === "active"
              ? "Aktif"
              : item.status === "inactive"
              ? "Tidak Aktif"
              : "Pensiun"
          }}
        </span>
      </template>

      <!-- Cell: Type -->
      <template #cell-employeeType="{ item }">
        <span
          class="px-2.5 py-1 rounded-full text-xs font-medium"
          :class="{
            'bg-[#fef3c7] text-[#92400e]': item.employeeType === 'teacher',
            'bg-blue-100 text-blue-800': item.employeeType === 'staff',
          }"
        >
          {{ item.employeeType === "teacher" ? "Guru" : "Staff" }}
        </span>
      </template>

      <!-- Cell: Divisions (Department) -->
      <template #cell-department="{ item }">
        <div class="flex flex-wrap gap-1">
          <span
            v-for="div in item.divisions"
            :key="div.id"
            class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 border border-amber-100"
          >
            {{ div.name }}
          </span>
          <span v-if="!item.divisions?.length" class="text-slate-400">-</span>
        </div>
      </template>

      <!-- Cell: Action -->
      <template #cell-action="{ item }">
        <div class="flex items-center gap-1">
          <button
            @click="openView(item)"
            class="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            title="Lihat"
          >
            <Icon icon="solar:eye-bold-duotone" />
          </button>
          <button
            @click="openEdit(item)"
            class="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            title="Edit"
          >
            <Icon icon="solar:pen-2-bold-duotone" />
          </button>
          <button
            @click="confirmDelete(item)"
            class="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-600 transition-colors"
            title="Hapus"
          >
            <Icon icon="solar:trash-bin-trash-bold-duotone" />
          </button>
        </div>
      </template>
      <!-- Grid View Template -->
      <template #card-item="{ item }">
        <div
          class="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow flex flex-col items-center text-center relative group"
        >
          <div class="absolute top-3 right-3 flex gap-1 opacity-100">
            <button
              @click="openEdit(item)"
              class="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
            >
              <Icon icon="solar:pen-2-bold-duotone" class="text-lg" />
            </button>
            <button
              @click="confirmDelete(item)"
              class="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            >
              <Icon icon="solar:trash-bin-trash-bold-duotone" class="text-lg" />
            </button>
          </div>

          <div
            class="w-20 h-20 rounded-full bg-[#602515] text-white flex items-center justify-center text-2xl font-bold mb-3 shadow-md border-4 border-white"
          >
            {{ getInitials(item.fullName) }}
          </div>

          <h3
            class="text-lg font-bold text-slate-800 line-clamp-1 w-full"
            :title="item.fullName"
          >
            {{ item.fullName }}
          </h3>
          <p
            class="text-sm font-mono text-slate-500 mb-3 bg-slate-100 px-2 py-0.5 rounded"
          >
            {{ item.nip || "NIP: -" }}
          </p>

          <div class="w-full space-y-2 text-sm">
            <div class="flex items-center justify-between text-slate-600">
              <span class="text-xs text-slate-400">Jabatan</span>
              <span class="font-medium truncate max-w-[60%]">{{
                item.position || "-"
              }}</span>
            </div>
            <div class="flex items-center justify-between text-slate-600">
              <span class="text-xs text-slate-400">Divisi</span>
              <div
                class="font-medium truncate max-w-[60%] flex gap-1 flex-wrap justify-end"
              >
                <span
                  v-if="item.divisions?.length"
                  v-for="(div, i) in item.divisions"
                  :key="i"
                  class="bg-amber-50 text-amber-900 px-1.5 py-0.5 rounded text-[10px] border border-amber-100"
                >
                  {{ div.name }}
                </span>
                <span v-else>-</span>
              </div>
            </div>
          </div>

          <div
            class="mt-4 pt-3 border-t w-full flex items-center justify-between"
          >
            <span
              class="px-2.5 py-1 rounded-full text-xs font-medium"
              :class="{
                'bg-green-100 text-green-800': item.status === 'active',
                'bg-red-100 text-red-800': item.status === 'inactive',
                'bg-slate-100 text-slate-800': item.status === 'retired',
              }"
            >
              {{
                item.status === "active"
                  ? "Aktif"
                  : item.status === "inactive"
                  ? "Tidak Aktif"
                  : "Pensiun"
              }}
            </span>
            <button
              @click="openView(item)"
              class="text-[#602515] text-sm font-medium hover:underline flex items-center gap-1"
            >
              Detail <Icon icon="solar:arrow-right-line-duotone" />
            </button>
          </div>
        </div>
      </template>
    </DataTable>
    <!-- Import Modal (Reusable) -->
    <ImportModal
      v-model:isOpen="showImportModal"
      title="Import Data Guru"
      :apiPreview="teachersApi.importPreview"
      :apiImport="teachersApi.import"
      :templateHeader="teacherImportTemplate"
      templateName="template_guru"
      requiredColumns="NIP, Nama Lengkap, Jabatan, Divisi, Email, Status"
      @success="onImportSuccess"
    />

    <!-- Create/Edit Modal -->
    <Teleport to="body">
      <div
        v-if="modal.show"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      >
        <div
          class="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          <!-- Header -->
          <div class="p-4 border-b flex items-center justify-between">
            <h3 class="text-lg font-semibold text-slate-800">
              {{ modal.mode === "create" ? "Tambah Guru" : "Edit Guru" }}
            </h3>
            <button
              @click="closeModal"
              class="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Icon
                icon="solar:close-circle-line-duotone"
                class="text-xl text-slate-400"
              />
            </button>
          </div>

          <!-- Body -->
          <div class="p-6 overflow-y-auto">
            <form @submit.prevent="submitForm">
              <div
                v-if="modal.error"
                class="p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2"
              >
                <Icon icon="solar:danger-circle-bold-duotone" />
                {{ modal.error }}
              </div>

              <div class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1"
                      >NIP</label
                    >
                    <input
                      v-model="form.nip"
                      type="text"
                      class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#602515]"
                      placeholder="Nomor Induk Pegawai"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1"
                      >Nama Lengkap <span class="text-red-500">*</span></label
                    >
                    <input
                      v-model="form.fullName"
                      type="text"
                      class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#602515]"
                      placeholder="Nama lengkap guru"
                    />
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1"
                      >Tanggal Lahir</label
                    >
                    <input
                      v-model="form.birthDate"
                      type="date"
                      class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#602515]"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1"
                      >Tempat Lahir</label
                    >
                    <input
                      v-model="form.birthPlace"
                      type="text"
                      class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#602515]"
                      placeholder="Kota/kabupaten"
                    />
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1"
                      >Jenis Kelamin</label
                    >
                    <div class="flex items-center gap-4 mt-2">
                      <label
                        class="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <input
                          type="radio"
                          value="male"
                          v-model="form.gender"
                          class="text-[#602515] focus:ring-[#602515]"
                        />
                        Ikhwan
                      </label>
                      <label
                        class="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <input
                          type="radio"
                          value="female"
                          v-model="form.gender"
                          class="text-[#602515] focus:ring-[#602515]"
                        />
                        Akhwat
                      </label>
                    </div>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1"
                      >Status</label
                    >
                    <select
                      v-model="form.status"
                      class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#602515]"
                    >
                      <option value="active">Aktif</option>
                      <option value="inactive">Tidak Aktif</option>
                      <option value="retired">Pensiun</option>
                    </select>
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1"
                      >Jabatan</label
                    >
                    <input
                      v-model="form.position"
                      type="text"
                      class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#602515]"
                      placeholder="Contoh: Kepala Sekolah"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1"
                      >Divisi</label
                    >
                    <select
                      v-model="form.department"
                      class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#602515]"
                    >
                      <option value="">Pilih Divisi</option>
                      <option
                        v-for="div in divisionsList"
                        :key="div.id"
                        :value="div.name"
                      >
                        {{ div.name }}
                      </option>
                    </select>
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1"
                      >Tipe Karyawan</label
                    >
                    <select
                      v-model="form.employeeType"
                      class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#602515]"
                    >
                      <option value="teacher">Guru</option>
                      <option value="staff">Staff</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1"
                      >Tanggal Bergabung</label
                    >
                    <input
                      v-model="form.joinDate"
                      type="date"
                      class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#602515]"
                    />
                  </div>
                </div>

                <div>
                  <AddressSelector
                    v-model="form.addressRegion"
                    label="Alamat"
                  />
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1"
                      >No. Telepon</label
                    >
                    <input
                      v-model="form.phone"
                      type="text"
                      class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#602515]"
                      placeholder="08xxxxxxxxxx"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1"
                      >Email</label
                    >
                    <input
                      v-model="form.email"
                      type="email"
                      class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#602515]"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>

                <div class="md:col-span-2" v-if="modal.mode === 'create'">
                  <label class="block text-sm font-medium text-slate-700 mb-1"
                    >Password</label
                  >
                  <input
                    v-model="form.password"
                    type="password"
                    class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#602515]"
                    placeholder="Password untuk login (opsional)"
                  />
                </div>
              </div>

              <!-- Footer with Submit Button inside Form -->
              <div
                class="pt-6 mt-6 border-t flex items-center justify-end gap-3"
              >
                <button
                  type="button"
                  @click="closeModal"
                  class="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  :disabled="saving"
                  class="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 bg-[#f8ae19] hover:bg-[#e09d0f]"
                >
                  <Icon
                    v-if="saving"
                    icon="solar:spinner-bold"
                    class="animate-spin"
                  />
                  <Icon v-else icon="solar:diskette-bold-duotone" />
                  {{ saving ? "Menyimpan..." : "Simpan" }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- View Modal -->
    <Teleport to="body">
      <div
        v-if="viewModal.show"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      >
        <div
          class="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden"
        >
          <!-- Header -->
          <div class="p-6 text-center border-b bg-amber-50 relative">
            <button
              @click="viewModal.show = false"
              class="absolute top-4 right-4 p-1 rounded-full bg-white/50 hover:bg-white text-slate-500 transition-colors"
            >
              <Icon icon="solar:close-circle-line-duotone" class="text-xl" />
            </button>
            <div
              class="w-20 h-20 mx-auto rounded-full bg-white flex items-center justify-center shadow-sm mb-3 border border-amber-100"
            >
              <div
                class="w-16 h-16 rounded-full bg-[#602515] text-white flex items-center justify-center text-xl font-bold"
              >
                {{ getInitials(viewModal.item?.fullName) }}
              </div>
            </div>
            <h3 class="text-xl font-bold text-slate-800">
              {{ viewModal.item?.fullName }}
            </h3>
            <div
              class="inline-block px-3 py-1 rounded-full bg-white border border-amber-200 text-xs font-medium text-[#602515] mt-1 font-mono"
            >
              {{ viewModal.item?.nip || "Tanpa NIP" }}
            </div>
          </div>

          <!-- Body -->
          <div class="p-6 space-y-4">
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div class="text-xs text-slate-500 mb-1">Jabatan</div>
                <div class="font-medium">
                  {{ viewModal.item?.position || "-" }}
                </div>
              </div>
              <div>
                <div class="text-xs text-slate-500 mb-1">Divisi</div>
                <div class="font-medium">
                  <div
                    v-if="viewModal.item?.divisions?.length"
                    class="flex flex-wrap gap-1"
                  >
                    <span
                      v-for="div in viewModal.item.divisions"
                      :key="div.id"
                      class="bg-amber-50 text-amber-900 px-2 py-0.5 rounded text-xs border border-amber-100"
                    >
                      {{ div.name }}
                    </span>
                  </div>
                  <span v-else>-</span>
                </div>
              </div>
              <div>
                <div class="text-xs text-slate-500 mb-1">Tipe</div>
                <div class="font-medium">
                  {{
                    viewModal.item?.employeeType === "teacher"
                      ? "Guru"
                      : "Staff"
                  }}
                </div>
              </div>
              <div>
                <div class="text-xs text-slate-500 mb-1">Status</div>
                <div class="font-medium capitalize">
                  {{ viewModal.item?.status }}
                </div>
              </div>
              <div>
                <div class="text-xs text-slate-500 mb-1">No. Telepon</div>
                <div class="font-medium">
                  {{ viewModal.item?.phone || "-" }}
                </div>
              </div>
              <div>
                <div class="text-xs text-slate-500 mb-1">Email</div>
                <div class="font-medium">
                  {{ viewModal.item?.email || "-" }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Confirm Delete Modal -->
    <ConfirmModal
      :isOpen="confirm.show"
      title="Hapus Guru"
      :message="`Apakah Anda yakin ingin menghapus '${confirm.item?.fullName}'? Data yang dihapus tidak dapat dikembalikan.`"
      confirmText="Hapus"
      cancelText="Batal"
      @confirm="deleteItem"
      @cancel="confirmCancel"
    />

    <!-- Confirm Delete Cascade Modal -->
    <ConfirmModal
      :isOpen="cascadeDeleteConfirm.show"
      title="Konfirmasi Hapus Hubungan Data"
      :message="cascadeDeleteConfirm.message"
      confirmText="Ya, Tetap Hapus"
      cancelText="Batal"
      @confirm="deleteItemCascade"
      @cancel="cascadeCancel"
    />

    <!-- Status Modal -->
    <StatusModal
      :isOpen="statusModal.isOpen"
      :type="statusModal.type"
      :title="statusModal.title"
      :message="statusModal.message"
      @close="statusModal.isOpen = false"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from "vue";
import { teachersApi, divisionsApi } from "@/services/api.js";
import { Icon } from "@iconify/vue";
import DataTable from "@/components/ui/DataTable.vue";
import ConfirmModal from "@/components/ui/ConfirmModal.vue";
import StatusModal from "@/components/ui/StatusModal.vue";
import ImportModal from "@/components/common/ImportModal.vue";
import AddressSelector from "@/components/ui/AddressSelector.vue";

// Table columns
const columns = [
  {
    field: "fullName",
    label: "NAMA",
    sortable: true,
    sticky: true,
    stickyClass:
      "left-0 z-10 bg-white shadow-[1px_0_0_0_rgba(0,0,0,0.05)] border-r border-slate-200",
    headerClass: "min-w-[200px] p-3 md:p-4 border-r border-slate-200",
    cellClass: "p-3 md:p-4 border-r border-slate-100",
  },
  {
    field: "position",
    label: "JABATAN",
    headerClass: "min-w-[150px] p-3 md:p-4",
    cellClass: "p-3 md:p-4",
  },
  {
    field: "department",
    label: "DIVISI",
    headerClass: "min-w-[150px] p-3 md:p-4",
    cellClass: "p-3 md:p-4",
  },
  {
    field: "employeeType",
    label: "TIPE",
    headerClass: "min-w-[120px] p-3 md:p-4",
    cellClass: "p-3 md:p-4",
  },
  {
    field: "status",
    label: "STATUS",
    headerClass: "min-w-[100px] p-3 md:p-4",
    cellClass: "p-3 md:p-4",
  },
  {
    field: "action",
    label: "AKSI",
    align: "center",
    width: "w-32",
    headerClass: "p-3 md:p-4",
    cellClass: "p-3 md:p-4",
  },
];

// State
const allTeachers = ref([]); // Store all data
const teachers = ref([]); // Displayed data (paginated)
const divisionsList = ref([]);
const loading = ref(true);
const saving = ref(false);
const searchQuery = ref("");
const statusFilter = ref("");
const viewMode = ref("table");

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
});

const modal = reactive({
  show: false,
  mode: "create",
  error: "",
});

const form = reactive({
  id: null,
  nip: "",
  fullName: "",
  birthDate: "",
  birthPlace: "",
  gender: "male",
  addressRegion: null, // { province, regency, district, village, addressDetail, postalCode }
  phone: "",
  email: "",
  position: "",
  department: "",
  employeeType: "teacher",
  joinDate: "",
  status: "active",
  password: "",
});

const confirm = reactive({
  show: false,
  item: null,
});

const cascadeDeleteConfirm = reactive({
  show: false,
  message: "",
  itemId: null,
});

const viewModal = reactive({
  show: false,
  item: null,
});

// Status Modal state
const statusModal = reactive({
  isOpen: false,
  type: "success",
  title: "",
  message: "",
});

// Import Modal State works with ref now
const showImportModal = ref(false);

/* ---------- Functions ---------- */

// Import Functions
function openImport() {
  showImportModal.value = true;
}

// Helpers
function getInitials(name) {
  if (!name) return "?";
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0]?.slice(0, 2).toUpperCase() || "?";
}

// Debounce for search
let searchTimer = null;

function onSearchInput(value) {
  searchQuery.value = value;
  pagination.page = 1; // Reset to page 1 on search
  applyFilters();
}

function changeLimit(limit) {
  pagination.limit = limit;
  pagination.page = 1;
  applyFilters();
}

function changePage(page) {
  pagination.page = page;
  applyFilters();
}

function resetFilters() {
  statusFilter.value = "";
  searchQuery.value = "";
  pagination.page = 1;
  applyFilters();
}

// Data fetching
// Data fetching
async function fetchData() {
  loading.value = true;
  try {
    const res = await teachersApi.getAll(); // Fetch ALL data
    const data = Array.isArray(res?.data) ? res.data : [];
    allTeachers.value = data;
    applyFilters(); // Initial filter/pagination
  } catch (e) {
    console.error(e);
    statusModal.type = "error";
    statusModal.title = "Gagal!";
    statusModal.message = e.message || "Gagal memuat data";
    statusModal.isOpen = true;
  } finally {
    loading.value = false;
  }
}

// Logic for Client-Side Filtering & Pagination
function applyFilters() {
  let filtered = allTeachers.value;

  // 1. Filter by Search Query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter((item) => {
      return (
        item.fullName?.toLowerCase().includes(query) ||
        item.nip?.toLowerCase().includes(query) ||
        item.position?.toLowerCase().includes(query) ||
        item.department?.toLowerCase().includes(query) ||
        // Also search in divisions array
        item.divisions?.some((d) => d.name.toLowerCase().includes(query))
      );
    });
  }

  // 2. Filter by Status
  if (statusFilter.value) {
    filtered = filtered.filter((item) => item.status === statusFilter.value);
  }

  // 3. Update Pagination Meta
  pagination.total = filtered.length;
  pagination.totalPages = Math.ceil(filtered.length / pagination.limit) || 1;

  // Ensure current page is valid
  if (pagination.page > pagination.totalPages) {
    pagination.page = 1;
  }

  // 4. Slice for Pagination
  const start = (pagination.page - 1) * pagination.limit;
  const end = start + pagination.limit;
  teachers.value = filtered.slice(start, end);
}

// Watch filters to auto-apply (optional, but good for reactivity)
watch(statusFilter, () => {
  pagination.page = 1;
  applyFilters();
});

async function fetchDivisions() {
  try {
    const res = await divisionsApi.getAll();
    divisionsList.value = Array.isArray(res?.data) ? res.data : [];
  } catch (e) {
    console.error("Failed to fetch divisions", e);
  }
}

// CRUD operations
async function submitForm() {
  if (!form.fullName?.trim()) {
    modal.error = "Nama lengkap wajib diisi";
    return;
  }

  saving.value = true;
  modal.error = "";

  try {
    const addr = form.addressRegion || {};
    const payload = {
      nip: form.nip || undefined,
      fullName: form.fullName.trim(),
      birthDate: form.birthDate || undefined,
      birthPlace: form.birthPlace || undefined,
      gender: form.gender,
      // Separate address fields
      province: addr.province ? JSON.stringify(addr.province) : undefined,
      regency: addr.regency ? JSON.stringify(addr.regency) : undefined,
      district: addr.district ? JSON.stringify(addr.district) : undefined,
      village: addr.village ? JSON.stringify(addr.village) : undefined,
      addressDetail: addr.addressDetail || undefined,
      postalCode: addr.postalCode || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      position: form.position || undefined,
      department: form.department || undefined,
      employeeType: form.employeeType,
      joinDate: form.joinDate || undefined,
      status: form.status,
    };

    // Only add password if in create mode and provided
    if (modal.mode === "create" && form.password) {
      payload.password = form.password;
    }

    if (modal.mode === "create") {
      await teachersApi.create(payload);
      statusModal.type = "success";
      statusModal.title = "Berhasil!";
      statusModal.message = "Guru berhasil ditambahkan";
    } else {
      await teachersApi.update(form.id, payload);
      statusModal.type = "success";
      statusModal.title = "Berhasil!";
      statusModal.message = "Data guru berhasil diperbarui";
    }

    statusModal.isOpen = true;
    closeModal();
    fetchData();
  } catch (e) {
    modal.error = e.message || "Gagal menyimpan data";
  } finally {
    saving.value = false;
  }
}

async function deleteItem() {
  if (!confirm.item) return;
  const itemId = confirm.item.id;

  try {
    const res = await teachersApi.delete(itemId);
    if (res.hasRelations) {
      confirmCancel();
      cascadeDeleteConfirm.itemId = itemId;
      cascadeDeleteConfirm.message = res.message;
      cascadeDeleteConfirm.show = true;
    } else {
      statusModal.type = "success";
      statusModal.title = "Berhasil!";
      statusModal.message = "Guru berhasil dihapus";
      statusModal.isOpen = true;
      confirmCancel();
      fetchData();
    }
  } catch (e) {
    statusModal.type = "error";
    statusModal.title = "Gagal!";
    statusModal.message = e.message || "Gagal menghapus data";
    statusModal.isOpen = true;
  }
}

async function deleteItemCascade() {
  if (!cascadeDeleteConfirm.itemId) return;

  try {
    await teachersApi.delete(cascadeDeleteConfirm.itemId, true);
    statusModal.type = "success";
    statusModal.title = "Berhasil!";
    statusModal.message = "Guru beserta data terkait berhasil disesuaikan/dihapus";
    statusModal.isOpen = true;
    cascadeCancel();
    fetchData();
  } catch (e) {
    statusModal.type = "error";
    statusModal.title = "Gagal!";
    statusModal.message = e.message || "Gagal menghapus data";
    statusModal.isOpen = true;
  }
}

// Modal helpers
function openCreate() {
  modal.show = true;
  modal.mode = "create";
  modal.error = "";
  Object.assign(form, {
    id: null,
    nip: "",
    fullName: "",
    birthDate: "",
    birthPlace: "",
    gender: "male",
    addressRegion: null,
    phone: "",
    email: "",
    position: "",
    department: "",
    employeeType: "teacher",
    joinDate: "",
    status: "active",
    password: "",
  });
}

function openEdit(item) {
  modal.show = true;
  modal.mode = "edit";
  modal.error = "";

  // Format date correctly for input type="date"
  let formattedBirthDate = "";
  if (item.birthDate) {
    const date = new Date(item.birthDate);
    if (!isNaN(date.getTime())) {
      formattedBirthDate = date.toISOString().split("T")[0];
    }
  }

  let formattedJoinDate = "";
  if (item.joinDate) {
    const date = new Date(item.joinDate);
    if (!isNaN(date.getTime())) {
      formattedJoinDate = date.toISOString().split("T")[0];
    }
  }

  // Reconstruct address region from separate fields
  const addressRegion = {
    province: null,
    regency: null,
    district: null,
    village: null,
    addressDetail: item.addressDetail || "",
    postalCode: item.postalCode || "",
  };
  try {
    if (item.province) addressRegion.province = JSON.parse(item.province);
  } catch {}
  try {
    if (item.regency) addressRegion.regency = JSON.parse(item.regency);
  } catch {}
  try {
    if (item.district) addressRegion.district = JSON.parse(item.district);
  } catch {}
  try {
    if (item.village) addressRegion.village = JSON.parse(item.village);
  } catch {}

  Object.assign(form, {
    ...item,
    birthDate: formattedBirthDate,
    joinDate: formattedJoinDate,
    addressRegion,
    password: "",
  });
}

function closeModal() {
  modal.show = false;
}

function openView(item) {
  viewModal.item = { ...item };
  viewModal.show = true;
}

function confirmDelete(item) {
  confirm.show = true;
  confirm.item = item;
}

function confirmCancel() {
  confirm.show = false;
  confirm.item = null;
}

function cascadeCancel() {
  cascadeDeleteConfirm.show = false;
  cascadeDeleteConfirm.message = "";
  cascadeDeleteConfirm.itemId = null;
}

// Import Template Header Config for Component
const teacherImportTemplate = [
  {
    NIP: "12345678",
    "Nama Lengkap": "Contoh Guru",
    Jabatan: "Wali Kelas",
    Divisi: "Akademik",
    "Jenis Kelamin": "Ikhwan",
    "Tanggal Lahir": "1990-01-01",
    "Tempat Lahir": "Jakarta",
    // Field Alamat Terpisah
    Provinsi: "Jawa Barat",
    "Kabupaten/Kota": "Bogor",
    Kecamatan: "Cibinong",
    "Desa/Kelurahan": "Pakansari",
    "Detail Alamat": "Jl. Kemerdekaan No. 45",
    "Kode Pos": "16914",
    Telepon: "08123456789",
    Email: "guru@sekolah.com",
    Password: "password123",
    Status: "Aktif",
    "Tipe Karyawan": "Guru",
  },
];

function onImportSuccess() {
  fetchData();
}

onMounted(() => {
  fetchData();
  fetchDivisions();
});
</script>
```
