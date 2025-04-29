import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { DataSource } from "typeorm";
import { ChatOpenAI } from "@langchain/openai";
import { SqlDatabase } from "langchain/sql_db";
import { SqlDatabaseChain } from "langchain/chains/sql_db";

/**
 * Creates a function-calling Tool for postgres queries.
 *
 * @param dataSource   An initialized datasource instance
 * @param openAIApiKey OpenAI API Key
 * @returns A LangChain tool(...) object
 */
export async function createPostgresTool(
  dataSource: DataSource,
  openAIApiKey: string,
  maxRetries = 3
) {
  const sqlLLM = new ChatOpenAI({
    openAIApiKey,
    temperature: 0,
    modelName: "gpt-3.5-turbo",
  });

  // Initialize DB
  const sqlDatabase = await SqlDatabase.fromDataSourceParams({
    appDataSource: dataSource,
  });

  // Create the chain
  const sqlChain = new SqlDatabaseChain({
    llm: sqlLLM,
    database: sqlDatabase,
    // prompt: sqlPrompt, for custom chain prompt
    sqlOutputKey: "sql_answer",
  });

  // Retry wrapper
  async function runWithRetries(query: string) {
    let attempts = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lastError: any;
    while (attempts < maxRetries) {
      try {
        // console.log("PostgresTool Invoked: ---------------");
        const result = await sqlChain.invoke({ query });
        // console.log("ToolResult: ", result.result);
        return result.result;
      } catch (err) {
        // console.log("PostgresTool Retried");
        lastError = err;
        attempts++;
      }
    }
    throw lastError;
  }

  // Create and return the tool
  const postgresTool = tool(
    async ({ query }: { query: string }) => {
      return await runWithRetries(query);
    },
    {
      name: "postgresTool",
      description: `
        Use this tool to send a valid SQL statement to the Postgres DB. 
        Rules:
        - **No** explanations or commentary.
        - **Do not** wrap the SQL in backticks or code fences.
        - Provide exactly one SQL statement in the "query" field.
      `,
      schema: z.object({
        query: z
          .string()
          .describe(
            "A single, valid SQL statement. No commentary. No markdown."
          ),
      }),
    }
  );

  return postgresTool;
}
