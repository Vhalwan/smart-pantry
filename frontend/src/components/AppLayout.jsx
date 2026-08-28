import { Link } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/pantry", label: "Pantry" },
  { to: "/recipes", label: "Recipes" },
  { to: "/meal-plans", label: "Meal Plans" },
];

function NavLink({ to, active, children }) {
  return (
    <Link
      to={to}
      className={
        active
          ? "inline-flex min-h-11 items-center rounded-lg bg-emerald-50 px-3 font-medium text-emerald-900"
          : "inline-flex min-h-11 items-center rounded-lg px-3 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
      }
    >
      {children}
    </Link>
  );
}

export default function AppLayout({
  title,
  currentPath,
  onLogout,
  children,
  mainClassName = "",
}) {
  return (
    <div className="min-h-screen min-w-0 bg-app">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl min-w-0 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-4">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-sm font-semibold text-white shadow-sm"
              >
                SP
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium uppercase tracking-wide text-emerald-800/80">
                  Smart Pantry
                </p>
                <h1 className="truncate text-lg font-semibold text-slate-900 sm:text-xl">
                  {title}
                </h1>
              </div>
            </div>
            <nav className="flex flex-wrap items-center gap-1 text-base sm:gap-0.5 sm:text-sm">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  active={currentPath === item.to}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 sm:w-auto"
          >
            Logout
          </button>
        </div>
      </header>

      <main
        className={`mx-auto max-w-5xl min-w-0 space-y-6 px-4 py-6 sm:py-8 ${mainClassName}`}
      >
        {children}
      </main>
    </div>
  );
}
