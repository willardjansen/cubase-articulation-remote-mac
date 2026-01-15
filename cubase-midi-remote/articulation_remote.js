/**
 * Articulation Remote - Track Switcher
 * Sends track name to web app when you switch tracks in Cubase.
 */

var midiremote_api = require('midiremote_api_v1')

var deviceDriver = midiremote_api.makeDeviceDriver('articulation', 'remote', 'Track Switcher')

// Create ports
var midiInput = deviceDriver.mPorts.makeMidiInput('In')
var midiOutput = deviceDriver.mPorts.makeMidiOutput('Out')

// Detection
deviceDriver.makeDetectionUnit().detectPortPair(midiInput, midiOutput)
    .expectInputNameContains('ArticulationRemote')
    .expectOutputNameContains('ArticulationRemote')

var surface = deviceDriver.mSurface
var fader = surface.makeFader(0, 0, 1, 1)

var page = deviceDriver.mMapping.makePage('Main')

var lastTrackName = ''

var trackVolume = page.mHostAccess.mTrackSelection.mMixerChannel.mValue.mVolume

page.makeValueBinding(fader.mSurfaceValue, trackVolume)

// Use .bind() pattern like KeyLab does to capture midiOutput
trackVolume.mOnTitleChange = (function(activeDevice, activeMapping, title) {
    console.log('ART-REMOTE: Track = "' + title + '"')

    if (!title || title === lastTrackName) return
    lastTrackName = title

    var name = title.substring(0, 64)
    var len = name.length

    console.log('ART-REMOTE: SENDING "' + name + '" via bound midiOutput')

    // Use array syntax like KeyLab does
    this.midiOutput.sendMidi(activeDevice, [0xBF, 119, len])

    for (var i = 0; i < len; i++) {
        this.midiOutput.sendMidi(activeDevice, [0xBF, 118, name.charCodeAt(i) & 0x7F])
    }

    this.midiOutput.sendMidi(activeDevice, [0xBF, 117, 127])

    console.log('ART-REMOTE: Done sending')
}).bind({ midiOutput: midiOutput })

deviceDriver.mOnActivate = function(activeDevice) {
    console.log('ART-REMOTE: Device ACTIVATED')
}

console.log('ART-REMOTE: Script loaded')
