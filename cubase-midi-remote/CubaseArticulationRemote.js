/**
 * Cubase MIDI Remote Script: Articulation Remote Track Switcher
 *
 * Sends track name to the Articulation Remote web app when you switch tracks.
 *
 * SETUP:
 * 1. Copy to: %USERPROFILE%\Documents\Steinberg\Cubase\MIDI Remote\Driver Scripts\Local\
 * 2. Restart Cubase
 * 3. Studio > MIDI Remote Manager > + Add MIDI Controller Surface
 * 4. Select "Articulation Remote" > "Track Switcher"
 * 5. Assign MIDI Output to "Cubase to Browser"
 */

var midiremote_api = require('midiremote_api_v1');

// Device driver definition
var deviceDriver = midiremote_api.makeDeviceDriver('Articulation Remote', 'Track Switcher', 'Custom');

// MIDI ports
var midiInput = deviceDriver.mPorts.makeMidiInput('Input');
var midiOutput = deviceDriver.mPorts.makeMidiOutput('Output');

// Detection - allows manual adding
deviceDriver.makeDetectionUnit().detectPortPair(midiInput, midiOutput);

// Surface with a minimal control
var surface = deviceDriver.mSurface;
var knob = surface.makeKnob(0, 0, 1, 1);

// Mapping page
var page = deviceDriver.mMapping.makePage('Main');

// Track the last sent name to avoid duplicates
var lastTrackName = '';

// Bind to selected track's volume (we don't care about the value, just the title)
var binding = page.makeValueBinding(knob.mSurfaceValue, page.mHostAccess.mTrackSelection.mMixerChannel.mValue.mVolume);

// When track selection changes, the title of this binding changes to the track name
binding.mOnTitleChange = function(activeDevice, activeMapping, title, description) {
    if (!title || title === lastTrackName) return;
    lastTrackName = title;

    // Log to Script Console
    console.log('Track: ' + title);

    // Send track name via MIDI CC protocol on channel 16
    var name = title.substring(0, 64);
    var len = name.length;

    // CC 119 = start (value = length)
    midiOutput.sendMidi(activeDevice, 0xBF, 119, len);

    // CC 118 = each character
    for (var i = 0; i < len; i++) {
        midiOutput.sendMidi(activeDevice, 0xBF, 118, name.charCodeAt(i) & 0x7F);
    }

    // CC 117 = end marker
    midiOutput.sendMidi(activeDevice, 0xBF, 117, 127);
};

console.log('Articulation Remote Track Switcher loaded');
