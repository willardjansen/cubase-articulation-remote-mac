// Types for Cubase Expression Map parsing

export interface MidiMessage {
  status: number;    // 144 = Note On, 176 = CC
  data1: number;     // Note number or CC number
  data2: number;     // Velocity or CC value
}

export interface RemoteTrigger {
  status: number;    // 144 = Note On (default)
  data1: number;     // MIDI note number to trigger this articulation
  isAutoAssigned?: boolean; // True if we auto-assigned this (not in original file)
}

export interface Articulation {
  id: string;
  name: string;
  shortName: string;
  description: string;
  color: number;
  group: number;
  midiMessages: MidiMessage[];  // Output MIDI (sent to sampler by Cubase)
  remoteTrigger?: RemoteTrigger; // Remote trigger (what WE send to activate in Cubase)
  keySwitch?: number;  // Key switch note if defined
  articulationType: number; // 0 = attribute, 1 = direction
  midiChannel?: number; // For merged maps: which channel to send on (0-15)
  sourceMap?: string; // For merged maps: which expression map this came from
}

export interface ExpressionMap {
  name: string;
  fileName: string;
  articulations: Articulation[];
  isMerged?: boolean; // True if this is a merged map from multiple sources
  sourceMapNames?: string[]; // Names of maps that were merged
}

// Color mapping from Cubase color indices to CSS colors
export const CUBASE_COLORS: Record<number, string> = {
  0: '#808080',   // Gray (default)
  1: '#e74c3c',   // Red
  2: '#3498db',   // Blue
  3: '#2ecc71',   // Green
  4: '#f39c12',   // Orange
  5: '#9b59b6',   // Purple
  6: '#1abc9c',   // Teal
  7: '#e91e63',   // Pink
  8: '#00bcd4',   // Cyan
  9: '#ff5722',   // Deep Orange
  10: '#8bc34a',  // Light Green
  11: '#ffeb3b', // Yellow
  12: '#795548', // Brown
  13: '#607d8b', // Blue Gray
  14: '#673ab7', // Deep Purple
  15: '#03a9f4', // Light Blue
  16: '#cddc39', // Lime
};

export function parseExpressionMap(xmlContent: string, fileName: string): ExpressionMap {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'text/xml');
  
  // Get the map name
  const nameElement = doc.querySelector('InstrumentMap > string[name="name"]');
  const mapName = nameElement?.getAttribute('value') || fileName;
  
  // Parse all PSoundSlot elements (these are the articulations with MIDI data)
  const soundSlots = doc.querySelectorAll('obj[class="PSoundSlot"]');
  const articulations: Articulation[] = [];
  
  soundSlots.forEach((slot, index) => {
    // Get the articulation name
    const nameStr = slot.querySelector('member[name="name"] > string[name="s"]');
    const name = nameStr?.getAttribute('value') || `Articulation ${index}`;
    
    // Skip empty/default slots
    if (name === '---' || name === '') return;
    
    // Get visual information
    const svSection = slot.querySelector('member[name="sv"]');
    const slotVisuals = svSection?.querySelector('obj[class="USlotVisuals"]');
    
    const shortName = slotVisuals?.querySelector('string[name="text"]')?.getAttribute('value') || name;
    const description = slotVisuals?.querySelector('string[name="description"]')?.getAttribute('value') || name;
    const group = parseInt(slotVisuals?.querySelector('int[name="group"]')?.getAttribute('value') || '0');
    const articulationType = parseInt(slotVisuals?.querySelector('int[name="articulationtype"]')?.getAttribute('value') || '0');
    
    // Get color
    const colorValue = parseInt(slot.querySelector('int[name="color"]')?.getAttribute('value') || '0');
    
    // Get MIDI messages
    const midiMessages: MidiMessage[] = [];
    const outputEvents = slot.querySelectorAll('member[name="midiMessages"] obj[class="POutputEvent"]');
    
    outputEvents.forEach(event => {
      const status = parseInt(event.querySelector('int[name="status"]')?.getAttribute('value') || '144');
      const data1 = parseInt(event.querySelector('int[name="data1"]')?.getAttribute('value') || '0');
      const data2 = parseInt(event.querySelector('int[name="data2"]')?.getAttribute('value') || '127');
      
      midiMessages.push({ status, data1, data2 });
    });
    
    // Get key switch (from action section)
    const actionSection = slot.querySelector('obj[class="PSlotMidiAction"]');
    const keySwitchValue = actionSection?.querySelector('int[name="key"]')?.getAttribute('value');
    const keySwitch = keySwitchValue ? parseInt(keySwitchValue) : undefined;

    // Get remote trigger (PSlotThruTrigger) - this is what we send FROM iPad TO Cubase
    const remoteTriggerElement = slot.querySelector('obj[class="PSlotThruTrigger"][name="remote"]');
    let remoteTrigger: RemoteTrigger | undefined;

    if (remoteTriggerElement) {
      const remoteStatus = parseInt(remoteTriggerElement.querySelector('int[name="status"]')?.getAttribute('value') || '144');
      const remoteData1 = parseInt(remoteTriggerElement.querySelector('int[name="data1"]')?.getAttribute('value') || '-1');

      // Only create remote trigger if data1 is valid (not -1)
      if (remoteData1 >= 0 && remoteData1 <= 127) {
        remoteTrigger = {
          status: remoteStatus,
          data1: remoteData1,
          isAutoAssigned: false,
        };
      }
    }

    articulations.push({
      id: `art_${index}_${Date.now()}`,
      name,
      shortName,
      description,
      color: colorValue,
      group,
      midiMessages,
      remoteTrigger,
      keySwitch: keySwitch === -1 || keySwitch === 127 ? undefined : keySwitch,
      articulationType,
    });
  });
  
  return {
    name: mapName,
    fileName,
    articulations,
  };
}

// Helper to convert MIDI note number to note name
export function midiNoteToName(note: number): string {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(note / 12) - 2; // MIDI octave convention
  const noteName = notes[note % 12];
  return `${noteName}${octave}`;
}

// Group articulations by their group number
export function groupArticulations(articulations: Articulation[]): Map<number, Articulation[]> {
  const groups = new Map<number, Articulation[]>();

  articulations.forEach(art => {
    const existing = groups.get(art.group) || [];
    existing.push(art);
    groups.set(art.group, existing);
  });

  return groups;
}

// Auto-assign remote triggers to articulations that don't have them
// Starts from startNote (default C-2 = MIDI note 0) and increments
export function autoAssignRemoteTriggers(
  map: ExpressionMap,
  startNote: number = 0
): ExpressionMap {
  // Collect already-used remote notes to avoid conflicts
  const usedNotes = new Set<number>();
  map.articulations.forEach(art => {
    if (art.remoteTrigger && !art.remoteTrigger.isAutoAssigned) {
      usedNotes.add(art.remoteTrigger.data1);
    }
  });

  let nextNote = startNote;

  // Find next available note
  const getNextAvailableNote = (): number => {
    while (usedNotes.has(nextNote) && nextNote <= 127) {
      nextNote++;
    }
    if (nextNote > 127) {
      throw new Error('No more available MIDI notes for remote triggers');
    }
    const note = nextNote;
    usedNotes.add(note);
    nextNote++;
    return note;
  };

  // Create new articulations array with auto-assigned triggers
  const updatedArticulations = map.articulations.map(art => {
    if (art.remoteTrigger) {
      return art; // Already has a trigger
    }

    return {
      ...art,
      remoteTrigger: {
        status: 144, // Note On
        data1: getNextAvailableNote(),
        isAutoAssigned: true,
      },
    };
  });

  return {
    ...map,
    articulations: updatedArticulations,
  };
}

// Check if any articulations in the map need auto-assigned remote triggers
export function hasUnassignedRemotes(map: ExpressionMap): boolean {
  return map.articulations.some(art => !art.remoteTrigger);
}

// Count how many articulations have auto-assigned remote triggers
export function countAutoAssignedRemotes(map: ExpressionMap): number {
  return map.articulations.filter(
    art => art.remoteTrigger?.isAutoAssigned
  ).length;
}

// Export remote trigger assignments as CSV for user reference
export function exportRemoteAssignmentsCSV(map: ExpressionMap): string {
  const lines = ['Articulation Name,Short Name,Remote Note,MIDI Note Number,Auto-Assigned'];

  map.articulations.forEach(art => {
    const noteName = art.remoteTrigger ? midiNoteToName(art.remoteTrigger.data1) : 'N/A';
    const noteNum = art.remoteTrigger?.data1 ?? -1;
    const isAuto = art.remoteTrigger?.isAutoAssigned ? 'Yes' : 'No';
    // Escape commas and quotes in names
    const escapeName = (s: string) => `"${s.replace(/"/g, '""')}"`;
    lines.push(`${escapeName(art.name)},${escapeName(art.shortName)},${noteName},${noteNum},${isAuto}`);
  });

  return lines.join('\n');
}

// Generate download of CSV file
export function downloadRemoteAssignments(map: ExpressionMap): void {
  const csv = exportRemoteAssignmentsCSV(map);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${map.name.replace(/[^a-zA-Z0-9]/g, '_')}_remote_assignments.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Merge multiple expression maps into one combined map
// Each map is assigned a MIDI channel based on its position (0-indexed)
export function mergeExpressionMaps(
  maps: ExpressionMap[],
  name?: string
): ExpressionMap {
  const allArticulations: Articulation[] = [];

  maps.forEach((map, mapIndex) => {
    map.articulations.forEach((art, artIndex) => {
      allArticulations.push({
        ...art,
        id: `merged_${mapIndex}_${artIndex}_${Date.now()}`,
        midiChannel: mapIndex, // Channel 0 for first map, 1 for second, etc.
        sourceMap: map.name,
        // Prefix short name with part indicator for clarity
        shortName: art.shortName,
        group: mapIndex, // Use map index as group to keep them visually separated
      });
    });
  });

  // Generate merged name from source maps
  const mergedName = name || extractCommonName(maps.map(m => m.name)) || 'Merged Map';

  return {
    name: mergedName,
    fileName: 'merged',
    articulations: allArticulations,
    isMerged: true,
    sourceMapNames: maps.map(m => m.name),
  };
}

// Extract common part of map names (e.g., "Amati Viola" from "Amati Viola Part 1", "Amati Viola Part 2")
function extractCommonName(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];

  // Find common prefix
  let common = names[0];
  for (let i = 1; i < names.length; i++) {
    while (!names[i].startsWith(common) && common.length > 0) {
      common = common.slice(0, -1);
    }
  }

  // Trim trailing spaces, "Part", numbers, etc.
  common = common.replace(/\s*(Part|Attribute|Direction|\d+)\s*$/gi, '').trim();

  return common || 'Merged Map';
}
