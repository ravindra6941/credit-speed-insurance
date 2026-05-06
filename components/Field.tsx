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
      <label className="block text-[12px] font-semibold tracking-[0.16em] uppercase text-white/55 mb-2.5">
        {label} {required && <span className="text-gold-400">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="mt-2 text-[12px] text-white/45 leading-relaxed">{hint}</p>
      )}
      {error && (
        <p className="mt-2 text-[12px] text-red-400 leading-relaxed">{error}</p>
      )}
    </div>
  );
}
