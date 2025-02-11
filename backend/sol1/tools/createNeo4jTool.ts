/* eslint-disable @typescript-eslint/no-explicit-any */
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { GraphCypherQAChain } from "@langchain/community/chains/graph_qa/cypher";
import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
import { PromptTemplate } from "@langchain/core/prompts";

/**
 *
 * Maybe different tools for retrieving context from the graph
 * - one for schema
 * - one for querying
 * - one for answering questions?
 *
 * Nodes for days and then subnodes under these?
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

  // Retry wrapper
  // Query translation - kartihk

  try {
    // Extract schema information using Neo4j's built-in procedures
    const schemaQuery = `
      CALL db.schema.visualization()
      YIELD nodes, relationships
      RETURN nodes, relationships
    `;

    const nodePropertiesQuery = `
      CALL db.schema.nodeTypeProperties()
      YIELD nodeType, propertyName, propertyTypes
      RETURN nodeType, propertyName, propertyTypes
    `;

    const schemaResults = await neo4jGraph.query(schemaQuery);
    const propertyResults = await neo4jGraph.query(nodePropertiesQuery);

    console.log("Schema results:", schemaResults);

    console.log("Schema before refresh: ", neo4jGraph.getSchema());
    await neo4jGraph.refreshSchema();
    console.log("Schema after refresh: ", neo4jGraph.getSchema());

    // Format node properties
    const nodePropertiesText = propertyResults
      .map((row: any) => {
        const nodeType = row.nodeType?.replace(/[:`]/g, "") || "Unknown";
        const propName = row.propertyName || "Unknown";
        const propTypes = Array.isArray(row.propertyTypes)
          ? row.propertyTypes.join(", ")
          : row.propertyTypes || "Unknown";
        return `- ${nodeType}: ${propName} (${propTypes})`;
      })
      .join("\n");

    // Format relationships
    const relationshipsText =
      schemaResults[0]?.relationships
        ?.map((rel: any) => `- ${rel.name}`)
        .join("\n") || "No relationships found";

    const schemaDescription = `
Knowledge Graph Schema:

Node Types and Properties:
${nodePropertiesText}

Available Relationships:
${relationshipsText}

Note: This is an Entity-Attribute based graph where entities are connected to their attributes via relationships.
`;

    console.log("Generated schema description:", schemaDescription);

    const graphChain = GraphCypherQAChain.fromLLM({
      llm: graphLLM,
      graph: neo4jGraph,
      returnDirect: false,
      cypherPrompt: new PromptTemplate({
        template: `
              You are an expert at converting natural language into Cypher queries.
      Today's date is 2024-10-19, ergo CURRENT_DATE=2024-10-19.
      Use the following schema information to generate an accurate query:

      ${schemaDescription}

      Important Rules for Writing Cypher Queries:
      1. Relationship patterns must use plain arrows: -[r:TYPE]->
      2. Node labels must not include backticks or colons in the query
      3. Property values must be quoted with single quotes
      4. Use Neo4j's built-in functions for:
         - Dates: date(), datetime()
         - Time intervals: duration()
         - String operations: toLower(), contains()
      5. When filtering by date use proper temporal functions

      Convert this question into a Cypher query:
      Question: Who were on the shift yesterday?
        `,
        inputVariables: [],
      }),

      //       cypherPrompt: new PromptTemplate({
      //         template: `
      // You are an expert at converting natural language into Cypher queries.
      // Today's date is 2024-10-19, ergo CURRENT_DATE=2024-10-19.
      // Use the following schema information to generate an accurate query:

      // ${schemaDescription}

      // Important Rules for Writing Cypher Queries:
      // 1. Relationship patterns must use plain arrows: -[r:TYPE]->
      // 2. Node labels must not include backticks or colons in the query
      // 3. Property values must be quoted with single quotes
      // 4. Use Neo4j's built-in functions for:
      //    - Dates: date(), datetime()
      //    - Time intervals: duration()
      //    - String operations: toLower(), contains()
      // 5. When filtering by date use proper temporal functions

      // Convert this question into a Cypher query:
      // Question: {question}

      // The query must:
      // 1. Only use node labels and relationship types from the schema above
      // 2. Only use properties that exist in the schema
      // 3. Follow Neo4j's Cypher syntax exactly

      // Cypher Query:`,
      //         inputVariables: ["question"], // fix this query with question is a question and not cypher query
      //       }),
    });

    const neo4jTool = tool(
      async ({ question }: { question: string }) => {
        console.log("---------- neo4jTool used! ------------");
        console.log("Schema-aware question:", question);

        const question2 = "Who were on the shift yesterday?";

        try {
          const result = await graphChain.invoke({ question2 });
          console.log("ToolResult:", result);

          if (!result || !result.result) {
            return {
              result:
                "No data found. Query was valid according to schema but returned no results.",
            };
          }

          return result.result;
        } catch (error) {
          console.error("Error executing neo4jTool:", error);
          return {
            result:
              "Error querying database. Please ensure query matches Neo4j syntax requirements.",
          };
        }
      },
      {
        name: "neo4jTool",
        description: `Use this tool to query the Neo4j knowledge graph. ${schemaDescription}`,
        schema: z.object({
          question: z
            .string()
            .describe(
              "A question that will be converted to a Cypher query based on the available schema"
            ),
        }),
      }
    );

    return neo4jTool;
  } catch (error) {
    console.error("Error extracting schema information:", error);
    console.error("Full error:", error);
    throw new Error("Failed to initialize neo4jTool with schema information");
  }
}

// import { tool } from "@langchain/core/tools";
// import { z } from "zod";
// import { ChatOpenAI } from "@langchain/openai";
// import { GraphCypherQAChain } from "@langchain/community/chains/graph_qa/cypher";
// import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
// import { PromptTemplate } from "@langchain/core/prompts";

// export async function createNeo4jTool(
//   neo4jGraph: Neo4jGraph,
//   openAIApiKey: string
// ) {
//   const graphLLM = new ChatOpenAI({
//     openAIApiKey,
//     temperature: 0,
//     modelName: "gpt-3.5-turbo",
//   });

//   // Retry wrapper
//   // Query translation - kartihk

//   try {
//     // Extract schema information using Neo4j's built-in procedures
//     const schemaQuery = `
//       CALL db.schema.visualization()
//       YIELD nodes, relationships
//       RETURN nodes, relationships
//     `;

//     const nodePropertiesQuery = `
//       CALL db.schema.nodeTypeProperties()
//       YIELD nodeType, propertyName, propertyTypes
//       RETURN nodeType, propertyName, propertyTypes
//     `;

//     const schemaResults = await neo4jGraph.query(schemaQuery);
//     const propertyResults = await neo4jGraph.query(nodePropertiesQuery);

//     // Format node properties
//     const nodePropertiesText = propertyResults
//       .map((row: any) => {
//         const nodeType = row.nodeType?.replace(/[:`]/g, "") || "Unknown";
//         const propName = row.propertyName || "Unknown";
//         const propTypes = Array.isArray(row.propertyTypes)
//           ? row.propertyTypes.join(", ")
//           : row.propertyTypes || "Unknown";
//         return `- ${nodeType}: ${propName} (${propTypes})`;
//       })
//       .join("\n");

//     // Format relationships
//     const relationshipsText =
//       schemaResults[0]?.relationships
//         ?.map((rel: any) => `- ${rel.name}`)
//         .join("\n") || "No relationships found";

//     const schemaDescription = `
// Knowledge Graph Schema:

// Node Types and Properties:
// ${nodePropertiesText}

// Available Relationships:
// ${relationshipsText}

// Data Model:
// - Entities represent objects or concepts (people, items, events)
// - Attributes store properties about entities (names, dates, values)
// - HAS_ATTRIBUTE connects entities to their attributes
// - Other relationships connect entities to each other
// `;

//     const graphChain = GraphCypherQAChain.fromLLM({
//       llm: graphLLM,
//       graph: neo4jGraph,
//       returnDirect: false,
//       cypherPrompt: new PromptTemplate({
//         template: `
// You are an expert at querying Entity-Attribute graph patterns in Neo4j.

// Schema Information:
// ${schemaDescription}

// Entity-Attribute Query Patterns:
// 1. To find entities by their attributes:
//    MATCH (e:Entity)-[:HAS_ATTRIBUTE]->(a:Attribute)
//    WHERE a.name = 'AttributeName' AND a.data_type = 'Type'

// 2. To find related entities:
//    MATCH (e1:Entity)-[:RELATIONSHIP_TYPE]->(e2:Entity)

// 3. For temporal queries:
//    - Current date: date()
//    - Yesterday: date().minus(duration('P1D'))
//    - Last week: date().minus(duration('P7D'))

// 4. Common patterns:
//    - Finding entities by date:
//      WHERE a.name = 'Date' AND a.value = date().minus(duration('P1D')).toString()
//    - Finding entities by type:
//      WHERE a.name = 'Type' AND a.value = 'SomeType'

// Question to convert to Cypher: {question}

// Generate a query that:
// 1. Uses correct Entity-Attribute patterns
// 2. Includes proper temporal functions for dates
// 3. Returns relevant entity properties
// 4. Uses only schema-defined relationships and properties

// Cypher Query:`,
//         inputVariables: ["question"],
//       }),
//     });

//     const neo4jTool = tool(
//       async ({ question }: { question: string }) => {
//         console.log("---------- neo4jTool used! ------------");
//         console.log("Schema-aware question:", question);

//         try {
//           const result = await graphChain.invoke({ question });
//           console.log("Generated Cypher:", result.intermediateSteps?.[0]); // Log the generated query
//           console.log("ToolResult:", result);

//           if (!result || !result.result) {
//             return {
//               result: "No matching data found in the knowledge graph.",
//             };
//           }

//           return result.result;
//         } catch (error) {
//           console.error("Error executing neo4jTool:", error);
//           console.error("Generated query:", (error as any)?.query || " "); // Log the failing query if available
//           return {
//             result:
//               "Error querying database. The query structure might not match the data model.",
//           };
//         }
//       },
//       {
//         name: "neo4jTool",
//         description: `Use this tool to query an Entity-Attribute based knowledge graph. ${schemaDescription}`,
//         schema: z.object({
//           question: z
//             .string()
//             .describe(
//               "A question to be converted into a Cypher query following Entity-Attribute patterns"
//             ),
//         }),
//       }
//     );

//     return neo4jTool;
//   } catch (error) {
//     console.error("Error extracting schema information:", error);
//     throw new Error("Failed to initialize neo4jTool with schema information");
//   }
// }
