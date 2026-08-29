const supabase = require("../config/supabase");
const { MercadoPagoConfig, Payment } = require("mercadopago");

// Configura o cliente do Mercado Pago no Service, onde ele é utilizado
const client = new MercadoPagoConfig({
  accessToken: process.env.ACCESS_TOKEN_PROD,
});
const paymentClient = new Payment(client);

class BilhetesService {
  // 1. Método para listar bilhetes de uma rifa
  static async listarPorRifa(rifa_id) {
    const { data, error } = await supabase
      .from("bilhetes")
      .select("id, numero, status, expira_em")
      .eq("rifa_id", rifa_id)
      .order("numero", { ascending: true });

    if (error) {
      throw error;
    }

    return data;
  }

  // 2. Método para reservar bilhete com trava atômica + Pix
  static async reservarBilhete({
    rifa_id,
    numero,
    comprador_email,
    comprador_nome,
    comprador_telefone,
  }) {
    // 1. Calcula o horário limite (15 min a partir de agora)
    const expiraEm = new Date(Date.now() + 15 * 60 * 1000);

    // 2. Trava Atômica: Atualiza no banco SOMENTE SE o status for 'livre'
    const { data, error: updateError } = await supabase
      .from("bilhetes")
      .update({
        status: "reservado",
        comprador_nome,
        comprador_telefone,
        expira_em: expiraEm,
      })
      .eq("rifa_id", rifa_id)
      .eq("numero", numero)
      .eq("status", "livre")
      .select("id, rifa_id, numero, rifas(preco_bilhete)");

    if (updateError) {
      throw updateError;
    }

    // 3. Valida a concorrência
    if (!data || data.length === 0) {
      throw new Error("Bilhete_Indisponivel");
    }

    const bilheteReservado = data[0];
    const valorDoBilhete = Number(bilheteReservado.rifas.preco_bilhete);

    // 4. Gera a cobrança no Mercado Pago
    const emailPagador =
      comprador_email ||
      `cliente_${comprador_telefone.replace(/\D/g, "")}@seudominio.com`;

    const mpResponse = await paymentClient.create({
      body: {
        transaction_amount: valorDoBilhete,
        description: `Bilhete #${numero} - Rifa ${rifa_id}`,
        payment_method_id: "pix",
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

    // 5. Vincula o pix_id gerado ao bilhete reservado
    const { error: pixError } = await supabase
      .from("bilhetes")
      .update({ pix_id })
      .eq("id", bilheteReservado.id);

    if (pixError) {
      throw pixError;
    }

    // 6. Retorno de sucesso
    return {
      status: "reservado",
      qr_code,
      qr_code_base64,
      expira_em: expiraEm,
    };
  }

  // 3. Método para liberar bilhetes expirados (reservados -> livre)
  static async liberarExpirados() {
    const agora = new Date().toISOString();

    const { data, error } = await supabase
      .from("bilhetes")
      .update({
        status: "livre",
        comprador_nome: null,
        comprador_telefone: null,
        comprador_email: null,
        pix_id: null,
        expira_em: null,
      })
      .lt("expira_em", agora)
      .eq("status", "reservado")
      .select("id, rifa_id, numero");

    if (error) {
      throw error;
    }

    return data; // retorna lista de bilhetes liberados
  }

  // 4. Método para confirmar pagamento via pix_id (reservado -> pago)
  static async confirmarPagamento(pix_id) {
    if (!pix_id) throw new Error("pix_id_obrigatorio");

    const { data, error } = await supabase
      .from("bilhetes")
      .update({ status: "pago" })
      .eq("pix_id", pix_id)
      .eq("status", "reservado")
      .select("id, rifa_id, numero");

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error("Bilhete_nao_encontrado");
    }

    return data[0];
  }
}

module.exports = BilhetesService;