/* eslint-disable @typescript-eslint/no-unused-vars */
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { createNeo4jTool } from "../tools/createNeo4jTool";
import { createPostgresTool } from "../tools/createPostgresTool";

// LangGraph imports
import {
  StateGraph,
  MemorySaver,
  Annotation,
  messagesStateReducer,
} from "@langchain/langgraph";

import { ToolNode } from "@langchain/langgraph/prebuilt";
import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
import { DataSource } from "typeorm";
import { SystemMessage } from "@langchain/core/messages";

/**
 *    Annotate the state: store the entire conversation as an array of messages.
 *    The `messagesStateReducer` will append any returned messages to the state.
 */
const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
  }),
});

/**
 *    Memory: persist the conversation state with `MemorySaver`.
 *    If multiple sessions, specify a `thread_id` on `.invoke()`.
 */
export const checkpointer = new MemorySaver();

/**
 *    The function that calls the LLM agent.
 *    Pass the entire conversation from `state.messages`,
 *    get a single AIMessage back, then merge that into the state.
 */
async function agentNodeFn(
  state: typeof StateAnnotation.State,
  model: ChatOpenAI,
  systemPrompt: string
) {
  // Original messages so far:
  const { messages } = state;

  // Convert the `prompt` into a SystemMessage:
  const systemMsg = new SystemMessage(systemPrompt);

  // Prepend it to the user’s conversation:
  const newMessages = [systemMsg, ...messages];

  // Call the LLM with the combined messages
  const response = await model.invoke(newMessages);

  return { messages: [response] };
}

/**
 *    A helper function that decides if the agent should go to the tools node or end.
 *    If the last AIMessage has any tool_calls, we go to "tools". Otherwise, end.
 */
function shouldContinue(state: typeof StateAnnotation.State) {
  const msgs = state.messages;
  const lastMsg = msgs[msgs.length - 1];
  if (lastMsg instanceof AIMessage && lastMsg.tool_calls?.length) {
    return "tools";
  }
  return "__end__";
}

/**
 *    Create the graph:
 *    - "agent" node calls the function that invokes the ReAct agent.
 *    - We run once per invocation and then end.
 *      The ReAct agent does all tool usage internally in that single pass.
 */
export async function createGraph(
  neo4jGraph: Neo4jGraph,
  dataSource: DataSource,
  prompt: string,
  openAIApiKey: string
) {
  const neo4jTool = await createNeo4jTool(neo4jGraph, openAIApiKey);
  const postgresTool = await createPostgresTool(dataSource, openAIApiKey, 5);

  const tools = [neo4jTool, postgresTool];

  const model = new ChatOpenAI({
    temperature: 0,
    openAIApiKey: process.env.OPENAI_API_KEY,
    // model: "gpt-4o",
  });
  const modelWithTools = model.bindTools(tools) as ChatOpenAI;

  // A built-in node that automatically executes any requested tool calls from the last AIMessage
  const toolNode = new ToolNode(tools);

  // Create the "agent" node that calls the function to run the model once with the conversation
  async function agentNode(state: typeof StateAnnotation.State) {
    return agentNodeFn(state, modelWithTools, prompt);
  }

  // Build the graph with conditional edges
  const workflow = new StateGraph(StateAnnotation)
    .addNode("agent", agentNode)
    .addNode("tools", toolNode)
    .addEdge("__start__", "agent")
    // After agent runs, decide if we continue to "tools" or end
    .addConditionalEdges("agent", shouldContinue)
    // After tools run, we always go back to agent so it can interpret the tool's output
    .addEdge("tools", "agent");

  // Compile to a Runnable
  const app = workflow.compile({
    checkpointer,
  });

  return app;
}
