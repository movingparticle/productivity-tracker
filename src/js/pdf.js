import html2pdf from 'html2pdf.js';
import { getLang } from './i18n';

/**
 * Downloads a DOM element as a PDF document
 * @param {HTMLElement} element The DOM element containing the report
 * @param {string} roomName Name of the room for naming the file
 */
export function downloadReportPDF(element, roomName = "Sala") {
  if (!element) return;

  const dateStr = new Date().toISOString().slice(0, 10);
  const isEn = getLang() === 'en';
  const prefix = isEn ? 'Report' : 'Reporte';
  
  const options = {
    margin: 0.5,
    filename: `${prefix}_${roomName}_${dateStr}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 2, 
      useCORS: true,
      backgroundColor: '#1e293b' // Dark background matching the theme
    },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };

  html2pdf().set(options).from(element).save();
}
