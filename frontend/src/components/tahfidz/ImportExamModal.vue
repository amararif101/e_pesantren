<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
    @click.self="close"
  >
    <div
      class="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-auto overflow-hidden flex flex-col max-h-[90vh]"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white"
      >
        <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Icon
            icon="solar:file-send-bold-duotone"
            class="text-green-600 w-6 h-6"
          />
          Import Nilai Ujian Tahfidz
        </h3>
        <button
          @click="close"
          class="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <Icon icon="solar:close-circle-bold" class="w-6 h-6" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-6 overflow-y-auto flex-1">
        <!-- Steps -->
        <div class="flex items-center justify-center mb-8">
          <div
            class="flex items-center gap-2 text-sm font-medium"
            :class="
              currentStep === 'upload' ? 'text-green-600' : 'text-slate-400'
            "
          >
            <span
              class="w-6 h-6 rounded-full flex items-center justify-center border"
              :class="
                currentStep === 'upload'
                  ? 'border-green-600 bg-green-50'
                  : 'border-slate-300'
              "
              >1</span
            >
            Upload
          </div>
          <div class="w-12 h-px bg-slate-200 mx-2"></div>
          <div
            class="flex items-center gap-2 text-sm font-medium"
            :class="
              currentStep === 'preview' ? 'text-green-600' : 'text-slate-400'
            "
          >
            <span
              class="w-6 h-6 rounded-full flex items-center justify-center border"
              :class="
                currentStep === 'preview'
                  ? 'border-green-600 bg-green-50'
                  : 'border-slate-300'
              "
              >2</span
            >
            Preview
          </div>
          <div class="w-12 h-px bg-slate-200 mx-2"></div>
          <div
            class="flex items-center gap-2 text-sm font-medium"
            :class="
              currentStep === 'result' ? 'text-green-600' : 'text-slate-400'
            "
          >
            <span
              class="w-6 h-6 rounded-full flex items-center justify-center border"
              :class="
                currentStep === 'result'
                  ? 'border-green-600 bg-green-50'
                  : 'border-slate-300'
              "
              >3</span
            >
            Hasil
          </div>
        </div>

        <!-- STEP 1: UPLOAD -->
        <div v-show="currentStep === 'upload'">
          <!-- Step 1 contents -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Left: Settings -->
            <div class="space-y-4">
              <h4 class="font-semibold text-slate-700">Pengaturan Import</h4>
              <div>
                <label class="block text-xs font-medium text-slate-500 mb-1"
                  >Penguji <span class="text-red-500">*</span></label
                >
                <select
                  v-model="importForm.examinerId"
                  class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-500"
                >
                  <option value="">-- Pilih Penguji --</option>
                  <option v-for="t in examiners" :key="t.id" :value="t.id">
                    {{ t.fullName }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-medium text-slate-500 mb-1"
                  >Tanggal Ujian <span class="text-red-500">*</span></label
                >
                <input
                  v-model="importForm.examDate"
                  type="date"
                  class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-500"
                />
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium text-slate-500 mb-1"
                    >Tahun Ajaran</label
                  >
                  <select
                    v-model="importForm.academicYear"
                    class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-500"
                  >
                    <option
                      v-for="y in academicYears"
                      :key="y.year"
                      :value="y.year"
                    >
                      {{ y.year }}{{ y.isActive ? " (Aktif)" : "" }}
                    </option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-500 mb-1"
                    >Semester</label
                  >
                  <select
                    v-model="importForm.semester"
                    class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-500"
                  >
                    <option
                      v-for="s in semesters"
                      :key="s.id"
                      :value="s.name.toLowerCase()"
                    >
                      {{ s.name }}{{ s.isActive ? " (Aktif)" : "" }}
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label class="block text-xs font-medium text-slate-500 mb-1"
                  >Kategori (Sesuai Template)
                  <span class="text-red-500">*</span></label
                >
                <select
                  v-model="importForm.category"
                  class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:border-green-500"
                >
                  <option value="UPK">UPK (Ujian Pekanan)</option>
                  <option value="UKJ">UKJ (Ujian Kenaikan Juz)</option>
                  <option value="UA">UA (Ujian Akhir)</option>
                  <option value="Suluk">Suluk</option>
                  <option value="Other">Lainnya</option>
                </select>
              </div>
            </div>

            <!-- Right: Download & Upload -->
            <div class="space-y-4">
              <div class="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <h4 class="text-sm font-bold text-blue-700 mb-2">
                  Belum punya template?
                </h4>
                <div class="space-y-3">
                  <div class="grid grid-cols-2 gap-2">
                    <select
                      v-model="templateForm.filterType"
                      class="text-xs px-2 py-1.5 border border-blue-200 rounded bg-white"
                    >
                      <option value="class">Per Kelas</option>
                      <option value="halaqah">Per Halaqah</option>
                    </select>
                    <select
                      v-model="templateForm.filterId"
                      class="text-xs px-2 py-1.5 border border-blue-200 rounded bg-white"
                    >
                      <option value="">-- Pilih --</option>
                      <template v-if="templateForm.filterType === 'class'">
                        <option v-for="c in classes" :key="c.id" :value="c.id">
                          {{ c.name }}
                        </option>
                      </template>
                      <template v-else>
                        <option v-for="h in halaqahs" :key="h.id" :value="h.id">
                          {{ h.name }}
                        </option>
                      </template>
                    </select>
                  </div>
                  <button
                    @click="downloadTemplate"
                    :disabled="downloading || !templateForm.filterId"
                    class="w-full py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <Icon v-if="downloading" icon="svg-spinners:ring-resize" />
                    <Icon v-else icon="solar:download-minimalistic-bold" />
                    Download Template Excel
                  </button>
                </div>
              </div>

              <div
                class="relative border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors h-40 flex flex-col items-center justify-center cursor-pointer"
                :class="{ 'border-green-500 bg-green-50': file }"
                @click="$refs.fileInputRef.click()"
              >
                <input
                  type="file"
                  ref="fileInputRef"
                  @change="handleFileSelect"
                  accept=".xlsx,.xls"
                  class="hidden"
                />
                <div
                  v-if="!file"
                  class="flex flex-col items-center justify-center text-slate-400"
                >
                  <Icon icon="solar:file-smile-linear" class="w-10 h-10 mb-2" />
                  <p class="text-sm font-medium text-slate-600">
                    Klik upload file Excel
                  </p>
                </div>
                <div
                  v-else
                  class="flex flex-col items-center justify-center text-green-600"
                >
                  <Icon icon="solar:file-check-bold" class="w-10 h-10 mb-2" />
                  <p class="text-sm font-medium break-all px-4">
                    {{ file.name }}
                  </p>
                  <p class="text-xs text-slate-500">
                    {{ (file.size / 1024).toFixed(1) }} KB
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- STEP 2: PREVIEW -->
        <div v-show="currentStep === 'preview'" class="space-y-6">
          <!-- Summary Cards -->
          <div class="grid grid-cols-3 gap-4">
            <div
              class="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center"
            >
              <div class="text-xs text-slate-500 font-medium mb-1">
                Total Data
              </div>
              <div class="text-2xl font-bold text-slate-700">
                {{ previewResult?.data?.totalRows || 0 }}
              </div>
            </div>
            <div
              class="bg-green-50 p-4 rounded-xl border border-green-200 text-center"
            >
              <div class="text-xs text-green-600 font-medium mb-1">
                Data Valid
              </div>
              <div class="text-2xl font-bold text-green-700">
                {{ previewResult?.data?.validRows || 0 }}
              </div>
            </div>
            <div
              class="bg-red-50 p-4 rounded-xl border border-red-200 text-center"
            >
              <div class="text-xs text-red-600 font-medium mb-1">
                Data Error
              </div>
              <div class="text-2xl font-bold text-red-700">
                {{ previewResult?.data?.invalidRows || 0 }}
              </div>
            </div>
          </div>

          <!-- Error List -->
          <div
            v-if="previewResult?.data?.errors?.length > 0"
            class="border border-red-200 rounded-xl overflow-hidden"
          >
            <div
              class="bg-red-50 px-4 py-2 text-sm font-bold text-red-700 flex justify-between items-center"
            >
              <span>Daftar Error ({{ previewResult.data.errors.length }})</span>
              <span class="text-xs font-normal opacity-75"
                >Data ini akan dilewati</span
              >
            </div>
            <div class="max-h-40 overflow-y-auto">
              <table class="w-full text-xs text-left">
                <thead class="bg-red-100/50 text-red-800 sticky top-0">
                  <tr>
                    <th class="p-2 w-16 text-center">Baris</th>
                    <th class="p-2 w-24">NIS</th>
                    <th class="p-2">Error</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-red-100">
                  <tr
                    v-for="(err, idx) in previewResult.data.errors"
                    :key="idx"
                    class="hover:bg-red-50/50"
                  >
                    <td class="p-2 text-center font-mono">{{ err.row }}</td>
                    <td class="p-2 font-mono">{{ err.nis || "-" }}</td>
                    <td class="p-2 text-red-600">{{ err.error }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Valid Data Preview -->
          <div
            v-if="previewResult?.data?.validData?.length > 0"
            class="border border-slate-200 rounded-xl overflow-hidden"
          >
            <div
              class="bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 border-b border-slate-200"
            >
              Preview Data Valid ({{ previewResult.data.validData.length }}
              item)
            </div>
            <div class="max-h-60 overflow-y-auto">
              <table class="w-full text-xs text-left">
                <thead class="bg-slate-100 text-slate-600 sticky top-0">
                  <tr>
                    <th class="p-2 w-16 text-center">Baris</th>
                    <th class="p-2">NIS</th>
                    <th class="p-2">Nama</th>
                    <th class="p-2 text-center">Nilai Akhir</th>
                    <th class="p-2 text-center">Ket</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr
                    v-for="(item, i) in previewResult.data.validData"
                    :key="i"
                    class="hover:bg-slate-50"
                  >
                    <td class="p-2 text-center font-mono text-slate-400">
                      {{ item.row }}
                    </td>
                    <td class="p-2 font-medium">{{ item.nis }}</td>
                    <td class="p-2">{{ item.studentName }}</td>
                    <td class="p-2 text-center font-bold">
                      {{ item.finalScore }}
                    </td>
                    <td class="p-2 text-center">
                      <span v-if="!item.verdict" class="text-slate-300">-</span>
                      <span
                        v-else
                        class="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                        :class="
                          item.verdict === 'pass'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        "
                      >
                        {{ item.verdict }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- STEP 3: RESULT -->
        <div v-show="currentStep === 'result'" class="text-center py-8">
          <div
            class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600"
          >
            <Icon icon="solar:check-circle-bold-duotone" class="text-5xl" />
          </div>
          <h4 class="text-2xl font-bold text-slate-800 mb-2">Import Selesai</h4>
          <p class="text-slate-500 mb-8">
            Proses import data ujian telah selesai dilakukan.
          </p>

          <div class="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-8">
            <div class="p-4 bg-green-50 rounded-xl border border-green-200">
              <div class="text-3xl font-bold text-green-700 mb-1">
                {{
                  importResult?.data?.validRows ||
                  previewResult?.data?.validRows ||
                  0
                }}
              </div>
              <div class="text-sm font-medium text-green-800">Berhasil</div>
            </div>
            <div class="p-4 bg-red-50 rounded-xl border border-red-200">
              <div class="text-3xl font-bold text-red-700 mb-1">
                {{
                  importResult?.data?.invalidRows ||
                  previewResult?.data?.invalidRows ||
                  0
                }}
              </div>
              <div class="text-sm font-medium text-red-800">Gagal</div>
            </div>
          </div>

          <div
            v-if="importResult?.errors?.length > 0"
            class="border border-red-200 rounded-xl overflow-hidden text-left max-w-lg mx-auto"
          >
            <div class="bg-red-50 px-4 py-2 text-sm font-bold text-red-700">
              Detailed Errors relating to DB Insert
            </div>
            <div class="max-h-32 overflow-y-auto p-4 text-xs text-red-600">
              <ul class="list-disc pl-4 space-y-1">
                <li v-for="(e, i) in importResult.errors" :key="i">
                  Row {{ e.row }}: {{ e.error }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div
        class="px-6 py-4 border-t bg-slate-50 flex items-center justify-between"
      >
        <!-- Left Action -->
        <div>
          <button
            v-if="currentStep === 'preview'"
            @click="currentStep = 'upload'"
            class="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors text-sm"
          >
            ← Kembali Upload
          </button>
        </div>

        <!-- Right Actions -->
        <div class="flex gap-3">
          <button
            @click="close"
            class="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors text-sm border border-slate-200 bg-white"
          >
            {{ currentStep === "result" ? "Tutup" : "Batal" }}
          </button>

          <button
            v-if="currentStep === 'upload'"
            @click="processPreview"
            :disabled="
              importing ||
              !file ||
              !importForm.examinerId ||
              !importForm.examDate
            "
            class="px-4 py-2 bg-[#602515] text-white font-medium rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#4a1c10] flex items-center gap-2"
          >
            <Icon
              v-if="importing"
              icon="svg-spinners:ring-resize"
              class="w-4 h-4"
            />
            Lanjut Preview
          </button>

          <button
            v-if="currentStep === 'preview'"
            @click="submitImport"
            :disabled="importing || !previewResult?.data?.validRows"
            class="px-4 py-2 bg-green-600 text-white font-medium rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 flex items-center gap-2"
          >
            <Icon
              v-if="importing"
              icon="svg-spinners:ring-resize"
              class="w-4 h-4"
            />
            Import Sekarang
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from "vue";
import { Icon } from "@iconify/vue";
import { tahfidzApi } from "@/services/api";

const props = defineProps({
  isOpen: Boolean,
  classes: {
    type: Array,
    default: () => [],
  },
  halaqahs: {
    type: Array,
    default: () => [],
  },
  examiners: {
    type: Array,
    default: () => [],
  },
  academicYears: {
    type: Array,
    default: () => [],
  },
  semesters: {
    type: Array,
    default: () => [],
  },
  defaultAcademicYear: {
    type: String,
    default: "2024-2025",
  },
  defaultSemester: {
    type: String,
    default: "ganjil",
  },
});

const emit = defineEmits(["close", "success"]);

const currentStep = ref("upload"); // upload | preview | result
const downloading = ref(false);
const importing = ref(false);
const file = ref(null);
const fileInputRef = ref(null);
const previewResult = ref(null);
const importResult = ref(null);

// Form for Template Download
const templateForm = reactive({
  filterType: "class",
  filterId: "",
});

// Form for Import Upload
const importForm = reactive({
  examinerId: "",
  examDate: new Date().toISOString().split("T")[0],
  academicYear: props.defaultAcademicYear,
  semester: props.defaultSemester,
  category: "UPK",
});

watch(
  () => props.isOpen,
  (val) => {
    if (val) resetForm();
  }
);

function close() {
  emit("close");
  resetForm();
}

function resetForm() {
  currentStep.value = "upload";
  file.value = null;
  if (fileInputRef.value) fileInputRef.value.value = "";
  previewResult.value = null;
  importResult.value = null;

  // Reset form values to default props
  importForm.academicYear = props.defaultAcademicYear;
  importForm.semester = props.defaultSemester;
}

function handleFileSelect(e) {
  const files = e.target.files;
  if (files && files.length > 0) {
    file.value = files[0];
  }
}

async function downloadTemplate() {
  if (!templateForm.filterId) return;
  downloading.value = true;
  try {
    const blob = await tahfidzApi.downloadExamTemplate({
      category: importForm.category,
      filterType: templateForm.filterType,
      filterId: templateForm.filterId,
      year: importForm.academicYear,
      semester: importForm.semester,
    });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Template_Ujian_${
      importForm.category
    }_${importForm.academicYear.replace(/[^a-zA-Z0-9]/g, "")}_${
      importForm.semester
    }.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (e) {
    console.error("Download failed:", e);
    alert("Gagal mendownload template: " + e.message);
  } finally {
    downloading.value = false;
  }
}

async function processPreview() {
  if (!file.value) return;
  importing.value = true;

  const formData = new FormData();
  formData.append("file", file.value);
  formData.append("examinerId", importForm.examinerId);
  formData.append("examDate", importForm.examDate);
  formData.append("academicYear", importForm.academicYear);
  formData.append("semester", importForm.semester);
  formData.append("category", importForm.category);

  try {
    const res = await tahfidzApi.previewImportExams(formData);
    previewResult.value = res;
    if (res.success) {
      currentStep.value = "preview";
    } else {
      alert(res.message);
    }
  } catch (e) {
    console.error("Preview failed:", e);
    alert("Gagal preview data: " + e.message);
  } finally {
    importing.value = false;
  }
}

async function submitImport() {
  if (!file.value) return;
  importing.value = true;

  const formData = new FormData();
  formData.append("file", file.value);
  formData.append("examinerId", importForm.examinerId);
  formData.append("examDate", importForm.examDate);
  formData.append("academicYear", importForm.academicYear);
  formData.append("semester", importForm.semester);
  formData.append("category", importForm.category);

  try {
    const res = await tahfidzApi.importExams(formData);
    importResult.value = res;
    currentStep.value = "result";
    emit("success", res);
  } catch (e) {
    console.error("Import failed:", e);
    alert("Gagal mengimport data: " + e.message);
  } finally {
    importing.value = false;
  }
}
</script>
