# Kontakt Instrument Loader - Project Specification

## CRITICAL: Real Template Reference

**Reference template available at:**
https://github.com/willardjansen/cubby-remote
File: `test template for claude.cpr`

This is a real, working Cubase template with:
- 2 tracks fully configured
- Kontakt instances loaded
- Multi-timbral setup with expression maps
- MIDI routing configured

**Claude Code MUST:**
1. Clone the repo and analyze this .cpr file first
2. Understand the binary structure
3. Use it as the base template for modification
4. Build a .cpr parser/modifier library based on this real example

## Project Overview

Build a desktop application (Cubby Loader) that automatically loads selected Kontakt instruments into an open, empty Kontakt instance and assigns them sequential MIDI channels (1, 2, 3, etc.). The app should integrate seamlessly with Cubase workflows and follow the Cubby Apps design aesthetic.

---

## Core Functionality

### Primary Features

1. **Instrument Selection Interface**
   - Browse and select folders containing .nksn snapshot files
   - Support for selecting individual .nksn files
   - Folder selection = all .nksn files loaded as articulations (multi-timbral)
   - Individual file selection = each file is separate instrument (single-instrument)
   - Remember recently used libraries and folders
   - Search/filter functionality

2. **Automatic Loading & Configuration**
   - **Multi-timbral mode:** Generate .nkm Multi file with all snapshots from folder on channels 1-N
   - **Single-instrument mode:** Generate separate .nkm files for each selected .nksn
   - **Mixed mode:** User groups snapshots into instruments
   - Generate corresponding .expressionmap files with channel routing
   - Modify base .cpr template with tracks, routing, and expression maps
   - Output complete, ready-to-use Cubase template file

3. **MIDI Communication**
   - Send MIDI messages to Kontakt for instrument loading
   - Use MIDI Program Change messages where applicable
   - Create/use virtual MIDI port for communication
   - Handle MIDI channel assignment per instrument

4. **Expression Map Generation**
   - Auto-detect articulations from loaded Kontakt instruments (.nki metadata)
   - Generate Cubase expression map XML files (leverage Cubby Remote's template builder)
   - Map keyswitches (MIDI notes) to articulation slots
   - Support CC-based articulation switching
   - UACC (Universal Articulation CC) support
   - Auto-apply generated maps to corresponding MIDI tracks
   - Save/load expression map presets for reuse

---

## Loading Modes

**CRITICAL CLARIFICATION:** "Multi-timbral" in this context means multiple articulations of ONE instrument, not multiple different instruments.

### Multi-Timbral Mode: Multiple Articulations of ONE Instrument

**Use case:** Load all articulations of a single instrument (e.g., Violin with Long, Short, Pizz, Tremolo)

**Example: Guarneri Violin**
User selects from BabylonWaves folder:
- `Art_Conductor_Part_1.nksn` (Long notes)
- `Art_Conductor_Part_2.nksn` (Short notes)
- `Art_Conductor_Part_3.nksn` (Pizzicato)
- `Art_Conductor_Part_4.nksn` (Tremolo)

**What Cubby Loader does:**
1. Generates `.nkm` Multi file that loads all 4 snapshots:
   - Part 1 → MIDI Channel 1
   - Part 2 → MIDI Channel 2
   - Part 3 → MIDI Channel 3
   - Part 4 → MIDI Channel 4

2. Generates `.expressionmap` file that routes articulations to channels:
   - "Long" → sends MIDI to Channel 1
   - "Short" → sends MIDI to Channel 2
   - "Pizzicato" → sends MIDI to Channel 3
   - "Tremolo" → sends MIDI to Channel 4

3. Modifies `.cpr` template to include:
   - **ONE Instrument track** with Kontakt loaded
   - **ONE MIDI track** routed to that Kontakt
   - Expression map assigned to the MIDI track

**Result:** Single MIDI track controls all articulations of the violin via expression map channel switching.

**Template structure:**
```
Instrument Track: "Kontakt - Guarneri Violin"
  └─ MIDI Track: "Guarneri Violin" (Ch 1-4 via expression map)
     └─ Expression Map: Switches between channels for articulations
```

### Single-Instrument Mode: Multiple Different Instruments

**Use case:** Load completely different instruments, each in its own Kontakt instance

**Example: String Section**
User selects:
- `Guarneri_Violin_Part_1.nksn` (just one articulation, or one multi-channel setup)
- `Amati_Viola_Part_1.nksn`
- `Stradivari_Cello_Part_1.nksn`

**What Cubby Loader does:**
1. Creates separate Kontakt instances for each
2. Each instrument on its own Instrument track
3. Each with its own MIDI track
4. Simpler expression maps (if needed) or none

**Result:** Three separate instruments, each independently controllable.

**Template structure:**
```
Instrument Track 1: "Kontakt - Violin"
  └─ MIDI Track 1: "Violin" (Ch 1)

Instrument Track 2: "Kontakt - Viola"
  └─ MIDI Track 2: "Viola" (Ch 1)

Instrument Track 3: "Kontakt - Cello"
  └─ MIDI Track 3: "Cello" (Ch 1)
```

### Key Difference

| Aspect | Multi-Timbral | Single-Instrument |
|--------|---------------|-------------------|
| **What you're loading** | Multiple articulations of ONE instrument | Multiple DIFFERENT instruments |
| **Kontakt instances** | 1 | N (one per instrument) |
| **MIDI tracks** | 1 per instrument | N (one per instrument) |
| **Channels used** | 1-16 (articulations) | All use Channel 1 |
| **Expression map** | Switches between channels | Simpler or none |
| **Example** | Violin (Long, Short, Pizz, Tremolo) | Violin, Viola, Cello, Bass |

### Mixed Mode: Combining Both Approaches

**Example: String Quartet with Full Articulations**

User wants:
- **Violin** with 4 articulations (multi-timbral)
- **Viola** with 4 articulations (multi-timbral)
- **Cello** with 4 articulations (multi-timbral)

Each instrument gets its own Kontakt instance, but within each instance, multiple articulations are loaded on different channels.

**Template structure:**
```
Instrument Track 1: "Kontakt - Violin"
  └─ MIDI Track 1: "Violin" (Ch 1-4 for articulations)

Instrument Track 2: "Kontakt - Viola"
  └─ MIDI Track 2: "Viola" (Ch 1-4 for articulations)

Instrument Track 3: "Kontakt - Cello"
  └─ MIDI Track 3: "Cello" (Ch 1-4 for articulations)
```

This is the **most common professional workflow** for orchestral templates.

---

## Cubase Template (.cpr) Generation Strategy

### Approach: Modify Existing Base Template

Instead of generating .cpr files from scratch, Cubby Loader will:

1. **Use Willard's base template** (`test template for claude.cpr` from GitHub repo)
2. **Analyze its binary structure** to understand track/routing/expression map encoding  
3. **Programmatically modify it** to add tracks, instruments, and configuration
4. **Save as new .cpr file** ready to open in Cubase

### Why This Approach?

- ✅ Base template has correct Cubase project settings
- ✅ VST paths, audio settings already configured
- ✅ Expression maps are properly embedded
- ✅ Only need to understand how to ADD/MODIFY, not create from scratch
- ✅ Much more reliable than reverse-engineering entire .cpr format

### What Gets Modified

**For Multi-Timbral Setup (one instrument, multiple articulations):**
1. Add/modify Instrument track (load Kontakt)
2. Add/modify MIDI track (route to Kontakt, channels 1-N for articulations)
3. Embed/reference expression map
4. Assign expression map to MIDI track
5. Set track names, colors, routing

**For Single-Instrument Setup (multiple different instruments):**
1. Add multiple Instrument tracks (one per instrument)
2. Add corresponding MIDI tracks
3. Route each MIDI track to its Instrument track (all channel 1)
4. Optionally add expression maps if needed

### .cpr Modification Library

**Core functionality needed:**
```javascript
class CubaseProjectModifier {
  constructor(baseTemplatePath) {
    this.project = loadCPR(baseTemplatePath);
  }
  
  addInstrumentTrack(name, vstName) { }
  addMIDITrack(name, routeTo, channel) { }
  embedExpressionMap(mapFilePath) { }
  assignExpressionMap(trackIndex, mapName) { }
  setTrackColor(trackIndex, color) { }
  save(outputPath) { }
}
```

### Research Tasks for Claude Code

1. **Binary Analysis:**
   - Clone https://github.com/willardjansen/cubby-remote
   - Parse `test template for claude.cpr`
   - Identify track data structures
   - Locate expression map embedding
   - Understand MIDI routing encoding

2. **Modification Testing:**
   - Try adding a track to existing template
   - Verify Cubase can open modified file
   - Test expression map assignment

3. **Build Parser Library:**
   - Create reusable .cpr modification tools
   - Handle binary chunks safely
   - Validate modifications before saving

---

## Technical Architecture

### Technology Stack

**Recommended: Electron + Node.js**
- Aligns with existing Cubby Remote architecture
- Cross-platform (macOS primary, Windows secondary)
- Access to MIDI libraries (node-midi, easymidi)
- Familiar development environment

**Alternative: Flutter Desktop**
- Consistent with your Flutter expertise
- Use dart_midi or similar packages
- Native performance

### File Generation Approach

Cubby Loader generates three types of files:

1. **.nkm (Kontakt Multi) files**
   - Contain references to .nksn snapshot files
   - Assign each snapshot to a MIDI channel
   - May include simple KSP script for routing (optional)
   
2. **.expressionmap files**
   - Define articulations and their channel assignments
   - Used by Cubase to route MIDI to correct channels
   
3. **.cpr (Cubase Project) file**
   - Complete template with tracks, routing, expression maps
   - Based on modification of user's base template
   - Ready to open in Cubase

### .nkm Multi File Generation

**See `nkm-script-analysis.md` for detailed technical analysis.**

**Approach:** Generate XML-based .nkm files that Kontakt can load

**Structure:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<NKM>
  <Program name="Guarneri Violin Multi">
    <Slots>
      <Slot index="0" channel="1">
        <File>/path/to/Art_Conductor_Part_1.nksn</File>
      </Slot>
      <Slot index="1" channel="2">
        <File>/path/to/Art_Conductor_Part_2.nksn</File>
      </Slot>
      <Slot index="2" channel="3">
        <File>/path/to/Art_Conductor_Part_3.nksn</File>
      </Slot>
      <Slot index="3" channel="4">
        <File>/path/to/Art_Conductor_Part_4.nksn</File>
      </Slot>
    </Slots>
  </Program>
</NKM>
```

**Note:** Actual .nkm format may be binary. Research needed to determine if XML is supported or if binary generation is required.

**Alternative:** If .nkm generation proves complex, provide instructions for user to create Multi manually in Kontakt, then use that Multi in the template.

---

## Expression Map Generation (Core Feature)

### Overview

Cubby Loader will auto-generate Cubase expression maps for loaded Kontakt snapshots, building on the proven XML generation logic from Cubby Remote's template builder.

### The .nkm Script File Question

BabylonWaves includes proprietary .nkm script files (e.g., `Babylonwaves_Art_Conductor_Script_1_2.nkm`) that contain KSP code for advanced MIDI routing within Kontakt.

**Decision:** Cubby Loader will use a **simpler approach**:
- Generate basic .nkm Multi files that load snapshots on different channels
- Let **Cubase expression maps handle ALL articulation switching** via channel routing
- No complex KSP scripting needed
- More maintainable and DAW-agnostic

**Reasoning:**
- Cubase expression maps can route MIDI to specific channels
- Kontakt receives on those channels and plays the correct snapshot
- Achieves same result without proprietary scripting
- User gets full control in Cubase

See `nkm-script-analysis.md` for detailed technical discussion of this decision.

### Articulation Detection Methods

**Method 1: Parse .nki Files (Preferred)**
- .nki files contain XML metadata about articulations
- Extract keyswitch information, CC assignments, and articulation names
- Map this data to Cubase expression map structure

**Method 2: User-Defined Libraries**
- Maintain a database of common sample libraries
- Pre-configured articulation mappings for:
  - Spitfire Audio libraries
  - Orchestral Tools
  - Vienna Symphonic Library
  - EastWest
  - Cinesamples
  - 8Dio
  - Native Instruments libraries

**Method 3: Manual Configuration**
- UI for users to define articulations if auto-detection fails
- Save as custom library preset for reuse
- Share presets with community

### Expression Map XML Structure

Reuse Cubby Remote's XML generator to create:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<InstrumentMap version="1">
  <Name>Violin Ensemble - Ch 1</Name>
  <OutputMapper>
    <Articulation name="Long">
      <Slot>1</Slot>
      <Symbol>0</Symbol>
      <Output>
        <Note>36</Note> <!-- Keyswitch: C1 -->
      </Output>
    </Articulation>
    <Articulation name="Short">
      <Slot>2</Slot>
      <Symbol>1</Symbol>
      <Output>
        <Note>37</Note> <!-- Keyswitch: C#1 -->
      </Output>
    </Articulation>
    <Articulation name="Pizzicato">
      <Slot>3</Slot>
      <Symbol>2</Symbol>
      <Output>
        <Note>38</Note> <!-- Keyswitch: D1 -->
      </Output>
    </Articulation>
  </OutputMapper>
  <Defaults>
    <Slot>1</Slot>
  </Defaults>
</InstrumentMap>
```

### Workflow Integration

1. **User selects instruments** in Cubby Loader
2. **App scans .nki files** for articulation data
3. **Generates expression map XML** for each instrument
4. **Saves to Cubase Expression Maps folder:**
   - macOS: `~/Library/Preferences/Cubase/Expression Maps/`
   - Windows: `C:\Users\[User]\AppData\Roaming\Steinberg\Cubase\Expression Maps\`
5. **Cubase auto-detects** new expression maps on next launch
6. **Optional: Auto-apply** to corresponding MIDI tracks via Cubase API or user instruction

### UACC Support

Universal Articulation CC (CC32) standardization:
- Detect if instrument uses UACC
- Map CC32 values to articulations instead of keyswitches
- Generate appropriate XML structure for CC-based switching

### Smart Articulation Naming

Normalize articulation names across libraries:
- "Long" / "Sustain" / "Legato" → "Long"
- "Short" / "Staccato" / "Spiccato" → "Short"
- "Pizz" / "Pizzicato" → "Pizzicato"
- Use consistent symbol mappings for playback

### Testing & Validation

- Compare generated maps with manually created ones
- Test with multiple sample libraries
- Validate XML against Cubase's schema
- Ensure keyswitches trigger correctly in Kontakt

### Library Database Structure

```json
{
  "libraries": [
    {
      "name": "Spitfire Symphonic Strings",
      "instruments": [
        {
          "name": "Violin 1 Ensemble",
          "nki_pattern": "*Violin*1*.nki",
          "articulations": [
            {"name": "Long", "keyswitch": 36, "cc": null},
            {"name": "Short", "keyswitch": 37, "cc": null},
            {"name": "Pizzicato", "keyswitch": 38, "cc": null}
          ]
        }
      ]
    }
  ]
}
```

---

## Cubase Integration

### Approach 1: Cubase Logical Editor Presets

Create Logical Editor presets that:
- Set up MIDI tracks pointing to Kontakt with sequential channels
- Can be triggered via Key Commands
- User runs Cubby Loader, then triggers Cubase preset

**Deliverable:** Cubase Logical Editor preset file(s) with installation instructions

### Approach 2: Cubase Generic Remote

- Map Cubby Loader functions to Generic Remote commands
- Allow Cubase to trigger instrument loading
- Bidirectional communication possible

### Approach 3: Project Templates

- Create Cubase project templates for both loading modes:
  - **Multi-timbral template:** 16 MIDI tracks pre-routed to single Kontakt instance
  - **Single-instrument template:** Scalable template for individual instances
- Each template includes:
  - MIDI tracks with sequential channels (multi-timbral) or all channel 1 (single-instrument)
  - Expression maps pre-configured (if applicable)
  - Kontakt already inserted on Instrument track(s)
  - Color-coded tracks

**Deliverable:** Multiple .cpr template files with documentation for each mode

---

## User Interface Design

### Visual Design (Cubby Apps Aesthetic)

- **Color Scheme:** Pink neon accents (#FF1493, #FF69B4) on dark gradient background
- **Typography:** Modern, clean sans-serif
- **Layout:** Minimal, focused interface
- **Branding:** Consistent with Cubby Remote, Cubby Composer, etc.

### Main Window Layout

```
┌─────────────────────────────────────────┐
│  🎹 Cubby Loader                    [_][□][×]│
├─────────────────────────────────────────┤
│                                         │
│  Loading Mode: ⦿ Multi-timbral (articulations)
│                 ○ Single-instrument (different instruments)
│                 ○ Mixed (both)             │
│                                         │
│  Select Instrument Folders/Files:       │
│  ┌───────────────────────────────────┐ │
│  │ 📁 BabylonWaves                   │ │
│  │   📁 Guarneri Violin ◄ SELECTED   │ │
│  │     📄 Art Conductor Part 1.nksn  │ │
│  │     📄 Art Conductor Part 2.nksn  │ │
│  │     📄 Art Conductor Part 3.nksn  │ │
│  │     📄 Art Conductor Part 4.nksn  │ │
│  │   📁 Amati Viola                  │ │
│  │   📁 Stradivari Cello             │ │
│  └───────────────────────────────────┘ │
│                                         │
│  Selected Instruments:                  │
│  ┌───────────────────────────────────┐ │
│  │ ► Guarneri Violin (4 articulations)│ │
│  │   ├─ Part 1 → Ch 1 (Long)        │ │
│  │   ├─ Part 2 → Ch 2 (Short)       │ │
│  │   ├─ Part 3 → Ch 3 (Pizzicato)   │ │
│  │   └─ Part 4 → Ch 4 (Tremolo)     │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ☑ Generate .nkm Multi file             │
│  ☑ Generate Expression Maps             │
│  ☑ Generate Cubase .cpr template        │
│                                         │
│  Output: [Browse for location...]       │
│                                         │
│  [Generate Template]                    │
│                                         │
│  Status: Ready                          │
└─────────────────────────────────────────┘
```

**Note:** In multi-timbral mode, selecting a folder loads all .nksn files as articulations. In single-instrument mode, each .nksn becomes a separate instrument.

### Settings Panel

- MIDI port selection
- Kontakt library path configuration
- Default instrument folders
- Auto-load preferences
- Cubase integration toggle

---

## Implementation Steps

### Phase 1: Core MIDI Functionality

1. Set up Electron/Flutter project with Cubby Apps branding
2. Implement virtual MIDI port creation
3. Create basic UI for instrument selection
4. Implement MIDI message sending (Program Change + Channel assignment)
5. Test with Kontakt standalone

### Phase 2: Instrument Management

1. File browser for .nki files
2. Save/load instrument lists (presets)
3. Drag-and-drop reordering
4. Category/folder organization
5. Search and filter

### Phase 3: Expression Map Generation (CRITICAL FEATURE)

1. **Leverage Cubby Remote's template builder logic**
2. Auto-detect articulations from loaded Kontakt instruments
3. Generate Cubase expression map XML files per instrument
4. Map keyswitches/CCs to articulation slots
5. Auto-apply expression maps to corresponding MIDI tracks
6. Support for UACC, custom keyswitches, and CC-based switching
7. Save/load expression map presets for common libraries

### Phase 4: Cubase Integration

1. Create Cubase project template(s)
2. Document setup process for Generic Remote (if applicable)
3. Create Logical Editor presets for MIDI track creation
4. Test full workflow: Cubase → Kontakt → Cubby Loader → Expression Maps
5. Integration with Cubby Remote for live articulation control

### Phase 5: Polish & Distribution

1. Error handling and user feedback
2. Loading animations and progress indicators
3. Documentation and user guide
4. macOS notarization (like Cubby Remote)
5. GitHub release with installer
6. Website update (cubbloader.com or add to existing site)

---

## File Structure

```
cubby-loader/
├── src/
│   ├── main/
│   │   ├── index.js                 # Electron main process
│   │   ├── midi-controller.js       # MIDI communication logic
│   │   ├── instrument-manager.js    # Instrument file handling
│   │   ├── expression-map-generator.js  # XML generation (from Cubby Remote)
│   │   ├── nki-parser.js            # Parse .nki metadata
│   │   └── library-database.js      # Sample library presets
│   ├── renderer/
│   │   ├── index.html
│   │   ├── styles.css               # Pink neon aesthetic
│   │   └── app.js                   # UI logic
│   └── preload.js
├── assets/
│   ├── icons/
│   ├── branding/
│   └── library-presets/             # Pre-configured library data
│       ├── spitfire.json
│       ├── orchestral-tools.json
│       └── vsl.json
├── cubase/
│   ├── templates/
│   │   └── Kontakt-16-Channels.cpr
│   ├── logical-editor/
│   │   └── setup-kontakt-tracks.xml
│   ├── expression-maps/             # Generated expression maps
│   │   └── examples/
│   └── README.md                    # Cubase setup instructions
├── docs/
│   ├── USER-GUIDE.md
│   ├── KONTAKT-SETUP.md
│   └── EXPRESSION-MAPS.md           # Expression map documentation
├── package.json
└── README.md
```

---

## Cubase Setup Instructions (for end users)

### Option A: Project Template Method

1. **Install Kontakt** as a VST3 instrument in Cubase
2. **Load the provided template:** `Kontakt-16-Channels.cpr`
3. **Open Cubby Loader** and select your instruments
4. **Click "Load into Kontakt"** - instruments load with channels 1-16
5. **Start composing!** Each MIDI track is pre-routed

### Option B: Manual Setup

1. **Create an Instrument Track** in Cubase
2. **Load Kontakt** on that track
3. **Create 16 MIDI tracks** routed to the Kontakt instrument
4. **Set each MIDI track** to channels 1-16 respectively
5. **Run Cubby Loader** to load instruments
6. **Save as your own template** for future use

---

## Kontakt Configuration

### For MIDI Program Change Loading

1. In Kontakt, go to **Options → Engine**
2. Enable **"Retrieve Program Change"**
3. Set up your **Kontakt Database** or **Multi** with instruments mapped to Program numbers
4. Configure MIDI input to receive from "Cubby Loader Out"

### For Multi File Loading

1. Cubby Loader generates a `.nkm` file
2. User drags this file into Kontakt
3. All instruments load with correct channel assignments
4. (Optional) Automate this with Cubase scripting

---

## Technical Challenges & Solutions

### Challenge 1: Kontakt doesn't support external scripting
**Solution:** Use MIDI Program Change messages or generate Multi files programmatically

### Challenge 2: Different Kontakt library structures
**Solution:** Let users configure library paths; scan for .nki files recursively

### Challenge 3: Supporting multiple loading modes
**Solution:** Mode selector in UI; generate appropriate templates and .nkm files per mode; remember user preference

### Challenge 4: MIDI channel limit in multi-timbral mode (16 channels)
**Solution:** Warn when >16 instruments selected in multi-timbral mode; suggest single-instrument mode for larger setups

### Challenge 5: Cubase template generation for different modes
**Solution:** Provide multiple template files; document when to use each; consider dynamic template generation

### Challenge 6: Cubase automation limitations
**Solution:** Provide multiple integration methods (templates, Generic Remote, manual)

### Challenge 7: Cross-platform MIDI differences
**Solution:** Use robust MIDI library (node-midi); test on both macOS and Windows

---

## Dependencies

### For Electron Version

```json
{
  "dependencies": {
    "electron": "^latest",
    "midi": "^2.0.0",
    "easymidi": "^2.0.0",
    "chokidar": "^3.5.0"
  },
  "devDependencies": {
    "electron-builder": "^latest",
    "electron-notarize": "^latest"
  }
}
```

### For Flutter Version

```yaml
dependencies:
  flutter:
    sdk: flutter
  dart_midi: ^latest
  file_picker: ^latest
  shared_preferences: ^latest
  window_manager: ^latest
```

---

## Testing Checklist

- [ ] Virtual MIDI port creation works on macOS
- [ ] Virtual MIDI port creation works on Windows
- [ ] Instruments load in correct order
- [ ] MIDI channels assigned sequentially (1-16)
- [ ] **Expression maps generated correctly from .nki files**
- [ ] **Expression maps saved to Cubase folder**
- [ ] **Generated maps load in Cubase without errors**
- [ ] **Keyswitches trigger correct articulations in Kontakt**
- [ ] **UACC-based libraries handled correctly**
- [ ] UI allows reordering before loading
- [ ] Works with Kontakt 6 and Kontakt 7
- [ ] Cubase template loads correctly
- [ ] MIDI routing in Cubase works as expected
- [ ] **Expression maps auto-applied to MIDI tracks (if supported)**
- [ ] App launches successfully after notarization
- [ ] Error messages are clear and helpful
- [ ] Documentation is complete and accurate
- [ ] **Cubby Remote integration tested (if applicable)**

---

## Distribution

### macOS
- Build with electron-builder
- Notarize with Apple (like Cubby Remote)
- Distribute via GitHub Releases
- Optional: Create dedicated website (cubbloader.com)

### Windows
- Build with electron-builder
- Code sign if possible
- Distribute via GitHub Releases

### Documentation
- Include video tutorial showing full workflow
- PDF user guide
- Inline help within the app

---

## Future Enhancements (Post-MVP)

1. **Multi-instance support** - Load across multiple Kontakt instances (for >16 instruments)
2. **VSL integration** - Support for Vienna Instruments Pro
3. **Cloud sync** - Sync instrument lists and presets across machines
4. **Sample library scanner** - Auto-detect installed libraries and build database
5. **Articulation learning mode** - AI-assisted articulation detection for unknown libraries
6. **DAW-agnostic support** - Logic Pro X, Studio One, Pro Tools integration
7. **Collaborative presets** - Share instrument/articulation setups with other users
8. **Performance view** - Simplified interface for live performance vs. studio composition

---

## Questions for Claude Code

1. **Technology preference:** Electron (matches Cubby Remote) or Flutter (matches your expertise)?
2. **Primary loading method:** MIDI Program Change, Multi file generation, or both?
3. **Cubase integration priority:** Template-based or attempt deeper automation?
4. **Expression map generation:** Parse .nki files directly, use library database, or both approaches?
5. **Code reuse:** Extract expression map XML generator from Cubby Remote repo or rebuild?
6. **Scope:** MVP with basic loading + expression maps, or include full library management from start?

---

## Success Criteria

✅ User can select 2-16 Kontakt instruments  
✅ App loads them into empty Kontakt instance  
✅ Each instrument assigned to sequential MIDI channel  
✅ **Expression maps auto-generated and applied to Cubase tracks**  
✅ Works seamlessly with Cubase workflow  
✅ Follows Cubby Apps design aesthetic  
✅ Properly notarized and distributed for macOS  
✅ Clear documentation for setup and use  
✅ **Integrates with existing Cubby Remote functionality**  

---

## References & Resources

- **Kontakt Developer Resources:** Native Instruments KSP Reference Manual
- **MIDI Specification:** MIDI Program Change and Channel Voice Messages
- **Cubase API:** Steinberg Cubase Scripting Documentation (if available)
- **node-midi:** https://github.com/justinlatimer/node-midi
- **Electron Builder:** https://www.electron.build/
- **Your existing projects:** 
  - **Cubby Remote** for architecture reference and **expression map XML generation code** (CRITICAL - reuse this!)
  - Cubby Composer, Cubby Score, Cubby Convert for branding consistency
- **Cubase Expression Map XML Format:** Study existing .expressionmap files for structure

---

## Notes for Claude Code

- This is part of the **Cubby Apps suite** - maintain consistent branding
- User (Willard) has experience with **Electron, Flutter, GitHub workflows**
- Target platform: **macOS primary** (notarization required), Windows secondary
- User has **Layer7 API Gateway and backend development experience** - technical implementations welcome
- **Pink neon aesthetic** is crucial for brand consistency
- User will provide **feedback and testing** throughout development
- Consider this as potential **open-source project** like Cubby Remote

---

**Document Version:** 1.0  
**Created:** January 2026  
**For:** Claude Code Implementation
