import * as XLSX from 'xlsx';
import api from '../api/ipcClient';

/**
 * Exporte des données en Excel via une boîte de dialogue de sauvegarde
 * @param {Array} data - Les données à exporter
 * @param {Array} headers - Les en-têtes des colonnes [{key, label}]
 * @param {string} fileName - Le nom par défaut du fichier
 */
export async function exportToExcel(data, headers, fileName) {
  try {
    // Transformer les données pour Excel
    const excelData = data.map(item => {
      const row = {};
      headers.forEach(header => {
        row[header.label] = item[header.key] || '';
      });
      return row;
    });

    // Créer le workbook
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Données');

    // Générer le buffer
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    // Convertir en base64 pour l'envoi via IPC
    const base64 = btoa(new Uint8Array(excelBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));

    // Appeler le backend pour sauvegarder le fichier
    const result = await api.export.saveFile(base64, fileName);

    if (result.success) {
      return { success: true, filePath: result.filePath };
    } else {
      return { success: false, canceled: result.canceled };
    }
  } catch (error) {
    console.error('Erreur lors de l\'export Excel :', error);
    return { success: false, error: 'Erreur lors de l\'export Excel' };
  }
}
