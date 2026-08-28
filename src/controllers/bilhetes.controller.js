const BilhetesService = require("../services/bilhete.service");
const { reserveBilheteSchema, formatValidationError } = require("../validations/bilhete.validation"); // Ajuste o caminho do arquivo se necessário

class BilhetesController {
  // GET /rifas/:rifa_id/bilhetes
  static async listarPorRifa(req, res) {
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

  // POST /bilhetes/reservar
  static async reservarBilhete(req, res) {
    try {
      // 1. O Zod valida e higieniza os dados recebidos do req.body
      const dadosValidados = reserveBilheteSchema.parse(req.body);

      // 2. Passamos os dados limpos e garantidos para o Service
      const resultado = await BilhetesService.reservarBilhete(dadosValidados);

      return res.status(201).json(resultado);
    } catch (error) {
      // 3. Captura erros de validação do Zod (retorna Status 400 Bad Request)
      if (error.name === "ZodError" || error.issues) {
        return res.status(400).json({
          error: "Dados de entrada inválidos.",
          detalhes: formatValidationError(error),
        });
      }

      // 4. Captura erro de concorrência retornado pelo Service (Status 409 Conflict)
      if (error.message === "Bilhete_Indisponivel") {
        return res.status(409).json({
          error: "Este bilhete já foi reservado por outro usuário.",
        });
      }

      console.error("Erro ao processar reserva:", error);
      return res
        .status(500)
        .json({ error: "Erro interno ao processar a reserva." });
    }
  }
}

module.exports = BilhetesController;