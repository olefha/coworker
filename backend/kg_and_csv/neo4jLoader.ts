import neo4j, { Driver, Session } from "neo4j-driver";
import "dotenv/config";

// Neo4j connection configuration

const NEO4J_URI = process.env.NEO4J_URI as string;
const NEO4J_USER = process.env.NEO4J_USERNAME as string;
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD as string;
const DATABASE_NAME = "sol2";

async function createGraph() {
  const driver: Driver = neo4j.driver(
    NEO4J_URI,
    neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
  );

  const session: Session = driver.session({
    database: DATABASE_NAME,
  });

  try {
    // Clear the graph before loading new data
    await session.run(`
        MATCH (n)
        DETACH DELETE n
    `);
    // Create constraints
    await session.run(`
        CREATE CONSTRAINT IF NOT EXISTS FOR (p:ProcessData) REQUIRE p.process_id IS UNIQUE
    `);

    await session.run(`
        CREATE CONSTRAINT IF NOT EXISTS FOR (r:RawMaterialInput) REQUIRE r.material_id IS UNIQUE
    `);

    // Create main DairyPlant node
    await session.run(`
        MERGE (dp:DairyPlant {name: 'Main Dairy Plant'})
    `);

    //CREATE (n:Node) SET n.timestamp = datetime('2024-04-26T20:33:30')
    // Load ProcessData
    await session.run(`
        LOAD CSV WITH HEADERS FROM 'file:///processdata.csv' AS row
        CREATE (p:ProcessData {
            process_id: toInteger(row.process_id),
            process_name: row.process_name,
            start_time: datetime(row.start_time),
            end_time: datetime(row.end_time),
            temperature: toFloat(row.temperature),
            pressure: toFloat(row.pressure),
            flow_rate: toFloat(row.flow_rate)
        })
        WITH p
        MATCH (dp:DairyPlant {name: 'Main Dairy Plant'})
        CREATE (dp)-[:HAS_PROCESS]->(p)
    `);

    // Load RawMaterialInput
    await session.run(`
        LOAD CSV WITH HEADERS FROM 'file:///rawmaterialinput.csv' AS row
        CREATE (r:RawMaterialInput {
            material_id: toInteger(row.material_id),
            arrival_date: datetime(row.arrival_date),
            supplier_name: row.supplier_name,
            material_type: row.material_type,
            quantity: toFloat(row.quantity),
            unit: row.unit,
            quality_check: row.quality_check,
            remarks: row.remarks
        })
        WITH r
        MATCH (dp:DairyPlant {name: 'Main Dairy Plant'})
        CREATE (dp)-[:HAS_RAW_MATERIAL]->(r)
    `);

    // Verify the data was loaded
    // Verify the data was loaded
    const result = await session.run(`
        MATCH (dp:DairyPlant)
        OPTIONAL MATCH (dp)-[:HAS_PROCESS]->(p:ProcessData)
        OPTIONAL MATCH (dp)-[:HAS_RAW_MATERIAL]->(r:RawMaterialInput)
        RETURN 
            dp.name AS Plant,
            count(p) AS ProcessCount,
            count(r) AS RawMaterialCount
    `);

    console.log("Graph creation completed in database", DATABASE_NAME);
    console.log("Summary:", result.records[0].toObject());
  } catch (error) {
    console.error("Error creating graph:", error);
    throw error;
  } finally {
    await session.close();
    await driver.close();
  }
}

createGraph()
  .then(() => console.log("Script completed successfully"))
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
