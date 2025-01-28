import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { GraphCypherQAChain } from "@langchain/community/chains/graph_qa/cypher";
import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";

/**
 * Creates a function-calling Tool for Neo4j queries via GraphCypherQAChain.
 *
 * @param neo4jGraph   An initialized Neo4jGraph instance
 * @param openAIApiKey OpenAI API Key
 * @returns A LangChain tool(...) object
 */
export async function createNeo4jTool(
  neo4jGraph: Neo4jGraph,
  openAIApiKey: string
) {
  const graphLLM = new ChatOpenAI({
    openAIApiKey,
    temperature: 0,
    modelName: "gpt-3.5-turbo",
  });

  // Create the GraphCypherQAChain - built in langChanin method - to generate and query graph
  const graphChain = GraphCypherQAChain.fromLLM({
    llm: graphLLM,
    graph: neo4jGraph,
    returnDirect: false,
  });

  // Build the function-calling tool
  const neo4jTool = tool(
    async ({ question }: { question: string }) => {
      // The agent passes { question }, and feed that into graphChain
      console.log("---------- neo4jTool used! ------------");
      const result = await graphChain.invoke({ question });
      return result.result;
    },
    {
      name: "neo4jTool",
      description:
        "Use this tool to query the Neo4j knowledge graph for relationship/structural info about the postgresql database to enhance your knowledge of the database.",
      schema: z.object({
        question: z
          .string()
          .describe("A question or partial Cypher query for the Neo4j graph"),
      }),
    }
  );

  return neo4jTool;
}
