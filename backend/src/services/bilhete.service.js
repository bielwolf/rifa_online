const supabase = require("../config/supabase");
const { MercadoPagoConfig, Payment } = require("mercadopago");

// Configura o cliente do Mercado Pago no Service, onde ele é utilizado
const client = new MercadoPagoConfig({
  accessToken: process.env.ACCESS_TOKEN_PROD,
});
const paymentClient = new Payment(client);

/**
 * BilhetesService
 * Responsável por toda a lógica de negócio e acesso a dados relacionados a bilhetes.
 * - Não usa objetos HTTP (req/res).
 * - Todos os métodos são static async e retornam dados ou lançam erros.
 * - Erros de concorrência e validação são lançados como Error com mensagens conhecidas
 *   (ex.: 'Bilhete_Indisponivel', 'pix_id_obrigatorio', 'Bilhete_nao_encontrado').
 */
class BilhetesService {
  /**
   * Lista bilhetes de uma rifa.
   * @param {string|number} rifa_id - ID da rifa
   * @returns {Promise<Array>} Lista de bilhetes ({id, numero, status, expira_em})
   * @throws Erro do Supabase em caso de falha de consulta
   */
  static async listarPorRifa(rifa_id) {
    const { data, error } = await supabase
      .from('bilhetes')
      .select('id, numero, status, expira_em')
      .eq('rifa_id', rifa_id)
      .order('numero', { ascending: true });

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Reserva um bilhete de forma atômica (só atualiza se status === 'livre'), gera cobrança PIX
   * e vincula o pix_id ao bilhete.
   * @param {Object} params
   * @param {string|number} params.rifa_id
   * @param {number} params.numero - número do bilhete
   * @param {string} params.comprador_email (opcional) - e-mail do comprador
   * @param {string} params.comprador_nome - nome do comprador
   * @param {string} params.comprador_telefone - telefone do comprador
   * @returns {Promise<Object>} { status: 'reservado', qr_code, qr_code_base64, expira_em }
   * @throws Error('Bilhete_Indisponivel') se o bilhete já tiver sido reservado por outro
   * @throws Erro do Supabase ou Mercado Pago em falhas de infra
   */
  static async reservarBilhete({ rifa_id, numero, comprador_email, comprador_nome, comprador_telefone }) {
    const expiraEm = new Date(Date.now() + 15 * 60 * 1000);

    const { data, error: updateError } = await supabase
      .from('bilhetes')
      .update({
        status: 'reservado',
        comprador_nome,
        comprador_telefone,
        expira_em: expiraEm,
      })
      .eq('rifa_id', rifa_id)
      .eq('numero', numero)
      .eq('status', 'livre')
      .select('id, rifa_id, numero, rifas(preco_bilhete)');

    if (updateError) {
      throw updateError;
    }

    if (!data || data.length === 0) {
      throw new Error('Bilhete_Indisponivel');
    }

    const bilheteReservado = data[0];
    const valorDoBilhete = Number(bilheteReservado.rifas.preco_bilhete);

    const emailPagador =
      comprador_email || `cliente_${comprador_telefone.replace(/\D/g, '')}@seudominio.com`;

    const mpResponse = await paymentClient.create({
      body: {
        transaction_amount: valorDoBilhete,
        description: `Bilhete #${numero} - Rifa ${rifa_id}`,
        payment_method_id: 'pix',
        payer: {
          email: emailPagador,
          first_name: comprador_nome,
        },
      },
    });

    const pix_id = String(mpResponse?.id);
    const transactionData = mpResponse.point_of_interaction?.transaction_data;
    const qr_code = transactionData?.qr_code;
    const qr_code_base64 = transactionData?.qr_code_base64;

    const { error: pixError } = await supabase.from('bilhetes').update({ pix_id }).eq('id', bilheteReservado.id);

    if (pixError) {
      throw pixError;
    }

    return {
      status: 'reservado',
      qr_code,
      qr_code_base64,
      expira_em: expiraEm,
    };
  }

  /**
   * Libera bilhetes cujo expira_em já passou (reservado -> livre).
   * Limpa dados do comprador e pix_id.
   * @returns {Promise<Array>} lista de bilhetes liberados ({id, rifa_id, numero})
   * @throws Erro do Supabase em caso de falha
   */
  static async liberarExpirados() {
    const agora = new Date().toISOString();

    const { data, error } = await supabase
      .from('bilhetes')
      .update({
        status: 'livre',
        comprador_nome: null,
        comprador_telefone: null,
        comprador_email: null,
        pix_id: null,
        expira_em: null,
      })
      .lt('expira_em', agora)
      .eq('status', 'reservado')
      .select('id, rifa_id, numero');

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Confirma pagamento identificando o bilhete pelo pix_id e marcando como 'pago'.
   * @param {string} pix_id - identificador do pagamento (Mercado Pago)
   * @returns {Promise<Object>} bilhete atualizado ({id, rifa_id, numero})
   * @throws Error('pix_id_obrigatorio') se pix_id não informado
   * @throws Error('Bilhete_nao_encontrado') se nenhum bilhete reservado corresponder ao pix_id
   * @throws Erro do Supabase em caso de falha infra
   */
  static async confirmarPagamento(pix_id) {
    if (!pix_id) throw new Error('pix_id_obrigatorio');

    const { data, error } = await supabase
      .from('bilhetes')
      .update({ status: 'pago' })
      .eq('pix_id', pix_id)
      .eq('status', 'reservado')
      .select('id, rifa_id, numero');

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error('Bilhete_nao_encontrado');
    }

    return data[0];
  }
}

module.exports = BilhetesService;