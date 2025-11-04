"use client";

import { useCoAgent, useCopilotAction } from "@copilotkit/react-core";
import { CopilotKitCSSProperties, CopilotSidebar } from "@copilotkit/react-ui";
import { useMemo, useState } from "react";

type AbletonDevice = {
  name: string;
  category: "Instrument" | "Audio Effect" | "MIDI Effect" | "Max for Live" | string;
  notes?: string;
};

type AbletonClip = {
  name: string;
  length: string;
  clipType: "MIDI" | "Audio" | "Automation" | string;
  description?: string;
};

type MaxPatchIdea = {
  id: string;
  name: string;
  description: string;
  devices?: string[];
  modulationTargets?: string[];
};

type AbletonTrack = {
  id: string;
  name: string;
  type: "MIDI" | "Audio" | "Return" | string;
  color?: string;
  role?: string;
  notes?: string;
  devices: AbletonDevice[];
  clips: AbletonClip[];
  maxPatch?: MaxPatchIdea | null;
};

type AbletonProjectState = {
  projectName: string;
  genre: string;
  vibe: string;
  tempo: number;
  key: string;
  timeSignature: string;
  arrangementNotes: string;
  sessionViewNotes: string;
  nextActions: string[];
  maxPatchIdeas: MaxPatchIdea[];
  tracks: AbletonTrack[];
};

type AbletonAgentState = {
  project: AbletonProjectState;
};

const defaultProject: AbletonProjectState = {
  projectName: "Ableton Copilot Jam",
  genre: "Lush techno",
  vibe: "Deep, evolving pads with playful percussion",
  tempo: 122,
  key: "F minor",
  timeSignature: "4/4",
  arrangementNotes:
    "Design a structure with an 8-bar evolving intro, 32-bar groove, a tension breakdown with filtered pads, and a driving final drop that introduces granular percussion.",
  sessionViewNotes:
    "Populate clip slots with evolving pads, syncopated stabs, and automation-ready macro mappings. Use scene names for sections (Intro, Groove, Breakdown, Drop, Outro).",
  nextActions: [
    "Ask the assistant to sketch an arrangement roadmap with bar counts.",
    "Request a Max for Live modulation patch to morph pad macros over time.",
    "Have the assistant design drum rack macros for live performance tweaks.",
  ],
  maxPatchIdeas: [
    {
      id: "max-evo-01",
      name: "Macro Drift Evolver",
      description:
        "Automates slow LFO-driven morphing between pad macro states with randomised phase offsets.",
      devices: ["LFO", "Max Envelope Follower"],
      modulationTargets: ["Pad rack macro 1", "Pad rack macro 4"],
    },
  ],
  tracks: [
    {
      id: "track-pad",
      name: "Opaline Pads",
      type: "MIDI",
      color: "#8b5cf6",
      role: "Atmospheric bed",
      notes: "Wavetable > Pad Nodes preset with custom macro for shimmer amount.",
      devices: [
        { name: "Wavetable", category: "Instrument", notes: "Pad Nodes preset" },
        {
          name: "Hybrid Reverb",
          category: "Audio Effect",
          notes: "Dark hall IR, blend 42%",
        },
        {
          name: "Shimmer",
          category: "Audio Effect",
          notes: "Feedback 18%, pitch +12",
        },
      ],
      clips: [
        {
          name: "Intro pad swell",
          length: "8 bars",
          clipType: "MIDI",
          description: "Slowly opening filter with macro automation lanes.",
        },
      ],
      maxPatch: {
        id: "max-pad-morph",
        name: "Pad Macro Morph",
        description:
          "Max for Live LFO device with phase-shifted modulation to morph pad macros over 32 bars.",
        devices: ["LFO", "Envelope Follower"],
        modulationTargets: ["Macro 1", "Macro 5"],
      },
    },
    {
      id: "track-drums",
      name: "Percussive Playground",
      type: "MIDI",
      color: "#f97316",
      role: "Groove engine",
      notes:
        "Drum rack with layered kicks, foley hats, and Max Shaper for transient emphasis.",
      devices: [
        { name: "Drum Rack", category: "Instrument", notes: "Custom kit" },
        { name: "Saturator", category: "Audio Effect", notes: "Analog curve" },
        { name: "Max Humanizer", category: "Max for Live", notes: "Velocity variance 12%" },
      ],
      clips: [
        {
          name: "Main groove",
          length: "4 bars",
          clipType: "MIDI",
          description:
            "Kick on 1, syncopated hats, ghost claps on 2e+, open hat on bar 4.",
        },
      ],
    },
  ],
};

const sectionLabelStyles =
  "uppercase tracking-widest text-xs text-white/60 font-semibold";

export default function CopilotKitPage() {
  const [themeColor, setThemeColor] = useState("#7c3aed");

  useCopilotAction({
    name: "setThemeColor",
    description: "Set the accent color for the Ableton workspace overview.",
    parameters: [
      {
        name: "themeColor",
        description: "A HEX color to use as the primary accent.",
        required: true,
      },
    ],
    handler({ themeColor }) {
      setThemeColor(themeColor);
    },
  });

  return (
    <main
      style={{ "--copilot-kit-primary-color": themeColor } as CopilotKitCSSProperties}
      className="min-h-screen bg-slate-950"
    >
      <AbletonBuilder themeColor={themeColor} />
      <CopilotSidebar
        clickOutsideToClose={false}
        defaultOpen
        labels={{
          title: "Ableton Live Copilot",
          initial:
            "🎛️ Hi producer! I'm ready to help you build an Ableton Live 12 + Max 9 session.\n\nTry asking for:\n- Project overview updates (tempo, key, vibe)\n- New track concepts with devices and clip ideas\n- Max for Live patch sketches for modulation or performance\n- Next actions to keep the creative flow moving",
        }}
      />
    </main>
  );
}

function AbletonBuilder({ themeColor }: { themeColor: string }) {
  const { state, setState } = useCoAgent<AbletonAgentState>({
    name: "starterAgent",
    initialState: {
      project: defaultProject,
    },
  });

  const project = useMemo(() => state.project ?? defaultProject, [state.project]);

  const safeJsonParse = <T,>(value: unknown): T | null => {
    if (typeof value !== "string") return null;
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.warn("Unable to parse JSON payload from assistant action.", error);
      return null;
    }
  };

  const updateProject = (updates: Partial<AbletonProjectState>) => {
    setState({
      ...state,
      project: {
        ...project,
        ...updates,
      },
    });
  };

  const upsertTrack = (trackPayload: Partial<AbletonTrack> & { id: string }) => {
    const sanitizedTrack: AbletonTrack = {
      id: trackPayload.id,
      name: trackPayload.name ?? `Track ${trackPayload.id}`,
      type: trackPayload.type ?? "MIDI",
      color: trackPayload.color,
      role: trackPayload.role,
      notes: trackPayload.notes,
      devices: trackPayload.devices ?? [],
      clips: trackPayload.clips ?? [],
      maxPatch: trackPayload.maxPatch ?? null,
    };

    const existingIndex = project.tracks.findIndex((t) => t.id === sanitizedTrack.id);
    const nextTracks =
      existingIndex === -1
        ? [...project.tracks, sanitizedTrack]
        : project.tracks.map((track, idx) =>
            idx === existingIndex
              ? {
                  ...track,
                  ...sanitizedTrack,
                  devices: sanitizedTrack.devices,
                  clips: sanitizedTrack.clips,
                  maxPatch: sanitizedTrack.maxPatch ?? null,
                }
              : track,
          );

    updateProject({ tracks: nextTracks });
  };

  useCopilotAction({
    name: "setProjectOverview",
    description:
      "Update the Ableton project overview (name, tempo, key, vibe, arrangement notes, session notes).",
    parameters: [
      {
        name: "projectOverviewJson",
        description:
          "JSON string with fields like projectName, genre, vibe, tempo, key, timeSignature, arrangementNotes, sessionViewNotes.",
        required: true,
      },
    ],
    handler: ({ projectOverviewJson }) => {
      const parsed = safeJsonParse<Partial<AbletonProjectState>>(projectOverviewJson);
      if (!parsed) return;

      updateProject({
        ...parsed,
        tempo: typeof parsed.tempo === "number" ? parsed.tempo : project.tempo,
      });
    },
  });

  useCopilotAction({
    name: "upsertAbletonTrack",
    description:
      "Add a new Ableton track or update an existing one. Include an id to keep updates stable.",
    parameters: [
      {
        name: "trackJson",
        description:
          "JSON string describing the track: { id, name, type, role, color, notes, devices: [{name, category, notes}], clips: [{name, length, clipType, description}], maxPatch }.",
        required: true,
      },
    ],
    handler: ({ trackJson }) => {
      const parsed = safeJsonParse<Partial<AbletonTrack> & { id: string }>(trackJson);
      if (!parsed?.id) return;
      upsertTrack(parsed);
    },
  });

  useCopilotAction({
    name: "removeAbletonTrack",
    description:
      "Remove a track from the Ableton project by id. Provide the Ableton track name when you need to delete it in Live.",
    parameters: [
      {
        name: "trackId",
        description: "The unique id of the track to remove.",
        required: true,
      },
      {
        name: "trackName",
        description:
          "Optional Ableton track name. Supply this when removing the actual Live track via abletonRemoveTrack.",
        required: false,
      },
    ],
    handler: ({ trackId }) => {
      updateProject({
        tracks: project.tracks.filter((track) => track.id !== trackId),
      });
    },
  });

  useCopilotAction({
    name: "setMaxPatchIdeas",
    description:
      "Replace the list of Max for Live patch ideas for this session. Provide rich descriptions so the user can build them quickly.",
    parameters: [
      {
        name: "maxPatchIdeasJson",
        description:
          "JSON string array of patches, each { id, name, description, devices, modulationTargets }.",
        required: true,
      },
    ],
    handler: ({ maxPatchIdeasJson }) => {
      const parsed = safeJsonParse<MaxPatchIdea[]>(maxPatchIdeasJson);
      if (!parsed) return;
      updateProject({ maxPatchIdeas: parsed });
    },
  });

  useCopilotAction({
    name: "setNextActions",
    description: "Update the creative next steps list for the session.",
    parameters: [
      {
        name: "actionItemsJson",
        description: "JSON string array of short action items.",
        required: true,
      },
    ],
    handler: ({ actionItemsJson }) => {
      const parsed = safeJsonParse<string[]>(actionItemsJson);
      if (!parsed) return;
      updateProject({ nextActions: parsed });
    },
  });

  useCopilotAction({
    name: "setArrangementNotes",
    description:
      "Update arrangement and session view notes to guide the producer through the Live set.",
    parameters: [
      {
        name: "arrangementNotes",
        description: "Detailed arrangement roadmap text.",
        required: false,
      },
      {
        name: "sessionViewNotes",
        description: "Clip/session view organization tips.",
        required: false,
      },
    ],
    handler: ({ arrangementNotes, sessionViewNotes }) => {
      updateProject({
        arrangementNotes: arrangementNotes ?? project.arrangementNotes,
        sessionViewNotes: sessionViewNotes ?? project.sessionViewNotes,
      });
    },
  });

  return (
    <div className="px-6 py-12 md:px-12 lg:px-24 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className={sectionLabelStyles}>Project</p>
              <h1 className="text-4xl font-bold text-white md:text-5xl">
                {project.projectName}
              </h1>
              <p className="text-white/70 text-lg md:text-xl">{project.vibe}</p>
            </div>
            <div
              className="rounded-2xl px-6 py-4 text-center text-sm font-semibold uppercase tracking-[0.3em]"
              style={{ backgroundColor: themeColor }}
            >
              Ableton Live 12 · Max 9
            </div>
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <MetaItem label="Genre" value={project.genre} />
            <MetaItem label="Tempo" value={`${project.tempo} BPM`} />
            <MetaItem label="Key" value={project.key} />
            <MetaItem label="Time Signature" value={project.timeSignature} />
          </dl>
        </header>

        <section className="grid gap-8 lg:grid-cols-[2fr,1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
            <p className={sectionLabelStyles}>Arrangement Roadmap</p>
            <p className="mt-3 text-base leading-relaxed text-white/80">
              {project.arrangementNotes}
            </p>
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className={sectionLabelStyles}>Session View Notes</p>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                {project.sessionViewNotes}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
            <p className={sectionLabelStyles}>Next Actions</p>
            <ul className="mt-4 space-y-3 text-sm text-white/80">
              {project.nextActions.map((item, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <span
                    className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{ backgroundColor: themeColor }}
                  >
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
              {project.nextActions.length === 0 && (
                <li className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-4 text-white/60">
                  Ask the copilot for creative next steps to keep momentum.
                </li>
              )}
            </ul>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className={sectionLabelStyles}>Tracks & Device Chains</p>
              <h2 className="text-2xl font-semibold text-white md:text-3xl">
                Build out the session view with the copilot
              </h2>
            </div>
            <span className="rounded-full border border-white/20 px-4 py-1 text-xs font-medium uppercase tracking-widest text-white/60">
              {project.tracks.length} tracks
            </span>
          </div>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {project.tracks.map((track) => (
              <TrackCard key={track.id} track={track} themeColor={themeColor} />
            ))}
            {project.tracks.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-8 text-white/60">
                No tracks yet. Ask the assistant to design a drum rack, synth pad, or audio
                processing chain.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
          <p className={sectionLabelStyles}>Max For Live Lab</p>
          <h2 className="mt-2 text-2xl font-semibold text-white md:text-3xl">
            Modulation + performance ideas
          </h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {project.maxPatchIdeas.map((patch) => (
              <MaxPatchCard key={patch.id} patch={patch} />
            ))}
            {project.maxPatchIdeas.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-8 text-white/60">
                Ask the copilot for a Max for Live device concept to unlock new modulation.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className={sectionLabelStyles}>{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function TrackCard({ track, themeColor }: { track: AbletonTrack; themeColor: string }) {
  return (
    <article className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-black/40 p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: track.color ?? themeColor }}
            />
            <h3 className="text-xl font-semibold text-white">{track.name}</h3>
          </div>
          <p className="text-sm uppercase tracking-widest text-white/50">{track.type}</p>
          {track.role && <p className="mt-2 text-sm text-white/70">{track.role}</p>}
        </div>
        {track.notes && (
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
            {track.notes}
          </span>
        )}
      </header>

      <div>
        <p className={sectionLabelStyles}>Devices</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {track.devices.map((device, index) => (
            <span
              key={`${device.name}-${index}`}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/80"
            >
              <span className="font-semibold">{device.name}</span>
              <span className="text-white/60">· {device.category}</span>
              {device.notes && <span className="text-white/60">({device.notes})</span>}
            </span>
          ))}
          {track.devices.length === 0 && (
            <span className="inline-flex items-center rounded-full border border-dashed border-white/20 px-3 py-1 text-xs text-white/50">
              Ask the copilot for device ideas
            </span>
          )}
        </div>
      </div>

      <div>
        <p className={sectionLabelStyles}>Clips</p>
        <div className="mt-3 space-y-3">
          {track.clips.map((clip, index) => (
            <div
              key={`${clip.name}-${index}`}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="rounded-full px-3 py-1 text-xs font-semibold tracking-widest text-white/60"
                  style={{ backgroundColor: themeColor }}
                >
                  {clip.length}
                </span>
                <span className="font-semibold text-white">{clip.name}</span>
                <span className="text-white/60 uppercase tracking-widest">
                  {clip.clipType}
                </span>
              </div>
              {clip.description && (
                <p className="mt-2 text-white/70">{clip.description}</p>
              )}
            </div>
          ))}
          {track.clips.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-4 text-sm text-white/60">
              No clips yet. Ask the assistant for MIDI clip concepts or recorded audio ideas.
            </div>
          )}
        </div>
      </div>

      {track.maxPatch && (
        <div className="rounded-2xl border border-white/10 bg-purple-600/20 p-5 text-sm text-white/80">
          <p className={sectionLabelStyles}>Max for Live Support</p>
          <h4 className="mt-2 font-semibold text-white">{track.maxPatch.name}</h4>
          <p className="mt-1 text-white/70">{track.maxPatch.description}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/70">
            {track.maxPatch.devices?.map((device, idx) => (
              <span
                key={`${device}-${idx}`}
                className="rounded-full border border-white/10 bg-white/10 px-3 py-1"
              >
                {device}
              </span>
            ))}
            {track.maxPatch.modulationTargets?.map((target, idx) => (
              <span
                key={`${target}-${idx}`}
                className="rounded-full border border-purple-300/40 bg-purple-500/20 px-3 py-1 text-purple-100"
              >
                ↦ {target}
              </span>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

function MaxPatchCard({ patch }: { patch: MaxPatchIdea }) {
  return (
    <article className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-black/40 p-6">
      <header>
        <p className={sectionLabelStyles}>Patch Idea</p>
        <h3 className="text-xl font-semibold text-white">{patch.name}</h3>
      </header>
      <p className="text-sm leading-relaxed text-white/70">{patch.description}</p>
      <div className="flex flex-wrap gap-2 text-xs text-white/70">
        {patch.devices?.map((device, index) => (
          <span
            key={`${patch.id}-device-${index}`}
            className="rounded-full border border-white/10 bg-white/10 px-3 py-1"
          >
            {device}
          </span>
        ))}
        {patch.modulationTargets?.map((target, index) => (
          <span
            key={`${patch.id}-target-${index}`}
            className="rounded-full border border-purple-300/40 bg-purple-500/20 px-3 py-1 text-purple-100"
          >
            ↦ {target}
          </span>
        ))}
      </div>
    </article>
  );
}
