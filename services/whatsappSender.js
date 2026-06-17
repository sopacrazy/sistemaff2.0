/**
 * whatsappSender.js
 *
 * Camada de envio de mensagens WhatsApp.
 * Atualmente MOCKADA — simula sucesso após delay.
 *
 * QUANDO A META CLOUD API ESTIVER APROVADA, substitua apenas a função
 * `enviarMensagemWhatsApp` abaixo:
 *
 *   Endpoint: POST https://graph.facebook.com/v19.0/{PHONE_NUMBER_ID}/messages
 *   Headers:  Authorization: Bearer {WHATSAPP_TOKEN}
 *             Content-Type: application/json
 *   Payload:
 *   {
 *     messaging_product: "whatsapp",
 *     to: "<numero_destinatario_com_DDI>",
 *     type: "template",
 *     template: {
 *       name: "<nome_do_template_aprovado>",
 *       language: { code: "pt_BR" },
 *       components: [
 *         {
 *           type: "body",
 *           parameters: [
 *             { type: "text", text: "<nome_cliente>" },
 *             { type: "currency", currency: { fallback_value: "R$ X,XX", code: "BRL", amount_1000: valorEmCentavos * 1000 } }
 *           ]
 *         }
 *       ]
 *     }
 *   }
 *
 *   Resposta de sucesso: { messages: [{ id: "wamid.xxx" }] }
 *   Tratar erros: { error: { message, type, code } }
 */

const MOCK_DELAY_MS = 800;

/**
 * Envia (ou simula envio de) mensagem de cobrança via WhatsApp.
 *
 * @param {Object} params
 * @param {string} params.telefone       - Número com DDI (ex: "5591999999999")
 * @param {string} params.clienteNome    - Nome do cliente para log
 * @param {string} params.templateNome   - Identificador do template
 * @param {string} params.mensagem       - Texto final já com variáveis substituídas
 * @param {number} params.valor          - Valor da dívida em reais
 *
 * @returns {Promise<{ sucesso: boolean, messageId: string|null, erro: string|null }>}
 */
async function enviarMensagemWhatsApp({ telefone, clienteNome, templateNome, mensagem, valor }) {
  // ── MOCK ──────────────────────────────────────────────────────────────────
  // Remova este bloco e implemente a chamada real à Meta Cloud API aqui.
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));

  const mockId = `MOCK_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  console.log(`[WhatsApp MOCK] Enviado para ${clienteNome} (${telefone}) | template: ${templateNome} | valor: R$ ${valor}`);

  return { sucesso: true, messageId: mockId, erro: null };
  // ── FIM MOCK ──────────────────────────────────────────────────────────────
}

module.exports = { enviarMensagemWhatsApp };
