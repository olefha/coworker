import { ChatOpenAI } from "@langchain/openai";
import { createSqlQueryChain } from "langchain/chains/sql_db";
import { SqlDatabase } from "langchain/sql_db";
import { DataSource } from "typeorm";
import { QuerySqlTool } from "langchain/tools/sql";
import "reflect-metadata"; // Required by TypeORM
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

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

  await dataSource.initialize();

  // Create SqlDatabase instance
  const db = await SqlDatabase.fromDataSourceParams({
    appDataSource: dataSource,
  });

  // Initialize LLM
  const llm = new ChatOpenAI({
    modelName: "gpt-4",
    temperature: 0,
    openAIApiKey: process.env.OPENAI_API_KEY!,
  });

  // Create Query Execution Tool
  const executeQuery = new QuerySqlTool(db);

  // Create SQL Query Chain
  const writeQuery = await createSqlQueryChain({
    llm,
    db,
    dialect: "postgres",
  });

  // Combine Chains
  const chain = writeQuery.pipe(executeQuery);

  // Invoke Chain with a Question
  const response = await chain.invoke({
    question: "How many batches were processed in the last 24 hours?",
  });
  console.log(response);
})();
