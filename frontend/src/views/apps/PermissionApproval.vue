<template>
  <div class="space-y-6 max-w-full">
    <!-- Tabs -->
    <div class="flex gap-4 border-b border-slate-200 px-4 md:px-0">
      <button
        @click="activeTab = 'approval'"
        class="pb-2 text-sm font-medium transition-colors border-b-2"
        :class="activeTab === 'approval' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'"
      >
        Persetujuan
      </button>
      <button
        @click="activeTab = 'recap'"
        class="pb-2 text-sm font-medium transition-colors border-b-2"
        :class="activeTab === 'recap' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'"
      >
        Rekap
      </button>
    </div>

    <!-- Tab Content: Approval -->
    <div v-show="activeTab === 'approval'" class="space-y-6">
      <DataTable
      :items="paginatedPermissions"
      :columns="columns"
      :loading="loading"
      :pagination="pagination"
      :viewMode="viewMode"
      title="Persetujuan Izin"
      description="Kelola pengajuan izin dari guru."
      icon="solar:check-read-bold-duotone"
      :search="search"
      @update:search="search = $event"
      @update:limit="
        pagination.limit = $event;
        pagination.page = 1;
      "
      @page-change="pagination.page = $event"
      @update:viewMode="viewMode = $event"
    >
      <!-- Filters -->
      <template #filters>
        <div class="space-y-4">
          <h3 class="font-medium text-slate-800 border-b border-slate-100 pb-2">
            Filter Status
          </h3>
          <div class="space-y-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="all"
                v-model="filterStatus"
                class="rounded-full text-indigo-600 focus:ring-indigo-500"
              />
              <span class="text-sm text-slate-600">Semua</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="pending"
                v-model="filterStatus"
                class="rounded-full text-indigo-600 focus:ring-indigo-500"
              />
              <span class="text-sm text-slate-600">Menunggu</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="approved"
                v-model="filterStatus"
                class="rounded-full text-indigo-600 focus:ring-indigo-500"
              />
              <span class="text-sm text-slate-600">Disetujui</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="rejected"
                v-model="filterStatus"
                class="rounded-full text-indigo-600 focus:ring-indigo-500"
              />
              <span class="text-sm text-slate-600">Ditolak</span>
            </label>
          </div>
        </div>
      </template>
      <!-- Cell: Teacher Name -->
      <template #cell-teacherName="{ item }">
        <div class="font-medium text-slate-800">
          {{ item.teacherName || "-" }}
          <div
            v-if="item.teacherNip || item.teacherDivision"
            class="text-xs text-slate-400 font-normal"
          >
            <span v-if="item.teacherNip">{{ item.teacherNip }}</span>
            <span v-if="item.teacherNip && item.teacherDivision"> · </span>
            <span v-if="item.teacherDivision">{{ item.teacherDivision }}</span>
          </div>
        </div>
      </template>

      <!-- Cell: Type -->
      <template #cell-type="{ item }">
        <span
          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
          :class="
            item.type === 'sick'
              ? 'bg-rose-100 text-rose-800'
              : item.type === 'leave'
              ? 'bg-purple-100 text-purple-800'
              : 'bg-blue-100 text-blue-800'
          "
        >
          {{ item.type === "sick" ? "Sakit" : item.type === "leave" ? "Cuti" : "Izin" }}
        </span>
      </template>

      <!-- Cell: Date -->
      <template #cell-startDate="{ item }">
        <div class="flex flex-col">
          <span class="font-medium text-slate-700">{{
            formatDate(item.startDate)
          }}</span>
          <span
            v-if="item.startDate !== item.endDate"
            class="text-slate-400 text-xs"
          >
            s.d {{ formatDate(item.endDate) }}
          </span>
        </div>
      </template>

      <!-- Cell: Reason -->
      <template #cell-reason="{ item }">
        <div class="max-w-xs">
          <p
            class="text-slate-600"
            :class="{ 'line-clamp-2': !expandedReasons.has(item.id) }"
            :title="item.reason"
          >
            {{ item.reason }}
          </p>
          <button
            v-if="item.reason && item.reason.length > 80"
            @click.stop="toggleExpandReason(item.id)"
            class="text-xs text-primary hover:text-amber-700 font-medium mt-0.5"
          >
            {{ expandedReasons.has(item.id) ? 'Sembunyikan' : 'Selengkapnya' }}
          </button>
        </div>
        <p class="text-xs text-slate-400 mt-1">
          {{ new Date(item.createdAt).toLocaleDateString("id-ID") }}
        </p>
      </template>

      <!-- Cell: Status -->
      <template #cell-status="{ item }">
        <div class="flex flex-col items-start gap-1">
          <span
            class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
            :class="{
              'bg-amber-100 text-amber-800': item.status === 'pending',
              'bg-emerald-100 text-emerald-800': item.status === 'approved',
              'bg-slate-100 text-slate-600': item.status === 'rejected',
            }"
          >
            <Icon :icon="statusIcon(item.status)" class="w-3.5 h-3.5" />
            <span class="capitalize">{{ formatStatus(item.status) }}</span>
          </span>

          <!-- Rejection Reason -->
          <div
            v-if="item.status === 'rejected' && item.rejectionReason"
            class="mt-1.5 flex items-start gap-1.5 px-2 py-1.5 bg-rose-50 border border-rose-100 rounded-lg max-w-[180px]"
          >
            <Icon
              icon="solar:info-circle-bold"
              class="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5"
            />
            <span class="text-[10px] leading-tight text-rose-700 font-medium">
              {{ item.rejectionReason }}
            </span>
          </div>
        </div>
      </template>

      <!-- Cell: Actions -->
      <template #cell-actions="{ item }">
        <div
          v-if="item.status === 'pending'"
          class="flex items-center justify-end gap-2"
        >
          <!-- Attachment Button -->
          <button
            v-if="item.attachment"
            @click="openAttachment(item.attachment)"
            class="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            title="Lihat Lampiran"
          >
            <Icon icon="solar:paperclip-bold-duotone" class="w-4 h-4" />
          </button>
          <button
            @click="updateStatus(item.id, 'approved')"
            :disabled="processing === item.id"
            class="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
            title="Setujui"
          >
            <Icon
              v-if="processing === item.id"
              icon="lucide:loader-2"
              class="w-4 h-4 animate-spin"
            />
            <Icon v-else icon="solar:check-circle-bold" class="w-4 h-4" />
          </button>
          <button
            @click="updateStatus(item.id, 'rejected')"
            :disabled="processing === item.id"
            class="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
            title="Tolak"
          >
            <Icon
              v-if="processing !== item.id"
              icon="solar:close-circle-bold"
              class="w-4 h-4"
            />
          </button>
        </div>
        <div v-else class="flex items-center justify-end gap-2">
          <button
            v-if="item.attachment"
            @click="openAttachment(item.attachment)"
            class="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            title="Lihat Lampiran"
          >
            <Icon icon="solar:paperclip-bold-duotone" class="w-4 h-4" />
          </button>
          <span class="text-xs text-slate-400 italic">Selesai</span>
        </div>
      </template>

      <!-- Card Item View -->
      <template #card-item="{ item }">
        <div
          class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-shadow h-full flex flex-col"
        >
          <div class="flex items-start justify-between gap-3 mb-3">
            <div>
              <div class="font-medium text-slate-800">
                {{ item.teacherName || "-" }}
              </div>
              <div
                v-if="item.teacherNip || item.teacherDivision"
                class="text-xs text-slate-400"
              >
                {{ item.teacherNip
                }}<span v-if="item.teacherNip && item.teacherDivision"> · </span
                >{{ item.teacherDivision }}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
                :class="
                  item.type === 'sick'
                    ? 'bg-rose-100 text-rose-800'
                    : item.type === 'leave'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-blue-100 text-blue-800'
                "
              >
                {{ item.type === "sick" ? "Sakit" : item.type === "leave" ? "Cuti" : "Izin" }}
              </span>
              <span
                class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
                :class="{
                  'bg-amber-100 text-amber-800': item.status === 'pending',
                  'bg-emerald-100 text-emerald-800': item.status === 'approved',
                  'bg-slate-100 text-slate-600': item.status === 'rejected',
                }"
              >
                <Icon :icon="statusIcon(item.status)" class="w-3 h-3" />
                {{ formatStatus(item.status) }}
              </span>
            </div>
          </div>
          <div class="text-sm text-slate-700 mb-2">
            <span class="font-medium">{{ formatDate(item.startDate) }}</span>
            <span v-if="item.startDate !== item.endDate" class="text-slate-500">
              s.d {{ formatDate(item.endDate) }}
            </span>
          </div>
          <div class="mb-3 mt-auto">
            <p
              class="text-sm text-slate-600"
              :class="{ 'line-clamp-2': !expandedReasons.has(item.id) }"
            >
              {{ item.reason }}
            </p>
            <button
              v-if="item.reason && item.reason.length > 60"
              @click.stop="toggleExpandReason(item.id)"
              class="text-xs text-primary hover:text-amber-700 font-medium mt-1"
            >
              {{ expandedReasons.has(item.id) ? 'Sembunyikan' : 'Baca selengkapnya' }}
            </button>
          </div>

          <!-- Rejection Reason -->
          <div
            v-if="item.status === 'rejected' && item.rejectionReason"
            class="mb-3 flex items-start gap-2 p-2.5 bg-rose-50 border border-rose-100 rounded-lg"
          >
            <Icon
              icon="solar:info-circle-bold"
              class="w-4 h-4 text-rose-500 shrink-0 mt-0.5"
            />
            <div class="text-xs text-rose-700 leading-relaxed">
              <span class="font-bold text-rose-800">Alasan Penolakan:</span>
              {{ item.rejectionReason }}
            </div>
          </div>

          <!-- Action Buttons for Pending -->
          <div
            v-if="item.status === 'pending'"
            class="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100"
          >
            <button
              v-if="item.attachment"
              @click="openAttachment(item.attachment)"
              class="flex-1 min-w-[100px] px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-1"
            >
              <Icon icon="solar:paperclip-bold-duotone" class="w-4 h-4" />
              Lampiran
            </button>
            <button
              @click="updateStatus(item.id, 'approved')"
              :disabled="processing === item.id"
              class="flex-1 min-w-[100px] px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-1"
            >
              <Icon
                v-if="processing === item.id"
                icon="lucide:loader-2"
                class="w-4 h-4 animate-spin"
              />
              <Icon v-else icon="solar:check-circle-bold" class="w-4 h-4" />
              Setujui
            </button>
            <button
              @click="updateStatus(item.id, 'rejected')"
              :disabled="processing === item.id"
              class="flex-1 min-w-[100px] px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-1"
            >
              <Icon
                v-if="processing !== item.id"
                icon="solar:close-circle-bold"
                class="w-4 h-4"
              />
              Tolak
            </button>
          </div>
          <div
            v-else
            class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100"
          >
            <button
              v-if="item.attachment"
              @click="openAttachment(item.attachment)"
              class="px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors text-sm font-medium flex items-center gap-1"
            >
              <Icon icon="solar:paperclip-bold-duotone" class="w-4 h-4" />
              Lampiran
            </button>
            <span class="text-xs text-slate-400 italic">Selesai</span>
          </div>
        </div>
      </template>
    </DataTable>
    </div>

    <!-- Tab Content: Recap -->
    <div v-show="activeTab === 'recap'" class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px] mx-4 md:mx-0">
      <!-- Header & Filters -->
      <div class="p-4 border-b border-slate-200 bg-slate-50 flex flex-col gap-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-bold text-slate-800">Rekap Perizinan</h2>
            <p class="text-sm text-slate-500">Ringkasan pengajuan izin per guru/staff yang sudah disetujui</p>
          </div>
          <div class="flex items-center gap-2 self-end sm:self-auto">
            <!-- View Toggle -->
            <div class="flex items-center bg-slate-200/50 rounded-lg p-1 border border-slate-200">
              <button
                @click="recapViewMode = 'table'"
                class="p-2 rounded-md transition-all flex items-center justify-center"
                :class="
                  recapViewMode === 'table'
                    ? 'bg-white shadow text-emerald-700'
                    : 'text-slate-500 hover:text-slate-700'
                "
                title="Tampilan Tabel"
              >
                <Icon icon="solar:list-bold-duotone" class="w-5 h-5" />
              </button>
              <button
                @click="recapViewMode = 'card'"
                class="p-2 rounded-md transition-all flex items-center justify-center"
                :class="
                  recapViewMode === 'card'
                    ? 'bg-white shadow text-emerald-700'
                    : 'text-slate-500 hover:text-slate-700'
                "
                title="Tampilan Kartu"
              >
                <Icon icon="solar:gallery-wide-bold-duotone" class="w-5 h-5" />
              </button>
            </div>

            <button
              @click="exportRecap"
              class="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium shadow-sm"
            >
              <Icon icon="file-icons:microsoft-excel" class="w-4 h-4" />
              <span class="hidden sm:inline">Export Excel</span>
            </button>
          </div>
        </div>

        <!-- Filters Row -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <!-- Divisi -->
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Divisi</label>
            <select
              v-model="recapFilters.division"
              class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">Semua Divisi</option>
              <option v-for="div in uniqueDivisions" :key="div" :value="div">{{ div }}</option>
            </select>
          </div>
          
          <!-- Gender -->
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Jenis Kelamin</label>
            <select
              v-model="recapFilters.gender"
              class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">Semua</option>
              <option value="male">Ikhwan</option>
              <option value="female">Akhwat</option>
            </select>
          </div>

          <!-- Date Range -->
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Dari Tanggal</label>
            <input
              type="date"
              v-model="recapFilters.startDate"
              class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Sampai Tanggal</label>
            <input
              type="date"
              v-model="recapFilters.endDate"
              class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>
      </div>

      <!-- Table View -->
      <div v-if="recapViewMode === 'table'" class="flex-1 overflow-auto max-h-[600px]">
        <table class="w-full text-left border-collapse min-w-max relative">
          <thead class="bg-slate-50 sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <tr>
              <th class="px-4 py-3 text-xs font-semibold text-slate-600 border-b border-slate-200 w-12 text-center bg-slate-50">No</th>
              <th class="px-4 py-3 text-xs font-semibold text-slate-600 border-b border-slate-200 bg-slate-50">Nama Lengkap</th>
              <th class="px-4 py-3 text-xs font-semibold text-slate-600 border-b border-slate-200 bg-slate-50">Divisi</th>
              <th class="px-4 py-3 text-xs font-semibold text-slate-600 border-b border-slate-200 text-center bg-slate-50">L/P</th>
              <th class="px-4 py-3 text-xs font-semibold text-slate-600 border-b border-slate-200 text-center bg-slate-50">Sakit</th>
              <th class="px-4 py-3 text-xs font-semibold text-slate-600 border-b border-slate-200 text-center bg-slate-50">Cuti</th>
              <th class="px-4 py-3 text-xs font-semibold text-slate-600 border-b border-slate-200 text-center bg-slate-50">Izin</th>
              <th class="px-4 py-3 text-xs font-semibold text-slate-600 border-b border-slate-200 text-center bg-slate-50">Total</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="recapData.length === 0">
              <td colspan="8" class="px-4 py-8 text-center text-slate-500 text-sm">
                Tidak ada data rekap perizinan.
              </td>
            </tr>
            <tr v-for="(item, idx) in recapData" :key="item.teacherId" class="hover:bg-slate-50 transition-colors">
              <td class="px-4 py-3 text-sm text-slate-600 text-center">{{ idx + 1 }}</td>
              <td class="px-4 py-3">
                <div class="font-medium text-slate-800">{{ item.teacherName || '-' }}</div>
                <div class="text-xs text-slate-400">{{ item.teacherNip || '-' }}</div>
              </td>
              <td class="px-4 py-3 text-sm text-slate-600">{{ item.teacherDivision || '-' }}</td>
              <td class="px-4 py-3 text-sm text-slate-600 text-center">{{ item.teacherGender === 'male' ? 'L' : item.teacherGender === 'female' ? 'P' : '-' }}</td>
              <td class="px-4 py-3 text-sm font-medium text-rose-600 text-center">{{ item.sickCount }}</td>
              <td class="px-4 py-3 text-sm font-medium text-purple-600 text-center">{{ item.leaveCount }}</td>
              <td class="px-4 py-3 text-sm font-medium text-blue-600 text-center">{{ item.permitCount }}</td>
              <td class="px-4 py-3 text-sm font-bold text-slate-800 text-center bg-slate-50/50">{{ item.totalCount }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Card View -->
      <div v-else-if="recapViewMode === 'card'" class="flex-1 overflow-auto max-h-[600px] p-4 bg-slate-50/30">
        <div v-if="recapData.length === 0" class="p-12 text-center text-slate-500 text-sm border-2 border-dashed border-slate-200 rounded-xl">
          Tidak ada data rekap perizinan.
        </div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="(item, idx) in recapData" :key="item.teacherId" class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div class="flex items-start justify-between gap-3 mb-4">
              <div>
                <div class="font-bold text-slate-800 text-base">{{ item.teacherName || '-' }}</div>
                <div class="text-xs text-slate-500 mt-0.5">{{ item.teacherNip || '-' }} <span v-if="item.teacherNip && item.teacherDivision">·</span> {{ item.teacherDivision || '-' }}</div>
              </div>
              <div class="flex items-center">
                <span class="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">{{ item.teacherGender === 'male' ? 'L' : item.teacherGender === 'female' ? 'P' : '-' }}</span>
              </div>
            </div>
            
            <div class="grid grid-cols-4 gap-2 text-center">
              <div class="bg-rose-50 rounded-lg p-2 border border-rose-100/50 flex flex-col justify-center">
                <div class="text-xl font-bold text-rose-600">{{ item.sickCount }}</div>
                <div class="text-[10px] text-rose-600/80 font-medium uppercase tracking-wider mt-1">Sakit</div>
              </div>
              <div class="bg-purple-50 rounded-lg p-2 border border-purple-100/50 flex flex-col justify-center">
                <div class="text-xl font-bold text-purple-600">{{ item.leaveCount }}</div>
                <div class="text-[10px] text-purple-600/80 font-medium uppercase tracking-wider mt-1">Cuti</div>
              </div>
              <div class="bg-blue-50 rounded-lg p-2 border border-blue-100/50 flex flex-col justify-center">
                <div class="text-xl font-bold text-blue-600">{{ item.permitCount }}</div>
                <div class="text-[10px] text-blue-600/80 font-medium uppercase tracking-wider mt-1">Izin</div>
              </div>
              <div class="bg-slate-100 rounded-lg p-2 border border-slate-200/50 flex flex-col justify-center">
                <div class="text-xl font-bold text-slate-700">{{ item.totalCount }}</div>
                <div class="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-1">Total</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Approval Modal with Salary Toggle -->
    <Teleport to="body">
      <transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="approvalModal.show"
          class="fixed inset-0 z-[9999] flex items-center justify-center px-4"
        >
          <div
            class="absolute inset-0 bg-black/40 backdrop-blur-sm"
            @click="approvalModal.show = false"
          ></div>

          <div
            class="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full relative z-10 text-center"
          >
            <!-- Icon -->
            <div
              class="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6"
              :class="
                approvalModal.isApprove
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-red-100 text-red-600'
              "
            >
              <Icon
                :icon="
                  approvalModal.isApprove
                    ? 'solar:check-circle-bold'
                    : 'solar:close-circle-bold'
                "
                width="48"
              />
            </div>

            <h3 class="text-xl font-bold text-slate-800 mb-2">
              {{
                approvalModal.isApprove
                  ? "Setujui Pengajuan?"
                  : "Tolak Pengajuan?"
              }}
            </h3>
            <p class="text-slate-500 text-sm mb-6">
              {{
                approvalModal.isApprove
                  ? "Pengajuan izin akan disetujui dan record absensi otomatis dibuat."
                  : "Pengajuan izin ini akan ditolak."
              }}
            </p>

            <!-- Rejection Reason Input -->
            <div
              v-if="!approvalModal.isApprove"
              class="bg-rose-50 rounded-xl p-4 mb-6 text-left"
            >
              <label class="block text-sm font-medium text-rose-700 mb-2">
                Alasan Penolakan <span class="text-rose-500">*</span>
              </label>
              <textarea
                v-model="approvalModal.rejectionReason"
                rows="3"
                class="w-full px-3 py-2 bg-white border border-rose-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="Jelaskan alasan penolakan..."
              ></textarea>
            </div>

            <!-- Salary Deduction Toggle (Only for Approve) -->
            <div
              v-if="approvalModal.isApprove"
              class="bg-slate-50 rounded-xl p-4 mb-6 text-left"
            >
              <p class="text-sm font-medium text-slate-700 mb-3">
                Potong Gaji?
              </p>
              <div class="flex gap-3">
                <button
                  @click="approvalModal.deductSalary = true"
                  class="flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all border-2"
                  :class="
                    approvalModal.deductSalary
                      ? 'border-rose-500 bg-rose-50 text-rose-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  "
                >
                  <Icon
                    icon="solar:minus-circle-bold"
                    class="w-5 h-5 inline mr-2"
                  />
                  Ya, Potong
                </button>
                <button
                  @click="approvalModal.deductSalary = false"
                  class="flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all border-2"
                  :class="
                    !approvalModal.deductSalary
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  "
                >
                  <Icon
                    icon="solar:check-circle-bold"
                    class="w-5 h-5 inline mr-2"
                  />
                  Tidak Potong
                </button>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-3">
              <button
                @click="approvalModal.show = false"
                class="flex-1 py-3 px-6 rounded-xl font-bold transition-all border-2 border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                @click="executeAction"
                :disabled="processing !== null"
                class="flex-1 py-3 px-6 rounded-xl font-bold transition-all shadow-lg disabled:opacity-50"
                :class="
                  approvalModal.isApprove
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                "
              >
                <span
                  v-if="processing"
                  class="flex items-center justify-center gap-2"
                >
                  <Icon
                    icon="solar:spinner-line-duotone"
                    class="animate-spin"
                    width="20"
                  />
                  Memproses...
                </span>
                <span v-else>
                  {{ approvalModal.isApprove ? "Ya, Setujui" : "Ya, Tolak" }}
                </span>
              </button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- Attachment Viewer Modal -->
    <Teleport to="body">
      <transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="attachmentModal.show"
          class="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
        >
          <!-- Close Button -->
          <button
            @click="attachmentModal.show = false"
            class="absolute top-4 right-4 z-20 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <Icon icon="solar:close-circle-bold" class="w-8 h-8" />
          </button>

          <!-- Image Viewer -->
          <img
            v-if="isImageAttachment"
            :src="attachmentFullUrl"
            alt="Lampiran"
            class="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          />

          <!-- PDF Viewer -->
          <iframe
            v-else
            :src="attachmentFullUrl"
            class="w-full h-[90vh] max-w-4xl rounded-lg bg-white shadow-2xl"
          ></iframe>
        </div>
      </transition>
    </Teleport>
    <!-- Status Modal -->
    <StatusModal
      :isOpen="statusModal.isOpen"
      :type="statusModal.type"
      :title="statusModal.title"
      :message="statusModal.message"
      @close="closeStatusModal"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from "vue";
import { Icon } from "@iconify/vue";
import { permissionsApi } from "@/services/api";
import DataTable from "@/components/ui/DataTable.vue";
import StatusModal from "@/components/ui/StatusModal.vue";
import { exportPermissionRecapToExcel } from "@/services/exports/permissionRecapExporter";

// Tabs State
const activeTab = ref("approval");

// Responsive default: card for mobile (<768px), table for desktop
const isDesktop = window.matchMedia("(min-width: 768px)").matches;
const viewMode = ref(isDesktop ? "table" : "card");
const recapViewMode = ref(isDesktop ? "table" : "card");

const permissions = ref([]);
const loading = ref(false);
const processing = ref(null);
const filterStatus = ref("all");
const search = ref("");
const expandedReasons = ref(new Set());

// Recap State
const recapFilters = reactive({
  division: "",
  gender: "",
  startDate: "",
  endDate: "",
});

const uniqueDivisions = computed(() => {
  const divs = new Set();
  permissions.value.forEach(p => {
    if (p.teacherDivision) divs.add(p.teacherDivision);
  });
  return Array.from(divs).sort();
});

const recapData = computed(() => {
  // 1. Filter permissions based on recapFilters
  // Only count approved permissions for the recap
  let filtered = permissions.value.filter(p => p.status === 'approved'); 

  if (recapFilters.division) {
    filtered = filtered.filter(p => p.teacherDivision === recapFilters.division);
  }
  if (recapFilters.gender) {
    filtered = filtered.filter(p => p.teacherGender === recapFilters.gender);
  }
  if (recapFilters.startDate) {
    const start = new Date(recapFilters.startDate);
    filtered = filtered.filter(p => new Date(p.startDate) >= start);
  }
  if (recapFilters.endDate) {
    const end = new Date(recapFilters.endDate);
    filtered = filtered.filter(p => new Date(p.startDate) <= end);
  }

  // 2. Group by teacherId
  const map = new Map();
  filtered.forEach(p => {
    if (!map.has(p.teacherId)) {
      map.set(p.teacherId, {
        teacherId: p.teacherId,
        teacherName: p.teacherName,
        teacherNip: p.teacherNip,
        teacherDivision: p.teacherDivision,
        teacherGender: p.teacherGender,
        sickCount: 0,
        leaveCount: 0,
        permitCount: 0,
        totalCount: 0
      });
    }
    const t = map.get(p.teacherId);
    if (p.type === 'sick') t.sickCount++;
    else if (p.type === 'leave') t.leaveCount++;
    else if (p.type === 'permit') t.permitCount++;
    t.totalCount++;
  });

  // Convert to array and sort by name
  return Array.from(map.values()).sort((a, b) => {
    const nameA = a.teacherName || "";
    const nameB = b.teacherName || "";
    return nameA.localeCompare(nameB);
  });
});

async function exportRecap() {
  try {
    await exportPermissionRecapToExcel(recapData.value, recapFilters);
  } catch (error) {
    console.error("Export error:", error);
    showStatus("error", "Gagal Export", "Gagal mengekspor data ke Excel.");
  }
}

function toggleExpandReason(id) {
  if (expandedReasons.value.has(id)) {
    expandedReasons.value.delete(id);
  } else {
    expandedReasons.value.add(id);
  }
  expandedReasons.value = new Set(expandedReasons.value);
}

// Pagination State
const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
});

const columns = [
  { field: "teacherName", label: "Nama Guru", sortable: true },
  { field: "type", label: "Jenis", sortable: true },
  { field: "startDate", label: "Tanggal", sortable: true },
  { field: "reason", label: "Alasan", sortable: false },
  { field: "status", label: "Status", sortable: true },
  { field: "actions", label: "Aksi", sortable: false, align: "right" },
];

// Attachment Modal State
const attachmentModal = reactive({
  show: false,
  url: "",
});

// Computed for attachment viewer
const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "http://localhost:3000" : "");

const attachmentFullUrl = computed(() => {
  if (!attachmentModal.url) return "";
  // If already absolute URL, return as is
  if (attachmentModal.url.startsWith("http")) return attachmentModal.url;
  // Otherwise prepend BASE_URL
  return `${BASE_URL}${attachmentModal.url}`;
});

const isImageAttachment = computed(() => {
  const url = attachmentModal.url.toLowerCase();
  return (
    url.endsWith(".jpg") ||
    url.endsWith(".jpeg") ||
    url.endsWith(".png") ||
    url.endsWith(".gif") ||
    url.endsWith(".webp")
  );
});

function openAttachment(url) {
  attachmentModal.url = url;
  attachmentModal.show = true;
}

// Approval Modal State
const approvalModal = reactive({
  show: false,
  isApprove: true,
  deductSalary: true, // Default: potong gaji
  rejectionReason: "",
  actionId: null,
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

function closeStatusModal() {
  statusModal.isOpen = false;
}

const filteredPermissions = computed(() => {
  let data = [...permissions.value];

  // Filter Status
  if (filterStatus.value !== "all") {
    data = data.filter((p) => p.status === filterStatus.value);
  }

  // Filter Search
  if (search.value) {
    const q = search.value.toLowerCase();
    data = data.filter(
      (p) =>
        (p.teacherName || "").toLowerCase().includes(q) ||
        p.reason.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q) ||
        formatStatus(p.status).toLowerCase().includes(q)
    );
  }

  return data;
});

const paginatedPermissions = computed(() => {
  const start = (pagination.page - 1) * pagination.limit;
  const end = start + pagination.limit;

  // Update total counts
  pagination.total = filteredPermissions.value.length;
  pagination.totalPages = Math.ceil(pagination.total / pagination.limit);

  return filteredPermissions.value.slice(start, end);
});

// Reset page when filter changes
watch([search, filterStatus], () => {
  pagination.page = 1;
});

function formatDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatStatus(s) {
  if (s === "all") return "Semua";
  if (s === "pending") return "Menunggu";
  if (s === "approved") return "Disetujui";
  if (s === "rejected") return "Ditolak";
  return s;
}

function statusIcon(status) {
  if (status === "approved") return "solar:check-circle-bold";
  if (status === "rejected") return "solar:close-circle-bold";
  return "solar:clock-circle-bold";
}

async function fetchPermissions() {
  loading.value = true;
  try {
    const res = await permissionsApi.getAllPermissions();
    if (res.success) {
      permissions.value = res.data;
    }
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

function updateStatus(id, status) {
  approvalModal.isApprove = status === "approved";
  approvalModal.deductSalary = true; // Reset to default
  approvalModal.rejectionReason = ""; // Reset reason
  approvalModal.actionId = id;
  approvalModal.show = true;
}

async function executeAction() {
  if (!approvalModal.actionId) return;

  const id = approvalModal.actionId;
  const status = approvalModal.isApprove ? "approved" : "rejected";
  processing.value = id;

  try {
    await permissionsApi.updateStatus(
      id,
      status,
      approvalModal.deductSalary,
      approvalModal.rejectionReason
    );
    // Optimistic update
    const idx = permissions.value.findIndex((p) => p.id === id);
    if (idx !== -1) {
      permissions.value[idx].status = status;
      // Update rejection reason locally if rejected
      if (status === "rejected") {
        permissions.value[idx].rejectionReason = approvalModal.rejectionReason;
      }
    }

    showStatus(
      "success",
      status === "approved" ? "Berhasil Disetujui" : "Berhasil Ditolak",
      status === "approved"
        ? "Pengajuan izin berhasil disetujui."
        : "Pengajuan izin berhasil ditolak."
    );
  } catch (e) {
    console.error(e);
    showStatus(
      "error",
      "Gagal Memproses",
      e.message || "Terjadi kesalahan saat memproses pengajuan."
    );
  } finally {
    processing.value = null;
    approvalModal.show = false;
    approvalModal.actionId = null;
  }
}

onMounted(() => {
  fetchPermissions();
});
</script>
