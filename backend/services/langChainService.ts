import { Neo4jGraph } from '@langchain/community/graphs/neo4j_graph';
import { BaseRetriever } from '@langchain/core/retrievers';
import { getLatestProcessData } from './digitalTwinService';
import { Document } from 'langchain/document';
import { MultiQueryRetriever } from "langchain/retrievers/multi_query";
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate} from '@langchain/core/prompts'
//import { RetrievalQAChain } from 'langchain/chains';


// Retriever:
// - KnowledgeGraphRetriever
// - DigitalTwinRetriever
// - CombinedRetriever
// - MultiQueryRetriever
// - Feed the retriever to the QAChain
// - Use this in the chatController
// - Wrap to async initialize function


const graph = Neo4jGraph.initialize({
  url: process.env.NEO4J_URI!,
  username: process.env.NEO4J_USERNAME!,
  password: process.env.NEO4J_PASSWORD!,
});

// const knowledgeGraphRetriever = graph();


class DigitalTwinRetriever extends BaseRetriever {
lc_namespace: string[] = ['digitalTwin'];

async retrieve(query: string): Promise<Document[]> {
    return this.getRelevantDocuments(query);
}
  async getRelevantDocuments(query: string) {
    // TODO: maybe fetch all data and filter based on query
    // Fetch relevant data based on the query
    const data = await getLatestProcessData();
    return data.map((item) => new Document({
      pageContent: JSON.stringify(item),
      metadata: { source: 'digitalTwin' },
    }));
  }
}

const digitalTwinRetriever = new DigitalTwinRetriever();


const combinedRetriever = new MultiQueryRetriever({
    retriever: digitalTwinRetriever
    // retrievers: [knowledgeGraphRetriever, digitalTwinRetriever],

});



const llm = new ChatOpenAI({
  temperature: 0,
  modelName: 'gpt-3.5-turbo', // or 'gpt-4' if available
  openAIApiKey: process.env.OPENAI_API_KEY!,
});




const promptTemplate = ChatPromptTemplate.fromTemplate(`
  You are an expert assistant for the Tine milk processing plant.

  Use the following context to answer the question.

  Context:
  {context}

  Question: {question}

  Answer:
`);



export const qaChain = RetrievalQAChain.fromLLM({
  llm,
  retriever: combinedRetriever,
  prompt: promptTemplate,
});
