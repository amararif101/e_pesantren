<!-- src/components/layout/Sidebar.vue -->
<script setup>
import { Icon } from "@iconify/vue";
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { rolesApi, usersApi, authApi } from "@/services/api";

const props = defineProps({
  isOpen: { type: Boolean, default: false },
});
const emit = defineEmits(["close"]);

const route = useRoute();
const router = useRouter();

/* =========================
   MENU (sama seperti Anda)
   ========================= */
const mainMenus = [
  { id: "apps", icon: "solar:widget-3-line-duotone", label: "Apps" },
  {
    id: "analytics",
    icon: "solar:chart-square-line-duotone",
    label: "Analytics",
  },
  { id: "settings", icon: "solar:settings-line-duotone", label: "Settings" },
  {
    id: "security",
    icon: "solar:shield-check-line-duotone",
    label: "Security",
  },
  {
    id: "about",
    icon: "solar:info-circle-line-duotone",
    label: "About",
  },
];

const activeMainId = ref("apps");
const openDropdownId = ref(null);

const submenuByMain = {
  apps: {
    title: "Apps",
    items: [
      {
        label: "Chats",
        icon: "solar:chat-round-dots-line-duotone",
        route: "/apps/chat",
      },
      {
        label: "Tabungan",
        icon: "solar:wallet-line-duotone",
        route: "/apps/savings",
      },
      {
        label: "User Profile",
        icon: "solar:user-circle-line-duotone",
        route: "/apps/user-profile",
      },
      {
        label: "Guru",
        icon: "solar:square-academic-cap-line-duotone",
        children: [
          { label: "Absensi Guru", route: "/apps/teacher-attendance" },
          { label: "Data Guru", route: "/apps/teachers" },
          { label: "Laporan Gaji", route: "/apps/salary-report" },
          { label: "Divisi", route: "/apps/divisions" },
          {
            label: "Rekap Absensi",
            route: "/apps/attendance-recap",
            adminOnly: true,
          },
          {
            label: "Perizinan Saya",
            route: "/apps/attendance/permissions",
          },
          {
            label: "Persetujuan Izin",
            route: "/apps/attendance/approvals",
            adminOnly: true,
          },
        ],
      },
      {
        label: "Santri",
        icon: "solar:user-circle-line-duotone",
        children: [
          { label: "Data Santri", route: "/apps/students" },
          { label: "Absensi Santri", route: "/apps/attendance" },
          { label: "Izin Pulang", route: "/apps/students/leaves" },
          { label: "Kamar", route: "/apps/rooms" },
        ],
      },
      {
        label: "Kedisiplinan",
        icon: "solar:medal-ribbons-star-line-duotone",
        children: [
          { label: "Input Poin", route: "/apps/rewards/entry" },
          { label: "SP (Surat Peringatan)", route: "/apps/rewards/warnings" },
          { label: "Data R&P", route: "/apps/rewards/reports" },
          { label: "Aturan Poin", route: "/apps/rewards/rules" },
        ],
      },
      {
        label: "Akademik",
        icon: "solar:buildings-3-line-duotone",
        children: [
          { label: "Kelas", route: "/apps/academic/classes" },
          { label: "Mata Pelajaran", route: "/apps/academic/subjects" },
          { label: "Jadwal Pelajaran", route: "/apps/academic/schedules" },
          { label: "Nilai", route: "/apps/academic/grades" },
          { label: "Rapor", route: "/apps/academic/report-card" },
          {
            label: "Catatan Wali Kelas",
            route: "/apps/academic/homeroom-notes",
          },
        ],
      },
      {
        label: "Tahfidz",
        icon: "solar:book-bookmark-line-duotone",
        children: [
          { label: "Dashboard Monitoring", route: "/apps/tahfidz/monitoring" },
          { label: "Grup Halaqah", route: "/apps/halaqah" },
          { label: "Mutaba'ah", route: "/apps/tahfidz/dashboard" },
          { label: "Input per Halaqah", route: "/apps/tahfidz/halaqah" },
          { label: "Ujian Tahfidz", route: "/apps/tahfidz/exams" },
          { label: "Rapor", route: "/apps/tahfidz/reports" },
          { label: "Mading Halaqah", route: "/apps/tahfidz/mading" },
          {
            label: "Mading Sertifikasi",
            route: "/apps/tahfidz/mading-sertifikasi",
          },
          { label: "Pengaturan Tahfidz", route: "/apps/tahfidz/settings" },
        ],
      },
      {
        label: "Klinik",
        icon: "solar:stethoscope-line-duotone",
        children: [
          { label: "Dashboard", route: "/apps/clinic/dashboard" },
          { label: "Pemeriksaan", route: "/apps/clinic/examinations" },
          { label: "Data Pasien", route: "/apps/clinic/patients" },
          { label: "Obat-obatan", route: "/apps/clinic/medicines" },
          { label: "Manajemen Apotik", route: "/apps/clinic/pharmacies" },
          { label: "Laporan", route: "/apps/clinic/reports" },
          { label: "Rawat Inap", route: "/apps/clinic/inpatients" },
          { label: "Manajemen Kamar", route: "/apps/clinic/rooms" },
        ],
      },
    ],
  },

  analytics: {
    title: "Analytics",
    items: [
      {
        label: "Overview",
        icon: "solar:graph-line-duotone",
        route: "/analytics/overview",
      },
      {
        label: "Reports",
        icon: "solar:diagram-up-line-duotone",
        route: "/analytics/reports",
      },
    ],
  },

  settings: {
    title: "Settings",
    items: [
      {
        label: "Kehadiran",
        icon: "solar:watch-square-minimalistic-line-duotone",
        route: "/settings/attendance",
      },
      {
        label: "Golongan Gaji",
        icon: "solar:banknote-2-line-duotone",
        route: "/settings/salary",
      },
      {
        label: "Komponen Gaji",
        icon: "solar:users-group-two-rounded-line-duotone",
        route: "/settings/salary-grading",
      },
      {
        label: "Identitas Lembaga",
        icon: "solar:buildings-2-line-duotone",
        route: "/settings/institution",
      },
      {
        label: "Papan Informasi",
        icon: "solar:gallery-wide-line-duotone",
        route: "/settings/information-board",
      },
      {
        label: "Pengaturan Akademik",
        icon: "solar:calendar-line-duotone",
        route: "/settings/academic",
      },
    ],
  },

  security: {
    title: "Security",
    items: [
      {
        label: "Users",
        icon: "solar:users-group-rounded-line-duotone",
        route: "/security/users",
      },
      {
        label: "Roles",
        icon: "solar:lock-password-line-duotone",
        route: "/security/roles",
      },
    ],
  },

  about: {
    title: "About",
    items: [
      {
        label: "Tentang Aplikasi",
        icon: "solar:info-circle-line-duotone",
        route: "/about",
      },
    ],
  },
};

// Permission-based filtering
const allowedRoutes = ref(null); // null = not loaded yet, array = loaded

async function fetchPermissions() {
  try {
    const res = await rolesApi.getMyPermissions();
    if (res.success) {
      allowedRoutes.value = res.data;
    }
  } catch (e) {
    console.error("Failed to load permissions:", e);
    // On error, allow all routes (fallback)
    allowedRoutes.value = null;
  }
}

// Filter function to check if route is allowed
function isRouteAllowed(route) {
  if (allowedRoutes.value === null) return true; // Not loaded yet, show all
  return allowedRoutes.value.includes(route);
}

// Filtered submenu based on permissions
const filteredSubmenuByMain = computed(() => {
  const filtered = {};
  for (const [mainId, submenu] of Object.entries(submenuByMain)) {
    const filteredItems = submenu.items
      .map((item) => {
        if (item.children) {
          // Filter children
          const filteredChildren = item.children.filter((child) =>
            isRouteAllowed(child.route),
          );
          if (filteredChildren.length === 0) return null;
          return { ...item, children: filteredChildren };
        }
        // Single item
        if (!isRouteAllowed(item.route)) return null;
        return item;
      })
      .filter(Boolean);

    if (filteredItems.length > 0) {
      filtered[mainId] = { ...submenu, items: filteredItems };
    }
  }
  return filtered;
});

const currentSubmenu = computed(
  () => filteredSubmenuByMain.value[activeMainId.value],
);

const navigate = (to) => {
  router.push(to);
  emit("close");
};

const isRouteActive = (path) => route.path === path;

const isParentActive = (item) =>
  item.children?.some((child) => isRouteActive(child.route));

watch(
  () => route.path,
  (path) => {
    for (const [mainId, submenu] of Object.entries(submenuByMain)) {
      for (const item of submenu.items) {
        if (item.route === path) {
          activeMainId.value = mainId;
          openDropdownId.value = null;
          return;
        }
        if (item.children?.some((child) => child.route === path)) {
          activeMainId.value = mainId;
          openDropdownId.value = item.label;
          return;
        }
      }
    }
  },
  { immediate: true },
);

/* =========================
   MENU SEARCH
   ========================= */

// search term (bound to input)
const searchTerm = ref("");
// debounced term updated after 300ms
const debouncedTerm = ref("");
let debounceTimer = null;

watch(searchTerm, (v) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debouncedTerm.value = v.trim().toLowerCase();
  }, 300);
});

// compute filtered & sorted items for the currently active main menu
const filteredItems = computed(() => {
  const items = currentSubmenu.value?.items || [];
  const q = debouncedTerm.value;
  if (!q) return items;

  // score: 2 = parent label match, 1 = child match, 0 = no match
  const matches = items
    .map((it) => {
      const label = (it.label || "").toLowerCase();
      let score = 0;
      const matchedChildren = [];

      if (label.includes(q)) {
        score = 2;
      }

      if (it.children) {
        for (const c of it.children) {
          const cl = (c.label || "").toLowerCase();
          if (cl.includes(q)) {
            matchedChildren.push(c);
            if (score < 1) score = 1;
          }
        }
      }

      return {
        original: it,
        score,
        matchedChildren,
      };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => {
      // higher score first, then alphabetical by label
      if (b.score !== a.score) return b.score - a.score;
      const la = (a.original.label || "").toLowerCase();
      const lb = (b.original.label || "").toLowerCase();
      return la.localeCompare(lb);
    });

  // produce items where children replaced with matchedChildren (if any)
  return matches.map((m) => {
    if (m.original.children) {
      return {
        ...m.original,
        children:
          m.matchedChildren.length > 0
            ? m.matchedChildren
            : m.original.children,
      };
    }
    return m.original;
  });
});

/* =========================
   USER PROFILE (footer)
   ========================= */

const user = ref(null);
const loadingUser = ref(false);
const loadError = ref(null);

function loadStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    if (raw) {
      const parsed = JSON.parse(raw);
      user.value = parsed;
    }
  } catch (_) {
    user.value = null;
  }
}

async function fetchCurrentUser() {
  const token = localStorage.getItem("token");
  if (!token) return;

  loadingUser.value = true;
  loadError.value = null;

  try {
    // Use usersApi.getCurrent() to get full profile (firstName, lastName, etc)
    const payload = await usersApi.getCurrent();

    const p = payload?.data || payload;
    // Standardize user object matches AppUserProfile
    // Endpoint returns camelCase { firstName, lastName, ... }
    const firstName = p.firstName || p.first_name || "";
    const lastName = p.lastName || p.last_name || "";
    const fullName = p.name || `${firstName} ${lastName}`.trim();

    user.value = {
      ...p,
      name: fullName || p.email?.split("@")[0] || "User",
      raw: p,
    };

    try {
      localStorage.setItem("user", JSON.stringify(user.value));
    } catch (_) {}
  } catch (err) {
    loadError.value = err.message || "Failed to load user";
  } finally {
    loadingUser.value = false;
  }
}

const initials = computed(() => {
  if (!user.value) return "?";
  const n = user.value.name || user.value.email || "";
  if (n) {
    const parts = n.split(/[@\s]/).filter(Boolean);
    if (parts.length >= 1) return parts[0].slice(0, 2).toUpperCase();
  }
  return "?";
});

// computed photo URL
const photoUrl = computed(() => {
  const photo = user.value?.photo || user.value?.raw?.photo;
  if (!photo) return null;
  const base = import.meta.env.VITE_API_BASE_URL || "";
  if (photo.startsWith("uploads/")) {
    return `${base}/api/${photo}`;
  }
  return photo;
});

const fullname = computed(
  () => user.value?.name || user.value?.email?.split("@")[0] || "Pengguna",
);
const email = computed(() => user.value?.email || "—");
function onUserUpdated(e) {
  try {
    const maybe = e && e.detail ? e.detail : null;
    if (maybe) {
      user.value = maybe;
      return;
    }
    const raw = localStorage.getItem("user");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed) user.value = parsed;
  } catch (err) {
    console.warn("onUserUpdated (Sidebar) failed:", err);
  }
}

onMounted(() => {
  loadStoredUser();
  // Always fetch fresh data to ensure we have full profile (firstName, lastName, photo)
  fetchCurrentUser();
  fetchPermissions(); // Load user permissions for menu filtering
  window.addEventListener("user-updated", onUserUpdated);
});
onUnmounted(() => {
  window.removeEventListener("user-updated", onUserUpdated);
});
</script>

<template>
  <aside
    class="fixed inset-y-0 left-0 bg-slate-50 border-r border-slate-200 shadow-sm transform transition-transform duration-200 lg:translate-x-0 z-[999]"
    :class="[
      isOpen ? 'translate-x-0' : '-translate-x-full',
      'lg:static lg:inset-auto',
    ]"
  >
    <div class="flex">
      <!-- LEFT ICON BAR -->
      <div
        class="w-16 bg-slate-50 border-r border-slate-200 flex flex-col items-center py-4 gap-4"
      >
        <button
          class="lg:hidden mb-3 p-2 hover:bg-amber-300 hover:text-primary rounded-2xl border border-slate-200"
          @click="emit('close')"
        >
          <Icon
            icon="solar:double-alt-arrow-left-line-duotone"
            class="text-xl"
          />
        </button>

        <button
          v-for="m in mainMenus"
          :key="m.id"
          class="w-10 h-10 flex items-center justify-center rounded-2xl transition-all duration-200"
          :class="
            m.id === activeMainId
              ? 'bg-primary text-white shadow-md'
              : 'text-slate-500 hover:bg-slate-200'
          "
          @click="activeMainId = m.id"
        >
          <Icon :icon="m.icon" class="text-2xl" />
        </button>
      </div>

      <!-- RIGHT PANEL: gunakan h-screen + flex-col supaya footer tetap -->
      <div class="w-64 bg-white h-screen flex flex-col">
        <!-- header -->
        <div class="px-5 py-3 border-b border-slate-100 shrink-0">
          <h2 class="text-sm font-semibold text-slate-700 mb-2">
            {{ currentSubmenu?.title || "Menu" }}
          </h2>

          <!-- SEARCH INPUT (tidak mengubah ukuran font default) -->
          <div class="relative">
            <input
              v-model="searchTerm"
              type="search"
              placeholder="Cari menu..."
              class="w-full text-sm px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div
              class="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
            >
              <Icon
                icon="solar:search-line-duotone"
                class="text-lg text-slate-400"
              />
            </div>
          </div>
        </div>

        <!-- nav: area yang bisa discroll (flex-1 overflow-auto)
             NOTE: keep text-sm here so menu text size matches original -->
        <nav class="flex-1 overflow-y-auto py-3 px-2 space-y-1 text-sm">
          <!-- use filteredItems when searching, otherwise default items -->
          <template
            v-for="item in (debouncedTerm
              ? filteredItems
              : currentSubmenu?.items) || []"
          >
            <button
              v-if="!item.children"
              :key="item.label"
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-amber-200 transition hover:text-primary"
              :class="
                isRouteActive(item.route)
                  ? 'bg-amber-300 text-primary font-semibold'
                  : 'text-slate-600'
              "
              @click="navigate(item.route)"
            >
              <Icon :icon="item.icon" class="text-lg" />
              <span class="truncate">{{ item.label }}</span>
            </button>

            <div v-else :key="`item.label`">
              <button
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:text-primary transition"
                :class="[
                  openDropdownId === item.label || isParentActive(item)
                    ? 'bg-amber-300 text-amber-900 font-semibold'
                    : 'text-slate-600 hover:bg-amber-200',
                ]"
                @click="
                  openDropdownId =
                    openDropdownId === item.label ? null : item.label
                "
              >
                <Icon :icon="item.icon" class="text-lg" />
                <span class="flex-1 text-left truncate">{{ item.label }}</span>

                <!-- single icon yang diputar saat terbuka -->
                <Icon
                  icon="solar:alt-arrow-down-line-duotone"
                  :class="[
                    'text-lg transition-transform duration-200 ease-in-out',
                    openDropdownId === item.label ? 'rotate-180' : 'rotate-0',
                  ]"
                />
              </button>

              <transition name="fade">
                <div
                  v-if="openDropdownId === item.label"
                  class="mt-1 ml-9 space-y-1"
                >
                  <button
                    v-for="child in item.children"
                    :key="child.label"
                    class="w-full text-left text-xs px-3 py-2.5 rounded-md transition hover:text-primary"
                    :class="
                      isRouteActive(child.route)
                        ? 'bg-amber-400 text-amber-950 font-semibold'
                        : 'text-slate-600 hover:bg-amber-200'
                    "
                    @click="navigate(child.route)"
                  >
                    {{ child.label }}
                  </button>
                </div>
              </transition>
            </div>
          </template>

          <!-- jika sedang mencari dan tidak ada hasil -->
          <div
            v-if="debouncedTerm && filteredItems.length === 0"
            class="px-3 py-2 text-sm text-slate-500"
          >
            Tidak ada hasil untuk "<strong>{{ searchTerm }}</strong
            >"
          </div>
        </nav>

        <!-- USER PROFILE BOX: tetap di bawah, tidak terdorong -->
        <div class="px-4 py-4 border-t border-slate-200 bg-slate-50 shrink-0">
          <div class="flex items-center gap-3">
            <div
              class="w-12 h-12 min-h-12 min-w-12 rounded-full bg-primary text-white flex items-center justify-center text-lg font-semibold overflow-hidden"
            >
              <img
                v-if="photoUrl"
                :src="photoUrl"
                alt="Photo"
                class="w-full h-full object-cover"
              />
              <span v-else>{{ initials }}</span>
            </div>

            <div class="min-w-0">
              <div class="text-sm font-semibold text-slate-800 truncate">
                {{ fullname }}
              </div>
              <div class="text-xs text-slate-500 truncate">
                {{ email }}
              </div>
            </div>
          </div>

          <div v-if="loadingUser" class="text-xs text-slate-400 mt-2">
            Memuat...
          </div>
          <div v-if="loadError" class="text-xs text-rose-600 mt-2 truncate">
            {{ loadError }}
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.12s ease,
    transform 0.12s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-3px);
}

/* scrollbar nicety */
::-webkit-scrollbar {
  width: 2px;
}
::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.08);
  border-radius: 999px;
}
</style>
