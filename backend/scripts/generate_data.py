import os
import random
from datetime import datetime, timedelta
import numpy as np
from random_data import sop_random_data, nonconformities_random_data

# Set a fixed date range for all datasets
now = datetime.now()
now = datetime(now.year, now.month, now.day)
START_DATE = now + timedelta(days=-180)
END_DATE = now
FILE_NAME = "insert.sql"
SEED = 42

# Global lists to store batch numbers and other references
batch_numbers = []
malfunction_batch_numbers = []
poor_quality_batches = []
batches_from_poor_quality_material = []
material_id_batch_map = {}

def random_date(start=START_DATE, end=END_DATE):
    return start + timedelta(seconds=random.randint(0, int((end - start).total_seconds())))

def generate_process_data(num_entries):
    random.seed(SEED)
    np.random.seed(SEED)
    processes = ["Pasteurization", "Homogenization", "Separation", "Standardization"]

    data = []
    for i in range(1, num_entries + 1):
        process = random.choice(processes)
        start_time = random_date()
        end_time = start_time + timedelta(minutes=random.randint(30, 120))

        # Introduce occasional outliers and variations
        if random.random() < 0.05:  # 5% chance of an outlier
            temperature = round(np.random.uniform(40, 80), 1)
        else:
            temperature = round(np.random.normal(60, 5), 1)

        pressure = round(np.random.normal(150, 20), 1)
        flow_rate = round(np.random.normal(850, 150), 1)

        batch_number = f"B{start_time.strftime('%Y%m%d')}-{i:03d}"
        batch_numbers.append(batch_number)  # Store batch number

        # Golden Run 1: Capacity Utilization and Downtime Analysis
        if start_time.date() == datetime(2023, 9, 15).date():
            flow_rate = round(np.random.normal(500, 50), 1)  # Lower than normal
            malfunction_batch_numbers.append(batch_number)

        # Golden Run 3: Process Stability and Quality Specifications
        if start_time.date() == datetime(2023, 9, 17).date():
            temperature = round(np.random.normal(70, 5), 1)  # Higher than normal

        data.append([i, process, start_time, end_time, temperature, pressure, flow_rate])

    return data

def generate_production_data(num_entries):
    random.seed(SEED)
    products = ["Whole Milk", "Skim Milk", "2% Milk", "Heavy Cream"]

    data = []
    for i in range(1, num_entries + 1):
        product = random.choice(products)
        production_date = random_date().date()
        # Ensure batch number matches process data
        batch_number = random.choice(batch_numbers)

        # Golden Run 2: Yield Analysis Based on Input and Output
        if batch_number in batches_from_poor_quality_material:
            quantity = round(random.uniform(500, 1000), 2)  # Lower yield
        else:
            # Introduce occasional large batches or small batches
            if random.random() < 0.1:  # 10% chance of unusual batch size
                quantity = round(random.uniform(500, 8000), 2)
            else:
                quantity = round(random.uniform(1000, 6000), 2)

        data.append([i, product, batch_number, quantity, "Liters", production_date])

    return data

def generate_quality_data(num_entries):
    random.seed(SEED)
    np.random.seed(SEED)
    data = []
    for i in range(1, num_entries + 1):
        test_date = random_date()
        # Ensure batch number matches process data
        batch_number = random.choice(batch_numbers)

        # Golden Run 2: Yield Analysis - Low fat and protein content
        if batch_number in batches_from_poor_quality_material:
            fat_content = round(np.random.normal(2.0, 0.2), 1)  # Lower fat content
            protein_content = round(np.random.normal(2.5, 0.2), 1)
        # Golden Run 3: Process Stability - High fat content
        elif test_date.date() == datetime(2023, 9, 17).date():
            fat_content = round(np.random.normal(4.5, 0.5), 1)  # Higher than SOP limits
            protein_content = round(np.random.normal(3.2, 0.2), 1)
        else:
            # Introduce correlations and occasional outliers
            fat_content = round(np.random.normal(3.5, 0.5), 1)
            if random.random() < 0.1:  # 10% chance of correlated protein content
                protein_content = round(fat_content * 0.8 + np.random.normal(0, 0.1), 1)
            else:
                protein_content = round(np.random.normal(3.2, 0.2), 1)

        # Golden Run 4: Shift Log Insights and Non-Conformities - High bacteria count
        if test_date.date() == datetime(2023, 9, 18).date():
            bacteria_count = int(np.random.uniform(200000, 500000))  # High bacteria count
        else:
            # Occasional high bacteria count
            if random.random() < 0.05:  # 5% chance of high bacteria count
                bacteria_count = int(np.random.uniform(100000, 500000))
            else:
                bacteria_count = int(np.random.lognormal(9, 0.3))

        pH_level = round(np.random.normal(6.7, 0.1), 1)

        data.append([i, batch_number, fat_content, protein_content, bacteria_count, pH_level, test_date])

    return data

def generate_sop_data(num_entries):
    random.seed(SEED)
    data = []

    for i in range(1, num_entries + 1):
        row = random.choice(sop_random_data)
        procedure = row["procedure_name"]
        description = row["description"]
        version = f"{random.randint(1, 3)}.{random.randint(0, 9)}"
        last_updated = random_date().date()

        # Add specification limits and text guidelines
        spec_limits = row["spec_limits"]
        guidelines = row["process_guidelines"]

        data.append([i, procedure, description, version, last_updated, spec_limits, guidelines])

    return data

def generate_shift_process_logs(num_entries):
    random.seed(SEED)
    operators = ["John Doe", "Jane Smith", "Mike Johnson", "Sarah Brown"]

    data = []
    id = 0
    for i in range(1, num_entries + 1):
        shift_date = random_date().date()
        shift_number = random.randint(1, 3)
        operator = random.choice(operators)

        # Golden Run 1: Capacity Utilization - Equipment malfunction
        if shift_date == datetime(2023, 9, 15).date():
            log_entry = f"{'Morning' if shift_number == 1 else 'Afternoon' if shift_number == 2 else 'Night'} shift: Equipment malfunction observed; production halted for 2 hours."
        # Golden Run 4: Shift Log Insights - Unusual odor detected
        elif shift_date == datetime(2023, 9, 18).date():
            log_entry = f"{'Morning' if shift_number == 1 else 'Afternoon' if shift_number == 2 else 'Night'} shift: Unusual odor detected during processing; possible contamination."
        else:
            # Introduce occasional issues in log entries
            if random.random() < 0.1:  # 10% chance of an issue
                log_entry = f"{'Morning' if shift_number == 1 else 'Afternoon' if shift_number == 2 else 'Night'} shift: Minor equipment malfunction observed. Maintenance team notified."
            else:
                log_entry = f"{'Morning' if shift_number == 1 else 'Afternoon' if shift_number == 2 else 'Night'} shift: Routine operations performed. No significant issues reported."

        # Allow multiple entries within a shift
        for _ in range(random.randint(1, 3)):
            data.append([id, shift_date, shift_number, operator, log_entry])
            id += 1

    return data

def generate_reports(num_entries):
    random.seed(SEED)
    np.random.seed(SEED)
    report_types = ["Weekly", "Monthly"]

    data = []
    for i in range(1, num_entries + 1):
        report_type = random.choice(report_types)
        if report_type == "Weekly":
            start = random_date().date()
            end = start + timedelta(days=6)
            output = random.randint(30000, 40000)
            mean_quality = round(np.random.normal(3.5, 0.1), 2)
            std_dev_quality = round(np.random.normal(0.5, 0.05), 2)
            mean_process = round(np.random.normal(60, 5), 2)
            std_dev_process = round(np.random.normal(10, 1), 2)
            raw_milk_volume = random.randint(50000, 70000)
            content = (f"Weekly production summary: Total output {output} liters. "
                       f"Quality metrics within acceptable ranges. Mean quality: {mean_quality}, Std Dev: {std_dev_quality}. "
                       f"Mean process: {mean_process}, Std Dev: {std_dev_process}. "
                       f"Raw milk volume: {raw_milk_volume} liters.")
        else:
            start = random_date().date()
            end = start + timedelta(days=29)
            change = random.randint(-5, 5)
            mean_quality = round(np.random.normal(3.5, 0.1), 2)
            std_dev_quality = round(np.random.normal(0.5, 0.05), 2)
            mean_process = round(np.random.normal(60, 5), 2)
            std_dev_process = round(np.random.normal(10, 1), 2)
            raw_milk_volume = random.randint(200000, 300000)
            content = (f"Monthly overview: Production {'increased' if change > 0 else 'decreased'} by {abs(change)}% compared to last month. "
                       f"Continuous improvement initiatives ongoing. Mean quality: {mean_quality}, Std Dev: {std_dev_quality}. "
                       f"Mean process: {mean_process}, Std Dev: {std_dev_process}. "
                       f"Raw milk volume: {raw_milk_volume} liters.")

        data.append([i, report_type, start, end, content])

    return data

def generate_nonconformity_records(num_entries):
    random.seed(SEED)
    np.random.seed(SEED)
    severities = ["Low", "Medium", "High"]

    data = []
    for i in range(1, num_entries + 1):
        row = random.choice(nonconformities_random_data)
        deviation_date = random_date()
        description = row["description"]
        severity = random.choice(severities)
        action_taken = row["action_taken"]
        resolved_date = deviation_date + timedelta(days=random.randint(1, 3))

        # Golden Run 1: Capacity Utilization - Equipment failure
        if deviation_date.date() == datetime(2023, 9, 15).date():
            description = "Equipment failure leading to reduced capacity."
            severity = "High"
            action_taken = "Maintenance performed; resumed normal operations."
        # Golden Run 4: Shift Log Insights - Potential contamination
        if deviation_date.date() == datetime(2023, 9, 18).date():
            description = "Potential contamination detected."
            severity = "Medium"
            action_taken = "Investigated source; sanitized equipment."

        data.append([i, deviation_date, description, severity, action_taken, resolved_date])

    return data

def generate_raw_material_inputs(num_entries):
    random.seed(SEED)
    np.random.seed(SEED)
    suppliers = [
        "Dairy Farms Inc.",
        "Mountain Dairy",
        "Sunny Meadows",
        "Hillside Dairy",
        "Green Valley Dairy",
        "Farm Fresh",
        "Country Milk",
        "Riverside Dairy",
        "Highland Farms",
        "Valley Dairy",
        "Happy Cows",
        "Sunshine Dairy"
    ]
    material_types = ["Raw Milk", "Cream", "Skim Milk", "Other"]
    quality_checks = ["Passed", "Failed"]
    remarks = [
        "No issues, quality is within standards.",
        "High bacterial count detected; returned to supplier.",
        "Quality is good, within standards.",
        "Sample test passed, suitable for processing.",
        "Quality matches the standards set by the company.",
        "No anomalies, quality is consistent.",
        "Consistent quality as previous shipments.",
        "High quality milk, no bacteria detected.",
        "Detected contaminants, batch returned.",
        "Meets all quality standards, ready for processing.",
        "Delayed delivery due to transportation issues.",
        "Low fat content detected."
    ]

    data = []
    for i in range(1, num_entries + 1):
        arrival_date = random_date()
        supplier_name = random.choice(suppliers)
        material_type = random.choice(material_types)
        quantity = round(np.random.normal(10000, 5000), 2)
        quality_check = random.choice(quality_checks)
        remark = random.choice(remarks)

        # Golden Run 1: Capacity Utilization - Raw material delays
        if arrival_date.date() == datetime(2023, 9, 15).date():
            quality_check = "Failed"
            remark = "Delayed delivery due to transportation issues."
        # Golden Run 2: Yield Analysis - Poor quality raw milk
        if arrival_date.date() == datetime(2023, 9, 16).date():
            quality_check = "Failed"
            remark = "Low fat content detected."
            poor_quality_batches.append(i)
        # Map material ID to batch numbers
        material_id_batch_map[i] = f"B{arrival_date.strftime('%Y%m%d')}-{i:03d}"

        data.append([i, arrival_date, supplier_name, material_type, quantity, "Liters", quality_check, remark])

    # Update batch_numbers for poor quality batches
    for material_id in poor_quality_batches:
        batch_number = material_id_batch_map[material_id]
        batches_from_poor_quality_material.append(batch_number)

    return data

def generate_historical_data():
    # Golden Run 5: Historical Pattern Recognition for Quality Variations

    # Historical Process Data
    process_data = [
        [
            9999, "Pasteurization", datetime(2023, 6, 15, 14, 0), datetime(2023, 6, 15, 16, 0),
            70.0, 160.0, 900.0
        ]
    ]
    write_sql("processdata", ["process_id", "process_name", "start_time", "end_time", "temperature", "pressure", "flow_rate"], process_data)

    # Historical Non-Conformity Records
    nonconformity_data = [
        [
            9999, datetime(2023, 6, 15), "Temperature deviation causing quality issues.", "High",
            "Adjusted temperature controls; retrained staff.", datetime(2023, 6, 16)
        ]
    ]
    write_sql("nonconformityrecords", ["record_id", "deviation_date", "description", "severity", "action_taken", "resolved_date"], nonconformity_data)

    # Historical Quality Data
    quality_data = [
        [
            9999, "B20230615-999", 4.5, 3.5, 100000, 6.8, datetime(2023, 6, 15, 15, 0)
        ]
    ]
    write_sql("qualitydata", ["quality_id", "batch_number", "fat_content", "protein_content", "bacteria_count", "pH_level", "test_date"], quality_data)

    # Add to batch_numbers for consistency
    batch_numbers.append("B20230615-999")

def write_sql(table_name, columns, data):
    with open(FILE_NAME, 'a', newline='') as file:
        value = f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES \n"
        for row in data:
            value += "("
            for col in row:
                if isinstance(col, int) or isinstance(col, float):
                    value += str(col)
                elif isinstance(col, datetime):
                    value += f"'{col.strftime('%Y-%m-%d %H:%M:%S')}'"
                elif isinstance(col, timedelta):
                    value += f"'{str(col)}'"
                else:
                    value += f"'{col}'"
                value += ", "
            value = value[:-2]
            value += "),\n"
        value = value[:-2] + ";"
        file.write(value + "\n\n")

# Number of entries for each table
num_entries = 500
num_entries_sop = 20
num_entries_non_conformities = 50
num_entries_raw_material_input = 60

# Remove existing SQL file if it exists
if os.path.exists(FILE_NAME):
    os.remove(FILE_NAME)

# Generate and write data for each table
write_sql("processdata",
          ["process_id", "process_name", "start_time", "end_time", "temperature", "pressure", "flow_rate"],
          generate_process_data(num_entries))

write_sql("productiondata",
          ["production_id", "product_name", "batch_number", "quantity", "unit", "production_date"],
          generate_production_data(num_entries))

write_sql("qualitydata",
          ["quality_id", "batch_number", "fat_content", "protein_content", "bacteria_count", "pH_level", "test_date"],
          generate_quality_data(num_entries))

write_sql("sop_data",
          ["sop_id", "procedure_name", "description", "version", "last_updated", "spec_limits", "process_guidelines"],
          generate_sop_data(num_entries_sop))

write_sql("shiftprocesslogs",
          ["log_id", "shift_date", "shift_number", "operator_name", "log_entry"],
          generate_shift_process_logs(num_entries))

write_sql("reports",
          ["report_id", "report_type", "start_date", "end_date", "report_content"],
          generate_reports(num_entries))

write_sql("nonconformityrecords",
          ["record_id", "deviation_date", "description", "severity", "action_taken", "resolved_date"],
          generate_nonconformity_records(num_entries_non_conformities))

write_sql("rawmaterialinput",
          ["material_id", "arrival_date", "supplier_name", "material_type", "quantity", "unit", "quality_check", "remarks"],
          generate_raw_material_inputs(num_entries_raw_material_input))

# Generate historical data for Golden Run 5
generate_historical_data()

print("Data generation complete. SQL statements written to insert.sql.")
