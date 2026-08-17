/** Shared settings section chrome. */

export function SectionBlock({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="py-6 border-b border-slate-100 last:border-0">
      <h3 className="text-base font-extrabold text-slate-900 tracking-tight">{title}</h3>
      {subtitle ? (
        <p className="text-sm text-slate-500 font-medium mt-0.5 mb-4">{subtitle}</p>
      ) : (
        <div className="mb-4" />
      )}
      {children}
    </section>
  );
}

export function FieldRow({
  label,
  hint,
  children,
  action,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        {hint ? <p className="text-xs text-slate-400 font-medium mt-0.5">{hint}</p> : null}
      </div>
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="flex-1 min-w-0">{children}</div>
        {action}
      </div>
    </div>
  );
}
