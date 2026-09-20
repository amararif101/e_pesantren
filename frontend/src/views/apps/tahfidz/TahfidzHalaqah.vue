<template>
  <div class="p-2 max-w-7xl mx-auto pb-12">
    <!-- Header -->
    <div class="mb-6 grid grid-cols-1 md:grid-cols-[minmax(300px,1fr)_2fr] gap-6">
      <!-- Halaqah Selector (if multiple) - Simplified to just taking first active for now or mock -->
      <!-- Halaqah Selector -->
      <div>
        <div v-if="myHalaqahs.length > 0" class="relative">
          <button
            @click="showHalaqahDropdown = !showHalaqahDropdown"
            class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center justify-between hover:border-primary/50 transition-colors text-left"
          >
            <div class="overflow-hidden">
              <div class="font-bold text-slate-800 truncate">
                {{ selectedHalaqah?.name || "Pilih Halaqah" }}
              </div>
              <div class="text-xs text-slate-500 truncate">
                {{ selectedHalaqah?.mentorName || "..." }}
              </div>
            </div>
            <Icon
              icon="solar:alt-arrow-down-linear"
              class="text-slate-400 transition-transform duration-200"
              :class="{ 'rotate-180': showHalaqahDropdown }"
            />
          </button>

          <!-- Dropdown Menu -->
          <Transition
            enter-active-class="transition duration-100 ease-out"
            enter-from-class="transform scale-95 opacity-0"
            enter-to-class="transform scale-100 opacity-100"
            leave-active-class="transition duration-75 ease-in"
            leave-from-class="transform scale-100 opacity-100"
            leave-to-class="transform scale-95 opacity-0"
          >
            <div
              v-if="showHalaqahDropdown"
              class="absolute top-full left-0 mt-2 w-full bg-white rounded-xl shadow-xl border border-slate-100 z-50 max-h-80 overflow-y-auto"
            >
              <div class="p-1">
                <button
                  v-for="h in myHalaqahs"
                  :key="h.id"
                  @click="selectHalaqah(h)"
                  class="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors flex flex-col gap-0.5 group"
                  :class="{ 'bg-[#602515]/5': selectedHalaqahId === h.id }"
                >
                  <span
                    class="font-medium text-slate-700 group-hover:text-[#602515] transition-colors"
                    :class="{ 'text-[#602515]': selectedHalaqahId === h.id }"
                  >
                    {{ h.name }}
                  </span>
                  <span class="text-xs text-slate-400">
                    {{ h.mentorName || "Tanpa Pembimbing" }}
                  </span>
                </button>
              </div>
            </div>
          </Transition>

          <!-- Quick Backdrop -->
          <div
            v-if="showHalaqahDropdown"
            class="fixed inset-0 z-40 bg-transparent"
            @click="showHalaqahDropdown = false"
          ></div>
        </div>
        <div v-else class="text-sm text-slate-400 italic">
          <span v-if="loadingHalaqah">Memuat grup...</span>
          <span v-else-if="errorMessage" class="text-rose-500 font-medium">
            Error: {{ errorMessage }}
            <button
              @click="loadInitial"
              class="underline ml-2 hover:text-rose-700"
            >
              Coba lagi
            </button>
          </span>
          <span v-else>Tidak ada grup halaqah.</span>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-[minmax(300px,1fr)_2fr] gap-6">
      <!-- Calendar Sidebar -->
      <div class="md:sticky md:top-6 md:self-start">
        <div
          class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"
          @touchstart="onTouchStart"
          @touchend="onTouchEnd"
          @wheel="onWheel"
        >
          <!-- Month/Year Header -->
          <div class="flex items-center justify-between mb-6">
            <button
              @click="changeMonth(-1)"
              class="p-2 hover:bg-slate-100 rounded-full"
            >
              <Icon icon="solar:alt-arrow-left-linear" />
            </button>
            <h2 class="font-bold text-lg text-slate-800">
              {{ currentMonthName }} {{ currentYear }}
            </h2>
            <button
              @click="changeMonth(1)"
              class="p-2 hover:bg-slate-100 rounded-full"
            >
              <Icon icon="solar:alt-arrow-right-linear" />
            </button>
          </div>

          <!-- Days Grid -->
          <div class="grid grid-cols-7 gap-1 text-center mb-2">
            <div
              v-for="d in ['S', 'S', 'R', 'K', 'J', 'S', 'M']"
              :key="d"
              class="text-xs font-bold text-slate-400 py-2"
            >
              {{ d }}
            </div>
          </div>
          <Transition :name="transitionName" mode="out-in">
            <div
              :key="currentMonth + '-' + currentYear"
              class="grid grid-cols-7 gap-1 text-center"
            >
              <!-- Empty slots -->
              <div v-for="i in firstDayOfWeek" :key="'empty' + i"></div>
              <!-- Days -->
              <button
                v-for="day in daysInMonth"
                :key="day"
                @click="selectDate(day)"
                class="relative w-9 h-9 mx-auto flex items-center justify-center rounded-full text-sm transition-all"
                :class="[]"
              >
                <!-- Progress Circle Background -->
                <div
                  v-if="getDayProgress(day).hasData"
                  class="absolute inset-0 rounded-full"
                  :style="{
                    background: `conic-gradient(
                    #10b981 0deg ${getDayProgress(day).greenDeg}deg,
                    #38bdf8 ${getDayProgress(day).greenDeg}deg ${
                      getDayProgress(day).blueDeg
                    }deg,
                    #facc15 ${getDayProgress(day).blueDeg}deg ${
                      getDayProgress(day).yellowDeg
                    }deg, 
                    #f43f5e ${getDayProgress(day).yellowDeg}deg ${
                      getDayProgress(day).redDeg
                    }deg,
                    #e2e8f0 ${getDayProgress(day).redDeg}deg 360deg
                  )`,
                  }"
                ></div>

                <!-- Inner White Circle for Text -->
                <div
                  class="z-10 w-7 h-7 bg-white rounded-full flex items-center justify-center"
                  :class="[
                    isSelected(day)
                      ? '!bg-[#602515] !text-white shadow-md'
                      : 'text-slate-700 hover:bg-slate-100',
                    isToday(day) ? '!font-extrabold' : '',
                    isToday(day) && !isSelected(day) ? '!text-slate-900' : '',
                  ]"
                >
                  {{ day }}
                </div>
              </button>
            </div>
          </Transition>

          <!-- Legend -->
          <div
            class="mt-4 pt-4 border-t flex flex-wrap gap-3 justify-center text-xs text-slate-500"
          >
            <div class="flex items-center gap-1.5">
              <div class="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
              <span>Belum</span>
            </div>
            <div class="flex items-center gap-1.5">
              <div class="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
              <span>Selesai</span>
            </div>
            <div class="flex items-center gap-1.5">
              <div class="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
              <span>Izin</span>
            </div>
            <div class="flex items-center gap-1.5">
              <div class="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
              <span>Alpha</span>
            </div>
            <div class="flex items-center gap-1.5">
              <div class="w-2.5 h-2.5 rounded-full bg-sky-400"></div>
              <span>Sakit</span>
            </div>
          </div>
        </div>

        <!-- Health/Leave Summary (synced from Klinik & Kesantrian) -->
        <div class="grid grid-cols-2 gap-4 mt-4">
          <StatCard
            icon="solar:health-line-duotone"
            color="sky"
            label="Santri Sakit (Klinik)"
            :value="healthSummary.sickCount"
          />
          <StatCard
            icon="solar:calendar-bold"
            color="amber"
            label="Izin Pulang (Kesantrian)"
            :value="healthSummary.leaveCount"
          />
        </div>
      </div>

      <!-- Student List -->
      <div class="space-y-4">
        <div
          class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6"
        >
          <div
            class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4"
          >
            <h3 class="font-bold text-slate-800 text-base md:text-lg">
              Peserta - {{ formatDateFull(selectedDate) }}
            </h3>
            <div
              class="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full md:w-auto"
            >
              <button
                v-if="isMultiSelectMode && selectedStudentIds.size > 0"
                @click="openBulkInputModal"
                class="flex-1 md:flex-none px-3 py-2 bg-[#602515] text-white rounded-lg text-sm font-medium hover:bg-[#4a1c10] transition-colors whitespace-nowrap"
              >
                Input ({{ selectedStudentIds.size }})
              </button>

              <button
                @click="toggleMultiSelectMode"
                class="flex-1 md:flex-none px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap text-center"
                :class="
                  isMultiSelectMode
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'text-[#602515] hover:bg-[#602515]/5 border border-[#602515]/20'
                "
              >
                {{ isMultiSelectMode ? "Batal" : "Pilih Banyak" }}
              </button>

              <button
                v-if="isMultiSelectMode"
                @click="selectAllStudents"
                class="flex-1 md:flex-none px-3 py-2 rounded-lg text-sm font-medium text-[#602515] hover:bg-[#602515]/5 transition-colors whitespace-nowrap border border-[#602515]/20"
              >
                {{
                  selectedStudentIds.size === students.length
                    ? "Hapus Pilihan"
                    : "Pilih Semua"
                }}
              </button>

              <button
                v-if="isMultiSelectMode && selectedStudentIds.size > 0"
                @click="showBulkDeleteConfirm = true"
                class="flex-1 md:flex-none px-3 py-2 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors whitespace-nowrap border border-rose-200"
              >
                Hapus
              </button>
            </div>
          </div>

          <div v-if="loading" class="py-12 text-center text-slate-500 italic">
            <Icon icon="svg-spinners:ring-resize" class="inline mr-2" />
            Memuat data...
          </div>

          <div
            v-else-if="students.length === 0"
            class="py-12 text-center text-slate-500"
          >
            Belum ada anggota di halaqah ini.
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="item in students"
              :key="item.student.id"
              class="flex items-center justify-between p-3 md:p-4 rounded-xl border transition-colors cursor-pointer hover:border-[#602515]/30 hover:bg-[#602515]/5"
              :class="[
                getStatusColor(item.status),
                {
                  'bg-[#602515]/5 border-[#602515]':
                    isMultiSelectMode &&
                    selectedStudentIds.has(item.student.id),
                },
              ]"
              @click="
                isMultiSelectMode
                  ? toggleStudentSelection(item)
                  : openModal(item, false, defaultOpenType(item))
              "
            >
              <div class="flex items-center gap-3 md:gap-4 overflow-hidden">
                <!-- Checkbox for Multi Select -->
                <div
                  v-if="isMultiSelectMode"
                  class="w-5 h-5 rounded border flex items-center justify-center transition-colors flex-shrink-0"
                  :class="
                    selectedStudentIds.has(item.student.id)
                      ? 'bg-[#602515] border-[#602515]'
                      : 'border-slate-300 bg-white'
                  "
                >
                  <Icon
                    v-if="selectedStudentIds.has(item.student.id)"
                    icon="solar:check-read-bold"
                    class="text-white text-xs"
                  />
                </div>
                <div
                  class="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-200 overflow-hidden shrink-0"
                >
                  <img
                    v-if="item.student.avatar"
                    :src="getPhotoUrl(item.student.avatar)"
                    class="w-full h-full object-cover"
                  />
                  <Icon
                    v-else
                    icon="solar:user-circle-bold"
                    class="w-full h-full text-slate-300"
                  />
                </div>
                <div class="min-w-0">
                  <h4
                    class="font-bold text-slate-800 text-sm md:text-base truncate"
                  >
                    {{ item.student.name }}
                  </h4>
                  <p
                    v-if="item.status === 'izin'"
                    class="text-xs md:text-sm text-yellow-600 font-medium truncate"
                  >
                    {{ getDepositByType(item, "izin")?.notes || "Izin" }}
                  </p>
                  <p
                    v-else-if="item.status === 'sakit'"
                    class="text-xs md:text-sm text-sky-600 font-medium truncate"
                  >
                    {{ getDepositByType(item, "sakit")?.notes || "Sakit" }}
                  </p>
                  <p
                    v-else-if="item.status === 'alpha'"
                    class="text-xs md:text-sm text-rose-600 font-medium truncate"
                  >
                    {{ getDepositByType(item, "alpha")?.notes || "Alpha" }}
                  </p>
                  <p
                    v-else-if="item.status === 'tidak_setor'"
                    class="text-xs md:text-sm text-orange-600 font-medium truncate"
                  >
                    {{
                      getDepositByType(item, "tidak_setor")?.notes ||
                      "Tidak Setor"
                    }}
                  </p>
                  <!-- Taqdim, Sabqi, Manzil are independent per day -->
                  <div v-else class="flex items-center gap-1.5 mt-1 flex-wrap">
                    <button
                      v-if="item.juzBlock?.blocked"
                      type="button"
                      @click.stop="showJuzBlockNotice(item)"
                      class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-rose-100 text-rose-700"
                      title="Belum bisa Taqdim - perlu UKJ dulu"
                    >
                      ⚠ Perlu UKJ Juz {{ item.juzBlock.completedJuz }}
                    </button>
                    <button
                      v-else
                      type="button"
                      @click.stop="openModal(item, false, 'ziyadah')"
                      class="text-[11px] font-medium px-2 py-0.5 rounded-full"
                      :class="taqdimPillClass(item)"
                    >
                      {{ pillLabel(item, "ziyadah") }}
                    </button>
                    <button
                      type="button"
                      @click.stop="openModal(item, false, 'sabqi')"
                      class="text-[11px] font-medium px-2 py-0.5 rounded-full"
                      :class="sabqiManzilPillClass(item, 'sabqi')"
                    >
                      {{ pillLabel(item, "sabqi") }}
                    </button>
                    <button
                      type="button"
                      @click.stop="openModal(item, false, 'manzil')"
                      class="text-[11px] font-medium px-2 py-0.5 rounded-full"
                      :class="sabqiManzilPillClass(item, 'manzil')"
                    >
                      {{ pillLabel(item, "manzil") }}
                    </button>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2 pl-2">
                <Icon
                  icon="solar:alt-arrow-right-linear"
                  class="text-slate-400 text-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Reusing Input Component logic inside a local Modal or Component -->
    <!-- For simplicity, duplicating modal logic or ideally modify TahfidzDashboard to export the modal component -->
    <!-- I will build a simple modal here to fulfill the requirement directly -->

    <Transition name="fade">
      <div
        v-if="showModal"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      >
        <div
          class="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200"
        >
          <div
            class="px-6 py-4 border-b flex justify-between items-center bg-slate-50 flex-shrink-0"
          >
            <h3 class="font-bold text-slate-800">
              <span v-if="isBulkInput">
                Input Setoran ({{ selectedStudentIds.size }} Santri)
              </span>
              <span v-else>
                {{
                  selectedStudent && getDepositByType(selectedStudent, form.type)
                    ? "Edit Setoran"
                    : "Input Setoran"
                }}: {{ selectedStudent?.student.name }}
              </span>
            </h3>
            <button
              @click="closeModal"
              class="text-slate-400 hover:text-slate-600"
            >
              <Icon icon="solar:close-circle-bold" class="text-xl" />
            </button>
          </div>

          <div class="p-6 overflow-y-auto flex-1">
            <form @submit.prevent="submitDeposit" class="space-y-4">
              <!-- Date (Readonly for Context) -->
              <div
                class="bg-amber-50 text-amber-800 px-4 py-2 rounded-lg text-sm mb-4 border border-amber-200"
              >
                Menginput untuk tanggal
                <strong>{{ formatDateFull(selectedDate) }}</strong>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1"
                    >Jenis</label
                  >
                  <select
                    v-model="form.type"
                    class="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 ring-primary/20"
                  >
                    <option value="ziyadah">Taqdim</option>
                    <option value="sabqi">Sabqi</option>
                    <option value="manzil">Manzil</option>
                    <option value="izin">Izin</option>
                    <option value="alpha">Alpha / Tanpa Keterangan</option>
                    <option value="sakit">Sakit</option>
                    <option value="tidak_setor">Tidak Setor</option>
                  </select>
                </div>
                <div v-if="showFullDepositForm">
                  <label class="block text-sm font-medium text-slate-700 mb-1"
                    >Kelancaran</label
                  >
                  <select
                    v-model="form.fluency"
                    class="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 ring-primary/20"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                  </select>
                </div>
                <div v-if="showSabqiManzilToggle">
                  <label class="block text-sm font-medium text-slate-700 mb-1"
                    >Status</label
                  >
                  <select
                    v-model="form.isCompleted"
                    class="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 ring-primary/20"
                  >
                    <option :value="true">Sudah</option>
                    <option :value="false">Belum</option>
                  </select>
                </div>
              </div>

              <!-- Posisi Mulai (Dari) - Only for Taqdim -->
              <div
                v-if="showFullDepositForm"
                class="p-3 bg-slate-50 rounded-lg"
              >
                <h4 class="text-sm font-semibold text-slate-700 mb-3">
                  📖 Posisi Mulai (Dari)
                </h4>
                <div class="grid grid-cols-2 gap-3">
                  <div class="relative">
                    <label class="block text-xs font-medium text-slate-600 mb-1"
                      >Surah</label
                    >
                    <input
                      type="text"
                      v-model="startSurahSearch"
                      @focus="showStartSurahDropdown = true"
                      @input="filterStartSurahs"
                      class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none text-sm"
                      placeholder="Cari surah..."
                    />
                    <div
                      v-if="
                        showStartSurahDropdown && filteredStartSurahs.length > 0
                      "
                      class="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                    >
                      <div
                        v-for="s in filteredStartSurahs"
                        :key="s.sora"
                        @click="selectStartSurah(s)"
                        class="px-3 py-2 hover:bg-slate-50 cursor-pointer text-xs border-b last:border-0"
                      >
                        <span class="font-medium"
                          >{{ s.sora }}. {{ s.sora_name_ar }}</span
                        >
                        <span class="text-slate-500 ml-1"
                          >({{ s.sora_name_en }}) -
                          {{ s.ayat_count }} ayat</span
                        >
                      </div>
                    </div>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-slate-600 mb-1"
                      >Ayat
                      <span v-if="startSurahInfo" class="text-slate-400"
                        >(max: {{ startSurahInfo.ayat_count }})</span
                      ></label
                    >
                    <input
                      type="number"
                      v-model.number="form.startAyat"
                      @change="onAyatChange('start')"
                      min="1"
                      :max="startSurahInfo?.ayat_count || 286"
                      class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none text-sm"
                      placeholder="Ayat"
                      :disabled="!form.startSurah"
                    />
                  </div>
                </div>
                <div v-if="form.startPage" class="mt-2 text-xs text-slate-500">
                  Halaman: <span class="font-medium">{{ form.startPage }}</span>
                </div>
              </div>

              <!-- Posisi Akhir (Sampai) -->
              <div
                v-if="showFullDepositForm"
                class="p-3 bg-slate-50 rounded-lg"
              >
                <h4 class="text-sm font-semibold text-slate-700 mb-3">
                  📖 Posisi Akhir (Sampai)
                </h4>
                <div class="grid grid-cols-2 gap-3">
                  <div class="relative">
                    <label class="block text-xs font-medium text-slate-600 mb-1"
                      >Surah</label
                    >
                    <input
                      type="text"
                      v-model="endSurahSearch"
                      @focus="showEndSurahDropdown = true"
                      @input="filterEndSurahs"
                      class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none text-sm"
                      placeholder="Cari surah..."
                    />
                    <div
                      v-if="
                        showEndSurahDropdown && filteredEndSurahs.length > 0
                      "
                      class="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                    >
                      <div
                        v-for="s in filteredEndSurahs"
                        :key="s.sora"
                        @click="selectEndSurah(s)"
                        class="px-3 py-2 hover:bg-slate-50 cursor-pointer text-xs border-b last:border-0"
                      >
                        <span class="font-medium"
                          >{{ s.sora }}. {{ s.sora_name_ar }}</span
                        >
                        <span class="text-slate-500 ml-1"
                          >({{ s.sora_name_en }}) -
                          {{ s.ayat_count }} ayat</span
                        >
                      </div>
                    </div>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-slate-600 mb-1"
                      >Ayat
                      <span v-if="endSurahInfo" class="text-slate-400"
                        >(max: {{ endSurahInfo.ayat_count }})</span
                      ></label
                    >
                    <input
                      type="number"
                      v-model.number="form.endAyat"
                      @change="onAyatChange('end')"
                      min="1"
                      :max="endSurahInfo?.ayat_count || 286"
                      class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none text-sm"
                      placeholder="Ayat"
                      :disabled="!form.endSurah"
                    />
                  </div>
                </div>
                <div v-if="form.endPage" class="mt-2 text-xs text-slate-500">
                  Halaman: <span class="font-medium">{{ form.endPage }}</span>
                </div>
              </div>

              <!-- Ringkasan Kalkulasi -->
              <div
                v-if="calculatedResult && showFullDepositForm"
                class="p-3 bg-amber-50 border border-amber-200 rounded-lg"
              >
                <h4 class="text-sm font-semibold text-amber-800 mb-2">
                  📊 Ringkasan
                </h4>
                <div class="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p class="text-xs text-amber-600">Ayat</p>
                    <p class="text-lg font-bold text-amber-800">
                      {{ calculatedResult.ayatCount }}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs text-amber-600">Halaman</p>
                    <p class="text-lg font-bold text-amber-800">
                      {{ calculatedResult.totalPages }}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs text-amber-600">Juz</p>
                    <p class="text-lg font-bold text-amber-800">
                      {{ calculatedResult.juzList?.join(", ") || "-" }}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1"
                  >Catatan</label
                >
                <textarea
                  v-model="form.notes"
                  rows="2"
                  class="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 ring-primary/20"
                ></textarea>
              </div>

              <div
                class="flex items-center gap-2 pt-2"
                v-if="!isAttendanceOnlyType"
              >
                <input
                  type="checkbox"
                  id="isLate"
                  v-model="form.isLate"
                  class="w-4 h-4 text-[#602515] rounded border-gray-300 focus:ring-[#602515]"
                />
                <label
                  for="isLate"
                  class="text-sm font-medium text-slate-700 cursor-pointer"
                  >Terlambat</label
                >
              </div>

              <div class="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  @click="closeModal"
                  class="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  :disabled="saving"
                  class="px-4 py-2 bg-[#602515] text-white rounded-lg hover:bg-[#4a1c10] disabled:opacity-50"
                >
                  {{
                    saving
                      ? "Menyimpan..."
                      : selectedStudent &&
                          getDepositByType(selectedStudent, form.type)
                        ? "Update Setoran"
                        : "Simpan Setoran"
                  }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Backward Surah Warning Modal -->
    <ConfirmModal
      :isOpen="showBackwardWarning"
      type="danger"
      title="Urutan Surah Tidak Valid"
      confirmText=""
      cancelText="Tutup"
      @cancel="showBackwardWarning = false"
    >
      <span>
        Surah akhir ({{ endSurahInfo?.sora_name_ar }}) tidak boleh lebih awal
        dari surah mulai ({{ startSurahInfo?.sora_name_ar }}). <br /><br />
        Mohon perbaiki urutan surah atau ayat.
      </span>
    </ConfirmModal>

    <!-- Bulk Submit Confirmation -->
    <ConfirmModal
      :isOpen="showBulkConfirm"
      type="warning"
      title="Konfirmasi Setoran Massal"
      confirmText="Ya, Simpan"
      cancelText="Batal"
      @confirm="processBulkSubmit"
      @cancel="showBulkConfirm = false"
    >
      <span>
        Anda akan menyimpan setoran untuk
        <strong>{{ selectedStudentIds.size }}</strong> santri terpilih.
        <br /><br />
        Pastikan data setoran sudah benar untuk semua santri yang dipilih.
      </span>
    </ConfirmModal>

    <!-- Bulk Delete Confirmation -->
    <ConfirmModal
      :isOpen="showBulkDeleteConfirm"
      type="danger"
      title="Hapus Data Setoran?"
      confirmText="Ya, Hapus"
      cancelText="Batal"
      @confirm="processBulkDelete"
      @cancel="showBulkDeleteConfirm = false"
    >
      <span>
        Anda akan menghapus data setoran untuk
        <strong>{{ selectedStudentIds.size }}</strong> santri terpilih.
        <br /><br />
        Tindakan ini tidak dapat dibatalkan.
      </span>
    </ConfirmModal>

    <!-- Status Modal -->
    <StatusModal
      :isOpen="showStatusModal"
      :type="statusModalType"
      :title="statusModalTitle"
      :message="statusModalMessage"
      @close="showStatusModal = false"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from "vue";
import { Icon } from "@iconify/vue";
import StatCard from "@/components/ui/StatCard.vue";
import ConfirmModal from "@/components/ui/ConfirmModal.vue";
import StatusModal from "@/components/ui/StatusModal.vue";
import { tahfidzApi, halaqahApi, authApi, quranApi, teachersApi } from "@/services/api";

const loading = ref(false);
const saving = ref(false);
const myHalaqahs = ref([]);
const selectedHalaqahId = ref(null);
const students = ref([]);
const isMultiSelectMode = ref(false);
const selectedStudentIds = ref(new Set());
const isBulkInput = ref(false);

// Status Modal State
const showStatusModal = ref(false);
const statusModalType = ref("success");
const statusModalTitle = ref("");
const statusModalMessage = ref("");

// Bulk Confirm Modal State
const showBulkConfirm = ref(false);

// Whether the current user may submit/edit setoran for a date before today
// (admin or Divisi Tahfidz head/member); defaults to true while loading so
// authorized users aren't blocked by the async check, backend still enforces it
const canBackdate = ref(true);

// Calendar State
const now = new Date();
const currentMonth = ref(now.getMonth());
const currentYear = ref(now.getFullYear());
const selectedDate = ref(now.toISOString().split("T")[0]); // YYYY-MM-DD

// Modal State
const showModal = ref(false);
const selectedStudent = ref(null);
const form = reactive({
  type: "ziyadah",
  fluency: "A",
  // New line-based fields
  startSurah: "",
  startAyat: "",
  startPage: "",
  endSurah: "",
  endAyat: "",
  endPage: "",
  totalLines: "",
  totalPages: "",
  totalPages: "",
  notes: "",
  isLate: false,
  isCompleted: null,
});

// Quran data
const surahList = ref([]);
const calculatedResult = ref(null);
const showBackwardWarning = ref(false);

// Searchable surah dropdowns
const startSurahSearch = ref("");
const endSurahSearch = ref("");
const showStartSurahDropdown = ref(false);
const showEndSurahDropdown = ref(false);
const filteredStartSurahs = ref([]);
const filteredEndSurahs = ref([]);

// Jenis grouping: Taqdim pakai form lengkap, Sabqi/Manzil cuma Sudah/Belum,
// Izin/Alpha/Sakit/Tidak Setor tanpa field posisi hafalan
const isAttendanceOnlyType = computed(() =>
  ["izin", "alpha", "sakit", "tidak_setor"].includes(form.type),
);
const showFullDepositForm = computed(() => form.type === "ziyadah");
const showSabqiManzilToggle = computed(
  () => form.type === "sabqi" || form.type === "manzil",
);

// Computed for surah info
const startSurahInfo = computed(() => {
  return surahList.value.find((s) => s.sora === form.startSurah);
});

const endSurahInfo = computed(() => {
  return surahList.value.find((s) => s.sora === form.endSurah);
});

// --- Calendar Logic ---
const currentMonthName = computed(() => {
  return new Date(currentYear.value, currentMonth.value).toLocaleString(
    "id-ID",
    { month: "long" },
  );
});

const daysInMonth = computed(() => {
  return new Date(currentYear.value, currentMonth.value + 1, 0).getDate();
});

// Dropdown State
const showHalaqahDropdown = ref(false);
const selectedHalaqah = computed(() => {
  return myHalaqahs.value.find((h) => h.id === selectedHalaqahId.value);
});

function selectHalaqah(halaqah) {
  selectedHalaqahId.value = halaqah.id;
  showHalaqahDropdown.value = false;
  loadDateData();
}

const firstDayOfWeek = computed(() => {
  const day = new Date(currentYear.value, currentMonth.value, 1).getDay();
  // Adjust for Monday start: Sun(0) -> 6, Mon(1) -> 0
  return day === 0 ? 6 : day - 1;
});

// Transition State
const slideDirection = ref("slide-left");
const transitionName = computed(() => slideDirection.value);

function changeMonth(delta) {
  slideDirection.value = delta > 0 ? "slide-left" : "slide-right";

  let newMonth = currentMonth.value + delta;
  if (newMonth > 11) {
    currentMonth.value = 0;
    currentYear.value++;
  } else if (newMonth < 0) {
    currentMonth.value = 11;
    currentYear.value--;
  } else {
    currentMonth.value = newMonth;
  }

  // Load the monthly indicator graph data immediately upon switching month
  loadMonthlyStats();
}

function selectDate(day) {
  const d = new Date(currentYear.value, currentMonth.value, day);
  // manual timezone correction or just construction string
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(day).padStart(2, "0");
  selectedDate.value = `${y}-${m}-${da}`;

  // Load data for this date
  loadDateData();
}

function isToday(day) {
  const today = new Date();
  return (
    day === today.getDate() &&
    currentMonth.value === today.getMonth() &&
    currentYear.value === today.getFullYear()
  );
}

function isSelected(day) {
  // Parsing selectedDate string
  const parts = selectedDate.value.split("-");
  return (
    parseInt(parts[2]) === day &&
    parseInt(parts[1]) - 1 === currentMonth.value &&
    parseInt(parts[0]) === currentYear.value
  );
}

// --- Status Logic ---
function getStatusColor(status) {
  if (status === "done") return "border-emerald-200 bg-emerald-50";
  if (status === "izin") return "border-yellow-200 bg-yellow-50";
  if (status === "alpha") return "border-rose-200 bg-rose-50";
  if (status === "sakit") return "border-sky-200 bg-sky-50";
  if (status === "tidak_setor") return "border-orange-200 bg-orange-50";
  return "border-slate-100 mobile:bg-white";
}

function getStatusDot(status) {
  if (status === "done") return "bg-emerald-500";
  if (status === "izin") return "bg-yellow-400";
  if (status === "alpha") return "bg-rose-500";
  if (status === "sick" || status === "sakit") return "bg-sky-400";
  if (status === "tidak_setor") return "bg-orange-500";
  return "bg-slate-300"; // Belum
}

// Taqdim, Sabqi, and Manzil are tracked independently per student per day.
function getDepositByType(item, type) {
  return (item.deposits || []).find((d) => d.type === type) || null;
}

function defaultOpenType(item) {
  if (["izin", "alpha", "sakit", "tidak_setor"].includes(item.status)) {
    return item.status;
  }
  return "ziyadah";
}

function taqdimPillClass(item) {
  return getDepositByType(item, "ziyadah")
    ? "bg-emerald-100 text-emerald-700"
    : "bg-slate-100 text-slate-400";
}

function sabqiManzilPillClass(item, type) {
  const deposit = getDepositByType(item, type);
  if (!deposit) return "bg-slate-100 text-slate-400";
  const colors =
    type === "sabqi"
      ? { sudah: "bg-teal-100 text-teal-700", belum: "bg-teal-50 text-teal-500" }
      : {
          sudah: "bg-indigo-100 text-indigo-700",
          belum: "bg-indigo-50 text-indigo-500",
        };
  return deposit.isCompleted ? colors.sudah : colors.belum;
}

function pillLabel(item, type) {
  if (type === "ziyadah") return "Taqdim";
  const label = type === "sabqi" ? "Sabqi" : "Manzil";
  const deposit = getDepositByType(item, type);
  return deposit ? `${label}: ${deposit.isCompleted ? "Sudah" : "Belum"}` : label;
}

function showJuzBlockNotice(item) {
  statusModalType.value = "failed";
  statusModalTitle.value = "Perlu Ujian Kenaikan Juz (UKJ)";
  statusModalMessage.value = `${item.student.name} sudah menyelesaikan Juz ${item.juzBlock.completedJuz}. Santri ini harus mengikuti dan lulus UKJ untuk Juz ${item.juzBlock.completedJuz} sebelum bisa melanjutkan setoran Taqdim.`;
  showStatusModal.value = true;
}

function getStatusText(status) {
  if (status === "done") return "text-emerald-700";
  if (status === "izin") return "text-yellow-700";
  if (status === "alpha") return "text-rose-700";
  if (status === "sakit") return "text-sky-700";
  return "text-slate-500";
}

function getStatusLabel(status) {
  const map = {
    done: "Selesai",
    none: "Belum",
    sick: "Sakit",
    sakit: "Sakit",
    izin: "Izin",
    alpha: "Alpha",
    permission: "Izin",
  };
  return map[status] || "Belum";
}

function formatDateFull(dateStr) {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getDayProgress(day) {
  const y = currentYear.value;
  const m = String(currentMonth.value + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  const dateKey = `${y}-${m}-${d}`;

  const countObj = monthlyStats.value.data[dateKey] || {
    done: 0,
    permission: 0,
    alpha: 0,
    sakit: 0,
    sick: 0,
  };
  const countDone = countObj.done || 0;
  const countPerm = countObj.permission || countObj.izin || 0;
  const countAlpha = countObj.alpha || 0;
  const countSick = countObj.sick || countObj.sakit || 0;

  const total = monthlyStats.value.totalStudents || 1;

  const pGreen = (countDone / total) * 100;
  const pBlue = (countSick / total) * 100;
  const pYellow = (countPerm / total) * 100;
  const pRed = (countAlpha / total) * 100;

  return {
    hasData: countDone + countPerm + countAlpha + countSick > 0,
    greenDeg: pGreen * 3.6,
    blueDeg: (pGreen + pBlue) * 3.6,
    yellowDeg: (pGreen + pBlue + pYellow) * 3.6,
    redDeg: (pGreen + pBlue + pYellow + pRed) * 3.6,
  };
}

// --- Data Loading ---
const loadingHalaqah = ref(false);
const errorMessage = ref("");
const monthlyStats = ref({ data: {}, totalStudents: 0 }); // { date: count }
const healthSummary = ref({ sickCount: 0, leaveCount: 0 });

async function loadMonthlyStats() {
  if (!selectedHalaqahId.value) return;
  try {
    const res = await tahfidzApi.getHalaqahMonthlySummary(
      selectedHalaqahId.value,
      currentMonth.value + 1,
      currentYear.value,
    );
    if (res.success) {
      monthlyStats.value = res;
    }
  } catch (e) {
    console.error("Load Monthly Stats Error:", e);
  }

  try {
    const healthRes = await tahfidzApi.getHalaqahHealthSummary(
      selectedHalaqahId.value,
      currentMonth.value + 1,
      currentYear.value,
    );
    if (healthRes.success) {
      healthSummary.value = healthRes.data;
    }
  } catch (e) {
    console.error("Load Health Summary Error:", e);
  }
}

async function loadDateData() {
  if (!selectedHalaqahId.value) return;
  loading.value = true;
  try {
    const res = await tahfidzApi.getHalaqahDailySummary(
      selectedHalaqahId.value,
      selectedDate.value,
    );
    if (res.success) {
      students.value = res.data || [];
    } else {
      students.value = [];
      console.warn("[TahfidzHalaqah] Failed to load daily summary:", res.message);
    }
    // Also refresh monthly stats if we just saved data, but simpler to just call it when month changes
    // calling it here ensures if we add data today, the circle updates
    loadMonthlyStats();
  } catch (e) {
    students.value = [];
    console.error("[TahfidzHalaqah] Error loading date data:", e);
  } finally {
    loading.value = false;
  }
}
async function loadInitial() {
  loadingHalaqah.value = true;
  errorMessage.value = "";
  try {
    // 1. Get My Halaqahs
    // Ideally: halaqahApi.getMyGroups()
    // const user = await authApi.getCurrentUser(); // Not used currently for filtering

    const res = await halaqahApi.getAll();

    if (res.success) {
      myHalaqahs.value = res.data;

      if (myHalaqahs.value.length > 0) {
        // Keeps selection if valid, else selects the user's halaqah or first
        if (
          !selectedHalaqahId.value ||
          !myHalaqahs.value.find((h) => h.id === selectedHalaqahId.value)
        ) {
          let matchedHalaqah = null;
          try {
            const userStr = localStorage.getItem("user");
            if (userStr) {
              const user = JSON.parse(userStr);
              let userTeacherId = user?.teacher?.id;
              const userId = user?.id;

              // If teacherId is missing but we have userId, cross-reference with teachersApi
              if (!userTeacherId && userId) {
                 try {
                     const teacherRes = await teachersApi.getAll();
                     if (teacherRes && Array.isArray(teacherRes.data)) {
                         const teacher = teacherRes.data.find(t => t.userId === userId);
                         if (teacher) {
                             userTeacherId = teacher.id;
                         }
                     }
                 } catch(err) {
                    console.warn("Could not fetch teacher relation for auto-select", err);
                 }
              }

              matchedHalaqah = myHalaqahs.value.find((h) => {
                if (!h.mentors || !Array.isArray(h.mentors)) return false;
                return h.mentors.some(
                  (m) =>
                    (userTeacherId && m.teacherId === userTeacherId) ||
                    (!userTeacherId && userId && m.teacherId === userId) // emergency fallback
                );
              });
            }
          } catch (e) {
            console.warn("Auto-select halaqah user parsing error", e);
          }

          selectedHalaqahId.value = matchedHalaqah ? matchedHalaqah.id : myHalaqahs.value[0].id;
        }
        loadDateData();
        loadMonthlyStats();
      }
    } else {
      console.error("[TahfidzHalaqah] Failed to load halaqahs:", res.message);
      errorMessage.value = res.message || "Gagal memuat grup.";
    }

    // Load surahs for display mapping
    await loadSurahs();
  } catch (e) {
    console.error("[TahfidzHalaqah] Exception in loadInitial:", e);
    errorMessage.value = e.message || "Kesalahan jaringan/sistem.";
  } finally {
    loadingHalaqah.value = false;
  }
}

// --- Modal & Actions ---
// --- Quran Surah Logic ---
async function loadSurahs() {
  if (surahList.value.length > 0) return;
  try {
    const res = await quranApi.getSurahs();
    if (res.success) {
      surahList.value = res.data;
      filteredStartSurahs.value = res.data;
      filteredEndSurahs.value = res.data;
    }
  } catch (e) {
    console.error("Failed to load surahs:", e);
  }
}

// Helper for search normalization
function normalizeSurahName(name) {
  if (!name) return "";
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ""); // Remove non-alphanumeric
}

function getSurahName(number) {
  if (!number) return "-";
  const s = surahList.value.find((i) => i.sora === Number(number));
  return s ? s.sora_name_ar : number;
}

function filterStartSurahs() {
  const rawQ = startSurahSearch.value;
  if (!rawQ) {
    filteredStartSurahs.value = surahList.value;
    return;
  }

  const q = normalizeSurahName(rawQ);

  filteredStartSurahs.value = surahList.value.filter((s) => {
    const normAr = normalizeSurahName(s.sora_name_ar);
    const normEn = normalizeSurahName(s.sora_name_en);
    const normId = String(s.sora);

    return normId.includes(q) || normAr.includes(q) || normEn.includes(q);
  });
}

function filterEndSurahs() {
  const rawQ = endSurahSearch.value;
  if (!rawQ) {
    filteredEndSurahs.value = surahList.value;
    return;
  }

  const q = normalizeSurahName(rawQ);

  filteredEndSurahs.value = surahList.value.filter((s) => {
    const normAr = normalizeSurahName(s.sora_name_ar);
    const normEn = normalizeSurahName(s.sora_name_en);
    const normId = String(s.sora);

    return normId.includes(q) || normAr.includes(q) || normEn.includes(q);
  });
}

function selectStartSurah(surah) {
  form.startSurah = surah.sora;
  startSurahSearch.value = `${surah.sora}. ${surah.sora_name_ar}`;
  showStartSurahDropdown.value = false;
  form.startAyat = "";
  form.startPage = "";
  calculatedResult.value = null;
  showBackwardWarning.value = false;
}

function selectEndSurah(surah) {
  form.endSurah = surah.sora;
  endSurahSearch.value = `${surah.sora}. ${surah.sora_name_ar}`;
  showEndSurahDropdown.value = false;
  form.endAyat = "";
  form.endPage = "";
  calculatedResult.value = null;
  showBackwardWarning.value = false;
}

// Bulk Selection Logic
function toggleMultiSelectMode() {
  isMultiSelectMode.value = !isMultiSelectMode.value;
  selectedStudentIds.value.clear();
}

function toggleStudentSelection(student) {
  const id = student.student.id;
  if (selectedStudentIds.value.has(id)) {
    selectedStudentIds.value.delete(id);
  } else {
    selectedStudentIds.value.add(id);
  }
}

function selectAllStudents() {
  if (selectedStudentIds.value.size === students.value.length) {
    selectedStudentIds.value.clear();
  } else {
    students.value.forEach((s) => selectedStudentIds.value.add(s.student.id));
  }
}

function openBulkInputModal() {
  if (selectedStudentIds.value.size === 0) return;
  openModal(null, true);
}

function onAyatChange(type) {
  const surahInfo =
    type === "start" ? startSurahInfo.value : endSurahInfo.value;
  const ayatField = type === "start" ? "startAyat" : "endAyat";

  if (surahInfo && form[ayatField] > surahInfo.ayat_count) {
    form[ayatField] = surahInfo.ayat_count;
  }
  if (form[ayatField] < 1) {
    form[ayatField] = 1;
  }

  calculateDeposit();
}

async function calculateDeposit() {
  if (!form.startSurah || !form.startAyat || !form.endSurah || !form.endAyat) {
    calculatedResult.value = null;
    return;
  }

  // Check for backward surah (end surah < start surah)
  const startS = Number(form.startSurah);
  const endS = Number(form.endSurah);
  const startA = Number(form.startAyat);
  const endA = Number(form.endAyat);

  const isBackward = endS < startS || (endS === startS && endA < startA);

  if (isBackward) {
    showBackwardWarning.value = true;
    calculatedResult.value = null;
    return;
  } else {
    showBackwardWarning.value = false;
  }

  try {
    const res = await quranApi.calculate(startS, startA, endS, endA);

    if (res.success) {
      calculatedResult.value = res.data;
      form.startPage = res.data.start.page;
      form.endPage = res.data.end.page;
      form.totalLines = res.data.totalLines;
      form.totalPages = res.data.totalPages;
    }
  } catch (e) {
    console.error("Calculate error:", e);
  }
}

// --- Modal Functions
// Open Modal
async function openModal(item, bulk = false, presetType = null) {
  // Taqdim is blocked once the student has finished a juz until they pass
  // the UKJ exam for it (also enforced server-side).
  if (!bulk && presetType === "ziyadah" && item?.juzBlock?.blocked) {
    showJuzBlockNotice(item);
    return;
  }

  isBulkInput.value = bulk;
  if (bulk) {
    selectedStudent.value = null; // No single student context
  } else {
    selectedStudent.value = item;
  }

  // Load surahs
  await loadSurahs();

  // Reset form
  form.type = presetType || "ziyadah";
  form.fluency = "A";
  form.startSurah = "";
  form.startAyat = "";
  form.startPage = "";
  form.endSurah = "";
  form.endAyat = "";
  form.endPage = "";
  form.totalLines = "";
  form.totalPages = "";
  form.notes = "";
  form.isLate = false;
  form.isCompleted = null;

  // Reset search
  startSurahSearch.value = "";
  endSurahSearch.value = "";
  showStartSurahDropdown.value = false;
  showEndSurahDropdown.value = false;
  filteredStartSurahs.value = surahList.value;
  filteredEndSurahs.value = surahList.value;
  calculatedResult.value = null;
  errorMessage.value = "";

  // Pre-fill if not bulk and student already has a deposit of this type
  // for the day (edit mode). Taqdim, Sabqi, and Manzil are independent, so
  // look up the specific type rather than assuming a single deposit per day.
  const existingDeposit = !bulk
    ? (item.deposits || []).find((d) => d.type === form.type)
    : null;
  if (existingDeposit) {
    form.type = existingDeposit.type;
    form.fluency = existingDeposit.fluency || "A";
    form.notes = existingDeposit.notes || "";
    form.isLate = existingDeposit.isLate || false;
    form.isCompleted =
      existingDeposit.isCompleted === undefined
        ? null
        : existingDeposit.isCompleted;
    // If we have new fields, populate them
    if (existingDeposit.startSurah) {
      form.startSurah = existingDeposit.startSurah;
      form.startAyat = existingDeposit.startAyat;
      form.endSurah = existingDeposit.endSurah;
      form.endAyat = existingDeposit.endAyat;
      // Find surah name for display
      const startS = surahList.value.find(
        (s) => s.sora === existingDeposit.startSurah,
      );
      const endS = surahList.value.find(
        (s) => s.sora === existingDeposit.endSurah,
      );
      if (startS)
        startSurahSearch.value = `${startS.sora}. ${startS.sora_name_ar}`;
      if (endS) endSurahSearch.value = `${endS.sora}. ${endS.sora_name_ar}`;
      await calculateDeposit();
    }
  }

  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  selectedStudent.value = null;
  isBulkInput.value = false;
  saving.value = false;
}

async function submitDeposit() {
  // Validate
  if (showFullDepositForm.value && !calculatedResult.value) {
    statusModalType.value = "failed";
    statusModalTitle.value = "Validasi Gagal";
    statusModalMessage.value = "Mohon lengkapi data hafalan";
    showStatusModal.value = true;
    return;
  }

  const todayStr = new Date().toISOString().split("T")[0];
  if (selectedDate.value < todayStr && !canBackdate.value) {
    statusModalType.value = "failed";
    statusModalTitle.value = "Tidak Diizinkan";
    statusModalMessage.value =
      "Pengampu halaqoh hanya dapat menginput setoran untuk hari ini. Input untuk hari sebelumnya hanya dapat dilakukan oleh Kepala Divisi atau anggota Divisi Tahfidz.";
    showStatusModal.value = true;
    return;
  }

  // Check Bulk
  if (isBulkInput.value) {
    showBulkConfirm.value = true;
    return;
  }

  await processDepositSubmission();
}

const showBulkDeleteConfirm = ref(false);

async function processBulkDelete() {
  showBulkDeleteConfirm.value = false;
  saving.value = true;
  try {
    const idsToDelete = [];
    students.value.forEach((s) => {
      if (selectedStudentIds.value.has(s.student.id)) {
        (s.deposits || []).forEach((d) => idsToDelete.push(d.id));
      }
    });

    if (idsToDelete.length === 0) {
      statusModalType.value = "failed";
      statusModalTitle.value = "Gagal";
      statusModalMessage.value =
        "Tidak ada data setoran yang dapat dihapus dari pilihan.";
      showStatusModal.value = true;
      saving.value = false;
      return;
    }

    await Promise.all(idsToDelete.map((id) => tahfidzApi.deleteDeposit(id)));

    const wasBulkInput = true;
    closeModal();
    await loadDateData();

    statusModalType.value = "success";
    statusModalTitle.value = "Berhasil";
    statusModalMessage.value = `${idsToDelete.length} data setoran berhasil dihapus.`;
    showStatusModal.value = true;

    selectedStudentIds.value.clear();
    isMultiSelectMode.value = false;
  } catch (e) {
    console.error(e);
    statusModalType.value = "failed";
    statusModalTitle.value = "Gagal";
    statusModalMessage.value =
      "Gagal menghapus data: " + (e.message || "Error");
    showStatusModal.value = true;
  } finally {
    saving.value = false;
  }
}

async function processBulkSubmit() {
  showBulkConfirm.value = false;
  await processDepositSubmission();
}

async function processDepositSubmission() {
  saving.value = true;

  try {
    const userRes = await authApi.getCurrentUser();
    let teacherId = null;
    const userId = userRes.data?.id;

    if (userId) {
       try {
           const teacherRes = await teachersApi.getAll();
           if (teacherRes && Array.isArray(teacherRes.data)) {
               const teacher = teacherRes.data.find(t => t.userId === userId);
               if (teacher) teacherId = teacher.id;
           }
       } catch (err) {
           console.warn("Failed to fetch teacher relation for submission", err);
       }
    }

    if (!teacherId && selectedHalaqah.value?.mentors?.length > 0) {
      teacherId =
        selectedHalaqah.value.mentors[0].teacherId ||
        selectedHalaqah.value.mentors[0].id;
    }
    if (!teacherId) {
      teacherId = userId || 1;
    }

    const studentsToProcess = [];

    if (isBulkInput.value) {
      // Get all selected students
      students.value.forEach((item) => {
        if (selectedStudentIds.value.has(item.student.id)) {
          studentsToProcess.push(item);
        }
      });
    } else {
      if (selectedStudent.value) {
        studentsToProcess.push(selectedStudent.value);
      }
    }

    if (studentsToProcess.length === 0) {
      statusModalType.value = "failed";
      statusModalTitle.value = "Gagal";
      statusModalMessage.value = "Tidak ada siswa yang dipilih";
      showStatusModal.value = true;
      saving.value = false;
      return;
    }

    // Process each student
    const juzCompletedNotices = [];
    for (const studentItem of studentsToProcess) {
      const isFullDeposit = form.type === "ziyadah";
      const isAttendanceOnly = ["izin", "alpha", "sakit", "tidak_setor"].includes(
        form.type,
      );
      const isSabqiManzil = form.type === "sabqi" || form.type === "manzil";

      const payload = {
        studentId: studentItem.student.id,
        teacherId,
        halaqahId: selectedHalaqahId.value,
        type: form.type,
        fluency: isFullDeposit ? form.fluency : undefined,
        isLate: !isAttendanceOnly ? form.isLate || false : false,
        isCompleted: isSabqiManzil ? form.isCompleted : null,
        depositDate: selectedDate.value,
        notes: form.notes || undefined,
        // New line-based fields (Clear if not full deposit)
        startSurah:
          isFullDeposit && form.startSurah ? Number(form.startSurah) : null,
        startAyat:
          isFullDeposit && form.startAyat ? Number(form.startAyat) : null,
        startPage:
          isFullDeposit && form.startPage ? Number(form.startPage) : null,
        endSurah: isFullDeposit && form.endSurah ? Number(form.endSurah) : null,
        endAyat: isFullDeposit && form.endAyat ? Number(form.endAyat) : null,
        endPage: isFullDeposit && form.endPage ? Number(form.endPage) : null,
        totalLines:
          isFullDeposit && form.totalLines ? Number(form.totalLines) : null,
        totalPages:
          isFullDeposit && form.totalPages ? Number(form.totalPages) : null,
        // Fix: Add juz field for report
        juz:
          isFullDeposit &&
          calculatedResult.value &&
          calculatedResult.value.juzList &&
          calculatedResult.value.juzList.length > 0
            ? Number(calculatedResult.value.juzList[0])
            : null,
      };

      const existingDeposit = (studentItem.deposits || []).find(
        (d) => d.type === form.type,
      );
      let res;
      if (existingDeposit && existingDeposit.id) {
        res = await tahfidzApi.updateDeposit(existingDeposit.id, payload);
      } else {
        res = await tahfidzApi.createDeposit(payload);
      }
      if (res?.juzCompleted) {
        juzCompletedNotices.push({
          name: studentItem.student.name,
          juz: res.juzCompleted,
        });
      }
    }

    const wasBulkInput = isBulkInput.value;
    closeModal();
    // Refresh data
    await loadDateData();

    // Show successes
    statusModalType.value = "success";
    if (juzCompletedNotices.length > 0) {
      statusModalTitle.value = "Berhasil - Juz Selesai!";
      statusModalMessage.value =
        "Data setoran berhasil disimpan. " +
        juzCompletedNotices
          .map(
            (n) =>
              `${n.name} telah menyelesaikan Juz ${n.juz} - wajib mengikuti UKJ sebelum lanjut Taqdim.`,
          )
          .join(" ");
    } else {
      statusModalTitle.value = "Berhasil";
      statusModalMessage.value = "Data setoran berhasil disimpan.";
    }
    showStatusModal.value = true;

    // Clear selection if bulk
    if (wasBulkInput) {
      selectedStudentIds.value.clear();
      isMultiSelectMode.value = false;
    }
  } catch (e) {
    console.error(e);
    statusModalType.value = "failed";
    statusModalTitle.value = "Gagal";
    statusModalMessage.value =
      "Gagal menyimpan data: " + (e.message || "Unknown error");
    showStatusModal.value = true;
  } finally {
    saving.value = false;
  }
}

function getPhotoUrl(path) {
  if (!path) return null;
  const base = import.meta.env.VITE_API_BASE_URL || "";
  if (path.startsWith("http")) return path;
  if (path.startsWith("uploads/")) return `${base}/api/${path}`;
  if (path.startsWith("/uploads/")) return `${base}/api${path}`;
  return path;
}

async function loadCanBackdate() {
  try {
    const res = await tahfidzApi.canBackdate();
    if (res.success) {
      canBackdate.value = !!res.data?.allowed;
    }
  } catch (e) {
    console.error("Failed to load backdate permission:", e);
  }
}

onMounted(() => {
  loadInitial();
  loadCanBackdate();
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Slide Left (Next Month) */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.25s ease-out;
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* Slide Right (Prev Month) */
.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}
.slide-right-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
