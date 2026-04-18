type LoadingStateProps = {
  message?: string;
  className?: string;
};

const LoadingState = ({
  message = "Loading...",
  className = "",
}: LoadingStateProps) => {
  return (
    <div className={`mb-2 flex items-center gap-2 text-[12px] text-stone-500 ${className}`.trim()}>
      <span className="inline-flex h-3.5 w-3.5 animate-spin rounded-full border-2 border-stone-300 border-t-transparent" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
};

export default LoadingState;
