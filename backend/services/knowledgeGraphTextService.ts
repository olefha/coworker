import "dotenv/config";
import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
//import { IMSDBLoader } from 'langchain/document_loaders/web/imsdb';
import { TokenTextSplitter } from "langchain/text_splitter";
import { ChatOpenAI } from "@langchain/openai";
import { LLMGraphTransformer } from "@langchain/community/experimental/graph_transformers/llm";
import { Document } from "@langchain/core/documents";
import path from "path";
import fs from "fs/promises";

export async function populateGraph() {
  // Load environment variables
  const url = process.env.NEO4J_URI;
  const username = process.env.NEO4J_USERNAME;
  const password = process.env.NEO4J_PASSWORD;
  const openAIApiKey = process.env.OPENAI_API_KEY;
  const modelName = "gpt-4o";

  if (!url || !username || !password || !openAIApiKey) {
    throw new Error("Missing necessary environment variables.");
  }

  // Initialize the LLM
  const llm = new ChatOpenAI({
    temperature: 0,
    modelName,
    openAIApiKey,
  });

  // Initialize the Neo4j Graph
  const graph = await Neo4jGraph.initialize({
    url,
    username,
    password,
    database: "baseline",
  });

  // Initialize the IMSDB Loader with the target URL
  const filePath = path.resolve(
    __dirname,
    "/Users/ole/code/Master/coworker/backend/All_CSV_data/baseline-kg-description.txt"
  );
  const fileContent = await fs.readFile(filePath, "utf-8");

  const instructions = `
  You are an AI assistant tasked with converting a structured database schema description into a knowledge graph. 
  Identify entities, their attributes, and the relationships between them. 
  Use descriptive labels for nodes and clearly define the connections between entities.
  `;

  const rawDocs = [
    new Document({
      pageContent: instructions + "\n\n" + fileContent,
      metadata: { source: filePath },
    }),
  ];

  // Define chunking strategy
  const textSplitter = new TokenTextSplitter({
    chunkSize: 256,
    chunkOverlap: 24,
  });

  const documents: Document[] = [];

  for (let i = 0; i < rawDocs.length; i++) {
    const chunks = await textSplitter.splitText(rawDocs[i].pageContent);
    const processedDocs = chunks.map(
      (chunk, index) =>
        new Document({
          pageContent: chunk,
          metadata: {
            a: index + 1,
            ...rawDocs[i].metadata,
          },
        })
    );
    documents.push(...processedDocs);
  }

  // Initialize the LLM Graph Transformer
  const llmTransformer = new LLMGraphTransformer({ llm });
  const graphDocuments = await llmTransformer.convertToGraphDocuments(
    documents
  );

  // Post-process graphDocuments to relabel nodes
  if (graphDocuments.length > 0) {
    console.log("Sample graphDocument:", graphDocuments[0]);
  }

  // Add the graph documents to Neo4j
  await graph.addGraphDocuments(graphDocuments, {
    baseEntityLabel: true,
    includeSource: true,
  });

  console.log("Completed adding graph documents!!!");

  // Close the graph connection
  await graph.close();
}

// Execute the script
populateGraph()
  .then(() => {
    console.log("Graph population script completed successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error populating the graph:", error);
    process.exit(1);
  });
