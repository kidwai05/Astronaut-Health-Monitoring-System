import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  Activity,
  Camera,
  Check,
  ChevronRight,
  CircleAlert,
  HeartPulse,
  Mic,
  Minus,
  Plus,
  Radio,
  ScanLine,
  Smartphone,
  Thermometer,
  TrendingUp,
  Waves,
} from "lucide-react";
import { BottomSheet, StatusChip, useManagedTimeout } from "./VitalisUI";

type Source = "manual" | "wearable" | "camera";

const traces = {
  heart: "0,22 12,21 20,22 27,8 34,29 42,17 50,21 62,20 74,17 86,15 100,12",
  pressure: "0,21 14,19 28,20 42,16 56,18 70,14 84,16 100,13",
  glucose: "0,18 14,20 28,15 42,17 56,13 70,16 84,14 100,15",
  temperature: "0,20 16,18 32,19 48,16 64,17 80,15 100,16",
  oxygen: "0,14 16,13 32,14 48,12 64,13 80,12 100,13",
};

export function QuickLog({
  onNotify,
  onNavigateHome,
  onNavigateToGuidance,
}: {
  onNotify: (message: string) => void;
  onNavigateHome: () => void;
  onNavigateToGuidance: (topic: string) => void;
}) {
  const scheduleTimeout = useManagedTimeout();
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [source, setSource] = useState<Source>("manual");
  const [heartRate, setHeartRate] = useState(88);
  const [systolic, setSystolic] = useState(118);
  const [diastolic, setDiastolic] = useState(76);
  const [glucose, setGlucose] = useState(92);
  const [temperature, setTemperature] = useState(36.7);
  const [spo2, setSpo2] = useState<number | null>(98);
  const [listening, setListening] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scheduleTimeout(() => setLoading(false), reduced ? 250 : 1050);
  }, [scheduleTimeout]);

  const startVoiceEntry = () => {
    if (listening) {
      setListening(false);
      return;
    }
    setListening(true);
    scheduleTimeout(() => {
      setListening(false);
      setHeartRate(88);
      setActiveStep(0);
      onNotify("Voice entry captured: heart rate 88");
    }, 1500);
  };

  const saveReading = () => {
    if (saveState !== "idle") return;
    setSaveState("saving");
    scheduleTimeout(() => setSaveState("saved"), 500);
    scheduleTimeout(() => {
      setShowResult(true);
      onNotify("Reading saved to local health record");
    }, 950);
    scheduleTimeout(() => setSaveState("idle"), 1800);
  };

  if (loading) return <QuickLogSkeleton />;

  return (
    <main className="dashboard quick-log-screen">
      <section className="quick-log-heading page-entrance">
        <div>
          <p className="eyebrow">NEW HEALTH READING</p>
          <h1>Quick Log</h1>
          <p>Enter current readings. Optional fields can be skipped.</p>
        </div>
        <div className="quick-log-progress" aria-label="Five vital fields">
          <strong>5</strong>
          <span>vital fields</span>
        </div>
      </section>

      <section
        className="entry-tools reveal-card"
        style={{ "--reveal-delay": "60ms" } as CSSProperties}
      >
        <div className="source-control">
          <span className="tool-label">READING SOURCE</span>
          <div className="source-segments">
            <SourceButton
              active={source === "manual"}
              icon={<Activity size={18} />}
              label="Manual"
              onClick={() => setSource("manual")}
            />
            <SourceButton
              active={source === "wearable"}
              icon={<Smartphone size={18} />}
              label="Wearable import"
              onClick={() => {
                setSource("wearable");
                onNotify("Wearable is ready to import");
              }}
            />
            <SourceButton
              active={source === "camera"}
              icon={<Camera size={18} />}
              label="Camera scan"
              onClick={() => {
                setSource("camera");
                onNotify("Camera scanner opened");
              }}
            />
          </div>
        </div>
        <button className={`voice-entry ${listening ? "listening" : ""}`} onClick={startVoiceEntry}>
          <span className="voice-icon">{listening ? <Waves size={22} /> : <Mic size={22} />}</span>
          <span>
            <strong>{listening ? "Listening…" : "Voice entry"}</strong>
            <small>{listening ? "Say a vital and value" : "Tap and speak readings"}</small>
          </span>
          {listening && <i className="voice-ring" />}
        </button>
      </section>

      <section className="quick-log-grid">
        <VitalEntryCard
          step={1}
          active={activeStep === 0}
          title="Heart Rate"
          icon={<HeartPulse size={21} />}
          value={heartRate}
          unit="bpm"
          lastValue="Last value: 72 bpm · Today, 06:24"
          trace={traces.heart}
          status="Slightly above baseline"
          delay={120}
          onSelect={() => setActiveStep(0)}
          onDecrease={() => setHeartRate((value) => Math.max(30, value - 1))}
          onIncrease={() => setHeartRate((value) => Math.min(220, value + 1))}
        />

        <BloodPressureCard
          active={activeStep === 1}
          systolic={systolic}
          diastolic={diastolic}
          delay={180}
          onSelect={() => setActiveStep(1)}
          setSystolic={setSystolic}
          setDiastolic={setDiastolic}
        />

        <VitalEntryCard
          step={3}
          active={activeStep === 2}
          title="Glucose"
          icon={<TrendingUp size={21} />}
          value={glucose}
          unit="mg/dL"
          lastValue="Last value: 92 mg/dL · Today, 07:10"
          trace={traces.glucose}
          status="Within baseline"
          delay={240}
          onSelect={() => setActiveStep(2)}
          onDecrease={() => setGlucose((value) => Math.max(40, value - 1))}
          onIncrease={() => setGlucose((value) => Math.min(300, value + 1))}
        />

        <VitalEntryCard
          step={4}
          active={activeStep === 3}
          title="Temperature"
          icon={<Thermometer size={21} />}
          value={temperature}
          decimals={1}
          unit="°C"
          lastValue="Last value: 36.7 °C · Yesterday, 20:04"
          trace={traces.temperature}
          status="Within baseline"
          delay={300}
          onSelect={() => setActiveStep(3)}
          onDecrease={() => setTemperature((value) => Math.max(34, +(value - 0.1).toFixed(1)))}
          onIncrease={() => setTemperature((value) => Math.min(42, +(value + 0.1).toFixed(1)))}
        />

        <VitalEntryCard
          step={5}
          active={activeStep === 4}
          optional
          title="SpO₂"
          icon={<Radio size={21} />}
          value={spo2}
          unit="%"
          lastValue="Last value: 98% · Yesterday, 20:04"
          trace={traces.oxygen}
          status={spo2 === null ? "Not included" : "Within baseline"}
          delay={360}
          onSelect={() => setActiveStep(4)}
          onDecrease={() => setSpo2((value) => Math.max(70, (value ?? 99) - 1))}
          onIncrease={() => setSpo2((value) => Math.min(100, (value ?? 97) + 1))}
          onClear={() => setSpo2(null)}
        />
      </section>

      <div
        className="quick-log-actions reveal-card"
        style={{ "--reveal-delay": "420ms" } as CSSProperties}
      >
        <div className="local-save-note">
          <ScanLine size={19} />
          <span>
            <strong>Saved locally first</strong>
            <small>Will sync automatically when a link is available.</small>
          </span>
        </div>
        <button className={`save-reading-button ${saveState}`} onClick={saveReading}>
          <span className="save-button-symbol">
            {saveState === "saved" ? <Check size={24} /> : <Plus size={24} />}
          </span>
          {saveState === "saving"
            ? "Saving reading…"
            : saveState === "saved"
              ? "Reading saved"
              : "Save reading"}
          <i />
        </button>
      </div>

      <div className="clinical-note">
        <CircleAlert size={16} />
        Decision support only. Not a medical diagnosis.
      </div>

      <BottomSheet title="Reading saved" open={showResult} onClose={() => setShowResult(false)}>
        <div className="reading-result">
          <div className="result-status-row">
            <span className="result-icon">
              <HeartPulse size={24} />
            </span>
            <StatusChip tone="caution" label="Caution" />
          </div>
          <div className="result-reading">
            <strong>88</strong>
            <span>bpm</span>
          </div>
          <h3>Heart rate 88 bpm: Slightly high vs your baseline (72)</h3>
          <p>This can be influenced by recent activity, hydration, stress, or reduced sleep.</p>
          <button className="guidance-link" onClick={() => onNavigateToGuidance("Heart")}>
            See guidance <ChevronRight size={19} />
          </button>
          <button
            className="result-done-button"
            onClick={() => {
              setShowResult(false);
              onNavigateHome();
            }}
          >
            Done
          </button>
        </div>
      </BottomSheet>
    </main>
  );
}

function SourceButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className={active ? "active" : ""} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function VitalEntryCard({
  step,
  active,
  optional,
  title,
  icon,
  value,
  decimals = 0,
  unit,
  lastValue,
  trace,
  status,
  delay,
  onSelect,
  onDecrease,
  onIncrease,
  onClear,
}: {
  step: number;
  active: boolean;
  optional?: boolean;
  title: string;
  icon: ReactNode;
  value: number | null;
  decimals?: number;
  unit: string;
  lastValue: string;
  trace: string;
  status: string;
  delay: number;
  onSelect: () => void;
  onDecrease: () => void;
  onIncrease: () => void;
  onClear?: () => void;
}) {
  return (
    <article
      className={`vital-entry-card reveal-card ${active ? "active" : ""}`}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
      onClick={onSelect}
    >
      <header>
        <span className="entry-step">{step}</span>
        <span className="entry-icon">{icon}</span>
        <div>
          <h2>{title}</h2>
          {optional && <small>OPTIONAL</small>}
        </div>
        <StatusChip tone={value === null ? "caution" : "normal"} label={status} />
      </header>
      <div className="entry-stepper">
        <button
          onClick={(event) => {
            event.stopPropagation();
            onDecrease();
          }}
          aria-label={`Decrease ${title}`}
        >
          <Minus size={24} />
        </button>
        <div className="entry-value" key={value}>
          <strong>{value === null ? "—" : value.toFixed(decimals)}</strong>
          <span>{unit}</span>
        </div>
        <button
          onClick={(event) => {
            event.stopPropagation();
            onIncrease();
          }}
          aria-label={`Increase ${title}`}
        >
          <Plus size={24} />
        </button>
      </div>
      <div className="entry-footer">
        <span>{lastValue}</span>
        {onClear && (
          <button
            onClick={(event) => {
              event.stopPropagation();
              onClear();
            }}
          >
            {value === null ? "Add" : "Skip"}
          </button>
        )}
      </div>
      <EntryTrace points={trace} />
    </article>
  );
}

function BloodPressureCard({
  active,
  systolic,
  diastolic,
  delay,
  onSelect,
  setSystolic,
  setDiastolic,
}: {
  active: boolean;
  systolic: number;
  diastolic: number;
  delay: number;
  onSelect: () => void;
  setSystolic: (value: number | ((value: number) => number)) => void;
  setDiastolic: (value: number | ((value: number) => number)) => void;
}) {
  return (
    <article
      className={`vital-entry-card blood-pressure-entry reveal-card ${active ? "active" : ""}`}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
      onClick={onSelect}
    >
      <header>
        <span className="entry-step">2</span>
        <span className="entry-icon">
          <Activity size={21} />
        </span>
        <div>
          <h2>Blood Pressure</h2>
        </div>
        <StatusChip tone="normal" label="Within baseline" />
      </header>
      <div className="bp-entry-grid">
        <CompactStepper
          label="Systolic"
          value={systolic}
          onDecrease={() => setSystolic((value) => Math.max(70, value - 1))}
          onIncrease={() => setSystolic((value) => Math.min(220, value + 1))}
        />
        <span className="bp-divider">/</span>
        <CompactStepper
          label="Diastolic"
          value={diastolic}
          onDecrease={() => setDiastolic((value) => Math.max(40, value - 1))}
          onIncrease={() => setDiastolic((value) => Math.min(140, value + 1))}
        />
      </div>
      <div className="bp-unit">mmHg</div>
      <div className="entry-footer">
        <span>Last value: 118/76 mmHg · Today, 06:24</span>
      </div>
      <EntryTrace points={traces.pressure} />
    </article>
  );
}

function CompactStepper({
  label,
  value,
  onDecrease,
  onIncrease,
}: {
  label: string;
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <div className="compact-stepper">
      <small>{label}</small>
      <div>
        <button
          onClick={(event) => {
            event.stopPropagation();
            onDecrease();
          }}
        >
          <Minus size={20} />
        </button>
        <strong key={value}>{value}</strong>
        <button
          onClick={(event) => {
            event.stopPropagation();
            onIncrease();
          }}
        >
          <Plus size={20} />
        </button>
      </div>
    </div>
  );
}

function EntryTrace({ points }: { points: string }) {
  return (
    <svg className="entry-trace" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" x2="100" y1="25" y2="25" />
      <polyline pathLength="1" points={points} />
    </svg>
  );
}

function QuickLogSkeleton() {
  return (
    <main className="dashboard quick-log-screen quick-log-skeleton" aria-label="Loading quick log">
      <section className="quick-log-heading">
        <div>
          <div className="skeleton-block ql-sk-eyebrow" />
          <div className="skeleton-block ql-sk-title" />
          <div className="skeleton-block ql-sk-copy" />
        </div>
      </section>
      <div className="skeleton-block ql-sk-tools" />
      <section className="quick-log-grid">
        {[0, 1, 2, 3, 4].map((item) => (
          <div className="vital-entry-card ql-sk-card" key={item}>
            <div className="skeleton-block ql-sk-card-head" />
            <div className="skeleton-block ql-sk-value" />
            <div className="skeleton-block ql-sk-trace" />
          </div>
        ))}
      </section>
      <div className="skeleton-block ql-sk-save" />
    </main>
  );
}
