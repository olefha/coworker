export interface ShiftProcessLogData {
    log_id: number;
    shift_date: Date;
    shift_number: 1 | 2 | 3;
    operator_name: 'John Doe' | 'Jane Smith' | 'Mike Johnson' | 'Sarah Brown';
    log_entry: string;
}