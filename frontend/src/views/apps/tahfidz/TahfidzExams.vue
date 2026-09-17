<template>
  <div class="max-w-7xl mx-auto pb-12">
    <!-- Exam History Table -->
    <DataTable
      title="Riwayat Ujian"
      description="Daftar hasil ujian tahfidz yang telah dilaksanakan"
      icon="solar:diploma-verified-bold-duotone"
      :columns="columns"
      :items="exams"
      :loading="loading"
      :viewMode="viewMode"
      @update:viewMode="viewMode = $event"
      :search="filters.search"
      @update:search="onSearchInput"
      :pagination="pagination"
      @page-change="
        (p) => {
          pagination.page = p;
          loadData();
        }
      "
      @update:limit="
        (l) => {
          pagination.limit = l;
        }
      "
    >
      <template #header-actions>
        <button
          @click="showImportModal = true"
          class="bg-white border border-[#602515] text-[#602515] px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-[#602515] hover:text-white transition-colors mr-2"
        >
          <Icon icon="solar:file-send-bold-duotone" />
          Import Excel
        </button>
        <button
          @click="openModal"
          class="bg-[#602515] text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-[#4a1c10] transition-colors"
        >
          <Icon icon="solar:pen-new-square-line-duotone" />
          Input Nilai Ujian
        </button>
      </template>

      <template #filters="{ close }">
        <div class="flex flex-col gap-4">
          <div class="flex justify-between items-center mb-2">
            <h3 class="font-semibold text-slate-800">Filter Data</h3>
            <button
              @click="resetFilters"
              class="text-xs text-red-500 hover:text-red-700 font-medium"
            >
              Reset
            </button>
          </div>

          <!-- Date Range -->
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-xs font-medium text-slate-500 mb-1"
                >Mulai</label
              >
              <input
                v-model="filters.startDate"
                @change="loadData"
                type="date"
                class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#602515]"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-500 mb-1"
                >Sampai</label
              >
              <input
                v-model="filters.endDate"
                @change="loadData"
                type="date"
                class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#602515]"
              />
            </div>
          </div>

          <!-- Verdict -->
          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1"
              >Hasil</label
            >
            <select
              v-model="filters.verdict"
              @change="loadData"
              class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#602515]"
            >
              <option value="">Semua Hasil</option>
              <option value="pass">Lulus</option>
              <option value="conditional">Bersyarat</option>
              <option value="fail">Tidak Lulus</option>
            </select>
          </div>

          <!-- Gender -->
          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1"
              >Gender</label
            >
            <select
              v-model="filters.gender"
              @change="loadData"
              class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#602515]"
            >
              <option value="">Semua Gender</option>
              <option value="male">Laki-laki</option>
              <option value="female">Perempuan</option>
            </select>
          </div>

          <!-- Examiner -->
          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1"
              >Penguji</label
            >
            <select
              v-model="filters.examinerId"
              @change="loadData"
              class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#602515]"
            >
              <option value="">Semua Penguji</option>
              <option v-for="t in teachersList" :key="t.id" :value="t.id">
                {{ t.fullName }}
              </option>
            </select>
          </div>

          <!-- Class Filter -->
          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1"
              >Kelas</label
            >
            <select
              v-model="filters.classId"
              @change="loadData"
              class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#602515]"
            >
              <option value="">Semua Kelas</option>
              <option v-for="c in classesList" :key="c.id" :value="c.id">
                {{ c.name }}
              </option>
            </select>
          </div>

          <!-- Halaqah Filter -->
          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1"
              >Halaqah</label
            >
            <select
              v-model="filters.halaqahId"
              @change="loadData"
              class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#602515]"
            >
              <option value="">Semua Halaqah</option>
              <option v-for="h in halaqahList" :key="h.id" :value="h.id">
                {{ h.name }}
              </option>
            </select>
          </div>
        </div>
      </template>

      <template #cell-finalScore="{ item }">
        <span class="font-bold" :class="getScoreColor(item.finalScore)">
          {{ item.finalScore }}
        </span>
      </template>

      <template #cell-verdict="{ item }">
        <span
          class="px-2 py-1 rounded-full text-xs font-medium uppercase"
          :class="{
            'bg-green-100 text-green-700': item.verdict === 'pass',
            'bg-red-100 text-red-700': item.verdict === 'fail',
            'bg-orange-100 text-orange-700': item.verdict === 'conditional',
          }"
        >
          {{ formatVerdict(item.verdict) }}
        </span>
      </template>

      <!-- Card View Template -->

      <template #card-actions="{ item }">
        <div class="flex gap-2">
          <button
            @click="editExam(item)"
            class="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors"
            title="Edit"
          >
            <Icon icon="solar:pen-bold-duotone" />
          </button>
          <button
            @click="deleteExam(item)"
            class="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
            title="Hapus"
          >
            <Icon icon="solar:trash-bin-trash-bold-duotone" />
          </button>
        </div>
      </template>

      <template #card-item="{ item }">
        <div
          class="bg-white rounded-xl shadow-sm border border-slate-100 p-4 hover:shadow-md transition-shadow relative group"
        >
          <!-- Absolute Actions for Card -->
          <div
            class="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-lg shadow-sm backdrop-blur-sm"
          >
            <button
              @click="editExam(item)"
              class="p-1.5 text-amber-600 hover:bg-amber-50 rounded-md"
              title="Edit"
            >
              <Icon icon="solar:pen-bold-duotone" />
            </button>
            <button
              @click="deleteExam(item)"
              class="p-1.5 text-red-600 hover:bg-red-50 rounded-md"
              title="Hapus"
            >
              <Icon icon="solar:trash-bin-trash-bold-duotone" />
            </button>
          </div>

          <!-- Header: Name, Type, Verdict -->
          <div class="flex justify-between items-start gap-4 mb-3">
            <div class="flex-1 min-w-0 pr-16">
              <h3 class="font-bold text-slate-800 text-base truncate">
                {{ item.studentName }}
              </h3>
              <p class="text-sm text-slate-500 truncate">{{ item.type }}</p>
            </div>
            <span
              class="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
              :class="{
                'bg-green-100 text-green-700': item.verdict === 'pass',
                'bg-red-100 text-red-700': item.verdict === 'fail',
                'bg-orange-100 text-orange-700': item.verdict === 'conditional',
              }"
            >
              {{ formatVerdict(item.verdict) }}
            </span>
          </div>

          <!-- Divider -->
          <div class="h-px bg-slate-50 my-3"></div>

          <!-- Bottom: Meta & Score -->
          <div class="flex items-end justify-between gap-3">
            <div class="flex flex-col gap-2 flex-1 min-w-0">
              <div class="flex items-center gap-2 text-xs text-slate-500">
                <Icon
                  icon="solar:calendar-date-bold-duotone"
                  class="text-slate-400 text-sm shrink-0"
                />
                <span class="truncate">{{ item.date }}</span>
              </div>
              <div class="flex items-center gap-2 text-xs text-slate-500">
                <Icon
                  icon="solar:user-check-bold-duotone"
                  class="text-slate-400 text-sm shrink-0"
                />
                <span class="truncate">{{ item.examinerName }}</span>
              </div>
            </div>

            <!-- Score Box -->
            <div
              class="text-right shrink-0 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100"
            >
              <div
                class="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-px"
              >
                Nilai
              </div>
              <div
                class="text-2xl font-bold leading-none"
                :class="getScoreColor(item.finalScore)"
              >
                {{ item.finalScore }}
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Table Actions -->
      <template #cell-actions="{ item }">
        <div class="flex items-center gap-2">
          <button
            @click="editExam(item)"
            class="text-slate-400 hover:text-amber-600 transition-colors"
            title="Edit"
          >
            <Icon icon="solar:pen-bold-duotone" class="text-lg" />
          </button>
          <button
            @click="deleteExam(item)"
            class="text-slate-400 hover:text-red-600 transition-colors"
            title="Hapus"
          >
            <Icon icon="solar:trash-bin-trash-bold-duotone" class="text-lg" />
          </button>
        </div>
      </template>
    </DataTable>

    <!-- Input Modal -->
    <Teleport to="body">
      <div
        v-if="showModal"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      >
        <div
          class="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col"
        >
          <div
            class="px-6 py-4 border-b flex justify-between items-center bg-slate-50 shrink-0"
          >
            <h3 class="font-bold text-slate-800">
              {{ form.id ? "Edit Nilai Ujian" : "Input Nilai Ujian" }}
            </h3>
            <button
              @click="closeModal"
              class="text-slate-400 hover:text-slate-600"
            >
              <Icon icon="solar:close-circle-bold" class="text-xl" />
            </button>
          </div>

          <div class="p-6 overflow-y-auto">
            <form @submit.prevent="submitExam" class="space-y-6">
              <!-- Info Dasar -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="relative">
                  <label class="block text-sm font-medium text-slate-700 mb-1"
                    >Nama Santri</label
                  >
                  <div class="relative">
                    <input
                      type="text"
                      v-model="studentSearch"
                      @focus="showStudentDropdown = true"
                      @input="filterStudents"
                      placeholder="Cari santri..."
                      class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none"
                    />
                    <button
                      v-if="form.studentId"
                      @click="clearStudentSelection"
                      type="button"
                      class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-red-500"
                    >
                      <Icon icon="solar:close-circle-bold" />
                    </button>
                  </div>
                  <div
                    v-if="showStudentDropdown && filteredStudents.length > 0"
                    class="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                  >
                    <div
                      v-for="s in filteredStudents"
                      :key="s.id"
                      @click="selectStudent(s)"
                      class="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-700 border-b border-slate-50 flex flex-col"
                    >
                      <span class="font-medium">{{ s.fullName }}</span>
                      <span class="text-xs text-slate-500"
                        >NIS: {{ s.nis || "-" }}</span
                      >
                    </div>
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1"
                    >Tanggal Ujian</label
                  >
                  <input
                    type="date"
                    v-model="form.examDate"
                    class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none"
                    required
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1"
                    >Tahun Ajaran</label
                  >
                  <select
                    v-model="form.academicYear"
                    class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none"
                    required
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
                  <label class="block text-sm font-medium text-slate-700 mb-1"
                    >Semester</label
                  >
                  <select
                    v-model="form.semester"
                    class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none"
                    required
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
                <div class="space-y-3">
                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1"
                      >Jenis Ujian</label
                    >
                    <select
                      v-model="form.examTypeId"
                      class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none"
                      required
                    >
                      <option value="" disabled>Pilih Jenis Ujian</option>
                      <option
                        v-for="t in examTypesList"
                        :key="t.id"
                        :value="t.id"
                      >
                        {{ t.name }}
                      </option>
                    </select>
                  </div>

                  <!-- Conditional Inputs -->
                  <div v-if="selectedExamType?.category === 'UKJ'">
                    <label class="block text-sm font-medium text-slate-700 mb-1"
                      >Juz (1-30)</label
                    >
                    <input
                      type="number"
                      v-model="form.juz"
                      min="1"
                      max="30"
                      class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none"
                      placeholder="Contoh: 30"
                      required
                    />
                  </div>

                  <div
                    v-if="selectedExamType?.category === 'UPK'"
                    class="grid grid-cols-2 gap-2"
                  >
                    <div>
                      <label
                        class="block text-sm font-medium text-slate-700 mb-1"
                        >Hal. Awal</label
                      >
                      <input
                        type="number"
                        v-model="form.startPage"
                        min="1"
                        class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none"
                        placeholder="1"
                      />
                    </div>
                    <div>
                      <label
                        class="block text-sm font-medium text-slate-700 mb-1"
                        >Hal. Akhir</label
                      >
                      <input
                        type="number"
                        v-model="form.endPage"
                        min="1"
                        class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none"
                        placeholder="10"
                      />
                    </div>
                  </div>
                </div>
                <div class="relative">
                  <label class="block text-sm font-medium text-slate-700 mb-1"
                    >Penguji</label
                  >
                  <div class="relative">
                    <input
                      type="text"
                      v-model="examinerSearch"
                      @focus="showExaminerDropdown = true"
                      @input="filterExaminers"
                      placeholder="Cari penguji..."
                      class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none"
                    />
                    <button
                      v-if="form.examinerId"
                      @click="clearExaminerSelection"
                      type="button"
                      class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-red-500"
                    >
                      <Icon icon="solar:close-circle-bold" />
                    </button>
                  </div>
                  <div
                    v-if="showExaminerDropdown && filteredExaminers.length > 0"
                    class="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                  >
                    <div
                      v-for="t in filteredExaminers"
                      :key="t.id"
                      @click="selectExaminer(t)"
                      class="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-700 border-b border-slate-50 flex flex-col"
                    >
                      <span class="font-medium">{{ t.fullName }}</span>
                      <span class="text-xs text-slate-500"
                        >NIP: {{ t.nip || "-" }}</span
                      >
                    </div>
                  </div>
                </div>
              </div>

              <!-- Penilaian - Suluk: Direct Score -->
              <div
                v-if="selectedExamType?.category === 'Suluk'"
                class="p-4 bg-slate-50 rounded-lg border border-slate-200"
              >
                <h4
                  class="font-semibold text-slate-700 mb-3 flex items-center gap-2"
                >
                  <Icon icon="solar:clipboard-check-line-duotone" /> Nilai Akhir
                </h4>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1"
                    >Nilai (0-100)</label
                  >
                  <input
                    type="number"
                    v-model="form.directFinalScore"
                    min="0"
                    max="100"
                    class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none text-center text-2xl font-bold"
                    :class="getScoreColor(form.directFinalScore)"
                  />
                </div>
              </div>

              <!-- Penilaian - UPK: Capaian Target + Nilai 1-4 + Tajwid -->
              <div
                v-else-if="selectedExamType?.category === 'UPK'"
                class="p-4 bg-slate-50 rounded-lg border border-slate-200"
              >
                <h4
                  class="font-semibold text-slate-700 mb-3 flex items-center gap-2"
                >
                  <Icon icon="solar:clipboard-check-line-duotone" /> Komponen
                  Penilaian (max 100)
                </h4>

                <div class="mb-4 p-3 bg-white rounded-lg border border-slate-200">
                  <div class="flex justify-between items-center">
                    <span class="text-sm font-medium text-slate-600"
                      >Capaian Target (2 pekan terakhir)</span
                    >
                    <span
                      class="text-lg font-bold"
                      :class="getScoreColor((form.capaianTargetScore / 30) * 100)"
                      >{{ form.capaianTargetScore }} / 30</span
                    >
                  </div>
                  <p v-if="form.id" class="text-xs text-slate-400 mt-1">
                    {{ form.capaianTargetPages || 0 }} halaman dihafal
                    (tersimpan dari saat ujian dicatat)
                  </p>
                  <p v-else class="text-xs text-slate-400 mt-1">
                    {{ form.capaianTargetPages || 0 }} halaman dihafal dari
                    target {{ capaianTargetPagesTarget }} halaman
                    <span v-if="!form.studentId || !form.examDate"
                      >(pilih santri &amp; tanggal ujian dahulu)</span
                    >
                  </p>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div v-for="n in 4" :key="n">
                    <label class="block text-xs font-medium text-slate-500 mb-1"
                      >Nilai {{ n }} (max 15)</label
                    >
                    <input
                      type="number"
                      v-model="form[`nilai${n}`]"
                      min="0"
                      max="15"
                      class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none text-center"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-slate-500 mb-1"
                      >Tajwid (max 10)</label
                    >
                    <input
                      type="number"
                      v-model="form.scoreTajwid"
                      min="0"
                      max="10"
                      class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none text-center"
                    />
                  </div>
                </div>

                <div
                  class="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center"
                >
                  <span class="text-sm font-semibold text-slate-600"
                    >Total (max 100):</span
                  >
                  <span
                    class="text-2xl font-bold"
                    :class="getScoreColor(calculatedFinalScore)"
                    >{{ calculatedFinalScore }}</span
                  >
                </div>
              </div>

              <!-- Penilaian - UKJ: Nilai 1-6 + Tajwid -->
              <div
                v-else-if="selectedExamType?.category === 'UKJ'"
                class="p-4 bg-slate-50 rounded-lg border border-slate-200"
              >
                <h4
                  class="font-semibold text-slate-700 mb-3 flex items-center gap-2"
                >
                  <Icon icon="solar:clipboard-check-line-duotone" /> Komponen
                  Penilaian (max 100)
                </h4>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div v-for="n in 6" :key="n">
                    <label class="block text-xs font-medium text-slate-500 mb-1"
                      >Nilai {{ n }} (max 15)</label
                    >
                    <input
                      type="number"
                      v-model="form[`nilai${n}`]"
                      min="0"
                      max="15"
                      class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none text-center"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-slate-500 mb-1"
                      >Tajwid (max 10)</label
                    >
                    <input
                      type="number"
                      v-model="form.scoreTajwid"
                      min="0"
                      max="10"
                      class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none text-center"
                    />
                  </div>
                </div>

                <div
                  class="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center"
                >
                  <span class="text-sm font-semibold text-slate-600"
                    >Total (max 100):</span
                  >
                  <span
                    class="text-2xl font-bold"
                    :class="getScoreColor(calculatedFinalScore)"
                    >{{ calculatedFinalScore }}</span
                  >
                </div>
              </div>

              <!-- Penilaian - UA: Capaian Target (max 10) + Nilai 1-9 -->
              <div
                v-else-if="selectedExamType?.category === 'UA'"
                class="p-4 bg-slate-50 rounded-lg border border-slate-200"
              >
                <h4
                  class="font-semibold text-slate-700 mb-3 flex items-center gap-2"
                >
                  <Icon icon="solar:clipboard-check-line-duotone" /> Komponen
                  Penilaian (max 100)
                </h4>

                <div class="mb-4 p-3 bg-white rounded-lg border border-slate-200">
                  <div class="flex justify-between items-center">
                    <span class="text-sm font-medium text-slate-600"
                      >Capaian Target (2 pekan terakhir)</span
                    >
                    <span
                      class="text-lg font-bold"
                      :class="getScoreColor((form.capaianTargetScore / 10) * 100)"
                      >{{ form.capaianTargetScore }} / 10</span
                    >
                  </div>
                  <p v-if="form.id" class="text-xs text-slate-400 mt-1">
                    {{ form.capaianTargetPages || 0 }} halaman dihafal
                    (tersimpan dari saat ujian dicatat)
                  </p>
                  <p v-else class="text-xs text-slate-400 mt-1">
                    {{ form.capaianTargetPages || 0 }} halaman dihafal dari
                    target {{ capaianTargetPagesTarget }} halaman
                    <span v-if="!form.studentId || !form.examDate"
                      >(pilih santri &amp; tanggal ujian dahulu)</span
                    >
                  </p>
                </div>

                <div class="grid grid-cols-3 md:grid-cols-5 gap-4">
                  <div v-for="n in 9" :key="n">
                    <label class="block text-xs font-medium text-slate-500 mb-1"
                      >Nilai {{ n }} (max 10)</label
                    >
                    <input
                      type="number"
                      v-model="form[`nilai${n}`]"
                      min="0"
                      max="10"
                      class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none text-center"
                    />
                  </div>
                </div>

                <div
                  class="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center"
                >
                  <span class="text-sm font-semibold text-slate-600"
                    >Total (max 100):</span
                  >
                  <span
                    class="text-2xl font-bold"
                    :class="getScoreColor(calculatedFinalScore)"
                    >{{ calculatedFinalScore }}</span
                  >
                </div>
              </div>

              <!-- Penilaian - Jilsah/Sertifikasi: Khoto' Jali & Khofi -->
              <div
                v-else-if="['Jilsah', 'Sertifikasi'].includes(selectedExamType?.category)"
                class="p-4 bg-slate-50 rounded-lg border border-slate-200"
              >
                <h4
                  class="font-semibold text-slate-700 mb-3 flex items-center gap-2"
                >
                  <Icon icon="solar:clipboard-check-line-duotone" /> Komponen
                  Penilaian (100 - kesalahan)
                </h4>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-medium text-slate-500 mb-1"
                      >Khoto' Jali (jumlah kesalahan, -1/kesalahan)</label
                    >
                    <input
                      type="number"
                      v-model="form.khotoJaliCount"
                      min="0"
                      class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none text-center"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-slate-500 mb-1"
                      >Khoto' Khofi (jumlah kesalahan, -0,5/kesalahan)</label
                    >
                    <input
                      type="number"
                      v-model="form.khotoKhofiCount"
                      min="0"
                      class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none text-center"
                    />
                  </div>
                </div>

                <div
                  class="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center"
                >
                  <span class="text-sm font-semibold text-slate-600">Total:</span>
                  <span
                    class="text-2xl font-bold"
                    :class="getScoreColor(calculatedFinalScore)"
                    >{{ calculatedFinalScore }}</span
                  >
                </div>
              </div>

              <!-- Penilaian - UA/Other: Component Scores (rata-rata) -->
              <div
                v-else
                class="p-4 bg-slate-50 rounded-lg border border-slate-200"
              >
                <h4
                  class="font-semibold text-slate-700 mb-3 flex items-center gap-2"
                >
                  <Icon icon="solar:clipboard-check-line-duotone" /> Komponen
                  Penilaian (0-100)
                </h4>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label class="block text-xs font-medium text-slate-500 mb-1"
                      >Kelancaran</label
                    >
                    <input
                      type="number"
                      v-model="form.scoreFluency"
                      min="0"
                      max="100"
                      class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none text-center"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-slate-500 mb-1"
                      >Tajwid</label
                    >
                    <input
                      type="number"
                      v-model="form.scoreTajwid"
                      min="0"
                      max="100"
                      class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none text-center"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-slate-500 mb-1"
                      >Makhraj</label
                    >
                    <input
                      type="number"
                      v-model="form.scoreMakhraj"
                      min="0"
                      max="100"
                      class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none text-center"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-slate-500 mb-1"
                      >Adab</label
                    >
                    <input
                      type="number"
                      v-model="form.scoreAdab"
                      min="0"
                      max="100"
                      class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none text-center"
                    />
                  </div>
                </div>

                <!-- Kalkulator Nilai Akhir Otomatis -->
                <div
                  class="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center"
                >
                  <span class="text-sm font-semibold text-slate-600"
                    >Nilai Akhir (Rata-rata):</span
                  >
                  <span
                    class="text-2xl font-bold"
                    :class="getScoreColor(calculatedFinalScore)"
                    >{{ calculatedFinalScore }}</span
                  >
                </div>
              </div>

              <!-- Keputusan -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1"
                    >Keputusan</label
                  >
                  <select
                    v-model="form.verdict"
                    class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none"
                  >
                    <option value="pass">LULUS</option>
                    <option value="conditional">LULUS BERSYARAT</option>
                    <option value="fail">TIDAK LULUS</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1"
                    >Catatan</label
                  >
                  <textarea
                    v-model="form.notes"
                    rows="1"
                    class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none"
                  ></textarea>
                </div>
              </div>

              <div class="pt-4 flex justify-end gap-2 border-t mt-4">
                <button
                  type="button"
                  @click="closeModal"
                  class="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  :disabled="saving"
                  class="px-4 py-2 bg-[#602515] text-white rounded-lg hover:bg-[#4a1c10] disabled:opacity-50"
                >
                  {{ saving ? "Menyimpan..." : "Simpan Nilai" }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Confirm Modal -->
    <ConfirmModal
      :isOpen="showConfirmModal"
      title="Hapus Data Ujian"
      confirmText="Ya, Hapus"
      cancelText="Batal"
      :loading="deleteLoading"
      @confirm="onConfirmDelete"
      @cancel="showConfirmModal = false"
    >
      <span v-html="confirmMessage"></span>
    </ConfirmModal>

    <!-- Status Modal -->
    <StatusModal
      :isOpen="showStatusModal"
      :title="statusTitle"
      :message="statusMessage"
      :type="statusType"
      @close="showStatusModal = false"
    />

    <ImportExamModal
      :is-open="showImportModal"
      :classes="classesList"
      :halaqahs="halaqahList"
      :examiners="teachersList"
      :academic-years="academicYears"
      :semesters="semesters"
      :default-academic-year="activeSettings.year"
      :default-semester="activeSettings.semester"
      @close="showImportModal = false"
      @success="handleImportSuccess"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from "vue";
import { Icon } from "@iconify/vue";
import DataTable from "@/components/ui/DataTable.vue";
import ConfirmModal from "@/components/ui/ConfirmModal.vue";
import StatusModal from "@/components/ui/StatusModal.vue";
import ImportExamModal from "@/components/tahfidz/ImportExamModal.vue";
import {
  tahfidzApi,
  studentsApi,
  teachersApi,
  authApi,
  academicApi,
  halaqahApi,
  academicSettingsApi,
} from "@/services/api";

const loading = ref(false);
const saving = ref(false);
const showModal = ref(false);
const showImportModal = ref(false);
const viewMode = ref("table");
const pagination = ref({
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
});

const exams = ref([]);
const studentsList = ref([]);
const teachersList = ref([]);
const classesList = ref([]);
const halaqahList = ref([]);
const academicYears = ref([]);
const semesters = ref([]);
const filteredStudents = ref([]);
const studentSearch = ref("");
const showStudentDropdown = ref(false);

const filteredExaminers = ref([]);
const examinerSearch = ref("");
const showExaminerDropdown = ref(false);

const activeSettings = ref({
  year: "2024-2025",
  semester: "ganjil",
});

// Modal States
const showConfirmModal = ref(false);
const confirmMessage = ref("");
const deleteLoading = ref(false);
const itemToDelete = ref(null);

const showStatusModal = ref(false);
const statusTitle = ref("");
const statusMessage = ref("");
const statusType = ref("success"); // 'success' | 'error'

const filters = reactive({
  search: "",
  startDate: "",
  endDate: "",
  verdict: "",
  gender: "",
  examinerId: "",
  classId: "",
  halaqahId: "",
});

let searchTimeout = null;
function onSearchInput(val) {
  filters.search = val;
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    loadData();
  }, 500);
}

function resetFilters() {
  filters.search = "";
  filters.startDate = "";
  filters.endDate = "";
  filters.verdict = "";
  filters.gender = "";
  filters.examinerId = "";
  filters.classId = "";
  filters.halaqahId = "";
  loadData();
}

const columns = [
  { field: "date", label: "TANGGAL", sortable: true },
  { field: "type", label: "UJIAN" },
  { field: "studentName", label: "SANTRI", sortable: true },
  { field: "finalScore", label: "NILAI" },
  { field: "verdict", label: "HASIL" },
  { field: "examinerName", label: "PENGUJI" },
  { field: "actions", label: "AKSI", align: "center" },
];

// Exam Types Logic
const examTypesList = ref([]);
// ...

const form = reactive({
  id: null,
  studentId: "",
  examinerId: "",
  examDate: new Date().toISOString().split("T")[0],
  academicYear: "2024-2025",
  semester: "ganjil",
  examTypeId: "", // Replacing examType string
  juz: "", // For UKJ
  startPage: "", // For UPK
  endPage: "", // For UPK
  scoreFluency: 0,
  scoreTajwid: 0,
  scoreMakhraj: 0,
  scoreAdab: 0,
  // UPK: Nilai 1-4. UKJ: Nilai 1-6. UA: Nilai 1-9 (max 10 each)
  nilai1: 0,
  nilai2: 0,
  nilai3: 0,
  nilai4: 0,
  nilai5: 0,
  nilai6: 0,
  nilai7: 0,
  nilai8: 0,
  nilai9: 0,
  // UPK & UA only (auto-calculated, read-only in the form)
  capaianTargetPages: 0,
  capaianTargetScore: 0,
  // Jilsah & Sertifikasi
  khotoJaliCount: 0,
  khotoKhofiCount: 0,
  directFinalScore: 0, // For Suluk
  verdict: "pass",
  notes: "",
});

// Informational only (not submitted) — the target halaman used to compute
// capaianTargetScore, shown next to the auto-fetched achieved pages.
const capaianTargetPagesTarget = ref(0);

const selectedExamType = computed(() => {
  return examTypesList.value.find((t) => t.id === form.examTypeId);
});

// UPK: Capaian Target (max 30, auto) + Nilai 1-4 (max 15 each) + Tajwid (max 10)
const upkTotal = computed(() => {
  const total =
    Number(form.capaianTargetScore || 0) +
    Number(form.nilai1 || 0) +
    Number(form.nilai2 || 0) +
    Number(form.nilai3 || 0) +
    Number(form.nilai4 || 0) +
    Number(form.scoreTajwid || 0);
  return Math.min(100, Math.round(total));
});

// UKJ: Nilai 1-6 (max 15 each) + Tajwid (max 10) = max 100
const ukjTotal = computed(() => {
  const total =
    Number(form.nilai1 || 0) +
    Number(form.nilai2 || 0) +
    Number(form.nilai3 || 0) +
    Number(form.nilai4 || 0) +
    Number(form.nilai5 || 0) +
    Number(form.nilai6 || 0) +
    Number(form.scoreTajwid || 0);
  return Math.min(100, Math.round(total));
});

// UA: Capaian Target (max 10, auto) + Nilai 1-9 (max 10 each) = max 100
const uaTotal = computed(() => {
  const total =
    Number(form.capaianTargetScore || 0) +
    Number(form.nilai1 || 0) +
    Number(form.nilai2 || 0) +
    Number(form.nilai3 || 0) +
    Number(form.nilai4 || 0) +
    Number(form.nilai5 || 0) +
    Number(form.nilai6 || 0) +
    Number(form.nilai7 || 0) +
    Number(form.nilai8 || 0) +
    Number(form.nilai9 || 0);
  return Math.min(100, Math.round(total));
});

// Jilsah & Sertifikasi: 100 - (Khoto' Jali x 1 + Khoto' Khofi x 0.5)
const jilsahTotal = computed(() => {
  const deduction =
    Number(form.khotoJaliCount || 0) * 1 + Number(form.khotoKhofiCount || 0) * 0.5;
  return Math.max(0, Math.round((100 - deduction) * 100) / 100);
});

// Auto calculate final score, formula depends on exam category
const calculatedFinalScore = computed(() => {
  const category = selectedExamType.value?.category;
  if (category === "UPK") return upkTotal.value;
  if (category === "UKJ") return ukjTotal.value;
  if (category === "UA") return uaTotal.value;
  if (category === "Jilsah" || category === "Sertifikasi") return jilsahTotal.value;

  // Other: legacy 4-component average
  const total =
    Number(form.scoreFluency) +
    Number(form.scoreTajwid) +
    Number(form.scoreMakhraj) +
    Number(form.scoreAdab);
  return Math.round(total / 4);
});

// Auto-fetch "Capaian Target" (achieved pages vs target, last 2 weeks) for
// UPK (max 30) and UA (max 10, same formula). Skipped while editing an
// existing exam so historical figures aren't silently overwritten by
// today's deposit data.
async function refreshCapaianTarget() {
  const category = selectedExamType.value?.category;
  if (
    form.id ||
    (category !== "UPK" && category !== "UA") ||
    !form.studentId ||
    !form.examDate
  ) {
    return;
  }
  try {
    const maxScore = category === "UA" ? 10 : 30;
    const res = await tahfidzApi.getCapaianTarget(form.studentId, form.examDate, maxScore);
    if (res.success) {
      form.capaianTargetPages = res.data.achievedPages;
      form.capaianTargetScore = res.data.capaianTargetScore;
      capaianTargetPagesTarget.value = res.data.targetPages;
    }
  } catch (e) {
    console.error("Failed to fetch capaian target:", e);
  }
}

watch(
  () => [form.studentId, form.examDate, form.examTypeId],
  () => refreshCapaianTarget(),
);

function getScoreColor(score) {
  if (score >= 90) return "text-emerald-600";
  if (score >= 75) return "text-blue-600";
  if (score >= 60) return "text-orange-600";
  return "text-red-600";
}

function formatVerdict(val) {
  const map = {
    pass: "LULUS",
    fail: "TIDAK LULUS",
    conditional: "LULUS BERSYARAT",
  };
  return map[val] || val;
}

async function loadData() {
  loading.value = true;
  try {
    // Clean filters (remove undefined/empty) - manually or rely on API util if strict
    // Assuming backend handles empty strings gracefully or we clean them here
    const params = {
      ...filters,
      page: pagination.value.page,
      limit: pagination.value.limit,
    };
    // Remove empty keys to be safe
    Object.keys(params).forEach(
      (key) => (params[key] === "" || params[key] == null) && delete params[key]
    );

    const res = await tahfidzApi.getExams(params);
    if (res.success) {
      exams.value = res.data.map((d) => ({
        ...d,
        rawDate: d.date, // Keep raw date for editing
        date: new Date(d.date).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      }));
      // Update pagination meta
      if (res.meta) {
        pagination.value = {
          page: res.meta.page,
          limit: res.meta.limit,
          total: res.meta.total,
          totalPages: res.meta.totalPages,
        };
      }
    }

    // Load teachers for filter if empty
    if (teachersList.value.length === 0) {
      const tRes = await teachersApi.getAll({ limit: 1000 });
      if (tRes.data) {
        teachersList.value = tRes.data;
        filteredExaminers.value = tRes.data; // Also for modal
      }
    }

    // Load Exam Types
    if (examTypesList.value.length === 0) {
      const etRes = await tahfidzApi.getExamTypes();
      if (etRes.success) {
        examTypesList.value = etRes.data || [];
      }
    }

    // Load Classes
    if (classesList.value.length === 0) {
      const cRes = await academicApi.getClasses();
      if (cRes.data) {
        classesList.value = cRes.data;
      }
    }

    // Load Halaqahs
    if (halaqahList.value.length === 0) {
      const hRes = await halaqahApi.getAll();
      if (hRes.data) {
        halaqahList.value = hRes.data;
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

// Student Search Logic
function filterStudents() {
  if (!studentSearch.value) {
    filteredStudents.value = studentsList.value;
    return;
  }
  const q = studentSearch.value.toLowerCase();
  filteredStudents.value = studentsList.value.filter(
    (s) => s.fullName.toLowerCase().includes(q) || (s.nis && s.nis.includes(q))
  );
  showStudentDropdown.value = true;
}

function selectStudent(student) {
  form.studentId = student.id;
  studentSearch.value = student.fullName;
  showStudentDropdown.value = false;
}

function clearStudentSelection() {
  form.studentId = "";
  studentSearch.value = "";
  filteredStudents.value = studentsList.value;
}

// Examiner Search Logic
function filterExaminers() {
  if (!examinerSearch.value) {
    filteredExaminers.value = teachersList.value;
    return;
  }
  const q = examinerSearch.value.toLowerCase();
  filteredExaminers.value = teachersList.value.filter(
    (t) => t.fullName.toLowerCase().includes(q) || (t.nip && t.nip.includes(q))
  );
  showExaminerDropdown.value = true;
}

function selectExaminer(teacher) {
  form.examinerId = teacher.id;
  examinerSearch.value = teacher.fullName;
  showExaminerDropdown.value = false;
}

function clearExaminerSelection() {
  form.examinerId = "";
  examinerSearch.value = "";
  filteredExaminers.value = teachersList.value;
}

async function openModal() {
  try {
    // Load dependencies if needed
    if (studentsList.value.length === 0) {
      const sRes = await studentsApi.getAll({ limit: 1000 });
      if (sRes.data) {
        studentsList.value = sRes.data;
        filteredStudents.value = sRes.data;
      }
    } else {
      filteredStudents.value = studentsList.value;
    }
    if (teachersList.value.length === 0) {
      const tRes = await teachersApi.getAll({ limit: 1000 });
      if (tRes.data) {
        teachersList.value = tRes.data;
        filteredExaminers.value = tRes.data;
      }
    } else {
      filteredExaminers.value = teachersList.value;
    }

    // Default examiner to current user if teacher
    const userRes = await authApi.getCurrentUser();
    // Simple logic: if user name matches a teacher, preselect (improvements possible)
    // For now just default to first or let user pick
  } catch (e) {
    console.error(e);
  }

  form.id = null;
  form.studentId = "";
  form.examType = "";
  form.scoreFluency = 80;
  form.scoreTajwid = 0;
  form.scoreMakhraj = 80;
  form.scoreAdab = 90;
  form.nilai1 = 0;
  form.nilai2 = 0;
  form.nilai3 = 0;
  form.nilai4 = 0;
  form.nilai5 = 0;
  form.nilai6 = 0;
  form.nilai7 = 0;
  form.nilai8 = 0;
  form.nilai9 = 0;
  form.capaianTargetPages = 0;
  form.capaianTargetScore = 0;
  form.khotoJaliCount = 0;
  form.khotoKhofiCount = 0;
  capaianTargetPagesTarget.value = 0;
  form.verdict = "pass";
  form.notes = "";
  studentSearch.value = ""; // Reset search input
  examinerSearch.value = ""; // Reset examiner search

  // Set default academic settings
  form.academicYear = activeSettings.value.year;
  form.semester = activeSettings.value.semester;

  showModal.value = true;
}

async function editExam(item) {
  form.id = item.id;
  form.studentId = item.studentId;
  form.examinerId = item.examinerId;
  form.academicYear = item.academicYear || "2024-2025";
  form.semester = item.semester || "ganjil";
  form.examDate = item.rawDate
    ? new Date(item.rawDate).toISOString().split("T")[0]
    : "";

  // Match Exam Type by Name to populate Dropdown
  const foundType = examTypesList.value.find((t) => t.name === item.type);
  form.examTypeId = foundType ? foundType.id : "";
  // If not found (legacy data), maybe we should show the name somewhere or force user to pick new
  // For now, if not found, it stays empty forcing selection.

  form.juz = item.juz;
  form.startPage = item.startPage;
  form.endPage = item.endPage;

  form.scoreFluency = item.scoreFluency;
  form.scoreTajwid = item.scoreTajwid;
  form.scoreMakhraj = item.scoreMakhraj;
  form.scoreAdab = item.scoreAdab;
  form.nilai1 = item.nilai1 ?? 0;
  form.nilai2 = item.nilai2 ?? 0;
  form.nilai3 = item.nilai3 ?? 0;
  form.nilai4 = item.nilai4 ?? 0;
  form.nilai5 = item.nilai5 ?? 0;
  form.nilai6 = item.nilai6 ?? 0;
  form.nilai7 = item.nilai7 ?? 0;
  form.nilai8 = item.nilai8 ?? 0;
  form.nilai9 = item.nilai9 ?? 0;
  form.capaianTargetPages = item.capaianTargetPages ?? 0;
  form.capaianTargetScore = item.capaianTargetScore ?? 0;
  form.khotoJaliCount = item.khotoJaliCount ?? 0;
  form.khotoKhofiCount = item.khotoKhofiCount ?? 0;
  form.verdict = item.verdict;
  form.notes = item.notes || "";

  studentSearch.value = item.studentName;
  examinerSearch.value = item.examinerName;

  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
}

function handleImportSuccess(result) {
  showStatus("Import Berhasil", `${result.message}.`, "success");
  loadData();
}

function showStatus(title, message, type = "success") {
  statusTitle.value = title;
  statusMessage.value = message;
  statusType.value = type;
  showStatusModal.value = true;
}

function deleteExam(item) {
  itemToDelete.value = item;
  confirmMessage.value = `Apakah Anda yakin ingin menghapus data ujian santri <b>${item.studentName}</b>?`;
  showConfirmModal.value = true;
}

async function onConfirmDelete() {
  if (!itemToDelete.value) return;
  deleteLoading.value = true;
  try {
    const res = await tahfidzApi.deleteExam(itemToDelete.value.id);
    if (res.success) {
      showStatus("Berhasil", "Data ujian berhasil dihapus", "success");
      loadData();
    } else {
      showStatus("Gagal", res.message || "Gagal menghapus data", "error");
    }
  } catch (e) {
    showStatus("Error", e.message || "Terjadi kesalahan sistem", "error");
  } finally {
    deleteLoading.value = false;
    showConfirmModal.value = false;
    itemToDelete.value = null;
  }
}

async function submitExam() {
  if (!form.studentId) {
    showStatus("Peringatan", "Mohon pilih santri terlebih dahulu", "error");
    return;
  }
  if (!form.examinerId) {
    showStatus("Peringatan", "Mohon pilih penguji terlebih dahulu", "error");
    return;
  }
  if (!form.examTypeId) {
    showStatus("Peringatan", "Mohon pilih jenis ujian", "error");
    return;
  }

  saving.value = true;
  try {
    const selectedType = examTypesList.value.find(
      (t) => t.id === form.examTypeId
    );
    const category = selectedType?.category;

    const payload = {
      // Basic info
      studentId: Number(form.studentId),
      examinerId: Number(form.examinerId),
      examDate: form.examDate,
      academicYear: form.academicYear,
      semester: form.semester,

      // Mapped from Type
      examType: selectedType ? selectedType.name : "Unknown",
      examCategory: selectedType ? selectedType.category : "Other",

      // Conditional Fields
      juz: selectedType?.category === "UKJ" ? Number(form.juz) : null,
      startPage:
        selectedType?.category === "UPK" ? Number(form.startPage) : null,
      endPage: selectedType?.category === "UPK" ? Number(form.endPage) : null,

      // Other: legacy 4-component average
      scoreFluency: category === "Other" ? Number(form.scoreFluency) : 0,
      scoreMakhraj: category === "Other" ? Number(form.scoreMakhraj) : 0,
      scoreAdab: category === "Other" ? Number(form.scoreAdab) : 0,
      // Tajwid is shared: Other (0-100) and UPK/UKJ (0-10)
      scoreTajwid:
        category === "Suluk" ||
        category === "Jilsah" ||
        category === "Sertifikasi" ||
        category === "UA"
          ? 0
          : Number(form.scoreTajwid),

      // UPK: Nilai 1-4. UKJ: Nilai 1-6. UA: Nilai 1-9 (max 10 each)
      nilai1: ["UPK", "UKJ", "UA"].includes(category) ? Number(form.nilai1) : null,
      nilai2: ["UPK", "UKJ", "UA"].includes(category) ? Number(form.nilai2) : null,
      nilai3: ["UPK", "UKJ", "UA"].includes(category) ? Number(form.nilai3) : null,
      nilai4: ["UPK", "UKJ", "UA"].includes(category) ? Number(form.nilai4) : null,
      nilai5: ["UKJ", "UA"].includes(category) ? Number(form.nilai5) : null,
      nilai6: ["UKJ", "UA"].includes(category) ? Number(form.nilai6) : null,
      nilai7: category === "UA" ? Number(form.nilai7) : null,
      nilai8: category === "UA" ? Number(form.nilai8) : null,
      nilai9: category === "UA" ? Number(form.nilai9) : null,

      // UPK & UA: auto-calculated Capaian Target
      capaianTargetPages:
        category === "UPK" || category === "UA"
          ? Number(form.capaianTargetPages)
          : null,
      capaianTargetScore:
        category === "UPK" || category === "UA"
          ? Number(form.capaianTargetScore)
          : null,

      // Jilsah & Sertifikasi: error counts
      khotoJaliCount:
        category === "Jilsah" || category === "Sertifikasi"
          ? Number(form.khotoJaliCount)
          : null,
      khotoKhofiCount:
        category === "Jilsah" || category === "Sertifikasi"
          ? Number(form.khotoKhofiCount)
          : null,

      finalScore:
        category === "Suluk"
          ? Number(form.directFinalScore)
          : calculatedFinalScore.value,

      verdict: form.verdict,
      notes: form.notes,
    };

    let res;
    if (form.id) {
      res = await tahfidzApi.updateExam(form.id, payload);
    } else {
      res = await tahfidzApi.createExam(payload);
    }

    if (res.success) {
      showModal.value = false;
      showStatus(
        "Berhasil",
        res.message || "Data ujian berhasil disimpan",
        "success"
      );
      loadData();
    } else {
      showStatus("Gagal", res.message || "Gagal menyimpan data", "error");
    }
  } catch (e) {
    showStatus("Error", e.message || "Terjadi kesalahan sistem", "error");
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  loadData();
  // Load academic settings for form dropdowns
  try {
    const [yearsRes, semsRes, activeRes] = await Promise.all([
      academicSettingsApi.getAcademicYears(),
      academicSettingsApi.getSemesters(),
      academicSettingsApi.getActive(),
    ]);
    academicYears.value = yearsRes.data || [];
    semesters.value = semsRes.data || [];
    activeSettings.value = {
      year:
        activeRes.data?.academicYear ||
        academicYears.value[0]?.year ||
        "2024-2025",
      semester: activeRes.data?.semester === "2" ? "genap" : "ganjil",
    };

    // Set form defaults to active values
    form.academicYear = activeSettings.value.year;
    form.semester = activeSettings.value.semester;
  } catch (e) {
    console.error("Failed to load academic settings:", e);
  }
});
</script>
