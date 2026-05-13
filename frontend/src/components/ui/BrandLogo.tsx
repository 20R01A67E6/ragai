export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`font-bold tracking-tight ${className}`}>
      <span className="text-purple-800">RAG</span>
      <span className="text-violet-400">ai</span>
      <span className="text-purple-800">i</span>
      <span
        aria-hidden="true"
        className="animate-blink text-purple-800 font-thin ml-px"
      >|</span>
    </span>
  );
}
