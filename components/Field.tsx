import { ReactNode } from "react";

type FieldProps = {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
};

/**
 * Standard form field wrapper — label + input + optional hint/error.
 * Keeps form layouts consistent across all CRUD pages.
 */
export default function Field({
  label,
  required,
  hint,
  error,
  children,
  className = "",
}: FieldProps) {
  return (
    <div className={className}>
      <label className="block text-[11px] font-semibold tracking-[0.18em] uppercase text-white/45 mb-2">
        {label} {required && <span className="text-gold-400">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="mt-1.5 text-[11px] text-white/40">{hint}</p>
      )}
      {error && (
        <p className="mt-1.5 text-[11px] text-red-400">{error}</p>
      )}
    </div>
  );
}
