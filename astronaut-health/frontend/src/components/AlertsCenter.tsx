import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  BellRing,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Info,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

type AlertStatus = "open" | "acknowledged" | "resolved";
type Severity = "warning" | "caution" | "info";

type AlertItem = {
  id: number;
  severity: Severity;
  metric: string;
  value: string;
  unit: string;
  title: string;
  why: string;
  timestamp: string;
  status: AlertStatus;
  points: number[];
};

const initialAlerts: AlertItem[] = [
  {
    id: 1,
    severity: "warning",
    metric: "Resting heart rate",
    value: "72",
    unit: "bpm",
    title: "Heart rate trend is rising",
    why: "3-day average is 2 standard deviations above your baseline.",
    timestamp: "Today · 06:24 MLT",
    status: "open",
    points: [64, 65, 64, 66, 67, 69, 72],
  },
  {
    id: 2,
    severity: "caution",
    metric: "Sleep duration",
    value: "5h 48m",
    unit: "last night",
    title: "Sleep below 6 hours for 2 nights",
    why: "Two consecutive sleep periods are below your 7–9 hour recovery range.",
    timestamp: "Today · 05:22 MLT",
    status: "open",
    points: [7.5, 7.3, 7.1, 6.8, 6.4, 5.9, 5.8],
  },
  {
    id: 3,
    severity: "info",
    metric: "Hydration log",
    value: "1",
    unit: "entry due",
    title: "Morning hydration not yet logged",
    why: "No hydration entry has been recorded by 10:00 mission local time.",
    timestamp: "Today · 10:02 MLT",
    status: "open",
    points: [4, 5, 5, 4, 5, 4, 3],
  },
];

const severityConfig = {
  warning: { label: "Warning", icon: TriangleAlert },
  caution: { label: "Caution", icon: Info },
  info: { label: "Info", icon: CircleAlert },
};

export function AlertsCenter({
  onNotify,
  onNavigateToGuidance,
}: {
  onNotify: (message: string) => void;
  onNavigateToGuidance: (topic: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [tab, setTab] = useState<AlertStatus>("open");
  const [severity, setSeverity] = useState<Severity | "all">("all");
  const [severityOpen, setSeverityOpen] = useState(false);

  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(() => setLoading(false), reduced ? 250 : 1000);
    return () => clearTimeout(timer);
  }, []);

  const filtered = useMemo(
    () =>
      alerts.filter(
        (alert) => alert.status === tab && (severity === "all" || alert.severity === severity),
      ),
    [alerts, tab, severity],
  );
  const count = (status: AlertStatus) => alerts.filter((alert) => alert.status === status).length;
  const updateStatus = (id: number, status: AlertStatus) => {
    const alert = alerts.find((item) => item.id === id);
    setAlerts((items) => items.map((item) => (item.id === id ? { ...item, status } : item)));
    onNotify(`${alert?.metric ?? "Alert"} marked ${status}`);
  };

  if (loading) return <AlertsSkeleton />;

  return (
    <main className="dashboard alerts-screen">
      <section className="alerts-heading page-entrance">
        <div>
          <p className="eyebrow">DECISION SUPPORT</p>
          <h1>Alerts Center</h1>
          <p>Review changes that may need attention. Alerts are not medical diagnoses.</p>
        </div>
        <div className="open-alert-count">
          <BellRing size={21} />
          <span>
            <strong>{count("open")}</strong> open alerts
          </span>
        </div>
      </section>

      <section
        className="alert-command-banner reveal-card"
        style={{ "--reveal-delay": "40ms" } as CSSProperties}
      >
        <div className="command-pulse">
          <BellRing size={28} />
          <i />
          <i />
          <i />
        </div>
        <div className="command-copy">
          <span className="panel-kicker">ATTENTION QUEUE</span>
          <h2>Review the warning first, then work down by severity.</h2>
          <p>
            Three health signals are organized by urgency. None currently require emergency action.
          </p>
        </div>
        <div
          className="severity-distribution"
          aria-label="One warning, one caution, one information alert"
        >
          <span className="warning">
            <b>1</b>
            <small>Warning</small>
          </span>
          <span className="caution">
            <b>1</b>
            <small>Caution</small>
          </span>
          <span className="info">
            <b>1</b>
            <small>Info</small>
          </span>
        </div>
      </section>

      <section className="alerts-summary-grid">
        <SummaryCard
          label="Warning"
          value={
            alerts.filter((item) => item.status === "open" && item.severity === "warning").length
          }
          tone="warning"
          icon={<TriangleAlert size={20} />}
          delay={60}
        />
        <SummaryCard
          label="Caution"
          value={
            alerts.filter((item) => item.status === "open" && item.severity === "caution").length
          }
          tone="caution"
          icon={<Info size={20} />}
          delay={110}
        />
        <SummaryCard
          label="Information"
          value={alerts.filter((item) => item.status === "open" && item.severity === "info").length}
          tone="info"
          icon={<CircleAlert size={20} />}
          delay={160}
        />
        <SummaryCard
          label="Resolved today"
          value={count("resolved")}
          tone="resolved"
          icon={<ShieldCheck size={20} />}
          delay={210}
        />
      </section>

      <section
        className="alert-filter-deck reveal-card"
        style={{ "--reveal-delay": "220ms" } as CSSProperties}
      >
        <div className="alert-tabs" role="tablist">
          {(["open", "acknowledged", "resolved"] as AlertStatus[]).map((status) => (
            <button
              key={status}
              className={tab === status ? "active" : ""}
              onClick={() => setTab(status)}
            >
              <span>
                {status === "open"
                  ? "Open"
                  : status === "acknowledged"
                    ? "Acknowledged"
                    : "Resolved"}
              </span>
              <b>{count(status)}</b>
            </button>
          ))}
        </div>
        <div className="severity-filter">
          <button
            className="severity-filter-trigger"
            onClick={() => setSeverityOpen((value) => !value)}
          >
            <span>
              Severity:{" "}
              <strong>{severity === "all" ? "All" : severityConfig[severity].label}</strong>
            </span>
            <ChevronDown size={18} />
          </button>
          {severityOpen && (
            <div className="severity-menu">
              {(["all", "warning", "caution", "info"] as const).map((item) => (
                <button
                  key={item}
                  className={severity === item ? "active" : ""}
                  onClick={() => {
                    setSeverity(item);
                    setSeverityOpen(false);
                  }}
                >
                  {item === "all" ? (
                    <BellRing size={17} />
                  ) : (
                    (() => {
                      const Icon = severityConfig[item].icon;
                      return <Icon size={17} />;
                    })()
                  )}
                  {item === "all" ? "All severities" : severityConfig[item].label}
                  {severity === item && <Check size={16} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="alerts-section-heading page-entrance">
        <span className="alerts-section-number">01</span>
        <div>
          <span className="panel-kicker">{tab.toUpperCase()}</span>
          <h2>
            {tab === "open"
              ? "Items needing review"
              : tab === "acknowledged"
                ? "Items you have reviewed"
                : "Completed alert history"}
          </h2>
          <p>
            {filtered.length} {filtered.length === 1 ? "alert matches" : "alerts match"} the current
            filters.
          </p>
        </div>
      </div>

      <section className="alerts-list">
        {filtered.map((alert, index) => (
          <AlertRow
            key={`${alert.id}-${alert.status}`}
            alert={alert}
            delay={280 + index * 60}
            onAcknowledge={() => updateStatus(alert.id, "acknowledged")}
            onResolve={() => updateStatus(alert.id, "resolved")}
            onGuidance={() =>
              onNavigateToGuidance(
                alert.metric.toLowerCase().includes("sleep")
                  ? "Sleep"
                  : alert.metric.toLowerCase().includes("hydration")
                    ? "Hydration"
                    : "Heart",
              )
            }
          />
        ))}
        {filtered.length === 0 && (
          <AlertsEmpty status={tab} clearFilter={() => setSeverity("all")} />
        )}
      </section>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  tone,
  icon,
  delay,
}: {
  label: string;
  value: number;
  tone: string;
  icon: React.ReactNode;
  delay: number;
}) {
  return (
    <article
      className={`alert-summary-card ${tone} reveal-card`}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      <span>{icon}</span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
      </div>
    </article>
  );
}

function AlertRow({
  alert,
  delay,
  onAcknowledge,
  onResolve,
  onGuidance,
}: {
  alert: AlertItem;
  delay: number;
  onAcknowledge: () => void;
  onResolve: () => void;
  onGuidance: () => void;
}) {
  const Icon = severityConfig[alert.severity].icon;
  return (
    <article
      className={`alert-row-card ${alert.severity} reveal-card`}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      <div className="alert-severity-rail">
        <span>
          <Icon size={24} />
        </span>
        <strong>{severityConfig[alert.severity].label}</strong>
        <div className="rail-metric-value">
          <b>{alert.value}</b>
          <small>{alert.unit}</small>
        </div>
      </div>
      <div className="alert-main-copy">
        <div className="alert-card-heading">
          <div>
            <span className="panel-kicker">{alert.metric.toUpperCase()}</span>
            <h2>{alert.title}</h2>
          </div>
          <span className="alert-status-state">
            {alert.status === "open" ? "Needs review" : alert.status}
          </span>
        </div>
        <div className="alert-reason">
          <span className="why-badge">WHY</span>
          <span>
            <b>Why this triggered</b>
            {alert.why}
          </span>
        </div>
        <div className="alert-meta">
          <span>
            <Clock3 size={16} />
            {alert.timestamp}
          </span>
          <span className="baseline-reference">Compared with personal baseline</span>
        </div>
      </div>
      <AlertMiniChart values={alert.points} tone={alert.severity} />
      <div className="alert-actions">
        {alert.status === "open" && (
          <button className="acknowledge-action" onClick={onAcknowledge}>
            <CheckCircle2 size={18} />
            Acknowledge
          </button>
        )}
        <button className="guidance-action" onClick={onGuidance}>
          View guidance
        </button>
        {alert.status !== "resolved" && (
          <button className="resolve-action" onClick={onResolve}>
            <ShieldCheck size={18} />
            Resolve
          </button>
        )}
        {alert.status === "resolved" && (
          <span className="resolved-label">
            <Check size={17} />
            Resolved
          </span>
        )}
      </div>
    </article>
  );
}

function AlertMiniChart({ values, tone }: { values: number[]; tone: Severity }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const points = values
    .map((value, index) => `${(index / 6) * 150},${50 - ((value - min) / (max - min || 1)) * 38}`)
    .join(" ");
  return (
    <div className={`alert-mini-chart ${tone}`}>
      <span>7-DAY SIGNAL</span>
      <svg viewBox="0 0 150 58" preserveAspectRatio="none">
        <line x1="0" x2="150" y1="50" y2="50" />
        <polyline pathLength="1" points={points} />
        <circle cx="150" cy={points.split(" ").at(-1)?.split(",")[1]} r="4" />
      </svg>
    </div>
  );
}

function AlertsEmpty({ status, clearFilter }: { status: AlertStatus; clearFilter: () => void }) {
  return (
    <div className="alerts-empty">
      <span>
        <ShieldCheck size={32} />
      </span>
      <h2>No {status} alerts match</h2>
      <p>There is nothing to review with the current severity filter.</p>
      <button onClick={clearFilter}>Show all severities</button>
    </div>
  );
}

function AlertsSkeleton() {
  return (
    <main className="dashboard alerts-screen alerts-skeleton">
      <section className="alerts-heading">
        <div>
          <div className="skeleton-block alerts-sk-eyebrow" />
          <div className="skeleton-block alerts-sk-title" />
          <div className="skeleton-block alerts-sk-copy" />
        </div>
      </section>
      <section className="alerts-summary-grid">
        {[0, 1, 2, 3].map((item) => (
          <div className="skeleton-block alerts-sk-summary" key={item} />
        ))}
      </section>
      <div className="skeleton-block alerts-sk-filters" />
      <section className="alerts-list">
        {[0, 1, 2].map((item) => (
          <div className="skeleton-block alerts-sk-card" key={item} />
        ))}
      </section>
    </main>
  );
}
