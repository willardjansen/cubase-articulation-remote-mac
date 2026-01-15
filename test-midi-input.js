// Test MIDI input with 'midi' package
const midi = require('midi');

const input = new midi.Input();

// List available ports
console.log('Available MIDI inputs:');
for (let i = 0; i < input.getPortCount(); i++) {
  console.log(`  ${i}: ${input.getPortName(i)}`);
}

// Find ArticulationRemote or KeyLab
let portIndex = -1;
for (let i = 0; i < input.getPortCount(); i++) {
  const name = input.getPortName(i);
  if (name.includes('ArticulationRemote') || name.includes('MIDIIN2')) {
    portIndex = i;
    break;
  }
}

if (portIndex >= 0) {
  console.log(`\nOpening port ${portIndex}: ${input.getPortName(portIndex)}`);

  input.on('message', (deltaTime, message) => {
    console.log(`🔵 MIDI: [${message.join(', ')}] (delta: ${deltaTime})`);
  });

  input.openPort(portIndex);
  console.log('Listening for MIDI... (Ctrl+C to stop)\n');
} else {
  console.log('No suitable port found!');
}
