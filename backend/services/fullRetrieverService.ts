/* eslint-disable @typescript-eslint/no-explicit-any */
// services/fullRetrieverService.ts
import { SqlDatabase } from "langchain/sql_db";
import { DataSource } from "typeorm";
import "reflect-metadata"; // Required by TypeORM
import "dotenv/config";
import { PromptTemplate } from "@langchain/core/prompts";
import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
import { GraphCypherQAChain } from "@langchain/community/chains/graph_qa/cypher";
import { SqlDatabaseChain } from "langchain/chains/sql_db";
import { ChatOpenAI } from "@langchain/openai";
import { AIMessage } from "@langchain/core/messages";

// Initialize LLMs
const openAIApiKey = process.env.OPENAI_API_KEY;

const llm = new ChatOpenAI({
  openAIApiKey: openAIApiKey,
  temperature: 0,
  modelName: "gpt-3.5-turbo",
});

const graphPrompt = new PromptTemplate({
  inputVariables: ["question"],
  template: `
  You are an expert at querying knowledge graphs with Cypher. Given a user question, dynamically traverse the graph to find relevant entities, relationships, and attributes.

  **User Question**: {question}

  **Instructions**:
  1. Identify entities, relationships, and attributes relevant to the question by exploring the graph.
  2. Traverse "has_attribute" relationships to retrieve each entity’s attributes and data types if they are relevant to the question.
  3. Generate a Cypher query that retrieves:
     - Entity names, direct and indirect relationships,
     - Attributes (name, datatype, and any other metadata).
  4. Return as much context as possible, especially attributes and relationships that may be indirectly relevant.
  
  Findings:`,
});

const combinePrompt = new PromptTemplate({
  inputVariables: ["question", "sql_result"],
  template: `
  As an expert data analyst, use the data provided to answer the user's question.

  SQL Query Results:
  {sql_result}
  
  User Question:
  {question}

  Answer:`,
});

// Initialize Data Source (PostgreSQL)
const initializeDataSource = async (): Promise<DataSource> => {
  const dataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST!,
    port: Number(process.env.DB_PORT!),
    username: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,
    entities: [],
    synchronize: false,
    logging: false,
  });

  await dataSource.initialize();
  console.log("PostgreSQL Database connected successfully.");
  return dataSource;
};

// Initialize Neo4j Graph
const initializeNeo4jGraph = async () => {
  const neo4jUrl = process.env.NEO4J_URI;
  const neo4jUsername = process.env.NEO4J_USERNAME;
  const neo4jPassword = process.env.NEO4J_PASSWORD;

  const neo4jGraph = await Neo4jGraph.initialize({
    url: neo4jUrl!,
    username: neo4jUsername!,
    password: neo4jPassword!,
    database: "baseline",
  });

  console.log("Neo4j Graph initialized successfully.");
  return neo4jGraph;
};

// Handle User Question
export const handleUserQuestion = async (
  userQuestion: string
): Promise<string> => {
  // Initialize Data Source and Graph
  const dataSource = await initializeDataSource();
  const neo4jGraph = await initializeNeo4jGraph();
  console.log(userQuestion);
  try {
    // Graph info retrieval
    const graphChain = GraphCypherQAChain.fromLLM({
      llm,
      graph: neo4jGraph,
      returnDirect: true,
      qaPrompt: graphPrompt,
    });

    console.log("-------------------------------------------------------");
    //Generate and Execute Cypher Query
    const graphResult = await graphChain.invoke({ question: userQuestion });

    // TODO: maybe access the graphResult.result list of objects to find info
    console.log("Graph Query Result:", graphResult.result);

    const formattedGraphInfo = await formatGraphRelationships(graphResult);
    console.log("Formatted Graph Relationships:", formattedGraphInfo);
    console.log("-------------------------------------------------------");

    //SQL Database
    const sqlDatabase = await SqlDatabase.fromDataSourceParams({
      appDataSource: dataSource,
    });

    const tableInfo = await sqlDatabase.getTableInfo();

    const sqlPrompt = new PromptTemplate({
      inputVariables: ["input", "table_info"],
      template: `
  You are an expert SQL query generator with full access to the database schema and a static knowledge graph that describes relationships between entities. 
  Use this background information to create a precise SQL query based on the user’s question.

  **User Question:**
  {input}

  **Database Table Information:**
  {table_info}

  **Knowledge Graph Relationships**:
  - These are the known relationships that can guide you in constructing SQL joins and selecting fields:
  ${formattedGraphInfo}

  **Instructions**:
  1. Analyze the user’s question to determine the necessary data and fields.
  2. Use the **Knowledge Graph Relationships** to guide your use of joins, conditions, or filters based on related tables.
  3. Generate an SQL query that answers the question precisely, using joins and aggregation as needed.

  **SQL Query Output**:
  - Output only the final SQL query, ready to execute without any explanations or additional text.`,
    });

    // Initialize SQL Chain
    const sqlChain: SqlDatabaseChain = await new SqlDatabaseChain({
      llm,
      database: sqlDatabase,
      prompt: sqlPrompt,
      sqlOutputKey: "sql_answer",
    });

    // Generate SQL Query
    const sqlResult = await sqlChain.invoke({
      query: userQuestion,
      table_info: tableInfo,
      // knowledge_graph_information: formattedGraphInfo,
    });
    let generatedSql = sqlResult.sql_answer;
    const startDelimiter = "/* START */";
    const endDelimiter = "/* END */";

    if (
      generatedSql.includes(startDelimiter) &&
      generatedSql.includes(endDelimiter)
    ) {
      generatedSql = generatedSql
        .split(startDelimiter)[1]
        .split(endDelimiter)[0]
        .trim();
    }

    console.log("Generated SQL Query:", generatedSql);

    // Execute Query
    const executedSqlResult = await dataSource.query(generatedSql);
    // console.log("SQL Query Result:", executedSqlResult);

    // Combine Results Using Third LLM
    const combinedChain = new ChatOpenAI({
      openAIApiKey: openAIApiKey,
      temperature: 0,
      modelName: "gpt-3.5-turbo", // Maybe change this
    });

    const combinedPromptText = await combinePrompt.format({
      question: userQuestion,
      sql_result: JSON.stringify(executedSqlResult, null, 2),
    });

    // console.log("Combined Prompt Text:", combinedPromptText);

    const combinedResponse: AIMessage = await combinedChain.invoke(
      combinedPromptText
    );

    // console.log("Combined Response:", combinedResponse.content);

    const stringResponse = combinedResponse.content.toString();
    return stringResponse; // fix this
  } catch (error) {
    console.error("Error handling user question:", error);
    throw error;
  } finally {
    // Clean up resources
    //await dataSource.destroy();
    console.log("PostgreSQL Database connection closed.");
    // Assuming Neo4jGraph has a close method; if not, adjust accordingly
    //await neo4jGraph.close();
    console.log("Neo4j Graph connection closed.");
  }
};

// Helper function to format graph relationships
const formatGraphRelationships = (graphResult: any): string => {
  if (!graphResult || !graphResult.result) return "No relationships found.";

  return graphResult.result
    .map((relation: any, index: number) => {
      const from = relation.e1.name;
      const to = relation.e2.name;
      return `${index + 1}. ${from} is related to ${to}`;
    })
    .join("\n");
};
