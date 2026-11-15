import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  HeartPulse,
  MessageSquareText,
  Moon,
  Radio,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useManagedTimeout } from "../../components/VitalisUI";

type CrewStatus = "stable" | "watch" | "review";
type CrewMember = {
  id: string;
  name: string;
  initials: string;
  role: string;
  status: CrewStatus;
  statusLabel: string;
  lastReading: string;
  heartRate: number[];
  sleep: number[];
  oxygen: number[];
  baselineHeart: [number, number];
  baselineSleep: [number, number];
};
type SurgeonAlert = {
  id: number;
  severity: "warning" | "caution";
  title: string;
  detail: string;
  time: string;
};

const crew: CrewMember[] = [
  {
    id: "amara",
    name: "Amara Khan",
    initials: "AK",
    role: "Commander",
    status: "watch",
    statusLabel: "Review trends",
    lastReading: "06:42 MLT",
    heartRate: [64, 65, 64, 66, 68, 70, 72],
    sleep: [7.6, 7.4, 7.2, 7.1, 6.9, 6.5, 6.67],
    oxygen: [98, 98, 99, 98, 97, 98, 98],
    baselineHeart: [62, 68],
    baselineSleep: [7, 9],
  },
  {
    id: "jonah",
    name: "Jonah Mercer",
    initials: "JM",
    role: "Flight Engineer",
    status: "stable",
    statusLabel: "Within baseline",
    lastReading: "06:28 MLT",
    heartRate: [60, 61, 62, 61, 63, 62, 62],
    sleep: [7.8, 8.1, 7.6, 7.9, 8.2, 7.7, 7.9],
    oxygen: [98, 99, 98, 98, 99, 98, 99],
    baselineHeart: [58, 67],
    baselineSleep: [7, 9],
  },
  {
    id: "sofia",
    name: "Sofia Liang",
    initials: "SL",
    role: "Medical Officer",
    status: "review",
    statusLabel: "Check-in due",
    lastReading: "Yesterday · 21:14",
    heartRate: [68, 69, 68, 70, 69, 70, 69],
    sleep: [7.3, 7.1, 6.9, 7.4, 7.2, 7.1, 7.3],
    oxygen: [97, 98, 98, 97, 98, 98, 97],
    baselineHeart: [62, 72],
    baselineSleep: [7, 9],
  },
  {
    id: "tariq",
    name: "Tariq Okafor",
    initials: "TO",
    role: "Mission Specialist",
    status: "stable",
    statusLabel: "Within baseline",
    lastReading: "06:17 MLT",
    heartRate: [66, 64, 65, 64, 66, 65, 65],
    sleep: [7.2, 7.5, 7.3, 7.1, 7.6, 7.4, 7.5],
    oxygen: [98, 98, 97, 98, 99, 98, 98],
    baselineHeart: [60, 70],
    baselineSleep: [7, 9],
  },
];

const alertsByCrew: Record<string, SurgeonAlert[]> = {
  amara: [
    {
      id: 1,
      severity: "warning",
      title: "Resting heart rate rising",
      detail: "3-day average is above Amara's personal baseline.",
      time: "Today · 06:24 MLT",
    },
    {
      id: 2,
      severity: "caution",
      title: "Sleep below recovery range",
      detail: "Two nights below her 7-hour recovery target.",
      time: "Today · 05:22 MLT",
    },
  ],
  jonah: [
    {
      id: 3,
      severity: "caution",
      title: "Hydration log incomplete",
      detail: "No hydration entry recorded this morning.",
      time: "Today · 09:30 MLT",
    },
  ],
  sofia: [
    {
      id: 4,
      severity: "caution",
      title: "Wellbeing check-in due",
      detail: "A private check-in has not been recorded today.",
      time: "Today · 08:00 MLT",
    },
  ],
  tariq: [],
};

const statusLabels: Record<CrewStatus, string> = {
  stable: "Stable",
  watch: "Watch",
  review: "Review",
};

export function FlightSurgeonPage({
  onNotify,
  onNavigate,
}: {
  onNotify: (message: string) => void;
  onNavigate: (screen: string) => void;
}) {
  const scheduleTimeout = useManagedTimeout();
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(crew[0].id);
  const [reviewedAlerts, setReviewedAlerts] = useState<number[]>([]);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setLoading(false), reduced ? 250 : 850);
    return () => window.clearTimeout(timer);
  }, []);

  const selectedCrew = crew.find((member) => member.id === selectedId) ?? crew[0];
  const alerts = useMemo(
    () =>
      (alertsByCrew[selectedCrew.id] ?? []).filter((alert) => !reviewedAlerts.includes(alert.id)),
    [reviewedAlerts, selectedCrew.id],
  );
  const openAlertCount = Object.values(alertsByCrew).flat().length - reviewedAlerts.length;

  const reviewAlert = (alertId: number) => {
    setReviewedAlerts((ids) => (ids.includes(alertId) ? ids : [...ids, alertId]));
  };

  const sendRecommendation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const recommendation = note.trim();
    if (!recommendation) return;
    setSent(true);
    setNote("");
    onNotify(`Recommendation queued for ${selectedCrew.name}`);
    scheduleTimeout(() => setSent(false), 3500);
  };

  if (loading) return <FlightSurgeonSkeleton />;

  return (
    <main className="dashboard flight-surgeon-screen">
      <section className="surgeon-page-heading page-entrance">
        <div>
          <p className="eyebrow">HABITAT MEDICAL · ARES VII</p>
          <h1>Flight Surgeon Dashboard</h1>
          <p>Review crew health signals and share guidance for the next communication window.</p>
        </div>
        <div className="surgeon-role-chip">
          <ShieldCheck size={16} /> Flight surgeon view
        </div>
      </section>

      <section
        className="communication-delay-banner reveal-card"
        style={{ "--reveal-delay": "40ms" } as CSSProperties}
      >
        <span className="delay-banner-icon">
          <Radio size={19} />
        </span>
        <div className="delay-banner-copy">
          <strong>
            Last synced 38 min ago <span>(communication delay)</span>
          </strong>
          <p>Crew data is available from the latest completed uplink window.</p>
        </div>
        <span className="delay-banner-state">
          <i /> UPLINK DELAYED
        </span>
      </section>

      <section className="surgeon-dashboard-grid">
        <aside
          className="surgeon-crew-panel panel reveal-card"
          style={{ "--reveal-delay": "90ms" } as CSSProperties}
        >
          <header className="surgeon-panel-heading">
            <div>
              <span className="panel-kicker">MISSION ARES VII</span>
              <h2>Crew overview</h2>
            </div>
            <span className="surgeon-crew-count">{crew.length}</span>
          </header>
          <div className="surgeon-crew-list" role="listbox" aria-label="Select crew member">
            {crew.map((member, index) => (
              <button
                className={`surgeon-crew-row ${selectedId === member.id ? "selected" : ""}`}
                style={{ "--reveal-delay": `${150 + index * 55}ms` } as CSSProperties}
                key={member.id}
                role="option"
                aria-selected={selectedId === member.id}
                onClick={() => {
                  setSelectedId(member.id);
                  setSent(false);
                }}
              >
                <span className={`surgeon-crew-avatar ${member.status}`}>{member.initials}</span>
                <span className="surgeon-crew-copy">
                  <strong>{member.name}</strong>
                  <small>{member.role}</small>
                  <span className={`crew-status-label ${member.status}`}>
                    <i /> {statusLabels[member.status]}
                  </span>
                </span>
                <ChevronRight className="crew-row-chevron" size={16} />
              </button>
            ))}
          </div>
          <div className="crew-panel-footer">
            <span>
              <i className="crew-status-dot stable" /> Stable
            </span>
            <span>
              <i className="crew-status-dot watch" /> Watch
            </span>
            <span>
              <i className="crew-status-dot review" /> Review
            </span>
          </div>
        </aside>

        <section className="surgeon-trends-column">
          <article
            className="selected-astronaut-card panel reveal-card"
            style={{ "--reveal-delay": "130ms" } as CSSProperties}
          >
            <span className={`selected-astronaut-avatar ${selectedCrew.status}`}>
              {selectedCrew.initials}
            </span>
            <div className="selected-astronaut-copy">
              <span className="panel-kicker">SELECTED CREW MEMBER</span>
              <h2>{selectedCrew.name}</h2>
              <p>
                {selectedCrew.role} <span>·</span> Last reading {selectedCrew.lastReading}
              </p>
            </div>
            <span className={`surgeon-overall-status ${selectedCrew.status}`}>
              <i /> {selectedCrew.statusLabel}
            </span>
          </article>

          <div className="surgeon-vital-summary">
            <VitalSummary
              label="Resting heart rate"
              value={`${selectedCrew.heartRate.at(-1)} bpm`}
              detail={`Baseline ${selectedCrew.baselineHeart[0]}–${selectedCrew.baselineHeart[1]} bpm`}
              icon={<HeartPulse size={17} />}
              tone={selectedCrew.status === "watch" ? "caution" : "normal"}
              delay={180}
            />
            <VitalSummary
              label="Sleep · last night"
              value={`${selectedCrew.sleep.at(-1)} h`}
              detail="Recovery target · 7–9 h"
              icon={<Moon size={17} />}
              tone={selectedCrew.sleep.at(-1)! < 7 ? "caution" : "normal"}
              delay={225}
            />
            <VitalSummary
              label="Blood oxygen"
              value={`${selectedCrew.oxygen.at(-1)}%`}
              detail="Personal range · 95–100%"
              icon={<Activity size={17} />}
              tone="normal"
              delay={270}
            />
          </div>

          <TrendChart
            title="Resting heart rate"
            subtitle="7-day trend · bpm"
            values={selectedCrew.heartRate}
            baseline={selectedCrew.baselineHeart}
            unit="bpm"
            tone={selectedCrew.status === "watch" ? "caution" : "normal"}
            delay={300}
          />
          <TrendChart
            title="Sleep duration"
            subtitle="7-day trend · hours"
            values={selectedCrew.sleep}
            baseline={selectedCrew.baselineSleep}
            unit="h"
            tone={selectedCrew.sleep.at(-1)! < 7 ? "caution" : "normal"}
            delay={370}
          />
        </section>

        <aside className="surgeon-right-column">
          <section
            className="surgeon-alerts-panel panel reveal-card"
            style={{ "--reveal-delay": "160ms" } as CSSProperties}
          >
            <header className="surgeon-panel-heading">
              <div>
                <span className="panel-kicker">REVIEW QUEUE</span>
                <h2>Alerts to review</h2>
              </div>
              <span className="surgeon-alert-count">{openAlertCount}</span>
            </header>
            <div className="surgeon-alert-list">
              {alerts.map((alert, index) => (
                <SurgeonAlertCard
                  key={alert.id}
                  alert={alert}
                  delay={260 + index * 65}
                  onReview={() => reviewAlert(alert.id)}
                />
              ))}
              {alerts.length === 0 && (
                <div className="surgeon-alert-empty">
                  <CheckCircle2 size={25} />
                  <strong>All caught up</strong>
                  <span>No open items for {selectedCrew.name.split(" ")[0]}.</span>
                </div>
              )}
            </div>
            <button
              className="surgeon-queue-link"
              onClick={() => onNavigate("Alerts")}
            >
              View mission queue <ArrowUpRight size={15} />
            </button>
          </section>

          <section
            className="surgeon-note-panel panel reveal-card"
            style={{ "--reveal-delay": "220ms" } as CSSProperties}
          >
            <header className="surgeon-panel-heading">
              <div>
                <span className="panel-kicker">CREW COMMUNICATION</span>
                <h2>Send a recommendation</h2>
              </div>
              <span className="surgeon-note-icon">
                <MessageSquareText size={17} />
              </span>
            </header>
            <p className="surgeon-note-recipient">
              <UserRound size={14} /> To {selectedCrew.name} · next uplink
            </p>
            <form onSubmit={sendRecommendation}>
              <label className="surgeon-note-label" htmlFor="surgeon-recommendation">
                Recommendation
              </label>
              <textarea
                id="surgeon-recommendation"
                value={note}
                onChange={(event) => {
                  setNote(event.target.value);
                  setSent(false);
                }}
                maxLength={500}
                placeholder="Write supportive, actionable guidance for the crew member..."
                rows={4}
              />
              <div className="surgeon-note-footer">
                <span>{note.length}/500 · Queued until communication is available</span>
                <button className="surgeon-send-button" type="submit" disabled={!note.trim()}>
                  <Send size={15} /> Send
                </button>
              </div>
            </form>
            {sent && (
              <p className="surgeon-note-success" role="status">
                <CheckCircle2 size={15} /> Recommendation queued for the next uplink.
              </p>
            )}
          </section>

          <div className="surgeon-privacy-footnote">
            <ShieldCheck size={14} /> Clinical decision support · Not a diagnosis
          </div>
        </aside>
      </section>
    </main>
  );
}

function VitalSummary({
  label,
  value,
  detail,
  icon,
  tone,
  delay,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  tone: "normal" | "caution";
  delay: number;
}) {
  return (
    <article
      className={`surgeon-vital-card panel ${tone} reveal-card`}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      <span className="surgeon-vital-icon">{icon}</span>
      <span className="surgeon-vital-label">{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function TrendChart({
  title,
  subtitle,
  values,
  baseline,
  unit,
  tone,
  delay,
}: {
  title: string;
  subtitle: string;
  values: number[];
  baseline: [number, number];
  unit: string;
  tone: "normal" | "caution";
  delay: number;
}) {
  const allValues = [...values, ...baseline];
  const min = Math.min(...allValues) - 1;
  const max = Math.max(...allValues) + 1;
  const x = (index: number) => 16 + (index / (values.length - 1)) * 328;
  const y = (value: number) => 97 - ((value - min) / (max - min)) * 74;
  const points = values.map((value, index) => `${x(index)},${y(value)}`);
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"}${point}`).join(" ");
  const area = `${line} L344,104 L16,104 Z`;
  const baseTop = y(baseline[1]);
  const baseBottom = y(baseline[0]);
  const [selectedIndex, setSelectedIndex] = useState(values.length - 1);

  useEffect(() => setSelectedIndex(values.length - 1), [values]);

  return (
    <article
      className={`surgeon-trend-card panel ${tone} reveal-card`}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      <header className="surgeon-trend-header">
        <div>
          <h3>{title}</h3>
          <span>{subtitle}</span>
        </div>
        <div className="surgeon-chart-legend">
          <i /> Crew trend <i className="baseline-key" /> Personal range
        </div>
      </header>
      <div className="surgeon-chart-plot">
        <div className="surgeon-chart-scale">
          <span>{max.toFixed(0)}</span>
          <span>{((max + min) / 2).toFixed(0)}</span>
          <span>{min.toFixed(0)}</span>
        </div>
        <svg viewBox="0 0 360 112" role="group" aria-label={`${title} over the past seven days`}>
          <rect
            className="surgeon-baseline-band"
            x="16"
            y={baseTop}
            width="328"
            height={Math.max(4, baseBottom - baseTop)}
            rx="4"
          />
          {[30, 65, 100].map((gridY) => (
            <line
              className="surgeon-chart-gridline"
              key={gridY}
              x1="16"
              x2="344"
              y1={gridY}
              y2={gridY}
            />
          ))}
          <path className="surgeon-chart-area" d={area} />
          <path className={`surgeon-chart-line ${tone}`} d={line} pathLength="1" />
          {values.map((value, index) => (
            <circle
              className={`surgeon-chart-point ${selectedIndex === index ? "selected" : ""} ${value < baseline[0] || value > baseline[1] ? "outside" : ""}`}
              key={`${value}-${index}`}
              cx={x(index)}
              cy={y(value)}
              r={selectedIndex === index ? 5 : 3.5}
              role="button"
              tabIndex={0}
              aria-label={`Day ${index + 1}: ${value} ${unit}`}
              onClick={() => setSelectedIndex(index)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") setSelectedIndex(index);
              }}
            />
          ))}
          <line
            className="surgeon-chart-selected"
            x1={x(selectedIndex)}
            x2={x(selectedIndex)}
            y1="22"
            y2="104"
          />
        </svg>
      </div>
      <div className="surgeon-chart-xlabels">
        <span>6 days ago</span>
        <strong>
          Day {selectedIndex + 1} · {values[selectedIndex]} {unit}
        </strong>
        <span>Today</span>
      </div>
    </article>
  );
}

function SurgeonAlertCard({
  alert,
  delay,
  onReview,
}: {
  alert: SurgeonAlert;
  delay: number;
  onReview: () => void;
}) {
  return (
    <article
      className={`surgeon-alert-card ${alert.severity} reveal-card`}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      <span className="surgeon-alert-icon">
        {alert.severity === "warning" ? <AlertCircle size={17} /> : <Clock3 size={17} />}
      </span>
      <div className="surgeon-alert-copy">
        <div className="surgeon-alert-topline">
          <span>{alert.severity === "warning" ? "WARNING" : "CAUTION"}</span>
          <time>{alert.time}</time>
        </div>
        <h3>{alert.title}</h3>
        <p>{alert.detail}</p>
        <button onClick={onReview}>
          <Check size={14} /> Mark reviewed
        </button>
      </div>
    </article>
  );
}

function FlightSurgeonSkeleton() {
  return (
    <main
      className="dashboard flight-surgeon-screen surgeon-skeleton"
      aria-label="Loading crew health overview"
    >
      <section className="surgeon-page-heading">
        <div>
          <div className="skeleton-block surgeon-sk-eyebrow" />
          <div className="skeleton-block surgeon-sk-title" />
          <div className="skeleton-block surgeon-sk-copy" />
        </div>
      </section>
      <div className="skeleton-block surgeon-sk-sync" />
      <div className="surgeon-dashboard-grid">
        <div className="skeleton-block surgeon-sk-crew" />
        <div className="skeleton-block surgeon-sk-trends" />
        <div className="skeleton-block surgeon-sk-alerts" />
      </div>
    </main>
  );
}
