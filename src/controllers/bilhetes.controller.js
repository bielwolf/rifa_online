const supabase = require("../config/supabase");
const {
  reserveBilheteSchema,
  formatValidationError,
} = require("../validators/request.schemas");

const { MercadoPagoConfig, Payment } = require("mercadopago");

// Configura o cliente do Mercado Pago com o token de produção.
const client = new MercadoPagoConfig({
  accessToken: process.env.ACCESS_TOKEN_PROD,
});

const paymentClient = new Payment(client);

class BilhetesController {
  static async getBilhetesByRifaId(req, res) {
    // Obtém o ID da rifa informado na URL.
    const { rifa_id } = req.params;

    if (!rifa_id) {
      return res.status(400).json({ error: "ID da rifa ausente" });
    }

    try {
      // Consulta os bilhetes de uma rifa específica e ordena pelo número.
      const { data, error } = await supabase
        .from("bilhetes")
        .select("id, numero, rifa_id, numero")
        .eq("rifa_id", rifa_id)
        .order("numero", { ascending: true });

      if (error) {
        throw error;
      }

      res.status(200).json(data);
    } catch (error) {
      console.error("Erro ao buscar bilhetes: ", error);
      res.status(500).json({ error: "Erro ao buscar bilhetes" });
    }
  }

  static async reserveBilhete(req, res) {
    const validation = reserveBilheteSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Dados de reserva inválidos",
        fields: formatValidationError(validation.error),
      });
    }

    const {
      rifa_id,
      numero,
      comprador_nome,
      comprador_telefone,
      comprador_email,
    } = validation.data;

    try {
      // Consulta apenas o preço; o status é validado atomically no update abaixo.
      const { data: bilhete, error } = await supabase
        .from("bilhetes")
        .select("id, rifa_id, numero, rifas(preco_bilhete)")
        .eq("rifa_id", rifa_id)
        .eq("numero", numero)
        .single();

      if (error || !bilhete) {
        return res
          .status(404)
          .json({ error: "Bilhete não encontrado nesta rifa" });
      }

      const valorDoBilhete = Number(bilhete.rifas.preco_bilhete);
      if (!Number.isFinite(valorDoBilhete) || valorDoBilhete <= 0) {
        throw new Error("Preço do bilhete inválido");
      }

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

      // A condição de status torna a reserva atômica e evita double booking.
      const { data: reservedBilhete, error: updateError } = await supabase
        .from("bilhetes")
        .update({
          status: "reservado",
          comprador_nome: comprador_nome,
          comprador_telefone: comprador_telefone,
          expira_em: expiraEm,
          pix_id: pix_id,
        })
        .eq("rifa_id", rifa_id)
        .eq("numero", numero)
        .eq("status", "livre")
        .select("id");

      if (updateError) {
        throw updateError;
      }

      if (!reservedBilhete || reservedBilhete.length === 0) {
        return res.status(409).json({
          error: "O bilhete já foi reservado por outro usuário",
        });
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
        .json({ error: "Erro interno ao processar reserva" });
    }
  }
}
module.exports = BilhetesController;
