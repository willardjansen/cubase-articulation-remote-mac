# Installation Guide

## Requirements

- **macOS** or **Windows** computer running Cubase 12+
- **Node.js** 18+ (for running the app locally)
- **iPad** with iOS 16.4+ (or any modern browser with Web MIDI support)
- **Network MIDI** or **IAC Driver** for MIDI routing

---

## Step 1: Install the Web App

### Option A: Run Locally (Recommended for Development)

```bash
# Clone or download the project
cd cubase-articulation-remote

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app runs at **http://localhost:3000**

### Option B: Build for Production

```bash
npm run build
npm run start
```

### Option C: Deploy to a Server

Build the app and deploy the `.next` folder to any Node.js hosting service (Vercel, Railway, etc.)

---

## Step 2: Set Up MIDI Routing

The app needs to send MIDI to Cubase. You need a virtual MIDI bus.

### Windows: loopMIDI (Recommended)

loopMIDI creates virtual MIDI ports on Windows. It's free and widely used.

1. **Download** [loopMIDI](https://www.tobias-erichsen.de/software/loopmidi.html)
2. **Install** and run loopMIDI
3. Click the **+** button to create a new port
4. Name it **"Browser to Cubase"**
5. The port appears in the list - it's now active
6. loopMIDI runs in the system tray - keep it running while using the app

**Tip:** Add loopMIDI to Windows Startup so it's always available:
- Right-click loopMIDI in system tray → "Autostart"

### Windows: Network MIDI (for iPad/Remote Device)

To use the app from an iPad or another device over WiFi:

1. **Download** [rtpMIDI](https://www.tobias-erichsen.de/software/rtpmidi.html)
2. **Install** rtpMIDI (requires restart)
3. Open rtpMIDI from Start menu
4. In **"My Sessions"**, click **+** to create a session
5. Name it **"Articulation Remote"**
6. Check the box to **enable** the session
7. Note the session name for connecting from iPad

**On iPad:**
- Ensure iPad is on the same WiFi network
- The network MIDI session will appear in the app's MIDI settings

### macOS: IAC Driver

1. Open **Audio MIDI Setup** (Applications → Utilities)
2. Go to **Window → Show MIDI Studio**
3. Double-click **IAC Driver**
4. Check **"Device is online"**
5. Optionally rename the bus to "Browser to Cubase"

### macOS: Network MIDI (for iPad)

1. In **Audio MIDI Setup** → **Window → Show MIDI Studio**
2. Double-click **Network** icon
3. Create a new session (e.g., "Articulation Remote")
4. Enable the session
5. On iPad, connect to the same WiFi network

---

## Step 3: Configure Cubase

### Set Track MIDI Input

1. Select your instrument track with the Expression Map
2. In the Inspector, set **MIDI Input** to receive from:
   - "IAC Driver Bus 1" (macOS)
   - "loopMIDI Port" (Windows)
   - Or your Network MIDI session
3. Keep "All MIDI Inputs" if you also want keyboard input

### Verify Expression Map Remote Triggers

1. Open **Studio → Expression Map Setup**
2. Check that your articulations have **Trigger** notes assigned
3. If "Trigger" column shows "---", the app will auto-assign notes

---

## Step 4: Install Cubase MIDI Remote Script (Optional)

For auto-switching instruments when you change tracks in Cubase:

### Windows

1. Open File Explorer
2. Navigate to:
   ```
   C:\Users\[YourUsername]\Documents\Steinberg\Cubase\MIDI Remote\Driver Scripts\Local\
   ```
   (Create the `Local` folder if it doesn't exist)
3. Copy `CubaseArticulationRemote.js` from the project's `cubase-midi-remote` folder
4. Restart Cubase

**Or via Command Prompt:**
```cmd
copy cubase-midi-remote\CubaseArticulationRemote.js "%USERPROFILE%\Documents\Steinberg\Cubase\MIDI Remote\Driver Scripts\Local\"
```

### macOS
```bash
cp cubase-midi-remote/CubaseArticulationRemote.js \
   ~/Documents/Steinberg/Cubase/MIDI\ Remote/Driver\ Scripts/Local/
```

Then restart Cubase.

### Verify Installation

1. Open Cubase
2. Go to **Studio → MIDI Remote Manager**
3. You should see "Articulation Remote - Track Switcher" in the list
4. Configure it to use your loopMIDI/IAC Driver port

---

## Step 5: Connect the App

1. Open the app in your browser (http://localhost:3000)
2. Click the **gear icon** (MIDI Settings)
3. Select your MIDI output (IAC Driver, loopMIDI, or Network)
4. Optionally select MIDI input for auto-switching
5. Close settings

---

## Step 6: Add to iPad Home Screen (PWA)

1. Open Safari on iPad
2. Navigate to the app URL
3. Tap **Share** button → **Add to Home Screen**
4. Name it "Cubase Remote"
5. Tap **Add**

The app now launches in full-screen mode without Safari UI.

---

## Troubleshooting

### "No MIDI" / No devices shown

**Windows:**
- Ensure **loopMIDI** is running (check system tray)
- Use **Chrome** or **Edge** (Firefox doesn't support Web MIDI)
- Try restarting the browser after starting loopMIDI

**macOS:**
- Ensure IAC Driver is online in Audio MIDI Setup

**iPad:**
- Use Safari (Chrome/Firefox iOS don't support Web MIDI)
- May need to enable in Settings → Safari → Advanced

### App doesn't connect to Cubase

**Windows:**
- Verify loopMIDI port exists and is named correctly
- In Cubase: Studio → Studio Setup → MIDI Port Setup
- Ensure the loopMIDI port is **visible** and **enabled**
- Check "In 'All MIDI Inputs'" is checked for the port

**General:**
- Verify Cubase track MIDI input is set to receive from the virtual port
- Try the "Send Test Note" button in MIDI Settings
- Check Cubase MIDI activity indicator in Transport bar

### Articulations don't switch
- Verify Expression Map has remote triggers assigned
- Check the trigger notes match what the app sends
- Look at browser console (F12) for MIDI output logs
- In Cubase, check the Expression Map Setup → Trigger column

### loopMIDI port not appearing (Windows)
- Run loopMIDI as Administrator
- Try uninstalling and reinstalling loopMIDI
- Restart Windows after installation
- Check Windows MIDI services are running

### Network MIDI latency
- Use loopMIDI/IAC Driver for lowest latency on same machine
- For iPad, ensure strong WiFi signal (5GHz preferred)
- Network MIDI adds ~5-20ms latency
- rtpMIDI on Windows may have higher latency than macOS Network MIDI

### Browser blocks MIDI access
- Chrome/Edge may require HTTPS for MIDI access on some systems
- Try running in localhost (which is always allowed)
- Check browser console for permission errors
