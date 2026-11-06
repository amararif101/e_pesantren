<template>
  <div class="p-2 md:p-6 space-y-6">
    <!-- Header -->
    <div
      class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-2 md:px-0"
    >
      <div v-if="!inputMode">
        <h1 class="text-xl font-bold text-slate-800">
          Perizinan & Monitoring Pulang Santri
        </h1>
        <p class="text-sm text-slate-500">
          Kelola pengajuan izin dari Dashboard Orang Tua, cetak Surat Izin A4 ber-QR Code,
          dan scan keluar-masuk santri.
        </p>
      </div>
      <div v-else></div>

      <div class="flex flex-wrap gap-2">
        <button
          v-if="!inputMode"
          @click="openKopSettingsModal"
          class="px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 shadow-xs"
          title="Pengaturan Kop Surat Izin Santri"
        >
          <Icon icon="solar:gallery-edit-bold-duotone" class="w-5 h-5 text-[#602515]" />
          <span class="hidden sm:inline">Kop Surat</span>
        </button>

        <button
          v-if="!inputMode"
          @click="switchTab('scanner')"
          class="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-md shadow-amber-500/20"
        >
          <Icon icon="solar:qr-code-bold-duotone" class="w-5 h-5" />
          Scan QR Surat Izin
        </button>

        <button
          @click="toggleInputMode"
          class="px-4 py-2.5 rounded-xl bg-[#602515] text-white text-xs sm:text-sm font-bold hover:bg-[#8c3d2a] transition flex items-center gap-2 shadow-lg shadow-[#602515]/20"
        >
          <Icon
            :icon="inputMode ? 'solar:list-bold' : 'solar:pen-new-square-bold'"
            class="w-4 h-4"
          />
          {{ inputMode ? "Lihat Daftar & Monitoring" : "Input Izin Manual / Kolektif" }}
        </button>
      </div>
    </div>

    <!-- Summary Cards (Hidden when in Input Form mode) -->
    <div
      v-if="!inputMode"
      class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
    >
      <div
        @click="switchTab('pending')"
        class="bg-white rounded-2xl p-4 border border-amber-200/80 shadow-xs hover:shadow-md transition cursor-pointer flex items-center gap-3.5"
      >
        <div
          class="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0"
        >
          <Icon icon="solar:inbox-in-bold-duotone" class="w-6 h-6" />
        </div>
        <div>
          <div class="text-2xl font-extrabold text-slate-800">
            {{ stats.pendingCount }}
          </div>
          <div class="text-xs font-bold text-amber-700">
            Menunggu Persetujuan
          </div>
          <div class="text-[11px] text-slate-400">Pengajuan dari Ortu</div>
        </div>
      </div>

      <div
        @click="
          activeTab = 'all';
          filters.status = 'approved';
        "
        class="bg-white rounded-2xl p-4 border border-blue-200/80 shadow-xs hover:shadow-md transition cursor-pointer flex items-center gap-3.5"
      >
        <div
          class="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0"
        >
          <Icon icon="solar:qr-code-bold-duotone" class="w-6 h-6" />
        </div>
        <div>
          <div class="text-2xl font-extrabold text-slate-800">
            {{ stats.approvedCount }}
          </div>
          <div class="text-xs font-bold text-blue-700">Siap Scan Keluar</div>
          <div class="text-[11px] text-slate-400">Surat QR sudah terbit</div>
        </div>
      </div>

      <div
        @click="switchTab('monitoring')"
        class="bg-white rounded-2xl p-4 border border-indigo-200/80 shadow-xs hover:shadow-md transition cursor-pointer flex items-center gap-3.5"
      >
        <div
          class="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0"
        >
          <Icon icon="solar:walking-round-bold-duotone" class="w-6 h-6" />
        </div>
        <div>
          <div class="text-2xl font-extrabold text-slate-800">
            {{ stats.checkedOutCount }}
          </div>
          <div class="text-xs font-bold text-indigo-700">
            Sedang di Luar Pondok
          </div>
          <div class="text-[11px] text-slate-400">Belum scan kembali</div>
        </div>
      </div>

      <div
        @click="switchTab('monitoring')"
        class="bg-white rounded-2xl p-4 border border-red-200/80 shadow-xs hover:shadow-md transition cursor-pointer flex items-center gap-3.5"
      >
        <div
          class="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0"
        >
          <Icon icon="solar:alarm-bold-duotone" class="w-6 h-6" />
        </div>
        <div>
          <div class="text-2xl font-extrabold text-red-600">
            {{ stats.overdueActiveCount }}
          </div>
          <div class="text-xs font-bold text-red-600">
            Melebihi Batas Waktu
          </div>
          <div class="text-[11px] text-slate-400">
            {{ stats.returnedLateCount }} riwayat kembali telat
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content When Not In Input Form Mode -->
    <div v-if="!inputMode" class="space-y-4">
      <!-- Navigation Tabs -->
      <div
        class="flex overflow-x-auto bg-white rounded-2xl p-1.5 border border-slate-200 shadow-xs gap-1"
      >
        <button
          v-for="tab in navTabs"
          :key="tab.id"
          @click="switchTab(tab.id)"
          :class="
            activeTab === tab.id
              ? 'bg-[#602515] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          "
          class="px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all"
        >
          <Icon :icon="tab.icon" class="w-4 h-4" />
          <span>{{ tab.label }}</span>
          <span
            v-if="tab.badge > 0"
            :class="
              activeTab === tab.id
                ? 'bg-white text-[#602515]'
                : tab.badgeDanger
                ? 'bg-red-600 text-white'
                : 'bg-amber-500 text-white'
            "
            class="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold leading-none"
          >
            {{ tab.badge }}
          </span>
        </button>
      </div>

      <!-- ==================== TAB 1: SEMUA RIWAYAT & SURAT IZIN ==================== -->
      <div
        v-if="activeTab === 'all'"
        class="bg-white rounded-2xl shadow-xs border p-2"
      >
        <!-- Quick Status Pills -->
        <div class="flex flex-wrap items-center gap-1.5 px-3 pt-2 pb-1">
          <button
            v-for="st in statusFilterOptions"
            :key="st.value"
            @click="filters.status = st.value"
            :class="
              filters.status === st.value
                ? 'bg-[#602515] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            "
            class="px-3 py-1 rounded-lg text-xs font-bold transition"
          >
            {{ st.label }}
          </button>
        </div>

        <DataTable
          :items="paginatedLeaves"
          :columns="columns"
          :loading="loading"
          :search="search"
          :pagination="pagination"
          :viewMode="viewMode"
          searchPlaceholder="Cari nama santri, NIS, kode QR, atau alasan..."
          show-index
          with-filter
          :filterable="true"
          filterButtonLabel="Filter Tanggal"
          @update:search="search = $event"
          @update:limit="pageSize = $event"
          @page-change="currentPage = $event"
          @update:viewMode="viewMode = $event"
        >
          <!-- Custom Date Filter -->
          <template #filters>
            <div class="p-2">
              <h3
                class="font-semibold text-slate-800 mb-3 border-b pb-2 text-sm"
              >
                Filter Rentang Tanggal
              </h3>
              <div class="space-y-3">
                <div>
                  <label
                    class="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider"
                    >Dari Tanggal</label
                  >
                  <input
                    type="date"
                    v-model="filters.startDate"
                    @change="fetchData"
                    class="w-full border rounded-lg px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label
                    class="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider"
                    >Sampai Tanggal</label
                  >
                  <input
                    type="date"
                    v-model="filters.endDate"
                    @change="fetchData"
                    class="w-full border rounded-lg px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>
              <button
                @click="resetFilters"
                class="mt-4 w-full py-2 text-xs font-bold text-slate-500 hover:text-[#602515] transition-colors border border-dashed rounded-lg"
              >
                Reset Filter
              </button>
            </div>
          </template>

          <!-- Students & QR Column -->
          <template #cell-students="{ item }">
            <div class="space-y-1 max-w-xs">
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="subItem in item.items"
                  :key="subItem.id"
                  class="px-2 py-0.5 bg-slate-100 text-slate-800 rounded text-xs font-bold"
                >
                  {{ subItem.student?.fullName }}
                  <span
                    v-if="subItem.student?.className"
                    class="text-[10px] text-slate-500 font-normal"
                  >
                    ({{ subItem.student.className }})
                  </span>
                </span>
              </div>
              <div class="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                <span v-if="item.qrToken">{{ item.qrToken }}</span>
                <span
                  v-if="item.requestedByRole === 'parent'"
                  class="px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 font-sans font-semibold text-[10px]"
                >
                  Via Dashboard Ortu
                </span>
              </div>
            </div>
          </template>

          <!-- Schedule & Actual Scan Column -->
          <template #cell-dates="{ item }">
            <div class="text-xs space-y-0.5">
              <div class="font-bold text-slate-700">
                {{ formatDate(item.startDate) }} ({{ item.startTime || "08:00" }})
              </div>
              <div class="text-red-700 font-semibold">
                Batas: {{ formatDate(item.endDate) }} ({{ item.endTime || "17:00" }})
              </div>
              <div
                v-if="item.checkedOutAt"
                class="text-[11px] text-indigo-600"
              >
                Keluar: {{ formatDateTime(item.checkedOutAt) }}
              </div>
              <div
                v-if="item.checkedInAt"
                class="text-[11px]"
                :class="
                  item.status === 'returned_late'
                    ? 'text-red-600 font-bold'
                    : 'text-emerald-600'
                "
              >
                Kembali: {{ formatDateTime(item.checkedInAt) }}
              </div>
            </div>
          </template>

          <!-- Category & Reason Column -->
          <template #cell-reason="{ item }">
            <div class="max-w-xs space-y-1">
              <div class="flex items-center gap-1.5">
                <span
                  class="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                  :class="
                    item.type === 'sick'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-100 text-blue-700'
                  "
                >
                  {{ getCategoryLabel(item) }}
                </span>
                <span
                  v-if="item.pickupName"
                  class="text-[11px] text-slate-500 truncate"
                >
                  • Penjemput: {{ item.pickupName }}
                </span>
              </div>
              <div class="text-xs text-slate-700 line-clamp-2" :title="item.reason">
                {{ item.reason }}
              </div>
            </div>
          </template>

          <!-- Status Column -->
          <template #cell-status="{ item }">
            <div class="space-y-1">
              <span
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
                :class="getStatusBadge(item).class"
              >
                <Icon :icon="getStatusBadge(item).icon" class="w-3.5 h-3.5" />
                {{ getStatusBadge(item).label }}
              </span>
              <div
                v-if="item.isOverdue || item.status === 'returned_late'"
                class="text-[11px] font-bold text-red-600"
              >
                Telat: {{ item.overdueDurationText }}
                <span v-if="item.punishment">
                  ({{ item.punishment.points }} poin)
                </span>
                <span v-else-if="item.lateHandling === 'excused'">
                  (Uzur)
                </span>
              </div>
            </div>
          </template>

          <!-- Actions Column -->
          <template #cell-actions="{ item }">
            <div class="flex items-center justify-end gap-1 flex-wrap">
              <!-- Approve / Reject if Pending -->
              <template v-if="item.status === 'pending'">
                <button
                  @click="openApproveModal(item)"
                  class="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition"
                  title="Setujui & Terbitkan Surat QR"
                >
                  <Icon icon="solar:check-circle-bold" width="14" />
                  ACC
                </button>
                <button
                  @click="openRejectModal(item)"
                  class="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition"
                  title="Tolak Pengajuan"
                >
                  Tolak
                </button>
              </template>

              <!-- Print A4 Letter & QR if Approved / Checked Out / Returned -->
              <button
                v-if="item.status !== 'pending' && item.status !== 'rejected'"
                @click="openLetterModal(item)"
                class="px-2.5 py-1.5 rounded-lg bg-[#602515]/10 hover:bg-[#602515] text-[#602515] hover:text-white text-xs font-bold flex items-center gap-1 transition"
                title="Cetak Surat Izin Jalan A4 & QR Code"
              >
                <Icon icon="solar:printer-bold" width="14" />
                Surat QR
              </button>

              <!-- Quick Scan Out if Approved -->
              <button
                v-if="item.status === 'approved'"
                @click="loadItemToScanner(item)"
                class="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white text-xs font-bold flex items-center gap-1 transition"
                title="Scan Santri Keluar Pondok"
              >
                <Icon icon="solar:logout-3-bold" width="14" />
                Scan Keluar
              </button>

              <!-- Quick Scan Return if Checked Out -->
              <button
                v-if="item.status === 'checked_out'"
                @click="loadItemToScanner(item)"
                class="px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-500 text-amber-900 hover:text-slate-950 text-xs font-bold flex items-center gap-1 transition"
                title="Scan Santri Kembali ke Pondok"
              >
                <Icon icon="solar:login-3-bold" width="14" />
                Scan Kembali
              </button>

              <button
                @click="editItem(item)"
                class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                title="Edit"
              >
                <Icon icon="solar:pen-bold" width="16" />
              </button>
              <button
                @click="confirmDelete(item)"
                class="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Hapus"
              >
                <Icon icon="solar:trash-bin-trash-bold" width="16" />
              </button>
            </div>
          </template>

          <!-- Card View -->
          <template #card-item="{ item }">
            <div
              class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div class="flex justify-between items-start gap-2 mb-3">
                  <span
                    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold"
                    :class="getStatusBadge(item).class"
                  >
                    <Icon :icon="getStatusBadge(item).icon" class="w-3.5 h-3.5" />
                    {{ getStatusBadge(item).label }}
                  </span>
                  <span class="font-mono text-[11px] font-bold text-slate-400">
                    {{ item.qrToken }}
                  </span>
                </div>

                <div class="space-y-2.5 mb-4">
                  <div class="flex flex-wrap gap-1.5">
                    <span
                      v-for="subItem in item.items"
                      :key="subItem.id"
                      class="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg text-xs font-bold"
                    >
                      {{ subItem.student?.fullName }}
                    </span>
                  </div>

                  <div class="text-xs text-slate-600 space-y-1">
                    <div class="flex items-center gap-1.5 font-semibold text-slate-800">
                      <Icon icon="solar:calendar-date-bold" class="text-[#602515]" />
                      {{ formatDate(item.startDate) }} ({{ item.startTime || "08:00" }})
                      s/d {{ formatDate(item.endDate) }} ({{ item.endTime || "17:00" }})
                    </div>
                    <div v-if="item.pickupName" class="text-[11px] text-slate-500">
                      Penjemput: <strong>{{ item.pickupName }}</strong>
                      <span v-if="item.pickupRelation"> ({{ item.pickupRelation }})</span>
                    </div>
                  </div>

                  <p class="text-xs text-slate-600 italic line-clamp-2">
                    "{{ item.reason }}"
                  </p>
                </div>
              </div>

              <div
                class="flex flex-wrap justify-end pt-3 border-t border-slate-100 gap-1.5"
              >
                <button
                  v-if="item.status === 'pending'"
                  @click="openApproveModal(item)"
                  class="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold"
                >
                  Setujui & QR
                </button>
                <button
                  v-if="item.status !== 'pending' && item.status !== 'rejected'"
                  @click="openLetterModal(item)"
                  class="px-3 py-1.5 bg-[#602515]/10 text-[#602515] rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <Icon icon="solar:printer-bold" width="14" />
                  Surat QR
                </button>
                <button
                  v-if="item.status === 'approved' || item.status === 'checked_out'"
                  @click="loadItemToScanner(item)"
                  class="px-3 py-1.5 bg-amber-500 text-slate-950 rounded-xl text-xs font-bold"
                >
                  {{ item.status === "approved" ? "Scan Keluar" : "Scan Kembali" }}
                </button>
                <button
                  @click="editItem(item)"
                  class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-xl"
                >
                  <Icon icon="solar:pen-bold" width="16" />
                </button>
                <button
                  @click="confirmDelete(item)"
                  class="p-1.5 text-red-500 hover:bg-red-50 rounded-xl"
                >
                  <Icon icon="solar:trash-bin-trash-bold" width="16" />
                </button>
              </div>
            </div>
          </template>
        </DataTable>
      </div>

      <!-- ==================== TAB 2: PENGAJUAN DARI ORANG TUA (PENDING) ==================== -->
      <div v-else-if="activeTab === 'pending'" class="space-y-4">
        <div
          v-if="pendingLeaves.length === 0"
          class="bg-white rounded-2xl border p-12 text-center text-slate-500"
        >
          <Icon
            icon="solar:check-read-line-duotone"
            class="w-14 h-14 text-emerald-500 mx-auto mb-3"
          />
          <h3 class="text-base font-bold text-slate-700">
            Tidak Ada Antrean Pengajuan
          </h3>
          <p class="text-xs text-slate-400 mt-1">
            Seluruh pengajuan izin dari Dashboard Orang Tua telah diverifikasi.
          </p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="item in pendingLeaves"
            :key="item.id"
            class="bg-white rounded-2xl border border-amber-200 shadow-xs p-5 flex flex-col justify-between gap-4"
          >
            <div class="space-y-3">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <span
                    class="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold uppercase"
                  >
                    Menunggu Verifikasi Kesantrian
                  </span>
                  <h3 class="text-base font-bold text-slate-800 mt-2">
                    {{ item.items?.[0]?.student?.fullName || "Santri" }}
                  </h3>
                  <p class="text-xs text-slate-500">
                    NIS: {{ item.items?.[0]?.student?.nis || "-" }} • Kelas:
                    {{ item.items?.[0]?.student?.className || "-" }} • Kamar:
                    {{ item.items?.[0]?.student?.roomName || "-" }}
                  </p>
                </div>
                <span
                  class="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold"
                >
                  {{ getCategoryLabel(item) }}
                </span>
              </div>

              <div
                class="bg-slate-50 rounded-xl p-3.5 text-xs space-y-1.5 border border-slate-100"
              >
                <div class="flex justify-between">
                  <span class="text-slate-500">Rencana Keluar/Jemput:</span>
                  <strong class="text-slate-800">
                    {{ formatDate(item.startDate) }} pukul {{ item.startTime || "08:00" }} WIB
                  </strong>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">Rencana Kembali:</span>
                  <strong class="text-red-700">
                    {{ formatDate(item.endDate) }} pukul {{ item.endTime || "17:00" }} WIB
                  </strong>
                </div>
                <div v-if="item.destination" class="flex justify-between">
                  <span class="text-slate-500">Tujuan:</span>
                  <strong class="text-slate-800">{{ item.destination }}</strong>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">Penjemput:</span>
                  <strong class="text-slate-800">
                    {{ item.pickupName || "-" }}
                    <span v-if="item.pickupRelation">({{ item.pickupRelation }})</span>
                    <span v-if="item.pickupPhone"> • {{ item.pickupPhone }}</span>
                  </strong>
                </div>
              </div>

              <div>
                <span class="text-[11px] font-bold text-slate-400 uppercase"
                  >Alasan Pengajuan Orang Tua:</span
                >
                <p class="text-xs text-slate-700 mt-0.5 font-medium">
                  "{{ item.reason }}"
                </p>
              </div>

              <div v-if="item.attachment">
                <a
                  :href="item.attachment"
                  target="_blank"
                  class="inline-flex items-center gap-1.5 text-xs font-bold text-[#602515] underline"
                >
                  <Icon icon="solar:paperclip-bold" />
                  Lihat Lampiran Bukti dari Orang Tua
                </a>
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-3 border-t">
              <button
                @click="openRejectModal(item)"
                class="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition"
              >
                Tolak Pengajuan
              </button>
              <button
                @click="openApproveModal(item)"
                class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition"
              >
                <Icon icon="solar:check-circle-bold" class="w-4 h-4" />
                Setujui & Terbitkan Surat QR
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ==================== TAB 3: SCAN QR CODE (CHECK-OUT & CHECK-IN) ==================== -->
      <div
        v-else-if="activeTab === 'scanner'"
        class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
      >
        <!-- Left Column: QR Camera & Code Input -->
        <div class="lg:col-span-5 space-y-4">
          <div class="bg-white rounded-2xl border p-5 shadow-xs space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 rounded-xl bg-[#602515]/10 text-[#602515] flex items-center justify-center"
                >
                  <Icon icon="solar:qr-code-bold-duotone" class="w-6 h-6" />
                </div>
                <div>
                  <h3 class="font-bold text-slate-800 text-sm">
                    Pemindai Surat Izin (QR Scanner)
                  </h3>
                  <p class="text-xs text-slate-500">
                    Scan saat santri keluar & saat kembali ke pondok
                  </p>
                </div>
              </div>

              <button
                @click="toggleCameraScanner"
                type="button"
                :class="
                  cameraActive
                    ? 'bg-red-600 text-white'
                    : 'bg-[#602515] text-white'
                "
                class="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Icon
                  :icon="
                    cameraActive
                      ? 'solar:stop-circle-bold'
                      : 'solar:camera-bold'
                  "
                  class="w-4 h-4"
                />
                {{ cameraActive ? "Matikan Kamera" : "Buka Kamera QR" }}
              </button>
            </div>

            <!-- Live Camera Viewfinder -->
            <div
              v-if="cameraActive"
              class="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border-2 border-[#602515]"
            >
              <video
                ref="videoRef"
                autoplay
                playsinline
                muted
                class="w-full h-full object-cover"
              ></video>
              <div
                class="absolute inset-6 border-2 border-amber-400/80 rounded-2xl pointer-events-none flex items-center justify-center"
              >
                <div
                  class="w-full h-0.5 bg-amber-400/80 animate-pulse"
                ></div>
              </div>
              <div
                class="absolute bottom-2 inset-x-2 bg-slate-900/80 text-white text-[11px] px-3 py-1.5 rounded-lg text-center"
              >
                {{ cameraStatusText }}
              </div>
            </div>

            <!-- Manual / Barcode Gun Input -->
            <form @submit.prevent="handleManualScan" class="space-y-2">
              <label
                class="block text-xs font-bold text-slate-600 uppercase tracking-wider"
              >
                Scan via Alat Barcode / Ketik Kode Surat QR
              </label>
              <div class="flex gap-2">
                <input
                  ref="qrInputRef"
                  type="text"
                  v-model="manualQrInput"
                  placeholder="Contoh: SLV-20261105-0001-XXXX"
                  class="flex-1 px-3.5 py-2.5 border-2 border-slate-200 rounded-xl font-mono text-sm focus:border-[#602515] outline-none"
                />
                <button
                  type="submit"
                  :disabled="scanningLoading || !manualQrInput.trim()"
                  class="px-4 py-2.5 rounded-xl bg-[#602515] hover:bg-[#7b311d] text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Icon
                    v-if="scanningLoading"
                    icon="svg-spinners:ring-resize"
                    class="w-4 h-4"
                  />
                  <Icon v-else icon="solar:magnifer-bold" class="w-4 h-4" />
                  Cari
                </button>
              </div>
            </form>

            <!-- Quick Pick List for Ready-to-Scan Students -->
            <div class="border-t pt-3">
              <div
                class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"
              >
                Pilih Cepat Surat Aktif (Siap Scan Keluar / Kembali)
              </div>
              <div
                v-if="scannableLeaves.length === 0"
                class="text-xs text-slate-400 py-4 text-center"
              >
                Tidak ada surat izin yang menunggu scan saat ini.
              </div>
              <div
                v-else
                class="space-y-2 max-h-72 overflow-y-auto pr-1"
              >
                <button
                  v-for="item in scannableLeaves"
                  :key="item.id"
                  type="button"
                  @click="loadItemToScanner(item)"
                  class="w-full text-left p-3 rounded-xl border hover:border-[#602515] hover:bg-amber-50/30 transition flex items-center justify-between gap-2"
                  :class="
                    scanResult?.id === item.id
                      ? 'border-[#602515] bg-amber-50/50'
                      : 'border-slate-200'
                  "
                >
                  <div>
                    <div class="font-bold text-xs text-slate-800">
                      {{
                        item.items?.map((i) => i.student?.fullName).join(", ")
                      }}
                    </div>
                    <div class="text-[11px] font-mono text-slate-500">
                      {{ item.qrToken }} • Batas: {{ formatDate(item.endDate) }}
                      {{ item.endTime || "17:00" }}
                    </div>
                  </div>
                  <span
                    class="px-2 py-1 rounded-lg text-[10px] font-bold flex-shrink-0"
                    :class="
                      item.status === 'approved'
                        ? 'bg-blue-100 text-blue-700'
                        : item.isOverdue
                        ? 'bg-red-100 text-red-700'
                        : 'bg-indigo-100 text-indigo-700'
                    "
                  >
                    {{
                      item.status === "approved"
                        ? "Siap Keluar"
                        : item.isOverdue
                        ? "Kembali (Telat)"
                        : "Sedang di Luar"
                    }}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Scan Verification & Check-Out / Check-In Execution -->
        <div class="lg:col-span-7">
          <div
            v-if="!scanResult"
            class="bg-white rounded-2xl border p-12 text-center text-slate-400 shadow-xs"
          >
            <Icon
              icon="solar:qr-code-line-duotone"
              class="w-16 h-16 mx-auto mb-3 text-slate-300"
            />
            <h3 class="text-base font-bold text-slate-700">
              Arahkan QR Code Surat Izin atau Pilih Santri di Samping
            </h3>
            <p class="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Sistem akan otomatis mengenali apakah santri akan melakukan
              <strong>Scan Keluar Pondok (Scan 1)</strong> atau
              <strong>Scan Kembali ke Pondok (Scan 2)</strong> beserta perhitungan
              keterlambatannya.
            </p>
          </div>

          <!-- Scan Result Card -->
          <div
            v-else
            class="bg-white rounded-2xl border shadow-sm overflow-hidden"
          >
            <!-- Top Banner based on Next Action -->
            <div
              class="px-6 py-4 text-white flex items-center justify-between"
              :class="
                scanResult.nextAction === 'checkout'
                  ? 'bg-gradient-to-r from-blue-700 to-indigo-800'
                  : scanResult.nextAction === 'checkin' &&
                    scanResult.scanPreview?.isLate
                  ? 'bg-gradient-to-r from-red-600 to-rose-700'
                  : scanResult.nextAction === 'checkin'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700'
                  : 'bg-slate-700'
              "
            >
              <div class="flex items-center gap-3">
                <Icon
                  :icon="
                    scanResult.nextAction === 'checkout'
                      ? 'solar:logout-3-bold-duotone'
                      : scanResult.nextAction === 'checkin'
                      ? 'solar:login-3-bold-duotone'
                      : 'solar:info-circle-bold-duotone'
                  "
                  class="w-8 h-8"
                />
                <div>
                  <div class="text-xs font-bold uppercase tracking-wider opacity-85">
                    {{
                      scanResult.nextAction === "checkout"
                        ? "SCAN KE-1 : KONFIRMASI SANTRI KELUAR PONDOK"
                        : scanResult.nextAction === "checkin"
                        ? "SCAN KE-2 : KONFIRMASI SANTRI KEMBALI KE PONDOK"
                        : "INFORMASI SURAT IZIN"
                    }}
                  </div>
                  <h3 class="text-lg font-extrabold">
                    {{
                      scanResult.items
                        ?.map((i) => i.student?.fullName)
                        .join(", ")
                    }}
                  </h3>
                </div>
              </div>

              <button
                @click="openLetterModal(scanResult)"
                class="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Icon icon="solar:printer-bold" class="w-4 h-4" />
                Lihat Surat A4
              </button>
            </div>

            <div class="p-6 space-y-5">
              <!-- Student & Leave Summary Grid -->
              <div
                class="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/70 text-xs"
              >
                <div>
                  <span class="text-slate-400 block">Nomor Surat & Kode QR:</span>
                  <strong class="font-mono text-slate-800 text-sm">
                    {{ scanResult.leaveNumber || "-" }} ({{ scanResult.qrToken }})
                  </strong>
                </div>
                <div>
                  <span class="text-slate-400 block">Kelas / Kamar Santri:</span>
                  <strong class="text-slate-800 text-sm">
                    {{ scanResult.items?.[0]?.student?.className || "-" }} /
                    {{ scanResult.items?.[0]?.student?.roomName || "-" }}
                  </strong>
                </div>
                <div>
                  <span class="text-slate-400 block">Jadwal Keluar:</span>
                  <strong class="text-slate-800">
                    {{ formatDate(scanResult.startDate) }} pukul
                    {{ scanResult.startTime || "08:00" }} WIB
                  </strong>
                </div>
                <div>
                  <span class="text-red-600 font-bold block"
                    >Batas Akhir Kembali:</span
                  >
                  <strong class="text-red-700 text-sm">
                    {{ formatDate(scanResult.endDate) }} pukul
                    {{ scanResult.endTime || "17:00" }} WIB
                  </strong>
                </div>
                <div>
                  <span class="text-slate-400 block">Kategori & Alasan:</span>
                  <strong class="text-slate-800">
                    [{{ getCategoryLabel(scanResult) }}] {{ scanResult.reason }}
                  </strong>
                </div>
                <div>
                  <span class="text-slate-400 block">Penjemput:</span>
                  <strong class="text-slate-800">
                    {{ scanResult.pickupName || "-" }}
                    <span v-if="scanResult.pickupRelation">
                      ({{ scanResult.pickupRelation }})
                    </span>
                    <span v-if="scanResult.pickupPhone">
                      • {{ scanResult.pickupPhone }}
                    </span>
                  </strong>
                </div>
              </div>

              <!-- ACTION 1: CHECK-OUT (SANTRI KELUAR PONDOK) -->
              <div
                v-if="scanResult.nextAction === 'checkout'"
                class="space-y-4 border-t pt-4"
              >
                <h4 class="font-bold text-slate-800 text-sm">
                  Verifikasi Penjemput Saat Meninggalkan Pondok
                </h4>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label class="block font-semibold text-slate-600 mb-1"
                      >Nama Penjemput</label
                    >
                    <input
                      type="text"
                      v-model="checkoutForm.pickupName"
                      placeholder="Nama penjemput"
                      class="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label class="block font-semibold text-slate-600 mb-1"
                      >Hubungan</label
                    >
                    <input
                      type="text"
                      v-model="checkoutForm.pickupRelation"
                      placeholder="Ayah / Ibu / Wali"
                      class="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label class="block font-semibold text-slate-600 mb-1"
                      >No. HP Penjemput</label
                    >
                    <input
                      type="text"
                      v-model="checkoutForm.pickupPhone"
                      placeholder="0812..."
                      class="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                <button
                  @click="submitCheckout"
                  :disabled="actionSubmitting"
                  class="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                  <Icon
                    v-if="actionSubmitting"
                    icon="svg-spinners:ring-resize"
                    class="w-5 h-5"
                  />
                  <Icon v-else icon="solar:logout-3-bold" class="w-5 h-5" />
                  Konfirmasi Santri Keluar Pondok Sekarang
                </button>
              </div>

              <!-- ACTION 2: CHECK-IN (SANTRI KEMBALI KE PONDOK) -->
              <div
                v-else-if="scanResult.nextAction === 'checkin'"
                class="space-y-4 border-t pt-4"
              >
                <!-- Status Keterlambatan Real-Time -->
                <div
                  v-if="!scanResult.scanPreview?.isLate"
                  class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800"
                >
                  <Icon
                    icon="solar:check-circle-bold-duotone"
                    class="w-8 h-8 text-emerald-600 flex-shrink-0"
                  />
                  <div class="text-xs">
                    <div class="font-bold text-sm">
                      Santri Kembali TEPAT WAKTU
                    </div>
                    <p>
                      Waktu scan saat ini masih berada dalam batas jadwal izin yang
                      ditentukan. Tidak ada poin pelanggaran.
                    </p>
                  </div>
                </div>

                <!-- JIKA TERLAMBAT (MELEBIHI BATAS WAKTU) -->
                <div
                  v-else
                  class="p-4 rounded-xl bg-red-50 border-2 border-red-200 space-y-4"
                >
                  <div class="flex items-start gap-3 text-red-800">
                    <Icon
                      icon="solar:danger-triangle-bold-duotone"
                      class="w-8 h-8 text-red-600 flex-shrink-0 mt-0.5"
                    />
                    <div class="text-xs">
                      <div class="font-extrabold text-sm uppercase">
                        TERDETEKSI TERLAMBAT KEMBALI ({{
                          scanResult.scanPreview.lateDurationText
                        }})
                      </div>
                      <p class="mt-0.5">
                        Santri melewati batas waktu kembali ({{
                          formatDate(scanResult.endDate)
                        }}
                        pukul {{ scanResult.endTime || "17:00" }} WIB). Pilih tindakan
                        kedisiplinan di bawah ini:
                      </p>
                    </div>
                  </div>

                  <!-- Pilihan Tindakan Keterlambatan (Fleksibel sesuai pilihan User) -->
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      @click="checkinForm.lateHandling = 'punished'"
                      :class="
                        checkinForm.lateHandling === 'punished'
                          ? 'bg-red-600 text-white border-red-600 shadow-md'
                          : 'bg-white text-slate-700 border-slate-200'
                      "
                      class="p-3 rounded-xl border text-xs font-bold flex items-center gap-2 transition"
                    >
                      <Icon icon="solar:shield-warning-bold" class="w-5 h-5" />
                      <div class="text-left">
                        <div>Terapkan Poin Pelanggaran</div>
                        <div class="text-[10px] opacity-80 font-normal">
                          Otomatis tercatat di Kedisiplinan (R&P)
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      @click="checkinForm.lateHandling = 'excused'"
                      :class="
                        checkinForm.lateHandling === 'excused'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                          : 'bg-white text-slate-700 border-slate-200'
                      "
                      class="p-3 rounded-xl border text-xs font-bold flex items-center gap-2 transition"
                    >
                      <Icon icon="solar:hand-heart-bold" class="w-5 h-5" />
                      <div class="text-left">
                        <div>Toleransi / Uzur Syar'i</div>
                        <div class="text-[10px] opacity-80 font-normal">
                          Tercatat telat namun tanpa potong poin
                        </div>
                      </div>
                    </button>
                  </div>

                  <!-- Form Pemilihan Aturan Poin Kedisiplinan -->
                  <div
                    v-if="checkinForm.lateHandling === 'punished'"
                    class="bg-white p-3.5 rounded-xl border border-red-200 space-y-3 text-xs"
                  >
                    <div>
                      <label class="block font-bold text-slate-700 mb-1">
                        Pilih Aturan Pelanggaran (Dari Modul Kedisiplinan / R&P)
                      </label>
                      <select
                        v-model="checkinForm.ruleId"
                        @change="onSelectPunishmentRule"
                        class="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                      >
                        <option :value="null">
                          -- Pelanggaran Keterlambatan Izin Pulang (Custom) --
                        </option>
                        <option
                          v-for="rule in pointRules"
                          :key="rule.id"
                          :value="rule.id"
                        >
                          [{{ rule.category }}] {{ rule.name }} (-{{
                            rule.defaultPoints
                          }}
                          Poin)
                        </option>
                      </select>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label class="block font-bold text-slate-700 mb-1">
                          Nama Pelanggaran
                        </label>
                        <input
                          type="text"
                          v-model="checkinForm.punishmentTitle"
                          class="w-full px-3 py-2 border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label class="block font-bold text-red-700 mb-1">
                          Poin Pengurangan (Pelanggaran)
                        </label>
                        <input
                          type="number"
                          min="1"
                          v-model.number="checkinForm.points"
                          class="w-full px-3 py-2 border border-red-300 rounded-lg font-bold text-red-700"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">
                    Catatan Kembali / Keterangan Uzur (Opsional)
                  </label>
                  <input
                    type="text"
                    v-model="checkinForm.lateNotes"
                    placeholder="Contoh: Diantar wali, atau alasan keterlambatan..."
                    class="w-full px-3.5 py-2.5 border rounded-xl text-xs"
                  />
                </div>

                <button
                  @click="submitCheckin"
                  :disabled="actionSubmitting"
                  class="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  <Icon
                    v-if="actionSubmitting"
                    icon="svg-spinners:ring-resize"
                    class="w-5 h-5"
                  />
                  <Icon v-else icon="solar:login-3-bold" class="w-5 h-5" />
                  Konfirmasi Santri Sudah Kembali ke Pondok
                </button>
              </div>

              <!-- JIKA MASIH PENDING -->
              <div
                v-else-if="scanResult.nextAction === 'approve'"
                class="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3"
              >
                <div class="text-xs text-amber-800">
                  <strong>Pengajuan ini masih berstatus Menunggu Persetujuan.</strong>
                  Setujui terlebih dahulu sebelum melakukan scan keluar.
                </div>
                <button
                  @click="openApproveModal(scanResult)"
                  class="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex-shrink-0"
                >
                  Setujui Sekarang
                </button>
              </div>

              <!-- JIKA SUDAH SELESAI KEMBALI -->
              <div
                v-else-if="scanResult.nextAction === 'completed'"
                class="p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700 space-y-1"
              >
                <div class="font-bold text-slate-900">
                  ✓ Surat Izin Ini Sudah Selesai Digunakan (Santri Sudah Kembali)
                </div>
                <div>
                  Waktu Keluar: {{ formatDateTime(scanResult.checkedOutAt) }} • Waktu
                  Kembali: {{ formatDateTime(scanResult.checkedInAt) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ==================== TAB 4: MONITORING SANTRI DI LUAR PONDOK ==================== -->
      <div v-else-if="activeTab === 'monitoring'" class="space-y-4">
        <div
          v-if="activeOutsideLeaves.length === 0"
          class="bg-white rounded-2xl border p-12 text-center text-slate-500"
        >
          <Icon
            icon="solar:home-smile-bold-duotone"
            class="w-14 h-14 text-emerald-500 mx-auto mb-3"
          />
          <h3 class="text-base font-bold text-slate-700">
            Seluruh Santri Berada di Pondok
          </h3>
          <p class="text-xs text-slate-400 mt-1">
            Saat ini tidak ada santri yang berstatus sedang di luar pondok.
          </p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="item in activeOutsideLeaves"
            :key="item.id"
            class="bg-white rounded-2xl border-2 p-5 shadow-xs flex flex-col justify-between gap-4"
            :class="
              item.isOverdue
                ? 'border-red-400 bg-red-50/20'
                : 'border-indigo-200'
            "
          >
            <div class="space-y-3">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <span
                    v-if="item.isOverdue"
                    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-600 text-white text-[11px] font-extrabold uppercase animate-pulse"
                  >
                    <Icon icon="solar:danger-triangle-bold" class="w-3.5 h-3.5" />
                    MELEBIHI BATAS WAKTU ({{ item.overdueDurationText }})
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold uppercase"
                  >
                    Sedang di Luar Pondok (Masih Dalam Jadwal)
                  </span>

                  <h3 class="text-base font-bold text-slate-800 mt-2">
                    {{
                      item.items?.map((i) => i.student?.fullName).join(", ")
                    }}
                  </h3>
                  <p class="text-xs text-slate-500">
                    NIS: {{ item.items?.[0]?.student?.nis || "-" }} • Kelas:
                    {{ item.items?.[0]?.student?.className || "-" }} • Kamar:
                    {{ item.items?.[0]?.student?.roomName || "-" }}
                  </p>
                </div>

                <span class="font-mono text-xs font-bold text-slate-500">
                  {{ item.qrToken }}
                </span>
              </div>

              <div
                class="bg-slate-50 rounded-xl p-3.5 text-xs space-y-1.5 border border-slate-200/70"
              >
                <div class="flex justify-between">
                  <span class="text-slate-500">Waktu Scan Keluar:</span>
                  <strong class="text-slate-800">{{
                    formatDateTime(item.checkedOutAt)
                  }}</strong>
                </div>
                <div class="flex justify-between">
                  <span class="text-red-700 font-bold">Batas Akhir Kembali:</span>
                  <strong class="text-red-700">
                    {{ formatDate(item.endDate) }} pukul
                    {{ item.endTime || "17:00" }} WIB
                  </strong>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">Penjemput / Wali:</span>
                  <strong class="text-slate-800">
                    {{ item.pickupName || item.items?.[0]?.student?.fatherName || "-" }}
                    <span v-if="item.pickupPhone || item.items?.[0]?.student?.parentPhone">
                      ({{ item.pickupPhone || item.items?.[0]?.student?.parentPhone }})
                    </span>
                  </strong>
                </div>
              </div>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-2 pt-3 border-t">
              <a
                v-if="item.pickupPhone || item.items?.[0]?.student?.parentPhone"
                :href="
                  formatWhatsappUrl(
                    item.pickupPhone || item.items?.[0]?.student?.parentPhone,
                    item
                  )
                "
                target="_blank"
                class="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Icon icon="solar:phone-calling-bold" class="w-4 h-4" />
                Hubungi Wali (WA)
              </a>
              <div v-else></div>

              <div class="flex items-center gap-2">
                <button
                  @click="openLetterModal(item)"
                  class="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  Surat QR
                </button>
                <button
                  @click="loadItemToScanner(item)"
                  class="px-4 py-2 rounded-xl bg-[#602515] hover:bg-[#7b311d] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Icon icon="solar:login-3-bold" class="w-4 h-4" />
                  Proses Scan Kembali
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Mode: Input Form -->
    <div v-else class="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <StudentLeaveInput
        :initialData="editingItem"
        @success="onInputSuccess"
        @cancel="toggleInputMode"
      />
    </div>

    <!-- MODAL VERIFIKASI & SETUJUI PENGAJUAN ORANG TUA -->
    <div
      v-if="approveModal.show && approveModal.item"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3"
      @click.self="approveModal.show = false"
    >
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 space-y-4">
        <div class="flex items-center justify-between border-b pb-3">
          <h3 class="font-bold text-slate-800 text-base">
            Setujui Izin & Terbitkan Surat QR
          </h3>
          <button
            @click="approveModal.show = false"
            class="text-slate-400 hover:text-slate-600"
          >
            <Icon icon="solar:close-circle-bold" class="w-6 h-6" />
          </button>
        </div>

        <div class="text-xs space-y-3">
          <p class="text-slate-600">
            Pastikan jadwal keluar dan batas kembali santri sudah sesuai sebelum
            menerbitkan Surat Izin Jalan ber-QR Code:
          </p>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 mb-1"
                >Tanggal Keluar</label
              >
              <input
                type="date"
                v-model="approveModal.startDate"
                class="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1"
                >Jam Keluar</label
              >
              <input
                type="time"
                v-model="approveModal.startTime"
                class="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label class="block font-bold text-red-700 mb-1"
                >Tanggal Batas Kembali</label
              >
              <input
                type="date"
                v-model="approveModal.endDate"
                class="w-full px-3 py-2 border border-red-200 rounded-lg"
              />
            </div>
            <div>
              <label class="block font-bold text-red-700 mb-1"
                >Jam Batas Kembali</label
              >
              <input
                type="time"
                v-model="approveModal.endTime"
                class="w-full px-3 py-2 border border-red-200 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1"
              >Keperluan / Alasan Izin</label
            >
            <textarea
              v-model="approveModal.reason"
              rows="2"
              class="w-full px-3 py-2 border rounded-lg"
            ></textarea>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t">
          <button
            @click="approveModal.show = false"
            class="px-4 py-2 rounded-xl border text-xs font-bold text-slate-600"
          >
            Batal
          </button>
          <button
            @click="confirmApprove"
            :disabled="actionSubmitting"
            class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5"
          >
            <Icon icon="solar:qr-code-bold" class="w-4 h-4" />
            {{
              actionSubmitting
                ? "Memproses..."
                : "Setujui & Buka Surat QR (A4)"
            }}
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL TOLAK PENGAJUAN -->
    <div
      v-if="rejectModal.show && rejectModal.item"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3"
      @click.self="rejectModal.show = false"
    >
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4">
        <h3 class="font-bold text-slate-800 text-base">
          Tolak Pengajuan Izin Santri
        </h3>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">
            Alasan Penolakan (Ditampilkan di Dashboard Orang Tua) *
          </label>
          <textarea
            v-model="rejectModal.reason"
            rows="3"
            placeholder="Contoh: Sedang masa ujian semester, belum diperkenankan izin pulang..."
            class="w-full px-3 py-2 border rounded-xl text-xs"
          ></textarea>
        </div>
        <div class="flex justify-end gap-2">
          <button
            @click="rejectModal.show = false"
            class="px-4 py-2 rounded-xl border text-xs font-bold text-slate-600"
          >
            Batal
          </button>
          <button
            @click="confirmReject"
            :disabled="actionSubmitting || !rejectModal.reason.trim()"
            class="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold disabled:opacity-50"
          >
            Tolak Pengajuan
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL CETAK SURAT IZIN A4 & QR CODE -->
    <StudentLeaveLetterModal
      :isOpen="letterModal.show"
      :leave="letterModal.leave"
      @close="letterModal.show = false"
    />

    <!-- Confirm Delete Dialog -->
    <ConfirmModal
      :isOpen="confirm.show"
      title="Hapus Data Izin?"
      type="danger"
      @confirm="deleteItem"
      @cancel="confirm.show = false"
    >
      Menghapus data ini akan membatalkan status izin pada absensi dan mutabaah
      santri terkait.
    </ConfirmModal>

    <!-- Status Modal -->
    <StatusModal
      :isOpen="statusModal.show"
      :type="statusModal.type"
      :title="statusModal.title"
      :message="statusModal.message"
      @close="statusModal.show = false"
    />

    <!-- MODAL PENGATURAN KOP SURAT KESANTRIAN (OPSI 2) -->
    <div
      v-if="kopModal.show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3"
      @click.self="kopModal.show = false"
    >
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 space-y-4">
        <div class="flex items-center justify-between border-b pb-3">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-[#602515]/10 text-[#602515] flex items-center justify-center">
              <Icon icon="solar:gallery-edit-bold-duotone" class="w-5 h-5" />
            </div>
            <div>
              <h3 class="font-bold text-slate-800 text-sm sm:text-base">
                Pengaturan Kop Surat Izin Santri
              </h3>
              <p class="text-[11px] text-slate-500">
                Opsi Kop Akademik atau Khusus Kesantrian / Asrama
              </p>
            </div>
          </div>
          <button
            @click="kopModal.show = false"
            class="text-slate-400 hover:text-slate-600"
          >
            <Icon icon="solar:close-circle-bold" class="w-6 h-6" />
          </button>
        </div>

        <div class="space-y-3.5 text-xs">
          <!-- Status Kop Aktif -->
          <div
            class="p-3.5 rounded-xl border flex items-start gap-2.5"
            :class="
              kopModal.isCustomKesantrian
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50/70 border-amber-200 text-amber-900'
            "
          >
            <Icon
              :icon="kopModal.isCustomKesantrian ? 'solar:check-circle-bold' : 'solar:info-circle-bold'"
              class="w-5 h-5 flex-shrink-0 mt-0.5 text-[#602515]"
            />
            <div>
              <div class="font-bold text-xs sm:text-sm">
                {{
                  kopModal.isCustomKesantrian
                    ? "Sedang Aktif: Kop Khusus Kesantrian / Asrama (Opsi 2)"
                    : "Sedang Aktif: Mengikuti Kop Pengaturan Akademik (Opsi 1)"
                }}
              </div>
              <p class="text-[11px] mt-0.5 text-slate-600 leading-relaxed">
                {{
                  kopModal.isCustomKesantrian
                    ? "Surat izin santri saat ini menggunakan gambar kop surat mandiri khusus bagian kesantrian."
                    : "Surat izin santri saat ini otomatis menggunakan gambar kop surat yang di-upload di menu Pengaturan Akademik."
                }}
              </p>
            </div>
          </div>

          <!-- Preview Kop Saat Ini -->
          <div v-if="kopModal.previewUrl" class="border rounded-xl p-3 bg-slate-50 text-center">
            <span class="text-[11px] text-slate-500 block mb-1.5 font-semibold">Preview Gambar Kop Surat Aktif:</span>
            <img
              :src="kopModal.previewUrl"
              alt="Preview Kop Surat"
              class="max-h-24 w-full object-contain mx-auto rounded border bg-white p-1"
            />
          </div>
          <div v-else class="p-3 rounded-xl border border-dashed border-slate-300 text-center text-slate-400 text-[11px]">
            Belum ada gambar kop yang di-upload (Surat izin saat ini menggunakan format teks resmi bawaan sistem).
          </div>

          <!-- Upload Form untuk Opsi 2 -->
          <div class="pt-2 border-t">
            <label class="block font-bold text-slate-700 mb-1">
              Upload Gambar Kop Khusus Kesantrian (Jika ingin terpisah):
            </label>
            <p class="text-[11px] text-slate-500 mb-2">
              Format gambar: PNG, JPG, atau WebP (Rekomendasi rasio banner melebar, tinggi ~120-200px).
            </p>
            <input
              type="file"
              accept="image/*"
              @change="handleKopFileUpload"
              :disabled="kopModal.uploading"
              class="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#602515] file:text-white hover:file:bg-[#7b311d] cursor-pointer"
            />
          </div>

          <!-- Tombol Hapus / Reset ke Akademik -->
          <div
            v-if="kopModal.isCustomKesantrian"
            class="pt-3 border-t flex items-center justify-between"
          >
            <span class="text-[11px] text-slate-500">
              Ingin kembali menggunakan kop umum akademik?
            </span>
            <button
              @click="revertToAcademicKop"
              :disabled="kopModal.uploading"
              class="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition flex items-center gap-1"
            >
              <Icon icon="solar:trash-bin-trash-bold" class="w-4 h-4" />
              Kembali ke Kop Akademik
            </button>
          </div>
        </div>

        <div class="flex justify-end pt-2 border-t">
          <button
            @click="kopModal.show = false"
            class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from "vue";
import { Icon } from "@iconify/vue";
import DataTable from "@/components/ui/DataTable.vue";
import ConfirmModal from "@/components/ui/ConfirmModal.vue";
import StatusModal from "@/components/ui/StatusModal.vue";
import StudentLeaveInput from "./StudentLeaveInput.vue";
import StudentLeaveLetterModal from "@/components/leaves/StudentLeaveLetterModal.vue";
import { studentLeavesApi } from "@/services/api.js";

const loading = ref(false);
const inputMode = ref(false);
const activeTab = ref("all");
const leaves = ref([]);
const pointRules = ref([]);

// DataTable State
const search = ref("");
const currentPage = ref(1);
const pageSize = ref(10);
const viewMode = ref("table");

const filters = reactive({
  startDate: "",
  endDate: "",
  status: "",
});

const statusFilterOptions = [
  { label: "Semua Status", value: "" },
  { label: "Menunggu ACC", value: "pending" },
  { label: "Disetujui (Siap Keluar)", value: "approved" },
  { label: "Sedang di Luar", value: "checked_out" },
  { label: "Sudah Kembali (Tepat)", value: "returned" },
  { label: "Kembali Terlambat", value: "returned_late" },
  { label: "Ditolak", value: "rejected" },
];

const confirm = reactive({ show: false, item: null });
const editingItem = ref(null);
const statusModal = reactive({
  show: false,
  type: "success",
  title: "",
  message: "",
});

const letterModal = reactive({
  show: false,
  leave: null,
});

const kopModal = reactive({
  show: false,
  uploading: false,
  kesantrianLogo: "",
  academicLogo: "",
  activeLogo: "",
  isCustomKesantrian: false,
  previewUrl: "",
});

const approveModal = reactive({
  show: false,
  item: null,
  startDate: "",
  endDate: "",
  startTime: "08:00",
  endTime: "17:00",
  reason: "",
});

const rejectModal = reactive({
  show: false,
  item: null,
  reason: "",
});

// Scanner State
const manualQrInput = ref("");
const qrInputRef = ref(null);
const scanningLoading = ref(false);
const scanResult = ref(null);
const actionSubmitting = ref(false);

const checkoutForm = reactive({
  pickupName: "",
  pickupRelation: "",
  pickupPhone: "",
});

const checkinForm = reactive({
  lateHandling: "punished",
  ruleId: null,
  punishmentTitle: "Terlambat Kembali dari Izin Pulang / Keluar",
  punishmentCategory: "Kedisiplinan / Perizinan",
  points: 10,
  lateNotes: "",
});

// Camera QR Scanner state
const cameraActive = ref(false);
const cameraStatusText = ref("Arahkan kamera ke QR Code pada Surat Izin...");
const videoRef = ref(null);
let mediaStream = null;
let scanInterval = null;

const columns = [
  { label: "Santri & Kode QR", field: "students" },
  { label: "Jadwal & Waktu Scan", field: "dates" },
  { label: "Kategori & Alasan", field: "reason" },
  { label: "Status & Monitoring", field: "status" },
  { label: "Aksi", field: "actions", align: "right" },
];

// Computed Stats & Lists
const pendingLeaves = computed(() =>
  leaves.value.filter((l) => l.status === "pending")
);

const activeOutsideLeaves = computed(() =>
  leaves.value
    .filter((l) => l.status === "checked_out")
    .sort((a, b) => (b.currentOverdueMinutes || 0) - (a.currentOverdueMinutes || 0))
);

const scannableLeaves = computed(() =>
  leaves.value.filter(
    (l) => l.status === "approved" || l.status === "checked_out"
  )
);

const stats = computed(() => ({
  pendingCount: pendingLeaves.value.length,
  approvedCount: leaves.value.filter((l) => l.status === "approved").length,
  checkedOutCount: activeOutsideLeaves.value.length,
  overdueActiveCount: activeOutsideLeaves.value.filter((l) => l.isOverdue).length,
  returnedLateCount: leaves.value.filter((l) => l.status === "returned_late")
    .length,
}));

const navTabs = computed(() => [
  {
    id: "all",
    label: "Semua Riwayat & Surat Izin",
    icon: "solar:clipboard-list-bold-duotone",
    badge: 0,
  },
  {
    id: "pending",
    label: "Pengajuan Orang Tua",
    icon: "solar:inbox-in-bold-duotone",
    badge: stats.value.pendingCount,
    badgeDanger: false,
  },
  {
    id: "scanner",
    label: "Scan QR (Keluar / Kembali)",
    icon: "solar:qr-code-bold-duotone",
    badge: 0,
  },
  {
    id: "monitoring",
    label: "Monitoring Santri di Luar",
    icon: "solar:radar-2-bold-duotone",
    badge: stats.value.overdueActiveCount || stats.value.checkedOutCount,
    badgeDanger: stats.value.overdueActiveCount > 0,
  },
]);

const filteredLeaves = computed(() => {
  let items = leaves.value;
  if (filters.status) {
    items = items.filter((i) => i.status === filters.status);
  }
  if (search.value) {
    const q = search.value.toLowerCase();
    items = items.filter((item) => {
      const reason = item.reason?.toLowerCase() || "";
      const token = item.qrToken?.toLowerCase() || "";
      const number = item.leaveNumber?.toLowerCase() || "";
      const pickup = item.pickupName?.toLowerCase() || "";
      const studentNames =
        item.items
          ?.map(
            (i) =>
              `${i.student?.fullName || ""} ${i.student?.nis || ""}`.toLowerCase()
          )
          .join(" ") || "";
      return (
        reason.includes(q) ||
        token.includes(q) ||
        number.includes(q) ||
        pickup.includes(q) ||
        studentNames.includes(q)
      );
    });
  }
  return items;
});

const paginatedLeaves = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredLeaves.value.slice(start, start + pageSize.value);
});

const pagination = computed(() => ({
  page: currentPage.value,
  limit: pageSize.value,
  total: filteredLeaves.value.length,
  totalPages: Math.ceil(filteredLeaves.value.length / pageSize.value),
}));

// Methods
function getCategoryLabel(item) {
  const cat = item?.leaveCategory;
  if (cat === "keluar") return "Izin Keluar";
  if (cat === "sakit" || item?.type === "sick") return "Sakit";
  if (cat === "kegiatan") return "Dispensasi";
  return "Izin Pulang";
}

function getStatusBadge(item) {
  if (item.isOverdue) {
    return {
      label: "Melebihi Batas Waktu",
      class: "bg-red-100 text-red-700 border border-red-200",
      icon: "solar:danger-triangle-bold",
    };
  }
  switch (item.status) {
    case "pending":
      return {
        label: "Menunggu ACC",
        class: "bg-amber-100 text-amber-800",
        icon: "solar:clock-circle-bold",
      };
    case "approved":
      return {
        label: "Siap Scan Keluar",
        class: "bg-blue-100 text-blue-700",
        icon: "solar:qr-code-bold",
      };
    case "checked_out":
      return {
        label: "Sedang di Luar",
        class: "bg-indigo-100 text-indigo-700",
        icon: "solar:walking-round-bold",
      };
    case "returned":
      return {
        label: "Kembali (Tepat Waktu)",
        class: "bg-emerald-100 text-emerald-700",
        icon: "solar:check-circle-bold",
      };
    case "returned_late":
      return {
        label: "Kembali Terlambat",
        class: "bg-rose-100 text-rose-700",
        icon: "solar:alarm-bold",
      };
    case "rejected":
      return {
        label: "Ditolak",
        class: "bg-slate-200 text-slate-600",
        icon: "solar:close-circle-bold",
      };
    default:
      return {
        label: item.status || "Aktif",
        class: "bg-slate-100 text-slate-700",
        icon: "solar:info-circle-bold",
      };
  }
}

async function fetchData() {
  loading.value = true;
  try {
    const res = await studentLeavesApi.getLeaves({
      startDate: filters.startDate,
      endDate: filters.endDate,
    });
    leaves.value = res.data || [];
  } catch (e) {
    console.error("Fetch error:", e);
  } finally {
    loading.value = false;
  }
}

async function fetchPointRules() {
  try {
    const res = await studentLeavesApi.getPointRules();
    if (res.success) {
      pointRules.value = res.data || [];
    }
  } catch (e) {
    console.warn("Load point rules warning:", e);
  }
}

function switchTab(tabId) {
  activeTab.value = tabId;
  if (tabId !== "scanner") {
    stopCameraScanner();
  } else {
    setTimeout(() => {
      qrInputRef.value?.focus();
    }, 150);
  }
}

function resetFilters() {
  filters.startDate = "";
  filters.endDate = "";
  filters.status = "";
  search.value = "";
  fetchData();
}

function toggleInputMode() {
  stopCameraScanner();
  inputMode.value = !inputMode.value;
  if (!inputMode.value) {
    editingItem.value = null;
    fetchData();
  }
}

function editItem(item) {
  editingItem.value = item;
  inputMode.value = true;
}

function onInputSuccess() {
  inputMode.value = false;
  editingItem.value = null;
  fetchData();
}

function openLetterModal(item) {
  letterModal.leave = item;
  letterModal.show = true;
}

function openApproveModal(item) {
  approveModal.item = item;
  approveModal.startDate = item.startDate
    ? new Date(item.startDate).toISOString().split("T")[0]
    : "";
  approveModal.endDate = item.endDate
    ? new Date(item.endDate).toISOString().split("T")[0]
    : "";
  approveModal.startTime = item.startTime || "08:00";
  approveModal.endTime = item.endTime || "17:00";
  approveModal.reason = item.reason || "";
  approveModal.show = true;
}

async function confirmApprove() {
  if (!approveModal.item) return;
  actionSubmitting.value = true;
  try {
    const id = approveModal.item.id;
    const res = await studentLeavesApi.approveLeave(id, {
      startDate: approveModal.startDate,
      endDate: approveModal.endDate,
      startTime: approveModal.startTime,
      endTime: approveModal.endTime,
      reason: approveModal.reason,
    });
    approveModal.show = false;
    await fetchData();
    const updated = leaves.value.find((l) => l.id === id);
    if (updated) {
      openLetterModal(updated);
    }
    showStatus("success", "Disetujui", res.message);
  } catch (e) {
    showStatus("error", "Gagal", e.message || "Gagal menyetujui izin");
  } finally {
    actionSubmitting.value = false;
  }
}

function openRejectModal(item) {
  rejectModal.item = item;
  rejectModal.reason = "";
  rejectModal.show = true;
}

async function confirmReject() {
  if (!rejectModal.item || !rejectModal.reason.trim()) return;
  actionSubmitting.value = true;
  try {
    const res = await studentLeavesApi.rejectLeave(
      rejectModal.item.id,
      rejectModal.reason
    );
    rejectModal.show = false;
    await fetchData();
    showStatus("success", "Ditolak", res.message);
  } catch (e) {
    showStatus("error", "Gagal", e.message || "Gagal menolak pengajuan");
  } finally {
    actionSubmitting.value = false;
  }
}

// Scanner logic
async function lookupQrToken(tokenStr) {
  if (!tokenStr) return;
  scanningLoading.value = true;
  try {
    const res = await studentLeavesApi.scanQrToken(tokenStr.trim());
    if (res.success && res.data) {
      prepareScanResult(res.data);
    }
  } catch (e) {
    showStatus(
      "error",
      "QR Tidak Ditemukan",
      e.message || "Kode QR / Nomor Surat tidak terdaftar."
    );
  } finally {
    scanningLoading.value = false;
  }
}

function handleManualScan() {
  if (!manualQrInput.value.trim()) return;
  lookupQrToken(manualQrInput.value.trim());
}

function loadItemToScanner(item) {
  activeTab.value = "scanner";
  manualQrInput.value = item.qrToken || String(item.id);
  lookupQrToken(item.qrToken || String(item.id));
}

function prepareScanResult(data) {
  scanResult.value = data;
  checkoutForm.pickupName =
    data.pickupName || data.items?.[0]?.student?.fatherName || "";
  checkoutForm.pickupRelation = data.pickupRelation || "Orang Tua / Wali";
  checkoutForm.pickupPhone =
    data.pickupPhone || data.items?.[0]?.student?.parentPhone || "";

  checkinForm.lateHandling = data.scanPreview?.isLate ? "punished" : "on_time";
  checkinForm.lateNotes = "";

  // Auto-select matching late rule if available
  const matchingRule =
    pointRules.value.find((r) =>
      r.name?.toLowerCase().includes("izin") ||
      r.name?.toLowerCase().includes("terlambat") ||
      r.name?.toLowerCase().includes("pulang")
    ) || pointRules.value[0];

  if (matchingRule) {
    checkinForm.ruleId = matchingRule.id;
    checkinForm.punishmentTitle = matchingRule.name;
    checkinForm.punishmentCategory = matchingRule.category;
    checkinForm.points = matchingRule.defaultPoints || 10;
  } else {
    checkinForm.ruleId = null;
    checkinForm.punishmentTitle = "Terlambat Kembali dari Izin Pulang / Keluar";
    checkinForm.punishmentCategory = "Kedisiplinan / Perizinan";
    checkinForm.points = 10;
  }
}

function onSelectPunishmentRule() {
  const r = pointRules.value.find((item) => item.id === checkinForm.ruleId);
  if (r) {
    checkinForm.punishmentTitle = r.name;
    checkinForm.punishmentCategory = r.category;
    checkinForm.points = r.defaultPoints || 10;
  }
}

async function submitCheckout() {
  if (!scanResult.value) return;
  actionSubmitting.value = true;
  try {
    const res = await studentLeavesApi.checkoutLeave(scanResult.value.id, {
      pickupName: checkoutForm.pickupName,
      pickupRelation: checkoutForm.pickupRelation,
      pickupPhone: checkoutForm.pickupPhone,
    });
    await fetchData();
    await lookupQrToken(scanResult.value.qrToken || String(scanResult.value.id));
    showStatus("success", "Scan Keluar Berhasil", res.message);
  } catch (e) {
    showStatus("error", "Gagal Scan Keluar", e.message);
  } finally {
    actionSubmitting.value = false;
  }
}

async function submitCheckin() {
  if (!scanResult.value) return;
  actionSubmitting.value = true;
  try {
    const res = await studentLeavesApi.checkinLeave(scanResult.value.id, {
      lateHandling: checkinForm.lateHandling,
      lateNotes: checkinForm.lateNotes,
      ruleId: checkinForm.ruleId,
      points: checkinForm.points,
      punishmentTitle: checkinForm.punishmentTitle,
      punishmentCategory: checkinForm.punishmentCategory,
    });
    await fetchData();
    await lookupQrToken(scanResult.value.qrToken || String(scanResult.value.id));
    showStatus("success", "Scan Kembali Selesai", res.message);
  } catch (e) {
    showStatus("error", "Gagal Scan Kembali", e.message);
  } finally {
    actionSubmitting.value = false;
  }
}

// Camera BarcodeDetector
async function toggleCameraScanner() {
  if (cameraActive.value) {
    stopCameraScanner();
    return;
  }
  try {
    cameraActive.value = true;
    cameraStatusText.value = "Mengaktifkan kamera...";
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
    if (videoRef.value) {
      videoRef.value.srcObject = mediaStream;
    }

    if ("BarcodeDetector" in window) {
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      cameraStatusText.value = "Arahkan QR Code Surat Izin ke dalam kotak...";
      scanInterval = setInterval(async () => {
        if (!videoRef.value || videoRef.value.readyState < 2) return;
        try {
          const barcodes = await detector.detect(videoRef.value);
          if (barcodes.length > 0 && barcodes[0].rawValue) {
            const code = barcodes[0].rawValue.trim();
            manualQrInput.value = code;
            stopCameraScanner();
            lookupQrToken(code);
          }
        } catch (err) {
          // ignore frame error
        }
      }, 400);
    } else {
      cameraStatusText.value =
        "Browser ini belum mendukung deteksi otomatis kamera. Gunakan input kode / alat scanner di bawah.";
    }
  } catch (err) {
    cameraActive.value = false;
    showStatus(
      "error",
      "Kamera Tidak Dapat Diakses",
      "Pastikan izin kamera diberikan pada browser atau gunakan input kode surat di bawah."
    );
  }
}

function stopCameraScanner() {
  if (scanInterval) {
    clearInterval(scanInterval);
    scanInterval = null;
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop());
    mediaStream = null;
  }
  cameraActive.value = false;
}

function confirmDelete(item) {
  confirm.item = item;
  confirm.show = true;
}

async function deleteItem() {
  if (!confirm.item) return;
  try {
    await studentLeavesApi.deleteLeave(confirm.item.id);
    confirm.show = false;
    showStatus(
      "success",
      "Berhasil",
      "Data izin berhasil dihapus dan sinkronisasi dibatalkan."
    );
    fetchData();
  } catch (e) {
    showStatus("error", "Gagal", e.message || "Gagal menghapus data.");
  }
}

function showStatus(type, title, message) {
  statusModal.type = type;
  statusModal.title = title;
  statusModal.message = message;
  statusModal.show = true;
}

function getLogoUrl(path) {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("data:")) return path;
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
  if (path.startsWith("/")) return `${baseUrl}${path}`;
  if (path.startsWith("uploads/")) return `${baseUrl}/api/${path}`;
  return `${baseUrl}/api/uploads/${path}`;
}

async function openKopSettingsModal() {
  kopModal.show = true;
  await loadKopSettings();
}

async function loadKopSettings() {
  try {
    const res = await studentLeavesApi.getHeaderLogo();
    if (res?.success && res.data) {
      kopModal.kesantrianLogo = res.data.kesantrianLogo || "";
      kopModal.academicLogo = res.data.academicLogo || "";
      kopModal.activeLogo = res.data.activeLogo || "";
      kopModal.isCustomKesantrian = !!res.data.isCustomKesantrian;
      kopModal.previewUrl = getLogoUrl(res.data.activeLogo);
    }
  } catch (e) {
    console.warn("Load kop settings warning:", e);
  }
}

async function handleKopFileUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    showStatus("error", "Ukuran Terlalu Besar", "Ukuran maksimal file gambar adalah 5MB");
    return;
  }
  kopModal.uploading = true;
  try {
    const upRes = await studentLeavesApi.uploadFile(file);
    if (!upRes.success || !upRes.data?.filePath) {
      throw new Error(upRes.message || "Upload gagal");
    }
    const saveRes = await studentLeavesApi.updateHeaderLogo(upRes.data.filePath);
    if (saveRes.success) {
      showStatus("success", "Berhasil", "Gambar Kop Surat Khusus Kesantrian berhasil disimpan.");
      await loadKopSettings();
    }
  } catch (err) {
    showStatus("error", "Gagal Upload", err.message || "Gagal mengupload gambar kop surat");
  } finally {
    kopModal.uploading = false;
  }
}

async function revertToAcademicKop() {
  kopModal.uploading = true;
  try {
    const res = await studentLeavesApi.updateHeaderLogo("");
    if (res.success) {
      showStatus("success", "Berhasil", "Kop Khusus Kesantrian dihapus. Sekarang otomatis kembali menggunakan Kop Akademik.");
      await loadKopSettings();
    }
  } catch (err) {
    showStatus("error", "Gagal", err.message || "Gagal mereset kop surat");
  } finally {
    kopModal.uploading = false;
  }
}

function formatDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatWhatsappUrl(phone, item) {
  let cleaned = String(phone || "").replace(/\D/g, "");
  if (cleaned.startsWith("0")) cleaned = "62" + cleaned.slice(1);
  const studentName = item.items?.[0]?.student?.fullName || "Santri";
  const text = `Assalamu'alaikum Bapak/Ibu Wali dari ananda *${studentName}*. Kami dari Bagian Kesantrian menginformasikan terkait batas waktu izin pulang ananda (${formatDate(
    item.endDate
  )} pukul ${item.endTime || "17:00"} WIB). Mohon konfirmasinya. Syukran.`;
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
}

onMounted(() => {
  fetchData();
  fetchPointRules();
});

onUnmounted(() => {
  stopCameraScanner();
});
</script>
