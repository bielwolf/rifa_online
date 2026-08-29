const { z } = require('zod');

const idSchema = z.union([
  z.string().trim().min(1, 'deve ser informado'),
  z.number().int().positive('deve ser um número positivo'),
]);

const phoneSchema = z
  .string()
  .trim()
  .refine(
    (value) => {
      if (!/^[+\d\s().-]+$/.test(value)) {
        return false;
      }

      let digits = value.replace(/\D/g, '');
      if (digits.startsWith('55')) {
        digits = digits.slice(2);
      }

      return digits.length === 10 || digits.length === 11;
    },
    'deve conter DDD e 10 ou 11 dígitos, com formato de telefone válido',
  );

const numericValueSchema = z.coerce
  .number({ invalid_type_error: 'deve ser um número' })
  .finite('deve ser um número finito')
  .positive('deve ser maior que zero');

const ticketNumberSchema = z.coerce
  .number({ invalid_type_error: 'deve ser um número' })
  .int('deve ser um número inteiro')
  .positive('deve ser maior que zero');

const reserveBilheteSchema = z.object({
  rifa_id: idSchema,
  numero: ticketNumberSchema,
  comprador_nome: z.string().trim().min(1, 'deve ser informado'),
  comprador_telefone: phoneSchema,
  comprador_email: z.string().trim().email('deve ser um e-mail válido').optional(),
});

const createPaymentSchema = z.object({
  totalAmount: numericValueSchema,
  userName: z.string().trim().min(1, 'deve ser informado'),
  userEmail: z.string().trim().email('deve ser um e-mail válido'),
  rifaId: idSchema,
  userId: idSchema,
  numberTicket: ticketNumberSchema,
});

const confirmPaymentSchema = z.object({
  pix_id: idSchema,
});

function formatValidationError(error) {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }));
}

module.exports = {
  reserveBilheteSchema,
  createPaymentSchema,
  confirmPaymentSchema,
  formatValidationError,
};