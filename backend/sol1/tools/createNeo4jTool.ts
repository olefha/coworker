import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { GraphCypherQAChain } from "@langchain/community/chains/graph_qa/cypher";
import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";

export async function createNeo4jTool(
  neo4jGraph: Neo4jGraph,
  openAIApiKey: string
) {
  const graphLLM = new ChatOpenAI({
    openAIApiKey,
    temperature: 0,
    modelName: "gpt-3.5-turbo",
  });

  const graphChain = GraphCypherQAChain.fromLLM({
    llm: graphLLM,
    graph: neo4jGraph,
    returnDirect: false, // maybe change to true for faster response
    // returnIntermediateSteps: true,
  });

  async function runWithRetries(query: string) {
    let attempts = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lastError: any;
    while (attempts < 3) {
      try {
        console.log("Neo4jTool retried");
        console.log("query: ", query);
        const result = await graphChain.invoke({ query });
        console.log("ToolResult: ", result.result);
        return result.result;
      } catch (err) {
        // maybe invoke sql chain when error?
        console.error(err);
        lastError = err;
        attempts++;
      }
    }
    throw lastError;
  }

  const neo4jTool = tool(
    async ({ query }: { query: string }) => {
      return await runWithRetries(query);
    },
    {
      name: "neo4jTool",
      description: `
        Use this tool to send a valid CYPHER statement to the knowledge graph.
           Rules:
        - **No** explanations or commentary.
        - **Do not** wrap the CYPHER in backticks or code fences.
        - Provide exactly one CYPHER statement in the "query" field.
      `,
      schema: z.object({
        query: z
          .string()
          .describe(
            "A single, valid CYPHER statement. No commentary. No markdown."
          ),
      }),
    }
  );
  return neo4jTool;
}
