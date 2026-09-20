<template>
  <div class="space-y-6">
    <div
      class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
    >
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Manajemen Pengguna
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Kelola akun pengguna, reset password, dan hak akses
        </p>
      </div>
      <div class="flex gap-2">
        <button
          @click="openImportModal"
          class="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
        >
          <Icon icon="ph:file-xls" class="w-5 h-5 mr-2 text-green-600" />
          Import Excel
        </button>
        <button
          @click="openCreateModal"
          class="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
        >
          <Icon icon="ph:plus-bold" class="w-5 h-5 mr-2" />
          Tambah User
        </button>
      </div>
    </div>

    <!-- Data Table -->
    <DataTable
      :columns="columns"
      :items="paginatedUsers"
      :loading="loading"
      :pagination="pagination"
      v-model:search="search"
      v-model:viewMode="viewMode"
      @page-change="page = $event"
      @update:limit="limit = $event"
      search-placeholder="Cari nama atau email..."
      @edit="openEditModal"
      @delete="confirmDelete"
    >
      <!-- Photo Cell -->
      <template #cell-photo="{ item }">
        <div class="flex items-center justify-center">
          <img
            v-if="item.photo && !imageLoadErrors[item.id]"
            :src="getPhotoUrl(item.photo)"
            class="w-10 h-10 rounded-full object-cover border border-gray-200"
            @error="handleImageError(item.id)"
          />
          <div
            v-else
            class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
            :class="getAvatarColor(item.name)"
          >
            {{ getInitials(item.name) }}
          </div>
        </div>
      </template>

      <template #cell-role="{ item }">
        <span
          class="px-2 py-1 text-xs font-medium rounded-full"
          :class="getRoleBadgeClass(item.role)"
        >
          {{ formatRole(item.role) }}
        </span>
      </template>

      <template #cell-isActive="{ item }">
        <span
          class="px-2 py-1 text-xs font-medium rounded-full"
          :class="
            item.isActive
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          "
        >
          {{ item.isActive ? "Aktif" : "Non-Aktif" }}
        </span>
      </template>

      <template #cell-actions="{ item }">
        <div class="flex items-center gap-2">
          <button
            @click="openEditModal(item)"
            class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit User"
          >
            <Icon icon="ph:pencil-simple-bold" class="w-5 h-5" />
          </button>
          <button
            @click="confirmDelete(item)"
            class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Hapus User"
          >
            <Icon icon="ph:trash-bold" class="w-5 h-5" />
          </button>
        </div>
      </template>

      <!-- Filter Slot -->
      <template #filters>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1"
              >Filter Role</label
            >
            <select
              v-model="roleFilter"
              class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Semua Role</option>
              <option value="student">Siswa</option>
              <option value="parent">Orang Tua</option>
              <option value="teacher">Guru</option>
              <option value="staff">Staf</option>
              <option value="admin">Admin</option>
              <option value="clinic">Klinik</option>
            </select>
          </div>
        </div>
      </template>

      <!-- Card View Slot -->
      <template #card-item="{ item }">
        <div
          class="bg-white dark:bg-gray-800 p-4 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all group"
        >
          <div class="flex items-start justify-between gap-3 mb-4">
            <!-- User Info -->
            <div class="flex items-center gap-3 min-w-0">
              <div class="shrink-0">
                <img
                  v-if="item.photo && !imageLoadErrors[item.id]"
                  :src="getPhotoUrl(item.photo)"
                  class="w-10 h-10 rounded-full object-cover border border-gray-200"
                  @error="handleImageError(item.id)"
                />
                <div
                  v-else
                  class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                  :class="getAvatarColor(item.name)"
                >
                  {{ getInitials(item.name) }}
                </div>
              </div>
              <div class="min-w-0">
                <h3
                  class="font-semibold text-slate-800 dark:text-gray-100 truncate"
                  :title="item.name"
                >
                  {{ item.name }}
                </h3>
                <p
                  class="text-xs text-slate-500 dark:text-gray-400 truncate"
                  :title="item.email"
                >
                  {{ item.email }}
                </p>
              </div>
            </div>
          </div>

          <!-- Role & Status -->
          <div class="flex items-center justify-between mb-4 mt-auto">
            <span
              class="px-2.5 py-1 text-xs font-medium rounded-full"
              :class="getRoleBadgeClass(item.role)"
            >
              {{ formatRole(item.role) }}
            </span>
            <span
              class="px-2.5 py-1 text-xs font-medium rounded-full"
              :class="
                item.isActive
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              "
            >
              {{ item.isActive ? "Aktif" : "Non-Aktif" }}
            </span>
          </div>

          <!-- Footer Actions -->
          <div
            class="flex items-center gap-2 pt-3 border-t border-slate-50 justify-end"
          >
            <button
              @click="openEditModal(item)"
              class="flex-1 flex items-center justify-center gap-2 py-1.5 px-3 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <Icon icon="ph:pencil-simple-bold" class="w-3.5 h-3.5" />
              Edit
            </button>
            <button
              @click="confirmDelete(item)"
              class="flex-1 flex items-center justify-center gap-2 py-1.5 px-3 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
            >
              <Icon icon="ph:trash-bold" class="w-3.5 h-3.5" />
              Hapus
            </button>
          </div>
        </div>
      </template>
    </DataTable>

    <!-- Create/Update Modal -->
    <Teleport to="body">
      <TransitionRoot appear :show="isModalOpen" as="template">
        <Dialog as="div" @close="closeModal" class="relative z-[9999]">
          <TransitionChild
            as="template"
            enter="duration-300 ease-out"
            enter-from="opacity-0"
            enter-to="opacity-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100"
            leave-to="opacity-0"
          >
            <div class="fixed inset-0 bg-black/25 backdrop-blur-sm" />
          </TransitionChild>

          <div class="fixed inset-0 overflow-y-auto">
            <div
              class="flex min-h-full items-center justify-center p-4 text-center"
            >
              <TransitionChild
                as="template"
                enter="duration-300 ease-out"
                enter-from="opacity-0 scale-95"
                enter-to="opacity-100 scale-100"
                leave="duration-200 ease-in"
                leave-from="opacity-100 scale-100"
                leave-to="opacity-0 scale-95"
              >
                <DialogPanel
                  class="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all flex flex-col max-h-[90vh]"
                >
                  <DialogTitle
                    as="h3"
                    class="text-lg font-bold leading-6 text-gray-900 dark:text-white mb-4 border-b pb-3"
                  >
                    {{ isEditing ? "Edit User" : "Tambah User Baru" }}
                  </DialogTitle>

                  <!-- Tabs -->
                  <div class="flex gap-2 mb-6 border-b border-gray-100">
                    <button
                      @click="activeTab = 'account'"
                      class="px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2"
                      :class="
                        activeTab === 'account'
                          ? 'text-primary-600 border-primary-600 bg-primary-50'
                          : 'text-gray-500 border-transparent hover:text-gray-700'
                      "
                    >
                      <Icon icon="ph:user-circle" class="inline w-4 h-4 mr-1" />
                      Akun
                    </button>
                    <button
                      @click="activeTab = 'bio'"
                      class="px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2"
                      :class="
                        activeTab === 'bio'
                          ? 'text-primary-600 border-primary-600 bg-primary-50'
                          : 'text-gray-500 border-transparent hover:text-gray-700'
                      "
                    >
                      <Icon
                        icon="ph:identification-card"
                        class="inline w-4 h-4 mr-1"
                      />
                      Biodata
                    </button>
                    <button
                      @click="activeTab = 'address'"
                      class="px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2"
                      :class="
                        activeTab === 'address'
                          ? 'text-primary-600 border-primary-600 bg-primary-50'
                          : 'text-gray-500 border-transparent hover:text-gray-700'
                      "
                    >
                      <Icon icon="ph:map-pin" class="inline w-4 h-4 mr-1" />
                      Alamat
                    </button>
                  </div>

                  <form
                    @submit.prevent="saveUser"
                    class="flex-1 overflow-y-auto px-1 space-y-4"
                  >
                    <!-- TAB 1: ACCOUNT -->
                    <div v-if="activeTab === 'account'" class="space-y-4">
                      <!-- Name & Email -->
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label
                            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                            >Nama Lengkap
                            <span class="text-red-500">*</span></label
                          >
                          <input
                            v-model="form.name"
                            type="text"
                            required
                            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                            placeholder="Nama Lengkap"
                          />
                        </div>
                        <div>
                          <label
                            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                            >Email <span class="text-red-500">*</span></label
                          >
                          <input
                            v-model="form.email"
                            type="email"
                            required
                            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                            placeholder="email@example.com"
                          />
                        </div>
                      </div>

                      <!-- Role & Password -->
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label
                            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                            >Role <span class="text-red-500">*</span></label
                          >
                          <select
                            v-model="form.role"
                            required
                            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                          >
                            <option value="student">Siswa</option>
                            <option value="parent">Orang Tua</option>
                            <option value="teacher">Guru</option>
                            <option value="staff">Staf</option>
                            <option value="admin">Admin</option>
                            <option value="clinic">Klinik</option>
                          </select>
                        </div>
                        <div>
                          <label
                            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                          >
                            {{
                              isEditing
                                ? "Password Baru (Opsional)"
                                : "Password"
                            }}
                            <span v-if="!isEditing" class="text-red-500"
                              >*</span
                            >
                          </label>
                          <input
                            v-model="form.password"
                            type="password"
                            :required="!isEditing"
                            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                            placeholder="********"
                          />
                        </div>
                      </div>

                      <!-- Teacher info shortcut -->
                      <div
                        v-if="form.role === 'teacher' || form.role === 'staff'"
                        class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg space-y-3"
                      >
                        <h4
                          class="text-sm font-medium text-blue-900 dark:text-blue-200"
                        >
                          Info Kepegawaian (Opsional)
                        </h4>
                        <div class="grid grid-cols-2 gap-3">
                          <div>
                            <label
                              class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
                              >NIP</label
                            >
                            <input
                              v-model="form.nip"
                              type="text"
                              class="w-full text-sm px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              placeholder="NIP"
                            />
                          </div>
                          <div>
                            <label
                              class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
                              >Jabatan</label
                            >
                            <input
                              v-model="form.position"
                              type="text"
                              class="w-full text-sm px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              placeholder="Jabatan"
                            />
                          </div>
                        </div>
                      </div>

                      <!-- Status Toggle -->
                      <div class="flex items-center pt-2">
                        <label
                          class="relative inline-flex items-center cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            v-model="form.isActive"
                            class="sr-only peer"
                          />
                          <div
                            class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"
                          ></div>
                          <span
                            class="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300"
                            >Akun Aktif</span
                          >
                        </label>
                      </div>
                    </div>

                    <!-- TAB 2: BIODATA -->
                    <div v-if="activeTab === 'bio'" class="space-y-4">
                      <!-- Photo Upload -->
                      <div class="flex items-center gap-4 mb-4">
                        <div
                          class="relative w-20 h-20 rounded-full overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300 group"
                        >
                          <img
                            v-if="photoPreview"
                            :src="photoPreview"
                            class="w-full h-full object-cover"
                          />
                          <div
                            v-else
                            class="w-full h-full flex items-center justify-center text-gray-400"
                          >
                            <Icon icon="ph:camera" class="w-8 h-8" />
                          </div>

                          <div
                            class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                            @click="triggerFileInput"
                          >
                            <Icon
                              icon="ph:pencil-simple"
                              class="text-white w-6 h-6"
                            />
                          </div>
                        </div>
                        <div class="flex-1">
                          <h4 class="text-sm font-medium">Foto Profil</h4>
                          <p class="text-xs text-gray-500 mb-2">
                            Maks. 2MB, Format JPG/PNG
                          </p>
                          <div class="flex gap-2">
                            <button
                              type="button"
                              @click="triggerFileInput"
                              class="text-xs px-3 py-1.5 border rounded-lg hover:bg-gray-50"
                            >
                              Pilih Foto
                            </button>
                            <button
                              v-if="photoPreview"
                              type="button"
                              @click="removePhoto"
                              class="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                            >
                              Hapus
                            </button>
                          </div>
                          <input
                            ref="fileInput"
                            type="file"
                            accept="image/*"
                            class="hidden"
                            @change="handlePhotoSelect"
                          />
                        </div>
                      </div>

                      <!-- First & Last Name -->
                      <div class="grid grid-cols-2 gap-4">
                        <div>
                          <label
                            class="block text-sm font-medium text-gray-700 mb-1"
                            >Nama Depan</label
                          >
                          <input
                            v-model="form.firstName"
                            type="text"
                            class="w-full px-3 py-2 border rounded-lg"
                            placeholder="Nama Depan"
                          />
                        </div>
                        <div>
                          <label
                            class="block text-sm font-medium text-gray-700 mb-1"
                            >Nama Belakang</label
                          >
                          <input
                            v-model="form.lastName"
                            type="text"
                            class="w-full px-3 py-2 border rounded-lg"
                            placeholder="Nama Belakang"
                          />
                        </div>
                      </div>

                      <!-- Gender & Phone -->
                      <div class="grid grid-cols-2 gap-4">
                        <div>
                          <label
                            class="block text-sm font-medium text-gray-700 mb-1"
                            >Gender</label
                          >
                          <div class="flex gap-4 mt-2">
                            <label
                              class="flex items-center gap-2 cursor-pointer"
                            >
                              <input
                                type="radio"
                                v-model="form.gender"
                                value="male"
                                class="text-primary-600 focus:ring-primary-500"
                              />
                              <span class="text-sm">Ikhwan</span>
                            </label>
                            <label
                              class="flex items-center gap-2 cursor-pointer"
                            >
                              <input
                                type="radio"
                                v-model="form.gender"
                                value="female"
                                class="text-primary-600 focus:ring-primary-500"
                              />
                              <span class="text-sm">Akhwat</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label
                            class="block text-sm font-medium text-gray-700 mb-1"
                            >Telepon</label
                          >
                          <input
                            v-model="form.phone"
                            type="text"
                            class="w-full px-3 py-2 border rounded-lg"
                            placeholder="08..."
                          />
                        </div>
                      </div>

                      <!-- Birth -->
                      <div class="grid grid-cols-2 gap-4">
                        <div>
                          <label
                            class="block text-sm font-medium text-gray-700 mb-1"
                            >Tempat Lahir</label
                          >
                          <input
                            v-model="form.birthPlace"
                            type="text"
                            class="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                        <div>
                          <label
                            class="block text-sm font-medium text-gray-700 mb-1"
                            >Tanggal Lahir</label
                          >
                          <input
                            v-model="form.birthDate"
                            type="date"
                            class="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                      </div>
                    </div>

                    <!-- TAB 3: ADDRESS -->
                    <div v-if="activeTab === 'address'" class="space-y-4">
                      <AddressSelector v-model="form.addressRegion" />

                      <div>
                        <label
                          class="block text-sm font-medium text-gray-700 mb-1"
                          >Alamat Lengkap</label
                        >
                        <textarea
                          v-model="form.address"
                          rows="3"
                          class="w-full px-3 py-2 border rounded-lg"
                          placeholder="Nama Jalan, RT/RW, No. Rumah..."
                        ></textarea>
                      </div>

                      <div class="grid grid-cols-2 gap-4">
                        <div>
                          <label
                            class="block text-sm font-medium text-gray-700 mb-1"
                            >Detail Lainnya (Patokan)</label
                          >
                          <input
                            v-model="form.addressDetail"
                            type="text"
                            class="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                        <div>
                          <label
                            class="block text-sm font-medium text-gray-700 mb-1"
                            >Kode Pos</label
                          >
                          <input
                            v-model="form.postalCode"
                            type="text"
                            class="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                      </div>
                    </div>

                    <div class="mt-8 flex justify-end gap-3 pt-4 border-t">
                      <button
                        type="button"
                        class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        @click="closeModal"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        :disabled="isSaving"
                        class="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <template v-if="isSaving">
                          <Icon
                            icon="ph:spinner"
                            class="w-5 h-5 animate-spin mr-2"
                          />
                          Menyimpan...
                        </template>
                        <span v-else>{{
                          isEditing ? "Simpan Perubahan" : "Buat User"
                        }}</span>
                      </button>
                    </div>
                  </form>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </TransitionRoot>
    </Teleport>

    <!-- Import Modal -->
    <ImportModal
      v-model:isOpen="showImportModal"
      title="Import Data User"
      :apiPreview="usersApi.importPreview"
      :apiImport="usersApi.import"
      :templateHeader="userImportTemplate"
      templateName="template_users"
      requiredColumns="Nama Lengkap, Email, Role"
      @success="onImportSuccess"
    />

    <ConfirmModal
      :is-open="showDeleteModal"
      title="Hapus User"
      message="Apakah Anda yakin ingin menghapus user ini? Tindakan ini tidak dapat dibatalkan."
      confirmText="Hapus"
      cancelText="Batal"
      type="danger"
      @confirm="handleDelete"
      @cancel="showDeleteModal = false"
      @close="showDeleteModal = false"
    />

    <StatusModal
      :is-open="showStatusModal"
      :type="statusType"
      :title="statusTitle"
      :message="statusMessage"
      @close="showStatusModal = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, reactive, watch } from "vue";
import { Icon } from "@iconify/vue";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionChild,
  TransitionRoot,
} from "@headlessui/vue";
import DataTable from "@/components/ui/DataTable.vue";
import ConfirmModal from "@/components/ui/ConfirmModal.vue";
import StatusModal from "@/components/ui/StatusModal.vue";
import ImportModal from "@/components/common/ImportModal.vue";
import AddressSelector from "@/components/ui/AddressSelector.vue";
import { usersApi } from "@/services/api";

// State
const users = ref([]);
const loading = ref(false);
const isModalOpen = ref(false);
const isEditing = ref(false);
const isSaving = ref(false);
const showDeleteModal = ref(false);
const itemToDelete = ref(null);
const showImportModal = ref(false);

// DataTable State
const search = ref("");
const roleFilter = ref("");
const viewMode = ref("table");
const page = ref(1);
const limit = ref(10);

// Form & Tabs
const activeTab = ref("account"); // account, bio, address
const photoPreview = ref(null);
const fileInput = ref(null);

const form = ref({
  id: null,
  name: "",
  email: "",
  role: "student",
  password: "",
  isActive: true,
  // Profile
  firstName: "",
  lastName: "",
  gender: "male",
  birthPlace: "",
  birthDate: "",
  phone: "",
  photo: null, // File object
  // Address
  address: "",
  addressRegion: null, // For selector { province, regency... }
  addressDetail: "",
  postalCode: "",
  // Teacher
  nip: "",
  position: "",
});

const API_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "http://localhost:3000" : "");

// Helpers - Adapted from Chat.vue logic
const getPhotoUrl = (path) => {
  if (!path) return null;

  let processedUrl = path;

  // Handle blob/local previews
  if (processedUrl.startsWith("blob:")) return processedUrl;

  // Fix: Handle legacy localhost URLs stored in DB
  if (processedUrl.includes("localhost:") && !import.meta.env.DEV) {
    try {
      const urlObj = new URL(processedUrl);
      processedUrl = urlObj.pathname;
    } catch (e) {
      // invalid url, keep as is
    }
  }

  // Handle uploads path specifically like Chat.vue
  if (
    processedUrl.startsWith("/uploads/") ||
    processedUrl.startsWith("uploads/")
  ) {
    if (processedUrl.startsWith("/")) processedUrl = processedUrl.substring(1);
    return `${API_URL}/api/${processedUrl}`;
  }

  // Absolute URLs
  if (processedUrl.startsWith("http")) {
    return processedUrl;
  }

  // Already has /api prefix?
  if (processedUrl.startsWith("/api/")) {
    return `${API_URL}${processedUrl}`;
  }

  // Fallback for other relative paths
  return `${API_URL}${processedUrl.startsWith("/") ? "" : "/"}${processedUrl}`;
};

const imageLoadErrors = ref({});

const handleImageError = (userId) => {
  console.log("Image failed to load for user:", userId);
  imageLoadErrors.value[userId] = true;
};

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.split(/[@\s._-]/).filter(Boolean);
  if (parts.length >= 1) return parts[0].slice(0, 2).toUpperCase();
  return name.charAt(0).toUpperCase();
};

const getAvatarColor = (name) => {
  return "bg-primary-600 text-white";
};

const statusType = ref("success");
const statusTitle = ref("");
const statusMessage = ref("");
const showStatusModal = ref(false);

// Watchers for Search/Filter to reset page
watch([search, roleFilter], () => {
  page.value = 1;
});

// Computed: Filtered Users
const filteredUsers = computed(() => {
  let res = users.value;

  // 1. Filter by Role
  if (roleFilter.value) {
    res = res.filter((u) => u.role === roleFilter.value);
  }

  // 2. Filter by Search
  if (search.value) {
    const q = search.value.toLowerCase();
    res = res.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
    );
  }

  return res;
});

// Computed: Paginated Users
const paginatedUsers = computed(() => {
  const start = (page.value - 1) * limit.value;
  const end = start + limit.value;
  return filteredUsers.value.slice(start, end);
});

// Computed: Pagination Metadata
const pagination = computed(() => ({
  page: page.value,
  limit: limit.value,
  total: filteredUsers.value.length,
  totalPages: Math.ceil(filteredUsers.value.length / limit.value),
  totalItems: filteredUsers.value.length, // Ensure totalItems is correct
}));

// Columns configuration
const columns = [
  { field: "photo", label: "", width: "w-12", align: "center" },
  { field: "name", label: "Nama Lengkap", sortable: true },
  { field: "email", label: "Email", sortable: true },
  { field: "role", label: "Role", sortable: true },
  { field: "isActive", label: "Status", sortable: true },
  { field: "actions", label: "Aksi", align: "right" },
];

// Excel Template
const userImportTemplate = [
  { header: "Nama Lengkap", key: "name", width: 25 },
  { header: "Email", key: "email", width: 25 },
  { header: "Password", key: "password", width: 20 },
  { header: "Role", key: "role", width: 15 },
  { header: "Status", key: "isActive", width: 10 },
  { header: "Phone", key: "phone", width: 15 },
  { header: "Gender", key: "gender", width: 10 },
  { header: "Tempat Lahir", key: "birthPlace", width: 20 },
  { header: "Tanggal Lahir", key: "birthDate", width: 15 }, // Format YYYY-MM-DD or Text
  { header: "Alamat", key: "address", width: 30 },
  // Teacher specific
  { header: "NIP", key: "nip", width: 20 },
  { header: "Jabatan", key: "position", width: 20 },
];

const fetchUsers = async () => {
  try {
    loading.value = true;
    const res = await usersApi.getAll();
    if (res.success) {
      users.value = res.data;
    }
  } catch (error) {
    showStatus("error", "Gagal", "Gagal memuat data user");
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const handlePhotoSelect = (event) => {
  const file = event.target.files[0];
  if (file) {
    if (file.size > 2 * 1024 * 1024) {
      alert("Ukuran file maksimal 2MB");
      return;
    }
    form.value.photo = file;
    photoPreview.value = URL.createObjectURL(file);
  }
};

const triggerFileInput = () => {
  fileInput.value.click();
};

const removePhoto = () => {
  form.value.photo = null;
  photoPreview.value = null;
  if (fileInput.value) fileInput.value.value = "";
};

const openCreateModal = () => {
  isEditing.value = false;
  activeTab.value = "account";
  photoPreview.value = null;
  form.value = {
    id: null,
    name: "",
    email: "",
    role: "student",
    password: "",
    isActive: true,
    firstName: "",
    lastName: "",
    gender: "male",
    birthPlace: "",
    birthDate: "",
    phone: "",
    photo: null,
    address: "",
    addressRegion: null,
    addressDetail: "",
    postalCode: "",
    nip: "",
    position: "",
  };
  isModalOpen.value = true;
};

const openEditModal = (user) => {
  isEditing.value = true;
  activeTab.value = "account";

  // Reconstruct addressRegion if needed, or backend should send it properly?
  // Backend sends separate fields (province, regency, etc). AddressSelector expects generic object or specific structure.
  // AddressSelector v-model handles {province: {code, name}, ...}
  let addressRegion = null;
  if (user.province && user.regency) {
    try {
      addressRegion = {
        province:
          typeof user.province === "string"
            ? JSON.parse(user.province)
            : user.province,
        regency:
          typeof user.regency === "string"
            ? JSON.parse(user.regency)
            : user.regency,
        district:
          typeof user.district === "string"
            ? JSON.parse(user.district)
            : user.district,
        village:
          typeof user.village === "string"
            ? JSON.parse(user.village)
            : user.village,
      };
    } catch (e) {
      console.error("Error parsing address JSON", e);
    }
  }

  photoPreview.value = user.photo ? getPhotoUrl(user.photo) : null;

  form.value = {
    ...user,
    password: "",
    photo: null, // Reset file input, but preview shows current
    addressRegion: addressRegion,
    // Ensure dates are formatted for input
    birthDate: user.birthDate ? user.birthDate.split("T")[0] : "",
  };
  isModalOpen.value = true;
};

const openImportModal = () => {
  showImportModal.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
  photoPreview.value = null;
};

const saveUser = async () => {
  try {
    isSaving.value = true;

    const formData = new FormData();
    // Append simple fields
    formData.append("name", form.value.name);
    formData.append("email", form.value.email);
    formData.append("role", form.value.role);
    formData.append("isActive", form.value.isActive);

    if (form.value.password) {
      formData.append("password", form.value.password);
    }

    // Profile
    formData.append("firstName", form.value.firstName || "");
    formData.append("lastName", form.value.lastName || "");
    formData.append("gender", form.value.gender || "male");
    formData.append("birthPlace", form.value.birthPlace || "");
    formData.append("birthDate", form.value.birthDate || "");
    formData.append("phone", form.value.phone || "");
    formData.append("address", form.value.address || "");
    formData.append("postalCode", form.value.postalCode || "");
    formData.append("addressDetail", form.value.addressDetail || "");

    // Address Region
    if (form.value.addressRegion) {
      if (form.value.addressRegion.province)
        formData.append(
          "province",
          JSON.stringify(form.value.addressRegion.province)
        );
      if (form.value.addressRegion.regency)
        formData.append(
          "regency",
          JSON.stringify(form.value.addressRegion.regency)
        );
      if (form.value.addressRegion.district)
        formData.append(
          "district",
          JSON.stringify(form.value.addressRegion.district)
        );
      if (form.value.addressRegion.village)
        formData.append(
          "village",
          JSON.stringify(form.value.addressRegion.village)
        );
    }

    // Teacher
    if (form.value.nip) formData.append("nip", form.value.nip);
    if (form.value.position) formData.append("position", form.value.position);

    // Photo
    if (form.value.photo instanceof File) {
      formData.append("photo", form.value.photo);
    }

    if (isEditing.value) {
      await usersApi.update(form.value.id, formData);
      showStatus("success", "Berhasil", "User berhasil diperbarui");
    } else {
      await usersApi.create(formData);
      showStatus("success", "Berhasil", "User berhasil dibuat");
    }

    closeModal();
    fetchUsers();
  } catch (error) {
    showStatus("error", "Gagal", error.message || "Terjadi kesalahan");
  } finally {
    isSaving.value = false;
  }
};

const confirmDelete = (user) => {
  itemToDelete.value = user;
  showDeleteModal.value = true;
};

const handleDelete = async () => {
  if (!itemToDelete.value) return;
  try {
    await usersApi.delete(itemToDelete.value.id);
    showStatus("success", "Berhasil", "User berhasil dihapus");
    fetchUsers();
  } catch (error) {
    showStatus("error", "Gagal", error.message || "Gagal menghapus user");
  } finally {
    showDeleteModal.value = false;
    itemToDelete.value = null;
  }
};

const onImportSuccess = () => {
  showImportModal.value = false;
  showStatus("success", "Berhasil", "Data pengguna berhasil diimport");
  fetchUsers();
};

const showStatus = (type, title, message) => {
  statusType.value = type;
  statusTitle.value = title;
  statusMessage.value = message;
  showStatusModal.value = true;
};

const getRoleBadgeClass = (role) => {
  const map = {
    admin:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    teacher: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    staff:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    student:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    parent:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    clinic: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return map[role] || "bg-gray-100 text-gray-700";
};

const formatRole = (role) => {
  const map = {
    admin: "Administrator",
    teacher: "Guru",
    staff: "Staf",
    student: "Siswa",
    parent: "Orang Tua",
    clinic: "Petugas Klinik",
  };
  return map[role] || role;
};

onMounted(() => {
  fetchUsers();
});
</script>
