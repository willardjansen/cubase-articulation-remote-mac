# Continuation Prompt for Claude

Copy and paste this prompt when starting a new Claude session on Windows:

---

## Context

I'm continuing development of the Cubase Articulation Remote app on Windows. This is a Next.js web app that sends MIDI to Cubase when articulation buttons are tapped on iPad/tablet.

**Read CLAUDE.md first** for full architecture and code details.

## What's Working

- Web app displays expression map articulations as tappable buttons
- MIDI sends via Web MIDI API (Chrome) or WebSocket bridge (iPad Safari)
- Server-side expression maps load from `expression-maps/` folder
- iPad connects via WebSocket to MIDI bridge server

## Current Setup

The app needs two servers running:
1. `npm run dev` - Next.js web server on port 3000
2. `npm run midi` - WebSocket MIDI bridge on port 3001

On Windows, loopMIDI provides virtual MIDI routing to Cubase.

## What I Need Help With

[DESCRIBE YOUR TASK HERE - for example:]
- Test the app on Windows with loopMIDI
- Fix any Windows-specific issues
- Add new features
- Debug MIDI connectivity

## Quick Start Commands

```bash
# Install dependencies
npm install

# Start MIDI bridge (connects to loopMIDI)
npm run midi

# In another terminal, start web server
npm run dev

# Access at http://localhost:3000
# iPad access: http://YOUR_WINDOWS_IP:3000
```

## Key Files

- `midi-server.js` - WebSocket MIDI bridge
- `src/lib/midiHandler.ts` - Web MIDI + WebSocket handling
- `src/lib/expressionMapParser.ts` - Parses .expressionmap files
- `src/components/ArticulationButton.tsx` - Button click → MIDI send

---

**Note**: The MIDI bridge auto-selects "loopMIDI" or "Browser to Cubase" port. Make sure loopMIDI is running with a port created before starting `npm run midi`.
