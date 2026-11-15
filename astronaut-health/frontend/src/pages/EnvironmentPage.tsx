import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import {
  Activity,
  AlertCircle,
  ChevronRight,
  Clock3,
  CloudSun,
  Droplets,
  Info,
  Plus,
  Radiation,
  Save,
  Thermometer,
  Volume2,
  Wind,
  X,
} from "lucide-react";
import { useModalFocus } from "../components/VitalisUI";

type MetricKey = "co2" | "oxygen" | "temperature" | "humidity" | "noise";
type MetricDefinition = {
  label: string;
  unit: string;
  min: number;
  max: number;
  safeMin: number;
  safeMax: number;
  step: number;
  decimals: number;
  icon: typeof Wind;
};

const metricDefinitions: Record<MetricKey, MetricDefinition> = {
  co2: {
    label: "CO₂",
    unit: "ppm",
    min: 0,
    max: 3000,
    safeMin: 400,
    safeMax: 1000,
    step: 10,
    decimals: 0,
    icon: Wind,
  },
  oxygen: {
    label: "O₂",
    unit: "%",
    min: 15,
    max: 25,
    safeMin: 19.5,
    safeMax: 23.5,
    step: 0.1,
    decimals: 1,
    icon: Activity,
  },
  temperature: {
    label: "Temperature",
    unit: "°C",
    min: 10,
    max: 35,
    safeMin: 18,
    safeMax: 26,
    step: 0.1,
    decimals: 1,
    icon: Thermometer,
  },
  humidity: {
    label: "Humidity",
    unit: "%",
    min: 0,
    max: 100,
    safeMin: 30,
    safeMax: 60,
    step: 1,
    decimals: 0,
    icon: Droplets,
  },
  noise: {
    label: "Noise",
    unit: "dB",
    min: 20,
    max: 100,
    safeMin: 35,
    safeMax: 65,
    step: 1,
    decimals: 0,
    icon: Volume2,
  },
};

const initialReadings: Record<MetricKey, number> = {
  co2: 842,
  oxygen: 20.9,
  temperature: 22.4,
  humidity: 42,
  noise: 51,
};

const metricKeys = Object.keys(metricDefinitions) as MetricKey[];

export function EnvironmentPage({
  onNotify,
  onViewPattern,
}: {
  onNotify: (message: string) => void;
  onViewPattern: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [readings, setReadings] = useState(initialReadings);
  const [manualOpen, setManualOpen] = useState(false);
  const modalRef = useRef<HTMLElement>(null);
  const [manualValues, setManualValues] = useState<Record<MetricKey, string>>({
    co2: String(initialReadings.co2),
    oxygen: String(initialReadings.oxygen),
    temperature: String(initialReadings.temperature),
    humidity: String(initialReadings.humidity),
    noise: String(initialReadings.noise),
  });
  const [updatedManually, setUpdatedManually] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setLoading(false), reduced ? 250 : 950);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!manualOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setManualOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [manualOpen]);
  useModalFocus(modalRef, manualOpen, () => setManualOpen(false));

  const openManualEntry = () => {
    setManualValues({
      co2: String(readings.co2),
      oxygen: String(readings.oxygen),
      temperature: String(readings.temperature),
      humidity: String(readings.humidity),
      noise: String(readings.noise),
    });
    setManualOpen(true);
  };

  const saveManualEntry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values: Record<MetricKey, number> = {
      co2: Number(manualValues.co2),
      oxygen: Number(manualValues.oxygen),
      temperature: Number(manualValues.temperature),
      humidity: Number(manualValues.humidity),
      noise: Number(manualValues.noise),
    };
    if (Object.values(values).some((value) => !Number.isFinite(value))) return;
    setReadings(values);
    setUpdatedManually(true);
    setManualOpen(false);
    onNotify("Environment readings saved locally");
  };

  if (loading) return <EnvironmentSkeleton />;

  return (
    <main className="dashboard environment-screen">
      <section className="environment-heading page-entrance">
        <div>
          <p className="eyebrow">HABITAT CONDITIONS</p>
          <h1>Environment & Radiation</h1>
          <p>Monitor cabin conditions and space weather across the mission.</p>
        </div>
        <div className="environment-heading-actions">
          <span className="environment-updated">
            <i />
            {updatedManually ? "Manual entry · just now" : "Sensors synced · 06:42 MLT"}
          </span>
          <button className="primary-button environment-manual-button" onClick={openManualEntry}>
            <Plus size={19} />
            Manual entry
          </button>
        </div>
      </section>

      <section className="environment-section" aria-labelledby="habitat-readings-title">
        <div className="environment-section-heading page-entrance">
          <div>
            <span className="panel-kicker">HABITAT SENSORS</span>
            <h2 id="habitat-readings-title">Atmosphere & comfort</h2>
          </div>
          <span className="sensor-legend">
            <i />
            Safe zone
          </span>
        </div>
        <div className="environment-gauges">
          {metricKeys.map((key, index) => (
            <EnvironmentGauge
              key={key}
              metricKey={key}
              value={readings[key]}
              delay={90 + index * 75}
            />
          ))}
        </div>
      </section>

      <section
        className="space-weather-card panel reveal-card"
        style={{ "--reveal-delay": "280ms" } as CSSProperties}
      >
        <header className="space-weather-heading">
          <div className="space-weather-title">
            <span className="space-weather-icon">
              <CloudSun size={21} />
            </span>
            <div>
              <span className="panel-kicker">SPACE WEATHER</span>
              <h2>
                Space Weather <span>(NASA DONKI)</span>
              </h2>
            </div>
          </div>
          <span className="simulated-badge">
            <i />
            Simulated feed
          </span>
        </header>

        <div className="space-weather-content">
          <div className="radiation-summary">
            <div className="risk-level-row">
              <div>
                <span className="environment-label">RADIATION RISK</span>
                <strong className="risk-level">Low</strong>
              </div>
              <span className="risk-icon">
                <Radiation size={21} />
              </span>
            </div>
            <div className="risk-meter" aria-label="Radiation risk: low">
              <div className="risk-meter-track">
                <span className="risk-meter-marker" />
              </div>
              <div className="risk-meter-labels">
                <span>Low</span>
                <span>Elevated</span>
                <span>High</span>
              </div>
            </div>
            <p className="risk-caption">No elevated solar particle event in this sample.</p>
            <div className="dose-estimate">
              <span className="dose-icon">
                <Radiation size={17} />
              </span>
              <span>
                <small>Cumulative dose estimate</small>
                <strong>
                  18.4 <i>mSv</i>
                </strong>
              </span>
              <span className="dose-simulated">SIMULATED</span>
            </div>
            <div className="dose-progress" aria-hidden="true">
              <span />
            </div>
            <p className="dose-footnote">Mission-to-date estimate · not a live dosimeter reading</p>
          </div>

          <div className="solar-events">
            <div className="solar-events-heading">
              <div>
                <span className="environment-label">RECENT SOLAR EVENTS</span>
                <p>Last 48 hours · sample timeline</p>
              </div>
              <span className="donki-label">DONKI</span>
            </div>
            <div className="solar-event-list">
              <SolarEvent
                kind="flare"
                title="M3.2 Solar Flare"
                time="Today · 09:14 UTC"
                detail="Moderate flare · Earth-directed impact not indicated"
                delay={410}
              />
              <SolarEvent
                kind="cme"
                title="Coronal Mass Ejection"
                time="Yesterday · 22:36 UTC"
                detail="CME detected · Arrival estimate unavailable"
                delay={480}
              />
            </div>
            <div className="space-weather-disclaimer">
              <Info size={15} />
              Illustrative events only. Connect to NASA DONKI for live data.
            </div>
          </div>
        </div>
      </section>

      <section
        className="environment-insight panel reveal-card"
        style={{ "--reveal-delay": "360ms" } as CSSProperties}
      >
        <div className="insight-symbol">
          <Activity size={21} />
        </div>
        <div className="insight-copy">
          <span className="panel-kicker">ENVIRONMENTAL INSIGHT</span>
          <h2>Headaches logged on 2 of 3 high-CO₂ days.</h2>
          <p>
            A pattern in recent logs—not evidence of cause. Consider reviewing ventilation and
            symptom history.
          </p>
        </div>
        <EnvironmentTrendChart />
        <button
          className="insight-action"
          onClick={onViewPattern}
        >
          View pattern <ChevronRight size={18} />
        </button>
      </section>

      <div className="clinical-note">
        <AlertCircle size={16} />
        Decision support only. Not a medical diagnosis.
      </div>

      {manualOpen && (
        <div
          className="environment-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setManualOpen(false);
          }}
        >
          <section
            ref={modalRef}
            className="environment-entry-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-entry-title"
          >
            <header>
              <div>
                <span className="panel-kicker">HABITAT SENSORS</span>
                <h2 id="manual-entry-title">Manual environment entry</h2>
                <p>Enter current cabin readings. Values are saved on this device.</p>
              </div>
              <button
                className="environment-modal-close"
                aria-label="Close manual entry"
                onClick={() => setManualOpen(false)}
              >
                <X size={20} />
              </button>
            </header>
            <form onSubmit={saveManualEntry}>
              <div className="environment-entry-fields">
                {metricKeys.map((key) => {
                  const metric = metricDefinitions[key];
                  return (
                    <label className="environment-entry-field" key={key}>
                      <span>
                        {metric.label}
                        <small>{metric.unit}</small>
                      </span>
                      <input
                        autoFocus={key === "co2"}
                        type="number"
                        inputMode="decimal"
                        min={metric.min}
                        max={metric.max}
                        step={metric.step}
                        required
                        value={manualValues[key]}
                        onChange={(event) =>
                          setManualValues((current) => ({ ...current, [key]: event.target.value }))
                        }
                      />
                    </label>
                  );
                })}
              </div>
              <div className="environment-entry-actions">
                <button
                  type="button"
                  className="environment-cancel-button"
                  onClick={() => setManualOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  <Save size={18} />
                  Save readings
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

function EnvironmentGauge({
  metricKey,
  value,
  delay,
}: {
  metricKey: MetricKey;
  value: number;
  delay: number;
}) {
  const metric = metricDefinitions[metricKey];
  const Icon = metric.icon;
  const percentage = Math.max(
    0,
    Math.min(100, ((value - metric.min) / (metric.max - metric.min)) * 100),
  );
  const safeStart = ((metric.safeMin - metric.min) / (metric.max - metric.min)) * 100;
  const safeEnd = ((metric.safeMax - metric.min) / (metric.max - metric.min)) * 100;
  const inRange = value >= metric.safeMin && value <= metric.safeMax;
  const progressPath = arcPath(0, percentage);
  const safePath = arcPath(safeStart, safeEnd);

  return (
    <article
      className={`environment-gauge-card reveal-card ${inRange ? "in-range" : "out-of-range"}`}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      <div className="environment-gauge-title">
        <span className="environment-gauge-icon">
          <Icon size={17} />
        </span>
        <h3>{metric.label}</h3>
      </div>
      <svg
        className="environment-gauge"
        viewBox="0 0 160 102"
        role="img"
        aria-label={`${metric.label}: ${value.toFixed(metric.decimals)} ${metric.unit}; safe range ${metric.safeMin} to ${metric.safeMax}`}
      >
        <path className="environment-gauge-track" d={arcPath(0, 100)} />
        <path
          className="environment-gauge-safe"
          d={safePath}
          pathLength="1"
          style={{ animationDelay: `${delay + 90}ms` } as CSSProperties}
        />
        <path
          className="environment-gauge-value"
          d={progressPath}
          pathLength="1"
          style={{ animationDelay: `${delay + 170}ms` } as CSSProperties}
        />
      </svg>
      <div className="environment-gauge-reading">
        <strong>{value.toFixed(metric.decimals)}</strong>
        <span>{metric.unit}</span>
      </div>
      <div className="environment-gauge-scale">
        <span>{metric.min}</span>
        <span>{metric.max}</span>
      </div>
      <div className="environment-gauge-footer">
        <span className={`gauge-range-state ${inRange ? "safe" : "caution"}`}>
          <i />
          {inRange ? "In safe zone" : "Outside safe zone"}
        </span>
        <span className="gauge-safe-range">
          {metric.safeMin}–{metric.safeMax}
        </span>
      </div>
    </article>
  );
}

function arcPath(start: number, end: number) {
  const points = Array.from(
    { length: Math.max(2, Math.ceil((end - start) / 3)) + 1 },
    (_, index) => {
      const percentage =
        start + (end - start) * (index / Math.max(1, Math.ceil((end - start) / 3)));
      const angle = Math.PI - (percentage / 100) * Math.PI;
      const x = 80 + Math.cos(angle) * 62;
      const y = 78 - Math.sin(angle) * 62;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    },
  );
  return points.join(" ");
}

function SolarEvent({
  kind,
  title,
  time,
  detail,
  delay,
}: {
  kind: "flare" | "cme";
  title: string;
  time: string;
  detail: string;
  delay: number;
}) {
  return (
    <article
      className={`solar-event ${kind} reveal-card`}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      <span className="solar-event-marker">
        {kind === "flare" ? <CloudSun size={17} /> : <Radiation size={17} />}
      </span>
      <div className="solar-event-copy">
        <div className="solar-event-title">
          <h3>{title}</h3>
          <time>
            <Clock3 size={13} />
            {time}
          </time>
        </div>
        <p>{detail}</p>
      </div>
    </article>
  );
}

function EnvironmentTrendChart() {
  const values = [690, 810, 760, 1040, 860, 1120, 842];
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * 180;
    const y = 46 - ((value - 600) / 600) * 37;
    return `${x},${y}`;
  });
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${point}`).join(" ");

  return (
    <div className="environment-trend" aria-label="Seven recent CO₂ readings">
      <div className="environment-trend-caption">
        <span>CO₂ · 7 READINGS</span>
        <strong>
          842 <small>ppm</small>
        </strong>
      </div>
      <svg viewBox="0 0 180 52" role="img" aria-label="CO₂ trend with readings on three high days">
        <line x1="0" x2="180" y1="15" y2="15" className="environment-trend-threshold" />
        <path d={path} pathLength="1" className="environment-trend-line" />
        {points.map((point, index) => {
          const [cx, cy] = point.split(",");
          return (
            <circle
              className={index === 1 || index === 3 || index === 5 ? "high-day" : ""}
              style={{ "--point-index": index } as CSSProperties}
              key={index}
              cx={cx}
              cy={cy}
              r="2.7"
            />
          );
        })}
      </svg>
      <div className="environment-trend-days">
        <span>−6 days</span>
        <span>Today</span>
      </div>
    </div>
  );
}

function EnvironmentSkeleton() {
  return (
    <main
      className="dashboard environment-screen environment-skeleton"
      aria-label="Loading environment readings"
    >
      <section className="environment-heading">
        <div>
          <div className="skeleton-block env-sk-eyebrow" />
          <div className="skeleton-block env-sk-title" />
          <div className="skeleton-block env-sk-copy" />
        </div>
        <div className="skeleton-block env-sk-button" />
      </section>
      <div className="environment-section-heading">
        <div>
          <div className="skeleton-block env-sk-section-kicker" />
          <div className="skeleton-block env-sk-section-title" />
        </div>
      </div>
      <section className="environment-gauges" aria-hidden="true">
        {metricKeys.map((key, index) => (
          <div className="environment-gauge-card env-sk-gauge" key={key}>
            <div className="skeleton-block env-sk-gauge-title" />
            <div className="skeleton-block env-sk-gauge-arc" />
            <div className="skeleton-block env-sk-gauge-value" />
            <div
              className="skeleton-block env-sk-gauge-footer"
              style={{ "--reveal-delay": `${index * 50}ms` } as CSSProperties}
            />
          </div>
        ))}
      </section>
      <div className="skeleton-block env-sk-weather" />
      <div className="skeleton-block env-sk-insight" />
    </main>
  );
}
