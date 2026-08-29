import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { formatarPreco, TICKET_PRICE, type ReservaResponse } from "@/lib/rifa-api";

type Props = {
  aberto: boolean;
  numero: number | null;
  reserva: ReservaResponse | null;
  onFechar: () => void;
};

function usarContagem(expiraEm: string | undefined) {
  const alvo = useMemo(() => {
    const data = expiraEm ? new Date(expiraEm).getTime() : Number.NaN;
    return Number.isNaN(data) ? Date.now() + 15 * 60 * 1000 : data;
  }, [expiraEm]);

  const [restante, setRestante] = useState(() => Math.max(0, alvo - Date.now()));

  useEffect(() => {
    setRestante(Math.max(0, alvo - Date.now()));
    const id = setInterval(() => setRestante(Math.max(0, alvo - Date.now())), 1000);
    return () => clearInterval(id);
  }, [alvo]);

  const total = Math.floor(restante / 1000);
  const minutos = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const segundos = (total % 60).toString().padStart(2, "0");
  return { texto: `${minutos}:${segundos}`, expirado: total <= 0 };
}

export function PixSheet({ aberto, numero, reserva, onFechar }: Props) {
  const { texto, expirado } = usarContagem(reserva?.expira_em);

  if (!aberto || !reserva) return null;

  const src = reserva.qr_code_base64?.startsWith("data:")
    ? reserva.qr_code_base64
    : `data:image/png;base64,${reserva.qr_code_base64}`;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(reserva.qr_code);
      toast.success("Código PIX copiado!");
    } catch {
      toast.error("Não foi possível copiar o código");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pagamento via PIX"
      className="fixed inset-0 z-50 bg-ink/45"
      onClick={onFechar}
    >
      <div
        className="absolute inset-x-0 bottom-0 mx-auto max-h-[92vh] max-w-md overflow-y-auto rounded-t-3xl bg-background p-5 pb-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h3 className="truncate font-display text-xl">Pague com PIX</h3>
          <span
            className={
              expirado
                ? "shrink-0 rounded-full bg-amber-res-light px-3 py-1 text-xs font-semibold text-brand-dark"
                : "shrink-0 rounded-full bg-sage-light px-3 py-1 text-xs font-semibold text-sage"
            }
          >
            {expirado ? "Reserva expirada" : `Expira ${texto}`}
          </span>
        </div>
        <p className="mt-1 text-xs text-ink/60">
          Bilhete Nº {numero?.toString().padStart(3, "0")} · {formatarPreco(TICKET_PRICE)}
        </p>

        <div className="mt-4 grid place-items-center rounded-2xl bg-card p-4 ring-1 ring-black/5">
          <img
            src={src}
            alt="QR Code para pagamento via PIX"
            className="aspect-square w-full max-w-[240px] rounded-xl bg-background object-contain"
          />
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-xl border border-brand/15 bg-card p-2">
          <code className="min-w-0 flex-1 truncate px-2 text-[11px] text-ink/70">
            {reserva.qr_code}
          </code>
          <button
            type="button"
            onClick={copiar}
            className="shrink-0 cursor-pointer rounded-lg bg-ink px-3.5 py-2 text-xs font-semibold text-cream"
          >
            Copiar
          </button>
        </div>

        <p className="mt-3 text-center text-[11px] text-ink/55">
          Abra o app do seu banco, escolha PIX e escaneie o QR Code (ou cole o código) para
          concluir o pagamento.
        </p>

        <div className="mt-3 flex items-center gap-2 rounded-xl bg-sage-light px-3.5 py-2.5">
          <span className="size-2 shrink-0 animate-pulse rounded-full bg-sage" />
          <p className="text-xs font-medium text-sage">
            Aguardando confirmação do pagamento…
          </p>
        </div>

        <button
          type="button"
          onClick={onFechar}
          className="mt-3 w-full cursor-pointer rounded-xl border border-brand/15 py-3 text-sm font-medium text-ink/70"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
