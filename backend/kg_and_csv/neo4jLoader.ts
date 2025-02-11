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
    await session.run(`
        CREATE CONSTRAINT IF NOT EXISTS FOR (n:NonConformityRecords) REQUIRE n.record_id IS UNIQUE
    `);
    await session.run(`
        CREATE CONSTRAINT IF NOT EXISTS FOR (pr:ProductionData) REQUIRE pr.production_id IS UNIQUE
    `);
    await session.run(`
        CREATE CONSTRAINT IF NOT EXISTS FOR (q:QualityData) REQUIRE q.quality_id IS UNIQUE
    `);
    await session.run(`
        CREATE CONSTRAINT IF NOT EXISTS FOR (re:Reports) REQUIRE re.report_id IS UNIQUE
    `);
    await session.run(`
        CREATE CONSTRAINT IF NOT EXISTS FOR (s:ShiftProcessLogs) REQUIRE s.log_id IS UNIQUE
    `);
    await session.run(`
        CREATE CONSTRAINT IF NOT EXISTS FOR (sop:SOP) REQUIRE sop.sop_id IS UNIQUE
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
        CREATE (dp)-[:HAS_RAW_MATERIAL_INPUT]->(r)
    `);

    // Load NonConformityRecords
    await session.run(`
        LOAD CSV WITH HEADERS FROM 'file:///nonconformityrecords.csv' AS row
        CREATE (n:NonConformityRecords {
            record_id: toInteger(row.record_id),
            deviation_date: datetime(row.deviation_date),
            description: row.description,
            severity: row.severity,
            action_taken: row.action_taken,
            resolved_date: datetime(row.resolved_date)
        })
        WITH n
        MATCH (dp:DairyPlant {name: 'Main Dairy Plant'})
        CREATE (dp)-[:HAS_NON_CONFORMITY_RECORD]->(n)
    `);

    // Load ProductionData
    await session.run(`
        LOAD CSV WITH HEADERS FROM 'file:///productiondata.csv' AS row
        CREATE (pr:ProductionData {
            production_id: toInteger(row.production_id),
            product_name: row.product_name,
            batch_number: row.batch_number,
            quantity: toFloat(row.quantity),
            unit: row.unit,
            production_date: datetime(row.production_date)
        })
        WITH pr
        MATCH (dp:DairyPlant {name: 'Main Dairy Plant'})
        CREATE (dp)-[:HAS_PRODUCTION_DATA]->(pr)
    `);

    console.log("ProductionData loaded");
    console.log("Loading QualityData");

    // Load QualityData
    await session.run(`
        LOAD CSV WITH HEADERS FROM 'file:///qualitydata.csv' AS row
        CREATE (q:QualityData {
            quality_id: toInteger(row.quality_id),
            batch_number: row.batch_number,
            fat_content: toFloat(row.fat_content),
            protein_content: toFloat(row.protein_content),
            bacteria_count: toInteger(row.bacteria_count),
            pH_level: toFloat(row.pH_level),
            test_date: datetime(row.test_date)
        })
        WITH q
        MATCH (dp:DairyPlant {name: 'Main Dairy Plant'})
        CREATE (dp)-[:HAS_QUALITY_DATA]->(q)
    `);

    console.log("QualityData loaded");

    // Load Reports
    await session.run(`
        LOAD CSV WITH HEADERS FROM 'file:///reports.csv' AS row
        CREATE (re:Reports {
            report_id: toInteger(row.report_id),
            report_type: row.report_type,
            start_date: datetime(row.start_date),
            end_date: datetime(row.end_date),
            report_content: row.report_content
        })
        WITH re
        MATCH (dp:DairyPlant {name: 'Main Dairy Plant'})
        CREATE (dp)-[:HAS_REPORT]->(re)
    `);

    // Load ShiftProcessLogs
    await session.run(`
        LOAD CSV WITH HEADERS FROM 'file:///shiftprocesslogs.csv' AS row
        CREATE (s:ShiftProcessLogs {
            log_id: toInteger(row.log_id),
            shift_date: datetime(row.shift_date),
            shift_number: toInteger(row.shift_number),
            operator_name: row.operator_name,
            log_entry: row.log_entry
        })
        WITH s
        MATCH (dp:DairyPlant {name: 'Main Dairy Plant'})
        CREATE (dp)-[:HAS_SHIFT_PROCESS_LOG]->(s)
    `);

    // Load SOP
    await session.run(`
        LOAD CSV WITH HEADERS FROM 'file:///sop.csv' AS row
        CREATE (sop:SOP {
            sop_id: toInteger(row.sop_id),
            process_name: row.process_name,
            description: row.description,
            version: toFloat(row.version),
            last_updated: datetime(row.last_updated),
            spec_limits: row.spec_limits,
            process_guidelines: row.process_guidelines
        })
        WITH sop
        MATCH (dp:DairyPlant {name: 'Main Dairy Plant'})
        CREATE (dp)-[:HAS_SOP]->(sop)
    `);
    console.log("SOP loaded");

    console.log("counting..");
    // Verify the data was loaded
    // const result = await session.run(`
    //     MATCH (dp:DairyPlant)
    //     OPTIONAL MATCH (dp)-[:HAS_PROCESS]->(p:ProcessData)
    //     OPTIONAL MATCH (dp)-[:HAS_RAW_MATERIAL]->(r:RawMaterialInput)
    //     OPTIONAL MATCH (dp)-[:HAS_NON_CONFORMITY_RECORD]->(n:NonConformityRecords)
    //     OPTIONAL MATCH (dp)-[:HAS_PRODUCTION_DATA]->(pr:ProductionData)
    //     OPTIONAL MATCH (dp)-[:HAS_QUALITY_DATA]->(q:QualityData)
    //     OPTIONAL MATCH (dp)-[:HAS_REPORT]->(re:Reports)
    //     OPTIONAL MATCH (dp)-[:HAS_SHIFT_PROCESS_LOG]->(s:ShiftProcessLogs)
    //     OPTIONAL MATCH (dp)-[:HAS_SOP]->(sop:SOP)
    //     RETURN
    //         dp.name AS Plant
    //         count(p) AS ProcessCount
    //         count(r) AS RawMaterialCount,
    //         count(n) AS NonConformityCount,
    //         count(pr) AS ProductionCount,
    //         count(q) AS QualityCount,
    //         count(re) AS ReportCount,
    //         count(s) AS ShiftLogCount,
    //         count(sop) AS SOPCount
    //         `);

    console.log("Graph creation completed in database", DATABASE_NAME);
    // console.log("Summary:", result.records[0].toObject());
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
