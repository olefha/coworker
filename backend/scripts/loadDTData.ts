import { loadProcessData, loadProductionData, loadNonConformityData, loadQualityData, loadReportData, loadSOPDate, loadShiftProcessLogData } from '../services/dataLoaderService';
// Import other loader functions

const loadAllData = async () => {
  try {
    await loadProcessData();
    await loadProductionData();
    await loadNonConformityData();
    await loadQualityData();
    await loadReportData();
    await loadSOPDate();
    await loadShiftProcessLogData();
    console.log('All data loaded successfully.');
  } catch (error) {
    console.error('Error loading data:', error);
  } finally {
    process.exit();
  }
};

loadAllData();
