'use client';

import { useEffect, useState } from 'react';
import { midiHandler, MidiState } from '@/lib/midiHandler';

interface MidiSettingsProps {
  onClose?: () => void;
}

export function MidiSettings({ onClose }: MidiSettingsProps) {
  const [midiState, setMidiState] = useState<MidiState>({
    isSupported: false,
    isConnected: false,
    outputs: [],
    inputs: [],
    selectedOutputId: null,
    selectedInputId: null,
    error: null,
  });
  const [channel, setChannel] = useState(1);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize MIDI
    midiHandler.initialize().then(state => {
      setMidiState(state);
      setIsInitialized(true);
    });

    // Subscribe to changes
    const unsubscribe = midiHandler.subscribe(setMidiState);
    return unsubscribe;
  }, []);

  const handleOutputSelect = (outputId: string) => {
    midiHandler.selectOutput(outputId);
  };

  const handleInputSelect = (inputId: string) => {
    midiHandler.selectInput(inputId);
  };

  const handleChannelChange = (newChannel: number) => {
    setChannel(newChannel);
    midiHandler.setChannel(newChannel - 1); // Convert to 0-indexed
  };

  const handleTestNote = () => {
    midiHandler.sendNoteOn(60, 100); // Middle C
    setTimeout(() => {
      midiHandler.sendNoteOff(60);
    }, 200);
  };

  return (
    <div className="bg-cubase-surface rounded-xl p-6 shadow-xl border border-cubase-accent max-w-md w-full max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-cubase-text">MIDI Settings</h2>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-cubase-muted hover:text-cubase-text transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Status */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-3 h-3 rounded-full ${
            midiState.isConnected ? 'bg-green-500' : 
            midiState.error ? 'bg-red-500' : 'bg-yellow-500'
          }`} />
          <span className="text-cubase-text font-medium">
            {midiState.isConnected ? 'Connected' : 
             midiState.error ? 'Error' : 'Not Connected'}
          </span>
        </div>
        {midiState.error && (
          <p className="text-red-400 text-sm">{midiState.error}</p>
        )}
      </div>

      {/* MIDI Output Selection */}
      <div className="mb-6">
        <label className="block text-cubase-muted text-sm mb-2">
          MIDI Output Device
        </label>
        {!isInitialized ? (
          <p className="text-cubase-muted">Initializing MIDI...</p>
        ) : midiState.outputs.length === 0 ? (
          <div className="bg-cubase-bg rounded-lg p-4 text-center">
            <p className="text-cubase-muted text-sm mb-2">No MIDI outputs found</p>
            <p className="text-cubase-muted text-xs">
              Make sure your MIDI interface is connected and try refreshing
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
            {midiState.outputs.map(output => (
              <button
                key={output.id}
                onClick={() => handleOutputSelect(output.id)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors
                  ${midiState.selectedOutputId === output.id
                    ? 'bg-cubase-highlight text-white'
                    : 'bg-cubase-bg text-cubase-text hover:bg-cubase-accent'
                  }`}
              >
                <div className="font-medium">{output.name}</div>
                <div className="text-xs opacity-75">{output.manufacturer}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* MIDI Input Selection (for auto-switching) */}
      <div className="mb-6">
        <label className="block text-cubase-muted text-sm mb-2">
          MIDI Input (for auto-switch from Cubase)
        </label>
        {midiState.inputs.length === 0 ? (
          <p className="text-cubase-muted text-sm">No MIDI inputs found</p>
        ) : (
          <select
            value={midiState.selectedInputId || ''}
            onChange={(e) => handleInputSelect(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-cubase-bg text-cubase-text
                     border border-cubase-accent focus:outline-none focus:ring-2
                     focus:ring-cubase-highlight"
          >
            <option value="">None (manual switching)</option>
            {midiState.inputs.map(input => (
              <option key={input.id} value={input.id}>
                {input.name}
              </option>
            ))}
          </select>
        )}
        <p className="text-cubase-muted text-xs mt-1">
          Select IAC Driver to receive track switch signals from Cubase
        </p>
      </div>

      {/* MIDI Channel */}
      <div className="mb-6">
        <label className="block text-cubase-muted text-sm mb-2">
          MIDI Channel
        </label>
        <select
          value={channel}
          onChange={(e) => handleChannelChange(parseInt(e.target.value))}
          className="w-full px-4 py-2 rounded-lg bg-cubase-bg text-cubase-text
                     border border-cubase-accent focus:outline-none focus:ring-2
                     focus:ring-cubase-highlight"
        >
          {Array.from({ length: 16 }, (_, i) => i + 1).map(ch => (
            <option key={ch} value={ch}>Channel {ch}</option>
          ))}
        </select>
      </div>

      {/* Test Button */}
      <div>
        <button
          onClick={handleTestNote}
          disabled={!midiState.isConnected}
          className={`w-full py-3 rounded-lg font-medium transition-colors
            ${midiState.isConnected
              ? 'bg-cubase-highlight text-white hover:bg-opacity-90'
              : 'bg-cubase-accent text-cubase-muted cursor-not-allowed'
            }`}
        >
          Send Test Note (C3)
        </button>
      </div>

      {/* Help text */}
      <div className="mt-6 p-4 bg-cubase-bg rounded-lg">
        <h3 className="text-sm font-medium text-cubase-text mb-2">Setup Instructions</h3>
        <ol className="text-xs text-cubase-muted space-y-1 list-decimal list-inside">
          <li>Enable MIDI Network Session on your computer</li>
          <li>Connect this device to the same WiFi network</li>
          <li>Select the MIDI output above</li>
          <li>In Cubase, route the MIDI input to your instrument track</li>
        </ol>
      </div>
    </div>
  );
}
