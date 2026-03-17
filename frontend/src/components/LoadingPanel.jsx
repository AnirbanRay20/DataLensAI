import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

const STEPS = [
  'Understanding your question...',
  'Generating SQL query...',
  'Fetching data from database...',
  'Selecting best visualization...',
  'Rendering your dashboard...',
];

export default function LoadingPanel() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep(s => Math.min(s + 1, STEPS.length - 1));
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-bg-card border border-slate-800 rounded-2xl p-6 h-80 flex flex-col items-center justify-center gap-4 animate-fadeInUp">
      <Loader2 size={28} className="text-indigo-400 animate-spin" />
      <p className="text-sm text-slate-400">{STEPS[step]}</p>
      <div className="flex gap-1">
        {STEPS.map((_, i) => (
          <span key={i} className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${i <= step ? 'bg-indigo-500' : 'bg-slate-700'}`} />
        ))}
      </div>
      <div className="w-full bg-bg-elevated rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full bg-indigo-500 transition-all duration-700 ease-out rounded-full"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
