import MidiWriter from "midi-writer-js";
import type { AbletonProjectState, MotifNote } from "../components/types";

const TICKS_PER_BEAT = 128; // midi-writer-js default PPQ

const NOTE_NAMES = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
];

function midiPitchToName(pitch: number): string {
  const note = NOTE_NAMES[pitch % 12];
  const octave = Math.floor(pitch / 12) - 1;
  return `${note}${octave}`;
}

function beatsToTicks(beats: number): number {
  return Math.round(beats * TICKS_PER_BEAT);
}

function velocityToMidi(velocity: number): number {
  // midi-writer-js expects 1-100, MotifNote uses 0-127
  return Math.max(1, Math.min(100, Math.round((velocity / 127) * 100)));
}

export function projectHasMidiNotes(project: AbletonProjectState): boolean {
  return project.tracks.some(
    (track) =>
      track.type === "MIDI" &&
      track.clips.some((clip) => clip.notes && clip.notes.length > 0)
  );
}

export function exportProjectAsMidi(project: AbletonProjectState): void {
  const midiTracks: InstanceType<typeof MidiWriter.Track>[] = [];

  // Parse time signature (e.g. "4/4" → [4, 4])
  const [tsNum, tsDenom] = (project.timeSignature || "4/4")
    .split("/")
    .map(Number);

  for (const track of project.tracks) {
    if (track.type !== "MIDI") continue;

    const allNotes: MotifNote[] = [];
    for (const clip of track.clips) {
      if (clip.notes && clip.notes.length > 0) {
        allNotes.push(...clip.notes);
      }
    }
    if (allNotes.length === 0) continue;

    const midiTrack = new MidiWriter.Track();
    midiTrack.addTrackName(track.name);

    // Set tempo and time signature on the first track
    if (midiTracks.length === 0) {
      midiTrack.setTempo(project.tempo || 120);
      midiTrack.setTimeSignature(tsNum || 4, tsDenom || 4, 24, 8);
    }

    // Sort notes by time so startTick ordering is correct
    const sorted = [...allNotes].sort((a, b) => a.time - b.time);

    for (const note of sorted) {
      midiTrack.addEvent(
        new MidiWriter.NoteEvent({
          pitch: midiPitchToName(note.pitch) as any,
          duration: `T${beatsToTicks(note.duration)}`,
          startTick: beatsToTicks(note.time),
          velocity: velocityToMidi(note.velocity),
        })
      );
    }

    midiTracks.push(midiTrack);
  }

  if (midiTracks.length === 0) return;

  const writer = new MidiWriter.Writer(midiTracks);
  const fileData = writer.buildFile();
  const blob = new Blob([new Uint8Array(fileData)], { type: "audio/midi" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.projectName || "export"}.mid`;
  a.click();
  URL.revokeObjectURL(url);
}
