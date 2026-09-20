<template>
  <div class="p-2 md:p-8 max-w-6xl mx-auto">
    <!-- Form Actions -->
    <div class="flex items-center justify-between mb-6 px-2 md:px-0">
      <button 
        @click="$emit('cancel')"
        class="group flex items-center gap-3 px-4 py-2 bg-white text-slate-600 rounded-xl font-bold text-xs shadow-xl shadow-slate-200/50 hover:bg-[#602515] hover:text-white transition-all active:scale-95 border border-slate-100"
      >
        <Icon icon="solar:alt-arrow-left-linear" class="text-lg group-hover:-translate-x-1 transition-transform" />
        <span class="hidden sm:inline">Kembali ke Riwayat</span>
        <span class="sm:hidden">Kembali</span>
      </button>

      <div class="px-3 py-1.5 bg-[#602515]/5 rounded-xl border border-[#602515]/10 flex items-center gap-2">
        <div class="w-1.5 h-1.5 rounded-full bg-[#602515] animate-pulse"></div>
        <span class="text-[10px] font-bold text-[#602515] uppercase tracking-wider">{{ isEditing ? 'Edit' : 'Baru' }}</span>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <!-- Left Column: Form -->
      <div class="lg:col-span-9 space-y-6">
        <div class="bg-white/70 backdrop-blur-xl rounded-[1.5rem] md:rounded-[2.5rem] p-4 md:p-10 shadow-2xl shadow-slate-200/50 border border-white relative">
          <!-- Background accent -->
          <div class="absolute -top-24 -right-24 w-64 h-64 bg-amber-100/30 rounded-full blur-3xl"></div>
          
          <form @submit.prevent="handleSubmit" class="relative z-10 space-y-8">
            <!-- Student Selection -->
            <div class="space-y-3">
              <label class="flex items-center gap-2 text-sm font-bold text-slate-700 ml-1">
                <Icon icon="solar:users-group-two-rounded-bold-duotone" class="text-lg text-[#602515]" />
                Pilih Santri
              </label>
              <div class="relative group">
                <div 
                  class="min-h-[64px] p-3 border-2 border-slate-100 rounded-[1.5rem] flex flex-wrap gap-2 transition-all duration-300 bg-slate-50/50 group-focus-within:border-[#602515]/30 group-focus-within:bg-white group-focus-within:shadow-inner"
                >
                  <div 
                    v-for="student in selectedStudents" 
                    :key="student.id" 
                    class="flex items-center gap-2 pl-3 pr-2 py-1.5 bg-gradient-to-r from-[#602515] to-[#8c3d2a] text-white rounded-xl text-xs font-bold shadow-md shadow-[#602515]/20 animate-in fade-in zoom-in duration-300"
                  >
                    <span class="tracking-wide">{{ student.fullName }}</span>
                    <button @click="removeStudent(student.id)" type="button" class="p-0.5 hover:bg-white/20 rounded-full transition-colors">
                      <Icon icon="solar:close-circle-bold" class="text-base" />
                    </button>
                  </div>
                  <input
                    ref="searchInput"
                    v-model="searchQuery"
                    @input="onSearch"
                    @keydown.delete="onKeyDelete"
                    @focus="showResults = true"
                    placeholder="Cari nama santri..."
                    class="flex-1 bg-transparent border-none focus:ring-0 text-sm min-w-[120px] py-2 placeholder:text-slate-400 font-medium"
                  />
                </div>

                <!-- Dropdown -->
                <Transition
                  enter-active-class="transition duration-200 ease-out"
                  enter-from-class="transform scale-95 opacity-0"
                  enter-to-class="transform scale-100 opacity-100"
                  leave-active-class="transition duration-150 ease-in"
                  leave-from-class="transform scale-100 opacity-100"
                  leave-to-class="transform scale-95 opacity-0"
                >
                  <div 
                    v-if="showResults && searchResults.length > 0" 
                    class="absolute z-50 w-full mt-3 bg-white/90 backdrop-blur-xl rounded-[1.5rem] shadow-2xl border border-slate-100 overflow-hidden max-h-72 overflow-y-auto"
                  >
                    <button
                      v-for="student in searchResults"
                      :key="student.id"
                      @click="addStudent(student)"
                      type="button"
                      class="w-full px-5 py-4 text-left hover:bg-[#602515]/5 flex items-center justify-between group transition-all"
                    >
                      <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-[#602515] font-bold group-hover:bg-[#602515] group-hover:text-white transition-all">
                          {{ student.fullName.charAt(0) }}
                        </div>
                        <div>
                          <div class="font-bold text-slate-800 group-hover:text-[#602515]">{{ student.fullName }}</div>
                          <div class="text-xs text-slate-500 font-medium tracking-tight">{{ student.nis }} • {{ student.gender === 'male' ? 'Ikhwan' : 'Akhwat' }}</div>
                        </div>
                      </div>
                      <div v-if="isSelected(student.id)" class="bg-[#602515]/10 p-1.5 rounded-full">
                        <Icon icon="solar:check-read-bold" class="text-[#602515] text-lg" />
                      </div>
                      <Icon v-else icon="solar:add-circle-linear" class="text-slate-300 group-hover:text-[#602515] text-xl transition-colors" />
                    </button>
                  </div>
                </Transition>
                
                <div v-if="showResults && searchQuery && searchResults.length === 0 && !searching" class="absolute z-50 w-full mt-3 bg-white rounded-[1.5rem] p-8 shadow-xl border border-slate-100 text-center">
                  <Icon icon="solar:user-block-bold-duotone" class="text-4xl text-slate-200 mx-auto mb-2" />
                  <p class="text-slate-400 text-sm font-medium">Santri tidak ditemukan</p>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <!-- Type Selector -->
              <div class="space-y-3">
                <label class="flex items-center gap-2 text-sm font-bold text-slate-700 ml-1">
                  <Icon icon="solar:tag-bold-duotone" class="text-lg text-amber-500" />
                  Kategori
                </label>
                <div class="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    @click="form.type = 'sick'"
                    :class="form.type === 'sick' ? 'bg-[#602515] text-white shadow-xl shadow-[#602515]/30 ring-4 ring-[#602515]/10' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'"
                    class="flex flex-col items-center gap-2 py-5 rounded-[1.5rem] transition-all duration-500 border border-transparent"
                  >
                    <Icon :icon="form.type === 'sick' ? 'solar:health-bold' : 'solar:health-linear'" class="text-2xl" />
                    <span class="font-bold text-xs uppercase tracking-widest">Sakit</span>
                  </button>
                  <button
                    type="button"
                    @click="form.type = 'permit'"
                    :class="form.type === 'permit' ? 'bg-amber-500 text-white shadow-xl shadow-amber-500/30 ring-4 ring-amber-500/10' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'"
                    class="flex flex-col items-center gap-2 py-5 rounded-[1.5rem] transition-all duration-500 border border-transparent"
                  >
                    <Icon :icon="form.type === 'permit' ? 'solar:document-bold' : 'solar:document-linear'" class="text-2xl" />
                    <span class="font-bold text-xs uppercase tracking-widest">Izin</span>
                  </button>
                </div>
              </div>

              <!-- Dates -->
              <div class="space-y-3">
                <label class="flex items-center gap-2 text-sm font-bold text-slate-700 ml-1">
                  <Icon icon="solar:calendar-date-bold-duotone" class="text-lg text-blue-500" />
                  Rentang Waktu
                </label>
                <div class="flex flex-col xl:flex-row items-center gap-2">
                  <div class="relative w-full group">
                    <input
                      type="date"
                      v-model="form.startDate"
                      required
                      class="w-full pl-9 pr-2 py-4 border-2 border-slate-100 rounded-[1.25rem] focus:ring-4 focus:ring-[#602515]/5 focus:border-[#602515] transition-all bg-slate-50/50 group-focus-within:bg-white text-xs font-bold text-slate-700"
                    />
                    <Icon icon="solar:calendar-linear" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                  <div class="text-slate-300 hidden xl:block">
                    <Icon icon="solar:arrow-right-linear" class="text-lg" />
                  </div>
                  <div class="relative w-full group">
                    <input
                      type="date"
                      v-model="form.endDate"
                      required
                      class="w-full pl-9 pr-2 py-4 border-2 border-slate-100 rounded-[1.25rem] focus:ring-4 focus:ring-[#602515]/5 focus:border-[#602515] transition-all bg-slate-50/50 group-focus-within:bg-white text-xs font-bold text-slate-700"
                    />
                    <Icon icon="solar:calendar-linear" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Reason -->
            <div class="space-y-3">
              <label class="flex items-center gap-2 text-sm font-bold text-slate-700 ml-1">
                <Icon icon="solar:chat-square-dots-bold-duotone" class="text-lg text-indigo-500" />
                Alasan / Keterangan
              </label>
              <div class="relative group">
                <textarea
                  v-model="form.reason"
                  required
                  rows="4"
                  placeholder="Jelaskan alasan izin secara detail..."
                  class="w-full p-5 border-2 border-slate-100 rounded-[1.5rem] focus:ring-4 focus:ring-[#602515]/5 focus:border-[#602515] transition-all bg-slate-50/50 group-focus-within:bg-white text-sm font-medium text-slate-700 placeholder:text-slate-300"
                ></textarea>
              </div>
            </div>

            <!-- Attachment -->
            <div class="space-y-3">
              <label class="flex items-center gap-2 text-sm font-bold text-slate-700 ml-1">
                <Icon icon="solar:gallery-upload-bold-duotone" class="text-lg text-emerald-500" />
                Lampiran (Opsional)
              </label>
              <div class="flex items-center justify-center w-full">
                <label v-if="!fileName" class="group flex flex-col items-center justify-center w-full h-40 border-2 border-slate-100 border-dashed rounded-[2rem] cursor-pointer bg-slate-50/50 hover:bg-white transition-all hover:border-[#602515] hover:shadow-xl hover:shadow-slate-200/50">
                  <div class="flex flex-col items-center justify-center pt-5 pb-6">
                    <div class="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-md mb-3 group-hover:scale-110 transition-transform">
                      <Icon icon="solar:upload-bold-duotone" class="text-2xl text-slate-400 group-hover:text-[#602515]" />
                    </div>
                    <p class="text-sm text-slate-500 font-bold mb-1">Pilih File Lampiran</p>
                    <p class="text-xs text-slate-400 font-medium">PNG, JPG atau PDF (Maks. 5MB)</p>
                  </div>
                  <input type="file" class="hidden" @change="onFileChange" />
                </label>
                
                <div v-else class="w-full bg-slate-50/80 backdrop-blur-sm rounded-[2rem] p-6 border-2 border-emerald-100/50 flex flex-col items-center gap-4">
                  <div class="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-100/50">
                    <Icon icon="solar:document-check-bold-duotone" class="text-3xl" />
                  </div>
                  <div class="text-center">
                    <div class="text-sm font-bold text-slate-700 truncate max-w-xs">{{ fileName }}</div>
                    <div class="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-1">File Terlampir</div>
                  </div>
                  
                  <div class="flex items-center gap-2 w-full mt-2">
                    <a 
                      v-if="form.attachment"
                      :href="form.attachment" 
                      target="_blank"
                      class="flex-1 py-2.5 bg-white text-[#602515] border border-[#602515]/20 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
                    >
                      <Icon icon="solar:eye-bold" />
                      Lihat
                    </a>
                    <button 
                      @click="removeFile"
                      class="px-4 py-2.5 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-rose-100 transition-all"
                    >
                      <Icon icon="solar:trash-bin-trash-bold" />
                      Hapus
                    </button>
                    <label class="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-200 cursor-pointer transition-all">
                      <Icon icon="solar:refresh-bold" />
                      Ganti
                      <input type="file" class="hidden" @change="onFileChange" />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              :disabled="submitting || selectedStudents.length === 0"
              class="relative w-full py-5 bg-gradient-to-r from-[#602515] to-[#8c3d2a] text-white rounded-[1.5rem] font-bold text-lg shadow-2xl shadow-[#602515]/30 hover:shadow-[#602515]/50 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none group overflow-hidden"
            >
              <div class="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div class="flex items-center justify-center gap-3">
                <Icon v-if="submitting" icon="solar:refresh-bold-duotone" class="text-2xl animate-spin" />
                <Icon v-else icon="solar:check-circle-bold-duotone" class="text-2xl" />
                <span>{{ submitting ? 'Menyimpan Data...' : 'Kirim Pengajuan Izin' }}</span>
              </div>
            </button>
          </form>
        </div>
      </div>

      <!-- Right Column: Clinic Integration -->
      <div class="lg:col-span-3 space-y-6">
        <div class="bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-6 md:p-8 shadow-2xl shadow-slate-200/50 border border-white sticky top-24 overflow-hidden">
          <div class="absolute -top-12 -right-12 w-32 h-32 bg-rose-100/40 rounded-full blur-2xl"></div>
          
          <div class="relative z-10">
            <div class="flex items-center gap-4 mb-8">
              <div class="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center shadow-inner">
                <Icon icon="solar:hospital-bold-duotone" class="text-2xl" />
              </div>
              <div>
                <h2 class="font-bold text-slate-800 tracking-tight">Data Klinik</h2>
                <p class="text-xs text-slate-500 font-medium">Validasi medis otomatis</p>
              </div>
            </div>

            <div v-if="loadingClinic" class="flex flex-col items-center py-16 space-y-4">
              <div class="w-12 h-12 border-4 border-rose-100 border-t-rose-500 rounded-full animate-spin"></div>
              <p class="text-xs text-slate-400 font-bold uppercase tracking-widest">Sinkronisasi...</p>
            </div>

            <div v-else-if="clinicExams.length > 0" class="space-y-4">
              <div class="flex items-center justify-between mb-4 px-1">
                <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Hasil Temuan</span>
                <span class="px-2 py-0.5 bg-rose-100 text-rose-600 rounded text-[10px] font-bold">{{ clinicExams.length }}</span>
              </div>
              
              <div class="space-y-3 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                <div
                  v-for="exam in clinicExams"
                  :key="exam.id"
                  :class="isExamSelected(exam) ? 'border-rose-200 bg-rose-50/50 shadow-lg shadow-rose-100/50 scale-[1.02]' : 'border-slate-50 bg-slate-50/30 hover:border-rose-100 hover:bg-rose-50/20'"
                  class="p-4 rounded-2xl border-2 transition-all cursor-pointer group"
                  @click="toggleClinicExam(exam)"
                >
                  <div class="flex justify-between items-start mb-3">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-rose-500 shadow-sm border border-rose-50">
                        {{ (exam.patientName || 'S').charAt(0) }}
                      </div>
                      <div>
                        <div class="font-bold text-slate-800 text-sm group-hover:text-rose-600 transition-colors">{{ exam.patientName || 'Santri' }}</div>
                        <div class="text-[10px] text-slate-400 font-bold">{{ formatDate(exam.examinationDate) }}</div>
                      </div>
                    </div>
                    <div 
                      :class="isExamSelected(exam) ? 'bg-rose-500 text-white' : 'bg-white text-slate-200'"
                      class="w-6 h-6 rounded-full flex items-center justify-center shadow-sm transition-all"
                    >
                      <Icon icon="solar:check-read-bold" class="text-sm" />
                    </div>
                  </div>
                  
                  <div class="bg-white/50 rounded-xl p-3 space-y-2 border border-white">
                    <div class="flex items-start gap-2 text-[11px]">
                      <Icon icon="solar:notes-bold" class="text-rose-400 mt-0.5" />
                      <p class="text-slate-600 font-medium leading-relaxed">{{ exam.diagnosis || 'Tanpa diagnosa spesifik' }}</p>
                    </div>
                    <div v-if="exam.treatment" class="flex items-start gap-2 text-[11px] border-t border-slate-50 pt-2">
                      <Icon icon="solar:pill-bold" class="text-emerald-400 mt-0.5" />
                      <p class="text-slate-500 font-medium italic">{{ exam.treatment }}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                <Icon icon="solar:info-circle-bold" class="text-amber-500 text-xl flex-shrink-0" />
                <p class="text-[11px] text-amber-700 font-medium leading-relaxed">
                  Data yang Anda centang akan dilampirkan sebagai referensi medis dalam riwayat perizinan santri.
                </p>
              </div>
            </div>

            <div v-else class="flex flex-col items-center py-20 text-center px-6">
              <div class="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 shadow-inner rotate-3 group hover:rotate-0 transition-transform">
                <Icon icon="solar:hospital-linear" class="text-4xl text-slate-200" />
              </div>
              <h3 class="font-bold text-slate-400 text-sm mb-1 uppercase tracking-widest">Tidak Ada Data</h3>
              <p class="text-xs text-slate-400 font-medium leading-relaxed">
                Pilih santri dan tentukan tanggal untuk mencari riwayat pemeriksaan klinik.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Status Modal -->
    <StatusModal
      v-model:isOpen="statusModal.show"
      :type="statusModal.type"
      :title="statusModal.title"
      :message="statusModal.message"
      @close="onStatusClose"
    />
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { studentLeavesApi } from '@/services/api';
import { Icon } from '@iconify/vue';
import StatusModal from '@/components/ui/StatusModal.vue';

const props = defineProps({
  initialData: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['success', 'cancel']);

const router = useRouter();

/* ---------- State ---------- */
const isEditing = computed(() => !!props.initialData);

const form = reactive({
  type: props.initialData?.type || 'sick',
  startDate: props.initialData?.startDate ? new Date(props.initialData.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
  endDate: props.initialData?.endDate ? new Date(props.initialData.endDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
  reason: props.initialData?.reason || '',
  attachment: props.initialData?.attachment || '',
});

const selectedStudents = ref(props.initialData?.items?.map(i => i.student) || []);
const searchQuery = ref('');
const searchResults = ref([]);
const showResults = ref(false);
const searching = ref(false);
const clinicExams = ref([]);
const selectedExamIds = ref(props.initialData?.items?.reduce((acc, item) => {
  if (item.clinicExamId) acc[item.studentId] = item.clinicExamId;
  return acc;
}, {}) || {}); 
const submitting = ref(false);
const loadingClinic = ref(false);
const fileName = ref(props.initialData?.attachment ? props.initialData.attachment.split('/').pop() : '');
const searchInput = ref(null);

const statusModal = reactive({
  show: false,
  type: 'success',
  title: '',
  message: '',
});

/* ---------- Logic: Search ---------- */
let searchTimeout = null;
const onSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  
  if (searchQuery.value.length < 2) {
    searchResults.value = [];
    return;
  }

  searching.value = true;
  searchTimeout = setTimeout(async () => {
    try {
      const res = await studentLeavesApi.searchStudents(searchQuery.value);
      searchResults.value = res.data;
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      searching.value = false;
    }
  }, 300);
};

const addStudent = (student) => {
  if (!selectedStudents.value.find(s => s.id === student.id)) {
    selectedStudents.value.push(student);
  }
  searchQuery.value = '';
  searchResults.value = []; // Clear results
  showResults.value = false;
  searchInput.value?.focus();
};

const removeStudent = (id) => {
  selectedStudents.value = selectedStudents.value.filter(s => s.id !== id);
  delete selectedExamIds.value[id];
};

const isSelected = (id) => selectedStudents.value.some(s => s.id === id);

const onKeyDelete = (e) => {
  if (!searchQuery.value && selectedStudents.value.length > 0) {
    selectedStudents.value.pop();
  }
};

/* ---------- Logic: Clinic Sync ---------- */
let clinicTimeout = null;
const fetchClinicData = () => {
  if (clinicTimeout) clearTimeout(clinicTimeout);
  
  if (selectedStudents.value.length === 0) {
    clinicExams.value = [];
    return;
  }

  clinicTimeout = setTimeout(async () => {
    loadingClinic.value = true;
    try {
      const studentIds = selectedStudents.value.map(s => s.id);
      const res = await studentLeavesApi.getClinicData(studentIds, form.startDate, form.endDate);
      clinicExams.value = res.data;
      
      // Auto-match exam if exactly one student selected and they have one exam
      if (selectedStudents.value.length === 1 && res.data.length > 0) {
        const studentId = selectedStudents.value[0].id;
        const match = res.data.find(e => e.patientId === studentId);
        if (match) {
          selectedExamIds.value[studentId] = match.id;
        }
      }
    } catch (e) {
      console.error('Clinic data fetch error:', e);
    } finally {
      loadingClinic.value = false;
    }
  }, 500);
};

// Re-fetch when dependencies change
watch([() => selectedStudents.value.length, () => form.startDate, () => form.endDate], fetchClinicData);

const isExamSelected = (exam) => selectedExamIds.value[exam.patientId] === exam.id;

const toggleClinicExam = (exam) => {
  if (isExamSelected(exam)) {
    delete selectedExamIds.value[exam.patientId];
  } else {
    selectedExamIds.value[exam.patientId] = exam.id;
  }
};

/* ---------- Logic: Files & Submit ---------- */
const onFileChange = async (e) => {
  const file = e.target.files[0];
  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file maksimal 5MB');
      return;
    }
    
    submitting.value = true;
    try {
      const res = await studentLeavesApi.uploadFile(file);
      if (res.success) {
        fileName.value = file.name;
        form.attachment = res.data.url;
      }
    } catch (e) {
      alert('Gagal mengunggah file: ' + (e.message || 'Error'));
    } finally {
      submitting.value = false;
    }
  }
};

const removeFile = () => {
  fileName.value = '';
  form.attachment = '';
};

const handleSubmit = async () => {
  if (selectedStudents.value.length === 0) return;
  
  submitting.value = true;
  try {
    const payload = {
      ...form,
      studentIds: selectedStudents.value.map(s => s.id),
      clinicExamIds: selectedExamIds.value,
    };
    
    if (isEditing.value) {
      await studentLeavesApi.updateLeave(props.initialData.id, payload);
    } else {
      await studentLeavesApi.submitLeave(payload);
    }
    
    statusModal.type = 'success';
    statusModal.title = isEditing.value ? 'Update Berhasil' : 'Pengajuan Berhasil';
    statusModal.message = isEditing.value ? 'Data izin pulang berhasil diperbarui.' : 'Data izin pulang berhasil disimpan.';
    statusModal.show = true;
  } catch (e) {
    statusModal.type = 'error';
    statusModal.title = 'Terjadi Kesalahan';
    statusModal.message = e.message || 'Gagal menyimpan data izin.';
    statusModal.show = true;
  } finally {
    submitting.value = false;
  }
};

const onStatusClose = () => {
  if (statusModal.type === 'success') {
    emit('success');
  }
  statusModal.show = false;
};

/* ---------- Helpers ---------- */
const formatDate = (date) => new Date(date).toLocaleDateString('id-ID', {
  day: 'numeric', month: 'short', year: 'numeric'
});

const handleClickOutside = (e) => {
  const dropdown = document.querySelector('.relative.group');
  if (dropdown && !dropdown.contains(e.target)) {
    showResults.value = false;
  }
};

onMounted(() => {
  window.addEventListener('click', handleClickOutside);
  if (isEditing.value) {
    fetchClinicData();
    if (props.initialData?.attachment) {
      fileName.value = props.initialData.attachment.split('/').pop();
    }
  }
});

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside);
});

// Watch for initialData changes
watch(() => props.initialData, (newVal) => {
  if (newVal) {
    form.type = newVal.type;
    form.startDate = new Date(newVal.startDate).toISOString().split('T')[0];
    form.endDate = new Date(newVal.endDate).toISOString().split('T')[0];
    form.reason = newVal.reason;
    form.attachment = newVal.attachment || '';
    selectedStudents.value = newVal.items?.map(i => i.student) || [];
    selectedExamIds.value = newVal.items?.reduce((acc, item) => {
      if (item.clinicExamId) acc[item.studentId] = item.clinicExamId;
      return acc;
    }, {}) || {};
    if (newVal.attachment) {
      fileName.value = newVal.attachment.split('/').pop();
    }
    fetchClinicData();
  }
}, { deep: true });
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #f1f5f9;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #e2e8f0;
}

input[type="date"]::-webkit-calendar-picker-indicator {
  opacity: 0;
  width: 100%;
  height: 100%;
  position: absolute;
  left: 0;
  top: 0;
  cursor: pointer;
}
</style>
