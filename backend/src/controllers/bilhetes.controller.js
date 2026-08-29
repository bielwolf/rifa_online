const BilhetesService = require('../services/bilhete.service');
const { reserveBilheteSchema, confirmPaymentSchema, formatValidationError } = require('../validators/request.schemas');

/**
 * BilhetesController
 * - Lidança HTTP para operações de bilhetes (listagem, reserva, confirmação)
 * - Valida entrada com Zod e mapeia erros lançados pelos Services para respostas HTTP.
 */
class BilhetesController {
  // GET /bilhetes?rifa_id=:rifa_id
  static async listarPorRifaQuery(req, res) {
    const { rifa_id } = req.query;

    if (typeof rifa_id !== 'string' || !rifa_id.trim()) {
      return res.status(400).json({ error: 'O parâmetro rifa_id é obrigatório.' });
    }

    try {
      const resultado = await BilhetesService.listarPorRifa(rifa_id);
      return res.status(200).json(resultado);
    } catch (error) {
      console.error('Erro ao listar bilhetes:', error);
      return res.status(500).json({ error: 'Erro ao buscar bilhetes.' });
    }
  }

  // GET /rifas/:rifa_id/bilhetes
  static async listarPorRifa(req, res) {
    const { rifa_id } = req.params;

    if (!rifa_id) {
      return res.status(400).json({ error: 'ID da rifa é obrigatório.' });
    }

    try {
      const resultado = await BilhetesService.listarPorRifa(rifa_id);
      return res.status(200).json(resultado);
    } catch (error) {
      console.error('Erro ao listar bilhetes:', error);
      return res.status(500).json({ error: 'Erro ao buscar bilhetes.' });
    }
  }

  // POST /bilhetes/reservar
  static async reservarBilhete(req, res) {
    // Body esperado:
    // {
    //   rifa_id: string | number,
    //   numero: integer positivo,
    //   comprador_nome: string,
    //   comprador_telefone: string com DDD,
    //   comprador_email?: string
    // }
    const validation = reserveBilheteSchema.safeParse(req.body);
    if (!validation.success) {
      const fields = formatValidationError(validation.error);
      return res.status(400).json({
        error: fields[0]?.message
          ? `Dados de reserva inválidos: ${fields[0].message}`
          : 'Dados de reserva inválidos.',
        detalhes: fields,
        fields,
      });
    }

    try {
      // 2. Passamos os dados limpos e garantidos para o Service
      const resultado = await BilhetesService.reservarBilhete(validation.data);

      return res.status(201).json(resultado);
    } catch (error) {
      // Captura erro de concorrência retornado pelo Service (Status 409 Conflict)
      if (error.message === 'Bilhete_Indisponivel') {
        return res.status(409).json({
          error: 'Este bilhete já foi reservado por outro usuário.',
        });
      }

      console.error('Erro ao processar reserva:', error);
      return res.status(500).json({ error: 'Erro interno ao processar a reserva.' });
    }
  }

  // POST /bilhetes/confirmar-pagamento
  static async confirmarPagamento(req, res) {
    const validation = confirmPaymentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Dados inválidos', detalhes: formatValidationError(validation.error) });
    }

    try {
      const { pix_id } = validation.data;
      const bilhete = await BilhetesService.confirmarPagamento(pix_id);
      return res.status(200).json({ status: 'pago', bilhete });
    } catch (error) {
      if (error.message === 'pix_id_obrigatorio') {
        return res.status(400).json({ error: 'pix_id é obrigatório' });
      }

      if (error.message === 'Bilhete_nao_encontrado') {
        return res.status(404).json({ error: 'Bilhete não encontrado para o pix_id informado' });
      }

      console.error('Erro ao confirmar pagamento:', error);
      return res.status(500).json({ error: 'Erro interno ao confirmar pagamento' });
    }
  }
}

module.exports = BilhetesController;