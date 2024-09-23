import { ProcessData } from '../models/processDataModel';
import { pool } from './dbService';

/**
 * Fetch the latest process data for the digital twin simulation
 */
export const getLatestProcessData = async (limit: number = 10): Promise<ProcessData[]> => {
  try {
    const result = await pool.query(
      `SELECT * FROM process_data ORDER BY start_time DESC LIMIT $1`,
      [limit]
    );
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
    console.error('Error fetching latest process data:', error);
    throw error;
  }
};

/**
 * Fetch reports or other relevant data as needed
 */
// Implement similar functions for reports, quality data, etc.
