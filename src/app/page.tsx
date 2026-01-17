'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ExpressionMap, parseExpressionMap, autoAssignRemoteTriggers, hasUnassignedRemotes, mergeExpressionMaps } from '@/lib/expressionMapParser';
import { midiHandler, MidiState } from '@/lib/midiHandler';
import { ArticulationGrid } from '@/components/ArticulationGrid';
import { MidiSettings } from '@/components/MidiSettings';
import { InstrumentLibrary } from '@/components/InstrumentLibrary';
import About from '@/components/About';

interface ServerMapFile {
  name: string;
  path: string;
  folder: string;
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [expressionMaps, setExpressionMaps] = useState<ExpressionMap[]>([]);
  const [activeMapIndex, setActiveMapIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [midiState, setMidiState] = useState<MidiState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [columns, setColumns] = useState(4);
  const [buttonSize, setButtonSize] = useState<'small' | 'medium' | 'large'>('medium');
  const serverMapsRef = useRef<ServerMapFile[]>([]);
  const loadingTrackRef = useRef<string | null>(null);

  // Fetch server maps list on mount
  useEffect(() => {
    fetch('/api/expression-maps')
      .then(res => res.json())
      .then(data => {
        serverMapsRef.current = data.maps || [];
        console.log('[App] Loaded server maps list:', serverMapsRef.current.length, 'maps');
      })
      .catch(err => {
        console.error('[App] Failed to fetch server maps:', err);
      });
  }, []);

  // Mark as mounted (client-side only)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize MIDI
  useEffect(() => {
    midiHandler.initialize().then(setMidiState);
    const unsubscribe = midiHandler.subscribe(setMidiState);
    return unsubscribe;
  }, []);

  // Subscribe to track name changes from Cubase
  useEffect(() => {
    const unsubscribe = midiHandler.onTrackName(async (trackName) => {
      console.log('[App] Track changed in Cubase:', trackName);

      // First try to find among already-loaded maps
      const matchIndex = findMatchingMapIndex(trackName, expressionMaps);
      if (matchIndex >= 0 && matchIndex !== activeMapIndex) {
        console.log(`[App] Auto-switching to loaded map: ${expressionMaps[matchIndex].name}`);
        setActiveMapIndex(matchIndex);
        return;
      }

      // If no loaded map matches, search server maps
      if (loadingTrackRef.current === trackName) return; // Already loading this track

      const serverMatch = findMatchingServerMap(trackName, serverMapsRef.current);
      if (serverMatch) {
        console.log(`[App] Loading server map: ${serverMatch.name}`);
        loadingTrackRef.current = trackName;
        try {
          const res = await fetch(`/api/expression-maps?file=${encodeURIComponent(serverMatch.path)}`);
          const content = await res.text();
          let map = parseExpressionMap(content, serverMatch.name);
          if (hasUnassignedRemotes(map)) {
            map = autoAssignRemoteTriggers(map);
          }
          // Replace current maps with the loaded one
          setExpressionMaps([map]);
          setActiveMapIndex(0);
          console.log(`[App] Loaded and switched to: ${map.name}`);
        } catch (e) {
          console.error('[App] Failed to load server map:', e);
        } finally {
          loadingTrackRef.current = null;
        }
      } else {
        console.log('[App] No matching server map found for:', trackName);
      }
    });
    return unsubscribe;
  }, [expressionMaps, activeMapIndex]);

  // Instrument name aliases (different names for the same instrument)
  const INSTRUMENT_ALIASES: Record<string, string[]> = {
    'english horn': ['cor anglais', 'english horn'],
    'cor anglais': ['cor anglais', 'english horn'],
  };

  // Enhanced fuzzy matching with keyword scoring
  const findMatchingServerMap = (trackName: string, serverMaps: ServerMapFile[]): ServerMapFile | null => {
    if (!trackName || serverMaps.length === 0) return null;

    const normalizedTrack = trackName.toLowerCase().trim();

    // Try exact match first (fastest)
    let match = serverMaps.find(m => m.name.toLowerCase() === normalizedTrack);
    if (match) {
      console.log('[Match] Exact match:', match.path);
      return match;
    }

    // Try simple substring match (second fastest)
    match = serverMaps.find(m =>
      normalizedTrack.includes(m.name.toLowerCase()) ||
      m.name.toLowerCase().includes(normalizedTrack)
    );
    if (match) {
      console.log('[Match] Substring match:', match.path);
      return match;
    }

    // Extract keywords from track name (include numbers, min length 1)
    const trackKeywords = normalizedTrack
      .split(/[\s\-_\/]+/)
      .filter(word => word.length >= 1)
      .map(word => word.toLowerCase());

    // Extract numbers from track name for special handling
    const trackNumbers = trackKeywords.filter(k => /^\d+$/.test(k));

    if (trackKeywords.length === 0) return null;

    console.log('[Match] Searching with keywords:', trackKeywords);
    if (trackNumbers.length > 0) {
      console.log('[Match] Track contains numbers:', trackNumbers);
    }

    // Score each map based on keyword matches in folder path + filename
    const scored = serverMaps.map(map => {
      const fullPath = `${map.folder}/${map.name}`.toLowerCase();
      const filenameLower = map.name.toLowerCase();
      let score = 0;
      const matchedKeywords: string[] = [];

      // Extract numbers from map name
      const mapNumbers: string[] = fullPath.match(/\b\d+\b/g) || [];

      for (const keyword of trackKeywords) {
        // Skip very short non-numeric words
        if (keyword.length === 1 && !/^\d$/.test(keyword)) {
          continue;
        }

        let keywordMatched = false;

        // Check for exact keyword match in full path
        if (fullPath.includes(keyword)) {
          score += 10; // Full keyword match
          matchedKeywords.push(keyword);
          keywordMatched = true;
        } else {
          // Check for aliases (e.g., "cor anglais" → "english horn")
          const aliases = INSTRUMENT_ALIASES[keyword];
          if (aliases) {
            for (const alias of aliases) {
              if (fullPath.includes(alias)) {
                score += 10; // Alias match
                matchedKeywords.push(`${keyword}→${alias}`);
                keywordMatched = true;
                break;
              }
            }
          }

          // Check for partial matches (e.g., "pr" matches "prime")
          if (!keywordMatched && keyword.length >= 2) {
            const words = fullPath.split(/[\s\-_\/]+/);
            for (const word of words) {
              if (word.startsWith(keyword)) {
                score += 5; // Partial match (prefix)
                matchedKeywords.push(`${keyword}→${word}`);
                keywordMatched = true;
                break;
              }
            }
          }
        }

        // Bonus: if keyword matches appear in filename (not just folder)
        if (keywordMatched && filenameLower.includes(keyword)) {
          score += 3; // Filename bonus
        }
      }

      // Number matching: Bonus if track numbers match map numbers exactly
      if (trackNumbers.length > 0) {
        for (const trackNum of trackNumbers) {
          if (mapNumbers.includes(trackNum)) {
            score += 15; // Strong bonus for exact number match
            matchedKeywords.push(`#${trackNum}`);
          }
        }

        // Penalty if map contains different numbers (likely wrong instrument variant)
        const hasConflictingNumber = mapNumbers.some(mapNum => {
          // Check if it's a different single-digit number (e.g., "1" vs "2")
          return mapNum.length === 1 && trackNumbers.includes('1') && mapNum !== '1' ||
                 mapNum.length === 1 && trackNumbers.includes('2') && mapNum !== '2' ||
                 mapNum.length === 1 && trackNumbers.includes('3') && mapNum !== '3';
        });

        if (hasConflictingNumber) {
          score -= 20; // Penalty for wrong variant number
        }
      }

      return { map, score, matchedKeywords };
    });

    // Filter to only maps with some matches
    const candidates = scored.filter(s => s.score > 0);

    if (candidates.length === 0) {
      console.log('[Match] No matches found');
      return null;
    }

    // Sort by score (highest first)
    candidates.sort((a, b) => b.score - a.score);

    // Log top 3 candidates for debugging
    console.log('[Match] Top candidates:');
    candidates.slice(0, 3).forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.map.path} (score: ${c.score}, keywords: ${c.matchedKeywords.join(', ')})`);
    });

    // Return best match
    const best = candidates[0];

    // Only return if score is reasonably high (at least 10 points)
    if (best.score >= 10) {
      return best.map;
    }

    console.log('[Match] Score too low, no confident match');
    return null;
  };

  // Find the best matching expression map for a track name
  const findMatchingMapIndex = (trackName: string, maps: ExpressionMap[]): number => {
    if (!trackName || maps.length === 0) return -1;

    const normalizedTrack = trackName.toLowerCase().trim();

    // Try exact match first
    let index = maps.findIndex(m => m.name.toLowerCase() === normalizedTrack);
    if (index >= 0) return index;

    // Try if track name contains map name or vice versa
    index = maps.findIndex(m =>
      normalizedTrack.includes(m.name.toLowerCase()) ||
      m.name.toLowerCase().includes(normalizedTrack)
    );
    if (index >= 0) return index;

    // Try matching first word (instrument name often comes first)
    const trackFirstWord = normalizedTrack.split(/[\s-_]/)[0];
    index = maps.findIndex(m => {
      const mapFirstWord = m.name.toLowerCase().split(/[\s-_]/)[0];
      return trackFirstWord === mapFirstWord ||
             m.name.toLowerCase().startsWith(trackFirstWord) ||
             trackFirstWord.startsWith(mapFirstWord);
    });
    if (index >= 0) return index;

    return -1;
  };

  // Load saved maps from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('expressionMaps');
    if (saved) {
      try {
        setExpressionMaps(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved maps:', e);
      }
    }

    const savedColumns = localStorage.getItem('gridColumns');
    if (savedColumns) setColumns(parseInt(savedColumns));

    const savedSize = localStorage.getItem('buttonSize');
    if (savedSize) setButtonSize(savedSize as 'small' | 'medium' | 'large');
  }, []);

  // Save maps to localStorage
  useEffect(() => {
    if (expressionMaps.length > 0) {
      localStorage.setItem('expressionMaps', JSON.stringify(expressionMaps));
    }
  }, [expressionMaps]);

  const handleMapLoaded = useCallback((map: ExpressionMap) => {
    // Auto-assign remote triggers if any are missing
    let processedMap = map;
    if (hasUnassignedRemotes(map)) {
      processedMap = autoAssignRemoteTriggers(map);
    }

    setExpressionMaps(prev => {
      // Check if map already exists (by name)
      const existingIndex = prev.findIndex(m => m.name === processedMap.name);
      if (existingIndex >= 0) {
        // Replace existing
        const updated = [...prev];
        updated[existingIndex] = processedMap;
        return updated;
      }
      // Add new
      return [...prev, processedMap];
    });
    setActiveMapIndex(expressionMaps.length);
    setError(null);
  }, [expressionMaps.length]);

  const handleRemoveMap = (index: number) => {
    setExpressionMaps(prev => prev.filter((_, i) => i !== index));
    if (activeMapIndex >= index && activeMapIndex > 0) {
      setActiveMapIndex(activeMapIndex - 1);
    }
  };

  const handleMergeMaps = () => {
    if (expressionMaps.length < 2) return;

    // Merge all current maps into one
    const merged = mergeExpressionMaps(expressionMaps);

    // Replace all maps with the merged one
    setExpressionMaps([merged]);
    setActiveMapIndex(0);
  };

  const handleLoadFromLibrary = (map: ExpressionMap) => {
    setExpressionMaps([map]);
    setActiveMapIndex(0);
  };

  const handleColumnsChange = (newColumns: number) => {
    setColumns(newColumns);
    localStorage.setItem('gridColumns', newColumns.toString());
  };

  const handleSizeChange = (newSize: 'small' | 'medium' | 'large') => {
    setButtonSize(newSize);
    localStorage.setItem('buttonSize', newSize);
  };

  const activeMap = expressionMaps[activeMapIndex];

  // Prevent hydration mismatch by showing loading until mounted
  if (!mounted) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-cubase-bg">
        <div className="text-cubase-muted">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-cubase-surface border-b border-cubase-accent px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-cubase-text">
            Cubby Remote
          </h1>
          {/* MIDI status indicator */}
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${
              midiState?.isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span className="text-xs text-cubase-muted hidden sm:inline">
              {midiState?.isConnected ? 'MIDI Connected' : 'No MIDI'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Grid settings */}
          {activeMap && (
            <>
              <select
                value={columns}
                onChange={(e) => handleColumnsChange(parseInt(e.target.value))}
                className="px-2 py-1 rounded bg-cubase-bg text-cubase-text text-sm
                         border border-cubase-accent"
              >
                {[3, 4, 5, 6, 7, 8].map(n => (
                  <option key={n} value={n}>{n} cols</option>
                ))}
              </select>

              <select
                value={buttonSize}
                onChange={(e) => handleSizeChange(e.target.value as 'small' | 'medium' | 'large')}
                className="px-2 py-1 rounded bg-cubase-bg text-cubase-text text-sm
                         border border-cubase-accent"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </>
          )}

          {/* Template Builder button */}
          <button
            onClick={() => window.open('/template-builder', '_blank')}
            className="p-2 rounded-lg bg-cubase-accent hover:bg-cubase-highlight
                     transition-colors"
            title="DAWproject Template Builder"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </button>

          {/* Library button */}
          <button
            onClick={() => setShowLibrary(true)}
            className="p-2 rounded-lg bg-cubase-accent hover:bg-cubase-highlight
                     transition-colors"
            title="Instrument Library"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </button>

          {/* Settings button */}
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg bg-cubase-accent hover:bg-cubase-highlight
                     transition-colors"
            title="MIDI Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Tab bar for multiple maps */}
      {expressionMaps.length > 0 && (
        <div className="bg-cubase-bg border-b border-cubase-accent px-2 py-2 
                      flex items-center gap-2 overflow-x-auto">
          {expressionMaps.map((map, index) => (
            <div 
              key={index} 
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm
                        whitespace-nowrap cursor-pointer transition-colors
                        ${index === activeMapIndex 
                          ? 'bg-cubase-highlight text-white' 
                          : 'bg-cubase-surface text-cubase-muted hover:bg-cubase-accent'}`}
              onClick={() => setActiveMapIndex(index)}
            >
              <span className="max-w-[150px] truncate">
                {map.name.replace(/.*?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*(?:Part|Multi|Attribute|Direction|-|_).*/, '$1') || map.name}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveMap(index);
                }}
                className="ml-1 p-0.5 rounded hover:bg-white/20 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          
          {/* Add new map button */}
          <label className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm
                         bg-cubase-surface text-cubase-muted hover:bg-cubase-accent
                         cursor-pointer transition-colors whitespace-nowrap">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add</span>
            <input
              type="file"
              accept=".expressionmap"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  file.text().then(content => {
                    const { parseExpressionMap } = require('@/lib/expressionMapParser');
                    const map = parseExpressionMap(content, file.name);
                    handleMapLoaded(map); // Will auto-assign remotes if needed
                  });
                }
                e.target.value = '';
              }}
              className="hidden"
            />
          </label>

          {/* Merge maps button - only show when multiple maps loaded */}
          {expressionMaps.length >= 2 && !expressionMaps[0]?.isMerged && (
            <button
              onClick={handleMergeMaps}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm
                       bg-cubase-highlight text-white hover:bg-opacity-80
                       transition-colors whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
              <span>Merge All</span>
            </button>
          )}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 p-4 overflow-auto">
        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-300">
            {error}
            <button 
              onClick={() => setError(null)}
              className="ml-2 underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {activeMap ? (
          <ArticulationGrid
            expressionMap={activeMap}
            columns={columns}
            buttonSize={buttonSize}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 mb-6 rounded-full bg-cubase-accent/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-cubase-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <h2 className="text-xl font-medium text-cubase-text mb-2">
              Waiting for Cubase
            </h2>
            <p className="text-cubase-muted max-w-sm mb-2">
              Start Cubase and select a track with an Expression Map.
              The articulations will appear here automatically.
            </p>
            <p className="text-cubase-muted/70 text-sm">
              If Cubase is already running, please select a track.
            </p>
            {!midiState?.isConnected && (
              <div className="mt-6 px-4 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <p className="text-yellow-400 text-sm">
                  MIDI not connected. Make sure Cubase is running and the MIDI Remote script is installed.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MIDI Settings Modal */}
      {showSettings && (
        <div
          className="fixed inset-0 bg-black/60 modal-backdrop flex items-center
                   justify-center p-4 z-50"
          onClick={() => setShowSettings(false)}
        >
          <div onClick={e => e.stopPropagation()}>
            <MidiSettings onClose={() => setShowSettings(false)} />
          </div>
        </div>
      )}

      {/* Instrument Library Modal */}
      {showLibrary && (
        <div
          className="fixed inset-0 bg-black/60 modal-backdrop flex items-center
                   justify-center p-4 z-50"
          onClick={() => setShowLibrary(false)}
        >
          <div onClick={e => e.stopPropagation()}>
            <InstrumentLibrary
              currentMap={activeMap}
              onLoadInstrument={handleLoadFromLibrary}
              onClose={() => setShowLibrary(false)}
            />
          </div>
        </div>
      )}

      {/* About Button */}
      <About />
    </main>
  );
}
