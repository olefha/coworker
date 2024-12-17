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

// This is unique in order to test different models for graph relatec tasks
const graphLLM = new ChatOpenAI({
  openAIApiKey: openAIApiKey,
  temperature: 0,
  modelName: "gpt-3.5-turbo",
});

// maybe add this: 1. You have access to a knowledge graph of a processing dairy plant, containing information about Entities with attributes and relationships to other Entities use this.

const combinePrompt = new PromptTemplate({
  inputVariables: ["question", "sql_result"],
  template: `
  Todays date is 2024-10-19.

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

interface ChatHistoryEntry {
  question: string;
  response: string;
}

// Initialize chat history array
const chatHistory: ChatHistoryEntry[] = [];

// Function to add an entry to the chat history
const addToChatHistory = (question: string, response: string) => {
  chatHistory.push({ question, response });
};

// Function to get the chat history
export const getChatHistory = (): ChatHistoryEntry[] => {
  return chatHistory;
};

// Function to format chat history for inclusion in prompts
const formatChatHistory = (history: ChatHistoryEntry[]): string => {
  return history
    .map(
      (entry, index) =>
        `Q${index + 1}: ${entry.question}\nA${index + 1}: ${entry.response}`
    )
    .join("\n\n");
};

// Handle User Question
export const handleUserQuestion = async (
  userQuestion: string
): Promise<string> => {
  // Initialize Data Sources
  const dataSource = await initializeDataSource();
  const neo4jGraph = await initializeNeo4jGraph();
  console.log("User Question: ", userQuestion);
  console.log("-------------------------------------------------------");

  const chatHistoryContext = formatChatHistory(chatHistory);

  const graphPrompt = new PromptTemplate({
    inputVariables: ["question"],
    template: `
  Todays date is 2024-10-19.

  **Chat History**:
  ${chatHistoryContext}
    
  **User Question**: 
  ${userQuestion}
  
  **Instructions**:
  1. Only use the Chat History if it is relevant for the question, sometimes it is not.
  2. Analyze the user question to identify key entities with their respective attributes and relationships between these entities.
  3. Return every piece of relevant information you can from the knowledge graph. 
  
  Answer: 
  `,
  });

  try {
    // Graph info retrieval
    const graphChain = await GraphCypherQAChain.fromLLM({
      llm: graphLLM,
      graph: neo4jGraph,
      returnDirect: false,
      qaPrompt: graphPrompt,
    });

    //Generate and Execute Cypher Query
    const graphResult = await graphChain.invoke({ question: userQuestion });

    // TODO: maybe access the graphResult.result list of objects to find info
    console.log("Graph Query Result: \n", graphResult.result);
    console.log("-------------------------------------------------------");

    //SQL Database
    const sqlDatabase = await SqlDatabase.fromDataSourceParams({
      appDataSource: dataSource,
    });

    const tableInfo = await sqlDatabase.getTableInfo();

    const sqlPrompt = new PromptTemplate({
      inputVariables: ["input", "table_info"],
      template: `
  Todays date is 2024-10-19.

  You are an expert SQL query generator with full access to the database schema and a static knowledge graph that describes relationships between entities. 
  Use this background information to create a precise SQL query based on the user’s question.

  **Chat History**:
  ${chatHistoryContext}

  **User Question:**
  {input}

  **Only use the following tables:**
  {table_info}

  **Knowledge Graph Relationships**:
  - These are the known relationships that can guide you in constructing SQL joins and selecting fields:
  ${graphResult.result}

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
      query: `${chatHistoryContext}\n\nCurrent Question: ${userQuestion}`,
      table_info: tableInfo,
    });
    let generatedSql = sqlResult.sql_answer;

    // Define Markdown SQL code block delimiters
    const startDelimiter = "```sql";
    const endDelimiter = "```";

    // Function to extract SQL from Markdown code block
    function extractSql(markdown: string): string {
      const startIndex = markdown.indexOf(startDelimiter);
      const endIndex = markdown.lastIndexOf(endDelimiter);

      if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        // Extract the content between the delimiters
        return markdown
          .substring(startIndex + startDelimiter.length, endIndex)
          .trim();
      } else {
        // If no delimiters are found, return the original string
        return markdown.trim();
      }
    }

    // Extract the pure SQL query
    generatedSql = extractSql(generatedSql);

    console.log("Generated SQL Query: \n", generatedSql);
    console.log("-------------------------------------------------------");

    // Execute Query
    const executedSqlResult = await dataSource.query(generatedSql);
    console.log("SQL Query Result: \n", executedSqlResult);
    console.log("-------------------------------------------------------");

    // Combine Results Using Third LLM
    const combinedChain = new ChatOpenAI({
      openAIApiKey: openAIApiKey,
      temperature: 0,
      modelName: "gpt-3.5-turbo",
    });

    const combinedPromptText = await combinePrompt.format({
      question: `${chatHistoryContext}\n\nCurrent Question: ${userQuestion}`,
      sql_result: JSON.stringify(executedSqlResult, null, 2),
    });

    const combinedResponse: AIMessage = await combinedChain.invoke(
      combinedPromptText
    );

    const stringResponse = combinedResponse.content.toString();
    console.log("Combined response: \n", stringResponse);
    console.log("-------------------------------------------------------");
    addToChatHistory(userQuestion, stringResponse);
    return stringResponse;
  } catch (error) {
    console.error("Error handling user question:", error);
    throw error;
  } finally {
    // Clean up resources
    //await dataSource.destroy();
    console.log("PostgreSQL Database connection closed.");
    //await neo4jGraph.close();
    console.log("Neo4j Graph connection closed.");
  }
};
