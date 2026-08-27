const EXPORT_HEADERS = [
  'Tanggal Masuk', 'Nomor WhatsApp', 'PIC Sales', 'Status', 'Negara', 'FU 1', 'FU 2', 'FU 3', 'Notes',
];

const HEADER_ALIASES = {
  'tanggal masuk': 'entryDate',
  'tanggal': 'entryDate',
  'nomor whatsapp': 'whatsapp',
  'no whatsapp': 'whatsapp',
  'no. whatsapp': 'whatsapp',
  'whatsapp': 'whatsapp',
  'nomor wa': 'whatsapp',
  'pic sales': 'picSales',
  'pic': 'picSales',
  'status': 'status',
  'notes': 'notes',
  'catatan': 'notes',
  'fu terakhir': 'followUp1',
  'fu terakhir/tanggal': 'followUp1',
  'fu 1': 'followUp1',
  'fu1': 'followUp1',
  'fu 2': 'followUp2',
  'fu2': 'followUp2',
  'fu 3': 'followUp3',
  'fu3': 'followUp3',
  'negara': 'country',
  'country': 'country',
};

function csvEscape(value) {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function leadsToCsv(leads) {
  const lines = [EXPORT_HEADERS.join(',')];
  for (const l of leads) {
    lines.push([
      l.entryDate ? String(l.entryDate).slice(0, 10) : '',
      l.whatsapp || '',
      l.picSales || '',
      l.status || '',
      l.country || '',
      l.followUp1 ? String(l.followUp1).slice(0, 10) : '',
      l.followUp2 ? String(l.followUp2).slice(0, 10) : '',
      l.followUp3 ? String(l.followUp3).slice(0, 10) : '',
      l.notes || '',
    ].map(csvEscape).join(','));
  }
  return lines.join('\n');
}

export function downloadCsv(filename, csv) {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function parseCsvLines(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const normalized = text.replace(/\r\n/g, '\n');

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (inQuotes) {
      if (ch === '"') {
        if (normalized[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

function normalizeDate(value) {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  let m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

export function parseLeadsCsv(text) {
  const rows = parseCsvLines(text);
  if (rows.length < 2) return { records: [], skipped: 0 };

  const headerRow = rows[0].map((h) => h.trim().toLowerCase());
  const fieldMap = headerRow.map((h) => HEADER_ALIASES[h] || null);

  const records = [];
  let skipped = 0;

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    const record = {};
    fieldMap.forEach((field, idx) => {
      if (!field) return;
      const raw = (cells[idx] || '').trim();
      if (field === 'entryDate' || field === 'followUp1' || field === 'followUp2' || field === 'followUp3') {
        record[field] = normalizeDate(raw);
      } else {
        record[field] = raw || null;
      }
    });
    if (!record.whatsapp || !record.entryDate) {
      skipped++;
      continue;
    }
    records.push(record);
  }

  return { records, skipped };
}
