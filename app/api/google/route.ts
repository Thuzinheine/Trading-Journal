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
            }),
          });
          spreadsheetId = createSheet.id;
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
            }),
          });
          documentId = createDoc.id;
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
        const { spreadsheetId, note } = args;
        if (!spreadsheetId || !note) {
          return NextResponse.json({ error: 'Missing spreadsheetId or note' }, { status: 400 });
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
            console.error('Error uploading updated image:', err);
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
        const { spreadsheetId, noteId, docId } = args;
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
