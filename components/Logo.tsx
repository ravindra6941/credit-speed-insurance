import Image from "next/image";

type LogoProps = {
  size?: "sm" | "md" | "lg";
  variant?: "lockup" | "mark";
  className?: string;
};

const sizes = {
  sm: { mark: 28, text: "text-base" },
  md: { mark: 36, text: "text-lg" },
  lg: { mark: 56, text: "text-2xl" },
};

export default function Logo({
  size = "md",
  variant = "lockup",
  className = "",
}: LogoProps) {
  const s = sizes[size];

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <Image
        src="/logo.svg"
        alt="Credit Speed Insurance"
        width={s.mark}
        height={s.mark}
        priority
      />
      {variant === "lockup" && (
        <div className={`font-display ${s.text} leading-none tracking-tight`}>
          <span className="text-white">Credit</span>
          <span className="text-gold-400">Speed</span>
          <span className="block text-[10px] font-medium tracking-[0.18em] text-white/45 uppercase mt-0.5">
            Insurance
          </span>
        </div>
      )}
    </div>
  );
}
