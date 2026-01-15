# Windows Testing Note (Jan 15, 2026)

## ✅ TESTING COMPLETED

Testing of the Windows Electron app was successful. All features work as expected.

## What Was Done

- Converted the app to a standalone Electron app called "Cubby Remote"
- App runs as a system tray application (no window, opens browser for UI)
- Built Windows installer: `dist/Cubby Remote Setup 1.0.0.exe` (~130 MB)
- Successfully built on Windows PC with Developer Mode enabled

## What Was Tested

1. **✅ Install the app** - Ran `Cubby Remote Setup 1.0.0.exe`
   - ✅ Created Start Menu shortcut
   - ✅ Created Desktop shortcut (optional during install)
   - ✅ Installs to `C:\Users\USERNAME\AppData\Local\Programs\cubby-remote\`

2. **✅ Launch the app**
   - ✅ Appears in system tray (bottom right, near clock)
   - ✅ No window shown (runs in background)
   - ✅ Auto-opens browser to http://localhost:3000

3. **✅ Test MIDI connectivity**
   - ✅ loopMIDI running with ports: `Browser to Cubase` and `ArticulationRemote`
   - ✅ Tray menu shows MIDI ports connected
   - ✅ Articulation switching works with Cubase

4. **✅ Test expression map loading**
   - ✅ Tray menu "Add Expression Maps..." imports .expressionmap files
   - ✅ "Open Expression Maps Folder" opens correct location
   - ✅ Maps appear in browser UI under "Server Maps"

5. **✅ Test auto track switching**
   - ✅ Select tracks in Cubase
   - ✅ Browser auto-loads matching expression map

## If Something Doesn't Work

### MIDI not working
The `midi` native module was cross-compiled. If it doesn't work:
```powershell
cd "path\to\cubase-articulation-remote"
npm rebuild midi
npm run electron:build
```

### App crashes on startup
Check Windows Event Viewer for errors, or run from command line:
```powershell
"C:\Users\USERNAME\AppData\Local\Programs\cubby-remote\Cubby Remote.exe"
```

### Need to rebuild from source
```powershell
git pull
npm install
npm run electron:build
```
The installer will be at `dist/Cubby Remote Setup 1.0.0.exe`

## Files Location After Install
- App: `C:\Users\USERNAME\AppData\Local\Programs\cubby-remote\`
- Expression maps: `C:\Users\USERNAME\AppData\Local\Programs\cubby-remote\resources\expression-maps\`

## Build Notes

**Requirements for Building on Windows:**
- Windows Developer Mode must be enabled (Settings → For developers → Developer Mode)
- This allows symlink creation without admin privileges
- Without Developer Mode, build fails with "cannot create symbolic link" error

**Build Command:**
```bash
npm run electron:build
```

**Build Time:** ~2-3 minutes on modern PC

**Installer Size:** ~130 MB (includes Electron runtime, Chromium, Node.js, and all dependencies)

---

## Summary

The Windows Electron app is production-ready. All features tested successfully:
- ✅ Installation and shortcuts
- ✅ System tray integration
- ✅ MIDI connectivity (loopMIDI)
- ✅ Expression map loading
- ✅ Auto track switching from Cubase
- ✅ Articulation switching

**Ready for release!**
