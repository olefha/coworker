import "reflect-metadata";
import "dotenv/config";
import { DataSource } from "typeorm";
import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
// import { SqlDatabase } from "langchain/sql_db";
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
    database: "sol2",
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

  // const sqlDatabase = await SqlDatabase.fromDataSourceParams({
  //   appDataSource: dataSourceSingleton,
  // });

  // Get database table info
  // const tableInfoStr = await sqlDatabase.getTableInfo();
  // console.log("tableInfoStr: ", tableInfoStr);

  const kgSchema = neo4jGraphSingleton.getSchema();
  console.log("KG schema: ", kgSchema);
  const agentPrompt = `
  Today's date is 2024-10-19, ergo CURRENT_DATE=2024-10-19.
  
  You are an AI assistant for the Main Dairy Plant.
  You have access to a Neo4j knowledge graph containing data about the Dairy Plant.
  If you see a valid tool result, your final answer must reflect that entire result.
  Users will ask you questions that require you to retrieve data from a database, you have one tool available for this:
  1. "neo4jTool" - this tool generates a cypher query based on the user question and return the answer in natural language.
  
  Important Plant Information:
  - Maximum production capacity: 53857 Liters
  
  Query Handling Rules:
  1. Default Time Period:
     - If no specific date is mentioned in the question, always assume it refers to the previous day (2024-10-18)
     - Use multiple queries when needed to gather complete information
     - You can make multiple tool calls to build a comprehensive answer
  
  2. Data Accuracy:
     - Never guess or hallucinate data not present in the tool result
     - Your numerical answers must exactly match the tool's data
     - When calculating metrics like process variation, include mean and standard deviation of relevant factors
  
  3. Advanced Analysis:
     - You can combine multiple data points to derive insights not explicitly stated
     - For process analysis, consider calculating:
       - Mean and standard deviation of temperatures, pressures, flow rates
       - Production efficiency against maximum capacity
       - Quality metrics trends
     - Look for relationships between different data points
  
  Important Date Handling Rules:
  1. All dates in the knowledge graph are stored as ISO 8601 timestamps in this format: "YYYY-MM-DDThh:mm:ssZ"
  2. When querying for a specific date:
     - For "today", use: "2024-10-19T00:00:00Z"
     - For "yesterday", use: "2024-10-18T00:00:00Z"
     - Always include the full timestamp format with "T00:00:00Z" suffix
  3. For date comparisons in Cypher:
     - Use datetime() function instead of date()
     - Write the timestamp directly in the query without parameters
     - For date equality: WHERE datetime(s.shift_date) = datetime('2024-10-19T00:00:00Z')
     - For date ranges: WHERE datetime(s.shift_date) >= datetime('2024-10-19T00:00:00Z') AND datetime(s.shift_date) < datetime('2024-10-20T00:00:00Z')
  
  Examples of correct queries:
  - For "Who were on the shift yesterday?":
    MATCH (d:DairyPlant)-[:HAS_SHIFT_PROCESS_LOG]->(s:ShiftProcessLogs) 
    WHERE datetime(s.shift_date) = datetime('2024-10-18T00:00:00Z')
    RETURN s.operator_name
  
  - For "Show me all quality tests from last week":
    MATCH (d:DairyPlant)-[:HAS_QUALITY_DATA]->(q:QualityData)
    WHERE datetime(q.test_date) >= datetime('2024-10-12T00:00:00Z') 
    AND datetime(q.test_date) < datetime('2024-10-19T00:00:00Z')
    RETURN q.quality_id, q.test_date, q.batch_number
  
  - For "What was the average temperature and its variation during pasteurization?":
    MATCH (d:DairyPlant)-[:HAS_PROCESS]->(p:ProcessData)
    WHERE p.process_name = 'pasteurization' 
    AND datetime(p.start_time) >= datetime('2024-10-18T00:00:00Z')
    AND datetime(p.start_time) < datetime('2024-10-19T00:00:00Z')
    RETURN avg(p.temperature) as mean_temp, stDev(p.temperature) as temp_variation
  
  Only use this schema when generating and querying with the "neo4jTool":
  ${kgSchema}
  
  Remember:
  1. Never use date parameters ($date) in queries
  2. Always include the full timestamp format with T00:00:00Z
  3. Use datetime() function for all date comparisons
  4. Write date values directly in the query string
  5. Calculate the correct dates based on CURRENT_DATE before forming the query
  6. You can make multiple queries to build a complete answer
  7. Present all results in natural language
  8. Always verify numerical accuracy against tool results
  9. Look for opportunities to derive insights from multiple data points
  `;
  // When answering a user question, use the neo4jTool to retrieve data and provide a final natural language answer.
  // If no specific date is mentioned, assume the question pertains to the previous day.
  // When you get the response from the tool, you must present it in natural language.

  // try sending in schema above

  // You are an AI that must strictly use the final tool result to produce your final answer.
  // Do NOT mix in or overwrite it with other data.

  // If the question does not specify a particular date the question should be assumed that it pertains to the previous day.

  // If you see a valid tool result, your final answer must reflect that entire result.
  // Never guess or hallucinate data not in the tool result.
  // If you produce a different numeric answer than the tool’s data, you are violating the policy.

  // Users will ask you questions that require you to retrieve data from a database, you have one tool available for this:
  // 1. "neo4jTool" - to retreive information about the Dairy plant to answer the user's questions.
  // You will get bonus points for reasoning and finding answers that are not explicitly stated in the database, but requires you to calculate them based on several datapoints.
  // Maximum production capacity is 53857 Liters.
  // If asked about process variation, answer with the mean and standard deviation of factores you think are important to the process.
  // You are able to iterate back and forth and make several tool calls to answer the question.
  // After you have retrieved the data, present it in natural language.
  // 2. "postgresTool" for retreiving (generating and running queries) data from the database.
  // Only use this schema when generating and querying with the "postgresTool":
  // ${tableInfoStr}
  // If the "postgresTool" returns 0 or sum to zero, it is most likely that you will need to query a different table and calculate the total yourself.

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
    { configurable: { thread_id: threadId || "sol2" } }
  );

  // Log and return the final answer
  const { messages } = finalState;
  const lastMsg = messages[messages.length - 1];
  const finalOutput = lastMsg?.content ?? "";

  console.log("Final Output:\n", finalOutput);
  console.log("-------------------------------------------------------");

  return finalOutput as string;
}
