export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span
            aria-hidden
            className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700 text-base font-semibold text-white shadow-md"
          >
            SP
          </span>
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-800/80">
            Smart Pantry
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
          <h1 className="mb-1 text-2xl font-semibold text-slate-900">{title}</h1>
          <p className="mb-6 text-sm text-slate-500">{subtitle}</p>
          {children}
        </div>

        {footer && <div className="mt-6">{footer}</div>}
      </div>
    </div>
  );
}
