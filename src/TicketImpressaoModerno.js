import React from "react";
import logo from "./img/logo.png";
import { QRCodeSVG } from "qrcode.react";

const TicketImpressaoModerno = ({ data }) => {
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

  const isSingleVia = items.length > 11;

  const RenderVia = ({ title, showSign }) => (
    <>
      <div className="ticket-via bg-white text-slate-900 mx-auto" 
         style={{ 
           width: '190mm', 
           boxSizing: 'border-box', 
           fontFamily: "'Inter', sans-serif", 
           border: '2px solid #000', 
           borderRadius: '4px', 
           padding: '8px 12px',
           color: '#000',
           position: 'relative',
           marginBottom: showSign ? '0' : '4px'
         }}>
      
      {/* Top Label */}
      <div className="flex justify-between items-center mb-1 border-b border-slate-200 pb-1 text-slate-400">
        <div className="flex items-center gap-1.5">
            <span className="material-symbols-rounded text-emerald-600 text-[12px]">verified</span>
            <span className="text-[7px] font-black uppercase tracking-widest text-emerald-600">Documento Auxiliar de Venda</span>
        </div>
        <div className="text-[7px] uppercase font-black tracking-[0.2em] opacity-60">
          {title}
        </div>
      </div>
      
      {/* Header & Info Wrapper */}
      <div className="grid grid-cols-12 gap-2 mb-2">
        
        {/* Left Side: Company, Total and Info */}
        <div className="col-span-10 flex flex-col gap-1.5">
          
          {/* Top Row: Company & Total */}
          <div className="flex gap-2 items-stretch">
            <div className="flex-1 flex gap-3 p-1">
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center p-0.5 border border-slate-200 shrink-0">
                <img src={logo} alt="Logo" className="max-w-full max-h-full object-contain filter grayscale" />
              </div>
              <div className="flex flex-col justify-center">
                <h1 className="font-black text-[11px] text-slate-900 leading-none mb-0.5 uppercase tracking-tighter">FORT FRUIT LTDA</h1>
                <div className="text-[6.5px] text-slate-500 font-bold space-y-0 uppercase leading-tight">
                  <p>ALAMEDA CEASA, SN - CURIO, BELÉM, PA - 66.610-120</p>
                  <p>CNPJ: 02.338.006/0001-07 | IE: 151.977.887</p>
                </div>
              </div>
            </div>

            {/* Total Box - Moved more to the left/center */}
            <div className="w-44 bg-white text-slate-900 rounded-lg p-1 flex flex-col items-center justify-center border-2 border-black">
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5 leading-none">TOTAL DO BILHETE</span>
              <span className="text-[18px] font-black tracking-tighter tabular-nums leading-none text-black">
                {header.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
              <div className="flex items-center gap-2 border-t border-slate-200 w-full mt-1 pt-0.5 justify-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">{header.bilhete}</span>
              </div>
            </div>
          </div>

          {/* Info Block Row */}
          <div className="grid grid-cols-10 gap-1.5">
            <div className="col-span-4 bg-white rounded p-1 border border-black">
               <span className="text-[7px] font-black text-slate-400 uppercase block mb-0.5">Cliente</span>
               <div className="text-[11px] font-black text-slate-900 uppercase truncate leading-none">{header.cliente_nome}</div>
               <div className="text-[7px] font-bold text-slate-500 mt-1 uppercase">Cód: {header.cliente_cod}</div>
            </div>
            <div className="col-span-3 bg-white rounded p-1 border border-black">
               <span className="text-[7px] font-black text-slate-400 uppercase block mb-0.5">Condição</span>
               <div className="text-[10px] font-black text-slate-900 uppercase leading-none truncate">{header.cond_nome}</div>
               <div className="text-[7px] font-bold text-slate-500 mt-1 uppercase">Vendedor: {header.vend_nome}</div>
            </div>
            <div className="col-span-3 bg-white rounded p-1 border border-black">
               <span className="text-[7px] font-black text-slate-400 uppercase block mb-0.5">Dados Auxiliares</span>
               <div className="text-[9px] font-bold text-slate-900 uppercase leading-none truncate">ORIGEM: PROTHEUS</div>
               <div className="text-[7px] font-bold text-slate-500 mt-1 uppercase">Data: {formatDate(header.data)} | {header.hora}</div>
            </div>
          </div>
        </div>

        {/* Right Side: QR Code (Large) - Occupies previous "itens pag" and upper space */}
        <div className="col-span-2 border-2 border-black rounded-lg flex flex-col items-center justify-center bg-white p-1.5">
            <div className="bg-white">
                <QRCodeSVG value={pixPayload} size={64} level="M" />
            </div>
            <span className="text-[6px] font-black mt-1 uppercase tracking-tighter text-black">PAGUE COM PIX</span>
        </div>

      </div>

      {/* Tabela de Itens */}
      <div className="mb-1 rounded-[4px] border border-black overflow-hidden">
        <table className="w-full text-left border-collapse" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr className="bg-white text-slate-900 border-b border-black">
              <th className="px-1 py-1 text-[7px] font-black uppercase w-7 text-center border-r border-black">OK</th>
              <th className="px-1 py-1 text-[7px] font-black uppercase w-8 text-center border-r border-black">IT</th>
              <th className="px-1 py-1 text-[7px] font-black uppercase tracking-widest w-12 text-center border-r border-black">Cód.</th>
              <th className="px-2 py-1 text-[7px] font-black uppercase tracking-widest border-r border-black">Descrição</th>
              <th className="px-1 py-1 text-[7px] font-black uppercase tracking-widest w-10 text-center border-r border-black">QTD</th>
              <th className="px-1 py-1 text-[7px] font-black uppercase tracking-widest w-7 text-center border-r border-black">UM</th>
              <th className="px-2 py-1 text-[7px] font-black uppercase tracking-widest w-16 text-right border-r border-black">Unit.</th>
              <th className="px-2 py-1 text-[7px] font-black uppercase tracking-widest w-20 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} style={{ height: '20px', borderBottom: '1px solid #000' }}>
                <td className="border-r border-black p-0 text-center">
                    <div className="w-3.5 h-3.5 border border-black mx-auto rounded-[2px]"></div>
                </td>
                <td className="px-1 py-0 text-[10px] font-bold text-slate-500 text-center border-r border-black">{parseInt(item.item, 10)}</td>
                <td className="px-1 py-0 text-[9px] font-bold text-slate-700 text-center tabular-nums border-r border-black">{item.codigo}</td>
                <td className="px-2 py-0 border-r border-black">
                  <div className="flex flex-col justify-center overflow-hidden leading-tight h-full">
                    <span className="text-[10px] font-black text-slate-900 uppercase truncate">
                      {item.descricao} {item.obs ? ` - ${item.obs}` : ''}
                    </span>
                  </div>
                </td>
                <td className="px-1 py-0 text-[10px] font-black text-slate-800 text-center tabular-nums border-r border-black">
                  {item.quant.toFixed(2)}
                </td>
                <td className="px-1 py-0 text-center border-r border-black">
                  <span className="text-[8px] font-black text-slate-600 uppercase">{item.um}</span>
                </td>
                <td className="px-2 py-0 text-[9px] font-bold text-slate-600 text-right tabular-nums border-r border-black">
                  {item.unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-2 py-0 text-right text-[10px] font-black text-slate-900 tabular-nums">
                  {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            {/* Linhas Vazias para preenchimento (Mantém altura constante para 2 vias) */}
            {!isSingleVia && [...Array(Math.max(0, 11 - items.length))].map((_, i) => (
                <tr key={`empty-${i}`} style={{ height: '20px', borderBottom: '1px solid #000' }}>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td></td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center px-1 mt-1">
        <div className="text-[6.5px] font-bold text-black opacity-30 uppercase tracking-[0.2em]">
            SISTEMA FF MANAGER - TECNOLOGIA EM GESTÃO - {header.usuario}
        </div>
        <div className="text-[7.5px] font-bold text-black opacity-40">
            {new Date().toLocaleDateString('pt-BR')} - {header.hora}
        </div>
      </div>

      {showSign && (
        <div className="mt-4 pt-1 border-t border-black text-center w-full">
            <span className="text-[8px] font-black text-black uppercase tracking-[0.2em]">ASSINATURA DO CLIENTE</span>
        </div>
      )}
    </div>
  </>
  );

  return (
    <div id="printable-ticket-moderno" className="hidden print:block bg-white w-full min-h-screen">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        
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
          #printable-ticket-moderno { 
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
          /* Forçar tudo para branco */
          * {
            background-color: transparent !important;
          }
          #printable-ticket-moderno, .ticket-via, .bg-white {
            background-color: white !important;
          }
          svg {
              display: block !important;
          }
        }
      `}} />
      
      {!isSingleVia ? (
        <div className="flex flex-col bg-white">
          <div className="relative bg-white">
            <RenderVia title="Via do Cliente" />
            
            {/* Linha de Recorte */}
            <div className="my-4 border-b border-dashed border-black relative">
               <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 py-0 border border-black rounded-full flex items-center gap-1.5 text-black opacity-30 font-black text-[6px] uppercase tracking-widest">
                  <span className="material-symbols-rounded text-[10px]">content_cut</span>
                  <span>Recorte de Via</span>
               </div>
            </div>
          </div>
          <div className="bg-white">
            <RenderVia title="Via da Empresa" showSign={true} />
          </div>
        </div>
      ) : (
        <div className="pt-2 bg-white">
          <RenderVia title="Via Única (Documento Auxiliar)" showSign={true} />
        </div>
      )}
    </div>
  );
};

export default TicketImpressaoModerno;