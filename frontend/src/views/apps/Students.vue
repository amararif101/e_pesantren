<template>
  <div>
    <DataTable
      title="Data Santri"
      description="Kelola data santri — terhubung ke API"
      icon="solar:users-group-rounded-line-duotone"
      :items="students"
      :columns="columns"
      :loading="loading"
      v-model:viewMode="viewMode"
      v-model:search="filters.fullName"
      :pagination="pagination"
      :sortBy="pagination.sort_by"
      :sortOrder="pagination.order"
      @update:search="onSearchInput"
      @update:limit="changeLimit"
      @page-change="changePage"
      @sort="sortColumn"
    >
      <!-- Header Actions -->
      <template #header-actions>
        <!-- Bulk Action Bar (shown when items selected) -->
        <div v-if="selectedIds.length > 0" class="flex items-center gap-3 mr-3">
          <span class="text-sm text-slate-600 font-medium">
            {{ selectedIds.length }} dipilih
          </span>

          <!-- Bulk Actions Dropdown -->
          <div class="relative">
            <button
              @click="showBulkActions = !showBulkActions"
              class="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-200"
            >
              <Icon
                icon="solar:settings-minimalistic-bold-duotone"
                class="text-lg"
              />
              <span>Aksi Massal</span>
              <Icon icon="solar:alt-arrow-down-line-duotone" class="text-lg" />
            </button>

            <!-- Backdrop -->
            <div
              v-if="showBulkActions"
              class="fixed inset-0 z-20"
              @click="showBulkActions = false"
            ></div>

            <!-- Dropdown Menu -->
            <div
              v-if="showBulkActions"
              class="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-30"
            >
              <div
                class="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider"
              >
                Ubah Status
              </div>
              <button
                @click="bulkUpdateStatus('active')"
                class="w-full px-4 py-2 text-left text-sm hover:bg-green-50 text-slate-700 flex items-center gap-2"
              >
                <div class="w-2 h-2 rounded-full bg-green-500"></div>
                Aktif
              </button>
              <button
                @click="bulkUpdateStatus('inactive')"
                class="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 text-slate-700 flex items-center gap-2"
              >
                <div class="w-2 h-2 rounded-full bg-slate-400"></div>
                Tidak Aktif
              </button>
              <button
                @click="bulkUpdateStatus('graduated')"
                class="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 text-slate-700 flex items-center gap-2"
              >
                <div class="w-2 h-2 rounded-full bg-blue-500"></div>
                Lulus
              </button>
              <button
                @click="bulkUpdateStatus('transferred')"
                class="w-full px-4 py-2 text-left text-sm hover:bg-amber-50 text-slate-700 flex items-center gap-2"
              >
                <div class="w-2 h-2 rounded-full bg-amber-500"></div>
                Pindah
              </button>
              <button
                @click="bulkUpdateStatus('dropped')"
                class="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-slate-700 flex items-center gap-2"
              >
                <div class="w-2 h-2 rounded-full bg-red-500"></div>
                Keluar
              </button>

              <div class="border-t border-slate-100 my-2"></div>

              <button
                @click="confirmBulkDelete"
                class="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
              >
                <Icon icon="solar:trash-bin-trash-bold-duotone" />
                Hapus Terpilih
              </button>
            </div>
          </div>

          <button
            @click="clearSelection"
            class="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            title="Batalkan pilihan"
          >
            <Icon icon="solar:close-circle-line-duotone" class="text-lg" />
          </button>
        </div>

        <button
          @click="openCreate"
          :disabled="saving"
          class="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
          style="background: #602515"
        >
          <Icon icon="solar:add-circle-line-duotone" class="text-lg" />
          <span>Tambah Santri</span>
        </button>

        <button
          @click="showImportModal = true"
          :disabled="saving"
          class="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-[#602515] text-[#602515] hover:bg-[#602515] hover:text-white transition-colors"
        >
          <Icon icon="solar:document-add-line-duotone" class="text-lg" />
          <span>Import Excel</span>
        </button>
      </template>

      <!-- Filters -->
      <template #filters="{ close }">
        <div class="space-y-3">
          <div>
            <label class="text-xs font-medium text-slate-500 mb-1 block"
              >Gender</label
            >
            <select
              v-model="filters.gender"
              class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              @change="applyFilters"
            >
              <option value="">Semua Gender</option>
              <option value="male">Ikhwan</option>
              <option value="female">Akhwat</option>
            </select>
          </div>
          <div>
            <label class="text-xs font-medium text-slate-500 mb-1 block"
              >Status</label
            >
            <select
              v-model="filters.status"
              class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              @change="applyFilters"
            >
              <option value="">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Tidak Aktif</option>
              <option value="graduated">Lulus</option>
            </select>
          </div>
          <button
            @click="
              resetFilters();
              close();
            "
            class="w-full px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Reset Filter
          </button>
        </div>
      </template>

      <!-- Header Checkbox -->
      <template #header-checkbox>
        <input
          type="checkbox"
          class="rounded border-slate-300 text-[#602515] focus:ring-[#602515]"
          :checked="isAllSelected"
          :indeterminate="isIndeterminate"
          @change="toggleSelectAll"
        />
      </template>

      <!-- Cell: Checkbox -->
      <template #cell-checkbox="{ item }">
        <input
          type="checkbox"
          class="rounded border-slate-300 text-[#602515] focus:ring-[#602515]"
          :checked="selectedIds.includes(item.id)"
          @change="toggleSelect(item.id)"
        />
      </template>

      <!-- Cell: FullName -->
      <template #cell-fullName="{ item }">
        <button
          @click="openView(item)"
          class="font-medium text-slate-800 hover:text-[#f8ae19] transition-colors text-left"
        >
          {{ item.fullName }}
        </button>
        <div class="text-xs text-slate-400 mt-0.5">
          {{ item.email || "No Email" }}
        </div>
      </template>

      <!-- Cell: NIS -->
      <template #cell-nis="{ item }">
        <button
          @click="openView(item)"
          class="text-[#602515] hover:text-[#f8ae19] hover:underline transition-colors font-mono"
        >
          {{ item.nis }}
        </button>
      </template>

      <!-- Cell: NIS Santri -->
      <template #cell-nisSantri="{ item }">
        <span class="font-mono text-slate-600">{{
          item.nisSantri || "-"
        }}</span>
      </template>

      <!-- Cell: NISN -->
      <template #cell-nisn="{ item }">
        <span class="font-mono text-slate-600">{{ item.nisn || "-" }}</span>
      </template>

      <!-- Cell: Phone -->
      <template #cell-phone="{ item }">
        <span class="text-slate-500">{{ item.phone || "-" }}</span>
      </template>

      <!-- Cell: Gender -->
      <template #cell-gender="{ item }">
        <div class="flex items-center gap-1.5">
          <Icon
            :icon="
              item.gender === 'male' ? 'solar:men-bold' : 'solar:women-bold'
            "
            :class="item.gender === 'male' ? 'text-[#602515]' : 'text-pink-500'"
            class="text-base"
          />
          <span class="text-slate-600">{{
            item.gender === "male" ? "Ikhwan" : "Akhwat"
          }}</span>
        </div>
      </template>

      <!-- Cell: Class -->
      <template #cell-class="{ item }">
        <span class="text-slate-600 font-medium">{{ item.class ? item.class.name : "-" }}</span>
      </template>

      <!-- Cell: Halaqah -->
      <template #cell-halaqah="{ item }">
        <span class="text-slate-600 font-medium">{{ item.halaqah ? item.halaqah.name : "-" }}</span>
      </template>

      <!-- Cell: Room -->
      <template #cell-room="{ item }">
        <span class="text-slate-600 font-medium">{{ item.room ? item.room.name : "-" }}</span>
      </template>

      <!-- Cell: Status -->
      <template #cell-status="{ item }">
        <span
          class="px-2 py-0.5 rounded text-xs font-medium"
          :class="{
            'bg-green-100 text-green-700': item.status === 'active',
            'bg-slate-100 text-slate-600': item.status === 'inactive',
            'bg-blue-100 text-blue-700': item.status === 'graduated',
          }"
        >
          {{
            item.status === "active"
              ? "Aktif"
              : item.status === "inactive"
                ? "Tidak Aktif"
                : "Lulus"
          }}
        </span>
      </template>

      <!-- Cell: Action -->
      <template #cell-action="{ item }">
        <div class="flex items-center justify-center gap-1">
          <button
            @click="openEdit(item)"
            :disabled="saving"
            title="Edit"
            class="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <Icon icon="solar:pen-line-duotone" class="text-base" />
          </button>
          <button
            @click="confirmDelete(item)"
            :disabled="saving"
            title="Hapus"
            class="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-rose-600 transition-colors"
          >
            <Icon icon="solar:trash-bin-trash-line-duotone" class="text-base" />
          </button>
        </div>
      </template>

      <!-- Card Item View -->
      <template #card-item="{ item }">
        <div
          class="group bg-white rounded-xl p-4 border border-slate-200 hover:border-[#602515] hover:shadow-md transition-all duration-300 relative overflow-hidden"
        >
          <!-- Header -->
          <div class="flex items-start justify-between mb-3 pl-2">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-amber-50 group-hover:border-amber-100 transition-colors"
              >
                <Icon
                  :icon="
                    item.gender === 'male'
                      ? 'solar:men-bold'
                      : 'solar:women-bold'
                  "
                  :class="
                    item.gender === 'male' ? 'text-[#602515]' : 'text-pink-500'
                  "
                  class="text-lg"
                />
              </div>
              <div>
                <h3 class="font-semibold text-slate-800 line-clamp-1">
                  {{ item.fullName }}
                </h3>
                <p class="text-xs text-slate-500 font-mono">
                  {{ item.nis }}
                  <span v-if="item.nisSantri" class="text-slate-400"
                    >| {{ item.nisSantri }}</span
                  >
                </p>
              </div>
            </div>
            <span
              class="px-2 py-0.5 rounded text-xs font-medium"
              :class="{
                'bg-green-100 text-green-700': item.status === 'active',
                'bg-slate-100 text-slate-600': item.status === 'inactive',
                'bg-blue-100 text-blue-700': item.status === 'graduated',
              }"
            >
              {{
                item.status === "active"
                  ? "Aktif"
                  : item.status === "inactive"
                    ? "Tidak Aktif"
                    : "Lulus"
              }}
            </span>
          </div>

          <!-- Info Grid -->
          <div class="grid grid-cols-2 gap-y-2 gap-x-4 pl-2 text-sm mb-3">
            <div class="flex items-center gap-2 text-slate-600">
              <Icon icon="solar:book-bookmark-bold-duotone" class="text-slate-400" />
              <span class="truncate">{{ item.class ? item.class.name : "-" }}</span>
            </div>
            <div class="flex items-center gap-2 text-slate-600">
              <Icon icon="solar:bed-bold-duotone" class="text-slate-400" />
              <span class="truncate">{{ item.room ? item.room.name : "-" }}</span>
            </div>
            <div class="col-span-2 flex items-center gap-2 text-slate-600">
              <Icon icon="solar:users-group-two-rounded-bold-duotone" class="text-slate-400" />
              <span class="truncate">{{ item.halaqah ? item.halaqah.name : "-" }}</span>
            </div>
            <div class="col-span-2 flex items-center gap-2 text-slate-600">
              <Icon
                icon="solar:phone-calling-line-duotone"
                class="text-slate-400"
              />
              <span>{{ item.phone || "-" }}</span>
            </div>
          </div>

          <!-- Footer status -->
          <div
            class="flex items-center justify-between pl-2 pt-3 border-t border-slate-50"
          >
            <button
              @click="openView(item)"
              class="text-xs font-medium text-[#602515] hover:underline"
            >
              Lihat Detail
            </button>
            <div class="flex gap-1">
              <button
                @click="openEdit(item)"
                class="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <Icon icon="solar:pen-line-duotone" class="text-lg" />
              </button>
              <button
                @click="confirmDelete(item)"
                class="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
              >
                <Icon
                  icon="solar:trash-bin-trash-line-duotone"
                  class="text-lg"
                />
              </button>
            </div>
          </div>
        </div>
      </template>
    </DataTable>

    <!-- Import Modal (Reusable) -->
    <ImportModal
      v-model:isOpen="showImportModal"
      title="Import Data Santri"
      :apiPreview="studentsApi.previewImportExcel"
      :apiImport="studentsApi.importExcel"
      :templateHeader="studentImportTemplate"
      templateName="template_santri"
      requiredColumns="NIS, Nama Lengkap, Jenis Kelamin, Nama Ayah, Email Orang Tua"
      @success="onImportSuccess"
    />

    <!-- Modals (Create, Edit, View, Import, Confirm) -->
    <Teleport to="body">
      <!-- Create/Edit Modal -->
      <div
        v-if="modal.show"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      >
        <div
          class="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          <!-- Modal Header -->
          <div class="p-4 border-b flex items-center justify-between">
            <h3 class="text-lg font-semibold text-slate-800">
              {{ modal.mode === "create" ? "Tambah Santri" : "Edit Santri" }}
            </h3>
            <button
              @click="closeModal"
              class="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Icon
                icon="solar:close-circle-line-duotone"
                class="text-xl text-slate-400"
              />
            </button>
          </div>
          <!-- Modal Body -->
          <div class="p-6 overflow-y-auto">
            <form @submit.prevent="submitForm" class="space-y-4">
              <!-- Form Fields ... (Keep existing form logic) -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1"
                    >NIS <span class="text-red-500">*</span></label
                  >
                  <input
                    v-model="form.nis"
                    required
                    class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#602515]"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1"
                    >NIS Santri</label
                  >
                  <input
                    v-model="form.nisSantri"
                    class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#602515]"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1"
                    >NISN</label
                  >
                  <input
                    v-model="form.nisn"
                    class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#602515]"
                  />
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1"
                  >Nama Lengkap <span class="text-red-500">*</span></label
                >
                <input
                  v-model="form.fullName"
                  required
                  class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#602515]"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1"
                  >Nama Arab</label
                >
                <input
                  v-model="form.fullNameAr"
                  dir="rtl"
                  placeholder="الاسم بالعربية"
                  class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#602515] text-right"
                />
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1"
                    >Tanggal Lahir</label
                  >
                  <input
                    type="date"
                    v-model="form.birthDate"
                    class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#602515]"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1"
                    >Tempat Lahir</label
                  >
                  <input
                    v-model="form.birthPlace"
                    class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#602515]"
                  />
                </div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1"
                    >Gender <span class="text-red-500">*</span></label
                  >
                  <div class="flex gap-4 mt-2">
                    <label class="flex items-center gap-2">
                      <input
                        type="radio"
                        v-model="form.gender"
                        value="male"
                        class="text-[#602515] focus:ring-[#602515]"
                      />
                      <span class="text-sm">Ikhwan</span>
                    </label>
                    <label class="flex items-center gap-2">
                      <input
                        type="radio"
                        v-model="form.gender"
                        value="female"
                        class="text-[#602515] focus:ring-[#602515]"
                      />
                      <span class="text-sm">Akhwat</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1"
                    >Status</label
                  >
                  <select
                    v-model="form.status"
                    class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#602515]"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Tidak Aktif</option>
                    <option value="graduated">Lulus</option>
                  </select>
                </div>
              </div>
              <div>
                <AddressSelector v-model="form.addressRegion" label="Alamat" />
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1"
                    >Phone</label
                  >
                  <input
                    v-model="form.phone"
                    class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#602515]"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1"
                    >Email</label
                  >
                  <input
                    v-model="form.email"
                    type="email"
                    class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#602515]"
                  />
                </div>
              </div>

              <!-- Footer -->
              <div class="pt-4 mt-4 border-t flex justify-end gap-3">
                <button
                  type="button"
                  @click="closeModal"
                  class="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  :disabled="saving"
                  class="px-4 py-2 bg-[#f8ae19] text-white rounded-lg hover:brightness-90 transition-colors font-medium"
                >
                  {{ saving ? "Menyimpan..." : "Simpan" }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- View Modal -->
    <Teleport to="body">
      <div
        v-if="view.show"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      >
        <div
          class="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden"
        >
          <!-- View Content ... (Keep existing view content) -->
          <div class="p-6 text-center border-b bg-amber-50 relative">
            <button
              @click="viewClose"
              class="absolute top-4 right-4 p-1 rounded-full bg-white/50 hover:bg-white text-slate-500 transition-colors"
            >
              <Icon icon="solar:close-circle-line-duotone" class="text-xl" />
            </button>
            <div
              class="w-20 h-20 mx-auto rounded-full bg-white flex items-center justify-center shadow-sm mb-3"
            >
              <Icon
                :icon="
                  view.item.gender === 'male'
                    ? 'solar:user-bold'
                    : 'solar:user-female-bold'
                "
                class="text-4xl text-[#602515]"
              />
            </div>
            <h3 class="text-xl font-bold text-slate-800">
              {{ view.item.fullName }}
            </h3>
            <p
              v-if="view.item.fullNameAr"
              class="text-base text-slate-600 mt-1"
              dir="rtl"
            >
              {{ view.item.fullNameAr }}
            </p>
            <div
              class="inline-block px-3 py-1 rounded-full bg-white border border-amber-200 text-xs font-medium text-[#602515] mt-1"
            >
              {{ view.item.nis }}
            </div>
            <div
              v-if="view.item.nisSantri"
              class="inline-block px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600 mt-1 ml-2"
            >
              {{ view.item.nisSantri }}
            </div>
            <div
              v-if="view.item.nisn"
              class="inline-block px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-medium text-blue-600 mt-1 ml-2"
            >
              NISN: {{ view.item.nisn }}
            </div>
          </div>
          <div class="p-6 space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <div class="text-xs text-slate-500">TTL</div>
                <div class="font-medium">
                  {{ view.item.birthPlace || "-" }},
                  {{
                    view.item.birthDate
                      ? new Date(view.item.birthDate).toLocaleDateString(
                          "id-ID",
                        )
                      : "-"
                  }}
                </div>
              </div>
              <div>
                <div class="text-xs text-slate-500">Gender</div>
                <div class="font-medium">
                  {{ view.item.gender === "male" ? "Ikhwan" : "Akhwat" }}
                </div>
              </div>
            </div>
            <div>
              <div class="text-xs text-slate-500">Alamat</div>
              <div class="font-medium">{{ view.item.address || "-" }}</div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <div class="text-xs text-slate-500">Telepon</div>
                <div class="font-medium">{{ view.item.phone || "-" }}</div>
              </div>
              <div>
                <div class="text-xs text-slate-500">Status</div>
                <div class="font-medium capitalize">{{ view.item.status }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Confirm Modal -->
    <ConfirmModal
      :isOpen="confirm.show"
      title="Hapus Santri"
      message="Apakah Anda yakin ingin menghapus data santri ini? Data yang dihapus tidak dapat dikembalikan."
      confirmText="Hapus"
      cancelText="Batal"
      @confirm="deleteStudent"
      @cancel="confirmCancel"
    />
    <!-- Status Modal -->
    <StatusModal
      :isOpen="statusModal.isOpen"
      :type="statusModal.type"
      :title="statusModal.title"
      :message="statusModal.message"
      @close="closeStatusModal"
    />

    <!-- Bulk Delete Confirm Modal -->
    <ConfirmModal
      :isOpen="bulkDeleteConfirm.show"
      title="Hapus Data Terpilih"
      :message="`Apakah Anda yakin ingin menghapus ${bulkDeleteConfirm.count} santri yang terpilih? Data yang dihapus tidak dapat dikembalikan.`"
      confirmText="Hapus Semua"
      cancelText="Batal"
      @confirm="executeBulkDelete"
      @cancel="bulkDeleteConfirm.show = false"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { studentsApi } from "@/services/api.js";
import { Icon } from "@iconify/vue";
import ConfirmModal from "@/components/ui/ConfirmModal.vue";
import DataTable from "@/components/ui/DataTable.vue";
import ImportModal from "@/components/common/ImportModal.vue";
import StatusModal from "@/components/ui/StatusModal.vue";
import AddressSelector from "@/components/ui/AddressSelector.vue";

const router = useRouter();
const route = useRoute();

/* ---------- Config ---------- */
// Columns Configuration for DataTable
const columns = [
  {
    field: "checkbox",
    type: "checkbox",
    width: "w-10",
    sticky: true,
    stickyClass: "left-0",
    headerClass: "p-2 md:p-4 border-b border-slate-200",
    cellClass: "p-2 md:p-4 border-b border-slate-100",
    align: "center",
  },
  {
    field: "fullName",
    label: "Nama Santri",
    sortable: true,
    sticky: true,
    stickyClass: "left-10",
    // Combined width and border classes
    headerClass:
      "p-2 md:p-4 min-w-[130px] md:min-w-[200px] border-r border-slate-200 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]",
    cellClass:
      "p-2 md:p-4 border-r border-slate-100 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]",
  },
  {
    field: "nis",
    label: "NIS",
    sortable: true,
    width: "min-w-[120px]",
    headerClass: "p-3 md:p-4",
    cellClass: "p-3 md:p-4",
  },
  {
    field: "nisSantri",
    label: "NIS Santri",
    sortable: true,
    width: "min-w-[120px]",
    headerClass: "p-3 md:p-4",
    cellClass: "p-3 md:p-4",
  },
  {
    field: "nisn",
    label: "NISN",
    sortable: true,
    width: "min-w-[120px]",
    headerClass: "p-3 md:p-4",
    cellClass: "p-3 md:p-4",
  },
  {
    field: "phone",
    label: "Telepon",
    width: "min-w-[130px]",
    headerClass: "p-3 md:p-4",
    cellClass: "p-3 md:p-4",
  },
  {
    field: "gender",
    label: "Gender",
    width: "min-w-[100px]",
    headerClass: "p-3 md:p-4",
    cellClass: "p-3 md:p-4",
  },
  {
    field: "class",
    label: "Kelas/Rombel",
    width: "min-w-[120px]",
    headerClass: "p-3 md:p-4",
    cellClass: "p-3 md:p-4",
  },
  {
    field: "halaqah",
    label: "Grup Halaqah",
    width: "min-w-[120px]",
    headerClass: "p-3 md:p-4",
    cellClass: "p-3 md:p-4",
  },
  {
    field: "room",
    label: "Kamar",
    width: "min-w-[120px]",
    headerClass: "p-3 md:p-4",
    cellClass: "p-3 md:p-4",
  },
  {
    field: "status",
    label: "Status",
    width: "min-w-[100px]",
    headerClass: "p-3 md:p-4",
    cellClass: "p-3 md:p-4",
  },
  {
    field: "action",
    label: "Aksi",
    width: "w-16",
    align: "center",
    headerClass: "p-3 md:p-4",
    cellClass: "p-3 md:p-4",
  },
];

/* ---------- State ---------- */
const students = ref([]);
const loading = ref(true);
const saving = ref(false);
const showFiltersDropdown = ref(false); // Kept for logic if needed, but handled by DataTable now

// Selection state for bulk actions
const selectedIds = ref([]);
const showBulkActions = ref(false);

// Computed for checkbox states
const isAllSelected = computed(() => {
  return (
    students.value.length > 0 &&
    selectedIds.value.length === students.value.length
  );
});

const isIndeterminate = computed(() => {
  return (
    selectedIds.value.length > 0 &&
    selectedIds.value.length < students.value.length
  );
});

// Selection functions
function toggleSelect(id) {
  const idx = selectedIds.value.indexOf(id);
  if (idx === -1) {
    selectedIds.value.push(id);
  } else {
    selectedIds.value.splice(idx, 1);
  }
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedIds.value = [];
  } else {
    selectedIds.value = students.value.map((s) => s.id);
  }
}

function clearSelection() {
  selectedIds.value = [];
  showBulkActions.value = false;
}

// Bulk action functions
async function bulkUpdateStatus(status) {
  showBulkActions.value = false;
  saving.value = true;

  const statusLabels = {
    active: "Aktif",
    inactive: "Tidak Aktif",
    graduated: "Lulus",
    transferred: "Pindah",
    dropped: "Keluar",
  };

  try {
    let successCount = 0;
    let failCount = 0;

    for (const id of selectedIds.value) {
      try {
        const response = await studentsApi.update(id, { status });
        if (response.success) {
          successCount++;
          // Update local state
          const student = students.value.find((s) => s.id === id);
          if (student) student.status = status;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    clearSelection();

    statusModal.type = failCount === 0 ? "success" : "warning";
    statusModal.title = failCount === 0 ? "Berhasil!" : "Selesai dengan error";
    statusModal.message =
      `${successCount} santri berhasil diubah ke status "${statusLabels[status]}"` +
      (failCount > 0 ? `. ${failCount} gagal.` : "");
    statusModal.isOpen = true;
  } catch (err) {
    console.error("Bulk update error:", err);
    statusModal.type = "error";
    statusModal.title = "Gagal!";
    statusModal.message = "Terjadi kesalahan saat mengubah status";
    statusModal.isOpen = true;
  } finally {
    saving.value = false;
  }
}

function confirmBulkDelete() {
  showBulkActions.value = false;
  bulkDeleteConfirm.show = true;
  bulkDeleteConfirm.count = selectedIds.value.length;
}

async function executeBulkDelete() {
  bulkDeleteConfirm.show = false;
  saving.value = true;

  try {
    let successCount = 0;
    let failCount = 0;

    for (const id of selectedIds.value) {
      try {
        const response = await studentsApi.delete(id);
        if (response.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    clearSelection();
    await fetchStudents(pagination.page);

    statusModal.type = failCount === 0 ? "success" : "warning";
    statusModal.title = failCount === 0 ? "Berhasil!" : "Selesai dengan error";
    statusModal.message =
      `${successCount} santri berhasil dihapus` +
      (failCount > 0 ? `. ${failCount} gagal dihapus.` : "");
    statusModal.isOpen = true;
  } catch (err) {
    console.error("Bulk delete error:", err);
    statusModal.type = "error";
    statusModal.title = "Gagal!";
    statusModal.message = "Terjadi kesalahan saat menghapus data";
    statusModal.isOpen = true;
  } finally {
    saving.value = false;
  }
}

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
  sort_by: "id",
  order: "desc",
});

const viewMode = ref("table");

const filters = reactive({
  fullName: "",
  gender: "",
  status: "",
});

const modal = reactive({
  show: false,
  mode: "create", // 'create' | 'edit'
  error: "",
});

const form = reactive({
  id: null,
  nis: "",
  nisn: "",
  nisSantri: "",
  fullName: "",
  fullNameAr: "",
  birthDate: "",
  birthPlace: "",
  gender: "male",
  addressRegion: null, // { province, regency, district, village, addressDetail, postalCode }
  phone: "",
  status: "active",
  email: "",
  password: "",
});

const confirm = reactive({ show: false, item: null });
const bulkDeleteConfirm = reactive({ show: false, count: 0 });
const view = reactive({ show: false, item: {} });

/* Import modal state (Refactored to Component) */
const showImportModal = ref(false);

function openImport() {
  showImportModal.value = true;
}

function onImportSuccess() {
  fetchStudents(pagination.page);
}

const studentImportTemplate = [
  {
    NIS: "12345",
    NISN: "0012345678",
    "NIS Santri": "P-12345",
    "Nama Lengkap": "Contoh Nama Santri",
    "Nama Arab": "محمد علي",
    "Jenis Kelamin": "Ikhwan",
    "Tanggal Lahir": "2010-01-15",
    "Tempat Lahir": "Jakarta",
    // Field Alamat Terpisah
    Provinsi: "Jawa Barat",
    "Kabupaten/Kota": "Bogor",
    Kecamatan: "Cibinong",
    "Desa/Kelurahan": "Pakansari",
    "Detail Alamat": "Jl. Kemerdekaan No. 45",
    "Kode Pos": "16914",
    Telepon: "081234567890",
    Status: "Aktif",
    "Nama Ayah": "Ahmad Budi",
    "Nama Ibu": "Siti Aminah",
    "Pekerjaan Ayah": "Wiraswasta",
    "Pekerjaan Ibu": "Ibu Rumah Tangga",
    "Telepon Orang Tua": "081234567891",
    "Alamat Orang Tua": "Jl. Contoh No. 123",
    "Email Orang Tua": "orangtua@email.com",
    "Password Orang Tua": "password123",
  },
];

/* Status Modal state */
const statusModal = reactive({
  isOpen: false,
  type: "success",
  title: "",
  message: "",
});

function openStatusModal(type, title, message) {
  statusModal.type = type;
  statusModal.title = title;
  statusModal.message = message;
  statusModal.isOpen = true;
}

function closeStatusModal() {
  statusModal.isOpen = false;
}

/* debounce */
let searchTimer = null;

/* ---------- API calls ---------- */
// ... (Keep existing fetchStudents, submitForm, deleteStudent)
// Debug ref
const debugError = ref("");

async function fetchStudents(page = 1) {
  loading.value = true;
  try {
    const params = {};
    if (filters.fullName) params.fullName = filters.fullName;
    if (filters.gender) params.gender = filters.gender;
    if (filters.status) params.status = filters.status;
    params.page = page;
    params.limit = pagination.limit;
    params.sort_by = pagination.sort_by;
    params.order = pagination.order;

    const response = await studentsApi.getAll(params);

    students.value = response.data || [];

    if (response.pagination) {
      pagination.page = Number(response.pagination.page);
      pagination.limit = Number(response.pagination.limit);
      pagination.total = Number(response.pagination.total);
      pagination.totalPages = Number(response.pagination.total_pages);
    }
  } catch (error) {
    console.error("Error fetching students:", error);
    students.value = [];
  } finally {
    loading.value = false;
  }
}

async function submitForm() {
  saving.value = true;
  modal.error = "";
  try {
    // Build address fields from addressRegion
    const addr = form.addressRegion || {};
    const payload = {
      id: form.id,
      nis: form.nis,
      nisn: form.nisn,
      nisSantri: form.nisSantri,
      fullName: form.fullName,
      fullNameAr: form.fullNameAr || undefined,
      birthDate: form.birthDate || undefined,
      birthPlace: form.birthPlace || undefined,
      gender: form.gender,
      // Separate address fields
      province: addr.province ? JSON.stringify(addr.province) : undefined,
      regency: addr.regency ? JSON.stringify(addr.regency) : undefined,
      district: addr.district ? JSON.stringify(addr.district) : undefined,
      village: addr.village ? JSON.stringify(addr.village) : undefined,
      addressDetail: addr.addressDetail || undefined,
      postalCode: addr.postalCode || undefined,
      phone: form.phone || undefined,
      status: form.status,
      email: form.email || undefined,
      password: form.password || undefined,
    };
    // Remove undefined values
    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined || payload[key] === "") {
        delete payload[key];
      }
    });

    if (modal.mode === "create") {
      delete payload.id; // Ensure ID is not sent for create
      await studentsApi.create(payload);
    } else {
      await studentsApi.update(form.id, payload);
    }
    await fetchStudents(pagination.page);
    closeModal();
    openStatusModal(
      "success",
      "Berhasil!",
      modal.mode === "create"
        ? "Data santri berhasil ditambahkan."
        : "Data santri berhasil diperbarui.",
    );
  } catch (err) {
    if (err.response && err.response.data && err.response.data.message) {
      modal.error = err.response.data.message;
    } else {
      modal.error = "Gagal menyimpan data";
    }
    console.error(err);
    // Optional: also show status modal for error?
    // User requested "pakai status modal", likely for success too.
    // Keeping inline error for modal form is good, but maybe showing global error is better?
    // Let's stick to success for now, or maybe duplicate error.
  } finally {
    saving.value = false;
  }
}

async function deleteStudent() {
  if (!confirm.item) return;
  saving.value = true;
  try {
    await studentsApi.delete(confirm.item.id);
    await fetchStudents(pagination.page);
    confirmCancel();
    openStatusModal("success", "Berhasil!", "Data santri berhasil dihapus.");
  } catch (err) {
    console.error("Delete error:", err);
    openStatusModal(
      "error",
      "Gagal Menghapus",
      err.response?.data?.message || err.message,
    );
  } finally {
    saving.value = false;
  }
}

/* ---------- User Actions ---------- */
function onSearchInput(val) {
  // Handling update:search event from DataTable
  filters.fullName = val;
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    fetchStudents(1);
  }, 500);
}

function applyFilters() {
  fetchStudents(1);
}

function resetFilters() {
  filters.fullName = "";
  filters.gender = "";
  filters.status = "";
  fetchStudents(1);
}

function changeLimit(newLimit) {
  pagination.limit = newLimit;
  fetchStudents(1);
}

function changePage(newPage) {
  fetchStudents(newPage);
}

function sortColumn(field) {
  if (pagination.sort_by === field) {
    pagination.order = pagination.order === "asc" ? "desc" : "asc";
  } else {
    pagination.sort_by = field;
    pagination.order = "asc";
  }
  fetchStudents(pagination.page);
}

/* ---------- Modal Controls ---------- */
function openCreate() {
  modal.show = true;
  modal.mode = "create";
  modal.error = "";
  Object.assign(form, {
    id: null,
    id: null,
    nis: "",
    nisn: "",
    nisSantri: "",
    fullName: "",
    fullNameAr: "",
    birthDate: "",
    birthPlace: "",
    gender: "male",
    addressRegion: null,
    phone: "",
    status: "active",
    email: "",
    password: "",
  });
}

function openEdit(item) {
  modal.show = true;
  modal.mode = "edit";
  modal.error = "";

  // Format birthDate for HTML date input (YYYY-MM-DD)
  let formattedBirthDate = "";
  if (item.birthDate) {
    const date = new Date(item.birthDate);
    if (!isNaN(date.getTime())) {
      formattedBirthDate = date.toISOString().split("T")[0];
    }
  }

  // Reconstruct address region from separate fields
  const addressRegion = {
    province: null,
    regency: null,
    district: null,
    village: null,
    addressDetail: item.addressDetail || "",
    postalCode: item.postalCode || "",
  };
  try {
    if (item.province) addressRegion.province = JSON.parse(item.province);
  } catch {}
  try {
    if (item.regency) addressRegion.regency = JSON.parse(item.regency);
  } catch {}
  try {
    if (item.district) addressRegion.district = JSON.parse(item.district);
  } catch {}
  try {
    if (item.village) addressRegion.village = JSON.parse(item.village);
  } catch {}

  Object.assign(form, {
    id: item.id,
    id: item.id,
    nis: item.nis || "",
    nisn: item.nisn || "",
    nisSantri: item.nisSantri || "",
    fullName: item.fullName || "",
    fullNameAr: item.fullNameAr || "",
    birthDate: formattedBirthDate,
    birthPlace: item.birthPlace || "",
    gender: item.gender || "male",
    addressRegion,
    phone: item.phone || "",
    status: item.status || "active",
    email: item.email || "",
    password: "",
  });
}

function closeModal() {
  modal.show = false;
  modal.error = "";
}

function confirmDelete(item) {
  confirm.show = true;
  confirm.item = item;
}

function confirmCancel() {
  confirm.show = false;
  confirm.item = null;
}

function openView(item) {
  // Navigate to StudentProfile page
  if (route.path.startsWith("/mobile-dashboard")) {
    router.push(`/mobile-dashboard/students/${item.id}`);
  } else {
    router.push(`/apps/students/${item.id}`);
  }
}

function viewClose() {
  view.show = false;
}

/* ---------- Lifecycle ---------- */
onMounted(() => {
  if (window.innerWidth < 768) {
    viewMode.value = "card";
  } else {
    viewMode.value = "table";
  }
  fetchStudents(1);
});
</script>
