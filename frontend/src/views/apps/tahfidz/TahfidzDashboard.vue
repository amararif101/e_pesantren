<template>
  <div class="max-w-7xl mx-auto pb-12">
    <!-- Header -->
    <div
      class="p-2 md:p-6 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
    >
      <div>
        <h1 class="text-2xl font-bold text-slate-800">Mutaba'ah Tahfidz</h1>
        <p class="text-slate-500">
          Pantau perkembangan hafalan santri secara realtime
        </p>
      </div>
      <div class="hidden md:block"></div>
    </div>

    <!-- Stats Cards -->
    <div class="p-2 md:p-6 md:pt-0 md:pb-0 grid grid-cols-1 md:grid-cols-2 gap-4 mb-0">
      <StatCard
        icon="solar:book-bookmark-bold-duotone"
        color="emerald"
        label="Santri Menghafal"
        :value="stats.activeStudents"
      />
      <StatCard
        icon="solar:check-read-bold-duotone"
        color="indigo"
        label="Total Setoran"
        :value="stats.totalDeposits"
      />
      <!-- Add more stats if needed -->
    </div>

    <!-- Main Content: List of Deposits / Progress -->
    <DataTable
      title="Riwayat Setoran Terbaru"
      description="Daftar setoran hafalan santri"
      icon="solar:history-bold-duotone"
      :columns="columns"
      :items="deposits"
      :loading="loading"
      :viewMode="viewMode"
      :pagination="pagination"
      :search="search"
      @update:viewMode="viewMode = $event"
      @page-change="handlePageChange"
      @update:limit="handleLimitChange"
      @update:search="handleSearch"
    >
      <template #header-actions>
        <button
          @click="openInputModal"
          class="bg-[#602515] text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-[#4a1c10] transition-colors text-sm"
        >
          <Icon icon="solar:add-circle-bold-duotone" class="text-lg" />
          Input Setoran
        </button>
      </template>
      <template #cell-className="{ item }">
        <span class="text-slate-600">{{ item.className || "-" }}</span>
      </template>

      <template #cell-roomName="{ item }">
        <span class="text-slate-600">{{ item.roomName || "-" }}</span>
      </template>

      <template #cell-halaqahName="{ item }">
        <span class="text-slate-600">{{ item.halaqahName || "-" }}</span>
      </template>

      <template #cell-actions="{ item }">
        <div class="flex items-center gap-2">
          <button
            @click="editDeposit(item)"
            class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit"
          >
            <Icon icon="solar:pen-bold-duotone" class="text-lg" />
          </button>
          <button
            @click="confirmDelete(item)"
            class="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Hapus"
          >
            <Icon icon="solar:trash-bin-trash-bold-duotone" class="text-lg" />
          </button>
        </div>
      </template>

      <template #cell-fluency="{ item }">
        <span
          class="px-2 py-1 rounded-full text-xs font-medium"
          :class="{
            'bg-green-100 text-green-700': item.fluency === 'A',
            'bg-yellow-100 text-yellow-700': item.fluency === 'B',
            'bg-red-100 text-red-700': item.fluency === 'C',
          }"
        >
          {{ item.fluency }}
        </span>
      </template>

      <template #cell-type="{ item }">
        <span
          class="px-2 py-1 rounded-full text-xs font-medium"
          :class="{
            'bg-blue-50 text-blue-700 border border-blue-100':
              item.type === 'ziyadah',
            'bg-teal-50 text-teal-700 border border-teal-100':
              item.type === 'sabqi',
            'bg-indigo-50 text-indigo-700 border border-indigo-100':
              item.type === 'manzil',
            'bg-slate-50 text-slate-700 border border-slate-200':
              item.type === 'murajaah',
            'bg-sky-50 text-sky-700 border border-sky-100':
              item.type === 'sakit',
            'bg-yellow-50 text-yellow-700 border border-yellow-100':
              item.type === 'izin',
            'bg-rose-50 text-rose-700 border border-rose-100':
              item.type === 'alpha',
            'bg-orange-50 text-orange-700 border border-orange-100':
              item.type === 'tidak_setor',
          }"
        >
          {{
            item.type === "ziyadah"
              ? "Taqdim"
              : item.type === "sabqi"
                ? "Sabqi"
                : item.type === "manzil"
                  ? "Manzil"
                  : item.type === "murajaah"
                    ? "Muraja'ah"
                    : item.type === "sakit"
                      ? "Sakit"
                      : item.type === "izin"
                        ? "Izin"
                        : item.type === "tidak_setor"
                          ? "Tidak Setor"
                          : "Alpha"
          }}
        </span>
      </template>

      <template #cell-location="{ item }">
        <span class="text-slate-700 font-medium whitespace-nowrap">
          <span v-if="item.type === 'sakit'" class="text-sky-600 font-bold"
            >Sakit</span
          >
          <span
            v-else-if="item.type === 'alpha'"
            class="text-rose-600 font-bold"
            >Alpha</span
          >
          <span
            v-else-if="item.type === 'izin'"
            class="text-yellow-600 font-bold"
            >Izin</span
          >
          <span
            v-else-if="item.type === 'tidak_setor'"
            class="text-orange-600 font-bold"
            >Tidak Setor</span
          >
          <span
            v-else-if="item.type === 'sabqi' || item.type === 'manzil'"
            class="font-bold"
            :class="item.type === 'sabqi' ? 'text-teal-600' : 'text-indigo-600'"
          >
            {{ item.type === "sabqi" ? "Sabqi" : "Manzil" }}:
            {{ item.isCompleted ? "Sudah" : "Belum" }}
          </span>
          <span v-else>
            <div v-if="item.startSurah">
              <div class="font-bold text-slate-800">
                <span v-if="item.startSurah === item.endSurah">
                  QS. {{ getSurahName(item.startSurah) }}:
                  {{ item.startAyat }} -
                  {{ item.endAyat }}
                </span>
                <span v-else>
                  QS. {{ getSurahName(item.startSurah) }}:
                  {{ item.startAyat }} - QS. {{ getSurahName(item.endSurah) }}:
                  {{ item.endAyat }}
                </span>
              </div>
              <div class="text-xs text-slate-500">
                {{ item.totalPages }} Hal
              </div>
            </div>
            <div v-else>
              <span v-if="item.surah">{{ item.surah }}</span>
              <span v-else>Juz {{ item.juz }}</span>
              <span v-if="item.ayatStart" class="text-slate-500 text-xs ml-1">
                (Ayat {{ item.ayatStart }}-{{ item.ayatEnd }})
              </span>
            </div>
          </span>
        </span>
      </template>

      <!-- Card View Template -->
      <template #card-item="{ item }">
        <div
          class="bg-white rounded-xl shadow-sm border border-slate-100 p-4 hover:shadow-md transition-shadow h-full flex flex-col"
        >
          <!-- Header: Student & Date -->
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-[#602515] font-bold text-sm"
              >
                {{ item.studentName?.charAt(0) }}
              </div>
              <div class="overflow-hidden">
                <h3 class="font-semibold text-slate-800 truncate">
                  {{ item.studentName }}
                </h3>
                <p class="text-xs text-slate-500">
                  <span v-if="item.className">{{ item.className }}</span>
                  <span v-if="item.className && item.roomName"> • </span>
                  <span v-if="item.roomName">{{ item.roomName }}</span>
                </p>
                <p
                  v-if="item.halaqahName"
                  class="text-xs text-[#602515] mt-0.5"
                >
                  <Icon
                    icon="solar:users-group-rounded-bold"
                    class="inline text-sm align-text-bottom mr-1"
                  />{{ item.halaqahName }}
                </p>
                <p class="text-[11px] text-slate-400 mt-0.5">{{ item.date }}</p>
              </div>
            </div>
            <div class="flex flex-col gap-1">
              <button
                @click="editDeposit(item)"
                class="text-slate-400 hover:text-blue-600 p-1"
                title="Edit"
              >
                <Icon icon="solar:pen-bold-duotone" class="text-lg" />
              </button>
              <button
                @click="confirmDelete(item)"
                class="text-slate-400 hover:text-red-600 p-1"
                title="Hapus"
              >
                <Icon
                  icon="solar:trash-bin-trash-bold-duotone"
                  class="text-lg"
                />
              </button>
            </div>
          </div>

          <!-- Badges: Type & Fluency -->
          <div class="flex flex-wrap gap-2 mb-3">
            <span
              class="px-2 py-1 rounded-full text-xs font-medium"
              :class="{
                'bg-blue-50 text-blue-700 border border-blue-100':
                  item.type === 'ziyadah',
                'bg-teal-50 text-teal-700 border border-teal-100':
                  item.type === 'sabqi',
                'bg-indigo-50 text-indigo-700 border border-indigo-100':
                  item.type === 'manzil',
                'bg-slate-50 text-slate-700 border border-slate-200':
                  item.type === 'murajaah',
                'bg-sky-50 text-sky-700 border border-sky-100':
                  item.type === 'sakit',
                'bg-yellow-50 text-yellow-700 border border-yellow-100':
                  item.type === 'izin',
                'bg-rose-50 text-rose-700 border border-rose-100':
                  item.type === 'alpha',
                'bg-orange-50 text-orange-700 border border-orange-100':
                  item.type === 'tidak_setor',
              }"
            >
              {{
                item.type === "ziyadah"
                  ? "Taqdim"
                  : item.type === "sabqi"
                    ? "Sabqi"
                    : item.type === "manzil"
                      ? "Manzil"
                      : item.type === "murajaah"
                        ? "Muraja'ah"
                        : item.type === "sakit"
                          ? "Sakit"
                          : item.type === "izin"
                            ? "Izin"
                            : item.type === "tidak_setor"
                              ? "Tidak Setor"
                              : "Alpha"
              }}
            </span>
            <span
              class="px-2 py-1 rounded-full text-xs font-medium"
              :class="{
                'bg-green-100 text-green-700': item.fluency === 'A',
                'bg-yellow-100 text-yellow-700': item.fluency === 'B',
                'bg-red-100 text-red-700': item.fluency === 'C',
              }"
            >
              {{ item.fluency }}
            </span>
          </div>

          <!-- Location -->
          <div class="p-3 bg-slate-50 rounded-lg mb-3 mt-auto">
            <div
              class="flex items-center gap-2 text-sm text-slate-700 font-medium"
            >
              <Icon icon="solar:book-2-bold-duotone" class="text-amber-600" />

              <span v-if="item.type === 'sakit'" class="text-sky-600 font-bold"
                >Sakit</span
              >
              <span
                v-else-if="item.type === 'alpha'"
                class="text-rose-600 font-bold"
                >Alpha</span
              >
              <span
                v-else-if="item.type === 'izin'"
                class="text-yellow-600 font-bold"
                >Izin</span
              >
              <span
                v-else-if="item.type === 'tidak_setor'"
                class="text-orange-600 font-bold"
                >Tidak Setor</span
              >
              <span
                v-else-if="item.type === 'sabqi' || item.type === 'manzil'"
                class="font-bold"
                :class="item.type === 'sabqi' ? 'text-teal-600' : 'text-indigo-600'"
              >
                {{ item.type === "sabqi" ? "Sabqi" : "Manzil" }}:
                {{ item.isCompleted ? "Sudah" : "Belum" }}
              </span>
              <span v-else>
                <div v-if="item.startSurah">
                  <div class="font-bold text-slate-800 text-sm">
                    <span v-if="item.startSurah === item.endSurah">
                      QS. {{ getSurahName(item.startSurah) }}:
                      {{ item.startAyat }} - {{ item.endAyat }}
                    </span>
                    <span v-else>
                      QS. {{ getSurahName(item.startSurah) }}:
                      {{ item.startAyat }} - QS.
                      {{ getSurahName(item.endSurah) }}: {{ item.endAyat }}
                    </span>
                  </div>
                  <div class="text-xs text-slate-500 mt-1">
                    {{ item.totalPages }} Hal
                  </div>
                </div>
                <div v-else>
                  <span v-if="item.surah">{{ item.surah }}</span>
                  <span v-else>Juz {{ item.juz }}</span>
                </div>
              </span>
            </div>
            <div
              v-if="item.ayatStart && !item.startSurah"
              class="text-xs text-slate-500 mt-1 ml-6"
            >
              Ayat {{ item.ayatStart }} - {{ item.ayatEnd }}
            </div>
          </div>

          <!-- Footer: Musyrif -->
          <div
            v-if="item.teacherName"
            class="pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500"
          >
            <Icon icon="solar:user-id-bold-duotone" />
            <span>Musyrif: {{ item.teacherName }}</span>
          </div>
        </div>
      </template>
      <!-- Filter Slot -->
      <template #filters="{ close }">
        <div class="space-y-4">
          <!-- Date Range -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1"
              >Tanggal</label
            >
            <div class="grid grid-cols-2 gap-2">
              <input
                type="date"
                v-model="filters.startDate"
                class="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#602515]"
                placeholder="Mulai"
              />
              <input
                type="date"
                v-model="filters.endDate"
                class="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#602515]"
                placeholder="Akhir"
              />
            </div>
          </div>

          <!-- Halaqah -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1"
              >Halaqah</label
            >
            <select
              v-model="filters.halaqahId"
              class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#602515]"
            >
              <option value="">Semua Halaqah</option>
              <option v-for="h in halaqahList" :key="h.id" :value="h.id">
                {{ h.name }}
              </option>
            </select>
          </div>

          <!-- Gender -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1"
              >Jenis Kelamin</label
            >
            <select
              v-model="filters.gender"
              class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#602515]"
            >
              <option value="">Semua</option>
              <option value="male">Laki-laki</option>
              <option value="female">Perempuan</option>
            </select>
          </div>

          <!-- Actions -->
          <div class="pt-2 flex justify-end gap-2">
            <button
              @click="close"
              class="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
            >
              Tutup
            </button>
            <button
              @click="
                applyFilters();
                close();
              "
              class="px-3 py-1.5 text-xs font-medium text-white bg-[#602515] hover:bg-[#4a1c10] rounded-lg"
            >
              Terapkan
            </button>
          </div>
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
          class="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          <div
            class="px-6 py-4 border-b flex justify-between items-center bg-slate-50 flex-shrink-0"
          >
            <h3 class="font-bold text-slate-800">Input Setoran Hafalan</h3>
            <button
              @click="showModal = false"
              class="text-slate-400 hover:text-slate-600"
            >
              <Icon icon="solar:close-circle-bold" class="text-xl" />
            </button>
          </div>

          <div class="p-6 overflow-y-auto flex-1">
            <form @submit.prevent="submitDeposit" class="space-y-4">
              <!-- Student Selection via Search (Simplified using select for now, ideally async select) -->
              <div class="relative">
                <label class="block text-sm font-medium text-slate-700 mb-1"
                  >Nama Santri</label
                >
                <div class="relative">
                  <span
                    class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500"
                  >
                    <Icon icon="solar:user-rounded-line-duotone" />
                  </span>
                  <input
                    type="text"
                    v-model="studentSearch"
                    @focus="showStudentDropdown = true"
                    @input="filterStudents"
                    placeholder="Ketikan nama santri..."
                    class="w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none"
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
                    class="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-700 border-b last:border-0 border-slate-50 flex flex-col"
                  >
                    <span class="font-medium">{{ s.fullName }}</span>
                    <span class="text-xs text-slate-500"
                      >NIS: {{ s.nis || "-" }} • Kelas:
                      {{ s.className || "-" }}</span
                    >
                  </div>
                </div>
                <div
                  v-if="showStudentDropdown && filteredStudents.length === 0"
                  class="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-4 text-center text-sm text-slate-500"
                >
                  Tidak ada santri ditemukan
                </div>
              </div>

              <!-- Type -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1"
                    >Jenis</label
                  >
                  <select
                    v-model="form.type"
                    class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none"
                  >
                    <option value="ziyadah">Taqdim (Baru)</option>
                    <option value="sabqi">Sabqi</option>
                    <option value="manzil">Manzil</option>
                    <option value="izin">Izin</option>
                    <option value="alpha">Alpha</option>
                    <option value="sakit">Sakit</option>
                    <option value="tidak_setor">Tidak Setor</option>
                  </select>
                </div>
                <div v-if="showFullDepositForm">
                  <label class="block text-sm font-medium text-slate-700 mb-1"
                    >Kualitas</label
                  >
                  <select
                    v-model="form.fluency"
                    class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none"
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
                    class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none"
                  >
                    <option :value="true">Sudah</option>
                    <option :value="false">Belum</option>
                  </select>
                </div>
              </div>

              <!-- Posisi Mulai (Dari) -->
              <div v-if="showFullDepositForm" class="p-3 bg-slate-50 rounded-lg">
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
              <div v-if="showFullDepositForm" class="p-3 bg-slate-50 rounded-lg">
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
                  class="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-[#602515]/20 outline-none"
                  placeholder="Catatan ustadz..."
                ></textarea>
              </div>

              <!-- Late Checkbox -->
              <div v-if="!isAttendanceOnlyType" class="flex items-center gap-2">
                <input
                  type="checkbox"
                  v-model="form.isLate"
                  id="isLate"
                  class="w-5 h-5 rounded border-slate-300 text-[#602515] focus:ring-[#602515]"
                />
                <label
                  for="isLate"
                  class="text-sm font-medium text-slate-700 cursor-pointer"
                  >Terlambat</label
                >
              </div>

              <div class="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  @click="showModal = false"
                  class="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  :disabled="saving"
                  class="px-4 py-2 bg-[#602515] text-white rounded-lg hover:bg-[#4a1c10] disabled:opacity-50"
                >
                  {{ saving ? "Menyimpan..." : "Simpan" }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Teleport>

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

    <!-- Delete Confirmation Modal -->
    <ConfirmModal
      :isOpen="showDeleteConfirm"
      type="danger"
      title="Hapus Setoran"
      confirmText="Hapus"
      cancelText="Batal"
      @confirm="deleteDeposit"
      @cancel="
        showDeleteConfirm = false;
        depositToDelete = null;
      "
    >
      <span>
        Apakah Anda yakin ingin menghapus catatan setoran hafalan atas nama
        <strong>{{ depositToDelete?.studentName }}</strong> pada
        <strong>{{ depositToDelete?.date }}</strong
        >? Tindakan ini tidak dapat dibatalkan.
      </span>
    </ConfirmModal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from "vue";
import { Icon } from "@iconify/vue";
import StatCard from "@/components/ui/StatCard.vue";
import DataTable from "@/components/ui/DataTable.vue";
import ConfirmModal from "@/components/ui/ConfirmModal.vue";
import {
  tahfidzApi,
  studentsApi,
  authApi,
  halaqahApi,
  quranApi,
  teachersApi,
} from "@/services/api";

const loading = ref(false);
const saving = ref(false);
const showModal = ref(false);
const viewMode = ref("table");

const stats = reactive({
  totalDeposits: 0,
  activeStudents: 0,
});

const deposits = ref([]);
const studentsList = ref([]);
const filteredStudents = ref([]);
const studentSearch = ref("");
const showStudentDropdown = ref(false);
const currentUser = ref(null);
const defaultTeacherId = ref(null);

// Quran data
const surahList = ref([]);
const calculatedResult = ref(null);
const showBackwardWarning = ref(false);
const backwardConfirmed = ref(false);

const showDeleteConfirm = ref(false);
const depositToDelete = ref(null);

// Searchable surah dropdowns
const startSurahSearch = ref("");
const endSurahSearch = ref("");
const showStartSurahDropdown = ref(false);
const showEndSurahDropdown = ref(false);
const filteredStartSurahs = ref([]);
const filteredEndSurahs = ref([]);

const columns = [
  { field: "date", label: "TANGGAL", sortable: true },
  { field: "studentName", label: "NAMA SANTRI", sortable: true },
  { field: "className", label: "ROMBEL", sortable: true },
  { field: "roomName", label: "KAMAR", sortable: true },
  { field: "halaqahName", label: "GRUP HALAQAH", sortable: true },
  { field: "type", label: "JENIS" },
  { field: "location", label: "HAFALAN" },
  { field: "fluency", label: "KUALITAS" },
  { field: "teacherName", label: "MUSYRIF" },
  { field: "actions", label: "AKSI", align: "center" },
];

const form = reactive({
  id: null,
  studentId: "",
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
  // Other
  notes: "",
  isLate: false,
  isCompleted: null,
});

const filters = reactive({
  startDate: "",
  endDate: "",
  halaqahId: "",
  gender: "",
});

const halaqahList = ref([]);

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

function getSurahName(number) {
  const surah = surahList.value.find((s) => s.sora === Number(number));
  return surah ? surah.sora_name_en : `Surah ${number}`;
}

async function loadHalaqah() {
  try {
    const res = await halaqahApi.getAll();
    if (res.data) halaqahList.value = res.data;
  } catch (e) {
    console.error(e);
  }
}

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
});

const search = ref("");

async function loadData() {
  loading.value = true;
  try {
    const params = {
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      halaqahId: filters.halaqahId || undefined,
      gender: filters.gender || undefined,
      page: pagination.page,
      limit: pagination.limit,
      search: search.value || undefined,
    };

    // Remove undefined keys so they don't become "undefined" string
    Object.keys(params).forEach(
      (key) => params[key] === undefined && delete params[key],
    );

    const [statsRes, depositsRes] = await Promise.all([
      tahfidzApi.getStats(params),
      tahfidzApi.getDeposits(params),
    ]);

    if (statsRes.success) {
      Object.assign(stats, statsRes.data);
    }
    if (depositsRes.success) {
      deposits.value = depositsRes.data.map((d) => ({
        ...d,
        date: new Date(d.date).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }),
      }));
      // Update pagination
      if (depositsRes.pagination) {
        Object.assign(pagination, depositsRes.pagination);
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

function applyFilters() {
  pagination.page = 1; // Reset to page 1 on filter trigger
  loadData();
}

function handlePageChange(newPage) {
  pagination.page = newPage;
  loadData();
}

function handleLimitChange(newLimit) {
  pagination.limit = newLimit;
  pagination.page = 1;
  loadData();
}

// Debounce for search
let searchTimeout;
function handleSearch(val) {
  search.value = val;
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    pagination.page = 1;
    loadData();
  }, 300);
}

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

// Filter functions for searchable surah
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

    // Check if query matches number or normalized name
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
  // Clear error warning if any
  showBackwardWarning.value = false;
}

function selectEndSurah(surah) {
  form.endSurah = surah.sora;
  endSurahSearch.value = `${surah.sora}. ${surah.sora_name_ar}`;
  showEndSurahDropdown.value = false;
  form.endAyat = "";
  form.endPage = "";
  calculatedResult.value = null;
  // Clear error warning if any
  showBackwardWarning.value = false;
}

function onAyatChange(type) {
  // Validate ayat doesn't exceed max
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

  // Backward if end surah is before start surah
  // Or same surah but end ayat is before start ayat
  const isBackward = endS < startS || (endS === startS && endA < startA);

  if (isBackward) {
    // STRICT BLOCK: Do not allow calculation for backward sequence
    // Show error modal and stop
    showBackwardWarning.value = true;
    calculatedResult.value = null;
    return;
  } else {
    // Ensure warning is hidden if valid
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

async function openInputModal() {
  // Load students if empty
  if (studentsList.value.length === 0) {
    try {
      const res = await studentsApi.getAll({ limit: 1000 });
      if (res.data) {
        studentsList.value = res.data;
        filteredStudents.value = res.data;
      }
    } catch (e) {
      console.error(e);
    }
  } else {
    filteredStudents.value = studentsList.value;
  }

  // Load surahs
  await loadSurahs();

  // Get current user (teacher) id
  if (!currentUser.value) {
    const userRes = await authApi.getCurrentUser();
    currentUser.value = userRes.data;
  }

  // Resolve actual teacher ID for the current logged-in user
  if (
    currentUser.value &&
    !currentUser.value.teacher?.id &&
    !defaultTeacherId.value
  ) {
    try {
      const userId = currentUser.value.id;
      const teachersRes = await teachersApi.getAll();
      if (teachersRes.data && Array.isArray(teachersRes.data)) {
        const teacher = teachersRes.data.find(t => t.userId === userId);
        if (teacher) {
           defaultTeacherId.value = teacher.id;
        } else if (teachersRes.data.length > 0) {
           defaultTeacherId.value = teachersRes.data[0].id; // Fallback for Admin
        }
      }
    } catch (e) {
      console.error("Failed to fetch teacher profile:", e);
    }
  }

  // Reset form
  Object.assign(form, {
    id: null,
    studentId: "",
    type: "ziyadah",
    fluency: "A",
    startSurah: "",
    startAyat: "",
    startPage: "",
    endSurah: "",
    endAyat: "",
    endPage: "",
    totalLines: "",
    totalPages: "",
    notes: "",
    isLate: false,
    isCompleted: null,
  });
  studentSearch.value = "";
  calculatedResult.value = null;
  backwardConfirmed.value = false;
  // Reset surah search
  startSurahSearch.value = "";
  endSurahSearch.value = "";
  showStartSurahDropdown.value = false;
  showEndSurahDropdown.value = false;
  filteredStartSurahs.value = surahList.value;
  filteredEndSurahs.value = surahList.value;

  showModal.value = true;
}

async function submitDeposit() {
  if (!form.studentId) {
    alert("Mohon pilih santri terlebih dahulu");
    return;
  }
  if (
    showFullDepositForm.value &&
    (!form.startSurah || !form.startAyat || !form.endSurah || !form.endAyat)
  ) {
    alert("Mohon isi posisi mulai dan akhir hafalan");
    return;
  }

  saving.value = true;
  try {
    const isFullDeposit = form.type === "ziyadah";
    const isAttendanceOnly = ["izin", "alpha", "sakit", "tidak_setor"].includes(
      form.type,
    );
    const isSabqiManzil = form.type === "sabqi" || form.type === "manzil";

    const payload = {
      studentId: Number(form.studentId),
      teacherId: currentUser.value?.teacher?.id || defaultTeacherId.value || 1,
      type: form.type,
      fluency: isFullDeposit ? form.fluency : undefined,
      isLate: !isAttendanceOnly ? form.isLate || false : false,
      isCompleted: isSabqiManzil ? form.isCompleted : null,
      depositDate: new Date(),
      notes: form.notes || undefined,
      // New line-based fields
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
    };

    if (form.id) {
      await tahfidzApi.updateDeposit(form.id, payload);
      alert("Setoran berhasil diperbarui!");
    } else {
      await tahfidzApi.createDeposit(payload);
      alert("Setoran berhasil dicatat!");
    }

    showModal.value = false;
    loadData();
  } catch (e) {
    alert("Gagal menyimpan: " + e.message);
  } finally {
    saving.value = false;
  }
}

async function editDeposit(item) {
  // Load necessary data first
  if (studentsList.value.length === 0) {
    try {
      const res = await studentsApi.getAll({ limit: 1000 });
      if (res.data) {
        studentsList.value = res.data;
        filteredStudents.value = res.data;
      }
    } catch (e) {
      console.error(e);
    }
  } else {
    filteredStudents.value = studentsList.value;
  }

  await loadSurahs();

  // Get current user (teacher) id if any missing dependencies exist
  if (!currentUser.value) {
    const userRes = await authApi.getCurrentUser();
    currentUser.value = userRes.data;
  }

  // Find accurate student reference to populate search text properly
  const studentMatch = studentsList.value.find((s) => s.id === item.studentId);
  studentSearch.value = studentMatch ? studentMatch.fullName : item.studentName;

  Object.assign(form, {
    id: item.id,
    studentId: item.studentId,
    type: item.type,
    fluency: item.fluency || "A",
    startSurah: item.startSurah || "",
    startAyat: item.startAyat || "",
    startPage: item.startPage || "",
    endSurah: item.endSurah || "",
    endAyat: item.endAyat || "",
    endPage: item.endPage || "",
    totalLines: item.totalLines || "",
    totalPages: item.totalPages || "",
    notes: item.notes || "",
    isLate: item.isLate || false,
    isCompleted: item.isCompleted === undefined ? null : item.isCompleted,
  });

  calculatedResult.value = null;
  showBackwardWarning.value = false;

  showStartSurahDropdown.value = false;
  showEndSurahDropdown.value = false;
  filteredStartSurahs.value = surahList.value;
  filteredEndSurahs.value = surahList.value;

  showModal.value = true;
}

function confirmDelete(item) {
  depositToDelete.value = item;
  showDeleteConfirm.value = true;
}

async function deleteDeposit() {
  if (!depositToDelete.value) return;
  try {
    await tahfidzApi.deleteDeposit(depositToDelete.value.id);
    showDeleteConfirm.value = false;
    depositToDelete.value = null;
    loadData();
  } catch (e) {
    alert("Gagal menghapus: " + e.message);
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
    (s) => s.fullName.toLowerCase().includes(q) || (s.nis && s.nis.includes(q)),
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

onMounted(() => {
  loadHalaqah();
  loadSurahs();
  loadData();
});
</script>
