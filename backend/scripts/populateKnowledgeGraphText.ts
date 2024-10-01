import { populateGraph } from '../services/knowledgeGraphTextService';

const run = async () => {
  try {
    await populateGraph();
    console.log('Knowledge Graph population complete.');
  } catch (error) {
    console.error('Error during Knowledge Graph population:', error);
  } finally {
    console.error('Exiting script.');
    process.exit();
  }
};

run();
