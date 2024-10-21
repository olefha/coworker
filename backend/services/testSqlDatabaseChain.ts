/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * This script sets up a SqlDatabaseChain using Ollama's Llama 3.1 model running locally.
 * It uses LangChain for the chain implementation and Axios for HTTP requests.
 *
 * Prerequisites:
 * - Node.js installed
 * - TypeScript installed (`npm install -g typescript`)
 * - Dependencies installed via npm:
 *   npm install langchain axios typeorm
 * - Ollama's Llama 3.1 model downloaded and running locally
 *   - Install Ollama CLI: https://ollama.com/docs/installation
 *   - Pull Llama 3.1 model: `ollama pull llama3.1`
 *   - Serve the model: `ollama serve llama3.1`
 *
 * To compile and run:
 *   tsc testSqlDatabaseChain.ts
 *   node testSqlDatabaseChain.js
 */

import axios from "axios";
import {
  SqlDatabaseChain,
  SqlDatabaseChainInput,
} from "langchain/chains/sql_db";
import { SqlDatabase } from "langchain/sql_db";
import { PromptTemplate } from "@langchain/core/prompts";
import { DataSource } from "typeorm";
import {
  BaseLanguageModel,
  BaseLanguageModelCallOptions,
  BaseLanguageModelInput,
  BaseLanguageModelParams,
} from "@langchain/core/language_models/base";
import { Callbacks } from "@langchain/core/callbacks/manager";
import { BaseMessage } from "@langchain/core/messages";
import { Generation, LLMResult } from "@langchain/core/outputs";
import { BasePromptValueInterface } from "@langchain/core/prompt_values";
import * as dotenv from "dotenv";
dotenv.config();

// Define the structure of the response from Ollama's API
interface OllamaResponse {
  text: string;
  // Add other fields if necessary based on the actual API response
}

/**
 * Custom LLM class to interface with Ollama's Llama 3.1
 * This class extends LangChain's BaseLanguageModel to comply with the expected interface.
 */
class CustomLlamaLLM extends BaseLanguageModel {
  lc_namespace: string[] = [];
  private customLlm: (prompt: string) => Promise<string>;

  constructor(
    customLlm: (prompt: string) => Promise<string>,
    params: BaseLanguageModelParams = {}
  ) {
    super(params || {});
    this.customLlm = customLlm;
  }

  _llmType(): string {
    return "custom_llama";
  }

  async _call(
    prompt: string,
    options?: BaseLanguageModelCallOptions
  ): Promise<string> {
    return this.customLlm(prompt);
  }

  async _generate(
    prompts: string[],
    options?: BaseLanguageModelCallOptions,
    callbacks?: Callbacks
  ): Promise<LLMResult> {
    const generations: Generation[][] = [];

    for (const prompt of prompts) {
      const text = await this.customLlm(prompt);
      generations.push([{ text }]);
    }

    return { generations };
  }

  async generatePrompt(
    promptValues: BasePromptValueInterface[],
    options?: BaseLanguageModelCallOptions | string[] | undefined,
    callbacks?: Callbacks
  ): Promise<LLMResult> {
    const concatenatedPrompt = promptValues
      .map((pv) => pv.toString())
      .join(" ");
    const text = await this.customLlm(concatenatedPrompt);
    return {
      generations: [[{ text }]],
    };
  }

  async predict(
    text: string,
    options?: BaseLanguageModelCallOptions | string[] | undefined,
    callbacks?: Callbacks
  ): Promise<string> {
    return this.customLlm(text);
  }

  async predictMessages(
    messages: BaseMessage[],
    options?: BaseLanguageModelCallOptions | string[] | undefined,
    callbacks?: Callbacks
  ): Promise<any> {
    // const prompt = messages.map((msg) => msg.content).join("\n");
    // const text = await this.customLlm(prompt);
    // return { content: text };
  }

  _modelType(): string {
    return "custom_llama";
  }

  async invoke(
    input: any,
    options?: Partial<BaseLanguageModelCallOptions> | undefined
  ): Promise<any> {
    return this.customLlm(input);
  }
}

/**
 * Custom LLM function to interface with Ollama's Llama 3.1
 * This function sends a prompt to the local Llama 3.1 server and retrieves the response.
 */
const customLlm = async (prompt: string): Promise<string> => {
  try {
    const response = await axios.post<OllamaResponse>(
      "http://localhost:11434/v1/complete",
      {
        model: "llama3.1",
        prompt: prompt,
        // Add other parameters as needed, such as temperature, max_tokens, etc.
      }
    );

    if (response.data && response.data.text) {
      return response.data.text;
    } else {
      throw new Error("Invalid response format from Llama 3.1");
    }
  } catch (error) {
    console.error("Error communicating with Llama 3.1:", error);
    throw error;
  }
};

/**
 * Example SQL prompt template
 * This template defines how prompts are structured when sent to the LLM.
 */
const sqlPrompt = new PromptTemplate({
  inputVariables: ["input", "table_info"],
  template: `Given the following table definitions:
    
    {table_info}
    
    If the input is a question try to translate the following question into a SQL query that works with the given tables:
    
    Question: {input}
    
    SQL Query:`,
});

/**
 * Initialize TypeORM DataSource for PostgreSQL
 * This function sets up the database connection using environment variables.
 */
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

/**
 * Main execution function
 * This async function initializes the database, sets up the SqlDatabaseChain, and runs a test query.
 */
export const handleUserQuestionllama = async (
  userQuestion: string
): Promise<string> => {
  const dataSource = await initializeDataSource();

  try {
    // Initialize the database connection

    // Initialize SQL Database
    const sqlDatabase = await SqlDatabase.fromDataSourceParams({
      appDataSource: dataSource,
      // sampleRowsInTableInfo: 2, // Optional: sample rows for table info
    });

    const tableInfo = await sqlDatabase.getTableInfo();

    // Initialize Custom LLM
    const llamaLLM = new CustomLlamaLLM(customLlm, {
      // Add necessary parameters for BaseLanguageModelParams
      // For example:
      // temperature: 0.7,
      // maxTokens: 100,
    });

    // // Configuration for SqlDatabaseChain
    // const sqlChainConfig: SqlDatabaseChainInput = {
    //   llm: llamaLLM, // Pass the custom LLM instance
    //   database: sqlDatabase, // Ensure this is a SqlDatabase instance, not a Promise
    //   prompt: sqlPrompt,
    //   sqlOutputKey: "sql_answer",
    // };

    // Initialize the SqlDatabaseChain
    const sqlChain: SqlDatabaseChain = new SqlDatabaseChain({
      llm: llamaLLM,
      database: sqlDatabase,
      prompt: sqlPrompt,
      sqlOutputKey: "sql_answer",
    });

    const result = await sqlChain.invoke({
      query: userQuestion,
      tableInfo: tableInfo,
    });
    console.log("Response from SqlDatabaseChain:", result);

    const generatedSql = result.sql_answer;
    console.log("Generated SQL query:", generatedSql);

    const executedSqlResult = await dataSource.query(generatedSql);
    console.log("SQL query result: ", executedSqlResult);

    /**
     * Function to run a test query
     * This function sends a prompt to the SqlDatabaseChain and logs the generated SQL query.
     */
    // const runTestQuery = async () => {
    //   const testPrompt =
    //     "Write a SQL query to select all rows from the users table.";

    //   try {
    //     const response = await sqlChain.invoke({ query: testPrompt });
    //     console.log("Response from SqlDatabaseChain:", response);
    //   } catch (error) {
    //     console.error("Error running test query:", error);
    //   }
    // };

    // // Execute the test query
    // await runTestQuery();

    // Optionally, close the database connection after use
    const stringResponse = executedSqlResult.content.toString();

    return stringResponse; // fix this
  } catch (error) {
    console.error("Unexpected error:", error);
    return "faaaaailed";
  }
};
