import { useEffect, useMemo, useState, type CSSProperties, type ComponentType } from "react";
import {
  Activity,
  Bone,
  Brain,
  ChevronDown,
  Dumbbell,
  HeartPulse,
  Moon,
  ShieldPlus,
  Smile,
  Sparkles,
  Thermometer,
  TrendingUp,
} from "lucide-react";
import { StatusChip } from "./VitalisUI";

type RangeKey = "7d" | "14d" | "30d" | "Mission";
type Overlay = "none" | "sleep" | "exercise";

const metricOptions = [
  {
    key: "heart",
    label: "Heart Rate",
    unit: "bpm",
    icon: HeartPulse,
    baseline: [62, 68],
    tone: "warning",
  },
  {
    key: "pressure",
    label: "Blood Pressure",
    unit: "mmHg",
    icon: Activity,
    baseline: [110, 125],
    tone: "normal",
  },
  {
    key: "glucose",
    label: "Glucose",
    unit: "mg/dL",
    icon: TrendingUp,
    baseline: [75, 100],
    tone: "normal",
  },
  {
    key: "temperature",
    label: "Temperature",
    unit: "°C",
    icon: Thermometer,
    baseline: [36.3, 37],
    tone: "normal",
  },
  { key: "sleep", label: "Sleep", unit: "hours", icon: Moon, baseline: [7, 9], tone: "caution" },
  { key: "mood", label: "Mood", unit: "/5", icon: Smile, baseline: [3, 5], tone: "normal" },
];

const series: Record<string, number[]> = {
  heart: [64, 65, 64, 66, 65, 64, 65, 66, 67, 68, 69, 70, 71, 72],
  pressure: [116, 118, 115, 117, 119, 116, 118, 117, 120, 118, 119, 121, 117, 118],
  glucose: [89, 91, 88, 92, 90, 93, 91, 89, 94, 92, 93, 91, 95, 92],
  temperature: [36.5, 36.6, 36.5, 36.7, 36.6, 36.5, 36.6, 36.7, 36.6, 36.7, 36.6, 36.8, 36.7, 36.7],
  sleep: [7.8, 7.5, 7.6, 7.4, 7.7, 7.3, 7.5, 7.2, 7.1, 6.9, 6.8, 6.5, 6.2, 6.67],
  mood: [4, 4, 5, 4, 4, 4, 3, 4, 4, 3, 3, 4, 3, 4],
};

export function TrendsCharts({ onNotify }: { onNotify: (message: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState("heart");
  const [range, setRange] = useState<RangeKey>("14d");
  const [overlay, setOverlay] = useState<Overlay>("none");
  const [selected, setSelected] = useState(13);

  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(() => setLoading(false), reduced ? 250 : 1000);
    return () => clearTimeout(timer);
  }, []);

  const config = metricOptions.find((item) => item.key === metric) ?? metricOptions[0];
  const values = useMemo(() => {
    const source = series[metric];
    if (range === "7d") return source.slice(-7);
    if (range === "14d") return source;
    if (range === "30d") return [...source.slice(2), ...source, ...source.slice(-4)];
    return [...source, ...source.slice(4), ...source.slice(8)];
  }, [metric, range]);

  useEffect(() => setSelected(values.length - 1), [values]);

  if (loading) return <TrendsSkeleton />;

  return (
    <main className="dashboard trends-screen">
      <section className="trends-heading page-entrance">
        <div>
          <p className="eyebrow">LONGITUDINAL HEALTH</p>
          <h1>Trends & Charts</h1>
          <p>Compare recent readings with your personal baseline and mission history.</p>
        </div>
        <StatusChip tone="caution" label="1 trend to review" />
      </section>

      <section
        className="trend-control-deck reveal-card"
        style={{ "--reveal-delay": "60ms" } as CSSProperties}
      >
        <div className="metric-picker-wrap">
          <span className="control-label">METRIC</span>
          <div className="metric-picker">
            {metricOptions.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  className={metric === item.key ? "active" : ""}
                  onClick={() => setMetric(item.key)}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="range-picker-wrap">
          <span className="control-label">RANGE</span>
          <div className="range-picker">
            {(["7d", "14d", "30d", "Mission"] as RangeKey[]).map((item) => (
              <button
                key={item}
                className={range === item ? "active" : ""}
                onClick={() => setRange(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="trends-section-heading page-entrance">
        <span className="trends-section-number">01</span>
        <div>
          <span className="panel-kicker">PRIMARY TREND</span>
          <h2>{config.label} over time</h2>
          <p>Tap a point to inspect the reading and its relationship to your baseline.</p>
        </div>
      </div>

      <article
        className="main-trend-card panel reveal-card"
        style={{ "--reveal-delay": "120ms" } as CSSProperties}
      >
        <header>
          <div className="trend-title-block">
            <span className="trend-metric-icon">
              <config.icon size={22} />
            </span>
            <div>
              <span className="panel-kicker">{config.label.toUpperCase()}</span>
              <h2>{metric === "heart" ? "Resting heart rate" : config.label}</h2>
            </div>
          </div>
          <div className="overlay-control">
            <span>OVERLAY</span>
            <div>
              <button
                className={overlay === "none" ? "active" : ""}
                onClick={() => setOverlay("none")}
              >
                None
              </button>
              <button
                className={overlay === "sleep" ? "active" : ""}
                onClick={() => setOverlay("sleep")}
              >
                <Moon size={15} /> Sleep
              </button>
              <button
                className={overlay === "exercise" ? "active" : ""}
                onClick={() => setOverlay("exercise")}
              >
                <Dumbbell size={15} /> Exercise
              </button>
            </div>
          </div>
        </header>
        <PrimaryTrendChart
          values={values}
          unit={config.unit}
          baseline={config.baseline}
          selected={selected}
          onSelect={setSelected}
          overlay={overlay}
        />
        <div className="trend-insight-strip">
          <span className="insight-icon">
            <Sparkles size={20} />
          </span>
          <div>
            <span>PLAIN-LANGUAGE INSIGHT</span>
            <strong>
              {metric === "heart"
                ? "Resting heart rate has risen 8% over 5 days."
                : `${config.label} remains close to your personal baseline.`}
            </strong>
          </div>
          <button onClick={() => onNotify(`${config.label} guidance opened`)}>
            See guidance <ChevronDown size={17} />
          </button>
        </div>
      </article>

      <div className="trends-section-heading page-entrance">
        <span className="trends-section-number">02</span>
        <div>
          <span className="panel-kicker">COMPARISON & BALANCE</span>
          <h2>See the wider health picture</h2>
          <p>Compare weeks and review how connected health domains are balancing.</p>
        </div>
      </div>

      <section className="comparison-grid">
        <article
          className="comparison-card panel reveal-card"
          style={{ "--reveal-delay": "240ms" } as CSSProperties}
        >
          <header>
            <div>
              <span className="panel-kicker">WEEK OVER WEEK</span>
              <h2>Daily resting heart rate</h2>
            </div>
            <div className="week-legend">
              <span>
                <i className="previous" />
                Previous
              </span>
              <span>
                <i className="current" />
                Current
              </span>
            </div>
          </header>
          <WeekComparison />
        </article>
        <article
          className="radar-card panel reveal-card"
          style={{ "--reveal-delay": "300ms" } as CSSProperties}
        >
          <header>
            <div>
              <span className="panel-kicker">WHOLE-PERSON VIEW</span>
              <h2>Health balance</h2>
            </div>
            <StatusChip tone="normal" label="Balanced" />
          </header>
          <HealthRadar />
        </article>
      </section>
    </main>
  );
}

function PrimaryTrendChart({
  values,
  unit,
  baseline,
  selected,
  onSelect,
  overlay,
}: {
  values: number[];
  unit: string;
  baseline: number[];
  selected: number;
  onSelect: (index: number) => void;
  overlay: Overlay;
}) {
  const all = [...values, ...baseline];
  const min = Math.min(...all) - Math.max((Math.max(...all) - Math.min(...all)) * 0.25, 1);
  const max = Math.max(...all) + Math.max((Math.max(...all) - Math.min(...all)) * 0.25, 1);
  const x = (index: number) => (index / (values.length - 1)) * 800;
  const y = (value: number) => 250 - ((value - min) / (max - min)) * 220;
  const points = values.map((value, index) => `${x(index)},${y(value)}`).join(" ");
  const area = `M${points.replaceAll(" ", " L")} L800,270 L0,270 Z`;
  const overlayValues = values.map((_, index) =>
    overlay === "sleep"
      ? 175 + Math.sin(index * 0.7) * 32 + index * 2.5
      : 150 - Math.cos(index * 1.1) * 45,
  );
  const overlayPoints = overlayValues.map((value, index) => `${x(index)},${value}`).join(" ");
  const selectedValue = values[selected];
  return (
    <div className="primary-chart">
      <div className="primary-y-labels">
        <span>{max.toFixed(0)}</span>
        <span>{((max + min) / 2).toFixed(0)}</span>
        <span>{min.toFixed(0)}</span>
      </div>
      <svg viewBox="0 0 800 280" preserveAspectRatio="none">
        <defs>
          <linearGradient id="primaryArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--accent-primary)" stopOpacity=".24" />
            <stop offset="1" stopColor="var(--accent-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className="chart-grid">
          <line x1="0" x2="800" y1="30" y2="30" />
          <line x1="0" x2="800" y1="140" y2="140" />
          <line x1="0" x2="800" y1="250" y2="250" />
        </g>
        <rect
          className="personal-band"
          x="0"
          y={y(baseline[1])}
          width="800"
          height={Math.abs(y(baseline[0]) - y(baseline[1]))}
        />
        <text className="baseline-label" x="790" y={y(baseline[1]) + 15} textAnchor="end">
          PERSONAL BASELINE
        </text>
        <path className="primary-area" d={area} />
        <polyline className="primary-line" pathLength="1" points={points} />
        {overlay !== "none" && (
          <polyline
            key={overlay}
            className={`overlay-line ${overlay}`}
            pathLength="1"
            points={overlayPoints}
          />
        )}
        {values.map((value, index) => {
          const outside = value < baseline[0] || value > baseline[1];
          return (
            <circle
              key={`${index}-${value}`}
              className={`trend-point ${outside ? "outside" : ""} ${selected === index ? "selected" : ""}`}
              style={{ "--point-delay": `${950 + index * 35}ms` } as CSSProperties}
              cx={x(index)}
              cy={y(value)}
              r={selected === index ? 7 : 5}
              onClick={() => onSelect(index)}
            />
          );
        })}
        <line className="selected-guide" x1={x(selected)} x2={x(selected)} y1="20" y2="258" />
      </svg>
      <div
        className="point-tooltip"
        style={{
          left: `${(selected / (values.length - 1)) * 91 + 5}%`,
          top: `${(y(selectedValue) / 280) * 100}%`,
        }}
      >
        <span>Day {selected + 1}</span>
        <strong>
          {selectedValue} {unit}
        </strong>
        <small>{selectedValue > baseline[1] ? "Above baseline" : "Within baseline"}</small>
      </div>
      <div className="primary-x-labels">
        <span>Start</span>
        <span>Midpoint</span>
        <span>Today</span>
      </div>
      {overlay !== "none" && (
        <div className="overlay-legend">
          <i className={overlay} />
          {overlay === "sleep" ? "Sleep duration" : "Exercise load"}
        </div>
      )}
    </div>
  );
}

function WeekComparison() {
  const previous = [64, 65, 64, 66, 65, 66, 65];
  const current = [66, 67, 68, 69, 70, 71, 72];
  return (
    <div className="week-chart">
      {current.map((value, index) => (
        <div className="week-column" key={index}>
          <div className="bar-pair">
            <i
              className="previous"
              style={
                {
                  "--height": `${previous[index] - 45}%`,
                  "--bar-delay": `${300 + index * 45}ms`,
                } as CSSProperties
              }
            />
            <i
              className="current"
              style={
                {
                  "--height": `${value - 45}%`,
                  "--bar-delay": `${340 + index * 45}ms`,
                } as CSSProperties
              }
            />
          </div>
          <span>{["M", "T", "W", "T", "F", "S", "S"][index]}</span>
        </div>
      ))}
    </div>
  );
}

function HealthRadar() {
  const axes = [
    { label: "Heart", icon: HeartPulse, x: 150, y: 15 },
    { label: "Sleep", icon: Moon, x: 265, y: 78 },
    { label: "Mood", icon: Brain, x: 265, y: 212 },
    { label: "Activity", icon: Dumbbell, x: 150, y: 280 },
    { label: "Bone & muscle", icon: Bone, x: 35, y: 212 },
    { label: "Immunity", icon: ShieldPlus, x: 35, y: 78 },
  ];
  return (
    <div className="radar-wrap">
      <svg viewBox="0 0 300 295">
        <g className="radar-grid">
          <polygon points="150,35 250,92 250,203 150,260 50,203 50,92" />
          <polygon points="150,70 220,108 220,187 150,225 80,187 80,108" />
          <polygon points="150,105 190,124 190,171 150,190 110,171 110,124" />
          <line x1="150" y1="147" x2="150" y2="35" />
          <line x1="150" y1="147" x2="250" y2="92" />
          <line x1="150" y1="147" x2="250" y2="203" />
          <line x1="150" y1="147" x2="150" y2="260" />
          <line x1="150" y1="147" x2="50" y2="203" />
          <line x1="150" y1="147" x2="50" y2="92" />
        </g>
        <polygon className="radar-polygon" points="150,57 224,105 233,194 150,224 77,188 68,102" />
        {axes.map((axis) => (
          <circle
            className="radar-point"
            key={axis.label}
            cx={axis.x === 150 ? 150 : axis.x > 150 ? axis.x - 30 : axis.x + 30}
            cy={axis.y < 147 ? axis.y + 42 : axis.y - 35}
            r="4"
          />
        ))}
      </svg>
      {axes.map((axis) => {
        const Icon = axis.icon;
        return (
          <span
            className="radar-axis-label"
            key={axis.label}
            style={{ left: `${(axis.x / 300) * 100}%`, top: `${(axis.y / 295) * 100}%` }}
          >
            <Icon size={14} />
            {axis.label}
          </span>
        );
      })}
    </div>
  );
}

function TrendsSkeleton() {
  return (
    <main className="dashboard trends-screen trends-skeleton">
      <section className="trends-heading">
        <div>
          <div className="skeleton-block trends-sk-eyebrow" />
          <div className="skeleton-block trends-sk-title" />
          <div className="skeleton-block trends-sk-copy" />
        </div>
      </section>
      <div className="skeleton-block trends-sk-controls" />
      <div className="skeleton-block trends-sk-main" />
      <section className="comparison-grid">
        <div className="skeleton-block trends-sk-secondary" />
        <div className="skeleton-block trends-sk-secondary" />
      </section>
    </main>
  );
}
