<template>
  <div>
    <DataTable
      title="Data Pasien Klinik"
      description="Database seluruh pasien yang pernah berobat."
      icon="solar:users-group-two-rounded-bold-duotone"
      :items="paginatedPatients"
      :columns="columns"
      :loading="loading"
      v-model:search="search"
      v-model:viewMode="viewMode"
      :pagination="pagination"
      @page-change="onPageChange"
      @update:limit="onLimitChange"
      :sortBy="sortBy"
      :sortOrder="sortOrder"
      @sort="handleSort"
    >
      <template #filters="{ close }">
        <div class="space-y-4">
          <h4 class="font-bold text-sm text-slate-700">Filter Data</h4>
          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1"
              >Tipe Pasien</label
            >
            <select
              v-model="filters.type"
              class="w-full border border-slate-200 rounded-lg text-sm px-3 py-2"
            >
              <option value="">Semua</option>
              <option value="student">Santri</option>
              <option value="teacher">Guru</option>
              <option value="external">Umum/Eksternal</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1"
              >Jenis Kelamin</label
            >
            <select
              v-model="filters.gender"
              class="w-full border border-slate-200 rounded-lg text-sm px-3 py-2"
            >
              <option value="">Semua</option>
              <option value="L">Ikhwan</option>
              <option value="P">Akhwat</option>
            </select>
          </div>
          <div class="pt-2 flex justify-end">
            <button
              @click="resetFilters"
              class="text-xs text-red-600 font-medium hover:underline"
            >
              Reset Filter
            </button>
          </div>
        </div>
      </template>

      <template #cell-type="{ item }">
        <span
          v-if="item.type === 'student'"
          class="px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100"
        >
          Santri
        </span>
        <span
          v-else-if="item.type === 'teacher'"
          class="px-2 py-1 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100"
        >
          Guru
        </span>
        <span
          v-else
          class="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200"
        >
          Umum/Eksternal
        </span>
      </template>

      <template #cell-class="{ item }">
        <span class="text-slate-600 font-medium text-sm">{{
          item.class ? item.class.name : "-"
        }}</span>
      </template>

      <template #cell-halaqah="{ item }">
        <span class="text-slate-600 font-medium text-sm">{{
          item.halaqah ? item.halaqah.name : "-"
        }}</span>
      </template>

      <template #cell-room="{ item }">
        <span class="text-slate-600 font-medium text-sm">{{
          item.room ? item.room.name : "-"
        }}</span>
      </template>

      <template #cell-actions="{ item }">
        <div class="flex justify-end gap-2">
          <button
            @click="viewHistory(item)"
            class="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
            title="Riwayat Medis"
          >
            <Icon icon="solar:medical-kit-linear" class="text-lg" />
          </button>
          <!-- Only allow edit for External patients or adding clinical details to others -->
          <button
            @click="openEdit(item)"
            class="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
            title="Edit Data Klinis"
          >
            <Icon icon="solar:pen-new-square-linear" class="text-lg" />
          </button>
          <button
            @click="confirmDelete(item)"
            class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            title="Hapus Data Pasien"
          >
            <Icon icon="solar:trash-bin-trash-linear" class="text-lg" />
          </button>
        </div>
      </template>

      <!-- Card View Template -->
      <template #card-item="{ item }">
        <div
          class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-all flex flex-col gap-4 h-full relative group"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <div
                class="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-sm font-bold"
                :class="
                  item.gender === 'P'
                    ? 'bg-pink-50 text-pink-600'
                    : 'bg-blue-50 text-blue-600'
                "
              >
                {{ item.name.charAt(0) }}
              </div>
              <div class="flex-1 min-w-0">
                <h3
                  class="font-bold text-slate-800 text-sm leading-tight line-clamp-2"
                  :title="item.name"
                >
                  {{ item.name }}
                </h3>
                <div class="text-[10px] text-slate-500 mt-0.5">
                  {{ item.age && item.age !== "-" ? `${item.age} Tahun` : "-" }}
                </div>
              </div>
            </div>
          </div>

          <div
            class="grid grid-cols-2 gap-3 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100"
          >
            <div>
              <span
                class="block text-[9px] uppercase tracking-wider text-slate-400 mb-1"
                >Tipe Pasien</span
              >
              <span
                v-if="item.type === 'student'"
                class="font-semibold text-blue-600"
                >Santri</span
              >
              <span
                v-else-if="item.type === 'teacher'"
                class="font-semibold text-amber-600"
                >Guru</span
              >
              <span v-else class="font-semibold text-slate-600">Umum</span>
            </div>
            <div>
              <span
                class="block text-[9px] uppercase tracking-wider text-slate-400 mb-1"
                >Gol. Darah</span
              >
              <span class="font-semibold">{{ item.bloodType || "-" }}</span>
            </div>
          </div>

          <div
            v-if="item.class || item.room || item.halaqah"
            class="grid grid-cols-2 gap-2 text-[11px] text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100"
          >
            <div v-if="item.class" class="flex items-center gap-1.5">
              <Icon
                icon="solar:book-bookmark-bold-duotone"
                class="text-slate-400 shrink-0 text-sm"
              />
              <span class="truncate">{{ item.class.name }}</span>
            </div>
            <div v-if="item.room" class="flex items-center gap-1.5">
              <Icon
                icon="solar:bed-bold-duotone"
                class="text-slate-400 shrink-0 text-sm"
              />
              <span class="truncate">{{ item.room.name }}</span>
            </div>
            <div
              v-if="item.halaqah"
              class="col-span-2 flex items-center gap-1.5"
            >
              <Icon
                icon="solar:users-group-two-rounded-bold-duotone"
                class="text-slate-400 shrink-0 text-sm"
              />
              <span class="truncate">{{ item.halaqah.name }}</span>
            </div>
          </div>

          <div
            class="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-3"
          >
            <!-- Address -->
            <div
              class="flex flex-1 items-center gap-1.5 text-xs text-slate-500 min-w-0"
            >
              <Icon
                icon="solar:map-point-linear"
                class="shrink-0 text-slate-400"
              />
              <span
                class="truncate"
                :title="item.fullAddress || item.address"
                >{{ item.fullAddress || item.address || "Alamat -" }}</span
              >
            </div>

            <!-- Actions -->
            <div
              class="flex gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
            >
              <button
                @click.stop="viewHistory(item)"
                class="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                title="Riwayat Medis"
              >
                <Icon icon="solar:medical-kit-linear" class="text-base" />
              </button>
              <button
                @click.stop="openEdit(item)"
                class="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                title="Edit"
              >
                <Icon icon="solar:pen-new-square-linear" class="text-base" />
              </button>
              <button
                @click.stop="confirmDelete(item)"
                class="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Hapus"
              >
                <Icon icon="solar:trash-bin-trash-linear" class="text-base" />
              </button>
            </div>
          </div>
        </div>
      </template>
    </DataTable>

    <!-- Patient Edit Modal -->
    <Teleport to="body">
      <div
        v-if="modal.show"
        class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      >
        <div
          class="absolute inset-0 bg-black/40 backdrop-blur-sm"
          @click="closeModal"
        ></div>
        <div
          class="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-fade-in-up relative z-10 flex flex-col max-h-[90vh]"
        >
          <div
            class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50"
          >
            <h3 class="font-bold text-slate-800">Edit Data Pasien</h3>
            <button
              @click="closeModal"
              class="text-slate-400 hover:text-slate-600"
            >
              <Icon icon="solar:close-circle-bold" class="text-xl" />
            </button>
          </div>

          <div class="p-6 overflow-y-auto custom-scrollbar">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-xs font-semibold text-slate-500 mb-1"
                  >Nama Lengkap</label
                >
                <input
                  v-model="form.name"
                  :disabled="form.type !== 'external'"
                  class="w-full border rounded-lg px-4 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-500 mb-1"
                  >Jenis Layanan (Tipe)</label
                >
                <input
                  :value="form.type.toUpperCase()"
                  disabled
                  class="w-full border rounded-lg px-4 py-2 text-sm bg-slate-100 text-slate-500"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-xs font-semibold text-slate-500 mb-1"
                  >No. Telepon/HP</label
                >
                <input
                  v-model="form.phone"
                  class="w-full border rounded-lg px-4 py-2 text-sm"
                  placeholder="08..."
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-500 mb-1"
                  >Jenis Kelamin</label
                >
                <select
                  v-model="form.gender"
                  class="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm"
                >
                  <option value="L">Ikhwan</option>
                  <option value="P">Akhwat</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label class="block text-xs font-semibold text-slate-500 mb-1"
                  >Gol. Darah</label
                >
                <select
                  v-model="form.bloodType"
                  class="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm"
                >
                  <option value="">-</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="AB">AB</option>
                  <option value="O">O</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-500 mb-1"
                  >Tempat Lahir</label
                >
                <input
                  v-model="form.birthPlace"
                  :disabled="form.type !== 'external'"
                  class="w-full border rounded-lg px-4 py-2 text-sm disabled:bg-slate-100"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-500 mb-1"
                  >Tanggal Lahir</label
                >
                <input
                  type="date"
                  v-model="form.dob"
                  :disabled="form.type !== 'external'"
                  class="w-full border rounded-lg px-4 py-2 text-sm disabled:bg-slate-100"
                />
              </div>
            </div>

            <!-- Address (External Only or View Only for others) -->
            <div v-if="form.type === 'external'">
              <h4 class="text-sm font-bold text-slate-700 border-b pb-2 mb-3">
                Alamat Domisili
              </h4>
              <AddressSelector
                v-model="addressModel"
                label="Alamat Lengkap"
                @update:modelValue="onAddressUpdate"
              />
            </div>
            <div v-else>
              <label class="block text-xs font-semibold text-slate-500 mb-1"
                >Alamat</label
              >
              <textarea
                :value="form.address"
                disabled
                rows="2"
                class="w-full border rounded-lg px-4 py-2 text-sm bg-slate-100"
              ></textarea>
            </div>
          </div>

          <div
            class="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3"
          >
            <button
              @click="closeModal"
              class="px-5 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300 transition text-sm font-medium"
            >
              Batal
            </button>
            <button
              @click="submitForm"
              :disabled="saving"
              class="px-5 py-2.5 rounded-lg bg-[#602515] text-white hover:bg-[#4a1d10] transition text-sm font-medium flex items-center gap-2 shadow-lg shadow-[#602515]/20"
            >
              {{ saving ? "Menyimpan..." : "Simpan Perubahan" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Medical History Modal -->
    <Teleport to="body">
      <div
        v-if="historyModal.show"
        class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      >
        <div
          class="absolute inset-0 bg-black/40 backdrop-blur-sm"
          @click="historyModal.show = false"
        ></div>
        <div
          class="bg-white w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden animate-fade-in-up relative z-10 flex flex-col max-h-[90vh]"
        >
          <!-- Header -->
          <div
            class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50"
          >
            <div class="flex items-center gap-3">
              <div class="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <Icon icon="solar:medical-kit-bold-duotone" class="text-2xl" />
              </div>
              <div>
                <h3 class="font-bold text-slate-800">Riwayat Medis Pasien</h3>
                <p class="text-xs text-slate-500 mt-0.5">
                  {{ historyModal.patient?.name }} • {{ historyModal.patient?.type === 'student' ? 'Santri' : historyModal.patient?.type === 'teacher' ? 'Guru' : 'Umum' }}
                </p>
              </div>
            </div>
            <button
              @click="historyModal.show = false"
              class="text-slate-400 hover:text-slate-600 transition"
            >
              <Icon icon="solar:close-circle-bold" class="text-xl" />
            </button>
          </div>

          <!-- Content -->
          <div class="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/30">
            <!-- Patient Info Card -->
            <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm mb-6 flex flex-wrap gap-4 items-center justify-between">
              <div class="flex items-center gap-3">
                <div
                  class="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold shrink-0"
                  :class="
                    historyModal.patient?.gender === 'P'
                      ? 'bg-pink-50 text-pink-600 border border-pink-100'
                      : 'bg-blue-50 text-blue-600 border border-blue-100'
                  "
                >
                  {{ historyModal.patient?.name?.charAt(0) }}
                </div>
                <div>
                  <h4 class="font-bold text-slate-800 text-sm leading-tight">
                    {{ historyModal.patient?.name }}
                  </h4>
                  <p class="text-xs text-slate-500 mt-1">
                    {{ historyModal.patient?.gender === 'P' ? 'Akhwat' : 'Ikhwan' }} •
                    {{ historyModal.patient?.age && historyModal.patient?.age !== '-' ? `${historyModal.patient?.age} Tahun` : '-' }}
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-6 text-xs text-slate-600">
                <div class="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                  <span class="text-slate-400 mr-1.5">Gol. Darah:</span>
                  <span class="font-bold text-slate-800">{{ historyModal.patient?.bloodType || '-' }}</span>
                </div>
                <div class="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                  <span class="text-slate-400 mr-1.5">No. HP:</span>
                  <span class="font-bold text-slate-800">{{ historyModal.patient?.phone || '-' }}</span>
                </div>
              </div>
            </div>

            <!-- Loading State -->
            <div v-if="historyModal.loading" class="flex flex-col items-center justify-center py-12 gap-3">
              <div class="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
              <p class="text-sm text-slate-500 font-medium">Memuat riwayat medis...</p>
            </div>

            <!-- Empty State -->
            <div
              v-else-if="historyModal.examinations.length === 0"
              class="text-center text-slate-500 py-12 bg-white rounded-2xl border border-dashed border-slate-200"
            >
              <Icon
                icon="solar:folder-with-files-bold-duotone"
                class="text-6xl text-slate-200 mb-4 mx-auto"
              />
              <h5 class="font-bold text-slate-700 mb-1">Belum Ada Riwayat</h5>
              <p class="text-xs text-slate-400 max-w-sm mx-auto">
                Pasien ini belum memiliki catatan pemeriksaan medis atau checkup di klinik.
              </p>
            </div>

            <!-- History List -->
            <div v-else class="space-y-4">
              <div
                v-for="(exam, i) in historyModal.examinations"
                :key="i"
                class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
              >
                <!-- Examination Card Header -->
                <div class="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start gap-4">
                  <div>
                    <h5 class="font-bold text-slate-800 text-base">
                      {{ exam.diagnosis || "Pemeriksaan Umum" }}
                    </h5>
                    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
                      <span class="flex items-center gap-1">
                        <Icon icon="solar:calendar-date-bold-duotone" class="text-slate-400 text-sm" />
                        {{ formatDate(exam.date || exam.examinationDate) }}
                      </span>
                      <span v-if="exam.examinerName" class="flex items-center gap-1 border-l border-slate-200 pl-3">
                        <Icon icon="solar:user-bold-duotone" class="text-slate-400 text-sm" />
                        Pemeriksa: {{ exam.examinerName }}
                      </span>
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <span
                      v-if="exam.hasSickLeave"
                      class="bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-1 rounded-lg border border-rose-100 uppercase"
                    >
                      Izin Sakit
                    </span>
                    <span
                      v-if="exam.inpatient"
                      class="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded-lg border border-indigo-100 uppercase"
                    >
                      Rawat Inap
                    </span>
                  </div>
                </div>

                <!-- Inpatient details badge if any -->
                <div
                  v-if="exam.inpatient"
                  class="mx-4 mt-4 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 flex items-center gap-3"
                >
                  <div
                    class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 animate-pulse"
                  >
                    <Icon icon="solar:hospital-bold-duotone" class="text-lg" />
                  </div>
                  <div>
                    <p class="text-xs font-bold text-indigo-900 leading-none">
                      Rawat Inap Klinik
                    </p>
                    <p class="text-[11px] text-indigo-700 mt-1.5">
                      Ruang: <span class="font-bold text-indigo-900">{{ exam.inpatient.roomName }}</span>
                      <span class="mx-1.5 text-indigo-300">•</span>
                      Bed: <span class="font-bold text-indigo-900">{{ exam.inpatient.bedNumber || "-" }}</span>
                      <span class="mx-1.5 text-indigo-300">•</span>
                      Tgl Admission: <span class="font-bold text-indigo-900">{{ formatDate(exam.inpatient.admissionDate) }}</span>
                    </p>
                  </div>
                </div>

                <!-- Examination Details Content -->
                <div class="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div class="space-y-4">
                    <div v-if="exam.complaint || exam.symptoms" class="text-xs">
                      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Icon icon="solar:dialog-2-bold-duotone" class="text-slate-400 text-sm" />
                        Keluhan / Gejala
                      </p>
                      <p class="text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {{ exam.complaint || exam.symptoms }}
                      </p>
                    </div>
                    
                    <div v-if="exam.treatment" class="text-xs">
                      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Icon icon="solar:medical-kit-bold-duotone" class="text-slate-400 text-sm" />
                        Tindakan Medis
                      </p>
                      <p class="text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {{ exam.treatment }}
                      </p>
                    </div>

                    <div v-if="exam.prescribedMedicines" class="text-xs">
                      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Icon icon="solar:pill-bold-duotone" class="text-slate-400 text-sm" />
                        Resep Obat
                      </p>
                      <p class="text-slate-700 leading-relaxed bg-emerald-50/30 p-2.5 rounded-xl border border-emerald-100 text-emerald-800">
                        {{ exam.prescribedMedicines }}
                      </p>
                    </div>

                    <div v-if="exam.notes || exam.anamnesis" class="text-xs">
                      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Icon icon="solar:notes-bold-duotone" class="text-slate-400 text-sm" />
                        Catatan / Anamnesis
                      </p>
                      <p class="text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {{ exam.notes || exam.anamnesis }}
                      </p>
                    </div>
                  </div>

                  <!-- Vitals & Physical Cards -->
                  <div
                    v-if="
                      exam.temperature ||
                      exam.bloodPressure ||
                      exam.weight ||
                      exam.height ||
                      exam.heartRate ||
                      exam.respiratoryRate
                    "
                    class="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 self-start"
                  >
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Icon icon="solar:heart-pulse-bold-duotone" class="text-slate-400 text-sm" />
                      Tanda Vital & Fisik
                    </p>
                    <div class="grid grid-cols-2 gap-3">
                      <div v-if="exam.temperature" class="bg-white p-2.5 rounded-xl border border-slate-100 flex flex-col justify-center">
                        <span class="text-[10px] text-slate-400 block mb-0.5">Suhu Tubuh</span>
                        <span class="font-bold text-slate-700 text-sm">
                          {{ exam.temperature }}<span class="font-normal text-slate-400 ml-0.5">°C</span>
                        </span>
                      </div>
                      <div v-if="exam.bloodPressure" class="bg-white p-2.5 rounded-xl border border-slate-100 flex flex-col justify-center">
                        <span class="text-[10px] text-slate-400 block mb-0.5">Tekanan Darah</span>
                        <span class="font-bold text-slate-700 text-sm">{{ exam.bloodPressure }}</span>
                      </div>
                      <div v-if="exam.heartRate" class="bg-white p-2.5 rounded-xl border border-slate-100 flex flex-col justify-center">
                        <span class="text-[10px] text-slate-400 block mb-0.5">Denyut Nadi</span>
                        <span class="font-bold text-slate-700 text-sm">
                          {{ exam.heartRate }}<span class="font-normal text-slate-400 text-[10px] ml-0.5">bpm</span>
                        </span>
                      </div>
                      <div v-if="exam.respiratoryRate" class="bg-white p-2.5 rounded-xl border border-slate-100 flex flex-col justify-center">
                        <span class="text-[10px] text-slate-400 block mb-0.5">Laju Nafas</span>
                        <span class="font-bold text-slate-700 text-sm">
                          {{ exam.respiratoryRate }}<span class="font-normal text-slate-400 text-[10px] ml-0.5">x/mnt</span>
                        </span>
                      </div>
                      <div v-if="exam.weight" class="bg-white p-2.5 rounded-xl border border-slate-100 flex flex-col justify-center">
                        <span class="text-[10px] text-slate-400 block mb-0.5">Berat Badan</span>
                        <span class="font-bold text-slate-700 text-sm">
                          {{ exam.weight }}<span class="font-normal text-slate-400 ml-0.5">kg</span>
                        </span>
                      </div>
                      <div v-if="exam.height" class="bg-white p-2.5 rounded-xl border border-slate-100 flex flex-col justify-center">
                        <span class="text-[10px] text-slate-400 block mb-0.5">Tinggi Badan</span>
                        <span class="font-bold text-slate-700 text-sm">
                          {{ exam.height }}<span class="font-normal text-slate-400 ml-0.5">cm</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div
            class="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end"
          >
            <button
              @click="historyModal.show = false"
              class="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition text-sm font-medium"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <ConfirmModal
      :isOpen="confirm.show"
      :loading="saving"
      title="Hapus Pasien?"
      message="Yakin ingin menghapus data pasien ini? Data tidak bisa dikembalikan."
      type="danger"
      @confirm="deleteItem"
      @cancel="confirmCancel"
    />

    <StatusModal
      :isOpen="statusModal.open"
      :type="statusModal.status"
      :title="statusModal.title"
      :message="statusModal.message"
      @close="statusModal.open = false"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from "vue";
import { Icon } from "@iconify/vue";
import DataTable from "@/components/ui/DataTable.vue";
import AddressSelector from "@/components/ui/AddressSelector.vue";
import StatusModal from "@/components/ui/StatusModal.vue";
import ConfirmModal from "@/components/ui/ConfirmModal.vue";
import { request } from "@/services/api";

const patients = ref([]);
const loading = ref(false);
const saving = ref(false);
const search = ref("");
const viewMode = ref("table");

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
});

const filters = reactive({
  type: "",
  gender: "",
});

const statusModal = reactive({
  open: false,
  status: "success",
  title: "",
  message: "",
});

const modal = reactive({ show: false });
const addressModel = ref(null);

const form = reactive({
  id: null,
  type: "external",
  name: "",
  gender: "L",
  dob: null,
  birthPlace: "",
  bloodType: "",
  address: "",
  // Structured Address
  province: null,
  regency: null,
  district: null,
  village: null,
  addressDetail: "",
  postalCode: "",
  village: null,
  addressDetail: "",
  postalCode: "",
  phone: "",
});

const confirm = reactive({ show: false, item: null });

const sortBy = ref("name");
const sortOrder = ref("asc");

function handleSort(field) {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
  } else {
    sortBy.value = field;
    sortOrder.value = "asc";
  }
}

const historyModal = reactive({
  show: false,
  loading: false,
  patient: null,
  examinations: [],
});

async function viewHistory(item) {
  historyModal.patient = item;
  historyModal.show = true;
  historyModal.loading = true;
  historyModal.examinations = [];
  try {
    const res = await request(`/api/clinic/examinations?clinicPatientId=${item.id}`);
    historyModal.examinations = res.data || [];
  } catch (e) {
    console.error(e);
  } finally {
    historyModal.loading = false;
  }
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

const columns = [
  { label: "Nama Pasien", field: "name", sortable: true },
  { label: "Tipe", field: "type", sortable: true },
  { label: "Kelas/Rombel", field: "class", sortable: true },
  { label: "Grup Halaqah", field: "halaqah", sortable: true },
  { label: "Kamar", field: "room", sortable: true },
  { label: "L/P", field: "gender", sortable: true },
  { label: "No. HP", field: "phone", sortable: true },
  { label: "Usia", field: "age", sortable: true },
  { label: "Gol. Darah", field: "bloodType", sortable: true },
  { label: "Alamat", field: "address", sortable: true },
  { label: "Aksi", field: "actions", align: "right" },
];

const filteredPatients = computed(() => {
  let result = [...patients.value];

  // Search
  if (search.value) {
    const q = search.value.toLowerCase();
    result = result.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.address?.toLowerCase().includes(q) ||
        r.phone?.toLowerCase().includes(q),
    );
  }

  // Filters
  if (filters.type) {
    result = result.filter((r) => r.type === filters.type);
  }
  if (filters.gender) {
    result = result.filter((r) => r.gender === filters.gender);
  }

  // Sort
  if (sortBy.value) {
    result.sort((a, b) => {
      let valA = a[sortBy.value];
      let valB = b[sortBy.value];

      // Nested/Derived mappings
      if (sortBy.value === 'class') {
        valA = a.student?.class?.name || '';
        valB = b.student?.class?.name || '';
      } else if (sortBy.value === 'halaqah') {
        valA = a.student?.halaqah?.name || '';
        valB = b.student?.halaqah?.name || '';
      } else if (sortBy.value === 'room') {
        valA = a.student?.roomNumber || '';
        valB = b.student?.roomNumber || '';
      }

      if (valA === undefined || valA === null) valA = "";
      if (valB === undefined || valB === null) valB = "";

      if (typeof valA === "string") valA = valA.trim().toLowerCase();
      if (typeof valB === "string") valB = valB.trim().toLowerCase();

      let comparison = 0;
      if (typeof valA === "number" && typeof valB === "number") {
        comparison = valA - valB;
      } else {
        comparison = String(valA).localeCompare(String(valB), "id", { sensitivity: "base" });
      }

      return sortOrder.value === "asc" ? comparison : -comparison;
    });
  }

  return result;
});

const paginatedPatients = computed(() => {
  const start = (pagination.page - 1) * pagination.limit;
  const end = start + pagination.limit;
  return filteredPatients.value.slice(start, end);
});

// Update pagination total when filter changes
watch(filteredPatients, (newVal) => {
  pagination.total = newVal.length;
  pagination.totalPages = Math.ceil(newVal.length / pagination.limit);
  if (pagination.page > pagination.totalPages && pagination.totalPages > 0) {
    pagination.page = 1;
  }
});

function onPageChange(page) {
  pagination.page = page;
}

function onLimitChange(limit) {
  pagination.limit = limit;
  pagination.totalPages = Math.ceil(pagination.total / pagination.limit);
}

function resetFilters() {
  filters.type = "";
  filters.gender = "";
}

async function fetchPatients() {
  loading.value = true;
  try {
    const res = await request("/api/clinic/patients/all");
    patients.value = (res.data || []).map((p) => {
      // Construct full address from structured data if available
      let fullAddress = p.address;
      if (!fullAddress) {
        const parts = [];
        if (p.addressDetail) parts.push(p.addressDetail);

        // Try parse JSON fields if string
        try {
          if (p.village) {
            const v =
              typeof p.village === "string" ? JSON.parse(p.village) : p.village;
            if (v?.name) parts.push(v.name);
          }
          if (p.district) {
            const d =
              typeof p.district === "string"
                ? JSON.parse(p.district)
                : p.district;
            if (d?.name) parts.push(d.name);
          }
          if (p.regency) {
            const r =
              typeof p.regency === "string" ? JSON.parse(p.regency) : p.regency;
            if (r?.name) parts.push(r.name);
          }
        } catch (e) {
          /* ignore parse error */
        }

        if (parts.length > 0) fullAddress = parts.join(", ");
      }

      return {
        ...p,
        fullAddress,
        age: calculateAge(p.dob),
      };
    });

    // Init Pagination
    pagination.total = patients.value.length;
    pagination.totalPages = Math.ceil(patients.value.length / pagination.limit);
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

function calculateAge(dob) {
  if (!dob) return "-";
  const diff = Date.now() - new Date(dob).getTime();
  const ageDt = new Date(diff);
  return Math.abs(ageDt.getUTCFullYear() - 1970);
}

function openEdit(item) {
  modal.show = true;
  Object.assign(form, { ...item });

  // Setup Address Selector model
  if (item.province) {
    addressModel.value = {
      province:
        typeof item.province === "string"
          ? JSON.parse(item.province)
          : item.province,
      regency:
        typeof item.regency === "string"
          ? JSON.parse(item.regency)
          : item.regency,
      district:
        typeof item.district === "string"
          ? JSON.parse(item.district)
          : item.district,
      village:
        typeof item.village === "string"
          ? JSON.parse(item.village)
          : item.village,
      detail: item.addressDetail,
    };
  } else {
    addressModel.value = null;
  }
}

function onAddressUpdate(val) {
  if (!val) return;
  form.province = val.province;
  form.regency = val.regency;
  form.district = val.district;
  form.village = val.village;
  form.addressDetail = val.detail;
  form.postalCode = val.postalCode; // If available
}

function closeModal() {
  modal.show = false;
}

async function submitForm() {
  saving.value = true;
  try {
    await request(`/api/clinic/patients/${form.id}`, {
      method: "PUT",
      body: form,
    });
    await fetchPatients();
    closeModal();

    statusModal.status = "success";
    statusModal.title = "Berhasil";
    statusModal.message = "Data pasien berhasil diperbarui.";
    statusModal.open = true;
  } catch (e) {
    statusModal.status = "error";
    statusModal.title = "Gagal";
    statusModal.message = e.message || "Gagal menyimpan data.";
    statusModal.open = true;
  } finally {
    saving.value = false;
  }
}

function confirmDelete(item) {
  confirm.show = true;
  confirm.item = item;
}

function confirmCancel() {
  confirm.show = false;
  confirm.item = null;
}

async function deleteItem() {
  saving.value = true;
  try {
    await request(`/api/clinic/patients/${confirm.item.id}`, {
      method: "DELETE",
    });
    await fetchPatients();
    confirmCancel();

    statusModal.status = "success";
    statusModal.title = "Berhasil";
    statusModal.message = "Data pasien berhasil dihapus.";
    statusModal.open = true;
  } catch (e) {
    statusModal.status = "error";
    statusModal.title = "Gagal";
    statusModal.message = e.message || "Gagal menghapus data.";
    statusModal.open = true;
  } finally {
    saving.value = false;
  }
}

onMounted(fetchPatients);
</script>
