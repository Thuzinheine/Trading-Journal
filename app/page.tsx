'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  initAuth, 
  googleSignIn, 
  logout, 
  getAccessToken,
  setAccessToken,
  auth,
} from '@/lib/firebase';
import { 
  findOrCreateFile, 
  initializeJournalSheet, 
  fetchTrades, 
  addTrade, 
  updateTradeRow, 
  deleteTradeRow, 
  clearAndSeedTrades, 
  fetchDocContent, 
  saveDocContent,
  listDocs,
  createDoc,
  Trade,
  LearningNote,
  fetchGoogleLearningNotes,
  addGoogleLearningNote,
  updateGoogleLearningNote,
  deleteGoogleLearningNote,
  fetchGoogleMicroLogs,
  addGoogleMicroLog,
  deleteGoogleMicroLog,
  fetchGoogleMacroLogs,
  addGoogleMacroLog,
  deleteGoogleMacroLog,
  WatchlistItem,
  fetchGoogleWatchlist,
  addGoogleWatchlistItem,
  updateGoogleWatchlistItem,
  deleteGoogleWatchlistItem,
} from '@/lib/google-api';
import { 
  LineChart, 
  Line, 
  AreaChart,
  Area,
  ReferenceLine,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Cell,
  PieChart, 
  Pie
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BookOpen, 
  FileText, 
  Plus, 
  LogOut, 
  RefreshCw, 
  Edit2, 
  Trash2, 
  Search, 
  Layers, 
  Activity, 
  CheckCircle2, 
  HelpCircle, 
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Filter,
  Check,
  AlertTriangle,
  Sun,
  Moon,
  Menu,
  X,
  StickyNote,
  Download,
  Award,
  Zap,
  Percent,
  Image as ImageIcon,
  ZoomIn,
  Maximize2,
  Minimize2,
  Target,
  Globe,
  Calendar,
  Clock,
  Shield,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  SlidersHorizontal,
  BarChart2,
  Sparkles,
  Scale,
  Eye,
  Coins,
  Compass,
  BookmarkCheck,
  Play,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function getDirectDriveImageUrl(url: string | undefined): string {
  if (!url) return '';
  if (url.startsWith('data:image')) return url;
  
  // Try to match standard Google Drive /file/d/{id} links
  const fileDMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    return `https://drive.google.com/thumbnail?id=${fileDMatch[1]}&sz=w1600`;
  }
  
  // Try to match id= query parameters
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) {
    return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1600`;
  }
  
  return url;
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isConnectingDrive, setIsConnectingDrive] = useState(false);

  // File system IDs
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [availableDocs, setAvailableDocs] = useState<{ id: string; name: string }[]>([]);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);

  // Data
  const [trades, setTrades] = useState<Trade[]>([]);
  const [docText, setDocText] = useState('');
  const [isDocLoading, setIsDocLoading] = useState(false);
  const [docSaveStatus, setDocSaveStatus] = useState<'saved' | 'dirty' | 'saving' | 'error'>('saved');
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);

  // Micro Analysis Type Definitions & States
  const [microLogs, setMicroLogs] = useState<{
    id: string;
    date: string;
    asset: string;
    setupType: string;
    score: number;
    ltfChecklist: {
      structureAligned: boolean;
      liquiditySwept: boolean;
      fvgTested: boolean;
      blockRefined: boolean;
      volumeConfirmed: boolean;
    };
    entryNotes: string;
    pnlR: number;
  }[]>([]);
  const [isMicroLoaded, setIsMicroLoaded] = useState(false);

  const [microAsset, setMicroAsset] = useState('EURUSD');
  const [microSetupType, setMicroSetupType] = useState('Order Block');
  const [microEntryNotes, setMicroEntryNotes] = useState('');
  const [microPnlR, setMicroPnlR] = useState(1);
  const [microChecklist, setMicroChecklist] = useState({
    structureAligned: true,
    liquiditySwept: true,
    fvgTested: false,
    blockRefined: false,
    volumeConfirmed: false,
  });

  // Macro Analysis Type Definitions & States
  const [macroLogs, setMacroLogs] = useState<{
    id: string;
    date: string;
    weeklyBias: 'Bullish' | 'Bearish' | 'Ranging';
    fundamentalSentiment: string;
    correlationNotes: string;
    keyDemandSupply: string;
    timeframeMatrix: {
      m1: 'Bullish' | 'Bearish' | 'Ranging';
      w1: 'Bullish' | 'Bearish' | 'Ranging';
      d1: 'Bullish' | 'Bearish' | 'Ranging';
      h4: 'Bullish' | 'Bearish' | 'Ranging';
      h1: 'Bullish' | 'Bearish' | 'Ranging';
    };
  }[]>([]);
  const [isMacroLoaded, setIsMacroLoaded] = useState(false);

  const [macroWeeklyBias, setMacroWeeklyBias] = useState<'Bullish' | 'Bearish' | 'Ranging'>('Bullish');
  const [macroFundamentalSentiment, setMacroFundamentalSentiment] = useState('');
  const [macroCorrelationNotes, setMacroCorrelationNotes] = useState('');
  const [macroKeyDemandSupply, setMacroKeyDemandSupply] = useState('');
  const [macroTimeframeMatrix, setMacroTimeframeMatrix] = useState({
    m1: 'Bullish' as 'Bullish' | 'Bearish' | 'Ranging',
    w1: 'Bullish' as 'Bullish' | 'Bearish' | 'Ranging',
    d1: 'Bullish' as 'Bullish' | 'Bearish' | 'Ranging',
    h4: 'Bullish' as 'Bullish' | 'Bearish' | 'Ranging',
    h1: 'Bullish' as 'Bullish' | 'Bearish' | 'Ranging',
  });
  const [fomcYear, setFomcYear] = useState<2026 | 2027>(2026);

  const fomcMeetings = [
    { date: 'Jan 27–28', year: 2026, originalDate: '2026-01-27', label: 'Jan 27-28', sep: false, notes: 'Interest Rate Decision' },
    { date: 'Mar 17–18', year: 2026, originalDate: '2026-03-17', label: 'Mar 17-18', sep: true, notes: 'Rate Decision & Economic Projections' },
    { date: 'Apr 28–29', year: 2026, originalDate: '2026-04-28', label: 'Apr 28-29', sep: false, notes: 'Interest Rate Decision' },
    { date: 'Jun 16–17', year: 2026, originalDate: '2026-06-16', label: 'Jun 16-17', sep: true, notes: 'Rate Decision & Economic Projections' },
    { date: 'Jul 28–29', year: 2026, originalDate: '2026-07-28', label: 'Jul 28-29', sep: false, notes: 'Interest Rate Decision' },
    { date: 'Sep 15–16', year: 2026, originalDate: '2026-09-15', label: 'Sep 15-16', sep: true, notes: 'Rate Decision & Economic Projections' },
    { date: 'Oct 27–28', year: 2026, originalDate: '2026-10-27', label: 'Oct 27-28', sep: false, notes: 'Interest Rate Decision' },
    { date: 'Dec 8–9', year: 2026, originalDate: '2026-12-08', label: 'Dec 8-9', sep: true, notes: 'Rate Decision & Economic Projections' },
    { date: 'Jan 26–27', year: 2027, originalDate: '2027-01-26', label: 'Jan 26-27', sep: false, notes: 'Interest Rate Decision' },
    { date: 'Mar 16–17', year: 2027, originalDate: '2027-03-16', label: 'Mar 16-17', sep: true, notes: 'Rate Decision & Economic Projections' },
    { date: 'Apr 27–28', year: 2027, originalDate: '2027-04-27', label: 'Apr 27-28', sep: false, notes: 'Interest Rate Decision' },
    { date: 'Jun 8–9', year: 2027, originalDate: '2027-06-08', label: 'Jun 8-9', sep: true, notes: 'Rate Decision & Economic Projections' },
    { date: 'Jul 27–28', year: 2027, originalDate: '2027-07-27', label: 'Jul 27-28', sep: false, notes: 'Interest Rate Decision' },
    { date: 'Sep 14–15', year: 2027, originalDate: '2027-09-14', label: 'Sep 14-15', sep: true, notes: 'Rate Decision & Economic Projections' },
    { date: 'Oct 26–27', year: 2027, originalDate: '2027-10-26', label: 'Oct 26-27', sep: false, notes: 'Interest Rate Decision' },
    { date: 'Dec 7–8', year: 2027, originalDate: '2027-12-07', label: 'Dec 7-8', sep: true, notes: 'Rate Decision & Economic Projections' },
  ];

  const getTodayDateString = () => {
    try {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const r = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${r}`;
    } catch (e) {
      return '2026-08-16';
    }
  };

  const todayDateString = getTodayDateString();
  const upcomingFomcMeetings = fomcMeetings.filter(meeting => meeting.originalDate >= todayDateString);
  const nextFomcMeeting = upcomingFomcMeetings.length > 0 ? upcomingFomcMeetings[0] : null;

  let daysRemaining: number | null = null;
  if (nextFomcMeeting) {
    try {
      const diffTime = new Date(nextFomcMeeting.originalDate).getTime() - new Date(todayDateString).getTime();
      daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    } catch (e) {
      daysRemaining = null;
    }
  }

  const filteredFomcMeetings = fomcMeetings.filter(m => m.year === fomcYear);

  // Live Trading Session Time Tracker
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const marketSessions = useMemo(() => {
    const utcHours = currentTime.getUTCHours();
    const utcMinutes = currentTime.getUTCMinutes();
    const currentDec = utcHours + utcMinutes / 60;
    
    // Tokyo: 00:00 - 09:00 UTC
    const tokyoOpen = currentDec >= 0 && currentDec < 9;
    // London: 08:00 - 16.5 (16:30) UTC
    const londonOpen = currentDec >= 8 && currentDec < 16.5;
    // New York: 13:00 - 22:00 UTC
    const nyOpen = currentDec >= 13 && currentDec < 22;
    // London + NY Overlap (High Liquidity)
    const overlapOpen = currentDec >= 13 && currentDec < 16.5;

    const pad = (n: number) => n.toString().padStart(2, '0');
    const timeStr = `${pad(utcHours)}:${pad(utcMinutes)}:${pad(currentTime.getUTCSeconds())} UTC`;

    return { tokyoOpen, londonOpen, nyOpen, overlapOpen, timeStr };
  }, [currentTime]);

  // Dashboard Controls & Filters State
  const [dashboardTimeframe, setDashboardTimeframe] = useState<'all' | '30d' | '7d'>('all');
  const [cumulativeViewMode, setCumulativeViewMode] = useState<'pnl' | 'rr'>('pnl');

  // NFP & CPI Macro Indicators State
  const [selectedIndicatorMonth, setSelectedIndicatorMonth] = useState('Aug 2026');
  const [nfpAct, setNfpAct] = useState(165);
  const [nfpFc, setNfpFc] = useState(155);
  const [cpiMmAct, setCpiMmAct] = useState(0.2);
  const [cpiMmFc, setCpiMmFc] = useState(0.2);
  const [cpiYyAct, setCpiYyAct] = useState(2.9);
  const [cpiYyFc, setCpiYyFc] = useState(3.0);
  const [coreCpiMmAct, setCoreCpiMmAct] = useState(0.2);
  const [coreCpiMmFc, setCoreCpiMmFc] = useState(0.2);
  const [coreCpiYyAct, setCoreCpiYyAct] = useState(3.2);
  const [coreCpiYyFc, setCoreCpiYyFc] = useState(3.2);

  const indicatorPresets: Record<string, {
    nfpAct: number; nfpFc: number;
    cpiMmAct: number; cpiMmFc: number;
    cpiYyAct: number; cpiYyFc: number;
    coreCpiMmAct: number; coreCpiMmFc: number;
    coreCpiYyAct: number; coreCpiYyFc: number;
  }> = useMemo(() => ({
    'Aug 2026': { nfpAct: 165, nfpFc: 155, cpiMmAct: 0.2, cpiMmFc: 0.2, cpiYyAct: 2.9, cpiYyFc: 3.0, coreCpiMmAct: 0.2, coreCpiMmFc: 0.2, coreCpiYyAct: 3.2, coreCpiYyFc: 3.2 },
    'Sep 2026': { nfpAct: 150, nfpFc: 160, cpiMmAct: 0.1, cpiMmFc: 0.2, cpiYyAct: 2.7, cpiYyFc: 2.8, coreCpiMmAct: 0.2, coreCpiMmFc: 0.2, coreCpiYyAct: 3.1, coreCpiYyFc: 3.1 },
    'Oct 2026': { nfpAct: 140, nfpFc: 145, cpiMmAct: 0.2, cpiMmFc: 0.2, cpiYyAct: 2.6, cpiYyFc: 2.6, coreCpiMmAct: 0.1, coreCpiMmFc: 0.2, coreCpiYyAct: 3.0, coreCpiYyFc: 3.1 },
    'Nov 2026': { nfpAct: 180, nfpFc: 140, cpiMmAct: 0.3, cpiMmFc: 0.2, cpiYyAct: 2.8, cpiYyFc: 2.5, coreCpiMmAct: 0.3, coreCpiMmFc: 0.2, coreCpiYyAct: 3.2, coreCpiYyFc: 3.0 },
    'Dec 2026': { nfpAct: 120, nfpFc: 150, cpiMmAct: 0.1, cpiMmFc: 0.2, cpiYyAct: 2.4, cpiYyFc: 2.5, coreCpiMmAct: 0.1, coreCpiMmFc: 0.2, coreCpiYyAct: 2.9, coreCpiYyFc: 3.0 },
  }), []);

  const handleSelectIndicatorPreset = (month: string) => {
    setSelectedIndicatorMonth(month);
    const preset = indicatorPresets[month];
    if (preset) {
      setNfpAct(preset.nfpAct);
      setNfpFc(preset.nfpFc);
      setCpiMmAct(preset.cpiMmAct);
      setCpiMmFc(preset.cpiMmFc);
      setCpiYyAct(preset.cpiYyAct);
      setCpiYyFc(preset.cpiYyFc);
      setCoreCpiMmAct(preset.coreCpiMmAct);
      setCoreCpiMmFc(preset.coreCpiMmFc);
      setCoreCpiYyAct(preset.coreCpiYyAct);
      setCoreCpiYyFc(preset.coreCpiYyFc);
    }
  };

  const ratePredictor = useMemo(() => {
    let hawkishPoints = 0;
    let dovishPoints = 0;

    // NFP comparison
    if (nfpAct > nfpFc) {
      hawkishPoints += 1.5;
    } else if (nfpAct < nfpFc) {
      dovishPoints += 1.5;
    }
    // NFP absolute value
    if (nfpAct >= 180) {
      hawkishPoints += 1.5;
    } else if (nfpAct <= 120) {
      dovishPoints += 1.5;
    }

    // CPI m/m
    if (cpiMmAct > cpiMmFc) {
      hawkishPoints += 1;
    } else if (cpiMmAct < cpiMmFc) {
      dovishPoints += 1;
    }

    // CPI y/y
    if (cpiYyAct > cpiYyFc) {
      hawkishPoints += 1.5;
    } else if (cpiYyAct < cpiYyFc) {
      dovishPoints += 1.5;
    }
    if (cpiYyAct >= 2.5) {
      hawkishPoints += 1.5;
    } else if (cpiYyAct <= 2.2) {
      dovishPoints += 1.5;
    }

    // Core CPI m/m
    if (coreCpiMmAct > coreCpiMmFc) {
      hawkishPoints += 1;
    } else if (coreCpiMmAct < coreCpiMmFc) {
      dovishPoints += 1;
    }

    // Core CPI y/y
    if (coreCpiYyAct > coreCpiYyFc) {
      hawkishPoints += 1.5;
    } else if (coreCpiYyAct < coreCpiYyFc) {
      dovishPoints += 1.5;
    }
    if (coreCpiYyAct >= 2.8) {
      hawkishPoints += 1.5;
    } else if (coreCpiYyAct <= 2.3) {
      dovishPoints += 1.5;
    }

    const total = hawkishPoints + dovishPoints;
    let percentage = 0;
    let result: 'Hike' | 'Cut' | 'Hold' = 'Hold';
    let label = 'Rate Pause / Hold (ဆိုင်းငံ့စောင့်ကြည့်မည်)';
    let colorClass = 'text-amber-500';
    let bgClass = 'bg-amber-500/10 border-amber-500/20';
    let desc = 'အလုပ်အကိုင်နှင့် ငွေကြေးဖောင်းပွမှုဒေတာများ ရောထွေးနေသောကြောင့် ဗဟိုဘဏ်သည် အတိုးနှုန်းကို ဆိုင်းငံ့စောင့်ကြည့်ရန် ရာခိုင်နှုန်း ပိုမိုများပြားပါသည်။ (Neutral Bias)';

    if (total > 0) {
      percentage = Math.round(((hawkishPoints - dovishPoints) / total) * 100);
    }

    if (percentage >= 25) {
      result = 'Hike';
      label = 'Rate Hike or Hold High (အတိုးနှုန်းတိုးမြှင့်ရန်/ထိန်းသိမ်းရန်)';
      colorClass = 'text-rose-500 dark:text-rose-400';
      bgClass = 'bg-rose-500/10 border-rose-500/20';
      desc = 'ငွေကြေးဖောင်းပွမှု ဖိအားမြင့်မားပြီး အလုပ်အကိုင်စျေးကွက် တောင့်တင်းနေသောကြောင့် Fed သည် အတိုးနှုန်းကို လက်ရှိအမြင့်၌ ဆက်လက်ထိန်းသိမ်းရန် သို့မဟုတ် ထပ်မံမြှင့်တင်ရန် တွန်းအားပေးနေပါသည်။ (Hawkish Bias)';
    } else if (percentage <= -25) {
      result = 'Cut';
      label = 'Rate Cut (အတိုးနှုန်းလျှော့ချရန်)';
      colorClass = 'text-emerald-500 dark:text-emerald-400';
      bgClass = 'bg-emerald-500/10 border-emerald-500/20';
      desc = 'ငွေကြေးဖောင်းပွမှု လျော့ကျလာပြီး အလုပ်အကိုင်စျေးကွက် အေးခဲလာသောကြောင့် စီးပွားရေးကို ပြန်လည်နှိုးဆွရန် အတိုးနှုန်းကို လျှော့ချရန် လိုလားသော အခြေအနေဖြစ်ပါသည်။ (Dovish Bias)';
    }

    return { percentage, result, label, colorClass, bgClass, desc, hawkishPoints, dovishPoints };
  }, [nfpAct, nfpFc, cpiMmAct, cpiMmFc, cpiYyAct, cpiYyFc, coreCpiMmAct, coreCpiMmFc, coreCpiYyAct, coreCpiYyFc]);

  // Dark UI toggle state
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to Dark UI as requested

  // Responsive mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Active view
  const [activeTab, setActiveTab] = useState<'overview' | 'journal' | 'micro' | 'macro' | 'alignment' | 'learning' | 'watchlist'>('overview');

  // Default Sample Watchlist Setups (Crypto & Forex)
  const defaultWatchlistItems: WatchlistItem[] = [
    {
      id: 'wl-btc-1',
      pair: 'BTC/USDT',
      category: 'Crypto',
      bias: 'Bullish',
      status: 'Ready to Enter',
      timeframe: '4H',
      keyLevels: 'Key POI: $63,200 - $63,800 (Bullish Orderblock + 4H FVG) | Target: $66,000 | Invalidation: $62,400',
      notes: 'Clean liquidity sweep below previous 4H swing low followed by bullish market structure shift on 15m. Waiting for tap into 4H Fair Value Gap with volume surge.',
      imageUrl: '',
      createdAt: '2026-08-30T10:00:00.000Z',
    },
    {
      id: 'wl-eur-1',
      pair: 'EUR/USD',
      category: 'Forex',
      bias: 'Bearish',
      status: 'Setup Forming',
      timeframe: '1H',
      keyLevels: 'Supply Zone: 1.0880 - 1.0900 | Target: 1.0790 (Weekly Low) | Invalidation: 1.0930',
      notes: 'Higher timeframe daily bias is bearish. Asian session liquidity swept, price testing London mitigation block. Looking for lower timeframe CHoCH during NY open session.',
      imageUrl: '',
      createdAt: '2026-08-30T09:30:00.000Z',
    },
    {
      id: 'wl-sol-1',
      pair: 'SOL/USDT',
      category: 'Crypto',
      bias: 'Bullish',
      status: 'Watching',
      timeframe: '1D',
      keyLevels: 'Major Demand Zone: $138.50 - $142.00 | Targets: $155.00 / $170.00 | Invalidation: $134.00',
      notes: 'Daily Bullish Breaker combined with Discount Golden Pocket Fibonacci 0.618. Accumulation phase forming with declining seller volume.',
      imageUrl: '',
      createdAt: '2026-08-29T18:00:00.000Z',
    },
    {
      id: 'wl-gold-1',
      pair: 'XAU/USD (Gold)',
      category: 'Forex',
      bias: 'Bullish',
      status: 'Ready to Enter',
      timeframe: '15M',
      keyLevels: 'POI: $2,410 - $2,414 FVG | Target: $2,435 (NY High) | Stop: $2,402',
      notes: 'Strong rejection candle from $2,400 psychological support. High volume displacement leaving clean imbalance on 15m.',
      imageUrl: '',
      createdAt: '2026-08-30T11:15:00.000Z',
    }
  ];

  // Watchlist States
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>(defaultWatchlistItems);
  const [isWatchlistLoading, setIsWatchlistLoading] = useState(false);
  const [isSavingWatchlistItem, setIsSavingWatchlistItem] = useState(false);
  const [showWatchlistModal, setShowWatchlistModal] = useState(false);
  const [editingWatchlistItem, setEditingWatchlistItem] = useState<WatchlistItem | null>(null);
  const [selectedWatchlistItem, setSelectedWatchlistItem] = useState<WatchlistItem | null>(null);
  const [isWatchlistModalFullPage, setIsWatchlistModalFullPage] = useState(false);
  const [watchlistError, setWatchlistError] = useState<string | null>(null);

  // Watchlist Form Fields
  const [watchlistPair, setWatchlistPair] = useState('');
  const [watchlistCategory, setWatchlistCategory] = useState<'Crypto' | 'Forex' | 'Commodity' | 'Index'>('Crypto');
  const [watchlistBias, setWatchlistBias] = useState<'Bullish' | 'Bearish' | 'Neutral' | 'Monitoring'>('Bullish');
  const [watchlistStatus, setWatchlistStatus] = useState<'Watching' | 'Setup Forming' | 'Ready to Enter' | 'Triggered' | 'Invalidated'>('Watching');
  const [watchlistTimeframe, setWatchlistTimeframe] = useState('4H');
  const [watchlistKeyLevels, setWatchlistKeyLevels] = useState('');
  const [watchlistNotes, setWatchlistNotes] = useState('');
  const [watchlistImage, setWatchlistImage] = useState('');

  // Watchlist Filters
  const [watchlistFilterCategory, setWatchlistFilterCategory] = useState<'ALL' | 'Crypto' | 'Forex' | 'Commodity' | 'Index'>('ALL');
  const [watchlistFilterBias, setWatchlistFilterBias] = useState<'ALL' | 'Bullish' | 'Bearish' | 'Neutral' | 'Monitoring'>('ALL');
  const [watchlistFilterStatus, setWatchlistFilterStatus] = useState<'ALL' | 'Watching' | 'Setup Forming' | 'Ready to Enter' | 'Triggered' | 'Invalidated'>('ALL');
  const [watchlistSearch, setWatchlistSearch] = useState('');

  // Learning Notes States
  const [learningNotes, setLearningNotes] = useState<LearningNote[]>([]);
  const [isLearningNotesLoading, setIsLearningNotesLoading] = useState(false);
  const [learningNoteTitle, setLearningNoteTitle] = useState('');
  const [learningNoteContent, setLearningNoteContent] = useState('');
  const [learningNoteImage, setLearningNoteImage] = useState<string>('');
  const [selectedLearningNote, setSelectedLearningNote] = useState<LearningNote | null>(null);
  const [isSavingLearningNote, setIsSavingLearningNote] = useState(false);
  const [showLearningModal, setShowLearningModal] = useState(false);
  const [editingLearningNote, setEditingLearningNote] = useState<LearningNote | null>(null);
  const [learningNoteTags, setLearningNoteTags] = useState<string[]>([]);
  const [selectedFilterTag, setSelectedFilterTag] = useState<string | null>(null);
  const [customTagInput, setCustomTagInput] = useState('');
  const [learningError, setLearningError] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isLearningModalFullPage, setIsLearningModalFullPage] = useState(false);

  useEffect(() => {
    if (showLearningModal) {
      setIsLearningModalFullPage(false);
    }
  }, [showLearningModal]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [isDarkMode]);

  const allUniqueTags = useMemo(() => {
    const tagSet = new Set<string>();
    learningNotes.forEach(note => {
      note.tags?.forEach(tag => {
        if (tag.trim()) {
          tagSet.add(tag.trim());
        }
      });
    });
    return Array.from(tagSet);
  }, [learningNotes]);

  // Alignment Calculator states
  const [alignDirection, setAlignDirection] = useState<'LONG' | 'SHORT'>('SHORT');
  const [alignEntry, setAlignEntry] = useState('');
  const [alignSl, setAlignSl] = useState('');
  const [alignTp, setAlignTp] = useState('');
  const [alignRisk, setAlignRisk] = useState('10');
  const [alignChecks, setAlignChecks] = useState<boolean[]>([false, false, false, false]);
  const [alignResult, setAlignResult] = useState<{
    costOfRisk: string;
    positionSize: string;
    positionValue: string;
    leverage: number;
    margin: string;
    rMultiple: string | null;
    liqApprox: string;
    slPrice: string;
    liqMatchesSL: boolean;
    risk: string;
  } | null>(null);

  const calculateAlignment = () => {
    const entryVal = parseFloat(alignEntry);
    const slVal = parseFloat(alignSl);
    const tpVal = parseFloat(alignTp);
    const riskVal = parseFloat(alignRisk || '10');

    if (!entryVal || !slVal || !riskVal) {
      alert('Entry Price, Stop Loss နှင့် Risk Amount တို့ကို ထည့်သွင်းရန် လိုအပ်ပါသည်!');
      return;
    }

    const costOfRisk = Math.abs(slVal - entryVal);
    if (costOfRisk === 0) {
      alert('Entry Price နှင့် Stop Loss Price တူညီ၍မရပါ!');
      return;
    }

    const positionSize = riskVal / costOfRisk;
    const positionValue = positionSize * entryVal;
    const leverage = Math.round(positionValue / riskVal);
    const margin = positionValue / (leverage || 1);
    const rMultiple = !isNaN(tpVal) && tpVal ? Math.abs((entryVal - tpVal) / (slVal - entryVal)) : null;
    const liqApprox = alignDirection === 'SHORT' ? entryVal + (riskVal / positionSize) : entryVal - (riskVal / positionSize);
    const liqMatchesSL = Math.abs(liqApprox - slVal) < 1;

    setAlignResult({
      costOfRisk: costOfRisk.toFixed(4),
      positionSize: positionSize.toFixed(4),
      positionValue: positionValue.toFixed(2),
      leverage,
      margin: margin.toFixed(2),
      rMultiple: rMultiple ? rMultiple.toFixed(1) : null,
      liqApprox: liqApprox.toFixed(2),
      slPrice: slVal.toFixed(2),
      liqMatchesSL,
      risk: riskVal.toFixed(2)
    });
    setAlignChecks([false, false, false, false]);
  };

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Trade form state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

   const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    tradeNumber: '',
    pair: '', // Pair / Asset
    entryPrice: '',
    sl: '',
    tp: '',
    rr: '',
    watchlist: '', // Watchlist Details/ Setup
    winLoss: 'Pending' as 'TP' | 'SL' | 'Breakeven' | 'Trailing Stop' | 'Pending', // Result (TP/SL)
    pnl: '',
    notes: '', // Remarks/ Note
    commitment: '', // Commitment
    tradePhoto: '', // Trade SS (B&F)
    tradePhotoBefore: '',
    tradePhotoAfter: '',
  });

  // Next.js hydration safety & load cached Google data instantly
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('google_oauth_access_token');
        const expiry = localStorage.getItem('google_oauth_token_expiry');
        const cachedUserStr = localStorage.getItem('trading_cached_user');

        if (token && expiry && cachedUserStr) {
          const expiryTime = parseInt(expiry, 10);
          if (Date.now() < expiryTime) {
            try {
              const cachedUser = JSON.parse(cachedUserStr);
              setUser(cachedUser);
              setToken(token);
              setNeedsAuth(false);
              setIsAuthLoading(false);
            } catch (e) {
              console.error('Error parsing cached user:', e);
            }
          }
        }

        // Load other cached fields
        const cachedSheetId = localStorage.getItem('trading_spreadsheet_id');
        if (cachedSheetId) setSpreadsheetId(cachedSheetId);

        const cachedDocId = localStorage.getItem('trading_document_id');
        if (cachedDocId) setDocumentId(cachedDocId);

        const cachedAvailableDocs = localStorage.getItem('trading_available_docs');
        if (cachedAvailableDocs) {
          try {
            setAvailableDocs(JSON.parse(cachedAvailableDocs));
          } catch (e) {}
        }

        const cachedTrades = localStorage.getItem('trading_trades');
        if (cachedTrades) {
          try {
            setTrades(JSON.parse(cachedTrades));
          } catch (e) {}
        }

        const cachedDocText = localStorage.getItem('trading_doc_text');
        if (cachedDocText) setDocText(cachedDocText);
      }
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Escape key to close image lightbox preview
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxImage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadTrades = async (accessToken: string, sheetId: string) => {
    setIsLoadingTrades(true);
    try {
      const fetched = await fetchTrades(accessToken, sheetId);
      setTrades(fetched);
      if (typeof window !== 'undefined') {
        localStorage.setItem('trading_trades', JSON.stringify(fetched));
      }
    } catch (error) {
      console.error('Error fetching trades:', error);
    } finally {
      setIsLoadingTrades(false);
    }
  };

  const loadDocContent = async (accessToken: string, docId: string) => {
    setIsDocLoading(true);
    try {
      const content = await fetchDocContent(accessToken, docId);
      setDocText(content.text);
      setDocSaveStatus('saved');
      if (typeof window !== 'undefined') {
        localStorage.setItem('trading_doc_text', content.text);
      }
    } catch (error) {
      console.error('Error loading document:', error);
    } finally {
      setIsDocLoading(false);
    }
  };

  const loadAvailableDocs = async (accessToken: string) => {
    try {
      const docs = await listDocs(accessToken);
      // Filter out duplicates by name to prevent multiple "(မူလပင်မ Trading Notes)"
      const uniqueDocs: { id: string; name: string }[] = [];
      const seenNames = new Set<string>();
      for (const doc of docs) {
        if (!seenNames.has(doc.name)) {
          seenNames.add(doc.name);
          uniqueDocs.push(doc);
        }
      }
      setAvailableDocs(uniqueDocs);
      if (typeof window !== 'undefined') {
        localStorage.setItem('trading_available_docs', JSON.stringify(uniqueDocs));
      }
    } catch (error) {
      console.error('Error loading available docs:', error);
    }
  };

  const handleSelectDoc = async (docId: string) => {
    if (!token) return;
    setDocumentId(docId);
    await loadDocContent(token, docId);
  };

  const handleCreateNewDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newDocTitle.trim()) return;
    setIsCreatingDoc(true);
    try {
      const newDoc = await createDoc(token, newDocTitle.trim());
      await loadAvailableDocs(token);
      setDocumentId(newDoc.documentId);
      await loadDocContent(token, newDoc.documentId);
      setNewDocTitle('');
    } catch (error) {
      console.error('Error creating new Google Doc note:', error);
    } finally {
      setIsCreatingDoc(false);
    }
  };

  const [isLoadingMicro, setIsLoadingMicro] = useState(false);
  const [isLoadingMacro, setIsLoadingMacro] = useState(false);
  const [isSavingMicro, setIsSavingMicro] = useState(false);
  const [isSavingMacro, setIsSavingMacro] = useState(false);

  const loadGoogleMicroLogs = async (accessToken: string, sId: string) => {
    setIsLoadingMicro(true);
    try {
      const logs = await fetchGoogleMicroLogs(accessToken, sId);
      setMicroLogs(logs);
    } catch (error) {
      console.error('Error fetching micro logs:', error);
    } finally {
      setIsLoadingMicro(false);
    }
  };

  const loadGoogleMacroLogs = async (accessToken: string, sId: string) => {
    setIsLoadingMacro(true);
    try {
      const logs = await fetchGoogleMacroLogs(accessToken, sId);
      setMacroLogs(logs);
    } catch (error) {
      console.error('Error fetching macro logs:', error);
    } finally {
      setIsLoadingMacro(false);
    }
  };

  // --- Micro & Macro Analysis Default Logs & Handlers ---
  const defaultMicroLogs = [
    {
      id: 'micro-1',
      date: '2026-08-15',
      asset: 'XAUUSD',
      setupType: 'Liquidity Hunt',
      score: 80,
      ltfChecklist: {
        structureAligned: true,
        liquiditySwept: true,
        fvgTested: true,
        blockRefined: true,
        volumeConfirmed: false,
      },
      entryNotes: 'Sweep of Asian high on lower timeframe followed by clean structure break on 1m chart. Executed at the premium FVG.',
      pnlR: 3.5,
    },
    {
      id: 'micro-2',
      date: '2026-08-14',
      asset: 'EURUSD',
      setupType: 'Order Block',
      score: 100,
      ltfChecklist: {
        structureAligned: true,
        liquiditySwept: true,
        fvgTested: true,
        blockRefined: true,
        volumeConfirmed: true,
      },
      entryNotes: 'High probability A+ setup. Daily trend is bullish. Lower timeframe mitigated order block perfectly with surging volume confirmation.',
      pnlR: 5.0,
    }
  ];

  const defaultMacroLogs = [
    {
      id: 'macro-1',
      date: '2026-08-16',
      weeklyBias: 'Bearish' as 'Bullish' | 'Bearish' | 'Ranging',
      fundamentalSentiment: 'Hawkish FOMC expectations and rising US yields supporting DXY. Core CPI due soon might beat expectations.',
      correlationNotes: 'XAUUSD correlated negatively with DXY. Strong bearish pressure on Gold as DXY reclaims 104.5 key daily zone.',
      keyDemandSupply: 'Major supply at 2540-2550 on XAUUSD Daily chart. Daily demand sitting at 2480-2490.',
      timeframeMatrix: {
        m1: 'Bullish' as 'Bullish' | 'Bearish' | 'Ranging',
        w1: 'Bearish' as 'Bullish' | 'Bearish' | 'Ranging',
        d1: 'Bearish' as 'Bullish' | 'Bearish' | 'Ranging',
        h4: 'Bearish' as 'Bullish' | 'Bearish' | 'Ranging',
        h1: 'Bearish' as 'Bullish' | 'Bearish' | 'Ranging',
      }
    }
  ];

  // Local Storage Synchronization Hooks
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMicro = localStorage.getItem('trading_micro_logs');
      if (savedMicro && !token) {
        try { setMicroLogs(JSON.parse(savedMicro)); } catch (e) {}
      } else if (!token) {
        setMicroLogs(defaultMicroLogs);
      }
      setIsMicroLoaded(true);

      const savedMacro = localStorage.getItem('trading_macro_logs');
      if (savedMacro && !token) {
        try { setMacroLogs(JSON.parse(savedMacro)); } catch (e) {}
      } else if (!token) {
        setMacroLogs(defaultMacroLogs);
      }
      setIsMacroLoaded(true);
    }
  }, [token]);

  useEffect(() => {
    if (isMicroLoaded && typeof window !== 'undefined') {
      if (!token) {
        localStorage.setItem('trading_micro_logs', JSON.stringify(microLogs));
      } else {
        localStorage.removeItem('trading_micro_logs');
      }
    }
  }, [microLogs, isMicroLoaded, token]);

  useEffect(() => {
    if (isMacroLoaded && typeof window !== 'undefined') {
      if (!token) {
        localStorage.setItem('trading_macro_logs', JSON.stringify(macroLogs));
      } else {
        localStorage.removeItem('trading_macro_logs');
      }
    }
  }, [macroLogs, isMacroLoaded, token]);

  // Micro Handlers
  const handleAddMicroLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!microAsset.trim()) return;

    // Calculate score based on checklist
    let checkCount = 0;
    if (microChecklist.structureAligned) checkCount++;
    if (microChecklist.liquiditySwept) checkCount++;
    if (microChecklist.fvgTested) checkCount++;
    if (microChecklist.blockRefined) checkCount++;
    if (microChecklist.volumeConfirmed) checkCount++;
    const score = checkCount * 20;

    const newLog = {
      id: `micro-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      asset: microAsset.toUpperCase().trim(),
      setupType: microSetupType,
      score,
      ltfChecklist: { ...microChecklist },
      entryNotes: microEntryNotes.trim(),
      pnlR: microPnlR
    };

    if (token && spreadsheetId) {
      setIsSavingMicro(true);
      try {
        await addGoogleMicroLog(token, spreadsheetId, newLog);
        setMicroLogs([newLog, ...microLogs]);
      } catch (err) {
        console.error('Error saving micro log to Google Sheet:', err);
        alert('Google Sheets သို့ သိမ်းဆည်းရန် မအောင်မြင်ပါ!');
      } finally {
        setIsSavingMicro(false);
      }
    } else {
      setMicroLogs([newLog, ...microLogs]);
    }

    setMicroEntryNotes('');
    setMicroChecklist({
      structureAligned: false,
      liquiditySwept: false,
      fvgTested: false,
      blockRefined: false,
      volumeConfirmed: false,
    });
  };

  const handleDeleteMicroLog = async (id: string) => {
    if (token && spreadsheetId) {
      const confirmed = window.confirm('ဤ Setup Log ကို Google Sheet မှ ဖျက်ရန် သေချာပါသလား?');
      if (!confirmed) return;
      setIsSavingMicro(true);
      try {
        await deleteGoogleMicroLog(token, spreadsheetId, id);
        setMicroLogs(microLogs.filter(log => log.id !== id));
      } catch (err) {
        console.error('Error deleting micro log from Google Sheet:', err);
        alert('Google Sheets မှ ဖျက်ရန် မအောင်မြင်ပါ!');
      } finally {
        setIsSavingMicro(false);
      }
    } else {
      setMicroLogs(microLogs.filter(log => log.id !== id));
    }
  };

  const handleDownloadMicroLogs = () => {
    if (microLogs.length === 0) return;
    const text = microLogs.map(log => 
      `Date: ${log.date}\nAsset: ${log.asset}\nSetup: ${log.setupType} (Quality Score: ${log.score}%)\nPnL (R-multiple): ${log.pnlR}R\nLTF Checklist:\n - Structure Aligned: ${log.ltfChecklist.structureAligned ? 'Yes' : 'No'}\n - Liquidity Swept: ${log.ltfChecklist.liquiditySwept ? 'Yes' : 'No'}\n - FVG Tested: ${log.ltfChecklist.fvgTested ? 'Yes' : 'No'}\n - Order Block Refined: ${log.ltfChecklist.blockRefined ? 'Yes' : 'No'}\n - Volume Confirmation: ${log.ltfChecklist.volumeConfirmed ? 'Yes' : 'No'}\nNotes: ${log.entryNotes}\n`
    ).join('\n' + '='.repeat(40) + '\n\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `micro_analysis_logs_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Macro Handlers
  const handleAddMacroLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const newLog = {
      id: `macro-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      weeklyBias: macroWeeklyBias,
      fundamentalSentiment: macroFundamentalSentiment.trim(),
      correlationNotes: macroCorrelationNotes.trim(),
      keyDemandSupply: macroKeyDemandSupply.trim(),
      timeframeMatrix: { ...macroTimeframeMatrix }
    };

    if (token && spreadsheetId) {
      setIsSavingMacro(true);
      try {
        await addGoogleMacroLog(token, spreadsheetId, newLog);
        setMacroLogs([newLog, ...macroLogs]);
      } catch (err) {
        console.error('Error saving macro log to Google Sheet:', err);
        alert('Google Sheets သို့ သိမ်းဆည်းရန် မအောင်မြင်ပါ!');
      } finally {
        setIsSavingMacro(false);
      }
    } else {
      setMacroLogs([newLog, ...macroLogs]);
    }

    setMacroFundamentalSentiment('');
    setMacroCorrelationNotes('');
    setMacroKeyDemandSupply('');
  };

  const handleDeleteMacroLog = async (id: string) => {
    if (token && spreadsheetId) {
      const confirmed = window.confirm('ဤ Macro Log ကို Google Sheet မှ ဖျက်ရန် သေချာပါသလား?');
      if (!confirmed) return;
      setIsSavingMacro(true);
      try {
        await deleteGoogleMacroLog(token, spreadsheetId, id);
        setMacroLogs(macroLogs.filter(log => log.id !== id));
      } catch (err) {
        console.error('Error deleting macro log from Google Sheet:', err);
        alert('Google Sheets မှ ဖျက်ရန် မအောင်မြင်ပါ!');
      } finally {
        setIsSavingMacro(false);
      }
    } else {
      setMacroLogs(macroLogs.filter(log => log.id !== id));
    }
  };

  const handleDownloadMacroLogs = () => {
    if (macroLogs.length === 0) return;
    const text = macroLogs.map(log => 
      `Date: ${log.date}\nWeekly Market Bias: ${log.weeklyBias}\nFundamental & Sentiment factors: ${log.fundamentalSentiment}\nIntermarket Correlation Notes: ${log.correlationNotes}\nKey Supply & Demand Levels: ${log.keyDemandSupply}\nMulti-Timeframe Structure Matrix:\n - Monthly: ${log.timeframeMatrix.m1}\n - Weekly: ${log.timeframeMatrix.w1}\n - Daily: ${log.timeframeMatrix.d1}\n - 4-Hour: ${log.timeframeMatrix.h4}\n - 1-Hour: ${log.timeframeMatrix.h1}\n`
    ).join('\n' + '='.repeat(40) + '\n\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `macro_analysis_logs_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const bootstrapGoogleFiles = async (accessToken: string) => {
    // Only show connecting drive loader if we don't have cached files yet
    const hasCache = !!spreadsheetId || (typeof window !== 'undefined' && !!localStorage.getItem('trading_spreadsheet_id'));
    if (!hasCache) {
      setIsConnectingDrive(true);
    }
    try {
      // Find or create "Trading Journal (AI Studio)" Spreadsheet
      const sheetId = await findOrCreateFile(
        accessToken,
        'Trading Journal (AI Studio)',
        'application/vnd.google-apps.spreadsheet'
      );
      setSpreadsheetId(sheetId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('trading_spreadsheet_id', sheetId);
      }
      
      // Initialize Sheet with correct headers
      await initializeJournalSheet(accessToken, sheetId);
      
      // Find or create "Trading Notes (AI Studio)" Document
      const docId = await findOrCreateFile(
        accessToken,
        'Trading Notes (AI Studio)',
        'application/vnd.google-apps.document'
      );
      setDocumentId(docId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('trading_document_id', docId);
      }

      // Load initial data
      await loadTrades(accessToken, sheetId);
      await loadDocContent(accessToken, docId);
      await loadAvailableDocs(accessToken);
      await loadGoogleMicroLogs(accessToken, sheetId);
      await loadGoogleMacroLogs(accessToken, sheetId);
      await loadWatchlist(user?.uid || 'user', true, accessToken, sheetId);
      
    } catch (error) {
      console.error('Error bootstrapping Google Files:', error);
    } finally {
      setIsConnectingDrive(false);
    }
  };

  // Initialize auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, cachedToken) => {
        setUser(user);
        setToken(cachedToken);
        setNeedsAuth(false);
        setIsAuthLoading(false);
        setIsMobileMenuOpen(false);
        if (typeof window !== 'undefined') {
          const serializableUser = {
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
          };
          localStorage.setItem('trading_cached_user', JSON.stringify(serializableUser));
        }
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
        setIsAuthLoading(false);
        setIsMobileMenuOpen(false);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('trading_cached_user');
          localStorage.removeItem('trading_spreadsheet_id');
          localStorage.removeItem('trading_document_id');
          localStorage.removeItem('trading_available_docs');
          localStorage.removeItem('trading_trades');
          localStorage.removeItem('trading_doc_text');
          localStorage.removeItem('trading_keep_notes');
          localStorage.removeItem('trading_micro_logs');
          localStorage.removeItem('trading_macro_logs');
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // Setup files when token becomes available
  useEffect(() => {
    if (token) {
      const timer = setTimeout(() => {
        bootstrapGoogleFiles(token);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [token]);

  const handleLogin = async () => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
        setIsMobileMenuOpen(false);
        if (typeof window !== 'undefined') {
          const serializableUser = {
            uid: result.user.uid,
            displayName: result.user.displayName,
            email: result.user.email,
            photoURL: result.user.photoURL,
          };
          localStorage.setItem('trading_cached_user', JSON.stringify(serializableUser));
        }
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      let msg = 'Google Account ဖြင့် ဝင်ရောက်ခြင်း မအောင်မြင်ပါ။';
      if (err?.code === 'auth/unauthorized-domain') {
        msg = `ဒိုမိန်း (Domain) ခွင့်ပြုချက်မရှိပါ။ Firebase Console ရှိ "Authentication > Settings > Authorized domains" တွင် "${window.location.hostname}" ကို ထည့်သွင်းပေးရန် လိုအပ်ပါသည်။`;
      } else if (err?.code === 'auth/popup-blocked') {
        msg = 'သီးခြား Window Popup ဖွင့်ခြင်းကို Browser က ပိတ်ပင်ထားပါသည်။ Browser address bar တွင် Popup blocker ကို ပိတ်ပြီး ထပ်မံကြိုးစားပါ။';
      } else if (err?.code === 'auth/popup-closed-by-user') {
        msg = 'အကောင့်ဝင်သည့် Window Popup ကို အသုံးပြုသူမှ ပိတ်လိုက်သဖြင့် မအောင်မြင်ပါ။';
      } else if (err?.message) {
        msg = `အမှားအယွင်း ဖြစ်ပွားခဲ့သည်: ${err.message}`;
      }
      setAuthError(msg);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setSpreadsheetId(null);
      setDocumentId(null);
      setTrades([]);
      setDocText('');
      setNeedsAuth(true);
      setIsMobileMenuOpen(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('trading_cached_user');
        localStorage.removeItem('trading_spreadsheet_id');
        localStorage.removeItem('trading_document_id');
        localStorage.removeItem('trading_available_docs');
        localStorage.removeItem('trading_trades');
        localStorage.removeItem('trading_doc_text');
        localStorage.removeItem('trading_keep_notes');
        localStorage.removeItem('trading_micro_logs');
        localStorage.removeItem('trading_macro_logs');
      }
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleSaveNotes = async () => {
    if (!token || !documentId) return;
    setDocSaveStatus('saving');
    try {
      await saveDocContent(token, documentId, docText);
      setDocSaveStatus('saved');
    } catch (error) {
      console.error('Failed to save document:', error);
      setDocSaveStatus('error');
    }
  };

  const loadLearningNotes = async (userId: string, isSilentRefresh = false) => {
    const cachedKey = `trading_learning_notes_${userId}`;
    let hasLoadedFromCache = false;
    let localNotesCount = 0;

    // 1. Try loading from localStorage first if not a silent sync
    if (!isSilentRefresh && typeof window !== 'undefined') {
      const cached = localStorage.getItem(cachedKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLearningNotes(parsed);
            hasLoadedFromCache = true;
            localNotesCount = parsed.length;
          }
        } catch (e) {
          console.error('Error loading cached learning notes:', e);
        }
      }
    }

    if (!token || !spreadsheetId) {
      return;
    }

    // 2. Set loading state only if memory/cache is completely empty and it's not a silent sync
    if (!hasLoadedFromCache && learningNotes.length === 0 && localNotesCount === 0 && !isSilentRefresh) {
      setIsLearningNotesLoading(true);
    }
    
    setLearningError(null);
    try {
      const notes = await fetchGoogleLearningNotes(token, spreadsheetId);
      // Sort notes: newest first (based on date/createdAt)
      const sortedNotes = notes.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      setLearningNotes(sortedNotes);
      
      // Update cache
      if (typeof window !== 'undefined') {
        localStorage.setItem(cachedKey, JSON.stringify(sortedNotes));
      }
    } catch (error: any) {
      console.error('Error fetching learning notes:', error);
      setLearningError('သင်ခန်းစာများဆွဲယူရာတွင် အမှားအယွင်းရှိနေပါသည်။');
    } finally {
      setIsLearningNotesLoading(false);
    }
  };

  // Load learning notes auto-hook with instant cached loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (user?.uid) {
        const cachedKey = `trading_learning_notes_${user.uid}`;
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem(cachedKey);
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed)) {
                setLearningNotes(parsed);
              }
            } catch (e) {
              console.error('Error parsing initial cache:', e);
            }
          }
        }
        if (token && spreadsheetId) {
          loadLearningNotes(user.uid);
        }
      } else {
        setLearningNotes([]);
      }
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token, spreadsheetId]);

  const handleSaveLearningNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!token || !spreadsheetId) {
      setLearningError('Google Drive သို့ ချိတ်ဆက်ထားခြင်းမရှိပါ။ ကျေးဇူးပြု၍ Google standard OAuth signature စတင်ပါ။');
      return;
    }
    if (!learningNoteTitle.trim()) {
      setLearningError('ခေါင်းစဉ်ထည့်သွင်းရန်လိုအပ်ပါသည်!');
      return;
    }
    if (!learningNoteContent.trim()) {
      setLearningError('မှတ်စုစာသားထည့်သွင်းရန်လိုအပ်ပါသည်!');
      return;
    }

    setIsSavingLearningNote(true);
    setLearningError(null);
    try {
      const noteId = editingLearningNote ? editingLearningNote.id : `note-${Date.now()}`;
      const noteToSave: LearningNote = {
        id: noteId,
        title: learningNoteTitle.trim(),
        content: learningNoteContent.trim(),
        imageUrl: learningNoteImage,
        createdAt: editingLearningNote ? editingLearningNote.createdAt : new Date().toISOString(),
        tags: learningNoteTags,
        docId: editingLearningNote?.docId || '',
        docUrl: editingLearningNote?.docUrl || '',
      };

      let updatedNote: LearningNote;

      if (editingLearningNote) {
        // Update existing note in Google Sheet/Doc
        const res = await updateGoogleLearningNote(token, spreadsheetId, noteToSave, editingLearningNote.imageUrl);
        updatedNote = {
          ...noteToSave,
          imageUrl: res.imageUrl || noteToSave.imageUrl,
        };
      } else {
        // Add new note to Google Sheet/Doc
        const res = await addGoogleLearningNote(token, spreadsheetId, noteToSave);
        updatedNote = {
          ...noteToSave,
          docId: res.docId,
          docUrl: res.docUrl,
          imageUrl: res.imageUrl || noteToSave.imageUrl,
        };
      }

      // 1. UPDATE LOCAL STATE INSTANTLY
      setLearningNotes(prev => {
        const index = prev.findIndex(n => n.id === noteId);
        if (index > -1) {
          const updated = [...prev];
          updated[index] = updatedNote;
          return updated;
        } else {
          return [updatedNote, ...prev];
        }
      });

      // 2. UPDATE LOCAL STORAGE CACHE INSTANTLY
      const cachedKey = `trading_learning_notes_${user.uid}`;
      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem(cachedKey);
          let currentList: LearningNote[] = [];
          if (cached) {
            currentList = JSON.parse(cached);
          }
          const index = currentList.findIndex(n => n.id === noteId);
          if (index > -1) {
            currentList[index] = updatedNote;
          } else {
            currentList.unshift(updatedNote);
          }
          localStorage.setItem(cachedKey, JSON.stringify(currentList));
        } catch (e) {
          console.error('Error updating cache on save:', e);
        }
      }

      // If viewing the note that is being edited, update its details instantly too
      if (selectedLearningNote?.id === noteId) {
        setSelectedLearningNote(updatedNote);
      }

      // 3. RESET INPUTS & CLOSE MODAL INSTANTLY
      setLearningNoteTitle('');
      setLearningNoteContent('');
      setLearningNoteImage('');
      setLearningNoteTags([]);
      setCustomTagInput('');
      setEditingLearningNote(null);
      setShowLearningModal(false);

      // 4. Silent sync
      loadLearningNotes(user.uid, true);

    } catch (error: any) {
      console.error('Error saving learning note to Google:', error);
      let userFriendlyError = 'သင်ခန်းစာမှတ်စု သိမ်းဆည်းစဉ် အမှားအယွင်းရှိခဲ့ပါသည်။';
      if (error instanceof Error) {
        userFriendlyError = `သိမ်းဆည်းရာတွင် အမှားရှိပါသည်: ${error.message}`;
      }
      setLearningError(userFriendlyError);
    } finally {
      setIsSavingLearningNote(false);
    }
  };

  const handleDeleteLearningNote = async (noteId: string) => {
    if (!user) return;
    if (!token || !spreadsheetId) {
      alert('Google Drive သို့ ချိတ်ဆက်ထားခြင်းမရှိပါ။ ကျေးဇူးပြု၍ Google standard OAuth signature စတင်ပါ။');
      return;
    }
    
    const targetNote = learningNotes.find(n => n.id === noteId);
    const docId = targetNote?.docId;
    const imageUrl = targetNote?.imageUrl;
    
    // Save previous state for rollback on failure
    const previousNotes = [...learningNotes];
    
    // 1. Optimistic UI delete
    setLearningNotes(prev => prev.filter(n => n.id !== noteId));
    if (selectedLearningNote?.id === noteId) {
      setSelectedLearningNote(null);
    }

    // Update cache instantly
    const cachedKey = `trading_learning_notes_${user.uid}`;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(cachedKey, JSON.stringify(previousNotes.filter(n => n.id !== noteId)));
      } catch (e) {
        console.error('Error updating cache on delete:', e);
      }
    }

    try {
      await deleteGoogleLearningNote(token, spreadsheetId, noteId, docId, imageUrl);
      // Silent refresh to sync state
      await loadLearningNotes(user.uid, true);
    } catch (error: any) {
      console.error('Error deleting note:', error);
      // Rollback state and cache on failure
      setLearningNotes(previousNotes);
      if (typeof window !== 'undefined') {
        localStorage.setItem(cachedKey, JSON.stringify(previousNotes));
      }
      alert('ဖျက်ရာတွင် အမှားအယွင်းရှိခဲ့ပါသည်');
    }
  };

  // --- Watchlist Handlers & Data Sync Engine ---
  const loadWatchlist = async (userId: string, isSilentRefresh = false, overrideToken?: string, overrideSpreadsheetId?: string) => {
    const activeToken = overrideToken || token;
    const activeSpreadsheetId = overrideSpreadsheetId || spreadsheetId;
    const cachedKey = `trading_watchlist_items_${userId}`;
    let hasLoadedFromCache = false;
    let localCount = 0;

    // 1. Load from cache first
    if (!isSilentRefresh && typeof window !== 'undefined') {
      const cached = localStorage.getItem(cachedKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setWatchlistItems(parsed);
            hasLoadedFromCache = true;
            localCount = parsed.length;
          }
        } catch (e) {
          console.error('Error loading cached watchlist:', e);
        }
      }
    }

    if (!activeToken || !activeSpreadsheetId) {
      return;
    }

    if (!hasLoadedFromCache && localCount === 0 && !isSilentRefresh) {
      setIsWatchlistLoading(true);
    }

    setWatchlistError(null);
    try {
      const items = await fetchGoogleWatchlist(activeToken, activeSpreadsheetId);
      if (items && items.length > 0) {
        // Sort: newest first
        const sortedItems = items.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        setWatchlistItems(sortedItems);
        if (typeof window !== 'undefined') {
          localStorage.setItem(cachedKey, JSON.stringify(sortedItems));
        }
      }
    } catch (err: any) {
      console.error('Error fetching watchlist from Google:', err);
      setWatchlistError('Watchlist ဒေတာများ ဆွဲယူရာတွင် အမှားအယွင်းရှိနေပါသည်။');
    } finally {
      setIsWatchlistLoading(false);
    }
  };

  // Auto-load Watchlist on user/token availability
  useEffect(() => {
    const timer = setTimeout(() => {
      if (user?.uid) {
        const cachedKey = `trading_watchlist_items_${user.uid}`;
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem(cachedKey);
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setWatchlistItems(parsed);
              }
            } catch (e) {
              console.error('Error parsing initial watchlist cache:', e);
            }
          }
        }
        if (token && spreadsheetId) {
          loadWatchlist(user.uid);
        }
      }
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token, spreadsheetId]);

  // Save or Update Watchlist Item
  const handleSaveWatchlistItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!watchlistPair.trim()) {
      setWatchlistError('Asset Pair (ဥပမာ: BTC/USDT, EUR/USD) ထည့်သွင်းရန် လိုအပ်ပါသည်!');
      return;
    }

    setIsSavingWatchlistItem(true);
    setWatchlistError(null);

    const itemId = editingWatchlistItem ? editingWatchlistItem.id : `wl-${Date.now()}`;
    const itemToSave: WatchlistItem = {
      id: itemId,
      pair: watchlistPair.trim().toUpperCase(),
      category: watchlistCategory,
      bias: watchlistBias,
      status: watchlistStatus,
      timeframe: watchlistTimeframe,
      keyLevels: watchlistKeyLevels.trim(),
      notes: watchlistNotes.trim(),
      imageUrl: watchlistImage,
      createdAt: editingWatchlistItem ? editingWatchlistItem.createdAt : new Date().toISOString(),
      docId: editingWatchlistItem?.docId || '',
      docUrl: editingWatchlistItem?.docUrl || '',
    };

    let updatedItem: WatchlistItem = { ...itemToSave };

    // 1. Instant Optimistic update in UI
    setWatchlistItems(prev => {
      const idx = prev.findIndex(item => item.id === itemId);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = updatedItem;
        return next;
      } else {
        return [updatedItem, ...prev];
      }
    });

    // 2. Instant LocalStorage update
    const cachedKey = user ? `trading_watchlist_items_${user.uid}` : 'trading_watchlist_items_guest';
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(cachedKey);
        let list: WatchlistItem[] = cached ? JSON.parse(cached) : [...defaultWatchlistItems];
        const idx = list.findIndex(i => i.id === itemId);
        if (idx > -1) {
          list[idx] = updatedItem;
        } else {
          list.unshift(updatedItem);
        }
        localStorage.setItem(cachedKey, JSON.stringify(list));
      } catch (e) {
        console.error('Error saving watchlist cache:', e);
      }
    }

    // Reset inputs and close modal
    setWatchlistPair('');
    setWatchlistKeyLevels('');
    setWatchlistNotes('');
    setWatchlistImage('');
    setEditingWatchlistItem(null);
    setShowWatchlistModal(false);

    // 3. Save to Google Sheet / Google Doc / Drive Folder in background
    if (token && spreadsheetId) {
      try {
        if (editingWatchlistItem) {
          const res = await updateGoogleWatchlistItem(token, spreadsheetId, itemToSave, editingWatchlistItem.imageUrl);
          if (res.imageUrl) {
            updatedItem.imageUrl = res.imageUrl;
            setWatchlistItems(prev => prev.map(i => i.id === itemId ? { ...i, imageUrl: res.imageUrl } : i));
          }
        } else {
          const res = await addGoogleWatchlistItem(token, spreadsheetId, itemToSave);
          updatedItem = {
            ...updatedItem,
            docId: res.docId,
            docUrl: res.docUrl,
            imageUrl: res.imageUrl || updatedItem.imageUrl,
          };
          setWatchlistItems(prev => prev.map(i => i.id === itemId ? updatedItem : i));
        }

        // Silent sync
        if (user?.uid) {
          loadWatchlist(user.uid, true);
        }
      } catch (error: any) {
        console.error('Error saving watchlist to Google:', error);
      } finally {
        setIsSavingWatchlistItem(false);
      }
    } else {
      setIsSavingWatchlistItem(false);
    }
  };

  // Delete Watchlist Item
  const handleDeleteWatchlistItem = async (itemId: string) => {
    const targetItem = watchlistItems.find(i => i.id === itemId);
    const docId = targetItem?.docId;
    const imageUrl = targetItem?.imageUrl;
    const prevItems = [...watchlistItems];

    // Optimistic delete
    setWatchlistItems(prev => prev.filter(i => i.id !== itemId));
    if (selectedWatchlistItem?.id === itemId) {
      setSelectedWatchlistItem(null);
    }

    const cachedKey = user ? `trading_watchlist_items_${user.uid}` : 'trading_watchlist_items_guest';
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(cachedKey, JSON.stringify(prevItems.filter(i => i.id !== itemId)));
      } catch (e) {
        console.error('Error updating watchlist cache on delete:', e);
      }
    }

    if (token && spreadsheetId) {
      try {
        await deleteGoogleWatchlistItem(token, spreadsheetId, itemId, docId, imageUrl);
        if (user?.uid) {
          await loadWatchlist(user.uid, true);
        }
      } catch (err) {
        console.error('Error deleting watchlist item on Google:', err);
      }
    }
  };

  // Quick Status change for Watchlist item
  const handleQuickWatchlistStatus = async (item: WatchlistItem, newStatus: 'Watching' | 'Setup Forming' | 'Ready to Enter' | 'Triggered' | 'Invalidated') => {
    const updated: WatchlistItem = { ...item, status: newStatus };
    setWatchlistItems(prev => prev.map(i => i.id === item.id ? updated : i));

    const cachedKey = user ? `trading_watchlist_items_${user.uid}` : 'trading_watchlist_items_guest';
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(cachedKey);
        if (cached) {
          const list = JSON.parse(cached);
          const idx = list.findIndex((i: any) => i.id === item.id);
          if (idx > -1) {
            list[idx] = updated;
            localStorage.setItem(cachedKey, JSON.stringify(list));
          }
        }
      } catch (e) {
        console.error('Error updating status in cache:', e);
      }
    }

    if (token && spreadsheetId) {
      try {
        await updateGoogleWatchlistItem(token, spreadsheetId, updated);
      } catch (err) {
        console.error('Error updating watchlist status on Google:', err);
      }
    }
  };

  // Convert Watchlist item to Trade Journal Entry
  const handleConvertWatchlistToTrade = (item: WatchlistItem) => {
    let nextNum = 1;
    if (trades && trades.length > 0) {
      const nums = trades
        .map(t => parseInt(t.tradeNumber, 10))
        .filter(n => !isNaN(n));
      if (nums.length > 0) {
        nextNum = Math.max(...nums) + 1;
      } else {
        nextNum = trades.length + 1;
      }
    }
    const paddedNum = nextNum.toString().padStart(3, '0');

    setEditingTrade(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      tradeNumber: paddedNum,
      pair: item.pair,
      entryPrice: '',
      sl: '',
      tp: '',
      rr: '',
      watchlist: `[${item.category} ${item.timeframe}] ${item.bias} Bias - ${item.status}. Key Levels: ${item.keyLevels || 'N/A'}`,
      winLoss: 'Pending',
      pnl: '',
      notes: item.notes || '',
      commitment: `Setup identified from Watchlist (${item.timeframe})`,
      tradePhoto: item.imageUrl || '',
      tradePhotoBefore: item.imageUrl || '',
      tradePhotoAfter: '',
    });
    setFormError(null);
    setShowFormModal(true);
  };

  // Handle Watchlist Image Change
  const handleImageChangeWatchlist = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 900;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          setWatchlistImage(dataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Filtered & Searched Watchlist items memo
  const filteredWatchlistItems = useMemo(() => {
    return watchlistItems.filter(item => {
      const matchCat = watchlistFilterCategory === 'ALL' || item.category === watchlistFilterCategory;
      const matchBias = watchlistFilterBias === 'ALL' || item.bias === watchlistFilterBias;
      const matchStatus = watchlistFilterStatus === 'ALL' || item.status === watchlistFilterStatus;
      const q = watchlistSearch.toLowerCase().trim();
      const matchSearch = !q || 
        item.pair.toLowerCase().includes(q) || 
        item.category.toLowerCase().includes(q) || 
        item.bias.toLowerCase().includes(q) || 
        (item.keyLevels && item.keyLevels.toLowerCase().includes(q)) || 
        (item.notes && item.notes.toLowerCase().includes(q));
      return matchCat && matchBias && matchStatus && matchSearch;
    });
  }, [watchlistItems, watchlistFilterCategory, watchlistFilterBias, watchlistFilterStatus, watchlistSearch]);

  const watchlistStats = useMemo(() => {
    const total = watchlistItems.length;
    const crypto = watchlistItems.filter(i => i.category === 'Crypto').length;
    const forex = watchlistItems.filter(i => i.category === 'Forex').length;
    const ready = watchlistItems.filter(i => i.status === 'Ready to Enter').length;
    const bullish = watchlistItems.filter(i => i.bias === 'Bullish').length;
    const bearish = watchlistItems.filter(i => i.bias === 'Bearish').length;
    return { total, crypto, forex, ready, bullish, bearish };
  }, [watchlistItems]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Limit maximum bounds to preserve crisp chart labels while staying safely under Firestore's 1MB limit
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 900;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Set JPEG quality to 75% (industry standard sweet spot: 10x smaller file sizes, visually identical)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          setLearningNoteImage(dataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoBeforeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 900;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          setFormData(prev => ({ ...prev, tradePhotoBefore: dataUrl }));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoAfterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 900;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          setFormData(prev => ({ ...prev, tradePhotoAfter: dataUrl }));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleTradePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 900;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          setFormData(prev => ({ ...prev, tradePhoto: dataUrl }));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const triggerRefresh = async () => {
    if (!token) return;
    if (spreadsheetId) await loadTrades(token, spreadsheetId);
    if (documentId) await loadDocContent(token, documentId);
    if (user?.uid) await loadLearningNotes(user.uid);
  };

  // Auto calculated suggested Risk/Reward and PnL
  const calculatedSuggestions = useMemo(() => {
    const entry = parseFloat(formData.entryPrice);
    const sl = parseFloat(formData.sl);
    const tp = parseFloat(formData.tp);

    if (isNaN(entry) || isNaN(sl) || isNaN(tp) || entry <= 0 || sl <= 0 || tp <= 0) {
      return { rr: '', suggestedPnlWin: '', suggestedPnlLoss: '' };
    }

    const risk = Math.abs(entry - sl);
    const reward = Math.abs(tp - entry);

    if (risk <= 0 || reward <= 0) {
      return { rr: '', suggestedPnlWin: '', suggestedPnlLoss: '' };
    }

    const ratio = reward / risk;
    const rrStr = `1:${ratio.toFixed(1)}`;
    const suggestedPnlWin = `+${ratio.toFixed(1)}R`;
    const suggestedPnlLoss = `-1R`;

    return { rr: rrStr, suggestedPnlWin, suggestedPnlLoss };
  }, [formData.entryPrice, formData.sl, formData.tp]);

function normalizeResultStatus(raw: string | undefined | null): 'TP' | 'SL' | 'Breakeven' | 'Trailing Stop' | 'Pending' {
  if (!raw) return 'Pending';
  const val = raw.toString().trim().toUpperCase();
  if (val === 'TP' || val === 'WIN' || val === 'TAKE PROFIT' || val === 'TAKEPROFIT' || val === 'PROFIT' || val === 'TARGET' || val === 'W' || val === 'WINNER') {
    return 'TP';
  }
  if (val === 'SL' || val === 'LOSS' || val === 'STOP LOSS' || val === 'STOPLOSS' || val === 'STOPPED' || val === 'STOP' || val === 'L' || val === 'LOSER') {
    return 'SL';
  }
  if (val === 'BREAKEVEN' || val === 'BREAK EVEN' || val === 'BE' || val === 'EVEN' || val === 'BREAK-EVEN') {
    return 'Breakeven';
  }
  if (val === 'TRAILING STOP' || val === 'TRAILING' || val === 'TS' || val === 'TRAILINGSTOP' || val === 'TRAIL' || val === 'TRAILING_STOP') {
    return 'Trailing Stop';
  }
  if (val === 'PENDING' || val === 'OPEN' || val === 'RUNNING' || val === 'WAITING' || val === 'ACTIVE') {
    return 'Pending';
  }
  if (val.startsWith('TP') || val.startsWith('WIN') || val.startsWith('TAKE')) return 'TP';
  if (val.startsWith('SL') || val.startsWith('LOSS') || val.startsWith('STOP')) return 'SL';
  if (val.startsWith('BE') || val.startsWith('BREAK')) return 'Breakeven';
  if (val.startsWith('TRAIL') || val.startsWith('TS')) return 'Trailing Stop';
  return 'Pending';
}

  // Handle Edit click
  const handleEditClick = (trade: Trade) => {
    const photos = (trade.tradePhoto || '').split(',');
    const beforePhoto = photos[0] || '';
    const afterPhoto = photos[1] || '';

    setEditingTrade(trade);
    setFormData({
      date: trade.date,
      tradeNumber: trade.tradeNumber || '',
      pair: trade.pair || '', // Pair / Asset
      entryPrice: trade.entryPrice ? trade.entryPrice.toString() : '',
      sl: trade.sl ? trade.sl.toString() : '',
      tp: trade.tp ? trade.tp.toString() : '',
      rr: trade.rr || '',
      watchlist: trade.watchlist || '', // Watchlist Details/ Setup
      winLoss: normalizeResultStatus(trade.winLoss), // Result (TP/SL)
      pnl: trade.pnl || '',
      notes: trade.notes || '', // Remarks/ Note
      commitment: trade.commitment || '', // Commitment
      tradePhoto: trade.tradePhoto || '', // Trade SS (B&F)
      tradePhotoBefore: beforePhoto,
      tradePhotoAfter: afterPhoto,
    });
    setFormError(null);
    setShowFormModal(true);
  };

  // Quick change result directly
  const handleQuickResultChange = async (trade: Trade, newStatus: 'TP' | 'SL' | 'Breakeven' | 'Trailing Stop' | 'Pending', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const normalized = normalizeResultStatus(newStatus);
    const updated: Trade = {
      ...trade,
      winLoss: normalized,
    };

    // Optimistic UI update
    setTrades(prev => {
      const next = prev.map(t => (t.row === trade.row || t.id === trade.id ? updated : t));
      if (typeof window !== 'undefined') {
        localStorage.setItem('trading_trades', JSON.stringify(next));
      }
      return next;
    });

    if (selectedTrade && (selectedTrade.row === trade.row || selectedTrade.id === trade.id)) {
      setSelectedTrade(updated);
    }

    if (token && spreadsheetId && trade.row) {
      try {
        await updateTradeRow(token, spreadsheetId, updated);
      } catch (err) {
        console.error('Failed to update result on sheet:', err);
      }
    }
  };

  // One-click cycle result status (Pending -> TP -> SL -> Breakeven -> Trailing Stop -> Pending)
  const cycleTradeResult = (trade: Trade, e: React.MouseEvent) => {
    e.stopPropagation();
    const current = normalizeResultStatus(trade.winLoss);
    const flow: Array<'Pending' | 'TP' | 'SL' | 'Breakeven' | 'Trailing Stop'> = ['Pending', 'TP', 'SL', 'Breakeven', 'Trailing Stop'];
    const currIdx = flow.indexOf(current);
    const nextStatus = flow[(currIdx + 1) % flow.length];
    handleQuickResultChange(trade, nextStatus, e);
  };

  // Open Add Trade Modal
  const handleAddClick = () => {
    // Determine the next trade number
    let nextNum = 1;
    if (trades && trades.length > 0) {
      const nums = trades
        .map(t => parseInt(t.tradeNumber, 10))
        .filter(n => !isNaN(n));
      if (nums.length > 0) {
        nextNum = Math.max(...nums) + 1;
      } else {
        nextNum = trades.length + 1;
      }
    }
    const paddedNum = nextNum.toString().padStart(3, '0');

    setEditingTrade(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      tradeNumber: paddedNum,
      pair: '',
      entryPrice: '',
      sl: '',
      tp: '',
      rr: '',
      watchlist: '',
      winLoss: 'Pending',
      pnl: '',
      notes: '',
      commitment: '',
      tradePhoto: '',
      tradePhotoBefore: '',
      tradePhotoAfter: '',
    });
    setFormError(null);
    setShowFormModal(true);
  };

  // Save Trade handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !spreadsheetId) {
      setFormError('Google Account ချိတ်ဆက်မှု မရှိသေးပါ။ ကျေးဇူးပြု၍ Connect လုပ်ပေးပါ။');
      return;
    }

    if (!formData.pair.trim()) {
      setFormError('Pair / Asset ထည့်သွင်းပေးရန် လိုအပ်ပါသည်။');
      return;
    }
    if (!formData.watchlist.trim()) {
      setFormError('Watchlist Details / Setup ထည့်သွင်းပေးရန် လိုအပ်ပါသည်။');
      return;
    }
    const entry = parseFloat(formData.entryPrice);
    if (isNaN(entry) || entry <= 0) {
      setFormError('Entry Price ကို မှန်ကန်သော ကိန်းဂဏန်း ထည့်သွင်းပေးပါ။');
      return;
    }

    const slVal = parseFloat(formData.sl) || 0;
    const tpVal = parseFloat(formData.tp) || 0;

    let processedPnl = formData.pnl.trim();
    if (formData.winLoss === 'SL' && processedPnl) {
      if (!processedPnl.startsWith('-')) {
        processedPnl = '-' + processedPnl;
      }
    } else if (formData.winLoss === 'TP' && processedPnl) {
      if (processedPnl.startsWith('-')) {
        processedPnl = processedPnl.substring(1).trim();
      }
      if (!processedPnl.startsWith('+')) {
        processedPnl = '+' + processedPnl;
      }
    }

    const photoCombined = (formData.tradePhotoBefore || formData.tradePhotoAfter)
      ? `${formData.tradePhotoBefore || ''},${formData.tradePhotoAfter || ''}`
      : (formData.tradePhoto || '');

    setIsFormSubmitting(true);
    try {
      if (editingTrade) {
        const updated: Trade = {
          row: editingTrade.row,
          id: editingTrade.id || `trade-${editingTrade.row}`,
          date: formData.date,
          tradeNumber: formData.tradeNumber.trim(),
          entryPrice: entry,
          sl: slVal,
          tp: tpVal,
          rr: formData.rr || calculatedSuggestions.rr || '',
          pair: formData.pair.toUpperCase(),
          watchlist: formData.watchlist,
          winLoss: normalizeResultStatus(formData.winLoss),
          pnl: processedPnl,
          notes: formData.notes,
          commitment: formData.commitment,
          tradePhoto: photoCombined,
          tradePhotoBefore: formData.tradePhotoBefore,
          tradePhotoAfter: formData.tradePhotoAfter,
        };

        // 1. Optimistic UI update: instantly update UI state and localStorage
        setTrades(prev => {
          const next = prev.map(t => (t.row === editingTrade.row || t.id === editingTrade.id ? updated : t));
          if (typeof window !== 'undefined') {
            localStorage.setItem('trading_trades', JSON.stringify(next));
          }
          return next;
        });

        if (selectedTrade && (selectedTrade.row === editingTrade.row || selectedTrade.id === editingTrade.id)) {
          setSelectedTrade(updated);
        }

        setShowFormModal(false);

        // 2. Persist to Google Sheet
        await updateTradeRow(token, spreadsheetId, updated);

        // 3. Re-sync silently to get any updated Google Drive URLs
        await loadTrades(token, spreadsheetId);
      } else {
        const newTrade: Omit<Trade, 'row'> = {
          id: `trade-${Date.now()}`,
          date: formData.date,
          tradeNumber: formData.tradeNumber.trim(),
          entryPrice: entry,
          sl: slVal,
          tp: tpVal,
          rr: formData.rr || calculatedSuggestions.rr || '',
          pair: formData.pair.toUpperCase(),
          watchlist: formData.watchlist,
          winLoss: normalizeResultStatus(formData.winLoss),
          pnl: processedPnl,
          notes: formData.notes,
          commitment: formData.commitment,
          tradePhoto: photoCombined,
          tradePhotoBefore: formData.tradePhotoBefore,
          tradePhotoAfter: formData.tradePhotoAfter,
        };

        setShowFormModal(false);

        // Persist to Google Sheet
        await addTrade(token, spreadsheetId, newTrade);

        // Reload trades from Google Sheet
        await loadTrades(token, spreadsheetId);
      }
    } catch (err: any) {
      console.error('Error saving trade:', err);
      setFormError('Google Sheets သို့ Data သိမ်းဆည်းစဉ် အမှားအယွင်း ဖြစ်ပေါ်ခဲ့ပါသည်။');
      if (token && spreadsheetId) {
        await loadTrades(token, spreadsheetId);
      }
    } finally {
      setIsFormSubmitting(false);
    }
  };

  // Delete Trade handler (made direct and iframe-safe)
  const handleDeleteClick = async (trade: Trade) => {
    if (!token || !spreadsheetId) return;

    // Optimistic delete
    setTrades(prev => {
      const next = prev.filter(t => t.row !== trade.row && t.id !== trade.id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('trading_trades', JSON.stringify(next));
      }
      return next;
    });

    if (selectedTrade && (selectedTrade.row === trade.row || selectedTrade.id === trade.id)) {
      setSelectedTrade(null);
    }

    setIsLoadingTrades(true);
    try {
      await deleteTradeRow(token, spreadsheetId, trade.row);
      await loadTrades(token, spreadsheetId);
    } catch (err) {
      console.error('Error deleting trade:', err);
      if (token && spreadsheetId) {
        await loadTrades(token, spreadsheetId);
      }
    } finally {
      setIsLoadingTrades(false);
    }
  };

  // Clear all trades and seed with the requested sample row
  const handleClearAndSeedClick = async () => {
    if (!token || !spreadsheetId) return;
    setIsLoadingTrades(true);
    try {
      await clearAndSeedTrades(token, spreadsheetId);
      await loadTrades(token, spreadsheetId);
      setShowResetConfirm(false);
    } catch (err) {
      console.error('Error clearing and seeding trades:', err);
    } finally {
      setIsLoadingTrades(false);
    }
  };

  // Filtered & Searched Trades
  const filteredTrades = useMemo(() => {
    return trades.filter(t => {
      const matchSearch = t.pair.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (t.watchlist && t.watchlist.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          t.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (t.tradeNumber && t.tradeNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (t.commitment && t.commitment.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchStatus = filterStatus === 'ALL' || 
                          (filterStatus === 'OPEN' && t.winLoss === 'Pending') || 
                          (filterStatus === 'CLOSED' && t.winLoss !== 'Pending');

      return matchSearch && matchStatus;
    });
  }, [trades, searchQuery, filterStatus]);

  // Helper to parse string PnL fields to numeric values for charts & stats
  const parsePnLValue = (pnlStr: string | null, winLoss?: string): number => {
    if (!pnlStr) return 0;
    const clean = pnlStr.replace(/[\s\$\+R]/gi, '');
    const parsed = parseFloat(clean);
    if (isNaN(parsed)) return 0;
    if (winLoss === 'SL') {
      return -Math.abs(parsed);
    } else if (winLoss === 'TP') {
      return Math.abs(parsed);
    }
    return pnlStr.includes('-') ? -Math.abs(parsed) : Math.abs(parsed);
  };

  // Helper to parse RR field (e.g., "1:2.5", "2.5R", "3", "-1")
  const parseRRValue = (rrStr: string | null, winLoss?: string): number => {
    if (!rrStr) {
      if (winLoss === 'TP') return 2.0;
      if (winLoss === 'SL') return -1.0;
      return 0;
    }
    const clean = rrStr.replace(/[^\d\.\-\:]/g, '');
    if (clean.includes(':')) {
      const parts = clean.split(':');
      const val = parseFloat(parts[1] || parts[0]);
      if (!isNaN(val)) {
        return winLoss === 'SL' ? -Math.abs(val) : Math.abs(val);
      }
    }
    const parsed = parseFloat(clean);
    if (isNaN(parsed)) return winLoss === 'SL' ? -1 : winLoss === 'TP' ? 2 : 0;
    return winLoss === 'SL' ? -Math.abs(parsed) : parsed;
  };

  // Filtered trades by Dashboard Timeframe
  const dashboardFilteredTrades = useMemo(() => {
    if (dashboardTimeframe === 'all') return trades;
    const now = new Date().getTime();
    const days = dashboardTimeframe === '7d' ? 7 : 30;
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return trades.filter(t => {
      if (!t.date) return true;
      const tTime = new Date(t.date).getTime();
      return isNaN(tTime) || tTime >= cutoff;
    });
  }, [trades, dashboardTimeframe]);

  // Analytics Metrics
  const metrics = useMemo(() => {
    const targetTrades = dashboardFilteredTrades;
    const totalTrades = targetTrades.length;
    const openTrades = targetTrades.filter(t => t.winLoss === 'Pending').length;
    const closedTrades = targetTrades.filter(t => t.winLoss !== 'Pending');
    const totalClosed = closedTrades.length;
    
    const netPnL = targetTrades.reduce((sum, t) => sum + parsePnLValue(t.pnl, t.winLoss), 0);
    
    const winTradesList = closedTrades.filter(t => t.winLoss === 'TP' || (t.winLoss === 'Trailing Stop' && parsePnLValue(t.pnl, t.winLoss) > 0));
    const lossTradesList = closedTrades.filter(t => t.winLoss === 'SL' || (t.winLoss === 'Trailing Stop' && parsePnLValue(t.pnl, t.winLoss) < 0));
    const beTradesList = closedTrades.filter(t => t.winLoss === 'Breakeven');
    
    const winTrades = winTradesList.length;
    const lossTrades = lossTradesList.length;
    const winRate = totalClosed > 0 ? (winTrades / totalClosed) * 100 : 0;
    
    const totalWins = winTradesList.reduce((sum, t) => sum + Math.max(0, parsePnLValue(t.pnl, t.winLoss)), 0);
    const totalLosses = lossTradesList.reduce((sum, t) => sum + Math.min(0, parsePnLValue(t.pnl, t.winLoss)), 0);
    
    const avgWin = winTrades > 0 ? totalWins / winTrades : 0;
    const avgLoss = lossTrades > 0 ? totalLosses / lossTrades : 0;
    const profitFactor = Math.abs(totalLosses) > 0 ? totalWins / Math.abs(totalLosses) : totalWins > 0 ? totalWins : 0;
    const expectancy = totalClosed > 0 ? ((winRate / 100) * avgWin) + (((100 - winRate) / 100) * avgLoss) : 0;

    const bestTrade = targetTrades.reduce((best, t) => {
      const val = parsePnLValue(t.pnl, t.winLoss);
      return val > best ? val : best;
    }, -Infinity);

    const worstTrade = targetTrades.reduce((worst, t) => {
      const val = parsePnLValue(t.pnl, t.winLoss);
      return val < worst ? val : worst;
    }, Infinity);

    // Calculate streaks
    let currentStreak = 0;
    let maxWinStreak = 0;
    let tempStreak = 0;
    for (const t of closedTrades) {
      const isWin = t.winLoss === 'TP' || (t.winLoss === 'Trailing Stop' && parsePnLValue(t.pnl, t.winLoss) > 0);
      if (isWin) {
        tempStreak++;
        if (tempStreak > maxWinStreak) maxWinStreak = tempStreak;
      } else if (t.winLoss === 'SL') {
        tempStreak = 0;
      }
    }
    // Current streak (from newest)
    const reversed = [...closedTrades].reverse();
    if (reversed.length > 0) {
      const firstWin = reversed[0].winLoss === 'TP' || (reversed[0].winLoss === 'Trailing Stop' && parsePnLValue(reversed[0].pnl, reversed[0].winLoss) > 0);
      for (const t of reversed) {
        const isWin = t.winLoss === 'TP' || (t.winLoss === 'Trailing Stop' && parsePnLValue(t.pnl, t.winLoss) > 0);
        if (firstWin && isWin) currentStreak++;
        else if (!firstWin && t.winLoss === 'SL') currentStreak--;
        else break;
      }
    }

    return {
      totalTrades,
      openTrades,
      totalClosed,
      netPnL,
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
      expectancy,
      winTrades,
      lossTrades,
      beTrades: beTradesList.length,
      maxWinStreak,
      currentStreak,
      bestTrade: bestTrade === -Infinity ? 0 : bestTrade,
      worstTrade: worstTrade === Infinity ? 0 : worstTrade,
    };
  }, [dashboardFilteredTrades]);

  // Chart data: Cumulative profit/loss over time (Starts strictly at 0 baseline)
  const cumulativeChartData = useMemo(() => {
    const sorted = [...dashboardFilteredTrades]
      .filter(t => t.winLoss !== 'Pending' && t.pnl)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const result = [];
    let runningTotal = 0;
    let runningRR = 0;
    let peakTotal = 0;
    let maxDD = 0;

    // Start point strictly at 0 origin baseline
    result.push({
      name: '0',
      fullDate: sorted.length > 0 && sorted[0].date ? `${sorted[0].date} (Baseline)` : 'Initial Baseline',
      tradeNum: '0',
      pnl: 0,
      total: 0,
      rrVal: 0,
      runningRR: 0,
      peakTotal: 0,
      drawdown: 0,
      pair: 'Baseline',
      type: 'START',
      winLoss: 'Initial',
      index: 0
    });

    let index = 1;
    for (const t of sorted) {
      const pnlVal = parsePnLValue(t.pnl, t.winLoss);
      const rrVal = parseRRValue(t.rr, t.winLoss);
      runningTotal += pnlVal;
      runningRR += rrVal;

      if (runningTotal > peakTotal) peakTotal = runningTotal;
      const currentDD = peakTotal - runningTotal;
      if (currentDD > maxDD) maxDD = currentDD;

      result.push({
        name: t.date ? t.date.slice(5) : `#${index}`,
        fullDate: t.date || 'Unknown',
        tradeNum: t.no || `#${index}`,
        pnl: pnlVal,
        total: parseFloat(runningTotal.toFixed(2)),
        rrVal: parseFloat(rrVal.toFixed(1)),
        runningRR: parseFloat(runningRR.toFixed(1)),
        peakTotal: parseFloat(peakTotal.toFixed(2)),
        drawdown: parseFloat(currentDD.toFixed(2)),
        pair: t.pair || 'General',
        type: t.type || 'BUY',
        winLoss: t.winLoss,
        index
      });
      index++;
    }
    return result;
  }, [dashboardFilteredTrades]);

  // Directional performance (BUY vs SELL breakdown)
  const directionPerformance = useMemo(() => {
    const closed = dashboardFilteredTrades.filter(t => t.winLoss !== 'Pending' && t.pnl);
    const buys = closed.filter(t => (t.type || 'BUY').toUpperCase() === 'BUY');
    const sells = closed.filter(t => (t.type || '').toUpperCase() === 'SELL');

    const buyWins = buys.filter(t => t.winLoss === 'TP' || (t.winLoss === 'Trailing Stop' && parsePnLValue(t.pnl, t.winLoss) > 0)).length;
    const sellWins = sells.filter(t => t.winLoss === 'TP' || (t.winLoss === 'Trailing Stop' && parsePnLValue(t.pnl, t.winLoss) > 0)).length;

    const buyPnL = buys.reduce((acc, t) => acc + parsePnLValue(t.pnl, t.winLoss), 0);
    const sellPnL = sells.reduce((acc, t) => acc + parsePnLValue(t.pnl, t.winLoss), 0);

    return {
      buysCount: buys.length,
      buyWins,
      buyWinRate: buys.length > 0 ? (buyWins / buys.length) * 100 : 0,
      buyPnL: parseFloat(buyPnL.toFixed(2)),
      sellsCount: sells.length,
      sellWins,
      sellWinRate: sells.length > 0 ? (sellWins / sells.length) * 100 : 0,
      sellPnL: parseFloat(sellPnL.toFixed(2)),
    };
  }, [dashboardFilteredTrades]);

  // Asset Pair Performance Leaderboard
  const pairPerformanceData = useMemo(() => {
    const map: Record<string, { trades: number; wins: number; pnl: number }> = {};
    dashboardFilteredTrades.forEach(t => {
      const pair = t.pair || 'Unknown';
      if (!map[pair]) map[pair] = { trades: 0, wins: 0, pnl: 0 };
      map[pair].trades++;
      const pnl = parsePnLValue(t.pnl, t.winLoss);
      map[pair].pnl += pnl;
      if (t.winLoss === 'TP' || (t.winLoss === 'Trailing Stop' && pnl > 0)) {
        map[pair].wins++;
      }
    });
    return Object.keys(map)
      .map(pair => ({
        pair,
        trades: map[pair].trades,
        wins: map[pair].wins,
        winRate: map[pair].trades > 0 ? (map[pair].wins / map[pair].trades) * 100 : 0,
        pnl: parseFloat(map[pair].pnl.toFixed(2))
      }))
      .sort((a, b) => b.pnl - a.pnl);
  }, [dashboardFilteredTrades]);

  // Chart data: Pair distribution
  const pairChartData = useMemo(() => {
    const distribution: Record<string, number> = {};
    dashboardFilteredTrades.forEach(t => {
      distribution[t.pair] = (distribution[t.pair] || 0) + 1;
    });
    return Object.keys(distribution).map(key => ({
      name: key,
      value: distribution[key]
    }));
  }, [dashboardFilteredTrades]);

  if (!mounted) return null;

  if (isAuthLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-200 ${
        isDarkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-slate-50 text-slate-800'
      }`}>
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="h-10 w-10 text-slate-500 dark:text-zinc-400 animate-spin" />
          <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">စနစ်အား စတင်ပြင်ဆင်နေပါသည်...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 font-sans selection:bg-slate-500/20 antialiased ${
      isDarkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-slate-50 text-slate-800'
    }`}>
      {/* Sidebar Navigation (Visible on Desktop, hidden on Mobile) */}
      {!needsAuth && (
        <aside className={`fixed top-0 bottom-0 left-0 z-40 w-64 border-r hidden md:block transition-transform ${
          isDarkMode 
            ? 'bg-zinc-900/50 border-zinc-800/80 text-zinc-200' 
            : 'bg-white border-slate-200/80 text-slate-700'
        }`}>
          <div className="flex flex-col h-full px-4 py-6">
            {/* Logo/Title */}
            <div className="flex items-center space-x-3 mb-8 px-2">
              <div className="bg-slate-950 dark:bg-zinc-100 text-white dark:text-zinc-950 p-2 rounded-xl shadow-sm">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <h2 className={`font-bold tracking-tight text-md ${isDarkMode ? 'text-zinc-100' : 'text-slate-900'}`}>Trading Journal</h2>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-semibold uppercase tracking-wider">Google Workspace Sync</span>
              </div>
            </div>

            {/* Menu Items */}
            <nav className="flex-1 space-y-1">
              <button
                onClick={() => { setActiveTab('overview'); setIsMobileMenuOpen(false); }}
                className={`flex items-center space-x-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                  activeTab === 'overview'
                    ? 'bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-sm'
                    : isDarkMode ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200' : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                }`}
              >
                <Activity className="h-4 w-4" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => { setActiveTab('watchlist'); setIsMobileMenuOpen(false); }}
                className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                  activeTab === 'watchlist'
                    ? 'bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-sm'
                    : isDarkMode ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200' : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Eye className="h-4 w-4 text-amber-500" />
                  <span>Watchlist</span>
                </div>
                {watchlistItems.length > 0 && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    activeTab === 'watchlist' ? 'bg-slate-800 dark:bg-zinc-200 text-white dark:text-zinc-950' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  }`}>
                    {watchlistItems.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => { setActiveTab('alignment'); setIsMobileMenuOpen(false); }}
                className={`flex items-center space-x-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                  activeTab === 'alignment'
                    ? 'bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-sm'
                    : isDarkMode ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200' : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                }`}
              >
                <Percent className="h-4 w-4" />
                <span>Alignment Calculator</span>
              </button>

              <button
                onClick={() => { setActiveTab('journal'); setIsMobileMenuOpen(false); }}
                className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                  activeTab === 'journal'
                    ? 'bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-sm'
                    : isDarkMode ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200' : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <BookOpen className="h-4 w-4" />
                  <span>Trading Journal</span>
                </div>
                {trades.length > 0 && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    activeTab === 'journal' ? 'bg-slate-800 dark:bg-zinc-200 text-white dark:text-zinc-950' : 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300'
                  }`}>
                    {trades.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => { setActiveTab('micro'); setIsMobileMenuOpen(false); }}
                className={`flex items-center space-x-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                  activeTab === 'micro'
                    ? 'bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-sm'
                    : isDarkMode ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200' : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                }`}
              >
                <Target className="h-4 w-4" />
                <span>Micro Analysis</span>
              </button>

              <button
                onClick={() => { setActiveTab('macro'); setIsMobileMenuOpen(false); }}
                className={`flex items-center space-x-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                  activeTab === 'macro'
                    ? 'bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-sm'
                    : isDarkMode ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200' : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                }`}
              >
                <Globe className="h-4 w-4" />
                <span>Macro Analysis</span>
              </button>

              <button
                onClick={() => { setActiveTab('learning'); setIsMobileMenuOpen(false); }}
                className={`flex items-center space-x-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                  activeTab === 'learning'
                    ? 'bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-sm'
                    : isDarkMode ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200' : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                }`}
              >
                <ImageIcon className="h-4 w-4" />
                <span>Learning Notes</span>
              </button>
            </nav>

            {/* Sidebar Footer */}
            <div className="pt-4 border-t border-zinc-200/50 dark:border-zinc-800/80">
              {user && (
                <div className="flex items-center space-x-3 px-2 mb-4">
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt="Profile" 
                      className="h-9 w-9 rounded-full border border-slate-200 dark:border-zinc-700 shadow-xs"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-9 w-9 bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-200 font-bold rounded-full flex items-center justify-center border border-slate-200 dark:border-zinc-700">
                      {(user.displayName || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="truncate flex-1">
                    <p className={`text-xs font-semibold truncate ${isDarkMode ? 'text-zinc-200' : 'text-slate-900'}`}>{user.displayName || 'Trader'}</p>
                    <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between px-2">
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className={`p-2 rounded-xl transition-all duration-150 cursor-pointer ${
                    isDarkMode ? 'bg-zinc-800 text-yellow-400 hover:text-yellow-300 hover:bg-zinc-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                  title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
                >
                  {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
                {user && (
                  <button
                    onClick={handleLogout}
                    className={`p-2 rounded-xl transition-all duration-150 flex items-center space-x-1.5 text-xs font-semibold cursor-pointer ${
                      isDarkMode ? 'text-zinc-400 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-500 hover:text-red-500 hover:bg-red-50'
                    }`}
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Mobile Navigation Header */}
      {!needsAuth && (
        <header className={`sticky top-0 z-40 border-b md:hidden transition-all ${
          isDarkMode ? 'bg-zinc-950 border-zinc-800/80 text-zinc-100' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`p-2 rounded-lg cursor-pointer ${isDarkMode ? 'hover:bg-zinc-850 text-zinc-100' : 'hover:bg-slate-100 text-slate-700'}`}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <span className="font-bold tracking-tight text-sm">Trading Journal</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-lg cursor-pointer ${isDarkMode ? 'text-yellow-400' : 'text-slate-500'}`}
              >
                {isDarkMode ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
              </button>
              {user && (
                <img 
                  src={user.photoURL || ''} 
                  alt="Profile" 
                  className="h-7 w-7 rounded-full"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
          </div>
          
          <AnimatePresence>
            {isMobileMenuOpen && (
              <>
                {/* Backdrop Overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="fixed inset-0 bg-black/60 z-50 md:hidden"
                />

                {/* Sidebar Drawer */}
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className={`fixed left-0 top-0 bottom-0 h-full w-[280px] max-w-[85vw] z-50 flex flex-col shadow-2xl overflow-hidden md:hidden ${
                    isDarkMode ? 'bg-zinc-950 text-zinc-100 border-r border-zinc-800' : 'bg-white text-slate-800 border-r border-slate-200'
                  }`}
                >
                  {/* Drawer Header */}
                  <div className={`px-5 py-4 flex items-center justify-between border-b shrink-0 ${
                    isDarkMode ? 'border-zinc-900 bg-zinc-900/30' : 'border-slate-100 bg-slate-50/50'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-zinc-800 text-emerald-400' : 'bg-slate-100 text-slate-800'}`}>
                        <Activity className="h-4 w-4" />
                      </div>
                      <span className="font-extrabold tracking-tight text-sm">Trading Journal</span>
                    </div>
                    <button
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`p-1.5 rounded-lg cursor-pointer ${
                        isDarkMode ? 'hover:bg-zinc-850 text-zinc-400 hover:text-zinc-100' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <X className="h-4.5 w-4.5" />
                    </button>
                  </div>

                  {/* Drawer Content */}
                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5">
                    <button
                      onClick={() => { setActiveTab('overview'); setIsMobileMenuOpen(false); }}
                      className={`flex items-center space-x-3 w-full px-3 py-3 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer transition-all duration-150 ${
                        activeTab === 'overview' ? 'bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-950' : isDarkMode ? 'text-zinc-400 hover:bg-zinc-900' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Activity className="h-4 w-4" />
                      <span>Dashboard</span>
                    </button>

                    <button
                      onClick={() => { setActiveTab('watchlist'); setIsMobileMenuOpen(false); }}
                      className={`flex items-center justify-between w-full px-3 py-3 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer transition-all duration-150 ${
                        activeTab === 'watchlist' ? 'bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-950' : isDarkMode ? 'text-zinc-400 hover:bg-zinc-900' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Eye className="h-4 w-4 text-amber-500" />
                        <span>Watchlist</span>
                      </div>
                      {watchlistItems.length > 0 && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          activeTab === 'watchlist' ? 'bg-slate-800 dark:bg-zinc-200 text-white dark:text-zinc-950' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        }`}>
                          {watchlistItems.length}
                        </span>
                      )}
                    </button>
                    
                    <button
                      onClick={() => { setActiveTab('alignment'); setIsMobileMenuOpen(false); }}
                      className={`flex items-center space-x-3 w-full px-3 py-3 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer transition-all duration-150 ${
                        activeTab === 'alignment' ? 'bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-950' : isDarkMode ? 'text-zinc-400 hover:bg-zinc-900' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Percent className="h-4 w-4" />
                      <span>Alignment Calculator</span>
                    </button>

                    <button
                      onClick={() => { setActiveTab('journal'); setIsMobileMenuOpen(false); }}
                      className={`flex items-center space-x-3 w-full px-3 py-3 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer transition-all duration-150 ${
                        activeTab === 'journal' ? 'bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-950' : isDarkMode ? 'text-zinc-400 hover:bg-zinc-900' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <BookOpen className="h-4 w-4" />
                      <span>Trading Journal ({trades.length})</span>
                    </button>
                    
                    <button
                      onClick={() => { setActiveTab('micro'); setIsMobileMenuOpen(false); }}
                      className={`flex items-center space-x-3 w-full px-3 py-3 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer transition-all duration-150 ${
                        activeTab === 'micro' ? 'bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-950' : isDarkMode ? 'text-zinc-400 hover:bg-zinc-900' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Target className="h-4 w-4" />
                      <span>Micro Analysis</span>
                    </button>
                    
                    <button
                      onClick={() => { setActiveTab('macro'); setIsMobileMenuOpen(false); }}
                      className={`flex items-center space-x-3 w-full px-3 py-3 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer transition-all duration-150 ${
                        activeTab === 'macro' ? 'bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-950' : isDarkMode ? 'text-zinc-400 hover:bg-zinc-900' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Globe className="h-4 w-4" />
                      <span>Macro Analysis</span>
                    </button>

                    <button
                      onClick={() => { setActiveTab('learning'); setIsMobileMenuOpen(false); }}
                      className={`flex items-center space-x-3 w-full px-3 py-3 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer transition-all duration-150 ${
                        activeTab === 'learning' ? 'bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-950' : isDarkMode ? 'text-zinc-400 hover:bg-zinc-900' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <ImageIcon className="h-4 w-4" />
                      <span>Learning Notes</span>
                    </button>
                  </div>

                  {/* Drawer Footer */}
                  <div className={`p-4 border-t shrink-0 ${
                    isDarkMode ? 'border-zinc-900 bg-zinc-900/10' : 'border-slate-100 bg-slate-50/20'
                  }`}>
                    {user && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <img 
                            src={user.photoURL || ''} 
                            alt="Profile" 
                            className="h-8 w-8 rounded-full border border-slate-200 dark:border-zinc-800"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold truncate max-w-[120px]">{user.displayName}</span>
                            <span className="text-[9px] text-slate-400 dark:text-zinc-500 truncate max-w-[120px]">{user.email}</span>
                          </div>
                        </div>
                        <button
                          onClick={handleLogout}
                          className={`p-2 rounded-xl transition-all duration-150 cursor-pointer ${
                            isDarkMode ? 'text-zinc-500 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                          }`}
                          title="Sign Out"
                        >
                          <LogOut className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </header>
      )}

      {/* Main Body content area */}
      <div className={`flex-1 flex flex-col ${needsAuth ? '' : 'md:pl-64'}`}>
        {!needsAuth && (
          <header className={`hidden md:flex items-center justify-between px-6 py-3.5 border-b sticky top-0 z-30 transition-all ${
            isDarkMode ? 'bg-zinc-950/80 border-zinc-800/80 backdrop-blur-md' : 'bg-white/80 border-slate-200/80 backdrop-blur-md'
          }`}>
            {/* View Breadcrumb / Active Context */}
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-xl ${
                isDarkMode ? 'bg-zinc-900 text-emerald-400 border border-zinc-800' : 'bg-slate-100 text-slate-800 border border-slate-200'
              }`}>
                {activeTab === 'overview' && <Activity className="h-4 w-4" />}
                {activeTab === 'watchlist' && <Eye className="h-4 w-4 text-amber-500" />}
                {activeTab === 'alignment' && <Percent className="h-4 w-4 text-amber-500" />}
                {activeTab === 'journal' && <Layers className="h-4 w-4" />}
                {activeTab === 'strategy' && <BookOpen className="h-4 w-4" />}
                {activeTab === 'notes' && <StickyNote className="h-4 w-4" />}
                {activeTab === 'learning' && <ImageIcon className="h-4 w-4 text-teal-400" />}
                {activeTab === 'micro' && <Zap className="h-4 w-4 text-amber-400" />}
                {activeTab === 'macro' && <Globe className="h-4 w-4 text-sky-400" />}
                {activeTab === 'fomc' && <Calendar className="h-4 w-4" />}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-sm font-extrabold tracking-tight">
                    {activeTab === 'overview' && 'Trading Analytics & Performance'}
                    {activeTab === 'watchlist' && 'Crypto & Forex Watchlist'}
                    {activeTab === 'alignment' && 'Position Alignment Calculator'}
                    {activeTab === 'journal' && 'Trading Journal'}
                    {activeTab === 'learning' && 'Learning Notes & Strategy Vault'}
                    {activeTab === 'strategy' && 'Trading Playbook & Strategy'}
                    {activeTab === 'notes' && 'Learning Notes & Case Studies'}
                    {activeTab === 'micro' && 'Micro Framework (LTF Checklist)'}
                    {activeTab === 'macro' && 'Macro Framework (HTF Matrix)'}
                    {activeTab === 'fomc' && 'FOMC Economic Calendar & Fed Watch'}
                  </h1>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-100 text-slate-600'
                  }`}>
                    Live
                  </span>
                </div>
                <p className={`text-[11px] font-medium ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                  {activeTab === 'overview' && 'Comprehensive statistics, PnL curve & execution metrics'}
                  {activeTab === 'watchlist' && `${watchlistItems.length} Setups tracked • Synced with Google Sheets & Drive`}
                  {activeTab === 'alignment' && 'Precision position sizing, isolated leverage alignment & SL distance engine'}
                  {activeTab === 'journal' && `${filteredTrades.length} Trades recorded • Synced with Google Sheets`}
                  {activeTab === 'learning' && `${learningNotes.length} Lessons & Case Studies stored in Google Drive`}
                  {activeTab === 'strategy' && 'Document your setups, risk management rules & execution criteria'}
                  {activeTab === 'notes' && 'Visual chart breakdowns, lessons learned & market observations'}
                  {activeTab === 'micro' && 'Lower Timeframe execution triggers, FVG & liquidity sweeps'}
                  {activeTab === 'macro' && 'Higher Timeframe bias, demand/supply zones & macro sentiment'}
                  {activeTab === 'fomc' && 'Federal Reserve meeting dates, rate projections & CPI/NFP tracker'}
                </p>
              </div>
            </div>

            {/* Right side: Market Sessions & Quick Actions */}
            <div className="flex items-center space-x-3">
              {/* Live Market Sessions */}
              <div className={`hidden xl:flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                isDarkMode ? 'bg-zinc-900/60 border-zinc-800 text-zinc-300' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <Clock className="h-3.5 w-3.5 text-emerald-500" />
                <span className="font-mono text-[11px] font-bold text-zinc-400">{marketSessions.timeStr}</span>
                <span className="text-zinc-300 dark:text-zinc-700">|</span>
                
                {/* NY */}
                <span className={`inline-flex items-center space-x-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  marketSessions.nyOpen 
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' 
                    : isDarkMode ? 'text-zinc-500' : 'text-slate-400'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${marketSessions.nyOpen ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                  <span>NY</span>
                </span>

                {/* London */}
                <span className={`inline-flex items-center space-x-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  marketSessions.londonOpen 
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' 
                    : isDarkMode ? 'text-zinc-500' : 'text-slate-400'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${marketSessions.londonOpen ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                  <span>LDN</span>
                </span>

                {/* Tokyo */}
                <span className={`inline-flex items-center space-x-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  marketSessions.tokyoOpen 
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' 
                    : isDarkMode ? 'text-zinc-500' : 'text-slate-400'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${marketSessions.tokyoOpen ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                  <span>TKO</span>
                </span>
              </div>

              {/* Google Sheets Sync Pill */}
              {spreadsheetId && (
                <a
                  href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`hidden lg:inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                    isDarkMode 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' 
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                  }`}
                  title="Google Sheets တွင် ဖွင့်ရန် (Open in Google Sheets)"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Sheets Synced</span>
                  <ExternalLink className="h-3 w-3 opacity-70" />
                </a>
              )}

              {/* Quick Add Trade CTA */}
              <button
                onClick={handleAddClick}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-zinc-950 shadow-md shadow-emerald-500/10 transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>Add Trade</span>
              </button>

              {/* Theme Toggle */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  isDarkMode 
                    ? 'bg-zinc-900 border-zinc-800 text-amber-400 hover:bg-zinc-800' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
          </header>
        )}

        <main className={`flex-1 w-full py-6 sm:py-8 transition-all ${
          activeTab === 'journal' ? 'px-2 sm:px-4 lg:px-5' : 'px-4 sm:px-8 lg:px-10'
        }`}>
        
        {/* If user needs authentication, display sleek, modern, clutter-free login view */}
        {needsAuth ? (
          <div className="min-h-[75vh] flex flex-col items-center justify-center relative py-8 px-4">
            {/* Ambient Lighting */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-[100px] pointer-events-none opacity-20 ${
              isDarkMode ? 'bg-emerald-500' : 'bg-emerald-600'
            }`} />

            {/* Main Auth Container */}
            <div className={`w-full max-w-sm sm:max-w-md rounded-3xl border transition-all relative z-10 p-8 sm:p-10 shadow-2xl backdrop-blur-2xl ${
              isDarkMode
                ? 'bg-zinc-900/80 border-zinc-800 text-zinc-100 shadow-black/60'
                : 'bg-white/90 border-slate-200/80 text-slate-800 shadow-slate-200/60'
            }`}>
              {/* Header & Logo */}
              <div className="flex flex-col items-center text-center mb-8">
                <div className="relative mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-zinc-950 shadow-lg shadow-emerald-500/25">
                    <TrendingUp className="h-7 w-7 stroke-[2.2]" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 p-1 bg-zinc-900 rounded-full border border-zinc-700">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Trading Journal
                </h2>
                <p className={`text-xs sm:text-sm mt-2 max-w-xs ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                  အရောင်းအဝယ်မှတ်တမ်းများနှင့် Performance အား စနစ်တကျ စောင့်ကြည့်မှတ်သားပါ
                </p>
              </div>

              {/* Error Notice */}
              {authError && (
                <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-left flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-rose-500">အကောင့်ဝင်ရန် မအောင်မြင်ပါ</p>
                    <p className={`text-[11px] mt-0.5 leading-relaxed ${isDarkMode ? 'text-rose-300' : 'text-rose-700'}`}>{authError}</p>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="space-y-4">
                {isAuthLoading ? (
                  <div className={`w-full py-3.5 px-4 rounded-2xl border flex items-center justify-center space-x-2.5 text-sm font-semibold ${
                    isDarkMode ? 'bg-zinc-800/80 border-zinc-700 text-zinc-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}>
                    <RefreshCw className="h-4 w-4 animate-spin text-emerald-500" />
                    <span>Google Authentication စတင်နေပါသည်...</span>
                  </div>
                ) : (
                  <button
                    onClick={handleLogin}
                    className={`w-full py-4 px-6 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center space-x-3 transition-all duration-200 cursor-pointer shadow-lg active:scale-[0.98] ${
                      isDarkMode
                        ? 'bg-white hover:bg-zinc-100 text-zinc-950 shadow-white/5 hover:shadow-xl hover:shadow-white/10'
                        : 'bg-zinc-950 hover:bg-zinc-850 text-white shadow-zinc-950/20 hover:shadow-xl'
                    }`}
                  >
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5 shrink-0">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                    <span>Sign in with Google</span>
                  </button>
                )}

                <p className={`text-[11px] text-center font-medium ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                  Google Drive ရှိ သင့်ကိုယ်ပိုင် Sheets & Docs ဖြင့်သာ သိမ်းဆည်းပါသည်
                </p>
              </div>

              {/* Minimalist Feature List */}
              <div className={`mt-8 pt-6 border-t space-y-2.5 ${
                isDarkMode ? 'border-zinc-800/80 text-zinc-400' : 'border-slate-100 text-slate-500'
              }`}>
                <div className="flex items-center space-x-2.5 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Real-time Trade Analytics & Expectancy</span>
                </div>
                <div className="flex items-center space-x-2.5 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  <span>Direct Google Sheets & Docs Cloud Sync</span>
                </div>
                <div className="flex items-center space-x-2.5 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span>Private, Secure & Zero Server Storage</span>
                </div>
              </div>
            </div>
          </div>
        ) : (isConnectingDrive && !spreadsheetId) ? (
          /* Connecting to Drive spinner - Redesigned as Premium Modern UI */
          <div className="max-w-md mx-auto my-12 relative">
            <style>{`
              @keyframes driveProgress {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(250%); }
              }
              .animate-drive-progress {
                animation: driveProgress 2s infinite cubic-bezier(0.4, 0, 0.2, 1);
              }
            `}</style>
            
            <div className={`relative overflow-hidden p-8 sm:p-10 rounded-2xl border text-center transition-all shadow-xl ${
              isDarkMode 
                ? 'bg-zinc-900 border-zinc-800/80 text-zinc-100 shadow-black/40' 
                : 'bg-white border-slate-200/80 text-slate-800 shadow-slate-200/50'
            }`}>
              {/* Premium Ambient Background Glow */}
              <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors ${
                isDarkMode ? 'bg-teal-500/20' : 'bg-teal-500/15'
              }`}></div>

              <div className="relative z-10 flex flex-col items-center">
                {/* Visual Icon Header */}
                <div className="relative mb-6">
                  <div className={`absolute inset-0 rounded-full animate-ping opacity-15 scale-125 ${
                    isDarkMode ? 'bg-teal-400' : 'bg-teal-400'
                  }`}></div>
                  <div className={`relative p-4 rounded-2xl shadow-md border ${
                    isDarkMode 
                      ? 'bg-zinc-800/80 border-zinc-700/80 text-teal-400' 
                      : 'bg-slate-50 border-slate-100 text-teal-600'
                  }`}>
                    {/* Cloud Drive Sync icon */}
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                    </svg>
                  </div>
                </div>

                <h3 className="text-lg font-bold tracking-tight mb-2">
                  Google Drive နှင့် ချိတ်ဆက်နေပါသည်
                </h3>
                <p className={`text-xs max-w-xs mx-auto mb-6 leading-relaxed ${
                  isDarkMode ? 'text-zinc-400' : 'text-slate-500'
                }`}>
                  သင့် account ရှိ Trading Journal Sheets နှင့် Notes Docs များကို ရှာဖွေပြင်ဆင်နေပါသည်။
                </p>

                {/* Highly Responsive Custom Progress Bar */}
                <div className={`w-full max-w-xs h-1 rounded-full overflow-hidden relative mb-8 ${
                  isDarkMode ? 'bg-zinc-800' : 'bg-slate-100'
                }`}>
                  <div className={`absolute top-0 bottom-0 left-0 bg-gradient-to-r ${
                    isDarkMode ? 'from-teal-500 to-teal-500' : 'from-teal-500 to-teal-500'
                  } animate-drive-progress rounded-full`} style={{ width: '40%' }}></div>
                </div>

                {/* Process Step Indicators */}
                <div className={`w-full max-w-xs space-y-3 text-left border-t pt-5 ${
                  isDarkMode ? 'border-zinc-800/80' : 'border-slate-100'
                }`}>
                  <div className="flex items-center space-x-2.5 text-xs font-medium">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className={isDarkMode ? 'text-zinc-300' : 'text-slate-600'}>
                      Google Services Authenticated
                    </span>
                  </div>
                  <div className="flex items-center space-x-2.5 text-xs font-medium">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                    </span>
                    <span className={isDarkMode ? 'text-zinc-400' : 'text-slate-500'}>
                      Syncing Trading Journal Sheets...
                    </span>
                  </div>
                  <div className="flex items-center space-x-2.5 text-xs font-medium">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                    </span>
                    <span className={isDarkMode ? 'text-zinc-400' : 'text-slate-500'}>
                      Syncing Strategy Notes & Docs...
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Main Dashboard UI */
          <div className="space-y-8">
            {/* Top Toolbar / Tab Switcher (Redesigned as Page Header with Sync Status) */}
            {activeTab !== 'overview' && (
              <div className={`flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 rounded-2xl border transition-all ${
                isDarkMode 
                  ? 'bg-zinc-900/50 border-zinc-800/80 text-zinc-100' 
                  : 'bg-white border-slate-200/80 text-slate-800'
              }`}>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">
                    {activeTab === 'journal' && 'Trading Journal (အရောင်းအဝယ်မှတ်တမ်း)'}
                    {activeTab === 'micro' && 'Micro Analysis (အသေးစိတ်အရောင်းအဝယ်ဆန်းစစ်ချက်)'}
                    {activeTab === 'macro' && 'Macro Analysis (အခြေခံစီးပွားရေးနှင့် ဈေးကွက်ဆန်းစစ်ချက်)'}
                    {activeTab === 'alignment' && 'Position & Alignment (အရွယ်အစားနှင့် စွန့်စားမှုတွက်ချက်မှု)'}
                    {activeTab === 'learning' && 'Learning Notes (သင်ခန်းစာနှင့် လေ့လာတွေ့ရှိချက်များ)'}
                  </h2>
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                    {activeTab === 'journal' && 'Google Sheet နှင့် ချိတ်ဆက်ပြီး သင့် Trading Data များကို အချိန်နှင့်တပြေးညီ မှတ်တမ်းတင်ပါ'}
                    {activeTab === 'micro' && 'အချိန်တို (LTF) Chart များနှင့် Price Action Confirmation များကို စစ်ဆေးပါ'}
                    {activeTab === 'macro' && 'Fed FOMC အတိုးနှုန်းခန့်မှန်းချက်များနှင့် အဓိက Economic Data များကို စောင့်ကြည့်ပါ'}
                    {activeTab === 'alignment' && 'Lot Size, Margin, Leverage နှင့် Risk to Reward တိကျစွာ တွက်ချက်ပါ'}
                    {activeTab === 'learning' && 'Trading မှတ်စုများ၊ Chart ပုံများနှင့် ဗျူဟာသင်ခန်းစာများကို သိမ်းဆည်းပါ'}
                  </p>
                </div>
              </div>
            )}

            {/* OVERVIEW DASHBOARD VIEW - CLEAN, MODERN & UNCLUTTERED */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* 1. Header Command & Filter Bar */}
                <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  isDarkMode 
                    ? 'bg-zinc-900/60 border-zinc-800/80 text-zinc-100' 
                    : 'bg-white border-slate-200/90 shadow-xs text-slate-900'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Title & Status */}
                    <div className="flex items-center space-x-3">
                      <div className={`p-2.5 rounded-xl border shrink-0 ${
                        isDarkMode 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                      }`}>
                        <TrendingUp className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h2 className="text-lg sm:text-xl font-black tracking-tight">Performance Overview</h2>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border ${
                            metrics.netPnL >= 0 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}>
                            {metrics.netPnL >= 0 ? '● Profitable' : '● Drawdown'}
                          </span>
                        </div>
                        <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                          အရောင်းအဝယ်မှတ်တမ်းများနှင့် အမြတ်/အရှုံး တိုးတက်မှုမျဉ်းကွေး အကျဉ်းချုပ်
                        </p>
                      </div>
                    </div>

                    {/* Timeframe Selector & Sync */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <div className={`flex items-center p-1 rounded-xl border text-xs font-semibold ${
                        isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                      }`}>
                        {(['all', '30d', '7d'] as const).map((tf) => (
                          <button
                            key={tf}
                            type="button"
                            onClick={() => setDashboardTimeframe(tf)}
                            className={`px-3 py-1 rounded-lg transition-all cursor-pointer font-bold ${
                              dashboardTimeframe === tf
                                ? isDarkMode ? 'bg-zinc-800 text-emerald-400 shadow-xs' : 'bg-white text-slate-900 shadow-xs'
                                : 'hover:text-zinc-200'
                            }`}
                          >
                            {tf === 'all' ? `All (${trades.length})` : tf === '30d' ? '30 Days' : '7 Days'}
                          </button>
                        ))}
                      </div>

                      {token && spreadsheetId && (
                        <button
                          type="button"
                          onClick={() => loadTrades(token, spreadsheetId)}
                          disabled={isLoadingTrades}
                          className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                            isDarkMode 
                              ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300' 
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-xs'
                          }`}
                          title="Google Sheets မှ ဒေတာ အသစ်ပြန်လည် ရယူရန်"
                        >
                          <RefreshCw className={`h-4 w-4 ${isLoadingTrades ? 'animate-spin text-emerald-400' : ''}`} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Executive 4-Card Balanced KPI Matrix */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1: Net Profit / Loss */}
                  <div className={`p-4.5 rounded-2xl border transition-all flex flex-col justify-between ${
                    isDarkMode ? 'bg-zinc-900/60 border-zinc-800/80 text-zinc-100' : 'bg-white border-slate-200 text-slate-800 shadow-xs'
                  }`}>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-bold text-zinc-400">Net Profit / Loss</span>
                      <span className={`p-1.5 rounded-lg ${metrics.netPnL >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {metrics.netPnL >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      </span>
                    </div>
                    <div>
                      <h3 className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                        metrics.netPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {metrics.netPnL >= 0 ? '+' : ''}${metrics.netPnL.toFixed(2)}
                      </h3>
                      <p className="text-[11px] font-mono text-zinc-400 mt-1">
                        {dashboardFilteredTrades.length} trades recorded
                      </p>
                    </div>
                  </div>

                  {/* Card 2: Win Rate */}
                  <div className={`p-4.5 rounded-2xl border transition-all flex flex-col justify-between ${
                    isDarkMode ? 'bg-zinc-900/60 border-zinc-800/80 text-zinc-100' : 'bg-white border-slate-200 text-slate-800 shadow-xs'
                  }`}>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-bold text-zinc-400">Win Rate</span>
                      <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
                        <Percent className="h-4 w-4" />
                      </span>
                    </div>
                    <div>
                      <h3 className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-sky-400">
                        {metrics.winRate.toFixed(1)}%
                      </h3>
                      <div className="flex items-center space-x-1.5 text-[11px] font-mono font-semibold text-zinc-400 mt-1">
                        <span className="text-emerald-400">{metrics.winTrades} Won</span>
                        <span>•</span>
                        <span className="text-rose-400">{metrics.lossTrades} Lost</span>
                        {metrics.beTrades > 0 && <span>• {metrics.beTrades} BE</span>}
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Profit Factor & Expectancy */}
                  <div className={`p-4.5 rounded-2xl border transition-all flex flex-col justify-between ${
                    isDarkMode ? 'bg-zinc-900/60 border-zinc-800/80 text-zinc-100' : 'bg-white border-slate-200 text-slate-800 shadow-xs'
                  }`}>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-bold text-zinc-400">Profit Factor / Edge</span>
                      <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                        <Shield className="h-4 w-4" />
                      </span>
                    </div>
                    <div>
                      <div className="flex items-baseline space-x-2">
                        <h3 className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-purple-400">
                          {metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(2)}
                        </h3>
                        <span className="text-xs font-mono text-zinc-400">
                          (Exp: {metrics.expectancy >= 0 ? '+' : ''}${metrics.expectancy.toFixed(1)})
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-zinc-400 mt-1">
                        {metrics.profitFactor >= 2.0 ? '🌟 High Edge System' : metrics.profitFactor >= 1.2 ? '✓ Positive Expectancy' : 'Analyzing Edge'}
                      </p>
                    </div>
                  </div>

                  {/* Card 4: Avg Win/Loss & Current Streak */}
                  <div className={`p-4.5 rounded-2xl border transition-all flex flex-col justify-between ${
                    isDarkMode ? 'bg-zinc-900/60 border-zinc-800/80 text-zinc-100' : 'bg-white border-slate-200 text-slate-800 shadow-xs'
                  }`}>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-bold text-zinc-400">Streak & R:R Ratio</span>
                      <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                        <Scale className="h-4 w-4" />
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs font-mono mb-1">
                        <span className="text-emerald-400 font-bold">+${metrics.avgWin.toFixed(0)} avg win</span>
                        <span className="text-rose-400 font-bold">-${Math.abs(metrics.avgLoss).toFixed(0)} avg loss</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mt-1 pt-1 border-t border-zinc-800/40">
                        <span>Streak: <strong className={metrics.currentStreak > 0 ? 'text-emerald-400' : metrics.currentStreak < 0 ? 'text-rose-400' : 'text-zinc-400'}>
                          {metrics.currentStreak > 0 ? `+${metrics.currentStreak} Wins` : metrics.currentStreak < 0 ? `${Math.abs(metrics.currentStreak)} Losses` : '0'}
                        </strong></span>
                        <span>Max Streak: <strong className="text-emerald-400">{metrics.maxWinStreak}W</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Cumulative Growth Performance Curve */}
                <div className={`p-5 sm:p-6 rounded-2xl border transition-all ${
                  isDarkMode ? 'bg-zinc-900/60 border-zinc-800/80 text-zinc-100' : 'bg-white border-slate-200 text-slate-800 shadow-xs'
                }`}>
                  {/* Chart Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-base font-black tracking-tight">Cumulative Growth Curve</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                          cumulativeViewMode === 'pnl' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-sky-500/15 text-sky-400'
                        }`}>
                          {cumulativeViewMode === 'pnl' ? 'Equity ($)' : 'R-Multiple (R)'}
                        </span>
                      </div>
                      <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                        အရောင်းအဝယ်တစ်ခုချင်းစီ၏ စုစုပေါင်း အမြတ်/အရှုံး တိုးတက်မှုမျဉ်းကွေး
                      </p>
                    </div>

                    {/* Chart Metric Switcher */}
                    <div className={`flex items-center p-0.5 rounded-xl border text-xs font-bold self-start sm:self-auto ${
                      isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-100 border-slate-200'
                    }`}>
                      <button
                        type="button"
                        onClick={() => setCumulativeViewMode('pnl')}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          cumulativeViewMode === 'pnl'
                            ? isDarkMode ? 'bg-zinc-800 text-emerald-400 font-extrabold shadow-xs' : 'bg-white text-slate-900 font-extrabold shadow-xs'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Net PnL ($)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCumulativeViewMode('rr')}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          cumulativeViewMode === 'rr'
                            ? isDarkMode ? 'bg-zinc-800 text-sky-400 font-extrabold shadow-xs' : 'bg-white text-slate-900 font-extrabold shadow-xs'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        R-Multiple (R)
                      </button>
                    </div>
                  </div>

                  {/* Chart Canvas */}
                  <div className="h-64 sm:h-72 w-full relative">
                    {cumulativeChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={cumulativeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="pnlGlowGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={metrics.netPnL >= 0 ? '#10B981' : '#F43F5E'} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={metrics.netPnL >= 0 ? '#10B981' : '#F43F5E'} stopOpacity={0.0} />
                            </linearGradient>
                            <linearGradient id="rrGlowGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#27272a' : '#E2E8F0'} opacity={0.6} />
                          <XAxis 
                            dataKey="name" 
                            stroke={isDarkMode ? '#71717a' : '#94A3B8'} 
                            fontSize={11} 
                            tickLine={false} 
                            axisLine={{ stroke: isDarkMode ? '#27272a' : '#E2E8F0' }}
                          />
                          <YAxis 
                            stroke={isDarkMode ? '#71717a' : '#94A3B8'} 
                            fontSize={11} 
                            tickLine={false} 
                            axisLine={{ stroke: isDarkMode ? '#27272a' : '#E2E8F0' }}
                            tickFormatter={(val) => cumulativeViewMode === 'pnl' ? `$${val}` : `${val}R`}
                          />
                          <ReferenceLine y={0} stroke={isDarkMode ? '#52525b' : '#cbd5e1'} strokeDasharray="4 4" />
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className={`p-3 rounded-xl border shadow-xl text-xs backdrop-blur-md transition-all ${
                                    isDarkMode ? 'bg-zinc-950/95 border-zinc-750 text-zinc-100' : 'bg-white/95 border-slate-200 text-slate-900'
                                  }`}>
                                    <div className="flex items-center justify-between gap-3 mb-1.5 pb-1 border-b border-zinc-700/50">
                                      <span className="font-extrabold">{data.pair} ({data.type})</span>
                                      <span className="text-[10px] text-zinc-400 font-mono">{data.fullDate}</span>
                                    </div>
                                    <div className="space-y-1 font-mono">
                                      <div className="flex justify-between gap-3">
                                        <span className="text-zinc-400">Trade PnL:</span>
                                        <span className={`font-bold ${data.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                          {data.pnl >= 0 ? '+' : ''}${data.pnl.toFixed(2)}
                                        </span>
                                      </div>
                                      <div className="flex justify-between gap-3">
                                        <span className="text-zinc-400">Cumulative:</span>
                                        <span className={`font-black ${data.total >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                          ${data.total.toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey={cumulativeViewMode === 'pnl' ? 'total' : 'runningRR'} 
                            stroke={cumulativeViewMode === 'pnl' ? (metrics.netPnL >= 0 ? '#10B981' : '#F43F5E') : '#0EA5E9'} 
                            strokeWidth={2.5} 
                            fillOpacity={1} 
                            fill={cumulativeViewMode === 'pnl' ? 'url(#pnlGlowGrad)' : 'url(#rrGlowGrad)'} 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                        <Activity className="h-8 w-8 mb-2 stroke-1.5 opacity-40" />
                        <p className="text-xs">No trade history available yet.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Directional Breakdown & Top Asset Breakdown Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Directional Performance (Long vs Short) */}
                  <div className={`p-5 sm:p-6 rounded-2xl border transition-all ${
                    isDarkMode ? 'bg-zinc-900/60 border-zinc-800/80 text-zinc-100' : 'bg-white border-slate-200 text-slate-800 shadow-xs'
                  }`}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-base font-black tracking-tight">Directional Edge</h4>
                        <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                          BUY (Long) vs SELL (Short) Analysis
                        </p>
                      </div>
                      <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                        <Scale className="h-4 w-4" />
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {/* BUY Box */}
                      <div className={`p-3.5 rounded-xl border ${isDarkMode ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-extrabold text-emerald-400">BUY (Long)</span>
                          <span className="text-[10px] text-zinc-400 font-mono">{directionPerformance.buysCount} trades</span>
                        </div>
                        <p className="text-xs text-zinc-300 font-bold font-mono">{directionPerformance.buyWinRate.toFixed(0)}% Win Rate</p>
                        <p className={`text-sm font-black font-mono mt-1 ${directionPerformance.buyPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {directionPerformance.buyPnL >= 0 ? '+' : ''}${directionPerformance.buyPnL.toFixed(2)}
                        </p>
                      </div>

                      {/* SELL Box */}
                      <div className={`p-3.5 rounded-xl border ${isDarkMode ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-extrabold text-rose-400">SELL (Short)</span>
                          <span className="text-[10px] text-zinc-400 font-mono">{directionPerformance.sellsCount} trades</span>
                        </div>
                        <p className="text-xs text-zinc-300 font-bold font-mono">{directionPerformance.sellWinRate.toFixed(0)}% Win Rate</p>
                        <p className={`text-sm font-black font-mono mt-1 ${directionPerformance.sellPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {directionPerformance.sellPnL >= 0 ? '+' : ''}${directionPerformance.sellPnL.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Ratio Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-zinc-400 font-medium">
                        <span>BUY ({directionPerformance.buysCount})</span>
                        <span>SELL ({directionPerformance.sellsCount})</span>
                      </div>
                      <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden flex">
                        <div 
                          className="bg-emerald-500 h-full transition-all" 
                          style={{ width: `${directionPerformance.buysCount + directionPerformance.sellsCount > 0 ? (directionPerformance.buysCount / (directionPerformance.buysCount + directionPerformance.sellsCount)) * 100 : 50}%` }} 
                        />
                        <div 
                          className="bg-rose-500 h-full transition-all" 
                          style={{ width: `${directionPerformance.buysCount + directionPerformance.sellsCount > 0 ? (directionPerformance.sellsCount / (directionPerformance.buysCount + directionPerformance.sellsCount)) * 100 : 50}%` }} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Top Asset Pairs */}
                  <div className={`p-5 sm:p-6 rounded-2xl border transition-all ${
                    isDarkMode ? 'bg-zinc-900/60 border-zinc-800/80 text-zinc-100' : 'bg-white border-slate-200 text-slate-800 shadow-xs'
                  }`}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-base font-black tracking-tight">Top Asset Pairs</h4>
                        <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                          Performance by traded pair / symbol
                        </p>
                      </div>
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                        isDarkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {pairPerformanceData.length} Pairs
                      </span>
                    </div>

                    {pairPerformanceData.length > 0 ? (
                      <div className="space-y-2">
                        {pairPerformanceData.slice(0, 4).map((item, idx) => (
                          <div 
                            key={idx} 
                            className={`p-2.5 sm:p-3 rounded-xl border flex items-center justify-between transition-all ${
                              isDarkMode ? 'bg-zinc-950/40 border-zinc-850 hover:bg-zinc-850/40' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center space-x-2.5">
                              <span className="text-xs font-mono font-bold text-zinc-500">#{idx + 1}</span>
                              <div>
                                <h5 className="text-xs sm:text-sm font-bold">{item.pair}</h5>
                                <p className="text-[10px] text-zinc-400">{item.trades} trades • {item.winRate.toFixed(0)}% win</p>
                              </div>
                            </div>

                            <div className="text-right font-mono">
                              <p className={`text-xs sm:text-sm font-black ${item.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {item.pnl >= 0 ? '+' : ''}${item.pnl.toFixed(2)}
                              </p>
                              <span className="text-[10px] text-zinc-400">{item.wins}W - {item.trades - item.wins}L</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-400 py-6 text-center">No pair statistics available yet.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
                        {/* TRADING JOURNAL TAB VIEW */}
            {activeTab === 'journal' && (
              <div className="space-y-6">
                
                {/* Search, Filter, Add block */}
                <div className={`p-4 rounded-2xl border flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 transition-all ${
                  isDarkMode ? 'bg-zinc-900/40 border-zinc-800/80' : 'bg-white border-slate-200 shadow-xs'
                }`}>
                  
                  {/* Search and Filters */}
                  <div className="flex flex-col sm:flex-row flex-1 gap-3">
                    {/* Search bar */}
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="ရှာဖွေရန်... (Setup, Notes, Trade Number, Commitment)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2 border rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all duration-150 ${
                          isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>

                    {/* Filter Status */}
                    <div className="relative flex items-center w-full sm:w-auto">
                      <Filter className="h-3.5 w-3.5 mr-1.5 text-slate-400 shrink-0" />
                      <div className="relative flex-1 sm:flex-initial">
                        <select
                          value={filterStatus}
                          onChange={(e: any) => setFilterStatus(e.target.value)}
                          className={`appearance-none border rounded-xl text-xs pl-3 pr-8 py-2 w-full focus:outline-hidden focus:ring-2 focus:ring-slate-500/20 cursor-pointer ${
                            isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <option value="ALL">All Status</option>
                          <option value="OPEN">OPEN Trades</option>
                          <option value="CLOSED">CLOSED Trades</option>
                        </select>
                        <ChevronDown className="h-3.5 w-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-zinc-500" />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto">
                    {/* Clear & Reset Button */}
                    {token && spreadsheetId && (
                      <div className="relative w-full sm:w-auto">
                        {!showResetConfirm ? (
                          <button
                            onClick={() => setShowResetConfirm(true)}
                            className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 border border-rose-500 hover:bg-rose-500/10 text-rose-500 dark:text-rose-400 font-bold text-xs px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer whitespace-nowrap"
                            title="ဒေတာအဟောင်းများအားလုံးကို ဖျက်ရန်"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>ဒေတာအဟောင်းများဖျက်ရန်</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 p-1 rounded-xl whitespace-nowrap">
                            <span className="text-[10px] sm:text-xs text-rose-700 dark:text-rose-400 font-bold px-1.5">
                              ဒေတာအဟောင်းအားလုံး ဖျက်မလား?
                            </span>
                            <button
                              onClick={handleClearAndSeedClick}
                              className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[11px] px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                            >
                              ဖျက်မည်
                            </button>
                            <button
                              onClick={() => setShowResetConfirm(false)}
                              className="text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 font-bold text-[11px] px-2 py-1.5 cursor-pointer"
                            >
                              မလုပ်တော့ပါ
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Add Trade Button */}
                    <div className="w-full sm:w-auto">
                      <button
                        onClick={handleAddClick}
                        className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-bold text-sm px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer shadow-xs whitespace-nowrap"
                      >
                        <Plus className="h-4.5 w-4.5" />
                        <span>Trade အသစ်ထည့်ရန်</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Trades Logs Table container */}
                <div className={`rounded-2xl border transition-all overflow-hidden ${
                  isDarkMode ? 'bg-zinc-900/40 border-zinc-800/80' : 'bg-white border-slate-200 shadow-xs'
                }`}>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className={`border-b text-[11px] font-bold tracking-wider transition-colors ${
                          isDarkMode ? 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400' : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}>
                          <th className="px-1.5 py-2 text-center w-[50px] whitespace-nowrap">#</th>
                          <th className="px-1.5 py-2 text-left w-[85px] whitespace-nowrap">Date</th>
                          <th className="px-1.5 py-2 text-left w-[80px] whitespace-nowrap">Pair / Asset</th>
                          <th className="px-1.5 py-2 text-right w-[75px] whitespace-nowrap">Entry</th>
                          <th className="px-1.5 py-2 text-right w-[75px] whitespace-nowrap">SL</th>
                          <th className="px-1.5 py-2 text-right w-[75px] whitespace-nowrap">TP</th>
                          <th className="px-1.5 py-2 text-center w-[60px] whitespace-nowrap">R:R</th>
                          <th className="px-1.5 py-2 text-left w-[120px] whitespace-nowrap max-w-[120px]">Watchlist / Setup</th>
                          <th className="px-1.5 py-2 text-center w-[85px] whitespace-nowrap">Result</th>
                          <th className="px-1.5 py-2 text-right w-[80px] whitespace-nowrap">P&L ($)</th>
                          <th className="px-1.5 py-2 text-left w-[100px] whitespace-nowrap max-w-[100px]">Remarks</th>
                          <th className="px-1.5 py-2 text-left w-[100px] whitespace-nowrap max-w-[100px]">Commitment</th>
                          <th className="px-1.5 py-2 text-center w-[75px] whitespace-nowrap">SS (B&F)</th>
                          <th className="px-1.5 py-2 text-center w-[65px] whitespace-nowrap">Actions</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y text-sm transition-colors ${
                        isDarkMode ? 'divide-zinc-800/80' : 'divide-slate-100'
                      }`}>
                        {isLoadingTrades ? (
                          <tr>
                            <td colSpan={14} className="text-center py-12">
                              <div className="flex flex-col items-center justify-center space-y-2">
                                <RefreshCw className="h-8 w-8 text-slate-500 animate-spin" />
                                <span className={`text-sm font-semibold ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>Google Sheet မှ Trade Data များ ဆွဲယူနေပါသည်...</span>
                              </div>
                            </td>
                          </tr>
                        ) : filteredTrades.length > 0 ? (
                          filteredTrades.map((trade, idx) => {
                            const isWin = trade.winLoss === 'TP' || (trade.winLoss === 'Trailing Stop' && parsePnLValue(trade.pnl, trade.winLoss) > 0) || (trade.pnl && (trade.pnl.startsWith('+') || trade.pnl.startsWith('$+')));
                            const isLoss = trade.winLoss === 'SL' || (trade.winLoss === 'Trailing Stop' && parsePnLValue(trade.pnl, trade.winLoss) < 0) || (trade.pnl && (trade.pnl.startsWith('-') || trade.pnl.includes('-')));
                            
                            return (
                              <tr 
                                key={trade.id ? `trade-${trade.id}-${trade.row || idx}` : `trade-idx-${idx}`} 
                                className={`transition-colors duration-150 cursor-pointer text-xs ${
                                  isDarkMode ? 'hover:bg-zinc-800/20' : 'hover:bg-slate-50/50'
                                }`}
                                onClick={() => setSelectedTrade(trade)}
                              >
                                <td className={`px-1.5 py-1.5 text-center w-[50px] whitespace-nowrap font-mono font-bold ${isDarkMode ? 'text-zinc-300' : 'text-slate-700'}`}>{trade.tradeNumber || '-'}</td>
                                <td className={`px-1.5 py-1.5 text-left w-[85px] whitespace-nowrap font-semibold ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>{trade.date}</td>
                                <td className={`px-1.5 py-1.5 text-left w-[80px] whitespace-nowrap font-bold ${isDarkMode ? 'text-zinc-200' : 'text-slate-900'}`}>
                                  {trade.pair || '-'}
                                </td>
                                <td className={`px-1.5 py-1.5 text-right w-[75px] whitespace-nowrap font-medium ${isDarkMode ? 'text-zinc-300' : 'text-slate-600'}`}>
                                  {trade.entryPrice ? `${trade.entryPrice.toLocaleString()}` : '-'}
                                </td>
                                <td className={`px-1.5 py-1.5 text-right w-[75px] whitespace-nowrap font-medium ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                                  {trade.sl ? trade.sl.toLocaleString() : '-'}
                                </td>
                                <td className={`px-1.5 py-1.5 text-right w-[75px] whitespace-nowrap font-medium ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                                  {trade.tp ? trade.tp.toLocaleString() : '-'}
                                </td>
                                <td className="px-1.5 py-1.5 text-center w-[60px] whitespace-nowrap">
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
                                    isDarkMode ? 'bg-zinc-800 text-zinc-300 border border-zinc-700' : 'bg-slate-100 text-slate-700 border border-slate-200'
                                  }`}>
                                    {trade.rr || '-'}
                                  </span>
                                </td>
                                <td className={`px-1.5 py-1.5 text-left w-[120px] max-w-[120px] truncate font-medium ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`} title={trade.watchlist}>
                                  {trade.watchlist || '-'}
                                </td>
                                <td className="px-1.5 py-1.5 text-center w-[85px] whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={(e) => cycleTradeResult(trade, e)}
                                    title="နှိပ်၍ Result အခြေအနေပြောင်းလဲရန် (Click to cycle status: Pending → TP → SL → Breakeven → Trailing Stop)"
                                    className="cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                                  >
                                    {trade.winLoss === 'TP' ? (
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shadow-2xs ${
                                        isDarkMode ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      }`}>
                                        TP ⚡
                                      </span>
                                    ) : trade.winLoss === 'SL' ? (
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shadow-2xs ${
                                        isDarkMode ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                      }`}>
                                        SL ✕
                                      </span>
                                    ) : trade.winLoss === 'Breakeven' ? (
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shadow-2xs ${
                                        isDarkMode ? 'bg-zinc-800 text-zinc-300 border border-zinc-700' : 'bg-slate-100 text-slate-700 border border-slate-200'
                                      }`}>
                                        BE ⊜
                                      </span>
                                    ) : trade.winLoss === 'Trailing Stop' ? (
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shadow-2xs ${
                                        isDarkMode ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30' : 'bg-teal-50 text-teal-700 border border-teal-200'
                                      }`}>
                                        TS ↗
                                      </span>
                                    ) : (
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shadow-2xs ${
                                        isDarkMode ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                      }`}>
                                        Pending ⏳
                                      </span>
                                    )}
                                  </button>
                                </td>
                                <td className={`px-1.5 py-1.5 text-right w-[80px] whitespace-nowrap font-extrabold ${
                                  isWin ? 'text-emerald-500' : isLoss ? 'text-rose-500' : 'text-slate-400'
                                }`}>
                                  {trade.pnl || '-'}
                                </td>
                                <td className={`px-1.5 py-1.5 text-left w-[100px] max-w-[100px] truncate ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`} title={trade.notes}>
                                  {trade.notes || '-'}
                                </td>
                                <td className={`px-1.5 py-1.5 text-left w-[100px] max-w-[100px] truncate font-medium ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`} title={trade.commitment}>
                                  {trade.commitment || '-'}
                                </td>
                                <td className="px-1.5 py-1.5 text-center w-[75px] whitespace-nowrap text-xs">
                                  <div className="flex justify-center gap-1">
                                    {(() => {
                                      const photos = (trade.tradePhoto || '').split(',');
                                      const beforePhoto = photos[0] || '';
                                      const afterPhoto = photos[1] || '';
                                      
                                      if (!beforePhoto && !afterPhoto) {
                                        return <span className="text-slate-400 dark:text-zinc-600">-</span>;
                                      }
                                      
                                      return (
                                        <>
                                          {beforePhoto && (
                                            <a 
                                              href={getDirectDriveImageUrl(beforePhoto)} 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              onClick={(e) => e.stopPropagation()}
                                              className={`inline-flex items-center space-x-1 px-1 py-0.5 rounded text-[9px] font-semibold border transition-all ${
                                                isDarkMode 
                                                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700' 
                                                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                              }`}
                                              title="Before Trade SS"
                                            >
                                              <ImageIcon className="h-2.5 w-2.5 text-teal-500" />
                                              <span>B</span>
                                            </a>
                                          )}
                                          {afterPhoto && (
                                            <a 
                                              href={getDirectDriveImageUrl(afterPhoto)} 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              onClick={(e) => e.stopPropagation()}
                                              className={`inline-flex items-center space-x-1 px-1 py-0.5 rounded text-[9px] font-semibold border transition-all ${
                                                isDarkMode 
                                                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700' 
                                                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                              }`}
                                              title="After Trade SS"
                                            >
                                              <ImageIcon className="h-2.5 w-2.5 text-emerald-500" />
                                              <span>A</span>
                                            </a>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </div>
                                </td>
                                <td className="px-1.5 py-1.5 text-center w-[65px] whitespace-nowrap">
                                  <div className="flex justify-center items-center space-x-1.5">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleEditClick(trade); }}
                                      className={`p-1 rounded transition-colors duration-200 ${
                                        isDarkMode ? 'text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                                      }`}
                                      title="Edit Trade"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleDeleteClick(trade); }}
                                      className={`p-1 rounded transition-colors duration-200 ${
                                        isDarkMode ? 'text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                      }`}
                                      title="Delete Trade"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={14} className="text-center py-16">
                              <BookOpen className="h-12 w-12 mx-auto mb-3 stroke-1 text-zinc-400 dark:text-zinc-700" />
                              <p className={`font-bold ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>အရောင်းအဝယ်မှတ်တမ်းများ ရှာမတွေ့ပါ။</p>
                              <p className="text-xs text-slate-400">ရှာဖွေမှုစကားလုံး ပြောင်းကြည့်ပါ သို့မဟုတ် Trade အသစ်တစ်ခု ထည့်သွင်းကြည့်ပါ။</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile view (Hidden on desktop) */}
                  <div className="block md:hidden divide-y divide-zinc-200/40 dark:divide-zinc-800/80">
                    {isLoadingTrades ? (
                      <div className="text-center py-12 flex flex-col items-center justify-center space-y-2">
                        <RefreshCw className="h-8 w-8 text-slate-500 animate-spin" />
                        <span className={`text-xs font-semibold ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>Google Sheet မှ Trade Data များ ဆွဲယူနေပါသည်...</span>
                      </div>
                    ) : filteredTrades.length > 0 ? (
                      filteredTrades.map((trade, idx) => {
                        const isWin = trade.winLoss === 'TP' || (trade.winLoss === 'Trailing Stop' && parsePnLValue(trade.pnl, trade.winLoss) > 0) || (trade.pnl && (trade.pnl.startsWith('+') || trade.pnl.startsWith('$+')));
                        const isLoss = trade.winLoss === 'SL' || (trade.winLoss === 'Trailing Stop' && parsePnLValue(trade.pnl, trade.winLoss) < 0) || (trade.pnl && (trade.pnl.startsWith('-') || trade.pnl.includes('-')));
                        const isPending = trade.winLoss === 'Pending';
                        
                        return (
                          <div 
                            key={trade.id ? `trade-mob-${trade.id}-${trade.row || idx}` : `trade-mob-idx-${idx}`} 
                            className={`p-4 space-y-3 transition-colors duration-150 cursor-pointer ${
                              isDarkMode ? 'hover:bg-zinc-800/10' : 'hover:bg-slate-50/30'
                            }`}
                            onClick={() => setSelectedTrade(trade)}
                          >
                            <div className="flex justify-between items-center pb-2 border-b border-zinc-200/20 dark:border-zinc-800/40">
                              <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-100 text-slate-500'
                              }`}>
                                <Calendar className="h-3 w-3 mr-1 shrink-0 text-slate-400 dark:text-zinc-500" />
                                {trade.date}
                              </span>
                              
                              {trade.winLoss === 'TP' ? (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                }`}>
                                  TP
                                </span>
                              ) : trade.winLoss === 'SL' ? (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isDarkMode ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-rose-50 text-rose-700 border border-rose-100'
                                }`}>
                                  SL
                                </span>
                              ) : trade.winLoss === 'Breakeven' ? (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isDarkMode ? 'bg-zinc-800 text-zinc-300 border border-zinc-700' : 'bg-slate-100 text-slate-700 border border-slate-200'
                                }`}>
                                  Breakeven
                                </span>
                              ) : trade.winLoss === 'Trailing Stop' ? (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isDarkMode ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'bg-teal-50 text-teal-700 border border-teal-100'
                                }`}>
                                  Trailing Stop
                                </span>
                              ) : (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isDarkMode ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-50 text-amber-700 border border-amber-100'
                                }`}>
                                  Pending
                                </span>
                              )}
                            </div>

                            <div className="flex justify-between items-start pt-1">
                              <div>
                                <div className={`text-[10px] font-extrabold uppercase tracking-widest ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                                  Trade #{trade.tradeNumber || '-'}
                                </div>
                                <h4 className={`font-extrabold text-sm tracking-tight mt-0.5 ${isDarkMode ? 'text-zinc-100' : 'text-slate-900'}`}>
                                  {trade.pair}
                                </h4>
                              </div>

                              <div className="text-right">
                                <span className={`font-extrabold text-sm ${
                                  isWin ? 'text-emerald-500' : isLoss ? 'text-rose-500' : 'text-slate-400'
                                }`}>
                                  {trade.pnl || '-'}
                                </span>
                                <div className={`text-[10px] font-medium mt-1 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                                  R:R: {trade.rr || '-'}
                                </div>
                              </div>
                            </div>

                            {/* Additional info for mobile card */}
                            <div className={`text-xs py-2.5 space-y-3 ${
                              isDarkMode ? 'text-zinc-400' : 'text-slate-600'
                            }`}>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="text-left"><span className="opacity-60 font-medium">Entry:</span> <span className="font-bold text-slate-900 dark:text-zinc-100">{trade.entryPrice ? trade.entryPrice.toLocaleString() : '-'}</span></div>
                                <div className="text-right"><span className="opacity-60 font-medium">R:R:</span> <span className="font-bold text-slate-900 dark:text-zinc-100">{trade.rr || '-'}</span></div>
                                <div className="text-left"><span className="opacity-60 font-medium">SL:</span> <span className="font-bold text-rose-500">{trade.sl ? trade.sl.toLocaleString() : '-'}</span></div>
                                <div className="text-right"><span className="opacity-60 font-medium">TP:</span> <span className="font-bold text-emerald-500">{trade.tp ? trade.tp.toLocaleString() : '-'}</span></div>
                              </div>
                              
                              {trade.watchlist && (
                                <div className="text-[11px] border-t border-zinc-200/20 dark:border-zinc-800/40 pt-1.5">
                                  <span className="font-bold opacity-70">Watchlist Details / Setup:</span>
                                  <p className="mt-0.5">{trade.watchlist}</p>
                                </div>
                              )}
                              
                              {trade.notes && (
                                <div className="text-[11px] border-t border-zinc-200/20 dark:border-zinc-800/40 pt-1.5">
                                  <span className="font-bold opacity-70">Remarks / Note:</span>
                                  <p className="mt-0.5 italic">&quot;{trade.notes}&quot;</p>
                                </div>
                              )}

                              {trade.commitment && (
                                <div className="text-[11px] border-t border-zinc-200/20 dark:border-zinc-800/40 pt-1.5">
                                  <span className="font-bold opacity-70">Commitment:</span>
                                  <p className="mt-0.5">{trade.commitment}</p>
                                </div>
                              )}

                              {trade.tradePhoto && (
                                <div className="border-t border-zinc-200/20 dark:border-zinc-800/40 pt-1.5 flex items-center justify-between">
                                  <span className="font-bold opacity-70 text-[11px]">Trade SS (B&F):</span>
                                  <a 
                                    href={getDirectDriveImageUrl(trade.tradePhoto)} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className={`inline-flex items-center space-x-1 px-2 py-1 rounded-md text-[10px] font-semibold border transition-all ${
                                      isDarkMode 
                                        ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700' 
                                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
                                    }`}
                                  >
                                    <ImageIcon className="h-3 w-3 text-teal-500" />
                                    <span>View SS</span>
                                  </a>
                                </div>
                              )}
                            </div>

                            <div className="flex justify-end items-center space-x-3 pt-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEditClick(trade); }}
                                className={`inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-150 cursor-pointer ${
                                  isDarkMode 
                                    ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700' 
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                <Edit2 className="h-3 w-3 text-emerald-500" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteClick(trade); }}
                                className={`inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-150 cursor-pointer ${
                                  isDarkMode 
                                    ? 'bg-zinc-800 text-rose-400 border-zinc-700 hover:bg-zinc-700' 
                                    : 'bg-white text-rose-600 border-slate-200 hover:bg-rose-50'
                                }`}
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-16 px-4">
                        <BookOpen className="h-10 w-10 mx-auto mb-3 stroke-1 text-zinc-400 dark:text-zinc-700" />
                        <p className={`font-bold text-sm ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>အရောင်းအဝယ်မှတ်တမ်းများ ရှာမတွေ့ပါ။</p>
                        <p className="text-xs text-slate-400 mt-1">ရှာဖွေမှုစကားလုံး ပြောင်းကြည့်ပါ သို့မဟုတ် Trade အသစ်တစ်ခု ထည့်သွင်းကြည့်ပါ။</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* MICRO ANALYSIS VIEW */}
            {activeTab === 'micro' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column: Create Setup Log / Entry Evaluation Form */}
                  <div className={`p-6 rounded-2xl border transition-all lg:col-span-1 h-fit ${
                    isDarkMode ? 'bg-zinc-900/40 border-zinc-800/80 text-zinc-100' : 'bg-white border-slate-200/80 shadow-xs text-slate-800'
                  }`}>
                    <div className="flex items-center space-x-3 mb-5 pb-4 border-b border-zinc-200/30 dark:border-zinc-800/80">
                      <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-500">
                        <Target className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="text-md font-bold">New Setup Evaluation</h4>
                        <p className="text-xs text-zinc-500 mt-0.5">အသေးစိတ် setup အရည်အသွေး ဆန်းစစ်ရန်</p>
                      </div>
                    </div>

                    <form onSubmit={handleAddMicroLog} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                            Asset Pair
                          </label>
                          <input
                            type="text"
                            value={microAsset}
                            onChange={(e) => setMicroAsset(e.target.value)}
                            placeholder="EURUSD, Gold..."
                            required
                            className={`w-full p-2.5 rounded-xl text-xs font-semibold border focus:outline-hidden transition-all ${
                              isDarkMode 
                                ? 'bg-zinc-900 border-zinc-800 focus:border-slate-500/50 focus:ring-2 focus:ring-slate-500/10 text-zinc-100' 
                                : 'bg-slate-50 border-slate-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-500/10 text-slate-800'
                            }`}
                          />
                        </div>
                        <div>
                          <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                            Setup Type
                          </label>
                          <select
                            value={microSetupType}
                            onChange={(e) => setMicroSetupType(e.target.value)}
                            className={`w-full p-2.5 rounded-xl text-xs font-semibold border focus:outline-hidden transition-all cursor-pointer ${
                              isDarkMode 
                                ? 'bg-zinc-900 border-zinc-800 text-zinc-100' 
                                : 'bg-slate-50 border-slate-200 text-slate-800'
                            }`}
                          >
                            <option value="Order Block">Order Block</option>
                            <option value="Liquidity Hunt">Liquidity Hunt</option>
                            <option value="FVG Mitigation">FVG Mitigation</option>
                            <option value="Break of Structure">Break of Structure</option>
                            <option value="Silver Bullet">Silver Bullet</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className={`block text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                            Risk PnL Target (R-Multiple)
                          </label>
                          <span className="text-xs font-bold text-emerald-500">{microPnlR}R</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="15"
                          step="0.5"
                          value={microPnlR}
                          onChange={(e) => setMicroPnlR(parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                      </div>

                      <div className="space-y-2 border-t border-b border-zinc-200/30 dark:border-zinc-800/80 py-3 my-2">
                        <span className={`block text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                          LTF Checklist (Lower Timeframe Validation)
                        </span>

                        <label className="flex items-center space-x-3 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={microChecklist.structureAligned}
                            onChange={(e) => setMicroChecklist({ ...microChecklist, structureAligned: e.target.checked })}
                            className="rounded-sm border-slate-300 dark:border-zinc-750 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                          />
                          <span className={isDarkMode ? 'text-zinc-300' : 'text-slate-700'}>Structure Aligned with HTF Trend</span>
                        </label>

                        <label className="flex items-center space-x-3 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={microChecklist.liquiditySwept}
                            onChange={(e) => setMicroChecklist({ ...microChecklist, liquiditySwept: e.target.checked })}
                            className="rounded-sm border-slate-300 dark:border-zinc-750 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                          />
                          <span className={isDarkMode ? 'text-zinc-300' : 'text-slate-700'}>Liquidity Hunt / Sweep Confirmed</span>
                        </label>

                        <label className="flex items-center space-x-3 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={microChecklist.fvgTested}
                            onChange={(e) => setMicroChecklist({ ...microChecklist, fvgTested: e.target.checked })}
                            className="rounded-sm border-slate-300 dark:border-zinc-750 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                          />
                          <span className={isDarkMode ? 'text-zinc-300' : 'text-slate-700'}>FVG Mitigation (Fair Value Gap)</span>
                        </label>

                        <label className="flex items-center space-x-3 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={microChecklist.blockRefined}
                            onChange={(e) => setMicroChecklist({ ...microChecklist, blockRefined: e.target.checked })}
                            className="rounded-sm border-slate-300 dark:border-zinc-750 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                          />
                          <span className={isDarkMode ? 'text-zinc-300' : 'text-slate-700'}>Order Block Refined on LTF (1m/5m)</span>
                        </label>

                        <label className="flex items-center space-x-3 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={microChecklist.volumeConfirmed}
                            onChange={(e) => setMicroChecklist({ ...microChecklist, volumeConfirmed: e.target.checked })}
                            className="rounded-sm border-slate-300 dark:border-zinc-750 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                          />
                          <span className={isDarkMode ? 'text-zinc-300' : 'text-slate-700'}>Volume / Delta Surge Confirmed</span>
                        </label>
                      </div>

                      <div>
                        <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                          Entry Evaluation Notes
                        </label>
                        <textarea
                          value={microEntryNotes}
                          onChange={(e) => setMicroEntryNotes(e.target.value)}
                          placeholder="အဝင် trade ၏ အခြေအနေ၊ စိတ်ခံစားမှု သို့မဟုတ် analysis အသေးစိတ်များကို ရေးသားပါ..."
                          rows={4}
                          className={`w-full p-2.5 rounded-xl text-xs border focus:outline-hidden transition-all leading-relaxed ${
                            isDarkMode 
                              ? 'bg-zinc-900 border-zinc-800 focus:border-slate-500/50 focus:ring-2 focus:ring-slate-500/10 text-zinc-100' 
                              : 'bg-slate-50 border-slate-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-500/10 text-slate-800'
                          }`}
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full inline-flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-bold text-xs px-4 py-3 rounded-xl transition-all cursor-pointer shadow-xs"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Save Setup Log (မှတ်တမ်းသိမ်းရန်)</span>
                      </button>
                    </form>
                  </div>

                  {/* Right Column: Setup Quality Scoring and Log List */}
                  <div className={`p-6 rounded-2xl border transition-all lg:col-span-2 ${
                    isDarkMode ? 'bg-zinc-900/40 border-zinc-800/80' : 'bg-white border-slate-200/80 shadow-xs'
                  }`}>
                    {/* Setup Analytics cards */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      <div className={`p-3.5 rounded-xl border ${
                        isDarkMode ? 'bg-zinc-950/40 border-zinc-800' : 'bg-slate-50/50 border-slate-100'
                      }`}>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Total Setup</span>
                        <div className="text-xl font-black mt-0.5">{microLogs.length}</div>
                      </div>
                      <div className={`p-3.5 rounded-xl border ${
                        isDarkMode ? 'bg-zinc-950/40 border-zinc-800' : 'bg-slate-50/50 border-slate-100'
                      }`}>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Avg Setup Quality</span>
                        <div className="text-xl font-black mt-0.5 text-emerald-500">
                          {microLogs.length > 0 
                            ? Math.round(microLogs.reduce((acc, log) => acc + log.score, 0) / microLogs.length) 
                            : 0}%
                        </div>
                      </div>
                      <div className={`p-3.5 rounded-xl border ${
                        isDarkMode ? 'bg-zinc-950/40 border-zinc-800' : 'bg-slate-50/50 border-slate-100'
                      }`}>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Target Total Reward</span>
                        <div className="text-xl font-black mt-0.5 text-teal-500">
                          {microLogs.reduce((acc, log) => acc + log.pnlR, 0).toFixed(1)}R
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-4 border-b pb-3 border-zinc-200/30 dark:border-zinc-800/80">
                      <h4 className="text-sm font-bold flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-emerald-500" />
                        Setup Evaluation Records
                      </h4>
                    </div>

                    {microLogs.length > 0 ? (
                      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                        {microLogs.map((log) => (
                          <div 
                            key={log.id}
                            className={`p-4 rounded-xl border transition-all ${
                              isDarkMode 
                                ? 'bg-zinc-950/20 border-zinc-800/80 text-zinc-100 hover:border-zinc-700/80' 
                                : 'bg-slate-50 border-slate-200/70 text-slate-800 hover:bg-slate-100/50'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-4 mb-2.5">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-slate-700 dark:text-zinc-200">{log.asset}</span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                                    isDarkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-200/60 text-slate-700'
                                  }`}>{log.setupType}</span>
                                  <span className="text-xs font-bold text-emerald-500">+{log.pnlR}R</span>
                                </div>
                                <span className="text-[10px] text-zinc-500">{log.date}</span>
                              </div>

                              <div className="flex items-center gap-2.5">
                                <div className="text-right">
                                  <span className="text-[10px] block text-zinc-500 uppercase font-bold">Setup Quality</span>
                                  <span className={`text-xs font-black px-2 py-0.5 rounded-md ${
                                    log.score >= 80 ? 'bg-emerald-500/10 text-emerald-400' :
                                    log.score >= 60 ? 'bg-yellow-500/10 text-yellow-400' :
                                    'bg-rose-500/10 text-rose-400'
                                  }`}>
                                    {log.score >= 100 ? 'A+' : log.score >= 80 ? 'A' : log.score >= 60 ? 'B' : 'C'} ({log.score}%)
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleDeleteMicroLog(log.id)}
                                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                    isDarkMode ? 'text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'
                                  }`}
                                  title="Delete setup log"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            {/* Checklist items list */}
                            <div className="flex flex-wrap gap-1.5 mb-2.5">
                              {Object.entries(log.ltfChecklist).map(([key, value]) => {
                                const labels: Record<string, string> = {
                                  structureAligned: 'Structure Aligned',
                                  liquiditySwept: 'Liquidity Swept',
                                  fvgTested: 'FVG Tested',
                                  blockRefined: 'OB Refined',
                                  volumeConfirmed: 'Volume Confirmed'
                                };
                                return (
                                  <span 
                                    key={key} 
                                    className={`text-[9px] px-1.5 py-0.5 rounded-sm font-semibold border ${
                                      value 
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                        : 'bg-zinc-800/10 border-zinc-800/50 text-zinc-500 dark:text-zinc-600 line-through'
                                    }`}
                                  >
                                    {labels[key] || key}
                                  </span>
                                );
                              })}
                            </div>

                            {log.entryNotes && (
                              <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 bg-slate-100/50 dark:bg-zinc-900/40 p-2.5 rounded-lg border border-slate-200/40 dark:border-zinc-800/50 font-sans whitespace-pre-wrap">
                                {log.entryNotes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-24 text-center border border-dashed rounded-xl border-zinc-200/50 dark:border-zinc-800">
                        <Target className="h-10 w-10 text-zinc-400 dark:text-zinc-700 mx-auto mb-2 stroke-1" />
                        <p className="text-xs text-zinc-500">သိမ်းဆည်းထားသော setup log မရှိသေးပါ။ setup အသစ်စတင်ဆန်းစစ်နိုင်ပါသည်။</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* MACRO ANALYSIS VIEW */}
            {activeTab === 'macro' && (
              <div className="space-y-6">
                
                {/* 1. TOP PANEL: FOMC Calendar & US NFP/CPI rate predictor side-by-side */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                  
                  {/* FOMC Meeting Calendar Card */}
                  <div className={`p-6 rounded-2xl border transition-all xl:col-span-5 flex flex-col justify-between ${
                    isDarkMode ? 'bg-zinc-900/40 border-zinc-800/80 text-zinc-100' : 'bg-white border-slate-200/80 shadow-xs text-slate-800'
                  }`}>
                    <div>
                      <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-200/30 dark:border-zinc-800/80">
                        <div className="flex items-center space-x-2.5">
                          <div className="bg-amber-500/10 p-2 rounded-xl text-amber-500">
                            <Calendar className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold">FOMC Calendar</h4>
                            <p className="text-[10px] text-zinc-500">Fed Meeting Schedule</p>
                          </div>
                        </div>

                        {/* Year Selector Tabs */}
                        <div className="flex bg-slate-100 dark:bg-zinc-900/80 p-0.5 rounded-lg border border-slate-250/20 dark:border-zinc-800">
                          {([2026, 2027] as const).map((yr) => (
                            <button
                              key={yr}
                              onClick={() => setFomcYear(yr)}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                                fomcYear === yr
                                  ? 'bg-white dark:bg-zinc-850 text-slate-900 dark:text-zinc-100 shadow-xs'
                                  : 'text-zinc-400 hover:text-zinc-200'
                              }`}
                            >
                              {yr}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Next Meeting Banner */}
                      {nextFomcMeeting && (
                        <div className={`mb-4 p-3 rounded-xl border flex items-center gap-3 text-xs leading-relaxed ${
                          isDarkMode 
                            ? 'bg-amber-950/10 border-amber-900/30 text-amber-300' 
                            : 'bg-amber-50/50 border-amber-100 text-amber-800'
                        }`}>
                          <Clock className="h-4 w-4 shrink-0 animate-pulse text-amber-500" />
                          <div className="font-medium text-[11px]">
                            နောက်ထပ် FOMC Meeting: <span className="font-bold underline">{nextFomcMeeting.date}, {nextFomcMeeting.year}</span> 
                            {daysRemaining !== null && (
                              <span className="ml-1 font-semibold block sm:inline">
                                ({daysRemaining === 0 ? 'ယနေ့ ဖြစ်ပါသည်!' : `နောက်ထပ် ${daysRemaining} ရက်အလို`})
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Meetings List */}
                      <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                        {filteredFomcMeetings.map((m, idx) => {
                          const isPassed = m.originalDate < todayDateString;
                          return (
                            <div
                              key={idx}
                              className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                                isPassed
                                  ? (isDarkMode ? 'bg-zinc-950/10 border-zinc-900/60 opacity-60' : 'bg-slate-50/50 border-slate-100 opacity-60')
                                  : (m.originalDate === nextFomcMeeting?.originalDate && m.year === nextFomcMeeting?.year
                                    ? (isDarkMode ? 'bg-amber-500/5 border-amber-500/30 text-amber-200' : 'bg-amber-50/40 border-amber-200/60 text-slate-900')
                                    : (isDarkMode ? 'bg-zinc-900/30 border-zinc-800/40 text-zinc-100 hover:border-zinc-700/50' : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'))
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                {/* Calendar style square badge */}
                                <div className={`flex flex-col items-center justify-center h-9 w-9 rounded-lg border text-center font-mono font-bold leading-none shrink-0 ${
                                  isPassed
                                    ? 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500'
                                    : m.originalDate === nextFomcMeeting?.originalDate && m.year === nextFomcMeeting?.year
                                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                                      : 'bg-teal-500/5 border-teal-500/20 text-teal-500'
                                }`}>
                                  <span className="text-[8px] uppercase tracking-wider">{m.date.split(' ')[0]}</span>
                                  <span className="text-xs mt-0.5">{m.date.split(' ')[1]?.split('–')[0] || m.date.split(' ')[1]}</span>
                                </div>

                                <div>
                                  <div className="font-bold text-[11px] flex items-center gap-1.5">
                                    <span>{m.date}</span>
                                    {m.sep && (
                                      <span className="bg-rose-500/10 text-rose-500 text-[8px] font-black uppercase px-1 rounded-sm border border-rose-500/20">
                                        SEP
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-sans leading-none">{m.notes}</p>
                                </div>
                              </div>

                              {/* Status Badge */}
                              <div className="shrink-0">
                                {isPassed ? (
                                  <span className="text-[9px] font-bold uppercase text-zinc-500 px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                    Passed
                                  </span>
                                ) : m.originalDate === nextFomcMeeting?.originalDate && m.year === nextFomcMeeting?.year ? (
                                  <span className="text-[9px] font-bold uppercase text-amber-500 px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 animate-pulse">
                                    Next
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold uppercase text-teal-500 px-1.5 py-0.5 rounded-md bg-teal-500/10 border border-teal-500/20">
                                    Upcoming
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* General Info Footer */}
                    <div className="mt-4 pt-3 border-t border-zinc-200/20 dark:border-zinc-800/60 text-[9px] leading-relaxed text-zinc-500 space-y-1">
                      <p>🎯 SEP = Summary of Economic Projections (ထွက်ရှိပါက ဈေးကွက်လှုပ်ခတ်မှု အလွန်ပြင်းထန်နိုင်ပါသည်)</p>
                      <p>📅 Policy Statement: Day 2 at 2:00 PM ET (မြန်မာစံတော်ချိန် နောက်တစ်နေ့ မနက် ၁:၃၀ နာရီ ဝန်းကျင်)</p>
                      <p>📰 Meeting Minutes: ၃ ပတ်အကြာတွင် ထပ်မံထုတ်ပြန်လေ့ရှိသည်</p>
                    </div>
                  </div>

                  {/* US NFP & CPI Macro Indicators Rate Predictor Card */}
                  <div className={`p-6 rounded-2xl border transition-all xl:col-span-7 flex flex-col justify-between ${
                    isDarkMode ? 'bg-zinc-900/40 border-zinc-800/80 text-zinc-100' : 'bg-white border-slate-200/80 shadow-xs text-slate-800'
                  }`}>
                    <div>
                      {/* Card Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-zinc-200/30 dark:border-zinc-800/80 gap-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="bg-teal-500/10 p-2 rounded-xl text-teal-500">
                            <Activity className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold">NFP & CPI Rate Bias Predictor</h4>
                            <p className="text-[10px] text-zinc-500">အလုပ်အကိုင်နှင့် ငွေကြေးဖောင်းပွမှု အခြေခံ အတိုးနှုန်းခန့်မှန်းချက်</p>
                          </div>
                        </div>

                        {/* Month Select Buttons */}
                        <div className="flex flex-wrap gap-1 bg-slate-100 dark:bg-zinc-900/80 p-0.5 rounded-lg border border-slate-250/20 dark:border-zinc-800">
                          {['Aug 2026', 'Sep 2026', 'Oct 2026', 'Nov 2026', 'Dec 2026'].map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => handleSelectIndicatorPreset(m)}
                              className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                                selectedIndicatorMonth === m
                                  ? 'bg-white dark:bg-zinc-850 text-slate-900 dark:text-zinc-100 shadow-xs'
                                  : 'text-zinc-400 hover:text-zinc-200'
                              }`}
                            >
                              {m.split(' ')[0]}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Info Note */}
                      <div className={`mb-4 p-2.5 rounded-xl border text-[10px] flex items-start gap-2 leading-relaxed ${
                        isDarkMode ? 'bg-zinc-900/30 border-zinc-800/50 text-zinc-400' : 'bg-slate-50 border-slate-150 text-slate-600'
                      }`}>
                        <HelpCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-teal-500" />
                        <span>
                          NFP သည် လဆန်းတွင်ထွက်ပြီး CPI (အဓိက Indicator ၄ ခု) သည် လလယ်တွင်ထွက်ရှိပါသည်။ ဤဒေတာနှစ်ခုလုံးသည် FOMC အတိုးနှုန်းတိုးမြှင့်ရန် (**Hike**), လျှော့ချရန် (**Cut**), သို့မဟုတ် ထိန်းသိမ်းရန် (**Pause**) ဆုံးဖြတ်ချက်ကို တိုက်ရိုက်သတ်မှတ်ပေးပါသည်။
                        </span>
                      </div>

                      {/* Inputs Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* NFP Input Card */}
                        <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-zinc-950/20 border-zinc-800/60' : 'bg-slate-50/40 border-slate-150'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-teal-500 flex items-center gap-1">
                              🇺🇸 NFP Employment
                            </span>
                            <span className="text-[9px] text-zinc-500 font-medium">1st Friday • 8:30 AM ET</span>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <div className="flex justify-between text-[10px] mb-1 font-medium">
                                <span className="text-zinc-400">Actual (အမှန်ထွက်ရှိချက်)</span>
                                <span className="font-mono font-bold text-teal-400">{nfpAct}k</span>
                              </div>
                              <input
                                type="range"
                                min="50"
                                max="350"
                                step="5"
                                value={nfpAct}
                                onChange={(e) => {
                                  setNfpAct(Number(e.target.value));
                                  setSelectedIndicatorMonth('Custom');
                                }}
                                className="w-full accent-teal-500 cursor-pointer h-1 bg-zinc-800 rounded-lg"
                              />
                            </div>

                            <div>
                              <div className="flex justify-between text-[10px] mb-1 font-medium">
                                <span className="text-zinc-400">Forecast (ခန့်မှန်းချက်)</span>
                                <span className="font-mono font-bold text-zinc-500">{nfpFc}k</span>
                              </div>
                              <input
                                type="range"
                                min="50"
                                max="350"
                                step="5"
                                value={nfpFc}
                                onChange={(e) => {
                                  setNfpFc(Number(e.target.value));
                                  setSelectedIndicatorMonth('Custom');
                                }}
                                className="w-full accent-zinc-500 cursor-pointer h-1 bg-zinc-800 rounded-lg"
                              />
                            </div>
                          </div>

                          <div className="mt-3 pt-2 border-t border-zinc-200/10 flex justify-between text-[10px] text-zinc-500">
                            <span>Effect:</span>
                            <span className={nfpAct > nfpFc ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                              {nfpAct > nfpFc ? 'Actual > Forecast (Hawkish)' : 'Actual < Forecast (Dovish)'}
                            </span>
                          </div>
                        </div>

                        {/* CPI Inflation Input Card (4 Key Fields) */}
                        <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-zinc-950/20 border-zinc-800/60' : 'bg-slate-50/40 border-slate-150'}`}>
                          <div className="flex items-center justify-between mb-2.5">
                            <span className="text-xs font-bold text-amber-500">
                              🇺🇸 CPI Inflation (၄ ခု)
                            </span>
                            <span className="text-[9px] text-zinc-500 font-medium">Mid-Month • 8:30 AM ET</span>
                          </div>

                          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[10px]">
                            {/* CPI y/y */}
                            <div>
                              <label className="text-zinc-500 block mb-0.5 font-bold">CPI y/y</label>
                              <div className="flex gap-1">
                                <input
                                  type="number"
                                  step="0.1"
                                  value={cpiYyAct}
                                  onChange={(e) => {
                                    setCpiYyAct(Number(e.target.value));
                                    setSelectedIndicatorMonth('Custom');
                                  }}
                                  placeholder="Act"
                                  className={`w-full p-1 rounded-md text-center font-mono font-bold text-[10px] ${
                                    isDarkMode ? 'bg-zinc-900 border-zinc-800 text-amber-400' : 'bg-white border-slate-200 text-amber-600'
                                  }`}
                                />
                                <input
                                  type="number"
                                  step="0.1"
                                  value={cpiYyFc}
                                  onChange={(e) => {
                                    setCpiYyFc(Number(e.target.value));
                                    setSelectedIndicatorMonth('Custom');
                                  }}
                                  placeholder="Fc"
                                  className={`w-full p-1 rounded-md text-center font-mono text-[10px] ${
                                    isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-white border-slate-200 text-zinc-500'
                                  }`}
                                />
                              </div>
                            </div>

                            {/* Core CPI y/y */}
                            <div>
                              <label className="text-zinc-500 block mb-0.5 font-bold">Core CPI y/y</label>
                              <div className="flex gap-1">
                                <input
                                  type="number"
                                  step="0.1"
                                  value={coreCpiYyAct}
                                  onChange={(e) => {
                                    setCoreCpiYyAct(Number(e.target.value));
                                    setSelectedIndicatorMonth('Custom');
                                  }}
                                  placeholder="Act"
                                  className={`w-full p-1 rounded-md text-center font-mono font-bold text-[10px] ${
                                    isDarkMode ? 'bg-zinc-900 border-zinc-800 text-amber-400' : 'bg-white border-slate-200 text-amber-600'
                                  }`}
                                />
                                <input
                                  type="number"
                                  step="0.1"
                                  value={coreCpiYyFc}
                                  onChange={(e) => {
                                    setCoreCpiYyFc(Number(e.target.value));
                                    setSelectedIndicatorMonth('Custom');
                                  }}
                                  placeholder="Fc"
                                  className={`w-full p-1 rounded-md text-center font-mono text-[10px] ${
                                    isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-white border-slate-200 text-zinc-500'
                                  }`}
                                />
                              </div>
                            </div>

                            {/* CPI m/m */}
                            <div>
                              <label className="text-zinc-500 block mb-0.5 font-bold">CPI m/m</label>
                              <div className="flex gap-1">
                                <input
                                  type="number"
                                  step="0.05"
                                  value={cpiMmAct}
                                  onChange={(e) => {
                                    setCpiMmAct(Number(e.target.value));
                                    setSelectedIndicatorMonth('Custom');
                                  }}
                                  placeholder="Act"
                                  className={`w-full p-1 rounded-md text-center font-mono font-bold text-[10px] ${
                                    isDarkMode ? 'bg-zinc-900 border-zinc-800 text-amber-400' : 'bg-white border-slate-200 text-amber-600'
                                  }`}
                                />
                                <input
                                  type="number"
                                  step="0.05"
                                  value={cpiMmFc}
                                  onChange={(e) => {
                                    setCpiMmFc(Number(e.target.value));
                                    setSelectedIndicatorMonth('Custom');
                                  }}
                                  placeholder="Fc"
                                  className={`w-full p-1 rounded-md text-center font-mono text-[10px] ${
                                    isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-white border-slate-200 text-zinc-500'
                                  }`}
                                />
                              </div>
                            </div>

                            {/* Core CPI m/m */}
                            <div>
                              <label className="text-zinc-500 block mb-0.5 font-bold">Core CPI m/m</label>
                              <div className="flex gap-1">
                                <input
                                  type="number"
                                  step="0.05"
                                  value={coreCpiMmAct}
                                  onChange={(e) => {
                                    setCoreCpiMmAct(Number(e.target.value));
                                    setSelectedIndicatorMonth('Custom');
                                  }}
                                  placeholder="Act"
                                  className={`w-full p-1 rounded-md text-center font-mono font-bold text-[10px] ${
                                    isDarkMode ? 'bg-zinc-900 border-zinc-800 text-amber-400' : 'bg-white border-slate-200 text-amber-600'
                                  }`}
                                />
                                <input
                                  type="number"
                                  step="0.05"
                                  value={coreCpiMmFc}
                                  onChange={(e) => {
                                    setCoreCpiMmFc(Number(e.target.value));
                                    setSelectedIndicatorMonth('Custom');
                                  }}
                                  placeholder="Fc"
                                  className={`w-full p-1 rounded-md text-center font-mono text-[10px] ${
                                    isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-white border-slate-200 text-zinc-500'
                                  }`}
                                />
                              </div>
                            </div>

                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Prediction Output Bias Meter */}
                    <div className={`mt-4 p-4 rounded-xl border flex flex-col sm:flex-row items-center gap-4 ${ratePredictor.bgClass}`}>
                      
                      {/* Left circular or percentage widget */}
                      <div className="shrink-0 flex flex-col items-center justify-center h-16 w-16 rounded-full border border-zinc-200/20 bg-zinc-950/40 font-mono text-center relative">
                        <span className={`text-md font-black ${ratePredictor.colorClass}`}>
                          {ratePredictor.percentage > 0 ? `+${ratePredictor.percentage}%` : `${ratePredictor.percentage}%`}
                        </span>
                        <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold block mt-0.5">Bias</span>
                      </div>

                      {/* Right dynamic explanatory text */}
                      <div className="space-y-1 text-center sm:text-left">
                        <div className="flex items-center justify-center sm:justify-start gap-2">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            ratePredictor.result === 'Hike' ? 'bg-rose-500/20 text-rose-400' :
                            ratePredictor.result === 'Cut' ? 'bg-emerald-500/20 text-emerald-400' :
                            'bg-amber-500/20 text-amber-400'
                          }`}>
                            Fed Policy Rate Target
                          </span>
                          <span className="text-[9px] text-zinc-500 font-semibold">Calculated Live</span>
                        </div>
                        <h5 className={`text-xs font-black ${ratePredictor.colorClass}`}>
                          {ratePredictor.label}
                        </h5>
                        <p className="text-[10px] leading-relaxed text-zinc-400 font-sans">
                          {ratePredictor.desc}
                        </p>
                      </div>

                    </div>
                  </div>

                </div>

                {/* 2. LOWER PANEL: Form & Logs History side-by-side */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* Left Column: Create Macro Analysis Form Card */}
                  <div className="lg:col-span-1">
                    <div className={`p-6 rounded-2xl border transition-all h-fit ${
                      isDarkMode ? 'bg-zinc-900/40 border-zinc-800/80 text-zinc-100' : 'bg-white border-slate-200/80 shadow-xs text-slate-800'
                    }`}>
                      <div className="flex items-center space-x-3 mb-5 pb-4 border-b border-zinc-200/30 dark:border-zinc-800/80">
                        <div className="bg-teal-500/10 p-2 rounded-xl text-teal-500">
                          <Globe className="h-6 w-6" />
                        </div>
                        <div>
                          <h4 className="text-md font-bold">New Macro Analysis</h4>
                          <p className="text-xs text-zinc-500 mt-0.5">ဈေးကွက် Trend ကြီးများနှင့် bias သတ်မှတ်ရန်</p>
                        </div>
                      </div>

                      <form onSubmit={handleAddMacroLog} className="space-y-4">
                        <div>
                          <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                            Weekly Market Bias
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {(['Bullish', 'Bearish', 'Ranging'] as const).map((bias) => (
                              <button
                                key={bias}
                                type="button"
                                onClick={() => setMacroWeeklyBias(bias)}
                                className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                                  macroWeeklyBias === bias 
                                    ? (bias === 'Bullish' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                                       bias === 'Bearish' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
                                       'bg-amber-500/10 border-amber-500/30 text-amber-400')
                                    : (isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100')
                                }`}
                              >
                                {bias}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Timeframe Structure Matrix Grid */}
                        <div className="border-t border-b border-zinc-200/30 dark:border-zinc-800/80 py-3 my-2 space-y-2">
                          <span className={`block text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                            Multi-Timeframe Structure Matrix
                          </span>
                          
                          <div className="space-y-2">
                            {([
                              { key: 'm1', label: 'Monthly Trend (M1)' },
                              { key: 'w1', label: 'Weekly Trend (W1)' },
                              { key: 'd1', label: 'Daily Trend (D1)' },
                              { key: 'h4', label: '4-Hour Trend (H4)' },
                              { key: 'h1', label: '1-Hour Trend (H1)' }
                            ] as const).map(({ key, label }) => (
                              <div key={key} className="flex items-center justify-between">
                                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{label}</span>
                                <div className="flex gap-1">
                                  {(['Bullish', 'Bearish', 'Ranging'] as const).map((bias) => (
                                    <button
                                      key={bias}
                                      type="button"
                                      onClick={() => setMacroTimeframeMatrix({
                                        ...macroTimeframeMatrix,
                                        [key]: bias
                                      })}
                                      className={`px-2 py-0.5 text-[10px] font-bold rounded-sm border transition-all cursor-pointer ${
                                        macroTimeframeMatrix[key] === bias
                                          ? (bias === 'Bullish' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                                             bias === 'Bearish' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
                                             'bg-amber-500/10 border-amber-500/30 text-amber-400')
                                          : (isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-500' : 'bg-slate-50 border-slate-200 text-slate-500')
                                      }`}
                                    >
                                      {bias === 'Bullish' ? '▲' : bias === 'Bearish' ? '▼' : '■'}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                              Fundamental & Sentiment Factors
                            </label>
                            <textarea
                              value={macroFundamentalSentiment}
                              onChange={(e) => setMacroFundamentalSentiment(e.target.value)}
                              placeholder="သတင်းများ၊ FOMC, CPI, central bank sentiment သို့မဟုတ် ဈေးကွက်ခံစားချက်များ..."
                              rows={2}
                              className={`w-full p-2 rounded-xl text-xs border focus:outline-hidden transition-all ${
                                isDarkMode 
                                  ? 'bg-zinc-900 border-zinc-800 focus:border-slate-500/50 focus:ring-2 focus:ring-slate-500/10 text-zinc-100' 
                                  : 'bg-slate-50 border-slate-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-500/10 text-slate-800'
                              }`}
                            />
                          </div>

                          <div>
                            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                              Intermarket Correlation Notes
                            </label>
                            <textarea
                              value={macroCorrelationNotes}
                              onChange={(e) => setMacroCorrelationNotes(e.target.value)}
                              placeholder="DXY, Yields, Correlation details..."
                              rows={2}
                              className={`w-full p-2 rounded-xl text-xs border focus:outline-hidden transition-all ${
                                isDarkMode 
                                  ? 'bg-zinc-900 border-zinc-800 focus:border-slate-500/50 focus:ring-2 focus:ring-slate-500/10 text-zinc-100' 
                                  : 'bg-slate-50 border-slate-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-500/10 text-slate-800'
                              }`}
                            />
                          </div>

                          <div>
                            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                              Key Demand & Supply Levels
                            </label>
                            <textarea
                              value={macroKeyDemandSupply}
                              onChange={(e) => setMacroKeyDemandSupply(e.target.value)}
                              placeholder="အဓိက အဝယ်/အရောင်း ဇုန်များ (ဥပမာ- Supply 2540-2550)..."
                              rows={2}
                              className={`w-full p-2 rounded-xl text-xs border focus:outline-hidden transition-all ${
                                isDarkMode 
                                  ? 'bg-zinc-900 border-zinc-800 focus:border-slate-500/50 focus:ring-2 focus:ring-slate-500/10 text-zinc-100' 
                                  : 'bg-slate-50 border-slate-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-500/10 text-slate-800'
                              }`}
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full inline-flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-bold text-xs px-4 py-3 rounded-xl transition-all cursor-pointer shadow-xs"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Save Analysis Log (မှတ်တမ်းသိမ်းရန်)</span>
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Right Column: Macro Market Analysis Logs List */}
                  <div className={`p-6 rounded-2xl border transition-all lg:col-span-2 ${
                    isDarkMode ? 'bg-zinc-900/40 border-zinc-800/80' : 'bg-white border-slate-200/80 shadow-xs'
                  }`}>
                    <div className="flex items-center justify-between mb-5 border-b pb-4 border-zinc-200/30 dark:border-zinc-800/80">
                      <div>
                        <h4 className="text-sm font-bold flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-teal-500" />
                          Market Structure & Bias History ({macroLogs.length})
                        </h4>
                      </div>
                    </div>

                    {macroLogs.length > 0 ? (
                      <div className="space-y-6 max-h-[600px] overflow-y-auto pr-1">
                        {macroLogs.map((log) => (
                          <div 
                            key={log.id}
                            className={`p-5 rounded-xl border transition-all ${
                              isDarkMode 
                                ? 'bg-zinc-950/20 border-zinc-800/80 text-zinc-100 hover:border-zinc-700/80' 
                                : 'bg-slate-50 border-slate-200/70 text-slate-800 hover:bg-slate-100/50'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-4 mb-3">
                              <div>
                                <span className="text-[10px] text-zinc-500 block uppercase font-bold">Weekly Market Bias</span>
                                <span className={`text-md font-black px-3 py-1 rounded-lg inline-block mt-0.5 ${
                                  log.weeklyBias === 'Bullish' ? 'bg-emerald-500/10 text-emerald-400' :
                                  log.weeklyBias === 'Bearish' ? 'bg-rose-500/10 text-rose-400' :
                                  'bg-amber-500/10 text-amber-400'
                                }`}>
                                  {log.weeklyBias} {log.weeklyBias === 'Bullish' ? '▲' : log.weeklyBias === 'Bearish' ? '▼' : '■'}
                                </span>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <span className="text-[10px] text-zinc-500 block uppercase font-bold">Date Logged</span>
                                  <span className="text-xs font-bold text-slate-500">{log.date}</span>
                                </div>
                                <button
                                  onClick={() => handleDeleteMacroLog(log.id)}
                                  className={`p-2 rounded-lg transition-colors cursor-pointer ${
                                    isDarkMode ? 'text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'
                                  }`}
                                  title="Delete macro log"
                                >
                                  <Trash2 className="h-4.5 w-4.5" />
                                </button>
                              </div>
                            </div>

                            {/* Matrix Visualization Grid */}
                            <div className="grid grid-cols-5 gap-2 mb-4 p-2 bg-slate-100/50 dark:bg-zinc-900/40 rounded-lg border border-slate-250/20 dark:border-zinc-800/50">
                              {Object.entries(log.timeframeMatrix).map(([tf, bias]) => (
                                <div key={tf} className="text-center p-1">
                                  <span className="text-[9px] uppercase font-bold text-zinc-500">{tf}</span>
                                  <span className={`block text-xs font-black mt-0.5 ${
                                    bias === 'Bullish' ? 'text-emerald-500' :
                                    bias === 'Bearish' ? 'text-rose-500' :
                                    'text-amber-500'
                                  }`}>
                                    {bias === 'Bullish' ? '▲ Bull' : bias === 'Bearish' ? '▼ Bear' : '■ Range'}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Sectioned notes detail */}
                            <div className="space-y-2.5">
                              {log.fundamentalSentiment && (
                                <div className="text-xs">
                                  <span className="font-bold text-[10px] uppercase text-zinc-400">Fundamentals & Sentiment</span>
                                  <p className="mt-1 leading-relaxed text-zinc-600 dark:text-zinc-300 bg-slate-100/20 dark:bg-zinc-900/10 p-2.5 rounded-md border border-slate-200/20 dark:border-zinc-800/20">
                                    {log.fundamentalSentiment}
                                  </p>
                                </div>
                              )}

                              {log.correlationNotes && (
                                <div className="text-xs">
                                  <span className="font-bold text-[10px] uppercase text-zinc-400">Market Correlation</span>
                                  <p className="mt-1 leading-relaxed text-zinc-600 dark:text-zinc-300 bg-slate-100/20 dark:bg-zinc-900/10 p-2.5 rounded-md border border-slate-200/20 dark:border-zinc-800/20">
                                    {log.correlationNotes}
                                  </p>
                                </div>
                              )}

                              {log.keyDemandSupply && (
                                <div className="text-xs">
                                  <span className="font-bold text-[10px] uppercase text-zinc-400">Key Demand & Supply Levels</span>
                                  <p className="mt-1 leading-relaxed text-zinc-600 dark:text-zinc-300 bg-slate-100/20 dark:bg-zinc-900/10 p-2.5 rounded-md border border-slate-200/20 dark:border-zinc-800/20 font-mono">
                                    {log.keyDemandSupply}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-24 text-center border border-dashed rounded-xl border-zinc-200/50 dark:border-zinc-800">
                        <Globe className="h-10 w-10 text-zinc-400 dark:text-zinc-700 mx-auto mb-2 stroke-1" />
                        <p className="text-xs text-zinc-500">ဆန်းစစ်ချက်မှတ်တမ်းမရှိသေးပါ။ အထက်ပါပုံစံမှ အသစ်စတင်ထည့်သွင်းနိုင်ပါသည်။</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TRADING LEARNING NOTES / BLOG TAB VIEW */}
            {activeTab === 'learning' && (
              <div className="space-y-6">
                <div className={`p-6 rounded-2xl border transition-all ${
                  isDarkMode ? 'bg-zinc-900/40 border-zinc-800/80 text-zinc-100' : 'bg-white border-slate-200 shadow-xs'
                }`}>
                  {/* Tab Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-zinc-200/30 dark:border-zinc-800/80">
                    <div>
                      <h4 className={`text-xl font-bold flex items-center gap-2.5 ${isDarkMode ? 'text-zinc-100' : 'text-slate-900'}`}>
                        <ImageIcon className="h-5.5 w-5.5 text-teal-500" />
                        Trading Learning Notes & Blog
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        စာများနှင့် ပုံများကို အသုံးပြု၍ သင်ယူမှုမှတ်စုများကို အော့ဖ်လိုင်းနှင့် ကလောက်ဗားရှင်းအဖြစ် အခမဲ့လုံခြုံစွာသိမ်းဆည်းပါ။
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => {
                          setEditingLearningNote(null);
                          setLearningNoteTitle('');
                          setLearningNoteContent('');
                          setLearningNoteImage('');
                          setLearningNoteTags([]);
                          setCustomTagInput('');
                          setLearningError(null);
                          setShowLearningModal(true);
                        }}
                        className="inline-flex items-center space-x-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-150 cursor-pointer animate-fade-in"
                      >
                        <Plus className="h-4 w-4" />
                        <span>သင်ခန်းစာသစ်ရေးရန်</span>
                      </button>
                    </div>
                  </div>

                  {/* Privacy Guard Notice banner */}
                  <div className={`mt-4 px-4 py-3 rounded-xl border flex items-center gap-3 text-xs font-medium leading-relaxed ${
                    isDarkMode 
                      ? 'bg-teal-950/10 border-teal-900/40 text-teal-300' 
                      : 'bg-teal-50/50 border-teal-100 text-teal-700'
                  }`}>
                    <span className="flex h-2 w-2 relative shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                    </span>
                    <span>
                      🔒 <strong>လုံခြုံရေးအပြည့်ရှိပါသည် -</strong> ဤမှတ်စုများသည် သင်၏ Google Account ({user?.email}) ဖြင့်သာ တိုက်ရိုက်ချိတ်ဆက်ထားပြီး အခြားမည်သူမျှ လုံးဝကြည့်ရှု၍မရပါ။ Account ထွက်လိုက်ပါက အလိုအလျောက် ပိတ်သွားမည်ဖြစ်ပါသည်။
                    </span>
                  </div>

                  {/* Search and status overview bar */}
                  <div className="mt-6 flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="relative flex-1 max-w-md">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="သင်ခန်းစာ ခေါင်းစဉ် သို့မဟုတ် အကြောင်းအရာ ရှာဖွေရန်..."
                          className={`w-full pl-9 pr-4 py-2 border rounded-xl text-xs focus:outline-hidden focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 ${
                            isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        />
                        <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400 dark:text-zinc-500" />
                      </div>
                      
                      <div className="text-xs text-slate-400">
                        သင်ခန်းစာစုစုပေါင်း: <strong className="text-slate-700 dark:text-zinc-200">{learningNotes.length} ခု</strong>
                      </div>
                    </div>

                    {/* Horizontal Tags Filter Bar */}
                    <div className="flex flex-wrap items-center gap-1.5 py-1 text-xs">
                      <span className={`font-semibold mr-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>Tags ဖြင့် စစ်ထုတ်ရန်:</span>
                      <button
                        onClick={() => setSelectedFilterTag(null)}
                        className={`px-3 py-1.5 rounded-xl font-semibold cursor-pointer transition-all duration-150 ${
                          selectedFilterTag === null
                            ? 'bg-teal-600 text-white shadow-xs'
                            : isDarkMode 
                              ? 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850' 
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        အားလုံး (All)
                      </button>

                      {/* Only show the tags created by the user across their notes */}
                      {allUniqueTags.length > 0 ? (
                        allUniqueTags.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => setSelectedFilterTag(tag)}
                            className={`px-3 py-1.5 rounded-xl font-semibold cursor-pointer transition-all duration-150 ${
                              selectedFilterTag === tag
                                ? 'bg-teal-600 text-white shadow-xs'
                                : isDarkMode 
                                  ? 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850' 
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            #{tag}
                          </button>
                        ))
                      ) : (
                        <span className="text-[10px] text-zinc-500 italic">ထည့်သွင်းထားသော tag မရှိသေးပါ</span>
                      )}
                    </div>
                  </div>

                  {/* Learning Notes Content Grid */}
                  {isLearningNotesLoading ? (
                    <div className="py-24 text-center">
                      <RefreshCw className="h-8 w-8 text-teal-600 animate-spin mx-auto mb-3" />
                      <p className="text-sm font-semibold text-slate-500">သင်ခန်းစာအချက်အလက်များ ဆွဲယူနေပါသည်...</p>
                    </div>
                  ) : (
                    <>
                      {/* Filter logic */}
                      {(() => {
                        const filtered = learningNotes.filter(note => {
                          const query = searchQuery.toLowerCase().trim();
                          const matchesSearch = note.title.toLowerCase().includes(query) || note.content.toLowerCase().includes(query);
                          const matchesTag = selectedFilterTag 
                            ? note.tags?.some(t => t.toLowerCase() === selectedFilterTag.toLowerCase()) 
                            : true;
                          return matchesSearch && matchesTag;
                        });

                        if (filtered.length === 0) {
                          return (
                            <div className="py-20 text-center border border-dashed rounded-xl border-zinc-200/50 dark:border-zinc-800/80 mt-6 bg-slate-50/10 dark:bg-zinc-950/5">
                              <ImageIcon className="h-12 w-12 text-zinc-400 dark:text-zinc-700 mx-auto mb-3 stroke-1" />
                              <h5 className="font-bold text-sm mb-1 text-slate-700 dark:text-zinc-300">
                                {searchQuery ? 'ရှာဖွေမှုနှင့်ကိုက်ညီသော မှတ်စုမရှိပါ' : 'သင်ခန်းစာမှတ်စု မရှိသေးပါ'}
                              </h5>
                              <p className="text-xs text-slate-400 max-w-xs mx-auto mb-6">
                                {searchQuery ? 'အခြားစာလုံးများဖြင့် ထပ်မံရှာဖွေကြည့်ပါ။' : 'စာသားနှင့် ပုံများကို အသုံးပြုပြီး သင်၏ပထမဆုံး trading သင်ခန်းစာကို စတင်ရေးသားလိုက်ပါ။'}
                              </p>
                              {!searchQuery && (
                                <button
                                  onClick={() => {
                                    setEditingLearningNote(null);
                                    setLearningNoteTitle('');
                                    setLearningNoteContent('');
                                    setLearningNoteImage('');
                                    setLearningNoteTags([]);
                                    setCustomTagInput('');
                                    setLearningError(null);
                                    setShowLearningModal(true);
                                  }}
                                  className="inline-flex items-center space-x-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  <span>သင်ခန်းစာမှတ်စုအသစ် စရေးရန်</span>
                                </button>
                              )}
                            </div>
                          );
                        }

                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
                            {filtered.map((note, idx) => (
                              <div
                                key={note.id ? `note-${note.id}-${note.row || idx}` : `note-idx-${idx}`}
                                className={`rounded-2xl border overflow-hidden flex flex-col justify-between transition-all duration-250 hover:shadow-md group ${
                                  isDarkMode 
                                    ? 'bg-zinc-900/30 border-zinc-800/70 hover:border-zinc-750/80 text-zinc-100' 
                                    : 'bg-slate-50 border-slate-200/60 hover:bg-white text-slate-800'
                                }`}
                              >
                                <div>
                                  {/* Blog Image */}
                                  {note.imageUrl ? (
                                    <div 
                                      className="relative h-44 w-full overflow-hidden bg-slate-900/5 cursor-pointer border-b border-zinc-200/10"
                                      onClick={() => setSelectedLearningNote(note)}
                                    >
                                      <img 
                                        src={getDirectDriveImageUrl(note.imageUrl)} 
                                        alt={note.title} 
                                        className="h-full w-full object-cover transition-transform duration-350 group-hover:scale-102"
                                      />
                                    </div>
                                  ) : (
                                    <div 
                                      className={`h-24 w-full flex items-center justify-center cursor-pointer border-b border-zinc-200/5 ${
                                        isDarkMode ? 'bg-zinc-850/30 text-zinc-600' : 'bg-slate-100 text-slate-300'
                                      }`}
                                      onClick={() => setSelectedLearningNote(note)}
                                    >
                                      <ImageIcon className="h-8 w-8 stroke-1 animate-pulse" />
                                    </div>
                                  )}

                                  {/* Blog Info */}
                                  <div className="p-4">
                                    <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block mb-1">
                                      {note.createdAt ? new Date(note.createdAt).toLocaleDateString('my-MM', { year: 'numeric', month: 'short', day: 'numeric' }) : 'မှတ်တမ်းမရှိ'}
                                    </span>
                                    <h5 
                                      className="font-bold text-sm tracking-tight hover:text-teal-500 dark:hover:text-teal-400 cursor-pointer line-clamp-1 mb-1.5"
                                      onClick={() => setSelectedLearningNote(note)}
                                    >
                                      {note.title}
                                    </h5>
                                    
                                    {/* Note Tags */}
                                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                                      {note.tags && note.tags.length > 0 ? (
                                        note.tags.map((tag, idx) => (
                                          <span 
                                            key={idx} 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedFilterTag(tag);
                                            }}
                                            className={`text-[10px] px-2 py-0.5 rounded-md font-semibold cursor-pointer transition-all hover:scale-105 duration-100 ${
                                              isDarkMode 
                                                ? 'bg-teal-950/40 text-teal-300 border border-teal-900/40 hover:bg-teal-900/30' 
                                                : 'bg-teal-50 text-teal-700 border border-teal-100 hover:bg-teal-100'
                                            }`}
                                          >
                                            #{tag}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-[10px] text-zinc-500 italic">No tags</span>
                                      )}
                                    </div>

                                    <p 
                                      className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-300 line-clamp-3 whitespace-pre-wrap cursor-pointer"
                                      onClick={() => setSelectedLearningNote(note)}
                                    >
                                      {note.content}
                                    </p>
                                  </div>
                                </div>

                                {/* Footer actions */}
                                <div className={`px-4 py-3 border-t flex justify-between items-center bg-slate-50/20 dark:bg-zinc-900/10 ${
                                  isDarkMode ? 'border-zinc-800/40' : 'border-slate-200/40'
                                }`}>
                                  <button
                                    onClick={() => setSelectedLearningNote(note)}
                                    className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                                  >
                                    အပြည့်အစုံဖတ်ရန် (View Details)
                                  </button>
                                  <div className="flex items-center space-x-1 shrink-0">
                                    <button
                                      onClick={() => {
                                        setEditingLearningNote(note);
                                        setLearningNoteTitle(note.title);
                                        setLearningNoteContent(note.content);
                                        setLearningNoteImage(note.imageUrl || '');
                                        setLearningNoteTags(note.tags || []);
                                        setCustomTagInput('');
                                        setLearningError(null);
                                        setShowLearningModal(true);
                                      }}
                                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                        isDarkMode ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200'
                                      }`}
                                      title="Edit note"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteLearningNote(note.id)}
                                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                        isDarkMode ? 'text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'
                                      }`}
                                      title="Delete note"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ALIGNMENT CALCULATOR TAB VIEW */}
            {activeTab === 'alignment' && (
              <div className="space-y-6">
                <div className={`p-6 rounded-2xl border transition-all ${
                  isDarkMode ? 'bg-zinc-900/40 border-zinc-800/80 text-zinc-100' : 'bg-white border-slate-200 shadow-xs'
                }`}>
                  <div className="mb-6 pb-4 border-b border-zinc-200/30 dark:border-zinc-800/80">
                    <h4 className={`text-lg font-bold flex items-center gap-2 ${isDarkMode ? 'text-zinc-100' : 'text-slate-900'}`}>
                      <Percent className="h-5 w-5 text-amber-500" />
                      Alignment Calculator (အရောင်းအဝယ်မဝင်မီ ချိန်ညှိတွက်ချက်စနစ်)
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Binance / Exchange Settings များကို မိမိတွက်ချက်မှုနှင့် ကိုက်ညီစေရန် တစ်ဆင့်ချင်း ချိန်ညှိပေးသော စနစ်ကျလှသည့် Position Engine ဖြစ်သည်။
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* INPUTS COLUMN */}
                    <div className="lg:col-span-1 space-y-4">
                      <div className={`p-5 rounded-xl border ${
                        isDarkMode ? 'bg-zinc-950/40 border-zinc-850' : 'bg-slate-50 border-slate-200/60'
                      }`}>
                        <label className={`block text-[11px] font-bold uppercase tracking-wider mb-2.5 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                          ① TRADE DIRECTION (အရောင်းအဝယ်လားရာ)
                        </label>
                        <div className="flex rounded-xl overflow-hidden border border-zinc-200/50 dark:border-zinc-850 p-1 bg-zinc-100/50 dark:bg-zinc-900/60">
                          <button
                            type="button"
                            onClick={() => setAlignDirection('LONG')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                              alignDirection === 'LONG'
                                ? 'bg-emerald-500 text-white shadow-sm'
                                : isDarkMode ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            📈 LONG (Buy)
                          </button>
                          <button
                            type="button"
                            onClick={() => setAlignDirection('SHORT')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                              alignDirection === 'SHORT'
                                ? 'bg-rose-500 text-white shadow-sm'
                                : isDarkMode ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            📉 SHORT (Sell)
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                            ENTRY PRICE (ဝင်မည့်ဈေး) *
                          </label>
                          <div className="relative flex items-center">
                            <span className="absolute left-3 text-xs font-bold text-slate-400 dark:text-zinc-500">$</span>
                            <input
                              type="number"
                              step="any"
                              required
                              placeholder="e.g. 50000"
                              value={alignEntry}
                              onChange={(e) => setAlignEntry(e.target.value)}
                              className={`w-full pl-7 pr-3 py-2.5 border rounded-xl text-sm font-semibold focus:outline-hidden transition-all ${
                                isDarkMode 
                                  ? 'bg-zinc-950 border-zinc-800 focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/10 text-zinc-100' 
                                  : 'bg-slate-50 border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800'
                              }`}
                            />
                          </div>
                        </div>

                        <div>
                          <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                            STOP LOSS PRICE (အရှုံးသတ်မှတ်ဈေး) *
                          </label>
                          <div className="relative flex items-center">
                            <span className="absolute left-3 text-xs font-bold text-slate-400 dark:text-zinc-500">$</span>
                            <input
                              type="number"
                              step="any"
                              required
                              placeholder="e.g. 49000"
                              value={alignSl}
                              onChange={(e) => setAlignSl(e.target.value)}
                              className={`w-full pl-7 pr-3 py-2.5 border rounded-xl text-sm font-semibold focus:outline-hidden transition-all ${
                                isDarkMode 
                                  ? 'bg-zinc-950 border-zinc-800 focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/10 text-zinc-100' 
                                  : 'bg-slate-50 border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800'
                              }`}
                            />
                          </div>
                        </div>

                        <div>
                          <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                            TAKE PROFIT PRICE (အမြတ်သတ်မှတ်ဈေး - Optional)
                          </label>
                          <div className="relative flex items-center">
                            <span className="absolute left-3 text-xs font-bold text-slate-400 dark:text-zinc-500">$</span>
                            <input
                              type="number"
                              step="any"
                              placeholder="e.g. 53000"
                              value={alignTp}
                              onChange={(e) => setAlignTp(e.target.value)}
                              className={`w-full pl-7 pr-3 py-2.5 border rounded-xl text-sm font-semibold focus:outline-hidden transition-all ${
                                isDarkMode 
                                  ? 'bg-zinc-950 border-zinc-800 focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/10 text-zinc-100' 
                                  : 'bg-slate-50 border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800'
                              }`}
                            />
                          </div>
                        </div>

                        <div>
                          <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                            RISK AMOUNT (အရှုံးခံမည့် ပမာဏ) *
                          </label>
                          <div className="relative flex items-center">
                            <span className="absolute left-3 text-xs font-bold text-slate-400 dark:text-zinc-500">$</span>
                            <input
                              type="number"
                              step="any"
                              required
                              placeholder="10"
                              value={alignRisk}
                              onChange={(e) => setAlignRisk(e.target.value)}
                              className={`w-full pl-7 pr-3 py-2.5 border rounded-xl text-sm font-semibold focus:outline-hidden transition-all ${
                                isDarkMode 
                                  ? 'bg-zinc-950 border-zinc-800 focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/10 text-zinc-100' 
                                  : 'bg-slate-50 border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800'
                              }`}
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={calculateAlignment}
                        className="w-full inline-flex items-center justify-center space-x-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm px-4 py-3 rounded-xl transition-all cursor-pointer shadow-xs active:scale-[0.99] mt-2 text-center animate-none"
                      >
                        <span>▶ ချိန်ညှိတွက်ချက်ရန် (Calculate)</span>
                      </button>
                    </div>

                    {/* RESULTS & CHECKLIST COLUMN */}
                    <div className="lg:col-span-2 space-y-6">
                      {!alignResult ? (
                        <div className={`h-full flex flex-col items-center justify-center border border-dashed rounded-2xl py-16 px-4 ${
                          isDarkMode ? 'border-zinc-800 bg-zinc-950/10' : 'border-slate-200 bg-slate-50/40'
                        }`}>
                          <Percent className="h-12 w-12 text-zinc-400 dark:text-zinc-700 mb-3 stroke-1" />
                          <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">ချိန်ညှိတွက်ချက်မှု ရလဒ်များ မရှိသေးပါ။</p>
                          <p className="text-xs text-zinc-400 mt-1 text-center max-w-sm">
                            အထက်ပါ Trade Direction၊ Entry/SL ဈေးနှုန်းများနှင့် Risk ပမာဏများကို ဖြည့်သွင်းပြီး &quot;ချိန်ညှိတွက်ချက်ရန်&quot; ခလုတ်ကို နှိပ်ပါ။
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* Calculation results card */}
                          <div className={`p-6 rounded-2xl border ${
                            isDarkMode ? 'bg-zinc-950/40 border-zinc-800/80' : 'bg-slate-50/50 border-slate-200'
                          }`}>
                            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-4 border-b pb-2 border-zinc-200/20 dark:border-zinc-800/80">
                              တွက်ချက်မှုရလဒ်များ (Calculation Results)
                            </h5>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-3">
                                <div className="flex justify-between items-center py-1.5 border-b border-zinc-200/10 dark:border-zinc-800/40">
                                  <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Direction (လားရာ)</span>
                                  <span className={`text-xs px-2.5 py-0.5 rounded-md font-bold ${
                                    alignDirection === 'SHORT' 
                                      ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' 
                                      : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                  }`}>
                                    {alignDirection}
                                  </span>
                                </div>

                                <div className="flex justify-between items-center py-1.5 border-b border-zinc-200/10 dark:border-zinc-800/40">
                                  <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Cost of Risk (SL Distance)</span>
                                  <span className="text-sm font-bold">${alignResult.costOfRisk}</span>
                                </div>

                                <div className="flex justify-between items-center py-1.5 border-b border-zinc-200/10 dark:border-zinc-800/40">
                                  <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Position Size (အရေအတွက်)</span>
                                  <span className="text-sm font-extrabold text-amber-500 dark:text-amber-400">{alignResult.positionSize}</span>
                                </div>

                                <div className="flex justify-between items-center py-1.5 border-b border-zinc-200/10 dark:border-zinc-800/40">
                                  <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Position Value (တန်ဖိုးစုစုပေါင်း)</span>
                                  <span className="text-sm font-bold">${alignResult.positionValue}</span>
                                </div>

                                {alignResult.rMultiple && (
                                  <div className="flex justify-between items-center py-1.5 border-b border-zinc-200/10 dark:border-zinc-800/40">
                                    <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">R Multiple (Risk/Reward)</span>
                                    <span className="text-sm font-extrabold text-emerald-500">{alignResult.rMultiple}R</span>
                                  </div>
                                )}
                              </div>

                              <div className="space-y-3">
                                <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                                  isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
                                }`}>
                                  <div>
                                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 tracking-wider">Required Leverage (လိုအပ်သော မြှောက်ဖော်)</span>
                                    <span className="block text-[10px] text-zinc-500 mt-0.5">Formula: Position Value ÷ Risk Amount</span>
                                  </div>
                                  <span className="text-3xl font-extrabold text-amber-500 tracking-tight mt-2">{alignResult.leverage}x</span>
                                </div>

                                <div className="flex justify-between items-center py-1.5 border-b border-zinc-200/10 dark:border-zinc-800/40 mt-1">
                                  <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Margin (Isolated - အာမခံငွေ)</span>
                                  <span className="text-sm font-bold text-emerald-500">${alignResult.margin}</span>
                                </div>

                                <div className="flex justify-between items-center py-1.5 border-b border-zinc-200/10 dark:border-zinc-800/40">
                                  <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Est. Liquidation Price</span>
                                  <span className={`text-sm font-bold ${alignResult.liqMatchesSL ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    ${alignResult.liqApprox}
                                  </span>
                                </div>

                                <div className="flex justify-between items-center py-1.5 border-b border-zinc-200/10 dark:border-zinc-800/40">
                                  <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Your Stop Loss (ရွေးထားသော SL)</span>
                                  <span className="text-sm font-bold">${alignResult.slPrice}</span>
                                </div>
                              </div>
                            </div>

                            {/* Liquidation gap notice */}
                            <div className={`mt-4 p-3 rounded-xl border text-xs font-semibold ${
                              alignResult.liqMatchesSL 
                                ? (isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-700')
                                : (isDarkMode ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-rose-50 border-rose-100 text-rose-700')
                            }`}>
                              {alignResult.liqMatchesSL ? (
                                <span>✅ Liquidation ≈ SL — Setting ကိုက်ညီမှုရှိပြီး အန္တရာယ်ကင်းပါသည်။</span>
                              ) : (
                                <span>⚠ Liquidation ≠ SL — Binance Calculator တွင် ပြန်လည်စစ်ဆေးရန် လိုအပ်ပါသည်။</span>
                              )}
                            </div>
                          </div>

                          {/* Pre-Entry Checklist */}
                          <div className={`p-6 rounded-2xl border ${
                            isDarkMode ? 'bg-zinc-950/40 border-zinc-800/80' : 'bg-slate-50/50 border-slate-200'
                          }`}>
                            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-4 border-b pb-2 border-zinc-200/20 dark:border-zinc-800/80">
                              ② Pre-Entry Checklist (မဝင်မီ လုပ်ဆောင်ရမည့်အဆင့်များ)
                            </h5>

                            <div className="space-y-2.5">
                              {[
                                { text: 'Isolated Margin Mode ပြောင်းထားလား စစ်ပါ', detail: 'Cross → Isolated သို့ ပြောင်းလဲရန်' },
                                { text: `Leverage ကို ${alignResult.leverage}x ပြောင်းလဲပေးပါ`, detail: `Required Leverage: ${alignResult.leverage}x ဖြစ်ရမည်` },
                                { text: `${alignResult.positionSize} ${alignDirection} ကို ဖွင့်ပါ`, detail: `Isolated Margin: $${alignResult.margin} အသုံးပြုမည်` },
                                { text: `Liquidation ≈ $${alignResult.liqApprox} ဖြစ်မဖြစ် Binance တွင် စစ်ပါ`, detail: `Target Liquidation Price: ~$${alignResult.slPrice}` }
                              ].map((item, idx) => {
                                const isChecked = alignChecks[idx];
                                return (
                                  <div
                                    key={idx}
                                    onClick={() => {
                                      const next = [...alignChecks];
                                      next[idx] = !next[idx];
                                      setAlignChecks(next);
                                    }}
                                    className={`p-3 border rounded-xl flex items-start gap-3 cursor-pointer transition-all ${
                                      isChecked 
                                        ? 'bg-emerald-500/10 border-emerald-500/40' 
                                        : isDarkMode ? 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700' : 'bg-white border-slate-200 hover:border-slate-300'
                                    }`}
                                  >
                                    <div className={`h-4.5 w-4.5 rounded-md flex items-center justify-center border shrink-0 mt-0.5 transition-all ${
                                      isChecked 
                                        ? 'bg-emerald-500 border-emerald-500 text-white' 
                                        : isDarkMode ? 'border-zinc-700 bg-zinc-950' : 'border-slate-300 bg-slate-50'
                                    }`}>
                                      {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                                    </div>
                                    <div>
                                      <p className={`text-xs font-bold ${isChecked ? 'text-emerald-500' : isDarkMode ? 'text-zinc-200' : 'text-slate-800'}`}>
                                        {item.text}
                                      </p>
                                      <p className="text-[10px] text-zinc-500 mt-0.5">{item.detail}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {alignChecks.every(Boolean) && (
                              <div className="mt-5 p-3.5 bg-emerald-500/10 border border-emerald-500 text-emerald-500 rounded-xl text-center font-bold text-xs tracking-wider">
                                ✅ ALL CHECKS PASSED — READY TO ENTER THE TRADE
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* INFO & EDUCATION FOOTERS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pt-6 border-t border-zinc-200/20 dark:border-zinc-800/80">
                    <div className={`p-5 rounded-xl border ${
                      isDarkMode ? 'bg-zinc-950/20 border-zinc-800/60' : 'bg-slate-50/30 border-slate-200/80'
                    }`}>
                      <h6 className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-2">
                        ③ Isolated vs Cross Margin (စနစ် နှိုင်းယှဉ်ချက်)
                      </h6>
                      <div className="text-xs leading-relaxed space-y-2 text-slate-500 dark:text-zinc-400">
                        <p>
                          <strong>Cross Margin</strong> — အကောင့်အတွင်းရှိ Balance အားလုံးကို အာမခံ (Collateral) သုံးစွဲသည့်အတွက် လုံခြုံမှုအားနည်းပြီး Exchange မှ Position size ကို Balance အပေါ်မူတည်၍ ကန့်သတ်တတ်သည်။
                        </p>
                        <p>
                          <strong>Isolated Margin</strong> — လက်ရှိ Trade အတွက်သာ သီးသန့်ခွဲဝေအာမခံခြင်း ဖြစ်သည်။ ဥပမာ- $10 သာ Allocate လုပ်ထားပါက Stop Loss ထိခိုက်ခဲ့လျှင်လည်း <strong>$10 သာ အတိအကျ ဆုံးရှုံးမည်ဖြစ်သည်</strong>။
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className={`p-4 rounded-xl border-l-4 border-amber-500 ${
                        isDarkMode ? 'bg-zinc-950/20 border-zinc-800/60' : 'bg-amber-50/30 border-amber-200/80'
                      }`}>
                        <h6 className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">
                          ⚠ Important Rule (ရွှေရောင်ဥပဒေသ)
                        </h6>
                        <ul className="text-xs space-y-1 text-slate-500 dark:text-zinc-400 list-disc pl-4 leading-relaxed">
                          <li>ကိုယ့် Calculation ကို Exchange အတွက် <strong>ပြောင်းမပေးပါနဲ့</strong></li>
                          <li>Exchange Setting ကို ကိုယ့် Calculation နဲ့ <strong>ကိုက်အောင် ပြန်ချိန်ပါ</strong></li>
                        </ul>
                      </div>

                      <div className={`p-4 rounded-xl text-center italic border ${
                        isDarkMode ? 'bg-zinc-900/60 border-zinc-850' : 'bg-slate-100/50 border-slate-200/60'
                      }`}>
                        <p className={`text-xs font-serif ${isDarkMode ? 'text-zinc-300' : 'text-slate-700'}`}>
                          &quot;The system obeys the one who commands themselves first.&quot;
                        </p>
                        <span className="block text-[10px] text-zinc-500 dark:text-zinc-500 mt-1 font-semibold">
                          Formula: Leverage = Position Value ÷ Risk Amount
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CRYPTO & FOREX WATCHLIST TAB VIEW */}
            {activeTab === 'watchlist' && (
              <div className="space-y-5">
                {/* Top Controls & Metrics Bar */}
                <div className={`p-5 rounded-2xl border transition-all ${
                  isDarkMode ? 'bg-zinc-900/50 border-zinc-800/70 text-zinc-100' : 'bg-white border-slate-200/80 shadow-xs'
                }`}>
                  {/* Header Row */}
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-zinc-200/40 dark:border-zinc-800/60">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2.5 rounded-xl ${isDarkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-100 text-slate-700'}`}>
                        <Eye className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold tracking-tight">Crypto & Forex Watchlist</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                            isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {watchlistItems.length} Setups
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          စောင့်ကြည့်လိုသော Market Setups, Key Levels နှင့် Chart ပုံများကို Google Drive / Sheet တွင် စနစ်တကျ မှတ်တမ်းတင်ခြင်း
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {token && spreadsheetId && (
                        <button
                          type="button"
                          onClick={() => user?.uid && loadWatchlist(user.uid, false)}
                          disabled={isWatchlistLoading}
                          className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                            isDarkMode ? 'border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                          }`}
                          title="Refresh Watchlist from Google"
                        >
                          <RefreshCw className={`h-4 w-4 ${isWatchlistLoading ? 'animate-spin text-zinc-300' : ''}`} />
                        </button>
                      )}
                      
                      <button
                        type="button"
                        onClick={() => {
                          setEditingWatchlistItem(null);
                          setWatchlistPair('');
                          setWatchlistCategory('Crypto');
                          setWatchlistBias('Bullish');
                          setWatchlistStatus('Watching');
                          setWatchlistTimeframe('4H');
                          setWatchlistKeyLevels('');
                          setWatchlistNotes('');
                          setWatchlistImage('');
                          setWatchlistError(null);
                          setShowWatchlistModal(true);
                        }}
                        className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs transition-all shadow-sm cursor-pointer active:scale-95"
                      >
                        <Plus className="h-4 w-4 stroke-[2.5]" />
                        <span>Add Setup</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Counters */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-4">
                    <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-zinc-950/40 border-zinc-800/50' : 'bg-slate-50 border-slate-200/60'}`}>
                      <span className="text-[10px] uppercase font-medium text-zinc-400 block mb-0.5">Total Pairs</span>
                      <span className="text-lg font-bold text-zinc-100 dark:text-zinc-100">{watchlistStats.total}</span>
                    </div>
                    <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-zinc-950/40 border-zinc-800/50' : 'bg-slate-50 border-slate-200/60'}`}>
                      <span className="text-[10px] uppercase font-medium text-zinc-400 block mb-0.5">Ready to Enter</span>
                      <span className="text-lg font-bold text-zinc-200">{watchlistStats.ready}</span>
                    </div>
                    <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-zinc-950/40 border-zinc-800/50' : 'bg-slate-50 border-slate-200/60'}`}>
                      <span className="text-[10px] uppercase font-medium text-zinc-400 block mb-0.5">Crypto</span>
                      <span className="text-lg font-bold text-zinc-200">{watchlistStats.crypto}</span>
                    </div>
                    <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-zinc-950/40 border-zinc-800/50' : 'bg-slate-50 border-slate-200/60'}`}>
                      <span className="text-[10px] uppercase font-medium text-zinc-400 block mb-0.5">Forex</span>
                      <span className="text-lg font-bold text-zinc-200">{watchlistStats.forex}</span>
                    </div>
                    <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-zinc-950/40 border-zinc-800/50' : 'bg-slate-50 border-slate-200/60'}`}>
                      <span className="text-[10px] uppercase font-medium text-emerald-400/90 block mb-0.5">Bullish</span>
                      <span className="text-lg font-bold text-emerald-400">{watchlistStats.bullish}</span>
                    </div>
                    <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-zinc-950/40 border-zinc-800/50' : 'bg-slate-50 border-slate-200/60'}`}>
                      <span className="text-[10px] uppercase font-medium text-rose-400/90 block mb-0.5">Bearish</span>
                      <span className="text-lg font-bold text-rose-400">{watchlistStats.bearish}</span>
                    </div>
                  </div>

                  {/* Filter Toolbar & Search */}
                  <div className="mt-4 pt-4 border-t border-zinc-200/30 dark:border-zinc-800/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Category Filter Pills */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(['ALL', 'Crypto', 'Forex', 'Commodity', 'Index'] as const).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setWatchlistFilterCategory(cat)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            watchlistFilterCategory === cat
                              ? (isDarkMode ? 'bg-zinc-750 text-white font-bold' : 'bg-slate-800 text-white font-bold')
                              : (isDarkMode ? 'bg-zinc-950/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                          }`}
                        >
                          {cat === 'ALL' ? 'All Assets' : cat}
                        </button>
                      ))}
                    </div>

                    {/* Filters and Search */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Bias Filter */}
                      <select
                        value={watchlistFilterBias}
                        onChange={(e) => setWatchlistFilterBias(e.target.value as any)}
                        className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer focus:outline-hidden ${
                          isDarkMode ? 'bg-zinc-950 border-zinc-800/80 text-zinc-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <option value="ALL">All Biases</option>
                        <option value="Bullish">Bullish</option>
                        <option value="Bearish">Bearish</option>
                        <option value="Neutral">Neutral</option>
                        <option value="Monitoring">Monitoring</option>
                      </select>

                      {/* Status Filter */}
                      <select
                        value={watchlistFilterStatus}
                        onChange={(e) => setWatchlistFilterStatus(e.target.value as any)}
                        className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer focus:outline-hidden ${
                          isDarkMode ? 'bg-zinc-950 border-zinc-800/80 text-zinc-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="Ready to Enter">Ready to Enter</option>
                        <option value="Setup Forming">Setup Forming</option>
                        <option value="Watching">Watching</option>
                        <option value="Triggered">Triggered</option>
                        <option value="Invalidated">Invalidated</option>
                      </select>

                      {/* Search Bar */}
                      <div className="relative flex items-center min-w-[190px]">
                        <Search className="h-3.5 w-3.5 absolute left-3 text-zinc-400" />
                        <input
                          type="text"
                          placeholder="Search pairs, levels..."
                          value={watchlistSearch}
                          onChange={(e) => setWatchlistSearch(e.target.value)}
                          className={`w-full pl-8 pr-7 py-1.5 text-xs font-medium rounded-lg border focus:outline-hidden transition-all ${
                            isDarkMode 
                              ? 'bg-zinc-950 border-zinc-800/80 text-zinc-100 focus:border-zinc-600' 
                              : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-slate-400'
                          }`}
                        />
                        {watchlistSearch && (
                          <button
                            type="button"
                            onClick={() => setWatchlistSearch('')}
                            className="absolute right-2 text-zinc-400 hover:text-zinc-200 text-xs"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Watchlist Cards Grid */}
                {isWatchlistLoading && watchlistItems.length === 0 ? (
                  <div className="py-24 text-center">
                    <RefreshCw className="h-7 w-7 animate-spin mx-auto text-zinc-400 mb-3" />
                    <p className="text-xs font-medium text-zinc-400">Watchlist ဒေတာများ ရယူနေပါသည်...</p>
                  </div>
                ) : filteredWatchlistItems.length === 0 ? (
                  <div className={`py-16 text-center border border-dashed rounded-2xl ${
                    isDarkMode ? 'border-zinc-800/80 bg-zinc-900/20' : 'border-slate-200 bg-slate-50/50'
                  }`}>
                    <Eye className="h-10 w-10 text-zinc-500 mx-auto mb-2.5 stroke-1" />
                    <h5 className="font-bold text-sm text-zinc-300 dark:text-zinc-200 mb-1">
                      {watchlistSearch ? 'ကိုက်ညီသော Watchlist Setup မရှိပါ' : 'Watchlist Setups မရှိသေးပါ'}
                    </h5>
                    <p className="text-xs text-zinc-500 max-w-sm mx-auto mb-4">
                      {watchlistSearch 
                        ? 'အခြား စာလုံးများဖြင့် ရှာဖွေကြည့်ပါ သို့မဟုတ် Filter ကို ပြောင်းလဲပါ။' 
                        : 'Crypto နှင့် Forex pairs များအတွက် စောင့်ကြည့်လိုသော Key Levels နှင့် Analysis ပုံများကို စတင်ထည့်သွင်းပါ။'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingWatchlistItem(null);
                        setWatchlistPair('BTC/USDT');
                        setWatchlistCategory('Crypto');
                        setWatchlistBias('Bullish');
                        setWatchlistStatus('Watching');
                        setWatchlistTimeframe('4H');
                        setWatchlistKeyLevels('');
                        setWatchlistNotes('');
                        setWatchlistImage('');
                        setShowWatchlistModal(true);
                      }}
                      className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Setup အသစ် ထည့်သွင်းရန်</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredWatchlistItems.map((item) => {
                      const isBull = item.bias === 'Bullish';
                      const isBear = item.bias === 'Bearish';
                      const isReady = item.status === 'Ready to Enter';

                      return (
                        <div
                          key={item.id}
                          className={`rounded-2xl border flex flex-col justify-between transition-all duration-200 overflow-hidden ${
                            isDarkMode 
                              ? 'border-zinc-800/70 bg-zinc-900/40 hover:border-zinc-700/80 hover:bg-zinc-900/60' 
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div>
                            {/* Chart Screenshot Thumbnail */}
                            {item.imageUrl ? (
                              <div 
                                onClick={() => setLightboxImage(item.imageUrl || null)}
                                className="relative h-40 w-full overflow-hidden bg-zinc-950 cursor-zoom-in border-b border-zinc-800/40 group/img"
                                title="ပုံကို အပြည့်ချဲ့ကြည့်ရန် (Click to view full image)"
                              >
                                <img
                                  src={getDirectDriveImageUrl(item.imageUrl)}
                                  alt={item.pair}
                                  className="h-full w-full object-cover transition-transform duration-300 group-hover/img:scale-103"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                  <span className="bg-zinc-900/90 text-zinc-200 text-[11px] font-medium px-2.5 py-1 rounded-lg backdrop-blur-xs flex items-center gap-1.5 shadow-sm border border-zinc-700/50">
                                    <ZoomIn className="h-3.5 w-3.5 text-zinc-300" />
                                    <span>Zoom Chart</span>
                                  </span>
                                </div>
                              </div>
                            ) : null}

                            {/* Card Content Area */}
                            <div className="p-4 space-y-3">
                              {/* Pair Header & Badges */}
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 
                                      onClick={() => setSelectedWatchlistItem(item)}
                                      className="text-base font-bold tracking-tight hover:text-zinc-300 cursor-pointer text-zinc-100"
                                    >
                                      {item.pair}
                                    </h4>
                                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                                      isDarkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {item.category}
                                    </span>
                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                      isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                      {item.timeframe}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-zinc-500 block mt-0.5">
                                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString('my-MM', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently added'}
                                  </span>
                                </div>

                                {/* Bias Badge */}
                                <span className={`text-xs px-2.5 py-0.5 rounded-md font-semibold shrink-0 ${
                                  isBull 
                                    ? 'bg-emerald-500/10 text-emerald-400' 
                                    : isBear 
                                      ? 'bg-rose-500/10 text-rose-400' 
                                      : 'bg-zinc-800 text-zinc-300'
                                }`}>
                                  {isBull ? '▲ Bullish' : isBear ? '▼ Bearish' : item.bias}
                                </span>
                              </div>

                              {/* Status Row with interactive Quick-Select */}
                              <div className={`flex items-center justify-between text-xs py-1 px-2.5 rounded-lg border ${
                                isDarkMode ? 'bg-zinc-950/40 border-zinc-800/50' : 'bg-slate-50 border-slate-200/60'
                              }`}>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-medium text-zinc-500">Status:</span>
                                  <span className={`font-semibold text-xs ${
                                    isReady ? 'text-emerald-400' : isBull ? 'text-zinc-200' : 'text-zinc-300'
                                  }`}>
                                    {item.status}
                                  </span>
                                </div>

                                {/* Status Quick Switcher */}
                                <select
                                  value={item.status}
                                  onChange={(e) => handleQuickWatchlistStatus(item, e.target.value as any)}
                                  className={`text-[11px] font-medium px-1.5 py-0.5 rounded bg-transparent cursor-pointer focus:outline-hidden ${
                                    isDarkMode ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-600'
                                  }`}
                                  title="Change status"
                                >
                                  <option value="Watching">Watching</option>
                                  <option value="Setup Forming">Setup Forming</option>
                                  <option value="Ready to Enter">Ready to Enter</option>
                                  <option value="Triggered">Triggered</option>
                                  <option value="Invalidated">Invalidated</option>
                                </select>
                              </div>

                              {/* Key Levels Box */}
                              {item.keyLevels && (
                                <div className={`p-2.5 rounded-lg border text-xs ${
                                  isDarkMode ? 'bg-zinc-950/50 border-zinc-800/50' : 'bg-slate-50 border-slate-200/60'
                                }`}>
                                  <span className="text-[10px] font-semibold text-zinc-400 block mb-1 flex items-center gap-1">
                                    <Target className="h-3 w-3 text-zinc-400" />
                                    <span>Key Levels / POI</span>
                                  </span>
                                  <p className="font-mono text-[11px] leading-relaxed text-zinc-300 break-words whitespace-pre-wrap">
                                    {item.keyLevels}
                                  </p>
                                </div>
                              )}

                              {/* Notes & Analysis Preview */}
                              {item.notes && (
                                <div>
                                  <p 
                                    onClick={() => setSelectedWatchlistItem(item)}
                                    className="text-xs leading-relaxed text-zinc-400 hover:text-zinc-200 line-clamp-2 cursor-pointer whitespace-pre-wrap"
                                  >
                                    {item.notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Card Footer Actions */}
                          <div className={`p-3 border-t flex items-center justify-between gap-2 ${
                            isDarkMode ? 'border-zinc-800/50 bg-zinc-950/20' : 'border-slate-200/60 bg-slate-50/50'
                          }`}>
                            {/* Convert to Trade CTA */}
                            <button
                              type="button"
                              onClick={() => handleConvertWatchlistToTrade(item)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-semibold text-xs transition-all cursor-pointer active:scale-95"
                              title="Convert this setup directly into a Trade Journal entry"
                            >
                              <Play className="h-3 w-3 fill-current" />
                              <span>Log Trade</span>
                            </button>

                            <div className="flex items-center gap-1 shrink-0">
                              {/* Open Google Doc if exists */}
                              {item.docUrl && (
                                <a
                                  href={item.docUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                                    isDarkMode ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                                  }`}
                                  title="Open synchronized Google Doc"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                </a>
                              )}

                              {/* Edit Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingWatchlistItem(item);
                                  setWatchlistPair(item.pair);
                                  setWatchlistCategory(item.category);
                                  setWatchlistBias(item.bias);
                                  setWatchlistStatus(item.status);
                                  setWatchlistTimeframe(item.timeframe);
                                  setWatchlistKeyLevels(item.keyLevels || '');
                                  setWatchlistNotes(item.notes || '');
                                  setWatchlistImage(item.imageUrl || '');
                                  setWatchlistError(null);
                                  setShowWatchlistModal(true);
                                }}
                                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                                  isDarkMode ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                                }`}
                                title="Edit Setup"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>

                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteWatchlistItem(item.id)}
                                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                                  isDarkMode ? 'text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10' : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                                }`}
                                title="Delete Setup"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>

    {/* FOOTER */}
    <footer className={`border-t transition-colors mt-16 py-8 text-center text-xs font-medium ${
      isDarkMode ? 'bg-zinc-900/40 border-zinc-800/80 text-zinc-500' : 'bg-white border-slate-200 text-slate-400'
    } ${needsAuth ? '' : 'md:pl-64'}`}>
      <div className="w-full px-6 sm:px-8 lg:px-10">
        <p>© 2026 Trading Journal Admin Dashboard. All Trade records and Notes are stored securely in your private Google Drive.</p>
      </div>
    </footer>

    {/* ADD / EDIT TRADE MODAL */}
      <AnimatePresence>
        {/* NOTION-STYLE TRADE DETAIL POPUP MODAL */}
        {selectedTrade && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            {/* Overlay */}
            <div 
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
              onClick={() => setSelectedTrade(null)}
            />

            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden select-none cursor-default border ${
                isDarkMode ? 'bg-zinc-950 border-zinc-900/50 text-zinc-100' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              {/* Modal Header */}
              <div className={`px-6 py-4 flex items-center justify-between border-b ${
                isDarkMode ? 'border-zinc-800 bg-zinc-900/30' : 'border-slate-200 bg-slate-50/50'
              }`}>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-100 text-slate-500'
                  }`}>
                    Trade Detail
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Row #{selectedTrade.row}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      const tradeToEdit = selectedTrade;
                      setSelectedTrade(null);
                      handleEditClick(tradeToEdit);
                    }}
                    className={`p-1.5 rounded-lg border text-xs font-bold transition-all duration-200 cursor-pointer flex items-center space-x-1 ${
                      isDarkMode 
                        ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800' 
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
                    }`}
                  >
                    <Edit2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>ပြင်ဆင်ရန် (Edit)</span>
                  </button>
                  <button
                    onClick={() => setSelectedTrade(null)}
                    className={`p-1.5 rounded-lg border text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center ${
                      isDarkMode 
                        ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border-zinc-800 hover:text-white' 
                        : 'bg-white hover:bg-slate-50 text-slate-500 border-slate-200 shadow-2xs hover:text-slate-800'
                    }`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                {/* Header Block */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200/40 dark:border-zinc-800/60">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center space-x-2">
                      <span className={isDarkMode ? 'text-zinc-400' : 'text-slate-400'}>#{selectedTrade.tradeNumber}</span>
                      <span>{selectedTrade.pair || 'Asset Name'}</span>
                    </h2>
                    <p className={`text-xs mt-1 font-medium ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                      Date: <span className="font-semibold">{selectedTrade.date}</span>
                    </p>
                  </div>
                  <div className="flex items-center">
                    {/* Status Badge */}
                    {selectedTrade.winLoss === 'TP' ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        TP
                      </span>
                    ) : selectedTrade.winLoss === 'SL' ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        SL
                      </span>
                    ) : selectedTrade.winLoss === 'Breakeven' ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                        Breakeven
                      </span>
                    ) : selectedTrade.winLoss === 'Trailing Stop' ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-teal-500/10 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-500/20">
                        Trailing Stop
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Pending
                      </span>
                    )}
                  </div>
                </div>

                {/* Properties Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center text-xs">
                      <span className={`w-32 shrink-0 font-semibold ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Trade Number</span>
                      <span className="font-mono font-bold text-sm">{selectedTrade.tradeNumber}</span>
                    </div>
                    <div className="flex items-center text-xs">
                      <span className={`w-32 shrink-0 font-semibold ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Date</span>
                      <span className="font-medium">{selectedTrade.date}</span>
                    </div>
                    <div className="flex items-center text-xs">
                      <span className={`w-32 shrink-0 font-semibold ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Pair / Asset</span>
                      <span className="font-bold">{selectedTrade.pair}</span>
                    </div>
                    <div className="flex items-center text-xs">
                      <span className={`w-32 shrink-0 font-semibold ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Entry Price</span>
                      <span className="font-mono font-semibold">{selectedTrade.entryPrice ? selectedTrade.entryPrice.toLocaleString() : '-'}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center text-xs">
                      <span className={`w-32 shrink-0 font-semibold ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Stop Loss (SL)</span>
                      <span className="font-mono font-semibold text-rose-500">{selectedTrade.sl ? selectedTrade.sl.toLocaleString() : '-'}</span>
                    </div>
                    <div className="flex items-center text-xs">
                      <span className={`w-32 shrink-0 font-semibold ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Take Profit (TP)</span>
                      <span className="font-mono font-semibold text-emerald-500">{selectedTrade.tp ? selectedTrade.tp.toLocaleString() : '-'}</span>
                    </div>
                    <div className="flex items-center text-xs">
                      <span className={`w-32 shrink-0 font-semibold ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Risk to Reward (R:R)</span>
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold ${
                        isDarkMode ? 'bg-zinc-800 text-zinc-300 border border-zinc-700' : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>{selectedTrade.rr || '-'}</span>
                    </div>
                    <div className="flex items-center text-xs">
                      <span className={`w-32 shrink-0 font-semibold ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>P&L in $</span>
                      <span className={`font-mono font-extrabold text-sm ${
                        (selectedTrade.winLoss === 'TP' || (selectedTrade.winLoss === 'Trailing Stop' && parsePnLValue(selectedTrade.pnl, selectedTrade.winLoss) > 0) || (selectedTrade.pnl && (selectedTrade.pnl.startsWith('+') || selectedTrade.pnl.startsWith('$+'))))
                          ? 'text-emerald-500' 
                          : (selectedTrade.winLoss === 'SL' || (selectedTrade.winLoss === 'Trailing Stop' && parsePnLValue(selectedTrade.pnl, selectedTrade.winLoss) < 0) || (selectedTrade.pnl && (selectedTrade.pnl.startsWith('-') || selectedTrade.pnl.includes('-'))))
                            ? 'text-rose-500' 
                            : 'text-slate-400'
                      }`}>{selectedTrade.pnl || '-'}</span>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-250 dark:border-zinc-800" />

                {/* Watchlist Setup, Commitment, Notes */}
                <div className="space-y-4">
                  <div>
                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                      Watchlist Details & Setup (ရှာဖွေမှု/ အစီအစဉ်)
                    </h4>
                    <div className={`p-4 rounded-xl text-sm leading-relaxed whitespace-pre-wrap font-medium border ${
                      isDarkMode ? 'bg-zinc-900/20 border-zinc-800/50 text-zinc-300' : 'bg-slate-50 border-slate-200/60 text-slate-700'
                    }`}>
                      {selectedTrade.watchlist || 'အသေးစိတ်အချက်အလက် မရှိပါ။'}
                    </div>
                  </div>

                  <div>
                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                      Commitment (စိတ်ပိုင်းဆိုင်ရာ ကတိကဝတ်)
                    </h4>
                    <div className={`p-4 rounded-xl text-sm leading-relaxed whitespace-pre-wrap font-medium border ${
                      isDarkMode ? 'bg-zinc-900/20 border-zinc-800/50 text-zinc-300' : 'bg-slate-50 border-slate-200/60 text-slate-700'
                    }`}>
                      {selectedTrade.commitment || 'အသေးစိတ်အချက်အလက် မရှိပါ။'}
                    </div>
                  </div>

                  <div>
                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                      Remarks / Note (မှတ်ချက်များ)
                    </h4>
                    <div className={`p-4 rounded-xl text-sm leading-relaxed whitespace-pre-wrap font-medium border ${
                      isDarkMode ? 'bg-zinc-900/20 border-zinc-800/50 text-zinc-300' : 'bg-slate-50 border-slate-200/60 text-slate-700'
                    }`}>
                      {selectedTrade.notes || 'အသေးစိတ်အချက်အလက် မရှိပါ။'}
                    </div>
                  </div>
                </div>

                <hr className="border-slate-250 dark:border-zinc-800" />

                {/* Screenshots Gallery Section */}
                <div>
                  <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                    Trade Screenshots (SBF Before & After)
                  </h4>
                  {(() => {
                    const photos = (selectedTrade.tradePhoto || '').split(',');
                    const beforePhoto = photos[0] || '';
                    const afterPhoto = photos[1] || '';

                    if (!beforePhoto && !afterPhoto) {
                      return (
                        <div className={`text-center py-8 rounded-xl border border-dashed ${
                          isDarkMode ? 'border-zinc-800 text-zinc-500' : 'border-slate-200 text-slate-400'
                        }`}>
                          ပုံများမရှိပါ။
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {beforePhoto && (
                          <div className={`relative flex flex-col items-center p-3 rounded-xl border ${
                            isDarkMode ? 'bg-zinc-900/20 border-zinc-800/60' : 'bg-slate-50 border-slate-200/60'
                          }`}>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-500 mb-2">Before Trade</span>
                            <div className="relative w-full aspect-video rounded-lg overflow-hidden border dark:border-zinc-800 group">
                              <img 
                                src={getDirectDriveImageUrl(beforePhoto)} 
                                alt="Before Trade" 
                                className="w-full h-full object-cover cursor-zoom-in group-hover:scale-[1.02] transition-transform duration-350"
                                onClick={() => setLightboxImage(beforePhoto)}
                              />
                            </div>
                          </div>
                        )}
                        {afterPhoto && (
                          <div className={`relative flex flex-col items-center p-3 rounded-xl border ${
                            isDarkMode ? 'bg-zinc-900/20 border-zinc-800/60' : 'bg-slate-50 border-slate-200/60'
                          }`}>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mb-2">After Trade</span>
                            <div className="relative w-full aspect-video rounded-lg overflow-hidden border dark:border-zinc-800 group">
                              <img 
                                src={getDirectDriveImageUrl(afterPhoto)} 
                                alt="After Trade" 
                                className="w-full h-full object-cover cursor-zoom-in group-hover:scale-[1.02] transition-transform duration-350"
                                onClick={() => setLightboxImage(afterPhoto)}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* ADD / EDIT TRADE MODAL */}
        {showFormModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            {/* Overlay */}
            <div 
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
              onClick={() => setShowFormModal(false)}
            />

            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className={`relative z-10 w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl text-left shadow-2xl overflow-hidden select-none cursor-default border ${
                isDarkMode ? 'bg-zinc-950 border-zinc-900/50 text-zinc-100 shadow-black/80' : 'bg-white border-slate-200 text-slate-800 shadow-slate-200/50'
              }`}
            >
              {/* Header */}
              <div className={`px-6 py-4 flex items-center justify-between border-b shrink-0 ${
                isDarkMode ? 'bg-zinc-900/40 border-zinc-800' : 'bg-slate-50/50 border-slate-200'
              }`}>
                <div className="flex items-center space-x-2.5">
                  <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-zinc-800/80 text-emerald-400' : 'bg-slate-100 text-slate-700'}`}>
                    <Plus className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold tracking-tight">
                      {editingTrade ? 'Trading Record ပြင်ဆင်ရန် (Edit Trade)' : 'Trading Record အသစ်ထည့်ရန် (Add Trade)'}
                    </h3>
                    <p className={`text-[10px] mt-0.5 font-medium ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                      Google Sheets သို့ တိုက်ရိုက်သိမ်းဆည်းပေးမည်ဖြစ်ပါသည်။
                    </p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="flex-1 flex flex-col overflow-hidden">
                {/* Scrollable content */}
                <div className={`flex-1 overflow-y-auto px-6 py-5 space-y-5 ${isDarkMode ? 'bg-zinc-950/40' : 'bg-white'}`}>
                  {formError && (
                    <div className="p-3 bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold leading-relaxed">
                      ⚠️ {formError}
                    </div>
                  )}

                  {/* Section 1: Core Trade Identifiers */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                        ၁။ အခြေခံ အချက်အလက် (Core Identifiers)
                      </h4>
                      <hr className="flex-1 ml-4 border-dashed border-slate-300 dark:border-zinc-800" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Pair / Asset */}
                      <div>
                        <label className={`block text-[11px] font-bold mb-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>Pair / Asset</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. TAO, BTC/USD"
                          value={formData.pair}
                          onChange={(e) => setFormData({ ...formData, pair: e.target.value })}
                          className={`w-full px-3 py-2 border border-transparent rounded-lg text-xs font-semibold tracking-wide transition-all duration-150 focus:outline-hidden ${
                            isDarkMode 
                              ? 'bg-zinc-900/60 hover:bg-zinc-900/80 focus:bg-zinc-950 text-zinc-100 focus:border-zinc-800' 
                              : 'bg-slate-100/50 hover:bg-slate-100/80 focus:bg-white text-slate-800 focus:border-slate-200'
                          }`}
                        />
                      </div>

                      {/* Date */}
                      <div>
                        <label className={`block text-[11px] font-bold mb-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>Date</label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-zinc-500 pointer-events-none" />
                          <input
                            type="date"
                            required
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className={`w-full pl-9 pr-3 py-2 border border-transparent rounded-lg text-xs font-semibold transition-all duration-150 focus:outline-hidden cursor-pointer ${
                              isDarkMode 
                                ? 'bg-zinc-900/60 hover:bg-zinc-900/80 focus:bg-zinc-950 text-zinc-100 dark:[color-scheme:dark] focus:border-zinc-800' 
                                : 'bg-slate-100/50 hover:bg-slate-100/80 focus:bg-white text-slate-800 focus:border-slate-200'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Trade Number */}
                      <div>
                        <label className={`block text-[11px] font-bold mb-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>Trade Number</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 001"
                          value={formData.tradeNumber}
                          onChange={(e) => setFormData({ ...formData, tradeNumber: e.target.value.replace(/[^0-9]/g, '') })}
                          className={`w-full px-3 py-2 border border-transparent rounded-lg text-xs font-mono font-bold transition-all duration-150 focus:outline-hidden ${
                            isDarkMode 
                              ? 'bg-zinc-900/60 hover:bg-zinc-900/80 focus:bg-zinc-950 text-zinc-100 focus:border-zinc-800' 
                              : 'bg-slate-100/50 hover:bg-slate-100/80 focus:bg-white text-slate-800 focus:border-slate-200'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Setup Planning & Watchlist */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                        ၂။ စနစ်နှင့် ရှာဖွေမှု အစီအစဉ် (Setup Planning)
                      </h4>
                      <hr className="flex-1 ml-4 border-dashed border-slate-300 dark:border-zinc-800" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Watchlist Setup */}
                      <div className="sm:col-span-2">
                        <label className={`block text-[11px] font-bold mb-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>Watchlist Details / Setup</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Support zone, FVG, Trendline Bounce"
                          value={formData.watchlist}
                          onChange={(e) => setFormData({ ...formData, watchlist: e.target.value })}
                          className={`w-full px-3 py-2 border border-transparent rounded-lg text-xs font-semibold transition-all duration-150 focus:outline-hidden ${
                            isDarkMode 
                              ? 'bg-zinc-900/60 hover:bg-zinc-900/80 focus:bg-zinc-950 text-zinc-100 focus:border-zinc-800' 
                              : 'bg-slate-100/50 hover:bg-slate-100/80 focus:bg-white text-slate-800 focus:border-slate-200'
                          }`}
                        />
                      </div>

                      {/* Result */}
                      <div>
                        <label className={`block text-[11px] font-bold mb-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>Result (TP / SL)</label>
                        <div className="relative">
                          <select
                            value={formData.winLoss}
                            onChange={(e: any) => setFormData({ ...formData, winLoss: e.target.value })}
                            className={`appearance-none w-full pl-3 pr-10 py-2 border border-transparent rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150 focus:outline-hidden ${
                              isDarkMode 
                                ? 'bg-zinc-900/60 hover:bg-zinc-900/80 focus:bg-zinc-950 text-zinc-200 focus:border-zinc-800' 
                                : 'bg-slate-100/50 hover:bg-slate-100/80 focus:bg-white text-slate-700 focus:border-slate-200'
                            }`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="TP">TP</option>
                            <option value="SL">SL</option>
                            <option value="Breakeven">Breakeven</option>
                            <option value="Trailing Stop">Trailing Stop</option>
                          </select>
                          <ChevronDown className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-zinc-500" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Execution Pricing & Ratios */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                        ၃။ ဈေးနှုန်းသတ်မှတ်ချက်များ (Pricing & Ratios)
                      </h4>
                      <hr className="flex-1 ml-4 border-dashed border-slate-300 dark:border-zinc-800" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Entry Price */}
                      <div>
                        <label className={`block text-[11px] font-bold mb-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>Entry Price</label>
                        <input
                          type="number"
                          step="any"
                          required
                          placeholder="e.g. 60000"
                          value={formData.entryPrice}
                          onChange={(e) => setFormData({ ...formData, entryPrice: e.target.value })}
                          className={`w-full px-3 py-2 border border-transparent rounded-lg text-xs font-mono font-semibold transition-all duration-150 focus:outline-hidden ${
                            isDarkMode 
                              ? 'bg-zinc-900/60 hover:bg-zinc-900/80 focus:bg-zinc-950 text-zinc-100 focus:border-zinc-800' 
                              : 'bg-slate-100/50 hover:bg-slate-100/80 focus:bg-white text-slate-800 focus:border-slate-200'
                          }`}
                        />
                      </div>

                      {/* SL */}
                      <div>
                        <label className={`block text-[11px] font-bold mb-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>Stop Loss (SL)</label>
                        <input
                          type="number"
                          step="any"
                          required
                          placeholder="e.g. 59500"
                          value={formData.sl}
                          onChange={(e) => setFormData({ ...formData, sl: e.target.value })}
                          className={`w-full px-3 py-2 border border-transparent rounded-lg text-xs font-mono font-semibold text-rose-500 transition-all duration-150 focus:outline-hidden ${
                            isDarkMode 
                              ? 'bg-zinc-900/60 hover:bg-zinc-900/80 focus:bg-zinc-950 text-zinc-100 focus:border-zinc-800' 
                              : 'bg-slate-100/50 hover:bg-slate-100/80 focus:bg-white text-slate-800 focus:border-slate-200'
                          }`}
                        />
                      </div>

                      {/* TP */}
                      <div>
                        <label className={`block text-[11px] font-bold mb-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>Take Profit (TP)</label>
                        <input
                          type="number"
                          step="any"
                          required
                          placeholder="e.g. 61500"
                          value={formData.tp}
                          onChange={(e) => setFormData({ ...formData, tp: e.target.value })}
                          className={`w-full px-3 py-2 border border-transparent rounded-lg text-xs font-mono font-semibold text-emerald-500 transition-all duration-150 focus:outline-hidden ${
                            isDarkMode 
                              ? 'bg-zinc-900/60 hover:bg-zinc-900/80 focus:bg-zinc-950 text-zinc-100 focus:border-zinc-800' 
                              : 'bg-slate-100/50 hover:bg-slate-100/80 focus:bg-white text-slate-800 focus:border-slate-200'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      {/* R:R Ratio */}
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className={`block text-[11px] font-bold ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>Risk to Reward (R:R)</label>
                          {calculatedSuggestions.rr && (
                            <span className="text-[9px] text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded-sm">Suggest: {calculatedSuggestions.rr}</span>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder={calculatedSuggestions.rr || "e.g. 1:3"}
                          value={formData.rr}
                          onChange={(e) => setFormData({ ...formData, rr: e.target.value })}
                          className={`w-full px-3 py-2 border border-transparent rounded-lg text-xs font-semibold transition-all duration-150 focus:outline-hidden ${
                            isDarkMode 
                              ? 'bg-zinc-900/60 hover:bg-zinc-900/80 focus:bg-zinc-950 text-zinc-100 focus:border-zinc-800' 
                              : 'bg-slate-100/50 hover:bg-slate-100/80 focus:bg-white text-slate-800 focus:border-slate-200'
                          }`}
                        />
                      </div>

                      {/* PNL in $ */}
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className={`block text-[11px] font-bold ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>P&L in $</label>
                          {formData.winLoss !== 'Pending' && (
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, pnl: formData.winLoss === 'TP' ? (calculatedSuggestions.suggestedPnlWin || '+$300') : formData.winLoss === 'SL' ? '-$100' : '$0' })}
                              className="text-[9px] bg-emerald-500/15 hover:bg-emerald-500/25 px-2 py-0.5 rounded text-emerald-500 font-bold tracking-wide transition-all cursor-pointer"
                            >
                              Auto-Fill ⚡
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="e.g. +$300, -$100"
                          value={formData.pnl}
                          onChange={(e) => setFormData({ ...formData, pnl: e.target.value })}
                          className={`w-full px-3 py-2 border border-transparent rounded-lg text-xs font-mono font-bold transition-all duration-150 focus:outline-hidden ${
                            isDarkMode 
                              ? 'bg-zinc-900/60 hover:bg-zinc-900/80 focus:bg-zinc-950 text-zinc-100 focus:border-zinc-800' 
                              : 'bg-slate-100/50 hover:bg-slate-100/80 focus:bg-white text-slate-800 focus:border-slate-200'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Psychologies & Notes */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                        ၄။ စိတ်ပိုင်းဆိုင်ရာ ကတိကဝတ်နှင့် မှတ်ချက် (Psychology & Notes)
                      </h4>
                      <hr className="flex-1 ml-4 border-dashed border-slate-300 dark:border-zinc-800" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Remarks */}
                      <div>
                        <label className={`block text-[11px] font-bold mb-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>Remarks / Note (မှတ်ချက်များ)</label>
                        <textarea
                          placeholder="e.g. Plan အတိုင်း စိတ်ရှည်လက်ရှည် စောင့်ဝင်ခဲ့၍ အဆင်ပြေခဲ့သည်။"
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          rows={2}
                          className={`w-full px-3 py-2 border border-transparent rounded-lg text-xs font-semibold resize-none transition-all duration-150 focus:outline-hidden ${
                            isDarkMode 
                              ? 'bg-zinc-900/60 hover:bg-zinc-900/80 focus:bg-zinc-950 text-zinc-100 focus:border-zinc-800' 
                              : 'bg-slate-100/50 hover:bg-slate-100/80 focus:bg-white text-slate-800 focus:border-slate-200'
                          }`}
                        />
                      </div>

                      {/* Commitment */}
                      <div>
                        <label className={`block text-[11px] font-bold mb-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>Commitment (စိတ်ပိုင်းဆိုင်ရာ ကတိကဝတ်)</label>
                        <textarea
                          placeholder="e.g. စိတ်လှုပ်ရှားမှု မရှိဘဲ စနစ်အတိုင်း လိုက်နာဆောင်ရွက်ခဲ့သည်။"
                          value={formData.commitment}
                          onChange={(e) => setFormData({ ...formData, commitment: e.target.value })}
                          rows={2}
                          className={`w-full px-3 py-2 border border-transparent rounded-lg text-xs font-semibold resize-none transition-all duration-150 focus:outline-hidden ${
                            isDarkMode 
                              ? 'bg-zinc-900/60 hover:bg-zinc-900/80 focus:bg-zinc-950 text-zinc-100 focus:border-zinc-800' 
                              : 'bg-slate-100/50 hover:bg-slate-100/80 focus:bg-white text-slate-800 focus:border-slate-200'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 5: Screenshots upload */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                        ၅။ အရောင်းအဝယ်ပုံများ တင်ရန် (Trade Screenshots - Before & After)
                      </h4>
                      <hr className="flex-1 ml-4 border-dashed border-slate-300 dark:border-zinc-800" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Before Image */}
                      <div>
                        <span className={`block text-[11px] font-bold mb-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>Trade SS - Before (အဝင်ပုံ)</span>
                        <div className="space-y-2">
                          {formData.tradePhotoBefore ? (
                            <div className={`relative rounded-xl overflow-hidden border max-h-40 flex items-center justify-center bg-zinc-900/60 group ${
                              isDarkMode ? 'border-zinc-800' : 'border-slate-200'
                            }`}>
                              <img 
                                src={getDirectDriveImageUrl(formData.tradePhotoBefore)} 
                                alt="Before Trade Preview" 
                                className="h-full w-full object-contain max-h-32 mx-auto"
                              />
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, tradePhotoBefore: '' })}
                                className="absolute top-2 right-2 bg-rose-600 hover:bg-rose-700 text-white p-1.5 rounded-lg shadow-lg transition-colors cursor-pointer"
                                title="ပုံကို ဖယ်ရှားရန်"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className={`border border-dashed rounded-xl p-4 text-center transition-all relative group flex flex-col items-center justify-center min-h-[100px] ${
                              isDarkMode 
                                ? 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/40 bg-zinc-900/20' 
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-slate-50/20'
                            }`}>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoBeforeChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                              />
                              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-zinc-500 dark:text-zinc-400">
                                <Plus className="h-4 w-4 text-teal-500" />
                                <span>B (Before) ပုံတင်ရန်</span>
                              </div>
                              <p className="text-[10px] text-zinc-400 mt-1 font-medium">နှိပ်ပါ သို့မဟုတ် ဆွဲထည့်ပါ (Drag & Drop)</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* After Image */}
                      <div>
                        <span className={`block text-[11px] font-bold mb-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>Trade SS - After (အထွက်ပုံ)</span>
                        <div className="space-y-2">
                          {formData.tradePhotoAfter ? (
                            <div className={`relative rounded-xl overflow-hidden border max-h-40 flex items-center justify-center bg-zinc-900/60 group ${
                              isDarkMode ? 'border-zinc-800' : 'border-slate-200'
                            }`}>
                              <img 
                                src={getDirectDriveImageUrl(formData.tradePhotoAfter)} 
                                alt="After Trade Preview" 
                                className="h-full w-full object-contain max-h-32 mx-auto"
                              />
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, tradePhotoAfter: '' })}
                                className="absolute top-2 right-2 bg-rose-600 hover:bg-rose-700 text-white p-1.5 rounded-lg shadow-lg transition-colors cursor-pointer"
                                title="ပုံကို ဖယ်ရှားရန်"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className={`border border-dashed rounded-xl p-4 text-center transition-all relative group flex flex-col items-center justify-center min-h-[100px] ${
                              isDarkMode 
                                ? 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/40 bg-zinc-900/20' 
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-slate-50/20'
                            }`}>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoAfterChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                              />
                              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-zinc-500 dark:text-zinc-400">
                                <Plus className="h-4 w-4 text-emerald-500" />
                                <span>A (After) ပုံတင်ရန်</span>
                              </div>
                              <p className="text-[10px] text-zinc-400 mt-1 font-medium">နှိပ်ပါ သို့မဟုတ် ဆွဲထည့်ပါ (Drag & Drop)</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer buttons */}
                <div className={`px-6 py-4 flex justify-end space-x-3 border-t shrink-0 ${
                  isDarkMode ? 'bg-zinc-900/40 border-zinc-800' : 'bg-slate-50/50 border-slate-200'
                }`}>
                  <button
                    type="button"
                    onClick={() => setShowFormModal(false)}
                    className={`px-4 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isDarkMode 
                        ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800' 
                        : 'bg-white border-slate-250 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    ပယ်ဖျက်မည် (Cancel)
                  </button>
                  <button
                    type="submit"
                    disabled={isFormSubmitting}
                    className={`inline-flex justify-center items-center px-5 py-2 text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer ${
                      isDarkMode
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-zinc-950 disabled:bg-zinc-800 disabled:text-zinc-600'
                        : 'bg-slate-900 hover:bg-slate-800 text-white disabled:bg-slate-100 disabled:text-slate-400'
                    }`}
                  >
                    {isFormSubmitting ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        <span>သိမ်းဆည်းနေပါသည်...</span>
                      </>
                    ) : (
                      <span>သိမ်းဆည်းမည် (Save)</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* CREATE / EDIT LEARNING NOTE MODAL */}
        {showLearningModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLearningModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className={`relative w-full flex flex-col overflow-hidden border shadow-2xl transition-all duration-300 ease-in-out ${
                isLearningModalFullPage 
                  ? 'max-w-7xl h-[95vh] w-[96vw] rounded-2xl' 
                  : 'max-w-3xl h-[85vh] rounded-2xl'
              } ${
                isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              {/* Minimalist Notion Breadcrumbs Header */}
              <div className={`px-6 py-3.5 border-b flex justify-between items-center shrink-0 ${
                isDarkMode ? 'border-zinc-800/80 bg-zinc-900' : 'border-slate-100 bg-white'
              }`}>
                <div className="flex items-center space-x-2 text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                  <span className="hover:underline cursor-pointer">Workspace</span>
                  <span>/</span>
                  <span className="hover:underline cursor-pointer">Learning Notes</span>
                  <span>/</span>
                  <span className="font-semibold text-zinc-600 dark:text-zinc-300">
                    {editingLearningNote ? 'Edit Draft' : 'New Note'}
                  </span>
                  {isLearningModalFullPage && (
                    <>
                      <span>/</span>
                      <span className="text-[10px] bg-teal-500/10 text-teal-400 px-1.5 py-0.5 rounded font-bold">Full Page</span>
                    </>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsLearningModalFullPage(!isLearningModalFullPage)}
                    className={`inline-flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      isDarkMode ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'
                    }`}
                    title={isLearningModalFullPage ? "Center Peek အဖြစ် ပြောင်းလဲရန်" : "Full Page အဖြစ် ချဲ့ရန်"}
                  >
                    {isLearningModalFullPage ? (
                      <>
                        <Minimize2 className="h-3.5 w-3.5 mr-1" />
                        <span className="hidden sm:inline">Center Peek</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="h-3.5 w-3.5 mr-1" />
                        <span className="hidden sm:inline">Full Page</span>
                      </>
                    )}
                  </button>
                  <div className={`h-4 w-px ${isDarkMode ? 'bg-zinc-800' : 'bg-slate-200'}`} />
                  <button
                    type="button"
                    onClick={() => setShowLearningModal(false)}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      isDarkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-500'
                    }`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <form 
                onSubmit={handleSaveLearningNote} 
                className={`flex flex-col flex-1 overflow-y-auto bg-transparent scrollbar-thin ${
                  isDarkMode 
                    ? '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-800 hover:[&::-webkit-scrollbar-thumb]:bg-zinc-750 [&::-webkit-scrollbar-thumb]:rounded-full' 
                    : '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full'
                }`}
              >
                <div className="p-8 space-y-6">
                  {learningError && (
                    <div className="p-3.5 rounded-xl text-xs bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-2 font-medium">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{learningError}</span>
                    </div>
                  )}

                  {/* Notion-style Document Title */}
                  <div className="space-y-1">
                    <input
                      type="text"
                      required
                      placeholder="Untitled"
                      value={learningNoteTitle}
                      onChange={(e) => setLearningNoteTitle(e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-transparent focus:border-transparent focus:ring-0 text-3xl sm:text-4xl font-extrabold focus:outline-hidden px-0 pb-1.5 placeholder:text-zinc-300 dark:placeholder:text-zinc-700 tracking-tight"
                    />
                  </div>

                  {/* Notion-style Properties Section */}
                  <div className={`space-y-4 py-4 border-t border-b ${isDarkMode ? 'border-zinc-800/60' : 'border-slate-100'}`}>
                    {/* Tags Property */}
                    <div className="grid grid-cols-[120px_1fr] items-start gap-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 dark:text-zinc-500 py-1 select-none">
                        <Layers className="h-3.5 w-3.5" />
                        <span>Tags</span>
                      </div>
                      <div className="space-y-2.5">
                        {/* Selected Tags */}
                        <div className="flex flex-wrap gap-1.5 min-h-[28px] items-center">
                          {learningNoteTags.length === 0 ? (
                            <span className="text-xs text-zinc-400 dark:text-zinc-600 italic">No tags selected</span>
                          ) : (
                            learningNoteTags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1.5 bg-teal-500/10 text-teal-400 px-2.5 py-0.5 rounded-md text-xs font-semibold border border-teal-500/10"
                              >
                                #{tag}
                                <button
                                  type="button"
                                  onClick={() => setLearningNoteTags(learningNoteTags.filter(t => t !== tag))}
                                  className="hover:text-red-400 font-bold ml-0.5 transition-colors focus:outline-hidden"
                                >
                                  ×
                                </button>
                              </span>
                            ))
                          )}
                        </div>

                        {/* Previously Used Tags for Quick Select */}
                        {allUniqueTags.length > 0 && (
                          <div className="space-y-1 bg-zinc-50 dark:bg-zinc-950/20 p-2 rounded-xl">
                            <span className={`text-[10px] font-semibold block ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                              ယခင်အသုံးပြုခဲ့သော Tags များ (အမြန်ရွေးရန်):
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {allUniqueTags.map((tag) => {
                                const isSelected = learningNoteTags.includes(tag);
                                return (
                                  <button
                                    type="button"
                                    key={tag}
                                    onClick={() => {
                                      if (isSelected) {
                                        setLearningNoteTags(learningNoteTags.filter(t => t !== tag));
                                      } else {
                                        setLearningNoteTags([...learningNoteTags, tag]);
                                      }
                                    }}
                                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                                      isSelected 
                                        ? 'bg-teal-600 text-white font-bold' 
                                        : isDarkMode ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-750' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    }`}
                                  >
                                    #{tag}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Custom Tag Input */}
                        <div className="flex items-center gap-2 max-w-xs">
                          <input
                            type="text"
                            placeholder="Custom tag ရိုက်ပြီး Enter ခေါက်ပါ..."
                            value={customTagInput}
                            onChange={(e) => setCustomTagInput(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const newTag = customTagInput.trim();
                                if (newTag && !learningNoteTags.includes(newTag)) {
                                  setLearningNoteTags([...learningNoteTags, newTag]);
                                  setCustomTagInput('');
                                }
                              }
                            }}
                            className={`px-2.5 py-1.5 border rounded-lg text-xs w-full focus:outline-hidden focus:border-teal-500 ${
                              isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newTag = customTagInput.trim();
                              if (newTag && !learningNoteTags.includes(newTag)) {
                                setLearningNoteTags([...learningNoteTags, newTag]);
                                setCustomTagInput('');
                              }
                            }}
                            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-300 hover:text-white font-semibold text-[11px] rounded-lg transition-colors cursor-pointer shrink-0"
                          >
                            ထည့်ရန်
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Cover Image / Attachment Property */}
                    <div className="grid grid-cols-[120px_1fr] items-start gap-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 dark:text-zinc-500 py-1 select-none">
                        <ImageIcon className="h-3.5 w-3.5" />
                        <span>Cover Image</span>
                      </div>
                      <div className="space-y-2">
                        {learningNoteImage ? (
                          <div className="relative rounded-xl overflow-hidden border border-zinc-750/50 max-h-56 bg-zinc-950 group">
                            <img 
                              src={learningNoteImage} 
                              alt="Preview" 
                              className="h-full w-full object-contain max-h-48 mx-auto"
                            />
                            <button
                              type="button"
                              onClick={() => setLearningNoteImage('')}
                              className="absolute top-2 right-2 bg-red-600/90 hover:bg-red-700 text-white p-1.5 rounded-lg shadow-md transition-colors cursor-pointer"
                              title="ပုံကို ဖယ်ရှားရန်"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className={`border border-dashed rounded-xl p-4 text-center transition-all relative group ${
                            isDarkMode 
                              ? 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-950/40 bg-zinc-950/20' 
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-100 bg-slate-50/20'
                          }`}>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageChange}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                              <Plus className="h-3.5 w-3.5" />
                              <span>ပုံတင်ရန် (Upload Image)</span>
                            </div>
                            <p className="text-[10px] text-zinc-400 mt-0.5">နှိပ်ပါ သို့မဟုတ် ပုံကို ဆွဲထည့်ပါ (Drag & Drop)</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Notion-style Document Body */}
                  <div className="pt-2">
                    <textarea
                      required
                      placeholder="ဒီနေရာမှာ သင်ခန်းစာမှတ်စု သို့မဟုတ် ကိုယ်ပိုင်မဟာဗျူဟာအကြောင်းအရာများကို Notion ရဲ့ စာမျက်နှာလွတ်တစ်ခုလို စိတ်ကြိုက် လွတ်လပ်စွာ ရေးသားနိုင်ပါသည်။ (Markdown format ဖြင့် စာလုံးများကို အလှဆင်နိုင်ပါသည်...)"
                      value={learningNoteContent}
                      onChange={(e) => setLearningNoteContent(e.target.value)}
                      rows={10}
                      className="w-full bg-transparent border-0 focus:ring-0 text-sm sm:text-base focus:outline-hidden px-0 py-2 placeholder:text-zinc-400/80 whitespace-pre-wrap leading-relaxed resize-none"
                    />
                  </div>
                </div>

                {/* Sticky Footer Actions */}
                <div className={`px-6 py-4 flex justify-end space-x-3 border-t shrink-0 ${
                  isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-100'
                }`}>
                  <button
                    type="button"
                    onClick={() => setShowLearningModal(false)}
                    className={`px-4 py-2 border rounded-xl text-sm font-semibold transition-colors duration-150 cursor-pointer ${
                      isDarkMode 
                        ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700' 
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingLearningNote}
                    className="inline-flex justify-center items-center bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold text-sm px-5 py-2 rounded-xl transition-all duration-150 cursor-pointer shadow-xs"
                  >
                    {isSavingLearningNote ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />
                        <span>သိမ်းဆည်းနေပါသည်...</span>
                      </>
                    ) : (
                      <span>သိမ်းဆည်းမည်</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* LEARNING NOTE DETAIL MODAL */}
        {selectedLearningNote && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLearningNote(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={`relative w-full max-w-3xl rounded-2xl border shadow-2xl flex flex-col max-h-[85vh] overflow-hidden ${
                isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              {/* Header */}
              <div className={`px-6 py-4 border-b flex justify-between items-center shrink-0 ${
                isDarkMode ? 'border-zinc-800' : 'border-slate-100'
              }`}>
                <div>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-0.5">
                    {selectedLearningNote.createdAt ? new Date(selectedLearningNote.createdAt).toLocaleDateString('my-MM', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'မှတ်တမ်းမရှိ'}
                  </span>
                  <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-zinc-100 tracking-tight">
                    {selectedLearningNote.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLearningNote(null)}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    isDarkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-500'
                  }`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                {/* Note Image */}
                {selectedLearningNote.imageUrl && (
                  <div 
                    onClick={() => setLightboxImage(selectedLearningNote.imageUrl || null)}
                    className="rounded-xl overflow-hidden border border-zinc-200/15 bg-slate-950 max-h-[45vh] flex justify-center shadow-lg cursor-zoom-in group relative"
                    title="ပုံကို အပြည့်ချဲ့ကြည့်ရန် နှိပ်ပါ (Click to view full screen)"
                  >
                    <img 
                      src={getDirectDriveImageUrl(selectedLearningNote.imageUrl)} 
                      alt={selectedLearningNote.title} 
                      className="max-h-[45vh] w-auto object-contain transition-all duration-300 group-hover:scale-[1.01] group-hover:brightness-105"
                    />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors duration-250 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <span className="bg-black/75 text-zinc-100 text-xs font-bold px-3 py-2 rounded-xl flex items-center space-x-2 backdrop-blur-xs shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-250">
                        <ZoomIn className="h-4 w-4 text-teal-400" />
                        <span>အပြည့်ချဲ့ကြည့်ရန် နှိပ်ပါ</span>
                      </span>
                    </div>
                  </div>
                )}

                {/* Note Tags */}
                {selectedLearningNote.tags && selectedLearningNote.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedLearningNote.tags.map((tag, idx) => (
                      <span 
                        key={idx} 
                        className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${
                          isDarkMode 
                            ? 'bg-teal-950/40 text-teal-300 border-teal-900/30' 
                            : 'bg-teal-50 text-teal-700 border-teal-100'
                        }`}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Note Text content */}
                <div className={`whitespace-pre-wrap text-sm leading-relaxed ${
                  isDarkMode ? 'text-zinc-200' : 'text-slate-700'
                }`}>
                  {selectedLearningNote.content}
                </div>
              </div>

              {/* Footer actions */}
              <div className={`px-6 py-4 flex justify-between items-center border-t shrink-0 ${
                isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-100'
              }`}>
                <div className="text-[10px] text-zinc-400 font-semibold">
                  📧 Owner: {selectedLearningNote.userEmail || user?.email}
                </div>
                
                <div className="flex items-center space-x-3 animate-fade-in">
                  {selectedLearningNote.docUrl && (
                    <a
                      href={selectedLearningNote.docUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 shadow-sm"
                    >
                      <BookOpen className="h-3.5 w-3.5 text-teal-400" />
                      <span>Google Doc ဖြင့် ဖတ်ရှုရန်</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const noteToEdit = selectedLearningNote;
                      setSelectedLearningNote(null);
                      setEditingLearningNote(noteToEdit);
                      setLearningNoteTitle(noteToEdit.title);
                      setLearningNoteContent(noteToEdit.content);
                      setLearningNoteImage(noteToEdit.imageUrl || '');
                      setLearningNoteTags(noteToEdit.tags || []);
                      setCustomTagInput('');
                      setLearningError(null);
                      setShowLearningModal(true);
                    }}
                    className={`inline-flex items-center space-x-1 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer border ${
                      isDarkMode 
                        ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700 hover:text-white' 
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>ပြင်ဆင်ရန် (Edit)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLearningNote(null);
                    }}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer shadow-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* NOTION-STYLE ADD / EDIT WATCHLIST SETUP MODAL */}
        {showWatchlistModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs transition-opacity" 
              onClick={() => !isSavingWatchlistItem && setShowWatchlistModal(false)}
            />

            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={`w-full max-w-2xl rounded-2xl border shadow-2xl relative z-10 overflow-hidden my-8 max-h-[92vh] flex flex-col ${
                isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              {/* Modal Header */}
              <div className={`p-5 sm:p-6 border-b flex items-center justify-between shrink-0 ${
                isDarkMode ? 'border-zinc-800/80 bg-zinc-950/40' : 'border-slate-100 bg-slate-50/50'
              }`}>
                <div className="flex items-center space-x-3">
                  <div className={`p-2.5 rounded-xl ${isDarkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-100 text-slate-700'}`}>
                    <Eye className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base tracking-tight">
                      {editingWatchlistItem ? 'Edit Watchlist Setup' : 'Add Watchlist Setup'}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Crypto သို့မဟုတ် Forex စောင့်ကြည့် setup ကို Google Drive တွင် ချက်ချင်းသိမ်းဆည်းပါမည်
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWatchlistModal(false)}
                  disabled={isSavingWatchlistItem}
                  className={`p-2 rounded-xl transition-colors cursor-pointer ${
                    isDarkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-500'
                  }`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Form Scroll Area */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
                {watchlistError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{watchlistError}</span>
                  </div>
                )}

                {/* Pair Name Input & Quick Select Chips */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Asset / Trading Pair *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BTC/USDT, EUR/USD, XAU/USD"
                    value={watchlistPair}
                    onChange={(e) => setWatchlistPair(e.target.value.toUpperCase())}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono font-bold focus:outline-hidden transition-all ${
                      isDarkMode 
                        ? 'bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-600' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-400'
                    }`}
                  />
                  {/* Quick Pair Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[10px] text-zinc-500 self-center mr-1">Quick Select:</span>
                    {['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'EUR/USD', 'GBP/USD', 'XAU/USD', 'USD/JPY'].map((p) => (
                      <button
                        type="button"
                        key={p}
                        onClick={() => {
                          setWatchlistPair(p);
                          setWatchlistCategory(p.includes('/') && !p.includes('USDT') ? 'Forex' : 'Crypto');
                        }}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                          watchlistPair === p 
                            ? (isDarkMode ? 'bg-zinc-750 text-white font-bold' : 'bg-slate-800 text-white font-bold')
                            : isDarkMode ? 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category & Timeframe Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Category */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Category
                    </label>
                    <select
                      value={watchlistCategory}
                      onChange={(e) => setWatchlistCategory(e.target.value as any)}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-medium cursor-pointer focus:outline-hidden ${
                        isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <option value="Crypto">Crypto</option>
                      <option value="Forex">Forex</option>
                      <option value="Commodity">Commodity (Gold, Silver, Oil)</option>
                      <option value="Index">Index (US30, NAS100, SPX)</option>
                    </select>
                  </div>

                  {/* Timeframe */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Timeframe
                    </label>
                    <select
                      value={watchlistTimeframe}
                      onChange={(e) => setWatchlistTimeframe(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-medium cursor-pointer focus:outline-hidden ${
                        isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <option value="15M">15M (Scalping / Execution)</option>
                      <option value="30M">30M (Short-Term)</option>
                      <option value="1H">1H (Intraday Setup)</option>
                      <option value="4H">4H (Swing / Trend)</option>
                      <option value="Daily">Daily (HTF Direction)</option>
                      <option value="Weekly">Weekly (Macro Bias)</option>
                    </select>
                  </div>
                </div>

                {/* Bias & Status Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Bias */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Market Bias
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['Bullish', 'Bearish', 'Neutral'] as const).map((b) => (
                        <button
                          type="button"
                          key={b}
                          onClick={() => setWatchlistBias(b)}
                          className={`py-2 rounded-xl text-xs font-medium transition-all cursor-pointer text-center ${
                            watchlistBias === b 
                              ? (b === 'Bullish' ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40' :
                                 b === 'Bearish' ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40' :
                                 'bg-zinc-800 text-zinc-100 font-bold border border-zinc-700')
                              : isDarkMode ? 'bg-zinc-950 border border-zinc-800/80 text-zinc-400' : 'bg-slate-50 border border-slate-200 text-slate-600'
                          }`}
                        >
                          {b === 'Bullish' ? '▲ Bullish' : b === 'Bearish' ? '▼ Bearish' : 'Neutral'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Setup Status
                    </label>
                    <select
                      value={watchlistStatus}
                      onChange={(e) => setWatchlistStatus(e.target.value as any)}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-medium cursor-pointer focus:outline-hidden ${
                        isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <option value="Ready to Enter">Ready to Enter</option>
                      <option value="Setup Forming">Setup Forming</option>
                      <option value="Watching">Watching</option>
                      <option value="Triggered">Triggered</option>
                      <option value="Invalidated">Invalidated</option>
                    </select>
                  </div>
                </div>

                {/* Key Levels & POI */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                    <span>Key Levels / POI</span>
                    <span className="text-[10px] text-zinc-500 font-normal lowercase">Optional</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Support: $64,200 | Resistance: $68,500 | Invalidation: $62,900"
                    value={watchlistKeyLevels}
                    onChange={(e) => setWatchlistKeyLevels(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-medium focus:outline-hidden ${
                      isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-600' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-slate-400'
                    }`}
                  />
                </div>

                {/* Strategy Notes & Plan Textarea */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Analysis & Execution Notes
                  </label>
                  <textarea
                    rows={4}
                    placeholder="e.g. 4H Demand zone ထဲကို ဈေးဆင်းလာပြီး 15M မှာ MSS ဖြစ်သည်နှင့် ဝင်မည်..."
                    value={watchlistNotes}
                    onChange={(e) => setWatchlistNotes(e.target.value)}
                    className={`w-full p-3 rounded-xl border text-xs leading-relaxed focus:outline-hidden resize-none ${
                      isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-600' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-slate-400'
                    }`}
                  />
                </div>

                {/* Chart Screenshot Upload */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Chart Screenshot / Analysis Photo
                  </label>
                  {watchlistImage ? (
                    <div className="relative rounded-xl overflow-hidden border border-zinc-800 max-h-56 bg-zinc-950 group">
                      <img
                        src={watchlistImage}
                        alt="Watchlist Chart Preview"
                        className="h-full w-full object-contain max-h-48 mx-auto"
                      />
                      <button
                        type="button"
                        onClick={() => setWatchlistImage('')}
                        className="absolute top-2 right-2 bg-rose-600/90 hover:bg-rose-700 text-white p-1.5 rounded-lg shadow-md transition-colors cursor-pointer"
                        title="Remove Image"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className={`border border-dashed rounded-xl p-5 text-center transition-all relative ${
                      isDarkMode 
                        ? 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-950/40 bg-zinc-950/20' 
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-100 bg-slate-50/20'
                    }`}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChangeWatchlist}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="flex items-center justify-center gap-2 text-xs font-semibold text-zinc-300 mb-1">
                        <ImageIcon className="h-4 w-4 text-zinc-400" />
                        <span>Chart ပုံတင်ရန် (Upload Chart Image)</span>
                      </div>
                      <p className="text-[11px] text-zinc-500">နှိပ်ပါ သို့မဟုတ် ပုံကို ဆွဲထည့်ပါ (Auto-uploaded to Google Drive)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Actions Footer */}
              <div className={`p-4 sm:p-5 border-t flex items-center justify-end gap-3 shrink-0 ${
                isDarkMode ? 'border-zinc-800/80 bg-zinc-950/40' : 'border-slate-100 bg-slate-50/50'
              }`}>
                <button
                  type="button"
                  onClick={() => setShowWatchlistModal(false)}
                  disabled={isSavingWatchlistItem}
                  className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    isDarkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveWatchlistItem}
                  disabled={isSavingWatchlistItem || !watchlistPair.trim()}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-white active:scale-95 disabled:opacity-50 text-zinc-950 font-bold text-xs shadow-sm transition-all cursor-pointer"
                >
                  {isSavingWatchlistItem ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Drive သို့ သိမ်းဆည်းနေပါသည်...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      <span>{editingWatchlistItem ? 'Update Setup' : 'Save Setup'}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* NOTION-STYLE WATCHLIST SETUP DETAIL INSPECTOR MODAL */}
        {selectedWatchlistItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs transition-opacity" 
              onClick={() => setSelectedWatchlistItem(null)}
            />

            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={`w-full max-w-3xl rounded-2xl border shadow-2xl relative z-10 overflow-hidden my-8 max-h-[92vh] flex flex-col ${
                isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              {/* Modal Header */}
              <div className={`p-5 sm:p-6 border-b flex items-center justify-between shrink-0 ${
                isDarkMode ? 'border-zinc-800/80 bg-zinc-950/40' : 'border-slate-100 bg-slate-50/50'
              }`}>
                <div className="flex items-center space-x-3">
                  <div className={`p-2.5 rounded-xl ${isDarkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-100 text-slate-700'}`}>
                    <Eye className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg tracking-tight">{selectedWatchlistItem.pair}</h3>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                        isDarkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {selectedWatchlistItem.category}
                      </span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                        {selectedWatchlistItem.timeframe}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {selectedWatchlistItem.createdAt ? new Date(selectedWatchlistItem.createdAt).toLocaleString('my-MM') : 'Recently added'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const item = selectedWatchlistItem;
                      setSelectedWatchlistItem(null);
                      setEditingWatchlistItem(item);
                      setWatchlistPair(item.pair);
                      setWatchlistCategory(item.category);
                      setWatchlistBias(item.bias);
                      setWatchlistStatus(item.status);
                      setWatchlistTimeframe(item.timeframe);
                      setWatchlistKeyLevels(item.keyLevels || '');
                      setWatchlistNotes(item.notes || '');
                      setWatchlistImage(item.imageUrl || '');
                      setShowWatchlistModal(true);
                    }}
                    className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                      isDarkMode ? 'border-zinc-800 hover:bg-zinc-800 text-zinc-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                    title="Edit Setup"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedWatchlistItem(null)}
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                      isDarkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-500'
                    }`}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body Scroll Area */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
                {/* Status & Bias Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-zinc-950/40 border-zinc-800/60' : 'bg-slate-50 border-slate-200'}`}>
                    <span className="text-[10px] uppercase font-semibold text-zinc-400 block mb-1">Market Bias</span>
                    <span className={`text-sm font-bold flex items-center gap-1.5 ${
                      selectedWatchlistItem.bias === 'Bullish' ? 'text-emerald-400' :
                      selectedWatchlistItem.bias === 'Bearish' ? 'text-rose-400' : 'text-zinc-300'
                    }`}>
                      {selectedWatchlistItem.bias === 'Bullish' ? '▲ Bullish (အဝယ်ဘက် အသာစီး)' :
                       selectedWatchlistItem.bias === 'Bearish' ? '▼ Bearish (အရောင်းဘက် အသာစီး)' :
                       selectedWatchlistItem.bias}
                    </span>
                  </div>

                  <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-zinc-950/40 border-zinc-800/60' : 'bg-slate-50 border-slate-200'}`}>
                    <span className="text-[10px] uppercase font-semibold text-zinc-400 block mb-1">Execution Status</span>
                    <span className={`text-sm font-bold flex items-center gap-1.5 ${
                      selectedWatchlistItem.status === 'Ready to Enter' ? 'text-emerald-400' : 'text-zinc-200'
                    }`}>
                      {selectedWatchlistItem.status}
                    </span>
                  </div>
                </div>

                {/* Key Levels */}
                {selectedWatchlistItem.keyLevels && (
                  <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-zinc-950/50 border-zinc-800/60' : 'bg-slate-50 border-slate-200'}`}>
                    <h5 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
                      <Target className="h-4 w-4 text-zinc-400" />
                      <span>Key Levels & POI</span>
                    </h5>
                    <p className="font-mono text-xs leading-relaxed text-zinc-200 whitespace-pre-wrap">
                      {selectedWatchlistItem.keyLevels}
                    </p>
                  </div>
                )}

                {/* Chart Screenshot */}
                {selectedWatchlistItem.imageUrl && (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
                      Technical Chart Screenshot
                    </span>
                    <div 
                      onClick={() => setLightboxImage(selectedWatchlistItem.imageUrl || null)}
                      className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 cursor-zoom-in group max-h-96 flex items-center justify-center"
                    >
                      <img
                        src={getDirectDriveImageUrl(selectedWatchlistItem.imageUrl)}
                        alt={selectedWatchlistItem.pair}
                        className="w-full object-contain max-h-96 transition-transform duration-300 group-hover:scale-102"
                      />
                    </div>
                  </div>
                )}

                {/* Analysis Notes */}
                {selectedWatchlistItem.notes && (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
                      Strategy & Execution Notes
                    </span>
                    <div className={`p-4 rounded-xl border leading-relaxed text-xs sm:text-sm whitespace-pre-wrap ${
                      isDarkMode ? 'bg-zinc-950/40 border-zinc-800/60 text-zinc-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}>
                      {selectedWatchlistItem.notes}
                    </div>
                  </div>
                )}

                {/* Synced Google Doc Link */}
                {selectedWatchlistItem.docUrl && (
                  <div className={`p-4 rounded-xl border flex items-center justify-between ${
                    isDarkMode ? 'bg-zinc-950/30 border-zinc-800/60' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center gap-2 text-xs">
                      <FileText className="h-4 w-4 text-zinc-400" />
                      <span className="font-medium text-zinc-300">Google Drive Document Synced</span>
                    </div>
                    <a
                      href={selectedWatchlistItem.docUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white underline"
                    >
                      <span>Open in Google Docs</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className={`p-4 sm:p-5 border-t flex items-center justify-between gap-3 shrink-0 ${
                isDarkMode ? 'border-zinc-800/80 bg-zinc-950/40' : 'border-slate-100 bg-slate-50/50'
              }`}>
                <button
                  type="button"
                  onClick={() => {
                    const id = selectedWatchlistItem.id;
                    setSelectedWatchlistItem(null);
                    handleDeleteWatchlistItem(id);
                  }}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Setup</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedWatchlistItem(null)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      isDarkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    Close
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const item = selectedWatchlistItem;
                      setSelectedWatchlistItem(null);
                      handleConvertWatchlistToTrade(item);
                    }}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Log as Executed Trade</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* LIGHTBOX IMAGE PREVIEW MODAL */}
        {lightboxImage && (
          <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
            {/* Dark Blurred Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLightboxImage(null)}
              className="fixed inset-0 bg-black/90 backdrop-blur-md cursor-zoom-out"
            />

            {/* Close button on top-right */}
            <div className="absolute top-4 right-4 z-50 flex items-center space-x-3">
              <a 
                href={getDirectDriveImageUrl(lightboxImage)} 
                target="_blank" 
                rel="noreferrer"
                className="p-2.5 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-full transition-colors cursor-pointer border border-zinc-800/50 shadow-lg flex items-center justify-center"
                title="မူရင်းပုံကို ယူရန် (Download Original)"
              >
                <Download className="h-4 w-4" />
              </a>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="p-2.5 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-full transition-colors cursor-pointer border border-zinc-800/50 shadow-lg flex items-center justify-center"
                title="ပိတ်ရန် (Close)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Centered Image Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative max-w-full max-h-[92vh] z-10 flex flex-col items-center justify-center pointer-events-none"
            >
              <img 
                src={getDirectDriveImageUrl(lightboxImage)} 
                alt="Enlarged Note Asset" 
                className="max-w-[98vw] sm:max-w-[92vw] max-h-[88vh] object-contain rounded-lg shadow-2xl border border-zinc-800/40 select-none pointer-events-auto cursor-zoom-out"
                onClick={() => setLightboxImage(null)}
              />
              {/* Optional Caption */}
              <div className="mt-4 px-4 py-1.5 bg-zinc-950/85 backdrop-blur-xs border border-zinc-800/40 rounded-full flex items-center space-x-2 shadow-lg">
                <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-ping" />
                <span className="text-[10px] sm:text-xs text-zinc-300 font-bold tracking-wider">
                  အပြည့်ချဲ့၍ ကြည့်ရှုနေသည် (Fullscreen View)
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
