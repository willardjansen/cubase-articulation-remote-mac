#!/usr/bin/env node

/**
 * Expression Map Analyzer
 * Analyzes folder structure and naming patterns to propose solutions
 */

const fs = require('fs');
const path = require('path');

function getAllExpressionMaps(baseDir) {
    const results = [];

    function walk(dir, relativePath = '') {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relPath = path.join(relativePath, entry.name);

            if (entry.isDirectory()) {
                walk(fullPath, relPath);
            } else if (entry.name.toLowerCase().endsWith('.expressionmap')) {
                // Parse the path
                const parts = relPath.split(path.sep);

                // Skip first two "Art Conductor Cubase" folders if present
                let cleanParts = parts;
                if (parts[0] === 'Art Conductor Cubase' && parts[1] === 'Art Conductor Cubase') {
                    cleanParts = parts.slice(2);
                }

                const vendor = cleanParts[0] || '';
                const product = cleanParts[1] || '';
                const filename = cleanParts[cleanParts.length - 1];

                results.push({
                    fullPath,
                    relativePath: relPath,
                    vendor,
                    product,
                    filename,
                    folderPath: cleanParts.slice(0, -1).join('/'),
                });
            }
        }
    }

    walk(baseDir);
    return results;
}

function analyzeNamingPatterns(maps) {
    console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
    console.log('║                     EXPRESSION MAP ANALYSIS                               ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

    console.log(`  Total expression maps: ${maps.length.toLocaleString()}\n`);

    // Analyze by vendor
    const byVendor = {};
    maps.forEach(m => {
        if (!byVendor[m.vendor]) byVendor[m.vendor] = 0;
        byVendor[m.vendor]++;
    });

    console.log('  Top 10 Vendors:\n');
    Object.entries(byVendor)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([vendor, count], i) => {
            console.log(`  ${(i + 1).toString().padStart(2)}. ${vendor.padEnd(30)} ${count.toLocaleString().padStart(6)} maps`);
        });

    // Analyze filename conflicts if we stripped everything
    console.log('\n\n  Analyzing potential conflicts if filenames were simplified...\n');

    const bareNames = {};
    maps.forEach(m => {
        // Simulate stripping prefixes
        let bare = m.filename.replace(/\.expressionmap$/i, '');

        // Remove common patterns
        bare = bare.replace(/^[A-Z0-9]+\s+\d+\s+/, '');  // "VSPME 01 "
        bare = bare.replace(/^[A-Z0-9]+\s+/, '');        // "8DAGE1 "
        bare = bare.replace(/\s+[A-D]$/, '');            // " A"
        bare = bare.replace(/\s+Main Mics [A-D]$/i, ''); // " Main Mics A"
        bare = bare.replace(/\s+Spot Mics [A-D]$/i, ''); // " Spot Mics A"
        bare = bare.replace(/\s+~$/, '');                // " ~"
        bare = bare.trim();

        if (!bareNames[bare]) {
            bareNames[bare] = [];
        }
        bareNames[bare].push(m);
    });

    const conflicts = Object.entries(bareNames).filter(([name, maps]) => maps.length > 1);

    console.log(`  Unique instrument names after stripping: ${Object.keys(bareNames).length.toLocaleString()}`);
    console.log(`  Conflicts (same name, different files): ${conflicts.length.toLocaleString()}\n`);

    console.log('  Top 20 Conflicts:\n');
    conflicts
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 20)
        .forEach(([name, maps], i) => {
            console.log(`  ${(i + 1).toString().padStart(2)}. "${name}" (${maps.length} files)`);
            if (i < 5) {
                // Show vendors for first 5
                const vendors = [...new Set(maps.map(m => m.vendor))];
                console.log(`      From vendors: ${vendors.slice(0, 3).join(', ')}${vendors.length > 3 ? ', ...' : ''}`);
            }
        });

    // Analyze folder structure depth
    console.log('\n\n  Folder Structure Analysis:\n');

    const folderDepths = maps.map(m => m.relativePath.split(path.sep).length);
    const avgDepth = folderDepths.reduce((a, b) => a + b, 0) / folderDepths.length;

    console.log(`  Average folder depth: ${avgDepth.toFixed(1)} levels`);
    console.log(`  Min depth: ${Math.min(...folderDepths)} levels`);
    console.log(`  Max depth: ${Math.max(...folderDepths)} levels\n`);

    // Sample paths
    console.log('  Sample folder structures:\n');
    maps.slice(0, 10).forEach((m, i) => {
        const shortenedPath = m.folderPath.length > 70
            ? '...' + m.folderPath.slice(-67)
            : m.folderPath;
        console.log(`  ${(i + 1).toString().padStart(2)}. ${shortenedPath}`);
    });
}

function proposeSolutions(maps) {
    console.log('\n\n╔═══════════════════════════════════════════════════════════════════════════╗');
    console.log('║                         PROPOSED SOLUTIONS                                ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

    console.log('  Given your library structure with 30,000+ maps from multiple vendors,');
    console.log('  here are the recommended approaches:\n');

    console.log('  ╔═══════════════════════════════════════════════════════════════════════╗');
    console.log('  ║ OPTION 1: Folder-Aware Matching (RECOMMENDED)                        ║');
    console.log('  ╠═══════════════════════════════════════════════════════════════════════╣');
    console.log('  ║  Modify the app to use folder context when matching:                 ║');
    console.log('  ║                                                                       ║');
    console.log('  ║  Cubase Track:                                                        ║');
    console.log('  ║    Name: "Piccolo"                                                    ║');
    console.log('  ║    Folder: "VSL/Prime/Wood"                                           ║');
    console.log('  ║                                                                       ║');
    console.log('  ║  App searches:                                                        ║');
    console.log('  ║    VSL/**/Wood/*Piccolo*.expressionmap                                ║');
    console.log('  ║                                                                       ║');
    console.log('  ║  Pros: No renaming needed, preserves organization                     ║');
    console.log('  ║  Cons: Requires Cubase MIDI Remote API to read track folder          ║');
    console.log('  ║        (NOT available - see research)                                 ║');
    console.log('  ╚═══════════════════════════════════════════════════════════════════════╝\n');

    console.log('  ╔═══════════════════════════════════════════════════════════════════════╗');
    console.log('  ║ OPTION 2: Vendor/Product Prefix in Track Names (PRACTICAL)           ║');
    console.log('  ╠═══════════════════════════════════════════════════════════════════════╣');
    console.log('  ║  Name Cubase tracks to include vendor/product info:                  ║');
    console.log('  ║                                                                       ║');
    console.log('  ║  Cubase Track: "VSL Prime Piccolo"                                    ║');
    console.log('  ║  Expression Map: "VSL/Prime/Wood/VSPME 01 Piccolo Flute A"            ║');
    console.log('  ║  Match: Substring "prime piccolo" in folder path + filename          ║');
    console.log('  ║                                                                       ║');
    console.log('  ║  Cubase Track: "Spitfire SSO Oboe 1"                                  ║');
    console.log('  ║  Expression Map: "Spitfire Audio/SSO/SFSSOP Oboe 1 A"                 ║');
    console.log('  ║  Match: Substring "spitfire sso oboe 1"                               ║');
    console.log('  ║                                                                       ║');
    console.log('  ║  Pros: Works with current app, disambiguates libraries                ║');
    console.log('  ║  Cons: Longer track names in Cubase                                   ║');
    console.log('  ╚═══════════════════════════════════════════════════════════════════════╝\n');

    console.log('  ╔═══════════════════════════════════════════════════════════════════════╗');
    console.log('  ║ OPTION 3: Enhanced Fuzzy Matching with Folder Context (BEST)         ║');
    console.log('  ╠═══════════════════════════════════════════════════════════════════════╣');
    console.log('  ║  Update the app to search folder paths as well as filenames:         ║');
    console.log('  ║                                                                       ║');
    console.log('  ║  Cubase Track: "Vsl Pr Piccolo"                                       ║');
    console.log('  ║                                                                       ║');
    console.log('  ║  App logic:                                                           ║');
    console.log('  ║  1. Split track name into keywords: ["vsl", "pr", "piccolo"]         ║');
    console.log('  ║  2. Search expression map folder paths + filenames                    ║');
    console.log('  ║  3. Score matches based on keyword matches                            ║');
    console.log('  ║  4. Return best match                                                 ║');
    console.log('  ║                                                                       ║');
    console.log('  ║  Match: "VSL/.../Prime/.../VSPME 01 Piccolo Flute A"                  ║');
    console.log('  ║  Score: "vsl"✓ + "pr"(prime)✓ + "piccolo"✓ = High confidence          ║');
    console.log('  ║                                                                       ║');
    console.log('  ║  Pros: Flexible, handles abbreviations, works with existing names     ║');
    console.log('  ║  Cons: Requires app modification, potential false matches             ║');
    console.log('  ╚═══════════════════════════════════════════════════════════════════════╝\n');

    console.log('  ╔═══════════════════════════════════════════════════════════════════════╗');
    console.log('  ║ OPTION 4: Alias/Mapping File (FLEXIBLE)                              ║');
    console.log('  ╠═══════════════════════════════════════════════════════════════════════╣');
    console.log('  ║  Create a JSON mapping file for your track names:                    ║');
    console.log('  ║                                                                       ║');
    console.log('  ║  {                                                                    ║');
    console.log('  ║    "Vsl Pr Piccolo": "VSL/Prime/Wood/VSPME 01 Piccolo Flute A",      ║');
    console.log('  ║    "Sf Sso Oboe 1": "Spitfire Audio/SSO/SFSSOP Oboe 1 A",            ║');
    console.log('  ║    ...                                                                ║');
    console.log('  ║  }                                                                    ║');
    console.log('  ║                                                                       ║');
    console.log('  ║  Pros: Precise control, handles any naming convention                 ║');
    console.log('  ║  Cons: Manual setup, need to map 1000+ tracks initially               ║');
    console.log('  ╚═══════════════════════════════════════════════════════════════════════╝\n');
}

function generateSampleConfig(maps) {
    console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
    console.log('║                    SAMPLE MAPPING GENERATOR                               ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

    console.log('  Generating sample track-to-map suggestions...\n');

    // Sample: Pick some interesting instruments
    const samples = [
        maps.find(m => m.filename.toLowerCase().includes('piccolo') && m.vendor === 'VSL'),
        maps.find(m => m.filename.toLowerCase().includes('flute') && m.vendor === 'VSL'),
        maps.find(m => m.filename.toLowerCase().includes('oboe') && m.vendor === 'VSL'),
        maps.find(m => m.filename.toLowerCase().includes('violin') && m.vendor === 'VSL'),
        maps.find(m => m.filename.toLowerCase().includes('viola') && m.vendor === 'VSL'),
        maps.find(m => m.filename.toLowerCase().includes('piano') && m.vendor === '8Dio'),
        maps.find(m => m.filename.toLowerCase().includes('brass') && m.vendor === 'Spitfire Audio'),
    ].filter(Boolean);

    console.log('  Suggested Cubase Track Names:\n');

    samples.forEach((m, i) => {
        // Generate a suggested track name
        let suggestion = m.filename
            .replace(/\.expressionmap$/i, '')
            .replace(/^[A-Z0-9]+\s+\d+\s+/, '')
            .replace(/\s+Main Mics [A-D]$/i, '')
            .replace(/\s+Spot Mics [A-D]$/i, '')
            .replace(/\s+[A-D]$/, '')
            .trim();

        // Prepend vendor abbreviation
        const vendorAbbrev = m.vendor.split(' ')[0].substring(0, 3);
        const productAbbrev = m.product.split(' ').map(w => w[0]).join('').substring(0, 2);

        const trackName = `${vendorAbbrev} ${productAbbrev} ${suggestion}`.trim();

        console.log(`  ${(i + 1).toString().padStart(2)}. Track: "${trackName}"`);
        console.log(`      Maps to: ${m.folderPath}/${m.filename}\n`);
    });
}

// Main
const baseDir = process.argv[2] || 'c:\\Users\\willa\\dev\\cubby-remote\\temp-analysis';

console.log('\n  Scanning directory: ' + baseDir);

const maps = getAllExpressionMaps(baseDir);

analyzeNamingPatterns(maps);
proposeSolutions(maps);
generateSampleConfig(maps);

console.log('\n');
