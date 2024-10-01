// //services/fullRetrieverService.ts
import { SqlDatabase } from "langchain/sql_db";
import { DataSource } from "typeorm";
import "reflect-metadata"; // Required by TypeORM
import "dotenv/config";
import { PromptTemplate } from "@langchain/core/prompts";
import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
import { GraphCypherQAChain } from "@langchain/community/chains/graph_qa/cypher";
import { SqlDatabaseChain } from "langchain/chains/sql_db";
import { ChatOpenAI } from "@langchain/openai";
import {} from "typeorm";

const openAIApiKey = process.env.OPENAI_API_KEY;

const llm = new ChatOpenAI({
  openAIApiKey: openAIApiKey,
  temperature: 0,
  modelName: "gpt-3.5-turbo",
});

// Define your custom prompt
const sqlPrompt = new PromptTemplate({
  inputVariables: ["input"],
  template: `Translate the following question into an SQL query:

Question: {input}

SQL Query:`,
});

// Function to initialize and execute SQL Chain
const executeSqlChain = async (dataSource: DataSource) => {
  try {
    // Initialize the SQL Database Chain without returnDirect
    const sqlDatabase = await SqlDatabase.fromDataSourceParams({
      appDataSource: dataSource,
    });

    const sqlChain: SqlDatabaseChain = new SqlDatabaseChain({
      llm,
      database: sqlDatabase,
      prompt: sqlPrompt,
      sqlOutputKey: "sql_answer",
    });

    // Example question
    const question = "How many rows are there under process data?";
    const sqlResult = await sqlChain.invoke({ query: question });
    console.log("Generated SQL Query:", sqlResult.sql_answer);

    // Execute the generated SQL query using TypeORM
    const executedResult = await dataSource.query(sqlResult.sql_answer);
    console.log("SQL Query Result:", executedResult);
  } catch (error) {
    console.error("Error executing SQL Chain:", error);
  }
};

// Function to initialize and execute Neo4j Graph Chain
const executeGraphChain = async () => {
  try {
    const neo4jUrl = process.env.NEO4J_URI;
    const neo4jUsername = process.env.NEO4J_USERNAME;
    const neo4jPassword = process.env.NEO4J_PASSWORD;

    const neo4jGraph = await Neo4jGraph.initialize({
      url: neo4jUrl!,
      username: neo4jUsername!,
      password: neo4jPassword!,
    });

    const graphChain = GraphCypherQAChain.fromLLM({
      llm,
      graph: neo4jGraph,
      returnDirect: true,
    });

    const question =
      "What is the relationship between process data and batches?";
    const graphResult = await graphChain.invoke({ question });
    console.log("Graph Answer:", JSON.stringify(graphResult, null, 2));
    // Alternatively: console.dir(graphResult, { depth: null });
  } catch (error) {
    console.error("Error executing Graph Chain:", error);
  }
};

// Main Execution Function
(async () => {
  // Initialize Data Source
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

  try {
    await dataSource.initialize();
    console.log("Database connected successfully.");

    // Execute SQL Chain
    await executeSqlChain(dataSource);

    // Execute Graph Chain
    await executeGraphChain();
  } catch (error) {
    console.error("Error during initialization or execution:", error);
  } finally {
    await dataSource.destroy();
    console.log("Database connection closed.");
  }
})();

// (async () => {
//   // Initialize Data Source
//   const dataSource = new DataSource({
//     type: "postgres",
//     host: process.env.DB_HOST!,
//     port: Number(process.env.DB_PORT!),
//     username: process.env.DB_USER!,
//     password: process.env.DB_PASSWORD!,
//     database: process.env.DB_NAME!,
//     entities: [],
//     synchronize: false,
//     logging: false,
//   });

//   await dataSource.initialize();

//   // Create SqlDatabase instance
//   const db = await SqlDatabase.fromDataSourceParams({
//     appDataSource: dataSource,
//   });

//   // Initialize LLM
//   const llm = new ChatOpenAI({
//     modelName: "gpt-4",
//     temperature: 0,
//     openAIApiKey: process.env.OPENAI_API_KEY!,
//   });

//   // Create Query Execution Tool
//   const executeQuery = new QuerySqlTool(db);

//   // Create SQL Query Chain
//   const writeQuery = await createSqlQueryChain({
//     llm,
//     db,
//     dialect: "postgres",
//   });

//   // Combine Chains
//   const chain = writeQuery.pipe(executeQuery);

//   // Invoke Chain with a Question
//   const response = await chain.invoke({
//     question: "How many batches were processed in the last 24 hours?",
//   });
//   console.log(response);
// })();
