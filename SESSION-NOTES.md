# Session Notes - January 2026

---
## AUTO TRACK SWITCHING - Current Session (Pick up here!)
---

### Status: Almost Working!

The auto track switching feature is 95% complete. MIDI flows from Cubase but port naming caused issues.

### What's Done
- ✅ Standalone MIDI Remote script: `articulation/remote` in Cubase
- ✅ Script: `C:\Program Files\Steinberg\Cubase 15\midiremote_factory_scripts\Public\articulation\remote\articulation_remote.js`
- ✅ midi-server.js uses `midi` npm package (jzz had Windows issues)
- ✅ midiHandler.ts connects WebSocket for track names
- ✅ page.tsx has findMatchingMapIndex() for auto-switching

### Current Issue
- loopMIDI port naming confusion - using fresh name "TrackSender"
- Cubase became unstable - user is restarting computer

### Next Steps After Restart
1. Open loopMIDI - ensure only these ports:
   - "Browser to Cubase"
   - "TrackSender"
2. Start Cubase with **NEW EMPTY project**
3. Add articulation/remote device:
   - Vendor: **articulation**
   - Model: **remote**
   - Output: **TrackSender**
4. Run `npm run midi` - should show `✅ Input: TrackSender`
5. Switch tracks → should see CC messages [191, 119, ...] not Note messages

### Debug: If Note On/Off appears instead of CC
- Wrong port connected - KeyLab LED data leaking through
- Check MIDI Remote Manager for disconnected KeyLab instances

---

## Previous Session Notes

## What We Fixed

### 1. Windows loopMIDI Feedback Loop (SOLVED)
Cubase was hanging when MIDI bridge ran. Fix:
- **Preferences > MIDI** → Uncheck "MIDI Thru Active" (later re-enabled)
- **MIDI Port Setup** → "Browser to Cubase" Output → Uncheck "Visible"
- This prevents MIDI feedback loop with loopMIDI on Windows

### 2. IP Auto-Detection (SOLVED)
Updated `midi-server.js` to auto-detect local IP instead of hardcoded Mac IP.
- Now displays correct IP on startup
- Works with Ethernet + iPad on WiFi

### 3. Documentation Updated
- CLAUDE.md, README.md, docs/INSTALL.md, CONTINUE-PROMPT.md
- Added Windows MIDI feedback loop fix instructions
- Added IP auto-detection info
- Added Ethernet/WiFi network note

## Current Issue (UNRESOLVED)

### KeyLab Essential 88 Not Working
After MIDI port changes, the Arturia KeyLab stopped working in Cubase.

**Symptoms:**
- Shows "disconnected" in MIDI Remote Manager
- Duplicate entries keep appearing
- No MIDI input when pressing keys
- Knobs/faders also not working

**What we tried:**
- Re-enabled MIDI Thru Active
- Deleted MIDI Remote User Settings folder
- Removed all KeyLab entries from MIDI Remote Manager
- Reset MIDI Port Setup (clicked Reset button)
- Verified keyboard shows in Windows Device Manager

**Current state:**
- User is restarting PC
- Browser to Cubase Output is still unchecked (to prevent feedback)
- All other settings should be at defaults

**Next steps after restart:**
1. Make sure loopMIDI is running with "Browser to Cubase" port
2. Open Cubase
3. Test if KeyLab works before changing any settings
4. If still broken, may need to reinstall Arturia MIDI Control Center drivers

## Working Configuration (when everything works)

### MIDI Port Setup:
- Browser to Cubase **Input**: Visible ✓, Active ✓, In 'All MIDI Inputs' ✓
- Browser to Cubase **Output**: Visible **UNCHECKED** (prevents feedback)
- KeyLab Essential 88 **Input**: Visible ✓, Active ✓, In 'All MIDI Inputs' ✓
- All other ports: default settings

### Preferences:
- MIDI Thru Active: **ON** (needed for keyboard to play through VSTis)

### Servers:
- `npm run midi` - WebSocket MIDI bridge on port 3001
- `npm run dev` - Next.js web server on port 3000
- iPad connects to: http://PC_IP:3000 (IP shown when midi server starts)
