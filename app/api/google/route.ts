import { NextRequest, NextResponse } from 'next/server';

// Direct REST API implementations to avoid circular dependencies with client-side lib/google-api

async function driveFetch(token: string, path: string, options: RequestInit = {}) {
  const url = `https://www.googleapis.com${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive API Error (${res.status}): ${text}`);
  }

  return await res.json();
}

async function sheetsFetch(token: string, path: string, options: RequestInit = {}) {
  const url = `https://sheets.googleapis.com${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sheets API Error (${res.status}): ${text}`);
  }

  return await res.json();
}

async function docsFetch(token: string, path: string, options: RequestInit = {}) {
  const url = `https://docs.googleapis.com${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Docs API Error (${res.status}): ${text}`);
  }

  return await res.json();
}

async function getOrCreateFolderId(token: string): Promise<string> {
  try {
    const folderSearch = await driveFetch(
      token,
      `/drive/v3/files?q=name='Trading Journal Workspace (AI Studio)' and mimeType='application/vnd.google-apps.folder' and trashed=false`
    );
    let folderId = folderSearch.files?.[0]?.id;

    if (!folderId) {
      const createFolder = await driveFetch(token, '/drive/v3/files', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Trading Journal Workspace (AI Studio)',
          mimeType: 'application/vnd.google-apps.folder',
        }),
      });
      folderId = createFolder.id;
    }
    return folderId;
  } catch (err) {
    console.error('Error in getOrCreateFolderId:', err);
    throw err;
  }
}

function getDriveFileIdFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  
  // Match standard Google Drive /file/d/{id} links
  const fileDMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    return fileDMatch[1];
  }
  
  // Match id= query parameters
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) {
    return idMatch[1];
  }

  // Match /thumbnail?id= query parameter
  const thumbnailMatch = url.match(/thumbnail\?id=([a-zA-Z0-9_-]+)/);
  if (thumbnailMatch && thumbnailMatch[1]) {
    return thumbnailMatch[1];
  }
  
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }

    const body = await req.json();
    const { action, ...args } = body;

    switch (action) {
      case 'bootstrap': {
        const folderId = await getOrCreateFolderId(token);

        // Find or create "Trading Journal (AI Studio)" Spreadsheet
        const sheetsSearch = await driveFetch(
          token,
          `/drive/v3/files?q=name='Trading Journal (AI Studio)' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`
        );
        let spreadsheetId = sheetsSearch.files?.[0]?.id;

        if (!spreadsheetId) {
          const createSheet = await driveFetch(token, '/drive/v3/files', {
            method: 'POST',
            body: JSON.stringify({
              name: 'Trading Journal (AI Studio)',
              mimeType: 'application/vnd.google-apps.spreadsheet',
              parents: [folderId],
            }),
          });
          spreadsheetId = createSheet.id;
        } else {
          // Verify and move to folder if not already there
          try {
            const fileMeta = await driveFetch(token, `/drive/v3/files/${spreadsheetId}?fields=parents`);
            const parents = fileMeta.parents || [];
            if (!parents.includes(folderId)) {
              const previousParents = parents.join(',');
              await driveFetch(token, `/drive/v3/files/${spreadsheetId}?addParents=${folderId}${previousParents ? `&removeParents=${previousParents}` : ''}`, {
                method: 'PATCH'
              });
            }
          } catch (err) {
            console.error('Error moving spreadsheet to folder:', err);
          }
        }

        // Initialize headers in Sheet1 if empty
        try {
          const headersCheck = await sheetsFetch(
            token,
            `/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:K1`
          );
          if (!headersCheck.values || headersCheck.values.length === 0) {
            await sheetsFetch(
              token,
              `/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:K1?valueInputOption=USER_ENTERED`,
              {
                method: 'PUT',
                body: JSON.stringify({
                  range: 'Sheet1!A1:K1',
                  majorDimension: 'ROWS',
                  values: [[
                    'Date',
                    'Pair',
                    'Buy/Sell',
                    'Entry',
                    'SL',
                    'TP',
                    'R:R',
                    'Strategy/Setup',
                    'Win/Loss',
                    'PnL ($/R)',
                    'သင်ခန်းစာ / မှတ်ချက်'
                  ]],
                }),
              }
            );
          }
        } catch (sheetErr) {
          console.error('Failed to initialize sheets headers:', sheetErr);
        }

        // Ensure "LearningNotes" sheet tab exists for storing notes metadata
        try {
          const sheetMeta = await sheetsFetch(token, `/v4/spreadsheets/${spreadsheetId}`);
          const hasLearningNotesTab = sheetMeta.sheets?.some((s: any) => s.properties?.title === 'LearningNotes');
          
          if (!hasLearningNotesTab) {
            await sheetsFetch(token, `/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
              method: 'POST',
              body: JSON.stringify({
                requests: [{
                  addSheet: {
                    properties: {
                      title: 'LearningNotes',
                    },
                  },
                }],
              }),
            });
          }

          // Initialize LearningNotes headers if empty
          const notesHeadersCheck = await sheetsFetch(
            token,
            `/v4/spreadsheets/${spreadsheetId}/values/LearningNotes!A1:H1`
          );
          if (!notesHeadersCheck.values || notesHeadersCheck.values.length === 0) {
            await sheetsFetch(
              token,
              `/v4/spreadsheets/${spreadsheetId}/values/LearningNotes!A1:H1?valueInputOption=USER_ENTERED`,
              {
                method: 'PUT',
                body: JSON.stringify({
                  range: 'LearningNotes!A1:H1',
                  majorDimension: 'ROWS',
                  values: [[
                    'ID',
                    'Title',
                    'Content',
                    'ImageUrl',
                    'Date',
                    'Tags',
                    'DocId',
                    'DocUrl'
                  ]],
                }),
              }
            );
          }
        } catch (notesSheetErr) {
          console.error('Failed to initialize LearningNotes sheet tab:', notesSheetErr);
        }

        // Ensure "MicroLogs" and "MacroLogs" sheet tabs exist for storing analysis logs
        try {
          const sheetMeta = await sheetsFetch(token, `/v4/spreadsheets/${spreadsheetId}`);
          const hasMicroLogsTab = sheetMeta.sheets?.some((s: any) => s.properties?.title === 'MicroLogs');
          const hasMacroLogsTab = sheetMeta.sheets?.some((s: any) => s.properties?.title === 'MacroLogs');
          
          const requests: any[] = [];
          if (!hasMicroLogsTab) {
            requests.push({
              addSheet: {
                properties: {
                  title: 'MicroLogs',
                },
              },
            });
          }
          if (!hasMacroLogsTab) {
            requests.push({
              addSheet: {
                properties: {
                  title: 'MacroLogs',
                },
              },
            });
          }

          if (requests.length > 0) {
            await sheetsFetch(token, `/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
              method: 'POST',
              body: JSON.stringify({ requests }),
            });
          }

          // Initialize MicroLogs headers if empty
          const microHeadersCheck = await sheetsFetch(
            token,
            `/v4/spreadsheets/${spreadsheetId}/values/MicroLogs!A1:L1`
          );
          if (!microHeadersCheck.values || microHeadersCheck.values.length === 0) {
            await sheetsFetch(
              token,
              `/v4/spreadsheets/${spreadsheetId}/values/MicroLogs!A1:L1?valueInputOption=USER_ENTERED`,
              {
                method: 'PUT',
                body: JSON.stringify({
                  range: 'MicroLogs!A1:L1',
                  majorDimension: 'ROWS',
                  values: [[
                    'ID',
                    'Date',
                    'Asset',
                    'SetupType',
                    'Score',
                    'StructureAligned',
                    'LiquiditySwept',
                    'FvgTested',
                    'BlockRefined',
                    'VolumeConfirmed',
                    'EntryNotes',
                    'PnlR'
                  ]],
                }),
              }
            );
          }

          // Initialize MacroLogs headers if empty
          const macroHeadersCheck = await sheetsFetch(
            token,
            `/v4/spreadsheets/${spreadsheetId}/values/MacroLogs!A1:K1`
          );
          if (!macroHeadersCheck.values || macroHeadersCheck.values.length === 0) {
            await sheetsFetch(
              token,
              `/v4/spreadsheets/${spreadsheetId}/values/MacroLogs!A1:K1?valueInputOption=USER_ENTERED`,
              {
                method: 'PUT',
                body: JSON.stringify({
                  range: 'MacroLogs!A1:K1',
                  majorDimension: 'ROWS',
                  values: [[
                    'ID',
                    'Date',
                    'WeeklyBias',
                    'FundamentalSentiment',
                    'CorrelationNotes',
                    'KeyDemandSupply',
                    'M1_Bias',
                    'W1_Bias',
                    'D1_Bias',
                    'H4_Bias',
                    'H1_Bias'
                  ]],
                }),
              }
            );
          }
        } catch (logsSheetErr) {
          console.error('Failed to initialize MicroLogs/MacroLogs sheet tabs:', logsSheetErr);
        }

        // Find or create "Trading Notes (AI Studio)" Document
        const docsSearch = await driveFetch(
          token,
          `/drive/v3/files?q=name='Trading Notes (AI Studio)' and mimeType='application/vnd.google-apps.document' and trashed=false`
        );
        let documentId = docsSearch.files?.[0]?.id;

        if (!documentId) {
          const createDoc = await driveFetch(token, '/drive/v3/files', {
            method: 'POST',
            body: JSON.stringify({
              name: 'Trading Notes (AI Studio)',
              mimeType: 'application/vnd.google-apps.document',
              parents: [folderId],
            }),
          });
          documentId = createDoc.id;
        } else {
          // Verify and move to folder if not already there
          try {
            const fileMeta = await driveFetch(token, `/drive/v3/files/${documentId}?fields=parents`);
            const parents = fileMeta.parents || [];
            if (!parents.includes(folderId)) {
              const previousParents = parents.join(',');
              await driveFetch(token, `/drive/v3/files/${documentId}?addParents=${folderId}${previousParents ? `&removeParents=${previousParents}` : ''}`, {
                method: 'PATCH'
              });
            }
          } catch (err) {
            console.error('Error moving document to folder:', err);
          }
        }

        return NextResponse.json({ spreadsheetId, documentId });
      }

      case 'listDocs': {
        const docsList = await driveFetch(
          token,
          `/drive/v3/files?q=mimeType='application/vnd.google-apps.document' and name contains 'Trading' and trashed=false&orderBy=name`
        );
        return NextResponse.json({ files: docsList.files || [] });
      }

      case 'createDoc': {
        const { title } = args;
        const name = title ? `Trading Notes - ${title}` : 'Trading Notes - Untitled';
        const createDoc = await driveFetch(token, '/drive/v3/files', {
          method: 'POST',
          body: JSON.stringify({
            name,
            mimeType: 'application/vnd.google-apps.document',
          }),
        });
        return NextResponse.json({ documentId: createDoc.id, name });
      }

      case 'fetchTrades': {
        const { spreadsheetId } = args;
        if (!spreadsheetId) {
          return NextResponse.json({ error: 'Missing spreadsheetId' }, { status: 400 });
        }

        const data = await sheetsFetch(
          token,
          `/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A2:K2000`
        );

        const trades = (data.values || []).map((row: any[], index: number) => {
          const rowIndex = index + 2; // Rows start at 2 (Row 1 is header)
          return {
            row: rowIndex,
            id: `trade-${rowIndex}`,
            date: row[0] || '',
            pair: row[1] || '',
            type: row[2] || 'Buy',
            entryPrice: parseFloat(row[3]) || 0,
            sl: parseFloat(row[4]) || 0,
            tp: parseFloat(row[5]) || 0,
            rr: row[6] || '',
            strategy: row[7] || '',
            winLoss: row[8] || 'Pending',
            pnl: row[9] || '',
            notes: row[10] || '',
          };
        });

        return NextResponse.json({ trades });
      }

      case 'addTrade': {
        const { spreadsheetId, trade } = args;
        if (!spreadsheetId || !trade) {
          return NextResponse.json({ error: 'Missing spreadsheetId or trade' }, { status: 400 });
        }

        await sheetsFetch(
          token,
          `/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A2:K2:append?valueInputOption=USER_ENTERED`,
          {
            method: 'POST',
            body: JSON.stringify({
              range: 'Sheet1!A2:K2',
              majorDimension: 'ROWS',
              values: [[
                trade.date,
                trade.pair,
                trade.type,
                trade.entryPrice,
                trade.sl,
                trade.tp,
                trade.rr,
                trade.strategy,
                trade.winLoss,
                trade.pnl,
                trade.notes
              ]],
            }),
          }
        );

        return NextResponse.json({ success: true });
      }

      case 'updateTrade': {
        const { spreadsheetId, trade } = args;
        if (!spreadsheetId || !trade || !trade.row) {
          return NextResponse.json({ error: 'Missing spreadsheetId, trade, or row index' }, { status: 400 });
        }

        await sheetsFetch(
          token,
          `/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A${trade.row}:K${trade.row}?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            body: JSON.stringify({
              range: `Sheet1!A${trade.row}:K${trade.row}`,
              majorDimension: 'ROWS',
              values: [[
                trade.date,
                trade.pair,
                trade.type,
                trade.entryPrice,
                trade.sl,
                trade.tp,
                trade.rr,
                trade.strategy,
                trade.winLoss,
                trade.pnl,
                trade.notes
              ]],
            }),
          }
        );

        return NextResponse.json({ success: true });
      }

      case 'deleteTrade': {
        const { spreadsheetId, rowIndex } = args;
        if (!spreadsheetId || rowIndex === undefined) {
          return NextResponse.json({ error: 'Missing spreadsheetId or rowIndex' }, { status: 400 });
        }

        // To keep layout beautiful, clear the row contents instead of hard deleting (which requires specific sheet metadata lookup)
        await sheetsFetch(
          token,
          `/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A${rowIndex}:K${rowIndex}?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            body: JSON.stringify({
              range: `Sheet1!A${rowIndex}:K${rowIndex}`,
              majorDimension: 'ROWS',
              values: [['', '', '', '', '', '', '', '', '', '', '']],
            }),
          }
        );

        return NextResponse.json({ success: true });
      }

      case 'fetchDoc': {
        const { documentId } = args;
        if (!documentId) {
          return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
        }

        const docData = await docsFetch(token, `/v1/documents/${documentId}`);
        
        // Extract plain text from Google Doc structure
        let text = '';
        if (docData.body && docData.body.content) {
          for (const element of docData.body.content) {
            if (element.paragraph && element.paragraph.elements) {
              for (const part of element.paragraph.elements) {
                if (part.textRun && part.textRun.content) {
                  text += part.textRun.content;
                }
              }
            }
          }
        }

        return NextResponse.json({ text, length: text.length });
      }

      case 'saveDoc': {
        const { documentId, content } = args;
        if (!documentId) {
          return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
        }

        // Fetch current document metadata to get end index for delete range
        const currentDoc = await docsFetch(token, `/v1/documents/${documentId}`);
        let docLength = 1;
        if (currentDoc.body && currentDoc.body.content) {
          const lastElement = currentDoc.body.content[currentDoc.body.content.length - 1];
          if (lastElement && lastElement.endIndex) {
            docLength = lastElement.endIndex;
          }
        }

        const requests: any[] = [];
        // Delete existing content if present
        if (docLength > 2) {
          requests.push({
            deleteContentRange: {
              range: {
                startIndex: 1,
                endIndex: docLength - 1,
              },
            },
          });
        }

        // Insert new content
        requests.push({
          insertText: {
            location: {
              index: 1,
            },
            text: content || '\n',
          },
        });

        await docsFetch(token, `/v1/documents/${documentId}:batchUpdate`, {
          method: 'POST',
          body: JSON.stringify({ requests }),
        });

        return NextResponse.json({ success: true });
      }

      case 'fetchKeepNotes': {
        const keepRes = await fetch('https://keep.googleapis.com/v1/notes', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!keepRes.ok) {
          let errMsg = 'Google Keep API request failed.';
          if (keepRes.status === 403 || keepRes.status === 401) {
            errMsg = 'Google Keep API is restricted to Workspace enterprise domains/accounts. Local Notes can be used without any restrictions.';
          } else {
            try {
              const errText = await keepRes.text();
              errMsg = (errText.includes('<html>') || errText.includes('<html')) ? `Google Keep error status ${keepRes.status}` : errText;
            } catch (e) {}
          }
          return NextResponse.json({ error: errMsg, status: keepRes.status }, { status: keepRes.status });
        }

        const data = await keepRes.json();
        return NextResponse.json(data);
      }

      case 'createKeepNote': {
        const { note } = args;
        const keepRes = await fetch('https://keep.googleapis.com/v1/notes', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(note),
        });

        if (!keepRes.ok) {
          let errMsg = 'Google Keep API request failed.';
          if (keepRes.status === 403 || keepRes.status === 401) {
            errMsg = 'Google Keep API is restricted to Workspace enterprise domains/accounts. Local Notes can be used without any restrictions.';
          } else {
            try {
              const errText = await keepRes.text();
              errMsg = (errText.includes('<html>') || errText.includes('<html')) ? `Google Keep error status ${keepRes.status}` : errText;
            } catch (e) {}
          }
          return NextResponse.json({ error: errMsg, status: keepRes.status }, { status: keepRes.status });
        }

        const data = await keepRes.json();
        return NextResponse.json(data);
      }

      case 'fetchGoogleLearningNotes': {
        const { spreadsheetId } = args;
        if (!spreadsheetId) {
          return NextResponse.json({ error: 'Missing spreadsheetId' }, { status: 400 });
        }

        try {
          const data = await sheetsFetch(
            token,
            `/v4/spreadsheets/${spreadsheetId}/values/LearningNotes!A2:H2000`
          );

          const notes = (data.values || []).map((row: any[], index: number) => {
            const rowIndex = index + 2; // header is row 1
            return {
              row: rowIndex,
              id: row[0] || '',
              title: row[1] || '',
              content: row[2] || '',
              imageUrl: row[3] || '',
              createdAt: row[4] || '',
              userId: '',
              userEmail: '',
              tags: row[5] ? row[5].split(',') : [],
              docId: row[6] || '',
              docUrl: row[7] || '',
            };
          }).filter((note: any) => note.id !== '');

          return NextResponse.json({ notes });
        } catch (err: any) {
          console.error('Error fetching google learning notes:', err);
          return NextResponse.json({ notes: [] });
        }
      }

      case 'addGoogleLearningNote': {
        const { spreadsheetId, note } = args;
        if (!spreadsheetId || !note) {
          return NextResponse.json({ error: 'Missing spreadsheetId or note' }, { status: 400 });
        }

        let folderId: string | undefined = undefined;
        try {
          folderId = await getOrCreateFolderId(token);
        } catch (fErr) {
          console.error('Failed to get or create folder workspace:', fErr);
        }

        let driveImageUrl = '';
        if (note.imageUrl && note.imageUrl.startsWith('data:image')) {
          try {
            const base64Data = note.imageUrl.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            const mimeType = note.imageUrl.match(/data:(image\/\w+);base64/)?.[1] || 'image/png';

            const metadataRes = await driveFetch(token, '/drive/v3/files', {
              method: 'POST',
              body: JSON.stringify({
                name: `iTrading Note Attachment - ${note.title || 'Untitled'} - ${Date.now()}`,
                mimeType,
                parents: folderId ? [folderId] : undefined,
              }),
            });
            const fileId = metadataRes.id;

            const uploadRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': mimeType,
              },
              body: buffer,
            });

            if (uploadRes.ok) {
              // Share the file publicly so anyone with the link can view it (required for rendering in standard browser image tags)
              try {
                await driveFetch(token, `/drive/v3/files/${fileId}/permissions`, {
                  method: 'POST',
                  body: JSON.stringify({
                    role: 'reader',
                    type: 'anyone',
                  }),
                });
              } catch (permErr) {
                console.error('Error sharing image file publicly:', permErr);
              }

              const fileMeta = await driveFetch(token, `/drive/v3/files/${fileId}?fields=webViewLink,webContentLink`);
              driveImageUrl = fileMeta.webViewLink || fileMeta.webContentLink || '';
            }
          } catch (err) {
            console.error('Error uploading image file to Drive:', err);
          }
        }

        let docId = '';
        let docUrl = '';
        try {
          const createDoc = await driveFetch(token, '/drive/v3/files', {
            method: 'POST',
            body: JSON.stringify({
              name: `iTrading Note - ${note.title || 'Untitled'} (${note.createdAt || ''})`,
              mimeType: 'application/vnd.google-apps.document',
              parents: folderId ? [folderId] : undefined,
            }),
          });
          docId = createDoc.id;
          docUrl = `https://docs.google.com/documents/d/${docId}/edit`;

          const requests = [
            {
              insertText: {
                location: { index: 1 },
                text: `iTrading Learning Note\n\nTitle: ${note.title}\nDate: ${note.createdAt}\nTags: ${(note.tags || []).join(', ')}\n\nContent:\n${note.content}\n${driveImageUrl ? `\nImage Attachment Link:\n${driveImageUrl}\n` : ''}`
              }
            }
          ];

          await docsFetch(token, `/v1/documents/${docId}:batchUpdate`, {
            method: 'POST',
            body: JSON.stringify({ requests }),
          });
        } catch (docErr) {
          console.error('Error creating Google Doc:', docErr);
        }

        await sheetsFetch(token, `/v4/spreadsheets/${spreadsheetId}/values/LearningNotes!A2:H2:append?valueInputOption=USER_ENTERED`, {
          method: 'POST',
          body: JSON.stringify({
            range: 'LearningNotes!A2:H2',
            majorDimension: 'ROWS',
            values: [[
              note.id,
              note.title,
              note.content,
              driveImageUrl || note.imageUrl || '',
              note.createdAt,
              (note.tags || []).join(','),
              docId,
              docUrl
            ]],
          }),
        });

        return NextResponse.json({ success: true, docId, docUrl, imageUrl: driveImageUrl || note.imageUrl });
      }

      case 'updateGoogleLearningNote': {
        const { spreadsheetId, note, oldImageUrl } = args;
        if (!spreadsheetId || !note) {
          return NextResponse.json({ error: 'Missing spreadsheetId or note' }, { status: 400 });
        }

        let folderId: string | undefined = undefined;
        try {
          folderId = await getOrCreateFolderId(token);
        } catch (fErr) {
          console.error('Failed to get or create folder workspace:', fErr);
        }

        const currentSheetData = await sheetsFetch(token, `/v4/spreadsheets/${spreadsheetId}/values/LearningNotes!A2:A2000`);
        const ids = (currentSheetData.values || []).map((r: any[]) => r[0]);
        const relativeIndex = ids.indexOf(note.id);
        if (relativeIndex === -1) {
          return NextResponse.json({ error: 'Learning note row not found' }, { status: 404 });
        }
        const rowIndex = relativeIndex + 2;

        let driveImageUrl = note.imageUrl || '';
        if (note.imageUrl && note.imageUrl.startsWith('data:image')) {
          try {
            const base64Data = note.imageUrl.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            const mimeType = note.imageUrl.match(/data:(image\/\w+);base64/)?.[1] || 'image/png';

            const metadataRes = await driveFetch(token, '/drive/v3/files', {
              method: 'POST',
              body: JSON.stringify({
                name: `iTrading Note Attachment - ${note.title || 'Untitled'} - ${Date.now()}`,
                mimeType,
                parents: folderId ? [folderId] : undefined,
              }),
            });
            const fileId = metadataRes.id;

            const uploadRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': mimeType,
              },
              body: buffer,
            });

            if (uploadRes.ok) {
              // Share the file publicly so anyone with the link can view it (required for rendering in standard browser image tags)
              try {
                await driveFetch(token, `/drive/v3/files/${fileId}/permissions`, {
                  method: 'POST',
                  body: JSON.stringify({
                    role: 'reader',
                    type: 'anyone',
                  }),
                });
              } catch (permErr) {
                console.error('Error sharing image file publicly:', permErr);
              }

              const fileMeta = await driveFetch(token, `/drive/v3/files/${fileId}?fields=webViewLink,webContentLink`);
              driveImageUrl = fileMeta.webViewLink || fileMeta.webContentLink || '';

              // Delete old image since we replaced it with a new one
              if (oldImageUrl) {
                const oldFileId = getDriveFileIdFromUrl(oldImageUrl);
                if (oldFileId) {
                  try {
                    await driveFetch(token, `/drive/v3/files/${oldFileId}`, {
                      method: 'DELETE',
                    });
                  } catch (err) {
                    console.error('Error deleting old image file during replacement:', err);
                  }
                }
              }
            }
          } catch (err) {
            console.error('Error uploading updated image:', err);
          }
        }

        // If image was completely removed/cleared but no new image was uploaded
        if (oldImageUrl && !note.imageUrl) {
          const oldFileId = getDriveFileIdFromUrl(oldImageUrl);
          if (oldFileId) {
            try {
              await driveFetch(token, `/drive/v3/files/${oldFileId}`, {
                method: 'DELETE',
              });
            } catch (err) {
              console.error('Error deleting old image file during clear:', err);
            }
          }
        }

        if (note.docId) {
          try {
            const currentDoc = await docsFetch(token, `/v1/documents/${note.docId}`);
            let docLength = 1;
            if (currentDoc.body && currentDoc.body.content) {
              const lastElement = currentDoc.body.content[currentDoc.body.content.length - 1];
              if (lastElement && lastElement.endIndex) {
                docLength = lastElement.endIndex;
              }
            }

            const requests: any[] = [];
            if (docLength > 2) {
              requests.push({
                deleteContentRange: {
                  range: {
                    startIndex: 1,
                    endIndex: docLength - 1,
                  },
                },
              });
            }

            requests.push({
              insertText: {
                location: { index: 1 },
                text: `iTrading Learning Note\n\nTitle: ${note.title}\nDate: ${note.createdAt}\nTags: ${(note.tags || []).join(', ')}\n\nContent:\n${note.content}\n${driveImageUrl ? `\nImage Attachment Link:\n${driveImageUrl}\n` : ''}`
              }
            });

            await docsFetch(token, `/v1/documents/${note.docId}:batchUpdate`, {
              method: 'POST',
              body: JSON.stringify({ requests }),
            });
          } catch (docErr) {
            console.error('Error updating Google Doc content:', docErr);
          }
        }

        await sheetsFetch(token, `/v4/spreadsheets/${spreadsheetId}/values/LearningNotes!A${rowIndex}:H${rowIndex}?valueInputOption=USER_ENTERED`, {
          method: 'PUT',
          body: JSON.stringify({
            range: `LearningNotes!A${rowIndex}:H${rowIndex}`,
            majorDimension: 'ROWS',
            values: [[
              note.id,
              note.title,
              note.content,
              driveImageUrl,
              note.createdAt,
              (note.tags || []).join(','),
              note.docId || '',
              note.docUrl || ''
            ]],
          }),
        });

        return NextResponse.json({ success: true, imageUrl: driveImageUrl });
      }

      case 'deleteGoogleLearningNote': {
        const { spreadsheetId, noteId, docId, imageUrl } = args;
        if (!spreadsheetId || !noteId) {
          return NextResponse.json({ error: 'Missing spreadsheetId or noteId' }, { status: 400 });
        }

        const currentSheetData = await sheetsFetch(token, `/v4/spreadsheets/${spreadsheetId}/values/LearningNotes!A2:A2000`);
        const ids = (currentSheetData.values || []).map((r: any[]) => r[0]);
        const relativeIndex = ids.indexOf(noteId);
        if (relativeIndex > -1) {
          const rowIndex = relativeIndex + 2;
          await sheetsFetch(token, `/v4/spreadsheets/${spreadsheetId}/values/LearningNotes!A${rowIndex}:H${rowIndex}?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            body: JSON.stringify({
              range: `LearningNotes!A${rowIndex}:H${rowIndex}`,
              majorDimension: 'ROWS',
              values: [['', '', '', '', '', '', '', '']],
            }),
          });
        }

        if (docId) {
          try {
            await driveFetch(token, `/drive/v3/files/${docId}`, {
              method: 'DELETE',
            });
          } catch (err) {
            console.error('Error deleting doc file during note delete:', err);
          }
        }

        if (imageUrl) {
          const imgFileId = getDriveFileIdFromUrl(imageUrl);
          if (imgFileId) {
            try {
              await driveFetch(token, `/drive/v3/files/${imgFileId}`, {
                method: 'DELETE',
              });
            } catch (err) {
              console.error('Error deleting image file during note delete:', err);
            }
          }
        }

        return NextResponse.json({ success: true });
      }

      case 'fetchMicroLogs': {
        const { spreadsheetId } = args;
        if (!spreadsheetId) {
          return NextResponse.json({ error: 'Missing spreadsheetId' }, { status: 400 });
        }
        try {
          const data = await sheetsFetch(
            token,
            `/v4/spreadsheets/${spreadsheetId}/values/MicroLogs!A2:L2000`
          );
          const logs = (data.values || []).map((row: any[]) => {
            return {
              id: row[0] || '',
              date: row[1] || '',
              asset: row[2] || '',
              setupType: row[3] || '',
              score: parseInt(row[4], 10) || 0,
              ltfChecklist: {
                structureAligned: row[5] === 'TRUE',
                liquiditySwept: row[6] === 'TRUE',
                fvgTested: row[7] === 'TRUE',
                blockRefined: row[8] === 'TRUE',
                volumeConfirmed: row[9] === 'TRUE',
              },
              entryNotes: row[10] || '',
              pnlR: parseFloat(row[11]) || 0,
            };
          }).filter((log: any) => log.id !== '');
          return NextResponse.json({ logs });
        } catch (err) {
          console.error('Error fetching google micro logs:', err);
          return NextResponse.json({ logs: [] });
        }
      }

      case 'addMicroLog': {
        const { spreadsheetId, log } = args;
        if (!spreadsheetId || !log) {
          return NextResponse.json({ error: 'Missing spreadsheetId or log' }, { status: 400 });
        }
        await sheetsFetch(
          token,
          `/v4/spreadsheets/${spreadsheetId}/values/MicroLogs!A2:L2:append?valueInputOption=USER_ENTERED`,
          {
            method: 'POST',
            body: JSON.stringify({
              range: 'MicroLogs!A2:L2',
              majorDimension: 'ROWS',
              values: [[
                log.id,
                log.date,
                log.asset,
                log.setupType,
                log.score,
                log.ltfChecklist.structureAligned,
                log.ltfChecklist.liquiditySwept,
                log.ltfChecklist.fvgTested,
                log.ltfChecklist.blockRefined,
                log.ltfChecklist.volumeConfirmed,
                log.entryNotes,
                log.pnlR
              ]],
            }),
          }
        );
        return NextResponse.json({ success: true });
      }

      case 'deleteMicroLog': {
        const { spreadsheetId, logId } = args;
        if (!spreadsheetId || !logId) {
          return NextResponse.json({ error: 'Missing spreadsheetId or logId' }, { status: 400 });
        }
        const currentSheetData = await sheetsFetch(token, `/v4/spreadsheets/${spreadsheetId}/values/MicroLogs!A2:A2000`);
        const ids = (currentSheetData.values || []).map((r: any[]) => r[0]);
        const relativeIndex = ids.indexOf(logId);
        if (relativeIndex > -1) {
          const rowIndex = relativeIndex + 2;
          await sheetsFetch(token, `/v4/spreadsheets/${spreadsheetId}/values/MicroLogs!A${rowIndex}:L${rowIndex}?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            body: JSON.stringify({
              range: `MicroLogs!A${rowIndex}:L${rowIndex}`,
              majorDimension: 'ROWS',
              values: [['', '', '', '', '', '', '', '', '', '', '', '']],
            }),
          });
        }
        return NextResponse.json({ success: true });
      }

      case 'fetchMacroLogs': {
        const { spreadsheetId } = args;
        if (!spreadsheetId) {
          return NextResponse.json({ error: 'Missing spreadsheetId' }, { status: 400 });
        }
        try {
          const data = await sheetsFetch(
            token,
            `/v4/spreadsheets/${spreadsheetId}/values/MacroLogs!A2:K2000`
          );
          const logs = (data.values || []).map((row: any[]) => {
            return {
              id: row[0] || '',
              date: row[1] || '',
              weeklyBias: row[2] || 'Ranging',
              fundamentalSentiment: row[3] || '',
              correlationNotes: row[4] || '',
              keyDemandSupply: row[5] || '',
              timeframeMatrix: {
                m1: row[6] || 'Ranging',
                w1: row[7] || 'Ranging',
                d1: row[8] || 'Ranging',
                h4: row[9] || 'Ranging',
                h1: row[10] || 'Ranging',
              },
            };
          }).filter((log: any) => log.id !== '');
          return NextResponse.json({ logs });
        } catch (err) {
          console.error('Error fetching google macro logs:', err);
          return NextResponse.json({ logs: [] });
        }
      }

      case 'addMacroLog': {
        const { spreadsheetId, log } = args;
        if (!spreadsheetId || !log) {
          return NextResponse.json({ error: 'Missing spreadsheetId or log' }, { status: 400 });
        }
        await sheetsFetch(
          token,
          `/v4/spreadsheets/${spreadsheetId}/values/MacroLogs!A2:K2:append?valueInputOption=USER_ENTERED`,
          {
            method: 'POST',
            body: JSON.stringify({
              range: 'MacroLogs!A2:K2',
              majorDimension: 'ROWS',
              values: [[
                log.id,
                log.date,
                log.weeklyBias,
                log.fundamentalSentiment,
                log.correlationNotes,
                log.keyDemandSupply,
                log.timeframeMatrix.m1,
                log.timeframeMatrix.w1,
                log.timeframeMatrix.d1,
                log.timeframeMatrix.h4,
                log.timeframeMatrix.h1
              ]],
            }),
          }
        );
        return NextResponse.json({ success: true });
      }

      case 'deleteMacroLog': {
        const { spreadsheetId, logId } = args;
        if (!spreadsheetId || !logId) {
          return NextResponse.json({ error: 'Missing spreadsheetId or logId' }, { status: 400 });
        }
        const currentSheetData = await sheetsFetch(token, `/v4/spreadsheets/${spreadsheetId}/values/MacroLogs!A2:A2000`);
        const ids = (currentSheetData.values || []).map((r: any[]) => r[0]);
        const relativeIndex = ids.indexOf(logId);
        if (relativeIndex > -1) {
          const rowIndex = relativeIndex + 2;
          await sheetsFetch(token, `/v4/spreadsheets/${spreadsheetId}/values/MacroLogs!A${rowIndex}:K${rowIndex}?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            body: JSON.stringify({
              range: `MacroLogs!A${rowIndex}:K${rowIndex}`,
              majorDimension: 'ROWS',
              values: [['', '', '', '', '', '', '', '', '', '', '']],
            }),
          });
        }
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Google Proxy Error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred on the server proxy' },
      { status: 500 }
    );
  }
}
