export function Sk({ className = "" }: { className?: string }) {
  return (
    <div
      className={`
        bg-stone-100 overflow-hidden relative
        before:absolute before:inset-0 before:-translate-x-full
        before:animate-[shimmer_1.5s_infinite]
        before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent
        ${className}
      `}
    />
  );
}
