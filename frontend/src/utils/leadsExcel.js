import * as XLSX from 'xlsx';

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

function toDateOnly(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function leadsToExcel(leads) {
  const rows = [EXPORT_HEADERS];
  for (const l of leads) {
    rows.push([
      l.entryDate ? String(l.entryDate).slice(0, 10) : '',
      l.whatsapp || '',
      l.picSales || '',
      l.status || '',
      l.country || '',
      l.followUp1 ? String(l.followUp1).slice(0, 10) : '',
      l.followUp2 ? String(l.followUp2).slice(0, 10) : '',
      l.followUp3 ? String(l.followUp3).slice(0, 10) : '',
      l.notes || '',
    ]);
  }
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [12, 16, 16, 10, 12, 12, 12, 12, 32].map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Leads');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

export function downloadExcel(filename, buffer) {
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function normalizeDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date && !isNaN(value)) return toDateOnly(value);

  const v = String(value).trim();
  if (!v) return null;
  let m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

const DATE_FIELDS = new Set(['entryDate', 'followUp1', 'followUp2', 'followUp3']);

export async function parseLeadsExcel(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return { records: [], skipped: 0 };

  const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
  const records = [];
  let skipped = 0;

  for (const sourceRow of raw) {
    const record = {};
    for (const [key, value] of Object.entries(sourceRow)) {
      const field = HEADER_ALIASES[key.trim().toLowerCase()];
      if (!field) continue;
      record[field] = DATE_FIELDS.has(field) ? normalizeDate(value) : (String(value).trim() || null);
    }
    if (!record.whatsapp || !record.entryDate) {
      skipped++;
      continue;
    }
    records.push(record);
  }

  return { records, skipped };
}
