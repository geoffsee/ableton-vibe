import { Ableton } from "ableton-js";
import { Color } from "ableton-js/util/color";
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

export type TrackBlueprint = {
  name: string;
  type?: "MIDI" | "Audio" | "Return";
  colorIndex?: number;
  colorHex?: string;
  mute?: boolean;
  arm?: boolean;
  clips?: Array<{
    name: string;
    length?: string;
  }>;
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
  clipName: string,
  clipLength: string | undefined,
  beatsPerBar: number,
) => {
  let clipSlots = await track.get("clip_slots");

  for (const slot of clipSlots) {
    const hasClip = await slot.get("has_clip");
    if (!hasClip) continue;

    const clip = await slot.get("clip");
    if (!clip) continue;

    const existingName = await clip.get("name");
    if (existingName.toLowerCase() === clipName.toLowerCase()) {
      return;
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

  const clipLengthInBeats = parseClipLengthToBeats(clipLength, beatsPerBar);
  await targetSlot.createClip(clipLengthInBeats);

  const clip = await targetSlot.get("clip");
  if (clip) {
    await clip.set("name", clipName);
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

  if (trackType !== "Return" && blueprint.clips?.length) {
    for (const clipBlueprint of blueprint.clips) {
      await ensureClip(workingTrack, clipBlueprint.name, clipBlueprint.length, safeBeatsPerBar);
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
