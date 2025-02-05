import "reflect-metadata";
import "dotenv/config";
import { DataSource } from "typeorm";
import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
import { SqlDatabase } from "langchain/sql_db";
import { createGraph } from "./graphSetup";
import { HumanMessage } from "@langchain/core/messages";

// Initialize Postgresql Data Source
async function initializeDataSource(): Promise<DataSource> {
  const dataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT!),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [],
    synchronize: false,
    logging: false,
  });
  await dataSource.initialize();
  console.log("PostgreSQL Database connected successfully.");
  return dataSource;
}

// Initialize Neo4j Graph
async function initializeNeo4jGraph(): Promise<Neo4jGraph> {
  const neo4jUrl = process.env.NEO4J_URI;
  const neo4jUsername = process.env.NEO4J_USERNAME;
  const neo4jPassword = process.env.NEO4J_PASSWORD;

  const neo4jGraph = await Neo4jGraph.initialize({
    url: neo4jUrl!,
    username: neo4jUsername!,
    password: neo4jPassword!,
    database: "sol1",
  });

  console.log("Neo4j Graph initialized successfully.");
  return neo4jGraph;
}

let dataSourceSingleton: DataSource | null = null;
let neo4jGraphSingleton: Neo4jGraph | null = null;
let handleQuestionGraph: ReturnType<typeof createGraph> | null = null;

export async function initializeAll() {
  // If already initialized, skip
  if (dataSourceSingleton && neo4jGraphSingleton && handleQuestionGraph) {
    return;
  }

  dataSourceSingleton = await initializeDataSource();
  neo4jGraphSingleton = await initializeNeo4jGraph();

  const sqlDatabase = await SqlDatabase.fromDataSourceParams({
    appDataSource: dataSourceSingleton,
  });

  // Get database table info
  const tableInfoStr = await sqlDatabase.getTableInfo();
  // console.log("tableInfoStr: ", tableInfoStr);

  const agentPrompt = `
  Today's date is 2024-10-19, ergo CURRENT_DATE=2024-10-19.

  You are an AI that must strictly use the final tool result to produce your final answer. 
  Do NOT mix in or overwrite it with other data. 

  If the question does not specify a particular date the question should be assumed that it pertains to the previous day.

  If you see a valid tool result, your final answer must reflect that entire result. 
  Never guess or hallucinate data not in the tool result.
  If you produce a different numeric answer than the tool’s data, you are violating the policy.

  Users will ask you questions that require you to retrieve data from a database, you have two tools available for this:
  1. "neo4jTool" for retreiving relationship/structural info from the Neo4j graph. Use this to strengthen your knowledge of how the data is structured in the postgres database.
  2. "postgresTool" for retreiving (generating and running queries) data from the database.
  Only use this schema when generating and querying with the "postgresTool":
  ${tableInfoStr}
  If the "postgresTool" returns 0 or sum to zero, it is most likely that you will need to query a different table and calculate the total yourself. 
  You will get bonus points for reasoning and finding answers that are not explicitly stated in the database, but requires you to calculate them based on several datapoints. 
  Maximum production capacity is 53857 Liters. 
  If asked about process variation, answer with the mean and standard deviation of factores you think are important to the process. 
  You are able to iterate back and forth and make several tool calls to answer the question. 
  After you have retrieved the data, present it in natural language.
  `;

  const openAIApiKey = process.env.OPENAI_API_KEY!;

  // Create Graph
  handleQuestionGraph = createGraph(
    neo4jGraphSingleton,
    dataSourceSingleton,
    agentPrompt,
    openAIApiKey
  );
}

// The main function the frontend invokes
export async function handleUserQuestion(
  userQuestion: string,
  threadId?: string // For eval purposes now, but can be used to create multiple message "boxes"
): Promise<string> {
  await initializeAll();

  console.log("User Question:", userQuestion);
  console.log("-------------------------------------------------------");

  if (!handleQuestionGraph) {
    throw new Error("Graph not initialized");
  }

  // Invoking the stateGraph with the user question
  const finalState = await (
    await handleQuestionGraph
  ).invoke(
    {
      messages: [new HumanMessage(userQuestion)],
    },
    { configurable: { thread_id: threadId || "test" } }
  );

  // Log and return the final answer
  const { messages } = finalState;
  const lastMsg = messages[messages.length - 1];
  const finalOutput = lastMsg?.content ?? "";

  console.log("Final Output:\n", finalOutput);
  console.log("-------------------------------------------------------");

  return finalOutput as string;
}
