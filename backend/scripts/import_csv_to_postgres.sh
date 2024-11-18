#!/bin/bash

# === Configuration ===

# PostgreSQL credentials
DB_NAME="coworker_common"
DB_USER="olefha"
DB_HOST="localhost"
DB_PORT="5434"

# Directory containing the CSV files
CSV_DIR="/Users/ole/code/Master/huggingface/Chatty-Digital-Twin"

# Define log file
LOG_FILE="$CSV_DIR/import_log.txt"

# Function to import a single CSV file
import_csv() {
    local csv_file=$1
    local table_name=$(basename "$csv_file" .csv)

    echo "Processing $csv_file into $table_name..."

    case "$table_name" in
        sop)
            # Rename to sop_data to match the table name
            table_name="sop_data"
            ;;
        qualitydata)
            # Handle qualitydata with quality_id and batch_number
            echo "Handling qualitydata import..."

            # Import qualitydata including quality_id
            psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\copy qualitydata(quality_id, batch_number, fat_content, protein_content, bacteria_count, pH_level, test_date) FROM '$csv_file' WITH (FORMAT csv, HEADER true, DELIMITER ',', QUOTE '\"', ESCAPE '\"');"

            # Check if the \copy command was successful
            if [ $? -eq 0 ]; then
                echo "✅ Successfully imported $csv_file into $table_name." | tee -a "$LOG_FILE"
            else
                echo "❌ Failed to import $csv_file into $table_name." | tee -a "$LOG_FILE"
            fi

            # Exit the function after handling qualitydata
            return
            ;;
        *)
            # Ensure table names match exactly
            ;;
    esac

    # Import other tables directly using \copy
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\copy $table_name FROM '$csv_file' WITH (FORMAT csv, HEADER true, DELIMITER ',', QUOTE '\"', ESCAPE '\"');"

    # Check if the \copy command was successful
    if [ $? -eq 0 ]; then
        echo "✅ Successfully imported $csv_file into $table_name." | tee -a "$LOG_FILE"
    else
        echo "❌ Failed to import $csv_file into $table_name." | tee -a "$LOG_FILE"
    fi
}

# Create or clear the log file
> "$LOG_FILE"

# Truncate qualitydata table to avoid duplicate key errors (if re-importing)
echo "Truncating qualitydata table to prevent duplicate key errors..." | tee -a "$LOG_FILE"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "TRUNCATE TABLE qualitydata RESTART IDENTITY CASCADE;"
if [ $? -eq 0 ]; then
    echo "✅ Successfully truncated qualitydata table." | tee -a "$LOG_FILE"
else
    echo "❌ Failed to truncate qualitydata table." | tee -a "$LOG_FILE"
    exit 1
fi

# Iterate over all CSV files in the CSV_DIR
for csv in "$CSV_DIR"/*.csv; do
    if [ -f "$csv" ]; then
        import_csv "$csv"
    else
        echo "No CSV files found in $CSV_DIR." | tee -a "$LOG_FILE"
        exit 1
    fi
done

echo "✅ All CSV files have been processed." | tee -a "$LOG_FILE"
