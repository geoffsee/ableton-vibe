/**
 * This is the main entry point for the agent.
 * It defines the workflow graph, state, tools, nodes and edges.
 */

import { z } from "zod";
import { RunnableConfig } from "@langchain/core/runnables";
import { tool } from "@langchain/core/tools";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import {
  AIMessage,
  BaseMessage,
  ChatMessage,
  FunctionMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { MemorySaver, START, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { convertActionsToDynamicStructuredTools, CopilotKitStateAnnotation } from "@copilotkit/sdk-js/langgraph";
import { Annotation } from "@langchain/langgraph";
import {
  applyProjectSettings,
  applyTrackBlueprint,
  captureSessionSnapshot,
  getBeatsPerBar,
  ProjectSettings,
  TrackBlueprint,
  removeTrackByName,
  AbletonSessionSnapshot,
  DeviceInfo,
  listAvailableDevices,
  AvailableDevice,
} from "./abletonClient";
import { searchSamples } from "./sampleFinder";
import { insertSampleAsClip } from "./abletonClient";

// Import workflow tools for music production stages
import { allWorkflowTools } from "./workflow/stages";

// 1. Define our agent state, which includes CopilotKit state to
//    provide actions to the state.
type AgentProject = {
  projectName?: string;
  genre?: string;
  vibe?: string;
  tempo?: number;
  key?: string;
  timeSignature?: string;
  arrangementNotes?: string;
  sessionViewNotes?: string;
  nextActions?: string[];
};

const AgentStateAnnotation = Annotation.Root({
  ...CopilotKitStateAnnotation.spec, // CopilotKit state annotation already includes messages, as well as frontend tools
  project: Annotation<AgentProject>,
});

// 2. Define the type for our agent state
export type AgentState = typeof AgentStateAnnotation.State;

const parseJsonPayload = <T>(payload: string, context: string): T => {
  try {
    return JSON.parse(payload) as T;
  } catch (error) {
    const message =
      error instanceof Error ? `${context}: ${error.message}` : `Invalid ${context}.`;
    throw new Error(message);
  }
};

// 3. Define Ableton-focused helper tools to keep the model grounded in music production concepts
const grooveRecipe = tool(
  ({ style, bars, tempo }) => {
    const safeTempo = tempo ?? 120;
    const safeBars = bars ?? 4;
    return [
      `Groove recipe for a ${style} loop (${safeBars} bars @ ${safeTempo} BPM):`,
      "- Kick: anchor on beats 1 and 3, add ghost hits on 3e for forward motion.",
      "- Snare/Clap: accents on beats 2 and 4, layer a foley clap with 30% wet reverb.",
      "- Hats: closed hats in 1/8th notes with 12% swing, open hat on the last 16th before bar ${safeBars}.",
      "- Percussion: sprinkle shuffled rimshots on 2a and 4e, use velocity humanizer at 14%.",
      "- Bass: sub hits sidechained to kick with 45 ms lookahead, notes follow root and 7th.",
      "- Automation: map Drum Buss drive to macro for 0–18% sweep on transition scenes.",
    ].join("\n");
  },
  {
    name: "grooveRecipe",
    description:
      "Return an Ableton-ready drum groove blueprint with clip programming and device hints.",
    schema: z.object({
      style: z.string().describe("The musical style or vibe, e.g. 'melodic techno'"),
      bars: z
        .number()
        .min(1)
        .max(16)
        .optional()
        .describe("Length of the loop in bars (defaults to 4)."),
      tempo: z
        .number()
        .min(60)
        .max(180)
        .optional()
        .describe("Tempo in BPM (defaults to 120)."),
    }),
  },
);

const maxPatchOutline = tool(
  ({ goal, modulationTarget }) => {
    return [
      `Max for Live patch concept: ${goal}`,
      "- Use LFO device chained into Expression Control.",
      "- Map macro 1 to master filter cutoff with a slow sine wave (0.05 Hz).",
      "- Add Envelope Follower tapping drum bus to modulate macro 3 up to 25%.",
      "- Include a random device with glide to subtly shift macro 5 every 8 bars.",
      "- Expose macro controls for performer-friendly tweaking on Push 3 standalone.",
      `- Primary modulation target: ${modulationTarget ?? "Provide during performance."}`,
    ].join("\n");
  },
  {
    name: "maxPatchOutline",
    description: "Outline a Max for Live device concept that supports the producer's workflow.",
    schema: z.object({
      goal: z
        .string()
        .describe("What the patch should accomplish, e.g. 'morph pad macros over 32 bars'."),
      modulationTarget: z
        .string()
        .optional()
        .describe("Key parameter or device chain the patch will control."),
    }),
  },
);

const abletonApplyProjectSettings = tool(
  async ({ projectSettingsJson }) => {
    const settings = parseJsonPayload<ProjectSettings>(
      projectSettingsJson,
      "project settings JSON",
    );

    await applyProjectSettings(settings);

    // Capture snapshot after mutation for UI sync
    const snapshot = await captureSessionSnapshot();

    const summary: string[] = [];
    if (typeof settings.tempo === "number") summary.push(`tempo ${settings.tempo} BPM`);
    if (settings.timeSignature) summary.push(`time signature ${settings.timeSignature}`);
    if (typeof settings.metronome === "boolean") {
      summary.push(`metronome ${settings.metronome ? "on" : "off"}`);
    }
    if (typeof settings.overdub === "boolean") {
      summary.push(`overdub ${settings.overdub ? "enabled" : "disabled"}`);
    }
    if (settings.play) summary.push("playback started");
    if (settings.stop) summary.push("transport stopped");

    const message = summary.length
      ? `Applied Ableton project settings: ${summary.join(", ")}.`
      : "Applied Ableton project settings.";

    return JSON.stringify({
      message,
      snapshot,
      syncRequired: true,
      syncHint: "Call setProjectOverview with tempo, timeSignature from snapshot to sync UI.",
    });
  },
  {
    name: "abletonApplyProjectSettings",
    description:
      "Apply high-level Ableton Live session settings such as tempo, time signature, metronome, overdub, or transport state.",
    schema: z.object({
      projectSettingsJson: z
        .string()
        .describe(
          "JSON string describing the settings to apply, e.g. {\"tempo\": 122, \"timeSignature\":\"4/4\", \"metronome\": false, \"play\": true}.",
        ),
    }),
  },
);

const abletonUpsertTracks = tool(
  async ({ blueprintJson, timeSignature, beatsPerBar }) => {
    const payload = parseJsonPayload<TrackBlueprint | TrackBlueprint[]>(
      blueprintJson,
      "track blueprint JSON",
    );
    const blueprints = Array.isArray(payload) ? payload : [payload];

    const computedBeatsPerBar =
      typeof beatsPerBar === "number" && beatsPerBar > 0
        ? beatsPerBar
        : getBeatsPerBar(timeSignature);

    const results: string[] = [];
    for (const blueprint of blueprints) {
      const trackType = await applyTrackBlueprint(blueprint, computedBeatsPerBar);
      const deviceInfo = blueprint.device ? ` with ${blueprint.device}` : "";
      const clipInfo = blueprint.clips?.length ? `, ${blueprint.clips.length} clip(s)` : "";
      results.push(`${blueprint.name} (${trackType}${deviceInfo}${clipInfo})`);
    }

    // Capture snapshot after mutation for UI sync
    const snapshot = await captureSessionSnapshot();

    const message = `Synced Ableton tracks: ${results.join(", ")}.`;

    return JSON.stringify({
      message,
      snapshot,
      syncRequired: true,
      syncHint: "Call upsertAbletonTrack for each track and setProjectOverview with tempo/timeSignature to sync UI.",
    });
  },
  {
    name: "abletonUpsertTracks",
    description:
      "Create or update Ableton tracks with instruments and MIDI clips. IMPORTANT: Always include 'device' to specify the instrument and 'clips' with 'notes' arrays to create playable content.",
    schema: z.object({
      blueprintJson: z
        .string()
        .describe(
          `JSON string for TrackBlueprint(s). REQUIRED fields for playable tracks:
{
  "name": "Track Name",
  "type": "MIDI",
  "device": "Drum Rack" | "Wavetable" | "Operator" | "Analog" | "Simpler" | etc.,
  "clips": [{
    "name": "Clip Name",
    "length": "4 bars",
    "notes": [
      { "pitch": 36, "time": 0, "duration": 0.5, "velocity": 100 },
      { "pitch": 38, "time": 1, "duration": 0.5, "velocity": 90 }
    ]
  }]
}
For drums: pitch 36=kick, 38=snare, 42=closed hat, 46=open hat, 39=clap.
Time and duration are in beats (4 beats = 1 bar in 4/4).`,
        ),
      timeSignature: z
        .string()
        .optional()
        .describe(
          "Time signature in the form 'numerator/denominator' used to interpret clip lengths specified in bars.",
        ),
      beatsPerBar: z
        .number()
        .optional()
        .describe("Override the beats-per-bar calculation (defaults to derived from timeSignature)."),
    }),
  },
);

const abletonRemoveTrack = tool(
  async ({ trackName }) => {
    await removeTrackByName(trackName);

    // Capture snapshot after mutation for UI sync
    const snapshot = await captureSessionSnapshot();

    return JSON.stringify({
      message: `Removed Ableton track "${trackName}".`,
      snapshot,
      syncRequired: true,
      syncHint: "Call removeAbletonTrack with trackId to sync UI.",
    });
  },
  {
    name: "abletonRemoveTrack",
    description: "Remove an Ableton track (standard or return) by name.",
    schema: z.object({
      trackName: z.string().min(1).describe("Exact name of the track to delete."),
    }),
  },
);

const abletonCaptureSnapshot = tool(
  async () => {
    const snapshot = await captureSessionSnapshot();
    return JSON.stringify({
      snapshot,
      syncRequired: true,
      syncHint: "Use this snapshot to sync UI state.",
    });
  },
  {
    name: "abletonCaptureSessionSnapshot",
    description:
      "Fetch the current Ableton Live session snapshot (tempo, time signature, playback state, and tracks with clip names). Also triggers UI sync.",
    schema: z.object({}),
  },
);

const abletonListDevices = tool(
  async ({ category, searchQuery, forceRefresh }) => {
    const devices = await listAvailableDevices({
      category: category as "instruments" | "audio_effects" | "midi_effects" | "drums" | "all" | undefined,
      searchQuery,
      forceRefresh,
    });

    // Group by category for easier reading
    const grouped = devices.reduce((acc, device) => {
      const cat = device.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(device);
      return acc;
    }, {} as Record<string, AvailableDevice[]>);

    return JSON.stringify({
      totalCount: devices.length,
      byCategory: grouped,
      hint: "Use the exact device name from this list when creating tracks with abletonUpsertTracks. For instruments, common choices include: Wavetable (synth pads/leads), Operator (FM synthesis), Analog (analog-style synth), Drum Rack (drums/percussion), Simpler (sample-based).",
    });
  },
  {
    name: "abletonListAvailableDevices",
    description:
      "List available instruments and effects from Ableton's browser. IMPORTANT: Call this BEFORE creating tracks to discover what devices are actually available. This prevents creating tracks with unavailable instruments (which would fall back to the user's default).",
    schema: z.object({
      category: z
        .enum(["instruments", "audio_effects", "midi_effects", "drums", "all"])
        .optional()
        .describe("Filter by device category. Default is 'all'."),
      searchQuery: z
        .string()
        .optional()
        .describe("Search for devices by name (e.g., 'synth', 'reverb', 'drum')."),
      forceRefresh: z
        .boolean()
        .optional()
        .describe("Force refresh the cached device list."),
    }),
  },
);

// Quick drum pattern generator for common beat styles
const abletonQuickDrums = tool(
  async ({ style, bars, tempo, trackName }) => {
    const safeBars = bars ?? 4;
    const beatsPerBar = 4;
    const totalBeats = safeBars * beatsPerBar;

    type DrumNote = { pitch: number; time: number; duration: number; velocity: number };
    const notes: DrumNote[] = [];

    // MIDI pitches for drums
    const KICK = 36;
    const SNARE = 38;
    const CLAP = 39;
    const CLOSED_HAT = 42;
    const OPEN_HAT = 46;
    const RIMSHOT = 37;

    const addNote = (pitch: number, time: number, velocity = 100) => {
      if (time < totalBeats) {
        notes.push({ pitch, time, duration: 0.25, velocity });
      }
    };

    const stylePatterns: Record<string, () => void> = {
      house: () => {
        // Four-on-the-floor kick, snare on 2 and 4, offbeat hats
        for (let bar = 0; bar < safeBars; bar++) {
          const offset = bar * 4;
          // Kicks on every beat
          addNote(KICK, offset, 100);
          addNote(KICK, offset + 1, 100);
          addNote(KICK, offset + 2, 100);
          addNote(KICK, offset + 3, 100);
          // Claps on 2 and 4
          addNote(CLAP, offset + 1, 90);
          addNote(CLAP, offset + 3, 90);
          // Hats on offbeats (8ths)
          for (let i = 0; i < 8; i++) {
            const hatTime = offset + i * 0.5;
            addNote(CLOSED_HAT, hatTime, i % 2 === 0 ? 70 : 55);
          }
          // Open hat before snare hits
          addNote(OPEN_HAT, offset + 0.75, 65);
          addNote(OPEN_HAT, offset + 2.75, 65);
        }
      },
      techno: () => {
        // Driving kick, minimal snare/clap, 16th hats
        for (let bar = 0; bar < safeBars; bar++) {
          const offset = bar * 4;
          // Kicks
          addNote(KICK, offset, 100);
          addNote(KICK, offset + 1, 95);
          addNote(KICK, offset + 2, 100);
          addNote(KICK, offset + 3, 95);
          // Clap on 2 and 4
          addNote(CLAP, offset + 1, 85);
          addNote(CLAP, offset + 3, 85);
          // 16th note hats with velocity variation
          for (let i = 0; i < 16; i++) {
            const hatTime = offset + i * 0.25;
            const vel = i % 4 === 0 ? 75 : i % 2 === 0 ? 60 : 45;
            addNote(CLOSED_HAT, hatTime, vel);
          }
        }
      },
      hiphop: () => {
        // Boom bap style: kick on 1 and 3, snare on 2 and 4
        for (let bar = 0; bar < safeBars; bar++) {
          const offset = bar * 4;
          // Kicks
          addNote(KICK, offset, 100);
          addNote(KICK, offset + 2.5, 90);
          // Snares
          addNote(SNARE, offset + 1, 95);
          addNote(SNARE, offset + 3, 95);
          // Swung hats
          for (let i = 0; i < 4; i++) {
            addNote(CLOSED_HAT, offset + i, 70);
            addNote(CLOSED_HAT, offset + i + 0.33, 50);
            addNote(CLOSED_HAT, offset + i + 0.66, 55);
          }
        }
      },
      dnb: () => {
        // Fast breakbeat pattern
        for (let bar = 0; bar < safeBars; bar++) {
          const offset = bar * 4;
          // Amen-style kicks
          addNote(KICK, offset, 100);
          addNote(KICK, offset + 1.5, 95);
          addNote(KICK, offset + 2.75, 90);
          // Snares
          addNote(SNARE, offset + 1, 100);
          addNote(SNARE, offset + 3, 100);
          addNote(SNARE, offset + 3.5, 75);
          // Rapid hats
          for (let i = 0; i < 16; i++) {
            addNote(CLOSED_HAT, offset + i * 0.25, 65 + Math.random() * 20);
          }
        }
      },
      trap: () => {
        // 808 kick pattern, triplet hats
        for (let bar = 0; bar < safeBars; bar++) {
          const offset = bar * 4;
          // Sparse kicks
          addNote(KICK, offset, 100);
          addNote(KICK, offset + 2.5, 95);
          // Snare/clap on 2 and 4
          addNote(SNARE, offset + 1, 100);
          addNote(CLAP, offset + 1, 90);
          addNote(SNARE, offset + 3, 100);
          addNote(CLAP, offset + 3, 90);
          // Rolling hi-hats (triplets on last beat)
          for (let i = 0; i < 8; i++) {
            addNote(CLOSED_HAT, offset + i * 0.5, 70);
          }
          // Hat rolls
          for (let i = 0; i < 6; i++) {
            addNote(CLOSED_HAT, offset + 3.5 + i * 0.083, 80);
          }
        }
      },
    };

    const patternFn = stylePatterns[style.toLowerCase()];
    if (!patternFn) {
      return `Unknown style "${style}". Available styles: ${Object.keys(stylePatterns).join(", ")}`;
    }

    patternFn();

    // Create the track with the pattern
    const blueprint: TrackBlueprint = {
      name: trackName || `${style.charAt(0).toUpperCase() + style.slice(1)} Drums`,
      type: "MIDI",
      device: "Drum Rack",
      clips: [
        {
          name: `${style} beat`,
          length: `${safeBars} bars`,
          notes,
        },
      ],
    };

    // Apply tempo if specified
    if (tempo) {
      await applyProjectSettings({ tempo });
    }

    const trackType = await applyTrackBlueprint(blueprint, beatsPerBar);

    // Capture snapshot after mutation for UI sync
    const snapshot = await captureSessionSnapshot();

    const message = `Created ${style} drum pattern on "${blueprint.name}" (${trackType}): ${notes.length} notes over ${safeBars} bars${tempo ? ` at ${tempo} BPM` : ""}.`;

    return JSON.stringify({
      message,
      snapshot,
      syncRequired: true,
      syncHint: "Call upsertAbletonTrack and setProjectOverview to sync UI.",
    });
  },
  {
    name: "abletonQuickDrums",
    description:
      "Quickly create a drum track with a pre-made pattern in a specific style. Perfect for getting started with a beat.",
    schema: z.object({
      style: z
        .enum(["house", "techno", "hiphop", "dnb", "trap"])
        .describe("The drum style to create"),
      bars: z.number().min(1).max(16).optional().describe("Length in bars (default 4)"),
      tempo: z.number().min(60).max(200).optional().describe("Set the project tempo"),
      trackName: z.string().optional().describe("Custom track name (defaults to style name)"),
    }),
  },
);

// Bridge tool: Convert workflow compositions to Ableton tracks
const workflowCompositionsToAbleton = tool(
  async ({ compositionsJson, timeSignature, defaultDevice }) => {
    type Voice = {
      role: string;
      trackName: string;
      clipName: string;
      notes: Array<{ pitch: number; time: number; duration: number; velocity: number }>;
      paletteEntryId?: string;
    };

    type Composition = {
      sectionId: string;
      voices: Voice[];
      harmonyProgression?: Array<{ startBeat: number; chord: string; duration: number }>;
      densityLevel?: number;
    };

    const compositions = parseJsonPayload<Composition[]>(compositionsJson, "compositions JSON");
    const beatsPerBar = getBeatsPerBar(timeSignature);

    // Map roles to appropriate devices
    const roleToDevice: Record<string, string> = {
      bass: "Analog",
      harmony: "Wavetable",
      topline: "Wavetable",
      lead: "Operator",
      counterline: "Wavetable",
      rhythm: "Drum Rack",
      pad: "Wavetable",
      texture: "Wavetable",
      fx: "Wavetable",
    };

    // Group voices by track name across all compositions
    const trackVoices = new Map<string, { notes: Array<{ pitch: number; time: number; duration: number; velocity: number }>; role: string; clipName: string }[]>();

    for (const comp of compositions) {
      for (const voice of comp.voices) {
        if (!voice.notes?.length) continue;

        const existing = trackVoices.get(voice.trackName) || [];
        existing.push({
          notes: voice.notes,
          role: voice.role,
          clipName: voice.clipName,
        });
        trackVoices.set(voice.trackName, existing);
      }
    }

    const results: string[] = [];

    for (const [trackName, voiceData] of trackVoices) {
      // Use the role from the first voice to determine device
      const role = voiceData[0]?.role || "pad";
      const device = defaultDevice || roleToDevice[role] || "Wavetable";

      // Convert voices to clips
      const clips = voiceData.map((v) => ({
        name: v.clipName,
        length: `${Math.ceil(Math.max(...v.notes.map((n) => n.time + n.duration)) / beatsPerBar)} bars`,
        notes: v.notes.map((n) => ({
          pitch: n.pitch,
          time: n.time,
          duration: n.duration,
          velocity: n.velocity,
        })),
      }));

      const blueprint: TrackBlueprint = {
        name: trackName,
        type: "MIDI",
        device,
        clips,
      };

      const trackType = await applyTrackBlueprint(blueprint, beatsPerBar);
      results.push(`${trackName} (${trackType} with ${device}, ${clips.length} clips)`);
    }

    return results.length
      ? `Created Ableton tracks from compositions: ${results.join(", ")}.`
      : "No voices with notes found in compositions.";
  },
  {
    name: "workflowCompositionsToAbleton",
    description:
      "Convert workflow composition output (from workflowComposeSection or workflowComposeAllSections) directly into Ableton tracks with clips. Automatically assigns appropriate instruments based on voice roles.",
    schema: z.object({
      compositionsJson: z
        .string()
        .describe(
          "JSON string of the compositions array from workflow tools. Each composition has sectionId and voices array with role, trackName, clipName, and notes.",
        ),
      timeSignature: z
        .string()
        .optional()
        .describe("Time signature (e.g., '4/4') for calculating clip lengths."),
      defaultDevice: z
        .string()
        .optional()
        .describe("Override the automatic device selection with a specific instrument name."),
    }),
  },
);

// 4. Put our tools into an array
const tools = [
  grooveRecipe,
  maxPatchOutline,
  abletonApplyProjectSettings,
  abletonUpsertTracks,
  abletonRemoveTrack,
  abletonCaptureSnapshot,
  abletonListDevices,
  abletonQuickDrums,
  workflowCompositionsToAbleton,
  // Music production workflow tools (stages 1-9)
  ...allWorkflowTools,
  // sample tools
  tool(
    async ({ query, roots, exts, bpmMin, bpmMax, key, limit }) => {
      const results = await searchSamples({ query, roots, exts, bpmMin, bpmMax, key, limit });
      return JSON.stringify({ count: results.length, results });
    },
    {
      name: "sampleSearch",
      description:
        "Search local folders for audio samples by keyword, BPM range, musical key, and file extension. Defaults to common sample directories.",
      schema: z.object({
        query: z.string().optional().describe("Keywords to match in file path; use -term to exclude."),
        roots: z.array(z.string()).optional().describe("Directories to search; defaults to common sample folders or SAMPLE_DIRS env var."),
        exts: z.array(z.string()).optional().describe("File extensions to include (e.g. ['wav','aiff'])."),
        bpmMin: z.number().optional().describe("Minimum BPM, inferred from filename if present."),
        bpmMax: z.number().optional().describe("Maximum BPM, inferred from filename if present."),
        key: z.string().optional().describe("Musical key to match (e.g. 'F#m', 'C minor')."),
        limit: z.number().optional().describe("Max results to return (default 20)."),
      }),
    },
  ),
  tool(
    async ({ filePath, trackName, positionBeats }) => {
      const msg = await insertSampleAsClip(filePath, { trackName, positionBeats });
      return msg;
    },
    {
      name: "abletonInsertSampleClip",
      description:
        "Insert an audio file as an audio clip into an audio track at a given arrangement position (in beats). Creates the track if needed.",
      schema: z.object({
        filePath: z.string().min(1).describe("Absolute or relative path to an audio file (wav, aiff, mp3, flac, etc.)."),
        trackName: z.string().optional().describe("Target audio track name; a new one is created if missing."),
        positionBeats: z.number().optional().describe("Arrangement position in beats (default 0)."),
      }),
    },
  ),
];

const ensureTypedContent = (
  content: BaseMessage["content"],
): { content: BaseMessage["content"]; changed: boolean } => {
  if (!Array.isArray(content)) {
    return { content, changed: false };
  }

  let changed = false;

  const sanitized = content.map((part) => {
    if (typeof part === "string") {
      changed = true;
      return { type: "text", text: part };
    }

    if (part == null || typeof part !== "object") {
      changed = true;
      return { type: "text", text: String(part ?? "") };
    }

    const existingType = "type" in part && typeof (part as { type?: unknown }).type === "string"
      ? (part as { type: string }).type
      : undefined;

    if (existingType && existingType.length > 0) {
      return part;
    }

    if ("text" in part && typeof (part as { text?: unknown }).text === "string") {
      changed = true;
      return { ...part, type: "text" };
    }

    changed = true;
    return { ...part, type: "text", text: JSON.stringify(part) };
  });

  return { content: sanitized, changed };
};

const normalizeMessageContent = (message: BaseMessage): BaseMessage => {
  const { content, changed } = ensureTypedContent(message.content);
  if (!changed) {
    return message;
  }

  const baseFields = {
    content,
    additional_kwargs: { ...message.additional_kwargs },
    response_metadata: { ...message.response_metadata },
    id: message.id,
    name: message.name,
  };

  switch (message._getType()) {
    case "ai": {
      const aiMessage = message as AIMessage;
      return new AIMessage({
        ...baseFields,
        tool_calls: aiMessage.tool_calls ?? [],
        invalid_tool_calls: aiMessage.invalid_tool_calls ?? [],
        usage_metadata: aiMessage.usage_metadata,
      });
    }
    case "human":
      return new HumanMessage(baseFields);
    case "system":
      return new SystemMessage(baseFields);
    case "tool": {
      const toolMessage = message as ToolMessage;
      return new ToolMessage({
        ...baseFields,
        tool_call_id: toolMessage.tool_call_id ?? "tool_call",
        artifact: toolMessage.artifact,
        status: toolMessage.status,
        metadata: toolMessage.metadata,
      });
    }
    case "function": {
      const functionMessage = message as FunctionMessage;
      const functionName = functionMessage.name ?? "function";
      return new FunctionMessage({ ...baseFields, name: functionName });
    }
    case "generic": {
      const chatMessage = message as ChatMessage;
      return new ChatMessage({ ...baseFields, role: chatMessage.role ?? "assistant" });
    }
    default: {
      return new ChatMessage({ ...baseFields, role: message._getType() });
    }
  }
};

// 5. Define the chat node, which will handle the chat logic
async function chat_node(state: AgentState, config: RunnableConfig) {
  // 5.1 Define the model, lower temperature for deterministic responses
  const model = new ChatOpenAI({ temperature: 0, model: "gpt-4.1" });

  // 5.2 Bind the tools to the model, include CopilotKit actions. This allows
  //     the model to call tools that are defined in CopilotKit by the frontend.
  const modelWithTools = model.bindTools!(
    [
      ...convertActionsToDynamicStructuredTools(state.copilotkit?.actions ?? []),
      ...tools,
    ],
  );

  // 5.3 Define the system message, which will be used to guide the model, in this case
  //     we also add in the language to use from the state.
  const project = state.project ?? {};
  const projectSummary = JSON.stringify(project);

  const systemMessage = new SystemMessage({
    content: [
      "You are an expert Ableton Live 12 producer paired with Max 9.",
      "Act like a collaborative coproducer: design tracks, device chains, clip concepts, and Max for Live tools.",
      "",
      "COMMUNICATION STYLE:",
      "Always narrate what you're doing so the user can follow along:",
      "- Before discovering devices: 'Let me check what instruments you have available...'",
      "- After finding devices: 'Great, I see Wavetable, Drift, and Operator. I'll use Wavetable for this pad.'",
      "- Before creating tracks: 'Creating a MIDI track with Wavetable and a 4-bar chord progression...'",
      "- After completion: 'Done! I've added the Pad track with a Cmin7 to Fmaj7 progression.'",
      "",
      "Coordinate with the frontend actions to keep the workspace up to date.",
      "Prefer calling actions such as setProjectOverview, upsertAbletonTrack, removeAbletonTrack, setArrangementNotes, setNextActions, and setMaxPatchIdeas whenever you change the plan.",
      "",
      "CRITICAL - DEVICE DISCOVERY BEFORE TRACK CREATION:",
      "BEFORE creating any tracks with abletonUpsertTracks, you MUST:",
      "1. Tell the user you're checking available instruments (e.g., 'Let me see what instruments are available...')",
      "2. Call abletonListAvailableDevices to see what's in their Ableton browser",
      "3. Briefly mention what you found (e.g., 'Found Wavetable, Drift, Analog... I'll use Wavetable for this.')",
      "4. Then create the track with the EXACT device name from the list",
      "",
      "ALWAYS communicate your steps in chat so the user knows what's happening!",
      "If you skip device discovery, tracks may be created with the user's default instrument instead of what you intended!",
      "",
      "CRITICAL - CREATING PLAYABLE TRACKS:",
      "When using abletonUpsertTracks, you MUST ALWAYS include:",
      "1. 'device' - The EXACT instrument name from abletonListAvailableDevices (e.g., 'Drift', 'Wavetable', 'Operator')",
      "2. 'clips' array with 'notes' - Without notes, the clip will be empty and silent!",
      "",
      "Example for a house beat:",
      '{"name": "Drums", "type": "MIDI", "device": "Drum Rack", "clips": [{"name": "Beat", "length": "4 bars", "notes": [',
      '  {"pitch": 36, "time": 0, "duration": 0.25, "velocity": 100},',
      '  {"pitch": 36, "time": 1, "duration": 0.25, "velocity": 100},',
      '  {"pitch": 36, "time": 2, "duration": 0.25, "velocity": 100},',
      '  {"pitch": 36, "time": 3, "duration": 0.25, "velocity": 100},',
      '  {"pitch": 38, "time": 1, "duration": 0.25, "velocity": 90},',
      '  {"pitch": 38, "time": 3, "duration": 0.25, "velocity": 90},',
      '  {"pitch": 42, "time": 0, "duration": 0.25, "velocity": 70},',
      '  {"pitch": 42, "time": 0.5, "duration": 0.25, "velocity": 60},',
      '  {"pitch": 42, "time": 1, "duration": 0.25, "velocity": 70},',
      '  {"pitch": 42, "time": 1.5, "duration": 0.25, "velocity": 60}',
      "]}]}",
      "",
      "Drum MIDI pitches: 36=kick, 38=snare, 42=closed hat, 46=open hat, 39=clap, 37=rimshot, 43=low tom, 47=mid tom, 50=high tom",
      "Time is in beats (0, 0.5, 1, 1.5... where 4 beats = 1 bar in 4/4)",
      "",
      "Use abletonApplyProjectSettings, abletonUpsertTracks, abletonRemoveTrack, and abletonCaptureSessionSnapshot to control the Live set.",
      "Use sampleSearch to find audio samples locally and abletonInsertSampleClip to place them in the arrangement.",
      "Use workflowCompositionsToAbleton to convert workflow compositions directly to Ableton tracks.",
      "Call grooveRecipe or maxPatchOutline for creative prompts.",
      "",
      "CRITICAL - UI SYNC AFTER ABLETON MUTATIONS:",
      "All Ableton tools (abletonApplyProjectSettings, abletonUpsertTracks, abletonRemoveTrack, abletonQuickDrums) now return a JSON object with a 'snapshot' field.",
      "IMMEDIATELY after calling any Ableton tool, you MUST parse the snapshot and call the appropriate frontend actions:",
      "1. Call setProjectOverview with JSON: {\"tempo\": snapshot.tempo, \"timeSignature\": snapshot.timeSignature, \"genre\": <current genre>}",
      "2. For each track in snapshot.tracks, call upsertAbletonTrack with JSON: {\"id\": track.name, \"name\": track.name, \"type\": track.type, \"color\": track.colorHex}",
      "3. For removed tracks, call removeAbletonTrack with the trackId",
      "This ensures the UI stays synchronized with Ableton Live in real-time. NEVER skip this step!",
      "",
      "",
      "MUSIC PRODUCTION WORKFLOW:",
      "When creating full tracks, follow these 9 stages using the workflow tools:",
      "1. Brief Ingestion (workflowIngestBrief, workflowLockIntent) - Capture genre, mood, references, and rules",
      "2. Style Prior (workflowBuildStylePrior) - Define BPM signature, swing profile, sound design traits",
      "3. Time Base (workflowGenerateGrooves, workflowScoreGrooves, workflowSelectTimeBase) - Create the foundation groove",
      "4. Palette (workflowAssemblePalette, workflowValidatePaletteCoverage) - Select sounds covering frequency spectrum",
      "5. Motif Seeds (workflowGenerateMotifs, workflowScoreMotifs, workflowSelectTopMotifs) - Create melodic/rhythmic/harmonic seeds",
      "6. Macro Structure (workflowDraftMacroStructure, workflowValidateEnergyCurve) - Plan arrangement sections and energy curve",
      "7. Compose (workflowComposeSection, workflowScoreComposition, workflowComposeAllSections) - Orchestrate each section",
      "8. Variations (workflowApplyVariation, workflowGenerateEarCandy, workflowRunVariationPass) - Add variety and transitions",
      "9. Mix Design (workflowAssembleMixDesign) - Create leveling, EQ/compression, spatial, and automation plans",
      "",
      `Current project snapshot: ${projectSummary}`,
    ].join("\n"),
  });

  // 5.4 Invoke the model with the system message and the messages in the state
  const sanitizedMessages = (state.messages as BaseMessage[]).map(normalizeMessageContent);

  const response = await modelWithTools.invoke(
    [systemMessage, ...sanitizedMessages],
    config
  );

  // 5.5 Return the response, which will be added to the state
  return {
    messages: response,
  };
}

// 6. Define the function that determines whether to continue or not,
//    this is used to determine the next node to run
function shouldContinue({ messages }: AgentState) {
  // 6.1 Get the last message from the state
  const lastMessage = messages[messages.length - 1] as AIMessage;

  // 7.2 If the LLM makes a tool call, then we route to the "tools" node
  if (lastMessage.tool_calls?.length) {
    return "tool_node";
  }

  // 6.4 Otherwise, we stop (reply to the user) using the special "__end__" node
  return "__end__";
}

// Map device type from snapshot to frontend category
function mapDeviceTypeToCategory(deviceType: string): string {
  switch (deviceType) {
    case "instrument":
      return "Instrument";
    case "audioEffect":
      return "Audio Effect";
    case "midiEffect":
      return "MIDI Effect";
    default:
      return "Unknown";
  }
}

// Helper to extract Ableton snapshot from tool results and build project state update
function extractProjectUpdateFromToolResults(messages: BaseMessage[]): Partial<AgentState> | null {
  for (const msg of messages) {
    if (msg._getType() !== "tool") continue;

    const content = typeof msg.content === "string" ? msg.content : "";

    // Check if this looks like an Ableton tool result with snapshot
    if (!content.includes('"snapshot"') || !content.includes('"syncRequired"')) continue;

    try {
      const parsed = JSON.parse(content);
      if (!parsed.snapshot || !parsed.syncRequired) continue;

      const snapshot = parsed.snapshot as AbletonSessionSnapshot;

      // Build project state update from snapshot
      return {
        project: {
          tempo: snapshot.tempo,
          timeSignature: snapshot.timeSignature,
          tracks: snapshot.tracks.map((track) => ({
            id: track.name,
            name: track.name,
            type: track.type === "Unknown" ? "MIDI" : track.type,
            color: track.colorHex || undefined,
            devices: track.devices.map((device) => ({
              name: device.name,
              category: mapDeviceTypeToCategory(device.type),
              notes: device.isActive ? undefined : "(bypassed)",
            })),
            clips: track.clipNames.map((clipName) => ({
              name: clipName,
              length: "4 bars",
              notes: [],
            })),
          })),
        },
      };
    } catch {
      // Not valid JSON, skip
    }
  }
  return null;
}

// Define a dynamic tool node that merges static tools with CopilotKit actions
async function dynamic_tool_node(state: AgentState, config: RunnableConfig) {
  const dynamicTools = convertActionsToDynamicStructuredTools(state.copilotkit?.actions ?? []);
  const node = new ToolNode([...tools, ...dynamicTools]);
  const result = await node.invoke(state as any, config as any);

  // Auto-sync: Check if any Ableton tools returned snapshots and update project state
  const resultMessages = result.messages as BaseMessage[] | undefined;
  if (resultMessages?.length) {
    const projectUpdate = extractProjectUpdateFromToolResults(resultMessages);
    if (projectUpdate) {
      // Merge project update with existing project state
      const currentProject = state.project ?? {};
      return {
        ...result,
        project: {
          ...currentProject,
          ...projectUpdate.project,
        },
      };
    }
  }

  return result;
}

// Define the workflow graph
const workflow = new StateGraph(AgentStateAnnotation)
  .addNode("chat_node", chat_node)
  .addNode("tool_node", dynamic_tool_node)
  .addEdge(START, "chat_node")
  .addEdge("tool_node", "chat_node")
  .addConditionalEdges("chat_node", shouldContinue as any);

const memory = new MemorySaver();

export const graph = workflow.compile({
  checkpointer: memory,
});
