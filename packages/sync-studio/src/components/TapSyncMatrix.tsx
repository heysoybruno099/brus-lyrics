import React, { useState, useEffect, useRef } from 'react';
import {
  formatTimestampTTML,
  type TTMLLine,
  type TTMLSyllable,
} from '@brus-lyrics/shared-types';
import { runAiAutoSync } from '../lib/ai-auto-sync.js';

interface TapSyncMatrixProps {
  lines: TTMLLine[];
  onChangeLines: (lines: TTMLLine[]) => void;
  currentTimeMs: number;
  durationMs: number;
  onSeek: (ms: number) => void;
}

export const TapSyncMatrix: React.FC<TapSyncMatrixProps> = ({
  lines,
  onChangeLines,
  currentTimeMs,
  durationMs,
  onSeek,
}) => {
  const [mode, setMode] = useState<'raw' | 'sync'>('sync');
  const [rawText, setRawText] = useState<string>(
    'Compa que le parece esa morra\nLa que anda bailando sola\nMe gusta pa mi'
  );
  const [selectedLineIdx, setSelectedLineIdx] = useState<number>(0);
  const [selectedSylIdx, setSelectedSylIdx] = useState<number>(0);
  const [isAiSyncing, setIsAiSyncing] = useState<boolean>(false);
  const spacePressTimeRef = useRef<number | null>(null);
  const matrixContainerRef = useRef<HTMLDivElement>(null);

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
    const rawLines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const newLines: TTMLLine[] = rawLines.map((lineStr, lineIdx) => {
      // Split line into words preserving trailing spaces
      const words = lineStr.trim().split(/\s+/);
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
        text: lineStr.trim(),
        syllables,
      };
    });

    onChangeLines(newLines);
    setSelectedLineIdx(0);
    setSelectedSylIdx(0);
    setMode('sync');
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

  return (
    <div className="deck-pane" style={{ flex: 1 }}>
      <div className="pane-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="pane-title">Syllable Tap-Sync Matrix</span>
          <span className="brand-badge">{mode === 'sync' ? 'Mode B: Tap-Sync' : 'Mode A: Raw Input'}</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: 10, borderColor: '#3e3e4a', color: '#98c379' }}
            onClick={handleAiAutoSync}
            disabled={isAiSyncing}
          >
            {isAiSyncing ? 'Aligning...' : 'AI Auto-Sync'}
          </button>
          {mode === 'sync' ? (
            <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: 10 }} onClick={() => setMode('raw')}>
              Edit Raw Text
            </button>
          ) : (
            <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: 10 }} onClick={handleTokenize}>
              Tokenize & Sync
            </button>
          )}
        </div>
      </div>

      {mode === 'raw' ? (
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
                      </div>

                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#7e7e88' }}>
                        {formatTimestampTTML(line.begin)} - {formatTimestampTTML(line.end)}
                      </span>
                    </div>

                    {/* Syllable Chips Matrix */}
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
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
