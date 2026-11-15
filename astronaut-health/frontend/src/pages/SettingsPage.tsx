import { useEffect, useState, type CSSProperties } from "react";
import {
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Fingerprint,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  UserRound,
} from "lucide-react";
import { useManagedTimeout, type ThemePreference } from "../components/VitalisUI";

type Units = "metric" | "imperial";

export function SettingsPage({
  onNotify,
  themePreference,
  onThemeChange,
  initialSection,
  onSwitchCrew,
}: {
  onNotify: (message: string) => void;
  themePreference: ThemePreference;
  onThemeChange: (preference: ThemePreference) => void;
  initialSection: "sync" | null;
  onSwitchCrew: () => void;
}) {
  const scheduleTimeout = useManagedTimeout();
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState<Units>("metric");
  const [textSize, setTextSize] = useState(16);
  const [healthAlerts, setHealthAlerts] = useState(true);
  const [routineReminders, setRoutineReminders] = useState(true);
  const [localProtection, setLocalProtection] = useState(true);
  const [shareSummary, setShareSummary] = useState(false);
  const [queueSize, setQueueSize] = useState(3);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const savedSize = Number(window.localStorage.getItem("vitalis-text-size"));
    if (savedSize >= 14 && savedSize <= 18) setTextSize(savedSize);
    const savedUnits = window.localStorage.getItem("vitalis-units");
    if (savedUnits === "metric" || savedUnits === "imperial") setUnits(savedUnits);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setLoading(false), reduced ? 250 : 900);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = `${textSize}px`;
    window.localStorage.setItem("vitalis-text-size", String(textSize));
  }, [textSize]);

  useEffect(() => {
    if (!loading && initialSection === "sync") {
      document.getElementById("sync-settings")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [loading, initialSection]);

  const changeUnits = (next: Units) => {
    setUnits(next);
    window.localStorage.setItem("vitalis-units", next);
    onNotify(`Units set to ${next}`);
  };

  const syncNow = () => {
    if (syncing) return;
    setSyncing(true);
    scheduleTimeout(() => {
      setQueueSize(0);
      setSyncing(false);
      onNotify("Local health records are synchronized");
    }, 1100);
  };

  if (loading) return <SettingsSkeleton />;

  return (
    <main className="dashboard support-screen settings-screen">
      <section className="support-page-heading page-entrance">
        <div>
          <p className="eyebrow">PERSONALIZE YOUR EXPERIENCE</p>
          <h1>Settings</h1>
          <p>Manage your profile, preferences, and the way your information is handled.</p>
        </div>
        <span className="settings-secure-label">
          <LockKeyhole size={15} /> Stored on this device
        </span>
      </section>

      <section
        className="settings-profile-card panel reveal-card"
        style={{ "--reveal-delay": "40ms" } as CSSProperties}
      >
        <span className="settings-profile-avatar">
          AK
          <i />
        </span>
        <div className="settings-profile-copy">
          <span className="panel-kicker">CREW PROFILE</span>
          <h2>Amara Khan</h2>
          <p>
            Commander · Alpha shift <span>·</span> Mission day 142
          </p>
        </div>
        <span className="profile-verified">
          <CheckCircle2 size={16} /> Verified crew member
        </span>
        <button className="switch-crew-button" onClick={onSwitchCrew}>
          Switch crew
        </button>
      </section>

      <div className="settings-layout">
        <div className="settings-main-column">
          <section
            className="settings-panel panel reveal-card"
            style={{ "--reveal-delay": "100ms" } as CSSProperties}
          >
            <header className="settings-panel-heading">
              <span className="settings-panel-icon">
                <UserRound size={19} />
              </span>
              <div>
                <span className="panel-kicker">DISPLAY PREFERENCES</span>
                <h2>Make VITALIS yours</h2>
              </div>
            </header>
            <div className="settings-control-row">
              <div className="settings-control-copy">
                <strong>Measurement units</strong>
                <span>
                  {units === "metric"
                    ? "Readings use °C, kg, and km."
                    : "Readings use °F, lb, and mi."}
                </span>
              </div>
              <div className="settings-segmented" role="group" aria-label="Measurement units">
                <button
                  className={units === "metric" ? "active" : ""}
                  aria-pressed={units === "metric"}
                  onClick={() => changeUnits("metric")}
                >
                  Metric
                </button>
                <button
                  className={units === "imperial" ? "active" : ""}
                  aria-pressed={units === "imperial"}
                  onClick={() => changeUnits("imperial")}
                >
                  Imperial
                </button>
              </div>
            </div>
            <div className="settings-control-row">
              <div className="settings-control-copy">
                <strong>Theme</strong>
                <span>Choose a fixed theme or follow your device setting.</span>
              </div>
              <div className="settings-segmented" role="group" aria-label="Theme">
                {(["light", "dark", "auto"] as ThemePreference[]).map((preference) => (
                  <button
                    key={preference}
                    className={themePreference === preference ? "active" : ""}
                    aria-pressed={themePreference === preference}
                    onClick={() => onThemeChange(preference)}
                  >
                    {preference === "auto" ? "Auto" : preference === "light" ? "Light" : "Dark"}
                  </button>
                ))}
              </div>
            </div>
            <div className="settings-control-row text-size-row">
              <div className="settings-control-copy">
                <strong>Text size</strong>
                <span>Adjust the interface for comfortable reading.</span>
              </div>
              <label className="settings-text-slider">
                <span>Small</span>
                <input
                  type="range"
                  min="14"
                  max="18"
                  step="1"
                  value={textSize}
                  aria-label="Text size"
                  onChange={(event) => setTextSize(Number(event.target.value))}
                />
                <span>Large</span>
                <output>
                  {textSize === 14 ? "Small" : textSize === 18 ? "Large" : "Standard"}
                </output>
              </label>
            </div>
          </section>

          <section
            className="settings-panel panel reveal-card"
            style={{ "--reveal-delay": "170ms" } as CSSProperties}
          >
            <header className="settings-panel-heading">
              <span className="settings-panel-icon">
                <Bell size={19} />
              </span>
              <div>
                <span className="panel-kicker">NOTIFICATIONS</span>
                <h2>What would you like to hear about?</h2>
              </div>
            </header>
            <SettingsToggle
              icon={<ShieldCheck size={18} />}
              title="Health alerts"
              description="Changes in readings that may need your review."
              checked={healthAlerts}
              onChange={() => setHealthAlerts((value) => !value)}
            />
            <SettingsToggle
              icon={<Bell size={18} />}
              title="Routine reminders"
              description="Scheduled prompts for check-ins and daily habits."
              checked={routineReminders}
              onChange={() => setRoutineReminders((value) => !value)}
            />
          </section>

          <section
            className="settings-panel privacy-panel panel reveal-card"
            style={{ "--reveal-delay": "240ms" } as CSSProperties}
          >
            <header className="settings-panel-heading">
              <span className="settings-panel-icon">
                <Fingerprint size={19} />
              </span>
              <div>
                <span className="panel-kicker">DATA & PRIVACY</span>
                <h2>Your information stays yours.</h2>
              </div>
            </header>
            <div className="privacy-assurance">
              <LockKeyhole size={16} />
              <span>
                <strong>Offline-first by design</strong>
                <small>
                  Health records remain on this device until you choose to sync or export.
                </small>
              </span>
            </div>
            <SettingsToggle
              icon={<Smartphone size={18} />}
              title="Protect local health data"
              description="Require your crew access PIN to open this profile."
              checked={localProtection}
              onChange={() => setLocalProtection((value) => !value)}
            />
            <SettingsToggle
              icon={<UserRound size={18} />}
              title="Share summary with flight surgeon"
              description="Include wellbeing summaries when preparing a health report."
              checked={shareSummary}
              onChange={() => setShareSummary((value) => !value)}
            />
          </section>
        </div>

        <aside className="settings-side-column">
          <section
            className="sync-settings-card panel reveal-card"
            id="sync-settings"
            style={{ "--reveal-delay": "130ms" } as CSSProperties}
          >
            <header className="settings-panel-heading">
              <span className="settings-panel-icon">
                <Cloud size={19} />
              </span>
              <div>
                <span className="panel-kicker">MISSION SYNC</span>
                <h2>Local records</h2>
              </div>
            </header>
            <div className="sync-state-card">
              <span className={`sync-status-light ${syncing ? "syncing" : ""}`} />
              <span>
                <strong>{syncing ? "Syncing records…" : "Connection available"}</strong>
                <small>
                  {syncing ? "Updating the habitat archive" : "Last sync · Today, 06:12 MLT"}
                </small>
              </span>
            </div>
            <div className="sync-queue-row">
              <span>Waiting to sync</span>
              <strong>
                {queueSize} <small>{queueSize === 1 ? "item" : "items"}</small>
              </strong>
            </div>
            <SyncActivityChart />
            <button
              className={`sync-now-button ${syncing ? "syncing" : ""}`}
              disabled={syncing}
              onClick={syncNow}
            >
              <RefreshCw size={17} /> {syncing ? "Syncing…" : "Sync now"} <ChevronRight size={17} />
            </button>
            <p className="sync-privacy-note">
              <LockKeyhole size={13} /> Encrypted when connected
            </p>
          </section>
          <section
            className="settings-about-card panel reveal-card"
            style={{ "--reveal-delay": "210ms" } as CSSProperties}
          >
            <span className="about-brand-mark">
              <Check size={17} />
            </span>
            <span className="panel-kicker">VITALIS HEALTH SUPPORT</span>
            <h2>Built for the long journey.</h2>
            <p>
              This prototype supports observation and conversation. It does not diagnose or replace
              mission medical protocols.
            </p>
            <button onClick={() => onNotify("VITALIS version 1.0 · Offline-ready")}>
              About VITALIS <ChevronRight size={15} />
            </button>
          </section>
        </aside>
      </div>
    </main>
  );
}

function SettingsToggle({
  icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="settings-toggle-row">
      <span className="settings-toggle-icon">{icon}</span>
      <span className="settings-toggle-copy">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <button
        className={`settings-switch ${checked ? "on" : ""}`}
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={onChange}
      >
        <i />
      </button>
    </div>
  );
}

function SyncActivityChart() {
  const points = "0,30 24,26 48,30 72,19 96,23 120,12 144,15 168,8";
  return (
    <div className="sync-activity-chart">
      <div>
        <span>SYNC AVAILABILITY</span>
        <small>Past 8 days</small>
      </div>
      <svg viewBox="0 0 168 38" aria-label="Recent sync availability">
        <polyline points={points} pathLength="1" />
        <circle cx="168" cy="8" r="3" />
      </svg>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <main className="dashboard support-screen support-skeleton">
      <section className="support-page-heading">
        <div>
          <div className="skeleton-block support-sk-eyebrow" />
          <div className="skeleton-block support-sk-title" />
          <div className="skeleton-block support-sk-copy" />
        </div>
      </section>
      <div className="skeleton-block settings-sk-profile" />
      <div className="settings-layout">
        <div className="skeleton-block settings-sk-main" />
        <div className="skeleton-block settings-sk-side" />
      </div>
    </main>
  );
}
