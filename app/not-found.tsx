'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-900 text-white text-center">
      <h2 className="text-2xl font-bold tracking-tight text-teal-400">၄၀၄ - စာမျက်နှာ ရှာမတွေ့ပါ</h2>
      <p className="text-sm text-slate-400 mt-2 mb-6">တောင်းဆိုထားသော စာမျက်နှာသည် တည်ရှိခြင်းမရှိပါ သို့မဟုတ် ရွှေ့ပြောင်းသွားပါသည်။</p>
      <Link 
        href="/"
        className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-xs font-bold transition-colors shadow-md"
      >
        ပင်မစာမျက်နှာသို့ ပြန်သွားရန်
      </Link>
    </div>
  );
}
