// Web MIDI API type declarations
declare namespace WebMidi {
  interface MIDIAccess extends EventTarget {
    inputs: MIDIInputMap;
    outputs: MIDIOutputMap;
    onstatechange: ((this: MIDIAccess, ev: MIDIConnectionEvent) => any) | null;
    sysexEnabled: boolean;
  }

  interface MIDIInputMap {
    entries(): IterableIterator<[string, MIDIInput]>;
    forEach(callback: (value: MIDIInput, key: string, map: MIDIInputMap) => void): void;
    get(key: string): MIDIInput | undefined;
    has(key: string): boolean;
    keys(): IterableIterator<string>;
    values(): IterableIterator<MIDIInput>;
    readonly size: number;
    [Symbol.iterator](): IterableIterator<[string, MIDIInput]>;
  }

  interface MIDIOutputMap {
    entries(): IterableIterator<[string, MIDIOutput]>;
    forEach(callback: (value: MIDIOutput, key: string, map: MIDIOutputMap) => void): void;
    get(key: string): MIDIOutput | undefined;
    has(key: string): boolean;
    keys(): IterableIterator<string>;
    values(): IterableIterator<MIDIOutput>;
    readonly size: number;
    [Symbol.iterator](): IterableIterator<[string, MIDIOutput]>;
  }

  interface MIDIPort extends EventTarget {
    id: string;
    manufacturer: string | null;
    name: string | null;
    type: 'input' | 'output';
    version: string | null;
    state: 'connected' | 'disconnected';
    connection: 'open' | 'closed' | 'pending';
    onstatechange: ((this: MIDIPort, ev: MIDIConnectionEvent) => any) | null;
    open(): Promise<MIDIPort>;
    close(): Promise<MIDIPort>;
  }

  interface MIDIInput extends MIDIPort {
    type: 'input';
    onmidimessage: ((this: MIDIInput, ev: MIDIMessageEvent) => any) | null;
  }

  interface MIDIOutput extends MIDIPort {
    type: 'output';
    send(data: number[] | Uint8Array, timestamp?: number): void;
    clear(): void;
  }

  interface MIDIMessageEvent extends Event {
    data: Uint8Array;
  }

  interface MIDIConnectionEvent extends Event {
    port: MIDIPort;
  }
}

interface Navigator {
  requestMIDIAccess(options?: { sysex?: boolean }): Promise<WebMidi.MIDIAccess>;
}
