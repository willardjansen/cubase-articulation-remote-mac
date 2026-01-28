# Kontakt .nkm Multi Script Analysis

## What We Discovered

The BabylonWaves Art Conductor Script is a **Kontakt Multi file (.nkm)** that contains:

1. **KSP (Kontakt Script Processor) code** - The actual scripting logic
2. **Binary metadata** - Kontakt-specific formatting and structure
3. **Multi configuration** - How instruments/snapshots are loaded and routed

## Extracted KSP Script (Partial)

From the .nkm file, we can see this KSP code structure:

```ksp
on init
  set_script_title("Art Conductor Script 1.2")
  declare $mchannel := 0
end on

on midi_in
  if ($MIDI_COMMAND = $MIDI_COMMAND_CC)
    // MIDI channel routing logic here
    // Handles CC messages to switch between channels/articulations
  end if
end on
```

## What the Script Does

Based on the structure, this script:

1. **Listens for MIDI CC messages** (likely CC32 for UACC or similar)
2. **Routes MIDI to different channels** based on incoming CC values
3. **Enables multi-channel articulation switching** within a single Kontakt instance
4. **Ties together multiple loaded snapshots** (.nksn files) as one cohesive instrument

## The .nkm File Structure

```
.nkm file contains:
├── Binary header (Kontakt format identifier)
├── Metadata
│   ├── Script title
│   ├── Kontakt version (6.5.2.113 in this case)
│   ├── Script name
│   └── Device type flags
├── KSP Script Code (embedded as binary)
├── Multi configuration
│   ├── Loaded instruments/snapshots
│   ├── Channel assignments
│   ├── Output routing
│   └── Tempo/time signature
└── Binary footer
```

---

## What Cubby Loader Needs to Generate

For multi-timbral articulation setup, Cubby Loader must create a .nkm file that:

### 1. Loads Multiple Snapshots

```xml
<!-- Conceptual structure -->
<Multi>
  <Instrument slot="0" channel="1" file="Art_Conductor_Part_1.nksn"/>
  <Instrument slot="1" channel="2" file="Art_Conductor_Part_2.nksn"/>
  <Instrument slot="2" channel="3" file="Art_Conductor_Part_3.nksn"/>
  <Instrument slot="3" channel="4" file="Art_Conductor_Part_4.nksn"/>
</Multi>
```

### 2. Includes KSP Script for Channel Routing

**Basic KSP script template:**

```ksp
on init
  set_script_title("Cubby Loader Multi-Channel Router")
  
  // Declare variables for channel management
  declare $current_channel
  declare $target_channel
  
  // UACC CC number (industry standard)
  declare const $UACC_CC := 32
  
  message("Multi-channel articulation routing enabled")
end on

on midi_in
  // Route MIDI based on CC32 (UACC) values
  if ($MIDI_COMMAND = $MIDI_COMMAND_CC and $CC_NUM = $UACC_CC)
    // CC32 value determines target channel
    $target_channel := $CC[$UACC_CC]
    
    // Route subsequent notes to the target channel
    set_event_par($EVENT_ID, $EVENT_PAR_MIDI_CHANNEL, $target_channel - 1)
  end if
  
  // Pass through note events to appropriate channel
  if ($MIDI_COMMAND = $MIDI_COMMAND_NOTE_ON or $MIDI_COMMAND = $MIDI_COMMAND_NOTE_OFF)
    // Notes are sent to the last selected channel
  end if
end on

on controller
  // Handle CC routing for dynamics, expression, etc.
  if ($CC_NUM <> $UACC_CC)
    // Pass CC to currently active channel
    set_event_par($EVENT_ID, $EVENT_PAR_MIDI_CHANNEL, $target_channel - 1)
  end if
end on
```

### 3. Alternative Approach: Direct Channel Assignment (Simpler)

Instead of complex CC routing, Cubby Loader could use **Cubase's expression map** to send MIDI directly to the correct channels, and the .nkm file just needs to:

1. Load all snapshots
2. Assign each to a channel (1, 2, 3, 4...)
3. No complex KSP routing needed

**This is simpler and lets Cubase handle the articulation switching!**

---

## Implementation Strategy for Cubby Loader

### Option A: Generate Custom .nkm with Embedded Script (Complex)

**Pros:**
- Works standalone (script is inside Kontakt)
- Kontakt handles articulation switching
- More "native" Kontakt workflow

**Cons:**
- Must generate binary .nkm format (complex)
- Must write/test KSP code
- Kontakt .nkm format may change between versions

### Option B: Generate Simple .nkm + Let Cubase Do Routing (Simpler)

**Pros:**
- .nkm file is just a container for loaded instruments
- Cubase expression map handles all articulation switching
- No complex KSP scripting needed
- More maintainable

**Cons:**
- Requires Cubase to be set up correctly
- Less "native" to Kontakt users who expect internal routing

---

## Recommended Approach: Option B (Cubase-Driven)

### How It Would Work:

1. **User selects .nksn files** (e.g., Art Conductor Parts 1-4)

2. **Cubby Loader generates a .nkm Multi file** that:
   ```
   - Loads Part 1 → Instrument Slot 0 → MIDI Channel 1
   - Loads Part 2 → Instrument Slot 1 → MIDI Channel 2
   - Loads Part 3 → Instrument Slot 2 → MIDI Channel 3
   - Loads Part 4 → Instrument Slot 3 → MIDI Channel 4
   ```

3. **Cubby Loader generates expression map** for Cubase:
   ```xml
   <Articulation name="Long">
     <OutputChannel>1</OutputChannel>
   </Articulation>
   <Articulation name="Short">
     <OutputChannel>2</OutputChannel>
   </Articulation>
   <Articulation name="Pizzicato">
     <OutputChannel>3</OutputChannel>
   </Articulation>
   ```

4. **Cubase sends MIDI to correct channels** based on selected articulation

5. **Kontakt receives on respective channels** and plays the correct snapshot

**No complex KSP script needed!**

---

## .nkm File Generation

### Minimum Required .nkm Structure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<NKM>
  <Program name="Cubby Loader Multi">
    <Slots>
      <Slot index="0">
        <File>/path/to/Part_1.nksn</File>
        <Channel>1</Channel>
      </Slot>
      <Slot index="1">
        <File>/path/to/Part_2.nksn</File>
        <Channel>2</Channel>
      </Slot>
      <Slot index="2">
        <File>/path/to/Part_3.nksn</File>
        <Channel>3</Channel>
      </Slot>
      <Slot index="3">
        <File>/path/to/Part_4.nksn</File>
        <Channel>4</Channel>
      </Slot>
    </Slots>
  </Program>
</NKM>
```

**Note:** The actual .nkm format is binary/proprietary, but we can:
- Research Kontakt .nkm XML format (if documented)
- Reverse-engineer by creating test Multis in Kontakt and examining them
- Use Kontakt's native "Save Multi" functionality programmatically

---

## Alternative: Let User Create Multi Manually (Fallback)

If generating .nkm files proves too complex initially:

1. **Cubby Loader guides the user:**
   - "Load these .nksn files into Kontakt manually"
   - "Assign them to channels 1, 2, 3, 4"
   - "Save as Multi in Kontakt"

2. **Then Cubby Loader:**
   - Generates the expression map
   - Sets up Cubase MIDI track
   - User loads the saved Multi

**This is a valid MVP approach while we figure out .nkm generation!**

---

## Research Tasks for Claude Code

1. **Reverse-engineer .nkm binary format:**
   - Create test Multis in Kontakt with different configurations
   - Compare binary structures
   - Identify patterns for instrument loading and channel assignment

2. **Test KSP scripting approach:**
   - Write minimal KSP script for channel routing
   - Embed in .nkm file
   - Test in Kontakt

3. **Test Cubase-only approach:**
   - Create Multi with basic channel assignments (no script)
   - Use Cubase expression maps for all routing
   - Validate workflow

4. **Explore Kontakt API:**
   - Check if Native Instruments provides .nkm generation tools
   - Look for official documentation
   - Community libraries/tools

---

## Articulation Detection Strategy

Once .nkm is loaded (or user confirms manual loading), Cubby Loader needs to:

### Detect Articulations from Snapshot Names

**Pattern matching on filenames:**
```
Art_Conductor_Part_1.nksn → Likely "Long" or "Sustain"
Art_Conductor_Part_2.nksn → Likely "Short" or "Staccato"
Art_Conductor_Part_3.nksn → Likely "Pizzicato"
Art_Conductor_Part_4.nksn → Likely "Tremolo" or special technique
```

**Use a keyword database:**
```javascript
const articulationKeywords = {
  long: ['long', 'sustain', 'legato', 'sus'],
  short: ['short', 'staccato', 'spiccato', 'stacc'],
  pizzicato: ['pizz', 'pizzicato', 'pluck'],
  tremolo: ['trem', 'tremolo'],
  // ... etc
};
```

### Or Let User Define

**UI for mapping:**
```
Part 1 → [Dropdown: Long / Short / Pizz / Custom...]
Part 2 → [Dropdown: Long / Short / Pizz / Custom...]
Part 3 → [Dropdown: Long / Short / Pizz / Custom...]
Part 4 → [Dropdown: Long / Short / Pizz / Custom...]
```

---

## Integration with Existing Expression Maps

For libraries like BabylonWaves that already have .expressionmap files:

1. **User can optionally provide existing .expressionmap**
2. **Cubby Loader:**
   - Parses it to understand articulation structure
   - Uses same articulation names/symbols
   - Adjusts MIDI channel assignments to match loaded snapshots
   - Generates updated .expressionmap with correct channels

**This ensures compatibility with user's existing workflow!**

---

## Summary: What Cubby Loader Must Do

### For Multi-Timbral Mode:

1. ✅ **Accept multiple .nksn files** from user
2. ✅ **Generate .nkm Multi file** (or guide manual creation)
3. ✅ **Load .nkm into Kontakt** (or instruct user to load)
4. ✅ **Generate Cubase expression map** with channel routing
5. ✅ **Create ONE MIDI track** in Cubase
6. ✅ **Assign expression map** to that track
7. ✅ **Ready to compose** with full articulation control

### For Single-Instrument Mode:

1. ✅ **Accept one .nksn per instrument**
2. ✅ **Create separate Kontakt instances**
3. ✅ **Create separate MIDI tracks**
4. ✅ **Simpler expression maps** (or none if single articulation)

---

## Next Steps

1. **Decision:** Option A (generate full .nkm with script) or Option B (simple .nkm + Cubase routing)?
2. **Research:** Reverse-engineer .nkm binary format or use XML if available
3. **Prototype:** Test multi-channel workflow in Kontakt + Cubase
4. **Implement:** Build .nkm generator in Cubby Loader
5. **Test:** Validate with various sample libraries

---

**Document Version:** 1.0  
**Created:** January 2026  
**For:** Cubby Loader - Multi-Timbral Implementation
