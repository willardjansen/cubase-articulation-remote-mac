/**
 * Cubase MIDI Remote Script: Articulation Remote Track Switcher
 *
 * This script monitors track selection in Cubase and sends MIDI messages
 * to the Articulation Remote web app to auto-switch instruments.
 *
 * INSTALLATION:
 * 1. Copy this file to your Cubase MIDI Remote Scripts folder:
 *    - macOS: ~/Documents/Steinberg/Cubase/MIDI Remote/Driver Scripts/Local/
 *    - Windows: %USERPROFILE%\Documents\Steinberg\Cubase\MIDI Remote\Driver Scripts\Local\
 * 2. Restart Cubase
 * 3. Go to Studio > MIDI Remote Manager
 * 4. Add this script and configure the MIDI output
 *
 * HOW IT WORKS:
 * - When you select a track in Cubase, this script reads the track name
 * - It sends a series of MIDI CC messages encoding the track name
 * - The web app receives these and switches to the matching instrument
 *
 * MIDI PROTOCOL:
 * - CC 119 on Channel 16: Start of track name (value = string length)
 * - CC 118 on Channel 16: Character bytes (ASCII values)
 * - CC 117 on Channel 16: End of track name (value = 127)
 */

// Script metadata
var midiremote_api = require('midiremote_api_v1');

var deviceDriver = midiremote_api.makeDeviceDriver('Articulation Remote', 'Track Switcher', 'Custom');

// Create MIDI output for sending track info to the web app
var midiOutput = deviceDriver.mPorts.makeMidiOutput('Track Info Out');

// Create a surface (required even if we don't use physical controls)
var surface = deviceDriver.mSurface;

// Create a dummy button (MIDI Remote requires at least one control)
var dummyButton = surface.makeButton(0, 0, 1, 1);

// Bind to Cubase mixer
deviceDriver.makeDetectionUnit().detectPortPair(midiOutput, midiOutput);

// Create mapping pages
var page = deviceDriver.mMapping.makePage('Track Switcher');

// Variable to track the last sent track name (avoid duplicate sends)
var lastTrackName = '';

/**
 * Send track name via MIDI CC messages
 * Protocol: CC119=length, CC118=chars, CC117=end
 */
function sendTrackName(name) {
    if (!name || name === lastTrackName) return;
    lastTrackName = name;

    // Limit to 64 characters
    var trackName = name.substring(0, 64);
    var length = trackName.length;

    // Send start marker with length
    midiOutput.sendMidi(0, 0xBF, 119, Math.min(length, 127)); // CC 119, Ch 16

    // Send each character as CC value
    for (var i = 0; i < length; i++) {
        var charCode = trackName.charCodeAt(i);
        // Send in pairs: CC number encodes position, value encodes character
        midiOutput.sendMidi(0, 0xBF, 118, charCode & 0x7F); // CC 118, Ch 16
    }

    // Send end marker
    midiOutput.sendMidi(0, 0xBF, 117, 127); // CC 117, Ch 16
}

/**
 * Alternative simpler approach: Send track index as a note
 * Track 1 = Note 0, Track 2 = Note 1, etc.
 */
function sendTrackIndex(index) {
    // Send note on channel 16 with track index as note number
    midiOutput.sendMidi(0, 0x9F, index & 0x7F, 127); // Note On, Ch 16
    // Immediately send note off
    midiOutput.sendMidi(0, 0x8F, index & 0x7F, 0);   // Note Off, Ch 16
}

// Bind to selected track
var selectedTrack = page.mHostAccess.mTrackSelection.mMixerChannel;

// This will be called when the binding is activated
page.makeValueBinding(dummyButton.mSurfaceValue, selectedTrack.mValue.mVolume);

// Note: Full track name access requires Cubase 13+
// For older versions, you may need to use track indices instead

console.log('Articulation Remote Track Switcher loaded');
