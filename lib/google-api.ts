// Google Workspace API Proxy Clients (sends requests to local API server to avoid client CORS / sandbox fetch blocks)

export interface Trade {
  row: number; // 1-based index corresponding to sheet row (row 1 is headers, trades start at 2)
  id: string;
  tradeNumber: string;
  date: string;
  pair: string; // Pair / Asset
  entryPrice: number;
  sl: number;
  tp: number;
  rr: string;
  watchlist: string; // Watchlist Details/ Setup
  winLoss: 'TP' | 'SL' | 'Breakeven' | 'Trailing Stop' | 'Pending'; // Result (TP/SL)
  pnl: string;
  notes: string; // Remarks/ Note
  commitment: string;
  tradePhoto?: string; // Trade SS (B&F)
  tradePhotoBefore?: string;
  tradePhotoAfter?: string;
  type?: 'Buy' | 'Sell'; // Optional for fallback
  strategy?: string; // Optional for fallback
  emotion?: string; // Optional for fallback
}

// Global helper for calling the local API proxy
async function callProxy(accessToken: string, action: string, payload: any = {}) {
  const res = await fetch('/api/google', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      action,
      ...payload,
    }),
  });

  if (!res.ok) {
    let errMsg = `Google Proxy API failed with status ${res.status}`;
    try {
      const errText = await res.text();
      try {
        const errJson = JSON.parse(errText);
        if (errJson && errJson.error) {
          errMsg = errJson.error;
        }
      } catch (jsonErr) {
        if (errText) {
          if (errText.includes('<html>') || errText.includes('<html')) {
            errMsg = `Access restricted or denied (Status ${res.status}). Google Workspace permissions or credentials might be restricted for this service.`;
          } else {
            errMsg = errText;
          }
        }
      }
    } catch (e) {}
    throw new Error(errMsg);
  }

  return await res.json();
}

// Find or Create a file in Google Drive
export async function findOrCreateFile(
  accessToken: string,
  name: string,
  mimeType: string
): Promise<string> {
  // We can just rely on the server's 'bootstrap' action to do both findOrCreate and formatting,
  // but to keep signature compatibility:
  const data = await callProxy(accessToken, 'bootstrap');
  if (mimeType.includes('spreadsheet')) {
    return data.spreadsheetId;
  } else {
    return data.documentId;
  }
}

// Ensure Trading Journal Sheet is properly formatted with headers
export async function initializeJournalSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<void> {
  // Done inside 'bootstrap' action on server
}

// Fetch all trades from Sheet
export async function fetchTrades(
  accessToken: string,
  spreadsheetId: string
): Promise<Trade[]> {
  const data = await callProxy(accessToken, 'fetchTrades', { spreadsheetId });
  return data.trades || [];
}

// Append a new trade
export async function addTrade(
  accessToken: string,
  spreadsheetId: string,
  trade: Omit<Trade, 'row'>
): Promise<void> {
  await callProxy(accessToken, 'addTrade', { spreadsheetId, trade });
}

// Update an existing trade
export async function updateTradeRow(
  accessToken: string,
  spreadsheetId: string,
  trade: Trade
): Promise<void> {
  await callProxy(accessToken, 'updateTrade', { spreadsheetId, trade });
}

// Delete a trade (by removing its sheet row)
export async function deleteTradeRow(
  accessToken: string,
  spreadsheetId: string,
  rowIndex: number // 1-based sheet row index (e.g. 2, 3...)
): Promise<void> {
  await callProxy(accessToken, 'deleteTrade', { spreadsheetId, rowIndex });
}

// Clear all trades and seed with a single correct sample row
export async function clearAndSeedTrades(
  accessToken: string,
  spreadsheetId: string
): Promise<void> {
  await callProxy(accessToken, 'clearAndSeedTrades', { spreadsheetId });
}

// Fetch Google Doc content (extracted plain text)
export async function fetchDocContent(
  accessToken: string,
  documentId: string
): Promise<{ text: string; length: number }> {
  return await callProxy(accessToken, 'fetchDoc', { documentId });
}

// Save Google Doc content (overwrites everything)
export async function saveDocContent(
  accessToken: string,
  documentId: string,
  content: string
): Promise<void> {
  await callProxy(accessToken, 'saveDoc', { documentId, content });
}

export interface KeepNote {
  name: string;
  title?: string;
  body?: {
    textContent?: {
      text?: string;
    };
  };
}

// Fetch Keep Notes
export async function fetchKeepNotes(accessToken: string): Promise<KeepNote[]> {
  const data = await callProxy(accessToken, 'fetchKeepNotes');
  return data.notes || [];
}

// Create Keep Note
export async function createKeepNote(
  accessToken: string,
  title: string,
  bodyText: string
): Promise<KeepNote> {
  const note = {
    title,
    body: {
      textContent: {
        text: bodyText,
      },
    },
  };
  return await callProxy(accessToken, 'createKeepNote', { note });
}

// List all trading-related Google Docs
export async function listDocs(accessToken: string): Promise<{ id: string; name: string }[]> {
  const data = await callProxy(accessToken, 'listDocs');
  return data.files || [];
}

// Create a new custom trading-related Google Doc
export async function createDoc(
  accessToken: string,
  title: string
): Promise<{ documentId: string; name: string }> {
  return await callProxy(accessToken, 'createDoc', { title });
}

export interface LearningNote {
  row?: number;
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  userId?: string;
  userEmail?: string;
  tags?: string[];
  docId?: string;
  docUrl?: string;
}

// Fetch all Learning Notes from Google Sheet (database proxy)
export async function fetchGoogleLearningNotes(
  accessToken: string,
  spreadsheetId: string
): Promise<LearningNote[]> {
  const data = await callProxy(accessToken, 'fetchGoogleLearningNotes', { spreadsheetId });
  return data.notes || [];
}

// Create a new Learning Note (appends to Google Sheet and creates/populates a new Google Doc)
export async function addGoogleLearningNote(
  accessToken: string,
  spreadsheetId: string,
  note: Omit<LearningNote, 'row'>
): Promise<{ success: boolean; docId: string; docUrl: string; imageUrl: string }> {
  return await callProxy(accessToken, 'addGoogleLearningNote', { spreadsheetId, note });
}

// Update an existing Learning Note in Google Sheet and updates its Google Doc
export async function updateGoogleLearningNote(
  accessToken: string,
  spreadsheetId: string,
  note: LearningNote,
  oldImageUrl?: string
): Promise<{ success: boolean; imageUrl: string }> {
  return await callProxy(accessToken, 'updateGoogleLearningNote', { spreadsheetId, note, oldImageUrl });
}

// Delete a Learning Note from Google Sheet and deletes its Google Doc file
export async function deleteGoogleLearningNote(
  accessToken: string,
  spreadsheetId: string,
  noteId: string,
  docId?: string,
  imageUrl?: string
): Promise<void> {
  await callProxy(accessToken, 'deleteGoogleLearningNote', { spreadsheetId, noteId, docId, imageUrl });
}

export interface MicroLog {
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
}

export interface MacroLog {
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
}

export async function fetchGoogleMicroLogs(
  accessToken: string,
  spreadsheetId: string
): Promise<MicroLog[]> {
  const data = await callProxy(accessToken, 'fetchMicroLogs', { spreadsheetId });
  return data.logs || [];
}

export async function addGoogleMicroLog(
  accessToken: string,
  spreadsheetId: string,
  log: MicroLog
): Promise<void> {
  await callProxy(accessToken, 'addMicroLog', { spreadsheetId, log });
}

export async function deleteGoogleMicroLog(
  accessToken: string,
  spreadsheetId: string,
  logId: string
): Promise<void> {
  await callProxy(accessToken, 'deleteMicroLog', { spreadsheetId, logId });
}

export async function fetchGoogleMacroLogs(
  accessToken: string,
  spreadsheetId: string
): Promise<MacroLog[]> {
  const data = await callProxy(accessToken, 'fetchMacroLogs', { spreadsheetId });
  return data.logs || [];
}

export async function addGoogleMacroLog(
  accessToken: string,
  spreadsheetId: string,
  log: MacroLog
): Promise<void> {
  await callProxy(accessToken, 'addMacroLog', { spreadsheetId, log });
}

export async function deleteGoogleMacroLog(
  accessToken: string,
  spreadsheetId: string,
  logId: string
): Promise<void> {
  await callProxy(accessToken, 'deleteMacroLog', { spreadsheetId, logId });
}


