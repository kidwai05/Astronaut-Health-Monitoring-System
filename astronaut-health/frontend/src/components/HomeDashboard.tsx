import { useState, type CSSProperties } from "react";
import {
  Activity,
  BedDouble,
  Check,
  ChevronRight,
  CircleAlert,
  Flame,
  HeartPulse,
  Plus,
  RefreshCw,
  Smile,
  Sun,
  Thermometer,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import { MetricTile, ReminderItem, type StatusTone } from "./VitalisUI";

const homeMetrics = [
  {
    label: "Heart Rate",
    value: "72",
    unit: "bpm",
    detail: "7-day trend · Live",
    icon: HeartPulse,
    tone: "caution" as StatusTone,
    status: "Caution",
    live: true,
    data: [65, 66, 65, 67, 68, 70, 72],
  },
  {
    label: "Blood Pressure",
    value: "118/76",
    unit: "mmHg",
    detail: "7-day average · 117/75",
    icon: Activity,
    tone: "normal" as StatusTone,
    status: "Normal",
    data: [116, 118, 117, 115, 119, 117, 118],
  },
  {
    label: "Glucose",
    value: "92",
    unit: "mg/dL",
    detail: "7-day fasting trend",
    icon: TrendingUp,
    tone: "normal" as StatusTone,
    status: "Normal",
    data: [89, 91, 90, 94, 91, 93, 92],
  },
  {
    label: "Temperature",
    value: "36.7",
    unit: "°C",
    detail: "7-day stable range",
    icon: Thermometer,
    tone: "normal" as StatusTone,
    status: "Normal",
    data: [36.5, 36.6, 36.5, 36.7, 36.6, 36.6, 36.7],
  },
  {
    label: "Sleep (last night)",
    value: "6",
    unit: "h 40m",
    detail: "7-day trend · −48m",
    icon: BedDouble,
    tone: "caution" as StatusTone,
    status: "Caution",
    data: [7.6, 7.5, 7.4, 7.2, 7.1, 6.8, 6.67],
  },
  {
    label: "Mood",
    value: "4",
    unit: "/5",
    detail: "7-day self-report trend",
    icon: Smile,
    tone: "normal" as StatusTone,
    status: "Normal",
    data: [4, 4, 5, 4, 4, 3, 4],
  },
];

export function HomeDashboard({ onNotify }: { onNotify: (message: string) => void }) {
  const [reminders, setReminders] = useState({
    hydration: true,
    exercise: true,
    glucose: false,
    evening: false,
  });
  const [logState, setLogState] = useState<"idle" | "saving" | "saved">("idle");

  const logNow = () => {
    if (logState !== "idle") return;
    setLogState("saving");
    window.setTimeout(() => setLogState("saved"), 450);
    window.setTimeout(() => {
      onNotify("New health reading saved locally");
      setLogState("idle");
    }, 1250);
  };

  const completedCount = Object.values(reminders).filter(Boolean).length;

  return (
    <main className="dashboard dashboard-ready home-dashboard">
      <section className="welcome-row page-entrance">
        <div>
          <p className="eyebrow">MONDAY · 06:42 MLT</p>
          <h1>Good morning, Amara.</h1>
          <p className="welcome-copy">Here is your health overview for mission day 142.</p>
        </div>
      </section>

      <section
        className="overall-status-banner reveal-card"
        style={{ "--reveal-delay": "60ms" } as CSSProperties}
      >
        <div className="status-banner-icon">
          <TriangleAlert size={24} />
        </div>
        <div>
          <span className="panel-kicker">OVERALL STATUS</span>
          <h2>All good. 2 items need attention</h2>
          <p>Sleep recovery and resting heart rate are outside your personal baseline.</p>
        </div>
        <button className="text-button" onClick={() => onNotify("Opening 2 attention items")}>
          Review <ChevronRight size={19} />
        </button>
      </section>

      <section className="home-content-grid">
        <div className="home-metrics">
          <div className="section-heading page-entrance">
            <div>
              <h2>Health overview</h2>
              <p>Seven-day trends · updated just now</p>
            </div>
            <button
              className="refresh-button"
              onClick={() => onNotify("Vitals synchronized just now")}
            >
              <RefreshCw size={18} />
              <span>Refresh</span>
            </button>
          </div>
          <div className="metric-grid home-metric-grid" aria-label="Latest health metrics">
            {homeMetrics.map((metric, index) => (
              <MetricTile key={metric.label} {...metric} delay={150 + index * 60} />
            ))}
          </div>
        </div>

        <aside className="home-rail">
          <button
            className="open-alerts-strip reveal-card"
            style={{ "--reveal-delay": "240ms" } as CSSProperties}
            onClick={() => onNotify("Opening 2 active alerts")}
          >
            <span className="alerts-icon">
              <TriangleAlert size={21} />
            </span>
            <span>
              <small>OPEN ALERTS</small>
              <strong>2 alerts</strong>
            </span>
            <ChevronRight size={20} />
          </button>

          <div
            className="panel reminders-panel home-reminders reveal-card"
            style={{ "--reveal-delay": "300ms" } as CSSProperties}
          >
            <div className="panel-heading compact">
              <div>
                <span className="panel-kicker">TODAY</span>
                <h2>Today's Reminders</h2>
              </div>
              <span className="count-badge">{completedCount} of 4</span>
            </div>
            <div className="reminder-list">
              <ReminderItem
                checked={reminders.hydration}
                title="Morning hydration"
                detail="Completed · 500 mL"
                delay={360}
                onToggle={() =>
                  setReminders((value) => ({ ...value, hydration: !value.hydration }))
                }
              />
              <ReminderItem
                checked={reminders.exercise}
                title="Resistance exercise"
                detail="Completed · 32 min"
                delay={420}
                onToggle={() => setReminders((value) => ({ ...value, exercise: !value.exercise }))}
              />
              <ReminderItem
                checked={reminders.glucose}
                title="Post-meal glucose"
                detail="Due at 14:30 MLT"
                delay={480}
                onToggle={() => setReminders((value) => ({ ...value, glucose: !value.glucose }))}
              />
              <ReminderItem
                checked={reminders.evening}
                title="Evening health log"
                detail="Due at 20:00 MLT"
                delay={540}
                onToggle={() => setReminders((value) => ({ ...value, evening: !value.evening }))}
              />
            </div>
          </div>

          <div className="home-rail-badges">
            <button
              className="streak-card reveal-card"
              style={{ "--reveal-delay": "540ms" } as CSSProperties}
              onClick={() => onNotify("12-day health logging streak")}
            >
              <Flame size={24} />
              <span>
                <strong>12 days</strong>
                <small>Daily streak</small>
              </span>
            </button>
            <button
              className="radiation-card reveal-card"
              style={{ "--reveal-delay": "600ms" } as CSSProperties}
              onClick={() => onNotify("Radiation exposure is within today's safe range")}
            >
              <Sun size={24} />
              <span>
                <small>Radiation Risk Today</small>
                <strong>
                  <Check size={15} /> Low
                </strong>
              </span>
            </button>
          </div>
        </aside>
      </section>

      <div className="clinical-note">
        <CircleAlert size={16} />
        Decision support only. Not a medical diagnosis.
      </div>

      <button className={`floating-log-button ${logState}`} onClick={logNow}>
        <span className="log-button-icon">
          {logState === "saved" ? <Check size={23} /> : <Plus size={23} />}
        </span>
        <span>
          {logState === "saving" ? "Saving..." : logState === "saved" ? "Saved" : "Log now"}
        </span>
        <i className="log-ripple" />
      </button>
    </main>
  );
}
