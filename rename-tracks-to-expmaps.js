#!/usr/bin/env node
/**
 * Track ↔ Expression Map Mapping Tool
 *
 * Analyzes a Cubase .cpr file to find track names and their expression map assignments.
 * Generates commands to copy expression map files with names matching track names.
 * This enables auto-switching in Cubby Remote.
 *
 * Usage:
 *   node rename-tracks-to-expmaps.js <input.cpr> [--copy-maps <source-dir> <dest-dir>]
 *
 * Options:
 *   --copy-maps <source> <dest>  Copy expression map files with track-matching names
 *
 * Can also be used as a module:
 *   const { analyzeCprFile, copyExpressionMaps } = require('./rename-tracks-to-expmaps');
 */

const fs = require('fs');
const path = require('path');

function findAllString(buffer, str) {
  const searchBytes = Buffer.from(str, 'utf8');
  const positions = [];
  for (let i = 0; i <= buffer.length - searchBytes.length; i++) {
    let match = true;
    for (let j = 0; j < searchBytes.length && match; j++) {
      if (buffer[i + j] !== searchBytes[j]) match = false;
    }
    if (match) positions.push(i);
  }
  return positions;
}

function readNullTerminatedString(buffer, offset, maxLen = 200) {
  let end = offset;
  while (end < offset + maxLen && buffer[end] !== 0) end++;
  return buffer.slice(offset, end).toString('utf8');
}

// Find expression map assignments
// Pattern: "All MIDI Inputs"[padding]"All MIDI Inputs"[00 00 00 00 01 00 00 00][len][name]
function findExpressionMapAssignments(buffer) {
  const assignments = [];
  const marker = 'All MIDI Inputs';
  const positions = findAllString(buffer, marker);

  for (let i = 0; i < positions.length - 1; i++) {
    const pos1 = positions[i];
    const pos2 = positions[i + 1];
    const distance = pos2 - pos1;

    // Two "All MIDI Inputs" should be 20-30 bytes apart
    if (distance >= 20 && distance <= 35) {
      // After second "All MIDI Inputs" + length (16 bytes), look for pattern
      const afterSecond = pos2 + 16; // "All MIDI Inputs" = 15 chars + null

      // Search for 01 00 00 00 [len] pattern
      for (let j = 0; j < 20; j++) {
        const checkPos = afterSecond + j;
        if (checkPos + 10 >= buffer.length) break;

        if (buffer[checkPos] === 0x01 &&
            buffer[checkPos + 1] === 0x00 &&
            buffer[checkPos + 2] === 0x00 &&
            buffer[checkPos + 3] === 0x00) {

          const lenByte = buffer[checkPos + 4];
          if (lenByte > 10 && lenByte < 100) {
            const nameLen = lenByte - 4; // Subtract null + BOM
            const nameStart = checkPos + 5;
            const name = readNullTerminatedString(buffer, nameStart, nameLen + 10);

            if (name && name.length > 5 && !name.startsWith('\x00')) {
              assignments.push({
                expMapName: name,
                nameStart: nameStart,
                nameLen: name.length,
                lenBytePos: checkPos + 4,
                allMidiPos: pos1
              });
              i++; // Skip the paired position
              break;
            }
          }
        }
      }
    }
  }

  return assignments;
}

// Find main track names (those followed by "Bus UID" marker)
function findTrackNames(buffer) {
  const tracks = [];
  const busUidMarker = Buffer.from('Bus UID', 'utf8');

  for (let i = 0; i < buffer.length - 100; i++) {
    // Look for Name field: Name\x00\x00\x08[00 00 00 len][name]..Bus UID
    // Pattern at 0x6760: 4e616d65 00 00 08 00000015 "Stradivari Violin"
    if (buffer[i] === 0x4e && buffer[i + 1] === 0x61 && buffer[i + 2] === 0x6d &&
        buffer[i + 3] === 0x65 && buffer[i + 4] === 0x00 && buffer[i + 5] === 0x00 &&
        buffer[i + 6] === 0x08) {
      // Length is at i+7 (4 bytes, big-endian)
      const len = buffer.readUInt32BE(i + 7);
      if (len > 8 && len < 100) {
        const nameLen = len - 4; // Subtract null + BOM
        const nameStart = i + 11; // After "Name\0\0\x08" (7 bytes) + length (4 bytes)
        const name = buffer.slice(nameStart, nameStart + nameLen).toString('utf8').replace(/\x00.*$/, '');

        // Check if followed by "Bus UID" (main track indicator)
        const searchEnd = Math.min(nameStart + len + 30, buffer.length);
        for (let j = nameStart + nameLen; j < searchEnd; j++) {
          if (buffer.slice(j, j + 7).equals(busUidMarker)) {
            tracks.push({
              name,
              nameStart,
              nameLen,
              lenPos: i + 7
            });
            break;
          }
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

// Match track to expression map by name similarity
function findTrackForExpMap(expMapName, trackList) {
  // Expression map names often contain the track name
  // E.g., "NICRQ Stradivari Violin Multi Mic Attribute" contains "Stradivari Violin"

  let bestMatch = null;
  let bestScore = 0;

  for (const track of trackList) {
    // Check if expression map name contains track name (case-insensitive)
    const expLower = expMapName.toLowerCase();
    const trackLower = track.name.toLowerCase();

    if (expLower.includes(trackLower)) {
      // Longer match is better
      const score = trackLower.length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = track;
      }
    }
  }

  return bestMatch;
}

// Convert internal expression map name to file-friendly name
function expMapToFileName(internalName) {
  // Common patterns:
  // "NICRQ Amati Viola Multi Mic Attribute" → "NICRQ Amati Viola Multi Mic A" (for Attribute type)
  // "NICRQ Amati Viola Multi Mic Direction" → "NICRQ Amati Viola Multi Mic D" (for Direction type)

  if (internalName.endsWith(' Attribute')) {
    return internalName.replace(' Attribute', ' A');
  }
  if (internalName.endsWith(' Direction')) {
    return internalName.replace(' Direction', ' D');
  }
  return internalName;
}

/**
 * Analyze a .cpr file and return track/expression map mappings
 * @param {string} cprFilePath - Path to the .cpr file
 * @returns {Object} Analysis results with tracks, assignments, mappings, and unmatched items
 */
function analyzeCprFile(cprFilePath) {
  const buffer = Buffer.from(fs.readFileSync(cprFilePath));

  // Find track names
  const tracks = findTrackNames(buffer);

  // Find expression map assignments
  const assignments = findExpressionMapAssignments(buffer);

  // Match tracks to expression maps by name similarity
  const mappings = [];
  for (const a of assignments) {
    const track = findTrackForExpMap(a.expMapName, tracks);
    if (track && !mappings.some(m => m.trackName === track.name)) {
      mappings.push({
        trackName: track.name,
        expMapInternal: a.expMapName,
        expMapFileName: expMapToFileName(a.expMapName)
      });
    }
  }

  // Find unmatched items
  const matchedExpMaps = new Set(mappings.map(m => m.expMapInternal));
  const matchedTracks = new Set(mappings.map(m => m.trackName));
  const systemTracks = ['KT Out 1', 'Stereo In', 'Right', 'Stereo Out', 'Left'];

  const unmatchedExpMaps = assignments
    .filter(a => !matchedExpMaps.has(a.expMapName))
    .map(a => a.expMapName);

  const unmatchedTracks = tracks
    .filter(t => !matchedTracks.has(t.name) && !systemTracks.includes(t.name))
    .map(t => t.name);

  return {
    filePath: cprFilePath,
    fileSize: buffer.length,
    tracks: tracks.map(t => t.name),
    assignments: assignments.map(a => a.expMapName),
    mappings,
    unmatchedExpMaps,
    unmatchedTracks
  };
}

/**
 * Copy expression map files with track-matching names
 * @param {Array} mappings - Array of {trackName, expMapFileName} objects
 * @param {string} sourceDir - Source directory containing expression maps
 * @param {string} destDir - Destination directory for copied files
 * @returns {Object} Results with copied and notFound counts
 */
function copyExpressionMaps(mappings, sourceDir, destDir) {
  // Ensure dest dir exists
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const results = { copied: [], notFound: [] };

  for (const m of mappings) {
    const sourceFile = path.join(sourceDir, `${m.expMapFileName}.expressionmap`);
    const destFile = path.join(destDir, `${m.trackName}.expressionmap`);

    if (fs.existsSync(sourceFile)) {
      fs.copyFileSync(sourceFile, destFile);
      results.copied.push({ track: m.trackName, from: sourceFile });
    } else {
      // Try searching subdirectories
      let found = false;
      const searchDir = (dir) => {
        if (found) return;
        try {
          const items = fs.readdirSync(dir, { withFileTypes: true });
          for (const item of items) {
            if (found) return;
            if (item.isDirectory()) {
              searchDir(path.join(dir, item.name));
            } else if (item.name === `${m.expMapFileName}.expressionmap`) {
              fs.copyFileSync(path.join(dir, item.name), destFile);
              results.copied.push({ track: m.trackName, from: path.join(dir, item.name) });
              found = true;
            }
          }
        } catch (e) {}
      };

      searchDir(sourceDir);
      if (!found) {
        results.notFound.push({ track: m.trackName, expected: `${m.expMapFileName}.expressionmap` });
      }
    }
  }

  return results;
}

// Export for use as module
module.exports = { analyzeCprFile, copyExpressionMaps, findTrackNames, findExpressionMapAssignments, expMapToFileName };

// CLI entry point - only runs when executed directly
if (require.main === module) {
  const INPUT_FILE = process.argv[2];
  const COPY_MODE = process.argv[3] === '--copy-maps';
  const SOURCE_DIR = COPY_MODE ? process.argv[4] : null;
  const DEST_DIR = COPY_MODE ? process.argv[5] : null;

  if (!INPUT_FILE) {
    console.log('Usage: node rename-tracks-to-expmaps.js <input.cpr> [--copy-maps <source-dir> <dest-dir>]');
    console.log('\nAnalyzes a .cpr file and shows track → expression map mappings.');
    console.log('\nOptions:');
    console.log('  --copy-maps <source> <dest>  Copy expression map files with track-matching names');
    console.log('\nExample:');
    console.log('  node rename-tracks-to-expmaps.js template.cpr');
    console.log('  node rename-tracks-to-expmaps.js template.cpr --copy-maps ~/ExpressionMaps ./expression-maps');
    process.exit(1);
  }

  (async function main() {
    console.log('=== Track ↔ Expression Map Mapping Tool ===\n');

    const analysis = analyzeCprFile(INPUT_FILE);

    console.log(`File: ${INPUT_FILE}`);
    console.log(`Size: ${(analysis.fileSize / 1024 / 1024).toFixed(2)} MB\n`);
    console.log(`Found ${analysis.tracks.length} unique tracks`);
    console.log(`Matched ${analysis.mappings.length} track → expression map pairs\n`);

    if (analysis.mappings.length === 0) {
      console.log('No track/expression map mappings found.');
      console.log('This might be a template without expression maps assigned.\n');

      if (analysis.tracks.length > 0) {
        console.log('Tracks found in template:');
        analysis.tracks.forEach(t => console.log(`  - ${t}`));
      }
      process.exit(1);
    }

    // Display mappings
    console.log('┌──────────────────────────────────────────────────────────────────────────────┐');
    console.log('│ Current Track Name    │ Assigned Expression Map → File Name                 │');
    console.log('├──────────────────────────────────────────────────────────────────────────────┤');

    analysis.mappings.forEach((m, i) => {
      console.log(`│ ${(i + 1).toString().padStart(2)}. "${m.trackName}"`);
      console.log(`│     Exp Map: ${m.expMapInternal}`);
      console.log(`│     File:    ${m.expMapFileName}.expressionmap`);
      console.log('│');
    });

    console.log('└──────────────────────────────────────────────────────────────────────────────┘');

    // Solution 1: Copy expression map files to match track names
    console.log('\n═══════════════════════════════════════════════════════════════════════════════');
    console.log('  SOLUTION: Copy expression maps with track-matching names');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('\nFor auto-switching to work, expression map FILE names must match track names.');
    console.log('Copy the expression map files with new names matching the track names:\n');

    analysis.mappings.forEach(m => {
      console.log(`# Track: "${m.trackName}"`);
      console.log(`cp "${m.expMapFileName}.expressionmap" "${m.trackName}.expressionmap"`);
      console.log('');
    });

    // If --copy-maps mode
    if (COPY_MODE && SOURCE_DIR && DEST_DIR) {
      console.log('\n═══════════════════════════════════════════════════════════════════════════════');
      console.log('  COPYING EXPRESSION MAP FILES');
      console.log('═══════════════════════════════════════════════════════════════════════════════\n');

      const results = copyExpressionMaps(analysis.mappings, SOURCE_DIR, DEST_DIR);

      results.copied.forEach(c => {
        console.log(`✓ Copied: "${c.track}.expressionmap"`);
      });
      results.notFound.forEach(n => {
        console.log(`✗ Not found: "${n.expected}"`);
      });

      console.log(`\n${results.copied.length} files copied, ${results.notFound.length} not found`);
    }

    // Show unmatched items
    if (analysis.unmatchedExpMaps.length > 0 || analysis.unmatchedTracks.length > 0) {
      console.log('\n═══════════════════════════════════════════════════════════════════════════════');
      console.log('  ⚠ UNMATCHED ITEMS (potential name mismatches in template)');
      console.log('═══════════════════════════════════════════════════════════════════════════════\n');

      if (analysis.unmatchedExpMaps.length > 0) {
        console.log('Expression maps with no matching track:');
        analysis.unmatchedExpMaps.forEach(name => {
          console.log(`  - ${name}`);
        });
        console.log('');
      }

      if (analysis.unmatchedTracks.length > 0) {
        console.log('Tracks with no matching expression map:');
        analysis.unmatchedTracks.forEach(name => {
          console.log(`  - ${name}`);
        });
      }
    }

    // Alternative solution info
    console.log('\n═══════════════════════════════════════════════════════════════════════════════');
    console.log('  ALTERNATIVE: Rename tracks in Cubase');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('\nIf you prefer to keep expression map file names as-is, rename the tracks');
    console.log('in Cubase to match the expression map file names:');
    console.log('');
    analysis.mappings.forEach(m => {
      if (m.trackName !== m.expMapFileName) {
        console.log(`  "${m.trackName}" → "${m.expMapFileName}"`);
      }
    });
  })().catch(console.error);
}
