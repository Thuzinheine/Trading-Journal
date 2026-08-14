'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  initAuth, 
  googleSignIn, 
  logout, 
  getAccessToken,
  setAccessToken,
  auth,
  fetchLearningNotes,
  saveLearningNote,
  deleteLearningNote,
  LearningNote
} from '@/lib/firebase';
import { 
  findOrCreateFile, 
  initializeJournalSheet, 
  fetchTrades, 
  addTrade, 
  updateTradeRow, 
  deleteTradeRow, 
  fetchDocContent, 
  saveDocContent,
  fetchKeepNotes,
  createKeepNote,
  listDocs,
  createDoc,
  Trade,
  KeepNote
} from '@/lib/google-api';
import { 
  LineChart, 
  Line, 
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
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
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

  // Keep Notes states
  const [keepNotes, setKeepNotes] = useState<KeepNote[]>([]);
  const [isKeepLoading, setIsKeepLoading] = useState(false);
  const [keepError, setKeepError] = useState<string | null>(null);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteText, setNewNoteText] = useState('');
  const [isCreatingKeepNote, setIsCreatingKeepNote] = useState(false);

  // Local/Personal fallback notes (for regular gmail accounts or offline use)
  const [fallbackNotes, setFallbackNotes] = useState<{ id: string; title: string; content: string; date: string }[]>([]);
  const [fallbackNoteTitle, setFallbackNoteTitle] = useState('');
  const [fallbackNoteText, setFallbackNoteText] = useState('');
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  // Dark UI toggle state
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to Dark UI as requested

  // Responsive mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Active view
  const [activeTab, setActiveTab] = useState<'overview' | 'journal' | 'notes' | 'keep' | 'alignment' | 'learning'>('overview');

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

  const isKeepRestricted = !!(keepError && (keepError.includes('403') || keepError.includes('restricted') || keepError.includes('denied')));

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');

  // Trade form state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

   const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    pair: '',
    type: 'Buy' as 'Buy' | 'Sell',
    entryPrice: '',
    sl: '',
    tp: '',
    rr: '',
    strategy: '',
    winLoss: 'Pending' as 'Win' | 'Loss' | 'Pending',
    pnl: '',
    notes: '',
  });

  // Next.js hydration safety
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
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

  const loadKeepNotes = async (accessToken: string) => {
    setIsKeepLoading(true);
    setKeepError(null);
    try {
      const notes = await fetchKeepNotes(accessToken);
      setKeepNotes(notes);
    } catch (error: any) {
      const errorMsg = error.message || 'Error listing Keep notes';
      if (errorMsg.includes('403') || errorMsg.includes('restricted') || errorMsg.includes('denied') || errorMsg.includes('enterprise')) {
        console.info('Google Keep notes are restricted (standard for personal @gmail.com accounts). Dashboard Local Notes fallback is active and ready.');
      } else {
        console.error('Error loading Keep notes:', error);
      }
      setKeepError(errorMsg);
    } finally {
      setIsKeepLoading(false);
    }
  };

  const handleCreateKeepNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!newNoteTitle.trim() && !newNoteText.trim()) return;

    setIsCreatingKeepNote(true);
    try {
      await createKeepNote(token, newNoteTitle.trim(), newNoteText.trim());
      setNewNoteTitle('');
      setNewNoteText('');
      await loadKeepNotes(token);
    } catch (error: any) {
      console.error('Error creating Keep note:', error);
      alert('Google Keep API Error: ' + (error.message || 'Failed to create note'));
    } finally {
      setIsCreatingKeepNote(false);
    }
  };

  // Local/Personal fallback notes handlers
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('trading_fallback_notes');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setTimeout(() => {
            setFallbackNotes(parsed);
          }, 0);
        } catch (e) {
          console.error('Error parsing fallback notes:', e);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('trading_fallback_notes', JSON.stringify(fallbackNotes));
    }
  }, [fallbackNotes]);

  const handleAddFallbackNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fallbackNoteTitle.trim() && !fallbackNoteText.trim()) return;
    const newNote = {
      id: `fallback-note-${Date.now()}`,
      title: fallbackNoteTitle.trim(),
      content: fallbackNoteText.trim(),
      date: new Date().toLocaleDateString('my-MM', { year: 'numeric', month: 'short', day: 'numeric' })
    };
    setFallbackNotes([newNote, ...fallbackNotes]);
    setFallbackNoteTitle('');
    setFallbackNoteText('');
  };

  const handleDeleteFallbackNote = (id: string) => {
    // Note deletion is made fully direct and iframe-safe, avoiding window.confirm blocks in iFrames
    setFallbackNotes(fallbackNotes.filter(n => n.id !== id));
  };

  const handleDownloadNote = (note: { title: string; content: string; date: string }) => {
    const text = `Title: ${note.title || 'Untitled Note'}\nDate: ${note.date || ''}\n-----------------------------------------\n\n${note.content || ''}`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(note.title || 'note').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAllNotes = () => {
    if (fallbackNotes.length === 0) return;
    const separator = '\n\n' + '='.repeat(50) + '\n\n';
    const text = fallbackNotes.map(note => 
      `Title: ${note.title || 'Untitled Note'}\nDate: ${note.date || ''}\n-----------------------------------------\n\n${note.content || ''}`
    ).join(separator);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trading_notes_backup_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const bootstrapGoogleFiles = async (accessToken: string) => {
    setIsConnectingDrive(true);
    try {
      // Find or create "Trading Journal (AI Studio)" Spreadsheet
      const sheetId = await findOrCreateFile(
        accessToken,
        'Trading Journal (AI Studio)',
        'application/vnd.google-apps.spreadsheet'
      );
      setSpreadsheetId(sheetId);
      
      // Initialize Sheet with correct headers
      await initializeJournalSheet(accessToken, sheetId);
      
      // Find or create "Trading Notes (AI Studio)" Document
      const docId = await findOrCreateFile(
        accessToken,
        'Trading Notes (AI Studio)',
        'application/vnd.google-apps.document'
      );
      setDocumentId(docId);

      // Load initial data
      await loadTrades(accessToken, sheetId);
      await loadDocContent(accessToken, docId);
      await loadAvailableDocs(accessToken);
      
      // Load Google Keep Notes
      await loadKeepNotes(accessToken);

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
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
        setIsAuthLoading(false);
        setIsMobileMenuOpen(false);
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
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
        setIsMobileMenuOpen(false);
      }
    } catch (err) {
      console.error('Login failed:', err);
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

  const loadLearningNotes = async (userId: string) => {
    setIsLearningNotesLoading(true);
    setLearningError(null);
    try {
      const notes = await fetchLearningNotes(userId);
      setLearningNotes(notes);
    } catch (error: any) {
      console.error('Error fetching learning notes:', error);
      setLearningError('သင်ခန်းစာများဆွဲယူရာတွင် အမှားအယွင်းရှိနေပါသည်။');
    } finally {
      setIsLearningNotesLoading(false);
    }
  };

  // Load learning notes auto-hook
  useEffect(() => {
    const timer = setTimeout(() => {
      if (user?.uid) {
        loadLearningNotes(user.uid);
      } else {
        setLearningNotes([]);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [user]);

  const handleSaveLearningNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
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
      const noteToSave: Omit<LearningNote, 'createdAt'> = {
        id: noteId,
        title: learningNoteTitle.trim(),
        content: learningNoteContent.trim(),
        imageUrl: learningNoteImage,
        userId: user.uid,
        userEmail: user.email || '',
        tags: learningNoteTags
      };

      // 1. Optimistic local update so the note is added or edited instantly in the UI
      const localNote: LearningNote = {
        id: noteId,
        title: noteToSave.title,
        content: noteToSave.content,
        imageUrl: noteToSave.imageUrl || '',
        createdAt: editingLearningNote ? editingLearningNote.createdAt : new Date().toISOString(),
        userId: noteToSave.userId,
        userEmail: noteToSave.userEmail,
        tags: noteToSave.tags || []
      };

      setLearningNotes(prev => {
        const index = prev.findIndex(n => n.id === noteId);
        if (index > -1) {
          const updated = [...prev];
          updated[index] = localNote;
          return updated;
        } else {
          return [localNote, ...prev];
        }
      });

      // 2. Instantly reset inputs and close the modal so there's no visible "Saving..." delay for the user
      setLearningNoteTitle('');
      setLearningNoteContent('');
      setLearningNoteImage('');
      setLearningNoteTags([]);
      setCustomTagInput('');
      setEditingLearningNote(null);
      setShowLearningModal(false);
      setIsSavingLearningNote(false);

      // If viewing the note that is being edited, update its details instantly too
      if (selectedLearningNote?.id === noteId) {
        setSelectedLearningNote(localNote);
      }

      // 3. Save to remote Firestore in the background
      saveLearningNote(noteToSave, !editingLearningNote)
        .then(() => {
          // Re-fetch in the background to sync server timestamps/fields
          loadLearningNotes(user.uid);
        })
        .catch(err => {
          console.error('Background Firestore save failed:', err);
        });

    } catch (error: any) {
      console.error('Error saving learning note:', error);
      setLearningError('သင်ခန်းစာမှတ်စု သိမ်းဆည်းစဉ် အမှားအယွင်းရှိခဲ့ပါသည်။');
      setIsSavingLearningNote(false);
    }
  };

  const handleDeleteLearningNote = async (noteId: string) => {
    if (!user) return;
    if (!confirm('ဤသင်ခန်းစာမှတ်စုကို ဖျက်ရန် သေချာပါသလား?')) return;
    
    try {
      await deleteLearningNote(noteId);
      if (selectedLearningNote?.id === noteId) {
        setSelectedLearningNote(null);
      }
      await loadLearningNotes(user.uid);
    } catch (error: any) {
      console.error('Error deleting note:', error);
      alert('ဖျက်ရာတွင် အမှားအယွင်းရှိခဲ့ပါသည်');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Increase maximum bounds substantially to preserve original desktop chart resolution and readable text labels
        const MAX_WIDTH = 1600;
        const MAX_HEIGHT = 1200;
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
          // Set JPEG quality to 88% (near indistinguishable from raw file) so text, lines, and candles remain pixel-perfect
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          setLearningNoteImage(dataUrl);
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
    await loadKeepNotes(token);
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

    let risk = 0;
    let reward = 0;

    if (formData.type === 'Buy') {
      risk = entry - sl;
      reward = tp - entry;
    } else {
      risk = sl - entry;
      reward = entry - tp;
    }

    if (risk <= 0 || reward <= 0) {
      return { rr: '', suggestedPnlWin: '', suggestedPnlLoss: '' };
    }

    const ratio = reward / risk;
    const rrStr = `1:${ratio.toFixed(1)}`;
    const suggestedPnlWin = `+${ratio.toFixed(1)}R`;
    const suggestedPnlLoss = `-1R`;

    return { rr: rrStr, suggestedPnlWin, suggestedPnlLoss };
  }, [formData.entryPrice, formData.sl, formData.tp, formData.type]);

  // Handle Edit click
  const handleEditClick = (trade: Trade) => {
    setEditingTrade(trade);
    setFormData({
      date: trade.date,
      pair: trade.pair,
      type: trade.type,
      entryPrice: trade.entryPrice ? trade.entryPrice.toString() : '',
      sl: trade.sl ? trade.sl.toString() : '',
      tp: trade.tp ? trade.tp.toString() : '',
      rr: trade.rr || '',
      strategy: trade.strategy || '',
      winLoss: trade.winLoss || 'Pending',
      pnl: trade.pnl || '',
      notes: trade.notes || '',
    });
    setFormError(null);
    setShowFormModal(true);
  };

  // Open Add Trade Modal
  const handleAddClick = () => {
    setEditingTrade(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      pair: '',
      type: 'Buy',
      entryPrice: '',
      sl: '',
      tp: '',
      rr: '',
      strategy: '',
      winLoss: 'Pending',
      pnl: '',
      notes: '',
    });
    setFormError(null);
    setShowFormModal(true);
  };

  // Save Trade handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !spreadsheetId) return;

    if (!formData.pair.trim()) {
      setFormError('Asset Pair အမည် ထည့်သွင်းပေးရန် လိုအပ်ပါသည်။');
      return;
    }
    const entry = parseFloat(formData.entryPrice);
    if (isNaN(entry) || entry <= 0) {
      setFormError('Entry Price ကို မှန်ကန်သော ကိန်းဂဏန်း ထည့်သွင်းပေးပါ။');
      return;
    }

    const slVal = parseFloat(formData.sl) || 0;
    const tpVal = parseFloat(formData.tp) || 0;

    setIsFormSubmitting(true);
    try {
      if (editingTrade) {
        const updated: Trade = {
          row: editingTrade.row,
          id: editingTrade.id,
          date: formData.date,
          pair: formData.pair.toUpperCase(),
          type: formData.type,
          entryPrice: entry,
          sl: slVal,
          tp: tpVal,
          rr: formData.rr || calculatedSuggestions.rr || '',
          strategy: formData.strategy,
          winLoss: formData.winLoss,
          pnl: formData.pnl,
          notes: formData.notes,
        };
        await updateTradeRow(token, spreadsheetId, updated);
      } else {
        const newTrade: Omit<Trade, 'row'> = {
          id: `trade-${Date.now()}`,
          date: formData.date,
          pair: formData.pair.toUpperCase(),
          type: formData.type,
          entryPrice: entry,
          sl: slVal,
          tp: tpVal,
          rr: formData.rr || calculatedSuggestions.rr || '',
          strategy: formData.strategy,
          winLoss: formData.winLoss,
          pnl: formData.pnl,
          notes: formData.notes,
        };
        await addTrade(token, spreadsheetId, newTrade);
      }

      setShowFormModal(false);
      // Reload trades
      await loadTrades(token, spreadsheetId);
    } catch (err: any) {
      console.error(err);
      setFormError('Google Sheets သို့ Data သိမ်းဆည်းစဉ် အမှားအယွင်း ဖြစ်ပေါ်ခဲ့ပါသည်။');
    } finally {
      setIsFormSubmitting(false);
    }
  };

  // Delete Trade handler (made direct and iframe-safe)
  const handleDeleteClick = async (trade: Trade) => {
    if (!token || !spreadsheetId) return;
    setIsLoadingTrades(true);
    try {
      await deleteTradeRow(token, spreadsheetId, trade.row);
      await loadTrades(token, spreadsheetId);
    } catch (err) {
      console.error('Error deleting trade:', err);
    } finally {
      setIsLoadingTrades(false);
    }
  };

  // Filtered & Searched Trades
  const filteredTrades = useMemo(() => {
    return trades.filter(t => {
      const matchSearch = t.pair.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (t.strategy && t.strategy.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchType = filterType === 'ALL' || 
                        (filterType === 'BUY' && t.type === 'Buy') || 
                        (filterType === 'SELL' && t.type === 'Sell');

      const matchStatus = filterStatus === 'ALL' || 
                          (filterStatus === 'OPEN' && t.winLoss === 'Pending') || 
                          (filterStatus === 'CLOSED' && t.winLoss !== 'Pending');

      return matchSearch && matchType && matchStatus;
    });
  }, [trades, searchQuery, filterType, filterStatus]);

  // Helper to parse string PnL fields to numeric values for charts & stats
  const parsePnLValue = (pnlStr: string | null): number => {
    if (!pnlStr) return 0;
    const clean = pnlStr.replace(/[\s\$\+R]/gi, '');
    const parsed = parseFloat(clean);
    if (isNaN(parsed)) return 0;
    return pnlStr.includes('-') ? -Math.abs(parsed) : Math.abs(parsed);
  };

  // Analytics Metrics
  const metrics = useMemo(() => {
    let totalTrades = trades.length;
    let openTrades = trades.filter(t => t.winLoss === 'Pending').length;
    let closedTrades = trades.filter(t => t.winLoss !== 'Pending');
    let totalClosed = closedTrades.length;
    
    let netPnL = trades.reduce((sum, t) => sum + parsePnLValue(t.pnl), 0);
    
    let winTrades = closedTrades.filter(t => t.winLoss === 'Win').length;
    let lossTrades = closedTrades.filter(t => t.winLoss === 'Loss').length;
    let winRate = totalClosed > 0 ? (winTrades / totalClosed) * 100 : 0;
    
    let totalWins = closedTrades.filter(t => t.winLoss === 'Win').reduce((sum, t) => sum + parsePnLValue(t.pnl), 0);
    let totalLosses = closedTrades.filter(t => t.winLoss === 'Loss').reduce((sum, t) => sum + parsePnLValue(t.pnl), 0);
    
    let avgWin = winTrades > 0 ? totalWins / winTrades : 0;
    let avgLoss = lossTrades > 0 ? totalLosses / lossTrades : 0;

    let bestTrade = trades.reduce((best, t) => {
      const val = parsePnLValue(t.pnl);
      return val > best ? val : best;
    }, -Infinity);

    let worstTrade = trades.reduce((worst, t) => {
      const val = parsePnLValue(t.pnl);
      return val < worst ? val : worst;
    }, Infinity);

    return {
      totalTrades,
      openTrades,
      totalClosed,
      netPnL,
      winRate,
      avgWin,
      avgLoss,
      bestTrade: bestTrade === -Infinity ? 0 : bestTrade,
      worstTrade: worstTrade === Infinity ? 0 : worstTrade,
    };
  }, [trades]);

  // Chart data: Cumulative profit/loss over time
  const cumulativeChartData = useMemo(() => {
    // Sort trades by date ascending
    const sorted = [...trades]
      .filter(t => t.winLoss !== 'Pending' && t.pnl)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const result = [];
    let runningTotal = 0;
    for (const t of sorted) {
      const pnlVal = parsePnLValue(t.pnl);
      runningTotal += pnlVal;
      result.push({
        name: t.date,
        pnl: pnlVal,
        total: parseFloat(runningTotal.toFixed(2)),
        pair: t.pair
      });
    }
    return result;
  }, [trades]);

  // Chart data: PnL per individual trade
  const individualChartData = useMemo(() => {
    return [...trades]
      .filter(t => t.winLoss !== 'Pending' && t.pnl)
      .slice(-10) // Show last 10 closed trades
      .map(t => ({
        name: `${t.pair} (${t.date.slice(5)})`,
        pnl: parsePnLValue(t.pnl),
      }));
  }, [trades]);

  // Chart data: Pair distribution
  const pairChartData = useMemo(() => {
    const distribution: Record<string, number> = {};
    trades.forEach(t => {
      distribution[t.pair] = (distribution[t.pair] || 0) + 1;
    });
    return Object.keys(distribution).map(key => ({
      name: key,
      value: distribution[key]
    }));
  }, [trades]);

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
                onClick={() => { setActiveTab('notes'); setIsMobileMenuOpen(false); }}
                className={`flex items-center space-x-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                  activeTab === 'notes'
                    ? 'bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-sm'
                    : isDarkMode ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200' : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>Trading Notes (Docs)</span>
              </button>

              <button
                onClick={() => { setActiveTab('keep'); setIsMobileMenuOpen(false); }}
                className={`flex items-center space-x-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                  activeTab === 'keep'
                    ? 'bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-sm'
                    : isDarkMode ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200' : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                }`}
              >
                <StickyNote className="h-4 w-4" />
                <span>Local Notes (မှတ်စုများ)</span>
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
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`border-b ${isDarkMode ? 'bg-zinc-900 border-zinc-800/80' : 'bg-slate-50 border-slate-200'}`}
              >
                <div className="px-4 py-3 space-y-1">
                  <button
                    onClick={() => { setActiveTab('overview'); setIsMobileMenuOpen(false); }}
                    className={`flex items-center space-x-3 w-full px-3 py-3 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer ${
                      activeTab === 'overview' ? 'bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-950' : isDarkMode ? 'text-zinc-400 hover:bg-zinc-800' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Activity className="h-4.5 w-4.5" />
                    <span>Dashboard</span>
                  </button>
                  
                  <button
                    onClick={() => { setActiveTab('alignment'); setIsMobileMenuOpen(false); }}
                    className={`flex items-center space-x-3 w-full px-3 py-3 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer ${
                      activeTab === 'alignment' ? 'bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-950' : isDarkMode ? 'text-zinc-400 hover:bg-zinc-800' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Percent className="h-4.5 w-4.5" />
                    <span>Alignment Calculator</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('journal'); setIsMobileMenuOpen(false); }}
                    className={`flex items-center space-x-3 w-full px-3 py-3 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer ${
                      activeTab === 'journal' ? 'bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-950' : isDarkMode ? 'text-zinc-400 hover:bg-zinc-800' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <BookOpen className="h-4.5 w-4.5" />
                    <span>Trading Journal ({trades.length})</span>
                  </button>
                  
                  <button
                    onClick={() => { setActiveTab('notes'); setIsMobileMenuOpen(false); }}
                    className={`flex items-center space-x-3 w-full px-3 py-3 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer ${
                      activeTab === 'notes' ? 'bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-950' : isDarkMode ? 'text-zinc-400 hover:bg-zinc-800' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <FileText className="h-4.5 w-4.5" />
                    <span>Trading Notes (Docs)</span>
                  </button>
                  
                  <button
                    onClick={() => { setActiveTab('keep'); setIsMobileMenuOpen(false); }}
                    className={`flex items-center space-x-3 w-full px-3 py-3 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer ${
                      activeTab === 'keep' ? 'bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-950' : isDarkMode ? 'text-zinc-400 hover:bg-zinc-800' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <StickyNote className="h-4.5 w-4.5" />
                    <span>Local Notes (မှတ်စုများ)</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('learning'); setIsMobileMenuOpen(false); }}
                    className={`flex items-center space-x-3 w-full px-3 py-3 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer ${
                      activeTab === 'learning' ? 'bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-950' : isDarkMode ? 'text-zinc-400 hover:bg-zinc-800' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <ImageIcon className="h-4.5 w-4.5" />
                    <span>Learning Notes</span>
                  </button>

                  {user && (
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-3 w-full px-3 py-3 rounded-xl text-xs sm:text-sm font-semibold text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                    >
                      <LogOut className="h-4.5 w-4.5" />
                      <span>Sign Out</span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>
      )}

      {/* Main Body content area */}
      <div className={`flex-1 flex flex-col ${needsAuth ? '' : 'md:pl-64'}`}>
        <main className="flex-1 w-full px-4 sm:px-8 lg:px-10 py-6 sm:py-8">
        
        {/* If user needs authentication, display gorgeous onboarding page */}
        {needsAuth ? (
          <div className="max-w-3xl mx-auto mt-8 bg-white rounded-2xl border border-slate-200/80 shadow-lg overflow-hidden">
            <div className="bg-slate-900 px-6 py-12 text-center text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-radial-gradient(ellipse_at_top,_var(--tw-gradient-stops)) from-slate-800 via-slate-900 to-slate-950 opacity-95"></div>
              <div className="relative z-10 max-w-xl mx-auto">
                <Activity className="h-16 w-16 mx-auto mb-6 text-slate-300 animate-pulse" />
                <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
                  Trading Journal & Notes Dashboard
                </h2>
                <p className="mt-4 text-base text-slate-300">
                  Google Sheet ဖြင့် အရောင်းအဝယ်မှတ်တမ်းများသိမ်းဆည်းခြင်း၊ Profit/Loss များအလိုအလျောက်တွက်ချက်ပေးခြင်းနှင့် Google Doc တွင် ကိုယ်ပိုင် Trading Strategy Note များရေးမှတ်နိုင်သည့် အဆင့်မြင့်စနစ်။
                </p>
              </div>
            </div>

            <div className="px-6 py-10 sm:p-12 text-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Google Account ဖြင့် စတင်ချိတ်ဆက်ပါ</h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto mb-8 leading-relaxed">
                သင့်၏ Google Drive ပေါ်တွင် &quot;Trading Journal (AI Studio)&quot; Spreadsheet နှင့် &quot;Trading Notes (AI Studio)&quot; Document တို့ကို အလိုအလျောက် ဖန်တီးသိမ်းဆည်းပေးမည် ဖြစ်ပါသည်။
              </p>

              {isAuthLoading ? (
                <div className="flex flex-col items-center justify-center space-y-4">
                  <RefreshCw className="h-10 w-10 text-slate-800 animate-spin" />
                  <p className="text-sm font-semibold text-slate-800">Google Authentication စတင်နေပါသည်...</p>
                </div>
              ) : (
                <button
                  onClick={handleLogin}
                  className="gsi-material-button w-full sm:w-auto inline-flex justify-center items-center px-8 py-3.5 border border-slate-300 rounded-xl bg-white shadow-sm hover:shadow-md text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all duration-200 cursor-pointer"
                >
                  <div className="gsi-material-button-content-wrapper flex items-center space-x-3">
                    <div className="gsi-material-button-icon flex items-center justify-center">
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      </svg>
                    </div>
                    <span className="gsi-material-button-contents text-slate-800 text-base">Sign in with Google</span>
                  </div>
                </button>
              )}
            </div>

            <div className="border-t border-slate-200/80 px-6 py-6 sm:px-12 bg-white text-left grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold text-slate-800 flex items-center gap-1.5 text-sm">
                  <DollarSign className="h-4 w-4 text-slate-800" /> Dynamic Auto-PnL
                </h4>
                <p className="text-xs text-slate-500 mt-1">Exit Price နှင့် Position size တို့အပေါ်မူတည်ပြီး PnL များကို Dynamic အလိုအလျောက် တွက်ချက်ပေးပါသည်။</p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 flex items-center gap-1.5 text-sm">
                  <BookOpen className="h-4 w-4 text-slate-800" /> Google Sheets Sync
                </h4>
                <p className="text-xs text-slate-500 mt-1">Trade data တိုင်းကို သင်၏ ကိုယ်ပိုင် Google Account ရှိ Google Sheets ဇယားထဲသို့ တိုက်ရိုက် သိမ်းဆည်းပေးပါသည်။</p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 flex items-center gap-1.5 text-sm">
                  <FileText className="h-4 w-4 text-slate-800" /> Strategic Notes
                </h4>
                <p className="text-xs text-slate-500 mt-1">မဟာဗျူဟာများနှင့် သင်ခန်းစာများကို Google Doc ဖြင့် ချိတ်ဆက်ပြီး လွယ်ကူလျင်မြန်စွာ ရေးသားမှတ်သားနိုင်ပါသည်။</p>
              </div>
            </div>
          </div>
        ) : isConnectingDrive ? (
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
                isDarkMode ? 'bg-indigo-500/20' : 'bg-blue-500/15'
              }`}></div>

              <div className="relative z-10 flex flex-col items-center">
                {/* Visual Icon Header */}
                <div className="relative mb-6">
                  <div className={`absolute inset-0 rounded-full animate-ping opacity-15 scale-125 ${
                    isDarkMode ? 'bg-indigo-400' : 'bg-blue-400'
                  }`}></div>
                  <div className={`relative p-4 rounded-2xl shadow-md border ${
                    isDarkMode 
                      ? 'bg-zinc-800/80 border-zinc-700/80 text-indigo-400' 
                      : 'bg-slate-50 border-slate-100 text-blue-600'
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
                    isDarkMode ? 'from-indigo-500 to-purple-500' : 'from-blue-500 to-indigo-500'
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
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    <span className={isDarkMode ? 'text-zinc-400' : 'text-slate-500'}>
                      Syncing Trading Journal Sheets...
                    </span>
                  </div>
                  <div className="flex items-center space-x-2.5 text-xs font-medium">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
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
                    {activeTab === 'notes' && 'Strategy Notes (ကိုယ်ပိုင်မဟာဗျူဟာများ)'}
                    {activeTab === 'keep' && 'Local Notes (အမြန်မှတ်စုများ)'}
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {activeTab === 'journal' && 'Google Sheets နှင့် ချိတ်ဆက်ထားသော trade data မှတ်တမ်းဇယား'}
                    {activeTab === 'notes' && 'Google Doc နှင့် တိုက်ရိုက်ချိတ်ဆက်ထားသော strategy မှတ်စုစာမျက်နှာ'}
                    {activeTab === 'keep' && 'သင်၏ Trading Note မှတ်စုစာစုများ နှင့် backup notes စနစ်'}
                  </p>
                </div>

                {/* Sync Indicators & Google Direct Links */}
                <div className="flex items-center flex-wrap gap-2.5 text-xs">
                  <button
                    onClick={triggerRefresh}
                    className={`flex items-center space-x-1.5 px-3.5 py-2 border rounded-xl font-semibold transition-all duration-150 cursor-pointer ${
                      isDarkMode 
                        ? 'bg-zinc-800/50 hover:bg-zinc-800 border-zinc-700/50 text-zinc-300 hover:text-white' 
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:text-slate-900 text-slate-600'
                    }`}
                    title="Google Workspace မှ Data များ တစ်ပြိုင်နက် Sync ပြန်လုပ်ပါ"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isLoadingTrades || isDocLoading || isKeepLoading ? 'animate-spin' : ''}`} />
                    <span>Sync Refresh</span>
                  </button>
                  
                  {spreadsheetId && (
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl font-semibold border transition-all duration-150 ${
                        isDarkMode 
                          ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700/85 border-zinc-750' 
                          : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-200/80'
                      }`}
                    >
                      <span>Sheets ဖွင့်ရန်</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {documentId && (
                    <a
                      href={`https://docs.google.com/document/d/${documentId}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl font-semibold border transition-all duration-150 ${
                        isDarkMode 
                          ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700/85 border-zinc-750' 
                          : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-200/80'
                      }`}
                    >
                      <span>Docs ဖွင့်ရန်</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {activeTab === 'keep' && (
                    <a
                      href="https://keep.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl font-semibold border transition-all duration-150 ${
                        isDarkMode 
                          ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700/85 border-zinc-750' 
                          : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-200/80'
                      }`}
                    >
                      <span>Keep ဖွင့်ရန်</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* OVERVIEW DASHBOARD VIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Metrics Panels */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Metric 1: Net PnL */}
                  <div className={`relative overflow-hidden p-4 sm:p-6 rounded-2xl border flex flex-col justify-between transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
                    isDarkMode ? 'bg-zinc-900/50 border-zinc-800/80 text-zinc-100 shadow-zinc-950/20 shadow-md' : 'bg-white border-slate-200/80 shadow-xs text-slate-800 hover:border-slate-300'
                  }`}>
                    {/* Decorative Background Icon */}
                    <DollarSign className="absolute -right-3 -top-3 h-16 w-16 sm:h-20 sm:w-20 opacity-10 dark:opacity-5 text-slate-400 dark:text-zinc-600 pointer-events-none stroke-[1.25]" />
                    
                    <div className="relative z-10">
                      <p className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Net Profit / Loss</p>
                      <h3 className={`text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight ${metrics.netPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {metrics.netPnL >= 0 ? '+$' : '-$'}{Math.abs(metrics.netPnL).toFixed(2)}
                      </h3>
                    </div>
                    <div className="relative z-10 mt-5 flex items-center space-x-2 text-xs font-semibold">
                      {metrics.netPnL >= 0 ? (
                        <>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-extrabold tracking-wider ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>Profitable</span>
                          <span className="text-emerald-500 font-bold">+$ {(metrics.netPnL).toFixed(0)} Net</span>
                        </>
                      ) : (
                        <>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-extrabold tracking-wider ${isDarkMode ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-700'}`}>Drawdown</span>
                          <span className="text-rose-500 font-bold">-$ {Math.abs(metrics.netPnL).toFixed(0)} Net</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Metric 2: Win Rate */}
                  <div className={`relative overflow-hidden p-4 sm:p-6 rounded-2xl border flex flex-col justify-between transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
                    isDarkMode ? 'bg-zinc-900/50 border-zinc-800/80 text-zinc-100 shadow-zinc-950/20 shadow-md' : 'bg-white border-slate-200/80 shadow-xs text-slate-800 hover:border-slate-300'
                  }`}>
                    {/* Decorative Background Icon */}
                    <Award className="absolute -right-3 -top-3 h-16 w-16 sm:h-20 sm:w-20 opacity-10 dark:opacity-5 text-slate-400 dark:text-zinc-600 pointer-events-none stroke-[1.25]" />

                    <div className="relative z-10">
                      <p className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Win Rate (Closed)</p>
                      <div className="flex items-baseline space-x-1.5 mt-2">
                        <h3 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isDarkMode ? 'text-zinc-100' : 'text-slate-900'}`}>
                          {metrics.winRate.toFixed(1)}%
                        </h3>
                      </div>
                    </div>
                    <div className="relative z-10 mt-5">
                      {/* Sleek Progress Track */}
                      <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, Math.max(0, metrics.winRate))}%` }} 
                        />
                      </div>
                      <div className="flex justify-between items-center mt-2 text-[10px] text-slate-400 dark:text-zinc-500 font-bold">
                        <span>{metrics.totalClosed - Math.round(metrics.totalClosed * metrics.winRate / 100)} Losses</span>
                        <span>{Math.round(metrics.totalClosed * metrics.winRate / 100)} Wins ({metrics.totalClosed} Total)</span>
                      </div>
                    </div>
                  </div>

                  {/* Metric 3: Total Trades */}
                  <div className={`relative overflow-hidden p-4 sm:p-6 rounded-2xl border flex flex-col justify-between transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
                    isDarkMode ? 'bg-zinc-900/50 border-zinc-800/80 text-zinc-100 shadow-zinc-950/20 shadow-md' : 'bg-white border-slate-200/80 shadow-xs text-slate-800 hover:border-slate-300'
                  }`}>
                    {/* Decorative Background Icon */}
                    <Layers className="absolute -right-3 -top-3 h-16 w-16 sm:h-20 sm:w-20 opacity-10 dark:opacity-5 text-slate-400 dark:text-zinc-600 pointer-events-none stroke-[1.25]" />

                    <div className="relative z-10">
                      <p className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Total / Open Trades</p>
                      <h3 className={`text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight ${isDarkMode ? 'text-zinc-100' : 'text-slate-900'}`}>
                        {metrics.totalTrades} <span className="text-xs sm:text-sm font-medium text-slate-400">/ {metrics.openTrades} Open</span>
                      </h3>
                    </div>
                    <div className="relative z-10 mt-5">
                      {/* Closed vs Open Split Visual Track */}
                      {metrics.totalTrades > 0 ? (
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
                          <div 
                            className="h-full bg-teal-500" 
                            style={{ width: `${Math.max(10, ((metrics.totalTrades - metrics.openTrades) / metrics.totalTrades) * 100)}%` }} 
                          />
                          <div 
                            className="h-full bg-amber-500" 
                            style={{ width: `${Math.max(10, (metrics.openTrades / metrics.totalTrades) * 100)}%` }} 
                          />
                        </div>
                      ) : (
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden flex" />
                      )}
                      <div className="flex justify-between items-center mt-2 text-[10px] text-slate-400 dark:text-zinc-500 font-bold">
                        <span className="text-teal-500">{metrics.totalTrades - metrics.openTrades} Closed</span>
                        <span className="text-amber-500">{metrics.openTrades} Active Open</span>
                      </div>
                    </div>
                  </div>

                  {/* Metric 4: Avg Win vs Loss */}
                  <div className={`relative overflow-hidden p-4 sm:p-6 rounded-2xl border flex flex-col justify-between transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
                    isDarkMode ? 'bg-zinc-900/50 border-zinc-800/80 text-zinc-100 shadow-zinc-950/20 shadow-md' : 'bg-white border-slate-200/80 shadow-xs text-slate-800 hover:border-slate-300'
                  }`}>
                    {/* Decorative Background Icon */}
                    <Activity className="absolute -right-3 -top-3 h-16 w-16 sm:h-20 sm:w-20 opacity-10 dark:opacity-5 text-slate-400 dark:text-zinc-600 pointer-events-none stroke-[1.25]" />

                    <div className="relative z-10">
                      <p className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Average Win / Loss</p>
                      <div className="mt-2 flex items-baseline space-x-1.5">
                        <span className="text-lg sm:text-xl font-extrabold text-emerald-500">+${metrics.avgWin.toFixed(0)}</span>
                        <span className="text-zinc-400 dark:text-zinc-600 text-sm">/</span>
                        <span className="text-lg sm:text-xl font-extrabold text-rose-500">-${Math.abs(metrics.avgLoss).toFixed(0)}</span>
                      </div>
                    </div>
                    <div className="relative z-10 mt-5">
                      {/* Visual Risk Reward Comparison Track */}
                      {metrics.avgWin > 0 || metrics.avgLoss > 0 ? (
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
                          <div 
                            className="h-full bg-emerald-500" 
                            style={{ width: `${(metrics.avgWin / (metrics.avgWin + Math.abs(metrics.avgLoss) || 1)) * 100}%` }} 
                          />
                          <div 
                            className="h-full bg-rose-500" 
                            style={{ width: `${(Math.abs(metrics.avgLoss) / (metrics.avgWin + Math.abs(metrics.avgLoss) || 1)) * 100}%` }} 
                          />
                        </div>
                      ) : (
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden" />
                      )}
                      <div className="flex justify-between items-center mt-2 text-[10px] text-slate-400 dark:text-zinc-500 font-bold">
                        <span>Win Reward: {metrics.avgLoss !== 0 ? Math.abs(metrics.avgWin / metrics.avgLoss).toFixed(1) : '0.0'}x</span>
                        <span>Loss Factor</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Best / Worst Trades row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`relative overflow-hidden p-4 sm:p-5 rounded-2xl border flex items-center justify-between transition-all duration-200 hover:shadow-md ${
                    isDarkMode ? 'bg-zinc-900/50 border-zinc-800/80 text-zinc-100 shadow-zinc-950/10 shadow-sm' : 'bg-white border-emerald-100 shadow-xs'
                  }`}>
                    {/* Decorative Background Icon */}
                    <Zap className="absolute right-4 top-1/2 -translate-y-1/2 h-16 w-16 sm:h-20 sm:w-20 opacity-10 dark:opacity-5 text-emerald-500 pointer-events-none stroke-[1.25]" />

                    <div className="relative z-10 flex items-center space-x-4">
                      <div className={`p-2.5 sm:p-3 rounded-2xl ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                        <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <div>
                        <p className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Best Profit Trade</p>
                        <p className={`text-xs sm:text-sm font-semibold mt-0.5 ${isDarkMode ? 'text-zinc-200' : 'text-slate-800'}`}>အမြတ်အများဆုံး အရောင်းအဝယ်</p>
                      </div>
                    </div>
                    <span className="relative z-10 text-lg sm:text-xl font-extrabold text-emerald-500">
                      {metrics.bestTrade >= 0 ? '+' : ''}${metrics.bestTrade.toFixed(2)}
                    </span>
                  </div>

                  <div className={`relative overflow-hidden p-4 sm:p-5 rounded-2xl border flex items-center justify-between transition-all duration-200 hover:shadow-md ${
                    isDarkMode ? 'bg-zinc-900/50 border-zinc-800/80 text-zinc-100 shadow-zinc-950/10 shadow-sm' : 'bg-white border-rose-100 shadow-xs'
                  }`}>
                    {/* Decorative Background Icon */}
                    <AlertTriangle className="absolute right-4 top-1/2 -translate-y-1/2 h-16 w-16 sm:h-20 sm:w-20 opacity-10 dark:opacity-5 text-rose-500 pointer-events-none stroke-[1.25]" />

                    <div className="relative z-10 flex items-center space-x-4">
                      <div className={`p-2.5 sm:p-3 rounded-2xl ${isDarkMode ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600'}`}>
                        <TrendingDown className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <div>
                        <p className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Worst Loss Trade</p>
                        <p className={`text-xs sm:text-sm font-semibold mt-0.5 ${isDarkMode ? 'text-zinc-200' : 'text-slate-800'}`}>အရှုံးအများဆုံး အရောင်းအဝယ်</p>
                      </div>
                    </div>
                    <span className="relative z-10 text-lg sm:text-xl font-extrabold text-rose-500">
                      ${metrics.worstTrade.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Charts Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Cumulative performance chart */}
                  <div className={`p-5 rounded-2xl border transition-all lg:col-span-2 ${
                    isDarkMode ? 'bg-zinc-900/40 border-zinc-800/80 text-zinc-100' : 'bg-white border-slate-200 shadow-xs'
                  }`}>
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h4 className={`text-base font-bold ${isDarkMode ? 'text-zinc-100' : 'text-slate-900'}`}>Cumulative Performance Chart</h4>
                        <p className="text-xs text-slate-400">စုစုပေါင်း အမြတ်/အရှုံး တိုးတက်မှုမျဉ်းပုံစံ</p>
                      </div>
                    </div>
                    <div className="h-80 w-full">
                      {cumulativeChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={cumulativeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.15}/>
                                <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#27272a' : '#E2E8F0'} />
                            <XAxis dataKey="name" stroke={isDarkMode ? '#71717a' : '#94A3B8'} fontSize={11} tickLine={false} />
                            <YAxis stroke={isDarkMode ? '#71717a' : '#94A3B8'} fontSize={11} tickLine={false} />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: isDarkMode ? '#18181b' : 'white', 
                                borderRadius: '12px', 
                                border: isDarkMode ? '1px solid #27272a' : '1px solid #E2E8F0', 
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                              }}
                              labelClassName={`font-bold text-xs ${isDarkMode ? 'text-zinc-200' : 'text-slate-800'}`}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="total" 
                              stroke="#6366f1" 
                              strokeWidth={3} 
                              dot={{ r: 4, stroke: '#6366f1', strokeWidth: 1, fill: isDarkMode ? '#18181b' : '#fff' }} 
                              activeDot={{ r: 6 }} 
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                          <Activity className="h-10 w-10 mb-2 stroke-1.5" />
                          <p className="text-xs font-semibold">အရောင်းအဝယ် မှတ်တမ်းအချက်အလက် မရှိသေးပါ။</p>
                          <p className="text-[10px] text-slate-400">ခွဲခြမ်းစိတ်ဖြာချက်များကြည့်ရန် Trade Journal တွင် Closed trades များထည့်သွင်းပေးပါ။</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Individual PnL Distribution Chart */}
                  <div className={`p-5 rounded-2xl border transition-all ${
                    isDarkMode ? 'bg-zinc-900/40 border-zinc-800/80 text-zinc-100' : 'bg-white border-slate-200 shadow-xs'
                  }`}>
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h4 className={`text-base font-bold ${isDarkMode ? 'text-zinc-100' : 'text-slate-900'}`}>Recent Trades Profit/Loss</h4>
                        <p className="text-xs text-slate-400">နောက်ဆုံးလုပ်ဆောင်ခဲ့သည့် အရောင်းအဝယ် PnL နှိုင်းယှဉ်ချက်</p>
                      </div>
                    </div>
                    <div className="h-80 w-full">
                      {individualChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={individualChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#27272a' : '#E2E8F0'} />
                            <XAxis dataKey="name" stroke={isDarkMode ? '#71717a' : '#94A3B8'} fontSize={10} tickLine={false} />
                            <YAxis stroke={isDarkMode ? '#71717a' : '#94A3B8'} fontSize={10} tickLine={false} />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: isDarkMode ? '#18181b' : 'white', 
                                borderRadius: '12px', 
                                border: isDarkMode ? '1px solid #27272a' : '1px solid #E2E8F0' 
                              }}
                            />
                            <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                              {individualChartData.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={entry.pnl >= 0 ? '#10B981' : '#EF4444'} 
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                          <Plus className="h-10 w-10 mb-2 stroke-1.5" />
                          <p className="text-xs font-semibold">ဇယားပြသရန် လုံလောက်သော အချက်အလက်မရှိပါ။</p>
                        </div>
                      )}
                    </div>
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
                        placeholder="ရှာဖွေရန်... (Pair သို့မဟုတ် Notes)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2 border rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all duration-150 ${
                          isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>

                    {/* Filter Type */}
                    <div className="flex items-center space-x-1.5">
                      <Filter className="h-3.5 w-3.5 text-slate-400" />
                      <div className="relative flex items-center">
                        <select
                          value={filterType}
                          onChange={(e: any) => setFilterType(e.target.value)}
                          className={`appearance-none border rounded-xl text-xs pl-3 pr-8 py-2 focus:outline-hidden focus:ring-2 focus:ring-slate-500/20 cursor-pointer ${
                            isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <option value="ALL">All Types</option>
                          <option value="BUY">BUY</option>
                          <option value="SELL">SELL</option>
                        </select>
                        <ChevronDown className="h-3.5 w-3.5 absolute right-2.5 pointer-events-none text-slate-400 dark:text-zinc-500" />
                      </div>
                    </div>

                    {/* Filter Status */}
                    <div className="relative flex items-center">
                      <select
                        value={filterStatus}
                        onChange={(e: any) => setFilterStatus(e.target.value)}
                        className={`appearance-none border rounded-xl text-xs pl-3 pr-8 py-2 focus:outline-hidden focus:ring-2 focus:ring-slate-500/20 cursor-pointer ${
                          isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <option value="ALL">All Status</option>
                        <option value="OPEN">OPEN Trades</option>
                        <option value="CLOSED">CLOSED Trades</option>
                      </select>
                      <ChevronDown className="h-3.5 w-3.5 absolute right-2.5 pointer-events-none text-slate-400 dark:text-zinc-500" />
                    </div>
                  </div>

                  {/* Add Trade Button */}
                  <div>
                    <button
                      onClick={handleAddClick}
                      className="w-full lg:w-auto inline-flex items-center justify-center space-x-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-bold text-sm px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer shadow-xs"
                    >
                      <Plus className="h-4.5 w-4.5" />
                      <span>Trade အသစ်ထည့်ရန်</span>
                    </button>
                  </div>
                </div>

                {/* Trades Logs Table container */}
                <div className={`rounded-2xl border transition-all overflow-hidden ${
                  isDarkMode ? 'bg-zinc-900/40 border-zinc-800/80' : 'bg-white border-slate-200 shadow-xs'
                }`}>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className={`border-b text-xs font-bold tracking-wider transition-colors ${
                          isDarkMode ? 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400' : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}>
                          <th className="px-5 py-4">Date</th>
                          <th className="px-5 py-4">Pair / Asset</th>
                          <th className="px-5 py-4">Buy/Sell</th>
                          <th className="px-5 py-4 text-right">Entry</th>
                          <th className="px-5 py-4 text-right">SL</th>
                          <th className="px-5 py-4 text-right">TP</th>
                          <th className="px-5 py-4 text-center">R:R</th>
                          <th className="px-5 py-4">Strategy/Setup</th>
                          <th className="px-5 py-4 text-center">Win/Loss</th>
                          <th className="px-5 py-4 text-right">PnL ($/R)</th>
                          <th className="px-5 py-4">remarks / Notes</th>
                          <th className="px-5 py-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y text-sm transition-colors ${
                        isDarkMode ? 'divide-zinc-800/80' : 'divide-slate-100'
                      }`}>
                        {isLoadingTrades ? (
                          <tr>
                            <td colSpan={12} className="text-center py-12">
                              <div className="flex flex-col items-center justify-center space-y-2">
                                <RefreshCw className="h-8 w-8 text-slate-500 animate-spin" />
                                <span className={`text-sm font-semibold ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>Google Sheet မှ Trade Data များ ဆွဲယူနေပါသည်...</span>
                              </div>
                            </td>
                          </tr>
                        ) : filteredTrades.length > 0 ? (
                          filteredTrades.map((trade) => {
                            const isWin = trade.winLoss === 'Win';
                            const isLoss = trade.winLoss === 'Loss';
                            const isPending = trade.winLoss === 'Pending';
                            
                            return (
                              <tr key={trade.id} className={`transition-colors duration-150 ${
                                isDarkMode ? 'hover:bg-zinc-800/20' : 'hover:bg-slate-50/50'
                              }`}>
                                <td className={`px-5 py-4 whitespace-nowrap text-xs font-semibold ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>{trade.date}</td>
                                <td className={`px-5 py-4 whitespace-nowrap font-bold ${isDarkMode ? 'text-zinc-200' : 'text-slate-900'}`}>{trade.pair}</td>
                                <td className="px-5 py-4 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold ${
                                    trade.type === 'Buy' 
                                      ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-100') 
                                      : (isDarkMode ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-rose-50 text-rose-700 border border-rose-100')
                                  }`}>
                                    {trade.type}
                                  </span>
                                </td>
                                <td className={`px-5 py-4 whitespace-nowrap text-right font-medium ${isDarkMode ? 'text-zinc-300' : 'text-slate-600'}`}>
                                  {trade.entryPrice ? `${trade.entryPrice.toLocaleString()}` : '-'}
                                </td>
                                <td className={`px-5 py-4 whitespace-nowrap text-right text-xs font-medium ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                                  {trade.sl ? trade.sl.toLocaleString() : '-'}
                                </td>
                                <td className={`px-5 py-4 whitespace-nowrap text-right text-xs font-medium ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                                  {trade.tp ? trade.tp.toLocaleString() : '-'}
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap text-center">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                                    isDarkMode ? 'bg-zinc-800 text-zinc-300 border border-zinc-700' : 'bg-slate-100 text-slate-700 border border-slate-200'
                                  }`}>
                                    {trade.rr || '-'}
                                  </span>
                                </td>
                                <td className={`px-5 py-4 whitespace-nowrap text-xs font-medium ${isDarkMode ? 'text-zinc-300' : 'text-slate-600'}`}>
                                  {trade.strategy || '-'}
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap text-center">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                    isWin ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-100') :
                                    isLoss ? (isDarkMode ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-rose-50 text-rose-700 border border-rose-100') :
                                    (isDarkMode ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-50 text-amber-700 border border-amber-100')
                                  }`}>
                                    {trade.winLoss}
                                  </span>
                                </td>
                                <td className={`px-5 py-4 whitespace-nowrap text-right font-extrabold ${
                                  isWin ? 'text-emerald-500' : isLoss ? 'text-rose-500' : 'text-slate-400'
                                }`}>
                                  {trade.pnl || '-'}
                                </td>
                                <td className={`px-5 py-4 max-w-xs truncate text-xs ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`} title={trade.notes}>
                                  {trade.notes || '-'}
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap text-center text-xs">
                                  <div className="flex justify-center items-center space-x-2">
                                    <button
                                      onClick={() => handleEditClick(trade)}
                                      className={`p-1.5 rounded-lg transition-colors duration-200 ${
                                        isDarkMode ? 'text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                                      }`}
                                      title="Edit Trade"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteClick(trade)}
                                      className={`p-1.5 rounded-lg transition-colors duration-200 ${
                                        isDarkMode ? 'text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                      }`}
                                      title="Delete Trade"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={12} className="text-center py-16">
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
                      filteredTrades.map((trade) => {
                        const isWin = trade.winLoss === 'Win';
                        const isLoss = trade.winLoss === 'Loss';
                        const isPending = trade.winLoss === 'Pending';
                        
                        return (
                          <div 
                            key={trade.id} 
                            className={`p-4 space-y-3 transition-colors duration-150 ${
                              isDarkMode ? 'hover:bg-zinc-800/10' : 'hover:bg-slate-50/30'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className={`text-[10px] font-semibold ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                                {trade.date}
                              </span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isWin ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-100') :
                                isLoss ? (isDarkMode ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-rose-50 text-rose-700 border border-rose-100') :
                                (isDarkMode ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-50 text-amber-700 border border-amber-100')
                              }`}>
                                {trade.winLoss}
                              </span>
                            </div>

                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className={`font-bold text-sm ${isDarkMode ? 'text-zinc-200' : 'text-slate-900'}`}>
                                  {trade.pair}
                                </h4>
                                <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                                  <span className={`font-bold ${trade.type === 'Buy' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {trade.type}
                                  </span>
                                  {' '}@ {trade.entryPrice ? trade.entryPrice.toLocaleString() : '-'}
                                </p>
                              </div>

                              <div className="text-right">
                                <span className={`font-extrabold text-sm ${
                                  isWin ? 'text-emerald-500' : isLoss ? 'text-rose-500' : 'text-slate-400'
                                }`}>
                                  {trade.pnl || '-'}
                                </span>
                                <div className={`text-[10px] font-medium mt-0.5 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                                  R:R: {trade.rr || '-'}
                                </div>
                              </div>
                            </div>

                            {/* Additional info for mobile card */}
                            <div className={`text-xs p-2.5 rounded-xl space-y-1 ${
                              isDarkMode ? 'bg-zinc-950/40 text-zinc-400' : 'bg-slate-50 text-slate-600'
                            }`}>
                              <div className="grid grid-cols-2 gap-1 text-[10px]">
                                <div><span className="opacity-60">SL:</span> <span className="font-semibold">{trade.sl ? trade.sl.toLocaleString() : '-'}</span></div>
                                <div><span className="opacity-60">TP:</span> <span className="font-semibold">{trade.tp ? trade.tp.toLocaleString() : '-'}</span></div>
                              </div>
                              {trade.strategy && (
                                <div className="text-[10px] mt-1">
                                  <span className="font-bold opacity-60">Strategy:</span> {trade.strategy}
                                </div>
                              )}
                              {trade.notes && (
                                <div className="text-[11px] italic mt-1 font-sans border-t border-zinc-200/20 dark:border-zinc-800/40 pt-1">
                                  &quot;{trade.notes}&quot;
                                </div>
                              )}
                            </div>

                            <div className="flex justify-end items-center space-x-3 pt-1">
                              <button
                                onClick={() => handleEditClick(trade)}
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
                                onClick={() => handleDeleteClick(trade)}
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

            {/* TRADING NOTES (DOCS) TAB VIEW */}
            {activeTab === 'notes' && (
              <div className="space-y-6">
                <div className={`p-5 rounded-2xl border transition-all ${
                  isDarkMode ? 'bg-zinc-900/40 border-zinc-800/80 text-zinc-100' : 'bg-white border-slate-200 shadow-xs'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                    <div>
                      <h4 className={`text-lg font-bold flex items-center gap-2 ${isDarkMode ? 'text-zinc-100' : 'text-slate-900'}`}>
                        <FileText className="h-5 w-5 text-emerald-600" />
                        Trading Notes & Journal Workspaces
                      </h4>
                      <p className="text-xs text-slate-400">သင့်၏ စိတ်ကြိုက်အတွေ့အကြုံများနှင့် Strategy များကို Google Doc တွင် အလိုအလျောက် ပေါင်းစပ်သိမ်းဆည်းပေးမည်ဖြစ်ပါသည်။</p>
                    </div>

                    <div className="flex items-center space-x-3 self-end sm:self-center">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${
                        docSaveStatus === 'saved' ? (isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-700') :
                        docSaveStatus === 'dirty' ? (isDarkMode ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-100 text-amber-700') :
                        docSaveStatus === 'saving' ? (isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 animate-pulse' : 'bg-emerald-50 border-emerald-100 text-emerald-700 animate-pulse') :
                        (isDarkMode ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-rose-50 border-rose-100 text-rose-700')
                      }`}>
                        {docSaveStatus === 'saved' ? 'Saved to Google Doc' :
                         docSaveStatus === 'dirty' ? 'Unsaved Draft' :
                         docSaveStatus === 'saving' ? 'Saving to Google...' :
                         'Saving Error'}
                      </span>

                      <button
                        onClick={handleSaveNotes}
                        disabled={isDocLoading || docSaveStatus === 'saving'}
                        className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-sm px-4 py-2 rounded-xl shadow-md shadow-emerald-50/5 transition-all duration-200 cursor-pointer"
                      >
                        <Check className="h-4 w-4" />
                        <span>Save Notes</span>
                      </button>
                    </div>
                  </div>

                  {/* DOCUMENT LIST & CREATOR BLOCK */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/40 dark:bg-zinc-950/20">
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                        ၁။ မှတ်စုစာအုပ် ရွေးချယ်ရန် (Active Document)
                      </label>
                      <div className="relative flex items-center">
                        <select
                          value={documentId || ''}
                          onChange={(e) => handleSelectDoc(e.target.value)}
                          className={`appearance-none w-full pl-3 pr-10 py-2 border rounded-xl text-xs font-semibold focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 cursor-pointer ${
                            isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          {availableDocs.map((doc) => (
                            <option key={doc.id} value={doc.id}>
                              📓 {doc.name.replace('Trading Notes - ', '').replace('Trading Notes (AI Studio)', 'မူလပင်မ Trading Notes')}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="h-4 w-4 absolute right-3 pointer-events-none text-slate-400 dark:text-zinc-500" />
                      </div>
                    </div>

                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                        ၂။ Note အသစ်မှတ်ရန် ခေါင်းစဉ်အသစ် ဖန်တီးရန် (New Note Document)
                      </label>
                      <form onSubmit={handleCreateNewDoc} className="flex gap-2">
                        <input
                          type="text"
                          value={newDocTitle}
                          onChange={(e) => setNewDocTitle(e.target.value)}
                          placeholder="ဥပမာ- Gold Strategy, Weekly Plan, Risk Management..."
                          className={`flex-1 px-3 py-2 border rounded-xl text-xs focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 ${
                            isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        />
                        <button
                          type="submit"
                          disabled={isCreatingDoc || !newDocTitle.trim()}
                          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all duration-200 cursor-pointer shrink-0"
                        >
                          {isCreatingDoc ? 'ဖန်တီးနေသည်...' : '+ Note အသစ်'}
                        </button>
                      </form>
                    </div>
                  </div>

                  {isDocLoading ? (
                    <div className={`h-96 flex flex-col items-center justify-center border border-dashed rounded-xl ${
                      isDarkMode ? 'border-zinc-800 bg-zinc-900/20' : 'border-slate-200 bg-slate-50/50'
                    }`}>
                      <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin mb-2" />
                      <span className="text-xs font-bold text-slate-500">Google Docs မှ စာမျက်နှာအချက်အလက်များ ဖတ်ရှုနေပါသည်...</span>
                    </div>
                  ) : (
                    <div className="relative">
                      <textarea
                        value={docText}
                        onChange={(e) => {
                          setDocText(e.target.value);
                          setDocSaveStatus('dirty');
                        }}
                        placeholder="သင်၏ trading အတွေးအမြင်များ၊ Strategy များ၊ သတိထားရမည့်အချက်များအားလုံးကို စိတ်ကြိုက် ရေးသားမှတ်သားနိုင်ပါသည်။"
                        rows={16}
                        className={`w-full p-4 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200 leading-relaxed font-mono ${
                          isDarkMode 
                            ? 'bg-zinc-950 border-zinc-800 text-zinc-100' 
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                      <div className="absolute bottom-3 right-3 text-[10px] text-slate-400 font-semibold pointer-events-none">
                        Characters: {docText.length}
                      </div>
                    </div>
                  )}
                </div>

                {/* Helpful guides block */}
                <div className={`p-4 rounded-xl flex items-start space-x-3 border ${
                  isDarkMode 
                    ? 'bg-amber-950/10 border-amber-500/20 text-amber-300' 
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-sm">မှတ်သားရန်</h5>
                    <p className="text-xs mt-1 leading-relaxed">
                      &quot;Save Notes&quot; ခလုတ်ကို နှိပ်လိုက်သည့်အခါတွင် Google Doc ရှိ စာသားအားလုံးကို လက်ရှိရေးသားထားသော စာသားများဖြင့် အစားထိုး သိမ်းဆည်းသွားမည်ဖြစ်ပါသည်။ Google Doc API update တိုက်ရိုက်လုပ်ဆောင်ရန် အထက်ပါ link မှလည်း Docs ထဲဝင်ရောက်ပြီး စိတ်ကြိုက် format များဖြင့် တိုက်ရိုက်ရေးသားပြင်ဆင်နိုင်ပါသည်။
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* LOCAL NOTES WORKSPACE VIEW */}
            {activeTab === 'keep' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Create Local Note Form Column */}
                  <div className={`p-6 rounded-2xl border transition-all lg:col-span-1 h-fit ${
                    isDarkMode ? 'bg-zinc-900/40 border-zinc-800/80 text-zinc-100' : 'bg-white border-slate-200/80 shadow-xs text-slate-800'
                  }`}>
                    <div className="flex items-center space-x-3 mb-5 pb-4 border-b border-zinc-200/30 dark:border-zinc-800/80">
                      <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-500">
                        <StickyNote className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="text-md font-bold">Note အသစ်ရေးသားရန်</h4>
                        <p className="text-xs text-zinc-500 mt-0.5">အော့ဖ်လိုင်း/ကွန်ပျူတာပေါ် တိုက်ရိုက်သိမ်းရန်</p>
                      </div>
                    </div>

                    <form onSubmit={handleAddFallbackNote} className="space-y-4">
                      <div>
                        <input
                          type="text"
                          placeholder="ခေါင်းစဉ် (Title)..."
                          value={fallbackNoteTitle}
                          onChange={(e) => setFallbackNoteTitle(e.target.value)}
                          className={`w-full p-3 rounded-xl text-sm font-semibold border focus:outline-hidden transition-all ${
                            isDarkMode 
                              ? 'bg-zinc-900 border-zinc-800 focus:border-slate-500/50 focus:ring-4 focus:ring-slate-500/10 text-zinc-100' 
                              : 'bg-slate-50 border-slate-200 focus:border-slate-500 focus:ring-4 focus:ring-slate-500/10 text-slate-800'
                          }`}
                        />
                      </div>
                      <div>
                        <textarea
                          placeholder="အသေးစိတ်အချက်အလက်များ ရေးသားပါ..."
                          value={fallbackNoteText}
                          onChange={(e) => setFallbackNoteText(e.target.value)}
                          rows={6}
                          className={`w-full p-3 rounded-xl text-sm border focus:outline-hidden transition-all leading-relaxed ${
                            isDarkMode 
                              ? 'bg-zinc-900 border-zinc-800 focus:border-slate-500/50 focus:ring-4 focus:ring-slate-500/10 text-zinc-100' 
                              : 'bg-slate-50 border-slate-200 focus:border-slate-500 focus:ring-4 focus:ring-slate-500/10 text-slate-800'
                          }`}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={!fallbackNoteTitle.trim() && !fallbackNoteText.trim()}
                        className="w-full inline-flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-bold text-sm px-4 py-3 rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Local Note အသစ်သိမ်းရန်</span>
                      </button>
                    </form>
                  </div>

                  {/* Local Notes List Column */}
                  <div className={`p-6 rounded-2xl border transition-all lg:col-span-2 ${
                    isDarkMode ? 'bg-zinc-900/40 border-zinc-800/80' : 'bg-white border-slate-200/80 shadow-xs'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5 border-b pb-4 border-zinc-200/30 dark:border-zinc-800/80">
                      <div>
                        <h4 className="text-lg font-bold flex items-center gap-2">
                          <BookOpen className="h-5 w-5 text-slate-500 dark:text-zinc-400" />
                          သိမ်းဆည်းထားသော Local Notes များ ({fallbackNotes.length})
                        </h4>
                        <p className="text-xs text-zinc-500 mt-0.5">မည်သည့် account မဆို Browser storage တွင် အော့ဖ်လိုင်းအပြည့်အဝ အခမဲ့သုံးနိုင်သောစနစ်</p>
                      </div>

                      {fallbackNotes.length > 0 && (
                        <button
                          onClick={handleDownloadAllNotes}
                          className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-150 cursor-pointer ${
                            isDarkMode 
                              ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700/80 hover:text-white' 
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                          title="Notes အားလုံးကို PC ပေါ်သို့ Backup Text File အဖြစ် ဒေါင်းလုဒ်လုပ်ရန်"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Backup All Notes (ဒေါင်းလုဒ်)</span>
                        </button>
                      )}
                    </div>

                    {fallbackNotes.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[550px] overflow-y-auto pr-1">
                        {fallbackNotes.map((note) => {
                          const isExpanded = expandedNotes[note.id];
                          const maxChars = 150;
                          const shouldTruncate = note.content && note.content.length > maxChars;
                          const displayedContent = shouldTruncate && !isExpanded 
                            ? `${note.content.slice(0, maxChars)}...` 
                            : note.content;

                          return (
                            <div 
                              key={note.id}
                              className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                                isDarkMode 
                                  ? 'bg-zinc-800/30 border-zinc-800/80 text-zinc-100 hover:border-zinc-700/80' 
                                  : 'bg-slate-50 border-slate-200/70 text-slate-800 hover:bg-slate-100/50'
                              }`}
                            >
                              <div>
                                <div className="flex justify-between items-start gap-2 mb-2">
                                  <div>
                                    {note.title && <h6 className="font-bold text-sm text-slate-700 dark:text-zinc-200">{note.title}</h6>}
                                    <span className="text-[10px] text-zinc-400 font-medium">{note.date}</span>
                                  </div>
                                  <div className="flex items-center space-x-1 shrink-0">
                                    <button
                                      onClick={() => handleDownloadNote(note)}
                                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                        isDarkMode ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200'
                                      }`}
                                      title="PC ပေါ်သို့ Text File အဖြစ် ဒေါင်းလုဒ်လုပ်ရန်"
                                    >
                                      <Download className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteFallbackNote(note.id)}
                                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                        isDarkMode ? 'text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'
                                      }`}
                                      title="Delete note"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                                {note.content && (
                                  <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-300 whitespace-pre-wrap">
                                    {displayedContent}
                                  </p>
                                )}
                              </div>

                              {shouldTruncate && (
                                <button
                                  onClick={() => setExpandedNotes({
                                    ...expandedNotes,
                                    [note.id]: !isExpanded
                                  })}
                                  className="mt-3 text-left text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                                >
                                  {isExpanded ? 'လျှော့ရန် (Show Less)' : 'ဆက်ဖတ်ရန် (Show More)'}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-16 text-center border border-dashed rounded-xl border-zinc-200/50 dark:border-zinc-800">
                        <StickyNote className="h-10 w-10 text-zinc-400 dark:text-zinc-700 mx-auto mb-2 stroke-1" />
                        <p className="text-xs text-zinc-500">သိမ်းထားသော Note မရှိသေးပါ။ Note အသစ်စတင်ရေးသားနိုင်ပါသည်။</p>
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
                        <ImageIcon className="h-5.5 w-5.5 text-indigo-500" />
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
                        className="inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-150 cursor-pointer animate-fade-in"
                      >
                        <Plus className="h-4 w-4" />
                        <span>သင်ခန်းစာသစ်ရေးရန်</span>
                      </button>
                    </div>
                  </div>

                  {/* Privacy Guard Notice banner */}
                  <div className={`mt-4 px-4 py-3 rounded-xl border flex items-center gap-3 text-xs font-medium leading-relaxed ${
                    isDarkMode 
                      ? 'bg-indigo-950/10 border-indigo-900/40 text-indigo-300' 
                      : 'bg-indigo-50/50 border-indigo-100 text-indigo-700'
                  }`}>
                    <span className="flex h-2 w-2 relative shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
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
                          className={`w-full pl-9 pr-4 py-2 border rounded-xl text-xs focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 ${
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
                            ? 'bg-indigo-600 text-white shadow-xs'
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
                                ? 'bg-indigo-600 text-white shadow-xs'
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
                      <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mx-auto mb-3" />
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
                                  className="inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
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
                            {filtered.map((note) => (
                              <div
                                key={note.id}
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
                                        src={note.imageUrl} 
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
                                      className="font-bold text-sm tracking-tight hover:text-indigo-500 dark:hover:text-indigo-400 cursor-pointer line-clamp-1 mb-1.5"
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
                                                ? 'bg-indigo-950/40 text-indigo-300 border border-indigo-900/40 hover:bg-indigo-900/30' 
                                                : 'bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100'
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
                                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
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
        {showFormModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
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
              className={`relative z-10 w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl text-left shadow-xl overflow-hidden transition-all ${
                isDarkMode ? 'bg-zinc-900 border border-zinc-800 text-zinc-100 shadow-black/40' : 'bg-white text-slate-800 shadow-slate-200/50'
              }`}
            >
              {/* Header - Sticky */}
              <div className="bg-slate-900 dark:bg-zinc-950 px-4 sm:px-6 py-4 flex justify-between items-center text-white shrink-0">
                <h3 className="text-sm sm:text-base font-bold leading-6">
                  {editingTrade ? 'Trading Record ပြင်ဆင်ရန်' : 'Trading Record အသစ်ထည့်ရန်'}
                </h3>
                <button 
                  onClick={() => setShowFormModal(false)}
                  className="text-white/80 hover:text-white text-sm font-semibold transition-all cursor-pointer"
                >
                  ပိတ်ရန်
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="flex-1 flex flex-col overflow-hidden">
                {/* Form fields - Scrollable body */}
                <div className={`flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 space-y-3.5 ${isDarkMode ? 'bg-zinc-900' : 'bg-white'}`}>
                  {formError && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold">
                      {formError}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {/* Date */}
                    <div>
                      <label className={`block text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>Date</label>
                      <input
                        type="date"
                        required
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className={`w-full px-3 py-1.5 sm:py-2 border rounded-xl text-sm focus:outline-hidden focus:border-slate-500 focus:ring-2 focus:ring-slate-500/10 ${
                          isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>

                    {/* Pair */}
                    <div>
                      <label className={`block text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>Pair / Asset</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. BTCUSD"
                        value={formData.pair}
                        onChange={(e) => setFormData({ ...formData, pair: e.target.value })}
                        className={`w-full px-3 py-1.5 sm:py-2 border rounded-xl text-sm focus:outline-hidden focus:border-slate-500 focus:ring-2 focus:ring-slate-500/10 ${
                          isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {/* Buy/Sell Type */}
                    <div>
                      <label className={`block text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>Buy/Sell</label>
                      <div className="relative flex items-center">
                        <select
                          value={formData.type}
                          onChange={(e: any) => setFormData({ ...formData, type: e.target.value })}
                          className={`appearance-none w-full pl-3 pr-10 py-1.5 sm:py-2 border rounded-xl text-sm focus:outline-hidden focus:border-slate-500 focus:ring-2 focus:ring-slate-500/10 cursor-pointer ${
                            isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <option value="Buy">Buy</option>
                          <option value="Sell">Sell</option>
                        </select>
                        <ChevronDown className="h-4 w-4 absolute right-3 pointer-events-none text-slate-400 dark:text-zinc-500" />
                      </div>
                    </div>

                    {/* Win/Loss */}
                    <div>
                      <label className={`block text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>Win/Loss</label>
                      <div className="relative flex items-center">
                        <select
                          value={formData.winLoss}
                          onChange={(e: any) => setFormData({ ...formData, winLoss: e.target.value })}
                          className={`appearance-none w-full pl-3 pr-10 py-1.5 sm:py-2 border rounded-xl text-sm focus:outline-hidden focus:border-slate-500 focus:ring-2 focus:ring-slate-500/10 cursor-pointer ${
                            isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Win">Win</option>
                          <option value="Loss">Loss</option>
                        </select>
                        <ChevronDown className="h-4 w-4 absolute right-3 pointer-events-none text-slate-400 dark:text-zinc-500" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {/* Entry Price */}
                    <div>
                      <label className={`block text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>Entry Price</label>
                      <input
                        type="number"
                        step="any"
                        required
                        placeholder="60000"
                        value={formData.entryPrice}
                        onChange={(e) => setFormData({ ...formData, entryPrice: e.target.value })}
                        className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-xl text-sm focus:outline-hidden focus:border-slate-500 focus:ring-2 focus:ring-slate-500/10 ${
                          isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>

                    {/* SL */}
                    <div>
                      <label className={`block text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>SL</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="59500"
                        value={formData.sl}
                        onChange={(e) => setFormData({ ...formData, sl: e.target.value })}
                        className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-xl text-sm focus:outline-hidden focus:border-slate-500 focus:ring-2 focus:ring-slate-500/10 ${
                          isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>

                    {/* TP */}
                    <div>
                      <label className={`block text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>TP</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="61500"
                        value={formData.tp}
                        onChange={(e) => setFormData({ ...formData, tp: e.target.value })}
                        className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-xl text-sm focus:outline-hidden focus:border-slate-500 focus:ring-2 focus:ring-slate-500/10 ${
                          isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {/* R:R (Risk/Reward) */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className={`block text-[11px] sm:text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>R:R Ratio</label>
                        {calculatedSuggestions.rr && (
                          <span className="text-[9px] text-emerald-500 font-semibold truncate max-w-[55px] sm:max-w-none">Sg: {calculatedSuggestions.rr}</span>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder={calculatedSuggestions.rr || "e.g. 1:3"}
                        value={formData.rr}
                        onChange={(e) => setFormData({ ...formData, rr: e.target.value })}
                        className={`w-full px-3 py-1.5 sm:py-2 border rounded-xl text-sm focus:outline-hidden focus:border-slate-500 focus:ring-2 focus:ring-slate-500/10 ${
                          isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>

                    {/* PnL ($ / R) */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className={`block text-[11px] sm:text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>PnL ($/R)</label>
                        {formData.winLoss !== 'Pending' && (
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, pnl: formData.winLoss === 'Win' ? (calculatedSuggestions.suggestedPnlWin || '+3R') : '-1R' })}
                            className="text-[9px] bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 px-1.5 py-0.5 rounded text-slate-500 dark:text-zinc-300 font-bold cursor-pointer"
                          >
                            Auto-Fill
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. +$300, +3R"
                        value={formData.pnl}
                        onChange={(e) => setFormData({ ...formData, pnl: e.target.value })}
                        className={`w-full px-3 py-1.5 sm:py-2 border rounded-xl text-sm focus:outline-hidden focus:border-slate-500 focus:ring-2 focus:ring-slate-500/10 ${
                          isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Strategy */}
                  <div>
                    <label className={`block text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>Strategy / Setup</label>
                    <input
                      type="text"
                      placeholder="e.g. Liquidity Sweep, Order Block"
                      value={formData.strategy}
                      onChange={(e) => setFormData({ ...formData, strategy: e.target.value })}
                      className={`w-full px-3 py-1.5 sm:py-2 border rounded-xl text-sm focus:outline-hidden focus:border-slate-500 focus:ring-2 focus:ring-slate-500/10 ${
                        isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className={`block text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>Notes / Lessons Learned</label>
                    <textarea
                      placeholder="Setup အတိုင်း စိတ်ရှည်လက်ရှည် စောင့်ဝင်ခဲ့၍ အဆင်ပြေခဲ့သည်။"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={2}
                      className={`w-full px-3 py-1.5 sm:py-2 border rounded-xl text-sm focus:outline-hidden focus:border-slate-500 focus:ring-2 focus:ring-slate-500/10 resize-none ${
                        isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>
                </div>

                {/* Actions - Sticky footer */}
                <div className={`px-4 sm:px-6 py-4 flex justify-end space-x-3 border-t shrink-0 ${
                  isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-100'
                }`}>
                  <button
                    type="button"
                    onClick={() => setShowFormModal(false)}
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
                    disabled={isFormSubmitting}
                    className={`inline-flex justify-center items-center px-4 py-2 text-sm font-semibold rounded-xl shadow-sm transition-colors duration-150 cursor-pointer ${
                      isDarkMode
                        ? 'bg-zinc-100 text-zinc-950 hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600'
                        : 'bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400'
                    }`}
                  >
                    {isFormSubmitting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />
                        <span>Saving...</span>
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

        {/* CREATE / EDIT LEARNING NOTE MODAL */}
        {showLearningModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 animate-fade-in">
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
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={`relative w-full max-w-2xl rounded-2xl border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden ${
                isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              {/* Header */}
              <div className={`px-6 py-4 border-b flex justify-between items-center shrink-0 ${
                isDarkMode ? 'border-zinc-800' : 'border-slate-100'
              }`}>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-indigo-500" />
                  {editingLearningNote ? 'သင်ခန်းစာမှတ်စုအား ပြင်ဆင်ရန်' : 'သင်ခန်းစာမှတ်စုအသစ် ရေးသားရန်'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowLearningModal(false)}
                  className={`p-1 rounded-lg transition-colors cursor-pointer ${
                    isDarkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-500'
                  }`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSaveLearningNote} className="flex flex-col flex-1 overflow-y-auto">
                <div className="p-6 space-y-5">
                  {learningError && (
                    <div className="p-3.5 rounded-xl text-xs bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-2 font-medium">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{learningError}</span>
                    </div>
                  )}

                  {/* Title */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                      သင်ခန်းစာ ခေါင်းစဉ် (Title) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Break of Structure (BOS) နှင့် Liquidity ကောက်ပုံ"
                      value={learningNoteTitle}
                      onChange={(e) => setLearningNoteTitle(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 ${
                        isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>

                  {/* Image Uploader */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                      ပုံတင်ရန် (Upload Image) - <span className="text-[10px] text-zinc-400 font-normal">စာနှင့်အတူ တွဲသိမ်းချင်သော ပုံရှိလျှင်</span>
                    </label>
                    
                    <div className="space-y-3">
                      {learningNoteImage ? (
                        <div className="relative rounded-xl overflow-hidden border border-zinc-700/50 max-h-56 bg-zinc-950">
                          <img 
                            src={learningNoteImage} 
                            alt="Preview" 
                            className="h-full w-full object-contain max-h-56 mx-auto"
                          />
                          <button
                            type="button"
                            onClick={() => setLearningNoteImage('')}
                            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-lg shadow-md transition-colors cursor-pointer"
                            title="ပုံကို ဖယ်ရှားရန်"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors relative group ${
                          isDarkMode 
                            ? 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/20' 
                            : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                        }`}>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          <ImageIcon className="h-8 w-8 text-zinc-400 dark:text-zinc-600 mx-auto mb-2" />
                          <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">ပုံရွေးချယ်ရန် ကလစ်နှိပ်ပါ သို့မဟုတ် Drag ဆွဲထည့်ပါ</p>
                          <p className="text-[10px] text-zinc-400 mt-1">ပုံအရွယ်အစားကို client-side တွင် အလိုအလျောက် သင့်လျော်စွာ ချုံ့ပေးမည်ဖြစ်သည်။</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tags Selector */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                      Tags ရွေးချယ်ရန် / ထည့်သွင်းရန် (Tags)
                    </label>
                    <div className="space-y-2.5">
                      {/* Previously used tags for quick toggle */}
                      {allUniqueTags.length > 0 && (
                        <div className="space-y-1">
                          <span className={`text-[10px] font-semibold block ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>ယခင်အသုံးပြုခဲ့သော Tags များမှ အမြန်ရွေးချယ်ရန်:</span>
                          <div className="flex flex-wrap gap-1.5">
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
                                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-100 ${
                                    isSelected 
                                      ? 'bg-indigo-600 text-white shadow-xs font-bold' 
                                      : isDarkMode ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-750' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                  }`}
                                >
                                  {isSelected ? '✓ ' : ''}#{tag}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Custom tag input */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Custom tag ရိုက်ထည့်ပါ (e.g. MyPattern) ပြီးလျှင် Enter ခေါက်ပါ..."
                          value={customTagInput}
                          onChange={(e) => setCustomTagInput(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))} // only allow alphanumeric and underscores
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
                          className={`flex-1 px-3 py-2 border rounded-xl text-xs focus:outline-hidden focus:border-indigo-500 ${
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
                          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl cursor-pointer"
                        >
                          ထည့်ရန်
                        </button>
                      </div>

                      {/* Active selected tags list */}
                      {learningNoteTags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl border border-zinc-200/10 bg-zinc-950/20 dark:bg-zinc-950/50">
                          <span className="text-[10px] text-zinc-400 font-semibold block mr-1 self-center">ရွေးချယ်ထားသော Tags:</span>
                          {learningNoteTags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 bg-indigo-500/15 text-indigo-400 px-2 py-0.5 rounded-md text-xs font-semibold"
                            >
                              #{tag}
                              <button
                                type="button"
                                onClick={() => setLearningNoteTags(learningNoteTags.filter(t => t !== tag))}
                                className="hover:text-red-400 font-bold ml-1 focus:outline-hidden"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                      သင်ခန်းစာအကြောင်းအရာ / မှတ်စုစာသား (Content) <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      placeholder="Market Structure Shift ဖြစ်သွားတဲ့အချိန်မှာ Order Block နေရာမှာ Limit တင်ပြီးစောင့်ဝင်ရမယ်..."
                      value={learningNoteContent}
                      onChange={(e) => setLearningNoteContent(e.target.value)}
                      rows={8}
                      className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 whitespace-pre-wrap ${
                        isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
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
                    className="inline-flex justify-center items-center bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm px-5 py-2 rounded-xl transition-all duration-150 cursor-pointer shadow-xs"
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
                      src={selectedLearningNote.imageUrl} 
                      alt={selectedLearningNote.title} 
                      className="max-h-[45vh] w-auto object-contain transition-all duration-300 group-hover:scale-[1.01] group-hover:brightness-105"
                    />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors duration-250 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <span className="bg-black/75 text-zinc-100 text-xs font-bold px-3 py-2 rounded-xl flex items-center space-x-2 backdrop-blur-xs shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-250">
                        <ZoomIn className="h-4 w-4 text-indigo-400" />
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
                            ? 'bg-indigo-950/40 text-indigo-300 border-indigo-900/30' 
                            : 'bg-indigo-50 text-indigo-700 border-indigo-100'
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
                
                <div className="flex items-center space-x-3">
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
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer shadow-xs"
                  >
                    Close
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
                href={lightboxImage} 
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
                src={lightboxImage} 
                alt="Enlarged Note Asset" 
                className="max-w-[98vw] sm:max-w-[92vw] max-h-[88vh] object-contain rounded-lg shadow-2xl border border-zinc-800/40 select-none pointer-events-auto cursor-zoom-out"
                onClick={() => setLightboxImage(null)}
              />
              {/* Optional Caption */}
              <div className="mt-4 px-4 py-1.5 bg-zinc-950/85 backdrop-blur-xs border border-zinc-800/40 rounded-full flex items-center space-x-2 shadow-lg">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
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
