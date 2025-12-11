
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Student, Employee } from '../types';

type ExportFormat = 'csv' | 'excel' | 'text' | 'pdf';
type ExportType = 'students' | 'employees' | 'admission_data';

interface ColumnDef {
  header: string;
  key: string;
}

const exportColumnsStudents: ColumnDef[] = [
  { header: 'Admission No', key: 'admission_no' },
  { header: 'Full Name', key: 'full_name' },
  { header: 'Gender', key: 'gender' },
  { header: 'Class', key: 'class_section' },
  { header: 'Section', key: 'section' },
  { header: 'Mobile', key: 'phone' },
  { header: 'Father Name', key: 'father_name' },
  { header: 'Mother Name', key: 'mother_name' },
  { header: 'Address', key: 'address' },
  { header: 'Status', key: 'student_status' },
];

const exportColumnsEmployees: ColumnDef[] = [ // Renamed from exportColumnsTeachers
  { header: 'Employee ID', key: 'id' },
  { header: 'Full Name', key: 'full_name' },
  { header: 'Designation', key: 'subject' },
  { header: 'Phone', key: 'phone' },
  { header: 'Email', key: 'email' },
  { header: 'Joining Date', key: 'joining_date' },
  { header: 'Status', key: 'status' },
];

const getColumns = (type: ExportType) => {
  switch(type) {
    case 'students':
    case 'admission_data':
      return exportColumnsStudents;
    case 'employees': // Renamed from teachers
      return exportColumnsEmployees;
    default:
      return [];
  }
};

const formatData = (data: any[], columns: ColumnDef[]): string[][] => {
  return data.map(item => 
    columns.map(col => {
      const val = item[col.key as keyof any];
      return val ? String(val) : '';
    })
  );
};

export const exportData = (data: any[], format: ExportFormat, filename: string, type: ExportType) => {
  if (!data || data.length === 0) {
    alert("No data to export");
    return;
  }

  const columns = getColumns(type);
  const timestamp = new Date().toISOString().split('T')[0];
  const fullFilename = `${filename}_${timestamp}`;

  switch (format) {
    case 'csv':
      downloadCSV(data, columns, fullFilename);
      break;
    case 'excel':
      downloadCSV(data, columns, fullFilename, 'xls');
      break;
    case 'text':
      downloadText(data, columns, fullFilename);
      break;
    case 'pdf':
      downloadPDF(data, columns, fullFilename, type);
      break;
  }
};

const downloadCSV = (data: any[], columns: ColumnDef[], filename: string, extension: string = 'csv') => {
  const headers = columns.map(col => col.header).join(',');
  const rows = formatData(data, columns).map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','));
  const csvContent = [headers, ...rows].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.href) {
    URL.revokeObjectURL(link.href);
  }
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.${extension}`;
  link.click();
};

const downloadText = (data: any[], columns: ColumnDef[], filename: string) => {
  const headers = columns.map(col => col.header).join('\t');
  const rows = formatData(data, columns).map(row => row.join('\t'));
  const textContent = [headers, ...rows].join('\n');

  const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.txt`;
  link.click();
};

const downloadPDF = (data: any[], columns: ColumnDef[], filename: string, type: ExportType) => {
  const doc: any = new jsPDF({ orientation: 'landscape' });
  const tableColumn = columns.map(col => col.header);
  const tableRows = formatData(data, columns);

  doc.setFontSize(18);
  doc.text(`${type.charAt(0).toUpperCase() + type.slice(1)} Data`, 14, 22);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Exported on: ${new Date().toLocaleString()}`, 14, 32);

  autoTable(doc, {
    startY: 44,
    head: [tableColumn],
    body: tableRows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [79, 70, 229] }, // Indigo-600
    theme: 'grid',
  });
  doc.save(`${filename}.pdf`);
};
