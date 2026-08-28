const BilhetesService = require("../services/bilhete.service");

class BilhetesController {
  // GET /rifas/:rifa_id/bilhetes
  static async listarPorRifa(req, res) {
    const { rifa_id } = req.params; // Extrai do req.params (URL)

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
      const resultado = await BilhetesService.reservarBilhete(req.body);
      return res.status(201).json(resultado);
    } catch (error) {
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