'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App-level error caught:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-900 text-white text-center">
      <div className="max-w-md w-full p-8 rounded-2xl bg-slate-800 border border-slate-700 shadow-xl">
        <h2 className="text-xl font-bold tracking-tight text-rose-400 mb-2">အမှားအယွင်း ဖြစ်ပေါ်ခဲ့ပါသည်</h2>
        <p className="text-xs text-slate-300 mb-6 leading-relaxed">
          Application တွင် ယာယီအမှားအယွင်း ဖြစ်ပေါ်ခဲ့ပါသည်။ စာမျက်နှာကို ပြန်လည်စတင်ကြည့်ပါ။
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            ပြန်လည်ကြိုးစားမည် (Try Again)
          </button>
          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-semibold transition-all"
          >
            မူလစာမျက်နှာသို့
          </Link>
        </div>
      </div>
    </div>
  );
}
