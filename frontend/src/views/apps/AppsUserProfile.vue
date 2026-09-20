<template>
  <div class="min-h-screen bg-slate-50/50 pb-20 font-sans">
    <!-- FEEDBACK MODAL -->
    <StatusModal
      :is-open="modalState.open"
      :type="modalState.type"
      :title="modalState.title"
      :message="modalState.message"
      @close="closeModal"
    />

    <!-- USER PROFILE CROPPER -->
    <ImageCropperModal
      :is-open="showCropper"
      :image-src="cropperImage"
      :aspect-ratio="1"
      title="Sesuaikan Foto Profil"
      description="Geser dan zoom untuk menyesuaikan foto. Rasio 1:1."
      @close="showCropper = false"
      @crop="handleCrop"
    />

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <!-- SKELETON LOADER -->
      <div
        v-if="loading"
        class="animate-pulse grid grid-cols-1 lg:grid-cols-12 gap-8"
      >
        <div class="lg:col-span-4 h-96 bg-white rounded-3xl"></div>
        <div class="lg:col-span-8 h-96 bg-white rounded-3xl"></div>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <!-- LEFT COLUMN: PROFILE CARD -->
        <div class="lg:col-span-4 flex flex-col gap-6">
          <!-- Card Itself -->
          <div
            class="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 overflow-hidden relative group"
          >
            <!-- Brown Header -->
            <div class="h-32 bg-[#602515] relative overflow-hidden">
              <!-- Decorative Circles -->
              <div
                class="absolute -top-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-2xl"
              ></div>
              <div
                class="absolute top-10 right-0 w-20 h-20 bg-white/10 rounded-full blur-xl"
              ></div>
            </div>

            <!-- Avatar Section (Overlapping) -->
            <div class="relative -mt-16 text-center px-6 pb-8">
              <div class="inline-block relative group/avatar">
                <div
                  class="w-32 h-32 rounded-full border-[6px] border-white shadow-lg bg-white overflow-hidden mx-auto"
                >
                  <img
                    v-if="photoUrl"
                    :src="photoUrl"
                    class="w-full h-full object-cover"
                  />
                  <div
                    v-else
                    class="w-full h-full flex items-center justify-center bg-slate-100 text-3xl font-bold text-slate-300"
                  >
                    {{ initials }}
                  </div>
                </div>
                <!-- Upload Overlay -->
                <div
                  class="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer m-[6px]"
                  @click="triggerPhotoUpload"
                >
                  <Icon
                    icon="solar:camera-add-bold"
                    class="text-white text-2xl"
                  />
                </div>
                <div
                  v-if="uploadingPhoto"
                  class="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center m-[6px] z-10"
                >
                  <Icon
                    icon="line-md:loading-loop"
                    class="text-white text-2xl"
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

              <!-- Name & Role -->
              <div class="mt-4">
                <h2 class="text-2xl font-bold text-slate-800">
                  {{ user.name || "Pengguna" }}
                </h2>
                <div
                  class="inline-flex items-center gap-2 px-4 py-1.5 mt-2 rounded-full bg-slate-50 border border-slate-100 text-sm text-slate-500 font-medium"
                >
                  {{ user.email }}
                </div>
              </div>

              <!-- Badges -->
              <div class="flex items-center justify-center gap-2 mt-6">
                <span
                  class="px-3 py-1 bg-[#602515]/10 text-[#602515] rounded-lg text-xs font-bold uppercase tracking-wide"
                >
                  {{ user.role || "Member" }}
                </span>
                <span
                  class="px-3 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-1"
                >
                  <div
                    class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"
                  ></div>
                  Active
                </span>
              </div>

              <!-- Buttons -->
              <div class="mt-8 space-y-3">
                <button
                  @click="toggleEdit"
                  class="w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#602515]/20"
                  :class="
                    editing
                      ? 'bg-slate-100 text-slate-600'
                      : 'bg-[#602515] text-white hover:bg-[#7a3320]'
                  "
                >
                  <Icon
                    :icon="
                      editing
                        ? 'solar:close-circle-bold'
                        : 'solar:pen-new-square-bold'
                    "
                    class="text-lg"
                  />
                  {{ editing ? "Batal Edit" : "Edit Profil" }}
                </button>

                <button
                  v-if="editing"
                  @click="saveLocal"
                  :disabled="updating"
                  class="w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-500/20 disabled:opacity-70"
                >
                  <Icon v-if="updating" icon="line-md:loading-loop" />
                  <Icon v-else icon="solar:disk-bold" />
                  Simpan
                </button>

                <button
                  @click="scrollToPassword"
                  class="w-full py-3 rounded-xl border border-slate-200 font-bold text-sm text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <Icon icon="solar:shield-keyhole-bold" />
                  Security
                </button>
              </div>
            </div>
          </div>

          <!-- Mini Stat Card -->
          <div
            class="bg-white rounded-[1.5rem] p-5 shadow-lg shadow-slate-200/50 flex items-center gap-4"
          >
            <div
              class="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center"
            >
              <Icon icon="solar:calendar-bold" class="text-xl" />
            </div>
            <div>
              <p
                class="text-xs font-bold text-slate-400 uppercase tracking-wider"
              >
                Bergabung
              </p>
              <p class="font-bold text-slate-800">
                {{ formatJoinDate(user.createdAt) }}
              </p>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: DETAILS -->
        <div class="lg:col-span-8 flex flex-col gap-8">
          <!-- DETAIL CARD (White) -->
          <div
            class="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 p-8 relative overflow-hidden"
          >
            <!-- Decorative Icon Background -->
            <Icon
              icon="solar:user-id-bold"
              class="absolute -right-6 -bottom-6 text-[150px] text-slate-50 opacity-50 rotate-12"
            />

            <!-- Header -->
            <div class="flex items-center gap-3 mb-8 relative z-10">
              <div class="w-1.5 h-8 bg-[#f8ae19] rounded-full"></div>
              <h3 class="text-xl font-bold text-slate-800">
                Informasi Pribadi
              </h3>
            </div>

            <!-- FORM GRID -->
            <div
              class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8 relative z-10"
            >
              <!-- Name (Row 1) -->
              <div class="space-y-2">
                <label
                  class="text-xs font-bold text-slate-400 uppercase tracking-wider"
                  >Nama Depan</label
                >
                <div
                  v-if="!editing"
                  class="font-bold text-lg text-slate-800 border-b border-transparent py-1"
                >
                  {{ user.firstName }}
                </div>
                <input
                  v-else
                  v-model="draft.firstName"
                  class="w-full bg-slate-50 border-b-2 border-slate-200 focus:border-[#602515] rounded-t-lg px-3 py-2 text-sm font-semibold outline-none transition-all"
                />
              </div>
              <div class="space-y-2">
                <label
                  class="text-xs font-bold text-slate-400 uppercase tracking-wider"
                  >Nama Belakang</label
                >
                <div
                  v-if="!editing"
                  class="font-bold text-lg text-slate-800 border-b border-transparent py-1"
                >
                  {{ user.lastName }}
                </div>
                <input
                  v-else
                  v-model="draft.lastName"
                  class="w-full bg-slate-50 border-b-2 border-slate-200 focus:border-[#602515] rounded-t-lg px-3 py-2 text-sm font-semibold outline-none transition-all"
                />
              </div>

              <!-- Gender & Phone (Row 2) -->
              <div class="space-y-2">
                <label
                  class="text-xs font-bold text-slate-400 uppercase tracking-wider"
                  >Jenis Kelamin</label
                >
                <div
                  v-if="!editing"
                  class="font-bold text-lg text-slate-800 py-1 flex items-center gap-2"
                >
                  <Icon
                    :icon="
                      user.gender === 'male'
                        ? 'solar:men-bold'
                        : user.gender === 'female'
                        ? 'solar:women-bold'
                        : 'solar:user-bold'
                    "
                    class="text-slate-400"
                  />
                  {{ displayGender }}
                </div>
                <div v-else class="flex gap-4 pt-1">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="male"
                      v-model="draft.gender"
                      class="accent-[#602515] w-4 h-4"
                    />
                    <span class="text-sm font-semibold text-slate-700"
                      >Ikhwan</span
                    >
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="female"
                      v-model="draft.gender"
                      class="accent-[#602515] w-4 h-4"
                    />
                    <span class="text-sm font-semibold text-slate-700"
                      >Akhwat</span
                    >
                  </label>
                </div>
              </div>
              <div class="space-y-2">
                <label
                  class="text-xs font-bold text-slate-400 uppercase tracking-wider"
                  >No. Telepon</label
                >
                <div
                  v-if="!editing"
                  class="font-bold text-lg text-slate-800 border-b border-transparent py-1"
                >
                  {{ user.phone || "-" }}
                </div>
                <input
                  v-else
                  v-model="draft.phone"
                  class="w-full bg-slate-50 border-b-2 border-slate-200 focus:border-[#602515] rounded-t-lg px-3 py-2 text-sm font-semibold outline-none transition-all"
                />
              </div>

              <!-- Birth (Row 3) -->
              <div class="space-y-2">
                <label
                  class="text-xs font-bold text-slate-400 uppercase tracking-wider"
                  >Tempat Lahir</label
                >
                <div
                  v-if="!editing"
                  class="font-bold text-lg text-slate-800 border-b border-transparent py-1"
                >
                  {{ user.birthPlace || "-" }}
                </div>
                <input
                  v-else
                  v-model="draft.birthPlace"
                  class="w-full bg-slate-50 border-b-2 border-slate-200 focus:border-[#602515] rounded-t-lg px-3 py-2 text-sm font-semibold outline-none transition-all"
                />
              </div>
              <div class="space-y-2">
                <label
                  class="text-xs font-bold text-slate-400 uppercase tracking-wider"
                  >Tanggal Lahir</label
                >
                <div
                  v-if="!editing"
                  class="font-bold text-lg text-slate-800 border-b border-transparent py-1 flex items-center gap-2"
                >
                  <Icon icon="solar:calendar-bold" class="text-slate-300" />
                  {{ displayTanggal }}
                </div>
                <div v-else>
                  <VueDatePicker
                    v-model="draft.birthDateObj"
                    :enable-time="false"
                    format="dd/MM/yyyy"
                    auto-apply
                    :input-class-name="'!bg-slate-50 !border-b-2 !border-slate-200 focus:!border-[#602515] !rounded-t-lg !py-2 !px-3 !text-sm !font-semibold !shadow-none'"
                  />
                </div>
              </div>

              <!-- Address (Row 4 - Full) -->
              <div class="md:col-span-2 space-y-2">
                <label
                  class="text-xs font-bold text-slate-400 uppercase tracking-wider"
                  >Alamat Lengkap</label
                >
                <div
                  v-if="!editing"
                  class="font-medium text-base text-slate-700 leading-relaxed max-w-2xl"
                >
                  {{ user.address || "-" }}
                </div>
                <div v-else>
                  <AddressSelector v-model="draft.addressData" label="" />
                </div>
              </div>
            </div>
          </div>

          <!-- SECURITY CARD (Dark) - FIXED MOBILE RESPONSIVNESS -->
          <div
            id="password-section"
            class="bg-slate-900 rounded-[2rem] p-6 md:p-8 shadow-xl text-white relative overflow-hidden"
          >
            <div
              class="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-4 relative z-10"
            >
              <div class="flex items-start md:items-center gap-4">
                <div class="p-3 bg-white/10 rounded-xl text-[#f8ae19] shrink-0">
                  <Icon icon="solar:shield-keyhole-bold" class="text-2xl" />
                </div>
                <div>
                  <h3 class="font-bold text-lg">Keamanan Akun</h3>
                  <p
                    class="text-slate-400 text-sm mt-1 md:mt-0 leading-relaxed"
                  >
                    Update password anda secara berkala
                  </p>
                </div>
              </div>
              <button
                @click="showPassword = !showPassword"
                class="w-full md:w-auto px-5 py-3 md:py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all font-bold text-sm"
              >
                {{ showPassword ? "Tutup" : "Ubah Password" }}
              </button>
            </div>

            <transition
              enter-active-class="transition-all duration-300 ease-out"
              enter-from-class="max-h-0 opacity-0 overflow-hidden"
              enter-to-class="max-h-[500px] opacity-100 overflow-hidden"
              leave-active-class="transition-all duration-200 ease-in"
              leave-from-class="max-h-[500px] opacity-100 overflow-hidden"
              leave-to-class="max-h-0 opacity-0 overflow-hidden"
            >
              <div
                v-if="showPassword"
                class="mt-8 space-y-4 max-w-lg relative z-10"
              >
                <div class="space-y-4">
                  <input
                    :type="pwdShow.current ? 'text' : 'password'"
                    v-model="pwd.current"
                    placeholder="Password Lama"
                    class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:border-[#f8ae19] outline-none transition-all"
                  />

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      :type="pwdShow.new ? 'text' : 'password'"
                      v-model="pwd.new"
                      placeholder="Password Baru"
                      class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:border-[#f8ae19] outline-none transition-all"
                    />
                    <input
                      :type="pwdShow.confirm ? 'text' : 'password'"
                      v-model="pwd.confirm"
                      placeholder="Konfirmasi"
                      class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:border-[#f8ae19] outline-none transition-all"
                    />
                  </div>
                </div>

                <div
                  class="flex flex-col-reverse md:flex-row items-center justify-between gap-4 pt-2"
                >
                  <div
                    class="flex items-center gap-2 w-full md:w-auto justify-center md:justify-start"
                  >
                    <span
                      v-if="pwdError"
                      class="text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded text-center"
                      >{{ pwdError }}</span
                    >
                    <span
                      v-if="pwdSuccess"
                      class="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded text-center"
                      >{{ pwdSuccess }}</span
                    >
                  </div>
                  <button
                    @click="submitPassword"
                    :disabled="pwdLoading"
                    class="w-full md:w-auto px-6 py-2.5 bg-[#f8ae19] text-black font-bold rounded-xl hover:bg-[#e6a017] transition-all flex items-center justify-center gap-2"
                  >
                    <Icon v-if="pwdLoading" icon="line-md:loading-loop" />
                    <span>Simpan Password</span>
                  </button>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { Icon } from "@iconify/vue";
import StatusModal from "@/components/ui/StatusModal.vue";
import AddressSelector from "@/components/ui/AddressSelector.vue";
import ImageCropperModal from "@/components/ui/ImageCropperModal.vue";
import { VueDatePicker } from "@vuepic/vue-datepicker";
import "@vuepic/vue-datepicker/dist/main.css";

// Helper to safely parse JSON
function safeParse(val) {
  if (!val) return null;
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    return null;
  }
}

const useRouterObj = useRouter();
const router = useRouterObj;
const user = ref({});
const loading = ref(true);
const error = ref("");
const editing = ref(false);
const draft = ref({});
const updating = ref(false);

const showPassword = ref(false);
const pwd = ref({ current: "", new: "", confirm: "" });
const pwdLoading = ref(false);
const pwdError = ref("");
const pwdSuccess = ref("");
const pwdShow = ref({ current: false, new: false, confirm: false });

const modalState = ref({
  open: false,
  type: "success",
  title: "",
  message: "",
});
function openModal(type, title, message) {
  modalState.value = { open: true, type, title, message };
}
function closeModal() {
  modalState.value.open = false;
}

const photoInput = ref(null);
const uploadingPhoto = ref(false);
const showCropper = ref(false);
const cropperImage = ref("");

const photoUrl = computed(() => {
  if (!user.value?.photo) return null;
  const base = import.meta.env.VITE_API_BASE_URL || "";
  if (user.value.photo.startsWith("uploads/"))
    return `${base}/api/${user.value.photo}`;
  return user.value.photo;
});

function triggerPhotoUpload() {
  photoInput.value?.click();
}

function handlePhotoUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    alert("Hanya file gambar");
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    cropperImage.value = e.target.result;
    showCropper.value = true;
  };
  reader.readAsDataURL(file);
  event.target.value = "";
}

async function handleCrop(blob) {
  showCropper.value = false;
  if (!blob) return;
  await uploadFile(blob);
}

async function uploadFile(fileOrBlob) {
  uploadingPhoto.value = true;
  try {
    const token = localStorage.getItem("token");
    const base = import.meta.env.VITE_API_BASE_URL || "";
    const formData = new FormData();
    formData.append("file", fileOrBlob, "profile.png");
    const uploadRes = await fetch(`${base}/api/uploads`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!uploadRes.ok) throw new Error("Gagal upload");
    const uploadData = await uploadRes.json();
    const photoPath = uploadData.data?.filePath;

    const updateRes = await fetch(`${base}/api/users/current`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ photo: photoPath }),
    });
    if (!updateRes.ok) throw new Error("Gagal simpan profil");
    const data = await updateRes.json();
    user.value = {
      ...data.data,
      name: `${data.data.firstName || ""} ${data.data.lastName || ""}`.trim(),
    };
    try {
      localStorage.setItem("user", JSON.stringify(user.value));
      window.dispatchEvent(
        new CustomEvent("user-updated", { detail: user.value })
      );
    } catch (e) {}
  } catch (err) {
    console.error(err);
    openModal("error", "Error", "Gagal mengupload foto");
  } finally {
    uploadingPhoto.value = false;
  }
}

const initials = computed(() => {
  const name =
    user.value?.name ||
    `${user.value?.firstName || ""} ${user.value?.lastName || ""}` ||
    "";
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0]?.toUpperCase())
      .slice(0, 2)
      .join("") || "U"
  );
});

const displayTanggal = computed(() => {
  if (user.value?.birthDate) {
    const d = new Date(user.value.birthDate);
    return `${String(d.getDate()).padStart(2, "0")}/${String(
      d.getMonth() + 1
    ).padStart(2, "0")}/${d.getFullYear()}`;
  }
  return "-";
});

const displayGender = computed(() => {
  if (user.value?.gender === "male") return "Ikhwan";
  if (user.value?.gender === "female") return "Akhwat";
  return user.value?.gender || "-";
});

function formatJoinDate(val) {
  if (!val) return "-";
  const d = new Date(val);
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}/${d.getFullYear()}`;
}

function scrollToPassword() {
  const el = document.getElementById("password-section");
  if (el) {
    el.scrollIntoView({ behavior: "smooth" });
    showPassword.value = true;
  }
}

onMounted(() => {
  fetchCurrent();
});

async function fetchCurrent() {
  loading.value = true;
  try {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Unauthorized");
    const base = import.meta.env.VITE_API_BASE_URL || "";
    const res = await fetch(`${base}/api/users/current`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed");
    const data = await res.json();
    user.value = {
      ...data.data,
      name: `${data.data.firstName || ""} ${data.data.lastName || ""}`.trim(),
    };
    draft.value = { ...data.data };
    draft.value.addressData = {
      province: safeParse(data.data.province),
      regency: safeParse(data.data.regency),
      district: safeParse(data.data.district),
      village: safeParse(data.data.village),
      addressDetail: data.data.addressDetail || "",
      postalCode: data.data.postalCode || "",
    };
    if (data.data.birthDate)
      draft.value.birthDateObj = new Date(data.data.birthDate);
  } catch (e) {
    if (String(e).includes("Unauthorized")) router.push("/login");
  } finally {
    loading.value = false;
  }
}

function toggleEdit() {
  editing.value = !editing.value;
  if (editing.value) {
    draft.value = { ...user.value };
    draft.value.addressData = {
      province: safeParse(user.value.province),
      regency: safeParse(user.value.regency),
      district: safeParse(user.value.district),
      village: safeParse(user.value.village),
      addressDetail: user.value.addressDetail || "",
      postalCode: user.value.postalCode || "",
    };
    if (user.value.birthDate)
      draft.value.birthDateObj = new Date(user.value.birthDate);
  }
}

async function saveLocal() {
  updating.value = true;
  try {
    const token = localStorage.getItem("token");
    const base = import.meta.env.VITE_API_BASE_URL || "";
    const payload = { ...draft.value };
    const addr = draft.value.addressData || {};
    const parts = [];
    if (addr.addressDetail) parts.push(addr.addressDetail);
    if (addr.village?.name) parts.push(addr.village.name);
    if (addr.district?.name) parts.push("Kec." + addr.district.name);
    if (addr.regency?.name) parts.push(addr.regency.name);
    if (addr.province?.name) parts.push(addr.province.name);
    if (addr.postalCode) parts.push(addr.postalCode);

    payload.address = parts.join(", ");
    payload.province = addr.province
      ? JSON.stringify(addr.province)
      : undefined;
    payload.regency = addr.regency ? JSON.stringify(addr.regency) : undefined;
    payload.district = addr.district
      ? JSON.stringify(addr.district)
      : undefined;
    payload.village = addr.village ? JSON.stringify(addr.village) : undefined;
    payload.addressDetail = addr.addressDetail;
    payload.postalCode = addr.postalCode;
    delete payload.addressData;

    if (payload.birthDateObj instanceof Date) {
      const d = payload.birthDateObj;
      payload.birthDate = `${d.getFullYear()}-${String(
        d.getMonth() + 1
      ).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    delete payload.birthDateObj;
    delete payload.name;

    const res = await fetch(`${base}/api/users/current`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Gagal update");
    const data = await res.json();
    user.value = {
      ...data.data,
      name: `${data.data.firstName || ""} ${data.data.lastName || ""}`.trim(),
    };
    try {
      localStorage.setItem("user", JSON.stringify(user.value));
      window.dispatchEvent(
        new CustomEvent("user-updated", { detail: user.value })
      );
    } catch (e) {}
    editing.value = false;
    openModal("success", "Berhasil", "Profil diperbarui");
  } catch (e) {
    openModal("error", "Gagal", e.message);
  } finally {
    updating.value = false;
  }
}

async function submitPassword() {
  if (
    !pwd.value.current ||
    !pwd.value.new ||
    pwd.value.new !== pwd.value.confirm
  ) {
    pwdError.value = "Cek data password";
    return;
  }
  pwdLoading.value = true;
  try {
    const token = localStorage.getItem("token");
    const base = import.meta.env.VITE_API_BASE_URL || "";
    const res = await fetch(`${base}/api/users/current/password`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        currentPassword: pwd.value.current,
        newPassword: pwd.value.new,
      }),
    });
    if (!res.ok) throw new Error("Gagal");
    pwdSuccess.value = "Password berhasil diubah";
    pwd.value = { current: "", new: "", confirm: "" };
    setTimeout(() => {
      showPassword.value = false;
      pwdSuccess.value = "";
    }, 2000);
  } catch (e) {
    pwdError.value = "Gagal mengubah password";
  } finally {
    pwdLoading.value = false;
  }
}
function togglePwd(f) {
  pwdShow.value[f] = !pwdShow.value[f];
}
</script>
