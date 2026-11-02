<template>
  <div
    class="p-2 md:p-6 opacity-0 animate-fade-in"
    :class="{ 'opacity-100': true }"
  >
    <!-- Main Container -->
    <!-- Removed overflow-hidden to allow dropdowns to spill over -->
    <div
      class="w-full max-w-full min-w-0 bg-white rounded-2xl shadow-sm border border-slate-200"
    >
      <!-- Header Section -->
      <div
        v-if="title || $slots['header-actions']"
        class="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100"
      >
        <div class="flex items-center gap-3">
          <div
            v-if="icon"
            class="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"
          >
            <Icon :icon="icon" class="text-xl text-[#602515]" />
          </div>
          <div>
            <h1 v-if="title" class="text-lg font-semibold text-slate-800">
              {{ title }}
            </h1>
            <p v-if="description" class="text-sm text-slate-500">
              {{ description }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <slot name="header-actions"></slot>
        </div>
      </div>

      <!-- Toolbar Section: Tabs + Search + Filters -->
      <div
        class="p-1 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100"
      >
        <!-- Left: View Toggle with Icons -->
        <div
          class="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200"
        >
          <button
            @click="$emit('update:viewMode', 'table')"
            class="p-2 rounded-md transition-all flex items-center justify-center"
            :class="
              (viewMode === 'table' || viewMode === 'list')
                ? 'bg-white shadow text-[#602515]'
                : 'text-slate-500 hover:text-slate-700'
            "
            title="Tampilan Tabel"
          >
            <Icon icon="solar:list-bold-duotone" class="text-xl" />
          </button>
          <button
            @click="$emit('update:viewMode', 'card')"
            class="p-2 rounded-md transition-all flex items-center justify-center"
            :class="
              viewMode === 'card'
                ? 'bg-white shadow text-[#602515]'
                : 'text-slate-500 hover:text-slate-700'
            "
            title="Tampilan Kartu"
          >
            <Icon icon="solar:gallery-wide-bold-duotone" class="text-xl" />
          </button>
        </div>

        <!-- Right: Search + Filters -->
        <div class="flex items-center gap-2 w-full md:w-auto">
          <div class="relative flex-1 md:flex-none">
            <Icon
              icon="solar:magnifer-linear"
              class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              :value="search"
              @input="$emit('update:search', $event.target.value)"
              placeholder="Cari..."
              class="pl-10 pr-4 py-2 w-full md:w-56 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#602515] transition-colors"
            />
          </div>

          <div class="relative" v-if="!hideFilter">
            <button
              @click="showFilters = !showFilters"
              class="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Icon :icon="filterButtonIcon" class="text-base" />
              <span v-if="filterButtonLabel">{{ filterButtonLabel }}</span>
            </button>

            <!-- Backdrop -->
            <div
              v-if="showFilters"
              class="fixed inset-0 z-20"
              @click="showFilters = false"
            ></div>

            <!-- Filters Dropdown -->
            <div
              v-if="showFilters"
              class="absolute right-0 mt-2 w-72 xs:w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-slate-200 p-4 z-30"
            >
              <slot name="filters" :close="() => (showFilters = false)"></slot>
            </div>
          </div>

          <slot name="toolbar-actions"></slot>
        </div>
      </div>

      <!-- Desktop table container -->
      <!-- Added rounded corners to mask content since parent is not overflow-hidden -->
      <div
        v-if="viewMode === 'table' || viewMode === 'list'"
        class="relative w-px min-w-full overflow-x-auto scrolling-touch"
      >
        <div v-if="loading" class="p-4">
          <TableSkeleton
            viewMode="table"
            :rows="pagination?.limit || 5"
            :columnCount="columns.length"
          />
        </div>
        <table v-else class="min-w-[1000px] w-full text-left border-collapse">
          <thead
            class="text-slate-500 text-xs font-medium uppercase tracking-wider bg-slate-50/50"
          >
            <tr class="border-b border-slate-200">
              <th
                v-for="col in columns"
                :key="col.field || col.key"
                :class="[
                  'p-3 md:p-4',
                  col.width || '',
                  col.headerClass || '',
                  col.sticky ? 'sticky z-30 bg-white' : '',
                  col.stickyClass || '',
                  col.align === 'center' ? 'text-center' : (col.align === 'right' ? 'text-right' : 'text-left'),
                ]"
              >
                <div
                  v-if="col.type === 'checkbox'"
                  class="flex items-center justify-center"
                >
                  <slot name="header-checkbox"></slot>
                </div>
                <div
                  v-else-if="col.sortable"
                  @click="$emit('sort', col.field)"
                  class="cursor-pointer flex items-center gap-1 hover:text-slate-700"
                  :class="col.align === 'center' ? 'justify-center' : ''"
                >
                  {{ col.label }}
                  <SortIcon
                    :field="col.field || col.key"
                    :sortBy="sortBy"
                    :order="sortOrder"
                  />
                </div>
                <span v-else>{{ col.label }}</span>
              </th>
            </tr>
          </thead>

          <tbody class="text-sm text-slate-600">
            <tr
              v-for="(item, idx) in items"
              :key="item.id || idx"
              class="group border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
            >
              <td
                v-for="col in columns"
                :key="col.field || col.key"
                :class="[
                  'p-3 md:p-4',
                  col.cellClass || '',
                  col.sticky
                    ? 'sticky z-20 bg-white group-hover:bg-slate-50 transition-colors'
                    : '',
                  col.stickyClass || '',
                  col.align === 'center' ? 'text-center' : 'text-left',
                ]"
              >
                <slot :name="`cell-${col.field || col.key}`" :item="item" :index="idx">
                  {{ item[col.field || col.key] }}
                </slot>
              </td>
            </tr>
            <tr v-if="items.length === 0">
              <td
                :colspan="columns.length"
                class="p-8 text-center text-slate-500"
              >
                Data tidak ditemukan
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Card View -->
      <div v-else-if="loading" class="p-4">
        <TableSkeleton viewMode="card" :rows="pagination?.limit || 6" />
      </div>
      <div
        v-else
        class="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50"
      >
        <template v-for="(item, idx) in items" :key="item.id || idx">
          <slot name="card-item" :item="item" :index="idx"></slot>
        </template>
        <div
          v-if="items.length === 0"
          class="col-span-full p-8 text-center text-slate-500"
        >
          Data tidak ditemukan
        </div>
      </div>

      <!-- Footer / Pagination -->
      <div
        class="p-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 items-center gap-4"
      >
        <!-- Left: Total Data -->
        <div
          class="text-sm text-slate-600 justify-self-start order-2 md:order-1"
        >
          Total Data:
          <span class="font-semibold">{{
            pagination ? pagination.total : items.length
          }}</span>
        </div>

        <!-- Center: Pagination Controls -->
        <div
          v-if="pagination"
          class="flex items-center justify-center gap-1 justify-self-center order-1 md:order-2 w-full md:w-auto"
        >
          <button
            @click="$emit('page-change', (pagination?.page || 1) - 1)"
            :disabled="(pagination?.page || 1) <= 1"
            class="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Icon icon="solar:alt-arrow-left-linear" />
          </button>

          <!-- Page Numbers -->
          <div class="flex items-center gap-1">
            <template v-for="page in visiblePages" :key="page">
              <span v-if="page === '...'" class="w-8 text-center text-slate-400"
                >...</span
              >
              <button
                v-else
                @click="$emit('page-change', page)"
                class="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors"
                :class="
                  page === pagination?.page
                    ? 'bg-[#602515] text-white shadow-sm'
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                "
              >
                {{ page }}
              </button>
            </template>
          </div>

          <button
            @click="$emit('page-change', (pagination?.page || 1) + 1)"
            :disabled="(pagination?.page || 1) >= (pagination?.totalPages || 1)"
            class="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Icon icon="solar:alt-arrow-right-linear" />
          </button>
        </div>
        <div v-else class="order-1 md:order-2"></div>

        <!-- Right: Page Size -->
        <div
          class="flex items-center justify-end gap-2 justify-self-end order-3 md:order-3"
        >
          <div v-if="pagination" class="flex items-center gap-2">
            <span class="text-sm text-slate-500">Show:</span>
            <select
              :value="pagination?.limit"
              @change="
                $emit('update:limit', Number($event.target.value));
                $emit('page-change', 1);
              "
              class="border border-slate-200 rounded-lg text-sm px-2 py-1 bg-white focus:outline-none focus:border-[#602515]"
            >
              <option :value="5">5</option>
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
              <option :value="9999">All</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { Icon } from "@iconify/vue";
import SortIcon from "@/components/ui/SortIcon.vue";
import TableSkeleton from "@/components/ui/TableSkeleton.vue";

const props = defineProps({
  title: String,
  description: String,
  icon: String,
  items: {
    type: Array,
    default: () => [],
  },
  columns: {
    type: Array,
    default: () => [],
  },
  loading: Boolean,
  viewMode: {
    type: String, // 'table' | 'card'
    default: "table",
  },
  search: String,
  pagination: {
    type: Object,
    default: () => ({ page: 1, limit: 10, total: 0, totalPages: 0 }),
  },
  sortBy: String,
  sortOrder: String,
  filterButtonIcon: {
    type: String,
    default: "solar:filter-line-duotone",
  },
  filterButtonLabel: {
    type: String,
    default: "Filters",
  },
  hideFilter: {
    type: Boolean,
    default: false,
  },
});

defineEmits([
  "update:viewMode",
  "update:search",
  "update:limit",
  "page-change",
  "sort",
]);

const showFilters = ref(false);

/* Pagination Logic */
const visiblePages = computed(() => {
  if (!props.pagination) return [];
  const current = props.pagination.page;
  const total = props.pagination.totalPages;
  const pages = [];

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    // Always show first, last, current, and neighbors
    if (current <= 4) {
      // Start range: 1 2 3 4 5 ... 10
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push("...");
      pages.push(total);
    } else if (current >= total - 3) {
      // End range: 1 ... 6 7 8 9 10
      pages.push(1);
      pages.push("...");
      for (let i = total - 4; i <= total; i++) pages.push(i);
    } else {
      // Middle range: 1 ... 4 5 6 ... 10
      pages.push(1);
      pages.push("...");
      pages.push(current - 1);
      pages.push(current);
      pages.push(current + 1);
      pages.push("...");
      pages.push(total);
    }
  }
  return pages;
});
</script>
