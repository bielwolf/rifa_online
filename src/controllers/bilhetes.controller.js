const supabase = require('../config/supabase');

class bilhetesController {
    static async getBilhetesByRifaId(req, res) {
        // Obtém o ID da rifa informado na URL.
        const { rifa_id } = req.params;

        if (!rifa_id) {
            return res.status(400).json({ error: 'ID da rifa ausente' });
        }

        try {
            // Consulta os bilhetes de uma rifa específica e ordena pelo número.
            const { data, error } = await supabase
                .from('bilhetes')
                .select('id, numero, rifa_id, numero')
                .eq('rifa_id', rifa_id)
                .order('numero', { ascending: true });

            if (error) {
                throw error;
            }

            res.status(200).json(data);

        } catch (error) {
            console.error('Erro ao buscar bilhetes: ', error);
            res.status(500).json({ error: 'Erro ao buscar bilhetes' });
        }
    }
}

module.exports = bilhetesController;