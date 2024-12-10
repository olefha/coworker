-- create_tables_updated.sql

-- Drop existing tables in reverse order to avoid dependency issues
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS nonconformityrecords CASCADE;
DROP TABLE IF EXISTS shiftprocesslogs CASCADE;
DROP TABLE IF EXISTS rawmaterialinput CASCADE;
DROP TABLE IF EXISTS qualitydata CASCADE;
DROP TABLE IF EXISTS productiondata CASCADE;
DROP TABLE IF EXISTS processdata CASCADE;
DROP TABLE IF EXISTS sop_data CASCADE;

-- Create sop_data table
CREATE TABLE sop_data (
    sop_id SERIAL PRIMARY KEY,
    procedure_name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(10),
    last_updated DATE,
    spec_limits VARCHAR(255),
    process_guidelines TEXT
);

-- Create processdata table
CREATE TABLE processdata (
    process_id SERIAL PRIMARY KEY,
    process_name VARCHAR(255) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    temperature DECIMAL(5,2),
    pressure DECIMAL(5,2),
    flow_rate DECIMAL(7,2)
);

-- Create productiondata table
CREATE TABLE productiondata (
    production_id SERIAL PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    batch_number VARCHAR(50) NOT NULL,
    quantity DECIMAL(10,2),
    unit VARCHAR(50),
    production_date DATE
);

-- Create qualitydata table without foreign key constraint
CREATE TABLE qualitydata (
    quality_id INTEGER PRIMARY KEY,
    batch_number VARCHAR(50) NOT NULL,
    fat_content DECIMAL(4,2),
    protein_content DECIMAL(4,2),
    bacteria_count INTEGER,
    pH_level DECIMAL(3,2),
    test_date TIMESTAMP
);

-- Create rawmaterialinput table
CREATE TABLE rawmaterialinput (
    material_id SERIAL PRIMARY KEY,
    arrival_date TIMESTAMP,
    supplier_name VARCHAR(255),
    material_type VARCHAR(100),
    quantity DECIMAL(10,2),
    unit VARCHAR(50),
    quality_check VARCHAR(50),
    remarks TEXT
);

-- Create reports table
CREATE TABLE reports (
    report_id SERIAL PRIMARY KEY,
    report_type VARCHAR(50),
    start_date DATE,
    end_date DATE,
    report_content TEXT
);

-- Create shiftprocesslogs table
CREATE TABLE shiftprocesslogs (
    log_id SERIAL PRIMARY KEY,
    shift_date DATE,
    shift_number INTEGER,
    operator_name VARCHAR(255),
    log_entry TEXT
);

-- Create nonconformityrecords table
CREATE TABLE nonconformityrecords (
    record_id SERIAL PRIMARY KEY,
    deviation_date TIMESTAMP,
    description TEXT,
    severity VARCHAR(50),
    action_taken TEXT,
    resolved_date TIMESTAMP
);
