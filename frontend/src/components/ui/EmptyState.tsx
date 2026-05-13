"use client";
import { ChevronRight } from "lucide-react";

interface EmptyStateProps {
  icon: React.ElementType;
  heading: string;
  steps: string[];
  examples: string[];
  onExampleClick?: (example: string) => void;
}

export function EmptyState({ icon: Icon, heading, steps, examples, onExampleClick }: EmptyStateProps) {
  return (
    <div className="text-center py-10 px-6 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white border border-gray-100 shadow-sm mb-5">
        <Icon className="h-8 w-8 text-brand-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{heading}</h3>
      <ol className="text-left max-w-sm mx-auto space-y-3 mb-6">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
      {examples.length > 0 && (
        <div className="text-left max-w-sm mx-auto">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Try asking:</p>
          <div className="space-y-1.5">
            {examples.map((ex, i) => (
              <button
                key={i}
                onClick={() => onExampleClick?.(ex)}
                className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition-colors text-sm text-gray-700 group"
              >
                <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-brand-500 shrink-0" />
                <span className="italic">"{ex}"</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
