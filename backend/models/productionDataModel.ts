export interface ProductionData {
    production_id: number;
    product_name: 'Whole Milk' | '2% Milk' | 'Heavy Cream' | 'Skim Milk';
    batch_number: string; // Format: "BYYYYMMDD-###"
    quantity: number;
    unit: 'Liters';
    production_date: Date;
    milk_source: 'Farm A' | 'Farm B' | 'Farm C' | 'Cooperative X';
}