<template>
  <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
    <div class="flex items-center justify-between gap-2">
      <span class="text-sm font-medium text-[#602515] truncate">{{ title }}</span>
      <router-link
        :to="to"
        :title="`Buka ${title}`"
        class="w-8 h-8 shrink-0 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-[#602515] hover:border-[#602515]/40 hover:bg-[#602515]/5 transition-colors"
      >
        <Icon icon="solar:arrow-right-linear" />
      </router-link>
    </div>

    <div class="flex items-baseline gap-1.5">
      <span class="text-2xl font-bold text-slate-800">{{ format(summary.value) }}</span>
      <span class="text-sm text-slate-500">{{ unit }}</span>
    </div>
    <div class="mt-1 flex items-center gap-2 text-xs">
      <span
        v-if="summary.delta != null"
        class="flex items-center gap-0.5 font-semibold px-2 py-0.5 rounded-full"
        :class="summary.delta >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'"
      >
        <Icon
          :icon="summary.delta >= 0 ? 'solar:arrow-right-up-linear' : 'solar:arrow-right-down-linear'"
        />
        {{ Math.abs(summary.delta) }}%
      </span>
      <span class="text-slate-400">
        {{ summary.delta != null ? "dari periode sebelumnya" : "belum ada pembanding" }}
      </span>
    </div>

    <div class="h-36 mt-3">
      <Bar v-if="type === 'bar'" :data="chartData" :options="chartOptions" :plugins="[valueLabels]" />
      <Line v-else :data="chartData" :options="chartOptions" />
    </div>

    <div class="mt-3 flex gap-2">
      <button
        v-for="r in RANGES"
        :key="r.months"
        type="button"
        @click="range = r.months"
        class="flex-1 text-xs py-1 rounded-full border transition-colors"
        :class="
          range === r.months
            ? 'bg-[#602515] border-[#602515] text-white'
            : 'border-slate-200 text-slate-600 hover:border-[#602515]/40'
        "
      >
        {{ r.label }}
      </button>
    </div>
  </div>
</template>

<script setup>
// Simple trend card: headline value for the chosen range, % change against
// the range before it, one chart (area line or labelled bars) and a link to
// the full page.
import { ref, computed } from "vue";
import { Icon } from "@iconify/vue";
import { Line, Bar } from "vue-chartjs";
import {
  Chart as ChartJS,
  Tooltip,
  Filler,
  LineElement,
  PointElement,
  BarElement,
  CategoryScale,
  LinearScale,
} from "chart.js";

ChartJS.register(Tooltip, Filler, LineElement, PointElement, BarElement, CategoryScale, LinearScale);

const props = defineProps({
  title: { type: String, required: true },
  to: { type: String, required: true },
  unit: { type: String, default: "" },
  months: { type: Array, required: true }, // "YYYY-MM", oldest first
  values: { type: Array, required: true }, // one per month, null = no data
  weights: { type: Array, default: null }, // for a weighted average (e.g. exam counts)
  aggregate: { type: String, default: "sum" }, // "sum" | "avg"
  type: { type: String, default: "line" }, // "line" | "bar"
  suffix: { type: String, default: "" },
});

const BRAND = "#602515";
const RANGES = [
  { months: 3, label: "3 Bln" },
  { months: 6, label: "6 Bln" },
  { months: 12, label: "1 Thn" },
];
const range = ref(6);

const round = (n) => Math.round(n * 10) / 10;
const format = (v) => (v == null ? "-" : `${round(v)}${props.suffix}`);
const monthName = (m, opts) => {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString("id-ID", opts);
};

// Sum or (weighted) average of values[from, to); null when there is no data.
function summarize(from, to) {
  let total = 0;
  let weight = 0;
  for (let i = Math.max(0, from); i < to; i++) {
    const v = props.values[i];
    if (v == null) continue;
    const w = props.weights ? props.weights[i] : 1;
    total += props.aggregate === "avg" ? v * w : v;
    weight += w;
  }
  if (!weight) return null;
  return props.aggregate === "avg" ? total / weight : total;
}

const summary = computed(() => {
  const end = props.values.length;
  const value = summarize(end - range.value, end);
  const prev = summarize(end - 2 * range.value, end - range.value);
  const delta = value != null && prev ? round(((value - prev) / prev) * 100) : null;
  return { value, delta };
});

const visible = computed(() => {
  const start = Math.max(0, props.months.length - range.value);
  return { months: props.months.slice(start), values: props.values.slice(start) };
});

function areaGradient({ chart }) {
  const { ctx, chartArea } = chart;
  if (!chartArea) return "transparent";
  const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  g.addColorStop(0, "rgba(96, 37, 21, 0.25)");
  g.addColorStop(1, "rgba(96, 37, 21, 0)");
  return g;
}

const chartData = computed(() => ({
  labels: visible.value.months.map((m) => monthName(m, { month: "short" })),
  datasets: [
    {
      data: visible.value.values,
      borderColor: BRAND,
      backgroundColor: props.type === "bar" ? BRAND : areaGradient,
      pointBackgroundColor: BRAND,
      fill: props.type === "line",
      cubicInterpolationMode: "monotone",
      spanGaps: true,
      pointRadius: 3,
      borderWidth: 2,
      borderRadius: 6,
      maxBarThickness: 28,
    },
  ],
}));

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  layout: { padding: { top: props.type === "bar" ? 16 : 6 } },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        title: (items) =>
          monthName(visible.value.months[items[0].dataIndex], { month: "long", year: "numeric" }),
        label: (item) => `${format(item.raw)} ${props.unit}`,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { font: { size: 10 }, color: "#94a3b8" },
    },
    // grace keeps a line's lowest/highest point off the card edge
    y: { display: false, beginAtZero: props.type === "bar", grace: props.type === "bar" ? 0 : "15%" },
  },
}));

// Value above each bar, like the reference design.
const valueLabels = {
  id: "valueLabels",
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    ctx.save();
    ctx.font = `600 10px ${ChartJS.defaults.font.family}`;
    ctx.fillStyle = BRAND;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    chart.getDatasetMeta(0).data.forEach((bar, i) => {
      const v = chart.data.datasets[0].data[i];
      if (v != null) ctx.fillText(format(v), bar.x, bar.y - 3);
    });
    ctx.restore();
  },
};
</script>
