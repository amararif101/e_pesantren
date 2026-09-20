<template>
  <div class="max-w-7xl mx-auto sm:px-6 lg:px-8 font-sans">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center min-h-[400px]">
      <div class="text-center">
        <Icon
          icon="solar:spinner-bold"
          class="text-5xl text-[#602515] animate-spin mx-auto mb-4"
        />
        <p class="text-slate-500">Memuat data santri...</p>
      </div>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      class="flex items-center justify-center min-h-[400px]"
    >
      <div class="text-center p-8 bg-red-50 rounded-2xl max-w-md">
        <Icon
          icon="solar:danger-triangle-bold"
          class="text-5xl text-red-500 mx-auto mb-4"
        />
        <h3 class="text-lg font-bold text-red-700 mb-2">Gagal Memuat Data</h3>
        <p class="text-red-600 text-sm mb-4">{{ error }}</p>
        <button
          @click="fetchStudent"
          class="px-4 py-2 bg-[#602515] text-white rounded-lg hover:bg-[#7e3c2f] transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <template v-else-if="student">
      <!-- Header with Back Button -->
      <div class="flex items-center gap-4 mb-8">
        <button
          @click="$router.back()"
          class="p-2 rounded-xl bg-white shadow-md hover:shadow-lg transition-all group"
        >
          <Icon
            icon="solar:arrow-left-bold"
            class="text-xl text-slate-400 group-hover:text-[#602515] transition-colors"
          />
        </button>
        <div>
          <h1 class="text-2xl font-bold text-slate-800">Profil Santri</h1>
          <p class="text-sm text-slate-500">
            Detail informasi santri dan orang tua
          </p>
        </div>
      </div>

      <div
        class="p-1 py-4 grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white border border-gray-100 rounded-2xl shadow-sm"
      >
        <!-- LEFT COL: IDENTITY CARD -->
        <!-- LEFT COL: KATEGORI DATA -->
        <aside class="lg:col-span-3 lg:space-y-2">
          <h3
            class="text-xs font-bold text-slate-400 uppercase tracking-widest px-2 lg:px-4 mb-2 lg:mb-4 hidden lg:block"
          >
            Kategori Data
          </h3>
          <div
            class="flex flex-row lg:flex-col gap-2 lg:gap-1 overflow-x-auto pb-2 lg:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              class="shrink-0 lg:w-full px-4 py-2.5 lg:py-3 rounded-xl text-sm font-semibold flex items-center gap-2 lg:gap-3 transition-all text-left border lg:border-transparent"
              :class="
                activeTab === tab.id
                  ? 'bg-[#602515] text-white shadow-md border-[#602515]'
                  : 'bg-white lg:bg-transparent text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-800'
              "
            >
              <Icon :icon="tab.icon" class="text-lg lg:text-xl shrink-0" />
              <span class="whitespace-nowrap">{{ tab.label }}</span>
            </button>
          </div>
        </aside>

        <!-- RIGHT COL: DETAILS -->
        <main class="lg:col-span-9 space-y-6">
          <!-- DATA PRIBADI -->
          <div v-if="activeTab === 'personal'" class="space-y-6">
            <div class="flex items-center gap-3 mb-2 px-2">
              <Icon
                icon="solar:user-id-bold-duotone"
                class="text-2xl text-[#602515]"
              />
              <h2 class="text-xl font-bold text-slate-800">
                Informasi Pribadi Utama
              </h2>
            </div>

            <!-- Photo Section -->
            <div
              class="bg-white rounded-3xl shadow-sm border border-slate-100 p-8"
            >
              <div
                class="flex flex-col sm:flex-row gap-8 items-center sm:items-start"
              >
                <!-- Avatar -->
                <div
                  class="relative inline-block mx-auto sm:mx-0 group cursor-pointer w-32 h-32 flex-shrink-0"
                >
                  <div
                    class="w-full h-full rounded-full border-4 border-slate-50 shadow-sm overflow-hidden flex items-center justify-center text-4xl font-bold relative bg-slate-100"
                    :class="
                      !photoUrl &&
                      (student.gender === 'female'
                        ? 'text-pink-600'
                        : 'text-blue-600')
                    "
                  >
                    <img
                      v-if="photoUrl"
                      :src="photoUrl"
                      alt="Profile"
                      class="w-full h-full object-cover"
                    />
                    <Icon
                      v-else
                      :icon="
                        student.gender === 'female'
                          ? 'solar:women-bold-duotone'
                          : 'solar:men-bold-duotone'
                      "
                      class="text-6xl"
                    />

                    <div
                      class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[1px]"
                      @click="triggerPhotoUpload"
                    >
                      <Icon
                        icon="solar:camera-add-bold"
                        class="text-white text-3xl"
                      />
                    </div>

                    <div
                      v-if="uploadingPhoto"
                      class="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm z-20"
                    >
                      <Icon
                        icon="line-md:loading-loop"
                        class="text-white text-3xl"
                      />
                    </div>
                  </div>

                  <div
                    class="absolute bottom-2 right-2 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center z-10"
                    :class="statusColors[student.status]?.bg || 'bg-slate-400'"
                  >
                    <Icon
                      :icon="
                        statusIcons[student.status] ||
                        'solar:question-circle-bold'
                      "
                      class="text-white text-lg"
                    />
                  </div>

                  <input
                    ref="photoInput"
                    type="file"
                    accept="image/*"
                    class="hidden"
                    @change="handlePhotoUpload"
                  />
                </div>

                <div class="flex-1 text-center sm:text-left mt-2 sm:mt-4">
                  <h4 class="font-bold text-slate-800 text-lg mb-2">
                    Pass Foto Santri
                  </h4>
                  <p class="text-sm text-slate-500 mb-4">
                    Gunakan foto formal latar belakang polos.<br />Format JPG,
                    PNG max 2MB.
                  </p>
                  <button
                    @click="triggerPhotoUpload"
                    class="px-5 py-2.5 border border-slate-200 bg-white rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                  >
                    Pilih Foto
                  </button>
                </div>
              </div>
            </div>

            <!-- Details Form-like display -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <p class="text-sm font-semibold text-slate-800 mb-2">
                  Status Santri
                </p>
                <div
                  class="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 flex items-center gap-2 font-medium"
                >
                  <div
                    class="w-2 h-2 rounded-full"
                    :class="statusColors[student.status]?.dot || 'bg-slate-400'"
                  ></div>
                  {{ statusLabels[student.status] || student.status }}
                </div>
              </div>
              <div>
                <p class="text-sm font-semibold text-slate-800 mb-2">
                  NIS <span class="text-red-500">*</span>
                </p>
                <div
                  class="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 font-medium"
                >
                  {{ student.nis }}
                </div>
              </div>
              <div>
                <p class="text-sm font-semibold text-slate-800 mb-2">
                  Terdaftar
                </p>
                <div
                  class="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-700"
                >
                  {{ formatDate(student.createdAt) }}
                </div>
              </div>
              <div>
                <p class="text-sm font-semibold text-slate-800 mb-2">
                  Nama Lengkap <span class="text-red-500">*</span>
                </p>
                <div
                  class="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 font-medium"
                >
                  {{ student.fullName }}
                </div>
              </div>
              <div>
                <p class="text-sm font-semibold text-slate-800 mb-2">
                  Jenis Kelamin
                </p>
                <div
                  class="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 flex items-center gap-2"
                >
                  <Icon
                    :icon="
                      student.gender === 'female'
                        ? 'solar:women-bold'
                        : 'solar:men-bold'
                    "
                    class="text-slate-400"
                  />
                  {{ student.gender === "female" ? "Akhwat" : "Ikhwan" }}
                </div>
              </div>
              <div>
                <p class="text-sm font-semibold text-slate-800 mb-2">
                  Tempat, Tanggal Lahir
                </p>
                <div
                  class="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-700"
                >
                  {{ student.birthPlace || "-" }},
                  {{ formatDate(student.birthDate) }}
                </div>
              </div>
            </div>
          </div>

          <!-- ALAMAT & KONTAK -->
          <div v-if="activeTab === 'address'" class="space-y-6">
            <div class="flex items-center gap-3 mb-2 px-2">
              <Icon
                icon="solar:map-point-bold-duotone"
                class="text-2xl text-[#602515]"
              />
              <h2 class="text-xl font-bold text-slate-800">
                Alamat & Kontak Utama
              </h2>
            </div>

            <div
              class="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 relative overflow-hidden"
            >
              <div
                class="absolute top-0 right-0 p-8 opacity-5 pointer-events-none"
              >
                <Icon icon="solar:map-bold" width="120" />
              </div>
              <div class="grid grid-cols-1 gap-6 relative z-10">
                <div>
                  <p class="text-sm font-semibold text-slate-800 mb-2">
                    Nomor Telepon / WhatsApp
                  </p>
                  <div
                    class="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 flex items-center gap-2"
                  >
                    <Icon
                      icon="solar:phone-bold-duotone"
                      class="text-slate-400"
                    />
                    {{ student.phone || "-" }}
                  </div>
                </div>
                <div>
                  <p class="text-sm font-semibold text-slate-800 mb-2">
                    Alamat Lengkap
                  </p>
                  <div
                    class="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 leading-relaxed min-h-[100px]"
                  >
                    <div class="flex items-start gap-3">
                      <Icon
                        icon="solar:home-2-bold-duotone"
                        class="text-slate-400 text-xl mt-1 flex-shrink-0"
                      />
                      <span>{{ student.address || "Alamat belum diisi" }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Parents Card -->
          <div
            v-if="activeTab === 'parents'"
            class="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 relative overflow-hidden"
          >
            <!-- Decorative -->
            <div
              class="absolute top-0 right-0 p-8 opacity-5 pointer-events-none"
            >
              <Icon icon="solar:users-group-rounded-bold" width="120" />
            </div>

            <div class="flex items-center gap-3 mb-6">
              <Icon
                icon="solar:users-group-rounded-bold-duotone"
                class="text-2xl text-[#602515]"
              />
              <h3 class="text-xl font-bold text-slate-800">
                Data Orang Tua / Wali
              </h3>
            </div>

            <!-- No Parents -->
            <div
              v-if="!parents || parents.length === 0"
              class="text-center py-12"
            >
              <div
                class="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center"
              >
                <Icon
                  icon="solar:users-group-two-rounded-bold-duotone"
                  class="text-4xl text-slate-300"
                />
              </div>
              <p class="text-slate-500">Belum ada data orang tua terhubung</p>
            </div>

            <!-- Parents List -->
            <div v-else class="space-y-6">
              <div
                v-for="parent in parents"
                :key="parent.id"
                class="p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200 hover:border-[#602515]/30 transition-all hover:shadow-md"
              >
                <!-- Parent Header -->
                <div class="flex items-start justify-between mb-4">
                  <div class="flex items-center gap-3">
                    <div class="p-3 bg-[#602515]/10 rounded-xl">
                      <Icon
                        icon="solar:users-group-rounded-bold-duotone"
                        class="text-2xl text-[#602515]"
                      />
                    </div>
                    <div>
                      <span
                        v-if="parent.isPrimary"
                        class="text-xs bg-[#f8ae19]/20 text-[#b17a0d] px-2 py-0.5 rounded-full font-medium mb-1 inline-block"
                      >
                        Wali Utama
                      </span>
                      <h4 class="font-bold text-slate-800">
                        Orang Tua #{{ parent.id }}
                      </h4>
                    </div>
                  </div>
                  <!-- Edit Parent Button -->
                  <button
                    @click="openParentEditModal(parent)"
                    class="p-2 rounded-lg hover:bg-white text-slate-400 hover:text-[#602515] transition-colors"
                    title="Edit data orang tua"
                  >
                    <Icon icon="solar:pen-2-bold-duotone" class="text-lg" />
                  </button>
                </div>

                <!-- Parent Details Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <!-- Father Info -->
                  <div class="p-4 bg-white rounded-xl border border-slate-200">
                    <div class="flex items-center gap-2 mb-3">
                      <Icon
                        icon="solar:men-bold-duotone"
                        class="text-blue-500"
                      />
                      <span
                        class="text-xs font-semibold text-slate-400 uppercase tracking-wider"
                        >Ayah</span
                      >
                    </div>
                    <p class="font-semibold text-slate-800 mb-1">
                      {{ parent.fatherName || "-" }}
                    </p>
                    <p
                      v-if="parent.fatherOccupation"
                      class="text-xs text-slate-500 flex items-center gap-1"
                    >
                      <Icon icon="solar:case-bold" class="text-slate-400" />
                      {{ parent.fatherOccupation }}
                    </p>
                  </div>

                  <!-- Mother Info -->
                  <div class="p-4 bg-white rounded-xl border border-slate-200">
                    <div class="flex items-center gap-2 mb-3">
                      <Icon
                        icon="solar:women-bold-duotone"
                        class="text-pink-500"
                      />
                      <span
                        class="text-xs font-semibold text-slate-400 uppercase tracking-wider"
                        >Ibu</span
                      >
                    </div>
                    <p class="font-semibold text-slate-800 mb-1">
                      {{ parent.motherName || "-" }}
                    </p>
                    <p
                      v-if="parent.motherOccupation"
                      class="text-xs text-slate-500 flex items-center gap-1"
                    >
                      <Icon icon="solar:case-bold" class="text-slate-400" />
                      {{ parent.motherOccupation }}
                    </p>
                  </div>
                </div>

                <!-- Contact Info -->
                <div
                  class="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <!-- Phone -->
                  <div class="flex items-center gap-3">
                    <div class="p-2 bg-green-100 rounded-lg">
                      <Icon
                        icon="solar:phone-bold-duotone"
                        class="text-green-600"
                      />
                    </div>
                    <div>
                      <span class="text-xs text-slate-400 block">Telepon</span>
                      <span class="text-sm font-medium text-slate-700">{{
                        parent.phone || "-"
                      }}</span>
                    </div>
                  </div>

                  <!-- Address -->
                  <div class="flex items-center gap-3">
                    <div class="p-2 bg-orange-100 rounded-lg">
                      <Icon
                        icon="solar:home-2-bold-duotone"
                        class="text-orange-600"
                      />
                    </div>
                    <div class="flex-1 min-w-0">
                      <span class="text-xs text-slate-400 block">Alamat</span>
                      <span
                        class="text-sm font-medium text-slate-700 truncate block"
                        >{{ parent.address || "-" }}</span
                      >
                    </div>
                  </div>
                </div>

                <!-- User Account Info -->
                <div
                  v-if="parent.userId"
                  class="mt-4 pt-4 border-t border-slate-200"
                >
                  <div class="flex items-center gap-2 text-sm">
                    <Icon
                      icon="solar:shield-check-bold-duotone"
                      class="text-green-500"
                    />
                    <span class="text-slate-600"
                      >Memiliki akun login untuk orang tua</span
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- KEDISIPLINAN -->
          <div v-if="activeTab === 'discipline'" class="space-y-6">
            <div class="flex items-center gap-3 mb-2 px-2">
              <Icon
                icon="solar:shield-warning-bold-duotone"
                class="text-2xl text-[#602515]"
              />
              <h2 class="text-xl font-bold text-slate-800">Kedisiplinan</h2>
            </div>

            <div v-if="disciplineData.loading" class="flex justify-center p-8">
              <Icon
                icon="line-md:loading-loop"
                class="text-4xl text-[#602515]"
              />
            </div>
            <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Penghargaan -->
              <div
                class="bg-white rounded-3xl shadow-sm border border-slate-100 p-6"
              >
                <h3
                  class="text-lg font-bold text-emerald-700 mb-4 flex items-center gap-2"
                >
                  <Icon icon="solar:star-fall-bold-duotone" /> Penghargaan
                </h3>
                <div
                  v-if="disciplineData.rewards.length === 0"
                  class="text-slate-400 text-sm italic"
                >
                  Belum ada data penghargaan.
                </div>
                <div v-else class="space-y-3">
                  <div
                    v-for="(item, i) in disciplineData.rewards"
                    :key="i"
                    class="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-start"
                  >
                    <div>
                      <p class="font-semibold text-slate-800 text-sm">
                        {{ item.title || item.name }}
                      </p>
                      <p class="text-xs text-slate-500">
                        {{ item.description }}
                      </p>
                    </div>
                    <span
                      class="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-md"
                      >+{{ item.points }}</span
                    >
                  </div>
                </div>
              </div>

              <!-- Pelanggaran -->
              <div
                class="bg-white rounded-3xl shadow-sm border border-slate-100 p-6"
              >
                <h3
                  class="text-lg font-bold text-rose-700 mb-4 flex items-center gap-2"
                >
                  <Icon icon="solar:danger-triangle-bold-duotone" /> Pelanggaran
                </h3>
                <div
                  v-if="disciplineData.punishments.length === 0"
                  class="text-slate-400 text-sm italic"
                >
                  Belum ada data pelanggaran.
                </div>
                <div v-else class="space-y-3">
                  <div
                    v-for="(item, i) in disciplineData.punishments"
                    :key="i"
                    class="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-start"
                  >
                    <div>
                      <p class="font-semibold text-slate-800 text-sm">
                        {{ item.title || item.name }}
                      </p>
                      <p class="text-xs text-slate-500">
                        {{ item.description }}
                      </p>
                    </div>
                    <span
                      class="text-xs font-bold text-rose-600 bg-rose-100 px-2 py-1 rounded-md"
                      >{{ item.points }}</span
                    >
                  </div>
                </div>
              </div>

              <!-- SP -->
              <div
                class="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:col-span-2"
              >
                <h3
                  class="text-lg font-bold text-orange-700 mb-4 flex items-center gap-2"
                >
                  <Icon icon="solar:letter-bold-duotone" /> Surat Peringatan
                  (SP)
                </h3>
                <div
                  v-if="disciplineData.warnings.length === 0"
                  class="text-slate-400 text-sm italic"
                >
                  Belum ada data SP.
                </div>
                <div v-else class="space-y-3">
                  <div
                    v-for="(item, i) in disciplineData.warnings"
                    :key="i"
                    class="p-3 bg-slate-50 rounded-xl border border-slate-100"
                  >
                    <p
                      class="font-semibold text-slate-800 text-sm flex items-center gap-2"
                    >
                      <span
                        class="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs"
                        >SP {{ item.spLevel }}</span
                      >
                      {{ item.reason }}
                    </p>
                    <p class="text-xs text-slate-500 mt-1">
                      Berlaku sampai: {{ formatDate(item.validUntil) }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- TAHFIDZ -->
          <div v-if="activeTab === 'tahfidz'" class="space-y-6">
            <div class="flex items-center gap-3 mb-2 px-2">
              <Icon
                icon="solar:book-bookmark-bold-duotone"
                class="text-2xl text-[#602515]"
              />
              <h2 class="text-xl font-bold text-slate-800">Data Tahfidz</h2>
            </div>

            <div v-if="tahfidzData.loading" class="flex justify-center p-8">
              <Icon
                icon="line-md:loading-loop"
                class="text-4xl text-[#602515]"
              />
            </div>
            <div
              v-else
              class="bg-white rounded-3xl shadow-sm border border-slate-100 p-8"
            >
              <div
                v-if="tahfidzData.deposits.length === 0"
                class="text-center text-slate-500 py-10"
              >
                <Icon
                  icon="solar:folder-with-files-bold-duotone"
                  class="text-6xl text-slate-200 mb-4 mx-auto"
                />
                <p>Belum ada riwayat setoran tahfidz.</p>
              </div>
              <div v-else class="space-y-3">
                <div
                  v-for="(item, i) in tahfidzData.deposits"
                  :key="i"
                  class="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col md:flex-row justify-between md:items-center gap-4"
                >
                  <div>
                    <div class="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        class="text-xs font-bold px-2 py-0.5 rounded uppercase"
                        :class="{
                          'bg-blue-100 text-blue-700': item.type === 'ziyadah',
                          'bg-teal-100 text-teal-700': item.type === 'sabqi',
                          'bg-indigo-100 text-indigo-700':
                            item.type === 'manzil',
                          'bg-purple-100 text-purple-700':
                            item.type === 'murajaah',
                          'bg-orange-100 text-orange-700':
                            item.type === 'tidak_setor',
                          'bg-gray-200 text-gray-700': [
                            'izin',
                            'sakit',
                            'alpha',
                          ].includes(item.type),
                        }"
                      >
                        {{
                          item.type === "ziyadah"
                            ? "Taqdim"
                            : item.type === "tidak_setor"
                              ? "Tidak Setor"
                              : item.type || "Mutabaah"
                        }}
                      </span>
                      <span
                        v-if="item.juz"
                        class="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold px-2 py-0.5 rounded"
                      >
                        Juz {{ item.juz }}
                      </span>
                    </div>
                    <div class="text-sm text-slate-500 flex flex-col gap-0.5">
                      <div class="font-bold text-slate-800 text-sm">
                        <span
                          v-if="
                            item.startSurah && item.startSurah === item.endSurah
                          "
                        >
                          QS. {{ getSurahName(item.startSurah) }}:
                          {{ item.startAyat }} - {{ item.endAyat }}
                        </span>
                        <span v-else-if="item.startSurah">
                          QS. {{ getSurahName(item.startSurah) }}:
                          {{ item.startAyat }} - QS.
                          {{ getSurahName(item.endSurah) }}: {{ item.endAyat }}
                        </span>
                        <span v-else-if="item.surah">
                          QS. {{ item.surah }}
                          <span v-if="item.ayatStart"
                            >: {{ item.ayatStart }} - {{ item.ayatEnd }}</span
                          >
                        </span>
                        <span
                          v-else-if="item.type === 'sabqi' || item.type === 'manzil'"
                        >
                          {{ item.isCompleted ? "Sudah" : "Belum" }}
                        </span>
                        <span
                          v-else-if="
                            !['izin', 'sakit', 'alpha', 'tidak_setor'].includes(
                              item.type,
                            )
                          "
                        >
                          -
                        </span>
                      </div>
                      <div
                        v-if="item.totalPages"
                        class="text-xs text-slate-500"
                      >
                        {{ item.totalPages }} Hal
                      </div>
                      <div
                        v-else-if="item.startPage || item.pageNumber"
                        class="text-xs text-slate-500"
                      >
                        Hal. {{ item.startPage || item.pageNumber
                        }}<span
                          v-if="item.endPage && item.endPage !== item.startPage"
                        >
                          - {{ item.endPage }}</span
                        >
                      </div>
                      <span
                        v-if="
                          ['izin', 'sakit', 'alpha', 'tidak_setor'].includes(
                            item.type,
                          )
                        "
                        class="text-xs"
                      >
                        Keterangan: {{ item.notes || "-" }}
                      </span>
                    </div>
                  </div>
                  <div class="flex gap-4">
                    <div
                      class="text-center"
                      v-if="
                        !['izin', 'sakit', 'alpha', 'sabqi', 'manzil', 'tidak_setor'].includes(
                          item.type,
                        )
                      "
                    >
                      <p class="text-xs text-slate-400 mb-1">Kelancaran</p>
                      <span
                        class="font-bold px-3 py-1 rounded-lg text-xs uppercase"
                        :class="{
                          'bg-emerald-100 text-emerald-600':
                            item.fluency === 'A',
                          'bg-orange-100 text-orange-600':
                            item.fluency === 'B',
                          'bg-rose-100 text-rose-600': item.fluency === 'C',
                          'bg-slate-100 text-slate-500': !item.fluency,
                        }"
                      >
                        {{ item.fluency || "-" }}
                      </span>
                    </div>
                    <div class="text-right">
                      <p class="text-xs text-slate-400 mb-1">Tanggal</p>
                      <span
                        class="font-semibold text-slate-700 text-sm block mb-1"
                        >{{
                          formatDate(
                            item.depositDate || item.date || item.createdAt,
                          )
                        }}</span
                      >
                      <p
                        class="text-[10px] text-slate-500 whitespace-nowrap flex items-center justify-end gap-1"
                      >
                        <Icon icon="solar:user-id-bold-duotone" />
                        {{ item.teacherName || "Unknown" }}
                        <span v-if="item.teacherNip" class="opacity-70"
                          >({{ item.teacherNip }})</span
                        >
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- AKADEMIK -->
          <div v-if="activeTab === 'academic'" class="space-y-6">
            <div class="flex items-center gap-3 mb-2 px-2">
              <Icon
                icon="solar:diploma-bold-duotone"
                class="text-2xl text-[#602515]"
              />
              <h2 class="text-xl font-bold text-slate-800">Data Akademik</h2>
            </div>
            <div
              class="bg-white rounded-3xl shadow-sm border border-slate-100 p-8"
            >
              <div class="grid grid-cols-1 gap-4">
                <div
                  class="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between"
                >
                  <span class="text-slate-500 text-sm font-semibold"
                    >Kelas / Rombel</span
                  >
                  <span class="text-slate-800 font-bold">{{
                    student.class?.name || "-"
                  }}</span>
                </div>
                <div
                  class="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between"
                >
                  <span class="text-slate-500 text-sm font-semibold"
                    >Halaqah</span
                  >
                  <span class="text-slate-800 font-bold">{{
                    student.halaqah?.name || "-"
                  }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- ASRAMA -->
          <div v-if="activeTab === 'dormitory'" class="space-y-6">
            <div class="flex items-center gap-3 mb-2 px-2">
              <Icon
                icon="solar:home-smile-bold-duotone"
                class="text-2xl text-[#602515]"
              />
              <h2 class="text-xl font-bold text-slate-800">Data Asrama</h2>
            </div>
            <div
              class="bg-white rounded-3xl shadow-sm border border-slate-100 p-8"
            >
              <div class="grid grid-cols-1 gap-4">
                <div
                  class="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between"
                >
                  <span class="text-slate-500 text-sm font-semibold"
                    >Kamar / Asrama</span
                  >
                  <span class="text-slate-800 font-bold">{{
                    student.room?.name || "Belum Ditempatkan"
                  }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- KESEHATAN -->
          <div v-if="activeTab === 'health'" class="space-y-6">
            <div class="flex items-center gap-3 mb-2 px-2">
              <Icon
                icon="solar:heart-pulse-bold-duotone"
                class="text-2xl text-[#602515]"
              />
              <h2 class="text-xl font-bold text-slate-800">
                Riwayat Kesehatan (Klinik)
              </h2>
            </div>

            <div v-if="healthData.loading" class="flex justify-center">
              <Icon
                icon="line-md:loading-loop"
                class="text-4xl text-[#602515]"
              />
            </div>
            <div
              v-else
              class="bg-white rounded-3xl shadow-sm border border-slate-100"
            >
              <div
                v-if="healthData.examinations.length === 0"
                class="text-center text-slate-500 py-10"
              >
                <Icon
                  icon="solar:folder-with-files-bold-duotone"
                  class="text-6xl text-slate-200 mb-4 mx-auto"
                />
                <p>Belum ada riwayat pemeriksaan.</p>
              </div>
              <div v-else class="space-y-4">
                <div
                  v-for="(exam, i) in healthData.examinations"
                  :key="i"
                  class="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-4"
                >
                  <div
                    class="flex justify-between items-start border-b border-slate-200 pb-3"
                  >
                    <div>
                      <p class="font-bold text-slate-800 text-lg">
                        {{ exam.diagnosis || "Pemeriksaan Umum" }}
                      </p>
                      <p
                        class="text-xs text-slate-500 mt-1 flex items-center gap-1"
                      >
                        <Icon icon="solar:calendar-date-bold-duotone" />
                        {{ formatDate(exam.date || exam.createdAt) }}
                      </p>
                    </div>
                    <span
                      v-if="exam.hasSickLeave"
                      class="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-1 rounded uppercase"
                    >
                      Izin Sakit
                    </span>
                  </div>

                  <div
                    v-if="exam.inpatient"
                    class="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 flex items-center gap-3 mt-1"
                  >
                    <div
                      class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0"
                    >
                      <Icon
                        icon="solar:hospital-bold-duotone"
                        class="text-lg"
                      />
                    </div>
                    <div>
                      <p class="text-sm font-bold text-indigo-900">
                        Rawat Inap
                      </p>
                      <p class="text-xs text-indigo-700 mt-0.5">
                        Kamar:
                        <span class="font-semibold">{{
                          exam.inpatient.roomName
                        }}</span>
                        (Bed: {{ exam.inpatient.bedNumber || "-" }})
                        <span class="mx-1 text-indigo-300">•</span>
                        {{ formatDate(exam.inpatient.admissionDate) }} -
                        {{
                          exam.inpatient.dischargeDate
                            ? formatDate(exam.inpatient.dischargeDate)
                            : "Sekarang"
                        }}
                      </p>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-1">
                    <div class="space-y-3">
                      <div
                        v-if="exam.complaint || exam.symptoms"
                        class="text-sm"
                      >
                        <p
                          class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1"
                        >
                          Keluhan / Gejala
                        </p>
                        <p class="text-slate-700 leading-relaxed">
                          {{ exam.complaint || exam.symptoms }}
                        </p>
                      </div>
                      <div v-if="exam.treatment" class="text-sm">
                        <p
                          class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1"
                        >
                          Tindakan Medis
                        </p>
                        <p class="text-slate-700 leading-relaxed">
                          {{ exam.treatment }}
                        </p>
                      </div>
                      <div v-if="exam.prescribedMedicines" class="text-sm">
                        <p
                          class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1"
                        >
                          Resep Obat
                        </p>
                        <p class="text-slate-700 leading-relaxed">
                          {{ exam.prescribedMedicines }}
                        </p>
                      </div>
                      <div v-if="exam.notes || exam.anamnesis" class="text-sm">
                        <p
                          class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1"
                        >
                          Catatan Tambahan
                        </p>
                        <p class="text-slate-700 leading-relaxed">
                          {{ exam.notes || exam.anamnesis }}
                        </p>
                      </div>
                    </div>

                    <!-- Tanda Vital -->
                    <div
                      v-if="
                        exam.temperature ||
                        exam.bloodPressure ||
                        exam.weight ||
                        exam.height ||
                        exam.heartRate ||
                        exam.respiratoryRate
                      "
                      class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm lg:self-start"
                    >
                      <p
                        class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3"
                      >
                        Tanda Vital & Fisik
                      </p>
                      <div class="grid grid-cols-2 gap-y-4 gap-x-2">
                        <div v-if="exam.temperature" class="text-xs">
                          <span class="text-slate-400 block mb-0.5"
                            >Suhu Tubuh</span
                          >
                          <span class="font-bold text-slate-700 text-base"
                            >{{ exam.temperature }}
                            <span class="font-normal text-slate-400 text-xs"
                              >°C</span
                            ></span
                          >
                        </div>
                        <div v-if="exam.bloodPressure" class="text-xs">
                          <span class="text-slate-400 block mb-0.5"
                            >Tekanan Darah</span
                          >
                          <span class="font-bold text-slate-700 text-base">{{
                            exam.bloodPressure
                          }}</span>
                        </div>
                        <div v-if="exam.heartRate" class="text-xs">
                          <span class="text-slate-400 block mb-0.5"
                            >Denyut Nadi</span
                          >
                          <span class="font-bold text-slate-700 text-base"
                            >{{ exam.heartRate }}
                            <span class="font-normal text-slate-400 text-xs"
                              >bpm</span
                            ></span
                          >
                        </div>
                        <div v-if="exam.respiratoryRate" class="text-xs">
                          <span class="text-slate-400 block mb-0.5"
                            >Pernapasan</span
                          >
                          <span class="font-bold text-slate-700 text-base"
                            >{{ exam.respiratoryRate }}
                            <span class="font-normal text-slate-400 text-xs"
                              >rpm</span
                            ></span
                          >
                        </div>
                        <div v-if="exam.weight" class="text-xs">
                          <span class="text-slate-400 block mb-0.5"
                            >Berat Badan</span
                          >
                          <span class="font-bold text-slate-700 text-base"
                            >{{ exam.weight }}
                            <span class="font-normal text-slate-400 text-xs"
                              >kg</span
                            ></span
                          >
                        </div>
                        <div v-if="exam.height" class="text-xs">
                          <span class="text-slate-400 block mb-0.5"
                            >Tinggi Badan</span
                          >
                          <span class="font-bold text-slate-700 text-base"
                            >{{ exam.height }}
                            <span class="font-normal text-slate-400 text-xs"
                              >cm</span
                            ></span
                          >
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- TIMELINE HISTORIKAL -->
          <div v-if="activeTab === 'timeline'" class="space-y-6">
            <div class="flex items-center gap-3 mb-2 px-2">
              <Icon
                icon="solar:history-bold-duotone"
                class="text-2xl text-[#602515]"
              />
              <div>
                <h2 class="text-xl font-bold text-slate-800">
                  Timeline Historikal Santri
                </h2>
                <p class="text-sm text-slate-500">
                  Riwayat akademik, tahfidz, asrama, halaqah, klinik, dan kedisiplinan lintas tahun.
                </p>
              </div>
            </div>

            <div v-if="timelineData.loading" class="flex justify-center py-12">
              <Icon
                icon="line-md:loading-loop"
                class="text-4xl text-[#602515]"
              />
            </div>

            <div
              v-else-if="timelineData.error"
              class="bg-red-50 border border-red-100 rounded-3xl p-6 text-red-700"
            >
              <div class="flex items-start gap-3">
                <Icon icon="solar:danger-triangle-bold" class="text-2xl shrink-0" />
                <div>
                  <p class="font-bold">Gagal memuat timeline</p>
                  <p class="text-sm mt-1">{{ timelineData.error }}</p>
                  <button
                    @click="fetchTimeline"
                    class="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700"
                  >
                    Coba Lagi
                  </button>
                </div>
              </div>
            </div>

            <template v-else-if="timelineData.data">
              <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div
                  v-for="card in timelineSummaryCards"
                  :key="card.label"
                  class="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm"
                >
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <p class="text-xs text-slate-400 font-bold uppercase tracking-wide">
                        {{ card.label }}
                      </p>
                      <p class="text-2xl font-black text-slate-800 mt-1">
                        {{ card.value }}
                      </p>
                    </div>
                    <div
                      class="w-10 h-10 rounded-xl flex items-center justify-center"
                      :class="card.bg"
                    >
                      <Icon :icon="card.icon" class="text-xl" :class="card.color" />
                    </div>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div class="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
                  <p class="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">
                    Kelas Saat Ini
                  </p>
                  <p class="text-lg font-bold text-slate-800">
                    {{ timelineData.data.summary?.currentClass?.name || student.class?.name || '-' }}
                  </p>
                  <p class="text-sm text-slate-500 mt-1">
                    {{ timelineData.data.summary?.currentClass?.academicYear || 'Tahun ajaran belum tercatat' }}
                  </p>
                </div>
                <div class="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
                  <p class="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">
                    Halaqah Saat Ini
                  </p>
                  <p class="text-lg font-bold text-slate-800">
                    {{ timelineData.data.summary?.currentHalaqah?.name || student.halaqah?.name || '-' }}
                  </p>
                  <p class="text-sm text-slate-500 mt-1">Riwayat perpindahan ditarik dari membership halaqah.</p>
                </div>
                <div class="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
                  <p class="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">
                    Kamar Saat Ini
                  </p>
                  <p class="text-lg font-bold text-slate-800">
                    {{ timelineData.data.summary?.currentRoom?.name || student.room?.name || '-' }}
                  </p>
                  <p class="text-sm text-slate-500 mt-1">
                    {{ timelineData.data.summary?.currentRoom?.building || 'Gedung/asrama belum tercatat' }}
                  </p>
                </div>
              </div>

              <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <section class="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                  <div class="flex items-center justify-between mb-4">
                    <h3 class="font-bold text-slate-800 flex items-center gap-2">
                      <Icon icon="solar:diploma-bold-duotone" class="text-[#602515]" />
                      Ringkasan Akademik per Periode
                    </h3>
                    <span class="text-xs text-slate-400 font-semibold">
                      {{ timelineData.data.academic?.gradePeriods?.length || 0 }} periode
                    </span>
                  </div>
                  <div
                    v-if="!timelineData.data.academic?.gradePeriods?.length"
                    class="text-center text-slate-400 py-8"
                  >
                    Belum ada nilai historikal.
                  </div>
                  <div v-else class="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                    <div
                      v-for="period in timelineData.data.academic.gradePeriods"
                      :key="`${period.academicYear}-${period.semester}`"
                      class="p-4 rounded-2xl bg-slate-50 border border-slate-100"
                    >
                      <div class="flex items-center justify-between gap-3">
                        <div>
                          <p class="font-bold text-slate-800">{{ period.label }}</p>
                          <p class="text-xs text-slate-500 mt-1">
                            {{ period.grades?.length || 0 }} nilai mapel tersimpan
                          </p>
                        </div>
                        <div class="text-right">
                          <p class="text-xs text-slate-400">Rata-rata</p>
                          <p class="text-xl font-black text-[#602515]">
                            {{ period.averageScore || '-' }}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section class="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                  <div class="flex items-center justify-between mb-4">
                    <h3 class="font-bold text-slate-800 flex items-center gap-2">
                      <Icon icon="solar:home-smile-bold-duotone" class="text-[#602515]" />
                      Riwayat Penempatan
                    </h3>
                    <span class="text-xs text-slate-400 font-semibold">Dipisah per kategori</span>
                  </div>

                  <div class="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                    <section
                      v-for="group in placementGroups"
                      :key="group.key"
                      class="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
                    >
                      <div class="flex items-center justify-between gap-3 mb-3">
                        <h4 class="font-bold text-slate-800 flex items-center gap-2">
                          <span
                            class="w-8 h-8 rounded-xl flex items-center justify-center"
                            :class="getTimelineCategory(group.category).bg"
                          >
                            <Icon
                              :icon="getTimelineCategory(group.category).icon"
                              :class="getTimelineCategory(group.category).color"
                            />
                          </span>
                          {{ group.label }}
                        </h4>
                        <span class="text-xs text-slate-400 font-semibold">
                          {{ group.items.length }} data
                        </span>
                      </div>

                      <div v-if="group.items.length" class="space-y-2">
                        <div
                          v-for="item in group.items"
                          :key="`${item.kind}-${item.id}`"
                          class="p-3 rounded-xl bg-white border border-slate-100 flex gap-3"
                        >
                          <div
                            class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                            :class="getTimelineCategory(item.category).bg"
                          >
                            <Icon
                              :icon="getTimelineCategory(item.category).icon"
                              :class="getTimelineCategory(item.category).color"
                            />
                          </div>
                          <div class="min-w-0">
                            <p class="font-bold text-slate-800">{{ item.title }}</p>
                            <p class="text-xs text-slate-500 mt-1">{{ item.subtitle || '-' }}</p>
                          </div>
                        </div>
                      </div>

                      <div v-else class="text-center text-slate-400 py-5 text-sm">
                        Belum ada {{ group.emptyLabel }}.
                      </div>
                    </section>
                  </div>
                </section>
              </div>

              <section class="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                <div class="flex items-center justify-between mb-5">
                  <h3 class="font-bold text-slate-800 flex items-center gap-2">
                    <Icon icon="solar:timeline-bold-duotone" class="text-[#602515]" />
                    Semua Riwayat
                  </h3>
                  <span class="text-xs text-slate-400 font-semibold">
                    {{ timelineData.data.timeline?.length || 0 }} event
                  </span>
                </div>

                <div
                  v-if="!timelineData.data.timeline?.length"
                  class="text-center text-slate-400 py-10"
                >
                  <Icon icon="solar:folder-with-files-bold-duotone" class="text-6xl text-slate-200 mb-3 mx-auto" />
                  <p>Belum ada event historikal.</p>
                </div>

                <div v-else class="relative pl-5 space-y-5 before:absolute before:left-[18px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                  <article
                    v-for="(event, index) in timelineData.data.timeline"
                    :key="`${event.category}-${event.date}-${index}`"
                    class="relative pl-8"
                  >
                    <div
                      class="absolute left-[-2px] top-1 w-4 h-4 rounded-full ring-4 ring-white border"
                      :class="getTimelineCategory(event.category).dot"
                    ></div>
                    <div class="p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-sm transition-all">
                      <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div>
                          <div class="flex flex-wrap items-center gap-2 mb-1">
                            <span
                              class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide"
                              :class="getTimelineCategory(event.category).badge"
                            >
                              <Icon :icon="getTimelineCategory(event.category).icon" />
                              {{ getTimelineCategory(event.category).label }}
                            </span>
                            <span class="text-xs text-slate-400 font-semibold">
                              {{ formatDate(event.date) }}
                            </span>
                          </div>
                          <h4 class="font-bold text-slate-800">{{ event.title }}</h4>
                          <p v-if="event.description" class="text-sm text-slate-600 mt-1 leading-relaxed">
                            {{ event.description }}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                </div>
              </section>
            </template>
          </div>

          <!-- Actions Card -->
          <div
            v-if="activeTab === 'actions'"
            class="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl shadow-xl p-8 text-white relative overflow-hidden"
          >
            <div class="absolute top-0 right-0 opacity-10">
              <Icon icon="solar:settings-bold" width="150" />
            </div>

            <div class="relative z-10">
              <div class="flex items-center gap-3 mb-6">
                <div
                  class="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm"
                >
                  <Icon
                    icon="solar:widget-2-bold-duotone"
                    class="text-[#f8ae19]"
                    width="24"
                  />
                </div>
                <div>
                  <h3 class="text-xl font-bold">Aksi</h3>
                  <p class="text-slate-400 text-sm">Kelola data santri</p>
                </div>
              </div>

              <div class="flex flex-wrap gap-3">
                <button
                  @click="goBackToList"
                  class="px-5 py-2.5 rounded-xl text-sm font-medium bg-white/10 hover:bg-white/20 transition-colors border border-white/10 flex items-center gap-2"
                >
                  <Icon icon="solar:arrow-left-bold" />
                  Kembali ke Daftar
                </button>
                <button
                  @click="openEditModal"
                  class="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#f8ae19] text-[#602515] hover:bg-[#ffc145] transition-colors shadow-lg shadow-orange-500/20 flex items-center gap-2"
                >
                  <Icon icon="solar:pen-2-bold" />
                  Edit Data
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </template>

    <!-- Edit Modal -->
    <Teleport to="body">
      <div
        v-if="editModal.show"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      >
        <div
          class="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          <!-- Header -->
          <div class="p-4 border-b flex items-center justify-between shrink-0">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"
              >
                <Icon
                  icon="solar:pen-new-square-bold-duotone"
                  class="text-xl text-[#602515]"
                />
              </div>
              <div>
                <h3 class="font-semibold text-slate-800">Edit Data Santri</h3>
                <p class="text-xs text-slate-500">Ubah informasi santri</p>
              </div>
            </div>
            <button
              @click="closeEditModal"
              class="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Icon
                icon="solar:close-circle-line-duotone"
                class="text-xl text-slate-400"
              />
            </button>
          </div>

          <!-- Content - Scrollable -->
          <div class="p-5 space-y-4 overflow-y-auto flex-1">
            <!-- Error message -->
            <div
              v-if="editModal.error"
              class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600"
            >
              {{ editModal.error }}
            </div>

            <!-- Form Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- NIS -->
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1"
                  >NIS <span class="text-red-500">*</span></label
                >
                <input
                  v-model="editForm.nis"
                  required
                  class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#602515]"
                />
              </div>

              <!-- Full Name -->
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1"
                  >Nama Lengkap <span class="text-red-500">*</span></label
                >
                <input
                  v-model="editForm.fullName"
                  required
                  class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#602515]"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Birth Date -->
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1"
                  >Tanggal Lahir</label
                >
                <input
                  type="date"
                  v-model="editForm.birthDate"
                  class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#602515]"
                />
              </div>

              <!-- Birth Place -->
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1"
                  >Tempat Lahir</label
                >
                <input
                  v-model="editForm.birthPlace"
                  class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#602515]"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Gender -->
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1"
                  >Jenis Kelamin <span class="text-red-500">*</span></label
                >
                <div class="flex gap-4 mt-2">
                  <label class="flex items-center gap-2">
                    <input
                      type="radio"
                      v-model="editForm.gender"
                      value="male"
                      class="text-[#602515] focus:ring-[#602515]"
                    />
                    <span class="text-sm">Ikhwan</span>
                  </label>
                  <label class="flex items-center gap-2">
                    <input
                      type="radio"
                      v-model="editForm.gender"
                      value="female"
                      class="text-[#602515] focus:ring-[#602515]"
                    />
                    <span class="text-sm">Akhwat</span>
                  </label>
                </div>
              </div>

              <!-- Status -->
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1"
                  >Status</label
                >
                <select
                  v-model="editForm.status"
                  class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#602515]"
                >
                  <option value="active">Aktif</option>
                  <option value="inactive">Tidak Aktif</option>
                  <option value="graduated">Lulus</option>
                  <option value="transferred">Pindah</option>
                  <option value="dropped">Keluar</option>
                </select>
              </div>
            </div>

            <!-- Phone -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1"
                >No. Telepon</label
              >
              <input
                v-model="editForm.phone"
                class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#602515]"
                placeholder="08..."
              />
            </div>

            <!-- Address -->
            <!-- Address -->
            <div>
              <AddressSelector
                v-model="editForm.addressData"
                label="Alamat Domisili"
              />
            </div>
          </div>

          <!-- Footer -->
          <div
            class="p-4 border-t bg-slate-50 flex items-center justify-end gap-3 shrink-0"
          >
            <button
              @click="closeEditModal"
              class="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Batal
            </button>
            <button
              @click="saveStudent"
              :disabled="editModal.saving"
              class="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              style="background: #602515"
            >
              <Icon
                v-if="editModal.saving"
                icon="solar:spinner-bold"
                class="animate-spin"
              />
              <Icon v-else icon="solar:diskette-bold-duotone" />
              {{ editModal.saving ? "Menyimpan..." : "Simpan Perubahan" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Success/Error Status Modal -->
    <StatusModal
      :isOpen="statusModal.isOpen"
      :type="statusModal.type"
      :title="statusModal.title"
      :message="statusModal.message"
      @close="statusModal.isOpen = false"
    />

    <!-- Image Cropper -->
    <ImageCropperModal
      :is-open="showCropper"
      :image-src="cropperImage"
      :aspect-ratio="1"
      title="Sesuaikan Foto Santri"
      description="Geser dan zoom untuk menyesuaikan foto. Rasio 1:1."
      @close="showCropper = false"
      @crop="handleCrop"
    />

    <!-- Parent Edit Modal -->
    <Teleport to="body">
      <div
        v-if="parentEditModal.show"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      >
        <div
          class="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          <!-- Header -->
          <div class="p-4 border-b flex items-center justify-between shrink-0">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"
              >
                <Icon
                  icon="solar:users-group-rounded-bold-duotone"
                  class="text-xl text-[#602515]"
                />
              </div>
              <div>
                <h3 class="font-semibold text-slate-800">
                  Edit Data Orang Tua
                </h3>
                <p class="text-xs text-slate-500">
                  Ubah informasi orang tua/wali
                </p>
              </div>
            </div>
            <button
              @click="closeParentEditModal"
              class="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Icon
                icon="solar:close-circle-line-duotone"
                class="text-xl text-slate-400"
              />
            </button>
          </div>

          <!-- Content - Scrollable -->
          <div class="p-5 space-y-4 overflow-y-auto flex-1">
            <!-- Error message -->
            <div
              v-if="parentEditModal.error"
              class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600"
            >
              {{ parentEditModal.error }}
            </div>

            <!-- Father Section -->
            <div class="p-4 bg-blue-50 rounded-xl space-y-3">
              <div class="flex items-center gap-2 mb-2">
                <Icon icon="solar:men-bold-duotone" class="text-blue-500" />
                <span class="font-semibold text-slate-700">Data Ayah</span>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-slate-600 mb-1"
                    >Nama Ayah</label
                  >
                  <input
                    v-model="parentForm.fatherName"
                    class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-600 mb-1"
                    >Pekerjaan Ayah</label
                  >
                  <input
                    v-model="parentForm.fatherOccupation"
                    class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white"
                  />
                </div>
              </div>
            </div>

            <!-- Mother Section -->
            <div class="p-4 bg-pink-50 rounded-xl space-y-3">
              <div class="flex items-center gap-2 mb-2">
                <Icon icon="solar:women-bold-duotone" class="text-pink-500" />
                <span class="font-semibold text-slate-700">Data Ibu</span>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-slate-600 mb-1"
                    >Nama Ibu</label
                  >
                  <input
                    v-model="parentForm.motherName"
                    class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500 bg-white"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-600 mb-1"
                    >Pekerjaan Ibu</label
                  >
                  <input
                    v-model="parentForm.motherOccupation"
                    class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500 bg-white"
                  />
                </div>
              </div>
            </div>

            <!-- Contact Section -->
            <div class="p-4 bg-slate-50 rounded-xl space-y-3">
              <div class="flex items-center gap-2 mb-2">
                <Icon icon="solar:phone-bold-duotone" class="text-green-500" />
                <span class="font-semibold text-slate-700">Kontak</span>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-slate-600 mb-1"
                    >No. Telepon</label
                  >
                  <input
                    v-model="parentForm.phone"
                    class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 bg-white"
                    placeholder="08..."
                  />
                </div>
                <div>
                  <AddressSelector
                    v-model="parentForm.addressData"
                    label="Alamat Domisili"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div
            class="p-4 border-t bg-slate-50 flex items-center justify-end gap-3 shrink-0"
          >
            <button
              @click="closeParentEditModal"
              class="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Batal
            </button>
            <button
              @click="saveParent"
              :disabled="parentEditModal.saving"
              class="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 bg-[#602515] hover:bg-[#602515]/80"
            >
              <Icon
                v-if="parentEditModal.saving"
                icon="solar:spinner-bold"
                class="animate-spin"
              />
              <Icon v-else icon="solar:diskette-bold-duotone" />
              {{ parentEditModal.saving ? "Menyimpan..." : "Simpan Perubahan" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { Icon } from "@iconify/vue";
import {
  studentsApi,
  parentsApi,
  rewardsApi,
  warningsApi,
  tahfidzApi,
  clinicApi,
  quranApi,
} from "@/services/api";
import StatusModal from "@/components/ui/StatusModal.vue";
import AddressSelector from "@/components/ui/AddressSelector.vue";
import ImageCropperModal from "@/components/ui/ImageCropperModal.vue";

const route = useRoute();
const router = useRouter();

const updating = ref(false);

const activeTab = ref("personal");
const tabs = [
  { id: "personal", label: "Data Pribadi", icon: "solar:user-id-bold-duotone" },
  {
    id: "address",
    label: "Alamat & Kontak",
    icon: "solar:map-point-bold-duotone",
  },
  {
    id: "parents",
    label: "Orang Tua & Wali",
    icon: "solar:users-group-rounded-bold-duotone",
  },
  {
    id: "discipline",
    label: "Kedisiplinan",
    icon: "solar:shield-warning-bold-duotone",
  },
  { id: "tahfidz", label: "Tahfidz", icon: "solar:book-bookmark-bold-duotone" },
  { id: "academic", label: "Akademik", icon: "solar:diploma-bold-duotone" },
  { id: "dormitory", label: "Asrama", icon: "solar:home-smile-bold-duotone" },
  { id: "health", label: "Kesehatan", icon: "solar:heart-pulse-bold-duotone" },
  {
    id: "timeline",
    label: "Timeline Historikal",
    icon: "solar:history-bold-duotone",
  },
  {
    id: "actions",
    label: "Pengaturan & Aksi",
    icon: "solar:settings-bold-duotone",
  },
];

// Data States for New Tabs
const disciplineData = ref({
  rewards: [],
  punishments: [],
  warnings: [],
  loaded: false,
  loading: false,
});
const tahfidzData = ref({ deposits: [], loaded: false, loading: false });
const healthData = ref({ examinations: [], loaded: false, loading: false });
const timelineData = ref({ data: null, loaded: false, loading: false, error: "" });
const surahList = ref([]);

watch(activeTab, (newTab) => {
  if (newTab === "discipline" && !disciplineData.value.loaded)
    fetchDiscipline();
  if (newTab === "tahfidz" && !tahfidzData.value.loaded) fetchTahfidz();
  if (newTab === "health" && !healthData.value.loaded) fetchHealth();
  if (newTab === "timeline" && !timelineData.value.loaded) fetchTimeline();
});

function getSurahName(number) {
  if (!number) return "";
  const surah = surahList.value.find((s) => s.sora === Number(number));
  return surah ? surah.sora_name_en : `Surah ${number}`;
}

async function fetchDiscipline() {
  disciplineData.value.loading = true;
  try {
    const resRewards = await rewardsApi.getAll({
      studentId: student.value?.id,
    });
    if (resRewards?.data) {
      disciplineData.value.rewards = resRewards.data.filter(
        (item) => item.type === "reward" || item.type === "Penghargaan",
      );
      disciplineData.value.punishments = resRewards.data.filter(
        (item) => item.type === "punishment" || item.type === "Pelanggaran",
      );
    }
    const resWarnings = await warningsApi.getAll({
      studentId: student.value?.id,
    });
    if (resWarnings?.data) {
      disciplineData.value.warnings = resWarnings.data;
    }
    disciplineData.value.loaded = true;
  } catch (e) {
    console.error("Discipline fetch error:", e);
  } finally {
    disciplineData.value.loading = false;
  }
}

async function fetchTahfidz() {
  tahfidzData.value.loading = true;
  try {
    const [resDeposits, resSurahs] = await Promise.all([
      tahfidzApi.getDeposits({ studentId: student.value?.id }),
      surahList.value.length === 0
        ? quranApi.getSurahs()
        : Promise.resolve({ data: surahList.value }),
    ]);

    if (resSurahs?.data && surahList.value.length === 0) {
      surahList.value = resSurahs.data;
    }

    if (resDeposits?.data) {
      tahfidzData.value.deposits = resDeposits.data;
    }
    tahfidzData.value.loaded = true;
  } catch (e) {
    console.error("Tahfidz fetch error:", e);
  } finally {
    tahfidzData.value.loading = false;
  }
}

async function fetchHealth() {
  healthData.value.loading = true;
  try {
    const res = await clinicApi.getExaminations({
      patientId: student.value?.id,
      patientType: "student",
    });
    if (res?.data) {
      healthData.value.examinations = res.data;
    }
    healthData.value.loaded = true;
  } catch (e) {
    console.error("Health fetch error:", e);
  } finally {
    healthData.value.loading = false;
  }
}

async function fetchTimeline() {
  if (!student.value?.id) return;
  timelineData.value.loading = true;
  timelineData.value.error = "";
  try {
    const res = await studentsApi.getTimeline(student.value.id);
    if (res?.success && res?.data) {
      timelineData.value.data = res.data;
      timelineData.value.loaded = true;
    } else {
      throw new Error(res?.message || "Gagal memuat timeline historikal");
    }
  } catch (e) {
    console.error("Timeline fetch error:", e);
    timelineData.value.error = e.message || "Gagal memuat timeline historikal";
  } finally {
    timelineData.value.loading = false;
  }
}

// Photo Upload State
const photoInput = ref(null);
const uploadingPhoto = ref(false);
const showCropper = ref(false);
const cropperImage = ref("");

// Computed Photo URL
const photoUrl = computed(() => {
  if (!student.value?.photo) return null;
  const base = import.meta.env.VITE_API_BASE_URL || "";
  if (student.value.photo.startsWith("uploads/")) {
    return `${base}/api/${student.value.photo}`;
  }
  return student.value.photo;
});

// Photo Actions
const triggerPhotoUpload = () => {
  if (photoInput.value) photoInput.value.click();
};

const handlePhotoUpload = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    openStatusModal("error", "Gagal", "Hanya file gambar yang diperbolehkan");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    cropperImage.value = e.target.result;
    showCropper.value = true;
  };
  reader.readAsDataURL(file);
  event.target.value = "";
};

async function handleCrop(blob) {
  showCropper.value = false;
  if (!blob) return;
  await uploadPhoto(blob);
}

async function uploadPhoto(fileOrBlob) {
  uploadingPhoto.value = true;

  try {
    const token = localStorage.getItem("token");
    const base = import.meta.env.VITE_API_BASE_URL || "";

    const formData = new FormData();
    const filename = `student_${student.value.id}.png`;
    formData.append("file", fileOrBlob, filename);

    const uploadRes = await fetch(`${base}/api/uploads`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!uploadRes.ok) throw new Error("Gagal upload foto");

    const uploadData = await uploadRes.json();
    const photoPath = uploadData.data?.filePath;

    // Update Student Record
    const updateRes = await studentsApi.update(student.value.id, {
      photo: photoPath,
    });

    if (updateRes.success) {
      student.value = { ...student.value, photo: photoPath };
      openStatusModal("success", "Berhasil", "Foto profil berhasil diperbarui");
    } else {
      throw new Error(
        updateRes.message || "Gagal menyimpan foto ke data santri",
      );
    }
  } catch (err) {
    console.error(err);
    openStatusModal("error", "Gagal", "Terjadi kesalahan saat mengupload foto");
  } finally {
    uploadingPhoto.value = false;
  }
}

// Status Modal
const statusModal = reactive({
  isOpen: false,
  type: "success",
  title: "",
  message: "",
});

function openStatusModal(type, title, message) {
  statusModal.isOpen = true;
  statusModal.type = type;
  statusModal.title = title;
  statusModal.message = message;
}

const loading = ref(true);
const error = ref("");
const student = ref(null);
const parents = ref([]);

// Edit Modal state (Student)
const editModal = reactive({
  show: false,
  saving: false,
  error: "",
});

const editForm = reactive({
  nis: "",
  fullName: "",
  birthDate: "",
  birthPlace: "",
  gender: "male",
  phone: "",
  // Address structure matching AddressSelector v-model
  addressData: {
    province: null,
    regency: null,
    district: null,
    village: null,
    addressDetail: "",
    postalCode: "",
  },
  status: "active",
});

// Parent Edit Modal state
const parentEditModal = reactive({
  show: false,
  saving: false,
  error: "",
  parentId: null,
});

const parentForm = reactive({
  fatherName: "",
  motherName: "",
  fatherOccupation: "",
  motherOccupation: "",
  phone: "",
  addressData: {
    province: null,
    regency: null,
    district: null,
    village: null,
    addressDetail: "",
    postalCode: "",
  },
});

// Status Modal

// Status styling
const statusColors = {
  active: {
    bg: "bg-green-500",
    badge: "bg-green-100 text-green-700",
    dot: "bg-green-500",
  },
  inactive: {
    bg: "bg-slate-500",
    badge: "bg-slate-100 text-slate-700",
    dot: "bg-slate-500",
  },
  graduated: {
    bg: "bg-blue-500",
    badge: "bg-blue-100 text-blue-700",
    dot: "bg-blue-500",
  },
  transferred: {
    bg: "bg-amber-500",
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
  },
  dropped: {
    bg: "bg-red-500",
    badge: "bg-red-100 text-red-700",
    dot: "bg-red-500",
  },
};

const statusLabels = {
  active: "Aktif",
  inactive: "Tidak Aktif",
  graduated: "Lulus",
  transferred: "Pindah",
  dropped: "Keluar",
};

const statusIcons = {
  active: "solar:check-circle-bold",
  inactive: "solar:minus-circle-bold",
  graduated: "solar:diploma-bold",
  transferred: "solar:transfer-horizontal-bold",
  dropped: "solar:close-circle-bold",
};

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateForInput(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}

const timelineCategoryMap = {
  identity: {
    label: "Identitas",
    icon: "solar:user-id-bold-duotone",
    bg: "bg-slate-100",
    color: "text-slate-600",
    badge: "bg-slate-100 text-slate-700",
    dot: "bg-slate-500 border-slate-200",
  },
  academic: {
    label: "Akademik",
    icon: "solar:diploma-bold-duotone",
    bg: "bg-blue-100",
    color: "text-blue-600",
    badge: "bg-blue-100 text-blue-700",
    dot: "bg-blue-500 border-blue-200",
  },
  tahfidz: {
    label: "Tahfidz",
    icon: "solar:book-bookmark-bold-duotone",
    bg: "bg-emerald-100",
    color: "text-emerald-600",
    badge: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500 border-emerald-200",
  },
  dormitory: {
    label: "Asrama",
    icon: "solar:home-smile-bold-duotone",
    bg: "bg-amber-100",
    color: "text-amber-700",
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500 border-amber-200",
  },
  halaqah: {
    label: "Halaqah",
    icon: "solar:users-group-rounded-bold-duotone",
    bg: "bg-purple-100",
    color: "text-purple-600",
    badge: "bg-purple-100 text-purple-700",
    dot: "bg-purple-500 border-purple-200",
  },
  health: {
    label: "Klinik",
    icon: "solar:heart-pulse-bold-duotone",
    bg: "bg-rose-100",
    color: "text-rose-600",
    badge: "bg-rose-100 text-rose-700",
    dot: "bg-rose-500 border-rose-200",
  },
  discipline: {
    label: "Kedisiplinan",
    icon: "solar:shield-warning-bold-duotone",
    bg: "bg-red-100",
    color: "text-red-600",
    badge: "bg-red-100 text-red-700",
    dot: "bg-red-500 border-red-200",
  },
  reward: {
    label: "Prestasi",
    icon: "solar:cup-star-bold-duotone",
    bg: "bg-yellow-100",
    color: "text-yellow-700",
    badge: "bg-yellow-100 text-yellow-700",
    dot: "bg-yellow-500 border-yellow-200",
  },
  status: {
    label: "Status",
    icon: "solar:check-circle-bold-duotone",
    bg: "bg-cyan-100",
    color: "text-cyan-700",
    badge: "bg-cyan-100 text-cyan-700",
    dot: "bg-cyan-500 border-cyan-200",
  },
  snapshot: {
    label: "Snapshot",
    icon: "solar:archive-bold-duotone",
    bg: "bg-indigo-100",
    color: "text-indigo-600",
    badge: "bg-indigo-100 text-indigo-700",
    dot: "bg-indigo-500 border-indigo-200",
  },
};

function getTimelineCategory(category) {
  return timelineCategoryMap[category] || timelineCategoryMap.identity;
}

const timelineSummaryCards = computed(() => {
  const totals = timelineData.value.data?.summary?.totals || {};
  return [
    {
      label: "Event",
      value: totals.timeline || 0,
      icon: "solar:timeline-bold-duotone",
      bg: "bg-indigo-100",
      color: "text-indigo-600",
    },
    {
      label: "Nilai",
      value: totals.grades || 0,
      icon: "solar:diploma-bold-duotone",
      bg: "bg-blue-100",
      color: "text-blue-600",
    },
    {
      label: "Setoran",
      value: totals.tahfidzDeposits || 0,
      icon: "solar:book-bookmark-bold-duotone",
      bg: "bg-emerald-100",
      color: "text-emerald-600",
    },
    {
      label: "Klinik",
      value: totals.healthExaminations || 0,
      icon: "solar:heart-pulse-bold-duotone",
      bg: "bg-rose-100",
      color: "text-rose-600",
    },
  ];
});

function sortPlacementItems(items) {
  return items.sort((a, b) => {
    const aTime = a.date ? new Date(a.date).getTime() : 0;
    const bTime = b.date ? new Date(b.date).getTime() : 0;
    return bTime - aTime;
  });
}

const placementGroups = computed(() => {
  const data = timelineData.value.data;
  const classItems = (data?.academic?.classHistory || []).map((item) => ({
    id: item.id,
    kind: "class",
    category: "academic",
    title: `Kelas ${item.class?.name || "-"}`,
    subtitle: [item.academicYear, item.semester ? `Semester ${item.semester}` : null, item.status]
      .filter(Boolean)
      .join(" • "),
    date: item.effectiveFrom || item.createdAt,
  }));
  const halaqahItems = (data?.halaqah?.memberships || []).map((item) => ({
    id: item.id,
    kind: "halaqah",
    category: "halaqah",
    title: `Halaqah ${item.halaqah?.name || "-"}`,
    subtitle: [item.joinedAt ? formatDate(item.joinedAt) : null, item.status]
      .filter(Boolean)
      .join(" • "),
    date: item.joinedAt || item.createdAt,
  }));
  const roomItems = (data?.dormitory?.roomHistory || []).map((item) => ({
    id: item.id,
    kind: "room",
    category: "dormitory",
    title: `Kamar ${item.room?.name || "-"}`,
    subtitle: [item.academicYear, item.bedLabel ? `Bed ${item.bedLabel}` : null, item.reason]
      .filter(Boolean)
      .join(" • "),
    date: item.effectiveFrom || item.createdAt,
  }));

  return [
    {
      key: "class",
      label: "Riwayat Kelas",
      emptyLabel: "riwayat kelas",
      category: "academic",
      items: sortPlacementItems(classItems),
    },
    {
      key: "halaqah",
      label: "Riwayat Halaqah",
      emptyLabel: "riwayat halaqah",
      category: "halaqah",
      items: sortPlacementItems(halaqahItems),
    },
    {
      key: "room",
      label: "Riwayat Kamar",
      emptyLabel: "riwayat kamar",
      category: "dormitory",
      items: sortPlacementItems(roomItems),
    },
  ];
});

// Helper to safely parse JSON or return value
function safeParse(val) {
  if (!val) return null;
  if (typeof val === "object") return val; // Already parsed
  try {
    return JSON.parse(val);
  } catch (e) {
    return null;
  }
}

function openEditModal() {
  if (!student.value) return;

  // Populate form with current student data
  editForm.nis = student.value.nis || "";
  editForm.fullName = student.value.fullName || "";
  editForm.birthDate = formatDateForInput(student.value.birthDate);
  editForm.birthPlace = student.value.birthPlace || "";
  editForm.gender = student.value.gender || "male";
  editForm.phone = student.value.phone || "";

  // Parse address fields
  editForm.addressData = {
    province: safeParse(student.value.province),
    regency: safeParse(student.value.regency),
    district: safeParse(student.value.district),
    village: safeParse(student.value.village),
    addressDetail: student.value.addressDetail || "",
    postalCode: student.value.postalCode || "",
  };

  // Fallback: If no detailed address but plain address exists, put it in addressDetail?
  // User can then refine it using the selector.
  if (
    !editForm.addressData.addressDetail &&
    student.value.address &&
    !editForm.addressData.province
  ) {
    // editForm.addressData.addressDetail = student.value.address;
    // Not forcing this as it might duplicate if not careful.
  }

  editForm.status = student.value.status || "active";

  editModal.show = true;
  editModal.error = "";
}

function closeEditModal() {
  editModal.show = false;
  editModal.error = "";
}

async function saveStudent() {
  // Validation
  if (!editForm.nis?.trim()) {
    editModal.error = "NIS wajib diisi";
    return;
  }
  if (!editForm.fullName?.trim()) {
    editModal.error = "Nama lengkap wajib diisi";
    return;
  }

  editModal.saving = true;
  editModal.error = "";

  try {
    // Construct full address string for legacy compatibility
    const addr = editForm.addressData;
    const parts = [];
    if (addr.addressDetail) parts.push(addr.addressDetail);
    if (addr.village?.name) parts.push(addr.village.name);
    if (addr.district?.name) parts.push("Kec. " + addr.district.name);
    if (addr.regency?.name) parts.push(addr.regency.name);
    if (addr.province?.name) parts.push(addr.province.name);
    if (addr.postalCode) parts.push(addr.postalCode);
    const fullAddressString = parts.join(", ");

    const updateData = {
      nis: editForm.nis.trim(),
      fullName: editForm.fullName.trim(),
      birthDate: editForm.birthDate || undefined,
      birthPlace: editForm.birthPlace?.trim() || undefined,
      gender: editForm.gender,
      phone: editForm.phone?.trim() || undefined,
      status: editForm.status,

      // Address Fields
      address: fullAddressString || undefined,
      province: addr.province ? JSON.stringify(addr.province) : undefined,
      regency: addr.regency ? JSON.stringify(addr.regency) : undefined,
      district: addr.district ? JSON.stringify(addr.district) : undefined,
      village: addr.village ? JSON.stringify(addr.village) : undefined,
      addressDetail: addr.addressDetail || undefined,
      postalCode: addr.postalCode || undefined,
    };

    const response = await studentsApi.update(student.value.id, updateData);

    if (response.success) {
      // Update local state
      student.value = { ...student.value, ...response.data };
      closeEditModal();

      statusModal.type = "success";
      statusModal.title = "Berhasil!";
      statusModal.message = "Data santri berhasil diperbarui";
      statusModal.isOpen = true;
    } else {
      editModal.error = response.message || "Gagal menyimpan data";
    }
  } catch (err) {
    console.error("Save student error:", err);
    editModal.error = err.message || "Terjadi kesalahan saat menyimpan";
  } finally {
    editModal.saving = false;
  }
}

async function fetchStudent() {
  loading.value = true;
  error.value = "";

  try {
    const id = route.params.id;
    if (!id) {
      throw new Error("ID santri tidak ditemukan");
    }

    // Fetch student data (includes parents from backend)
    const response = await studentsApi.getById(id);
    if (response.success && response.data) {
      student.value = response.data;
      parents.value = response.data.parents || [];
    } else {
      throw new Error(response.message || "Gagal memuat data santri");
    }
  } catch (err) {
    console.error("Fetch student error:", err);
    error.value = err.message || "Terjadi kesalahan saat memuat data";
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchStudent();
});

// Parent Edit Modal Functions
function openParentEditModal(parent) {
  parentEditModal.parentId = parent.id;
  parentForm.fatherName = parent.fatherName || "";
  parentForm.motherName = parent.motherName || "";
  parentForm.fatherOccupation = parent.fatherOccupation || "";
  parentForm.motherOccupation = parent.motherOccupation || "";
  parentForm.phone = parent.phone || "";

  parentForm.addressData = {
    province: safeParse(parent.province),
    regency: safeParse(parent.regency),
    district: safeParse(parent.district),
    village: safeParse(parent.village),
    addressDetail: parent.addressDetail || "",
    postalCode: parent.postalCode || "",
  };
  parentEditModal.show = true;
  parentEditModal.error = "";
}

function closeParentEditModal() {
  parentEditModal.show = false;
  parentEditModal.error = "";
  parentEditModal.parentId = null;
}

async function saveParent() {
  parentEditModal.saving = true;
  parentEditModal.error = "";

  try {
    const updateData = {
      fatherName: parentForm.fatherName?.trim() || undefined,
      motherName: parentForm.motherName?.trim() || undefined,
      fatherOccupation: parentForm.fatherOccupation?.trim() || undefined,
      motherOccupation: parentForm.motherOccupation?.trim() || undefined,
      phone: parentForm.phone?.trim() || undefined,

      // Address Fields
      address: (() => {
        const addr = parentForm.addressData;
        const parts = [];
        if (addr.addressDetail) parts.push(addr.addressDetail);
        if (addr.village?.name) parts.push(addr.village.name);
        if (addr.district?.name) parts.push("Kec. " + addr.district.name);
        if (addr.regency?.name) parts.push(addr.regency.name);
        if (addr.province?.name) parts.push(addr.province.name);
        if (addr.postalCode) parts.push(addr.postalCode);
        return parts.join(", ") || undefined;
      })(),
      province: parentForm.addressData.province
        ? JSON.stringify(parentForm.addressData.province)
        : undefined,
      regency: parentForm.addressData.regency
        ? JSON.stringify(parentForm.addressData.regency)
        : undefined,
      district: parentForm.addressData.district
        ? JSON.stringify(parentForm.addressData.district)
        : undefined,
      village: parentForm.addressData.village
        ? JSON.stringify(parentForm.addressData.village)
        : undefined,
      addressDetail: parentForm.addressData.addressDetail || undefined,
      postalCode: parentForm.addressData.postalCode || undefined,
    };

    const response = await parentsApi.update(
      parentEditModal.parentId,
      updateData,
    );

    if (response.success) {
      // Update local parents array
      const idx = parents.value.findIndex(
        (p) => p.id === parentEditModal.parentId,
      );
      if (idx !== -1) {
        parents.value[idx] = { ...parents.value[idx], ...response.data };
      }
      closeParentEditModal();

      statusModal.type = "success";
      statusModal.title = "Berhasil!";
      statusModal.message = "Data orang tua berhasil diperbarui";
      statusModal.isOpen = true;
    } else {
      parentEditModal.error = response.message || "Gagal menyimpan data";
    }
  } catch (err) {
    console.error("Save parent error:", err);
    parentEditModal.error = err.message || "Terjadi kesalahan saat menyimpan";
  } finally {
    parentEditModal.saving = false;
  }
}

function goBackToList() {
  if (route.path.startsWith("/mobile-dashboard")) {
    router.push("/mobile-dashboard/students");
  } else {
    router.push("/apps/students");
  }
}
</script>

<style scoped>
/* Custom animations */
@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}
</style>
