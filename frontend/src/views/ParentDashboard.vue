<template>
  <div class="min-h-screen bg-slate-50">
    <!-- Header -->
    <div class="bg-white border-b shadow-sm sticky top-0 z-10">
      <div class="max-w-7xl mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center"
            >
              <Icon
                icon="solar:users-group-rounded-line-duotone"
                class="w-6 h-6 text-primary-600"
              />
            </div>
            <div>
              <h1 class="text-xl font-semibold text-slate-800">
                Dashboard Orang Tua
              </h1>
              <p class="text-sm text-slate-500">
                Pantau perkembangan & pengajuan izin anak Anda
              </p>
            </div>
          </div>
          <button
            @click="logout"
            class="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Icon icon="solar:logout-2-line-duotone" class="w-5 h-5" />
            Keluar
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <Icon
          icon="svg-spinners:ring-resize"
          class="w-12 h-12 text-primary-600 mx-auto mb-4"
        />
        <p class="text-slate-500">Memuat data...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="max-w-7xl mx-auto px-4 py-10">
      <div class="bg-red-50 rounded-xl p-6 text-center">
        <Icon
          icon="solar:danger-triangle-line-duotone"
          class="w-12 h-12 text-red-500 mx-auto mb-4"
        />
        <p class="text-red-600 font-medium">{{ error }}</p>
        <button
          @click="loadData"
          class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Coba Lagi
        </button>
      </div>
    </div>

    <!-- No Children State -->
    <div v-else-if="children.length === 0" class="max-w-7xl mx-auto px-4 py-10">
      <div class="bg-yellow-50 rounded-xl p-6 text-center">
        <Icon
          icon="solar:user-cross-line-duotone"
          class="w-12 h-12 text-yellow-500 mx-auto mb-4"
        />
        <p class="text-yellow-700 font-medium">
          Belum ada data anak yang terhubung dengan akun Anda
        </p>
        <p class="text-yellow-600 text-sm mt-2">
          Silakan hubungi pihak pesantren untuk menghubungkan data anak Anda
        </p>
      </div>
    </div>

    <!-- Children Cards -->
    <div v-else class="max-w-7xl mx-auto px-4 py-6">
      <div class="space-y-6">
        <div
          v-for="child in children"
          :key="child.id"
          class="bg-white rounded-2xl shadow-sm border overflow-hidden"
        >
          <!-- Child Header -->
          <div class="bg-gradient-to-r from-primary-600 to-primary-700 p-4">
            <div class="flex flex-wrap items-center gap-4">
              <div
                class="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center overflow-hidden"
              >
                <img
                  v-if="child.photo"
                  :src="getPhotoUrl(child.photo)"
                  :alt="child.fullName"
                  class="w-full h-full object-cover"
                />
                <Icon
                  v-else
                  icon="solar:user-circle-line-duotone"
                  class="w-10 h-10 text-white"
                />
              </div>
              <div class="flex-1 min-w-[180px] text-white">
                <h2 class="text-lg font-semibold">{{ child.fullName }}</h2>
                <p v-if="child.fullNameAr" class="text-sm text-white/80 rtl">
                  {{ child.fullNameAr }}
                </p>
                <div class="flex items-center gap-3 mt-1 text-sm text-white/80">
                  <span>NIS: {{ child.nis }}</span>
                  <span v-if="child.className"
                    >• Kelas {{ child.className }}</span
                  >
                </div>
              </div>
              <!-- Quick Action & Report Card Buttons -->
              <div class="flex flex-wrap items-center gap-2">
                <button
                  @click="openLeaveModal(child)"
                  class="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-900 text-sm font-bold shadow-sm transition-colors"
                  title="Ajukan Izin Keluar / Pulang"
                >
                  <Icon icon="solar:qr-code-bold-duotone" class="w-4 h-4" />
                  <span>Ajukan Izin</span>
                </button>
                <button
                  @click="openAcademicReport(child)"
                  class="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-colors"
                  title="Rapor Pesantren"
                >
                  <Icon
                    icon="solar:document-text-line-duotone"
                    class="w-4 h-4"
                  />
                  <span class="hidden sm:inline">Rapor Pesantren</span>
                </button>
                <button
                  @click="openTahfidzReport(child)"
                  class="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-colors"
                  title="Rapor Tahfidz"
                >
                  <Icon icon="solar:book-2-line-duotone" class="w-4 h-4" />
                  <span class="hidden sm:inline">Rapor Tahfidz</span>
                </button>
              </div>
              <button
                @click="toggleChildExpand(child.id)"
                class="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <Icon
                  :icon="
                    expandedChildren.includes(child.id)
                      ? 'solar:alt-arrow-up-line-duotone'
                      : 'solar:alt-arrow-down-line-duotone'
                  "
                  class="w-6 h-6 text-white"
                />
              </button>
            </div>
          </div>

          <!-- Summary Cards (Always visible) -->
          <div class="p-4">
            <div v-if="!childSummaries[child.id]" class="text-center py-4">
              <Icon
                icon="svg-spinners:ring-resize"
                class="w-6 h-6 text-primary-600 mx-auto"
              />
            </div>
            <div v-else class="grid grid-cols-2 md:grid-cols-5 gap-3">
              <!-- Academic -->
              <StatCard
                icon="solar:diploma-line-duotone"
                color="blue"
                label="Akademik"
                :value="childSummaries[child.id]?.academic?.averageScore || '-'"
                caption="Rata-rata nilai"
                class="cursor-pointer hover:border-blue-300 transition-colors"
                @click="showDetail(child.id, 'academic')"
              />

              <!-- Discipline -->
              <StatCard
                icon="solar:medal-ribbons-star-line-duotone"
                color="amber"
                label="Kedisiplinan"
                :value="childSummaries[child.id]?.discipline?.netPoints || 0"
                :value-class="
                  (childSummaries[child.id]?.discipline?.netPoints || 0) >= 0
                    ? 'text-green-700'
                    : 'text-red-700'
                "
                caption="Poin bersih"
                class="cursor-pointer hover:border-amber-300 transition-colors"
                @click="showDetail(child.id, 'discipline')"
              />

              <!-- Clinic -->
              <StatCard
                icon="solar:health-line-duotone"
                color="emerald"
                label="Kesehatan"
                :value="childSummaries[child.id]?.clinic?.visitsCount || 0"
                caption="Kunjungan klinik"
                class="cursor-pointer hover:border-emerald-300 transition-colors"
                @click="showDetail(child.id, 'clinic')"
              />

              <!-- Tahfidz -->
              <StatCard
                icon="solar:book-bookmark-line-duotone"
                color="purple"
                label="Tahfidz"
                :value="
                  Number(
                    childSummaries[child.id]?.tahfidz?.totalPages || 0
                  ).toFixed(1)
                "
                caption="Halaman setor"
                class="cursor-pointer hover:border-purple-300 transition-colors"
                @click="showDetail(child.id, 'tahfidz')"
              />

              <!-- Perizinan -->
              <StatCard
                icon="solar:qr-code-line-duotone"
                color="indigo"
                label="Perizinan"
                :value="childSummaries[child.id]?.leaves?.totalCount || 0"
                :caption="
                  childSummaries[child.id]?.leaves?.pendingCount
                    ? `${childSummaries[child.id].leaves.pendingCount} menunggu ACC`
                    : childSummaries[child.id]?.leaves?.activeCount
                    ? `${childSummaries[child.id].leaves.activeCount} izin aktif`
                    : 'Riwayat & Surat QR'
                "
                class="cursor-pointer hover:border-indigo-300 transition-colors col-span-2 md:col-span-1"
                @click="showDetail(child.id, 'leaves')"
              />
            </div>
          </div>

          <!-- Expanded Detail Section -->
          <div v-if="expandedChildren.includes(child.id)" class="border-t">
            <!-- Tabs -->
            <div class="flex overflow-x-auto bg-slate-50 border-b">
              <button
                v-for="tab in tabs"
                :key="tab.id"
                @click="selectTab(child.id, tab.id)"
                :class="[
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                  childTabs[child.id] === tab.id
                    ? 'border-primary-600 text-primary-600 bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900',
                ]"
              >
                <Icon :icon="tab.icon" class="w-4 h-4" />
                {{ tab.label }}
              </button>
            </div>

            <!-- Tab Content -->
            <div class="p-4">
              <!-- Loading detail -->
              <div v-if="loadingDetail[child.id]" class="text-center py-8">
                <Icon
                  icon="svg-spinners:ring-resize"
                  class="w-8 h-8 text-primary-600 mx-auto"
                />
              </div>

              <!-- Academic Tab -->
              <div
                v-else-if="childTabs[child.id] === 'academic'"
                class="space-y-4"
              >
                <div
                  v-if="!childDetails[child.id]?.academic?.grades?.length"
                  class="text-center py-8 text-slate-500"
                >
                  Belum ada data nilai
                </div>
                <div v-else class="overflow-x-auto">
                  <table class="w-full text-sm">
                    <thead class="bg-slate-50">
                      <tr>
                        <th class="text-left p-3 font-medium text-slate-600">
                          Mata Pelajaran
                        </th>
                        <th class="text-center p-3 font-medium text-slate-600">
                          Rata-rata
                        </th>
                        <th class="text-center p-3 font-medium text-slate-600">
                          Predikat
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="grade in childDetails[
                          child.id
                        ]?.academic?.grades.slice(0, 10)"
                        :key="grade.id"
                        class="border-b"
                      >
                        <td class="p-3">{{ grade.subjectName || "-" }}</td>
                        <td class="p-3 text-center font-medium">
                          {{ grade.averageScore || "-" }}
                        </td>
                        <td class="p-3 text-center">
                          <span
                            class="px-2 py-1 rounded-full text-xs font-medium"
                            :class="getGradeColor(grade.letterGrade)"
                          >
                            {{ grade.letterGrade || "-" }}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Discipline Tab -->
              <div
                v-else-if="childTabs[child.id] === 'discipline'"
                class="space-y-4"
              >
                <!-- Warnings -->
                <div
                  v-if="childDetails[child.id]?.discipline?.warnings?.length"
                  class="mb-4"
                >
                  <h4 class="font-medium text-slate-700 mb-2">
                    Surat Peringatan Aktif
                  </h4>
                  <div
                    v-for="warning in childDetails[
                      child.id
                    ].discipline.warnings.filter((w) => w.status === 'active')"
                    :key="warning.id"
                    class="bg-red-50 rounded-lg p-3 mb-2"
                  >
                    <div class="flex items-center gap-2">
                      <Icon
                        icon="solar:danger-triangle-line-duotone"
                        class="w-5 h-5 text-red-600"
                      />
                      <span class="font-medium text-red-700"
                        >SP {{ warning.spLevel }}</span
                      >
                      <span class="text-sm text-red-600"
                        >- {{ formatDate(warning.issueDate) }}</span
                      >
                    </div>
                    <p class="text-sm text-red-600 mt-1">
                      {{ warning.reason }}
                    </p>
                  </div>
                </div>

                <!-- R&P History -->
                <div
                  v-if="
                    !childDetails[child.id]?.discipline?.rewardsPunishments
                      ?.length
                  "
                  class="text-center py-8 text-slate-500"
                >
                  Belum ada catatan kedisiplinan
                </div>
                <div v-else class="space-y-2">
                  <div
                    v-for="rp in childDetails[
                      child.id
                    ].discipline.rewardsPunishments.slice(0, 10)"
                    :key="rp.id"
                    :class="[
                      'rounded-lg p-3 flex items-start gap-3',
                      rp.type === 'reward' ? 'bg-green-50' : 'bg-red-50',
                    ]"
                  >
                    <Icon
                      :icon="
                        rp.type === 'reward'
                          ? 'solar:star-line-duotone'
                          : 'solar:danger-circle-line-duotone'
                      "
                      :class="[
                        'w-5 h-5 mt-0.5',
                        rp.type === 'reward'
                          ? 'text-green-600'
                          : 'text-red-600',
                      ]"
                    />
                    <div class="flex-1">
                      <div class="flex items-center justify-between">
                        <span
                          :class="[
                            'font-medium',
                            rp.type === 'reward'
                              ? 'text-green-700'
                              : 'text-red-700',
                          ]"
                        >
                          {{ rp.title }}
                        </span>
                        <span
                          :class="[
                            'text-sm font-bold',
                            rp.type === 'reward'
                              ? 'text-green-600'
                              : 'text-red-600',
                          ]"
                        >
                          {{ rp.type === "reward" ? "+" : "" }}{{ rp.points }}
                        </span>
                      </div>
                      <p class="text-sm text-slate-600 mt-1">
                        {{ formatDate(rp.date) }} • {{ rp.category }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Clinic Tab -->
              <div
                v-else-if="childTabs[child.id] === 'clinic'"
                class="space-y-4"
              >
                <div
                  v-if="!childDetails[child.id]?.clinic?.examinations?.length"
                  class="text-center py-8 text-slate-500"
                >
                  Belum ada riwayat pemeriksaan
                </div>
                <div v-else class="space-y-3">
                  <div
                    v-for="exam in childDetails[
                      child.id
                    ].clinic.examinations.slice(0, 10)"
                    :key="exam.id"
                    class="bg-slate-50 rounded-lg p-4"
                  >
                    <div class="flex items-center justify-between mb-2">
                      <span class="font-medium text-slate-800">{{
                        formatDate(exam.examinationDate)
                      }}</span>
                      <span
                        v-if="exam.isInpatient"
                        class="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full"
                        >Rawat Inap</span
                      >
                    </div>
                    <div
                      v-if="exam.symptoms"
                      class="text-sm text-slate-600 mb-1"
                    >
                      <span class="font-medium">Keluhan:</span>
                      {{ exam.symptoms }}
                    </div>
                    <div
                      v-if="exam.diagnosis"
                      class="text-sm text-slate-600 mb-1"
                    >
                      <span class="font-medium">Diagnosis:</span>
                      {{ exam.diagnosis }}
                    </div>
                    <div v-if="exam.treatment" class="text-sm text-slate-600">
                      <span class="font-medium">Tindakan:</span>
                      {{ exam.treatment }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Tahfidz Tab -->
              <div
                v-else-if="childTabs[child.id] === 'tahfidz'"
                class="space-y-4"
              >
                <!-- Exams -->
                <div
                  v-if="childDetails[child.id]?.tahfidz?.exams?.length"
                  class="mb-4"
                >
                  <h4 class="font-medium text-slate-700 mb-2">
                    Hasil Ujian Tahfidz
                  </h4>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div
                      v-for="exam in childDetails[child.id].tahfidz.exams.slice(
                        0,
                        4
                      )"
                      :key="exam.id"
                      :class="[
                        'rounded-lg p-3',
                        exam.verdict === 'pass'
                          ? 'bg-green-50'
                          : exam.verdict === 'fail'
                          ? 'bg-red-50'
                          : 'bg-yellow-50',
                      ]"
                    >
                      <div class="flex items-center justify-between">
                        <span class="font-medium text-slate-800">{{
                          exam.examType
                        }}</span>
                        <span
                          :class="[
                            'text-sm px-2 py-0.5 rounded-full font-medium',
                            exam.verdict === 'pass'
                              ? 'bg-green-200 text-green-700'
                              : exam.verdict === 'fail'
                              ? 'bg-red-200 text-red-700'
                              : 'bg-yellow-200 text-yellow-700',
                          ]"
                        >
                          {{
                            exam.verdict === "pass"
                              ? "Lulus"
                              : exam.verdict === "fail"
                              ? "Tidak Lulus"
                              : "Bersyarat"
                          }}
                        </span>
                      </div>
                      <p class="text-sm text-slate-600 mt-1">
                        {{ formatDate(exam.examDate) }} • Nilai:
                        {{ exam.finalScore }}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Recent Deposits -->
                <div>
                  <h4 class="font-medium text-slate-700 mb-2">
                    Setoran Terakhir
                  </h4>
                  <div
                    v-if="!childDetails[child.id]?.tahfidz?.deposits?.length"
                    class="text-center py-4 text-slate-500"
                  >
                    Belum ada data setoran
                  </div>
                  <div v-else class="space-y-2">
                    <div
                      v-for="deposit in childDetails[
                        child.id
                      ].tahfidz.deposits.slice(0, 5)"
                      :key="deposit.id"
                      class="bg-slate-50 rounded-lg p-3 flex items-center gap-3"
                    >
                      <div
                        :class="[
                          'w-10 h-10 rounded-full flex items-center justify-center',
                          deposit.type === 'ziyadah'
                            ? 'bg-purple-100'
                            : deposit.type === 'sabqi'
                            ? 'bg-teal-100'
                            : deposit.type === 'manzil'
                            ? 'bg-indigo-100'
                            : deposit.type === 'murajaah'
                            ? 'bg-blue-100'
                            : deposit.type === 'tidak_setor'
                            ? 'bg-orange-100'
                            : 'bg-slate-200',
                        ]"
                      >
                        <Icon
                          :icon="
                            deposit.type === 'ziyadah'
                              ? 'solar:add-circle-line-duotone'
                              : deposit.type === 'sabqi' ||
                                deposit.type === 'manzil'
                              ? 'solar:refresh-circle-line-duotone'
                              : deposit.type === 'murajaah'
                              ? 'solar:refresh-circle-line-duotone'
                              : deposit.type === 'tidak_setor'
                              ? 'solar:close-circle-line-duotone'
                              : 'solar:calendar-mark-line-duotone'
                          "
                          :class="[
                            'w-5 h-5',
                            deposit.type === 'ziyadah'
                              ? 'text-purple-600'
                              : deposit.type === 'sabqi'
                              ? 'text-teal-600'
                              : deposit.type === 'manzil'
                              ? 'text-indigo-600'
                              : deposit.type === 'murajaah'
                              ? 'text-blue-600'
                              : deposit.type === 'tidak_setor'
                              ? 'text-orange-600'
                              : 'text-slate-500',
                          ]"
                        />
                      </div>
                      <div class="flex-1">
                        <div class="flex items-center justify-between">
                          <span class="font-medium text-slate-800 capitalize">{{
                            deposit.type === "ziyadah"
                              ? "Taqdim"
                              : deposit.type === "tidak_setor"
                              ? "Tidak Setor"
                              : deposit.type === "sabqi"
                              ? `Sabqi (${deposit.isCompleted ? "Sudah" : "Belum"})`
                              : deposit.type === "manzil"
                              ? `Manzil (${deposit.isCompleted ? "Sudah" : "Belum"})`
                              : deposit.type
                          }}</span>
                          <span class="text-sm text-slate-500">{{
                            formatDateTime(deposit.depositDate)
                          }}</span>
                        </div>
                        <p class="text-sm text-slate-600">
                          <span v-if="deposit.totalPages"
                            >{{ deposit.totalPages }} halaman</span
                          >
                          <span v-if="deposit.fluency">
                            • {{ deposit.fluency }}</span
                          >
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- PERIZINAN / LEAVES TAB -->
              <div
                v-else-if="childTabs[child.id] === 'leaves'"
                class="space-y-4"
              >
                <div
                  class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-amber-50/70 border border-amber-200/70 rounded-xl p-4"
                >
                  <div>
                    <h4 class="font-semibold text-slate-800 text-sm">
                      Pengajuan Izin Keluar & Pulang Santri
                    </h4>
                    <p class="text-xs text-slate-600 mt-0.5">
                      Ajukan izin dari rumah. Setelah disetujui Kesantrian, Surat Izin Resmi
                      ber-QR Code akan diterbitkan untuk di-scan saat keluar & kembali ke pondok.
                    </p>
                  </div>
                  <button
                    @click="openLeaveModal(child)"
                    class="px-4 py-2.5 rounded-xl bg-[#602515] hover:bg-[#7b311d] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition flex-shrink-0"
                  >
                    <Icon icon="solar:add-square-bold-duotone" class="w-4 h-4" />
                    Ajukan Izin Baru
                  </button>
                </div>

                <!-- Empty state -->
                <div
                  v-if="!childDetails[child.id]?.leaves?.leaves?.length"
                  class="text-center py-10 text-slate-500 border border-dashed rounded-xl"
                >
                  <Icon
                    icon="solar:qr-code-line-duotone"
                    class="w-10 h-10 text-slate-300 mx-auto mb-2"
                  />
                  <p class="text-sm font-medium">
                    Belum ada riwayat pengajuan izin untuk {{ child.fullName }}
                  </p>
                </div>

                <!-- Leave Cards -->
                <div v-else class="space-y-3">
                  <div
                    v-for="leave in childDetails[child.id].leaves.leaves"
                    :key="leave.id"
                    class="border rounded-xl p-4 bg-white shadow-xs hover:border-slate-300 transition"
                  >
                    <div
                      class="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-slate-100"
                    >
                      <div class="flex flex-wrap items-center gap-2">
                        <span
                          class="px-2.5 py-1 rounded-full text-xs font-bold uppercase"
                          :class="getLeaveStatusBadge(leave).class"
                        >
                          {{ getLeaveStatusBadge(leave).label }}
                        </span>
                        <span
                          class="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold"
                        >
                          {{ getCategoryLabel(leave) }}
                        </span>
                        <span
                          v-if="leave.leaveNumber"
                          class="text-xs font-mono text-slate-500"
                        >
                          No: {{ leave.leaveNumber }}
                        </span>
                      </div>

                      <div class="flex items-center gap-2">
                        <!--Lihat / Cetak Surat QR jika sudah disetujui / keluar / kembali-->
                        <button
                          v-if="leave.status !== 'pending' && leave.status !== 'rejected'"
                          @click="openLetterPreview(leave)"
                          class="px-3 py-1.5 rounded-lg bg-[#602515]/10 hover:bg-[#602515] text-[#602515] hover:text-white text-xs font-bold flex items-center gap-1.5 transition"
                        >
                          <Icon icon="solar:qr-code-bold" class="w-4 h-4" />
                          Surat Izin & QR Code
                        </button>

                        <!--Batalkan jika masih pending-->
                        <button
                          v-if="leave.status === 'pending'"
                          @click="cancelLeaveRequest(child.id, leave)"
                          class="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold flex items-center gap-1 transition"
                        >
                          <Icon icon="solar:trash-bin-trash-bold" class="w-3.5 h-3.5" />
                          Batalkan
                        </button>
                      </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 py-3 text-xs">
                      <div>
                        <span class="text-slate-400 block mb-0.5">Jadwal Izin:</span>
                        <p class="font-semibold text-slate-800">
                          {{ formatDate(leave.startDate) }} ({{ leave.startTime || "08:00" }})
                        </p>
                        <p class="text-slate-600">
                          s/d
                          <strong class="text-red-700">
                            {{ formatDate(leave.endDate) }} ({{ leave.endTime || "17:00" }} WIB)
                          </strong>
                        </p>
                      </div>

                      <div>
                        <span class="text-slate-400 block mb-0.5">Alasan & Tujuan:</span>
                        <p class="font-medium text-slate-800">{{ leave.reason }}</p>
                        <p v-if="leave.destination" class="text-slate-500">
                          Tujuan: {{ leave.destination }}
                        </p>
                      </div>

                      <div>
                        <span class="text-slate-400 block mb-0.5">Penjemput:</span>
                        <p class="font-medium text-slate-800">
                          {{ leave.pickupName || "-" }}
                          <span v-if="leave.pickupRelation" class="text-slate-500">
                            ({{ leave.pickupRelation }})
                          </span>
                        </p>
                        <p v-if="leave.pickupPhone" class="text-slate-500">
                          HP: {{ leave.pickupPhone }}
                        </p>
                      </div>
                    </div>

                    <!-- Info Scan / Penolakan / Keterlambatan -->
                    <div
                      v-if="leave.status === 'rejected' && leave.rejectionReason"
                      class="mt-2 p-2.5 rounded-lg bg-red-50 border border-red-100 text-xs text-red-700"
                    >
                      <strong>Alasan Ditolak:</strong> {{ leave.rejectionReason }}
                    </div>

                    <div
                      v-if="leave.checkedOutAt || leave.checkedInAt || leave.isOverdue"
                      class="mt-2 pt-2.5 border-t border-dashed border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs"
                    >
                      <div class="flex flex-wrap gap-4 text-slate-600">
                        <span v-if="leave.checkedOutAt">
                          <strong>Scan Keluar:</strong>
                          {{ formatDateTime(leave.checkedOutAt) }}
                        </span>
                        <span v-if="leave.checkedInAt">
                          <strong>Scan Kembali:</strong>
                          {{ formatDateTime(leave.checkedInAt) }}
                        </span>
                      </div>

                      <div v-if="leave.isOverdue" class="text-red-600 font-bold flex items-center gap-1">
                        <Icon icon="solar:danger-triangle-bold" class="w-4 h-4" />
                        Melebihi Batas Waktu ({{ leave.overdueDurationText }})
                      </div>
                      <div
                        v-else-if="leave.status === 'returned_late'"
                        class="text-red-600 font-semibold"
                      >
                        Kembali Terlambat ({{ leave.overdueDurationText }})
                        <span v-if="leave.punishment">
                          • Poin Kedisiplinan: {{ leave.punishment.points }}
                        </span>
                        <span v-else-if="leave.lateHandling === 'excused'">
                          • Dimaafkan (Uzur)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL PENGAJUAN IZIN OLEH ORANG TUA -->
    <div
      v-if="leaveModal.show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 overflow-y-auto"
      @click.self="leaveModal.show = false"
    >
      <div
        class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100"
      >
        <div
          class="px-5 py-4 bg-gradient-to-r from-[#602515] to-[#8c3d2a] text-white flex items-center justify-between"
        >
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Icon icon="solar:qr-code-bold-duotone" class="w-6 h-6" />
            </div>
            <div>
              <h3 class="font-bold text-base">Form Pengajuan Perizinan Santri</h3>
              <p class="text-xs text-white/80">
                Santri: <strong>{{ leaveModal.child?.fullName }}</strong> (NIS:
                {{ leaveModal.child?.nis }})
              </p>
            </div>
          </div>
          <button
            @click="leaveModal.show = false"
            class="p-1.5 rounded-lg hover:bg-white/15 text-white transition"
          >
            <Icon icon="solar:close-circle-bold" class="w-6 h-6" />
          </button>
        </div>

        <form
          @submit.prevent="submitParentLeave"
          class="p-5 overflow-y-auto space-y-4 text-sm"
        >
          <!-- Kategori Izin -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Kategori Perizinan
            </label>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                v-for="cat in leaveCategories"
                :key="cat.value"
                type="button"
                @click="leaveForm.leaveCategory = cat.value"
                :class="
                  leaveForm.leaveCategory === cat.value
                    ? 'bg-[#602515] text-white border-[#602515] shadow-md'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                "
                class="p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition"
              >
                <Icon :icon="cat.icon" class="w-5 h-5" />
                <span>{{ cat.label }}</span>
              </button>
            </div>
          </div>

          <!-- Jadwal Keluar & Batas Kembali -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">
                Tanggal & Jam Rencana Keluar/Jemput *
              </label>
              <div class="flex gap-2">
                <input
                  type="date"
                  v-model="leaveForm.startDate"
                  required
                  class="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium bg-white"
                />
                <input
                  type="time"
                  v-model="leaveForm.startTime"
                  required
                  class="w-28 px-2.5 py-2 border border-slate-300 rounded-lg text-xs font-medium bg-white"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-red-700 mb-1">
                Tanggal & Jam Rencana Kembali ke Pondok *
              </label>
              <div class="flex gap-2">
                <input
                  type="date"
                  v-model="leaveForm.endDate"
                  :min="leaveForm.startDate"
                  required
                  class="flex-1 px-3 py-2 border border-red-200 rounded-lg text-xs font-medium bg-white"
                />
                <input
                  type="time"
                  v-model="leaveForm.endTime"
                  required
                  class="w-28 px-2.5 py-2 border border-red-200 rounded-lg text-xs font-medium bg-white"
                />
              </div>
            </div>
          </div>

          <!-- Tujuan & Alasan -->
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">
              Alamat / Kota Tujuan Pulang/Keluar *
            </label>
            <input
              type="text"
              v-model="leaveForm.destination"
              required
              placeholder="Contoh: Rumah Orang Tua (Bekasi) / RSUD Purwakarta"
              class="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#602515]/20 outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">
              Alasan / Keperluan Lengkap *
            </label>
            <textarea
              v-model="leaveForm.reason"
              rows="3"
              required
              placeholder="Jelaskan keperluan izin keluar/pulang secara jelas..."
              class="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#602515]/20 outline-none"
            ></textarea>
          </div>

          <!-- Data Penjemput -->
          <div class="border-t pt-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Identitas Penjemput / Penanggung Jawab
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-700 mb-1">
                  Nama Penjemput *
                </label>
                <input
                  type="text"
                  v-model="leaveForm.pickupName"
                  required
                  placeholder="Nama lengkap penjemput"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-700 mb-1">
                  Hubungan dgn Santri *
                </label>
                <select
                  v-model="leaveForm.pickupRelation"
                  required
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="Ayah Kandung">Ayah Kandung</option>
                  <option value="Ibu Kandung">Ibu Kandung</option>
                  <option value="Orang Tua (Ayah & Ibu)">Orang Tua (Ayah & Ibu)</option>
                  <option value="Kakak / Saudara Kandung">Kakak / Saudara Kandung</option>
                  <option value="Wali Resmi">Wali Resmi</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-700 mb-1">
                  No. HP / WhatsApp Aktif *
                </label>
                <input
                  type="text"
                  v-model="leaveForm.pickupPhone"
                  required
                  placeholder="Contoh: 0812xxxxxxxx"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          <!-- Lampiran Bukti Opsional -->
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">
              Lampiran Surat / Bukti Pendukung (Opsional)
            </label>
            <div class="flex items-center gap-3">
              <input
                type="file"
                accept="image/*,.pdf"
                @change="onParentFileChange"
                class="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
              />
              <span v-if="uploadingAttachment" class="text-xs text-amber-600 font-medium">
                Mengunggah...
              </span>
              <span
                v-else-if="leaveForm.attachment"
                class="text-xs text-emerald-600 font-semibold"
              >
                ✓ Lampiran siap
              </span>
            </div>
          </div>

          <div
            class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 leading-relaxed"
          >
            <strong>Perhatian:</strong> Setelah disetujui Bagian Kesantrian, surat izin ber-QR Code
            akan diterbitkan. QR Code wajib di-scan oleh Bagian Kesantrian saat santri
            <strong>keluar pondok</strong> dan di-scan kembali saat santri
            <strong>tiba di pondok</strong>. Keterlambatan kembali melebihi batas waktu akan
            dikenakan poin pelanggaran kedisiplinan.
          </div>

          <div class="flex justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              @click="leaveModal.show = false"
              class="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="submittingLeave || uploadingAttachment"
              class="px-5 py-2.5 rounded-xl bg-[#602515] hover:bg-[#7a311d] text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#602515]/20 disabled:opacity-50"
            >
              <Icon
                v-if="submittingLeave"
                icon="svg-spinners:ring-resize"
                class="w-4 h-4"
              />
              <Icon v-else icon="solar:plain-bold" class="w-4 h-4" />
              {{ submittingLeave ? "Mengirim..." : "Kirim Pengajuan Izin" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL SURAT IZIN JALAN A4 & QR CODE -->
    <StudentLeaveLetterModal
      :isOpen="letterPreview.show"
      :leave="letterPreview.leave"
      @close="letterPreview.show = false"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import { Icon } from "@iconify/vue";
import Swal from "sweetalert2";
import StatCard from "@/components/ui/StatCard.vue";
import StudentLeaveLetterModal from "@/components/leaves/StudentLeaveLetterModal.vue";
import { authApi, parentDashboardApi, studentLeavesApi } from "@/services/api.js";

const router = useRouter();
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

// State
const isLoading = ref(true);
const error = ref(null);
const children = ref([]);
const childSummaries = reactive({});
const childDetails = reactive({});
const childTabs = reactive({});
const loadingDetail = reactive({});
const expandedChildren = ref([]);

const tabs = [
  { id: "academic", label: "Akademik", icon: "solar:diploma-line-duotone" },
  {
    id: "discipline",
    label: "Kedisiplinan",
    icon: "solar:medal-ribbons-star-line-duotone",
  },
  { id: "clinic", label: "Kesehatan", icon: "solar:health-line-duotone" },
  { id: "tahfidz", label: "Tahfidz", icon: "solar:book-bookmark-line-duotone" },
  {
    id: "leaves",
    label: "Perizinan (Izin Pulang)",
    icon: "solar:qr-code-line-duotone",
  },
];

const leaveCategories = [
  { value: "pulang", label: "Izin Pulang", icon: "solar:home-smile-bold-duotone" },
  { value: "keluar", label: "Izin Keluar", icon: "solar:walking-round-bold-duotone" },
  { value: "sakit", label: "Izin Sakit", icon: "solar:health-bold-duotone" },
  { value: "kegiatan", label: "Dispensasi", icon: "solar:diploma-verified-bold-duotone" },
];

const todayStr = new Date().toISOString().split("T")[0];

const leaveModal = reactive({
  show: false,
  child: null,
});

const leaveForm = reactive({
  leaveCategory: "pulang",
  startDate: todayStr,
  endDate: todayStr,
  startTime: "08:00",
  endTime: "17:00",
  destination: "",
  reason: "",
  pickupName: "",
  pickupRelation: "Ayah Kandung",
  pickupPhone: "",
  attachment: "",
});

const submittingLeave = ref(false);
const uploadingAttachment = ref(false);

const letterPreview = reactive({
  show: false,
  leave: null,
});

// Methods
function getPhotoUrl(photo) {
  if (!photo) return null;
  if (photo.startsWith("http")) return photo;
  if (photo.startsWith("/api/")) return `${BASE_URL}${photo}`;
  return `${BASE_URL}/api/${photo}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getGradeColor(grade) {
  if (!grade) return "bg-slate-100 text-slate-600";
  if (grade.startsWith("A")) return "bg-green-100 text-green-700";
  if (grade.startsWith("B")) return "bg-blue-100 text-blue-700";
  if (grade.startsWith("C")) return "bg-yellow-100 text-yellow-700";
  if (grade.startsWith("D")) return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}

function getCategoryLabel(leave) {
  const cat = leave?.leaveCategory;
  if (cat === "keluar") return "Izin Keluar Komplek";
  if (cat === "sakit" || leave?.type === "sick") return "Izin Sakit";
  if (cat === "kegiatan") return "Izin Kegiatan";
  return "Izin Pulang";
}

function getLeaveStatusBadge(leave) {
  if (leave.isOverdue) {
    return {
      label: "Melebihi Batas Waktu (Belum Kembali)",
      class: "bg-red-100 text-red-700 border border-red-200",
    };
  }
  switch (leave.status) {
    case "pending":
      return {
        label: "Menunggu Persetujuan Kesantrian",
        class: "bg-amber-100 text-amber-800",
      };
    case "approved":
      return {
        label: "Disetujui (Surat QR Siap)",
        class: "bg-blue-100 text-blue-700",
      };
    case "checked_out":
      return {
        label: "Sedang di Luar Pondok",
        class: "bg-indigo-100 text-indigo-700",
      };
    case "returned":
      return {
        label: "Sudah Kembali (Tepat Waktu)",
        class: "bg-emerald-100 text-emerald-700",
      };
    case "returned_late":
      return {
        label: "Sudah Kembali (Terlambat)",
        class: "bg-rose-100 text-rose-700",
      };
    case "rejected":
      return {
        label: "Ditolak Kesantrian",
        class: "bg-red-100 text-red-700",
      };
    default:
      return {
        label: leave.status || "Disetujui",
        class: "bg-slate-100 text-slate-700",
      };
  }
}

async function loadData() {
  isLoading.value = true;
  error.value = null;

  try {
    const res = await parentDashboardApi.getChildren();
    if (res.success) {
      children.value = res.data;

      // Load summaries for each child
      for (const child of res.data) {
        childTabs[child.id] = "academic";
        loadChildSummary(child.id);
      }
    } else {
      error.value = res.message || "Gagal memuat data";
    }
  } catch (e) {
    console.error("Load data error:", e);
    error.value = e.message || "Gagal memuat data";
  } finally {
    isLoading.value = false;
  }
}

async function loadChildSummary(childId) {
  try {
    const res = await parentDashboardApi.getChildSummary(childId);
    if (res.success) {
      childSummaries[childId] = res.data;
    }
  } catch (e) {
    console.error("Load summary error:", e);
  }
}

async function toggleChildExpand(childId) {
  const idx = expandedChildren.value.indexOf(childId);
  if (idx >= 0) {
    expandedChildren.value.splice(idx, 1);
  } else {
    expandedChildren.value.push(childId);
    loadChildDetail(childId, childTabs[childId] || "academic");
  }
}

function selectTab(childId, tabId) {
  childTabs[childId] = tabId;
  loadChildDetail(childId, tabId);
}

async function showDetail(childId, tab) {
  childTabs[childId] = tab;
  if (!expandedChildren.value.includes(childId)) {
    expandedChildren.value.push(childId);
  }
  loadChildDetail(childId, tab);
}

async function loadChildDetail(childId, tab, forceReload = false) {
  if (!forceReload && childDetails[childId]?.[tab]) return;

  loadingDetail[childId] = true;

  try {
    let res;
    switch (tab) {
      case "academic":
        res = await parentDashboardApi.getChildAcademic(childId);
        break;
      case "discipline":
        res = await parentDashboardApi.getChildDiscipline(childId);
        break;
      case "clinic":
        res = await parentDashboardApi.getChildClinic(childId);
        break;
      case "tahfidz":
        res = await parentDashboardApi.getChildTahfidz(childId);
        break;
      case "leaves":
        res = await parentDashboardApi.getChildLeaves(childId);
        break;
    }

    if (res?.success) {
      if (!childDetails[childId]) {
        childDetails[childId] = {};
      }
      childDetails[childId][tab] = res.data;
    }
  } catch (e) {
    console.error(`Load ${tab} error:`, e);
  } finally {
    loadingDetail[childId] = false;
  }
}

async function openLeaveModal(child) {
  leaveModal.child = child;
  leaveForm.leaveCategory = "pulang";
  leaveForm.startDate = todayStr;
  leaveForm.endDate = todayStr;
  leaveForm.startTime = "08:00";
  leaveForm.endTime = "17:00";
  leaveForm.destination = "";
  leaveForm.reason = "";
  leaveForm.attachment = "";

  // Ensure leaves data loaded to prefill parent profile if available
  if (!childDetails[child.id]?.leaves) {
    await loadChildDetail(child.id, "leaves", true);
  }
  const profile = childDetails[child.id]?.leaves?.parentProfile;
  if (profile) {
    leaveForm.pickupName = profile.fatherName || profile.motherName || "";
    leaveForm.pickupPhone = profile.phone || "";
    if (!leaveForm.destination && profile.address) {
      leaveForm.destination = profile.address;
    }
  }

  leaveModal.show = true;
}

async function onParentFileChange(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  uploadingAttachment.value = true;
  try {
    const res = await studentLeavesApi.uploadFile(file);
    leaveForm.attachment = res.data?.url || res.url || "";
  } catch (err) {
    Swal.fire("Gagal Upload", err.message || "Gagal mengunggah lampiran", "error");
  } finally {
    uploadingAttachment.value = false;
  }
}

async function submitParentLeave() {
  if (!leaveModal.child) return;
  submittingLeave.value = true;
  try {
    const childId = leaveModal.child.id;
    const payload = {
      type: leaveForm.leaveCategory === "sakit" ? "sick" : "permit",
      leaveCategory: leaveForm.leaveCategory,
      startDate: leaveForm.startDate,
      endDate: leaveForm.endDate,
      startTime: leaveForm.startTime,
      endTime: leaveForm.endTime,
      destination: leaveForm.destination,
      reason: leaveForm.reason,
      pickupName: leaveForm.pickupName,
      pickupRelation: leaveForm.pickupRelation,
      pickupPhone: leaveForm.pickupPhone,
      attachment: leaveForm.attachment || undefined,
    };

    const res = await parentDashboardApi.submitChildLeave(childId, payload);
    if (res.success) {
      leaveModal.show = false;
      await loadChildSummary(childId);
      await showDetail(childId, "leaves");
      await loadChildDetail(childId, "leaves", true);
      Swal.fire(
        "Pengajuan Terkirim!",
        res.message || "Pengajuan izin berhasil dikirim ke Bagian Kesantrian.",
        "success"
      );
    }
  } catch (err) {
    Swal.fire("Gagal", err.message || "Gagal mengirim pengajuan izin", "error");
  } finally {
    submittingLeave.value = false;
  }
}

async function cancelLeaveRequest(childId, leave) {
  const result = await Swal.fire({
    title: "Batalkan Pengajuan Izin?",
    text: "Pengajuan izin yang masih menunggu persetujuan ini akan dihapus.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc2626",
    confirmButtonText: "Ya, Batalkan",
    cancelButtonText: "Tidak",
  });
  if (!result.isConfirmed) return;

  try {
    const res = await parentDashboardApi.cancelChildLeave(childId, leave.id);
    if (res.success) {
      await loadChildSummary(childId);
      await loadChildDetail(childId, "leaves", true);
      Swal.fire("Dibatalkan", res.message, "success");
    }
  } catch (err) {
    Swal.fire("Gagal", err.message || "Gagal membatalkan izin", "error");
  }
}

function openLetterPreview(leave) {
  letterPreview.leave = leave;
  letterPreview.show = true;
}

function openAcademicReport(child) {
  router.push({
    path: "/parent-dashboard/report-card",
    query: { studentId: child.id, studentName: child.fullName },
  });
}

function openTahfidzReport(child) {
  router.push({
    path: "/parent-dashboard/tahfidz-report",
    query: { studentId: child.id, studentName: child.fullName },
  });
}

async function logout() {
  try {
    await authApi.logout();
  } finally {
    router.push("/login");
  }
}

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.rtl {
  direction: rtl;
  font-family: "Amiri", serif;
}
</style>
