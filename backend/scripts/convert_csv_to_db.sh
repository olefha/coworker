#!/bin/bash

# === Configuration ===

# Path to the DuckDB database file
FILE_NAME="/Users/ole/code/Master/coworker/backend/All_CSV_data/db.db"

# Directory containing the CSV files
CSV_DIR="/Users/ole/code/Master/huggingface/Chatty-Digital-Twin"

# Ensure the destination directory exists
DEST_DIR="/Users/ole/code/Master/coworker/backend/All_CSV_data"
mkdir -p "$DEST_DIR"

# === Script Execution ===

# Remove existing db.db file if it exists
rm "$FILE_NAME" 2> /dev/null

# Loop through each CSV file in the specified directory
for file in "$CSV_DIR"/*.csv; do
    # Check if there are any CSV files
    if [ ! -e "$file" ]; then
        echo "No CSV files found in $CSV_DIR."
        exit 1
    fi

    # Extract the base name without the .csv extension
    fbname=$(basename "$file" .csv)

    # Create a table in DuckDB from the CSV file
    duckdb "$FILE_NAME" "CREATE TABLE \"$fbname\" AS SELECT * FROM read_csv_auto('$file');"

    # Check if the table was created successfully
    if [ $? -eq 0 ]; then
        echo "✅ Successfully created table '$fbname' in $FILE_NAME."
    else
        echo "❌ Failed to create table '$fbname'."
    fi
done

echo "✅ All CSV files have been processed and the DuckDB database is updated."
