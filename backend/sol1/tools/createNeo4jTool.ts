import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { GraphCypherQAChain } from "@langchain/community/chains/graph_qa/cypher";
import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
import { PromptTemplate } from "@langchain/core/prompts";

export async function createNeo4jTool(
  neo4jGraph: Neo4jGraph,
  openAIApiKey: string
) {
  const graphLLM = new ChatOpenAI({
    openAIApiKey,
    temperature: 0,
    modelName: "gpt-4o",
  });

  await neo4jGraph.refreshSchema();
  const schema = neo4jGraph.getSchema();
  console.log("Schema:", schema);

  const neo4jTool = tool(
    async ({ question }: { question: string }) => {
      console.log("---------- neo4jTool used! ------------");
      console.log("User question:", question);

      const graphPrompt = new PromptTemplate({
        inputVariables: ["question", "schema"],
        template: `
        You are an expert at retrieving data from a knowledge graph in neo4j.
        Schema Information:
        ${schema}
        
        User Question: 
        ${question}
        
        **Instructions**:
        1. Answer the user question with the relevant information from the knowledge graph.
        
        Answer: 
        
        `,
      });

      const graphChain = GraphCypherQAChain.fromLLM({
        llm: graphLLM,
        graph: neo4jGraph,
        returnDirect: false,
        qaPrompt: graphPrompt,
        // returnIntermediateSteps: true,
      });

      try {
        console.log("Invoking graphChain...");
        const result = await graphChain.invoke({
          question,
          schema,
          graphPrompt,
        });

        console.log("ToolResult:", result);
        console.log("ToolResult.result:", result.result);

        // if (!result || !result.result) {
        //   return {
        //     result:
        //       "No data found. Query was valid according to schema but returned no results.",
        //   };
        // }

        return result;
      } catch (error) {
        console.error("Error executing neo4jTool:", error);
        console.log("Error:", error);
        return {
          result:
            "Error querying database. Please ensure query matches Neo4j syntax requirements.",
        };
      }
    },
    {
      name: "neo4jTool",
      description: `Use this tool to query the Neo4j knowledge graph and retrieve relevant information based on the user question.`,
      schema: z.object({
        question: z
          .string()
          .describe(
            "The user question in natural language. The tool will convert this into a Cypher query."
          ),
      }),
    }
  );

  return neo4jTool;
}
