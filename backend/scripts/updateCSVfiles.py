import csv

# Read the correct batch_number values from processData_expanded.csv
with open('processData_expanded.csv', 'r', newline='') as csvfile:
    reader = csv.DictReader(csvfile)
    data_expanded = list(reader)
    batch_numbers = [row['batch_number'] for row in data_expanded]

# List of other CSV files to update
other_files = ['NonConformityRecords_expanded.csv', 'QualityData_expanded.csv', 'ProductionData_expanded.csv'] 

for filename in other_files:
    with open(filename, 'r', newline='') as csvfile:
        reader = csv.DictReader(csvfile)
        data = list(reader)
        fieldnames = reader.fieldnames

    # Check if 'batch_number' column exists
    if 'batch_number' not in fieldnames:
        print(f"'batch_number' column not found in {filename}. Skipping this file.")
        continue

    # Check if the number of rows matches
    if len(data) != len(batch_numbers):
        print(f"Row count mismatch in {filename}. Expected {len(batch_numbers)} rows, found {len(data)}. Skipping this file.")
        continue

    # Update the 'batch_number' column with correct values
    for i, row in enumerate(data):
        row['batch_number'] = batch_numbers[i]

    # Write the updated data back to the CSV file
    with open(filename, 'w', newline='') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)

    print(f"Updated 'batch_number' in {filename}.")




# 1,Skim Milk,B20240324-001,3595.29,Liters,2024-03-24,Cooperative X
# 2,Skim Milk,B20240527-002,5658.03,Liters,2024-05-27,Farm C
# 3,Whole Milk,B20240808-003,2418.3,Liters,2024-08-08,Cooperative X