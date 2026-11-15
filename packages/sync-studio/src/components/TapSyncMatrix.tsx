import React, { useState, useEffect, useRef } from 'react';
import {
  formatTimestampTTML,
  type TTMLLine,
  type TTMLSyllable,
  type TTMLMetadata,
} from '@brus-lyrics/shared-types';
import { runAiAutoSync } from '../lib/ai-auto-sync.js';
import {
  parseMultiFormatLyrics,
  detectLyricsFormat,
  type LyricsFormat,
  type SyncMode,
} from '../lib/multi-format-lyrics.js';

interface TapSyncMatrixProps {
  lines: TTMLLine[];
  onChangeLines: (lines: TTMLLine[]) => void;
  currentTimeMs: number;
  durationMs: number;
  onSeek: (ms: number) => void;
  onChangeMetadata?: (meta: Partial<TTMLMetadata>, newLines?: TTMLLine[], rawXml?: string) => void;
}

export const TapSyncMatrix: React.FC<TapSyncMatrixProps> = ({
  lines,
  onChangeLines,
  currentTimeMs,
  durationMs,
  onSeek,
  onChangeMetadata,
}) => {
  const [mode, setMode] = useState<'sync' | 'upload' | 'raw'>('sync');
  const [syncFidelity, setSyncFidelity] = useState<SyncMode>('syllable');
  const [rawText, setRawText] = useState<string>(
    'Compa que le parece esa morra\nLa que anda bailando sola\nMe gusta pa mi'
  );
  const [uploadContent, setUploadContent] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<LyricsFormat>('text');
  const [uploadStatus, setUploadStatus] = useState<string>('');

  const [selectedLineIdx, setSelectedLineIdx] = useState<number>(0);
  const [selectedSylIdx, setSelectedSylIdx] = useState<number>(0);
  const [isAiSyncing, setIsAiSyncing] = useState<boolean>(false);
  const spacePressTimeRef = useRef<number | null>(null);
  const matrixContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Perform AI forced-alignment on lyrics
  const handleAiAutoSync = async () => {
    setIsAiSyncing(true);
    try {
      let sourceText = rawText;
      if (lines.length > 0 && mode === 'sync') {
        sourceText = lines.map((l) => l.text).join('\n');
      }
      const aligned = await runAiAutoSync(sourceText, { durationMs: durationMs || 180000 });
      if (aligned.length > 0) {
        onChangeLines(aligned);
        setSelectedLineIdx(0);
        setSelectedSylIdx(0);
        setMode('sync');
      }
    } finally {
      setIsAiSyncing(false);
    }
  };

  // Tokenize plain lyrics into structured lines and syllables
  const handleTokenize = () => {
    let rawLines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    const wasSingleBlock = rawLines.length === 1;

    // When one block of lyrics is provided, make it line by line
    if (wasSingleBlock && rawLines[0]!.length > 40) {
      // 1. Break by sentence punctuation (. ! ?)
      let split = rawLines[0]!
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      // 2. Fallback to clause boundaries (commas, semicolons, dashes, closing parens)
      if (split.length <= 1) {
        split = rawLines[0]!
          .split(/(?<=[,;])\s+(?=[A-Z\u00C0-\u017F0-9])|(?<=\))\s+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      }

      // 3. Fallback for unpunctuated single-block stream: chunk into lines of 6-8 words
      if (split.length <= 1) {
        const allWords = rawLines[0]!.split(/\s+/);
        if (allWords.length > 8) {
          split = [];
          const chunkSize = 7;
          for (let i = 0; i < allWords.length; i += chunkSize) {
            split.push(allWords.slice(i, i + chunkSize).join(' '));
          }
        }
      }

      if (split.length > 1) {
        rawLines = split;
      }
    }

    if (wasSingleBlock) {
      setSyncFidelity('line');
    }

    const newLines: TTMLLine[] = rawLines.map((lineStr, lineIdx) => {
      let leadText = lineStr.trim();
      let bgVocals: TTMLLine[] | undefined;

      // Extract simultaneous second version from parentheses e.g. "Se pone su panty (otra más)"
      const parenMatch = leadText.match(/\(([^)]+)\)$/);
      if (parenMatch && parenMatch[1]) {
        const bgText = parenMatch[1].trim();
        leadText = leadText.replace(/\s*\([^)]+\)$/, '').trim();
        const bgWords = bgText.split(/\s+/).filter(Boolean);
        const bgSyllables: TTMLSyllable[] = bgWords.map((w, wIdx) => ({
          begin: 0,
          end: 0,
          text: wIdx < bgWords.length - 1 ? `${w} ` : w,
          role: 'x-bg',
        }));
        bgVocals = [
          {
            id: `line_${lineIdx + 1}_bg`,
            begin: 0,
            end: 0,
            agent: 'v2',
            role: 'x-bg',
            text: bgText,
            syllables: bgSyllables,
          },
        ];
      }

      const words = leadText.split(/\s+/).filter(Boolean);
      const syllables: TTMLSyllable[] = words.map((w, wIdx) => ({
        begin: 0,
        end: 0,
        text: wIdx < words.length - 1 ? `${w} ` : w,
      }));

      return {
        id: `line_${lineIdx + 1}`,
        begin: 0,
        end: 0,
        agent: 'v1',
        text: leadText,
        ...(bgVocals ? { backgroundVocals: bgVocals } : {}),
        syllables,
      };
    });

    onChangeLines(newLines);
    setSelectedLineIdx(0);
    setSelectedSylIdx(0);
    setMode('sync');
  };

  // Update text of simultaneous second version (subtext / background vocal)
  const updateBgLineText = (lineIdx: number, bgIdx: number, newText: string) => {
    if (!lines[lineIdx] || !lines[lineIdx]!.backgroundVocals?.[bgIdx]) return;
    const currentLine = lines[lineIdx]!;
    const currentBg = currentLine.backgroundVocals![bgIdx]!;
    const words = newText.trim().split(/\s+/).filter(Boolean);
    const bgSyllables: TTMLSyllable[] = words.map((w, wIdx) => ({
      begin: currentBg.begin,
      end: currentBg.end,
      text: wIdx < words.length - 1 ? `${w} ` : w,
      role: 'x-bg',
    }));

    const updatedBg = [...currentLine.backgroundVocals!];
    updatedBg[bgIdx] = {
      ...currentBg,
      text: newText,
      syllables: bgSyllables.length > 0 ? bgSyllables : [{ begin: currentBg.begin, end: currentBg.end, text: newText, role: 'x-bg' }],
    };

    const updatedLines = [...lines];
    updatedLines[lineIdx] = {
      ...currentLine,
      backgroundVocals: updatedBg,
    };
    onChangeLines(updatedLines);
  };

  // Add simultaneous second version (subtext / background vocal) to current line
  const addSimultaneousSubtextToLine = (lineIdx: number) => {
    if (!lines[lineIdx]) return;
    const currentLine = lines[lineIdx]!;
    const updatedLines = [...lines];
    const existingBg = currentLine.backgroundVocals || [];
    const newBgLine: TTMLLine = {
      id: `${currentLine.id || `line_${lineIdx + 1}`}_bg_${Date.now()}`,
      begin: currentLine.begin,
      end: currentLine.end,
      agent: 'v2',
      role: 'x-bg',
      text: 'Simultaneous Vocal',
      syllables: [
        {
          begin: currentLine.begin,
          end: currentLine.end,
          text: 'Simultaneous Vocal',
          role: 'x-bg',
        },
      ],
    };
    updatedLines[lineIdx] = {
      ...currentLine,
      backgroundVocals: [...existingBg, newBgLine],
    };
    onChangeLines(updatedLines);
  };

  // Remove simultaneous second version from line
  const removeSimultaneousSubtext = (lineIdx: number, bgIdx: number) => {
    if (!lines[lineIdx]) return;
    const currentLine = lines[lineIdx]!;
    if (!currentLine.backgroundVocals) return;
    const updatedBg = currentLine.backgroundVocals.filter((_, idx) => idx !== bgIdx);
    const updatedLines = [...lines];
    updatedLines[lineIdx] = {
      ...currentLine,
      backgroundVocals: updatedBg.length > 0 ? updatedBg : undefined,
    };
    onChangeLines(updatedLines);
  };

  // Nudge timestamps by +/- offset in milliseconds
  const nudgeCurrentSyllable = (deltaMs: number) => {
    if (!lines[selectedLineIdx]) return;
    const currentLine = lines[selectedLineIdx]!;
    const currentSyl = currentLine.syllables[selectedSylIdx];
    if (!currentSyl) return;

    const newBegin = Math.max(0, currentSyl.begin + deltaMs);
    const newEnd = Math.max(newBegin + 50, currentSyl.end + deltaMs);

    const updatedSyllables = [...currentLine.syllables];
    updatedSyllables[selectedSylIdx] = {
      ...currentSyl,
      begin: newBegin,
      end: newEnd,
    };

    // Recompute line begin & end
    const lineBegin = updatedSyllables[0]?.begin ?? 0;
    const lineEnd = updatedSyllables[updatedSyllables.length - 1]?.end ?? 0;

    const updatedLines = [...lines];
    updatedLines[selectedLineIdx] = {
      ...currentLine,
      begin: lineBegin,
      end: lineEnd,
      syllables: updatedSyllables,
    };

    onChangeLines(updatedLines);
  };

  // Toggle vocal agent (v1 <-> v2)
  const toggleCurrentLineAgent = () => {
    if (!lines[selectedLineIdx]) return;
    const currentLine = lines[selectedLineIdx]!;
    const nextAgent = currentLine.agent === 'v1' ? 'v2' : 'v1';

    const updatedLines = [...lines];
    updatedLines[selectedLineIdx] = {
      ...currentLine,
      agent: nextAgent,
    };
    onChangeLines(updatedLines);
  };

  // Toggle role x-bg (ad-lib) on current syllable
  const toggleCurrentSyllableRole = () => {
    if (!lines[selectedLineIdx]) return;
    const currentLine = lines[selectedLineIdx]!;
    const currentSyl = currentLine.syllables[selectedSylIdx];
    if (!currentSyl) return;

    const nextRole = currentSyl.role === 'x-bg' ? undefined : 'x-bg';
    const updatedSyllables = [...currentLine.syllables];
    updatedSyllables[selectedSylIdx] = {
      ...currentSyl,
      role: nextRole,
    };

    const updatedLines = [...lines];
    updatedLines[selectedLineIdx] = {
      ...currentLine,
      syllables: updatedSyllables,
    };
    onChangeLines(updatedLines);
  };

  // Advance selection to next syllable
  const advanceToNextSyllable = () => {
    if (!lines[selectedLineIdx]) return;
    const currentLine = lines[selectedLineIdx]!;

    if (selectedSylIdx + 1 < currentLine.syllables.length) {
      setSelectedSylIdx(selectedSylIdx + 1);
    } else if (selectedLineIdx + 1 < lines.length) {
      setSelectedLineIdx(selectedLineIdx + 1);
      setSelectedSylIdx(0);
    }
  };

  // Keyboard navigation and tap-sync engine
  useEffect(() => {
    if (mode !== 'sync') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (spacePressTimeRef.current === null) {
          spacePressTimeRef.current = currentTimeMs;

          // Stamp begin timestamp immediately on keydown
          if (lines[selectedLineIdx]) {
            const currentLine = lines[selectedLineIdx]!;
            const currentSyl = currentLine.syllables[selectedSylIdx];
            if (currentSyl) {
              const updatedSyllables = [...currentLine.syllables];
              updatedSyllables[selectedSylIdx] = {
                ...currentSyl,
                begin: currentTimeMs,
                end: Math.max(currentTimeMs + 200, currentSyl.end),
              };

              const updatedLines = [...lines];
              updatedLines[selectedLineIdx] = {
                ...currentLine,
                begin: updatedSyllables[0]?.begin ?? 0,
                end: updatedSyllables[updatedSyllables.length - 1]?.end ?? 0,
                syllables: updatedSyllables,
              };
              onChangeLines(updatedLines);
            }
          }
        }
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        toggleCurrentSyllableRole();
      } else if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        toggleCurrentLineAgent();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        nudgeCurrentSyllable(-20);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nudgeCurrentSyllable(20);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (selectedSylIdx > 0) {
          setSelectedSylIdx(selectedSylIdx - 1);
        } else if (selectedLineIdx > 0) {
          setSelectedLineIdx(selectedLineIdx - 1);
          setSelectedSylIdx(lines[selectedLineIdx - 1]?.syllables.length ? lines[selectedLineIdx - 1]!.syllables.length - 1 : 0);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        advanceToNextSyllable();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        const pressStart = spacePressTimeRef.current ?? currentTimeMs;
        spacePressTimeRef.current = null;
        const releaseTime = currentTimeMs;
        const endTimestamp = releaseTime > pressStart ? releaseTime : pressStart + 250;

        if (lines[selectedLineIdx]) {
          const currentLine = lines[selectedLineIdx]!;
          const currentSyl = currentLine.syllables[selectedSylIdx];
          if (currentSyl) {
            const updatedSyllables = [...currentLine.syllables];
            updatedSyllables[selectedSylIdx] = {
              ...currentSyl,
              begin: pressStart,
              end: endTimestamp,
            };

            const updatedLines = [...lines];
            updatedLines[selectedLineIdx] = {
              ...currentLine,
              begin: updatedSyllables[0]?.begin ?? 0,
              end: updatedSyllables[updatedSyllables.length - 1]?.end ?? 0,
              syllables: updatedSyllables,
            };
            onChangeLines(updatedLines);
          }
        }

        // Advance to next syllable after stamping end
        advanceToNextSyllable();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [mode, selectedLineIdx, selectedSylIdx, currentTimeMs, lines]);

  // Handle Multi-Format File Drop or Selection (TTML, LRC, JSON)
  const handleFileChange = async (file: File) => {
    if (!file) return;
    setUploadedFileName(file.name);
    try {
      const text = await file.text();
      setUploadContent(text);
      const fmt = detectLyricsFormat(text, file.name);
      setDetectedFormat(fmt);

      const parsed = parseMultiFormatLyrics(text, file.name, durationMs);
      if (parsed.lines.length > 0) {
        const meta: Partial<TTMLMetadata> = { ...(parsed.metadata || {}) };
        if (!meta.title && file.name) {
          const base = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
          if (base.includes(' - ')) {
            const [art, tit] = base.split(' - ');
            if (art && !meta.artist) meta.artist = art.trim();
            if (tit && !meta.title) meta.title = tit.trim();
          } else if (!meta.title) {
            meta.title = base.trim();
          }
        }
        if (!meta.durationMs && parsed.lines.length > 0) {
          meta.durationMs = parsed.lines[parsed.lines.length - 1]!.end;
        }

        const rawXml = (fmt === 'ttml' || text.includes('<tt')) ? text : undefined;
        onChangeLines(parsed.lines);
        onChangeMetadata?.(meta, parsed.lines, rawXml);
        setSyncFidelity(parsed.mode);
        setSelectedLineIdx(0);
        setSelectedSylIdx(0);
        setUploadStatus(`Loaded ${parsed.lines.length} lines (${parsed.mode === 'syllable' ? 'word-by-word syllable' : 'one-line'} sync)`);
        setMode('sync');
      } else {
        setUploadStatus('No lines could be parsed from the file.');
      }
    } catch (err: any) {
      setUploadStatus(`Error parsing file: ${err.message}`);
    }
  };

  const handleParsePastedUpload = () => {
    if (!uploadContent.trim()) return;
    try {
      const fmt = detectLyricsFormat(uploadContent, uploadedFileName || undefined);
      setDetectedFormat(fmt);

      const parsed = parseMultiFormatLyrics(uploadContent, uploadedFileName || undefined, durationMs);
      if (parsed.lines.length > 0) {
        // If user explicitly selected line vs syllable mode
        let finalLines = parsed.lines;
        if (syncFidelity === 'line') {
          finalLines = parsed.lines.map((l) => ({
            ...l,
            syllables: [
              {
                begin: l.begin,
                end: l.end,
                text: l.text,
              },
            ],
          }));
        }

        const meta: Partial<TTMLMetadata> = { ...(parsed.metadata || {}) };
        if (!meta.durationMs && finalLines.length > 0) {
          meta.durationMs = finalLines[finalLines.length - 1]!.end;
        }

        const rawXml = (fmt === 'ttml' || uploadContent.includes('<tt')) ? uploadContent : undefined;
        onChangeLines(finalLines);
        onChangeMetadata?.(meta, finalLines, rawXml);
        setSelectedLineIdx(0);
        setSelectedSylIdx(0);
        setUploadStatus(`Successfully imported ${finalLines.length} lines into matrix!`);
        setMode('sync');
      } else {
        setUploadStatus('Could not find synchronized lines in the content.');
      }
    } catch (err: any) {
      setUploadStatus(`Parse failed: ${err.message}`);
    }
  };

  return (
    <div className="deck-pane" style={{ flex: 1 }}>
      <div className="pane-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="pane-title">Lyrics Synchronizer</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className={`btn btn-secondary ${mode === 'sync' ? 'active' : ''}`}
              style={{
                padding: '3px 8px',
                fontSize: 10,
                backgroundColor: mode === 'sync' ? '#26262e' : 'transparent',
                borderColor: mode === 'sync' ? '#444450' : '#26262e',
                color: mode === 'sync' ? '#ffffff' : '#8e8e98',
              }}
              onClick={() => setMode('sync')}
            >
              Matrix Editor
            </button>
            <button
              className={`btn btn-secondary ${mode === 'upload' ? 'active' : ''}`}
              style={{
                padding: '3px 8px',
                fontSize: 10,
                backgroundColor: mode === 'upload' ? '#26262e' : 'transparent',
                borderColor: mode === 'upload' ? '#444450' : '#26262e',
                color: mode === 'upload' ? '#ffffff' : '#8e8e98',
              }}
              onClick={() => setMode('upload')}
            >
              Upload (TTML/LRC/JSON)
            </button>
            <button
              className={`btn btn-secondary ${mode === 'raw' ? 'active' : ''}`}
              style={{
                padding: '3px 8px',
                fontSize: 10,
                backgroundColor: mode === 'raw' ? '#26262e' : 'transparent',
                borderColor: mode === 'raw' ? '#444450' : '#26262e',
                color: mode === 'raw' ? '#ffffff' : '#8e8e98',
              }}
              onClick={() => setMode('raw')}
            >
              Raw Text
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Sync Fidelity Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginRight: 6 }}>
            <span style={{ fontSize: 9, color: '#7e7e88', fontFamily: 'var(--font-mono)' }}>Mode:</span>
            <button
              type="button"
              className="btn btn-secondary"
              style={{
                padding: '2px 6px',
                fontSize: 9,
                backgroundColor: syncFidelity === 'syllable' ? '#22222a' : '#141418',
                borderColor: syncFidelity === 'syllable' ? '#4ade80' : '#26262e',
                color: syncFidelity === 'syllable' ? '#4ade80' : '#8e8e98',
              }}
              onClick={() => setSyncFidelity('syllable')}
              title="Syllable animated sync"
            >
              Syllable
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{
                padding: '2px 6px',
                fontSize: 9,
                backgroundColor: syncFidelity === 'line' ? '#22222a' : '#141418',
                borderColor: syncFidelity === 'line' ? '#60a5fa' : '#26262e',
                color: syncFidelity === 'line' ? '#60a5fa' : '#8e8e98',
              }}
              onClick={() => setSyncFidelity('line')}
              title="Line-by-line sync"
            >
              Line
            </button>
          </div>

          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: 10, borderColor: '#3e3e4a', color: '#98c379' }}
            onClick={handleAiAutoSync}
            disabled={isAiSyncing}
          >
            {isAiSyncing ? 'Aligning...' : 'AI Auto-Sync'}
          </button>
        </div>
      </div>

      {mode === 'upload' ? (
        <div className="pane-scrollable" style={{ padding: 20 }}>
          {/* Multi-format Drop & Selection Box */}
          <div
            style={{
              border: '2px dashed #33333e',
              borderRadius: 8,
              padding: '24px 16px',
              textAlign: 'center',
              backgroundColor: '#101014',
              cursor: 'pointer',
              marginBottom: 16,
              transition: 'border-color 0.2s',
            }}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.style.borderColor = '#4ade80';
            }}
            onDragLeave={(e) => {
              e.currentTarget.style.borderColor = '#33333e';
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.style.borderColor = '#33333e';
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileChange(e.dataTransfer.files[0]);
              }
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".ttml,.xml,.lrc,.json,.txt"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChange(e.target.files[0]);
                }
              }}
            />
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f4f4f6', marginBottom: 4 }}>
              Drop TTML XML, LRC, or JSON Lyrics File Here
            </div>
            <div style={{ fontSize: 11, color: '#8e8e98' }}>
              or click to browse from computer. Supports TTML (.ttml/.xml), Syllable or Line-level LRC (.lrc), and JSON.
            </div>
            {uploadedFileName && (
              <div style={{ marginTop: 10, fontSize: 11, color: '#4ade80', fontFamily: 'var(--font-mono)' }}>
                Loaded file: {uploadedFileName}
              </div>
            )}
          </div>

          {/* Paste or Preview Text */}
          <div className="form-field">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label className="form-label">Or Paste TTML XML / LRC / JSON Content Directly</label>
              {detectedFormat && (
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#a1a1aa' }}>
                  Detected Format: <strong style={{ color: '#f4f4f6' }}>{detectedFormat.toUpperCase()}</strong>
                </span>
              )}
            </div>
            <textarea
              className="text-input"
              rows={12}
              value={uploadContent}
              onChange={(e) => {
                setUploadContent(e.target.value);
                setDetectedFormat(detectLyricsFormat(e.target.value));
              }}
              style={{ resize: 'none', lineHeight: 1.5, fontFamily: 'var(--font-mono)', fontSize: 11 }}
              placeholder="Paste .ttml XML, .lrc text with timestamps, or .json lyrics here..."
            />
          </div>

          {uploadStatus && (
            <div style={{ padding: '8px 12px', backgroundColor: '#181820', borderRadius: 4, marginBottom: 12, fontSize: 11, color: '#e4e4e7' }}>
              {uploadStatus}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={handleParsePastedUpload}
              disabled={!uploadContent.trim()}
            >
              Parse and Load into Matrix ({syncFidelity === 'syllable' ? 'Syllable' : 'Line'})
            </button>
            <button
              className="btn btn-secondary"
              style={{ padding: '0 16px' }}
              onClick={() => {
                setUploadContent('');
                setUploadedFileName(null);
                setUploadStatus('');
              }}
            >
              Clear
            </button>
          </div>
        </div>
      ) : mode === 'raw' ? (
        <div className="pane-scrollable" style={{ padding: 20 }}>
          <div className="form-field">
            <label className="form-label">Paste Raw Lyrics (Line by Line)</label>
            <textarea
              className="text-input"
              rows={16}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              style={{ resize: 'none', lineHeight: 1.6 }}
              placeholder="Paste unsynced lyrics here..."
            />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleTokenize}>
              Tokenize Syllables into Matrix
            </button>
            <button
              className="btn btn-secondary"
              style={{ flex: 1, borderColor: '#3e3e4a', color: '#98c379' }}
              onClick={handleAiAutoSync}
              disabled={isAiSyncing}
            >
              {isAiSyncing ? 'Aligning...' : 'AI Auto-Sync (Align Words to Audio)'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Workstation Instructions Bar */}
          <div
            style={{
              padding: '8px 16px',
              backgroundColor: '#0a0a0c',
              borderBottom: '1px solid #26262e',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: '#9e9ea8',
              display: 'flex',
              gap: 16,
              alignItems: 'center',
              userSelect: 'none',
            }}
          >
            <span><strong style={{ color: '#f4f4f6' }}>SPACE</strong>: Stamp Begin / Release End</span>
            <span><strong style={{ color: '#f4f4f6' }}>B</strong>: Toggle Ad-Lib (x-bg)</span>
            <span><strong style={{ color: '#f4f4f6' }}>V</strong>: Toggle Vocal Agent (v1/v2)</span>
            <span><strong style={{ color: '#f4f4f6' }}>ARROWS</strong>: Nudge +/-20ms / Navigate</span>
          </div>

          {/* Matrix Lines & Syllables Table */}
          <div ref={matrixContainerRef} className="pane-scrollable" style={{ flex: 1, padding: 16, gap: 12 }}>
            {lines.length === 0 ? (
              <div style={{ color: '#5e5e68', fontFamily: 'var(--font-mono)', fontSize: 12, textAlign: 'center', marginTop: 40 }}>
                No lines found. Switch to Raw Input to paste lyrics.
              </div>
            ) : (
              lines.map((line, lineIdx) => {
                const isSelectedLine = lineIdx === selectedLineIdx;

                return (
                  <div
                    key={line.id || lineIdx}
                    style={{
                      border: isSelectedLine ? '1px solid #3e3e4a' : '1px solid #26262e',
                      borderRadius: 4,
                      backgroundColor: isSelectedLine ? '#181820' : '#141418',
                      padding: '10px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      transition: 'border-color 0.15s ease',
                    }}
                  >
                    {/* Line Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#5e5e68' }}>
                          #{lineIdx + 1}
                        </span>
                        <button
                          className="btn btn-secondary"
                          style={{
                            padding: '2px 6px',
                            fontSize: 9,
                            backgroundColor: line.agent === 'v2' ? '#262235' : '#1c1c24',
                            borderColor: line.agent === 'v2' ? '#4e3e68' : '#26262e',
                            color: line.agent === 'v2' ? '#d8b4fe' : '#9e9ea8',
                          }}
                          onClick={() => {
                            setSelectedLineIdx(lineIdx);
                            toggleCurrentLineAgent();
                          }}
                        >
                          {line.agent === 'v2' ? 'Agent V2' : 'Agent V1'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{
                            padding: '2px 6px',
                            fontSize: 9,
                            backgroundColor: '#1b1b24',
                            borderColor: '#373748',
                            color: '#c084fc',
                          }}
                          onClick={() => addSimultaneousSubtextToLine(lineIdx)}
                          title="Add simultaneous second version of lyrics at the same time"
                        >
                          + Dual Version (Subtext)
                        </button>
                      </div>

                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#7e7e88' }}>
                        {formatTimestampTTML(line.begin)} - {formatTimestampTTML(line.end)}
                      </span>
                    </div>

                    {/* Version 1: Lead Vocal */}
                    <div>
                      {line.backgroundVocals && line.backgroundVocals.length > 0 && (
                        <div style={{ marginBottom: 4, fontSize: 9, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Version 1 (Lead Vocal)
                        </div>
                      )}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {line.syllables.map((syl, sylIdx) => {
                          const isSelectedSyl = isSelectedLine && sylIdx === selectedSylIdx;
                          const isTimed = syl.end > 0;
                          const isCurrentPlaying = currentTimeMs >= syl.begin && currentTimeMs <= syl.end && isTimed;
                          const isAdLib = syl.role === 'x-bg';

                          return (
                            <div
                              key={sylIdx}
                              onClick={() => {
                                setSelectedLineIdx(lineIdx);
                                setSelectedSylIdx(sylIdx);
                                if (syl.begin > 0) onSeek(syl.begin);
                              }}
                              style={{
                                padding: '5px 8px',
                                borderRadius: 3,
                                border: isSelectedSyl
                                  ? '1px solid #ffffff'
                                  : isCurrentPlaying
                                  ? '1px solid #9e9ea8'
                                  : '1px solid #26262e',
                                backgroundColor: isSelectedSyl
                                  ? '#22222a'
                                  : isAdLib
                                  ? '#1a1824'
                                  : '#0a0a0c',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 2,
                                transition: 'all 0.1s ease',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: isSelectedSyl ? '#ffffff' : '#f4f4f6',
                                  fontStyle: isAdLib ? 'italic' : 'normal',
                                }}
                              >
                                {syl.text}
                              </span>
                              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                {isAdLib && (
                                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#c084fc' }}>
                                    x-bg
                                  </span>
                                )}
                                <span
                                  style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 9,
                                    color: isTimed ? '#98c379' : '#5e5e68',
                                  }}
                                >
                                  {isTimed ? formatTimestampTTML(syl.begin).slice(3) : '--:--'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Version 2: Simultaneous Background Vocal / Subtext */}
                    {line.backgroundVocals && line.backgroundVocals.length > 0 && (
                      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {line.backgroundVocals.map((bgLine, bgIdx) => (
                          <div
                            key={bgIdx}
                            style={{
                              padding: '8px 10px',
                              backgroundColor: '#121218',
                              border: '1px dashed #3a3a4c',
                              borderRadius: 4,
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, backgroundColor: '#2e1b4d', color: '#d8b4fe', fontWeight: 600 }}>
                                Version 2: Simultaneous Vocal (Subtext)
                              </span>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#7e7e88' }}>
                                  {formatTimestampTTML(bgLine.begin)} - {formatTimestampTTML(bgLine.end)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeSimultaneousSubtext(lineIdx, bgIdx)}
                                  style={{
                                    fontSize: 9,
                                    background: 'none',
                                    border: 'none',
                                    color: '#f87171',
                                    cursor: 'pointer',
                                    padding: 0,
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                            <input
                              type="text"
                              value={bgLine.text}
                              onChange={(e) => updateBgLineText(lineIdx, bgIdx, e.target.value)}
                              style={{
                                width: '100%',
                                backgroundColor: '#191522',
                                border: '1px solid #362e45',
                                borderRadius: 3,
                                color: '#e9d5ff',
                                fontSize: 11,
                                padding: '4px 8px',
                                marginBottom: 6,
                                fontStyle: 'italic',
                              }}
                              placeholder="Type simultaneous vocal / subtext..."
                            />
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {bgLine.syllables.map((bgSyl, bgSylIdx) => {
                                const isTimed = bgSyl.end > 0;
                                const isCurrentPlaying = currentTimeMs >= bgSyl.begin && currentTimeMs <= bgSyl.end && isTimed;
                                return (
                                  <div
                                    key={bgSylIdx}
                                    onClick={() => {
                                      if (bgSyl.begin > 0) onSeek(bgSyl.begin);
                                    }}
                                    style={{
                                      padding: '4px 7px',
                                      borderRadius: 3,
                                      border: isCurrentPlaying ? '1px solid #d8b4fe' : '1px solid #2d2638',
                                      backgroundColor: '#191522',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: 2,
                                    }}
                                  >
                                    <span style={{ fontSize: 12, fontWeight: 500, color: '#e9d5ff', fontStyle: 'italic' }}>
                                      {bgSyl.text}
                                    </span>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: isTimed ? '#a78bfa' : '#5e5e68' }}>
                                      {isTimed ? formatTimestampTTML(bgSyl.begin).slice(3) : '--:--'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
