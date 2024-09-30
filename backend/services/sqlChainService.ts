import { ChatOpenAI } from "@langchain/openai";
import { createSqlQueryChain } from "langchain/chains/sql_db";
import { SqlDatabase } from "langchain/sql_db";
import { DataSource } from "typeorm";
import { QuerySqlTool } from "langchain/tools/sql";
import "reflect-metadata";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const createSQLChain = async (modelName: string = "gpt-4") => {
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
    modelName,
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

  return chain;
};
