import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import Swal from "sweetalert2";

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

  const [matricula, setMatricula] = useState("");
  const [dataInicio, setDataInicio] = useState(dayjs().startOf('month').format("YYYY-MM-DD"));
  const [dataFim, setDataFim] = useState(dayjs().format("YYYY-MM-DD"));
  const [selectedEmpresa, setSelectedEmpresa] = useState(empresas[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [contractsList, setContractsList] = useState([]);

  const handleSearch = async () => {
    const listaMatriculas = matricula.split(/[\s,;]+/).filter(m => m.trim() !== "");
    if (listaMatriculas.length === 0) {
      Swal.fire("Atenção", "Por favor, insira ao menos uma matrícula.", "warning");
      return;
    }
    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const novosContratos = listaMatriculas.map((mat, index) => ({
        empresa: selectedEmpresa,
        funcionario: {
          matricula: mat.trim(),
          nome: "FRANCISCO PEREIRA DA SILVA",
          cpf: "605.494.672-20",
          rg: "2643149",
          endereco: "PSG. ELVIRA, ESTRADA DO UTINGA, 340,  ",
          bairro: "CURIO UTINGA",
          cidadeUf: "BELEM-PA",
          cep: "66000-001",
          ctps: "6054946",
          serie: "7220 -RN",
          funcao: "ASSISTENTE DE DP III",
          setor: "DEPTO. DE PESSOAL",
          salario: 3302.08,
          salarioExtenso: "TRES MIL, TREZENTOS E DOIS REAIS E OITO CENTAVOS",
          admissao: "09/04/2026",
          exp45: "23/05/2026",
          exp90: "07/07/2026",
          dataProrrogacao: "23/05/2026"
        }
      }));
      setContractsList(novosContratos);
      Swal.fire({
        title: "Lote Gerado!",
        icon: "success",
        timer: 1000,
        showConfirmButton: false
      });
    } catch (error) {
      Swal.fire("Erro", "Erro ao processar.", "error");
    } finally {
      setIsGenerating(false);
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
        <h2 className="text-center font-bold uppercase mb-8">CONTRATO DE TRABALHO A TÍTULO DE EXPERIÊNCIA</h2>
        <div className="space-y-4 text-justify">
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
        <div className="space-y-4 text-justify">
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
        <h1 className="font-bold text-slate-800">Contrato de Trabalho</h1>
        {contractsList.length > 0 && (
          <button onClick={() => window.print()} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold">Imprimir</button>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 print:p-0">
        {contractsList.length === 0 ? (
          <div className="bg-white p-10 rounded-3xl shadow-xl max-w-xl mx-auto text-center border">
            <h2 className="text-2xl font-bold mb-4">Gerador de Contratos</h2>
            <textarea placeholder="Matrículas" value={matricula} onChange={(e) => setMatricula(e.target.value)} className="w-full p-3 border rounded-xl min-h-[100px]" />
            <button onClick={handleSearch} disabled={isGenerating} className="w-full mt-4 py-4 bg-indigo-600 text-white rounded-xl font-bold uppercase">{isGenerating ? "Gerando..." : "Gerar"}</button>
          </div>
        ) : (
          <div id="printable-contract">
            {contractsList.map((data, index) => (
              <React.Fragment key={index}>
                <PaginaClausulas data={data} />
                <PaginaClausulas data={data} />

                {[1, 2].map(n => (
                  <section key={n} className="print-page font-times text-[11.5pt]">
                    <h2 className="text-center font-bold uppercase mb-8">CONTRATO DE TRABALHO A TITULO DE EXPERIÊNCIA</h2>
                    <h3 className="text-center font-bold uppercase mb-20">TERMO DE PRORROGAÇÃO</h3>
                    <div className="space-y-12">
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
                  <h3 className="text-center font-bold uppercase underline mb-8">TERMO DE RESPONSABILIDADE</h3>
                  <div className="space-y-4 text-justify text-[10.5pt]">
                    <p>Declaro que recebi, em perfeito estado e para uso exclusivo no local de horário de trabalho determinado pela empresa, as peças do Uniforme e/ou Equipamentos de Proteção Individual – (EPI) relacionados neste formulário.</p>
                    <p>Estou ciente de que o Uniforme e/ou os Equipamentos de Proteção Individual (EPI) são de uso exclusivo e obrigatório em serviço e a não utilização constitui ato de indisciplina, sujeito às sanções da Lei em vigor.</p>
                    <div className="grid grid-cols-2 gap-10 text-[9pt]">
                      <div className="space-y-1">
                        <strong>NR 01 – “DISPOSIÇÕES GERAIS”</strong><br />
                        Item 1.8. - Cabe ao empregado:<br />
                        a) cumprir as disposições legais e regulamentares sobre segurança<br />
                        b) a e medicina do trabalho;<br />
                        c) usar o EPI fornecido pelo empregador;<br />
                        d) submeter-se aos exames médicos previstos nas Normas Regulamentadoras - NR;<br />
                        e) colaborar com a empresa na aplicação das Normas Regulamentadoras – NR.
                      </div>
                      <div className="space-y-1">
                        <strong>NR 06 – “EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL – EPI”</strong><br />
                        6.7.1. Cabe ao empregado quanto ao EPI a:<br />
                        a) usar, utilizando-lo apenas para a finalidade a que se destina;<br />
                        b) responsabilizar-se pela guarda e conservação;<br />
                        c) comunicar ao empregador qualquer alteração que o torne impróprio para uso; e,<br />
                        d) cumprir as determinações do empregador sobre o uso adequado.
                      </div>
                    </div>
                    <p>Comprometo-me, a comunicar ao meu encarregado qualquer alteração nas peças do uniforme...</p>
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

                <section className="print-page font-courier text-[10pt] landscape-page">
                   <table className="w-full border-collapse border border-black text-[9pt]">
                     <thead>
                       <tr className="uppercase font-bold text-center">
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

                <section className="print-page font-courier text-[10pt]">
                  <div className="whitespace-pre font-courier text-[9pt] leading-tight">
{`              VALE TRANSPORTE / DECLARAÇAO / TERMO DE COMPROMISSO
 
 
                E S C L A R E C I M E N T O S  L E G A I S
                
 
1 - O Vale Transporte   será  pago  pelo  beneficiário  até  o  limite de  6%
    (seis  por cento)  de  seu  salário (excluidos  de  quaisquer  adicionais
    ou vantagens) e pelo empregador, no que exceder a esse limite.
2 - No caso  em  que  o  valor total dos valores  recebidos for inferior a 6%
    (seis por cento) do salário,  o  empregado  poderá optar pelo recebimento
    antecipado  do  Vale-Transporte,  cujo valor  será  integralmente descon-
    tado por ocasião do pagamento do respectivo salário.
3 - Nao é permitido substituir  o  fornecimento  do Vale Transporte por ante-
    cipaçao  em  dinheiro ou  qualquer outra forma, salvo no caso de falta ou
    insuficiência de estoque de Vale-Transporte.
 
                              DADOS DO EMPREGADO
Nome: ${data.funcionario.nome.padEnd(35)} CTPS nº ${data.funcionario.ctps} Série ${data.funcionario.serie}
 
                     OPÇÃO PELO SISTEMA DO VALE-TRANSPORTE
O Vale-Transporte  é  um direito do trabalhado. Faça  sua opção por recebe-lo
ou não, assinando um dos quadros abaixo:
            (  ) SIM                          (   ) NAO
 
                                 DECLARAÇÃO
 
Para fazer uso do sistemas do Vale-Transporte, declaro:
1 - Residir na rua: _________________________________________________________
2 - Utilizar o(s) seguinte(s) meio(s) de transporte de minha residência ao
    trabalho e vice-versa:
    (  ) Onibus  (  ) Trem  (  ) Outros (especificar):_______________________
2.1 No perimetro urbano:
    (  ) Municipal  (  ) Intermunicipal  (  ) Interestadual
2.2 Utilizando diariamente_______________conduções para locomover-me de minha
    residência ao trabalho e vice-versa.
 
              TERMO DE COMPROMISSO / AUTORIZAÇAO PARA DESCONTO
 
Comprometo-me a atualizar  as  informações anualmente  ou sempre  que ocorram
...
 
 
BELÉM, ${data.funcionario.admissao}
 
 
      ___________________________             ________________________________
      ${data.funcionario.nome.padEnd(30)}              ${data.empresa.nome.padEnd(20)}`}
                  </div>
                </section>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .font-calibri { font-family: Calibri, sans-serif !important; }
        .font-times { font-family: "Times New Roman", Times, serif !important; }
        .font-courier { font-family: "Courier New", Courier, monospace !important; }
        @page { size: portrait; margin: 1.2cm; }
        @page deitada { size: landscape; margin: 1cm; }

        @media print {
          .landscape-page { 
            page: deitada !important; 
            width: 100% !important;
          }

          body * { visibility: hidden !important; }
          #printable-contract, #printable-contract * { visibility: visible !important; }
          #printable-contract { position: absolute; left: 0; top: 0; width: 100%; display: block !important; }
          
          .print-page { 
            page-break-after: always !important; 
            display: block !important;
            background: white !important;
            margin: 0 !important;
            min-height: 25cm;
          }

          .landscape-page.print-page {
            min-height: 18cm !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Contrato;
