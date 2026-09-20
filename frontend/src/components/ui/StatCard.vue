<template>
  <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
    <div class="flex items-center justify-between gap-2 mb-3">
      <div class="flex items-center gap-2 min-w-0">
        <div
          class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          :class="colorClasses"
        >
          <Icon :icon="icon" class="text-base" />
        </div>
        <span class="text-sm font-medium text-slate-600 truncate">{{ label }}</span>
      </div>
      <Icon
        v-if="info"
        icon="solar:info-circle-line-duotone"
        class="text-slate-300 text-base shrink-0"
        :title="info"
      />
    </div>
    <div class="flex items-end justify-between gap-2">
      <span
        class="text-2xl font-bold truncate min-w-0"
        :class="valueClass || 'text-slate-800'"
        :title="String(value)"
        >{{ value }}</span
      >
      <span
        v-if="trend"
        class="flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full shrink-0"
        :class="
          trend.direction === 'up'
            ? 'bg-emerald-50 text-emerald-600'
            : 'bg-rose-50 text-rose-600'
        "
      >
        <Icon
          :icon="
            trend.direction === 'up'
              ? 'solar:arrow-right-up-linear'
              : 'solar:arrow-right-down-linear'
          "
        />
        {{ trend.value }}%
      </span>
    </div>
    <p v-if="caption" class="text-xs text-slate-400 mt-1">{{ caption }}</p>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { Icon } from "@iconify/vue";

const props = defineProps({
  icon: { type: String, required: true },
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  color: { type: String, default: "indigo" },
  // { value: number, direction: 'up' | 'down' }
  trend: { type: Object, default: null },
  info: { type: String, default: "" },
  caption: { type: String, default: "" },
  valueClass: { type: String, default: "" },
});

const colorMap = {
  indigo: "bg-indigo-50 text-indigo-600",
  emerald: "bg-emerald-50 text-emerald-600",
  rose: "bg-rose-50 text-rose-600",
  amber: "bg-amber-50 text-amber-600",
  orange: "bg-orange-50 text-orange-600",
  sky: "bg-sky-50 text-sky-600",
  violet: "bg-violet-50 text-violet-600",
  fuchsia: "bg-fuchsia-50 text-fuchsia-600",
  teal: "bg-teal-50 text-teal-600",
  lime: "bg-lime-50 text-lime-600",
  blue: "bg-blue-50 text-blue-600",
  red: "bg-red-50 text-red-600",
  yellow: "bg-yellow-50 text-yellow-600",
  green: "bg-green-50 text-green-600",
  purple: "bg-purple-50 text-purple-600",
  slate: "bg-slate-100 text-slate-500",
};

const colorClasses = computed(() => colorMap[props.color] || colorMap.indigo);
</script>
