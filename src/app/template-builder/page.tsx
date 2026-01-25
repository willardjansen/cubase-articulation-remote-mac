'use client';

import { useState, useEffect, useCallback } from 'react';
import JSZip from 'jszip';

interface MapFile {
  name: string;
  path: string;
  folder: string;
}

interface FolderNode {
  name: string;
  path: string;
  maps: MapFile[];
  subfolders: Record<string, FolderNode>;
  selected: boolean;
  indeterminate: boolean;
}

interface TemplateSlot {
  slotIndex: number;
  trackName: string;
  trackNameMaxLength: number;
  expressionMapName: string;
  expressionMapMaxLength: number;
  newTrackName: string;
  newExpressionMapName: string;
}

interface BaseTemplate {
  fileName: string;
  fileSize: number;
  buffer: ArrayBuffer;
  slots: TemplateSlot[];
}

// Helper functions for .cpr analysis (ported from rename-tracks-to-expmaps.js)

function findAllString(buffer: Uint8Array, str: string): number[] {
  const encoder = new TextEncoder();
  const searchBytes = encoder.encode(str);
  const positions: number[] = [];

  for (let i = 0; i <= buffer.length - searchBytes.length; i++) {
    let match = true;
    for (let j = 0; j < searchBytes.length && match; j++) {
      if (buffer[i + j] !== searchBytes[j]) match = false;
    }
    if (match) positions.push(i);
  }
  return positions;
}

function readNullTerminatedString(buffer: Uint8Array, offset: number, maxLen: number = 200): string {
  let end = offset;
  while (end < offset + maxLen && buffer[end] !== 0) end++;
  const decoder = new TextDecoder();
  return decoder.decode(buffer.slice(offset, end));
}

// Find expression map assignments
function findExpressionMapAssignments(buffer: Uint8Array) {
  const assignments: Array<{expMapName: string; nameStart: number; nameLen: number; position: number}> = [];
  const marker = 'All MIDI Inputs';
  const positions = findAllString(buffer, marker);

  for (let i = 0; i < positions.length - 1; i++) {
    const pos1 = positions[i];
    const pos2 = positions[i + 1];
    const distance = pos2 - pos1;

    if (distance >= 20 && distance <= 35) {
      const afterSecond = pos2 + 16;

      for (let j = 0; j < 20; j++) {
        const checkPos = afterSecond + j;
        if (checkPos + 10 >= buffer.length) break;

        if (buffer[checkPos] === 0x01 &&
            buffer[checkPos + 1] === 0x00 &&
            buffer[checkPos + 2] === 0x00 &&
            buffer[checkPos + 3] === 0x00) {

          const lenByte = buffer[checkPos + 4];
          if (lenByte > 10 && lenByte < 100) {
            const nameLen = lenByte - 4;
            const nameStart = checkPos + 5;
            const name = readNullTerminatedString(buffer, nameStart, nameLen + 10);

            if (name && name.length > 5 && !name.startsWith('\x00')) {
              assignments.push({ expMapName: name, nameStart, nameLen: name.length, position: pos1 });
              i++;
              break;
            }
          }
        }
      }
    }
  }

  return assignments;
}

// Find track names - find ALL tracks, not just ones with "Bus UID"
function findTrackNames(buffer: Uint8Array) {
  const tracks: Array<{name: string; nameStart: number; nameLen: number; position: number}> = [];

  for (let i = 0; i < buffer.length - 100; i++) {
    // Look for Name field: Name\x00\x00\x08[00 00 00 len][name]
    if (buffer[i] === 0x4e && buffer[i + 1] === 0x61 && buffer[i + 2] === 0x6d &&
        buffer[i + 3] === 0x65 && buffer[i + 4] === 0x00 && buffer[i + 5] === 0x00 &&
        buffer[i + 6] === 0x08) {

      const len = (buffer[i + 7] << 24) | (buffer[i + 8] << 16) | (buffer[i + 9] << 8) | buffer[i + 10];
      if (len > 8 && len < 100) {
        const nameLen = len - 4;
        const nameStart = i + 11;
        const decoder = new TextDecoder();
        const name = decoder.decode(buffer.slice(nameStart, nameStart + nameLen)).replace(/\x00.*$/, '');

        // Skip system tracks and empty names
        const systemTracks = ['KT Out', 'Stereo In', 'Right', 'Stereo Out', 'Left', 'Input', 'Output'];
        if (name && name.length > 1 && !systemTracks.some(st => name.startsWith(st))) {
          tracks.push({ name, nameStart, nameLen, position: i });
        }
      }
    }
  }

  // Remove duplicates (keep first occurrence)
  const seen = new Set();
  return tracks.filter(t => {
    if (seen.has(t.name)) return false;
    seen.add(t.name);
    return true;
  });
}

export default function TemplateBuilder() {
  const [serverMaps, setServerMaps] = useState<MapFile[]>([]);
  const [folderTree, setFolderTree] = useState<FolderNode | null>(null);
  const [selectedMaps, setSelectedMaps] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; message: string } | null>(null);

  // Base template state
  const [baseTemplate, setBaseTemplate] = useState<BaseTemplate | null>(null);
  const [mode, setMode] = useState<'dawproject' | 'cpr'>('cpr'); // Default to cpr mode
  const [savedTemplateName, setSavedTemplateName] = useState<string | null>(null);
  const [renamedBuffer, setRenamedBuffer] = useState<Uint8Array | null>(null);

  // Load saved template from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('cubby-base-template');
    const savedName = localStorage.getItem('cubby-base-template-name');
    if (saved && savedName) {
      try {
        const data = JSON.parse(saved);
        const buffer = new Uint8Array(data.buffer).buffer;
        setSavedTemplateName(savedName);
        // We'll analyze it when user clicks to load
      } catch (e) {
        console.error('Failed to parse saved template:', e);
      }
    }
  }, []);

  // Save template to localStorage
  const saveTemplateToStorage = useCallback((template: BaseTemplate) => {
    try {
      const bufferArray = Array.from(new Uint8Array(template.buffer));
      localStorage.setItem('cubby-base-template', JSON.stringify({
        buffer: bufferArray,
        slots: template.slots,
      }));
      localStorage.setItem('cubby-base-template-name', template.fileName);
      setSavedTemplateName(template.fileName);
    } catch (e) {
      console.error('Failed to save template (may be too large):', e);
    }
  }, []);

  // Load template from localStorage
  const loadSavedTemplate = useCallback(() => {
    const saved = localStorage.getItem('cubby-base-template');
    const savedName = localStorage.getItem('cubby-base-template-name');
    if (saved && savedName) {
      try {
        const data = JSON.parse(saved);
        const buffer = new Uint8Array(data.buffer).buffer;
        setBaseTemplate({
          fileName: savedName,
          fileSize: buffer.byteLength,
          buffer,
          slots: data.slots,
        });
      } catch (e) {
        console.error('Failed to load saved template:', e);
        alert('Failed to load saved template');
      }
    }
  }, []);

  // Clear saved template
  const clearSavedTemplate = useCallback(() => {
    localStorage.removeItem('cubby-base-template');
    localStorage.removeItem('cubby-base-template-name');
    setSavedTemplateName(null);
  }, []);

  // Load server maps
  useEffect(() => {
    fetch('/api/expression-maps/')
      .then(res => res.json())
      .then(data => {
        const maps = data.maps || [];
        setServerMaps(maps);
        buildFolderTree(maps);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load maps:', err);
        setLoading(false);
      });
  }, []);

  // Build folder tree structure
  const buildFolderTree = (maps: MapFile[]) => {
    const root: FolderNode = {
      name: 'Root',
      path: '',
      maps: [],
      subfolders: {},
      selected: false,
      indeterminate: false,
    };

    maps.forEach(map => {
      const parts = map.folder.split('/').filter(Boolean);
      let current = root;

      parts.forEach(part => {
        if (!current.subfolders[part]) {
          current.subfolders[part] = {
            name: part,
            path: current.path ? `${current.path}/${part}` : part,
            maps: [],
            subfolders: {},
            selected: false,
            indeterminate: false,
          };
        }
        current = current.subfolders[part];
      });

      current.maps.push(map);
    });

    setFolderTree(root);
  };

  // Analyze uploaded .cpr file
  const analyzeCprFile = useCallback(async (file: File) => {
    const buffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(buffer);

    console.log('Analyzing template:', file.name);

    // Find track names and expression maps using generic analysis
    const tracks = findTrackNames(uint8);
    const assignments = findExpressionMapAssignments(uint8);

    console.log(`Found ${tracks.length} tracks and ${assignments.length} expression map assignments`);

    if (tracks.length === 0 && assignments.length === 0) {
      alert('Could not detect any tracks or expression maps in this template. Make sure it\'s a valid Cubase .cpr file with tracks that have expression maps assigned.');
      return;
    }

    // Create slots by matching tracks to expression maps
    const slots: TemplateSlot[] = [];
    const systemTracks = ['KT Out 1', 'Stereo In', 'Right', 'Stereo Out', 'Left'];

    // Match expression maps to tracks by proximity and name similarity
    for (let i = 0; i < assignments.length; i++) {
      const assignment = assignments[i];

      // Find best matching track - prioritize proximity, then name similarity
      let bestMatch = null;
      let bestScore = 0;

      for (const track of tracks) {
        if (systemTracks.includes(track.name)) continue;

        const expLower = assignment.expMapName.toLowerCase();
        const trackLower = track.name.toLowerCase();

        // Calculate proximity score (closer is better)
        const distance = Math.abs(assignment.position - track.position);
        const proximityScore = distance < 100000 ? 100 : (distance < 500000 ? 50 : 0);

        // Calculate name similarity score
        let nameScore = 0;
        if (expLower.includes(trackLower)) {
          nameScore = trackLower.length * 10; // Prefer name matches highly
        }

        const totalScore = proximityScore + nameScore;

        if (totalScore > bestScore) {
          bestScore = totalScore;
          bestMatch = track;
        }
      }

      // Extract a clean track name from the expression map name
      // Remove common suffixes like "Multi Mic Attribute", "Attribute", etc.
      let cleanName = assignment.expMapName
        .replace(/\s*Multi\s*Mic\s*Attribute$/i, '')
        .replace(/\s*Attribute$/i, '')
        .replace(/^NICRQ\s*/i, '')
        .replace(/^VSL\s*/i, '')
        .trim();

      if (bestMatch) {
        // We found a matching track - use its actual name and length
        slots.push({
          slotIndex: i,
          trackName: bestMatch.name,
          trackNameMaxLength: bestMatch.nameLen,
          expressionMapName: assignment.expMapName,
          expressionMapMaxLength: assignment.nameLen,
          newTrackName: cleanName.substring(0, bestMatch.nameLen),
          newExpressionMapName: '',
        });
      }
      // Note: If no track found, the expression map might be on a system track or the track detection failed
    }

    if (slots.length === 0) {
      alert(`Found ${assignments.length} expression map assignments but could not match any to actual tracks. The template may have expression maps assigned to group tracks or buses instead of individual instrument tracks.`);
      return;
    }

    console.log(`Matched ${slots.length} tracks out of ${assignments.length} expression map assignments`);

    const template: BaseTemplate = {
      fileName: file.name,
      fileSize: buffer.byteLength,
      buffer,
      slots,
    };

    setBaseTemplate(template);
    saveTemplateToStorage(template);
    setRenamedBuffer(null); // Clear any previous renamed buffer

    // Auto-switch to CPR mode
    setMode('cpr');

  }, [saveTemplateToStorage]);

  // Handle .cpr file drop
  const handleCprDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.cpr')) {
      analyzeCprFile(file);
    }
  }, [analyzeCprFile]);

  const handleCprSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.cpr')) {
      analyzeCprFile(file);
    }
  }, [analyzeCprFile]);

  // Assign selected expression map to a slot
  const assignMapToSlot = (slotIndex: number, mapPath: string) => {
    if (!baseTemplate) return;

    const map = serverMaps.find(m => m.path === mapPath);
    if (!map) return;

    const slot = baseTemplate.slots[slotIndex];
    if (!slot) return;

    // Create new track name (pad/truncate to fit)
    const newTrackName = map.name.length > slot.trackNameMaxLength
      ? map.name.substring(0, slot.trackNameMaxLength)
      : map.name;

    // Create new expression map name (must match what's in Cubase)
    // The expression map name in the .cpr should match the .expressionmap file name
    const newExpMapName = map.name.length > slot.expressionMapMaxLength
      ? map.name.substring(0, slot.expressionMapMaxLength)
      : map.name;

    const newSlots = [...baseTemplate.slots];
    newSlots[slotIndex] = {
      ...newSlots[slotIndex],
      newTrackName,
      newExpressionMapName: newExpMapName,
    };

    setBaseTemplate({ ...baseTemplate, slots: newSlots });
  };

  // Auto-assign maps based on similarity to slot names
  const autoAssignMaps = () => {
    if (!baseTemplate || serverMaps.length === 0) return;

    const newSlots = [...baseTemplate.slots];

    newSlots.forEach((slot, index) => {
      // Find best matching map based on slot's original track name
      const slotKeywords = slot.trackName.toLowerCase().split(/[\s-_]+/);

      let bestMatchIndex = -1;
      let bestScore = 0;

      serverMaps.forEach((map, mapIndex) => {
        const mapKeywords = map.name.toLowerCase().split(/[\s-_]+/);
        let score = 0;

        slotKeywords.forEach(kw => {
          if (mapKeywords.some(mk => mk.includes(kw) || kw.includes(mk))) {
            score++;
          }
        });

        if (score > bestScore) {
          bestScore = score;
          bestMatchIndex = mapIndex;
        }
      });

      if (bestMatchIndex >= 0 && bestScore > 0) {
        const bestMatch = serverMaps[bestMatchIndex];
        newSlots[index] = {
          ...slot,
          newTrackName: bestMatch.name.substring(0, slot.trackNameMaxLength),
          newExpressionMapName: bestMatch.name.substring(0, slot.expressionMapMaxLength),
        };
      }
    });

    setBaseTemplate({ ...baseTemplate, slots: newSlots });
  };

  // Perform track renaming
  const performRenaming = async () => {
    if (!baseTemplate) return;

    setGenerating(true);
    setProgress({ current: 0, total: baseTemplate.slots.length, message: 'Starting...' });

    try {
      const uint8 = new Uint8Array(baseTemplate.buffer);
      const newBuffer = new Uint8Array(uint8);

      // Helper to pad string to length
      const padToLength = (str: string, len: number) => {
        if (str.length > len) return str.substring(0, len);
        return str.padEnd(len, ' ');
      };

      // Helper to replace string in buffer (async with progress)
      const replaceInBuffer = async (buf: Uint8Array, oldStr: string, newStr: string, trackIndex: number, trackName: string) => {
        // Update progress
        setProgress({
          current: trackIndex,
          total: baseTemplate.slots.length,
          message: `Renaming: ${trackName}`
        });

        // Yield to browser to update UI
        await new Promise(resolve => setTimeout(resolve, 0));

        const paddedNew = padToLength(newStr, oldStr.length);
        const oldBytes = new TextEncoder().encode(oldStr);
        const newBytes = new TextEncoder().encode(paddedNew);

        let count = 0;
        for (let i = 0; i < buf.length - oldBytes.length; i++) {
          let match = true;
          for (let j = 0; j < oldBytes.length && match; j++) {
            if (buf[i + j] !== oldBytes[j]) match = false;
          }
          if (match) {
            for (let j = 0; j < newBytes.length; j++) {
              buf[i + j] = newBytes[j];
            }
            count++;
            i += oldBytes.length - 1;
          }
        }
        return count;
      };

      // Replace track names
      for (let i = 0; i < baseTemplate.slots.length; i++) {
        const slot = baseTemplate.slots[i];
        if (slot.newTrackName && slot.trackName) {
          await replaceInBuffer(newBuffer, slot.trackName, slot.newTrackName, i + 1, slot.trackName);
        }
      }

      // Store the renamed buffer
      setRenamedBuffer(newBuffer);

      // Final step
      setProgress({
        current: baseTemplate.slots.length,
        total: baseTemplate.slots.length,
        message: 'Complete! Ready to download.'
      });
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('Track renaming complete');
    } catch (error) {
      console.error('Failed to rename tracks:', error);
      alert('Failed to rename tracks');
    } finally {
      setGenerating(false);
      setProgress(null);
    }
  };

  // Download renamed template
  const downloadRenamed = () => {
    if (!renamedBuffer || !baseTemplate) return;

    try {
      // Create a new Uint8Array to ensure proper ArrayBuffer type
      const buffer = new Uint8Array(renamedBuffer);
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseTemplate.fileName.replace('.cpr', '')}-renamed.cpr`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('Downloaded renamed template');
    } catch (error) {
      console.error('Failed to download:', error);
      alert('Failed to download template');
    }
  };

  // Toggle folder selection
  const toggleFolder = (folderPath: string) => {
    if (!folderTree) return;

    const newSelected = new Set(selectedMaps);
    const toggleNode = (node: FolderNode): boolean => {
      if (node.path === folderPath) {
        const shouldSelect = !node.selected && !node.indeterminate;

        const collectMaps = (n: FolderNode): MapFile[] => {
          const maps = [...n.maps];
          Object.values(n.subfolders).forEach(sub => {
            maps.push(...collectMaps(sub));
          });
          return maps;
        };

        const allMaps = collectMaps(node);
        allMaps.forEach(map => {
          if (shouldSelect) {
            newSelected.add(map.path);
          } else {
            newSelected.delete(map.path);
          }
        });

        return true;
      }

      for (const sub of Object.values(node.subfolders)) {
        if (toggleNode(sub)) return true;
      }
      return false;
    };

    toggleNode(folderTree);
    setSelectedMaps(newSelected);
  };

  // Update selection state
  const updateSelectionState = (node: FolderNode): void => {
    Object.values(node.subfolders).forEach(updateSelectionState);

    const allMaps = [...node.maps];
    Object.values(node.subfolders).forEach(sub => {
      allMaps.push(...sub.maps);
    });

    const selectedCount = allMaps.filter(m => selectedMaps.has(m.path)).length;

    if (selectedCount === 0) {
      node.selected = false;
      node.indeterminate = false;
    } else if (selectedCount === allMaps.length) {
      node.selected = true;
      node.indeterminate = false;
    } else {
      node.selected = false;
      node.indeterminate = true;
    }
  };

  if (folderTree) {
    updateSelectionState(folderTree);
  }

  // Generate DAWproject
  const generateDAWproject = async () => {
    if (selectedMaps.size === 0) {
      alert('Please select at least one expression map');
      return;
    }

    setGenerating(true);

    try {
      const selectedMapsList = serverMaps.filter(m => selectedMaps.has(m.path));

      const projectXml = generateProjectXML(selectedMapsList);
      const metadataXml = generateMetadataXML('Custom Template');

      const zip = new JSZip();
      zip.file('project.xml', projectXml);
      zip.file('metadata.xml', metadataXml);

      const blob = await zip.generateAsync({ type: 'blob' });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Custom-Template.dawproject';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate DAWproject:', error);
      alert('Failed to generate DAWproject');
    } finally {
      setGenerating(false);
    }
  };

  const generateProjectXML = (maps: MapFile[]): string => {
    const lines = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<Project version="1.0">');
    lines.push('\t<Application name="Cubby Remote Generator" version="1.0.0" />');
    lines.push('\t<Transport>');
    lines.push('\t\t<Tempo unit="bpm" value="120" />');
    lines.push('\t\t<TimeSignature numerator="4" denominator="4" />');
    lines.push('\t</Transport>');
    lines.push('\t<Structure>');

    maps.forEach((map, index) => {
      const id = 'id' + (index + 1);
      const name = map.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      lines.push(`\t\t<Track contentType="notes" loaded="true" id="${id}" name="${name}" color="#fe7272ff" />`);
    });

    lines.push('\t</Structure>');
    lines.push('</Project>');
    return lines.join('\n');
  };

  const generateMetadataXML = (projectName: string): string => {
    const lines = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<MetaData>');
    lines.push(`\t<Title>${projectName}</Title>`);
    lines.push('\t<Comment>Generated by Cubby Template Builder</Comment>');
    lines.push('</MetaData>');
    return lines.join('\n');
  };

  // Render folder tree
  const renderFolder = (node: FolderNode, depth: number = 0): JSX.Element[] => {
    const elements: JSX.Element[] = [];
    const indent = depth * 20;

    if (node.name !== 'Root') {
      elements.push(
        <div key={node.path} style={{ marginLeft: `${indent}px` }} className="py-1">
          <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-800 px-2 py-1 rounded">
            <input
              type="checkbox"
              checked={node.selected}
              ref={el => { if (el) el.indeterminate = node.indeterminate; }}
              onChange={() => toggleFolder(node.path)}
              className="w-4 h-4"
            />
            <span className="font-semibold text-blue-400">📂 {node.name}</span>
          </label>
        </div>
      );
    }

    const fileIndent = (depth + 1) * 20;
    node.maps.sort((a, b) => a.name.localeCompare(b.name)).forEach(map => {
      elements.push(
        <div key={map.path} style={{ marginLeft: `${fileIndent}px` }} className="py-0.5">
          <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-700 px-2 py-1 rounded text-sm">
            <input
              type="checkbox"
              checked={selectedMaps.has(map.path)}
              onChange={(e) => {
                const newSelected = new Set(selectedMaps);
                if (e.target.checked) {
                  newSelected.add(map.path);
                } else {
                  newSelected.delete(map.path);
                }
                setSelectedMaps(newSelected);
              }}
              className="w-4 h-4"
            />
            <span className="text-gray-300">📄 {map.name}</span>
          </label>
        </div>
      );
    });

    Object.values(node.subfolders).sort((a, b) => a.name.localeCompare(b.name)).forEach(sub => {
      elements.push(...renderFolder(sub, depth + 1));
    });

    return elements;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">Loading expression maps...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Cubase Template Builder</h1>
        <p className="text-gray-400 mb-6">
          Create a blank template from your loaded expression maps with proper track names for this app to work, or drop your existing template and have the tracks renamed. For this app to work, track names must match the names of your loaded expression maps.
        </p>

        {/* Mode Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setMode('dawproject')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              mode === 'dawproject'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <div className="text-xs opacity-70 mb-1">New Setup</div>
            <div>Create DAWproject</div>
          </button>
          <button
            onClick={() => setMode('cpr')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              mode === 'cpr'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <div className="text-xs opacity-70 mb-1">Have Base Template?</div>
            <div>Generate .cpr Variants</div>
          </button>
        </div>

        {mode === 'dawproject' && (
          <div className="space-y-6">
            {/* Info Banner */}
            <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4">
              <h3 className="font-bold text-blue-300 mb-2">Creating a New Base Template</h3>
              <p className="text-gray-300 text-sm">
                Use this to create a DAWproject file that Cubase can import. After importing, you&apos;ll add Kontakt
                instances and expression maps manually in Cubase, then save as a .cpr to use as your base template.
                <strong className="text-blue-300"> You only need to do this once per instrument configuration.</strong>
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Folder Tree */}
              <div className="lg:col-span-2 bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">Expression Maps ({serverMaps.length} total)</h2>
                <div className="max-h-[600px] overflow-y-auto">
                  {folderTree && renderFolder(folderTree)}
                </div>
              </div>

              {/* Summary & Actions */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">Selected Tracks</h2>
                <div className="text-5xl font-bold text-blue-400 mb-2">{selectedMaps.size}</div>
                <div className="text-gray-400 mb-8">instruments</div>

                <button
                  onClick={generateDAWproject}
                  disabled={selectedMaps.size === 0 || generating}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-[1.02]"
                >
                  {generating ? 'Generating...' : '📦 Generate DAWproject'}
                </button>

                <div className="mt-8 p-4 bg-gray-700/50 rounded-lg">
                  <h3 className="font-bold mb-3 text-yellow-400">📋 Next Steps:</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
                    <li>Import DAWproject into Cubase</li>
                    <li>Add Kontakt to each track</li>
                    <li>Load your instruments</li>
                    <li>Assign expression maps</li>
                    <li>Save as <code className="bg-gray-600 px-1 rounded">.cpr</code></li>
                    <li className="text-blue-400 font-semibold">Use that .cpr in Step 2!</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {mode === 'cpr' && (
          <div className="space-y-6">
            {/* Info Banner */}
            <div className="bg-purple-900/30 border border-purple-500/50 rounded-lg p-4">
              <h3 className="font-bold text-purple-300 mb-2">How This Works</h3>
              <p className="text-gray-300 text-sm">
                Drop your Cubase Template and your tracks will be renamed automatically for Cubby Remote to work.
                <br />
                <span className="text-yellow-400">⚠️ Be sure to make a backup of your project first.</span>
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Upload Base Template */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">1. Base Template</h2>

                {!baseTemplate ? (
                  <div className="space-y-4">
                    {savedTemplateName && (
                      <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4">
                        <div className="text-sm text-blue-300 mb-2">Saved template available:</div>
                        <div className="font-semibold text-white mb-3">{savedTemplateName}</div>
                        <div className="flex gap-2">
                          <button
                            onClick={loadSavedTemplate}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors text-sm"
                          >
                            Load Saved
                          </button>
                          <button
                            onClick={clearSavedTemplate}
                            className="bg-gray-600 hover:bg-gray-500 text-white py-2 px-4 rounded transition-colors text-sm"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    )}
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleCprDrop}
                      className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-purple-500 transition-colors cursor-pointer"
                      onClick={() => document.getElementById('cpr-input')?.click()}
                    >
                      <div className="text-4xl mb-4">📁</div>
                      <p className="text-lg mb-2">{savedTemplateName ? 'Or drop a new .cpr' : 'Drop your base .cpr here'}</p>
                      <p className="text-gray-500 text-sm">Cremona Quartet template</p>
                      <input
                        id="cpr-input"
                        type="file"
                        accept=".cpr"
                        onChange={handleCprSelect}
                        className="hidden"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 bg-green-900/30 border border-green-500/50 rounded-lg p-4">
                      <div className="text-2xl">✅</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{baseTemplate.fileName}</div>
                        <div className="text-sm text-gray-400">
                          {(baseTemplate.fileSize / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                      <button
                        onClick={() => setBaseTemplate(null)}
                        className="text-gray-400 hover:text-white p-1"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="text-center text-green-400 font-semibold">
                      {baseTemplate.slots.length} track slots detected
                    </div>
                  </div>
                )}
              </div>

              {/* Track Renaming Preview */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">2. Preview Track Renaming</h2>

                {!baseTemplate ? (
                  <div className="text-center text-gray-500 py-8">
                    <p>Upload a base template first</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {baseTemplate.slots.map((slot, i) => (
                      <div key={i} className="bg-gray-700 rounded-lg p-3">
                        <div className="text-xs text-gray-500 mb-1">Track {i + 1}</div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-400">{slot.trackName}</span>
                          <span className="text-purple-400">→</span>
                          <span className="text-green-400 font-medium">{slot.newTrackName}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Expression Map: {slot.expressionMapName}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Generate */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">3. Generate Renamed Template</h2>

                {baseTemplate && baseTemplate.slots.length > 0 ? (
                  <>
                    {progress ? (
                      <div className="space-y-4">
                        <div className="bg-gray-700 rounded-lg p-4">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-300">{progress.message}</span>
                            <span className="text-purple-400">{progress.current} / {progress.total}</span>
                          </div>
                          <div className="w-full bg-gray-600 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-300"
                              style={{ width: `${(progress.current / progress.total) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : renamedBuffer ? (
                      <>
                        <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-4 mb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-green-400 text-xl">✓</span>
                            <span className="text-green-400 font-medium">Renaming Complete!</span>
                          </div>
                          <p className="text-gray-400 text-sm mt-2">
                            {baseTemplate.slots.length} tracks renamed. Ready to download.
                          </p>
                        </div>

                        <button
                          onClick={downloadRenamed}
                          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-[1.02]"
                        >
                          💾 Download Renamed Template
                        </button>

                        <button
                          onClick={() => setRenamedBuffer(null)}
                          className="w-full mt-2 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium py-2 px-4 rounded-lg transition-all"
                        >
                          Start Over
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={performRenaming}
                          disabled={generating}
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-[1.02]"
                        >
                          🎹 Start Renaming
                        </button>

                        <p className="mt-4 text-xs text-gray-400 text-center">
                          Track names will be updated to match expression maps. Expression map assignments remain unchanged.
                        </p>
                      </>
                    )}
                  </>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <p className="text-sm">Upload a template first</p>
                  </div>
                )}
              </div>
            </div>

            {/* Usage Note */}
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-yellow-400">💡 How It Works</h3>
              <p className="text-sm text-gray-400">
                This tool analyzes your Cubase template and renames tracks to match their assigned expression map names.
                This enables Cubby Remote's auto-switching feature - when you select a track in Cubase, the matching expression map loads automatically.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
