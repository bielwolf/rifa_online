const supabase = require("../config/supabase");

const { MercadoPagoConfig, Payment } = require("mercadopago");

// Configura o cliente do Mercado Pago com o token de produção.
const client = new MercadoPagoConfig({
  accessToken: process.env.ACCESS_TOKEN_PROD,
});

const paymentClient = new Payment(client);

class bilhetesController {
  static async getBilhetesByRifaId(req, res) {
    // Obtém o ID da rifa informado na URL.
    const { rifa_id } = req.params;

    if (!rifa_id) {
      return res.status(400).json({ error: "ID da rifa é obrigatório." });
    }

    try {
      const resultado = await BilhetesService.listarPorRifa(rifa_id);
      return res.status(200).json(resultado);
    } catch (error) {
      console.error("Erro ao listar bilhetes:", error);
      return res.status(500).json({ error: "Erro ao buscar bilhetes." });
    }
  }

  static async reserveBilhete(req, res) {
    // 1. Extrair todos os campos obrigatórios
    const {
      rifa_id,
      numero,
      comprador_nome,
      comprador_telefone,
      comprador_email,
    } = req.body;

    if (!rifa_id || !numero || !comprador_nome || !comprador_telefone) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes!" });
    }

    try {
      // 2. Consulta o bilhete específico
      const { data: bilhete, error } = await supabase
        .from("bilhetes")
        .select("id, rifa_id, numero, status, rifas(preco_bilhete)")
        .eq("rifa_id", rifa_id)
        .eq("numero", numero)
        .single();

      // 3. Validações PRIMEIRO
      if (error || !bilhete) {
        return res
          .status(404)
          .json({ error: "Bilhete não encontrado nesta rifa" });
      }

      if (bilhete.status !== "livre") {
        return res
          .status(409)
          .json({ error: "Bilhete não está disponível para reserva" });
      }

      // Agora é seguro ler o preço
      const valorDoBilhete = Number(bilhete.rifas.preco_bilhete);

      // 4. Cálculo dos 15 min + Mercado Pago
      const expiraEm = new Date(Date.now() + 15 * 60 * 1000);

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

      // 5. Update no Supabase
      const { error: updateError } = await supabase
        .from("bilhetes")
        .update({
          status: "reservado",
          comprador_nome: comprador_nome,
          comprador_telefone: comprador_telefone,
          expira_em: expiraEm,
          pix_id: pix_id,
        })
        .eq("id", bilhete.id);

      if (updateError) {
        throw updateError;
      }

      // 6. Retorno de sucesso
      return res.status(201).json({
        status: "reservado",
        qr_code: qr_code,
        qr_code_base64: qr_code_base64,
        expira_em: expiraEm,
      });
    } catch (error) {
      console.error("Erro ao processar reserva:", error);
      return res
        .status(500)
        .json({ error: "Erro interno ao processar a reserva." });
    }
  }
}
module.exports = bilhetesController;

module.exports = BilhetesController;