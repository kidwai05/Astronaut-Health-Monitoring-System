import { useEffect, useState, type CSSProperties } from "react";
import { Activity, ArrowLeft, Check, Delete, LockKeyhole, QrCode, ShieldCheck } from "lucide-react";
import { ThemeToggle, type ThemeMode } from "./VitalisUI";

const crew = [
  { initials: "AK", name: "Amara Khan", role: "Commander", shift: "Alpha" },
  { initials: "JM", name: "Jonah Mercer", role: "Flight Engineer", shift: "Alpha" },
  { initials: "SL", name: "Sofia Liang", role: "Medical Officer", shift: "Bravo" },
  { initials: "TO", name: "Tariq Okafor", role: "Mission Specialist", shift: "Bravo" },
];

const pinKeys = [1, 2, 3, 4, 5, 6, 7, 8, 9, "back", 0, "clear"] as const;

export function CrewLoginSkeleton({
  theme,
  onToggleTheme,
}: {
  theme: ThemeMode;
  onToggleTheme: () => void;
}) {
  return (
    <main className="login-screen login-skeleton-screen" aria-label="Loading crew profiles">
      <LoginBackdrop />
      <div className="login-theme-control">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
      <section className="login-card">
        <div className="login-skeleton-head">
          <div className="skeleton-block login-sk-logo" />
          <div className="skeleton-block login-sk-title" />
          <div className="skeleton-block login-sk-copy" />
        </div>
        <div className="crew-grid login-sk-grid">
          {[0, 1, 2, 3].map((item) => (
            <div className="crew-skeleton" key={item}>
              <div className="skeleton-block login-sk-avatar" />
              <div>
                <div className="skeleton-block login-sk-name" />
                <div className="skeleton-block login-sk-role" />
              </div>
            </div>
          ))}
        </div>
        <div className="pin-skeleton">
          <div className="skeleton-block login-sk-pin-title" />
          <div className="skeleton-block login-sk-pin" />
        </div>
      </section>
    </main>
  );
}

export function CrewLogin({
  theme,
  onToggleTheme,
  onAuthenticated,
  onNotify,
}: {
  theme: ThemeMode;
  onToggleTheme: () => void;
  onAuthenticated: () => void;
  onNotify: (message: string) => void;
}) {
  const [selected, setSelected] = useState(0);
  const [pin, setPin] = useState("");
  const [state, setState] = useState<"idle" | "checking" | "success">("idle");

  useEffect(() => {
    if (pin.length !== 4) return;
    setState("checking");
    const successTimer = window.setTimeout(() => setState("success"), 450);
    const enterTimer = window.setTimeout(onAuthenticated, 1150);
    return () => {
      clearTimeout(successTimer);
      clearTimeout(enterTimer);
    };
  }, [pin, onAuthenticated]);

  const enterKey = (key: (typeof pinKeys)[number]) => {
    if (state !== "idle") return;
    if (key === "back") {
      setPin((value) => value.slice(0, -1));
      return;
    }
    if (key === "clear") {
      setPin("");
      return;
    }
    setPin((value) => (value.length < 4 ? `${value}${key}` : value));
  };

  const chooseCrew = (index: number) => {
    setSelected(index);
    setPin("");
    setState("idle");
  };

  return (
    <main className="login-screen">
      <LoginBackdrop />
      <div className="login-topbar">
        <div className="login-mission">
          <span>ARES VII</span>
          <strong>Mission day 142</strong>
        </div>
        <div className="login-theme-control">
          <span className="theme-label">{theme} mode</span>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>

      <section className="login-card page-entrance">
        <header className="login-header">
          <div className="login-brand-mark">
            <Activity size={26} strokeWidth={2.4} />
            <span className="login-brand-ring" />
          </div>
          <div className="login-wordmark">VITALIS</div>
          <h1>Select crew member</h1>
          <p>Choose your profile to access your local health record.</p>
        </header>

        <div className="crew-grid" role="list" aria-label="Crew members">
          {crew.map((member, index) => (
            <button
              className={`crew-card ${selected === index ? "selected" : ""}`}
              key={member.name}
              onClick={() => chooseCrew(index)}
              style={{ "--crew-delay": `${180 + index * 60}ms` } as CSSProperties}
              aria-pressed={selected === index}
            >
              <span className={`crew-avatar avatar-${index + 1}`}>{member.initials}</span>
              <span className="crew-details">
                <strong>{member.name}</strong>
                <small>{member.role}</small>
              </span>
              <span className="crew-shift">{member.shift}</span>
              <span className="crew-check">
                <Check size={15} strokeWidth={3} />
              </span>
            </button>
          ))}
        </div>

        <div className="login-divider">
          <span>SECURE LOCAL ACCESS</span>
        </div>

        <section className="pin-section" aria-label={`Enter PIN for ${crew[selected].name}`}>
          <div className="pin-heading">
            <span className="pin-lock">
              <LockKeyhole size={19} />
            </span>
            <div>
              <h2>Enter 4-digit PIN</h2>
              <p>Signing in as {crew[selected].name}</p>
            </div>
          </div>

          <div className={`pin-display ${state}`}>
            {[0, 1, 2, 3].map((index) => (
              <span className={pin.length > index ? "filled" : ""} key={index}>
                {pin.length > index && <i />}
              </span>
            ))}
            <div className="pin-state-icon">
              {state === "checking" && <span className="pin-spinner" />}
              {state === "success" && <Check size={23} strokeWidth={3} />}
            </div>
          </div>

          <div className="pin-pad">
            {pinKeys.map((key) => (
              <button
                key={key}
                className={`pin-key ${typeof key === "string" ? "pin-action" : ""}`}
                onClick={() => enterKey(key)}
                aria-label={
                  key === "back"
                    ? "Delete last digit"
                    : key === "clear"
                      ? "Clear PIN"
                      : `Digit ${key}`
                }
              >
                {key === "back" ? <Delete size={23} /> : key === "clear" ? "Clear" : key}
              </button>
            ))}
          </div>
        </section>

        <button
          className="qr-option"
          onClick={() => onNotify("QR scanner ready · badge stays on this device")}
        >
          <span>
            <QrCode size={22} />
          </span>
          <span>
            <strong>Scan crew QR badge</strong>
            <small>Use the tablet camera for quick access</small>
          </span>
          <ArrowLeft className="qr-arrow" size={18} />
        </button>
      </section>

      <div className="offline-login-badge">
        <ShieldCheck size={18} />
        <span>
          <strong>Offline-ready</strong> · Works without connection to Earth
        </span>
      </div>
    </main>
  );
}

function LoginBackdrop() {
  return (
    <div className="login-backdrop" aria-hidden="true">
      <div className="star-layer star-layer-one" />
      <div className="star-layer star-layer-two" />
      <div className="earth-horizon">
        <span className="earth-continent continent-one" />
        <span className="earth-continent continent-two" />
      </div>
      <svg className="login-ecg" viewBox="0 0 1000 80" preserveAspectRatio="none">
        <path pathLength="1" d="M0 42h350l18-8 12 8h38l13-32 18 62 20-50 16 20h515" />
      </svg>
    </div>
  );
}
