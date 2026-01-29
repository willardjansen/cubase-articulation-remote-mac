'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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

// Cubby Articulations API types
interface CubbyLibrary {
  path: string;
  name: string;
  developer: string;
  category?: string;
  exports?: string[];
  tags?: string[];
}

interface CubbyLibraryDetail {
  path: string;
  name: string;
  developer: string;
  category?: string;
  exports?: string[];
  downloads: Record<string, {
    count: number;
    files: { name: string; url: string }[];
  }>;
}

interface CubbyApiResponse {
  version: string;
  count: number;
  libraries: CubbyLibrary[];
}

// Electron API type
interface ElectronAPI {
  isElectron: boolean;
  showImportDialog: () => Promise<{ canceled: boolean; files: string[] }>;
  openExpressionMapsFolder: () => Promise<{ success: boolean }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

const STORAGE_KEY = 'cubase-remote-instruments';

// Check if running in Electron
const isElectron = () => typeof window !== 'undefined' && window.electronAPI?.isElectron;

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

const CUBBY_API_BASE = 'https://articulations.cubbycomposer.com/api/v1';

export function InstrumentLibrary({ currentMap, onLoadInstrument, onClose }: InstrumentLibraryProps) {
  const [instruments, setInstruments] = useState<SavedInstrument[]>([]);
  const [saveName, setSaveName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'saved' | 'server' | 'online'>('server');
  const [serverMaps, setServerMaps] = useState<ServerMapsResponse | null>(null);
  const [serverLoading, setServerLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loadingMap, setLoadingMap] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [inElectron, setInElectron] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Online (Cubby Articulations) state
  const [onlineLibraries, setOnlineLibraries] = useState<CubbyLibrary[]>([]);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [onlineSearch, setOnlineSearch] = useState('');
  const [expandedLibrary, setExpandedLibrary] = useState<string | null>(null);
  const [libraryDetail, setLibraryDetail] = useState<CubbyLibraryDetail | null>(null);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  // Check if running in Electron after mount (to avoid hydration mismatch)
  useEffect(() => {
    setInElectron(isElectron() || false);
  }, []);

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

  // Fetch online libraries from Cubby Articulations API
  const fetchOnlineLibraries = useCallback(async () => {
    setOnlineLoading(true);
    setOnlineError(null);
    try {
      const res = await fetch(`${CUBBY_API_BASE}/libraries.json`);
      const data: CubbyApiResponse = await res.json();
      // Filter to only show libraries with Cubase exports
      const cubaseLibraries = data.libraries.filter(lib =>
        lib.exports?.includes('cubase')
      );
      setOnlineLibraries(cubaseLibraries);
    } catch (e) {
      setOnlineError('Failed to load online libraries');
    } finally {
      setOnlineLoading(false);
    }
  }, []);

  // Fetch library detail with download URLs
  const fetchLibraryDetail = useCallback(async (path: string) => {
    try {
      const res = await fetch(`${CUBBY_API_BASE}/libraries/${path}.json`);
      const data: CubbyLibraryDetail = await res.json();
      setLibraryDetail(data);
    } catch (e) {
      setOnlineError('Failed to load library details');
    }
  }, []);

  // Download and save an expression map from Cubby Articulations
  const downloadOnlineMap = useCallback(async (file: { name: string; url: string }) => {
    setDownloadingFile(file.name);
    try {
      // Fetch the expression map content from GitHub
      const res = await fetch(file.url);
      const content = await res.text();

      // Parse it to verify it's valid
      let map = parseExpressionMap(content, file.name.replace('.expressionmap', ''));
      if (hasUnassignedRemotes(map)) {
        map = autoAssignRemoteTriggers(map);
      }

      // Upload to local server to save it
      const formData = new FormData();
      const blob = new Blob([content], { type: 'application/xml' });
      formData.append('file', blob, file.name);

      const uploadRes = await fetch('/api/expression-maps', {
        method: 'POST',
        body: formData
      });

      if (uploadRes.ok) {
        // Load it into the app
        onLoadInstrument(map);
        // Refresh server maps
        await fetchServerMaps();
        onClose?.();
      } else {
        setOnlineError('Failed to save expression map');
      }
    } catch (e) {
      setOnlineError('Failed to download expression map');
    } finally {
      setDownloadingFile(null);
    }
  }, [fetchServerMaps, onLoadInstrument, onClose]);

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

  // Handle file upload (web)
  const handleFileUpload = useCallback(async (files: FileList) => {
    setUploading(true);
    setUploadMessage(null);
    setServerError(null);

    try {
      const uploadedFiles: string[] = [];

      for (const file of Array.from(files)) {
        if (!file.name.endsWith('.expressionmap')) {
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/expression-maps', {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          uploadedFiles.push(data.filename);
        }
      }

      if (uploadedFiles.length > 0) {
        setUploadMessage(`Uploaded ${uploadedFiles.length} file(s)`);
        // Refresh the list
        await fetchServerMaps();
      } else {
        setServerError('No valid .expressionmap files found');
      }
    } catch (e) {
      setServerError('Failed to upload files');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [fetchServerMaps]);

  // Handle Electron import dialog
  const handleElectronImport = useCallback(async () => {
    if (!window.electronAPI) return;

    setUploading(true);
    setUploadMessage(null);
    setServerError(null);

    try {
      const result = await window.electronAPI.showImportDialog();

      if (!result.canceled && result.files.length > 0) {
        setUploadMessage(`Imported ${result.files.length} file(s)`);
        await fetchServerMaps();
      }
    } catch (e) {
      setServerError('Failed to import files');
    } finally {
      setUploading(false);
    }
  }, [fetchServerMaps]);

  // Open expression maps folder
  const handleOpenFolder = useCallback(async () => {
    if (window.electronAPI) {
      await window.electronAPI.openExpressionMapsFolder();
    }
  }, []);

  useEffect(() => {
    setInstruments(loadInstrumentLibrary());
    // Fetch server maps on mount
    fetchServerMaps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch online libraries when tab changes to 'online'
  useEffect(() => {
    if (activeTab === 'online' && onlineLibraries.length === 0 && !onlineLoading) {
      fetchOnlineLibraries();
    }
  }, [activeTab, onlineLibraries.length, onlineLoading, fetchOnlineLibraries]);

  // Fetch library detail when expanded
  useEffect(() => {
    if (expandedLibrary) {
      fetchLibraryDetail(expandedLibrary);
    } else {
      setLibraryDetail(null);
    }
  }, [expandedLibrary, fetchLibraryDetail]);

  // Filter online libraries by search
  const filteredOnlineLibraries = onlineLibraries.filter(lib => {
    if (!onlineSearch) return true;
    const search = onlineSearch.toLowerCase();
    return lib.name.toLowerCase().includes(search) ||
           lib.developer.toLowerCase().includes(search) ||
           lib.tags?.some(t => t.toLowerCase().includes(search));
  });

  // Group online libraries by developer
  const groupedOnlineLibraries = filteredOnlineLibraries.reduce((acc, lib) => {
    if (!acc[lib.developer]) {
      acc[lib.developer] = [];
    }
    acc[lib.developer].push(lib);
    return acc;
  }, {} as Record<string, CubbyLibrary[]>);

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
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors
                    ${activeTab === 'server'
                      ? 'bg-cubase-highlight text-white'
                      : 'bg-cubase-bg text-cubase-muted hover:text-cubase-text'}`}
        >
          Local
        </button>
        <button
          onClick={() => setActiveTab('online')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors
                    ${activeTab === 'online'
                      ? 'bg-cubase-highlight text-white'
                      : 'bg-cubase-bg text-cubase-muted hover:text-cubase-text'}`}
        >
          Online
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors
                    ${activeTab === 'saved'
                      ? 'bg-cubase-highlight text-white'
                      : 'bg-cubase-bg text-cubase-muted hover:text-cubase-text'}`}
        >
          Saved ({instruments.length})
        </button>
      </div>

      {/* Server Maps Tab */}
      {activeTab === 'server' && (
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Upload Section */}
          <div className="mb-4 pb-4 border-b border-cubase-accent">
            <div className="flex gap-2">
              {inElectron ? (
                <>
                  <button
                    onClick={handleElectronImport}
                    disabled={uploading}
                    className="flex-1 py-2 px-4 rounded-lg bg-cubase-highlight text-white
                             hover:bg-opacity-80 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    {uploading ? 'Importing...' : 'Import Maps'}
                  </button>
                  <button
                    onClick={handleOpenFolder}
                    className="py-2 px-4 rounded-lg bg-cubase-accent text-cubase-text
                             hover:bg-cubase-bg flex items-center justify-center gap-2"
                    title="Open expression maps folder"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </button>
                </>
              ) : (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".expressionmap"
                    multiple
                    onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex-1 py-2 px-4 rounded-lg bg-cubase-highlight text-white
                             hover:bg-opacity-80 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    {uploading ? 'Uploading...' : 'Upload Maps'}
                  </button>
                </>
              )}
            </div>
            {uploadMessage && (
              <div className="mt-2 text-sm text-green-400">{uploadMessage}</div>
            )}
          </div>

          {/* Maps List */}
          <div className="flex-1 overflow-y-auto">
            {serverLoading ? (
              <div className="text-center py-8 text-cubase-muted">Loading...</div>
            ) : serverError ? (
              <div className="text-center py-8 text-red-400">{serverError}</div>
            ) : !serverMaps || serverMaps.maps.length === 0 ? (
              <div className="text-center py-8 text-cubase-muted">
                <p>No expression maps found</p>
                <p className="text-sm mt-2">Click &quot;Upload Maps&quot; to add your .expressionmap files</p>
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
        </div>
      )}

      {/* Online (Cubby Articulations) Tab */}
      {activeTab === 'online' && (
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              value={onlineSearch}
              onChange={(e) => setOnlineSearch(e.target.value)}
              placeholder="Search libraries..."
              className="w-full px-3 py-2 rounded-lg bg-cubase-bg text-cubase-text
                       border border-cubase-accent focus:outline-none focus:ring-2
                       focus:ring-cubase-highlight"
            />
          </div>

          {/* Libraries List */}
          <div className="flex-1 overflow-y-auto">
            {onlineLoading ? (
              <div className="text-center py-8 text-cubase-muted">Loading libraries...</div>
            ) : onlineError ? (
              <div className="text-center py-8 text-red-400">{onlineError}</div>
            ) : filteredOnlineLibraries.length === 0 ? (
              <div className="text-center py-8 text-cubase-muted">
                <p>No Cubase expression maps found</p>
                <p className="text-sm mt-2">
                  <a
                    href="https://articulations.cubbycomposer.com/request"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cubase-highlight hover:underline"
                  >
                    Request a library
                  </a>
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedOnlineLibraries).map(([developer, libs]) => (
                  <div key={developer}>
                    <div className="text-xs font-semibold text-cubase-muted uppercase tracking-wider mb-2">
                      {developer}
                    </div>
                    <div className="space-y-1">
                      {libs.map((lib) => (
                        <div key={lib.path}>
                          <button
                            onClick={() => setExpandedLibrary(expandedLibrary === lib.path ? null : lib.path)}
                            className="w-full text-left p-3 rounded-lg bg-cubase-bg
                                     hover:bg-cubase-accent transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-medium text-cubase-text">{lib.name}</div>
                              <svg
                                className={`w-4 h-4 text-cubase-muted transition-transform ${
                                  expandedLibrary === lib.path ? 'rotate-180' : ''
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                            {lib.category && (
                              <div className="text-xs text-cubase-muted mt-1 capitalize">{lib.category}</div>
                            )}
                          </button>

                          {/* Expanded library files */}
                          {expandedLibrary === lib.path && libraryDetail && (
                            <div className="mt-1 ml-4 space-y-1">
                              {libraryDetail.downloads?.cubase ? (
                                <>
                                  <div className="text-xs text-cubase-muted py-1">
                                    {libraryDetail.downloads.cubase.count} expression map{libraryDetail.downloads.cubase.count !== 1 ? 's' : ''}
                                  </div>
                                  {libraryDetail.downloads.cubase.files.map((file) => (
                                    <button
                                      key={file.url}
                                      onClick={() => downloadOnlineMap(file)}
                                      disabled={downloadingFile === file.name}
                                      className="w-full text-left p-2 rounded bg-cubase-surface
                                               hover:bg-cubase-accent transition-colors
                                               disabled:opacity-50 flex items-center gap-2"
                                    >
                                      <svg className="w-4 h-4 text-cubase-highlight" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                      </svg>
                                      <span className="text-sm text-cubase-text truncate">
                                        {downloadingFile === file.name ? 'Downloading...' : file.name.replace('.expressionmap', '')}
                                      </span>
                                    </button>
                                  ))}
                                </>
                              ) : (
                                <div className="text-xs text-cubase-muted py-2">No Cubase maps available</div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer with link */}
          <div className="mt-4 pt-4 border-t border-cubase-accent text-center">
            <a
              href="https://articulations.cubbycomposer.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cubase-muted hover:text-cubase-highlight"
            >
              Browse more at articulations.cubbycomposer.com
            </a>
          </div>
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
