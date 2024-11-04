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
// import { ChatOllama, Ollama } from "@langchain/ollama";
// import { createSQLChain } from "./sqlChainService";
// Initialize LLMs
const openAIApiKey = process.env.OPENAI_API_KEY;

const llm = new ChatOpenAI({
  openAIApiKey: openAIApiKey,
  temperature: 0,
  modelName: "gpt-3.5-turbo",
});

// const ollama = new ChatOllama({
//   model: "llama3.1",
// });

// Define your custom prompt for SQL
const sqlPrompt = new PromptTemplate({
  inputVariables: ["input", "table_info"],
  template: `Given the following table definitions:
  
  {table_info}
  
  If the input is a question try to translate the following question into a SQL query that works with the given tables:
  
  Question: {input}
  
  SQL Query:`,
});

const graphPrompt = new PromptTemplate({
  inputVariables: ["question"],
  template: `You are an expert in process analysis using graph data. Given a Neo4j graph database that includes data about relationships in a processing plan, traverse the graph to find relevante nodes and generate a Cypher query to retrieve the value needed to answer the following question:
  
  Question: {question}
  
  Cypher Query:`,
});

// Define a prompt for combining results (third LLM)
const combinePrompt = new PromptTemplate({
  inputVariables: [
    "question",
    "sql_result",
    "graph_result",
    // "total_production",
  ],
  template: `As an expert data analyst, use the data provided to answer the user's question.

  SQL Query Results:
  {sql_result}

  Graph Query Results:
  {graph_result}

Instructions:
- Do not hallucinate or provide false information.
- The provided SQL query and graph query results are accurate.
- Provide a clear and concise answer, explaining your reasoning.

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

  try {
    // Initialize SQL Database
    const sqlDatabase = await SqlDatabase.fromDataSourceParams({
      appDataSource: dataSource,
      //   sampleRowsInTableInfo: 2,
    });

    const tableInfo = await sqlDatabase.getTableInfo();

    // Initialize SQL Chain
    const sqlChain: SqlDatabaseChain = new SqlDatabaseChain({
      llm,
      database: sqlDatabase,
      prompt: sqlPrompt,
      sqlOutputKey: "sql_answer",
    });

    // Generate SQL Query
    const sqlResult = await sqlChain.invoke({
      query: userQuestion,
      table_info: tableInfo,
    });
    const generatedSql = sqlResult.sql_answer;
    console.log("Generated SQL Query:", generatedSql);

    // Execute Query
    const executedSqlResult = await dataSource.query(generatedSql);
    console.log("SQL Query Result:", executedSqlResult);

    // Initialize Graph Chain
    const graphChain = GraphCypherQAChain.fromLLM({
      llm,
      graph: neo4jGraph,
      returnDirect: true,
      qaPrompt: graphPrompt, // remove or change this
    });

    // Generate and Execute Cypher Query
    const graphResult = await graphChain.invoke({ question: userQuestion });
    console.log("Graph Query Result:", graphResult);
    console.log("Graph Query Result:", graphResult.result);

    // Combine Results Using Third LLM
    const combinedChain = new ChatOpenAI({
      openAIApiKey: openAIApiKey,
      temperature: 0,
      modelName: "gpt-3.5-turbo", // Maybe change this
    });

    // const totalProduction = executedSqlResult[0]?.total_production || 0;

    const combinedPromptText = await combinePrompt.format({
      question: userQuestion,
      sql_result: JSON.stringify(executedSqlResult, null, 2),
      graph_result: JSON.stringify(graphResult, null, 2),
      // total_production: totalProduction,
    });

    console.log("Combined Prompt Text:", combinedPromptText);

    const combinedResponse: AIMessage = await combinedChain.invoke(
      combinedPromptText
    );

    console.log("Combined Response:", combinedResponse.content);

    const stringResponse = combinedResponse.content.toString();
    // const sqlStringResponse = JSON.stringify(executedSqlResult, null, 2);

    return stringResponse; // fix this
    // return sqlStringResponse;
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
