#!/usr/bin/env node
/**
 * MIDI Bridge Server
 *
 * Receives MIDI messages via WebSocket and sends them to local MIDI output.
 * This allows iPad (via regular Safari) to send MIDI to Cubase through the Mac.
 *
 * Usage: node midi-server.js
 */

const WebSocket = require('ws');
const JZZ = require('jzz');

const WS_PORT = 3001;

// MIDI output
let midiOut = null;
let selectedPortName = null;

// Initialize MIDI
async function initMidi() {
  console.log('\n🎹 MIDI Bridge Server');
  console.log('=====================\n');

  // List available MIDI outputs
  const outputs = JZZ().info().outputs;
  console.log('Available MIDI outputs:');
  outputs.forEach((port, i) => {
    console.log(`  ${i + 1}. ${port.name}`);
  });
  console.log('');

  // Try to find IAC Driver, loopMIDI, or Browser to Cubase
  const preferredNames = ['Browser to cubase', 'Browser to Cubase', 'IAC Driver', 'loopMIDI', 'Session'];

  for (const preferred of preferredNames) {
    const found = outputs.find(p => p.name.toLowerCase().includes(preferred.toLowerCase()));
    if (found) {
      selectedPortName = found.name;
      break;
    }
  }

  // Fallback to first output if no preferred found
  if (!selectedPortName && outputs.length > 0) {
    selectedPortName = outputs[0].name;
  }

  if (selectedPortName) {
    try {
      midiOut = JZZ().openMidiOut(selectedPortName);
      console.log(`✅ Connected to: ${selectedPortName}\n`);
    } catch (e) {
      console.error(`❌ Failed to open MIDI output: ${e.message}`);
    }
  } else {
    console.log('⚠️  No MIDI outputs found. MIDI messages will be logged but not sent.\n');
  }
}

// Send MIDI message
function sendMidi(status, data1, data2) {
  const msg = [status, data1, data2];
  console.log(`🎵 MIDI: [${msg.join(', ')}]`);

  if (midiOut) {
    try {
      midiOut.send(msg);
    } catch (e) {
      console.error(`   Error: ${e.message}`);
    }
  }
}

// Start WebSocket server
function startServer() {
  const wss = new WebSocket.Server({ port: WS_PORT });

  wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    console.log(`📱 Client connected: ${clientIp}`);

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'midi') {
          sendMidi(msg.status, msg.data1, msg.data2);
        } else if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', port: selectedPortName }));
        }
      } catch (e) {
        console.error('Invalid message:', e.message);
      }
    });

    ws.on('close', () => {
      console.log(`📱 Client disconnected: ${clientIp}`);
    });

    // Send current status
    ws.send(JSON.stringify({
      type: 'connected',
      port: selectedPortName,
      status: midiOut ? 'ready' : 'no-midi'
    }));
  });

  console.log(`🌐 WebSocket server running on ws://localhost:${WS_PORT}`);
  console.log(`\n📱 On your iPad, open: http://192.168.1.38:3000`);
  console.log('   The app will automatically connect to this MIDI bridge.\n');
}

// Main
async function main() {
  await initMidi();
  startServer();
}

main().catch(console.error);
