# Cubase Integration Guide - Kontakt Loader

## Overview

This document provides detailed instructions for setting up Cubase to work optimally with Cubby Loader and Kontakt. It includes project templates, Logical Editor presets, Key Commands, and workflow automation.

---

## Quick Setup (Recommended Method)

Cubby Loader provides **two template types** to match different workflows. Choose the one that fits your needs.

### Template Option A: Multi-Timbral (16 Instruments Max)

**Best for:** Traditional orchestral templates, CPU efficiency, 8-16 instruments

### Step 1: Install the Multi-Timbral Template

1. Copy `Kontakt-16-Channels-Multi.cpr` to your Cubase Templates folder:
   - **macOS:** `~/Library/Application Support/Steinberg/Cubase/Project Templates/`
   - **Windows:** `C:\Users\[YourName]\AppData\Roaming\Steinberg\Cubase\Project Templates\`

2. Restart Cubase

3. Create new project: **File → New Project → Kontakt 16 Channels (Multi-Timbral)**

**Template includes:**
- ✅ 1 Instrument track with Kontakt loaded
- ✅ 16 MIDI tracks pre-routed to Kontakt
- ✅ Each track set to MIDI channels 1-16
- ✅ Color-coded tracks for visual organization
- ✅ Basic mixer setup

### Template Option B: Single-Instrument (Unlimited)

**Best for:** >16 instruments, individual routing/effects, maximum flexibility

### Step 1: Install the Single-Instrument Template

1. Copy `Kontakt-Single-Instrument.cpr` to your Cubase Templates folder (same paths as above)

2. Restart Cubase

3. Create new project: **File → New Project → Kontakt Single Instrument**

**Template includes:**
- ✅ Starter Instrument track with Kontakt loaded
- ✅ MIDI track routed to it (channel 1)
- ✅ Ready for Cubby Loader to add more instances
- ✅ Color-coded for consistency

**Note:** Cubby Loader dynamically adds more Instrument tracks as needed for each instrument you load.

### Step 2: Launch Cubby Loader

1. Open Cubby Loader
2. **Select loading mode:**
   - **Multi-timbral:** All instruments in one Kontakt (use Template A)
   - **Single-instrument:** Each instrument in separate Kontakt (use Template B)
3. Select your instruments (up to 16 for multi-timbral, unlimited for single-instrument)
4. Click "Load into Kontakt"
5. Instruments load automatically with correct channel assignments
6. Start composing!

---

## Manual Cubase Setup (Without Template)

If you prefer to set up from scratch or customize:

### Step 1: Create Instrument Track

1. **Add Instrument Track:** Right-click in track list → Add Instrument Track
2. **Load Kontakt:** Select Kontakt 6/7 from VST Instruments
3. **Set to Stereo:** Ensure output configuration is stereo
4. **Name the track:** "Kontakt Main" or similar

### Step 2: Add MIDI Tracks

1. **Add MIDI Track:** Right-click → Add MIDI Track (repeat 16 times)
   - Or select multiple tracks at once
   
2. **Route each track:**
   - Output → Kontakt Main
   - Channel → Set sequentially (1, 2, 3... 16)

3. **Name tracks descriptively:**
   - "Ch 1 - Violin"
   - "Ch 2 - Viola"
   - etc.

### Step 3: Configure Kontakt

1. In Kontakt, ensure **Multi-Channel** output is enabled
2. Set MIDI input to receive from all channels
3. In Cubase, activate **Monitor** on MIDI tracks to hear Kontakt

---

## Logical Editor Preset: Auto-Create MIDI Tracks

This preset automatically creates 16 MIDI tracks routed to your selected Kontakt instance.

### Installing the Preset

1. In Cubase: **MIDI → Logical Editor**
2. Click **Presets** button
3. Select **Import**
4. Choose `Setup-Kontakt-16-Tracks.xml`

### Using the Preset

1. **Select the Kontakt Instrument Track**
2. **Open Logical Editor:** MIDI → Logical Editor
3. **Load Preset:** "Setup Kontakt 16 Tracks"
4. **Click Apply**
5. **16 MIDI tracks created** and routed automatically!

### Preset Configuration (for manual recreation)

```
Filter Target:
- Type is → Equal → MIDI Track
- Property → Not Set

Action Target:
- Create 16 MIDI Tracks
- Route to: Selected Instrument
- Set Channels: 1-16 sequentially
- Color: Auto-assign by channel
```

**Note:** Due to Cubase Logical Editor limitations, you may need to create this as a macro instead.

---

## Macro: Quick Kontakt Setup

Create a macro to automate the entire setup process.

### Creating the Macro

1. **Open Macro Editor:** File → Key Commands
2. **Click "Show Macros"**
3. **New Macro:** Click "+" button
4. **Name:** "Setup Kontakt 16 Channels"

### Macro Commands Sequence

Add these commands in order:

```
1. Project: Add Instrument Track
2. Devices: VST Instruments (opens VST rack)
   [User manually loads Kontakt here - cannot be automated]
3. Project: Add Track → MIDI Track (repeat 16 times)
   [Set output and channels manually - or use script]
```

**Limitation:** Cubase macros cannot fully automate VST loading or routing. This is where the template method is superior.

---

## Key Commands Setup

Assign keyboard shortcuts for faster workflow:

### Recommended Key Commands

| Action | Suggested Key | Purpose |
|--------|---------------|---------|
| Add MIDI Track | `Cmd+T` / `Ctrl+T` | Quick MIDI track creation |
| Open Logical Editor | `Cmd+L` / `Ctrl+L` | Run setup preset |
| Show VST Instruments | `F11` | Quick access to Kontakt |
| Open Kontakt UI | `Cmd+Shift+K` | Toggle Kontakt interface |
| Activate Monitor (MIDI) | `M` | Enable MIDI monitoring |

### Setting Key Commands

1. **File → Key Commands**
2. Search for the command
3. Click in "Keys" column
4. Press your desired key combination
5. **Apply**

---

## Project Template Details

Two templates are provided to support different workflows.

### Template A: Multi-Timbral (Kontakt-16-Channels-Multi.cpr)

**Use case:** Traditional orchestral template, CPU efficiency, 8-16 instruments

#### Track Configuration

| Track # | Type | Name | MIDI Ch | Color | Notes |
|---------|------|------|---------|-------|-------|
| 1 | Instrument | Kontakt Main | - | Gray | VST host |
| 2 | MIDI | Ch 1 - Strings | 1 | Red | First instrument |
| 3 | MIDI | Ch 2 - Strings | 2 | Orange | Second instrument |
| 4 | MIDI | Ch 3 - Strings | 3 | Yellow | Third instrument |
| ... | ... | ... | ... | ... | ... |
| 17 | MIDI | Ch 16 - Perc | 16 | Purple | Sixteenth instrument |

#### Mixer Setup

- **Kontakt Main:** Sent to Stereo Out
- **Faders:** All MIDI tracks set to 0dB
- **Groups:** Optional folder structure for organization
- **Effects:** No effects pre-loaded (user adds as needed)

#### Workflow

1. Open template
2. Cubby Loader loads all instruments into "Kontakt Main"
3. MIDI tracks 1-16 ready to control instruments
4. All instruments share same audio routing/effects

### Template B: Single-Instrument (Kontakt-Single-Instrument.cpr)

**Use case:** Unlimited instruments, individual routing, maximum flexibility

#### Track Configuration

| Track # | Type | Name | MIDI Ch | Color | Notes |
|---------|------|------|---------|-------|-------|
| 1 | Instrument | Kontakt - Violin | - | Red | Example instance |
| 2 | MIDI | Violin | 1 | Red | Controls instrument 1 |

**Note:** Cubby Loader dynamically adds more Instrument+MIDI track pairs as you load instruments

#### Mixer Setup

- **Each Kontakt instance:** Separate Instrument track with dedicated outputs
- **Individual control:** Per-instrument volume, pan, effects
- **Groups:** Organize by section (Strings, Brass, etc.)

#### Workflow

1. Open template
2. Cubby Loader creates new Instrument tracks for each selected instrument
3. Each instrument in its own Kontakt instance
4. Each on MIDI channel 1 (no conflict since separate instances)
5. Individual audio routing per instrument

### Choosing Between Templates

| Feature | Multi-Timbral | Single-Instrument |
|---------|---------------|-------------------|
| **Max instruments** | 16 | Unlimited |
| **CPU efficiency** | Higher | Lower (more instances) |
| **Individual routing** | No | Yes |
| **Per-instrument effects** | No | Yes |
| **Setup complexity** | Simple | Moderate |
| **Freeze instruments** | All or nothing | Individual control |
| **Best for** | Small-medium ensembles | Large orchestras, complex routing |

### Additional Features (Both Templates)

- **Tempo:** 120 BPM default
- **Time Signature:** 4/4
- **Sample Rate:** 48kHz (recommended)
- **Bit Depth:** 24-bit
- **Auto-Save:** Enabled every 5 minutes

---

## Advanced: Cubase Generic Remote

For bidirectional control between Cubase and Cubby Loader.

### Setup Generic Remote

1. **Devices → Device Setup → Generic Remote**
2. **Add new Generic Remote:** Click "+"
3. **Name:** "Cubby Loader Control"

### MIDI Configuration

- **MIDI Input:** Cubby Loader Out
- **MIDI Output:** Cubby Loader In
- **Device Name:** Cubby Loader

### Control Mapping

| Function | MIDI Message | Target in Cubase |
|----------|--------------|------------------|
| Load Instrument 1 | CC 20 | Trigger Track 1 Record |
| Load Instrument 2 | CC 21 | Trigger Track 2 Record |
| Clear Kontakt | CC 127 | Stop All |
| Select Track | Program Change | Select MIDI Track |

**Note:** This requires Cubby Loader to send corresponding MIDI messages.

---

## Expression Maps Integration

### Automatic Expression Map Generation (Core Feature)

Cubby Loader automatically generates Cubase expression maps for loaded Kontakt instruments, eliminating hours of manual setup.

### How It Works

1. **Detection Phase:**
   - Cubby Loader scans selected .nki files for articulation metadata
   - Identifies keyswitches (MIDI notes) or CC assignments
   - Extracts articulation names and slot information

2. **Generation Phase:**
   - Creates expression map XML files using Cubby Remote's proven template builder
   - One .expressionmap file per instrument
   - Named to match instrument: "Violin-Ensemble-Ch1.expressionmap"

3. **Installation Phase:**
   - Saves to Cubase Expression Maps folder:
     - **macOS:** `~/Library/Preferences/Cubase/Expression Maps/`
     - **Windows:** `C:\Users\[User]\AppData\Roaming\Steinberg\Cubase\Expression Maps\`
   - Expression maps available in Cubase immediately (or after restart)

4. **Application Phase (Optional):**
   - User manually assigns maps to MIDI tracks, OR
   - Cubby Loader can auto-apply if Cubase API allows, OR
   - Template includes pre-assigned maps

### Supported Articulation Types

**Keyswitch-based:**
- Single MIDI note triggers articulation change
- Common in Spitfire, Orchestral Tools, Cinesamples
- Example: C1 = Long, C#1 = Short, D1 = Pizzicato

**CC-based:**
- Controller Change messages switch articulations
- UACC (CC32) is industry standard
- Example: CC32 value 1 = Long, 2 = Short, 3 = Pizzicato

**Hybrid:**
- Some libraries use both methods
- Cubby Loader detects and handles appropriately

### Step 1: Enable Auto-Generation

In Cubby Loader settings:
```
☑ Generate Expression Maps
☑ Auto-detect articulations from .nki files
☐ Use library presets (for known libraries)
☑ Install to Cubase folder
```

### Step 2: Load Instruments

1. Select instruments in Cubby Loader
2. Click "Load into Kontakt"
3. Cubby Loader:
   - Loads instruments → Kontakt
   - Generates expression maps → XML files
   - Saves to Cubase folder

### Step 3: Assign Maps in Cubase

**Option A: Manual Assignment**
1. Select MIDI track in Cubase
2. **Inspector → Expression Map dropdown**
3. Choose generated map (e.g., "Violin Ensemble - Ch1")
4. Repeat for each MIDI track

**Option B: Template Pre-Assignment**
- Save your setup as a Cubase template
- Maps are already assigned on template load
- Only works if same instruments used each time

**Option C: Future Auto-Assignment**
- If Cubase API allows, Cubby Loader could assign automatically
- Or use Cubase scripting (if available)

### Step 4: Test Articulations

1. Create MIDI notes on track
2. Draw articulation symbols in Key Editor
3. Or use Expression Map Lane to switch manually
4. Verify keyswitches trigger correct Kontakt articulations

### Example: Generated Expression Map

**For "Spitfire Symphonic Strings - Violin 1":**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<InstrumentMap version="1">
  <n>Violin 1 Ensemble - Ch 1</n>
  <OutputMapper>
    <Articulation name="Long">
      <Slot>1</Slot>
      <Symbol>0</Symbol> <!-- Cubase playback symbol -->
      <o>
        <Note>36</Note> <!-- C1 keyswitch -->
      </o>
    </Articulation>
    <Articulation name="Short">
      <Slot>2</Slot>
      <Symbol>1</Symbol>
      <o>
        <Note>37</Note> <!-- C#1 keyswitch -->
      </o>
    </Articulation>
    <Articulation name="Pizzicato">
      <Slot>3</Slot>
      <Symbol>97</Symbol>
      <o>
        <Note>38</Note> <!-- D1 keyswitch -->
      </o>
    </Articulation>
    <Articulation name="Tremolo">
      <Slot>4</Slot>
      <Symbol>11</Symbol>
      <o>
        <Note>39</Note> <!-- D#1 keyswitch -->
      </o>
    </Articulation>
  </OutputMapper>
  <Defaults>
    <Slot>1</Slot> <!-- Default to "Long" -->
  </Defaults>
</InstrumentMap>
```

### Library Presets

For common sample libraries, Cubby Loader includes pre-configured presets:

**Included Libraries:**
- Spitfire Symphonic Orchestra
- Spitfire Chamber Strings
- Orchestral Tools Metropolis Ark
- Vienna Symphonic Library
- EastWest Hollywood Orchestra
- Cinesamples CineBrass
- Native Instruments Symphony Series

**Using Presets:**
1. Cubby Loader detects library from .nki path
2. Loads articulation data from preset JSON
3. Generates map without parsing .nki directly
4. More reliable for known libraries

### Custom Library Configuration

If your library isn't recognized:

1. **Manual Articulation Entry:**
   - UI to define articulations manually
   - Specify keyswitches or CC values
   - Save as custom preset for reuse

2. **Export/Import Presets:**
   - Share custom library configs
   - Import community-created presets
   - Build comprehensive library database

### UACC (Universal Articulation CC)

Industry standard for CC-based articulation switching:

**CC32 Standard Values:**
- 1 = Default / Long / Sustain
- 2 = Staccato / Short
- 3 = Spiccato
- 4 = Pizzicato
- 5 = Tremolo
- ... (standardized across libraries)

**Cubby Loader UACC Support:**
- Auto-detects UACC usage in .nki files
- Generates CC-based expression maps
- Uses standard UACC values when available
- Ensures cross-library compatibility

### Troubleshooting Expression Maps

**Problem: Expression map doesn't appear in Cubase**

Solutions:
- Restart Cubase (required to detect new maps)
- Verify .expressionmap file in correct folder
- Check file permissions (should be readable)
- Look for XML syntax errors in generated file

**Problem: Articulations don't trigger correctly**

Solutions:
- Verify keyswitch range in Kontakt matches map
- Check MIDI channel matches track channel
- Ensure Kontakt is receiving keyswitch notes
- Test manually sending keyswitch MIDI note

**Problem: Wrong articulation names**

Solutions:
- Edit .expressionmap file directly (XML)
- Or use Cubby Loader's custom library editor
- Save corrected version as preset

**Problem: Library not recognized**

Solutions:
- Use manual articulation configuration
- Check if .nki files contain metadata
- Create and save custom library preset
- Submit preset to community database

### Advanced: Editing Expression Maps

Generated maps can be refined in Cubase:

1. **Open Expression Map Setup:**
   - VST Instruments panel → Expression Map Setup
   
2. **Edit Articulations:**
   - Change names, symbols, keyswitches
   - Add/remove articulations
   - Adjust default articulation
   
3. **Save Changes:**
   - Changes persist in original .expressionmap file
   - Or save as new version

### Integration with Cubby Remote

**Workflow Synergy:**
- **Cubby Loader:** Sets up instruments + expression maps
- **Cubby Remote:** Controls articulations in real-time during performance
- Both use same expression map infrastructure
- Seamless handoff between setup and performance

**Example Workflow:**
1. Use Cubby Loader to load 8 string instruments
2. Expression maps auto-generated and applied
3. Open Cubby Remote on iPad
4. Control articulations wirelessly during recording
5. Expression data recorded to MIDI tracks

---

## Troubleshooting

### Problem: MIDI tracks not routing to Kontakt

**Solution:**
- Check Kontakt is loaded on Instrument track
- Verify MIDI track output is set to "Kontakt Main"
- Ensure correct MIDI channel (1-16)
- Enable **Monitor** on MIDI tracks

### Problem: No sound from Kontakt

**Solution:**
- Check Kontakt's audio output routing
- Verify instrument is loaded in Kontakt
- Ensure MIDI channel matches track channel
- Check Cubase's VST Instruments panel

### Problem: Cubby Loader can't communicate with Kontakt

**Solution:**
- Verify MIDI port "Cubby Loader Out" exists
- In Kontakt: Options → MIDI → Enable all MIDI inputs
- Restart Cubase and Cubby Loader
- Check macOS/Windows MIDI permissions

### Problem: Template doesn't appear in Cubase

**Solution:**
- Confirm file is in correct Templates folder
- Restart Cubase completely
- Check file permissions (should be readable)
- Ensure .cpr file is not corrupted

---

## Optimizing Performance

### Kontakt Settings

1. **Options → Engine:**
   - CPU overload protection: **Enabled**
   - Multi-processor support: **Enabled**
   - Override instrument's output section: **Disabled**

2. **Options → Memory:**
   - Preload size: **60 KB** (adjust based on RAM)
   - Override instrument's preload size: **Enabled** (if needed)

### Cubase Settings

1. **Studio → Studio Setup → Audio System:**
   - Buffer size: **256 samples** (balance latency/performance)
   - Activate multi-processing: **Enabled**

2. **Preferences → VST:**
   - Suspend VST 3 when no audio: **Disabled** (for Kontakt stability)

---

## Workflow Tips

### Tip 1: Save Custom Templates

After setting up your perfect Kontakt configuration:
1. **File → Save as Template**
2. Name it descriptively (e.g., "Kontakt Orchestral Setup")
3. Reuse for future projects

### Tip 2: Track Presets

Save individual track configurations:
1. **Right-click track → Save Track Preset**
2. Include MIDI routing, channel, and effects
3. Quickly recall for new projects

### Tip 3: Freeze Kontakt Tracks

To reduce CPU load during large sessions:
1. **Right-click Kontakt track → Freeze Instrument**
2. Kontakt renders to audio temporarily
3. Unfreeze when you need to make changes

### Tip 4: Color Coding

Organize by instrument family:
- **Strings:** Red/Orange
- **Brass:** Yellow/Gold
- **Woodwinds:** Green
- **Percussion:** Blue/Purple

### Tip 5: Use Track Versions

Experiment with different orchestrations:
1. **Track → New Version**
2. Try alternative arrangements
3. Switch between versions instantly

### Tip 6: Choose the Right Template for Your Project

**Use Multi-Timbral Template when:**
- Working with 8-16 instruments
- Building traditional orchestral mockups
- CPU resources are limited
- Simpler routing is preferred
- All instruments can share same reverb/effects

**Use Single-Instrument Template when:**
- Need more than 16 instruments
- Each instrument requires unique processing
- Working with large sample libraries with multiple mic positions
- Need per-instrument stereo width control
- Want to freeze instruments individually for CPU management
- Building complex, film-score style arrangements

**Mix Both Approaches:**
You can even combine templates in one project:
- Multi-timbral Kontakt for strings (16 channels)
- Separate instances for solo instruments
- Another multi-timbral instance for brass

---

## Integration with Other Cubby Apps

### Cubby Remote

- Use **Cubby Remote** to trigger articulations
- Cubby Loader sets up instruments
- Cubby Remote controls expression in real-time
- Seamless workflow between apps

### Future: Cubby Composer

- Potential integration for score-based loading
- Auto-load instruments based on score instrumentation
- Sync with notation software

---

## Creating the Template File (Instructions for Claude Code)

When generating `Kontakt-16-Channels.cpr`:

### Required Elements

1. **Instrument Track:**
   - Name: "Kontakt Main"
   - VST: Kontakt 7 (or Kontakt 6 fallback)
   - Output: Stereo Out
   - MIDI Input: All MIDI Inputs

2. **16 MIDI Tracks:**
   - Names: "Ch 1", "Ch 2", ... "Ch 16"
   - Output: Routed to "Kontakt Main"
   - Channels: 1-16 respectively
   - Monitor: Enabled
   - Record Enable: Disabled by default
   - Colors: Sequential color palette

3. **Project Settings:**
   - Tempo: 120 BPM
   - Time Sig: 4/4
   - Sample Rate: 48000 Hz
   - Bit Depth: 24
   - Frame Rate: 25fps (PAL)

### XML Structure (Simplified)

```xml
<Cubase>
  <Project>
    <Tracks>
      <InstrumentTrack name="Kontakt Main" vst="Kontakt 7">
        <Output>Stereo Out</Output>
      </InstrumentTrack>
      
      <MIDITrack name="Ch 1" channel="1">
        <Output>Kontakt Main</Output>
        <Monitor>true</Monitor>
      </MIDITrack>
      
      <!-- Repeat for channels 2-16 -->
      
    </Tracks>
  </Project>
</Cubase>
```

**Note:** Actual .cpr files use binary format. May need to:
- Create template manually in Cubase
- Export and include in distribution
- Or provide step-by-step recreation instructions

---

## Platform-Specific Notes

### macOS Specific

- **MIDI permissions:** Grant Cubase access in System Preferences → Security & Privacy
- **Notarization:** Ensure Cubby Loader is notarized for Gatekeeper
- **Virtual MIDI:** Use IAC Driver (Audio MIDI Setup)

### Windows Specific

- **MIDI routing:** Use loopMIDI or similar virtual MIDI driver
- **UAC:** May need to run Cubase/Cubby Loader with admin rights initially
- **Paths:** Adjust template paths for Windows directory structure

---

## Video Tutorial Outline (for future creation)

1. **Introduction** (0:00-0:30)
   - What is Cubby Loader?
   - Benefits for Kontakt + Cubase users

2. **Installation** (0:30-2:00)
   - Install Cubby Loader
   - Install Cubase template
   - Configure MIDI routing

3. **Basic Workflow** (2:00-5:00)
   - Open template in Cubase
   - Select instruments in Cubby Loader
   - Load into Kontakt
   - Start composing

4. **Advanced Tips** (5:00-8:00)
   - Expression Maps integration
   - Saving presets
   - Multi-instance setups

5. **Troubleshooting** (8:00-10:00)
   - Common issues and solutions
   - Where to get help

---

## Support Resources

- **Documentation:** Full user guide included with Cubby Loader
- **GitHub Issues:** Report bugs and request features
- **Community:** (Optional) Discord or forum for users
- **Email Support:** For template/integration questions

---

## Changelog

### Version 1.0 (January 2026)
- Initial Cubase integration
- Project template for 16-channel setup
- Basic MIDI routing instructions
- Expression Maps guidelines

### Future Versions
- Deeper Generic Remote integration
- Automated Expression Map creation
- Support for more than 16 instruments (multi-instance)
- Integration with Cubby Remote

---

**Document Version:** 1.0  
**Created:** January 2026  
**For:** Cubby Loader - Cubase Integration
