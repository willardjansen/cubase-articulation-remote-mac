# CLAUDE.md - AI Assistant Handoff Guide

## Project Overview

Cubase Articulation Remote is a Next.js web app that displays Cubase Expression Map articulations as tappable buttons. When tapped, buttons send MIDI remote trigger notes to Cubase to switch articulations. Works on iPad via WebSocket bridge.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Windows/Mac Host                          │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │  Next.js    │    │ MIDI Bridge  │    │    Cubase     │  │
│  │  Web App    │───▶│  Server      │───▶│               │  │
│  │  :3000      │    │  :3001       │    │               │  │
│  └─────────────┘    └──────────────┘    └───────────────┘  │
│         ▲                  ▲                   ▲            │
└─────────│──────────────────│───────────────────│────────────┘
          │ HTTP             │ WebSocket         │ MIDI
          │                  │                   │
     ┌────┴──────────────────┴────┐         loopMIDI (Win)
     │         iPad               │         IAC Driver (Mac)
     │   Safari Browser           │
     └────────────────────────────┘
```

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom Cubase-themed colors
- **MIDI**: Web MIDI API + WebSocket fallback for iPad
- **MIDI Bridge**: Node.js with `jzz` and `ws` libraries
- **Storage**: localStorage for persistence

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main app component
│   │   ├── layout.tsx            # Root layout with PWA meta
│   │   ├── globals.css           # Tailwind + custom CSS
│   │   └── api/
│   │       └── expression-maps/
│   │           └── route.ts      # API for server-side maps
│   ├── components/
│   │   ├── ArticulationButton.tsx   # Individual articulation button
│   │   ├── ArticulationGrid.tsx     # Grid display with filtering
│   │   ├── FileDropZone.tsx         # Drag & drop file upload
│   │   ├── InstrumentLibrary.tsx    # Save/load + server maps
│   │   ├── MidiSettings.tsx         # MIDI device configuration
│   │   └── ServiceWorkerRegistration.tsx
│   └── lib/
│       ├── expressionMapParser.ts   # XML parsing & merging
│       └── midiHandler.ts           # Web MIDI + WebSocket
├── expression-maps/              # Server-side .expressionmap files
├── midi-server.js                # WebSocket MIDI bridge
├── public/
│   ├── icon.svg
│   ├── manifest.json
│   └── sw.js
└── package.json
```

## Key Components

### 1. MIDI Handler (`src/lib/midiHandler.ts`)
- Tries Web MIDI API first
- Falls back to WebSocket connection to `ws://HOST:3001`
- `useWebSocket` flag determines routing
- `sendMessages()` routes to appropriate output

### 2. MIDI Bridge Server (`midi-server.js`)
- Node.js WebSocket server on port 3001
- Receives JSON MIDI messages from iPad
- Forwards to local MIDI output via `jzz` library
- Auto-selects loopMIDI/IAC Driver

### 3. Expression Map Parser (`src/lib/expressionMapParser.ts`)
- Parses Cubase `.expressionmap` XML files
- Extracts `PSlotThruTrigger` remote trigger notes
- `autoAssignRemoteTriggers()` assigns C-2 upward for missing remotes

### 4. Server Maps API (`src/app/api/expression-maps/route.ts`)
- Lists .expressionmap files from `expression-maps/` folder
- Serves file content for loading

## Commands

```bash
npm install     # Install dependencies
npm run dev     # Start Next.js (port 3000, network accessible)
npm run midi    # Start MIDI bridge (port 3001)
npm run all     # Start both servers
npm run build   # Production build
```

## Windows Setup

### Prerequisites
1. Install Node.js v18+
2. Install loopMIDI: https://www.tobias-erichsen.de/software/loopmidi.html
3. Create port named "Browser to Cubase"

### Running
```bash
npm install
npm run midi    # Terminal 1
npm run dev     # Terminal 2
```

### Cubase Setup
1. Studio > Studio Setup > MIDI Port Setup
2. Enable loopMIDI port
3. Assign Expression Maps to tracks

### iPad Access
1. Find Windows IP: `ipconfig`
2. iPad Safari: `http://WINDOWS_IP:3000`

## macOS Setup

### Prerequisites
1. Enable IAC Driver in Audio MIDI Setup
2. Add bus "Browser to Cubase"

### Running
Same as Windows, IAC Driver auto-selected.

## Current State (Jan 2026)

### Working
- ✅ Load .expressionmap files via drag-drop
- ✅ Parse and display articulations
- ✅ Tap to send MIDI remote triggers
- ✅ WebSocket bridge for iPad
- ✅ Server-side expression map loading
- ✅ Multi-map merging
- ✅ Search/filter articulations

### Known Issues
- Server Maps tab slow on older iPads (works on Mac)
- Occasional duplicate MIDI messages (minor)

## Code Patterns

### MIDI Send (ArticulationButton.tsx)
```typescript
const handleClick = () => {
  if (articulation.remoteTrigger) {
    const { status, data1 } = articulation.remoteTrigger;
    // Note On
    midiHandler.sendMessages([{ status, data1, data2: 127 }]);
    // Note Off after delay
    setTimeout(() => {
      midiHandler.sendMessages([{ status: status - 16, data1, data2: 0 }]);
    }, 50);
  }
};
```

### WebSocket Fallback (midiHandler.ts)
```typescript
if (this.useWebSocket && this.webSocket?.readyState === WebSocket.OPEN) {
  this.webSocket.send(JSON.stringify({ type: 'midi', status, data1, data2 }));
} else {
  this.selectedOutput.send([status, data1, data2]);
}
```

## Testing Checklist

1. [ ] `npm install` succeeds
2. [ ] `npm run midi` connects to loopMIDI/IAC Driver
3. [ ] `npm run dev` starts on port 3000
4. [ ] Drop .expressionmap file loads
5. [ ] Tap articulation → MIDI sent (check console)
6. [ ] Cubase switches articulation
7. [ ] iPad connects via WebSocket
8. [ ] Server Maps lists files from expression-maps/

## Notes for AI Assistants

- **Remote triggers**: Send `PSlotThruTrigger` data, NOT `midiMessages` (keyswitches)
- **Merged maps**: Each articulation has its own `midiChannel`
- **iPad support**: Must work via WebSocket when Web MIDI unavailable
- **Test on Windows**: loopMIDI required for virtual MIDI
- Run `npm run build` to verify no TypeScript errors
