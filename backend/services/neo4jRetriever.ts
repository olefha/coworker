// services/neo4jRetriever.ts

// import { GraphCypherQAChain } from "langchain/chains/graph_qa/cypher";
// import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
// import { ChatOpenAI } from "@langchain/openai";

// // Initialize the LLM
// const llm = new ChatOpenAI({
//   temperature: 0,
//   modelName: "gpt-4", // or 'gpt-3.5-turbo'
//   openAIApiKey: process.env.OPENAI_API_KEY,
// });

// // Initialize the Neo4j Graph
// const graph = await Neo4jGraph.initialize({
//   url: process.env.NEO4J_URI,
//   username: process.env.NEO4J_USERNAME,
//   password: process.env.NEO4J_PASSWORD,
// });

// // Create the GraphCypherQAChain
// const graphQAChain = GraphCypherQAChain.fromLLM({ llm, graph });

// // Function to retrieve data from the knowledge graph
// async function getGraphData(question: string): Promise<any> {
//   const graphAnswer = await graphQAChain.call({ question });
//   // graphAnswer contains the result from the knowledge graph
//   return graphAnswer;
// }
