import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type RefObject,
  type ReactNode,
} from "react";
import {
  Check,
  ChevronDown,
  Info,
  Minus,
  Moon,
  OctagonAlert,
  Plus,
  Sun,
  TriangleAlert,
  X,
} from "lucide-react";

export type StatusTone = "normal" | "caution" | "warning" | "critical";
export type ThemeMode = "dark" | "light";
export type ThemePreference = ThemeMode | "auto";

export function useManagedTimeout() {
  const timeoutIds = useRef<number[]>([]);
  useEffect(
    () => () => {
      timeoutIds.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    },
    [],
  );

  return useCallback((callback: () => void, delay: number) => {
    let timeoutId = 0;
    timeoutId = window.setTimeout(() => {
      timeoutIds.current = timeoutIds.current.filter((id) => id !== timeoutId);
      callback();
    }, delay);
    timeoutIds.current.push(timeoutId);
  }, []);
}

export function useModalFocus(
  dialogRef: RefObject<HTMLElement | null>,
  active: boolean,
  onEscape?: () => void,
) {
  const onEscapeRef = useRef(onEscape);

  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!active || !dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const getFocusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
    getFocusable()[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && onEscapeRef.current) {
        onEscapeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [active, dialogRef]);
}

const statusIcons = {
  normal: Check,
  caution: Info,
  warning: TriangleAlert,
  critical: OctagonAlert,
};

export function StatusChip({ tone, label }: { tone: StatusTone; label: string }) {
  const Icon = statusIcons[tone];
  return (
    <span className={`status-chip ${tone}`}>
      <Icon size={14} aria-hidden="true" />
      {label}
    </span>
  );
}

export function ThemeToggle({ theme, onToggle }: { theme: ThemeMode; onToggle: () => void }) {
  return (
    <button
      className={`theme-toggle ${theme}`}
      onClick={onToggle}
      aria-label="Switch theme"
      data-tooltip="Switch theme"
    >
      <span className="theme-icon sun-icon">
        <Sun size={21} />
      </span>
      <span className="theme-icon moon-icon">
        <Moon size={20} />
      </span>
    </button>
  );
}

function useCountUp(target: number, duration = 700, decimals = 0) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setValue(target);
      return;
    }
    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - started) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Number((target * eased).toFixed(decimals)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, decimals]);

  return value.toFixed(decimals);
}

function AnimatedValue({ value }: { value: string }) {
  const isBloodPressure = value.includes("/");
  const decimals = value.includes(".") ? 1 : 0;
  const primaryTarget = Number.parseFloat(value);
  const secondaryTarget = isBloodPressure ? Number(value.split("/")[1]) : 0;
  const primary = useCountUp(primaryTarget, 700, decimals);
  const secondary = useCountUp(secondaryTarget, 700, 0);
  return (
    <>
      {primary}
      {isBloodPressure && <span className="bp-secondary">/{secondary}</span>}
    </>
  );
}

function Sparkline({
  data,
  tone,
  live = false,
}: {
  data: number[];
  tone: StatusTone;
  live?: boolean;
}) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map(
      (value, index) => `${(index / (data.length - 1)) * 100},${30 - ((value - min) / range) * 24}`,
    )
    .join(" ");
  return (
    <div className={`sparkline-wrap ${live ? "is-live" : ""}`}>
      <svg
        className={`sparkline ${tone}`}
        viewBox="0 0 100 34"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <line x1="0" x2="100" y1="29" y2="29" />
        <polyline pathLength="1" points={points} />
        <circle cx="100" cy={Number(points.split(" ").at(-1)?.split(",")[1]) || 0} r="2.6" />
      </svg>
      {live && <span className="live-sweep" />}
    </div>
  );
}

export function MetricTile({
  label,
  value,
  unit,
  detail,
  icon: Icon,
  tone,
  status,
  data,
  live = false,
  delay = 0,
  onClick,
}: {
  label: string;
  value: string;
  unit: string;
  detail: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  tone: StatusTone;
  status: string;
  data: number[];
  live?: boolean;
  delay?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`metric-tile reveal-card ${tone} ${live ? "live-tile" : ""}`}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
      onClick={onClick}
    >
      <div className="metric-top">
        <span className={`metric-icon ${live ? "heart-beat" : ""}`}>
          <Icon size={19} />
        </span>
        <StatusChip tone={tone} label={status} />
      </div>
      <p className="metric-label">{label}</p>
      <div className={`metric-value ${value.includes("/") ? "metric-bp" : ""}`}>
        <AnimatedValue value={value} />
        <span className="metric-unit">{unit}</span>
      </div>
      <Sparkline data={data} tone={tone} live={live} />
      <p className="metric-detail">{detail}</p>
    </button>
  );
}

export function Gauge({ value, label }: { value: number; label: string }) {
  const displayValue = useCountUp(value, 850);
  const circumference = 2 * Math.PI * 31;
  const offset = circumference * (1 - value / 100);
  return (
    <div className="gauge-wrap">
      <div className="gauge">
        <svg viewBox="0 0 72 72" aria-hidden="true">
          <circle className="gauge-track" cx="36" cy="36" r="31" />
          <circle
            className="gauge-progress"
            cx="36"
            cy="36"
            r="31"
            pathLength="1"
            style={
              {
                "--gauge-offset": offset,
                strokeDasharray: circumference,
                strokeDashoffset: offset,
              } as CSSProperties
            }
          />
        </svg>
        <div>
          <strong>{displayValue}</strong>
          <span>/100</span>
        </div>
      </div>
      <span>{label}</span>
    </div>
  );
}

export function BootLoader({ complete }: { complete: boolean }) {
  return (
    <div className={`boot-loader ${complete ? "complete" : ""}`} role="status">
      <div className="boot-orbit">
        <div className="boot-logo">
          <svg viewBox="0 0 96 48" aria-hidden="true">
            <path pathLength="1" d="M2 25h18l6-13 10 27 10-21 8 13 7-6h33" fill="none" />
          </svg>
        </div>
      </div>
      <div className="boot-wordmark">VITALIS</div>
      <p>
        {complete
          ? "Offline-ready. Records secured."
          : "Loading health records from local storage..."}
      </p>
      <div className="boot-progress">
        <span />
      </div>
      <div className="offline-ready">
        <Check size={18} />
        Local health record available
      </div>
    </div>
  );
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`skeleton-block ${className}`} />;
}

export function DashboardSkeleton() {
  return (
    <div
      className="dashboard skeleton-dashboard home-skeleton-dashboard"
      aria-label="Loading dashboard"
    >
      <section className="skeleton-welcome">
        <div>
          <SkeletonBlock className="sk-eyebrow" />
          <SkeletonBlock className="sk-heading" />
          <SkeletonBlock className="sk-copy" />
        </div>
      </section>
      <SkeletonBlock className="sk-readiness" />
      <section className="home-content-grid">
        <div className="home-metrics">
          <div className="sk-section-title">
            <SkeletonBlock />
            <SkeletonBlock />
          </div>
          <div className="metric-grid home-metric-grid">
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <article className="metric-skeleton" key={item}>
                <div className="sk-row">
                  <SkeletonBlock className="sk-icon" />
                  <SkeletonBlock className="sk-chip" />
                </div>
                <SkeletonBlock className="sk-label" />
                <SkeletonBlock className="sk-number" />
                <SkeletonBlock className="sk-line" />
              </article>
            ))}
          </div>
        </div>
        <div className="home-rail">
          <SkeletonBlock className="sk-alert-strip" />
          <article className="panel sk-reminders-card">
            <SkeletonBlock className="sk-label" />
            {[0, 1, 2, 3].map((item) => (
              <SkeletonBlock className="sk-reminder-row" key={item} />
            ))}
          </article>
          <div className="home-rail-badges">
            <SkeletonBlock className="sk-utility-badge" />
            <SkeletonBlock className="sk-utility-badge" />
          </div>
        </div>
      </section>
    </div>
  );
}

export function AlertCard({
  tone,
  title,
  description,
  action,
  onAction,
}: {
  tone: "warning" | "critical";
  title: string;
  description: string;
  action: string;
  onAction: () => void;
}) {
  const Icon = tone === "critical" ? OctagonAlert : TriangleAlert;
  return (
    <article
      className={`alert-card ${tone} reveal-card`}
      style={{ "--reveal-delay": "420ms" } as CSSProperties}
    >
      <div className="alert-icon">
        <Icon size={21} />
      </div>
      <div>
        <div className="alert-label">{tone === "critical" ? "CRITICAL" : "ATTENTION"}</div>
        <h3>{title}</h3>
        <p>{description}</p>
        <button onClick={onAction}>
          {action} <span>→</span>
        </button>
      </div>
    </article>
  );
}

export function ReminderItem({
  checked,
  title,
  detail,
  onToggle,
  delay = 0,
}: {
  checked: boolean;
  title: string;
  detail: string;
  onToggle: () => void;
  delay?: number;
}) {
  return (
    <button
      className={`reminder-item list-reveal ${checked ? "checked" : ""}`}
      onClick={onToggle}
      style={{ "--list-delay": `${delay}ms` } as CSSProperties}
    >
      <span className="check-box">{checked && <Check className="check-draw" size={18} />}</span>
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
    </button>
  );
}

export function LargeNumberStepper({
  value,
  unit,
  onChange,
}: {
  value: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="number-stepper">
      <button onClick={() => onChange(value - 1)} aria-label="Decrease">
        <Minus />
      </button>
      <strong key={value} className="rolling-number">
        {value}
        <small>{unit}</small>
      </strong>
      <button onClick={() => onChange(value + 1)} aria-label="Increase">
        <Plus />
      </button>
    </div>
  );
}

export function MoodScale({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const moods = ["Very low", "Low", "Okay", "Good", "Great"];
  const faces = ["😞", "🙁", "😐", "🙂", "😊"];
  return (
    <div className="mood-scale">
      {moods.map((mood, index) => (
        <button
          aria-label={mood}
          className={value === index + 1 ? "active" : ""}
          onClick={() => onChange(index + 1)}
          key={mood}
        >
          <span>{faces[index]}</span>
          <small>{index + 1}</small>
        </button>
      ))}
    </div>
  );
}

export function VitalSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="vital-slider">
      <span>
        {label}
        <strong>{value}</strong>
      </span>
      <span className="slider-wrap">
        <output style={{ left: `${value * 10}%` }}>{value}</output>
        <input
          type="range"
          min="0"
          max="10"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </span>
    </label>
  );
}

export function BodyMapRegion({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`body-region ${active ? "active" : ""}`} onClick={onClick}>
      <span className="body-region-dot" />
      {label}
    </button>
  );
}

export function Badge({
  children,
  tone = "blue",
}: {
  children: ReactNode;
  tone?: "blue" | "violet";
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function GuidanceAccordion({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  return (
    <div className={`guidance-accordion ${open ? "open" : ""}`}>
      <button onClick={() => setOpen(!open)}>
        {title}
        <ChevronDown />
      </button>
      <div
        ref={contentRef}
        className="accordion-content"
        style={{ maxHeight: open ? contentRef.current?.scrollHeight : 0 }}
      >
        <div>{children}</div>
      </div>
    </div>
  );
}

export function BottomSheet({
  title,
  children,
  open,
  onClose,
}: {
  title: string;
  children: ReactNode;
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <header>
          <h2>{title}</h2>
          <button onClick={onClose}>
            <X />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="toast" role="status">
      <Check size={18} />
      <span>{message}</span>
      <button onClick={onClose} aria-label="Dismiss">
        <X size={18} />
      </button>
    </div>
  );
}

export function FullScreenCriticalAlert({
  title,
  children,
  onAcknowledge,
}: {
  title: string;
  children: ReactNode;
  onAcknowledge: () => void;
}) {
  return (
    <div className="critical-screen">
      <OctagonAlert size={48} />
      <span>CRITICAL ALERT</span>
      <h1>{title}</h1>
      <p>{children}</p>
      <button onClick={onAcknowledge}>Acknowledge alert</button>
      <small>Decision support only. Not a medical diagnosis.</small>
    </div>
  );
}

export function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel chart-card">
      <h2>{title}</h2>
      <div className="chart-baseline">BASELINE RANGE</div>
      {children}
    </section>
  );
}
