'use client';

import { useState, useEffect, useCallback } from 'react';
import { ExpressionMap, parseExpressionMap, autoAssignRemoteTriggers, hasUnassignedRemotes } from '@/lib/expressionMapParser';

export interface SavedInstrument {
  id: string;
  name: string;
  map: ExpressionMap;
  createdAt: number;
  trackId?: string; // For auto-switching: which Cubase track this belongs to
}

interface ServerMapFile {
  name: string;
  path: string;
  folder: string;
}

interface ServerMapsResponse {
  maps: ServerMapFile[];
  grouped: Record<string, ServerMapFile[]>;
  message?: string;
}

const STORAGE_KEY = 'cubase-remote-instruments';

export function loadInstrumentLibrary(): SavedInstrument[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function saveInstrumentLibrary(instruments: SavedInstrument[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(instruments));
}

interface InstrumentLibraryProps {
  currentMap: ExpressionMap | null;
  onLoadInstrument: (map: ExpressionMap) => void;
  onClose?: () => void;
}

export function InstrumentLibrary({ currentMap, onLoadInstrument, onClose }: InstrumentLibraryProps) {
  const [instruments, setInstruments] = useState<SavedInstrument[]>([]);
  const [saveName, setSaveName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'saved' | 'server'>('server');
  const [serverMaps, setServerMaps] = useState<ServerMapsResponse | null>(null);
  const [serverLoading, setServerLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loadingMap, setLoadingMap] = useState<string | null>(null);

  const fetchServerMaps = useCallback(async () => {
    setServerLoading(true);
    setServerError(null);
    try {
      const res = await fetch('/api/expression-maps');
      const data = await res.json();
      setServerMaps(data);
    } catch (e) {
      setServerError('Failed to load server maps');
    } finally {
      setServerLoading(false);
    }
  }, []);

  const loadServerMap = useCallback(async (mapFile: ServerMapFile) => {
    setLoadingMap(mapFile.path);
    try {
      const res = await fetch(`/api/expression-maps?file=${encodeURIComponent(mapFile.path)}`);
      const content = await res.text();
      let map = parseExpressionMap(content, mapFile.name);

      // Auto-assign remote triggers if needed
      if (hasUnassignedRemotes(map)) {
        map = autoAssignRemoteTriggers(map);
      }

      onLoadInstrument(map);
      onClose?.();
    } catch (e) {
      setServerError(`Failed to load ${mapFile.name}`);
    } finally {
      setLoadingMap(null);
    }
  }, [onLoadInstrument, onClose]);

  useEffect(() => {
    setInstruments(loadInstrumentLibrary());
    // Fetch server maps on mount
    fetchServerMaps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = () => {
    if (!currentMap || !saveName.trim()) return;

    const newInstrument: SavedInstrument = {
      id: `inst_${Date.now()}`,
      name: saveName.trim(),
      map: currentMap,
      createdAt: Date.now(),
    };

    const updated = [...instruments, newInstrument];
    setInstruments(updated);
    saveInstrumentLibrary(updated);
    setSaveName('');
    setShowSaveForm(false);
  };

  const handleDelete = (id: string) => {
    const updated = instruments.filter(i => i.id !== id);
    setInstruments(updated);
    saveInstrumentLibrary(updated);
  };

  const handleLoad = (instrument: SavedInstrument) => {
    onLoadInstrument(instrument.map);
    onClose?.();
  };

  return (
    <div className="bg-cubase-surface rounded-xl p-6 shadow-xl border border-cubase-accent max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-cubase-text">Expression Maps</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-cubase-muted hover:text-cubase-text transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('server')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors
                    ${activeTab === 'server'
                      ? 'bg-cubase-highlight text-white'
                      : 'bg-cubase-bg text-cubase-muted hover:text-cubase-text'}`}
        >
          Server Maps
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors
                    ${activeTab === 'saved'
                      ? 'bg-cubase-highlight text-white'
                      : 'bg-cubase-bg text-cubase-muted hover:text-cubase-text'}`}
        >
          Saved ({instruments.length})
        </button>
      </div>

      {/* Server Maps Tab */}
      {activeTab === 'server' && (
        <div className="flex-1 overflow-y-auto">
          {serverLoading ? (
            <div className="text-center py-8 text-cubase-muted">Loading...</div>
          ) : serverError ? (
            <div className="text-center py-8 text-red-400">{serverError}</div>
          ) : !serverMaps || serverMaps.maps.length === 0 ? (
            <div className="text-center py-8 text-cubase-muted">
              <p>No expression maps on server</p>
              <p className="text-sm mt-2">Add .expressionmap files to the expression-maps/ folder</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(serverMaps?.grouped || {}).map(([folder, maps]) => (
                <div key={folder}>
                  <div className="text-xs font-semibold text-cubase-muted uppercase tracking-wider mb-2">
                    {folder}
                  </div>
                  <div className="space-y-1">
                    {maps.map((mapFile) => (
                      <button
                        key={mapFile.path}
                        onClick={() => loadServerMap(mapFile)}
                        disabled={loadingMap === mapFile.path}
                        className="w-full text-left p-3 rounded-lg bg-cubase-bg
                                 hover:bg-cubase-accent transition-colors
                                 disabled:opacity-50"
                      >
                        <div className="font-medium text-cubase-text">
                          {loadingMap === mapFile.path ? 'Loading...' : mapFile.name}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Saved Instruments Tab */}
      {activeTab === 'saved' && (
        <>
          {/* Save current instrument */}
          {currentMap && (
            <div className="mb-4 pb-4 border-b border-cubase-accent">
              {showSaveForm ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="Instrument name..."
                    className="flex-1 px-3 py-2 rounded-lg bg-cubase-bg text-cubase-text
                             border border-cubase-accent focus:outline-none focus:ring-2
                             focus:ring-cubase-highlight"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  />
                  <button
                    onClick={handleSave}
                    disabled={!saveName.trim()}
                    className="px-4 py-2 rounded-lg bg-cubase-highlight text-white
                             hover:bg-opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setShowSaveForm(false)}
                    className="px-3 py-2 rounded-lg bg-cubase-accent text-cubase-text
                             hover:bg-cubase-bg"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setSaveName(currentMap.name);
                    setShowSaveForm(true);
                  }}
                  className="w-full py-2 rounded-lg bg-cubase-highlight text-white
                           hover:bg-opacity-80 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Save Current Instrument
                </button>
              )}
            </div>
          )}

          {/* Saved instruments list */}
          <div className="flex-1 overflow-y-auto">
            {instruments.length === 0 ? (
              <div className="text-center py-8 text-cubase-muted">
                <p>No saved instruments</p>
                <p className="text-sm mt-2">Load expression maps and save them here for quick access</p>
              </div>
            ) : (
              <div className="space-y-2">
                {instruments.map((inst) => (
                  <div
                    key={inst.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-cubase-bg
                             hover:bg-cubase-accent transition-colors group"
                  >
                    <button
                      onClick={() => handleLoad(inst)}
                      className="flex-1 text-left"
                    >
                      <div className="font-medium text-cubase-text">{inst.name}</div>
                      <div className="text-xs text-cubase-muted">
                        {inst.map.articulations.length} articulations
                        {inst.map.isMerged && ` (merged from ${inst.map.sourceMapNames?.length || 0} maps)`}
                      </div>
                    </button>
                    <button
                      onClick={() => handleDelete(inst.id)}
                      className="p-2 rounded-lg text-cubase-muted hover:text-red-400
                               hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete instrument"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
