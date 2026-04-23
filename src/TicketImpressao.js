import React from "react";
import logo from "./img/logo.png";
import { QRCodeSVG } from "qrcode.react";

const TicketImpressao = ({ data }) => {
  if (!data || !data.header) return null;

  const { header, items } = data;

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${day}/${month}/${year}`;
  };

  const generatePixPayload = ({ key, name, city, amount, reference }) => {
    const f = (id, val) => id + String(val).length.toString().padStart(2, '0') + val;
    const merchantAccountInfo = f('00', 'br.gov.bcb.pix') + f('01', key.replace(/[^0-9]/g, ''));
    const additionalData = f('05', reference || 'BILHETE');
    
    let payload = f('00', '01') +
                  f('01', '12') +
                  f('26', merchantAccountInfo) +
                  f('52', '0000') +
                  f('53', '986') +
                  f('54', amount.toFixed(2)) +
                  f('58', 'BR') +
                  f('59', name.substring(0, 25)) +
                  f('60', city.substring(0, 15)) +
                  f('62', additionalData) +
                  '6304';

    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
      crc ^= (payload.charCodeAt(i) << 8);
      for (let j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) crc = (crc << 1) ^ 0x1021;
        else crc <<= 1;
      }
    }
    payload += (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    return payload;
  };

  const pixPayload = generatePixPayload({
    key: '02338006000107',
    name: 'FORT FRUIT LTDA',
    city: 'BELEM',
    amount: header.valor,
    reference: header.bilhete
  });

  const RenderVia = ({ title }) => (
    <div className="ticket-via bg-white text-black p-1 print:border-0 print:m-0 print:p-0" 
         style={{ width: '190mm', boxSizing: 'border-box', fontFamily: 'monospace', margin: '0 auto', backgroundColor: 'white' }}>
      
      <div className="flex justify-end text-[8px] uppercase font-bold text-black opacity-30 mb-0.5">
        {title}
      </div>
      
      {/* Cabeçalho Empresa */}
      <div className="grid grid-cols-2 border border-black p-1.5 mb-1.5 bg-white">
        <div className="flex gap-3">
          <div className="w-14 h-14 flex items-center justify-center p-1 border-r border-black mr-2">
            <img src={logo} alt="Logo" className="max-w-full max-h-full object-contain filter grayscale" />
          </div>
          <div className="text-[9px] leading-tight flex flex-col justify-center">
            <h1 className="font-bold text-xs">FORT FRUIT LTDA</h1>
            <p>ALAMEDA CEASA, SN - CURIO, BELEM, PA</p>
            <p>CEP: 66.610-120 - CNPJ: 02.338.006/0001-07</p>
            <p>PABX/FAX: 55-91-32457463 - I.E.: 151.977.887</p>
          </div>
        </div>
        <div className="border-l border-black pl-2 flex flex-col justify-between bg-white">
          <div className="text-[12px] font-bold border-b border-black pb-0.5 mb-1 flex justify-between uppercase">
            <span>{header.cond_nome} ({header.cond_cod})</span>
            <span>Bilhete: {header.bilhete}</span>
          </div>
          <div className="text-[10px] leading-tight flex-1 flex flex-col justify-center">
             <p className="font-bold border-b border-black mb-0.5 w-full truncate">
                CLIENTE: {header.cliente_nome}
             </p>
             <div className="flex justify-between items-center text-[9px]">
                <span>CÓD: {header.cliente_cod}</span>
                <span className="font-bold italic px-1 border border-black">
                  Origem: {header.xped4sa ? ` (${header.xped4sa})` : "PROTHEUS"}
                </span>
             </div>
             <p className="mt-0.5 truncate uppercase">VENDEDOR: {header.vend_nome} ({header.vend_cod})</p>
          </div>
        </div>
      </div>

      {/* Tabela de Itens */}
      <table className="w-full text-[10px] border-collapse mb-1.5 border border-black bg-white">
        <thead>
          <tr className="border-b border-black bg-white uppercase font-bold">
            <th className="p-0.5 border-r border-black w-6">It</th>
            <th className="text-left p-1 border-r border-black">Descrição / Código</th>
            <th className="p-0.5 border-r border-black w-6 text-center">UM</th>
            <th className="text-right p-0.5 border-r border-black w-12 pr-1">Qtde</th>
            <th className="text-right p-0.5 border-r border-black w-20 pr-1">Unit</th>
            <th className="text-right p-0.5 w-20 pr-1">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y-0 text-[10px] bg-white">
          {items.map((item, idx) => (
            <tr key={idx} className="leading-none h-[18px] border-b border-black last:border-0 bg-white">
              <td className="px-1 py-[1px] border-r border-black text-center align-middle">{item.item}</td>
              <td className="px-1 py-[1px] border-r border-black align-middle">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-black uppercase leading-tight truncate">{item.descricao}</span>
                  <span className="text-[8px] font-mono text-black opacity-60">[{item.codigo}] {item.obs ? `- ${item.obs}` : ''}</span>
                </div>
              </td>
              <td className="px-1 py-[1px] border-r border-black text-center align-middle whitespace-nowrap">{item.um}</td>
              <td className="px-1 py-[1px] border-r border-black text-right align-middle tabular-nums">{item.quant.toFixed(2)}</td>
              <td className="px-1 py-[1px] border-r border-black text-right align-middle tabular-nums">{item.unitario.toFixed(2)}</td>
              <td className="px-1 py-[1px] text-right pr-1 font-bold align-middle tabular-nums">{item.total.toFixed(2)}</td>
            </tr>
          ))}
          {/* Espaçamento para empurrar o layout. */}
          {items.length <= 12 && [...Array(Math.max(0, 13 - items.length))].map((_, i) => (
             <tr key={`empty-${i}`} className="h-[18px] border-b border-black last:border-0 bg-white">
               <td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td></td>
             </tr>
          ))}
          {items.length > 12 && [...Array(Math.max(0, 35 - (items.length % 35 === 0 ? 35 : items.length % 35)))].map((_, i) => (
             <tr key={`large-empty-${i}`} className="h-[18px] border-b border-black last:border-0 bg-white">
               <td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td></td>
             </tr>
          ))}
        </tbody>
      </table>

      {/* Rodapé - Com QR Code PIX */}
      <div className="border border-black p-1.5 text-[10px] break-inside-avoid shadow-none bg-white">
        <div className="grid grid-cols-12 gap-2 items-center">
          {/* Pagamento Info */}
          <div className="col-span-3 flex flex-col justify-start">
            <p className="font-bold text-[11px] uppercase">PAGAMENTO: {header.cond_cod}</p>
            <p className="font-bold text-[10px] uppercase truncate">{header.cond_nome}</p>
            <p className="text-[8px] mt-1 opacity-50 uppercase">Local: {header.filial}</p>
          </div>

          {/* QR Code Pix - Enlarged to limit */}
          <div className="col-span-3 flex flex-col items-center justify-center border-l border-r border-black py-1 bg-white">
            <div className="bg-white">
                <QRCodeSVG value={pixPayload} size={64} level="M" />
            </div>
            <span className="text-[6px] font-black mt-1 uppercase tracking-tighter text-black">PAGUE COM PIX</span>
          </div>

          {/* Total Info */}
          <div className="col-span-6 space-y-0.5 pl-3 bg-white">
             <p className="flex justify-between font-bold text-[10px]">
                <span>QTD ITENS :</span> 
                <span>{items.length}</span>
             </p>
             <p className="flex justify-between font-bold border-b border-black pb-0.5 mb-1 items-baseline">
                <span className="text-[10px]">TOTAL :</span> 
                <span className="text-xl"> {header.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
             </p>
             <div className="text-[9px] leading-tight mt-1">
               <p className="font-bold truncate">Vendedor: {header.vend_nome}</p>
               <p>Lançado: {header.usuario}</p>
               <p className="text-right italic text-[8px] mt-0.5">Emissão: {formatDate(header.data)} {header.hora}</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );

  const showFortFruitVia = items.length <= 12;

  return (
    <div id="printable-ticket" className="hidden print:block bg-white w-full min-h-screen">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          html, body { 
            overflow: visible !important; 
            height: auto !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            background-color: white !important; 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            -webkit-filter: none !important;
            filter: none !important;
          }
          @page { 
            margin: 0; 
            size: A4 portrait; 
          }
          #printable-ticket { 
            display: block !important; 
            position: absolute !important; 
            top: 0 !important;
            left: 0 !important;
            background-color: white !important;
            padding: 5mm 0 !important;
            margin: 0 !important;
            width: 100% !important;
            min-height: 100vh !important;
            overflow: visible !important;
          }
          .ticket-via {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            background-color: white !important;
          }
          /* Forçar Branco Total */
          * {
            background-color: transparent !important;
          }
          #printable-ticket, .ticket-via, .bg-white {
            background-color: white !important;
          }
          svg {
            display: block !important;
          }
        }
      `}} />
      
      <div className={showFortFruitVia ? "mb-4 bg-white" : "bg-white"}>
        <RenderVia title="via cliente" />
      </div>

      {showFortFruitVia && (
        <div className="flex items-center justify-center bg-white" style={{ width: '190mm', margin: '6mm auto' }}>
          <div className="flex-grow border-t-2 border-dashed border-black"></div>
          <span className="material-symbols-rounded px-2 text-[18px] text-black opacity-30">
            content_cut
          </span>
          <div className="flex-grow border-t-2 border-dashed border-black"></div>
        </div>
      )}
      
      {showFortFruitVia && (
        <div className="bg-white">
          <RenderVia title="via fortfruit" />
        </div>
      )}
    </div>
  );
};

export default TicketImpressao;
