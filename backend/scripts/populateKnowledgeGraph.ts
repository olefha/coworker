import { populateKnowledgeGraph, closeNeo4jConnection } from '../services/knowledgeGraphService';

const run = async () => {
  try {
    await populateKnowledgeGraph();
    console.log('Knowledge Graph population complete.');
  } catch (error) {
    console.error('Error during Knowledge Graph population:', error);
  } finally {
    await closeNeo4jConnection();
    process.exit();
  }
};

run();
