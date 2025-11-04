/**
 * This is the main entry point for the agent.
 * It defines the workflow graph, state, tools, nodes and edges.
 */

import { z } from "zod";
import { RunnableConfig } from "@langchain/core/runnables";
import { tool } from "@langchain/core/tools";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { AIMessage, SystemMessage } from "@langchain/core/messages";
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
} from "./abletonClient";

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

    return summary.length
      ? `Applied Ableton project settings: ${summary.join(", ")}.`
      : "Applied Ableton project settings.";
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
      results.push(`${blueprint.name} (${trackType})`);
    }

    return `Synced Ableton tracks: ${results.join(", ")}.`;
  },
  {
    name: "abletonUpsertTracks",
    description:
      "Create or update Ableton tracks (name, type, arm/mute, optional clip skeletons). Accepts one or multiple track blueprints.",
    schema: z.object({
      blueprintJson: z
        .string()
        .describe(
          "JSON string describing either a single TrackBlueprint or an array of them. Each blueprint supports { name, type, colorIndex, arm, mute, clips: [{ name, length }] }.",
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
    return `Removed Ableton track "${trackName}".`;
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
    return JSON.stringify(snapshot);
  },
  {
    name: "abletonCaptureSessionSnapshot",
    description:
      "Fetch the current Ableton Live session snapshot (tempo, time signature, playback state, and tracks with clip names).",
    schema: z.object({}),
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
];

// 5. Define the chat node, which will handle the chat logic
async function chat_node(state: AgentState, config: RunnableConfig) {
  // 5.1 Define the model, lower temperature for deterministic responses
  const model = new ChatOpenAI({ temperature: 0, model: "gpt-4o" });

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
      "Coordinate with the frontend actions to keep the workspace up to date.",
      "Prefer calling actions such as setProjectOverview, upsertAbletonTrack, removeAbletonTrack, setArrangementNotes, setNextActions, and setMaxPatchIdeas whenever you change the plan.",
      "Use abletonApplyProjectSettings, abletonUpsertTracks, abletonRemoveTrack, and abletonCaptureSessionSnapshot to control the Live set. Call grooveRecipe or maxPatchOutline for creative prompts.",
      `Current project snapshot: ${projectSummary}`,
    ].join("\n"),
  });

  // 5.4 Invoke the model with the system message and the messages in the state
  const response = await modelWithTools.invoke(
    [systemMessage, ...state.messages],
    config
  );

  // 5.5 Return the response, which will be added to the state
  return {
    messages: response,
  };
}

// 6. Define the function that determines whether to continue or not,
//    this is used to determine the next node to run
function shouldContinue({ messages, copilotkit }: AgentState) {
  // 6.1 Get the last message from the state
  const lastMessage = messages[messages.length - 1] as AIMessage;

  // 7.2 If the LLM makes a tool call, then we route to the "tools" node
  if (lastMessage.tool_calls?.length) {
    // Actions are the frontend tools coming from CopilotKit
    const actions = copilotkit?.actions;
    const toolCallName = lastMessage.tool_calls![0].name;

    // 7.3 Only route to the tool node if the tool call is not a CopilotKit action
    if (!actions || actions.every((action) => action.name !== toolCallName)) {
      return "tool_node"
    }
  }

  // 6.4 Otherwise, we stop (reply to the user) using the special "__end__" node
  return "__end__";
}

// Define the workflow graph
const workflow = new StateGraph(AgentStateAnnotation)
  .addNode("chat_node", chat_node)
  .addNode("tool_node", new ToolNode(tools))
  .addEdge(START, "chat_node")
  .addEdge("tool_node", "chat_node")
  .addConditionalEdges("chat_node", shouldContinue as any);

const memory = new MemorySaver();

export const graph = workflow.compile({
  checkpointer: memory,
});
