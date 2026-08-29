export const API_BASE_URL = (
  (import.meta.env["VITE_API_URL"] as string | undefined) ?? "http://localhost:3000"
).replace(/\/+$/, "");

export const RIFA_ID = "8178b6d5-ea11-45f7-b127-f715e35c8767";
export const TICKET_PRICE = 25;
export const NUMERO_MIN = 0;
export const NUMERO_MAX = 100;

export type BilheteStatus = "livre" | "reservado" | "pago";

export type Bilhete = {
  id?: string | number;
  numero: number;
  status: BilheteStatus;
};

export type ReservaResponse = {
  status: string;
  qr_code: string;
  qr_code_base64: string;
  expira_em: string;
};

function todosOsNumeros(): Bilhete[] {
  const lista: Bilhete[] = [];
  for (let n = NUMERO_MIN; n <= NUMERO_MAX; n += 1) {
    lista.push({ numero: n, status: "livre" });
  }
  return lista;
}

export async function fetchBilhetes(): Promise<Bilhete[]> {
  const res = await fetch(`${API_BASE_URL}/api/bilhetes?rifa_id=${encodeURIComponent(RIFA_ID)}`);
  if (!res.ok) throw new Error("Não foi possível carregar os bilhetes");
  const data = (await res.json()) as Bilhete[] | { bilhetes: Bilhete[] };
  const lista = Array.isArray(data) ? data : (data.bilhetes ?? []);

  const base = todosOsNumeros();
  const porNumero = new Map(base.map((b) => [b.numero, b]));
  for (const bilhete of lista) {
    const numero = Number(bilhete.numero);
    porNumero.set(numero, {
      ...(bilhete.id !== undefined ? { id: bilhete.id } : {}),
      numero,
      status: bilhete.status ?? "livre",
    });
  }
  return [...porNumero.values()].sort((a, b) => a.numero - b.numero);
}

export type ReservarInput = {
  numero: number;
  comprador_nome: string;
  comprador_telefone: string;
  comprador_email?: string;
};

export class ConflitoBilheteError extends Error {}

export async function reservarBilhete(input: ReservarInput): Promise<ReservaResponse> {
  const res = await fetch(`${API_BASE_URL}/api/bilhetes/reservar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rifa_id: RIFA_ID, ...input }),
  });

  if (res.status === 409) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ConflitoBilheteError(body.error ?? "Este bilhete já foi reservado por outro usuário");
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Não foi possível concluir a reserva");
  }
  return (await res.json()) as ReservaResponse;
}

export function formatarPreco(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
