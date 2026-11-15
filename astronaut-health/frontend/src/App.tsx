import { useEffect, useState } from "react";
import {
  Activity,
  Bell,
  ClipboardPlus,
  Home,
  MoreHorizontal,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import {
  BootLoader,
  DashboardSkeleton,
  ThemeToggle,
  Toast,
  type ThemeMode,
} from "./components/VitalisUI";
import { CrewLogin, CrewLoginSkeleton } from "./components/CrewLogin";
import { HomeDashboard } from "./components/HomeDashboard";
import { QuickLog } from "./components/QuickLog";
import { BodyMap } from "./components/BodyMap";
import { SleepTracker } from "./components/SleepTracker";
import { MoodCheckin } from "./components/MoodCheckin";
import { TrendsCharts } from "./components/TrendsCharts";
import { AlertsCenter } from "./components/AlertsCenter";
import { GuidanceScreen } from "./components/GuidanceScreen";

type LoadPhase = "boot" | "skeleton" | "ready";

const navItems = [
  { label: "Home", icon: Home },
  { label: "Log", icon: ClipboardPlus },
  { label: "Trends", icon: TrendingUp },
  { label: "Alerts", icon: Bell, badge: 2 },
  { label: "More", icon: MoreHorizontal },
];

export default function App() {
  const [phase, setPhase] = useState<LoadPhase>("boot");
  const [authenticated, setAuthenticated] = useState(false);
  const [bootComplete, setBootComplete] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [activeNav, setActiveNav] = useState("Home");
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("vitalis-theme");
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("vitalis-theme", theme);
  }, [theme]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const completeTimer = window.setTimeout(() => setBootComplete(true), reduced ? 450 : 1800);
    const skeletonTimer = window.setTimeout(() => setPhase("skeleton"), reduced ? 800 : 2500);
    const readyTimer = window.setTimeout(() => setPhase("ready"), reduced ? 1150 : 3900);
    return () => {
      clearTimeout(completeTimer);
      clearTimeout(skeletonTimer);
      clearTimeout(readyTimer);
    };
  }, []);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  };

  const selectNav = (label: string) => {
    if (label === "Home" || label === "Log" || label === "Trends" || label === "Alerts") {
      setActiveNav(label);
      setMoreMenuOpen(false);
    } else if (label === "More") {
      setMoreMenuOpen((current) => !current);
    } else notify(`${label} is ready for the next prototype phase`);
  };

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
    notify(`Switched to ${theme === "dark" ? "light" : "dark"} theme`);
  };

  if (phase === "boot") return <BootLoader complete={bootComplete} />;

  return (
    <div className={`app-shell phase-${phase}`}>
      <header className="topbar">
        <button
          className="brand"
          aria-label="VITALIS home"
          onClick={() => notify("VITALIS is offline-ready")}
        >
          <span className="brand-mark">
            <Activity size={23} strokeWidth={2.4} />
          </span>
          <span>VITALIS</span>
        </button>
        <div className="mission-day">
          <span className="mission-label">MISSION ELAPSED</span>
          <strong>
            Day 142 <span>of 520</span>
          </strong>
          <div className="mission-progress">
            <span />
          </div>
        </div>
        <div className="topbar-actions">
          <button
            className="sync-chip"
            onClick={() => notify("All records synced to local mission storage")}
          >
            <span className="sync-state">
              <CheckIcon />
            </span>
            <span className="sync-wide">Online · Synced</span>
            <span className="sync-short">Online</span>
          </button>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <button
            className="icon-button notification-button bell-arrival"
            aria-label="Notifications"
            onClick={() => notify("You have 2 active notices")}
          >
            <Bell size={21} />
            <span className="notification-badge">2</span>
          </button>
          <button
            className="avatar"
            aria-label="Open profile"
            onClick={() => notify("Cdr. Amara Khan · Age 38")}
          >
            <span>AK</span>
            <i className="avatar-status" />
          </button>
        </div>
      </header>

      <aside className="sidebar" aria-label="Primary navigation">
        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isMoreSection = item.label === "More";
            const isActive =
              activeNav === item.label ||
              (isMoreSection &&
                (moreMenuOpen ||
                  activeNav === "Body Map" ||
                  activeNav === "Sleep" ||
                  activeNav === "Mood" ||
                  activeNav === "Guidance"));
            return (
              <div
                className={`nav-group ${isMoreSection ? "more-group" : ""} ${
                  isMoreSection && moreMenuOpen ? "expanded" : ""
                }`}
                key={item.label}
              >
                <button
                  className={`nav-item ${isActive ? "active" : ""}`}
                  onClick={() => selectNav(item.label)}
                >
                  <span className="nav-icon">
                    <Icon size={22} />
                    <span className="nav-indicator" />
                  </span>
                  <span>{item.label}</span>
                  {item.badge && <b>{item.badge}</b>}
                </button>
                {isMoreSection && (
                  <div className="sidebar-subnav">
                    <button
                      className={activeNav === "Body Map" ? "active" : ""}
                      onClick={() => {
                        setActiveNav("Body Map");
                        setMoreMenuOpen(true);
                      }}
                    >
                      Body Map
                    </button>
                    <button
                      className={activeNav === "Sleep" ? "active" : ""}
                      onClick={() => {
                        setActiveNav("Sleep");
                        setMoreMenuOpen(true);
                      }}
                    >
                      Sleep Tracker
                    </button>
                    <button
                      className={activeNav === "Mood" ? "active" : ""}
                      onClick={() => {
                        setActiveNav("Mood");
                        setMoreMenuOpen(true);
                      }}
                    >
                      Mood Check-in
                    </button>
                    <button
                      className={activeNav === "Guidance" ? "active" : ""}
                      onClick={() => {
                        setActiveNav("Guidance");
                        setMoreMenuOpen(true);
                      }}
                    >
                      Guidance
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="support-mark">
          <ShieldCheck size={17} />
          <span>
            Decision support
            <br />
            system
          </span>
        </div>
      </aside>

      {phase === "skeleton" ? (
        authenticated ? (
          <DashboardSkeleton />
        ) : (
          <CrewLoginSkeleton theme={theme} onToggleTheme={toggleTheme} />
        )
      ) : !authenticated ? (
        <CrewLogin
          theme={theme}
          onToggleTheme={toggleTheme}
          onAuthenticated={() => {
            setAuthenticated(true);
            setPhase("skeleton");
            notify("Welcome aboard, Commander Khan");
            const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            window.setTimeout(() => setPhase("ready"), reduced ? 300 : 1350);
          }}
          onNotify={notify}
        />
      ) : activeNav === "Log" ? (
        <QuickLog onNotify={notify} onNavigateHome={() => setActiveNav("Home")} />
      ) : activeNav === "Trends" ? (
        <TrendsCharts onNotify={notify} />
      ) : activeNav === "Alerts" ? (
        <AlertsCenter onNotify={notify} />
      ) : activeNav === "Body Map" ? (
        <BodyMap onNotify={notify} />
      ) : activeNav === "Sleep" ? (
        <SleepTracker onNotify={notify} />
      ) : activeNav === "Mood" ? (
        <MoodCheckin onNotify={notify} />
      ) : activeNav === "Guidance" ? (
        <GuidanceScreen onNotify={notify} />
      ) : (
        <HomeDashboard onNotify={notify} />
      )}

      <nav className="bottom-nav" aria-label="Primary navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              className={
                activeNav === item.label ||
                (item.label === "More" &&
                  (moreMenuOpen ||
                    activeNav === "Body Map" ||
                    activeNav === "Sleep" ||
                    activeNav === "Mood" ||
                    activeNav === "Guidance"))
                  ? "active"
                  : ""
              }
              onClick={() => selectNav(item.label)}
            >
              <span>
                <Icon size={22} />
                {item.badge && <b>{item.badge}</b>}
              </span>
              {item.label}
            </button>
          );
        })}
      </nav>
      {moreMenuOpen && (
        <div className="mobile-more-menu">
          <div className="mobile-more-handle" />
          <span>MORE HEALTH TOOLS</span>
          <button
            className={activeNav === "Body Map" ? "active" : ""}
            onClick={() => {
              setActiveNav("Body Map");
              setMoreMenuOpen(false);
            }}
          >
            Body Map
          </button>
          <button
            className={activeNav === "Sleep" ? "active" : ""}
            onClick={() => {
              setActiveNav("Sleep");
              setMoreMenuOpen(false);
            }}
          >
            Sleep Tracker
          </button>
          <button
            className={activeNav === "Mood" ? "active" : ""}
            onClick={() => {
              setActiveNav("Mood");
              setMoreMenuOpen(false);
            }}
          >
            Mood Check-in
          </button>
          <button
            className={activeNav === "Guidance" ? "active" : ""}
            onClick={() => {
              setActiveNav("Guidance");
              setMoreMenuOpen(false);
            }}
          >
            Guidance
          </button>
        </div>
      )}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

function CheckIcon() {
  return (
    <span className="sync-check" aria-label="Synchronized">
      ✓
    </span>
  );
}
