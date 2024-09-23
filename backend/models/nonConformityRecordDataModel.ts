export interface NonConformityRecordData {
    record_id: number;
    deviation_date: Date;
    description: 'Fat content below standard' | 'Higher than normal bacteria count' | 'Packaging machine malfunction' | 'pH level slightly off';
    severity: 'Low' | 'Medium' | 'High';
    action_taken: string;
    resolved_date: Date;
    batch_number: string;
}