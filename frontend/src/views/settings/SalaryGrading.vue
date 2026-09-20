<template>
  <div class="max-w-6xl mx-auto pb-12">
    <!-- DataTable -->
    <DataTable
      :items="paginatedTeachers"
      :columns="columns"
      :loading="loading"
      :pagination="pagination"
      :viewMode="viewMode"
      title="Penentuan Komponen Gaji Guru"
      description="Atur golongan, jabatan, dan masa kerja untuk setiap guru."
      icon="solar:user-id-bold-duotone"
      :search="search"
      @update:search="search = $event"
      @update:limit="
        pagination.limit = $event;
        pagination.page = 1;
      "
      @page-change="pagination.page = $event"
      @update:viewMode="viewMode = $event"
    >
      <!-- Filters Slot -->
      <template #filters>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Division Filter -->
          <div class="space-y-1">
            <label class="text-xs font-medium text-slate-500">Divisi</label>
            <select
              v-model="filters.divisionId"
              class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">Semua Divisi</option>
              <option v-for="div in divisions" :key="div.id" :value="div.id">
                {{ div.name }}
              </option>
            </select>
          </div>

          <!-- Grade Filter -->
          <div class="space-y-1">
            <label class="text-xs font-medium text-slate-500">Golongan</label>
            <select
              v-model="filters.gradeId"
              class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">Semua Golongan</option>
              <option value="null">Belum Diatur</option>
              <option v-for="g in grades" :key="g.id" :value="g.id">
                {{ g.name }}
              </option>
            </select>
          </div>

          <!-- Gender Filter -->
          <div class="space-y-1">
            <label class="text-xs font-medium text-slate-500">Gender</label>
            <select
              v-model="filters.gender"
              class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">Semua Gender</option>
              <option value="male">Ikhwan</option>
              <option value="female">Akhwat</option>
            </select>
          </div>
        </div>
      </template>

      <!-- Cell: Name (Guru) -->
      <template #cell-name="{ item }">
        <div class="flex items-center gap-3">
          <div
            class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600"
          >
            {{ getInitials(item.fullName) }}
          </div>
          <div>
            <span class="font-medium text-slate-800">{{ item.fullName }}</span>
            <p class="text-xs text-slate-400">
              {{
                item.divisions?.map((d) => d.name).join(", ") ||
                item.department ||
                "-"
              }}
            </p>
          </div>
        </div>
      </template>

      <!-- Cell: NIP -->
      <template #cell-nip="{ item }">
        <span class="text-slate-600">{{ item.nip || "-" }}</span>
      </template>

      <!-- Cell: Grade -->
      <template #cell-grade="{ item }">
        <span
          v-if="item.salaryGrade"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
        >
          <Icon icon="solar:banknote-2-line-duotone" class="w-3.5 h-3.5" />
          {{ item.salaryGrade.name }}
        </span>
        <span
          v-else
          class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500"
        >
          Belum diatur
        </span>
      </template>

      <!-- Cell: Position -->
      <template #cell-position="{ item }">
        <span
          v-if="item.positionAllowance"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100"
        >
          <Icon icon="lucide:briefcase" class="w-3.5 h-3.5" />
          {{ item.positionAllowance.position }}
        </span>
        <span v-else-if="item.position" class="text-slate-600 text-xs">
          {{ item.position }}
        </span>
        <span v-else class="text-slate-400 text-xs">-</span>
      </template>

      <!-- Cell: Tenure -->
      <template #cell-tenure="{ item }">
        <span
          v-if="item.joinDate"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100"
        >
          <Icon icon="lucide:calendar" class="w-3.5 h-3.5" />
          {{ calculateYearsService(item.joinDate) }} Tahun
        </span>
        <span v-else class="text-slate-400 text-xs">-</span>
      </template>

      <!-- Cell: Teaching Hours -->
      <template #cell-teachingHours="{ item }">
        <span
          v-if="item.teachingHours"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100"
        >
          <Icon icon="lucide:clock" class="w-3.5 h-3.5" />
          {{ item.teachingHours }} Jam
        </span>
        <span v-else class="text-slate-400 text-xs">-</span>
      </template>

      <!-- Cell: Bank -->
      <template #cell-bank="{ item }">
        <div v-if="item.bankName" class="text-xs">
          <div class="font-medium text-slate-700">
            {{ item.bankName }}
          </div>
          <div class="text-slate-500">
            {{ item.bankAccountNumber || "-" }}
          </div>
        </div>
        <span v-else class="text-slate-400 text-xs">-</span>
      </template>

      <!-- Cell: Actions -->
      <template #cell-actions="{ item }">
        <button
          @click="openAssignModal(item)"
          class="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 rounded-lg transition-colors shadow-sm whitespace-nowrap"
        >
          Atur Komponen
        </button>
      </template>

      <!-- CUSTOM CARD VIEW -->
      <template #card-item="{ item }">
        <div
          class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-shadow flex flex-col h-full"
        >
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600"
              >
                {{ getInitials(item.fullName) }}
              </div>
              <div>
                <h3
                  class="font-bold text-slate-800 line-clamp-1"
                  :title="item.fullName"
                >
                  {{ item.fullName }}
                </h3>
                <p class="text-xs text-slate-500">{{ item.nip || "-" }}</p>
              </div>
            </div>
            <span
              v-if="item.gender === 'male'"
              class="bg-amber-50 text-amber-900 p-1 rounded-md"
              title="Ikhwan"
            >
              <Icon icon="lucide:user" class="w-4 h-4" />
            </span>
            <span
              v-else
              class="bg-pink-50 text-pink-600 p-1 rounded-md"
              title="Akhwat"
            >
              <Icon icon="lucide:user" class="w-4 h-4" />
            </span>
          </div>

          <div class="space-y-2 text-sm border-t border-slate-100 pt-3 mb-4">
            <div class="flex justify-between items-center">
              <span class="text-slate-500">Golongan</span>
              <span
                v-if="item.salaryGrade"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
              >
                {{ item.salaryGrade.name }}
              </span>
              <span v-else class="text-xs text-slate-400"> - </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-500">Jabatan</span>
              <span
                v-if="item.positionAllowance"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700"
              >
                {{ item.positionAllowance.position }}
              </span>
              <span v-else class="text-xs text-slate-400">{{
                item.position || "-"
              }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-500">Masa Kerja</span>
              <span
                v-if="item.joinDate"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700"
              >
                {{ calculateYearsService(item.joinDate) }} Thn
              </span>
              <span v-else class="text-xs text-slate-400">-</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-500">Jam Mengajar</span>
              <span
                v-if="item.teachingHours"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700"
              >
                {{ item.teachingHours }} Jam
              </span>
              <span v-else class="text-xs text-slate-400">-</span>
            </div>
          </div>

          <!-- Bank Info -->
          <div
            v-if="item.bankName"
            class="mt-auto mb-3 p-3 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg border border-cyan-100"
          >
            <div class="flex items-center gap-2 mb-2">
              <Icon icon="lucide:landmark" class="w-4 h-4 text-cyan-600" />
              <span class="text-xs font-semibold text-cyan-800"
                >Informasi Rekening</span
              >
            </div>
            <div class="space-y-1.5 text-xs">
              <div class="flex justify-between">
                <span class="text-slate-500">Bank</span>
                <span class="font-medium text-slate-700"
                  >{{ item.bankName }}
                  {{ item.bankCode ? `(${item.bankCode})` : "" }}</span
                >
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">No. Rekening</span>
                <span class="font-mono font-medium text-slate-700">{{
                  item.bankAccountNumber || "-"
                }}</span>
              </div>
            </div>
          </div>
          <div
            v-else
            class="flex flex-col items-center justify-center mt-auto mb-3 p-3 bg-slate-50 rounded-lg border border-slate-100 text-center"
          >
            <div>
              <Icon
                icon="lucide:landmark"
                class="w-4 h-4 text-slate-400 m-auto"
              />
              <span class="text-xs text-slate-400"
                >Belum ada data rekening</span
              >
            </div>
          </div>

          <!-- Card Footer -->
          <div class="pt-3 border-t border-slate-100">
            <button
              @click="openAssignModal(item)"
              class="w-full py-2 flex items-center justify-center gap-2 bg-amber-50 text-amber-900 border border-amber-100 rounded-lg hover:bg-amber-100 hover:border-amber-200 transition-colors text-sm font-medium"
            >
              <Icon icon="solar:pen-bold-duotone" class="w-4 h-4" />
              Atur Komponen
            </button>
          </div>
        </div>
      </template>
    </DataTable>

    <!-- Assign Modal (Preserved as is) -->
    <Teleport to="body">
      <div
        v-if="modalOpen"
        class="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 overflow-y-auto"
      >
        <div
          class="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
        >
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="text-lg font-bold">Atur Komponen Gaji Guru</h3>
              <p class="text-sm text-slate-500">
                Atur golongan, jabatan, dan tanggal bergabung untuk
                <strong>{{ selectedTeacher?.fullName }}</strong>
              </p>
            </div>
            <button
              type="button"
              @click="closeModal"
              class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Icon icon="lucide:x" class="w-5 h-5" />
            </button>
          </div>

          <form @submit.prevent="saveAssignment">
            <div class="space-y-4">
              <!-- Golongan -->
              <div>
                <label class="block text-sm font-medium mb-1">
                  <Icon
                    icon="solar:banknote-2-line-duotone"
                    class="w-4 h-4 inline mr-1"
                  />
                  Golongan Gaji
                </label>
                <select
                  v-model="formData.salaryGradeId"
                  class="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option :value="null">-- Tidak Ada Golongan --</option>
                  <option
                    v-for="grade in grades"
                    :key="grade.id"
                    :value="grade.id"
                  >
                    {{ grade.name }}
                  </option>
                </select>
              </div>

              <!-- Jabatan -->
              <div>
                <label class="block text-sm font-medium mb-1">
                  <Icon icon="lucide:briefcase" class="w-4 h-4 inline mr-1" />
                  Jabatan (Tunjangan)
                </label>
                <select
                  v-model="formData.positionAllowanceId"
                  class="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option :value="null">-- Tidak Ada Jabatan --</option>
                  <option
                    v-for="pos in positions"
                    :key="pos.id"
                    :value="pos.id"
                  >
                    {{ pos.position }} ({{ formatCurrency(pos.amount) }})
                  </option>
                </select>
              </div>

              <!-- Tanggal Bergabung -->
              <div>
                <label class="block text-sm font-medium mb-1">
                  <Icon icon="lucide:calendar" class="w-4 h-4 inline mr-1" />
                  Tanggal Bergabung
                </label>
                <input
                  v-model="formData.joinDate"
                  type="date"
                  class="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-200"
                />
                <p class="text-xs text-slate-500 mt-1">
                  <template v-if="formData.joinDate">
                    Masa Kerja:
                    <strong class="text-amber-600"
                      >{{
                        calculateYearsService(formData.joinDate)
                      }}
                      Tahun</strong
                    >
                  </template>
                  <template v-else>
                    Masa kerja akan dihitung otomatis dari tanggal bergabung.
                  </template>
                </p>
              </div>

              <!-- Jam Mengajar -->
              <div>
                <label class="block text-sm font-medium mb-1">
                  <Icon icon="lucide:clock" class="w-4 h-4 inline mr-1" />
                  Jam Mengajar (per minggu)
                </label>
                <input
                  v-model.number="formData.teachingHours"
                  type="number"
                  min="0"
                  placeholder="Contoh: 24"
                  class="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <!-- Divider -->
              <div class="border-t border-slate-200 pt-4 mt-4">
                <h4
                  class="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"
                >
                  <Icon icon="lucide:landmark" class="w-4 h-4" />
                  Informasi Rekening Bank
                </h4>
              </div>

              <!-- Nama Bank -->
              <div>
                <label class="block text-sm font-medium mb-1">
                  Nama Bank
                </label>
                <select
                  v-model="formData.bankName"
                  class="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="">-- Pilih Bank --</option>
                  <optgroup label="Bank BUMN">
                    <option value="BRI">BRI (Bank Rakyat Indonesia)</option>
                    <option value="BNI">BNI (Bank Negara Indonesia)</option>
                    <option value="Mandiri">Bank Mandiri</option>
                    <option value="BTN">BTN (Bank Tabungan Negara)</option>
                  </optgroup>
                  <optgroup label="Bank Syariah">
                    <option value="BSI">BSI (Bank Syariah Indonesia)</option>
                    <option value="Bank Muamalat">Bank Muamalat</option>
                    <option value="BCA Syariah">BCA Syariah</option>
                    <option value="BNI Syariah">BNI Syariah</option>
                    <option value="BRI Syariah">BRI Syariah</option>
                    <option value="Mandiri Syariah">Mandiri Syariah</option>
                    <option value="BTPN Syariah">BTPN Syariah</option>
                  </optgroup>
                  <optgroup label="Bank Swasta">
                    <option value="BCA">BCA (Bank Central Asia)</option>
                    <option value="CIMB Niaga">CIMB Niaga</option>
                    <option value="Danamon">Bank Danamon</option>
                    <option value="Permata">Bank Permata</option>
                    <option value="OCBC NISP">OCBC NISP</option>
                    <option value="Panin">Bank Panin</option>
                    <option value="Maybank">Maybank Indonesia</option>
                    <option value="UOB">UOB Indonesia</option>
                    <option value="HSBC">HSBC Indonesia</option>
                    <option value="Mega">Bank Mega</option>
                    <option value="Bukopin">Bank Bukopin</option>
                    <option value="Sinarmas">Bank Sinarmas</option>
                    <option value="BTPN">BTPN</option>
                    <option value="Jenius">Jenius (BTPN)</option>
                  </optgroup>
                  <optgroup label="Bank Digital">
                    <option value="Jago">Bank Jago</option>
                    <option value="Sea Bank">Sea Bank</option>
                    <option value="Blu BCA">Blu by BCA Digital</option>
                    <option value="Line Bank">Line Bank</option>
                    <option value="Allo Bank">Allo Bank</option>
                    <option value="Neo Commerce">Bank Neo Commerce</option>
                  </optgroup>
                  <optgroup label="Bank Daerah">
                    <option value="Bank Jateng">Bank Jateng</option>
                    <option value="Bank Jatim">Bank Jatim</option>
                    <option value="Bank DKI">Bank DKI</option>
                    <option value="Bank BJB">Bank BJB (Jabar Banten)</option>
                    <option value="Bank Nagari">Bank Nagari</option>
                    <option value="Bank Sumut">Bank Sumut</option>
                    <option value="Bank Papua">Bank Papua</option>
                    <option value="Bank Kalsel">Bank Kalsel</option>
                    <option value="Bank NTB">Bank NTB Syariah</option>
                    <option value="Bank Aceh">Bank Aceh Syariah</option>
                    <option value="Bank Lampung">Bank Lampung</option>
                    <option value="Bank Banten">Bank Banten</option>
                  </optgroup>
                  <option value="Lainnya">Lainnya</option>
                </select>
                <!-- Custom bank name input when "Lainnya" is selected -->
                <input
                  v-if="formData.bankName === 'Lainnya'"
                  v-model="formData.customBankName"
                  type="text"
                  placeholder="Ketik nama bank..."
                  class="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 mt-2"
                />
              </div>

              <!-- Kode Bank -->
              <div>
                <label class="block text-sm font-medium mb-1">
                  Kode Bank
                </label>
                <input
                  v-model="formData.bankCode"
                  type="text"
                  :placeholder="
                    formData.bankName === 'Lainnya'
                      ? 'Masukkan kode bank...'
                      : 'Otomatis terisi'
                  "
                  :disabled="
                    formData.bankName !== 'Lainnya' && formData.bankName !== ''
                  "
                  class="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-100 disabled:text-slate-600"
                />
              </div>

              <!-- Nomor Rekening -->
              <div>
                <label class="block text-sm font-medium mb-1">
                  Nomor Rekening
                </label>
                <input
                  v-model="formData.bankAccountNumber"
                  type="text"
                  placeholder="Contoh: 1234567890"
                  class="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <!-- Nama pada Rekening -->
              <div>
                <label class="block text-sm font-medium mb-1">
                  Nama pada Rekening
                </label>
                <div class="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="useTeacherName"
                    :checked="
                      formData.bankAccountName === selectedTeacher?.fullName
                    "
                    @change="toggleAccountName"
                    class="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                  />
                  <label for="useTeacherName" class="text-sm text-slate-600">
                    Sama dengan nama di data ({{ selectedTeacher?.fullName }})
                  </label>
                </div>
                <input
                  v-model="formData.bankAccountName"
                  type="text"
                  placeholder="Nama sesuai rekening bank"
                  :disabled="
                    formData.bankAccountName === selectedTeacher?.fullName
                  "
                  class="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
            </div>

            <div class="flex justify-end gap-2 mt-8">
              <button
                type="button"
                @click="closeModal"
                class="px-4 py-2 border rounded-lg hover:bg-slate-50 text-sm font-medium"
              >
                Batal
              </button>
              <button
                type="submit"
                class="px-4 py-2 bg-amber-900 text-white rounded-lg hover:bg-amber-400 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="saving"
              >
                <span v-if="saving">Menyimpan...</span>
                <span v-else>Simpan</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Status Modal -->
    <StatusModal
      :is-open="statusModal.open"
      :type="statusModal.type"
      :title="statusModal.title"
      :message="statusModal.message"
      @close="statusModal.open = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive, watch } from "vue";
import { Icon } from "@iconify/vue";
import {
  teachersApi,
  salaryGradesApi,
  divisionsApi,
  salaryApi,
} from "@/services/api";
import StatusModal from "@/components/ui/StatusModal.vue";
import DataTable from "@/components/ui/DataTable.vue";

const loading = ref(true);
const teachers = ref([]);
const grades = ref([]);
const positions = ref([]); // Position allowances
const divisions = ref([]);

// DataTable Props
const viewMode = ref(window.innerWidth < 768 ? "card" : "table");
const search = ref("");
const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
});

const columns = [
  { field: "name", label: "Nama Guru", sortable: true },
  { field: "nip", label: "NIP", sortable: true },
  { field: "grade", label: "Golongan", sortable: true },
  { field: "position", label: "Jabatan", sortable: true },
  { field: "tenure", label: "Masa Kerja", sortable: true },
  { field: "teachingHours", label: "Jam Mengajar", sortable: true },
  { field: "bank", label: "Rekening Bank", sortable: false },
  { field: "actions", label: "Aksi", align: "right" },
];

const filters = reactive({
  divisionId: "",
  gradeId: "",
  gender: "",
});

const modalOpen = ref(false);
const selectedTeacher = ref(null);
const saving = ref(false);

const formData = reactive({
  salaryGradeId: null,
  positionAllowanceId: null,
  joinDate: "",
  teachingHours: 0,
  bankName: "",
  bankCode: "",
  customBankName: "",
  bankAccountNumber: "",
  bankAccountName: "",
});

const statusModal = reactive({
  open: false,
  type: "success",
  title: "",
  message: "",
});

// Bank codes mapping (Same as before)
const bankCodes = {
  BRI: "002",
  BNI: "009",
  Mandiri: "008",
  BTN: "200",
  BSI: "451",
  "Bank Muamalat": "147",
  "BCA Syariah": "536",
  "BNI Syariah": "427",
  "BRI Syariah": "422",
  "Mandiri Syariah": "451",
  "BTPN Syariah": "547",
  BCA: "014",
  "CIMB Niaga": "022",
  Danamon: "011",
  Permata: "013",
  "OCBC NISP": "028",
  Panin: "019",
  Maybank: "016",
  UOB: "023",
  HSBC: "041",
  Mega: "426",
  Bukopin: "441",
  Sinarmas: "153",
  BTPN: "213",
  Jenius: "213",
  Jago: "542",
  "Sea Bank": "535",
  "Blu BCA": "501",
  "Line Bank": "484",
  "Allo Bank": "567",
  "Neo Commerce": "490",
  "Bank Jateng": "113",
  "Bank Jatim": "114",
  "Bank DKI": "111",
  "Bank BJB": "110",
  "Bank Nagari": "118",
  "Bank Sumut": "117",
  "Bank Papua": "132",
  "Bank Kalsel": "122",
  "Bank NTB": "128",
  "Bank Aceh": "116",
  "Bank Lampung": "121",
  "Bank Banten": "137",
};

// --- Computed Data Logic ---
const filteredTeachers = computed(() => {
  let result = teachers.value;

  // 1. Division Filter
  if (filters.divisionId) {
    const divId = parseInt(filters.divisionId);
    result = result.filter((t) => t.divisions?.some((d) => d.id === divId));
  }

  // 2. Grade Filter
  if (filters.gradeId) {
    if (filters.gradeId === "null") {
      result = result.filter((t) => !t.salaryGradeId);
    } else {
      const gId = parseInt(filters.gradeId);
      result = result.filter((t) => t.salaryGradeId === gId);
    }
  }

  // 3. Gender Filter
  if (filters.gender) {
    result = result.filter((t) => t.gender === filters.gender);
  }

  // 4. Search
  if (search.value) {
    const q = search.value.toLowerCase();
    result = result.filter(
      (t) =>
        t.fullName.toLowerCase().includes(q) || (t.nip && t.nip.includes(q))
    );
  }

  return result;
});

const paginatedTeachers = computed(() => {
  const start = (pagination.page - 1) * pagination.limit;
  const end = start + pagination.limit;

  pagination.total = filteredTeachers.value.length;
  pagination.totalPages = Math.ceil(pagination.total / pagination.limit);

  return filteredTeachers.value.slice(start, end);
});

// Watch Search to reset page
watch(search, () => {
  pagination.page = 1;
});

const getInitials = (name) => {
  if (!name) return "??";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
};

const formatCurrency = (val) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(val);
};

const calculateYearsService = (joinDateStr) => {
  if (!joinDateStr) return 0;
  const join = new Date(joinDateStr);
  const now = new Date();
  const diffTime = Math.abs(now - join);
  const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365.25));
  return diffYears;
};

// --- Modal Logic ---
function openAssignModal(teacher) {
  selectedTeacher.value = teacher;
  formData.salaryGradeId = teacher.salaryGradeId || null;
  formData.positionAllowanceId = teacher.positionAllowanceId || null;
  formData.joinDate = teacher.joinDate ? teacher.joinDate.split("T")[0] : "";
  formData.teachingHours = teacher.teachingHours || 0;
  formData.bankName = teacher.bankName || "";
  formData.bankCode = teacher.bankCode || "";
  formData.bankAccountNumber = teacher.bankAccountNumber || "";
  formData.bankAccountName = teacher.bankAccountName || "";

  if (teacher.bankName && !Object.keys(bankCodes).includes(teacher.bankName)) {
    formData.bankName = "Lainnya";
    formData.customBankName = teacher.bankName;
  } else {
    formData.customBankName = "";
  }

  modalOpen.value = true;
}

function closeModal() {
  modalOpen.value = false;
  selectedTeacher.value = null;
}

// Watch bank name to auto-fill code
watch(
  () => formData.bankName,
  (newVal) => {
    if (newVal && newVal !== "Lainnya") {
      formData.bankCode = bankCodes[newVal] || "";
    } else if (newVal === "") {
      formData.bankCode = "";
    }
  }
);

function toggleAccountName(e) {
  if (e.target.checked) {
    formData.bankAccountName = selectedTeacher.value.fullName;
  } else {
    formData.bankAccountName = "";
  }
}

async function saveAssignment() {
  if (!selectedTeacher.value) return;

  saving.value = true;
  try {
    const finalBankName =
      formData.bankName === "Lainnya"
        ? formData.customBankName
        : formData.bankName;

    const payload = {
      salaryGradeId: formData.salaryGradeId,
      positionAllowanceId: formData.positionAllowanceId,
      joinDate: formData.joinDate
        ? new Date(formData.joinDate).toISOString()
        : null,
      teachingHours: formData.teachingHours,
      bankName: finalBankName,
      bankCode: formData.bankCode,
      bankAccountNumber: formData.bankAccountNumber,
      bankAccountName: formData.bankAccountName,
    };

    const res = await teachersApi.updateSalaryComponents(
      selectedTeacher.value.id,
      payload
    );

    if (res.success) {
      // Update local state
      const idx = teachers.value.findIndex(
        (t) => t.id === selectedTeacher.value.id
      );
      if (idx !== -1) {
        // Optimistic update
        const updated = {
          ...teachers.value[idx],
          ...payload,
          // Relation objects (hacky update for display)
          salaryGrade: grades.value.find((g) => g.id === payload.salaryGradeId),
          positionAllowance: positions.value.find(
            (p) => p.id === payload.positionAllowanceId
          ),
        };
        teachers.value[idx] = updated;
      }

      showStatus(
        "success",
        "Berhasil",
        "Komponen gaji guru berhasil diperbarui."
      );
      closeModal();
    } else {
      throw new Error(res.message);
    }
  } catch (err) {
    console.error(err);
    showStatus("error", "Gagal", "Terjadi kesalahan saat menyimpan data.");
  } finally {
    saving.value = false;
  }
}

// --- Status & Init ---
function showStatus(type, title, message) {
  statusModal.type = type;
  statusModal.title = title;
  statusModal.message = message;
  statusModal.open = true;
}

async function loadData() {
  loading.value = true;
  try {
    const [resTeachers, resGrades, resDivisions, resSettings] =
      await Promise.all([
        teachersApi.getAll(),
        salaryGradesApi.getAll(),
        divisionsApi.getAll(),
        salaryApi.getSettings(),
      ]);

    if (resTeachers.success) teachers.value = resTeachers.data;
    if (resGrades.success) grades.value = resGrades.data;
    if (resDivisions.success) divisions.value = resDivisions.data;
    if (resSettings.success) {
      positions.value = resSettings.data.positionAllowances || [];
    }
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadData();
});
</script>
