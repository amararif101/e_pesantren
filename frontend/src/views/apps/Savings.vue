<template>
  <div class="space-y-6">
    <!-- Balance Header Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      <!-- Balance Card -->
      <div class="bg-gradient-to-br from-[#602515] to-[#803520] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div class="absolute right-4 bottom-4 opacity-15">
          <Icon icon="solar:wallet-bold" class="text-7xl" />
        </div>
        <p class="text-xs font-bold uppercase tracking-wider text-[#ffd3c4] mb-1">
          {{ isManager ? 'Total Saldo Seluruh Anggota' : 'Saldo Tabungan Anda' }}
        </p>
        <h2 class="text-3xl font-black mb-4">
          {{ formatRupiah(balanceSummary.balance) }}
        </h2>
        <div class="flex items-center gap-1.5 text-xs text-amber-200">
          <Icon icon="solar:info-circle-bold-duotone" />
          <span>Hanya menghitung transaksi status Terkonfirmasi</span>
        </div>
      </div>

      <!-- Total Deposit Card -->
      <StatCard
        icon="solar:card-transfer-bold-duotone"
        color="emerald"
        label="Total Setoran"
        :value="formatRupiah(balanceSummary.totalDeposit)"
      />

      <!-- Total Withdrawal Card -->
      <StatCard
        icon="solar:card-send-bold-duotone"
        color="rose"
        label="Total Pengambilan"
        :value="formatRupiah(balanceSummary.totalWithdrawal)"
      />
    </div>

    <!-- Tabs for Managers -->
    <div v-if="isManager" class="flex border-b border-slate-200 bg-white p-1 rounded-xl border">
      <button
        @click="activeTab = 'transactions'"
        :class="activeTab === 'transactions' ? 'bg-[#602515] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'"
        class="flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all text-center flex items-center justify-center gap-2"
      >
        <Icon icon="solar:list-down-bold-duotone" class="text-lg" />
        <span>Transaksi Tabungan</span>
      </button>
      <button
        @click="activeTab = 'balances'"
        :class="activeTab === 'balances' ? 'bg-[#602515] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'"
        class="flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all text-center flex items-center justify-center gap-2"
      >
        <Icon icon="solar:users-group-two-rounded-bold-duotone" class="text-lg" />
        <span>Saldo Anggota ({{ memberBalances.length }})</span>
      </button>
      <button
        @click="activeTab = 'accounts'"
        :class="activeTab === 'accounts' ? 'bg-[#602515] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'"
        class="flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all text-center flex items-center justify-center gap-2"
      >
        <Icon icon="solar:card-2-bold-duotone" class="text-lg" />
        <span>Pengaturan Rekening</span>
      </button>
    </div>

    <!-- Bulk Action Floating Alert Bar -->
    <div
      v-if="selectedTxIds.length > 0 && activeTab === 'transactions'"
      class="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in shadow-sm"
    >
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-[#602515]">
          <Icon icon="solar:check-square-bold-duotone" class="text-xl" />
        </div>
        <div>
          <h4 class="font-bold text-slate-800 text-sm">Tindakan Masal (Bulk Action)</h4>
          <p class="text-xs text-slate-500">
            Terpilih <span class="font-bold text-[#602515]">{{ selectedTxIds.length }}</span> transaksi tertunda.
          </p>
        </div>
      </div>
      
      <div class="flex items-center gap-2 w-full sm:w-auto">
        <button
          @click="bulkUpdateStatus('confirmed')"
          class="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all active:scale-95 shadow-sm"
        >
          <Icon icon="solar:check-circle-bold" />
          <span>Setujui Semua</span>
        </button>
        <button
          @click="bulkUpdateStatus('rejected')"
          class="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all active:scale-95 shadow-sm"
        >
          <Icon icon="solar:close-circle-bold" />
          <span>Tolak Semua</span>
        </button>
        <button
          @click="selectedTxIds = []"
          class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all"
        >
          Batal
        </button>
      </div>
    </div>

    <!-- Tab Content: Transactions -->
    <div v-show="activeTab === 'transactions'">
      <!-- Bank Transfer Destination Banner -->
      <div v-if="activeBankAccounts.length > 0" class="mb-6 bg-amber-50/50 border border-amber-200/60 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex items-start gap-3">
          <div class="p-2 rounded-lg bg-amber-100 text-[#602515]">
            <Icon icon="solar:info-square-bold-duotone" class="text-xl" />
          </div>
          <div>
            <h4 class="font-semibold text-slate-800 text-sm">Rekening Pembayaran Setoran Tabungan</h4>
            <p class="text-xs text-slate-500 mt-0.5">Silakan lakukan transfer ke salah satu rekening resmi berikut sebelum mengisi form setoran:</p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <div v-for="acc in activeBankAccounts" :key="acc.id" class="bg-white border border-slate-200 rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs shadow-sm hover:shadow-md transition-all">
            <span class="font-bold text-[#602515] bg-[#602515]/10 px-1.5 py-0.5 rounded text-[10px]">{{ acc.bankName }}</span>
            <span class="font-mono font-bold text-slate-700">{{ acc.accountNumber }}</span>
            <span class="text-slate-400 text-[10px]">a.n.</span>
            <span class="font-semibold text-slate-600">{{ acc.accountName }}</span>
            <button @click="copyToClipboard(acc.accountNumber)" class="text-slate-400 hover:text-[#602515] p-1 transition-all" title="Salin Nomor Rekening">
              <Icon icon="solar:copy-bold-duotone" class="text-xs" />
            </button>
          </div>
        </div>
      </div>

      <!-- Data Table Component -->
      <DataTable
        title="Transaksi Tabungan"
        description="Pencatatan dan pengelolaan tabungan mandiri pesantren (Setoran dan Penarikan)"
        icon="solar:wallet-line-duotone"
        :columns="columns"
        :items="paginatedSavings"
        :loading="loading"
        :pagination="paginationState"
        :viewMode="viewMode"
        :search="searchQuery"
        @update:search="onSearch"
        @update:limit="changeLimit"
        @page-change="changePage"
        @update:viewMode="(v) => (viewMode = v)"
      >
        <!-- Header Actions Slot -->
        <template #header-actions>
          <!-- Excel Export Button -->
          <button
            @click="exportToExcel"
            :disabled="filteredSavings.length === 0"
            class="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Ekspor ke Excel"
          >
            <Icon icon="solar:document-text-bold-duotone" class="text-lg text-green-600" />
            <span>Ekspor Excel</span>
          </button>

          <!-- Add Button -->
          <button
            @click="openCreateModal"
            class="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-all shadow-sm hover:shadow-md active:scale-95 bg-[#602515] hover:bg-[#4d1d10]"
          >
            <Icon icon="solar:add-circle-bold-duotone" class="text-lg" />
            <span>Tambah Transaksi</span>
          </button>
        </template>

        <!-- Toolbar Actions Slot for Card View Select All -->
        <template #toolbar-actions>
          <div v-if="viewMode === 'card' && isManager && selectableSavings.length > 0" class="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50">
            <input
              id="bulk-select-card"
              type="checkbox"
              :checked="isAllSelected"
              @change="toggleSelectAll"
              class="w-4 h-4 text-[#602515] border-slate-300 rounded focus:ring-[#602515] cursor-pointer"
            />
            <label for="bulk-select-card" class="text-xs font-bold text-slate-600 cursor-pointer select-none">
              Pilih Semua ({{ selectableSavings.length }})
            </label>
          </div>
        </template>

        <!-- Advanced Filters Slot -->
        <template #filters="{ close }">
          <div class="space-y-4">
            <div class="flex items-center justify-between border-b pb-2">
              <h4 class="font-semibold text-sm text-slate-800 flex items-center gap-1.5">
                <Icon icon="solar:filter-bold-duotone" class="text-amber-500" />
                Saring Data
              </h4>
              <button @click="resetFilters" class="text-xs text-[#602515] hover:underline font-medium">
                Reset
              </button>
            </div>

            <!-- Transaction Type Filter -->
            <div class="space-y-2">
              <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider">Tipe Transaksi</label>
              <select
                v-model="filters.type"
                class="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#602515] bg-white font-semibold"
              >
                <option value="">Semua Tipe</option>
                <option value="deposit">Setoran (Deposit)</option>
                <option value="withdrawal">Penarikan (Withdrawal)</option>
              </select>
            </div>

            <!-- Transaction Status Filter -->
            <div class="space-y-2">
              <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider">Status Konfirmasi</label>
              <select
                v-model="filters.status"
                class="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#602515] bg-white font-semibold"
              >
                <option value="">Semua Status</option>
                <option value="pending">Tertunda (Pending)</option>
                <option value="confirmed">Terkonfirmasi</option>
                <option value="rejected">Ditolak</option>
              </select>
            </div>

            <!-- Date Filters -->
            <div class="space-y-2">
              <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider">Tanggal Transfer</label>
              <div class="grid grid-cols-2 gap-2">
                <input
                  v-model="filters.startDate"
                  type="date"
                  class="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#602515]"
                  placeholder="Mulai"
                />
                <input
                  v-model="filters.endDate"
                  type="date"
                  class="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#602515]"
                  placeholder="Selesai"
                />
              </div>
            </div>

            <!-- Nominal Filters -->
            <div class="space-y-2">
              <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider">Nominal Tabungan</label>
              <div class="grid grid-cols-2 gap-2">
                <input
                  v-model.number="filters.minNominal"
                  type="number"
                  class="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#602515]"
                  placeholder="Min (Rp)"
                />
                <input
                  v-model.number="filters.maxNominal"
                  type="number"
                  class="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#602515]"
                  placeholder="Maks (Rp)"
                />
              </div>
            </div>

            <!-- Apply Button -->
            <div class="pt-2 border-t flex justify-end">
              <button
                @click="close"
                class="px-4 py-1.5 bg-[#602515] text-white text-xs font-medium rounded-lg hover:bg-[#4d1d10] transition-colors"
              >
                Terapkan
              </button>
            </div>
          </div>
        </template>

        <!-- Header Checkbox Slot -->
        <template #header-checkbox>
          <input
            type="checkbox"
            :checked="isAllSelected"
            @change="toggleSelectAll"
            class="w-4 h-4 text-[#602515] border-slate-300 rounded focus:ring-[#602515]"
          />
        </template>

        <!-- Cell Formatter: Checkbox Selection -->
        <template #cell-select="{ item }">
          <input
            v-if="item.status === 'pending'"
            type="checkbox"
            :value="item.realId"
            v-model="selectedTxIds"
            class="w-4 h-4 text-[#602515] border-slate-300 rounded focus:ring-[#602515]"
            @click.stop
          />
          <div v-else class="w-4 h-4 flex items-center justify-center">
            <Icon icon="solar:lock-bold" class="text-xs text-slate-300" />
          </div>
        </template>

        <!-- Cell Formatter: User Name -->
        <template #cell-userName="{ item }">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[#602515] border">
              {{ item.userName?.charAt(0)?.toUpperCase() || 'U' }}
            </div>
            <div>
              <div class="font-bold text-slate-800 text-sm">{{ item.userName }}</div>
              <div class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ID: {{ item.userId }}</div>
            </div>
          </div>
        </template>

        <!-- Cell Formatter: Date -->
        <template #cell-transferDate="{ item }">
          <div class="flex items-center gap-2 text-slate-700 text-xs font-semibold">
            <Icon icon="solar:calendar-date-bold-duotone" class="text-slate-400 text-base" />
            <span>{{ formatFullDate(item.transferDate) }}</span>
          </div>
        </template>

        <!-- Cell Formatter: Type -->
        <template #cell-type="{ item }">
          <span
            v-if="item.type === 'deposit'"
            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100"
          >
            <Icon icon="solar:card-transfer-bold-duotone" />
            <span>Setoran</span>
          </span>
          <span
            v-else
            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100"
          >
            <Icon icon="solar:card-send-bold-duotone" />
            <span>Penarikan</span>
          </span>
        </template>

        <!-- Cell Formatter: Nominal -->
        <template #cell-nominal="{ item }">
          <span
            class="font-extrabold text-sm"
            :class="item.type === 'deposit' ? 'text-emerald-600' : 'text-rose-600'"
          >
            {{ item.type === 'deposit' ? '+' : '-' }} {{ formatRupiah(item.nominal) }}
          </span>
        </template>

        <!-- Cell Formatter: Status -->
        <template #cell-status="{ item }">
          <div class="flex flex-col items-start gap-1">
            <span
              v-if="item.status === 'confirmed'"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100"
            >
              <Icon icon="solar:check-circle-bold-duotone" />
              <span>Terkonfirmasi</span>
            </span>
            <span
              v-else-if="item.status === 'rejected'"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100"
            >
              <Icon icon="solar:close-circle-bold-duotone" />
              <span>Ditolak</span>
            </span>
            <span
              v-else
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100"
            >
              <Icon icon="solar:clock-circle-bold-duotone" />
              <span>Tertunda</span>
            </span>
          </div>
        </template>

        <!-- Cell Formatter: Receipt/Description -->
        <template #cell-receiptPath="{ item }">
          <div class="space-y-1.5">
            <div class="text-xs text-slate-700 font-medium" v-if="item.description">
              "{{ item.description }}"
            </div>
            <div v-if="item.type === 'deposit'">
              <a
                v-if="item.receiptPath"
                :href="item.receiptPath"
                target="_blank"
                class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 transition-colors"
              >
                <Icon icon="solar:gallery-check-bold-duotone" class="text-xs" />
                <span>Lihat Bukti</span>
              </a>
              <span v-else class="text-[10px] text-slate-400 italic">Tidak ada bukti</span>
            </div>
          </div>
        </template>

        <!-- Cell Formatter: Actions -->
        <template #cell-action="{ item }">
          <div class="flex items-center gap-1 justify-center">
            <!-- Manager Quick Confirm/Reject Buttons -->
            <template v-if="isManager && item.status === 'pending'">
              <button
                @click="updateTxStatus(item.realId, 'confirmed')"
                class="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all active:scale-95"
                title="Setujui"
              >
                <Icon icon="solar:check-circle-bold-duotone" class="text-lg" />
              </button>
              <button
                @click="updateTxStatus(item.realId, 'rejected')"
                class="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all active:scale-95"
                title="Tolak"
              >
                <Icon icon="solar:close-circle-bold-duotone" class="text-lg" />
              </button>
            </template>

            <!-- Revert to pending for managers -->
            <button
              v-if="isManager && item.status !== 'pending'"
              @click="updateTxStatus(item.realId, 'pending')"
              class="p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 transition-all active:scale-95"
              title="Kembalikan ke Pending"
            >
              <Icon icon="solar:refresh-bold-duotone" class="text-sm" />
            </button>

            <!-- Regular Edit/Delete buttons (Locked if confirmed and not manager) -->
            <template v-if="item.status !== 'confirmed' || isManager">
              <button
                @click="openEditModal(item)"
                class="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-amber-600 transition-colors"
                title="Edit"
              >
                <Icon icon="solar:pen-2-bold-duotone" class="text-lg" />
              </button>
              <button
                @click="confirmDelete(item)"
                class="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-600 transition-colors"
                title="Hapus"
              >
                <Icon icon="solar:trash-bin-trash-bold-duotone" class="text-lg" />
              </button>
            </template>
            <span
              v-else
              class="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 py-1 bg-slate-50 border rounded-lg"
              title="Terkonfirmasi & Terkunci"
            >
              Terkunci
            </span>
          </div>
        </template>

        <!-- Card / Grid View Template -->
        <template #card-item="{ item }">
          <div class="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-all flex flex-col relative group">
            <!-- Bulk Select Checkbox (Manager only) -->
            <div v-if="isManager && item.status === 'pending'" class="absolute top-4 left-4 z-10">
              <input
                type="checkbox"
                :value="item.realId"
                v-model="selectedTxIds"
                class="w-4 h-4 text-[#602515] border-slate-300 rounded focus:ring-[#602515]"
              />
            </div>

            <!-- Action Buttons inside Card -->
            <div class="absolute top-4 right-4 flex gap-1 items-center">
              <template v-if="isManager && item.status === 'pending'">
                <button
                  @click="updateTxStatus(item.realId, 'confirmed')"
                  class="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                >
                  <Icon icon="solar:check-circle-bold" class="text-sm" />
                </button>
                <button
                  @click="updateTxStatus(item.realId, 'rejected')"
                  class="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"
                >
                  <Icon icon="solar:close-circle-bold" class="text-sm" />
                </button>
              </template>
              
              <template v-if="item.status !== 'confirmed' || isManager">
                <button
                  @click="openEditModal(item)"
                  class="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                >
                  <Icon icon="solar:pen-2-bold-duotone" class="text-base" />
                </button>
                <button
                  @click="confirmDelete(item)"
                  class="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                >
                  <Icon icon="solar:trash-bin-trash-bold-duotone" class="text-base" />
                </button>
              </template>
              <span v-else class="text-[9px] font-bold text-slate-400 bg-slate-50 border rounded px-1.5 py-0.5">
                Terkunci
              </span>
            </div>

            <!-- Profile Info (Shift right if checkbox is present) -->
            <div class="flex items-center gap-3.5 mb-4" :class="{ 'pl-6': isManager && item.status === 'pending' }">
              <div class="w-11 h-11 rounded-xl bg-slate-100 text-[#602515] flex items-center justify-center font-bold text-lg border">
                {{ item.userName?.charAt(0)?.toUpperCase() || 'U' }}
              </div>
              <div>
                <h3 class="font-bold text-slate-800 text-base line-clamp-1 pr-14">
                  {{ item.userName }}
                </h3>
                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ID User: {{ item.userId }}</p>
              </div>
            </div>

            <!-- Details -->
            <div class="space-y-2 border-t pt-3.5 text-slate-600 text-sm flex-1">
              <div class="flex items-center justify-between">
                <span class="text-xs text-slate-400">Tipe Transaksi</span>
                <span
                  class="font-bold text-xs"
                  :class="item.type === 'deposit' ? 'text-emerald-600' : 'text-rose-600'"
                >
                  {{ item.type === 'deposit' ? 'Setoran' : 'Penarikan' }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-slate-400">Nominal</span>
                <span
                  class="font-extrabold text-base"
                  :class="item.type === 'deposit' ? 'text-emerald-600' : 'text-rose-600'"
                >
                  {{ item.type === 'deposit' ? '+' : '-' }} {{ formatRupiah(item.nominal) }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-slate-400">Tanggal</span>
                <span class="font-semibold text-slate-700 flex items-center gap-1 text-xs">
                  <Icon icon="solar:calendar-date-bold-duotone" class="text-slate-400" />
                  {{ formatFullDate(item.transferDate) }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-slate-400">Status</span>
                <span
                  class="font-bold text-xs"
                  :class="item.status === 'confirmed' ? 'text-emerald-600' : item.status === 'rejected' ? 'text-rose-600' : 'text-amber-600'"
                >
                  {{ item.status === 'confirmed' ? 'Terkonfirmasi' : item.status === 'rejected' ? 'Ditolak' : 'Tertunda' }}
                </span>
              </div>
              <div class="text-xs text-slate-500 italic mt-2 bg-slate-50 p-2 rounded-lg" v-if="item.description">
                "{{ item.description }}"
              </div>
            </div>

            <!-- Receipt Link -->
            <div class="mt-4 pt-3.5 border-t" v-if="item.type === 'deposit'">
              <a
                v-if="item.receiptPath"
                :href="item.receiptPath"
                target="_blank"
                class="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 transition-colors text-xs font-bold"
              >
                <Icon icon="solar:gallery-check-bold-duotone" />
                <span>Lihat Bukti Transfer</span>
              </a>
              <div v-else class="text-center py-2 text-xs text-slate-400 italic">
                Tidak ada bukti transfer terlampir
              </div>
            </div>
          </div>
        </template>
      </DataTable>
    </div>

    <!-- Tab Content: Balances Summary (For Managers Only) -->
    <div v-show="activeTab === 'balances' && isManager">
      <DataTable
        title="Saldo Anggota"
        description="Ringkasan total tabungan dan saldo aktif masing-masing anggota pesantren"
        icon="solar:users-group-two-rounded-bold-duotone"
        :columns="balanceColumns"
        :items="paginatedBalances"
        :loading="loading"
        :pagination="balancePaginationState"
        :viewMode="balanceViewMode"
        :search="balanceSearchQuery"
        @update:search="onBalanceSearch"
        @update:limit="changeBalanceLimit"
        @page-change="changeBalancePage"
        @update:viewMode="(v) => (balanceViewMode = v)"
      >
        <template #cell-userName="{ item }">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[#602515] border">
              {{ item.userName?.charAt(0)?.toUpperCase() || 'U' }}
            </div>
            <div>
              <div class="font-bold text-slate-800 text-sm">{{ item.userName }}</div>
              <div class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Email: {{ item.userEmail }}</div>
            </div>
          </div>
        </template>

        <template #cell-totalDeposit="{ item }">
          <span class="font-semibold text-emerald-600">{{ formatRupiah(item.totalDeposit) }}</span>
        </template>

        <template #cell-totalWithdrawal="{ item }">
          <span class="font-semibold text-rose-600">{{ formatRupiah(item.totalWithdrawal) }}</span>
        </template>

        <template #cell-balance="{ item }">
          <span class="font-extrabold text-slate-800">{{ formatRupiah(item.balance) }}</span>
        </template>

        <template #cell-action="{ item }">
          <button
            @click="viewUserTransactions(item)"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 text-[#602515] border border-[#602515]/20 hover:bg-[#602515] hover:text-white transition-all text-xs font-bold"
          >
            <Icon icon="solar:eye-bold-duotone" />
            <span>Lihat Transaksi</span>
          </button>
        </template>

        <!-- Card View Template for Member Balances -->
        <template #card-item="{ item }">
          <div class="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-all flex flex-col relative group">
            <!-- Profile Info -->
            <div class="flex items-center gap-3.5 mb-4">
              <div class="w-11 h-11 rounded-xl bg-slate-100 text-[#602515] flex items-center justify-center font-bold text-lg border">
                {{ item.userName?.charAt(0)?.toUpperCase() || 'U' }}
              </div>
              <div>
                <h3 class="font-bold text-slate-800 text-base line-clamp-1">
                  {{ item.userName }}
                </h3>
                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Email: {{ item.userEmail }}</p>
              </div>
            </div>

            <!-- Details -->
            <div class="space-y-2 border-t pt-3.5 text-slate-600 text-sm flex-1">
              <div class="flex items-center justify-between">
                <span class="text-xs text-slate-400">Total Setoran</span>
                <span class="font-semibold text-emerald-600">{{ formatRupiah(item.totalDeposit) }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-slate-400">Total Penarikan</span>
                <span class="font-semibold text-rose-600">{{ formatRupiah(item.totalWithdrawal) }}</span>
              </div>
              <div class="flex items-center justify-between border-t pt-2">
                <span class="text-xs text-slate-400 font-bold">Saldo Aktif</span>
                <span class="font-extrabold text-slate-850 text-base text-[#602515]">{{ formatRupiah(item.balance) }}</span>
              </div>
            </div>

            <!-- Action Button -->
            <div class="mt-4 pt-3.5 border-t">
              <button
                @click="viewUserTransactions(item)"
                class="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-50 text-[#602515] border border-[#602515]/20 hover:bg-[#602515] hover:text-white transition-all text-xs font-bold"
              >
                <Icon icon="solar:eye-bold-duotone" />
                <span>Lihat Transaksi</span>
              </button>
            </div>
          </div>
        </template>
      </DataTable>
    </div>

    <!-- Tab Content: Bank Accounts Settings (Manager only) -->
    <div v-show="activeTab === 'accounts' && isManager">
      <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <!-- Header -->
        <div class="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 class="font-extrabold text-slate-800 text-base flex items-center gap-2">
              <Icon icon="solar:card-2-bold-duotone" class="text-[#602515] text-xl" />
              Pengaturan Rekening Tabungan
            </h3>
            <p class="text-xs text-slate-500 mt-1">Kelola data rekening bank resmi untuk setoran tabungan anggota.</p>
          </div>
          <button
            @click="openAccountModal()"
            class="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all shadow-sm hover:shadow-md active:scale-95 bg-[#602515] hover:bg-[#4d1d10] w-full sm:w-auto"
          >
            <Icon icon="solar:add-circle-bold-duotone" class="text-base" />
            <span>Tambah Rekening</span>
          </button>
        </div>

        <!-- Content -->
        <div class="p-6">
          <div v-if="bankAccounts.length === 0" class="flex flex-col items-center justify-center py-12 text-slate-400">
            <Icon icon="solar:card-search-linear" class="text-5xl mb-3" />
            <p class="text-sm font-semibold">Belum ada rekening bank terdaftar</p>
            <p class="text-xs mt-1 text-center">Tambahkan rekening resmi agar anggota dapat melihat tujuan transfer setoran.</p>
          </div>
          
          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div v-for="acc in bankAccounts" :key="acc.id" class="border rounded-xl p-5 bg-slate-50 hover:bg-white hover:border-[#602515]/30 hover:shadow-md transition-all flex flex-col justify-between relative group animate-fade-in">
              <!-- Action Buttons -->
              <div class="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  @click="acc.isActive ? showActiveAccountWarning('edit') : openAccountModal(acc)"
                  class="p-1.5 rounded-lg bg-white border border-slate-200 transition-all shadow-sm"
                  :class="acc.isActive ? 'opacity-40 cursor-not-allowed text-slate-400' : 'hover:border-amber-300 hover:text-amber-600 text-slate-500'"
                  :title="acc.isActive ? 'Nonaktifkan rekening untuk mengubah detail' : 'Ubah Rekening'"
                >
                  <Icon icon="solar:pen-bold-duotone" class="text-xs" />
                </button>
                <button
                  @click="acc.isActive ? showActiveAccountWarning('delete') : confirmDeleteAccount(acc)"
                  class="p-1.5 rounded-lg bg-white border border-slate-200 transition-all shadow-sm"
                  :class="acc.isActive ? 'opacity-40 cursor-not-allowed text-slate-400' : 'hover:border-red-300 hover:text-red-600 text-slate-500'"
                  :title="acc.isActive ? 'Nonaktifkan rekening sebelum menghapus' : 'Hapus Rekening'"
                >
                  <Icon icon="solar:trash-bin-trash-bold-duotone" class="text-xs" />
                </button>
              </div>

              <div>
                <div class="flex items-center gap-2">
                  <span class="font-bold text-xs text-[#602515] bg-[#602515]/10 px-2 py-0.5 rounded">{{ acc.bankName }}</span>
                  <span
                    class="px-2 py-0.5 text-[10px] font-bold rounded-full"
                    :class="acc.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'"
                  >
                    {{ acc.isActive ? 'Aktif' : 'Nonaktif' }}
                  </span>
                </div>
                <div class="mt-4 font-mono font-bold text-slate-800 text-lg tracking-wider">{{ acc.accountNumber }}</div>
                <div class="text-xs text-slate-500 mt-1">a.n. <span class="font-bold text-slate-700">{{ acc.accountName }}</span></div>
              </div>

              <div class="mt-6 pt-4 border-t border-slate-200/60 flex items-center justify-between">
                <span class="text-[10px] text-slate-400">Terdaftar: {{ formatFullDate(acc.createdAt) }}</span>
                
                <!-- Toggle Active Switch -->
                <button
                  @click="toggleAccountStatus(acc)"
                  class="text-xs font-semibold hover:underline flex items-center gap-1"
                  :class="acc.isActive ? 'text-[#f8ae19]' : 'text-green-600'"
                >
                  <Icon :icon="acc.isActive ? 'solar:eye-closed-bold-duotone' : 'solar:eye-bold-duotone'" />
                  {{ acc.isActive ? 'Nonaktifkan' : 'Aktifkan' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Form Modal -->
    <Teleport to="body">
      <div
        v-if="modal.show"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in"
      >
        <div class="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden relative">
          <!-- Header -->
          <div class="p-5 border-b flex items-center justify-between">
            <h3 class="font-bold text-slate-800 text-lg flex items-center gap-2">
              <Icon
                :icon="modal.mode === 'create' ? 'solar:add-circle-bold-duotone' : 'solar:pen-2-bold-duotone'"
                class="text-[#602515]"
              />
              <span>{{ modal.mode === 'create' ? 'Tambah Transaksi Tabungan' : 'Ubah Transaksi Tabungan' }}</span>
            </h3>
            <button @click="closeModal" class="p-2 rounded-lg hover:bg-slate-100 transition-colors">
              <Icon icon="solar:close-circle-line-duotone" class="text-xl text-slate-400" />
            </button>
          </div>

          <!-- Form Body -->
          <form @submit.prevent="submitForm">
            <div class="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <!-- Error message -->
              <div
                v-if="modal.error"
                class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2"
              >
                <Icon icon="solar:danger-circle-bold-duotone" class="flex-shrink-0" />
                <span>{{ modal.error }}</span>
              </div>

              <div class="space-y-1.5">
                <label class="block text-sm font-bold text-slate-700">Tipe Transaksi <span class="text-red-500">*</span></label>
                <select
                  v-model="form.type"
                  required
                  class="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#602515] bg-white font-semibold text-slate-700"
                >
                  <option value="deposit">Setoran (Simpan Uang)</option>
                  <option value="withdrawal">Penarikan / Pengambilan Uang</option>
                </select>
              </div>

              <!-- Bank Accounts Info for Deposit -->
              <div v-if="form.type === 'deposit' && activeBankAccounts.length > 0" class="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                <span class="text-xs font-bold text-slate-600 block flex items-center gap-1.5">
                  <Icon icon="solar:card-transfer-bold-duotone" class="text-amber-500" />
                  Transfer Tujuan Setoran:
                </span>
                <div class="grid grid-cols-1 gap-2">
                  <div v-for="acc in activeBankAccounts" :key="acc.id" class="bg-white border border-slate-200 rounded-md p-2 flex items-center justify-between text-xs shadow-sm">
                    <div>
                      <span class="font-bold text-[#602515] bg-[#602515]/10 px-1.5 py-0.5 rounded text-[10px] mr-2">{{ acc.bankName }}</span>
                      <span class="font-mono font-bold text-slate-700">{{ acc.accountNumber }}</span>
                      <div class="text-[10px] text-slate-400 mt-0.5">a.n. <span class="font-semibold text-slate-600">{{ acc.accountName }}</span></div>
                    </div>
                    <button type="button" @click="copyToClipboard(acc.accountNumber)" class="text-slate-400 hover:text-[#602515] p-1.5 hover:bg-slate-100 rounded-md transition-all" title="Salin Nomor Rekening">
                      <Icon icon="solar:copy-bold-duotone" class="text-sm" />
                    </button>
                  </div>
                </div>
              </div>

              <!-- 2. User Association -->
              <div class="space-y-1.5">
                <label class="block text-sm font-bold text-slate-700">Nama & ID Anggota <span class="text-red-500">*</span></label>
                
                <!-- If manager: Render dropdown -->
                <div v-if="isManager" class="relative">
                  <select
                    v-model="form.userId"
                    required
                    class="w-full border border-slate-200 rounded-lg px-3.5 py-3 text-sm focus:outline-none focus:border-[#602515] bg-white font-semibold"
                  >
                    <option :value="null" disabled>Pilih Anggota Pesantren</option>
                    <option v-for="user in systemUsers" :key="user.id" :value="user.id">
                      {{ user.name }} ({{ formatRole(user.role) }} - ID: {{ user.id }})
                    </option>
                  </select>
                </div>
                
                <!-- If regular user: Auto-filled, disabled -->
                <div v-else class="grid grid-cols-3 gap-3">
                  <input
                    type="text"
                    :value="currentUser.name"
                    disabled
                    class="col-span-2 border border-slate-200 bg-slate-50 text-slate-500 rounded-lg px-3.5 py-2.5 text-sm font-semibold"
                  />
                  <input
                    type="text"
                    :value="`ID: ${currentUser.id}`"
                    disabled
                    class="border border-slate-200 bg-slate-50 text-slate-500 rounded-lg px-3.5 py-2.5 text-sm text-center font-bold"
                  />
                </div>
              </div>

              <!-- 3. Transaction Date -->
              <div class="space-y-1.5">
                <label class="block text-sm font-bold text-slate-700">Tanggal Transaksi <span class="text-red-500">*</span></label>
                <div class="grid grid-cols-2 gap-3 mb-2">
                  <button
                    type="button"
                    @click="setDateOption('today')"
                    :class="dateOption === 'today' ? 'bg-[#602515] text-white border-transparent' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'"
                    class="py-2.5 px-4 rounded-lg text-xs font-bold border transition-all text-center flex items-center justify-center gap-1.5"
                  >
                    <Icon icon="solar:clock-circle-bold" />
                    <span>Hari Ini (Saat Ini)</span>
                  </button>
                  <button
                    type="button"
                    @click="setDateOption('custom')"
                    :class="dateOption === 'custom' ? 'bg-[#602515] text-white border-transparent' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'"
                    class="py-2.5 px-4 rounded-lg text-xs font-bold border transition-all text-center flex items-center justify-center gap-1.5"
                  >
                    <Icon icon="solar:calendar-linear" />
                    <span>Pilih Tanggal (Custom)</span>
                  </button>
                </div>

                <div v-if="dateOption === 'custom'" class="relative animate-in fade-in slide-in-from-top-1 duration-200">
                  <input
                    v-model="form.transferDate"
                    type="date"
                    required
                    class="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#602515] font-semibold text-slate-700"
                  />
                </div>
              </div>

              <!-- 4. Nominal Money -->
              <div class="space-y-1.5">
                <label class="block text-sm font-bold text-slate-700">Nominal Transaksi <span class="text-red-500">*</span></label>
                <div class="relative">
                  <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Rp</span>
                  <input
                    v-model.number="form.nominal"
                    type="number"
                    required
                    min="1"
                    placeholder="Contoh: 100000"
                    class="w-full border border-slate-200 rounded-lg pl-10 pr-3.5 py-2.5 text-sm focus:outline-none focus:border-[#602515] font-bold text-slate-700"
                  />
                </div>
                <p class="text-[10px] text-slate-400 font-bold tracking-tight">
                  Tampilan Terformat: <span class="text-[#602515]">{{ formatRupiah(form.nominal || 0) }}</span>
                </p>
              </div>

              <!-- 5. Description Note -->
              <div class="space-y-1.5">
                <label class="block text-sm font-bold text-slate-700">Keterangan / Catatan</label>
                <textarea
                  v-model="form.description"
                  rows="2"
                  placeholder="Contoh: Setoran awal / Penarikan untuk beli kitab"
                  class="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-[#602515]"
                ></textarea>
              </div>

              <!-- 6. Receipt File (Show only for deposits) -->
              <div v-if="form.type === 'deposit'" class="space-y-1.5">
                <label class="block text-sm font-bold text-slate-700">Unggah Bukti Transfer (Lampiran)</label>
                <div class="flex items-center justify-center w-full">
                  <label v-if="!form.receiptPath && !uploading" class="group flex flex-col items-center justify-center w-full h-36 border-2 border-slate-100 border-dashed rounded-xl cursor-pointer bg-slate-50/50 hover:bg-white transition-all hover:border-[#602515] hover:shadow-inner">
                    <div class="flex flex-col items-center justify-center pt-4 pb-4">
                      <div class="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md mb-2 group-hover:scale-110 transition-transform">
                        <Icon icon="solar:upload-bold-duotone" class="text-lg text-slate-400 group-hover:text-[#602515]" />
                      </div>
                      <p class="text-xs text-slate-500 font-bold mb-0.5">Pilih Gambar Bukti Transfer</p>
                      <p class="text-[10px] text-slate-400 font-medium">PNG, JPG atau JPEG (Maks. 5MB)</p>
                    </div>
                    <input type="file" class="hidden" accept="image/png, image/jpeg, image/jpg" @change="handleFileUpload" />
                  </label>

                  <!-- Upload Progress Container -->
                  <div v-else-if="uploading" class="w-full h-36 border border-slate-200 rounded-xl bg-slate-50/30 p-4 flex flex-col items-center justify-center gap-3">
                    <div class="w-10 h-10 bg-[#602515]/5 rounded-full flex items-center justify-center animate-pulse">
                      <Icon icon="solar:cloud-upload-bold-duotone" class="text-xl text-[#602515]" />
                    </div>
                    <div class="w-full max-w-xs space-y-1.5 text-center">
                      <div class="text-[10px] font-extrabold text-slate-500 flex justify-between px-0.5 uppercase tracking-wider">
                        <span>Mengunggah Bukti...</span>
                        <span>{{ uploadProgress }}%</span>
                      </div>
                      <!-- Progress Track -->
                      <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden shadow-inner">
                        <div 
                          class="bg-[#602515] h-full rounded-full transition-all duration-150 ease-out" 
                          :style="{ width: `${uploadProgress}%` }"
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div v-else class="w-full bg-slate-50/80 rounded-xl p-4 border border-emerald-100/50 flex flex-col items-center gap-3">
                    <div class="flex items-center gap-3 w-full bg-white p-2.5 rounded-lg border border-slate-100">
                      <div class="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shadow-inner flex-shrink-0">
                        <Icon icon="solar:document-check-bold-duotone" class="text-2xl" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="text-xs font-bold text-slate-700 truncate font-mono text-[10px]">Bukti_Transfer_Terunggah.png</div>
                        <div class="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mt-0.5">Tersimpan di Server</div>
                      </div>
                    </div>
                    
                    <div class="flex items-center gap-2 w-full">
                      <a 
                        :href="form.receiptPath" 
                        target="_blank"
                        class="flex-1 py-1.5 bg-white text-[#602515] border border-[#602515]/20 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-50 transition-all"
                      >
                        <Icon icon="solar:eye-bold" />
                        <span>Pratinjau</span>
                      </a>
                      <button 
                        type="button"
                        @click="removeUploadedFile"
                        class="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-rose-100 transition-all"
                      >
                        <Icon icon="solar:trash-bin-trash-bold" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 7. Status dropdown (Manager only) -->
              <div v-if="isManager" class="space-y-1.5">
                <label class="block text-sm font-bold text-slate-700">Status Transaksi <span class="text-red-500">*</span></label>
                <select
                  v-model="form.status"
                  required
                  class="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#602515] bg-white font-semibold text-slate-700"
                >
                  <option value="pending">Tertunda (Pending Approval)</option>
                  <option value="confirmed">Terkonfirmasi (Disetujui)</option>
                  <option value="rejected">Ditolak (Rejected)</option>
                </select>
              </div>
            </div>

            <!-- Modal Footer -->
            <div class="p-5 border-t bg-slate-50 flex items-center justify-end gap-3">
              <button
                type="button"
                @click="closeModal"
                class="px-4 py-2 border rounded-lg text-slate-600 bg-white hover:bg-slate-50 text-sm font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                :disabled="saving || uploading"
                class="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                :class="modal.mode === 'create' ? 'bg-[#f8ae19] hover:bg-[#e09d0f]' : 'bg-[#602515] hover:bg-[#4d1d10]'"
              >
                <Icon
                  v-if="saving || uploading"
                  icon="solar:spinner-bold"
                  class="animate-spin text-lg"
                />
                <Icon v-else icon="solar:diskette-bold-duotone" class="text-lg" />
                <span>{{ saving ? 'Menyimpan...' : uploading ? 'Mengunggah...' : 'Simpan' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Delete Confirmation Modal -->
    <ConfirmModal
      :isOpen="deleteConfirm.show"
      title="Hapus Data Tabungan"
      :message="`Apakah Anda yakin ingin menghapus data transaksi tabungan senilai ${formatRupiah(deleteConfirm.item?.nominal || 0)} milik '${deleteConfirm.item?.userName}'? Tindakan ini bersifat permanen.`"
      confirmText="Ya, Hapus"
      cancelText="Batal"
      @confirm="deleteRecord"
      @cancel="cancelDelete"
    />

    <!-- Bank Account Form Modal (Add / Edit) -->
    <div
      v-if="accountModal.show"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in">
        <!-- Modal Header -->
        <div class="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h3 class="font-bold text-slate-800 text-base flex items-center gap-2">
            <Icon icon="solar:card-2-bold-duotone" class="text-[#602515]" />
            {{ accountModal.isEdit ? 'Ubah Rekening Bank' : 'Tambah Rekening Bank' }}
          </h3>
          <button @click="closeAccountModal" class="text-slate-400 hover:text-slate-600 transition-all p-1">
            <Icon icon="solar:close-circle-bold-duotone" class="text-xl" />
          </button>
        </div>

        <form @submit.prevent="saveBankAccount">
          <div class="p-6 space-y-4">
            <!-- Bank Name -->
            <div>
              <label class="text-xs font-bold text-slate-600 block mb-1">Nama Bank *</label>
              <input
                v-model="accountForm.bankName"
                type="text"
                placeholder="Contoh: BSI, Mandiri, BRI"
                required
                class="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#602515] focus:ring-1 focus:ring-[#602515] text-sm text-slate-800 transition-all placeholder:text-slate-400"
              />
            </div>

            <!-- Account Number -->
            <div>
              <label class="text-xs font-bold text-slate-600 block mb-1">Nomor Rekening *</label>
              <input
                v-model="accountForm.accountNumber"
                type="text"
                placeholder="Masukkan nomor rekening tanpa spasi/tanda baca"
                required
                class="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#602515] focus:ring-1 focus:ring-[#602515] text-sm text-slate-800 transition-all placeholder:text-slate-400"
              />
            </div>

            <!-- Account Owner Name -->
            <div>
              <label class="text-xs font-bold text-slate-600 block mb-1">Nama Pemilik Rekening (a.n.) *</label>
              <input
                v-model="accountForm.accountName"
                type="text"
                placeholder="Nama lengkap pemilik rekening"
                required
                class="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#602515] focus:ring-1 focus:ring-[#602515] text-sm text-slate-800 transition-all placeholder:text-slate-400"
              />
            </div>

            <!-- Status Active -->
            <div class="flex items-center gap-2 pt-2">
              <input
                id="acc-is-active"
                v-model="accountForm.isActive"
                type="checkbox"
                class="w-4 h-4 text-[#602515] border-slate-300 rounded focus:ring-[#602515] cursor-pointer"
              />
              <label for="acc-is-active" class="text-xs font-semibold text-slate-600 cursor-pointer select-none">
                Tandai sebagai rekening aktif
              </label>
            </div>
          </div>

          <!-- Footer -->
          <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              @click="closeAccountModal"
              class="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-all active:scale-95"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="accountModal.submitting"
              class="px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all shadow-sm hover:shadow-md active:scale-95 bg-[#602515] hover:bg-[#4d1d10] flex items-center gap-1.5"
            >
              <Icon v-if="accountModal.submitting" icon="eos-icons:loading" class="animate-spin text-sm" />
              <span>Simpan</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Bank Account Confirmation Modal -->
    <ConfirmModal
      :isOpen="deleteAccountConfirm.show"
      title="Hapus Rekening Tabungan"
      :message="`Apakah Anda yakin ingin menghapus rekening bank ${deleteAccountConfirm.item?.bankName} - ${deleteAccountConfirm.item?.accountNumber} atas nama '${deleteAccountConfirm.item?.accountName}'? Anggota tidak akan dapat melihat rekening ini lagi.`"
      confirmText="Ya, Hapus"
      cancelText="Batal"
      @confirm="deleteBankAccountRecord"
      @cancel="cancelDeleteAccount"
    />

    <!-- Toast Alerts -->
    <StatusModal
      :isOpen="statusModal.show"
      :type="statusModal.type"
      :title="statusModal.title"
      :message="statusModal.message"
      @close="statusModal.show = false"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from "vue";
import { Icon } from "@iconify/vue";
import StatCard from "@/components/ui/StatCard.vue";
import DataTable from "@/components/ui/DataTable.vue";
import ConfirmModal from "@/components/ui/ConfirmModal.vue";
import StatusModal from "@/components/ui/StatusModal.vue";
import { savingsApi, rolesApi } from "@/services/api";
import ExcelJS from "exceljs/dist/exceljs.min.js";
import { saveAs } from "file-saver";

// Columns configuration for table view
const columns = computed(() => {
  const base = [
    { field: "transferDate", label: "TANGGAL", sortable: true },
    { field: "type", label: "TIPE", sortable: true },
    { field: "nominal", label: "NOMINAL", sortable: true },
    { field: "status", label: "STATUS", sortable: true },
    { field: "receiptPath", label: "BUKTI & KETERANGAN" },
    { field: "action", label: "AKSI", align: "center", width: "w-36" },
  ];

  if (isManager.value) {
    return [
      { field: "select", type: "checkbox", width: "w-10", align: "center" },
      { field: "userName", label: "ANGGOTA PESANTREN", sortable: true },
      ...base
    ];
  }
  return base;
});

const balanceColumns = [
  { field: "userName", label: "ANGGOTA PESANTREN", sortable: true },
  { field: "totalDeposit", label: "TOTAL SETORAN", sortable: true },
  { field: "totalWithdrawal", label: "TOTAL PENARIKAN", sortable: true },
  { field: "balance", label: "SALDO AKTIF", sortable: true },
  { field: "action", label: "AKSI", align: "center", width: "w-36" },
];

// App States
const savings = ref([]);
const systemUsers = ref([]);
const memberBalances = ref([]);
const loading = ref(false);
const saving = ref(false);
const uploading = ref(false);
const uploadProgress = ref(0);
const viewMode = ref("table");
const balanceViewMode = ref("table");
const activeTab = ref("transactions");
const searchQuery = ref("");
const balanceSearchQuery = ref("");
const dateOption = ref("today"); // 'today' or 'custom'
const selectedTxIds = ref([]); // Store selected pending tx IDs

// Current user details loaded from storage
const currentUser = reactive({
  id: null,
  name: "",
  role: "",
});

// Roles permissions verification state
const isManager = ref(false);

// Pagination State Local
const pagination = reactive({
  page: 1,
  limit: 10,
});

const balancePagination = reactive({
  page: 1,
  limit: 10,
});

// Advanced Filters State
const filters = reactive({
  type: "",
  status: "",
  startDate: "",
  endDate: "",
  minNominal: null,
  maxNominal: null,
});

// Form and Modal States
const modal = reactive({
  show: false,
  mode: "create",
  error: "",
});

const form = reactive({
  id: null,
  userId: null,
  transferDate: "",
  nominal: null,
  receiptPath: "",
  type: "deposit",
  description: "",
  status: "pending",
});

const deleteConfirm = reactive({
  show: false,
  item: null,
});

const statusModal = reactive({
  show: false,
  type: "success",
  title: "",
  message: "",
});

// Bank Accounts States
const bankAccounts = ref([]);
const activeBankAccounts = computed(() => {
  return bankAccounts.value.filter((acc) => acc.isActive);
});

const accountModal = reactive({
  show: false,
  isEdit: false,
  submitting: false,
});

const accountForm = reactive({
  id: null,
  bankName: "",
  accountNumber: "",
  accountName: "",
  isActive: true,
});

const deleteAccountConfirm = reactive({
  show: false,
  item: null,
});

// Get all bank accounts
async function fetchBankAccounts() {
  try {
    const res = await savingsApi.getBankAccounts();
    if (res.success) {
      bankAccounts.value = res.data;
    }
  } catch (error) {
    console.error("Failed to fetch bank accounts:", error);
  }
}

function showActiveAccountWarning(action) {
  statusModal.type = "warning";
  statusModal.title = "Rekening Masih Aktif";
  statusModal.message = action === "edit"
    ? "Rekening yang berstatus aktif tidak dapat diubah detailnya. Silakan nonaktifkan terlebih dahulu."
    : "Rekening yang berstatus aktif tidak dapat dihapus. Silakan nonaktifkan terlebih dahulu.";
  statusModal.show = true;
}

// Copy to clipboard helper
function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
    .then(() => {
      statusModal.type = "success";
      statusModal.title = "Disalin";
      statusModal.message = `Nomor rekening ${text} berhasil disalin ke papan klip.`;
      statusModal.show = true;
      setTimeout(() => {
        if (statusModal.title === "Disalin" && statusModal.show) {
          statusModal.show = false;
        }
      }, 1500);
    })
    .catch((err) => {
      console.error("Copy failed:", err);
    });
}

// Open Account Modal (for Add or Edit)
function openAccountModal(item = null) {
  if (item) {
    accountModal.isEdit = true;
    accountForm.id = item.id;
    accountForm.bankName = item.bankName;
    accountForm.accountNumber = item.accountNumber;
    accountForm.accountName = item.accountName;
    accountForm.isActive = item.isActive;
  } else {
    accountModal.isEdit = false;
    accountForm.id = null;
    accountForm.bankName = "";
    accountForm.accountNumber = "";
    accountForm.accountName = "";
    accountForm.isActive = true;
  }
  accountModal.show = true;
}

// Close Account Modal
function closeAccountModal() {
  accountModal.show = false;
}

// Save Bank Account
async function saveBankAccount() {
  accountModal.submitting = true;
  try {
    const data = {
      bankName: accountForm.bankName,
      accountNumber: accountForm.accountNumber,
      accountName: accountForm.accountName,
      isActive: accountForm.isActive,
    };

    let res;
    if (accountModal.isEdit) {
      res = await savingsApi.updateBankAccount(accountForm.id, data);
    } else {
      res = await savingsApi.createBankAccount(data);
    }

    if (res.success) {
      statusModal.type = "success";
      statusModal.title = "Berhasil";
      statusModal.message = accountModal.isEdit
        ? "Rekening bank berhasil diperbarui."
        : "Rekening bank baru berhasil ditambahkan.";
      statusModal.show = true;
      closeAccountModal();
      await fetchBankAccounts();
    } else {
      alert(res.message || "Gagal menyimpan rekening bank");
    }
  } catch (error) {
    console.error("Save bank account error:", error);
    alert("Terjadi kesalahan saat menyimpan rekening");
  } finally {
    accountModal.submitting = false;
  }
}

// Toggle Account status
async function toggleAccountStatus(item) {
  try {
    const res = await savingsApi.updateBankAccount(item.id, {
      isActive: !item.isActive,
    });
    if (res.success) {
      statusModal.type = "success";
      statusModal.title = "Berhasil";
      statusModal.message = `Status rekening berhasil diubah menjadi ${!item.isActive ? 'Aktif' : 'Nonaktif'}.`;
      statusModal.show = true;
      await fetchBankAccounts();
    } else {
      alert(res.message || "Gagal mengubah status rekening");
    }
  } catch (error) {
    console.error("Toggle bank account status error:", error);
    alert("Terjadi kesalahan saat mengubah status rekening");
  }
}

// Open Delete Account Confirm
function confirmDeleteAccount(item) {
  deleteAccountConfirm.item = item;
  deleteAccountConfirm.show = true;
}

// Cancel Delete Account
function cancelDeleteAccount() {
  deleteAccountConfirm.show = false;
  deleteAccountConfirm.item = null;
}

// Delete Bank Account
async function deleteBankAccountRecord() {
  if (!deleteAccountConfirm.item) return;
  try {
    const res = await savingsApi.deleteBankAccount(deleteAccountConfirm.item.id);
    if (res.success) {
      statusModal.type = "success";
      statusModal.title = "Berhasil";
      statusModal.message = "Rekening bank berhasil dihapus.";
      statusModal.show = true;
      cancelDeleteAccount();
      await fetchBankAccounts();
    } else {
      alert(res.message || "Gagal menghapus rekening bank");
    }
  } catch (error) {
    console.error("Delete bank account error:", error);
    alert("Terjadi kesalahan saat menghapus rekening");
  }
}

// Helper: Format Rupiah Currency
function formatRupiah(value) {
  if (value === null || value === undefined) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

// Helper: Format Date strings
function formatFullDate(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Helper: Format Role into Indonesian
function formatRole(role) {
  const mapping = {
    admin: "Admin",
    teacher: "Ustadz/Guru",
    student: "Santri",
    parent: "Wali Santri",
    staff: "Staff",
    clinic: "Klinik",
  };
  return mapping[role] || role;
}

// Helper: Check if record is confirmed
function isConfirmed(item) {
  return item && item.status === "confirmed";
}

// Logic: Check user authority levels
async function checkUserRole() {
  const userStr = localStorage.getItem("user");
  if (userStr) {
    try {
      const parsed = JSON.parse(userStr);
      currentUser.id = parsed.id;
      currentUser.name = parsed.name || parsed.email?.split("@")[0] || "User";
      currentUser.role = parsed.role;
      
      if (parsed.role === "admin") {
        isManager.value = true;
      } else {
        const permRes = await rolesApi.getMyPermissions();
        if (permRes.success && Array.isArray(permRes.data)) {
          isManager.value = permRes.data.includes("/apps/savings/manage");
        }
      }
    } catch (e) {
      console.error("Failed to parse user or check permissions", e);
    }
  }
}

// Date selection logic
function setDateOption(option) {
  dateOption.value = option;
  if (option === "today") {
    form.transferDate = new Date().toISOString().split("T")[0];
  } else {
    form.transferDate = "";
  }
}

// Responsive View Mode Logic
function updateDefaultViewModes() {
  const isMobile = window.innerWidth < 768;
  const mode = isMobile ? "card" : "table";
  viewMode.value = mode;
  balanceViewMode.value = mode;
}

let resizeTimeout = null;
function handleResize() {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    const isMobile = window.innerWidth < 768;
    const currentMode = viewMode.value;
    const targetMode = isMobile ? "card" : "table";
    if (currentMode !== targetMode) {
      viewMode.value = targetMode;
      balanceViewMode.value = targetMode;
    }
  }, 150);
}

// Logic: Calculate Summary balances
const balanceSummary = computed(() => {
  if (isManager.value) {
    // Sum balances of all members
    let totalDeposit = 0;
    let totalWithdrawal = 0;
    memberBalances.value.forEach((m) => {
      totalDeposit += m.totalDeposit || 0;
      totalWithdrawal += m.totalWithdrawal || 0;
    });
    return {
      totalDeposit,
      totalWithdrawal,
      balance: totalDeposit - totalWithdrawal,
    };
  } else {
    // For non-manager, sum their own confirmed transactions directly from list
    let totalDeposit = 0;
    let totalWithdrawal = 0;
    savings.value.forEach((s) => {
      if (s.status === "confirmed") {
        if (s.type === "deposit") {
          totalDeposit += s.nominal;
        } else if (s.type === "withdrawal") {
          totalWithdrawal += s.nominal;
        }
      }
    });
    return {
      totalDeposit,
      totalWithdrawal,
      balance: totalDeposit - totalWithdrawal,
    };
  }
});

// Logic: Client-side Searching and Filtering of Transactions
const filteredSavings = computed(() => {
  let list = [...savings.value];

  // 1. Filter by search query (name or nominal or id)
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter(
      (s) =>
        s.userName?.toLowerCase().includes(q) ||
        s.userId?.toString().includes(q) ||
        s.nominal?.toString().includes(q) ||
        s.description?.toLowerCase().includes(q)
    );
  }

  // 2. Filter by type
  if (filters.type) {
    list = list.filter((s) => s.type === filters.type);
  }

  // 3. Filter by status
  if (filters.status) {
    list = list.filter((s) => s.status === filters.status);
  }

  // 4. Filter by date range
  if (filters.startDate) {
    list = list.filter((s) => s.transferDate >= filters.startDate);
  }
  if (filters.endDate) {
    list = list.filter((s) => s.transferDate <= filters.endDate);
  }

  // 5. Filter by nominal range
  if (filters.minNominal !== null && filters.minNominal !== "") {
    list = list.filter((s) => s.nominal >= filters.minNominal);
  }
  if (filters.maxNominal !== null && filters.maxNominal !== "") {
    list = list.filter((s) => s.nominal <= filters.maxNominal);
  }

  return list;
});

// Selectable transactions (only pending)
const selectableSavings = computed(() => {
  return filteredSavings.value.filter((s) => s.status === "pending");
});

// Bulk checkbox selection logic
const isAllSelected = computed(() => {
  const selectables = selectableSavings.value;
  if (selectables.length === 0) return false;
  return selectables.every((s) => selectedTxIds.value.includes(s.id));
});

function toggleSelectAll() {
  const selectables = selectableSavings.value;
  if (isAllSelected.value) {
    // Deselect all selectables
    selectedTxIds.value = selectedTxIds.value.filter(
      (id) => !selectables.some((s) => s.id === id)
    );
  } else {
    // Select all selectables
    selectables.forEach((s) => {
      if (!selectedTxIds.value.includes(s.id)) {
        selectedTxIds.value.push(s.id);
      }
    });
  }
}

// Logic: Client-side Pagination State output for transactions
const paginationState = computed(() => {
  const total = filteredSavings.value.length;
  const limit = pagination.limit;
  const page = pagination.page;
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    page,
    limit,
    total,
    totalPages,
  };
});

// Logic: Paginated items for transactions
const paginatedSavings = computed(() => {
  const start = (pagination.page - 1) * pagination.limit;
  const end = start + pagination.limit;
  return filteredSavings.value.slice(start, end).map((item, index) => ({
    ...item,
    id: start + index + 1,
    realId: item.id,
  }));
});

// Logic: Client-side Searching and Filtering of balances (for managers)
const filteredBalances = computed(() => {
  let list = [...memberBalances.value];
  if (balanceSearchQuery.value) {
    const q = balanceSearchQuery.value.toLowerCase();
    list = list.filter(
      (m) =>
        m.userName?.toLowerCase().includes(q) ||
        m.userEmail?.toLowerCase().includes(q) ||
        m.userId?.toString().includes(q)
    );
  }
  return list;
});

const balancePaginationState = computed(() => {
  const total = filteredBalances.value.length;
  const limit = balancePagination.limit;
  const page = balancePagination.page;
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    page,
    limit,
    total,
    totalPages,
  };
});

const paginatedBalances = computed(() => {
  const start = (balancePagination.page - 1) * balancePagination.limit;
  const end = start + balancePagination.limit;
  return filteredBalances.value.slice(start, end);
});

// Emitted callbacks for transactions
function onSearch(value) {
  searchQuery.value = value;
  pagination.page = 1;
}

function changeLimit(limit) {
  pagination.limit = limit;
  pagination.page = 1;
}

function changePage(page) {
  pagination.page = page;
}

// Emitted callbacks for balances
function onBalanceSearch(val) {
  balanceSearchQuery.value = val;
  balancePagination.page = 1;
}

function changeBalanceLimit(limit) {
  balancePagination.limit = limit;
  balancePagination.page = 1;
}

function changeBalancePage(page) {
  balancePagination.page = page;
}

function viewUserTransactions(item) {
  searchQuery.value = item.userName || String(item.userId);
  activeTab.value = "transactions";
  pagination.page = 1;
}

function resetFilters() {
  filters.type = "";
  filters.status = "";
  filters.startDate = "";
  filters.endDate = "";
  filters.minNominal = null;
  filters.maxNominal = null;
}

// Fetch all database records
async function loadData() {
  loading.value = true;
  try {
    const res = await savingsApi.getSavings();
    if (res.success) {
      savings.value = Array.isArray(res.data) ? res.data : [];
    }
    
    // Fetch registered bank accounts
    await fetchBankAccounts();
    
    // Check user role & permissions asynchronously
    await checkUserRole();

    // Load users list and balances summary if user is manager
    if (isManager.value) {
      if (systemUsers.value.length === 0) {
        const usersRes = await savingsApi.getUsers();
        if (usersRes.success) {
          systemUsers.value = usersRes.data || [];
        }
      }
      
      const balancesRes = await savingsApi.getBalances();
      if (balancesRes.success) {
        memberBalances.value = balancesRes.data || [];
      }
    } else {
      // Normal user load single balance
      const balanceRes = await savingsApi.getBalances(currentUser.id);
      if (balanceRes.success && balanceRes.data) {
        memberBalances.value = [balanceRes.data];
      }
    }
  } catch (e) {
    statusModal.type = "error";
    statusModal.title = "Gagal Memuat Data";
    statusModal.message = e.message || "Gagal memuat data tabungan";
    statusModal.show = true;
  } finally {
    loading.value = false;
  }
}

// Quick action update transaction status (Confirm/Reject)
async function updateTxStatus(id, status) {
  try {
    const res = await savingsApi.updateStatus(id, status);
    if (res.success) {
      statusModal.type = "success";
      statusModal.title = "Status Diperbarui";
      statusModal.message = res.message || "Status transaksi berhasil diperbarui.";
      statusModal.show = true;
      loadData();
    } else {
      throw new Error(res.message || "Gagal memperbarui status");
    }
  } catch (err) {
    statusModal.type = "error";
    statusModal.title = "Gagal Memperbarui";
    statusModal.message = err.message || "Gagal mengubah status konfirmasi transaksi.";
    statusModal.show = true;
  }
}

// Bulk Actions (Confirm / Reject Selected pending transactions)
async function bulkUpdateStatus(status) {
  if (selectedTxIds.value.length === 0) return;
  
  loading.value = true;
  const count = selectedTxIds.value.length;
  try {
    const promises = selectedTxIds.value.map((id) =>
      savingsApi.updateStatus(id, status)
    );
    const results = await Promise.all(promises);
    
    // Check if any failed
    const failed = results.filter((r) => !r.success);
    
    if (failed.length === 0) {
      statusModal.type = "success";
      statusModal.title = "Aksi Masal Berhasil";
      statusModal.message = `Berhasil ${status === 'confirmed' ? 'menyetujui' : 'menolak'} ${count} transaksi tabungan tertunda.`;
    } else {
      statusModal.type = "warning";
      statusModal.title = "Aksi Masal Selesai Sebagian";
      statusModal.message = `Berhasil memproses ${count - failed.length} transaksi, namun ${failed.length} transaksi gagal.`;
    }
    
    selectedTxIds.value = [];
    statusModal.show = true;
    loadData();
  } catch (err) {
    statusModal.type = "error";
    statusModal.title = "Gagal Aksi Masal";
    statusModal.message = err.message || "Terjadi kesalahan saat memproses aksi masal.";
    statusModal.show = true;
  } finally {
    loading.value = false;
  }
}

// File Upload Handler
async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    alert("Ukuran file bukti transfer tidak boleh melebihi 5MB.");
    return;
  }

  uploading.value = true;
  uploadProgress.value = 0;
  modal.error = "";
  try {
    const res = await savingsApi.uploadReceipt(file, (progress) => {
      uploadProgress.value = progress;
    });
    if (res.success && res.data?.url) {
      form.receiptPath = res.data.url;
    } else {
      throw new Error(res.message || "Gagal mengunggah file");
    }
  } catch (err) {
    modal.error = "Gagal mengunggah bukti transfer: " + (err.message || "Error");
  } finally {
    uploading.value = false;
    uploadProgress.value = 0;
  }
}

function removeUploadedFile() {
  form.receiptPath = "";
}

// Create record modal trigger
function openCreateModal() {
  modal.show = true;
  modal.mode = "create";
  modal.error = "";
  
  // Set default form attributes
  Object.assign(form, {
    id: null,
    userId: isManager.value ? null : currentUser.id,
    transferDate: new Date().toISOString().split("T")[0],
    nominal: null,
    receiptPath: "",
    type: "deposit",
    description: "",
    status: "pending",
  });
  
  dateOption.value = "today";
}

// Edit record modal trigger
function openEditModal(item) {
  modal.show = true;
  modal.mode = "edit";
  modal.error = "";

  Object.assign(form, {
    id: item.realId || item.id,
    userId: item.userId,
    transferDate: item.transferDate?.split("T")[0],
    nominal: item.nominal,
    receiptPath: item.receiptPath || "",
    type: item.type || "deposit",
    description: item.description || "",
    status: item.status || "pending",
  });

  // Decide date display option based on matching today's date
  const todayStr = new Date().toISOString().split("T")[0];
  const itemDateStr = item.transferDate?.split("T")[0];
  if (todayStr === itemDateStr) {
    dateOption.value = "today";
  } else {
    dateOption.value = "custom";
  }
}

function closeModal() {
  modal.show = false;
}

// Submit Form Create/Update Logic
async function submitForm() {
  if (saving.value || uploading.value) return;

  if (!form.userId) {
    modal.error = "Silakan tentukan anggota pesantren terlebih dahulu.";
    return;
  }
  if (!form.transferDate) {
    modal.error = "Pilih atau isi tanggal transaksi.";
    return;
  }
  if (!form.nominal || form.nominal <= 0) {
    modal.error = "Nominal transaksi harus bernilai lebih dari 0.";
    return;
  }

  saving.value = true;
  modal.error = "";

  try {
    const payload = {
      userId: form.userId,
      transferDate: form.transferDate,
      nominal: form.nominal,
      type: form.type,
      description: form.description || null,
      receiptPath: form.type === "deposit" ? (form.receiptPath || null) : null, // clear receipt if withdrawal
    };

    if (isManager.value) {
      payload.status = form.status;
    }

    let res;
    if (modal.mode === "create") {
      res = await savingsApi.createSaving(payload);
    } else {
      res = await savingsApi.updateSaving(form.id, payload);
    }

    if (res.success) {
      statusModal.type = "success";
      statusModal.title = modal.mode === "create" ? "Berhasil Ditambahkan" : "Berhasil Diperbarui";
      statusModal.message = res.message || "Data transaksi tabungan berhasil disimpan.";
      statusModal.show = true;
      closeModal();
      loadData();
    } else {
      throw new Error(res.message || "Gagal menyimpan data");
    }
  } catch (err) {
    modal.error = err.message || "Gagal menyimpan data";
  } finally {
    saving.value = false;
  }
}

// Delete Record Confirmations
function confirmDelete(item) {
  deleteConfirm.item = item;
  deleteConfirm.show = true;
}

// Cancel deletion
function cancelDelete() {
  deleteConfirm.show = false;
  deleteConfirm.item = null;
}

async function deleteRecord() {
  if (!deleteConfirm.item) return;

  const targetId = deleteConfirm.item.realId || deleteConfirm.item.id;
  try {
    const res = await savingsApi.deleteSaving(targetId);
    if (res.success) {
      statusModal.type = "success";
      statusModal.title = "Berhasil Dihapus";
      statusModal.message = "Transaksi tabungan berhasil dihapus.";
      statusModal.show = true;
      loadData();
    } else {
      throw new Error(res.message || "Gagal menghapus data");
    }
  } catch (err) {
    statusModal.type = "error";
    statusModal.title = "Gagal Menghapus";
    statusModal.message = err.message || "Terjadi kesalahan saat menghapus data tabungan.";
    statusModal.show = true;
  } finally {
    cancelDelete();
  }
}

// Logic: Excel Export using ExcelJS
async function exportToExcel() {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Data Tabungan");

    // Add Styles and Header
    sheet.columns = [
      { header: "No", key: "no", width: 8 },
      { header: "ID User", key: "userId", width: 12 },
      { header: "Nama Anggota", key: "userName", width: 30 },
      { header: "Tanggal", key: "transferDate", width: 20 },
      { header: "Tipe", key: "type", width: 15 },
      { header: "Nominal (Rp)", key: "nominal", width: 20 },
      { header: "Status", key: "status", width: 15 },
      { header: "Keterangan", key: "description", width: 35 },
    ];

    // Style Header Row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "602515" },
    };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };
    headerRow.height = 25;

    // Add Data rows
    filteredSavings.value.forEach((item, index) => {
      sheet.addRow({
        no: index + 1,
        userId: item.userId,
        userName: item.userName,
        transferDate: formatFullDate(item.transferDate),
        type: item.type === "deposit" ? "Setoran" : "Penarikan",
        nominal: item.nominal,
        status: item.status === "confirmed" ? "Terkonfirmasi" : item.status === "rejected" ? "Ditolak" : "Tertunda",
        description: item.description || "-",
      });
    });

    // Formatting nominal columns as currency
    sheet.getColumn("nominal").numFmt = '"Rp"#,##0';
    sheet.getColumn("no").alignment = { horizontal: "center" };
    sheet.getColumn("userId").alignment = { horizontal: "center" };
    sheet.getColumn("transferDate").alignment = { horizontal: "center" };
    sheet.getColumn("type").alignment = { horizontal: "center" };
    sheet.getColumn("status").alignment = { horizontal: "center" };

    // Set borders for all data rows
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin", color: { argb: "E2E8F0" } },
            left: { style: "thin", color: { argb: "E2E8F0" } },
            bottom: { style: "thin", color: { argb: "E2E8F0" } },
            right: { style: "thin", color: { argb: "E2E8F0" } },
          };
        });
      }
    });

    // Write file & trigger download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    
    const nowStr = new Date().toISOString().split("T")[0];
    saveAs(blob, `Rekap_Tabungan_Pesantren_${nowStr}.xlsx`);
  } catch (error) {
    console.error("Export Excel error:", error);
    statusModal.type = "error";
    statusModal.title = "Gagal Ekspor";
    statusModal.message = "Gagal memproses ekspor data ke Excel.";
    statusModal.show = true;
  }
}

onMounted(() => {
  checkUserRole();
  updateDefaultViewModes();
  window.addEventListener("resize", handleResize);
  loadData();
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
});
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.25s ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
