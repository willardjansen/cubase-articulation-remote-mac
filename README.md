# Cubase Articulation Remote

A web-based remote control for Cubase Expression Maps, designed for iPad/tablet use. Load your expression maps and tap articulations to switch sounds in Cubase via MIDI.

## Features

- **iPad Optimized** - Touch-friendly interface designed for tablets
- **Multi-File Drop** - Drop multiple expression maps, auto-merge into one view
- **Instrument Library** - Save and load instrument configurations
- **Server-Side Maps** - Load expression maps from a folder on your Mac
- **MIDI Channels** - Merged maps auto-send on correct channels (Ch1-4)
- **Auto-Assign Remotes** - Missing trigger notes are auto-assigned
- **Cubase Colors** - Buttons match your Cubase color coding
- **Search & Filter** - Find articulations in large libraries
- **PWA Support** - Install as an app on your iPad
- **WebSocket Bridge** - Works on iPad without special apps

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Servers

```bash
# Terminal 1: Start the MIDI bridge (required for iPad)
npm run midi

# Terminal 2: Start the web server
npm run dev
```

Or run both together:
```bash
npm run all
```

### 3. Access the App

| Device | URL |
|--------|-----|
| Mac (localhost) | http://localhost:3000 |
| iPad / Network | http://YOUR_MAC_IP:3000 |

Find your Mac's IP: `ipconfig getifaddr en0`

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Mac                                  │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │  Next.js    │    │ MIDI Bridge  │    │    Cubase     │  │
│  │  Web App    │───▶│  Server      │───▶│               │  │
│  │  :3000      │    │  :3001       │    │               │  │
│  └─────────────┘    └──────────────┘    └───────────────┘  │
│         ▲                  ▲                   ▲            │
└─────────│──────────────────│───────────────────│────────────┘
          │ HTTP             │ WebSocket         │ MIDI
          │                  │                   │
     ┌────┴──────────────────┴────┐              │
     │         iPad               │         IAC Driver /
     │   Safari Browser           │         loopMIDI
     │   http://192.168.1.38:3000 │
     └────────────────────────────┘
```

### How it Works

- **On Mac (Chrome/Safari)**: Uses Web MIDI API directly
- **On iPad**: Automatically connects via WebSocket to the MIDI Bridge server on your Mac

## MIDI Setup

### macOS (IAC Driver)

1. Open **Audio MIDI Setup**
2. Go to **Window > Show MIDI Studio**
3. Double-click **IAC Driver**
4. Check **Device is online**
5. Add a bus named "Browser to Cubase"

### Windows (loopMIDI)

1. Install **[loopMIDI](https://www.tobias-erichsen.de/software/loopmidi.html)**
2. Create a port named "Browser to Cubase"
3. Keep loopMIDI running

### In Cubase

1. **Studio > Studio Setup > MIDI Port Setup**
2. Enable the IAC Driver / loopMIDI port for input
3. Assign Expression Maps to your tracks
4. Remote triggers will now respond to the app

## Server-Side Expression Maps

Store your expression maps on the server for easy loading:

### Setup

1. Create the folder:
```bash
mkdir expression-maps
```

2. Copy your `.expressionmap` files into it:
```
expression-maps/
├── Strings/
│   ├── Violin.expressionmap
│   └── Cello.expressionmap
└── Brass/
    └── Trumpets.expressionmap
```

3. Access them via the **Library** button (folder icon) in the app

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start web server (network accessible) |
| `npm run midi` | Start MIDI bridge server |
| `npm run all` | Start both servers |
| `npm run build` | Build for production |

## Troubleshooting

### iPad shows "MIDI Bridge not running"

Start the MIDI bridge server on your Mac:
```bash
npm run midi
```

### No MIDI outputs on Mac

1. Verify IAC Driver is enabled in Audio MIDI Setup
2. Refresh the page
3. Grant MIDI permissions when prompted

### Articulations not switching

1. Check Expression Map is assigned to the track
2. Verify Cubase MIDI input includes IAC Driver
3. Ensure remote triggers are assigned in Expression Map

## How It Works

The app sends **remote trigger notes** (not keyswitches) to Cubase:

```
Tap "Legato" button
       │
       ▼
  Note On: C-2  ──────▶  Cubase Expression Map
  Note Off: C-2 ──────▶  receives remote trigger,
                         activates articulation
```

This ensures Cubase handles articulation state, display, and notation correctly.

## Browser Compatibility

| Platform | Browser | Support |
|----------|---------|---------|
| Mac | Chrome/Safari | ✅ Web MIDI |
| iPad | Safari | ✅ WebSocket Bridge |
| Windows | Chrome/Edge | ✅ Web MIDI |
| Any | Firefox | ❌ No Web MIDI |

## Project Structure

```
├── src/
│   ├── app/                    # Next.js pages
│   ├── components/             # React components
│   └── lib/
│       ├── expressionMapParser # XML parsing
│       └── midiHandler         # MIDI + WebSocket
├── expression-maps/            # Server-side maps (you create)
├── midi-server.js              # WebSocket MIDI bridge
└── public/
    ├── manifest.json           # PWA manifest
    └── sw.js                   # Service worker
```

## License

MIT License

## Credits

- [Art Conductor](https://www.babylonwaves.com/) - Expression map collections
- [Metagrid](https://metasystem.io/) - Inspiration for DAW remote concept
