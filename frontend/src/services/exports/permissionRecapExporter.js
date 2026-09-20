import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

/**
 * Export Permission Recap to Excel
 * @param {Array} data - The recap data array
 * @param {Object} filters - The applied filters for the title
 * @param {string} filters.division
 * @param {string} filters.gender
 * @param {string} filters.startDate
 * @param {string} filters.endDate
 */
export async function exportPermissionRecapToExcel(data, filters) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Rekap Perizinan");

  // Page setup for landscape printing
  worksheet.pageSetup = {
    paperSize: 9, // A4
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
    margins: {
      left: 0.6,
      right: 0.6,
      top: 0.6,
      bottom: 0.6,
      header: 0,
      footer: 0,
    },
    horizontalCentered: true,
  };

  // Columns definition
  worksheet.columns = [
    { key: "no", width: 5 },
    { key: "nip", width: 20 },
    { key: "name", width: 35 },
    { key: "division", width: 25 },
    { key: "gender", width: 15 },
    { key: "sick", width: 12 },
    { key: "leave", width: 12 },
    { key: "permit", width: 12 },
    { key: "total", width: 12 },
  ];

  const addBorder = (cell) => {
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  };

  const centerStyle = { vertical: "middle", horizontal: "center" };
  const leftStyle = { vertical: "middle", horizontal: "left" };
  const boldFont = { bold: true, name: "Arial", size: 10 };
  const titleFont = { bold: true, name: "Arial", size: 14 };

  let r = 1;

  // Title
  worksheet.mergeCells(`A${r}:I${r}`);
  const titleCell = worksheet.getCell(`A${r}`);
  titleCell.value = "REKAPITULASI PERIZINAN GURU & STAFF";
  titleCell.font = titleFont;
  titleCell.alignment = centerStyle;
  r += 2;

  // Filter Info
  if (filters.startDate || filters.endDate) {
    worksheet.mergeCells(`A${r}:C${r}`);
    const dateCell = worksheet.getCell(`A${r}`);
    const startStr = filters.startDate
      ? new Date(filters.startDate).toLocaleDateString("id-ID")
      : "Awal";
    const endStr = filters.endDate
      ? new Date(filters.endDate).toLocaleDateString("id-ID")
      : "Sekarang";
    dateCell.value = `Periode: ${startStr} s.d ${endStr}`;
    dateCell.font = boldFont;
    r++;
  }

  if (filters.division) {
    worksheet.mergeCells(`A${r}:C${r}`);
    worksheet.getCell(`A${r}`).value = `Divisi: ${filters.division}`;
    worksheet.getCell(`A${r}`).font = boldFont;
    r++;
  }

  if (filters.gender) {
    worksheet.mergeCells(`A${r}:C${r}`);
    worksheet.getCell(`A${r}`).value = `Jenis Kelamin: ${
      filters.gender === "male" ? "Ikhwan" : "Akhwat"
    }`;
    worksheet.getCell(`A${r}`).font = boldFont;
    r++;
  }
  
  r++; // Empty row before table

  // Table Headers
  const headers = [
    "No",
    "NIP",
    "Nama Lengkap",
    "Divisi",
    "L/P",
    "Sakit",
    "Cuti",
    "Izin",
    "Total",
  ];

  const headerRow = worksheet.getRow(r);
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.font = boldFont;
    cell.alignment = centerStyle;
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF3B82F6" }, // Blue-500
    };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Arial", size: 10 };
    addBorder(cell);
  });
  headerRow.height = 25;
  r++;

  // Data Rows
  if (data.length === 0) {
    worksheet.mergeCells(`A${r}:I${r}`);
    const emptyCell = worksheet.getCell(`A${r}`);
    emptyCell.value = "Tidak ada data perizinan";
    emptyCell.alignment = centerStyle;
    addBorder(emptyCell);
    addBorder(worksheet.getCell(`I${r}`));
    for(let i=1; i<=9; i++) addBorder(worksheet.getRow(r).getCell(i));
    r++;
  } else {
    data.forEach((item, index) => {
      const row = worksheet.getRow(r);
      
      row.getCell(1).value = index + 1;
      row.getCell(2).value = item.teacherNip || "-";
      row.getCell(3).value = item.teacherName || "-";
      row.getCell(4).value = item.teacherDivision || "-";
      row.getCell(5).value = item.teacherGender === "male" ? "L" : item.teacherGender === "female" ? "P" : "-";
      row.getCell(6).value = item.sickCount;
      row.getCell(7).value = item.leaveCount;
      row.getCell(8).value = item.permitCount;
      row.getCell(9).value = item.totalCount;

      // Alignments
      row.getCell(1).alignment = centerStyle;
      row.getCell(2).alignment = centerStyle;
      row.getCell(3).alignment = leftStyle;
      row.getCell(4).alignment = leftStyle;
      row.getCell(5).alignment = centerStyle;
      row.getCell(6).alignment = centerStyle;
      row.getCell(7).alignment = centerStyle;
      row.getCell(8).alignment = centerStyle;
      row.getCell(9).alignment = centerStyle;

      // Borders
      for (let i = 1; i <= 9; i++) {
        addBorder(row.getCell(i));
      }

      r++;
    });
  }

  // Generate Date Footer
  r += 2;
  const now = new Date();
  worksheet.mergeCells(`G${r}:I${r}`);
  worksheet.getCell(`G${r}`).value = `Dicetak tanggal: ${now.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })}`;
  worksheet.getCell(`G${r}`).alignment = centerStyle;

  // Save File
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `Rekap_Perizinan_${now.getTime()}.xlsx`);
}
