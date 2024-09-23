export interface ReportData {
    report_id: number;
    report_type: 'Weekly' | 'Monthly';
    start_date: Date;
    end_date: Date;
    report_content: string;
}