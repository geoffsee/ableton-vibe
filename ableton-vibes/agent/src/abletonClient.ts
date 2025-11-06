import { Ableton } from "ableton-js";
import { Color } from "ableton-js/util/color";
import type { Clip } from "ableton-js/ns/clip";
import type { ClipSlot } from "ableton-js/ns/clip-slot";
import type { Track } from "ableton-js/ns/track";

let ableton: Ableton | null = null;
let connectPromise: Promise<Ableton> | null = null;

const CONNECT_TIMEOUT_MS = 10000;

export type ProjectSettings = {
  tempo?: number;
  timeSignature?: string;
  metronome?: boolean;
  overdub?: boolean;
  play?: boolean;
  stop?: boolean;
};

export type ClipNoteBlueprint = {
  pitch: number;
  time?: number | string;
  start?: number | string;
  duration?: number | string;
  length?: number | string;
  velocity?: number;
  muted?: boolean;
};

export type ClipBlueprint = {
  name: string;
  length?: string;
  notes?: ClipNoteBlueprint[];
};

export type TrackBlueprint = {
  name: string;
  type?: "MIDI" | "Audio" | "Return";
  colorIndex?: number;
  colorHex?: string;
  mute?: boolean;
  arm?: boolean;
  clips?: ClipBlueprint[];
};

export type AbletonSessionSnapshot = {
  tempo: number;
  timeSignature: string;
  isPlaying: boolean;
  tracks: Array<{
    name: string;
    colorIndex: number;
    colorHex: string | null;
    type: "MIDI" | "Audio" | "Return" | "Unknown";
    isMuted: boolean;
    isArmed: boolean;
    clipNames: string[];
  }>;
};

const ensureInstance = () => {
  if (!ableton) {
    ableton = new Ableton({ logger: console });
    ableton.on("disconnect", () => {
      connectPromise = null;
    });
  }

  return ableton;
};

export const getAbleton = async (): Promise<Ableton> => {
  const instance = ensureInstance();

  if (instance.isConnected()) {
    return instance;
  }

  if (!connectPromise) {
    connectPromise = instance.start(CONNECT_TIMEOUT_MS).then(() => instance);
  }

  try {
    await connectPromise;
    return instance;
  } catch (error) {
    connectPromise = null;
    const message =
      error instanceof Error
        ? `Failed to connect to Ableton Live: ${error.message}`
        : "Failed to connect to Ableton Live.";
    throw new Error(message);
  }
};

const parseTimeSignature = (
  signature?: string,
): { numerator: number; denominator: number } | null => {
  if (!signature) return null;

  const match = signature.match(/^\s*(\d+)\s*\/\s*(\d+)\s*$/);
  if (!match) return null;

  const numerator = Number.parseInt(match[1], 10);
  const denominator = Number.parseInt(match[2], 10);

  if (Number.isNaN(numerator) || Number.isNaN(denominator) || denominator === 0) {
    return null;
  }

  return { numerator, denominator };
};

export const getBeatsPerBar = (timeSignature?: string): number => {
  const parsed = parseTimeSignature(timeSignature);
  if (!parsed) return 4;
  return parsed.numerator * (4 / parsed.denominator);
};

export const applyProjectSettings = async (settings: ProjectSettings) => {
  const instance = await getAbleton();

  if (typeof settings.tempo === "number") {
    await instance.song.set("tempo", settings.tempo);
  }

  const parsedSignature = parseTimeSignature(settings.timeSignature);
  if (parsedSignature) {
    await instance.song.set("signature_numerator", parsedSignature.numerator);
    await instance.song.set("signature_denominator", parsedSignature.denominator);
  }

  if (typeof settings.metronome === "boolean") {
    await instance.song.set("metronome", settings.metronome ? 1 : 0);
  }

  if (typeof settings.overdub === "boolean") {
    await instance.song.set("overdub", settings.overdub);
  }

  if (settings.play) {
    if (!(await instance.song.get("is_playing"))) {
      await instance.song.set("is_playing", true);
    }
  } else if (settings.stop) {
    if (await instance.song.get("is_playing")) {
      await instance.song.set("is_playing", false);
    }
  }
};

const determineTrackType = async (
  track: Track,
  isReturn = false,
): Promise<"MIDI" | "Audio" | "Return" | "Unknown"> => {
  if (isReturn) return "Return";

  const [hasMidiOut, hasAudioOut, hasAudioIn] = await Promise.all([
    track.get("has_midi_output"),
    track.get("has_audio_output"),
    track.get("has_audio_input"),
  ]);

  if (hasMidiOut && !hasAudioIn) return "MIDI";
  if (hasAudioOut) return "Audio";
  return "Unknown";
};

const locateTrackByName = async (name: string): Promise<{
  track: Track | null;
  index: number;
  kind: "track" | "return";
}> => {
  const instance = await getAbleton();
  const tracks = await instance.song.get("tracks");

  for (let index = 0; index < tracks.length; index += 1) {
    const track = tracks[index]!;
    const trackName = await track.get("name");
    if (trackName.toLowerCase() === name.toLowerCase()) {
      return { track, index, kind: "track" };
    }
  }

  const returnTracks = await instance.song.get("return_tracks");
  for (let index = 0; index < returnTracks.length; index += 1) {
    const track = returnTracks[index]!;
    const trackName = await track.get("name");
    if (trackName.toLowerCase() === name.toLowerCase()) {
      return { track, index, kind: "return" };
    }
  }

  return { track: null, index: -1, kind: "track" };
};

const parseClipLengthToBeats = (
  length: string | undefined,
  beatsPerBar: number,
): number => {
  if (!length) return beatsPerBar;

  const numericMatch = length.match(/([\d.]+)/);
  const count = numericMatch ? Number.parseFloat(numericMatch[1]!) : 1;
  if (Number.isNaN(count) || count <= 0) return beatsPerBar;

  const lower = length.toLowerCase();

  if (lower.includes("beat")) {
    return count;
  }

  if (lower.includes("bar") || lower.includes("measure")) {
    return count * beatsPerBar;
  }

  return beatsPerBar * count;
};

const ensureClip = async (
  track: Track,
  clipBlueprint: ClipBlueprint,
  beatsPerBar: number,
): Promise<{ clip: Clip; lengthBeats: number | null }> => {
  const clipName = clipBlueprint.name;
  let clipSlots = await track.get("clip_slots");

  for (const slot of clipSlots) {
    const hasClip = await slot.get("has_clip");
    if (!hasClip) continue;

    const clip = await slot.get("clip");
    if (!clip) continue;

    const existingName = await clip.get("name");
    if (existingName.toLowerCase() === clipName.toLowerCase()) {
      const existingLength = await clip.get("length");
      return { clip, lengthBeats: existingLength };
    }
  }

  let targetSlot: ClipSlot | null = null;

  for (const slot of clipSlots) {
    const hasClip = await slot.get("has_clip");
    if (!hasClip) {
      targetSlot = slot;
      break;
    }
  }

  if (!targetSlot) {
    const instance = await getAbleton();
    await instance.song.createScene();
    clipSlots = await track.get("clip_slots");
    for (const slotCandidate of clipSlots) {
      const hasClip = await slotCandidate.get("has_clip");
      if (!hasClip) {
        targetSlot = slotCandidate;
        break;
      }
    }
  }

  if (!targetSlot) {
    throw new Error("Unable to find or create an empty clip slot.");
  }

  const clipLengthInBeats = parseClipLengthToBeats(clipBlueprint.length, beatsPerBar);
  await targetSlot.createClip(clipLengthInBeats);

  const clip = await targetSlot.get("clip");
  if (clip) {
    await clip.set("name", clipName);
    await clip.set("loop_start", 0);
    await clip.set("loop_end", clipLengthInBeats);
    await clip.set("end_marker", clipLengthInBeats);
    await clip.set("length", clipLengthInBeats);
    return { clip, lengthBeats: clipLengthInBeats };
  }

  throw new Error(`Failed to obtain clip instance for "${clipName}".`);
};

const parseBeatsValue = (
  value: number | string | undefined,
  beatsPerBar: number,
  fallback: number,
): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();

    const fractionMatch = trimmed.match(/^(-?\d+)\s*\/\s*(\d+)$/);
    if (fractionMatch) {
      const numerator = Number.parseFloat(fractionMatch[1]!);
      const denominator = Number.parseFloat(fractionMatch[2]!);
      if (!Number.isNaN(numerator) && !Number.isNaN(denominator) && denominator !== 0) {
        return numerator / denominator;
      }
    }

    const numeric = Number.parseFloat(trimmed.replace(/[^\d.-]/g, ""));
    if (!Number.isNaN(numeric)) {
      if (trimmed.includes("bar")) {
        return numeric * beatsPerBar;
      }
      if (trimmed.includes("beat")) {
        return numeric;
      }
      return numeric;
    }
  }

  return fallback;
};

type MidiNote = {
  pitch: number;
  time: number;
  duration: number;
  velocity: number;
  muted: boolean;
};

const sanitizeNotes = (
  notes: ClipNoteBlueprint[],
  beatsPerBar: number,
): MidiNote[] => {
  return notes
    .map((note) => {
      const rawPitch = Number(note.pitch);
      if (!Number.isFinite(rawPitch)) return null;

      const pitch = Math.max(0, Math.min(127, Math.round(rawPitch)));
      const time = parseBeatsValue(note.time ?? note.start, beatsPerBar, 0);
      const duration = Math.max(
        0.03125,
        parseBeatsValue(note.duration ?? note.length, beatsPerBar, 1),
      );
      const velocity = Math.max(0, Math.min(127, Math.round(note.velocity ?? 100)));
      const muted = Boolean(note.muted);

      return {
        pitch,
        time: Math.max(0, time),
        duration,
        velocity,
        muted,
      };
    })
    .filter((value): value is MidiNote => value !== null)
    .sort((a, b) => a.time - b.time);
};

const populateClipNotes = async (
  clip: Clip,
  clipBlueprint: ClipBlueprint,
  beatsPerBar: number,
  fallbackLengthBeats: number | null,
) => {
  if (!clipBlueprint.notes?.length) return;

  const notePayload = sanitizeNotes(clipBlueprint.notes, beatsPerBar);
  if (!notePayload.length) return;

  const existingLength = fallbackLengthBeats ?? (await clip.get("length"));
  const furthestNote = notePayload.reduce(
    (max, note) => Math.max(max, note.time + note.duration),
    0,
  );
  const desiredLength = Math.max(existingLength ?? 0, furthestNote);

  const span = Math.max(desiredLength, existingLength ?? 0, beatsPerBar);
  await clip.removeNotes(0, 0, span + beatsPerBar, 128);
  await clip.setNotes(notePayload);

  if (desiredLength > 0) {
    await clip.set("looping", true);
    await clip.set("loop_start", 0);
    await clip.set("start_marker", 0);
    await clip.set("loop_end", desiredLength);
    await clip.set("end_marker", desiredLength);
  }
};

export const applyTrackBlueprint = async (blueprint: TrackBlueprint, beatsPerBar: number) => {
  if (!blueprint.name) {
    throw new Error("Track name is required.");
  }

  const safeBeatsPerBar = Number.isFinite(beatsPerBar) && beatsPerBar > 0 ? beatsPerBar : 4;
  const instance = await getAbleton();
  const lookup = await locateTrackByName(blueprint.name);
  const { track: existingTrack, kind } = lookup;
  let workingTrack: Track;

  if (!existingTrack) {
    switch (blueprint.type) {
      case "Audio": {
        workingTrack = await instance.song.createAudioTrack();
        break;
      }
      case "Return": {
        workingTrack = await instance.song.createReturnTrack();
        break;
      }
      case "MIDI":
      default: {
        workingTrack = await instance.song.createMidiTrack();
        break;
      }
    }
  } else {
    workingTrack = existingTrack;
  }

  await workingTrack.set("name", blueprint.name);

  if (typeof blueprint.colorIndex === "number") {
    await workingTrack.set("color_index", blueprint.colorIndex);
  } else if (typeof blueprint.colorHex === "string") {
    try {
      const color = new Color(blueprint.colorHex);
      await workingTrack.set("color", color.numberRepresentation);
    } catch {
      // ignore invalid color strings
    }
  }

  if (typeof blueprint.mute === "boolean") {
    await workingTrack.set("mute", blueprint.mute);
  }

  if (typeof blueprint.arm === "boolean" && (await workingTrack.get("can_be_armed"))) {
    await workingTrack.set("arm", blueprint.arm);
  }

  const isReturnTrack = blueprint.type === "Return" || kind === "return";
  const trackType =
    isReturnTrack ? "Return" : blueprint.type ?? (await determineTrackType(workingTrack));

  if (
    trackType !== "Return" &&
    blueprint.clips?.length &&
    (trackType === "MIDI" || blueprint.type === "MIDI" || trackType === "Unknown")
  ) {
    for (const clipBlueprint of blueprint.clips) {
      const ensuredClip = await ensureClip(workingTrack, clipBlueprint, safeBeatsPerBar);
      await populateClipNotes(
        ensuredClip.clip,
        clipBlueprint,
        safeBeatsPerBar,
        ensuredClip.lengthBeats,
      );
    }
  }

  return trackType;
};

export const removeTrackByName = async (name: string) => {
  const instance = await getAbleton();
  const { track, index, kind } = await locateTrackByName(name);

  if (!track) {
    throw new Error(`Track "${name}" was not found in the Ableton session.`);
  }

  if (kind === "return") {
    await instance.song.deleteReturnTrack(index);
  } else {
    await instance.song.deleteTrack(index);
  }
};

export const captureSessionSnapshot = async (): Promise<AbletonSessionSnapshot> => {
  const instance = await getAbleton();
  const [tempo, numerator, denominator, isPlaying] = await Promise.all([
    instance.song.get("tempo"),
    instance.song.get("signature_numerator"),
    instance.song.get("signature_denominator"),
    instance.song.get("is_playing"),
  ]);

  const tracks = await instance.song.get("tracks");

  const trackSummaries = await Promise.all(
    tracks.map(async (track) => {
      const [name, colorIndex, colorNumber, mute, arm, clipSlots, type] = await Promise.all([
        track.get("name"),
        track.get("color_index"),
        track.get("color"),
        track.get("mute"),
        track.get("arm"),
        track.get("clip_slots"),
        determineTrackType(track),
      ]);

      const clipNames: string[] = [];
      for (const slot of clipSlots) {
        const hasClip = await slot.get("has_clip");
        if (!hasClip) continue;

        const clip = await slot.get("clip");
        if (!clip) continue;

        clipNames.push(await clip.get("name"));
      }

      let colorHex: string | null = null;
      try {
        const color = new Color(colorNumber);
        colorHex = color.hex;
      } catch {
        colorHex = null;
      }

      return {
        name,
        colorIndex,
        colorHex,
        type,
        isMuted: mute,
        isArmed: arm,
        clipNames,
      };
    }),
  );

  return {
    tempo,
    timeSignature: `${numerator}/${denominator}`,
    isPlaying,
    tracks: trackSummaries,
  };
};
