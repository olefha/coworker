/* eslint-disable @typescript-eslint/no-explicit-any */
// services/dataLoaderService.ts


import fs from 'fs';
import path from 'path';
import csvParser from 'csv-parser';
import { Pool } from 'pg';
import { ProcessData } from '../models/processDataModel';
import { ProductionData } from '../models/productionDataModel';
import { QualityData } from '../models/qualityDataModel';
import { SopData } from '../models/sopDataModel';
import { ShiftProcessLogData } from '../models/shiftProcessLogDataModel';
import { ReportData } from '../models/reportDataModel';
import { NonConformityRecordData } from '../models/nonConformityRecordDataModel';
import dotenv from 'dotenv'; 
dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log('Database Configuration:');
console.log(`User: ${process.env.DB_USER}`);
console.log(`Host: ${process.env.DB_HOST}`);
console.log(`Database: ${process.env.DB_NAME}`);
console.log(`Port: ${process.env.DB_PORT}`);

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

/**
 * Generic function to load CSV data
 */
const loadCSV = <T>(filePath: string, mapRow: (row: any) => T): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    const results: T[] = [];
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (data) => results.push(mapRow(data)))
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

/**
 * Load ProcessData from CSV and insert into PostgreSQL
 */
export const loadProcessData = async () => {
  const filePath = path.join(__dirname, '../All_CSV_data/ProcessData_expanded.csv');
  const processData = await loadCSV<ProcessData>(filePath, (row) => ({
    process_id: parseInt(row.process_id),
    process_name: row.process_name,
    start_time: new Date(row.start_time),
    end_time: new Date(row.end_time),
    temperature: parseFloat(row.temperature),
    pressure: parseFloat(row.pressure),
    flow_rate: parseFloat(row.flow_rate),
    equipment_used: row.equipment_used,
    batch_number: row.batch_number,
  }));

  // Insert into DB
  const client = await pool.connect();
  try {
    for (const process of processData) {
      await client.query(
        `INSERT INTO process_data (process_id, process_name, start_time, end_time, temperature, pressure, flow_rate, equipment_used, batch_number)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (process_id) DO NOTHING`,
        [
          process.process_id,
          process.process_name,
          process.start_time,
          process.end_time,
          process.temperature,
          process.pressure,
          process.flow_rate,
          process.equipment_used,
          process.batch_number,
        ]
      );
    }
    console.log('Process data loaded successfully.');
  } catch (error) {
    console.error('Error loading process data:', error);
  } finally {
    client.release();
  }
};

export const loadProductionData = async () => {
    const filePath = path.join(__dirname, '../All_CSV_data/ProductionData_expanded.csv');
    const productionData = await loadCSV<ProductionData>(filePath, (row) => ({
      production_id: parseInt(row.production_id),
      product_name: row.product_name as 'Whole Milk' | '2% Milk' | 'Heavy Cream' | 'Skim Milk',
      batch_number: row.batch_number,
      quantity: parseFloat(row.quantity),
      unit: row.unit,
      production_date: new Date(row.production_date),
      milk_source: row.milk_source as 'Farm A' | 'Farm B' | 'Farm C' | 'Cooperative X',
    }));

    // Insert into DB
    const client = await pool.connect();
    try {
      for (const production of productionData) {
        await client.query(
          `INSERT INTO production_data (production_id, product_name, batch_number, quantity, unit, production_date, milk_source)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (production_id) DO NOTHING`,
          [
            production.production_id,
            production.product_name,
            production.batch_number,
            production.quantity,
            production.unit,
            production.production_date,
            production.milk_source,
          ]
        );
      }
      console.log('Production data loaded successfully.');
    } catch (error) {
        console.error('Error loading production data:', error);
        } finally {
        client.release();
    }
};

export const loadQualityData = async () => {
    const filePath = path.join(__dirname, '../All_CSV_data/QualityData_expanded.csv');
    const qualityData = await loadCSV<QualityData>(filePath, (row) => ({
      quality_id: parseInt(row.quality_id),
      batch_number: row.batch_number,
      fat_content: parseFloat(row.fat_content),
      protein_content: parseFloat(row.protein_content),
      bacteria_count: parseInt(row.bacteria_count),
      pH_level: parseFloat(row.pH_level),
      test_date: new Date(row.test_date),
    }));

    // Insert into DB
    const client = await pool.connect();
    try {
      for (const quality of qualityData) {
        await client.query(
          `INSERT INTO quality_data (quality_id, batch_number, fat_content, protein_content, bacteria_count, pH_level, test_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (quality_id) DO NOTHING`,
          [
            quality.quality_id,
            quality.batch_number,
            quality.fat_content,
            quality.protein_content,
            quality.bacteria_count,
            quality.pH_level,
            quality.test_date,
          ]
        );
      }
      console.log('Quality data loaded successfully.');
    } catch (error) {
        console.error('Error loading quality data:', error);
        } finally {
        client.release();
    }
};

export const loadSOPDate = async () => {
    const filePath = path.join(__dirname, '../All_CSV_data/SOP_expanded.csv');
    const sopData = await loadCSV<SopData>(filePath, (row) => ({
        sop_id: parseInt(row.sop_id),
        procedure_name: row.procedure_name,
        description: row.description,
        version: row.version,
        last_updated: new Date(row.last_updated),
    }));

    // Insert into DB
    const client = await pool.connect();
    try {
        for (const sop of sopData) {
            await client.query(
                `INSERT INTO sop_data (sop_id, procedure_name, description, version, last_updated)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (sop_id) DO NOTHING`,
                [
                    sop.sop_id,
                    sop.procedure_name,
                    sop.description,
                    sop.version,
                    sop.last_updated,
                ]
            );
        }
        console.log('SOP data loaded successfully.');
    } catch (error) {
        console.error('Error loading SOP data:', error);
    } finally {
        client.release();
    }
};

export const loadShiftProcessLogData = async () => {
    const filePath = path.join(__dirname, '../All_CSV_data/ShiftProcessLogs_expanded.csv');
    const shiftProcessLogData = await loadCSV<ShiftProcessLogData>(filePath, (row) => ({
        log_id: parseInt(row.log_id),
        shift_date: new Date(row.shift_date),
        shift_number: parseInt(row.shift_number) as 1 | 2 | 3,
        operator_name: row.operator_name as 'John Doe' | 'Jane Smith' | 'Mike Johnson' | 'Sarah Brown',
        log_entry: row.log_entry,
    }));

    // Insert into DB
    const client = await pool.connect();
    try {
        for (const log of shiftProcessLogData) {
            await client.query(
                `INSERT INTO shift_process_log_data (log_id, shift_date, shift_number, operator_name, log_entry)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (log_id) DO NOTHING`,
                [
                    log.log_id,
                    log.shift_date,
                    log.shift_number,
                    log.operator_name,
                    log.log_entry,
                ]
            );
        }
        console.log('Shift Process Log data loaded successfully.');
    } catch (error) {
        console.error('Error loading Shift Process Log data:', error);
    } finally {
        client.release();
    }
};

export const loadReportData = async () => {
    const filePath = path.join(__dirname, '../All_CSV_data/Reports_expanded.csv');
    const reportData = await loadCSV<ReportData>(filePath, (row) => ({
        report_id: parseInt(row.report_id),
        report_type: row.report_type as 'Weekly' | 'Monthly',
        start_date: new Date(row.start_date),
        end_date: new Date(row.end_date),
        report_content: row.report_content,
    }));

    // Insert into DB
    const client = await pool.connect();
    try {
        for (const report of reportData) {
            await client.query(
                `INSERT INTO report_data (report_id, report_type, start_date, end_date, report_content)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (report_id) DO NOTHING`,
                [
                    report.report_id,
                    report.report_type,
                    report.start_date,
                    report.end_date,
                    report.report_content,
                ]
            );
        }
        console.log('Report data loaded successfully.');
    } catch (error) {
        console.error('Error loading report data:', error);
    } finally {
        client.release();
    }
};

export const loadNonConformityData = async () => {
    const filePath = path.join(__dirname, '../All_CSV_data/NonConformityRecords_expanded.csv');
    const nonConformityData = await loadCSV<NonConformityRecordData>(filePath, (row) => ({
        record_id: parseInt(row.record_id),
        deviation_date: new Date(row.deviation_date),
        description: row.description as 'Fat content below standard' | 'Higher than normal bacteria count' | 'Packaging machine malfunction' | 'pH level slightly off',
        severity: row.severity as 'Low' | 'Medium' | 'High',
        action_taken: row.action_taken,
        resolved_date: new Date(row.resolved_date),
        batch_number: row.batch_number,
    }));

    // Insert into DB
    const client = await pool.connect();
    try {
        for (const record of nonConformityData) {
            await client.query(
                `INSERT INTO non_conformity_record_data (record_id, deviation_date, description, severity, action_taken, resolved_date, batch_number)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (record_id) DO NOTHING`,
                [
                    record.record_id,
                    record.deviation_date,
                    record.description,
                    record.severity,
                    record.action_taken,
                    record.resolved_date,
                    record.batch_number,
                ]
            );
        }
        console.log('Non-Conformity Record data loaded successfully.');
    } catch (error) {
        console.error('Error loading non-conformity record data:', error);
    } finally {
        client.release();
    }
};

export const getProcessesFromDB = async (): Promise<ProcessData[]> => {
  try {
    const result = await pool.query('SELECT * FROM process_data');
    return result.rows.map((row) => ({
      process_id: row.process_id,
      process_name: row.process_name,
      start_time: row.start_time,
      end_time: row.end_time,
      temperature: row.temperature,
      pressure: row.pressure,
      flow_rate: row.flow_rate,
      equipment_used: row.equipment_used,
      batch_number: row.batch_number,
    }));
  } catch (error) {
    console.error('Error fetching process data from DB:', error);
    throw error;
  }
};
