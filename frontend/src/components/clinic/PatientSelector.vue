<template>
  <div class="space-y-4">
    <!-- Tabs -->
    <div class="flex p-1 bg-slate-100 rounded-lg">
      <button
        v-for="type in ['student', 'teacher', 'external']"
        :key="type"
        @click="selectType(type)"
        class="flex-1 py-2 text-sm font-medium rounded-md transition"
        :class="
          modelValue.type === type
            ? 'bg-white text-[#602515] shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        "
      >
        {{ getLabel(type) }}
      </button>
    </div>

    <!-- Search Input (Student/Teacher) -->
    <div v-if="modelValue.type !== 'external'" class="relative">
      <label class="block text-xs font-semibold text-slate-500 mb-1 uppercase"
        >Cari {{ getLabel(modelValue.type) }}</label
      >
      <div class="relative">
        <input
          v-model="searchQuery"
          @input="handleSearch"
          class="w-full border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-[#602515]/20 focus:border-[#602515]"
          :placeholder="`Ketik nama ${getLabel(modelValue.type)}...`"
        />
        <Icon
          icon="solar:magnifer-linear"
          class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <!-- Loading Spinner -->
        <Icon
          v-if="loading"
          icon="solar:spinner-line-duotone"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin"
        />
      </div>

      <!-- Dropdown Results -->
      <div
        v-if="results.length > 0"
        class="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto"
      >
        <div
          v-for="item in results"
          :key="item.id"
          @click="selectItem(item)"
          class="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
        >
          <div class="font-medium text-slate-800">{{ item.name }}</div>
          <div class="text-xs text-slate-500">
            {{ item.identifier ? `ID: ${item.identifier}` : "" }}
            {{ item.classId ? `• Kelas ID: ${item.classId}` : "" }}
          </div>
        </div>
      </div>

      <!-- Selected Display -->
      <div
        v-if="modelValue.name && !searchQuery"
        class="mt-4 p-4 bg-green-50 rounded-lg border border-green-100"
      >
        <div class="flex justify-between items-start mb-3">
          <div>
            <div
              class="text-xs text-green-600 font-semibold uppercase tracking-wider mb-1"
            >
              Pasien Terpilih
            </div>
            <div class="font-bold text-slate-800 text-lg">
              {{ modelValue.name }}
            </div>
            <div class="text-sm text-slate-600 mt-1">
              {{ modelValue.gender === "L" ? "Ikhwan" : "Akhwat" }} •
              {{ modelValue.phone || "No Phone" }}
            </div>
            <div class="text-xs text-slate-500 mt-1" v-if="modelValue.address">
              {{ modelValue.address }}
            </div>
          </div>
          <button
            @click="clearSelection"
            class="text-xs font-medium text-green-700 hover:text-green-800 underline"
          >
            Ganti Pasien
          </button>
        </div>

        <!-- Optional Clinical Input for Student/Teacher -->
        <div class="pt-3 border-t border-green-100">
          <label class="block text-xs font-semibold text-slate-600 mb-1">
            Golongan Darah (Opsional)
          </label>
          <select
            :value="modelValue.bloodType"
            @change="
              (e) =>
                emit('update:modelValue', {
                  ...modelValue,
                  bloodType: e.target.value,
                })
            "
            class="w-full md:w-1/3 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-200 focus:border-green-500 bg-white"
          >
            <option value="">Tidak Diketahui</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="AB">AB</option>
            <option value="O">O</option>
          </select>
          <p class="text-[10px] text-slate-500 mt-1">
            Data klinis ini akan disimpan ke rekam medis pasien.
          </p>
        </div>
      </div>
    </div>

    <!-- Manual Input (External) -->
    <div v-else class="space-y-3 animate-fade-in">
      <div
        class="p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700 mb-2"
      >
        Isi data pasien dari luar pesantren. Data akan tersimpan otomatis.
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-500 mb-1"
          >Nama Lengkap <span class="text-red-500">*</span></label
        >
        <input
          :value="modelValue.name"
          @input="
            (e) =>
              emit('update:modelValue', { ...modelValue, name: e.target.value })
          "
          class="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm"
          placeholder="Nama Pasien"
        />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1"
            >Jenis Kelamin</label
          >
          <select
            :value="modelValue.gender"
            @change="
              (e) =>
                emit('update:modelValue', {
                  ...modelValue,
                  gender: e.target.value,
                })
            "
            class="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm"
          >
            <option value="L">Ikhwan</option>
            <option value="P">Akhwat</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1"
            >No. Telepon</label
          >
          <input
            :value="modelValue.phone"
            @input="
              (e) =>
                emit('update:modelValue', {
                  ...modelValue,
                  phone: e.target.value,
                })
            "
            class="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm"
            placeholder="08..."
          />
        </div>
      </div>

      <!-- Blood Type & Birth Info -->
      <div class="grid grid-cols-3 gap-4">
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1"
            >Gol. Darah</label
          >
          <select
            :value="modelValue.bloodType"
            @change="
              (e) =>
                emit('update:modelValue', {
                  ...modelValue,
                  bloodType: e.target.value,
                })
            "
            class="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm"
          >
            <option value="">-</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="AB">AB</option>
            <option value="O">O</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1"
            >Tempat Lahir</label
          >
          <input
            :value="modelValue.birthPlace"
            @input="
              (e) =>
                emit('update:modelValue', {
                  ...modelValue,
                  birthPlace: e.target.value,
                })
            "
            class="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm"
            placeholder="Kota Lahir"
          />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1"
            >Tanggal Lahir</label
          >
          <input
            type="date"
            :value="modelValue.dob"
            @input="
              (e) =>
                emit('update:modelValue', {
                  ...modelValue,
                  dob: e.target.value,
                })
            "
            class="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm"
          />
        </div>
      </div>

      <!-- Address Selector -->
      <div>
        <AddressSelector
          v-model="addressModel"
          label="Alamat Lengkap"
          @update:modelValue="onAddressUpdate"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from "vue";
import { Icon } from "@iconify/vue";
import { request } from "@/services/api"; // Helper
import AddressSelector from "@/components/ui/AddressSelector.vue";

// modelValue should be { type, refId, name, gender, phone, address, dob, birthPlace, bloodType, province, regency, district, village, addressDetail, postalCode }
const props = defineProps(["modelValue"]);
const emit = defineEmits(["update:modelValue"]);

const searchQuery = ref("");
const results = ref([]);
const debounceTimer = ref(null);
const loading = ref(false);

const addressModel = ref({
  province: props.modelValue.province || null,
  regency: props.modelValue.regency || null,
  district: props.modelValue.district || null,
  village: props.modelValue.village || null,
  addressDetail: props.modelValue.addressDetail || "",
  postalCode: props.modelValue.postalCode || "",
});

function onAddressUpdate(val) {
  emit("update:modelValue", {
    ...props.modelValue,
    province: val.province,
    regency: val.regency,
    district: val.district,
    village: val.village,
    addressDetail: val.addressDetail,
    postalCode: val.postalCode,
    // Construct display address
    address: [
      val.addressDetail,
      val.village?.name,
      val.district?.name,
      val.regency?.name,
      val.province?.name,
      val.postalCode,
    ]
      .filter(Boolean)
      .join(", "),
  });
}

// Watch for external address changes (e.g. clear form)
watch(
  () => props.modelValue,
  (newVal) => {
    // Sync addressModel if props change externally and differ
    if (!newVal.province && !newVal.addressDetail) {
      // Reset if cleared
      addressModel.value = {
        province: null,
        regency: null,
        district: null,
        village: null,
        addressDetail: "",
        postalCode: "",
      };
    }
  },
  { deep: true }
);

function getLabel(type) {
  if (type === "student") return "Santri";
  if (type === "teacher") return "Guru/Staff";
  return "Luar Pesantren";
}

function selectType(type) {
  emit("update:modelValue", {
    type,
    refId: null,
    name: "",
    gender: "L",
    phone: "",
    address: "",
    dob: null,
    birthPlace: "",
    bloodType: "",
    province: null,
    regency: null,
    district: null,
    village: null,
    addressDetail: "",
    postalCode: "",
    clinicPatientId: null,
  });
  searchQuery.value = "";
  results.value = [];
}

async function handleSearch() {
  if (debounceTimer.value) clearTimeout(debounceTimer.value);

  if (searchQuery.value.length < 2) {
    results.value = [];
    return;
  }

  debounceTimer.value = setTimeout(async () => {
    loading.value = true;
    try {
      const res = await request(
        `/api/clinic/patients/search?type=${props.modelValue.type}&q=${searchQuery.value}`
      );
      results.value = res.data || [];
    } catch (e) {
      console.error(e);
    } finally {
      loading.value = false;
    }
  }, 300);
}

function selectItem(item) {
  emit("update:modelValue", {
    type: props.modelValue.type,
    refId: item.refId, // ID from students/teachers table
    name: item.name,
    gender: item.gender === "female" || item.gender === "P" ? "P" : "L",
    phone: item.phone || "",
    address: item.address || "",
    dob: item.birthDate || null,
    birthPlace: item.birthPlace || "",
    bloodType: item.bloodType || "",
    bloodType: item.bloodType || "",
    // Pass real ID if it comes from clinic_patients (External or synced student/teacher)
    clinicPatientId: item.source === "clinic_patients" ? item.id : null,
  });
  searchQuery.value = ""; // Clear search
  results.value = []; // Hide dropdown
}

function clearSelection() {
  emit("update:modelValue", {
    ...props.modelValue,
    refId: null,
    name: "",
    clinicPatientId: null,
  });
}
</script>
