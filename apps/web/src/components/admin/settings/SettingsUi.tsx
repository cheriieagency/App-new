/** Shared settings section chrome — editorial. */

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
    <section className="py-6 border-b border-[#E6E3DB] last:border-0">
      <h3 className="text-base font-playfair font-medium text-[#2C2621] tracking-tight">
        {title}
      </h3>
      {subtitle ? (
        <p className="text-sm text-[#8A857D] font-medium mt-0.5 mb-4">{subtitle}</p>
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
        <p className="text-sm font-medium text-[#2C2621]">{label}</p>
        {hint ? <p className="text-xs text-[#8A857D] font-medium mt-0.5">{hint}</p> : null}
      </div>
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="flex-1 min-w-0">{children}</div>
        {action}
      </div>
    </div>
  );
}
