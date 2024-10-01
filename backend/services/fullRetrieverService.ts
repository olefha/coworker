// //services/fullRetrieverService.ts
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

// Define your custom prompt for SQL
const sqlPrompt = new PromptTemplate({
  inputVariables: ["input", "table_info"],
  template: `Given the following table definitions:
  
  {table_info}
  
  If the input is a question try to translate the following question into a SQL query that works with the given tables:
  
  Question: {input}
  
  SQL Query:`,
});

// Define a prompt for combining results (third LLM)
const combinePrompt = new PromptTemplate({
  inputVariables: ["question", "sql_result", "graph_result"],
  template: `You are an assistant that combines information from multiple sources.

User Question: {question}

SQL Query Result: {sql_result}

Graph Query Result: {graph_result}

Provide a comprehensive and coherent answer based on the above information.`,
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
    // const tableInfo = await sqlDatabase.getTableInfo();
    const sqlResult = await sqlChain.invoke({
      query: userQuestion,
      table_info: tableInfo,
    });
    const generatedSql = sqlResult.sql_answer;
    console.log("Generated SQL Query:", generatedSql);

    // Execute SQL Query
    const executedSqlResult = await dataSource.query(generatedSql);
    console.log("SQL Query Result:", executedSqlResult);

    // Initialize Graph Chain
    const graphChain = GraphCypherQAChain.fromLLM({
      llm,
      graph: neo4jGraph,
      returnDirect: true,
    });

    // Generate and Execute Cypher Query
    const graphResult = await graphChain.invoke({ question: userQuestion });
    console.log("Graph Query Result:", graphResult);

    // Combine Results Using Third LLM
    const combinedChain = new ChatOpenAI({
      openAIApiKey: openAIApiKey,
      temperature: 0,
      modelName: "gpt-3.5-turbo", // Maybe change this
    });

    const combinedPrompt = await combinePrompt.format({
      question: userQuestion,
      sql_result: JSON.stringify(executedSqlResult, null, 2),
      graph_result: JSON.stringify(graphResult, null, 2),
    });

    const combinedResponse: AIMessage = await combinedChain.invoke(
      combinedPrompt
    );
    console.log("Combined Response:", combinedResponse); // .text is deprecated

    console.log("Combined Response:", combinedResponse.content);
    console.log("Combined Response typeof:", typeof combinedResponse.content);

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

// import { SqlDatabase } from "langchain/sql_db";
// import { DataSource } from "typeorm";
// import "reflect-metadata"; // Required by TypeORM
// import "dotenv/config";
// import { PromptTemplate } from "@langchain/core/prompts";
// import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
// import { GraphCypherQAChain } from "@langchain/community/chains/graph_qa/cypher";
// import { SqlDatabaseChain } from "langchain/chains/sql_db";
// import { ChatOpenAI } from "@langchain/openai";
// import {} from "typeorm";

// const openAIApiKey = process.env.OPENAI_API_KEY;

// const llm = new ChatOpenAI({
//   openAIApiKey: openAIApiKey,
//   temperature: 0,
//   modelName: "gpt-3.5-turbo",
// });

// // Define your custom prompt
// const sqlPrompt = new PromptTemplate({
//   inputVariables: ["input"],
//   template: `Translate the following question into an SQL query:

// Question: {input}

// SQL Query:`,
// });

// // Function to initialize and execute SQL Chain
// const executeSqlChain = async (dataSource: DataSource) => {
//   try {
//     // Initialize the SQL Database Chain without returnDirect
//     const sqlDatabase = await SqlDatabase.fromDataSourceParams({
//       appDataSource: dataSource,
//     });

//     const sqlChain: SqlDatabaseChain = new SqlDatabaseChain({
//       llm,
//       database: sqlDatabase,
//       prompt: sqlPrompt,
//       sqlOutputKey: "sql_answer",
//     });

//     // Example question
//     const question = "How many rows are there under process data?";
//     const sqlResult = await sqlChain.invoke({ query: question });
//     console.log("Generated SQL Query:", sqlResult.sql_answer);

//     // Execute the generated SQL query using TypeORM
//     const executedResult = await dataSource.query(sqlResult.sql_answer);
//     console.log("SQL Query Result:", executedResult);
//   } catch (error) {
//     console.error("Error executing SQL Chain:", error);
//   }
// };

// // Function to initialize and execute Neo4j Graph Chain
// const executeGraphChain = async () => {
//   try {
//     const neo4jUrl = process.env.NEO4J_URI;
//     const neo4jUsername = process.env.NEO4J_USERNAME;
//     const neo4jPassword = process.env.NEO4J_PASSWORD;

//     const neo4jGraph = await Neo4jGraph.initialize({
//       url: neo4jUrl!,
//       username: neo4jUsername!,
//       password: neo4jPassword!,
//     });

//     const graphChain = GraphCypherQAChain.fromLLM({
//       llm,
//       graph: neo4jGraph,
//       returnDirect: true,
//     });

//     const question =
//       "What is the relationship between process data and batches?";
//     const graphResult = await graphChain.invoke({ question });
//     console.log("Graph Answer:", JSON.stringify(graphResult, null, 2));
//     // Alternatively: console.dir(graphResult, { depth: null });
//   } catch (error) {
//     console.error("Error executing Graph Chain:", error);
//   }
// };

// // Main Execution Function
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

//   try {
//     await dataSource.initialize();
//     console.log("Database connected successfully.");

//     // Execute SQL Chain
//     await executeSqlChain(dataSource);

//     // Execute Graph Chain
//     await executeGraphChain();
//   } catch (error) {
//     console.error("Error during initialization or execution:", error);
//   } finally {
//     await dataSource.destroy();
//     console.log("Database connection closed.");
//   }
// })();

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
