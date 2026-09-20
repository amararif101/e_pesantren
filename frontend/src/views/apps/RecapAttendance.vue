<template>
  <div class="space-y-6 overflow-hidden max-w-full">
    <!-- Header & Filters -->
    <div
      class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm"
    >
      <div>
        <h1 class="text-xl font-bold text-slate-800">Rekap Absensi Guru</h1>
        <p class="text-sm text-slate-500 mt-1">
          Laporan rekapitulasi kehadiran.
        </p>
      </div>

      <div
        class="flex flex-col md:flex-row md:flex-wrap items-end md:items-center justify-end gap-3 w-full md:w-auto"
      >
        <!-- Filter Mode Toggle -->
        <div
          class="flex items-center gap-2 bg-slate-100 p-1 rounded-lg w-full md:w-auto"
        >
          <button
            @click="filter.useCustomRange = false"
            class="px-3 py-1.5 text-xs font-medium rounded-md transition-all flex-1 md:flex-none text-center whitespace-nowrap"
            :class="
              !filter.useCustomRange
                ? 'bg-white shadow text-amber-900'
                : 'text-slate-500 hover:text-slate-700'
            "
          >
            Periode Gaji
          </button>
          <button
            @click="filter.useCustomRange = true"
            class="px-3 py-1.5 text-xs font-medium rounded-md transition-all flex-1 md:flex-none text-center whitespace-nowrap"
            :class="
              filter.useCustomRange
                ? 'bg-white shadow text-amber-900'
                : 'text-slate-500 hover:text-slate-700'
            "
          >
            Tanggal Custom
          </button>
        </div>

        <!-- Month/Year Selectors (Default Mode) -->
        <div
          v-if="!filter.useCustomRange"
          class="flex flex-col gap-1 w-full md:w-auto"
        >
          <div class="grid grid-cols-2 gap-2">
            <select
              v-model="filter.month"
              @change="fetchRecap"
              class="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 w-full"
            >
              <option v-for="(m, i) in months" :key="i" :value="i + 1">
                {{ m }}
              </option>
            </select>

            <select
              v-model="filter.year"
              @change="fetchRecap"
              class="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 w-full"
            >
              <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
            </select>
          </div>
          <!-- Show active date range for clarity -->
          <div
            v-if="activePeriodText"
            class="text-[10px] text-slate-500 text-right px-1"
          >
            {{ activePeriodText }}
          </div>
        </div>

        <!-- Custom Range Inputs -->
        <div
          v-else
          class="grid grid-cols-[1fr_auto_1fr] gap-2 items-center w-full md:w-auto"
        >
          <input
            type="date"
            v-model="filter.startDate"
            @change="fetchRecap"
            class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 min-w-0"
          />
          <span class="text-slate-400 font-medium">-</span>
          <input
            type="date"
            v-model="filter.endDate"
            @change="fetchRecap"
            class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 min-w-0"
          />
        </div>

        <!-- Division Filter -->
        <select
          v-model="filter.divisionId"
          @change="fetchRecap"
          class="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 min-w-[120px] w-full md:w-auto"
        >
          <option value="">Semua Divisi</option>
          <option v-for="d in divisions" :key="d.id" :value="d.id">
            {{ d.name }}
          </option>
        </select>
 
        <!-- Gender Filter -->
        <select
          v-model="filter.gender"
          @change="fetchRecap"
          class="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 min-w-[120px] w-full md:w-auto"
        >
          <option value="">Semua Gender</option>
          <option value="male">Ikhwan</option>
          <option value="female">Akhwat</option>
        </select>

        <!-- Actions -->
        <div class="flex gap-2">
          <!-- View Toggle -->
          <div
            class="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200"
          >
            <button
              @click="viewMode = 'table'"
              class="p-2 rounded-md transition-all flex items-center justify-center"
              :class="
                viewMode === 'table'
                  ? 'bg-white shadow text-amber-900'
                  : 'text-slate-500 hover:text-slate-700'
              "
              title="Tampilan Tabel"
            >
              <Icon icon="solar:list-bold-duotone" class="w-5 h-5" />
            </button>
            <button
              @click="viewMode = 'card'"
              class="p-2 rounded-md transition-all flex items-center justify-center"
              :class="
                viewMode === 'card'
                  ? 'bg-white shadow text-amber-900'
                  : 'text-slate-500 hover:text-slate-700'
              "
              title="Tampilan Kartu"
            >
              <Icon icon="solar:gallery-wide-bold-duotone" class="w-5 h-5" />
            </button>
          </div>

          <button
            @click="fetchRecap"
            class="p-2 bg-amber-900 text-white rounded-lg hover:bg-amber-400 transition-colors"
            title="Terapkan Filter"
          >
            <Icon
              icon="lucide:refresh-cw"
              class="w-5 h-5"
              :class="{ 'animate-spin': loading }"
            />
          </button>

          <button
            @click="exportToExcel"
            :disabled="loading || recapData.teachers.length === 0"
            class="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon icon="lucide:file-spreadsheet" class="w-5 h-5" />
            <span class="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Table View -->
    <div
      v-if="viewMode === 'table'"
      class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
    >
      <!-- Legends -->
      <div
        class="px-6 py-4 border-b border-slate-100 flex flex-wrap gap-6 text-xs"
      >
        <div class="flex items-center gap-2">
          <span
            class="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-200"
          ></span>
          <span class="text-slate-600">Hadir</span>
        </div>
        <div class="flex items-center gap-2">
          <span
            class="w-3 h-3 rounded-full bg-blue-100 border border-blue-200"
          ></span>
          <span class="text-slate-600">Izin</span>
        </div>
        <div class="flex items-center gap-2">
          <span
            class="w-3 h-3 rounded-full bg-amber-100 border border-amber-200"
          ></span>
          <span class="text-slate-600">Klaim (K)</span>
        </div>
        <div class="flex items-center gap-2">
          <span
            class="w-3 h-3 rounded-full bg-rose-50 border border-rose-100"
          ></span>
          <span class="text-slate-600">Libur Pekanan</span>
        </div>
      </div>

      <!-- Skeleton Loading -->
      <TableSkeleton
        v-if="loading"
        viewMode="table"
        :rows="8"
        :columnCount="10"
        class="p-4"
      />

      <!-- Table Wrapper -->
      <div v-else class="overflow-x-auto relative">
        <table class="w-full text-xs text-left whitespace-nowrap">
          <thead
            class="bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0 z-10"
          >
            <tr>
              <!-- Fixed Columns -->
              <th
                class="px-4 py-3 font-semibold sticky left-0 bg-slate-50 z-20 border-r border-slate-100 w-12"
              >
                No
              </th>
              <th
                class="px-4 py-3 font-semibold sticky left-12 bg-slate-50 z-20 border-r border-slate-100 w-48"
              >
                Nama Guru
              </th>
              <th
                class="px-4 py-3 font-semibold border-r border-slate-100 w-32"
              >
                NIP
              </th>
              <th
                class="px-4 py-3 font-semibold border-r border-slate-100 w-32"
              >
                Divisi
              </th>
              <th
                class="px-4 py-3 font-semibold border-r border-slate-100 w-24"
              >
                Gender
              </th>

              <!-- Date Columns -->
              <th
                v-for="date in dateRange"
                :key="date.iso"
                class="px-2 py-3 font-semibold text-center border-r border-slate-200 min-w-[50px]"
                :class="{ 'bg-rose-50 text-rose-600': isHoliday(date.obj) }"
              >
                <div class="flex flex-col items-center">
                  <span>{{ date.day }}</span>
                  <span class="text-[10px] font-normal uppercase">{{
                    date.dayName
                  }}</span>
                </div>
              </th>

              <!-- Summary Columns -->
              <th
                class="px-4 py-3 font-semibold text-center border-l border-slate-200 bg-slate-50"
              >
                Hari Aktif
              </th>
              <th class="px-4 py-3 font-semibold text-center">Jml Hadir</th>
              <th class="px-4 py-3 font-semibold text-center">Jml Jam</th>
              <th class="px-4 py-3 font-semibold text-center text-rose-600">
                Izin Potong
              </th>
              <th class="px-4 py-3 font-semibold text-center text-emerald-600">
                Izin Tdk Potong
              </th>
              <th class="px-4 py-3 font-semibold text-center text-purple-600">
                Cuti Potong
              </th>
              <th class="px-4 py-3 font-semibold text-center text-teal-600">
                Cuti Tdk Potong
              </th>
              <th
                class="px-4 py-3 font-semibold text-center bg-indigo-50 text-indigo-700"
              >
                Hari Dibayar
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="(teacher, idx) in recapData.teachers"
              :key="teacher.id"
              class="hover:bg-slate-50/50 transition-colors"
            >
              <!-- Fixed Info -->
              <td
                class="px-4 py-3 text-slate-500 sticky left-0 bg-white z-20 border-r border-slate-100"
              >
                {{ idx + 1 }}
              </td>
              <td
                class="px-4 py-3 font-medium text-slate-800 sticky left-12 bg-white z-20 border-r border-slate-100"
              >
                {{ teacher.name }}
              </td>
              <td class="px-4 py-3 text-slate-500 border-r border-slate-100">
                {{ teacher.nip || "-" }}
              </td>
              <td class="px-4 py-3 text-slate-500 border-r border-slate-100">
                {{ teacher.division || "-" }}
              </td>
              <td class="px-4 py-3 text-slate-500 border-r border-slate-100">
                {{ teacher.gender === 'male' ? 'L' : (teacher.gender === 'female' ? 'P' : '-') }}
              </td>

              <!-- Date Cells -->
              <td
                v-for="date in dateRange"
                :key="date.iso"
                class="px-1 py-2 text-center border-r border-slate-100 relative"
                :class="{ 'bg-rose-50/50': isHoliday(date.obj) }"
              >
                <template v-if="teacher.daily[date.iso]">
                  <!-- Present (Claim) -->
                  <div
                    v-if="
                      teacher.daily[date.iso].status === 'present' &&
                      teacher.daily[date.iso].isClaim
                    "
                    class="flex flex-col items-center justify-center gap-0.5"
                  >
                    <span
                      class="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold text-[10px] cursor-pointer hover:bg-amber-200 hover:scale-105 transition-all"
                      title="Klaim Kehadiran (Klik untuk hapus)"
                      @click.stop="handleKClick(teacher.daily[date.iso], teacher, date.iso)"
                      >K</span
                    >
                    <span
                      class="text-[10px] text-slate-500"
                      v-if="teacher.daily[date.iso].totalMinutes > 0"
                    >
                      {{
                        (teacher.daily[date.iso].totalMinutes / 60).toFixed(1)
                      }}h
                    </span>
                  </div>
                  <!-- Present (Normal) -->
                  <div
                    v-else-if="teacher.daily[date.iso].status === 'present'"
                    class="flex flex-col items-center justify-center gap-0.5"
                  >
                    <span
                      class="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px] cursor-pointer hover:bg-emerald-200 hover:scale-105 transition-all"
                      title="Hadir (Klik untuk hapus)"
                      @click.stop="handleHClick(teacher.daily[date.iso], teacher, date.iso)"
                      >H</span
                    >
                    <span
                      class="text-[10px] text-slate-500"
                      v-if="teacher.daily[date.iso].totalMinutes > 0"
                    >
                      {{
                        (teacher.daily[date.iso].totalMinutes / 60).toFixed(1)
                      }}h
                    </span>
                  </div>
                  <!-- Permitted (Potong) -->
                  <div
                    v-else-if="
                      ['permitted', 'permit_deduct', 'sick_deduct'].includes(
                        teacher.daily[date.iso].status
                      )
                    "
                  >
                    <span
                      class="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px] cursor-pointer hover:bg-rose-200 hover:scale-105 transition-all"
                      title="Izin Potong Gaji (Klik untuk ubah/hapus)"
                      @click.stop="
                        handlePermissionClick(
                          teacher.daily[date.iso],
                          teacher.id,
                          date.iso
                        )
                      "
                      >IP</span
                    >
                  </div>
                  <!-- Permitted (Tidak Potong) / Termasuk kehadiran -->
                  <div
                    v-else-if="
                      ['permit_no_deduct', 'sick_no_deduct'].includes(
                        teacher.daily[date.iso].status
                      )
                    "
                  >
                    <span
                      class="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px] cursor-pointer hover:bg-emerald-200 hover:scale-105 transition-all"
                      title="Izin Tanpa Potong (Klik untuk ubah/hapus)"
                      @click.stop="
                        handlePermissionClick(
                          teacher.daily[date.iso],
                          teacher.id,
                          date.iso
                        )
                      "
                      >IT</span
                    >
                  </div>
                  <!-- Leave (Potong) -->
                  <div
                    v-else-if="
                      ['leave_deduct'].includes(
                        teacher.daily[date.iso].status
                      )
                    "
                  >
                    <span
                      class="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-bold text-[10px] cursor-pointer hover:bg-purple-200 hover:scale-105 transition-all"
                      title="Cuti Potong Gaji (Klik untuk ubah/hapus)"
                      @click.stop="
                        handlePermissionClick(
                          teacher.daily[date.iso],
                          teacher.id,
                          date.iso
                        )
                      "
                      >CP</span
                    >
                  </div>
                  <!-- Leave (Tidak Potong) -->
                  <div
                    v-else-if="
                      ['leave_no_deduct'].includes(
                        teacher.daily[date.iso].status
                      )
                    "
                  >
                    <span
                      class="px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 font-bold text-[10px] cursor-pointer hover:bg-teal-200 hover:scale-105 transition-all"
                      title="Cuti Tanpa Potong (Klik untuk ubah/hapus)"
                      @click.stop="
                        handlePermissionClick(
                          teacher.daily[date.iso],
                          teacher.id,
                          date.iso
                        )
                      "
                      >CT</span
                    >
                  </div>
                  <!-- Sick (legacy/simple) -->
                  <div v-else-if="teacher.daily[date.iso].status === 'sick'">
                    <span
                      class="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold text-[10px] cursor-pointer hover:bg-amber-200 hover:scale-105 transition-all"
                      title="Sakit (Klik untuk ubah/hapus)"
                      @click.stop="
                        handlePermissionClick(
                          teacher.daily[date.iso],
                          teacher.id,
                          date.iso
                        )
                      "
                      >S</span
                    >
                  </div>
                  <!-- Other -->
                  <div v-else>
                    <span class="text-slate-300">-</span>
                  </div>
                </template>
                <span v-else class="text-slate-200">-</span>
              </td>

              <!-- Summaries -->
              <td
                class="px-4 py-3 text-center border-l font-medium text-slate-700 bg-slate-50/30"
              >
                {{ teacher.stats.activeDays }}
              </td>
              <td class="px-4 py-3 text-center font-bold text-emerald-600">
                {{ teacher.stats.presence }}
              </td>
              <td class="px-4 py-3 text-center font-medium text-slate-600">
                {{ teacher.stats.hours }}
              </td>
              <td class="px-4 py-3 text-center font-medium text-rose-600">
                {{ teacher.stats.permitDeduct || 0 }}
              </td>
              <td class="px-4 py-3 text-center font-medium text-emerald-600">
                {{ teacher.stats.permitNoDeduct || 0 }}
              </td>
              <td class="px-4 py-3 text-center font-medium text-purple-600">
                {{ teacher.stats.leaveDeduct || 0 }}
              </td>
              <td class="px-4 py-3 text-center font-medium text-teal-600">
                {{ teacher.stats.leaveNoDeduct || 0 }}
              </td>
              <td
                class="px-4 py-3 text-center font-bold text-indigo-700 bg-indigo-50/30"
              >
                {{
                  teacher.stats.presence + (teacher.stats.permitNoDeduct || 0) + (teacher.stats.leaveNoDeduct || 0)
                }}
              </td>
            </tr>
          </tbody>
        </table>

        <!-- No Data -->
        <div
          v-if="!loading && recapData.teachers.length === 0"
          class="p-12 text-center text-slate-400"
        >
          <Icon
            icon="lucide:clipboard-x"
            class="w-12 h-12 mx-auto mb-3 opacity-50"
          />
          <p>Tidak ada data absensi untuk periode ini.</p>
        </div>
      </div>
    </div>

    <!-- Card View -->
    <div
      v-else-if="viewMode === 'card'"
      :class="
        loading
          ? 'space-y-3'
          : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
      "
    >
      <!-- Skeleton Loading -->
      <TableSkeleton v-if="loading" viewMode="card" :rows="6" class="p-2" />

      <template v-else>
        <div
          v-if="recapData.teachers.length === 0"
          class="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400"
        >
          <Icon
            icon="lucide:clipboard-x"
            class="w-12 h-12 mx-auto mb-3 opacity-50"
          />
          <p>Tidak ada data absensi untuk periode ini.</p>
        </div>
        <div
          v-for="(teacher, idx) in recapData.teachers"
          :key="teacher.id"
          class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-shadow"
        >
          <div class="flex items-start justify-between gap-3 mb-3">
            <div>
              <div class="font-medium text-slate-800">{{ teacher.name }}</div>
              <div class="text-xs text-slate-400">
                {{ teacher.nip || "-" }} · {{ teacher.division || "-" }} · {{ teacher.gender === 'male' ? 'L' : (teacher.gender === 'female' ? 'P' : '-') }}
              </div>
            </div>
            <span class="text-xs text-slate-400">#{{ idx + 1 }}</span>
          </div>
          <div class="grid grid-cols-3 gap-3 text-center">
            <div class="bg-slate-50 rounded-lg p-2">
              <div class="text-lg font-bold text-slate-700">
                {{ teacher.stats.activeDays }}
              </div>
              <div class="text-xs text-slate-500">Hari Aktif</div>
            </div>
            <div class="bg-emerald-50 rounded-lg p-2">
              <div class="text-lg font-bold text-emerald-600">
                {{ teacher.stats.presence }}
              </div>
              <div class="text-xs text-emerald-600">Hadir</div>
            </div>
            <div class="bg-indigo-50 rounded-lg p-2">
              <div class="text-lg font-bold text-indigo-700">
                {{
                  teacher.stats.presence + (teacher.stats.permitNoDeduct || 0) + (teacher.stats.leaveNoDeduct || 0)
                }}
              </div>
              <div class="text-xs text-indigo-600">Hari Dibayar</div>
            </div>
          </div>
          <div class="grid grid-cols-5 gap-3 text-center mt-2">
            <div class="bg-slate-50 rounded-lg p-2">
              <div class="text-sm font-semibold text-slate-600">
                {{ teacher.stats.hours }}h
              </div>
              <div class="text-xs text-slate-500">Total Jam</div>
            </div>
            <div class="bg-rose-50 rounded-lg p-2">
              <div class="text-sm font-semibold text-rose-600">
                {{ teacher.stats.permitDeduct || 0 }}
              </div>
              <div class="text-[10px] text-rose-500">Izin Potong</div>
            </div>
            <div class="bg-emerald-50 rounded-lg p-2">
              <div class="text-sm font-semibold text-emerald-600">
                {{ teacher.stats.permitNoDeduct || 0 }}
              </div>
              <div class="text-[10px] text-emerald-500">Izin Tidak Potong</div>
            </div>
            <div class="bg-purple-50 rounded-lg p-2">
              <div class="text-sm font-semibold text-purple-600">
                {{ teacher.stats.leaveDeduct || 0 }}
              </div>
              <div class="text-[10px] text-purple-500">Cuti Potong</div>
            </div>
            <div class="bg-teal-50 rounded-lg p-2">
              <div class="text-sm font-semibold text-teal-600">
                {{ teacher.stats.leaveNoDeduct || 0 }}
              </div>
              <div class="text-[10px] text-teal-500">Cuti Tidak Potong</div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Loading State -->
    <div
      v-if="loading && recapData.teachers.length === 0"
      class="h-64 flex items-center justify-center"
    >
      <div class="flex flex-col items-center gap-3 text-slate-400">
        <Icon icon="lucide:loader-2" class="w-8 h-8 animate-spin" />
        <span class="text-sm">Memuat data rekap...</span>
      </div>
    </div>
    <!-- Modals -->
    <ConfirmModal
      :isOpen="confirmModal.isOpen"
      :title="confirmModal.title"
      confirmText="Hapus"
      cancelText="Batal"
      type="danger"
      @confirm="confirmDeleteClaim"
      @cancel="confirmModal.isOpen = false"
    >
      <div class="space-y-4">
        <!-- Details Section -->
        <div v-if="confirmModal.details" class="bg-slate-50 rounded-xl p-4 text-left border border-slate-100 space-y-2">
          <div class="flex justify-between items-start">
            <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Detail Kehadiran</span>
            <span class="text-[10px] font-medium px-2 py-0.5 rounded-full" :class="confirmModal.confirmAction === 'deleteClaim' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'">
              {{ confirmModal.confirmAction === 'deleteClaim' ? 'Klaim' : 'Hadir' }}
            </span>
          </div>
          
          <div class="grid grid-cols-[80px_1fr] gap-x-2 gap-y-1 text-sm">
            <div class="text-slate-400">Nama</div>
            <div class="text-slate-700 font-medium">{{ confirmModal.details.name }}</div>
            
            <div class="text-slate-400">Tanggal</div>
            <div class="text-slate-700">{{ confirmModal.details.date }}</div>
            
            <div class="text-slate-400" v-if="confirmModal.details.sessions?.length">Waktu & Kegiatan</div>
            <div class="text-slate-700 space-y-1.5" v-if="confirmModal.details.sessions?.length">
              <div v-for="(s, i) in confirmModal.details.sessions" :key="i" class="flex items-center gap-2">
                <span v-if="s.time" class="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-mono whitespace-nowrap">
                  {{ s.time }}
                </span>
                <span v-if="s.activity" class="px-1.5 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded text-[11px] font-medium truncate">
                  {{ s.activity }}
                </span>
              </div>
            </div>
          </div>

          <div v-if="confirmModal.details.notes" class="mt-2 pt-2 border-t border-slate-200/50">
            <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Catatan:</div>
            <div class="text-xs text-slate-600 italic">"{{ confirmModal.details.notes }}"</div>
          </div>
        </div>

        <p class="text-sm text-slate-500 leading-relaxed">{{ confirmModal.message }}</p>
      </div>
    </ConfirmModal>

    <StatusModal
      :isOpen="statusModal.isOpen"
      :type="statusModal.type"
      :title="statusModal.title"
      :message="statusModal.message"
      @close="statusModal.isOpen = false"
    />

    <!-- Permission Action Modal -->
    <div
      v-if="permissionActionModal.isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      @click="permissionActionModal.isOpen = false"
    >
      <div
        class="bg-white rounded-xl shadow-xl w-full max-w-sm border border-slate-200 p-6 space-y-4"
        @click.stop
      >
        <div class="text-center">
          <div
            class="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3"
          >
            <Icon icon="solar:pen-new-square-bold-duotone" class="w-6 h-6" />
          </div>
          <h3 class="font-bold text-slate-800 text-lg">Kelola Izin</h3>
          <p class="text-sm text-slate-500 mt-1">
            Pilih tindakan untuk izin tanggal
            {{ formatDate(permissionActionModal.date) }}
          </p>
        </div>

        <div class="grid grid-cols-1 gap-3">
          <!-- Toggle Button -->
          <button
            @click="togglePermissionType"
            class="flex items-center justify-center gap-2 w-full p-3 rounded-lg border-2 border-dashed transition-all"
            :class="
              isDeduct(permissionActionModal.status)
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300'
                : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300'
            "
          >
            <Icon
              :icon="
                isDeduct(permissionActionModal.status)
                  ? 'solar:shield-check-bold'
                  : 'solar:shield-warning-bold'
              "
              class="w-5 h-5"
            />
            <div class="text-left">
              <div class="font-bold text-sm">
                {{
                  isDeduct(permissionActionModal.status)
                    ? "Ubah ke Tidak Potong"
                    : "Ubah ke Potong Gaji"
                }}
              </div>
              <div class="text-[10px] opacity-80">
                {{
                  isDeduct(permissionActionModal.status)
                    ? (permissionActionModal.status.includes("leave") ? "Ubah menjadi CT (Cuti Tidak Potong)" : "Ubah menjadi IT (Izin Tidak Potong)")
                    : (permissionActionModal.status.includes("leave") ? "Ubah menjadi CP (Cuti Potong)" : "Ubah menjadi IP (Izin Potong)")
                }}
              </div>
            </div>
          </button>

          <!-- Delete Button -->
          <button
            @click="deletePermission"
            class="flex items-center justify-center gap-2 w-full p-3 rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 transition-colors"
          >
            <Icon icon="solar:trash-bin-trash-bold" class="w-5 h-5" />
            <span class="font-medium text-sm">Hapus Izin</span>
          </button>
        </div>

        <button
          @click="permissionActionModal.isOpen = false"
          class="w-full py-2 text-slate-500 hover:text-slate-700 text-sm font-medium"
        >
          Batal
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed } from "vue";
import { Icon } from "@iconify/vue";
import {
  attendanceApi,
  settingsApi,
  divisionsApi,
  permissionsApi,
} from "@/services/api";
import ExcelJS from "exceljs/dist/exceljs.min.js";
import { saveAs } from "file-saver";
import TableSkeleton from "@/components/ui/TableSkeleton.vue";
import StatusModal from "@/components/ui/StatusModal.vue";
import ConfirmModal from "@/components/ui/ConfirmModal.vue";

// Responsive default: card for mobile (<768px), table for desktop
const isDesktop = window.matchMedia("(min-width: 768px)").matches;
const viewMode = ref(isDesktop ? "table" : "card");

// Constants
const months = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
const years = computed(() => {
  const current = new Date().getFullYear();
  return [current - 1, current, current + 1];
});

// State
const filter = reactive({
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  startDate: "",
  endDate: "",
  divisionId: "",
  gender: "",
  useCustomRange: false,
});
const loading = ref(true);
const recapData = reactive({
  period: { start: "", end: "" },
  teachers: [],
});
const holidays = ref([0]); // Default Sunday
const divisions = ref([]);

// Modals
const confirmModal = reactive({
  isOpen: false,
  title: "",
  message: "",
  note: "",
  item: null,
  details: null,
});
const statusModal = reactive({
  isOpen: false,
  type: "success",
  title: "",
  message: "",
});
const permissionActionModal = reactive({
  isOpen: false,
  teacherId: null,
  date: null,
  status: null,
});

// Computed Date Range for Headers
const dateRange = computed(() => {
  if (!recapData.period.start || !recapData.period.end) return [];

  const dates = [];
  let curr = new Date(recapData.period.start);
  const end = new Date(recapData.period.end);
  const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  while (curr <= end) {
    dates.push({
      iso: curr.toISOString().split("T")[0],
      day: curr.getDate(),
      dayName: dayNames[curr.getDay()],
      obj: new Date(curr),
    });
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
});

const activePeriodText = computed(() => {
  if (recapData.period.start && recapData.period.end) {
    // Format: 26 November 2025 - 25 Desember 2025
    // Use specific simple format to save space
    const start = new Date(recapData.period.start).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const end = new Date(recapData.period.end).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return `${start} - ${end}`;
  }
  return "";
});

function isHoliday(dateObj) {
  return holidays.value.includes(dateObj.getDay());
}

// Fetch Data
async function fetchRecap() {
  loading.value = true;
  try {
    // 1. Fetch Holidays Setting
    try {
      const sRes = await settingsApi.getAll(["attendance_holidays"]);
      if (sRes.data.attendance_holidays) {
        holidays.value = JSON.parse(sRes.data.attendance_holidays);
      }
    } catch (e) {
      /* ignore */
    }

    // 2. Fetch Recap
    const params = {};
    if (filter.useCustomRange && filter.startDate && filter.endDate) {
      params.startDate = filter.startDate;
      params.endDate = filter.endDate;
    } else {
      params.month = filter.month;
      params.year = filter.year;
    }

    if (filter.divisionId) {
      params.divisionId = filter.divisionId;
    }

    if (filter.gender) {
      params.gender = filter.gender;
    }

    const res = await attendanceApi.getRecap(params);

    if (res.success) {
      recapData.period = res.data.period;
      recapData.teachers = res.data.teachers;
    }
  } catch (e) {
    console.error("Failed recap", e);
  } finally {
    loading.value = false;
  }
}

async function fetchDivisions() {
  try {
    const res = await divisionsApi.getAll();
    if (res.success) {
      divisions.value = res.data;
    }
  } catch (e) {
    console.error("Failed to fetch divisions", e);
  }
}

async function exportToExcel() {
  if (!recapData.teachers.length) return;

  try {
    // Fetch institution settings for headers
    let institutionName = "PONDOK PESANTREN MINHAJUL HAQ";
    let regencyName = "Subang";
    try {
      const instRes = await settingsApi.getAll(["institution_name", "institution_regency"]);
      if (instRes && (instRes.data || instRes.value)) {
        const dataObj = instRes.data || instRes.value;
        if (dataObj.institution_name) institutionName = dataObj.institution_name;
        if (dataObj.institution_regency) {
          try {
            const regObj = JSON.parse(dataObj.institution_regency);
            regencyName = regObj?.name || dataObj.institution_regency;
          } catch {
            regencyName = dataObj.institution_regency;
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch institution settings", e);
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Rekap Absensi");
    sheet.views = [{ showGridLines: true }]; // Enable default grid lines!

    const startCol = 2; // Column B
    const endCol = 6 + dateRange.value.length + 7; // Last Column (AQ)
    const sumStartIndex = 7 + dateRange.value.length; // Hadir Column (AK)

    // Title Row 1: REKAP KEHADIRAN PEGAWAI
    sheet.mergeCells(1, startCol, 1, endCol);
    const titleCell1 = sheet.getCell(1, startCol);
    titleCell1.value = "REKAP KEHADIRAN PEGAWAI";
    titleCell1.font = { bold: true, size: 14, name: "Calibri" };
    titleCell1.alignment = { horizontal: "center", vertical: "middle" };

    // Title Row 2: NAMA LEMBAGA
    sheet.mergeCells(2, startCol, 2, endCol);
    const titleCell2 = sheet.getCell(2, startCol);
    titleCell2.value = institutionName.toUpperCase();
    titleCell2.font = { bold: true, size: 12, name: "Calibri" };
    titleCell2.alignment = { horizontal: "center", vertical: "middle" };

    // Title Row 3: Divisi & Gender
    sheet.mergeCells(3, startCol, 3, endCol);
    const titleCell3 = sheet.getCell(3, startCol);
    const divisionName = filter.divisionId
      ? (divisions.value.find((d) => String(d.id) === String(filter.divisionId))?.name || "Semua Divisi")
      : "Semua Divisi";
    const genderName = filter.gender === "male" ? "Ikhwan" : (filter.gender === "female" ? "Akhwat" : "Semua Gender");
    titleCell3.value = `Divisi: ${divisionName}     Gender: ${genderName}`;
    titleCell3.font = { size: 10, name: "Calibri" };
    titleCell3.alignment = { horizontal: "center", vertical: "middle" };

    // Title Row 4: Periode
    sheet.mergeCells(4, startCol, 4, endCol);
    const titleCell4 = sheet.getCell(4, startCol);
    titleCell4.value = `Periode: ${activePeriodText.value}`;
    titleCell4.font = { size: 10, name: "Calibri" };
    titleCell4.alignment = { horizontal: "center", vertical: "middle" };

    // Set row heights
    sheet.getRow(1).height = 20;
    sheet.getRow(2).height = 18;
    sheet.getRow(3).height = 16;
    sheet.getRow(4).height = 16;
    sheet.getRow(5).height = 10; // Empty spacer

    // Set column widths manually
    sheet.getColumn(1).width = 3; // Column A empty padding
    sheet.getColumn(2).width = 5; // No
    sheet.getColumn(3).width = 25; // Nama Guru
    sheet.getColumn(4).width = 15; // NIP
    sheet.getColumn(5).width = 15; // Divisi
    sheet.getColumn(6).width = 8; // Gender

    // Date columns widths
    for (let i = 0; i < dateRange.value.length; i++) {
      sheet.getColumn(7 + i).width = 4.5;
    }

    // Summary columns widths
    sheet.getColumn(sumStartIndex).width = 8; // Hadir
    sheet.getColumn(sumStartIndex + 1).width = 8; // Jam
    sheet.getColumn(sumStartIndex + 2).width = 12; // Izin Potong
    sheet.getColumn(sumStartIndex + 3).width = 16; // Izin Tanpa Potong
    sheet.getColumn(sumStartIndex + 4).width = 12; // Cuti Potong
    sheet.getColumn(sumStartIndex + 5).width = 16; // Cuti Tidak Potong
    sheet.getColumn(sumStartIndex + 6).width = 12; // Hari Dibayar

    // Define clear cell borders
    const borderStyle = {
      top: { style: "thin", color: { argb: "FF7F7F7F" } }, // Clearly visible gray borders
      left: { style: "thin", color: { argb: "FF7F7F7F" } },
      bottom: { style: "thin", color: { argb: "FF7F7F7F" } },
      right: { style: "thin", color: { argb: "FF7F7F7F" } },
    };

    // Write headers in Row 6
    const headerRow = sheet.getRow(6);
    headerRow.height = 25;

    const headers = [
      { col: 2, label: "No" },
      { col: 3, label: "Nama Guru" },
      { col: 4, label: "NIP" },
      { col: 5, label: "Divisi" },
      { col: 6, label: "Gender" },
    ];

    dateRange.value.forEach((d, idx) => {
      headers.push({ col: 7 + idx, label: String(d.day) });
    });

    headers.push({ col: sumStartIndex, label: "Hadir" });
    headers.push({ col: sumStartIndex + 1, label: "Jam" });
    headers.push({ col: sumStartIndex + 2, label: "Izin Potong" });
    headers.push({ col: sumStartIndex + 3, label: "Izin Tanpa Potong" });
    headers.push({ col: sumStartIndex + 4, label: "Cuti Potong" });
    headers.push({ col: sumStartIndex + 5, label: "Cuti Tidak Potong" });
    headers.push({ col: sumStartIndex + 6, label: "Hari Dibayar" });

    headers.forEach((h) => {
      const cell = headerRow.getCell(h.col);
      cell.value = h.label;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9, name: "Calibri" };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF305496" }, // Classic medium blue
      };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = borderStyle;
    });

    // Write Data Rows
    recapData.teachers.forEach((t, index) => {
      const rowIndex = 7 + index;
      const row = sheet.getRow(rowIndex);
      row.height = 20;

      // Basic fields
      row.getCell(2).value = index + 1; // No
      row.getCell(2).alignment = { horizontal: "center", vertical: "middle" };

      row.getCell(3).value = t.name;
      row.getCell(3).alignment = { horizontal: "left", vertical: "middle" };

      row.getCell(4).value = t.nip || "-";
      row.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(4).numFmt = "@"; // Text format

      row.getCell(5).value = t.division || "-";
      row.getCell(5).alignment = { horizontal: "center", vertical: "middle" };

      row.getCell(6).value = t.gender === "male" ? "L" : (t.gender === "female" ? "P" : "-");
      row.getCell(6).alignment = { horizontal: "center", vertical: "middle" };

      // Date cells
      dateRange.value.forEach((d, idx) => {
        const colIndex = 7 + idx;
        const cell = row.getCell(colIndex);
        const dayData = t.daily[d.iso];

        let val = "";
        if (dayData) {
          if (dayData.status === "present" && dayData.isClaim) {
            val = "K";
          } else if (dayData.status === "present") {
            val = "H";
          } else if (["permitted", "permit_deduct", "sick_deduct"].includes(dayData.status)) {
            val = "IP";
          } else if (["permit_no_deduct", "sick_no_deduct"].includes(dayData.status)) {
            val = "IT";
          } else if (dayData.status === "sick") {
            val = "S";
          } else if (dayData.status === "leave_deduct") {
            val = "CP";
          } else if (dayData.status === "leave_no_deduct") {
            val = "CT";
          }
        }
        cell.value = val;
        cell.alignment = { horizontal: "center", vertical: "middle" };

        // Color cell styles
        if (val === "H") {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFC6EFCE" }, // Light green
          };
          cell.font = { color: { argb: "FF006100" }, bold: true, name: "Calibri", size: 9 };
        } else if (val === "K") {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE2E8F0" }, // Light gray
          };
          cell.font = { color: { argb: "FF334155" }, bold: true, name: "Calibri", size: 9 };
        } else if (val === "IP") {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFC7CE" }, // Light red
          };
          cell.font = { color: { argb: "FF9C0006" }, bold: true, name: "Calibri", size: 9 };
        } else if (val === "IT") {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFC6EFCE" }, // Light green (matches present / H)
          };
          cell.font = { color: { argb: "FF006100" }, bold: true, name: "Calibri", size: 9 };
        } else if (val === "S") {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFEB9C" }, // Light yellow
          };
          cell.font = { color: { argb: "FF9C6500" }, bold: true, name: "Calibri", size: 9 };
        } else if (val === "CP") {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF3E8FF" }, // Light purple
          };
          cell.font = { color: { argb: "FF7E22CE" }, bold: true, name: "Calibri", size: 9 };
        } else if (val === "CT") {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFCCFBF1" }, // Light teal
          };
          cell.font = { color: { argb: "FF0F766E" }, bold: true, name: "Calibri", size: 9 };
        }

        // Shading for holidays
        const dObj = d.obj;
        if (isHoliday(dObj)) {
          if (!val) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFFFF1F2" }, // Light pink for empty cells on holidays
            };
          }
        }
      });

      // Summary fields
      const presenceCell = row.getCell(sumStartIndex);
      presenceCell.value = t.stats.presence;
      presenceCell.alignment = { horizontal: "center", vertical: "middle" };

      const hoursCell = row.getCell(sumStartIndex + 1);
      hoursCell.value = parseFloat(t.stats.hours.toFixed(2));
      hoursCell.alignment = { horizontal: "center", vertical: "middle" };
      hoursCell.numFmt = "0.00";

      const permitDeductCell = row.getCell(sumStartIndex + 2);
      permitDeductCell.value = t.stats.permitDeduct || 0;
      permitDeductCell.alignment = { horizontal: "center", vertical: "middle" };

      const permitNoDeductCell = row.getCell(sumStartIndex + 3);
      permitNoDeductCell.value = t.stats.permitNoDeduct || 0;
      permitNoDeductCell.alignment = { horizontal: "center", vertical: "middle" };

      const leaveDeductCell = row.getCell(sumStartIndex + 4);
      leaveDeductCell.value = t.stats.leaveDeduct || 0;
      leaveDeductCell.alignment = { horizontal: "center", vertical: "middle" };

      const leaveNoDeductCell = row.getCell(sumStartIndex + 5);
      leaveNoDeductCell.value = t.stats.leaveNoDeduct || 0;
      leaveNoDeductCell.alignment = { horizontal: "center", vertical: "middle" };

      const paidDaysCell = row.getCell(sumStartIndex + 6);
      paidDaysCell.value = t.stats.presence + (t.stats.permitNoDeduct || 0) + (t.stats.leaveNoDeduct || 0);
      paidDaysCell.alignment = { horizontal: "center", vertical: "middle" };

      // Set borders for all cells in row (columns B to AQ)
      for (let c = 2; c <= endCol; c++) {
        row.getCell(c).border = borderStyle;
        row.getCell(c).font = { name: "Calibri", size: 9 };
      }
    });

    // Write signature section
    const startSigRow = 7 + recapData.teachers.length + 2;

    const today = new Date();
    const formattedToday = today.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const locationText = regencyName ? `${regencyName}, ${formattedToday}` : formattedToday;

    const sigColStart = sumStartIndex; // Column AK
    const sigColEnd = sumStartIndex + 6; // Column AQ

    // Location & Date
    sheet.mergeCells(startSigRow, sigColStart, startSigRow, sigColEnd);
    const sigCell1 = sheet.getCell(startSigRow, sigColStart);
    sigCell1.value = locationText;
    sigCell1.font = { name: "Calibri", size: 10, bold: false };
    sigCell1.alignment = { horizontal: "center", vertical: "middle" };

    // Role
    sheet.mergeCells(startSigRow + 1, sigColStart, startSigRow + 1, sigColEnd);
    const sigCell2 = sheet.getCell(startSigRow + 1, sigColStart);
    sigCell2.value = "Kepala Bidang SDM";
    sigCell2.font = { name: "Calibri", size: 10, bold: true };
    sigCell2.alignment = { horizontal: "center", vertical: "middle" };

    // Signature line
    sheet.mergeCells(startSigRow + 6, sigColStart, startSigRow + 6, sigColEnd);
    const sigCell3 = sheet.getCell(startSigRow + 6, sigColStart);
    sigCell3.value = "........................................................";
    sigCell3.font = { name: "Calibri", size: 10, bold: false };
    sigCell3.alignment = { horizontal: "center", vertical: "middle" };

    const buf = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, "rekap-absensi.xlsx");
  } catch (error) {
    console.error("Export Error:", error);
    alert("Gagal export excel: " + error.message);
  }
}

// === Delete Claim Logic ===
// Actions
function handleKClick(item, teacher, date) {
  confirmModal.title = "Hapus Klaim Kehadiran";
  confirmModal.message =
    "Apakah Anda yakin ingin menghapus data klaim kehadiran ini? Tindakan ini tidak dapat dibatalkan.";
  confirmModal.item = item;
  confirmModal.details = {
    name: teacher.name,
    date: formatDate(date),
    sessions: item.sessions || [],
    notes: item.notes,
  };
  confirmModal.confirmAction = "deleteClaim"; // Tag action
  confirmModal.isOpen = true;
}

function handleHClick(item, teacher, date) {
  confirmModal.title = "Hapus Kehadiran";
  confirmModal.message =
    "Apakah Anda yakin ingin menghapus data kehadiran (H) ini? Tindakan ini tidak dapat dibatalkan.";
  confirmModal.item = item;
  confirmModal.details = {
    name: teacher.name,
    date: formatDate(date),
    sessions: item.sessions || [],
    notes: item.notes,
  };
  confirmModal.confirmAction = "deleteAttendance"; // Tag action
  confirmModal.isOpen = true;
}

function handlePermissionClick(item, teacherId, dateIso) {
  permissionActionModal.teacherId = teacherId;
  permissionActionModal.date = dateIso;
  permissionActionModal.status = item.status;
  permissionActionModal.isOpen = true;
}

function isDeduct(status) {
  return ["permit_deduct", "sick_deduct", "leave_deduct", "permitted", "sick", "leave"].includes(status);
}

function formatDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Permission Actions
async function togglePermissionType() {
  permissionActionModal.isOpen = false;
  loading.value = true;
  try {
    const res = await permissionsApi.manageByDate(
      "toggle",
      permissionActionModal.teacherId,
      permissionActionModal.date
    );

    if (res.success) {
      statusModal.type = "success";
      statusModal.title = "Berhasil Diubah";
      statusModal.message = "Tipe izin berhasil diperbarui.";
      statusModal.isOpen = true;
      fetchRecap(); // Refresh
    }
  } catch (e) {
    statusModal.type = "error";
    statusModal.title = "Gagal Mengubah";
    statusModal.message = e.message || "Terjadi kesalahan saat mengubah izin.";
    statusModal.isOpen = true;
  } finally {
    loading.value = false;
  }
}

async function deletePermission() {
  permissionActionModal.isOpen = false;

  // Double confirm for delete
  confirmModal.title = "Hapus Izin";
  confirmModal.message =
    "Apakah Anda yakin ingin menghapus izin ini? Data pengajuan dan absensi terkait akan dihapus permanen.";
  confirmModal.note = ""; // Reset note
  confirmModal.item = {
    teacherId: permissionActionModal.teacherId,
    date: permissionActionModal.date,
  };
  confirmModal.confirmAction = "deletePermission";
  confirmModal.isOpen = true;
}

// Confirm Modal Actions Router
async function confirmDeleteClaim() {
  confirmModal.isOpen = false;
  loading.value = true;

  try {
    let res;
    if (confirmModal.confirmAction === "deleteClaim") {
      // Logic for deleting K (Claim) - uses attendance ID directly
      // Assuming item has attendanceId or id
      const id = confirmModal.item.attendanceId || confirmModal.item.id;
      if (!id) throw new Error("ID not found");
      res = await attendanceApi.deleteTeacherAttendance(id);
    } else if (confirmModal.confirmAction === "deleteAttendance") {
      // Logic for deleting H (Presence) - uses attendance ID directly
      const id = confirmModal.item.attendanceId || confirmModal.item.id;
      if (!id) throw new Error("ID not found");
      res = await attendanceApi.deleteTeacherAttendance(id);
    } else if (confirmModal.confirmAction === "deletePermission") {
      // Logic for deleting Permission via manage-by-date
      res = await permissionsApi.manageByDate(
        "delete",
        confirmModal.item.teacherId,
        confirmModal.item.date
      );
    }

    if (res && res.success) {
      statusModal.type = "success";
      statusModal.title = "Berhasil Dihapus";
      statusModal.message = res.message || "Data berhasil dihapus.";
      statusModal.isOpen = true;
      fetchRecap();
    }
  } catch (e) {
    console.error(e);
    statusModal.type = "error";
    statusModal.title = "Gagal Menghapus";
    statusModal.message = e.message || "Terjadi kesalahan saat menghapus data.";
    statusModal.isOpen = true;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchDivisions();
  fetchRecap();
});
</script>

<style scoped>
/* Custom scrollbar for table */
.overflow-x-auto::-webkit-scrollbar {
  height: 8px;
}
.overflow-x-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
}
.overflow-x-auto::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 4px;
}
</style>
