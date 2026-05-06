import Image from "next/image";

type LogoProps = {
  size?: "sm" | "md" | "lg";
  variant?: "lockup" | "mark";
  className?: string;
};

const sizes = {
  sm: { mark: 32, name: "text-[17px]", tag: "text-[10px]", gap: "gap-3" },
  md: { mark: 42, name: "text-[20px]", tag: "text-[11px]", gap: "gap-3.5" },
  lg: { mark: 60, name: "text-[28px]", tag: "text-[12px]", gap: "gap-4" },
};

export default function Logo({
  size = "md",
  variant = "lockup",
  className = "",
}: LogoProps) {
  const s = sizes[size];

  return (
    <div className={`inline-flex items-center ${s.gap} ${className}`}>
      <Image
        src="/logo.svg"
        alt="Credit Speed Insurance"
        width={s.mark}
        height={s.mark}
        priority
        className="flex-shrink-0"
      />
      {variant === "lockup" && (
        <div className="font-display leading-none tracking-tight whitespace-nowrap">
          <div className={s.name}>
            <span className="text-white">Credit</span>{" "}
            <span className="text-gold-400">Speed</span>
          </div>
          <div
            className={`${s.tag} font-semibold tracking-[0.22em] text-white/45 uppercase mt-1.5`}
          >
            Insurance
          </div>
        </div>
      )}
    </div>
  );
}
