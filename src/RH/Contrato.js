import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import Swal from "sweetalert2";
import { jsPDF } from "jspdf";
import * as htmlToImage from 'html-to-image';
import axios from "axios";
import extenso from "extenso";
import { API_BASE_URL } from "../utils/apiConfig";

const Contrato = () => {
  const navigate = useNavigate();
  const empresas = [
    {
      nome: "FORT FRUIT LTDA",
      cnpj: "02.338.006/0001-07",
      endereco: "ALAMEDA CEASA, SN - CURIO",
      bairro: "CURIO",
      cidadeUf: "BELEM-PA",
      cep: "66610-120",
    },
    {
      nome: "DISTRIBUIDORA FORT FRUIT",
      cnpj: "23.437.618/0001-19",
      endereco: "ALAMEDA CEASA, SN - CURIO",
      bairro: "CURIO",
      cidadeUf: "BELEM-PA",
      cep: "66610-120",
    }
  ];

   const [matriculasList, setMatriculasList] = useState([]);
  const [currentMatricula, setCurrentMatricula] = useState("");
  const [dataInicio, setDataInicio] = useState(dayjs().startOf('month').format("YYYY-MM-DD"));
  const [dataFim, setDataFim] = useState(dayjs().format("YYYY-MM-DD"));
  const [selectedEmpresa, setSelectedEmpresa] = useState(empresas[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [contractsList, setContractsList] = useState([]);

  const addMatricula = async (e) => {
    if (e) e.preventDefault();
    const val = currentMatricula.trim();
    if (!val) return;
    
    if (matriculasList.some(m => m.matricula === val)) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        title: "Já adicionado",
        icon: "info",
        timer: 1500,
        showConfirmButton: false
      });
      return;
    }
    
    setIsAdding(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/contrato/funcionario/${val}`);
      const data = response.data;
      
      setMatriculasList([...matriculasList, { matricula: data.matricula, nome: data.nome, fullData: data }]);
      setCurrentMatricula("");
    } catch (error) {
      console.error(`Erro ao buscar matrícula ${val}:`, error);
      Swal.fire("Atenção", `Não foi possível encontrar a matrícula ${val} no Protheus.`, "warning");
    } finally {
      setIsAdding(false);
    }
  };

  const removeMatricula = (matriculaId) => {
    setMatriculasList(matriculasList.filter(m => m.matricula !== matriculaId));
  };

  const handleSearch = async () => {
    if (matriculasList.length === 0) {
      Swal.fire("Atenção", "Adicione ao menos uma matrícula na lista.", "warning");
      return;
    }
    setIsGenerating(true);
    try {
      const novosContratos = [];

      for (const item of matriculasList) {
        try {
            const data = item.fullData;
            
            // Tratamento de datas do Protheus (YYYYMMDD)
            const admissaoStr = data.admissao || dayjs().format("YYYYMMDD");
            let admissaoDate = dayjs();
            if (admissaoStr.length === 8) {
                const ano = admissaoStr.substring(0, 4);
                const mes = admissaoStr.substring(4, 6);
                const dia = admissaoStr.substring(6, 8);
                admissaoDate = dayjs(`${ano}-${mes}-${dia}`);
            }
            
            novosContratos.push({
                empresa: selectedEmpresa,
                funcionario: {
                  matricula: data.matricula,
                  nome: data.nome,
                  cpf: data.cpf ? data.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : "",
                  rg: data.rg,
                  endereco: `${data.endereco || ""} ${data.complemento || ""}`.trim(),
                  bairro: data.bairro,
                  cidadeUf: `${data.cidade || ""}-${data.uf || ""}`,
                  cep: data.cep ? data.cep.replace(/(\d{5})(\d{3})/, "$1-$2") : "",
                  ctps: data.ctps,
                  serie: data.serie,
                  funcao: data.funcao || "NÃO INFORMADA",
                  setor: data.setor || "NÃO INFORMADO",
                  salario: parseFloat(data.salario || 0),
                  salarioExtenso: extenso(data.salario || 0, { mode: 'currency' }).toUpperCase(),
                  admissao: admissaoDate.format("DD/MM/YYYY"),
                  exp45: admissaoDate.add(45, 'day').format("DD/MM/YYYY"),
                  exp90: admissaoDate.add(90, 'day').format("DD/MM/YYYY"),
                  dataProrrogacao: admissaoDate.add(45, 'day').format("DD/MM/YYYY")
                }
            });
        } catch (error) {
            console.error(`Erro ao processar matrícula ${item.matricula}:`, error);
        }
      }

      if (novosContratos.length > 0) {
          setContractsList(novosContratos);
          Swal.fire({
            title: "Lote Gerado!",
            icon: "success",
            timer: 1000,
            showConfirmButton: false
          });
      } else {
          Swal.fire("Erro", "Nenhum contrato pôde ser gerado. Verifique as matrículas.", "error");
      }
    } catch (error) {
      console.error("Erro geral no processamento:", error);
      Swal.fire("Erro", "Erro ao processar a geração dos contratos.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = async (data, index) => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    
    const loadingSwal = Swal.fire({
      title: 'Gerando PDF...',
      text: 'Aguarde um momento enquanto formatamos as páginas do contrato.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      // Começa com retrato
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      const container = document.getElementById(`contract-group-${index}`);
      const pages = container.querySelectorAll('.print-page');

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const isLandscape = page.classList.contains('landscape-page');
        
        // Estilo temporário para captura perfeita
        const originalWidth = page.style.width;
        const originalHeight = page.style.height;
        const originalMargin = page.style.margin;
        const originalPosition = page.style.position;
        const originalZIndex = page.style.zIndex;

        // Forçar dimensões físicas exatas na tela para o motor de captura
        // A4 Port: 794px, Land: 1123px (a 96dpi)
        page.style.width = isLandscape ? '1123px' : '794px';
        page.style.height = isLandscape ? '794px' : '1123px';
        page.style.minHeight = isLandscape ? '794px' : '1123px';
        page.style.margin = '0';
        page.style.position = 'relative';
        page.style.zIndex = '1000';

        // Pequeno delay para o browser processar a mudança de estilo
        await new Promise(resolve => setTimeout(resolve, 100));

        // Capturar imagem da página
        const imgData = await htmlToImage.toPng(page, { 
          quality: 1.0, 
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          width: isLandscape ? 1123 : 794,
          height: isLandscape ? 794 : 1123
        });

        // Restaurar estilo original imediatamente após captura
        page.style.width = originalWidth;
        page.style.height = originalHeight;
        page.style.minHeight = isLandscape ? '21cm' : '29.7cm';
        page.style.margin = originalMargin;
        page.style.position = originalPosition;
        page.style.zIndex = originalZIndex;

        // Adicionar página ao PDF (exceto a primeira que já existe no construtor)
        if (i > 0) {
          pdf.addPage('a4', isLandscape ? 'l' : 'p');
        } else if (isLandscape) {
          // Caso a primeira página seja paisagem (não é o caso aqui)
          pdf.setPage(1);
          pdf.addPage('a4', 'l');
          pdf.deletePage(1);
        }

        // Definir dimensões mm para o PDF (A4 = 210 x 297)
        const pdfW = isLandscape ? 297 : 210;
        const pdfH = isLandscape ? 210 : 297;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH, undefined, 'FAST');
      }

      pdf.save(`CONTRATO_${data.funcionario.matricula}_${data.funcionario.nome.split(' ')[0]}.pdf`);
      Swal.close();
    } catch (error) {
      console.error("Erro detalhado ao gerar PDF:", error);
      Swal.fire("Erro", "Falha na geração do PDF. Tente novamente.", "error");
    }
  };

  const downloadAll = async () => {
    for (let i = 0; i < contractsList.length; i++) {
      await handleDownloadPDF(contractsList[i], i);
    }
  };

  const Variable = ({ children, bold = true }) => (
    <span className={bold ? "font-bold" : ""}>{children || "_______"}</span>
  );

  const SignSection = ({ label1, label2, subLabel1 = "Assinatura", subLabel2 = "Assinatura", centered = true }) => (
    <div className={`pt-20 space-y-20 w-full ${centered ? "flex flex-col items-center" : ""}`}>
      <div className="flex flex-col items-center">
        <div className="w-[450px] border-b border-black mb-1"></div>
        <div className="text-center font-bold text-[10pt] uppercase">{label1}</div>
        <div className="text-center text-[9pt]">{subLabel1}</div>
      </div>
      <div className="flex flex-col items-center">
        <div className="w-[450px] border-b border-black mb-1"></div>
        <div className="text-center font-bold text-[10pt] uppercase">{label2}</div>
        <div className="text-center text-[9pt]">{subLabel2}</div>
      </div>
    </div>
  );

  const PaginaClausulas = ({ data }) => (
    <>
      <section className="print-page font-calibri text-[11pt]">
        <h2 contentEditable suppressContentEditableWarning className="text-center font-bold uppercase mb-8 focus:outline-none hover:bg-yellow-50/80 focus:ring-1 focus:ring-yellow-200 rounded-lg p-1 -m-1 transition-all cursor-text">CONTRATO DE TRABALHO A TÍTULO DE EXPERIÊNCIA</h2>
        <div contentEditable suppressContentEditableWarning className="space-y-4 text-justify focus:outline-none hover:bg-yellow-50/80 focus:ring-1 focus:ring-yellow-200 rounded-lg p-2 -mx-2 transition-all cursor-text">
          <p>EMPREGADOR: <Variable>{data.empresa.nome}</Variable>, inscrita no CNPJ sob o nº <Variable>{data.empresa.cnpj}</Variable>, com sede em <Variable>{data.empresa.endereco}</Variable>, <Variable>{data.empresa.cidadeUf}</Variable>, CEP: <Variable>{data.empresa.cep}</Variable>.</p>
          <p>EMPREGADO: <Variable>{data.funcionario.nome}</Variable>, portador(a) do CPF nº <Variable>{data.funcionario.cpf}</Variable> e RG nº <Variable>{data.funcionario.rg}</Variable>, residente em <Variable>{data.funcionario.endereco}</Variable>, <Variable>{data.funcionario.bairro}</Variable>, <Variable>{data.funcionario.cidadeUf}</Variable> , CEP: <Variable>{data.funcionario.cep}</Variable>.</p>
          <p>As partes acima qualificadas celebram o presente Contrato de Trabalho em CONTRATO DE TRABALHO A TÍTULO DE EXPERIÊNCIA, regido pelas seguintes cláusulas:</p>
          <p><strong>CLÁUSULA 1ª – DO OBJETO</strong><br />O presente contrato tem como objeto a prestação de serviços pelo EMPREGADO ao EMPREGADOR, na função de <Variable>{data.funcionario.funcao}</Variable>, com atividades descritas no Formulário de Descrição de cargo em anexo deste contrato, sendo aplicadas as normas da Consolidação das Leis do Trabalho (CLT).</p>
          <p><strong>CLÁUSULA 2ª – DO PERÍODO DE EXPERIÊNCIA</strong><br />O presente contrato terá duração de 45 (quarenta e cinco) dias, tendo seu início em <Variable>{data.funcionario.admissao}</Variable> e término em <Variable>{data.funcionario.exp45}</Variable>, podendo ser prorrogado por mais 45 dias, sendo celebrado para as partes verificarem reciprocamente, a conveniência ou não de se vincularem em caráter definitivo a um contrato de trabalho.</p>
          <p><strong>CLÁUSULA 3ª – DA JORNADA DE TRABALHO</strong><br />O Horário de trabalho será anotado na sua ficha de registro e a eventual redução da jornada, por determinação da EMPREGADORA, não inovará este ajuste permanecendo sempre integra a <Variable>OBRIGAÇÃO DO EMPREGADO</Variable> de cumprir o horário que lhe for determinado, observando o limite legal.<br />Obriga-se o empregado a prestar serviços em horas extraordinárias, sempre que lhe for determinado pela EMPREGADORA, na forma prevista em lei. Na hipótese desta faculdade pela EMPREGADORA, o EMPREGADO, receberá as horas extraordinárias com o acréscimo legal, salvo no caso de compensação em outro dia.<br />Aceita o EMPREGADO, expressamente, a condição de prestar serviços em qualquer dos turnos de trabalho, isto é, durante o dia ou à noite, desde que sem simultaneidade, observados as regulamentações legais.</p>
          <p><strong>CLÁUSULA 4ª – DA REMUNERAÇÃO</strong><br />Fica o EMPREGADO admitido no quadro de funcionários da EMPREGADORA, para exercer a função de <Variable>{data.funcionario.funcao}</Variable>, mediante a remuneração de R$ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<Variable>{data.funcionario.salario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Variable> ( &nbsp;<Variable>{data.funcionario.salarioExtenso}</Variable> ), por MÊS.</p>
          <p><strong>CLÁUSULA 5ª – DA RESCISÃO</strong><br />Opera-se a rescisão do presente contrato de trabalho pela decorrência do prazo ou por vontade do EMPREGADO ou da EMPREGADORA, ocorrendo justa causa nenhuma indenização é devida. Rescindido antes do prazo pela EMPREGADORA, fica esta obrigada <br />a pagar 50% dos salários devidos até o final deste contrato (metade do tempo combinado restante) conforme ART. 479 CLT nenhum AVISO PRÉVIO é devido.</p>
        </div>
      </section>

      <section className="print-page font-calibri text-[11pt]">
        <div contentEditable suppressContentEditableWarning className="space-y-4 text-justify focus:outline-none hover:bg-yellow-50/80 focus:ring-1 focus:ring-yellow-200 rounded-lg p-2 -mx-2 transition-all cursor-text">
          <p><strong>CLÁUSULA 6ª – DA PROTEÇÃO DE DADOS PESSOAIS (LGPD)</strong><br />O EMPREGADO consente e autoriza o EMPREGADOR a realizar o tratamento de seus dados pessoais, incluindo dados sensíveis, nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), para finalidades relacionadas à execução deste contrato, cumprimento de obrigações legais e regulatórias, e gestão de processos internos, como folha de pagamento, benefícios e comunicação.</p>
          <p>Parágrafo único: O EMPREGADOR compromete-se a adotar medidas de segurança para proteger os dados pessoais do EMPREGADO contra acessos não autorizados, perda ou divulgação inadequada.</p>
          <p><strong>CLÁUSULA 7ª – DO USO DE IMAGEM</strong><br />O EMPREGADO autoriza o EMPREGADOR a utilizar sua imagem em materiais institucionais, como fotos, videos ou outras formas de divulgação relacionadas a eventos, campanhas ou comunicação interna, desde que respeitada a finalidade empresarial.</p>
          <p>Parágrafo único: A autorização para o uso de imagem é válida durante o período de vigência do contrato e poderá ser revogada mediante solicitação formal do EMPREGADO.</p>
          <p><strong>CLÁUSULA 8ª – DO USO DE COMUNICAÇÃO DIGITAL</strong><br />O EMPREGADO concorda em receber comunicações do EMPREGADOR por meio de aplicativos de mensagens instantâneas (como WhatsApp) e e-mails, exclusivamente para fins relacionados às atividades laborais, informações institucionais e de segurança.</p>
          <p>Parágrafo único: O EMPREGADO compromete-se a utilizar esses canais com responsabilidade, seguindo a política de comunicação digital da empresa, e poderá solicitar alterações nos meios de contato caso necessário.</p>
          <p><strong>CLÁUSULA 9ª – DAS DISPOSIÇÕES FINAIS</strong><br />Este contrato não gera vínculo empregatício ao término do período de experiência, salvo prorrogação expressa ou conversão para contrato por prazo indeterminado.</p>
          <p>As partes elegem o foro da Comarca de Belém, Estado do Pará, para dirimir quaisquer controvérsias decorrentes deste contrato.</p>
          <p>E, por estarem de acordo, as partes assinam este contrato em duas vias de igual teor e forma.</p>
          <div className="pt-12 text-right">Belém/PA, <Variable>{data.funcionario.admissao}</Variable>.</div>
          <SignSection label1={data.empresa.nome} label2={data.funcionario.nome} />
        </div>
      </section>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white pb-20">
      <div className="bg-white border-b sticky top-0 z-50 px-6 py-4 print:hidden flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (contractsList.length > 0) {
                setContractsList([]);
              } else {
                navigate("/rh");
              }
            }} 
            className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 font-semibold group transition-colors p-2 hover:bg-slate-50 rounded-xl"
          >
            <span className="material-symbols-rounded text-2xl group-hover:-translate-x-1 duration-200">arrow_back</span>
          </button>
          <h1 className="font-bold text-slate-800 text-lg tracking-tight">Contrato de Trabalho</h1>
        </div>
        <div className="flex gap-4">
          {contractsList.length > 0 && (
            <>
              <button 
                onClick={() => setContractsList([])} 
                className="px-6 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors text-sm uppercase tracking-wider"
              >
                Voltar à Pesquisa
              </button>
              <button 
                onClick={downloadAll} 
                className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all active:scale-95 text-sm uppercase tracking-wider flex items-center gap-2"
              >
                <span className="material-symbols-rounded text-lg">download</span>
                Baixar Todos (PDF)
              </button>
            </>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 print:p-0">
         {contractsList.length === 0 ? (
          <div className="bg-white p-8 rounded-[32px] shadow-2xl max-w-2xl mx-auto border border-slate-100 animate-in fade-in zoom-in-95 duration-300">
            <div className="text-center mb-8">
              <div className="bg-indigo-100 w-16 h-16 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto mb-4">
                <span className="material-symbols-rounded text-3xl">group_add</span>
              </div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Gerador de Contratos em Lote</h2>
              <p className="text-slate-400 text-sm font-medium">Adicione as matrículas dos colaboradores para gerar os documentos.</p>
            </div>

            <div className="space-y-6">
              {/* Seletor de Empresa */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Empresa Contratante</label>
                <div className="grid grid-cols-2 gap-3">
                  {empresas.map((emp) => (
                    <button
                      key={emp.cnpj}
                      onClick={() => setSelectedEmpresa(emp)}
                      className={`p-3 rounded-xl border-2 transition-all text-left group ${
                        selectedEmpresa.cnpj === emp.cnpj 
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' 
                        : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'
                      }`}
                    >
                      <p className={`text-[10px] font-black tracking-tight uppercase ${selectedEmpresa.cnpj === emp.cnpj ? 'text-indigo-600' : 'text-slate-400'}`}>
                        {emp.nome.split(' ')[0]}
                      </p>
                      <p className={`text-xs font-bold truncate ${selectedEmpresa.cnpj === emp.cnpj ? 'text-indigo-900' : 'text-slate-600'}`}>
                        {emp.nome}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Input de Matrícula */}
              <form onSubmit={addMatricula} className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Digitar Matrícula</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">person_search</span>
                    <input 
                      type="text"
                      placeholder="Ex: 1012" 
                      value={currentMatricula} 
                      onChange={(e) => setCurrentMatricula(e.target.value)} 
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300 shadow-inner" 
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={isAdding}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white p-4 rounded-2xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center"
                  >
                    {isAdding ? (
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <span className="material-symbols-rounded">add</span>
                    )}
                  </button>
                </div>
              </form>

              {/* Lista de Matrículas Adicionadas */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lista de Espera</label>
                  <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{matriculasList.length} Matrículas</span>
                </div>
                
                <div className="bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100 p-4 min-h-[120px] flex flex-wrap gap-2 content-start">
                  {matriculasList.length === 0 ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 py-4">
                      <span className="material-symbols-rounded text-4xl mb-1">list_alt</span>
                      <p className="text-[10px] font-bold uppercase tracking-tighter">Nenhuma matrícula adicionada</p>
                    </div>
                  ) : (
                    matriculasList.map((item) => (
                      <div 
                        key={item.matricula}
                        className="bg-white border border-slate-200 pl-4 pr-2 py-2 rounded-xl flex items-center gap-3 shadow-sm group hover:border-red-200 hover:bg-red-50 transition-all animate-in zoom-in-95"
                      >
                        <div className="flex flex-col">
                           <span className="text-xs font-black text-slate-700 group-hover:text-red-700">Mat: {item.matricula}</span>
                           <span className="text-[10px] font-bold text-slate-500 uppercase truncate max-w-[140px]" title={item.nome}>{item.nome}</span>
                        </div>
                        <button 
                          onClick={() => removeMatricula(item.matricula)}
                          className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-colors"
                        >
                          <span className="material-symbols-rounded text-sm">close</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <button 
                onClick={handleSearch} 
                disabled={isGenerating || matriculasList.length === 0} 
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Gerando Documentos...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-rounded">article</span>
                    Gerar {matriculasList.length > 0 ? `(${matriculasList.length})` : ''} Contratos
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div id="printable-contract">
            {contractsList.map((data, index) => (
              <div key={index} id={`contract-group-${index}`} className="mb-20 last:mb-0 relative group">
                {/* Overlay de Ações por Contrato */}
                <div className="absolute -left-12 top-0 flex flex-col gap-2 print:hidden opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleDownloadPDF(data, index)}
                    className="p-2 bg-white shadow-md rounded-lg text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all"
                    title="Baixar este contrato"
                  >
                    <span className="material-symbols-rounded">download</span>
                  </button>
                </div>
                
                <PaginaClausulas data={data} />
                <PaginaClausulas data={data} />

                {[1, 2].map(n => (
                  <section key={n} className="print-page font-times text-[11.5pt]">
                    <h2 contentEditable suppressContentEditableWarning className="text-center font-bold uppercase mb-8 focus:outline-none hover:bg-yellow-50/80 focus:ring-1 focus:ring-yellow-200 rounded-lg p-1 -m-1 transition-all cursor-text">CONTRATO DE TRABALHO A TITULO DE EXPERIÊNCIA</h2>
                    <h3 contentEditable suppressContentEditableWarning className="text-center font-bold uppercase mb-20 focus:outline-none hover:bg-yellow-50/80 focus:ring-1 focus:ring-yellow-200 rounded-lg p-1 -m-1 transition-all cursor-text">TERMO DE PRORROGAÇÃO</h3>
                    <div contentEditable suppressContentEditableWarning className="space-y-12 focus:outline-none hover:bg-yellow-50/80 focus:ring-1 focus:ring-yellow-200 rounded-lg p-2 -mx-2 transition-all cursor-text">
                      <p>Prorroga-se este contrato por mais 45 dias a vencer-se em: <Variable>{data.funcionario.exp90}</Variable>.</p>
                      <p>Belém/PA <Variable>{data.funcionario.dataProrrogacao}</Variable>.</p>
                    </div>
                    <SignSection label1={data.empresa.nome} label2={data.funcionario.nome} />
                    <div className="pt-24 space-y-4">
                      <div className="flex gap-1 items-start">
                        <span>TESTEMUNHAS:</span>
                        <div className="flex-1 border-b border-black h-5"></div>
                      </div>
                      <div className="w-full border-b border-black h-5 ml-28"></div>
                    </div>
                  </section>
                ))}

                <section className="print-page font-times text-[11pt] landscape-page">
                  <div className="grid grid-cols-2 gap-x-10 mb-2 font-times text-[10pt]">
                    <div>Nome do Funcionário: <Variable>{data.funcionario.nome}</Variable></div>
                    <div>Função: <Variable>{data.funcionario.funcao}</Variable></div>
                    <div>Setor: <Variable>{data.funcionario.setor}</Variable></div>
                    <div className="flex gap-4">
                      <div>Data de Admissão: <Variable>{data.funcionario.admissao}</Variable></div>
                      <div>Data de Demissão: ____/____/____</div>
                    </div>
                  </div>
                  <h3 contentEditable suppressContentEditableWarning className="text-center font-bold uppercase underline mb-8 font-times text-[14pt] focus:outline-none hover:bg-yellow-50/80 focus:ring-1 focus:ring-yellow-200 rounded-lg p-1 -m-1 transition-all cursor-text">TERMO DE RESPONSABILIDADE</h3>
                  <div contentEditable suppressContentEditableWarning className="space-y-4 text-justify text-[10.5pt] font-times focus:outline-none hover:bg-yellow-50/80 focus:ring-1 focus:ring-yellow-200 rounded-lg p-2 -mx-2 transition-all cursor-text">
                    <p>Declaro que recebi, em perfeito estado e para uso exclusivo no local de horário de trabalho determinado pela empresa, as peças do Uniforme e/ou Equipamentos de Proteção Individual – (EPI) relacionados neste formulário.</p>
                    <p>Estou ciente de que o Uniforme e/ou os Equipamentos de Proteção Individual (EPI) são de uso exclusivo e obrigatório em serviço e a não utilização constitui ato de indisciplina, sujeito às sanções da Lei em vigor.</p>
                    
                    <div className="grid grid-cols-2 gap-10 mt-6 pt-4">
                      <div className="space-y-1 text-[9pt] leading-tight">
                        <strong className="block mb-2">NR 01 – “DISPOSIÇÕES GERAIS”</strong>
                        Item 1.8. - Cabe ao empregado:<br />
                        a) cumprir as disposições legais e regulamentares sobre segurança e medicina do trabalho;<br />
                        b) usar o EPI fornecido pelo empregador;<br />
                        c) submeter-se aos exames médicos previstos nas Normas Regulamentadoras - NR;<br />
                        d) colaborar com a empresa na aplicação das Normas Regulamentadoras – NR.<br />
                        1.8.1. Constitui ato faltoso a recusa injustificada do empregado ao cumprimento do disposto no item anterior.
                      </div>
                      <div className="space-y-1 text-[9pt] leading-tight">
                        <strong className="block mb-2">NR 06 – “EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL – EPI”</strong>
                        6.7.1. Cabe ao empregado quanto ao EPI a:<br />
                        a) usar, utilizando-lo apenas para a finalidade a que se destina;<br />
                        b) responsabilizar-se pela guarda e conservação;<br />
                        c) comunicar ao empregador qualquer alteração que o torne impróprio para uso; e,<br />
                        d) cumprir as determinações do empregador sobre o uso adequado.
                      </div>
                    </div>

                    <div className="space-y-3 mt-6 text-[10pt]">
                      <p>Comprometo-me, a comunicar ao meu encarregado qualquer alteração nas peças do uniforme e/ou nos Equipamentos de Proteção Individual (EPI) que os tornem parcial ou totalmente danificados ou desgaste natural da utilização, visando à substituição dos mesmos tão logo for constatado.</p>
                      <p>Obrigo-me a apresentar, todas as vezes que a Empresa solicitar, o Uniforme e/ou nos Equipamentos de Proteção Individual (EPI) para a verificação.</p>
                      <p>Autorizo a Empresa a descontar em folha de pagamento ou Rescisão de contrato as peças do Uniforme e/ou Equipamentos de Proteção Individuais (EPI) não devolvidos, extraviados ou danificados por uso inadequado.</p>
                      <p>Declaro ainda ter recebido treinamento e orientação sobre o uso adequado, guarda e conservação dos mesmos, e orientações sobre os danos da exposição ao ruído intenso.</p>
                    </div>
                  </div>
                  <div className="pt-20 flex justify-between items-end w-full">
                    <div className="flex flex-col items-center">
                      <div className="w-32 border-b border-black mb-1"></div>
                      <div className="text-[9pt]">Data</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-[450px] border-b border-black mb-1"></div>
                      <div className="text-center font-bold uppercase text-[10pt]">{data.funcionario.nome}</div>
                      <div className="text-[9pt]">Assinatura</div>
                    </div>
                  </div>
                </section>

                <section className="print-page font-times text-[10pt] landscape-page">
                   <table className="w-full border-collapse border border-black text-[9pt]">
                     <thead>
                       <tr className="font-bold text-center bg-slate-50/50">
                         <th className="border border-black px-1 py-1 w-[25%]">Descrição do EPI</th>
                         <th className="border border-black px-1 py-1 w-[10%]">Nº do CA</th>
                         <th className="border border-black px-1 py-1 w-[10%]">Quant. Entregue</th>
                         <th className="border border-black px-1 py-2 w-[12%]">Data da Entrega</th>
                         <th className="border border-black px-1 py-1 w-[28%]">Assinatura do Colaborador</th>
                         <th className="border border-black px-1 py-1 w-[15%]">Data da Devolução</th>
                       </tr>
                     </thead>
                     <tbody>
                       {[...Array(18)].map((_, i) => (<tr key={i} className="h-6"><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td></tr>))}
                     </tbody>
                   </table>
                </section>

                <section className="print-page font-courier text-[9pt] px-4 py-8">
                  <div contentEditable suppressContentEditableWarning className="font-courier text-[9pt] leading-tight text-justify focus:outline-none hover:bg-yellow-50/80 focus:ring-1 focus:ring-yellow-200 rounded-lg p-2 -mx-2 transition-all cursor-text">
                    <h3 className="text-center font-bold mb-8 uppercase">VALE TRANSPORTE / DECLARAÇÃO / TERMO DE COMPROMISSO</h3>
                    
                    <h4 className="text-center font-bold mb-6 tracking-[0.2em] uppercase">E S C L A R E C I M E N T O S &nbsp;&nbsp; L E G A I S</h4>
                    
                    <div className="space-y-1 mb-6">
                      <p>1 - O Vale Transporte será pago pelo beneficiário até o limite de 6% (seis por cento) de seu salário (excluídos de quaisquer adicionais ou vantagens) e pelo empregador, no que exceder a esse limite.</p>
                      <p>2 - No caso em que o valor total dos valores recebidos for inferior a 6% (seis por cento) do salário, o empregado poderá optar pelo recebimento antecipado do Vale-Transporte, cujo valor será integralmente descontado por ocasião do pagamento do respectivo salário.</p>
                      <p>3 - Não é permitido substituir o fornecimento do Vale Transporte por antecipação em dinheiro ou qualquer outra forma, salvo no caso de falta ou insuficiência de estoque de Vale-Transporte.</p>
                    </div>

                    <h4 className="text-center font-bold mb-4 uppercase">DADOS DO EMPREGADO</h4>
                    <p className="mb-6">Nome: <Variable>{data.funcionario.nome}</Variable> &nbsp;&nbsp;&nbsp; CTPS nº <Variable>{data.funcionario.ctps}</Variable> Série <Variable>{data.funcionario.serie}</Variable></p>

                    <h4 className="text-center font-bold mb-2 uppercase">OPÇÃO PELO SISTEMA DO VALE-TRANSPORTE</h4>
                    <p className="mb-4">O Vale-Transporte é um direito do trabalhado. Faça sua opção por recebe-lo ou não, assinando um dos quadros abaixo:</p>
                    <div className="flex justify-center gap-20 mb-6 font-bold">
                      <div>( &nbsp; ) SIM</div>
                      <div>( &nbsp; ) NÃO</div>
                    </div>

                    <h4 className="text-center font-bold mb-4 uppercase">DECLARAÇÃO</h4>
                    <p className="mb-2">Para fazer uso do sistemas do Vale-Transporte, declaro:</p>
                    <div className="space-y-2 mb-6">
                      <p>1 - Residir na rua: __________________________________________________________________________</p>
                      <p>2 - Utilizar o(s) seguinte(s) meio(s) de transporte de minha residência ao trabalho e vice-versa:</p>
                      <p>&nbsp;&nbsp;&nbsp;&nbsp;( &nbsp; ) Ônibus &nbsp;&nbsp; ( &nbsp; ) Trem &nbsp;&nbsp; ( &nbsp; ) Outros (especificar): ________________________________</p>
                      <p>2.1 No perímetro urbano:</p>
                      <p>&nbsp;&nbsp;&nbsp;&nbsp;( &nbsp; ) Municipal &nbsp;&nbsp; ( &nbsp; ) Intermunicipal &nbsp;&nbsp; ( &nbsp; ) Interestadual</p>
                      <p>2.2 Utilizando diariamente _________________ conduções para locomover-me de minha residência ao trabalho e vice-versa.</p>
                    </div>

                    <h4 className="text-center font-bold mb-4 uppercase">TERMO DE COMPROMISSO / AUTORIZAÇÃO PARA DESCONTO</h4>
                    <div className="space-y-2 mb-8 text-justify">
                      <p>Comprometo-me a atualizar as informações anualmente ou sempre que ocorram alterações, e atualizar os Vales-Transportes que me forem concedidos exclusivamente no percurso residência-trabalho e vice-versa.</p>
                      <p>Estou ciente de que, na hipótese de infringir tal compromisso, a empresa poderá dispensar-me por justa causa, nos termos do art. 7º parágrafo 3º do decreto nº 95247/87.</p>
                      <p>Autorizo a empresa descontar mensalmente de meus vencimentos, até o limite de 6% (seis por cento) do meu salário, o valor destinado a cobrir a fornecimento de Vales-Transporte por mim utilizados.</p>
                    </div>

                    <div className="font-bold mb-8">BELÉM, <Variable>{data.funcionario.admissao}</Variable></div>

                    <div className="flex justify-between items-start pt-4">
                      <div className="flex flex-col items-center">
                        <div className="w-72 border-b border-black mb-1"></div>
                        <div className="text-[9pt] font-bold uppercase">{data.funcionario.nome}</div>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-72 border-b border-black mb-1"></div>
                        <div className="text-[9pt] font-bold uppercase">{data.empresa.nome}</div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Nova Página 10 - Termo de Ponto Eletrônico */}
                <section className="print-page font-aptos text-[11pt] px-8 py-10">
                  <div contentEditable suppressContentEditableWarning className="font-aptos text-[11pt] leading-relaxed text-justify focus:outline-none hover:bg-yellow-50/80 focus:ring-1 focus:ring-yellow-200 rounded-lg p-4 -mx-4 transition-all cursor-text space-y-6">
                    
                    <div className="text-center font-bold mb-10 leading-tight">
                      TERMO DE CIÊNCIA E ADESÃO AO SISTEMA DE REGISTRO<br />
                      DE PONTO ELETRÔNICO PELO CELULAR
                    </div>

                    <p>
                      Pelo presente instrumento, eu <strong><Variable>{data.funcionario.nome}</Variable></strong>, portador(a) do CPF nº <Variable>{data.funcionario.cpf}</Variable> e RG nº <Variable>{data.funcionario.rg}</Variable>, <strong>empregado(a) da empresa <Variable>{data.empresa.nome}</Variable></strong>, inscrita no CNPJ sob o nº <Variable>{data.empresa.cnpj}</Variable>, declaro, para os devidos fins, que:
                    </p>

                    <ol className="list-decimal pl-6 space-y-4">
                      <li><strong>Tomei ciência</strong> de que, conforme previsto na <strong>Cláusula Trigésima Primeira do Acordo Coletivo de Trabalho</strong> e em conformidade com a <strong>Portaria nº 671/2021 do Ministério do Trabalho e Emprego</strong>, a empresa disponibiliza o uso de <strong>aplicativo específico e seguro para registro eletrônico de ponto pelo celular</strong>, devidamente autorizado e gerenciado pela área de Recursos Humanos.</li>
                      
                      <li><strong>Autorizo o uso do referido aplicativo</strong> em meu dispositivo celular pessoal, comprometendo-me a utilizá-lo exclusivamente para o registro fiel e pontual de meus horários de <strong>entrada, saída e intervalos</strong> durante a jornada de trabalho.</li>
                      
                      <li>
                        Declaro estar ciente de que:
                        <ul style={{ listStyleType: 'circle' }} className="pl-8 mt-2 space-y-2">
                          <li>O registro deve ser feito <strong>no local efetivo de trabalho</strong> ou conforme orientação expressa da empresa;</li>
                          <li><strong>É de minha responsabilidade</strong> garantir a precisão das marcações e a integridade das informações registradas;</li>
                          <li>Qualquer <strong>falha técnica, ausência de marcação ou irregularidade</strong> deverá ser comunicada <strong>imediatamente ao Departamento de Recursos Humanos</strong>;</li>
                          <li>O uso indevido do aplicativo, bem como o <strong>registro de ponto por terceiros</strong>, constitui <strong>falta grave</strong>, passível de medidas disciplinares, inclusive <strong>dispensa por justa causa</strong>.</li>
                        </ul>
                      </li>

                      <li>Reconheço que o sistema de ponto eletrônico pelo celular constitui um <strong>instrumento de controle de jornada</strong> oficial da empresa e possui <strong>validade legal</strong> para todos os efeitos trabalhistas.</li>
                    </ol>

                    <p>Por fim, declaro estar plenamente ciente e de acordo com todas as regras estabelecidas neste termo, comprometendo-me a cumpri-las integralmente.</p>

                    <div className="text-center font-bold mt-10 mb-20">
                      Local e Data: Belém, {dayjs().date()} de {['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'][dayjs().month()]} de {dayjs().year()}
                    </div>

                    <div className="flex flex-col items-center pt-8">
                      <div className="w-[450px] border-b border-black mb-2"></div>
                      <div className="text-center font-bold uppercase">{data.funcionario.nome}</div>
                      <div className="text-center font-bold uppercase">CPF {data.funcionario.cpf}</div>
                    </div>
                    
                  </div>
                </section>

              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .font-aptos { font-family: Aptos, "Aptos Display", Calibri, sans-serif !important; }
        .font-calibri { font-family: Calibri, sans-serif !important; }
        .font-times { font-family: "Times New Roman", Times, serif !important; }
        .font-courier { font-family: "Courier New", Courier, monospace !important; }
        @page { size: portrait; margin: 1cm; }
        @page deitada { size: landscape; margin: 1cm; }

        @media print {
          /* Força o contrato a ser a única coisa visível e a quebrar páginas */
          html, body {
            overflow: visible !important;
            height: auto !important;
            background: white !important;
          }

          body * { visibility: hidden !important; }
          #printable-contract, #printable-contract * { visibility: visible !important; }
          
          #printable-contract { 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 100% !important; 
            display: block !important;
            background: white !important;
          }

          .landscape-page { 
            page: deitada !important; 
          }

          .print-page { 
            page-break-after: always !important; 
            break-after: page !important;
            display: flex !important;
            flex-direction: column;
            width: 210mm;
            min-height: 297mm;
            padding: 1.5cm;
            background: white !important;
            box-sizing: border-box;
          }

          .landscape-page.print-page {
            width: 297mm !important;
            min-height: 210mm !important;
          }
        }
        
        /* Ajuste para visualização na tela antes de capturar */
        .print-page {
            background: white;
            width: 21cm;
            min-height: 29.7cm;
            margin: 0 auto 2cm auto;
            padding: 1.5cm;
            box-shadow: 0 0 20px rgba(0,0,0,0.05);
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
        }
        
        .landscape-page.print-page {
            width: 29.7cm !important;
            min-height: 21cm !important;
        }
      `}</style>
    </div>
  );
};

export default Contrato;
