import { PERUSAHAAN, REKENING, CATATAN_BAWAAN, rupiah, tanggalPanjang, tanggalPendek } from '../utils/invoice';

function Baris({ label, value }) {
  return (
    <div className="flex gap-2">
      <div className="w-[130px] shrink-0">{label}</div>
      <div className="flex-1 font-medium break-words">{value || '-'}</div>
    </div>
  );
}

/**
 * Invoice siap cetak.
 *
 * Warnanya dikunci hitam di atas putih, tidak mengikuti tema aplikasi. Yang
 * dilihat di layar bukan tujuannya; yang dicetak dan dikirim ke customer iya,
 * dan invoice bertema gelap akan menghabiskan tinta serta sulit dibaca.
 */
export default function InvoicePrint({ invoice }) {
  if (!invoice) return null;
  const catatan = invoice.notes || CATATAN_BAWAAN;

  return (
    <div id="invoice-print" className="bg-white text-black text-[11px] leading-snug p-8 mx-auto" style={{ maxWidth: 820 }}>
      <div className="flex justify-between items-start gap-6 border-b-2 border-black pb-3">
        <div>
          <div className="text-[15px] font-bold tracking-wide">{PERUSAHAAN.nama}</div>
          {PERUSAHAAN.alamat.map((b) => (
            <div key={b}>{b}</div>
          ))}
          <div>Phone {PERUSAHAAN.telepon}</div>
          <div>Email {PERUSAHAAN.email}</div>
        </div>
      </div>

      <div className="text-center font-bold text-[14px] tracking-[0.2em] py-2">INVOICE</div>

      <div className="grid grid-cols-2 gap-8">
        <div className="flex flex-col gap-0.5">
          <div className="font-bold mb-1">Order by</div>
          <Baris label="Name" value={invoice.customerName} />
          <Baris label="Address" value={invoice.customerAddress} />
          <Baris label="Date Of Departure" value={invoice.departureLabel} />
          <Baris label="Number Phone" value={invoice.customerPhone} />
          <Baris label="Revision" value={invoice.revision} />
        </div>
        <div className="flex flex-col gap-0.5 mt-[18px]">
          <Baris label="Invoice" value={invoice.invoiceNo} />
          <Baris label="Invoice Out" value={tanggalPanjang(invoice.invoiceDate)} />
          <Baris label="Ticket Payment" value={tanggalPendek(invoice.ticketPaymentDate)} />
          <Baris label="Repayment" value={tanggalPendek(invoice.repaymentDate)} />
          <Baris label="Customer" value={invoice.csName} />
        </div>
      </div>

      <table className="w-full mt-4 border-collapse">
        <thead>
          <tr className="bg-neutral-200">
            <th className="text-left px-2 py-1 border border-neutral-400 w-[24%]">Code</th>
            <th className="text-left px-2 py-1 border border-neutral-400">Description</th>
            <th className="text-center px-2 py-1 border border-neutral-400 w-[8%]">Qty</th>
            <th className="text-right px-2 py-1 border border-neutral-400 w-[16%]">Unit Price</th>
            <th className="text-right px-2 py-1 border border-neutral-400 w-[18%]">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((it) => (
            <tr key={it.id}>
              <td className="px-2 py-1 border border-neutral-400">{it.code}</td>
              <td className="px-2 py-1 border border-neutral-400">{it.description}</td>
              <td className="px-2 py-1 border border-neutral-400 text-center">{it.qty}</td>
              <td className="px-2 py-1 border border-neutral-400 text-right">{rupiah(it.unitPrice)}</td>
              <td className="px-2 py-1 border border-neutral-400 text-right">{rupiah(it.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-between gap-6 mt-3">
        <div className="border border-black p-2 self-start">
          <div>Pembayaran dapat dilakukan melalui :</div>
          {REKENING.map((b) => (
            <div key={b} className={b.startsWith('A.n') ? 'font-bold' : ''}>{b}</div>
          ))}
        </div>

        <div className="w-[300px] shrink-0">
          <div className="flex justify-between font-bold py-1">
            <span>SUB TOTAL</span>
            <span>{rupiah(invoice.subtotal)}</span>
          </div>
          {invoice.payments.map((p) => (
            <div key={p.id} className="flex justify-between py-0.5">
              <span>{tanggalPendek(p.paidOn)}</span>
              <span>
                {rupiah(p.amount)} <span className="ml-1">(-)</span>
              </span>
            </div>
          ))}
          <div className="flex justify-between font-bold bg-neutral-200 px-1 py-1 mt-1">
            <span>OUTSTANDING</span>
            <span>{rupiah(invoice.outstanding)}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-between gap-6">
        <div className="whitespace-pre-wrap max-w-[560px]">
          <div className="font-bold text-red-700">Note :</div>
          {catatan}
        </div>
        <div className="text-right shrink-0 self-end">
          <div>Computer generated invoice.</div>
          <div>No signature is required.</div>
        </div>
      </div>
    </div>
  );
}
