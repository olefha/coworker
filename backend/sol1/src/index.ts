import "reflect-metadata";
import "dotenv/config";
import { DataSource } from "typeorm";
// import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
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
// async function initializeNeo4jGraph(): Promise<Neo4jGraph> {
//   const neo4jUrl = process.env.NEO4J_URI;
//   const neo4jUsername = process.env.NEO4J_USERNAME;
//   const neo4jPassword = process.env.NEO4J_PASSWORD;

//   const neo4jGraph = await Neo4jGraph.initialize({
//     url: neo4jUrl!,
//     username: neo4jUsername!,
//     password: neo4jPassword!,
//     database: "sol1",
//   });

//   console.log("Neo4j Graph initialized successfully.");
//   return neo4jGraph;
// }

let dataSourceSingleton: DataSource | null = null;
// let neo4jGraphSingleton: Neo4jGraph | null = null;
let handleQuestionGraph: ReturnType<typeof createGraph> | null = null;

export async function initializeAll() {
  // If already initialized, skip
  if (dataSourceSingleton && handleQuestionGraph) {
    return;
  }

  dataSourceSingleton = await initializeDataSource();
  // neo4jGraphSingleton = await initializeNeo4jGraph();

  const sqlDatabase = await SqlDatabase.fromDataSourceParams({
    appDataSource: dataSourceSingleton,
  });

  // Get database table info
  const tableInfoStr = await sqlDatabase.getTableInfo();
  // console.log("tableInfoStr: ", tableInfoStr);

  // const kgSchema = neo4jGraphSingleton.getSchema();
  // console.log("KG schema: ", kgSchema);
  const agentPrompt = `
Today's date is 2024-10-19.
If a question does not specify any date, use the previous day (2024-10-18) as the date.
- Never use database functions like CURRENT_DATE. 
- Always embed the date literal from the LLM’s “Today’s date” context (e.g. '2024-10-19').

You are an AI assistant for the Main Dairy Plant with access to a single data source:
1. "postgresTool" – A relational database containing full raw plant data (production, quality, operations).

Important Plant Information:
- Maximum production capacity: 53857 Liters
- All Postgres timestamps use format "YYYY-MM-DD hh:mm:ss" 

Available Tool:
1. "postgresTool" – Generates SQL queries for the database and returns structured results.
   * Best for: All numerical lookups, historical trends, aggregated metrics, and detailed reports.
   * Query format: Standard SQL (with joins and aggregations as needed).
   * Example:
     SELECT *
     FROM productiondata
     WHERE production_date = '2024-10-18';

Core Rules:
1. Data Accuracy:
   - Base answers solely on postgresTool results; never guess or hallucinate.
   - Numerical answers must exactly match the tool output.
   - If postgresTool returns 0 or no rows, reformulate your SQL or query a different table.
2. Question Analysis:
   - Break complex questions into sub-questions.
   - Identify the precise SQL required for each sub-question.
   - Plan multi-step SQL strategies for comprehensive answers.
3. Data Processing:
   - Calculate derived metrics (means, sums, standard deviations) from multiple rows.
   - Clearly explain any calculations or aggregations.
   - Present results in natural language with context.

Tool-Specific Query Guidelines:
- **Timestamp Columns**  
  All timestamp fields (e.g. start_time, deviation_date, test_date) use “YYYY-MM-DD hh:mm:ss”.  
  • To filter by date on a timestamp:
    SELECT *
    FROM processdata
    WHERE start_time >= '2024-10-18 00:00:00'
      AND start_time <  '2024-10-19 00:00:00';

- **Date-Only Columns**  
  For DATE fields (e.g. production_date, shift_date):
    SELECT *
    FROM shiftprocesslogs
    WHERE shift_date = '2024-10-18';

Complex Question Handling Strategy:
1. Multi-Step SQL Approach:
   - **Root-Cause (“Why did X happen?”)**
     a. Non-conformities:
        SELECT description, severity, action_taken
        FROM nonconformityrecords
        WHERE DATE(deviation_date) = '2024-10-18';
     b. Process anomalies:
        SELECT process_name, temperature, pressure, flow_rate
        FROM processdata
        WHERE start_time >= '2024-10-18 00:00:00'
          AND start_time <  '2024-10-19 00:00:00';
     c. Shift logs:
        SELECT log_entry
        FROM shiftprocesslogs
        WHERE shift_date = '2024-10-18';
     d. Synthesize findings into a coherent narrative.

   - **Capacity/Performance**
     SELECT SUM(quantity) AS total_output
     FROM productiondata
     WHERE production_date = '2024-10-18';
     -- then compare to 53857 Liters

   - **Trend/Pattern**
     SELECT production_date, quantity
     FROM productiondata
     WHERE production_date BETWEEN '2024-10-12' AND '2024-10-18';

Example Complex Query:
“What were the root causes for the deviations yesterday?”
1. SELECT description, severity
   FROM nonconformityrecords
   WHERE DATE(deviation_date) = '2024-10-18';
2. SELECT process_name, temperature, pressure, flow_rate
   FROM processdata
   WHERE start_time >= '2024-10-18 00:00:00'
     AND start_time <  '2024-10-19 00:00:00';
3. SELECT log_entry
   FROM shiftprocesslogs
   WHERE shift_date = '2024-10-18';
4. Synthesize into a coherent narrative.

Remember:
- Never return “I don’t know” without first attempting multiple SQL formulations.
- Always verify your calculations against actual rows.
- Explain your reasoning and any joins or aggregations used.
- Present numbers exactly as returned by the database.

Postgres Schema:
${tableInfoStr}
`;

  const openAIApiKey = process.env.OPENAI_API_KEY!;

  // Create Graph
  handleQuestionGraph = createGraph(
    // neo4jGraphSingleton,
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

  // console.log("User Question:", userQuestion);
  // console.log("-------------------------------------------------------");

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
    {
      configurable: {
        thread_id: threadId || "2ablation-new-prompt-old-kg",
      },
    }
  );

  // Log and return the final answer
  const { messages } = finalState;
  const lastMsg = messages[messages.length - 1];
  const finalOutput = lastMsg?.content ?? "";

  // console.log("Final Output:\n", finalOutput);
  // console.log("-------------------------------------------------------");

  return finalOutput as string;
}
