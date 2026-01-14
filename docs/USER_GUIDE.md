# User Guide

## Overview

Cubase Articulation Remote lets you switch articulations in Cubase by tapping buttons on your iPad or computer browser. Instead of hunting for keyswitches on your MIDI keyboard, you get a visual grid of all available articulations.

---

## Getting Started

### 1. Load Expression Maps

**Single File:**
- Drag and drop a `.expressionmap` file onto the drop zone
- Or click the drop zone to browse

**Multiple Files (Multitimbral):**
- Select multiple `.expressionmap` files and drop them together
- They automatically merge into one view
- Each articulation shows its MIDI channel (Ch1, Ch2, etc.)

### 2. Connect MIDI

1. Click the **gear icon** (⚙️) in the top right
2. Select your MIDI output device
3. Choose the MIDI channel (or use merged map's per-articulation channels)
4. Click "Send Test Note" to verify connection

### 3. Switch Articulations

- **Tap** any articulation button
- The app sends the remote trigger note to Cubase
- Cubase activates that articulation
- Play your instrument - it uses the new articulation!

---

## Interface Guide

### Header Bar

| Element | Description |
|---------|-------------|
| **Cubase Remote** | App title |
| **Status dot** | Green = MIDI connected, Red = No MIDI |
| **Columns dropdown** | Change grid column count (3-8) |
| **Size dropdown** | Button size: Small, Medium, Large |
| **Library icon** | Open instrument library |
| **Gear icon** | MIDI settings |

### Tab Bar

When you have expression maps loaded:
- **Tabs** show loaded maps (click to switch)
- **X button** removes a map
- **+ Add** loads another map
- **Merge All** combines all tabs into one view (when multiple loaded)

### Articulation Grid

- **Colored buttons** = Articulations (colors match Cubase)
- **Top text** = Articulation short name
- **Bottom text** = Remote trigger note (e.g., "C-2", "Ch2 D-1")
- **Yellow dot** (top-right) = Direction articulation
- **Orange dot** (top-left) = Auto-assigned remote trigger
- **White ring** = Currently active articulation

### Filters

- **Search box** = Filter by name
- **All / Attr / Dir** = Filter by articulation type

---

## Features

### Instrument Library

Save your instrument setups for quick loading:

1. Load and configure your expression maps
2. Click the **Library icon** (📦)
3. Click **"Save Current Instrument"**
4. Enter a name (e.g., "Amati Viola Full")
5. Click **Save**

To load a saved instrument:
1. Click the **Library icon**
2. Click on any saved instrument
3. It loads instantly with all settings

### Merged Maps (Multitimbral)

For instruments with multiple parts on different MIDI channels:

1. Drop all Part files together (Part 1, 2, 3, 4)
2. They merge automatically
3. Each button shows its channel: **Ch1**, **Ch2**, etc.
4. Tapping sends on the correct channel automatically

### Auto-Assigned Remote Triggers

If your expression map doesn't have remote triggers assigned:

- The app auto-assigns notes starting from **C-2** (MIDI note 0)
- Orange dot indicates auto-assigned triggers
- Click **"Export CSV"** to see the assignments
- Update your expression map in Cubase to match

### Search & Filter

- **Search**: Type to filter by articulation name
- **Type filter**: Show only Attributes or Directions
- Useful for large maps (100+ articulations)

---

## MIDI Settings

### Output Device
Select where to send MIDI:
- **loopMIDI Port** (Windows) - e.g., "Browser to Cubase"
- **IAC Driver Bus** (macOS) - e.g., "IAC Driver Bus 1"
- **Network Session** (for iPad over WiFi via rtpMIDI/Network MIDI)

**Windows Users:** Make sure loopMIDI is running before opening the app. The port won't appear otherwise.

### Input Device (Auto-Switch)
Select to receive track change signals from Cubase:
- Requires the Cubase MIDI Remote script installed
- When you select a track in Cubase, the app switches instruments

### MIDI Channel
For non-merged maps:
- Select which channel to send on (1-16)
- Merged maps ignore this (use per-articulation channels)

### Test Note
- Sends a C3 note on/off
- Use to verify MIDI connection
- You should hear/see activity in Cubase

---

## Workflow Tips

### Composing Workflow

1. Open Cubase project with instrument tracks
2. Load matching expression maps in the app
3. Save as instrument in Library
4. Position iPad/tablet where you can see it while playing
5. Tap articulations as needed while playing

### Multiple Instruments

- Save each instrument setup to Library
- Switch between them by loading from Library
- Or keep multiple browser tabs open

### Large Maps

- Use **Search** to quickly find articulations
- Filter by **Attribute/Direction** type
- Increase **columns** for more visible at once
- Use **Small** button size for overview

---

## Keyboard Shortcuts

The app is designed for touch, but on desktop:

- **Click** = Tap articulation
- **Escape** = Close modals

---

## Troubleshooting

### Articulation doesn't change in Cubase

1. Check MIDI connection (green dot in header)
2. Verify Cubase track input is set to receive from your MIDI port
3. Check Expression Map is assigned to the track
4. Ensure remote trigger notes match

### Wrong articulation activates

- The remote trigger notes may not match
- Export CSV and compare with Cubase Expression Map Setup
- Update either the app or Cubase to match

### Button shows "No Remote"

- That articulation has no remote trigger in the expression map
- The app can't send a note to trigger it
- Edit your expression map in Cubase to add a remote trigger

### Laggy response

- Use loopMIDI/IAC Driver instead of Network MIDI for lowest latency
- Network MIDI adds ~5-20ms latency
- Ensure strong WiFi signal for iPad

### Windows: No MIDI devices shown

1. Ensure **loopMIDI** is running (check system tray icon)
2. Restart the browser after starting loopMIDI
3. Use **Chrome** or **Edge** (Firefox doesn't support Web MIDI)
4. If still not working, try running loopMIDI as Administrator

### Windows: Cubase doesn't receive MIDI

1. Open Cubase → **Studio → Studio Setup**
2. Go to **MIDI Port Setup**
3. Find your loopMIDI port (e.g., "Browser to Cubase")
4. Ensure **Visible** is checked
5. Ensure **In 'All MIDI Inputs'** is checked
6. Click **OK** and restart Cubase if needed
