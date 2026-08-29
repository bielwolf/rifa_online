import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { Bilhete } from "@/lib/rifa-api";

type Props = {
  bilhetes: Bilhete[];
  isLoading: boolean;
  selecionado: number | null;
  onSelecionar: (numero: number) => void;
};

function padrao(numero: number) {
  return numero.toString().padStart(3, "0");
}

export function TicketGrid({ bilhetes, isLoading, selecionado, onSelecionar }: Props) {
  return (
    <section className="mt-6 rounded-3xl border border-brand/10 bg-card/60 p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h2 className="truncate font-display text-lg">Grade de números</h2>
        <span className="shrink-0 text-[11px] text-ink/50">Total: {bilhetes.length || 101}</span>
      </div>

      {isLoading ? (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {Array.from({ length: 30 }).map((_, i) => (
            <Skeleton key={i} className="h-11 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {bilhetes.map((bilhete) => {
            const isSelecionado = selecionado === bilhete.numero;
            const base =
              "grid h-11 place-items-center rounded-xl text-sm transition-colors";

            if (bilhete.status === "reservado") {
              return (
                <span
                  key={bilhete.numero}
                  aria-label={`Bilhete ${padrao(bilhete.numero)} reservado`}
                  className={cn(base, "bg-amber-res-light font-semibold text-brand-dark")}
                >
                  {padrao(bilhete.numero)}
                </span>
              );
            }
            if (bilhete.status === "pago") {
              return (
                <span
                  key={bilhete.numero}
                  aria-label={`Bilhete ${padrao(bilhete.numero)} pago`}
                  className={cn(base, "bg-pago-light font-semibold text-ink/40")}
                >
                  {padrao(bilhete.numero)}
                </span>
              );
            }

            return (
              <button
                key={bilhete.numero}
                type="button"
                onClick={() => onSelecionar(bilhete.numero)}
                aria-pressed={isSelecionado}
                className={cn(
                  base,
                  "cursor-pointer shadow-sm",
                  isSelecionado
                    ? "bg-brand font-semibold text-cream shadow-brand/30 ring-2 ring-accent ring-offset-2 ring-offset-cream"
                    : "bg-card font-medium text-ink ring-1 ring-black/5 hover:bg-amber-res-light/60",
                )}
              >
                {padrao(bilhete.numero)}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink/60">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-card ring-1 ring-black/10" />
          Livre
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-amber-res-light ring-1 ring-amber-res/40" />
          Reservado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-pago-light" />
          Pago
        </span>
      </div>
    </section>
  );
}
