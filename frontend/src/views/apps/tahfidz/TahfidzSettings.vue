<template>
  <div class="p-2 max-w-4xl mx-auto pb-12">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-slate-800">Pengaturan Tahfidz</h1>
      <p class="text-slate-500">Kelola target hafalan dan kops laporan rapor</p>
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 mb-6 border-b border-slate-200">
      <button
        @click="activeTab = 'targets'"
        :class="[
          'px-4 py-2 font-medium text-sm transition-colors border-b-2',
          activeTab === 'targets'
            ? 'border-[#602515] text-[#602515]'
            : 'border-transparent text-slate-500 hover:text-slate-700',
        ]"
      >
        Target Hafalan
      </button>
      <button
        @click="activeTab = 'header'"
        :class="[
          'px-4 py-2 font-medium text-sm transition-colors border-b-2',
          activeTab === 'header'
            ? 'border-[#602515] text-[#602515]'
            : 'border-transparent text-slate-500 hover:text-slate-700',
        ]"
      >
        Kops & TTD
      </button>
      <button
        @click="activeTab = 'types'"
        :class="[
          'px-4 py-2 font-medium text-sm transition-colors border-b-2',
          activeTab === 'types'
            ? 'border-[#602515] text-[#602515]'
            : 'border-transparent text-slate-500 hover:text-slate-700',
        ]"
      >
        Jenis Ujian
      </button>
    </div>

    <!-- TAB: TARGETS -->
    <div v-if="activeTab === 'targets'">
      <!-- Add Button -->
      <div class="mb-4">
        <button
          @click="openModal()"
          class="px-4 py-2 bg-[#602515] text-white rounded-lg hover:bg-[#4a1c10] flex items-center gap-2"
        >
          <Icon icon="solar:add-circle-bold" />
          Tambah Target Baru
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="h-32 flex items-center justify-center">
        <span class="text-slate-500 animate-pulse">Memuat data...</span>
      </div>

      <!-- Targets Table -->
      <div
        v-else
        class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hidden md:block"
      >
        <table class="w-full text-sm">
          <thead class="bg-slate-50">
            <tr>
              <th class="p-3 text-left font-medium text-slate-700">Level</th>
              <th class="p-3 text-center font-medium text-slate-700">
                Target (Halaman/Bulan)
              </th>
              <th class="p-3 text-center font-medium text-slate-700">
                Target (Juz/Smt)
              </th>
              <th class="p-3 text-left font-medium text-slate-700">
                Keterangan
              </th>
              <th class="p-3 text-center font-medium text-slate-700">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="t in targets" :key="t.id" class="hover:bg-slate-50">
              <td class="p-3 font-medium text-slate-800">{{ t.level }}</td>
              <td class="p-3 text-center">
                <span
                  class="px-3 py-1 bg-amber-100 text-amber-800 rounded-full font-bold"
                >
                  {{ t.targetPages }}
                </span>
              </td>
              <td class="p-3 text-center">
                <span
                  v-if="t.targetJuz"
                  class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-bold"
                >
                  {{ t.targetJuz }}
                </span>
                <span v-else class="text-slate-400">-</span>
              </td>
              <td class="p-3 text-slate-600">{{ t.description || "-" }}</td>
              <td class="p-3 text-center">
                <div class="flex justify-center gap-2">
                  <button
                    @click="openModal(t)"
                    class="p-2 text-amber-900 hover:bg-amber-50 rounded-lg"
                    title="Edit"
                  >
                    <Icon icon="solar:pen-bold" />
                  </button>
                  <button
                    @click="confirmDelete(t)"
                    class="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Hapus"
                  >
                    <Icon icon="solar:trash-bin-minimalistic-bold" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!targets.length">
              <td colspan="4" class="p-6 text-center text-slate-500 italic">
                Belum ada data target. Klik "Tambah Target Baru" untuk
                menambahkan.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile View: Targets -->
      <div
        v-if="!loading && activeTab === 'targets'"
        class="md:hidden space-y-3"
      >
        <div
          v-if="!targets.length"
          class="p-8 text-center text-slate-500 italic bg-slate-50 rounded-xl border border-dashed border-slate-300"
        >
          Belum ada data target.
        </div>
        <div
          v-for="t in targets"
          :key="'m-' + t.id"
          class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3"
        >
          <div class="flex justify-between items-start">
            <div>
              <h4 class="font-bold text-slate-800 text-lg">{{ t.level }}</h4>
              <span
                class="inline-block mt-1 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold"
              >
                Target: {{ t.targetPages }} Halaman/Bulan
              </span>
              <span
                v-if="t.targetJuz"
                class="inline-block mt-1 ml-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold"
              >
                {{ t.targetJuz }} Juz/Smt
              </span>
            </div>
            <div class="flex gap-1">
              <button
                @click="openModal(t)"
                class="p-2 text-amber-900 hover:bg-amber-50 rounded-lg"
              >
                <Icon icon="solar:pen-bold" />
              </button>
              <button
                @click="confirmDelete(t)"
                class="p-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                <Icon icon="solar:trash-bin-minimalistic-bold" />
              </button>
            </div>
          </div>
          <div
            v-if="t.description"
            class="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg"
          >
            {{ t.description }}
          </div>
        </div>
      </div>
    </div>

    <!-- TAB: HEADER SETTINGS (KOP SURAT) -->
    <div v-else-if="activeTab === 'header'">
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 class="font-bold text-slate-800 mb-2">Kop Surat Rapor Tahfidz</h3>
        <p class="text-sm text-slate-500 mb-6">
          Upload gambar kop surat yang akan digunakan sebagai header rapor
          tahfidz. Disarankan menggunakan gambar dengan rasio lebar (landscape)
          dan resolusi tinggi.
        </p>

        <!-- Upload Zone -->
        <div
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
          :class="[
            'relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer',
            isDragging
              ? 'border-[#602515] bg-[#602515]/5 scale-[1.01]'
              : 'border-slate-300 hover:border-[#602515]/50 hover:bg-slate-50',
          ]"
          @click="triggerFileInput"
        >
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleFileSelect"
          />

          <!-- Upload Progress -->
          <div v-if="uploadingHeader" class="flex flex-col items-center gap-4">
            <div
              class="w-16 h-16 rounded-full border-4 border-[#602515]/20 border-t-[#602515] animate-spin"
            ></div>
            <span class="text-slate-600 font-medium">Mengupload gambar...</span>
          </div>

          <!-- Preview (if image exists) -->
          <div v-else-if="headerForm.institutionLogo" class="space-y-4">
            <img
              :src="getImageUrl(headerForm.institutionLogo)"
              alt="Kop Surat Preview"
              class="max-h-48 mx-auto rounded-lg shadow-lg border border-slate-200"
            />
            <div class="flex items-center justify-center gap-3">
              <button
                @click.stop="triggerFileInput"
                class="px-4 py-2 text-sm font-medium text-[#602515] border border-[#602515] rounded-lg hover:bg-[#602515]/5 flex items-center gap-2"
              >
                <Icon icon="solar:gallery-edit-bold" />
                Ganti Gambar
              </button>
              <button
                @click.stop="removeHeader"
                class="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 flex items-center gap-2"
              >
                <Icon icon="solar:trash-bin-trash-bold" />
                Hapus
              </button>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="space-y-4">
            <div
              class="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#602515]/10 to-[#602515]/5 flex items-center justify-center"
            >
              <Icon
                icon="solar:cloud-upload-bold-duotone"
                class="w-10 h-10 text-[#602515]"
              />
            </div>
            <div>
              <p class="text-slate-700 font-medium">
                Drag & drop gambar kop surat di sini
              </p>
              <p class="text-slate-500 text-sm mt-1">
                atau klik untuk memilih file (PNG, JPG, max 5MB)
              </p>
            </div>
          </div>
        </div>

        <!-- Tips -->
        <div
          class="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3"
        >
          <Icon
            icon="solar:lightbulb-bolt-bold"
            class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"
          />
          <div class="text-sm text-amber-900">
            <p class="font-medium mb-1">Tips:</p>
            <ul class="list-disc list-inside space-y-1 text-amber-800">
              <li>
                Saran Resolusi: <b>1000px x 200px</b> (Rasio 5:1) agar optimal
                di Excel.
              </li>
              <li>Gunakan format PNG dengan background transparan.</li>
              <li>Pastikan teks pada kop surat terbaca dengan jelas.</li>
            </ul>
          </div>
        </div>

        <!-- Signature Names Section -->
        <div class="mt-8 border-t pt-6">
          <h4 class="font-bold text-slate-800 mb-4">Nama Tanda Tangan</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Ketua Tahfidz Ikhwan -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">
                Ketua Bagian Tahfidz (Ikhwan)
              </label>
              <input
                v-model="headerForm.tahfidzHeadName"
                type="text"
                class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none"
                placeholder="Nama lengkap + Gelar"
              />
            </div>
            <!-- Ketua Tahfidz Akhwat -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">
                Ketua Bagian Tahfidz (Akhwat)
                <span class="text-slate-400 font-normal">(Opsional)</span>
              </label>
              <input
                v-model="headerForm.tahfidzHeadNameAkhwat"
                type="text"
                class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none"
                placeholder="Kosongkan jika sama dengan Ikhwan"
              />
              <p class="text-xs text-slate-500 mt-1">
                Jika diisi, nama ini akan tampil di rapor siswi (perempuan).
              </p>
            </div>
          </div>

          <!-- Save Button -->
          <div class="mt-6 flex justify-end">
            <button
              @click="saveHeaderSettings"
              :disabled="savingHeader"
              class="px-6 py-2 bg-[#602515] text-white rounded-lg hover:bg-[#4a1c10] disabled:opacity-50 flex items-center gap-2"
            >
              <Icon
                v-if="savingHeader"
                icon="solar:spinner-bold"
                class="animate-spin"
              />
              <Icon v-else icon="solar:diskette-bold-duotone" />
              {{ savingHeader ? "Menyimpan..." : "Simpan Pengaturan" }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB: EXAM TYPES -->
    <div v-if="activeTab === 'types'">
      <!-- Add Button -->
      <div class="mb-4">
        <button
          @click="openTypeModal()"
          class="px-4 py-2 bg-[#602515] text-white rounded-lg hover:bg-[#4a1c10] flex items-center gap-2"
        >
          <Icon icon="solar:add-circle-bold" />
          Tambah Jenis Ujian
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loadingTypes" class="h-32 flex items-center justify-center">
        <span class="text-slate-500 animate-pulse">Memuat data...</span>
      </div>

      <!-- Types Table -->
      <div
        v-else
        class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hidden md:block"
      >
        <table class="w-full text-sm">
          <thead class="bg-slate-50">
            <tr>
              <th class="p-3 text-left font-medium text-slate-700">
                Nama Ujian
              </th>
              <th class="p-3 text-left font-medium text-slate-700">Kategori</th>
              <th class="p-3 text-left font-medium text-slate-700">
                Deskripsi
              </th>
              <th class="p-3 text-center font-medium text-slate-700">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="t in examTypes" :key="t.id" class="hover:bg-slate-50">
              <td class="p-3 font-medium text-slate-800">{{ t.name }}</td>
              <td class="p-3 text-slate-600">
                <span
                  class="px-2 py-1 rounded text-xs font-semibold"
                  :class="{
                    'bg-blue-100 text-blue-700': t.category === 'UPK',
                    'bg-green-100 text-green-700': t.category === 'UKJ',
                    'bg-purple-100 text-purple-700': t.category === 'UA',
                    'bg-amber-100 text-amber-700': t.category === 'Suluk',
                    'bg-teal-100 text-teal-700': t.category === 'Jilsah',
                    'bg-indigo-100 text-indigo-700': t.category === 'Sertifikasi',
                    'bg-slate-100 text-slate-700': t.category === 'Other',
                  }"
                  >{{ t.category }}</span
                >
              </td>
              <td class="p-3 text-slate-600">{{ t.description || "-" }}</td>
              <td class="p-3 text-center">
                <div class="flex justify-center gap-2">
                  <button
                    @click="openTypeModal(t)"
                    class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Edit"
                  >
                    <Icon icon="solar:pen-bold" />
                  </button>
                  <button
                    @click="confirmDeleteType(t)"
                    class="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Hapus"
                  >
                    <Icon icon="solar:trash-bin-minimalistic-bold" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!examTypes.length">
              <td colspan="4" class="p-6 text-center text-slate-500 italic">
                Belum ada jenis ujian. Klik "Tambah Jenis Ujian" untuk
                menambahkan.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile View: Exam Types -->
      <div
        v-if="!loadingTypes && activeTab === 'types'"
        class="md:hidden space-y-3"
      >
        <div
          v-if="!examTypes.length"
          class="p-8 text-center text-slate-500 italic bg-slate-50 rounded-xl border border-dashed border-slate-300"
        >
          Belum ada jenis ujian.
        </div>
        <div
          v-for="t in examTypes"
          :key="'m-type-' + t.id"
          class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3"
        >
          <div class="flex justify-between items-start">
            <div>
              <h4 class="font-bold text-slate-800 text-lg">{{ t.name }}</h4>
              <span
                class="inline-block mt-1 px-2 py-1 rounded text-xs font-semibold"
                :class="{
                  'bg-blue-100 text-blue-700': t.category === 'UPK',
                  'bg-green-100 text-green-700': t.category === 'UKJ',
                  'bg-purple-100 text-purple-700': t.category === 'UA',
                  'bg-amber-100 text-amber-700': t.category === 'Suluk',
                  'bg-teal-100 text-teal-700': t.category === 'Jilsah',
                  'bg-indigo-100 text-indigo-700': t.category === 'Sertifikasi',
                  'bg-slate-100 text-slate-700': t.category === 'Other',
                }"
                >{{ t.category }}</span
              >
            </div>
            <div class="flex gap-1">
              <button
                @click="openTypeModal(t)"
                class="p-2 text-amber-900 hover:bg-amber-50 rounded-lg"
              >
                <Icon icon="solar:pen-bold" />
              </button>
              <button
                @click="confirmDeleteType(t)"
                class="p-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                <Icon icon="solar:trash-bin-minimalistic-bold" />
              </button>
            </div>
          </div>
          <div
            v-if="t.description"
            class="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg"
          >
            {{ t.description }}
          </div>
        </div>
      </div>
    </div>

    <!-- Modal (Exam Types) -->
    <div
      v-if="showTypeModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
      @click.self="showTypeModal = false"
    >
      <div class="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <h3 class="text-lg font-bold text-slate-800 mb-4">
          {{ typeForm.id ? "Edit Jenis Ujian" : "Tambah Jenis Ujian" }}
        </h3>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1"
              >Nama Ujian</label
            >
            <input
              v-model="typeForm.name"
              type="text"
              placeholder="misal: Ujian Kenaikan Juz 30"
              class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1"
              >Kategori</label
            >
            <select
              v-model="typeForm.category"
              class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none"
            >
              <option value="Other">Other (Umum)</option>
              <option value="UPK">UPK (Ujian Pekanan)</option>
              <option value="UKJ">UKJ (Ujian Kenaikan Juz)</option>
              <option value="UA">UA (Ujian Akhir)</option>
              <option value="Suluk">Suluk (Ujian Adab)</option>
              <option value="Jilsah">Jilsah</option>
              <option value="Sertifikasi">Sertifikasi</option>
            </select>
            <p class="text-xs text-slate-500 mt-1">
              Kategori menentukan input nilai khusus (misal: UKJ butuh input
              Juz).
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1"
              >Deskripsi (Opsional)</label
            >
            <textarea
              v-model="typeForm.description"
              rows="2"
              placeholder="Keterangan tambahan..."
              class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none"
            ></textarea>
          </div>
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <button
            @click="showTypeModal = false"
            class="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            @click="saveType"
            :disabled="savingType"
            class="px-4 py-2 bg-[#602515] text-white rounded-lg hover:bg-[#4a1c10] disabled:opacity-50"
          >
            {{ savingType ? "Menyimpan..." : "Simpan" }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal (Targets) -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
      @click.self="showModal = false"
    >
      <div class="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <h3 class="text-lg font-bold text-slate-800 mb-4">
          {{ form.id ? "Edit Target" : "Tambah Target Baru" }}
        </h3>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1"
              >Level</label
            >
            <input
              v-model="form.level"
              type="text"
              placeholder="misal: SD, SMP, SMA, Tahfidz"
              class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none"
              :disabled="!!form.id"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">
              Target (Halaman per Bulan)
            </label>
            <input
              v-model.number="form.targetPages"
              type="number"
              min="1"
              placeholder="misal: 6"
              class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">
              Target (Juz per Semester)
            </label>
            <input
              v-model.number="form.targetJuz"
              type="number"
              step="0.1"
              min="0"
              placeholder="misal: 1 atau 0.5"
              class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1"
              >Keterangan (Opsional)</label
            >
            <textarea
              v-model="form.description"
              rows="2"
              placeholder="Deskripsi target..."
              class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none"
            ></textarea>
          </div>
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <button
            @click="showModal = false"
            class="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            @click="saveTarget"
            :disabled="saving"
            class="px-4 py-2 bg-[#602515] text-white rounded-lg hover:bg-[#4a1c10] disabled:opacity-50"
          >
            {{ saving ? "Menyimpan..." : "Simpan" }}
          </button>
        </div>
      </div>
    </div>

    <!-- CONFIRM MODAL -->
    <ConfirmModal
      :isOpen="confirmModal.isOpen"
      :title="confirmModal.title"
      :message="confirmModal.message"
      confirmText="Hapus"
      cancelText="Batal"
      type="danger"
      @confirm="handleConfirm"
      @cancel="confirmModal.isOpen = false"
    />

    <!-- STATUS MODAL -->
    <StatusModal
      :isOpen="statusModal.isOpen"
      :type="statusModal.type"
      :title="statusModal.title"
      :message="statusModal.message"
      @close="statusModal.isOpen = false"
    />

    <!-- CROPPER MODAL -->
    <ImageCropperModal
      :is-open="showCropper"
      :image-src="cropperImageSrc"
      @close="showCropper = false"
      @crop="handleCrop"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from "vue";
import ImageCropperModal from "@/components/ui/ImageCropperModal.vue";
import { Icon } from "@iconify/vue";
import { tahfidzApi, uploadsApi } from "@/services/api";
import ConfirmModal from "@/components/ui/ConfirmModal.vue";
import StatusModal from "@/components/ui/StatusModal.vue";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

const activeTab = ref("targets");
const loading = ref(false);
const saving = ref(false);
const savingHeader = ref(false);
const uploadingHeader = ref(false);
const isDragging = ref(false);
const fileInput = ref(null);
const targets = ref([]);
const showModal = ref(false);

// Cropper State
const showCropper = ref(false);
const cropperImageSrc = ref("");

const form = reactive({
  id: null,
  level: "",
  targetPages: 6,
  targetJuz: 1,
  description: "",
});

const headerForm = reactive({
  institutionName: "",
  institutionAddress: "",
  institutionLogo: "",
  contactInfo: "",
  headmasterName: "",
  tahfidzHeadName: "",
  tahfidzHeadNameAkhwat: "",
  cityDate: "Purwakarta",
});

const confirmModal = reactive({
  isOpen: false,
  title: "",
  message: "",
  item: null,
  action: null, // 'delete_target' | 'delete_type'
});

const statusModal = reactive({
  isOpen: false,
  type: "success",
  title: "",
  message: "",
});

function showStatus(type, title, message) {
  statusModal.type = type;
  statusModal.title = title;
  statusModal.message = message;
  statusModal.isOpen = true;
}

// --- TARGETS LOGIC ---
async function loadTargets() {
  loading.value = true;
  try {
    const res = await tahfidzApi.getTargets();
    if (res.success) {
      targets.value = res.data || [];
    }
  } catch (e) {
    console.error("Failed to load targets:", e);
  } finally {
    loading.value = false;
  }
}

function openModal(item = null) {
  if (item) {
    form.id = item.id;
    form.level = item.level;
    form.targetPages = item.targetPages;
    form.targetJuz = item.targetJuz || 0;
    form.description = item.description || "";
  } else {
    form.id = null;
    form.level = "";
    form.targetPages = 6;
    form.targetJuz = 1;
    form.description = "";
  }
  showModal.value = true;
}

async function saveTarget() {
  if (!form.level || !form.targetPages) {
    showStatus("warning", "Validasi Gagal", "Level dan Target harus diisi!");
    return;
  }

  saving.value = true;
  try {
    const payload = {
      level: form.level,
      targetPages: form.targetPages,
      targetJuz: form.targetJuz,
      description: form.description || null,
    };

    if (form.id) {
      await tahfidzApi.updateTarget(form.id, payload);
      showStatus("success", "Berhasil", "Data target berhasil diperbarui");
    } else {
      await tahfidzApi.createTarget(payload);
      showStatus("success", "Berhasil", "Target baru berhasil ditambahkan");
    }

    showModal.value = false;
    loadTargets();
  } catch (e) {
    console.error("Failed to save target:", e);
    showStatus("error", "Gagal", "Terjadi kesalahan saat menyimpan target");
  } finally {
    saving.value = false;
  }
}

function confirmDelete(item) {
  confirmModal.item = item;
  confirmModal.action = "delete_target";
  confirmModal.title = "Hapus Target?";
  confirmModal.message = `Target level ${item.level} akan dihapus permanen.`;
  confirmModal.isOpen = true;
}

async function handleConfirm() {
  confirmModal.isOpen = false;

  if (confirmModal.action === "delete_target") {
    try {
      await tahfidzApi.deleteTarget(confirmModal.item.id);
      showStatus("success", "Berhasil", "Target berhasil dihapus");
      loadTargets();
    } catch (e) {
      console.error("Failed to delete target:", e);
      showStatus("error", "Gagal", "Gagal menghapus target");
    }
  } else if (confirmModal.action === "delete_type") {
    try {
      await tahfidzApi.deleteExamType(confirmModal.item.id);
      showStatus("success", "Berhasil", "Jenis ujian berhasil dihapus");
      loadExamTypes();
    } catch (e) {
      console.error(e);
      showStatus("error", "Gagal", "Gagal menghapus jenis ujian");
    }
  }
}

// --- HEADER SETTINGS LOGIC ---
async function loadSettings() {
  try {
    const res = await tahfidzApi.getSettings();
    if (res.success && res.data) {
      Object.assign(headerForm, res.data);
    }
  } catch (e) {
    console.error("Failed to load settings:", e);
  }
}

function getImageUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_BASE}/api/${path}`;
}

function triggerFileInput() {
  fileInput.value?.click();
}

function handleDrop(e) {
  isDragging.value = false;
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    processFile(files[0]);
  }
}

function handleFileSelect(e) {
  const files = e.target?.files;
  if (files && files.length > 0) {
    processFile(files[0]);
  }
  // Reset input so same file can be selected again
  if (e.target) e.target.value = "";
}

// Process file before upload (Validate & Open Cropper)
function processFile(file) {
  if (!file.type.startsWith("image/")) {
    showStatus(
      "warning",
      "File Tidak Valid",
      "Silakan pilih file gambar (PNG, JPG)"
    );
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    showStatus(
      "warning",
      "File Terlalu Besar",
      "Ukuran maksimal file adalah 5MB"
    );
    return;
  }

  // Read as DataURL for Cropper
  const reader = new FileReader();
  reader.onload = (e) => {
    cropperImageSrc.value = e.target.result;
    showCropper.value = true;
  };
  reader.readAsDataURL(file);
}

// Handle Crop Result (Blob)
async function handleCrop(blob) {
  showCropper.value = false;
  // Convert Blob to File
  const file = new File([blob], "header-crop.png", { type: "image/png" });
  await uploadFile(file);
}

async function uploadFile(file) {
  uploadingHeader.value = true;
  try {
    const res = await uploadsApi.upload(file);
    if (res.success && res.data?.filePath) {
      headerForm.institutionLogo = res.data.filePath;
      // Auto save after upload
      await saveHeaderSettings();
      showStatus(
        "success",
        "Berhasil",
        "Gambar kop surat berhasil diupload dan disimpan"
      );
    } else {
      throw new Error(res.message || "Upload gagal");
    }
  } catch (e) {
    console.error("Upload error:", e);
    showStatus(
      "error",
      "Gagal Upload",
      e.message || "Terjadi kesalahan saat mengupload gambar"
    );
  } finally {
    uploadingHeader.value = false;
  }
}

async function removeHeader() {
  headerForm.institutionLogo = "";
  await saveHeaderSettings();
  showStatus("success", "Berhasil", "Gambar kop surat berhasil dihapus");
}

async function saveHeaderSettings() {
  savingHeader.value = true;
  try {
    await tahfidzApi.updateSettings({
      institutionLogo: headerForm.institutionLogo,
      institutionName: headerForm.institutionName || "Default",
      tahfidzHeadName: headerForm.tahfidzHeadName,
      tahfidzHeadNameAkhwat: headerForm.tahfidzHeadNameAkhwat,
    });
    showStatus("success", "Berhasil", "Pengaturan berhasil disimpan");
  } catch (e) {
    console.error(e);
    throw e;
  } finally {
    savingHeader.value = false;
  }
}

// Watch tab to load data logic
watch(activeTab, (val) => {
  if (val === "targets" && targets.value.length === 0) loadTargets();
  if (val === "header") loadSettings();
  if (val === "types" && examTypes.value.length === 0) loadExamTypes();
});

onMounted(() => {
  loadTargets();
});

// --- EXAM TYPES LOGIC ---
const loadingTypes = ref(false);
const savingType = ref(false);
const examTypes = ref([]);
const showTypeModal = ref(false);

const typeForm = reactive({
  id: null,
  name: "",
  category: "Other",
  description: "",
});

async function loadExamTypes() {
  loadingTypes.value = true;
  try {
    const res = await tahfidzApi.getExamTypes();
    if (res.success) {
      examTypes.value = res.data || [];
    }
  } catch (e) {
    console.error("Failed to load exam types:", e);
  } finally {
    loadingTypes.value = false;
  }
}

function openTypeModal(item = null) {
  if (item) {
    typeForm.id = item.id;
    typeForm.name = item.name;
    typeForm.category = item.category;
    typeForm.description = item.description || "";
  } else {
    typeForm.id = null;
    typeForm.name = "";
    typeForm.category = "Other";
    typeForm.description = "";
  }
  showTypeModal.value = true;
}

async function saveType() {
  if (!typeForm.name) {
    showStatus("warning", "Validasi Gagal", "Nama Ujian harus diisi!");
    return;
  }
  savingType.value = true;
  try {
    const payload = {
      name: typeForm.name,
      category: typeForm.category,
      description: typeForm.description || null,
    };

    if (typeForm.id) {
      await tahfidzApi.updateExamType(typeForm.id, payload);
      showStatus("success", "Berhasil", "Jenis ujian berhasil diperbarui");
    } else {
      await tahfidzApi.createExamType(payload);
      showStatus(
        "success",
        "Berhasil",
        "Jenis ujian baru berhasil ditambahkan"
      );
    }
    showTypeModal.value = false;
    loadExamTypes();
  } catch (e) {
    console.error(e);
    showStatus("error", "Gagal", "Gagal menyimpan jenis ujian");
  } finally {
    savingType.value = false;
  }
}

function confirmDeleteType(item) {
  confirmModal.item = item;
  confirmModal.action = "delete_type";
  confirmModal.title = "Hapus Jenis Ujian?";
  confirmModal.message = `Jenis ujian "${item.name}" akan dihapus permanen.`;
  confirmModal.isOpen = true;
}
</script>
