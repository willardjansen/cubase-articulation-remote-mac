#!/usr/bin/env node

/**
 * Expression Map Renamer
 *
 * Strips library codes and mic suffixes from expression map filenames
 * Example: "8DAGE1 Piano Main Mics A.expressionmap" → "Piano.expressionmap"
 *          "VSPME 31 Bassoon 1 A.expressionmap" → "Bassoon 1.expressionmap"
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Common suffix patterns to remove (in order of specificity)
const SUFFIXES_TO_REMOVE = [
    / Main Mics [A-D]$/i,
    / Spot Mics [A-D]$/i,
    / Synth [A-D]$/i,
    / CB Multi Mic [A-D]$/i,
    / Multi Mic [A-D]$/i,
    / -MC -SL$/i,
    / Attribute$/i,
    / [A-D]$/,  // Single letter at the end
];

// Common prefix patterns (library codes)
const PREFIX_PATTERNS = [
    /^[A-Z0-9]+\s+\d+\s+/,  // e.g., "VSPME 31 "
    /^[A-Z0-9]+\s+/,         // e.g., "8DAGE1 "
    /^NICRQS\s+/i,           // e.g., "NICRQS "
];

function cleanInstrumentName(filename) {
    // Remove .expressionmap extension
    let name = filename.replace(/\.expressionmap$/i, '');

    // Remove prefix (library code)
    for (const pattern of PREFIX_PATTERNS) {
        if (pattern.test(name)) {
            name = name.replace(pattern, '');
            break;
        }
    }

    // Remove suffixes (mic positions, variants)
    for (const pattern of SUFFIXES_TO_REMOVE) {
        name = name.replace(pattern, '');
    }

    // Clean up any extra whitespace
    name = name.trim();

    // Add extension back
    return name + '.expressionmap';
}

function scanFolder(folderPath) {
    const files = fs.readdirSync(folderPath);
    const expressionMaps = files.filter(f => f.toLowerCase().endsWith('.expressionmap'));

    const renames = expressionMaps.map(oldName => {
        const newName = cleanInstrumentName(oldName);
        return {
            oldName,
            newName,
            oldPath: path.join(folderPath, oldName),
            newPath: path.join(folderPath, newName),
            changed: oldName !== newName
        };
    });

    return renames;
}

function displayPreview(renames) {
    console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
    console.log('║                     EXPRESSION MAP RENAME PREVIEW                         ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

    const changedFiles = renames.filter(r => r.changed);
    const unchangedFiles = renames.filter(r => !r.changed);

    if (changedFiles.length === 0) {
        console.log('  ✓ No files need renaming (all names already clean)\n');
        return false;
    }

    console.log(`  Files to rename: ${changedFiles.length}`);
    console.log(`  Files unchanged: ${unchangedFiles.length}`);
    console.log(`  Total files: ${renames.length}\n`);

    console.log('  Changes:\n');

    const maxOldLength = Math.min(60, Math.max(...changedFiles.map(r => r.oldName.length)));

    changedFiles.forEach((rename, index) => {
        const oldTrunc = rename.oldName.length > 60
            ? '...' + rename.oldName.slice(-57)
            : rename.oldName;
        const newTrunc = rename.newName.length > 60
            ? '...' + rename.newName.slice(-57)
            : rename.newName;

        console.log(`  ${(index + 1).toString().padStart(3)}. ${oldTrunc}`);
        console.log(`       → ${newTrunc}\n`);
    });

    // Check for duplicate target names
    const newNames = changedFiles.map(r => r.newName);
    const duplicates = newNames.filter((name, index) => newNames.indexOf(name) !== index);

    if (duplicates.length > 0) {
        console.log('\n  ⚠️  WARNING: Duplicate target names detected:');
        [...new Set(duplicates)].forEach(name => {
            console.log(`     - ${name}`);
        });
        console.log('     Some files would overwrite each other!\n');
        return false;
    }

    return true;
}

async function promptUser(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => {
        rl.question(question, answer => {
            rl.close();
            resolve(answer);
        });
    });
}

async function performRenames(renames) {
    const changedFiles = renames.filter(r => r.changed);

    let successCount = 0;
    let errorCount = 0;

    console.log('\n  Renaming files...\n');

    for (const rename of changedFiles) {
        try {
            fs.renameSync(rename.oldPath, rename.newPath);
            console.log(`  ✓ ${rename.newName}`);
            successCount++;
        } catch (error) {
            console.log(`  ✗ ${rename.oldName}`);
            console.log(`    Error: ${error.message}`);
            errorCount++;
        }
    }

    console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
    console.log('║                              RESULTS                                      ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');
    console.log(`  Successfully renamed: ${successCount} files`);
    if (errorCount > 0) {
        console.log(`  Errors: ${errorCount} files`);
    }
    console.log('');
}

async function main() {
    console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
    console.log('║              Expression Map Bulk Renamer for Cubby Remote                ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

    // Get folder path from command line or prompt
    let folderPath = process.argv[2];

    if (!folderPath) {
        folderPath = await promptUser('  Enter folder path: ');
    }

    folderPath = folderPath.trim().replace(/^["']|["']$/g, ''); // Remove quotes if present

    // Validate folder
    if (!fs.existsSync(folderPath)) {
        console.error(`\n  ✗ Error: Folder not found: ${folderPath}\n`);
        process.exit(1);
    }

    if (!fs.statSync(folderPath).isDirectory()) {
        console.error(`\n  ✗ Error: Not a directory: ${folderPath}\n`);
        process.exit(1);
    }

    console.log(`\n  Scanning: ${folderPath}\n`);

    // Scan and preview
    const renames = scanFolder(folderPath);

    if (renames.length === 0) {
        console.log('  ✗ No .expressionmap files found in this folder\n');
        process.exit(0);
    }

    const canRename = displayPreview(renames);

    if (!canRename) {
        console.log('  Cannot proceed with rename due to errors shown above.\n');
        process.exit(1);
    }

    // Confirm
    const answer = await promptUser('\n  Proceed with rename? (yes/no): ');

    if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
        console.log('\n  ✗ Rename cancelled.\n');
        process.exit(0);
    }

    // Perform renames
    await performRenames(renames);
}

// Run
main().catch(error => {
    console.error('\n  ✗ Unexpected error:', error.message, '\n');
    process.exit(1);
});
