// models/processDataModel.ts

export interface ProcessData {
    process_id: number;
    process_name: 'Pasteurization' | 'Homogenization' | 'Separation' | 'Standardization';
    start_time: Date;
    end_time: Date;
    temperature: number;
    pressure: number;
    flow_rate: number;
    equipment_used: 'Tank A' | 'Tank B' | 'Separator 1' | 'Homogenizer 2';
    batch_number: string; // Format: "BYYYYMMDD-###"
  }
  