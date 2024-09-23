import neo4j from 'neo4j-driver';
import { ProcessData } from '../models/processDataModel';
//import { pool } from './dbService';
import { getProcessesFromDB } from './dataLoaderService';
// Import other models as needed

const driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!)
);

export const populateKnowledgeGraph = async () => {
  const session = driver.session();
  try {
    // Example: Populate Process Data
    const processData: ProcessData[] = await getProcessesFromDB();

    for (const process of processData) {
      await session.run(
        `
        MERGE (p:Process {process_id: $process_id})
        SET p.process_name = $process_name,
            p.start_time = datetime($start_time),
            p.end_time = datetime($end_time),
            p.temperature = $temperature,
            p.pressure = $pressure,
            p.flow_rate = $flow_rate,
            p.equipment_used = $equipment_used,
            p.batch_number = $batch_number
        `,
        {
          process_id: process.process_id,
          process_name: process.process_name,
          start_time: process.start_time.toISOString(),
          end_time: process.end_time.toISOString(),
          temperature: process.temperature,
          pressure: process.pressure,
          flow_rate: process.flow_rate,
          equipment_used: process.equipment_used,
          batch_number: process.batch_number,
        }
      );

      // Example: Create relationships if needed
      // e.g., Link Process to Equipment
      await session.run(
        `
        MATCH (p:Process {process_id: $process_id}), (e:Equipment {name: $equipment_used})
        MERGE (p)-[:USES]->(e)
        `,
        {
          process_id: process.process_id,
          equipment_used: process.equipment_used,
        }
      );
    }

    // Repeat similar steps for other datasets (ProductionData, QualityData, etc.)

    console.log('Knowledge Graph populated successfully.');
  } catch (error) {
    console.error('Error populating Knowledge Graph:', error);
  } finally {
    await session.close();
  }
};

export const closeNeo4jConnection = async () => {
  await driver.close();
};
