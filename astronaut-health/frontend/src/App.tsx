import { useEffect, useRef, useState } from "react";
import {
  Activity,
  BellRing,
  Bell,
  ClipboardPlus,
  ClipboardList,
  CloudSun,
  BookOpen,
  Moon,
  Smile,
  Settings,
  ShieldAlert,
  Stethoscope,
  Home,
  MoreHorizontal,
  Map,
  ShieldCheck,
  TrendingUp,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  BootLoader,
  DashboardSkeleton,
  ThemeToggle,
  Toast,
  type ThemePreference,
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
import { EnvironmentPage } from "./pages/EnvironmentPage";
import { RemindersPage } from "./pages/RemindersPage";
import { ProgressPage } from "./pages/ProgressPage";
import { RecordsPage } from "./pages/RecordsPage";
import { HazardsHubPage } from "./pages/HazardsHubPage";
import { SettingsPage } from "./pages/SettingsPage";
import { FlightSurgeonPage } from "./pages/surgeon/FlightSurgeonPage";

type LoadPhase = "boot" | "skeleton" | "ready";

const navItems = [
  { label: "Home", icon: Home },
  { label: "Log", icon: ClipboardPlus },
  { label: "Trends", icon: TrendingUp },
  { label: "Alerts", icon: Bell, badge: 2 },
  { label: "More", icon: MoreHorizontal },
];

const moreNavGroups: { label: string; items: { label: string; icon: LucideIcon }[] }[] = [
  {
    label: "HEALTH",
    items: [
      { label: "Body Map", icon: Map },
      { label: "Sleep", icon: Moon },
      { label: "Mood", icon: Smile },
      { label: "Environment", icon: CloudSun },
      { label: "Progress", icon: TrendingUp },
    ],
  },
  {
    label: "TOOLS",
    items: [
      { label: "Guidance", icon: BookOpen },
      { label: "Reminders", icon: BellRing },
      { label: "Health Records", icon: ClipboardList },
      { label: "Hazards Learn Hub", icon: ShieldAlert },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      { label: "Settings", icon: Settings },
      { label: "Flight Surgeon", icon: Stethoscope },
    ],
  },
];
const moreNavItems = moreNavGroups.flatMap((group) => group.items.map((item) => item.label));
const screenNames = ["Home", "Log", "Trends", "Alerts", ...moreNavItems];

function readScreenFromHash() {
  const match = window.location.hash.match(/^#\/(.+)$/);
  if (!match) return "Home";
  try {
    const screen = decodeURIComponent(match[1]);
    return screenNames.includes(screen) ? screen : "Home";
  } catch {
    return "Home";
  }
}

export default function App() {
  const [phase, setPhase] = useState<LoadPhase>("boot");
  const [authenticated, setAuthenticated] = useState(
    () => window.sessionStorage.getItem("vitalis-authenticated") === "true",
  );
  const [bootComplete, setBootComplete] = useState(false);
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => {
    const saved = window.localStorage.getItem("vitalis-theme");
    return saved === "auto" || saved === "light" || saved === "dark" ? saved : "dark";
  });
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const theme: ThemeMode =
    themePreference === "auto" ? (systemDark ? "dark" : "light") : themePreference;
  const [activeNav, setActiveNav] = useState(readScreenFromHash);
  const [trendsMetric, setTrendsMetric] = useState("heart");
  const [guidanceTopic, setGuidanceTopic] = useState("Heart");
  const [settingsSection, setSettingsSection] = useState<"sync" | null>(null);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsTriggerRef = useRef<HTMLButtonElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const moreGroupRef = useRef<HTMLDivElement>(null);
  const mobileMoreRef = useRef<HTMLDivElement>(null);
  const sidebarMoreTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileMoreTriggerRef = useRef<HTMLButtonElement>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("vitalis-theme", themePreference);
  }, [theme, themePreference]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener("change", updateSystemTheme);
    return () => media.removeEventListener("change", updateSystemTheme);
  }, []);

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

  useEffect(() => {
    if (!notificationsOpen) return;
    const closeOnPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !notificationsRef.current?.contains(event.target)) {
        if (notificationsTriggerRef.current?.contains(event.target)) return;
        setNotificationsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNotificationsOpen(false);
    };
    document.addEventListener("pointerdown", closeOnPointerDown);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [notificationsOpen]);

  useEffect(() => {
    if (!moreMenuOpen) return;
    const closeOnPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (
        !moreGroupRef.current?.contains(event.target) &&
        !mobileMoreRef.current?.contains(event.target) &&
        !sidebarMoreTriggerRef.current?.contains(event.target) &&
        !mobileMoreTriggerRef.current?.contains(event.target)
      ) {
        setMoreMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOnPointerDown);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [moreMenuOpen]);

  useEffect(() => {
    const syncRoute = () => {
      setActiveNav(readScreenFromHash());
      setMoreMenuOpen(false);
      setNotificationsOpen(false);
    };
    window.addEventListener("popstate", syncRoute);
    window.addEventListener("hashchange", syncRoute);
    return () => {
      window.removeEventListener("popstate", syncRoute);
      window.removeEventListener("hashchange", syncRoute);
    };
  }, []);

  useEffect(
    () => () => {
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    },
    [],
  );

  const notify = (message: string) => {
    setToast(message);
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2600);
  };

  const updateScreenRoute = (screen: string) => {
    setActiveNav(screen);
    const route = `#/${encodeURIComponent(screen)}`;
    if (window.location.hash !== route) window.history.pushState({ screen }, "", route);
  };

  const navigateToScreen = (screen: string) => {
    updateScreenRoute(screen);
    setMoreMenuOpen(false);
    setNotificationsOpen(false);
    setSettingsSection(null);
  };

  const selectNav = (label: string) => {
    if (label === "Home" || label === "Log" || label === "Trends" || label === "Alerts") {
      navigateToScreen(label);
    } else if (label === "More") {
      setMoreMenuOpen((current) => !current);
    }
  };

  const navigateToTrends = (metric: string) => {
    setTrendsMetric(metric);
    navigateToScreen("Trends");
  };

  const navigateToGuidance = (topic: string) => {
    setGuidanceTopic(topic);
    navigateToScreen("Guidance");
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setThemePreference(next);
    notify(`Switched to ${next} theme`);
  };

  if (phase === "boot") return <BootLoader complete={bootComplete} />;

  return (
    <div className={`app-shell phase-${phase}`}>
      <header className="topbar">
        <button
          className="brand"
          aria-label="VITALIS home"
          onClick={() => navigateToScreen("Home")}
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
            onClick={() => {
              navigateToScreen("Settings");
              setSettingsSection("sync");
            }}
          >
            <span className="sync-state">
              <CheckIcon />
            </span>
            <span className="sync-wide">Online · Synced</span>
            <span className="sync-short">Online</span>
          </button>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <button
            ref={notificationsTriggerRef}
            className="icon-button notification-button bell-arrival"
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
            aria-controls="notifications-panel"
            onClick={() => setNotificationsOpen((open) => !open)}
          >
            <Bell size={21} />
            <span className="notification-badge">2</span>
          </button>
          {notificationsOpen && (
            <div
              className="notifications-panel"
              id="notifications-panel"
              ref={notificationsRef}
              aria-label="Notifications"
            >
              <header>
                <div>
                  <span className="panel-kicker">MISSION UPDATES</span>
                  <strong>Notifications</strong>
                </div>
                <button
                  type="button"
                  aria-label="Close notifications"
                  onClick={() => setNotificationsOpen(false)}
                >
                  <X size={18} />
                </button>
              </header>
              <button
                type="button"
                className="notification-item"
                onClick={() => navigateToScreen("Alerts")}
              >
                <span className="notification-item-icon alert">
                  <TriangleAlert size={18} />
                </span>
                <span>
                  <strong>2 health alerts need review</strong>
                  <small>Open Alerts Center</small>
                </span>
              </button>
              <button
                type="button"
                className="notification-item"
                onClick={() => navigateToScreen("Reminders")}
              >
                <span className="notification-item-icon reminder">
                  <BellRing size={18} />
                </span>
                <span>
                  <strong>Today's routine reminders</strong>
                  <small>Review your checklist</small>
                </span>
              </button>
            </div>
          )}
          <button
            className="avatar"
            aria-label="Open profile"
            onClick={() => navigateToScreen("Settings")}
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
              (isMoreSection && (moreMenuOpen || moreNavItems.includes(activeNav)));
            return (
              <div
                ref={isMoreSection ? moreGroupRef : undefined}
                className={`nav-group ${isMoreSection ? "more-group" : ""} ${
                  isMoreSection && moreMenuOpen ? "expanded" : ""
                }`}
                key={item.label}
              >
                <button
                  ref={isMoreSection ? sidebarMoreTriggerRef : undefined}
                  className={`nav-item ${isActive ? "active" : ""}`}
                  onClick={() => selectNav(item.label)}
                  aria-expanded={isMoreSection ? moreMenuOpen : undefined}
                  aria-controls={isMoreSection ? "more-sidebar-links" : undefined}
                >
                  <span className="nav-icon">
                    <Icon size={22} />
                    <span className="nav-indicator" />
                  </span>
                  <span>{item.label}</span>
                  {item.badge && <b>{item.badge}</b>}
                </button>
                {isMoreSection && (
                  <div className="sidebar-subnav" id="more-sidebar-links">
                    {moreNavGroups.map((group) => (
                      <div className="sidebar-subnav-group" key={group.label}>
                        <span>{group.label}</span>
                        {group.items.map(({ label, icon: Icon }) => (
                          <button
                            className={activeNav === label ? "active" : ""}
                            key={label}
                            onClick={() => {
                                updateScreenRoute(label);
                              setMoreMenuOpen(true);
                            }}
                          >
                            <Icon size={18} />
                            <span>
                              {label === "Sleep"
                                ? "Sleep Tracker"
                                : label === "Mood"
                                  ? "Mood Check-in"
                                  : label}
                            </span>
                          </button>
                        ))}
                      </div>
                    ))}
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
            window.sessionStorage.setItem("vitalis-authenticated", "true");
            navigateToScreen("Home");
            setPhase("skeleton");
            notify("Welcome aboard, Commander Khan");
            const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            window.setTimeout(() => setPhase("ready"), reduced ? 300 : 1350);
          }}
          onNotify={notify}
        />
      ) : activeNav === "Log" ? (
        <QuickLog
          onNotify={notify}
          onNavigateHome={() => navigateToScreen("Home")}
          onNavigateToGuidance={navigateToGuidance}
        />
      ) : activeNav === "Trends" ? (
        <TrendsCharts
          initialMetric={trendsMetric}
          onNavigateToGuidance={navigateToGuidance}
        />
      ) : activeNav === "Alerts" ? (
        <AlertsCenter onNotify={notify} onNavigateToGuidance={navigateToGuidance} />
      ) : activeNav === "Body Map" ? (
        <BodyMap onNotify={notify} onNavigateToGuidance={navigateToGuidance} />
      ) : activeNav === "Sleep" ? (
        <SleepTracker onNotify={notify} onNavigateToGuidance={navigateToGuidance} />
      ) : activeNav === "Mood" ? (
        <MoodCheckin onNotify={notify} onNavigateToGuidance={navigateToGuidance} />
      ) : activeNav === "Guidance" ? (
        <GuidanceScreen
          onNotify={notify}
          onNavigate={navigateToScreen}
          initialTopic={guidanceTopic}
        />
      ) : activeNav === "Environment" ? (
        <EnvironmentPage
          onNotify={notify}
          onViewPattern={() => navigateToScreen("Health Records")}
        />
      ) : activeNav === "Reminders" ? (
        <RemindersPage onNotify={notify} />
      ) : activeNav === "Progress" ? (
        <ProgressPage onNavigate={navigateToScreen} />
      ) : activeNav === "Health Records" ? (
        <RecordsPage onNotify={notify} />
      ) : activeNav === "Hazards Learn Hub" ? (
        <HazardsHubPage onNavigate={navigateToScreen} />
      ) : activeNav === "Settings" ? (
        <SettingsPage
          onNotify={notify}
          themePreference={themePreference}
          onThemeChange={setThemePreference}
          initialSection={settingsSection}
          onSwitchCrew={() => {
            window.sessionStorage.removeItem("vitalis-authenticated");
            setAuthenticated(false);
            setPhase("ready");
            setMoreMenuOpen(false);
            window.history.pushState({}, "", window.location.pathname);
            setActiveNav("Home");
          }}
        />
      ) : activeNav === "Flight Surgeon" ? (
        <FlightSurgeonPage onNotify={notify} onNavigate={navigateToScreen} />
      ) : (
        <HomeDashboard
          onNotify={notify}
          onNavigate={navigateToScreen}
          onMetricSelect={navigateToTrends}
        />
      )}

      <nav className="bottom-nav" aria-label="Primary navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              ref={item.label === "More" ? mobileMoreTriggerRef : undefined}
              key={item.label}
              className={
                activeNav === item.label ||
                (item.label === "More" && (moreMenuOpen || moreNavItems.includes(activeNav)))
                  ? "active"
                  : ""
              }
              onClick={() => selectNav(item.label)}
              aria-expanded={item.label === "More" ? moreMenuOpen : undefined}
              aria-controls={item.label === "More" ? "more-mobile-links" : undefined}
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
        <div
          ref={mobileMoreRef}
          className="mobile-more-menu"
          id="more-mobile-links"
        >
          <div className="mobile-more-handle" />
          <span>MORE HEALTH TOOLS</span>
          {moreNavGroups.map((group) => (
            <div className="mobile-more-group" key={group.label}>
              <span>{group.label}</span>
              {group.items.map(({ label, icon: Icon }) => (
                <button
                  className={activeNav === label ? "active" : ""}
                  key={label}
                  onClick={() => navigateToScreen(label)}
                >
                  <Icon size={18} />
                  <span>
                    {label === "Sleep"
                      ? "Sleep Tracker"
                      : label === "Mood"
                        ? "Mood Check-in"
                        : label}
                  </span>
                </button>
              ))}
            </div>
          ))}
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
