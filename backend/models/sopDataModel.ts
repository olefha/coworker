export interface SopData {
    sop_id: number;
    procedure_name: 'Pasteurization Process' | 'Quality Testing Protocol' | 'Equipment Cleaning Procedure' | 'Product Packaging Guidelines';
    description: string;
    version: string;
    last_updated: Date;
}