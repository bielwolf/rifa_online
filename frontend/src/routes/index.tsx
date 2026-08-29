import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { TicketGrid } from "@/components/rifa/TicketGrid";
import { PixSheet } from "@/components/rifa/PixSheet";
import {
  ConflitoBilheteError,
  TICKET_PRICE,
  fetchBilhetes,
  formatarPreco,
  reservarBilhete,
  type Bilhete,
  type ReservaResponse,
} from "@/lib/rifa-api";

const TITULO = "Prêmio a definir";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Alvorada Rifa — reserve seu número e pague via PIX" },
      {
        name: "description",
        content:
          "Escolha um número livre da rifa, reserve em segundos e pague com PIX. Bilhetes de 0 a 100.",
      },
      { property: "og:title", content: "Alvorada Rifa — reserve seu número e pague via PIX" },
      {
        property: "og:description",
        content: "Escolha seu número, reserve e pague com PIX em até 15 minutos.",
      },
    ],
  }),
  component: Index,
});

const formSchema = z.object({
  comprador_nome: z
    .string()
    .trim()
    .min(3, "Informe seu nome completo")
    .max(100, "Nome muito longo"),
  comprador_telefone: z
    .string()
    .trim()
    .min(10, "Informe o telefone com DDD")
    .max(20, "Telefone inválido"),
  comprador_email: z.string().trim().email("E-mail inválido").max(255).optional().or(z.literal("")),
});

function Index() {
  const queryClient = useQueryClient();
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [reserva, setReserva] = useState<ReservaResponse | null>(null);
  const [numeroReservado, setNumeroReservado] = useState<number | null>(null);

  const bilhetesQuery = useQuery({
    queryKey: ["bilhetes"],
    queryFn: fetchBilhetes,
    retry: 1,
  });

  const bilhetes: Bilhete[] = bilhetesQuery.data ?? [];
  const vendidos = bilhetes.filter((b) => b.status !== "livre").length;

  const reservar = useMutation({
    mutationFn: reservarBilhete,
    onSuccess: (data, variaveis) => {
      setReserva(data);
      setNumeroReservado(variaveis.numero);
      setSelecionado(null);
      setNome("");
      setTelefone("");
      setEmail("");
      toast.success("Bilhete reservado! Finalize o pagamento em 15 minutos.");
      void queryClient.invalidateQueries({ queryKey: ["bilhetes"] });
    },
    onError: (erro: Error) => {
      if (erro instanceof ConflitoBilheteError) {
        toast.error("Este bilhete acabou de ser reservado por outra pessoa, escolha outro.");
        setSelecionado(null);
        void queryClient.invalidateQueries({ queryKey: ["bilhetes"] });
        return;
      }
      toast.error(erro.message);
    },
  });

  const enviar = (evento: React.FormEvent) => {
    evento.preventDefault();
    if (selecionado === null) return;

    const resultado = formSchema.safeParse({
      comprador_nome: nome,
      comprador_telefone: telefone,
      comprador_email: email,
    });
    if (!resultado.success) {
      toast.error(resultado.error.issues[0]?.message ?? "Confira os dados informados");
      return;
    }

    reservar.mutate({
      numero: selecionado,
      comprador_nome: resultado.data.comprador_nome,
      comprador_telefone: resultado.data.comprador_telefone,
      ...(resultado.data.comprador_email
        ? { comprador_email: resultado.data.comprador_email }
        : {}),
    });
  };

  return (
    <div className="min-h-screen bg-background font-sans text-ink antialiased">
      <div className="mx-auto max-w-md px-4 pb-72 pt-5">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand font-display text-lg text-cream">
              A
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate font-display text-base">Alvorada Rifa</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-brand">Edição Costa</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-amber-res/40 bg-amber-res-light px-3 py-1 text-[11px] font-medium text-brand-dark">
            {vendidos}/{bilhetes.length || 101} vendidos
          </span>
        </header>

        <section className="mt-5 rounded-3xl bg-gradient-to-br from-brand to-brand-dark p-5 text-cream shadow-lg shadow-brand/20">
          <p className="text-[11px] uppercase tracking-[0.22em] text-accent">Prêmio em destaque</p>
          <h1 className="mt-1 font-display text-3xl leading-none">{TITULO}</h1>
          <p className="mt-3 text-sm text-cream/80">
            Reserve seu número e pague via PIX. Números de 0 a 100.
          </p>
          <div className="mt-4 flex items-end gap-1">
            <span className="font-display text-4xl leading-none">
              {formatarPreco(TICKET_PRICE)}
            </span>
            <span className="pb-1 text-xs text-cream/70">/ bilhete</span>
          </div>
        </section>

        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-brand/10 bg-card/70 p-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sage-light text-sm font-semibold text-sage">
            1
          </span>
          <p className="text-xs text-ink/70">
            Escolha um número livre na grade, preencha seus dados e pague o PIX.
          </p>
        </div>

        {bilhetesQuery.isError ? (
          <div className="mt-6 rounded-2xl border border-brand/15 bg-card p-4 text-sm text-ink/70">
            Não foi possível carregar os bilhetes. Verifique se a API está no ar e tente
            novamente.
            <button
              type="button"
              onClick={() => void bilhetesQuery.refetch()}
              className="mt-3 w-full cursor-pointer rounded-xl bg-brand py-3 text-sm font-semibold text-cream"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <TicketGrid
            bilhetes={bilhetesQuery.isLoading ? [] : bilhetes}
            isLoading={bilhetesQuery.isLoading}
            selecionado={selecionado}
            onSelecionar={setSelecionado}
          />
        )}
      </div>

      {selecionado !== null && (
        <form
          onSubmit={enviar}
          className="fixed inset-x-0 bottom-0 z-30 border-t border-brand/10 bg-background px-4 pb-5 pt-4 shadow-bar"
        >
          <div className="mx-auto max-w-md">
            <p className="text-[11px] uppercase tracking-[0.18em] text-brand">
              Bilhete selecionado
            </p>
            <div className="mt-1 flex items-center justify-between">
              <span className="font-display text-2xl">
                Nº {selecionado.toString().padStart(3, "0")}
              </span>
              <span className="text-sm font-medium text-ink/70">
                {formatarPreco(TICKET_PRICE)}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              <input
                type="text"
                required
                maxLength={100}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome completo"
                className="w-full rounded-xl border border-brand/15 bg-card px-3.5 py-3 text-sm outline-none placeholder:text-ink/40 focus:border-brand"
              />
              <input
                type="tel"
                required
                maxLength={20}
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="WhatsApp com DDD"
                className="w-full rounded-xl border border-brand/15 bg-card px-3.5 py-3 text-sm outline-none placeholder:text-ink/40 focus:border-brand"
              />
              <input
                type="email"
                maxLength={255}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mail (opcional)"
                className="w-full rounded-xl border border-brand/15 bg-card px-3.5 py-3 text-sm outline-none placeholder:text-ink/40 focus:border-brand"
              />
            </div>
            <button
              type="submit"
              disabled={reservar.isPending}
              className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-sm font-semibold text-cream shadow-md shadow-brand/30 transition hover:bg-brand-dark disabled:opacity-60"
            >
              {reservar.isPending && <Loader2 className="size-4 animate-spin" />}
              {reservar.isPending ? "Gerando PIX…" : "Gerar PIX para pagamento"}
            </button>
          </div>
        </form>
      )}

      <PixSheet
        aberto={reserva !== null}
        numero={numeroReservado}
        reserva={reserva}
        onFechar={() => setReserva(null)}
      />
    </div>
  );
}
