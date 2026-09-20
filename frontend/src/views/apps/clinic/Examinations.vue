<template>
  <div>
    <DataTable
      title="Pemeriksaan"
      description="Riwayat pemeriksaan dan cetak resep."
      icon="solar:stethoscope-bold-duotone"
      :items="paginatedExaminations"
      :columns="columns"
      :loading="loading"
      :viewMode="viewMode"
      v-model:viewMode="viewMode"
      v-model:search="search"
      :hideFilter="true"
      :sortBy="sortBy"
      :sortOrder="sortOrder"
      @sort="handleSort"
      :pagination="pagination"
      @page-change="onPageChange"
      @update:limit="onLimitChange"
    >
      <template #header-actions>
        <button
          @click="openCreate"
          :disabled="saving"
          class="px-4 py-2 bg-[#602515] text-white rounded-lg hover:bg-[#4a1d10] transition flex items-center gap-2 text-sm font-medium"
        >
          <Icon icon="solar:stethoscope-bold" />
          Pemeriksaan Baru
        </button>
      </template>

      <template #cell-date="{ item }">
        <div class="font-medium text-slate-600">
          {{ formatDate(item.date) }}
        </div>
      </template>

      <template #cell-student="{ item }">
        <div class="font-medium text-slate-800">
          {{ item.student?.fullName || item.studentId }}
        </div>
        <div class="text-xs text-slate-400">ID: {{ item.studentId }}</div>
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

      <template #cell-diagnosis="{ item }">
        <span
          class="px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs border border-slate-200 block truncate max-w-[200px]"
          >{{ item.diagnosis || "-" }}</span
        >
      </template>

      <template #cell-actions="{ item }">
        <div class="flex justify-end gap-2">
          <button
            @click="viewPatientHistory(item)"
            class="p-2 text-slate-400 hover:text-[#602515] hover:bg-amber-50 rounded-lg transition"
            title="Riwayat Medis"
          >
            <Icon icon="solar:medical-kit-linear" class="text-lg" />
          </button>
          <button
            @click="printPrescription(item)"
            class="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
            title="Cetak Resep"
          >
            <Icon icon="solar:printer-linear" class="text-lg" />
          </button>
          <button
            @click="openEdit(item)"
            class="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
            title="Edit"
          >
            <Icon icon="solar:pen-new-square-linear" class="text-lg" />
          </button>
          <button
            @click="confirmDelete(item)"
            class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            title="Hapus"
          >
            <Icon icon="solar:trash-bin-trash-linear" class="text-lg" />
          </button>
        </div>
      </template>

      <!-- Card View -->
      <template #card-item="{ item }">
        <div
          class="bg-white p-4 rounded-xl border border-slate-200 hover:shadow-md transition group relative"
        >
          <div class="flex justify-between items-start mb-2">
            <div>
              <div class="font-medium text-slate-800">
                {{ item.student?.fullName || item.studentId }}
              </div>
              <div class="text-xs text-slate-400">
                {{ formatDate(item.date) }}
              </div>
            </div>
          </div>
          <div
            v-if="item.class || item.room || item.halaqah || item.examinerName"
            class="grid grid-cols-2 gap-y-1 gap-x-2 text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 mb-2"
          >
            <div v-if="item.class" class="flex items-center gap-1.5">
              <Icon
                icon="solar:book-bookmark-bold-duotone"
                class="text-slate-400"
              />
              <span class="truncate">{{ item.class.name }}</span>
            </div>
            <div v-if="item.room" class="flex items-center gap-1.5">
              <Icon icon="solar:bed-bold-duotone" class="text-slate-400" />
              <span class="truncate">{{ item.room.name }}</span>
            </div>
            <div
              v-if="item.halaqah"
              class="col-span-2 flex items-center gap-1.5"
            >
              <Icon
                icon="solar:users-group-two-rounded-bold-duotone"
                class="text-slate-400"
              />
              <span class="truncate">{{ item.halaqah.name }}</span>
            </div>
            <div
              v-if="item.examinerName && item.examinerName !== '-'"
              class="col-span-2 flex items-center gap-1.5 border-t border-slate-200/60 pt-1 mt-0.5"
            >
              <Icon
                icon="solar:user-bold-duotone"
                class="text-slate-400"
              />
              <span class="truncate">Pemeriksa: {{ item.examinerName }}</span>
            </div>
          </div>
          <div class="space-y-2 mt-4 text-xs text-slate-600">
            <div>
              <span class="font-semibold block text-slate-500 mb-0.5"
                >Diagnosa</span
              >
              <div class="bg-slate-50 p-2 rounded border border-slate-100">
                {{ item.diagnosis || "-" }}
              </div>
            </div>
            <div>
              <span class="font-semibold block text-slate-500 mb-0.5"
                >Tindakan</span
              >
              <div class="line-clamp-2 text-slate-500">
                {{ item.treatment || "-" }}
              </div>
            </div>
          </div>
          <div
            class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition flex gap-1 bg-white/90 backdrop-blur rounded-lg p-1 shadow-sm border border-slate-100"
          >
            <button
              @click="viewPatientHistory(item)"
              class="p-1.5 hover:text-[#602515]"
              title="Riwayat Medis"
            >
              <Icon icon="solar:medical-kit-linear" />
            </button>
            <button
              @click="printPrescription(item)"
              class="p-1.5 hover:text-emerald-600"
              title="Cetak Resep"
            >
              <Icon icon="solar:printer-linear" />
            </button>
            <button
              @click="openEdit(item)"
              class="p-1.5 hover:text-blue-600"
              title="Edit"
            >
              <Icon icon="solar:pen-new-square-linear" />
            </button>
            <button
              @click="confirmDelete(item)"
              class="p-1.5 hover:text-red-600"
              title="Hapus"
            >
              <Icon icon="solar:trash-bin-trash-linear" />
            </button>
          </div>
        </div>
      </template>
    </DataTable>

    <!-- Modal Form -->
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
          class="bg-white w-full max-w-4xl rounded-2xl shadow-xl overflow-hidden animate-fade-in-up relative z-10 flex flex-col max-h-[90vh]"
        >
          <div
            class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50"
          >
            <h3 class="font-bold text-slate-800">
              {{
                modal.mode === "create"
                  ? "Pemeriksaan Baru"
                  : "Edit Pemeriksaan"
              }}
            </h3>
            <button
              @click="closeModal"
              class="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
          <div class="p-6 space-y-6 overflow-y-auto custom-scrollbar">
            <!-- Patient Info Section -->
            <div class="space-y-4">
              <h4 class="text-sm font-bold text-slate-700 border-b pb-2">
                Informasi Pasien
              </h4>
              <PatientSelector
                :modelValue="{
                  type: form.patientType,
                  refId: form.refId,
                  name: form.name,
                  gender: form.gender,
                  phone: form.phone,
                  address: form.address,
                  dob: form.dob,
                  birthPlace: form.birthPlace,
                  bloodType: form.bloodType,
                  clinicPatientId: form.clinicPatientId,
                  // Address Parts
                  province: form.province,
                  regency: form.regency,
                  district: form.district,
                  village: form.village,
                  addressDetail: form.addressDetail,
                  postalCode: form.postalCode,
                }"
                @update:modelValue="onPatientSelect"
              />
              <div>
                <label
                  class="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider"
                  >Tanggal Pemeriksaan</label
                >
                <input
                  v-model="form.date"
                  type="date"
                  class="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm"
                />
              </div>

              <!-- Attendance Sick Leave Toggle -->
              <div
                v-if="form.patientType === 'student'"
                class="pt-3 border-t border-slate-100"
              >
                <div class="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    id="createSickLeave"
                    v-model="form.createSickLeave"
                    class="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-600/30 cursor-pointer"
                  />
                  <label
                    for="createSickLeave"
                    class="text-sm font-bold text-emerald-700 cursor-pointer"
                    >Buat perizinan sakit di absensi santri?</label
                  >
                </div>

                <div
                  v-if="form.createSickLeave"
                  class="grid grid-cols-2 gap-4 p-4 bg-emerald-50 rounded-lg animate-fade-in-up border border-emerald-100 mb-3"
                >
                  <div>
                    <label
                      class="block text-xs font-semibold text-emerald-900 mb-1"
                      >Mulai Tanggal</label
                    >
                    <input
                      v-model="form.sickStartDate"
                      type="date"
                      class="w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label
                      class="block text-xs font-semibold text-emerald-900 mb-1"
                      >Sampai Tanggal</label
                    >
                    <input
                      v-model="form.sickEndDate"
                      type="date"
                      class="w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <!-- Inpatient Toggle -->
              <div
                v-if="modal.mode === 'create'"
                class="pt-3 border-t border-slate-100"
              >
                <div class="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    id="isInpatient"
                    v-model="form.isInpatient"
                    class="w-4 h-4 text-[#602515] rounded border-slate-300 focus:ring-[#602515]/30 cursor-pointer"
                  />
                  <label
                    for="isInpatient"
                    class="text-sm font-bold text-slate-700 cursor-pointer"
                    >Rujuk Ke Rawat Inap?</label
                  >
                </div>

                <div
                  v-if="form.isInpatient"
                  class="grid grid-cols-2 gap-4 p-4 bg-amber-50 rounded-lg animate-fade-in-up border border-amber-100"
                >
                  <div>
                    <label
                      class="block text-xs font-semibold text-amber-900 mb-1"
                      >Pilih Ruangan</label
                    >
                    <select
                      v-model="form.roomId"
                      class="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    >
                      <option :value="null">- Pilih Ruangan -</option>
                      <option
                        v-for="room in rooms"
                        :key="room.id"
                        :value="room.id"
                      >
                        {{ room.name }} ({{
                          room.gender === "mixed" ? "Campur" : room.gender
                        }}) - Cap: {{ room.capacity }}
                      </option>
                    </select>
                  </div>
                  <div>
                    <label
                      class="block text-xs font-semibold text-amber-900 mb-1"
                      >Nomor Bed</label
                    >
                    <select
                      v-model="form.bedNumber"
                      class="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    >
                      <option value="">- Pilh Bed -</option>
                      <option
                        v-for="bed in availableBeds"
                        :key="bed"
                        :value="bed"
                      >
                        Bed {{ bed }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <!-- Medical History (Optional) -->
            <div class="space-y-4">
              <h4 class="text-sm font-bold text-slate-700 border-b pb-2">
                Riwayat Medis (Opsional)
              </h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-500 mb-1"
                    >Riwayat Penyakit Dahulu</label
                  >
                  <textarea
                    v-model="form.historyPastDiseases"
                    rows="2"
                    class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    placeholder="Kondisi kronis, operasi..."
                  ></textarea>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-500 mb-1"
                    >Riwayat Penyakit Keluarga</label
                  >
                  <textarea
                    v-model="form.historyFamilyDiseases"
                    rows="2"
                    class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    placeholder="Diabetes, kanker..."
                  ></textarea>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-500 mb-1"
                    >Alergi</label
                  >
                  <textarea
                    v-model="form.historyAllergies"
                    rows="2"
                    class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    placeholder="Obat, makanan..."
                  ></textarea>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-500 mb-1"
                    >Obat yg Sedang Dikonsumsi</label
                  >
                  <textarea
                    v-model="form.historyCurrentMedications"
                    rows="2"
                    class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  ></textarea>
                </div>
              </div>
            </div>

            <!-- Anamnesis & Vitals -->
            <div class="space-y-4">
              <h4 class="text-sm font-bold text-slate-700 border-b pb-2">
                Anamnesis & Tanda Vital
              </h4>

              <div class="grid grid-cols-1 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-500 mb-1"
                    >Keluhan Utama</label
                  >
                  <textarea
                    v-model="form.complaint"
                    rows="2"
                    class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    placeholder="Gejala utama..."
                  ></textarea>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-500 mb-1"
                    >Riwayat Keluhan Saat Ini</label
                  >
                  <textarea
                    v-model="form.anamnesis"
                    rows="2"
                    class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    placeholder="Kronologi, faktor pemicu..."
                  ></textarea>
                </div>
              </div>

              <div
                class="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg"
              >
                <div>
                  <label class="block text-xs font-semibold text-slate-500 mb-1"
                    >Tekanan Darah</label
                  >
                  <input
                    v-model="form.bloodPressure"
                    class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    placeholder="mmHg"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-500 mb-1"
                    >Suhu (°C)</label
                  >
                  <input
                    v-model="form.temperature"
                    type="number"
                    step="0.1"
                    class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-500 mb-1"
                    >Nadi (bpm)</label
                  >
                  <input
                    v-model="form.heartRate"
                    type="number"
                    class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-500 mb-1"
                    >Pernapasan (rpm)</label
                  >
                  <input
                    v-model="form.respiratoryRate"
                    type="number"
                    class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-500 mb-1"
                    >Berat (kg)</label
                  >
                  <input
                    v-model="form.weight"
                    type="number"
                    step="0.1"
                    class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-500 mb-1"
                    >Tinggi (cm)</label
                  >
                  <input
                    v-model="form.height"
                    type="number"
                    class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-500 mb-1"
                  >Pemeriksaan Fisik</label
                >
                <textarea
                  v-model="form.physicalExam"
                  rows="3"
                  class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="Temuan visual, palpasi..."
                ></textarea>
              </div>
            </div>

            <!-- Clinical Data -->
            <div class="space-y-4">
              <h4 class="text-sm font-bold text-slate-700 border-b pb-2">
                Data Klinis & Penanganan
              </h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-500 mb-1"
                    >Diagnosis (ICD-10 / Nama)</label
                  >
                  <input
                    v-model="form.diagnosis"
                    class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    placeholder="Diagnosis utama..."
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-500 mb-1"
                    >Kode Diagnosis (Opsional)</label
                  >
                  <input
                    v-model="form.diagnosisCode"
                    class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    placeholder="ICD-10 Code"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-500 mb-1"
                  >Rencana Perawatan / Tindakan</label
                >
                <textarea
                  v-model="form.treatment"
                  rows="3"
                  class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                ></textarea>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-500 mb-1"
                    >Resep Obat</label
                  >
                  <MedicineSelector
                    v-model="form.consumedMedicines"
                    :medicines="medicines"
                    @update:modelValue="updatePrescriptionText"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-500 mb-1"
                    >Instruksi Tindak Lanjut</label
                  >
                  <textarea
                    v-model="form.followUpInstructions"
                    rows="3"
                    class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  ></textarea>
                </div>
              </div>
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
              {{ saving ? "Menyimpan..." : "Simpan" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Confirm Modal -->
    <ConfirmModal
      :isOpen="confirm.show"
      :loading="saving"
      title="Hapus Data?"
      message="Yakin hapus data pemeriksaan ini?"
      type="danger"
      @confirm="deleteItem"
      @cancel="confirmCancel"
    />

    <!-- Status Modal -->
    <StatusModal
      :isOpen="statusModal.show"
      :type="statusModal.type"
      :title="statusModal.title"
      :message="statusModal.message"
      @close="statusModal.show = false"
    />

    <!-- Modal Konfirmasi Riwayat Pemeriksaan Lampau -->
    <Teleport to="body">
      <div
        v-if="historyModal.showConfirm"
        class="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      >
        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          @click="cancelAutoFill"
        ></div>
        <div
          class="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up relative z-10 border border-slate-100"
        >
          <!-- Header -->
          <div class="p-5 bg-gradient-to-r from-amber-600 to-[#602515] text-white flex justify-between items-center">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-white/20 backdrop-blur rounded-xl">
                <Icon icon="solar:history-bold" class="text-2xl" />
              </div>
              <div>
                <h3 class="font-bold text-base">Riwayat Pemeriksaan Ditemukan</h3>
                <p class="text-xs text-amber-100 font-medium">
                  {{ historyModal.patientName }} memiliki {{ historyModal.historyList.length }} record riwayat pemeriksaan
                </p>
              </div>
            </div>
            <button
              @click="cancelAutoFill"
              class="text-white/80 hover:text-white text-xl font-bold p-1"
            >
              ✕
            </button>
          </div>

          <!-- Body -->
          <div class="p-6 space-y-4 text-slate-700 text-sm">
            <p class="font-medium text-slate-800">
              Apakah isian form akan diisi otomatis oleh data pemeriksaan lampau?
            </p>

            <!-- Latest Exam Summary Card -->
            <div v-if="historyModal.latestExam" class="bg-amber-50/80 border border-amber-200/70 rounded-xl p-4 space-y-2 text-xs">
              <div class="flex justify-between items-center text-amber-900 font-bold border-b border-amber-200/60 pb-2">
                <span class="flex items-center gap-1.5">
                  <Icon icon="solar:calendar-bold" class="text-amber-700" />
                  Pemeriksaan Terakhir: {{ formatDate(historyModal.latestExam.date || historyModal.latestExam.examinationDate) }}
                </span>
                <span class="px-2 py-0.5 bg-amber-200/70 text-amber-900 rounded font-semibold text-[10px]">
                  Terbaru
                </span>
              </div>
              <div v-if="historyModal.latestExam.symptoms || historyModal.latestExam.complaint" class="grid grid-cols-3 gap-1">
                <span class="font-semibold text-slate-500">Keluhan:</span>
                <span class="col-span-2 text-slate-800">{{ historyModal.latestExam.symptoms || historyModal.latestExam.complaint }}</span>
              </div>
              <div v-if="historyModal.latestExam.diagnosis" class="grid grid-cols-3 gap-1">
                <span class="font-semibold text-slate-500">Diagnosa:</span>
                <span class="col-span-2 font-bold text-emerald-800">{{ historyModal.latestExam.diagnosis }}</span>
              </div>
              <div v-if="historyModal.latestExam.treatment" class="grid grid-cols-3 gap-1">
                <span class="font-semibold text-slate-500">Penanganan:</span>
                <span class="col-span-2 text-slate-700 truncate">{{ historyModal.latestExam.treatment }}</span>
              </div>
              <div v-if="historyModal.latestExam.historyAllergies" class="grid grid-cols-3 gap-1">
                <span class="font-semibold text-rose-600">Alergi:</span>
                <span class="col-span-2 text-rose-700 font-medium">{{ historyModal.latestExam.historyAllergies }}</span>
              </div>
            </div>

            <p class="text-xs text-slate-500 italic">
              * Mengisi otomatis akan menyalin riwayat medis, tanda vital, diagnosa & obat dari pemeriksaan terakhir ke form pemeriksaan baru ini.
            </p>
          </div>

          <!-- Actions -->
          <div class="p-5 bg-slate-50 border-t border-slate-100 flex flex-col gap-2.5">
            <button
              @click="applyPastExam(historyModal.latestExam)"
              class="w-full py-2.5 px-4 bg-[#602515] text-white font-medium rounded-xl hover:bg-[#4a1d10] transition flex items-center justify-center gap-2 shadow-md shadow-[#602515]/20 text-sm"
            >
              <Icon icon="solar:magic-stick-3-bold" class="text-lg" />
              Isi Otomatis dari Pemeriksaan Terakhir
            </button>

            <button
              @click="viewHistoryDetails"
              class="w-full py-2.5 px-4 bg-white border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-100 transition flex items-center justify-center gap-2 text-sm"
            >
              <Icon icon="solar:eye-bold" class="text-lg text-amber-600" />
              Lihat Detail Riwayat Pemeriksaan
            </button>

            <button
              @click="cancelAutoFill"
              class="w-full py-2 px-4 text-slate-500 hover:text-slate-700 font-medium rounded-xl transition text-xs text-center"
            >
              Tidak, saya ingin input data pemeriksaan baru
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal Detail Riwayat Pemeriksaan -->
    <Teleport to="body">
      <div
        v-if="historyModal.showDetail"
        class="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      >
        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          @click="historyModal.showDetail = false"
        ></div>
        <div
          class="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up relative z-10 border border-slate-100 flex flex-col max-h-[90vh]"
        >
          <!-- Header -->
          <div class="p-5 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center">
            <div>
              <h3 class="font-bold text-slate-800 text-lg flex items-center gap-2">
                <Icon icon="solar:document-text-bold" class="text-[#602515]" />
                Detail Riwayat Medis & Pemeriksaan
              </h3>
              <p class="text-xs text-slate-500 mt-0.5">
                Pasien: <span class="font-bold text-slate-700">{{ historyModal.patientName }}</span> • {{ historyModal.historyList.length }} kali pemeriksaan tercatat
              </p>
            </div>
            <button
              @click="historyModal.showDetail = false"
              class="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
            >
              ✕
            </button>
          </div>

          <!-- Content Grid -->
          <div class="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
            <!-- Sidebar: Timeline / List of exams -->
            <div class="p-4 overflow-y-auto max-h-[350px] md:max-h-[600px] space-y-2.5 bg-slate-50/40">
              <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Daftar Tanggal</h4>
              <div
                v-for="exam in historyModal.historyList"
                :key="exam.id"
                @click="historyModal.selectedExamDetail = exam"
                class="p-3 rounded-xl border cursor-pointer transition text-xs space-y-1 relative"
                :class="
                  historyModal.selectedExamDetail?.id === exam.id
                    ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                "
              >
                <div class="font-bold text-slate-800 flex justify-between items-center">
                  <span>{{ formatDate(exam.date || exam.examinationDate) }}</span>
                  <span v-if="exam.id === historyModal.latestExam?.id" class="px-1.5 py-0.5 text-[9px] font-semibold bg-emerald-100 text-emerald-800 rounded">Terbaru</span>
                </div>
                <div class="text-slate-600 font-medium truncate">
                  {{ exam.diagnosis || exam.symptoms || exam.complaint || "Pemeriksaan Umum" }}
                </div>
                <div class="text-[11px] text-slate-400 flex items-center gap-1">
                  <Icon icon="solar:user-linear" />
                  <span>{{ exam.patientName || historyModal.patientName }}</span>
                </div>
              </div>
            </div>

            <!-- Detail View of Selected Exam -->
            <div class="md:col-span-2 p-6 overflow-y-auto max-h-[450px] md:max-h-[600px] space-y-5">
              <template v-if="historyModal.selectedExamDetail">
                <div class="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <span class="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-100">
                      Pemeriksaan {{ formatDate(historyModal.selectedExamDetail.date || historyModal.selectedExamDetail.examinationDate) }}
                    </span>
                    <h4 class="text-base font-bold text-slate-800 mt-2">
                      {{ historyModal.selectedExamDetail.diagnosis || "Tidak ada diagnosa spesifik" }}
                    </h4>
                  </div>
                  <button
                    v-if="modal.show"
                    @click="applyPastExam(historyModal.selectedExamDetail)"
                    class="px-3.5 py-1.5 bg-[#602515] text-white text-xs font-medium rounded-lg hover:bg-[#4a1d10] transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Icon icon="solar:magic-stick-3-bold" />
                    Gunakan Data Ini
                  </button>
                </div>

                <!-- Vital Signs Grid -->
                <div>
                  <h5 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tanda-tanda Vital</h5>
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs">
                    <div>
                      <span class="text-slate-400 block text-[10px]">Tekanan Darah</span>
                      <span class="font-bold text-slate-700">{{ historyModal.selectedExamDetail.bloodPressure || "-" }}</span>
                    </div>
                    <div>
                      <span class="text-slate-400 block text-[10px]">Suhu (°C)</span>
                      <span class="font-bold text-slate-700">{{ historyModal.selectedExamDetail.temperature ? historyModal.selectedExamDetail.temperature + ' °C' : "-" }}</span>
                    </div>
                    <div>
                      <span class="text-slate-400 block text-[10px]">Nadi (bpm)</span>
                      <span class="font-bold text-slate-700">{{ historyModal.selectedExamDetail.heartRate ? historyModal.selectedExamDetail.heartRate + ' bpm' : "-" }}</span>
                    </div>
                    <div>
                      <span class="text-slate-400 block text-[10px]">Pernapasan</span>
                      <span class="font-bold text-slate-700">{{ historyModal.selectedExamDetail.respiratoryRate ? historyModal.selectedExamDetail.respiratoryRate + ' rpm' : "-" }}</span>
                    </div>
                    <div>
                      <span class="text-slate-400 block text-[10px]">Berat Badan</span>
                      <span class="font-bold text-slate-700">{{ historyModal.selectedExamDetail.weight ? historyModal.selectedExamDetail.weight + ' kg' : "-" }}</span>
                    </div>
                    <div>
                      <span class="text-slate-400 block text-[10px]">Tinggi Badan</span>
                      <span class="font-bold text-slate-700">{{ historyModal.selectedExamDetail.height ? historyModal.selectedExamDetail.height + ' cm' : "-" }}</span>
                    </div>
                  </div>
                </div>

                <!-- Anamnesis & Keluhan -->
                <div class="space-y-3 text-xs">
                  <h5 class="text-xs font-bold text-slate-500 uppercase tracking-wider">Keluhan & Anamnesis</h5>
                  <div class="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2">
                    <div>
                      <span class="font-semibold text-slate-500 block">Keluhan Utama:</span>
                      <p class="text-slate-800">{{ historyModal.selectedExamDetail.symptoms || historyModal.selectedExamDetail.complaint || "-" }}</p>
                    </div>
                    <div v-if="historyModal.selectedExamDetail.anamnesis">
                      <span class="font-semibold text-slate-500 block">Riwayat Keluhan Saat Ini:</span>
                      <p class="text-slate-800">{{ historyModal.selectedExamDetail.anamnesis }}</p>
                    </div>
                    <div v-if="historyModal.selectedExamDetail.physicalExam">
                      <span class="font-semibold text-slate-500 block">Pemeriksaan Fisik:</span>
                      <p class="text-slate-800">{{ historyModal.selectedExamDetail.physicalExam }}</p>
                    </div>
                  </div>
                </div>

                <!-- Riwayat Penyakit & Alergi -->
                <div class="space-y-3 text-xs">
                  <h5 class="text-xs font-bold text-slate-500 uppercase tracking-wider">Riwayat Medis Pasien</h5>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div class="bg-rose-50/60 p-3 rounded-lg border border-rose-100">
                      <span class="font-semibold text-rose-800 block mb-0.5">Alergi:</span>
                      <p class="text-rose-900">{{ historyModal.selectedExamDetail.historyAllergies || "Tidak ada data alergi" }}</p>
                    </div>
                    <div class="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span class="font-semibold text-slate-600 block mb-0.5">Penyakit Dahulu:</span>
                      <p class="text-slate-800">{{ historyModal.selectedExamDetail.historyPastDiseases || "-" }}</p>
                    </div>
                    <div class="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span class="font-semibold text-slate-600 block mb-0.5">Penyakit Keluarga:</span>
                      <p class="text-slate-800">{{ historyModal.selectedExamDetail.historyFamilyDiseases || "-" }}</p>
                    </div>
                    <div class="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span class="font-semibold text-slate-600 block mb-0.5">Obat Dikonsumsi:</span>
                      <p class="text-slate-800">{{ historyModal.selectedExamDetail.historyCurrentMedications || "-" }}</p>
                    </div>
                  </div>
                </div>

                <!-- Penanganan & Resep Obat -->
                <div class="space-y-3 text-xs">
                  <h5 class="text-xs font-bold text-slate-500 uppercase tracking-wider">Penanganan & Resep Obat</h5>
                  <div class="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 space-y-2">
                    <div>
                      <span class="font-semibold text-emerald-900 block">Rencana / Tindakan:</span>
                      <p class="text-emerald-950 font-medium">{{ historyModal.selectedExamDetail.treatment || "-" }}</p>
                    </div>
                    <div v-if="historyModal.selectedExamDetail.prescribedMedicinesText || historyModal.selectedExamDetail.prescribedMedicines">
                      <span class="font-semibold text-emerald-900 block">Resep Obat:</span>
                      <p class="text-emerald-900 font-mono whitespace-pre-wrap">{{ historyModal.selectedExamDetail.prescribedMedicinesText || historyModal.selectedExamDetail.prescribedMedicines }}</p>
                    </div>
                    <div v-if="historyModal.selectedExamDetail.followUpInstructions">
                      <span class="font-semibold text-emerald-900 block">Instruksi Dokter:</span>
                      <p class="text-emerald-800 italic">{{ historyModal.selectedExamDetail.followUpInstructions }}</p>
                    </div>
                  </div>
                </div>
              </template>
              <div v-else class="text-center py-12 text-slate-400 text-xs">
                Pilih tanggal pemeriksaan di sebelah kiri untuk melihat rincian medis.
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
            <button
              @click="cancelAutoFill"
              class="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 border border-slate-200 bg-white rounded-lg transition"
            >
              {{ modal.show ? "Tutup & Input Data Baru" : "Tutup" }}
            </button>

            <button
              v-if="modal.show && historyModal.selectedExamDetail"
              @click="applyPastExam(historyModal.selectedExamDetail)"
              class="px-5 py-2 bg-[#602515] text-white text-xs font-medium rounded-lg hover:bg-[#4a1d10] transition flex items-center gap-1.5 shadow-md shadow-[#602515]/20"
            >
              <Icon icon="solar:magic-stick-3-bold" />
              Isi Form Menggunakan Data Pemeriksaan Ini
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Hidden Print Templates -->
    <div
      id="print-area"
      class="hidden print:block fixed inset-0 bg-white z-[9999] p-8"
    >
      <!-- PRESCRIPTION LAYOUT -->
      <div
        v-if="printData && printMode === 'prescription'"
        class="max-w-lg mx-auto border p-8 bg-white"
      >
        <!-- Header -->
        <div
          class="flex items-center gap-6 border-b-4 border-double border-slate-800 pb-4 mb-6"
        >
          <div class="shrink-0">
            <img
              v-if="institution.logo"
              :src="institution.logo"
              alt="Logo"
              class="h-24 w-auto object-contain"
            />
            <div
              v-else
              class="w-24 h-24 bg-slate-100 flex items-center justify-center rounded-lg border text-slate-400"
            >
              <Icon icon="solar:hospital-bold" class="text-4xl" />
            </div>
          </div>
          <div class="flex-1 text-right">
            <h1
              class="font-bold text-2xl uppercase tracking-wider text-slate-900 leading-tight"
            >
              {{ institution.name || "Klinik Minhajul Haq" }}
            </h1>
            <p class="text-sm text-slate-600 font-serif mb-1">
              {{
                institution.address || "Jl. Raya Purwakarta No. 123, Jawa Barat"
              }}
            </p>
            <p class="text-xs text-slate-500">
              {{ institution.contact ? `Kontak: ${institution.contact}` : "" }}
            </p>
            <div
              class="mt-2 text-sm font-bold border-t border-slate-300 inline-block pt-1"
            >
              SALINAN RESEP
            </div>
          </div>
        </div>

        <div
          class="mb-6 flex justify-between items-end border-b border-dashed pb-4"
        >
          <div>
            <p class="text-xs text-slate-500">Tanggal</p>
            <p class="font-medium">{{ formatDate(printData.date) }}</p>
          </div>
          <div class="text-right">
            <p class="text-xs text-slate-500">Pasien</p>
            <p class="font-bold text-lg">
              {{
                printData.student?.fullName ||
                printData.studentId ||
                printData.patientName
              }}
            </p>
          </div>
        </div>

        <div class="space-y-6 mb-8 min-h-[300px]">
          <div>
            <h3
              class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2"
            >
              Diagnosa
            </h3>
            <p class="text-sm font-medium">{{ printData.diagnosis || "-" }}</p>
          </div>

          <div>
            <h3
              class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"
            >
              <span class="text-xl italic font-serif">R/</span> Resep & Obat
            </h3>
            <div
              class="p-4 bg-slate-50 rounded-lg border border-slate-100 text-sm whitespace-pre-wrap font-mono leading-relaxed"
            >
              {{ printData.prescribedMedicinesText || printData.treatment }}
            </div>
          </div>

          <div v-if="printData.followUpInstructions">
            <h3
              class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2"
            >
              Instruksi Dokter
            </h3>
            <p class="text-sm italic text-slate-600">
              {{ printData.followUpInstructions }}
            </p>
          </div>
        </div>

        <div class="mt-8 flex justify-end">
          <div class="text-center w-40">
            <p class="mb-16 text-xs text-slate-500">Pemeriksa,</p>
            <p class="text-sm font-bold underline">
              {{ printData.examinerName && printData.examinerName !== '-' ? printData.examinerName : (user?.name || "Dokter Pemeriksa") }}
            </p>
          </div>
        </div>
      </div>

      <!-- SICK LETTER LAYOUT -->
      <div
        v-if="printData && printMode === 'sick-letter'"
        class="max-w-2xl mx-auto bg-white p-8"
      >
        <!-- Formal Header -->
        <div
          class="flex items-center gap-4 border-b-4 border-double border-slate-800 pb-4 mb-8"
        >
          <!-- Dynamic Logo -->
          <div
            v-if="institution.logo"
            class="w-24 h-24 flex items-center justify-center"
          >
            <img :src="institution.logo" class="w-full h-full object-contain" />
          </div>
          <div
            v-else
            class="w-20 h-20 bg-slate-100 flex items-center justify-center rounded-full border"
          >
            <Icon icon="solar:hospital-bold" class="text-3xl text-slate-400" />
          </div>

          <div class="flex-1 text-center">
            <h1
              class="font-bold text-2xl uppercase tracking-widest text-slate-900"
            >
              {{ institution.name || "Klinik Pratama Minhajul Haq" }}
            </h1>
            <p class="text-sm text-slate-600 font-serif">
              {{
                institution.address
                  ? `Alamat: ${institution.address}`
                  : "Alamat: Kp. Cijantung RT.03/RW.04, Purwakarta"
              }}
            </p>
            <p class="text-sm text-slate-600 font-serif">
              {{
                institution.contact
                  ? `Kontak: ${institution.contact}`
                  : "Telp: (0264) 1234567 • Email: klinik@minhajulhaq.com"
              }}
            </p>
          </div>
        </div>

        <div class="text-center mb-8">
          <h2
            class="font-bold text-xl underline decoration-2 underline-offset-4 uppercase"
          >
            Surat Keterangan Sakit
          </h2>
        </div>

        <div
          class="space-y-6 text-justify leading-relaxed font-serif text-slate-800"
        >
          <p>Yang bertanda tangan di bawah ini, menerangkan bahwa:</p>

          <table class="w-full ml-4">
            <tr>
              <td class="w-32 py-1">Nama</td>
              <td class="w-4">:</td>
              <td class="font-bold">
                {{ printData.student?.fullName || printData.patientName }}
              </td>
            </tr>
            <tr>
              <td class="py-1">Umur / Tgl Lahir</td>
              <td>:</td>
              <td>
                {{
                  printData.patientDob ? formatDate(printData.patientDob) : "-"
                }}
                {{
                  printData.patientDob
                    ? `(${
                        new Date().getFullYear() -
                        new Date(printData.patientDob).getFullYear()
                      } Th)`
                    : ""
                }}
              </td>
            </tr>
            <tr>
              <td class="py-1">Jenis Kelamin</td>
              <td>:</td>
              <td>
                {{
                  printData.gender === "P" || printData.patientGender === "P"
                    ? "Akhwat"
                    : "Ikhwan"
                }}
              </td>
            </tr>
            <tr>
              <td class="py-1">Alamat</td>
              <td>:</td>
              <td>
                {{ printData.address || printData.patientAddress || "-" }}
              </td>
            </tr>
            <tr>
              <td class="py-1">Diagnosa</td>
              <td>:</td>
              <td>{{ printData.diagnosis || "Sakit" }}</td>
            </tr>
          </table>

          <p>
            Menyatakan bahwa pasien tersebut dalam keadaan
            <strong>SAKIT</strong> dan memerlukan istirahat selama ......
            (....................) hari, terhitung mulai tanggal
            <strong>{{ formatDate(printData.date) }}</strong> s/d
            ........................ .
          </p>

          <p>
            Demikian surat keterangan ini dibuat untuk dapat dipergunakan
            sebagaimana mestinya.
          </p>
        </div>

        <div class="mt-16 flex justify-end">
          <div class="text-center w-48">
            <p class="mb-1 text-sm">Purwakarta, {{ formatDate(new Date()) }}</p>
            <p class="text-xs text-slate-500 mb-20">Dokter Pemeriksa,</p>
            <p class="font-bold underline decoration-slate-400">
              {{ printData.examinerName && printData.examinerName !== '-' ? printData.examinerName : (user?.name || "Dr. Pemeriksa") }}
            </p>
            <p class="text-xs text-slate-400">SIP: -</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from "vue";
import { useRoute } from "vue-router";
import { Icon } from "@iconify/vue";
import { clinicApi, settingsApi } from "@/services/api.js";
import DataTable from "@/components/ui/DataTable.vue";
import ConfirmModal from "@/components/ui/ConfirmModal.vue";
import StatusModal from "@/components/ui/StatusModal.vue";

const route = useRoute();

import PatientSelector from "@/components/clinic/PatientSelector.vue";
import MedicineSelector from "@/components/clinic/MedicineSelector.vue";

const examinations = ref([]);
const loading = ref(false);
const saving = ref(false);
const search = ref("");
const user = ref(null);
const viewMode = ref("table");

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
});

const printData = ref(null);

const modal = reactive({ show: false, mode: "create" });
const statusModal = reactive({
  show: false,
  type: "success",
  title: "",
  message: "",
});
const confirm = reactive({ show: false, item: null });
const historyModal = reactive({
  showConfirm: false,
  showDetail: false,
  patientName: "",
  historyList: [],
  latestExam: null,
  selectedExamDetail: null,
});

const rooms = ref([]);
const medicines = ref([]);
const institution = reactive({
  name: "",
  address: "",
  logo: "",
  phone: "",
});

const form = reactive({
  id: null,
  patientType: "student",
  refId: null,
  name: "",
  gender: "L",
  phone: "",
  address: "",
  dob: null,

  // New Patient Fields
  birthPlace: "",
  bloodType: "",
  province: null,
  regency: null,
  district: null,
  village: null,
  addressDetail: "",
  postalCode: "",

  date: "",
  complaint: "",
  diagnosis: "",
  treatment: "",

  // Inpatient Admission
  isInpatient: false,
  roomId: null,
  bedNumber: "",
  createSickLeave: true,
  sickStartDate: new Date().toISOString().split("T")[0],
  sickEndDate: new Date().toISOString().split("T")[0],

  // New Fields
  historyPastDiseases: "",
  historyFamilyDiseases: "",
  historyAllergies: "",
  historyCurrentMedications: "",
  historyHabits: "",
  anamnesis: "",
  bloodPressure: "",
  temperature: "",
  heartRate: "",
  respiratoryRate: "",
  weight: "",
  height: "",
  physicalExam: "",
  diagnosisCode: "",
  prescribedMedicinesText: "",
  followUpInstructions: "",
  consumedMedicines: [],
});

function updatePrescriptionText(items) {
  // Auto-generate text from structured items
  if (!items || !items.length) {
    form.prescribedMedicinesText = "";
    return;
  }
  form.prescribedMedicinesText = items
    .map((i) => `${i.name} (${i.quantity} ${i.unit || "pcs"})`)
    .join("\n");
}

const columns = [
  { label: "Waktu", field: "date", sortable: true },
  { label: "Santri", field: "student", sortable: true },
  { label: "Kelas/Rombel", field: "class", sortable: true },
  { label: "Grup Halaqah", field: "halaqah", sortable: true },
  { label: "Kamar", field: "room", sortable: true },
  { label: "Pemeriksa", field: "examinerName", sortable: true },
  { label: "Keluhan", field: "complaint", sortable: true },
  { label: "Diagnosa", field: "diagnosis", sortable: true },
  { label: "Penanganan", field: "treatment", sortable: true },
  { label: "Aksi", field: "actions", align: "right" },
];

const sortBy = ref("date");
const sortOrder = ref("desc");

function handleSort(field) {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
  } else {
    sortBy.value = field;
    sortOrder.value = "asc";
  }
}

const filteredExaminations = computed(() => {
  let result = [...examinations.value];

  // Search
  if (search.value) {
    const q = search.value.toLowerCase();
    result = result.filter(
      (e) =>
        e.student?.fullName?.toLowerCase().includes(q) ||
        String(e.studentId).includes(q) ||
        (e.diagnosis || "").toLowerCase().includes(q),
    );
  }

  // Sort
  if (sortBy.value) {
    result.sort((a, b) => {
      let valA = a[sortBy.value];
      let valB = b[sortBy.value];

      // Nested/Derived mappings
      if (sortBy.value === 'student') {
        valA = a.student?.fullName || a.patientName || '';
        valB = b.student?.fullName || b.patientName || '';
      } else if (sortBy.value === 'class') {
        valA = a.class?.name || '';
        valB = b.class?.name || '';
      } else if (sortBy.value === 'halaqah') {
        valA = a.halaqah?.name || '';
        valB = b.halaqah?.name || '';
      } else if (sortBy.value === 'room') {
        valA = a.room?.name || '';
        valB = b.room?.name || '';
      } else if (sortBy.value === 'examinerName') {
        valA = a.examinerName || '';
        valB = b.examinerName || '';
      } else if (sortBy.value === 'date') {
        valA = a.date || a.examinationDate || '';
        valB = b.date || b.examinationDate || '';
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

const paginatedExaminations = computed(() => {
  const start = (pagination.page - 1) * pagination.limit;
  const end = start + pagination.limit;
  return filteredExaminations.value.slice(start, end);
});

// Update pagination total when filter changes
watch(filteredExaminations, (newVal) => {
  pagination.total = newVal.length;
  pagination.totalPages = Math.ceil(newVal.length / pagination.limit);
  // Reset to page 1 if current page is out of bounds
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

const availableBeds = computed(() => {
  if (!form.roomId) return [];
  const room = rooms.value.find((r) => r.id === form.roomId);
  if (!room) return [];
  const beds = [];
  for (let i = 1; i <= room.capacity; i++) {
    const bedStr = String(i).padStart(2, "0");
    const isOccupied = (room.occupiedBedNumbers || []).includes(bedStr);
    if (!isOccupied) {
      beds.push(bedStr);
    }
  }
  return beds;
});

function showStatus(type, title, message) {
  statusModal.type = type;
  statusModal.title = title;
  statusModal.message = message;
  statusModal.show = true;
}

function formatDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

async function fetchData() {
  loading.value = true;
  try {
    const res = await clinicApi.getExaminations();
    examinations.value = Array.isArray(res?.data) ? res.data : [];
    pagination.total = examinations.value.length;
    pagination.totalPages = Math.ceil(examinations.value.length / pagination.limit);

    const roomRes = await clinicApi.getRooms();
    rooms.value = Array.isArray(roomRes?.data) ? roomRes.data : [];

    const medRes = await clinicApi.getMedicines();
    medicines.value = Array.isArray(medRes?.data) ? medRes.data : [];

    // Get user
    const u = localStorage.getItem("user");
    if (u) user.value = JSON.parse(u);
  } catch (e) {
    showStatus("error", "Gagal", e.message);
  } finally {
    loading.value = false;
  }
}

async function submitForm() {
  saving.value = true;
  try {
    if (!form.name || !form.date) {
      throw new Error("Nama Pasien dan Tanggal wajib diisi");
    }
    const payload = {
      clinicPatientId: form.clinicPatientId || undefined,
      patientType: form.patientType,
      refId: form.refId,
      name: form.name,
      gender: form.gender,
      phone: form.phone,
      address: form.address, // Contains formatted string from AddressSelector
      dob: form.dob,

      // New Patient Fields
      birthPlace: form.birthPlace,
      bloodType: form.bloodType,
      province: form.province,
      regency: form.regency,
      district: form.district,
      village: form.village,
      addressDetail: form.addressDetail,
      postalCode: form.postalCode,

      date: form.date,
      complaint: form.complaint || undefined,
      diagnosis: form.diagnosis || undefined,
      treatment: form.treatment || undefined,

      // New Fields
      historyPastDiseases: form.historyPastDiseases || undefined,
      historyFamilyDiseases: form.historyFamilyDiseases || undefined,
      historyAllergies: form.historyAllergies || undefined,
      historyCurrentMedications: form.historyCurrentMedications || undefined,
      historyHabits: form.historyHabits || undefined,
      anamnesis: form.anamnesis || undefined,
      bloodPressure: form.bloodPressure || undefined,
      temperature: form.temperature || undefined,
      heartRate: form.heartRate || undefined,
      respiratoryRate: form.respiratoryRate || undefined,
      weight: form.weight || undefined,
      height: form.height || undefined,
      physicalExam: form.physicalExam || undefined,
      labResults: form.labResults || undefined,
      imagingResults: form.imagingResults || undefined,
      diagnosisCode: form.diagnosisCode || undefined,
      treatmentPlan: form.treatmentPlan || undefined,
      progressNotes: form.progressNotes || undefined,
      followUpInstructions: form.followUpInstructions || undefined,
      followUpInstructions: form.followUpInstructions || undefined,
      prescribedMedicinesText: form.prescribedMedicinesText || undefined,
      consumedMedicines: form.consumedMedicines,

      // Inpatient Admission
      isInpatient: form.isInpatient,
      roomId: form.roomId,
      bedNumber: form.bedNumber,

      createSickLeave: form.createSickLeave,
      sickStartDate: form.sickStartDate,
      sickEndDate: form.sickEndDate,
    };
    if (modal.mode === "edit" && form.id) {
      await clinicApi.updateExamination(form.id, payload);
    } else {
      await clinicApi.createExamination(payload);
    }
    await fetchData();
    closeModal();
    showStatus("success", "Berhasil", "Data pemeriksaan berhasil disimpan");
  } catch (e) {
    showStatus("error", "Gagal", e.message || "Gagal menyimpan");
  } finally {
    saving.value = false;
  }
}

async function deleteItem() {
  saving.value = true;
  try {
    await clinicApi.deleteExamination(confirm.item.id);
    await fetchData();
    confirmCancel();
    showStatus("success", "Terhapus", "Data pemeriksaan berhasil dihapus");
  } catch (e) {
    showStatus("error", "Gagal", e.message || "Gagal menghapus");
  } finally {
    saving.value = false;
  }
}

const printMode = ref("prescription"); // 'prescription' | 'sick-letter'

function printPrescription(item) {
  // Parse medicines if available as JSON string
  let medText = item.treatment || "";

  if (item.prescribedMedicines) {
    try {
      const meds =
        typeof item.prescribedMedicines === "string"
          ? JSON.parse(item.prescribedMedicines)
          : item.prescribedMedicines;

      if (Array.isArray(meds) && meds.length > 0) {
        medText = meds
          .map((m) => `${m.name} (${m.quantity} ${m.unit || "pcs"})`)
          .join("\n");
      }
    } catch (e) {
      // console.debug("Legacy medicine text format", item.prescribedMedicines);
      medText = item.prescribedMedicines;
    }
  }

  printData.value = {
    ...item,
    prescribedMedicinesText: medText,
  };
  printMode.value = "prescription";
  setTimeout(() => {
    window.print();
  }, 500); // Increased timeout for proper rendering
}

function printSickLetter(item) {
  printData.value = item;
  printMode.value = "sick-letter";
  setTimeout(() => {
    window.print();
  }, 100);
}

let lastSelectedPatientKey = "";

async function onPatientSelect(val) {
  if (!val) return;
  form.patientType = val.type;
  Object.assign(form, val);

  if (modal.mode === "create" && (val.name || val.refId || val.clinicPatientId)) {
    const currentKey = `${val.type}-${val.clinicPatientId || val.refId || val.name}`;
    if (currentKey !== lastSelectedPatientKey) {
      lastSelectedPatientKey = currentKey;
      await checkPatientHistory(val);
    }
  }
}

async function checkPatientHistory(val) {
  if (!val) return;
  const name = val.name;
  const refId = val.refId;
  const clinicPatientId = val.clinicPatientId;
  const type = val.type;

  // 1. Search local examinations first
  let matches = (examinations.value || []).filter((item) => {
    if (clinicPatientId && item.clinicPatientId === clinicPatientId) return true;
    if (refId && item.patientType === type && (item.patientId === refId || item.refId === refId)) return true;
    if (
      name &&
      ((item.student?.fullName && item.student.fullName.toLowerCase() === name.toLowerCase()) ||
        (item.patientName && item.patientName.toLowerCase() === name.toLowerCase()))
    )
      return true;
    return false;
  });

  // 2. Fetch from API to ensure complete history
  try {
    const params = {};
    if (clinicPatientId) params.clinicPatientId = clinicPatientId;
    else if (refId) {
      params.patientType = type;
      params.refId = refId;
    } else if (name) {
      params.name = name;
    }
    const res = await clinicApi.getExaminations(params);
    if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
      matches = res.data;
    }
  } catch (e) {
    console.debug("Error fetching patient history", e);
  }

  if (matches && matches.length > 0) {
    matches.sort(
      (a, b) =>
        new Date(b.date || b.examinationDate) -
        new Date(a.date || a.examinationDate)
    );

    historyModal.patientName =
      val.name ||
      matches[0].patientName ||
      matches[0].student?.fullName ||
      "Pasien";
    historyModal.historyList = matches;
    historyModal.latestExam = matches[0];
    historyModal.selectedExamDetail = matches[0];
    historyModal.showConfirm = true;
  }
}

function applyPastExam(pastExam) {
  if (!pastExam) return;

  const currentDate = form.date || new Date().toISOString().split("T")[0];

  Object.assign(form, {
    historyPastDiseases: pastExam.historyPastDiseases || form.historyPastDiseases,
    historyFamilyDiseases: pastExam.historyFamilyDiseases || form.historyFamilyDiseases,
    historyAllergies: pastExam.historyAllergies || form.historyAllergies,
    historyCurrentMedications: pastExam.historyCurrentMedications || form.historyCurrentMedications,
    historyHabits: pastExam.historyHabits || form.historyHabits,
    anamnesis: pastExam.anamnesis || "",
    bloodPressure: pastExam.bloodPressure || "",
    temperature: pastExam.temperature || "",
    heartRate: pastExam.heartRate || "",
    respiratoryRate: pastExam.respiratoryRate || "",
    weight: pastExam.weight || "",
    height: pastExam.height || "",
    physicalExam: pastExam.physicalExam || "",
    complaint: pastExam.complaint || pastExam.symptoms || "",
    diagnosis: pastExam.diagnosis || "",
    diagnosisCode: pastExam.diagnosisCode || "",
    treatment: pastExam.treatment || "",
    prescribedMedicinesText: pastExam.prescribedMedicinesText || pastExam.prescribedMedicines || "",
    followUpInstructions: pastExam.followUpInstructions || "",
    date: currentDate,
  });

  historyModal.showConfirm = false;
  historyModal.showDetail = false;
  showStatus(
    "success",
    "Berhasil Auto-Fill",
    "Data pemeriksaan lampau telah diisikan ke form."
  );
}

function viewHistoryDetails() {
  historyModal.showConfirm = false;
  historyModal.showDetail = true;
}

function cancelAutoFill() {
  historyModal.showConfirm = false;
  historyModal.showDetail = false;
}

async function viewPatientHistory(item) {
  const val = {
    name: item.patientName || item.student?.fullName || item.studentId,
    refId: item.patientId || item.refId,
    clinicPatientId: item.clinicPatientId,
    type: item.patientType || 'student',
  };
  
  historyModal.showConfirm = false;
  historyModal.showDetail = false;
  historyModal.historyList = [];
  historyModal.latestExam = null;
  historyModal.selectedExamDetail = null;
  historyModal.patientName = val.name;

  try {
    const params = {};
    if (val.clinicPatientId) params.clinicPatientId = val.clinicPatientId;
    else if (val.refId) {
      params.patientType = val.type;
      params.refId = val.refId;
    } else if (val.name) {
      params.name = val.name;
    }
    const res = await clinicApi.getExaminations(params);
    const matches = res?.data || [];
    
    if (matches && matches.length > 0) {
      matches.sort(
        (a, b) =>
          new Date(b.date || b.examinationDate) -
          new Date(a.date || a.examinationDate)
      );

      historyModal.historyList = matches;
      historyModal.latestExam = matches[0];
      historyModal.selectedExamDetail = matches[0];
      historyModal.showDetail = true;
    } else {
      historyModal.historyList = [];
      historyModal.latestExam = null;
      historyModal.selectedExamDetail = null;
      historyModal.showDetail = true;
    }
  } catch (e) {
    console.error("Failed to load patient history", e);
  }
}

function openCreate() {
  modal.show = true;
  modal.mode = "create";
  lastSelectedPatientKey = "";
  historyModal.showConfirm = false;
  historyModal.showDetail = false;
  historyModal.historyList = [];
  historyModal.latestExam = null;
  historyModal.selectedExamDetail = null;

  Object.assign(form, {
    id: null,
    patientType: "student",
    refId: null,
    name: "",
    gender: "L",
    phone: "",
    address: "",
    dob: null,

    date: new Date().toISOString().split("T")[0],
    complaint: "",
    diagnosis: "",
    treatment: "",

    // New Fields Reset
    historyPastDiseases: "",
    historyFamilyDiseases: "",
    historyAllergies: "",
    historyCurrentMedications: "",
    historyHabits: "",
    anamnesis: "",
    bloodPressure: "",
    temperature: "",
    heartRate: "",
    respiratoryRate: "",
    weight: "",
    height: "",
    physicalExam: "",
    diagnosisCode: "",
    prescribedMedicinesText: "",
    followUpInstructions: "",
    consumedMedicines: [],
    isInpatient: false,
    roomId: null,
    bedNumber: "",
    createSickLeave: true,
    sickStartDate: new Date().toISOString().split("T")[0],
    sickEndDate: new Date().toISOString().split("T")[0],
    clinicPatientId: null,
  });
}
function openEdit(item) {
  modal.show = true;
  modal.mode = "edit";
  Object.assign(form, {
    ...item,
    // Map patient info from join
    clinicPatientId: item.clinicPatientId,
    name: item.patientName,
    patientType: item.patientType,
    gender: item.patientGender,
    phone: item.patientPhone,
    dob: item.patientDob ? item.patientDob.split("T")[0] : null,
    birthPlace: item.patientBirthPlace,
    bloodType: item.patientBloodType || "",

    // Address (Parse JSON if needed, but frontend expects objects)
    province:
      typeof item.patientProvince === "string"
        ? JSON.parse(item.patientProvince)
        : item.patientProvince,
    regency:
      typeof item.patientRegency === "string"
        ? JSON.parse(item.patientRegency)
        : item.patientRegency,
    district:
      typeof item.patientDistrict === "string"
        ? JSON.parse(item.patientDistrict)
        : item.patientDistrict,
    village:
      typeof item.patientVillage === "string"
        ? JSON.parse(item.patientVillage)
        : item.patientVillage,
    addressDetail: item.patientAddressDetail,
    postalCode: item.patientPostalCode,

    // Legacy/Display address
    address: item.patientAddress,

    // Map symptoms back to complaint
    complaint: item.symptoms || item.complaint,

    date: item.date ? new Date(item.date).toISOString().split("T")[0] : "",
    createSickLeave: !!item.hasSickLeave,
    sickStartDate: item.date
      ? new Date(item.date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    sickEndDate: item.date
      ? new Date(item.date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    prescribedMedicinesText: item.prescribedMedicines || "", // Legacy
    consumedMedicines: Array.isArray(item.consumedMedicines)
      ? item.consumedMedicines.map((m) => ({ ...m }))
      : [],
  });
}
function closeModal() {
  modal.show = false;
}
function confirmDelete(item) {
  confirm.show = true;
  confirm.item = item;
}
function confirmCancel() {
  confirm.show = false;
  confirm.item = null;
}

async function fetchSettings() {
  try {
    const res = await settingsApi.getAll();
    if (res.success) {
      const data = res.data;
      if (data.institution_name) institution.name = data.institution_name;

      // Address construction
      const parts = [];
      if (data.institution_address_detail)
        parts.push(data.institution_address_detail);

      // Parse JSON regions if needed, simplified for now:
      // If full address stored in a single field or constructed:

      institution.address = parts.join(", "); // Simplified

      if (data.institution_contact)
        institution.contact = data.institution_contact;

      if (data.institution_logo) {
        // Handle full URL logic similar to SettingsInstitution
        const base = import.meta.env.VITE_API_BASE_URL || "";
        if (data.institution_logo.startsWith("/api/uploads")) {
          institution.logo = `${base}${data.institution_logo}`;
        } else if (data.institution_logo.startsWith("uploads/")) {
          institution.logo = `${base}/api/${data.institution_logo}`;
        } else {
          institution.logo = data.institution_logo;
        }
      }
    }
  } catch (e) {
    console.error("Failed settings", e);
  }
}

onMounted(() => {
  fetchData();
  fetchSettings();
  if (route.query.createInpatient === "true") {
    openCreate();
    form.isInpatient = true;
  }
});
</script>

<style scoped>
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-in-up {
  animation: fadeInUp 0.3s ease-out;
}
</style>

<style>
@media print {
  body * {
    visibility: hidden;
  }
  #print-area,
  #print-area * {
    visibility: visible;
  }
  #print-area {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    min-height: 100vh;
    background: white;
    display: block !important;
    z-index: 99999;
  }
  @page {
    margin: 0;
    size: auto;
  }
}
</style>
