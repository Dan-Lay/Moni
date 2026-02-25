import { DollarSign, TrendingDown, TrendingUp, Euro, Wifi, WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useFinance } from "@/contexts/DataContext";
import { CardSkeleton } from "./Skeletons";
import { Switch } from "@/components/ui/switch";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

const AWESOMEAPI_KEY = import.meta.env.VITE_AWESOMEAPI_KEY;

interface AwesomeApiResponse {
  USDBRL?: { bid: string };
  EURBRL?: { bid: string };
}

async function fetchExchangeRates(): Promise<AwesomeApiResponse> {
  const url = `https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL${AWESOMEAPI_KEY ? `?token=${AWESOMEAPI_KEY}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Falha ao buscar cotação");
  return res.json();
}

export const DollarDisney = () => {
  const { data, isLoading } = useFinance();
  const [isEuropa, setIsEuropa] = useState(false);

  const { data: liveRates, isError: ratesError } = useQuery<AwesomeApiResponse>({
    queryKey: ["exchange-rates"],
    queryFn: fetchExchangeRates,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  if (isLoading) return <CardSkeleton hasBar hasGrid />;

  const { cotacaoDolar, cotacaoMediaDCA, reservaUSD, metaUSD, cotacaoEuro, cotacaoMediaDCAEUR, reservaEUR, metaEUR } = data.config;

  const liveDolar = liveRates?.USDBRL?.bid ? parseFloat(liveRates.USDBRL.bid) : null;
  const liveEuro = liveRates?.EURBRL?.bid ? parseFloat(liveRates.EURBRL.bid) : null;
  const isLive = !ratesError && (liveDolar !== null || liveEuro !== null);

  const cotacaoDolarEfetiva = liveDolar ?? cotacaoDolar;
  const cotacaoEuroEfetiva = liveEuro ?? cotacaoEuro;

  const diffUSD = ((cotacaoDolarEfetiva - cotacaoMediaDCA) / cotacaoMediaDCA) * 100;
  const deveComprarUSD = cotacaoDolarEfetiva < cotacaoMediaDCA;

  const diffEUR = ((cotacaoEuroEfetiva - cotacaoMediaDCAEUR) / cotacaoMediaDCAEUR) * 100;
  const deveComprarEUR = cotacaoEuroEfetiva < cotacaoMediaDCAEUR;

  const cotacao = isEuropa ? cotacaoEuroEfetiva : cotacaoDolarEfetiva;
  const media = isEuropa ? cotacaoMediaDCAEUR : cotacaoMediaDCA;
  const reserva = isEuropa ? reservaEUR : reservaUSD;
  const meta = isEuropa ? metaEUR : metaUSD;
  const diff = isEuropa ? diffEUR : diffUSD;
  const deveComprar = isEuropa ? deveComprarEUR : deveComprarUSD;
  const currencySymbol = isEuropa ? "€" : "$";
  const currencyLabel = isEuropa ? "EUR" : "USD";
  const destLabel = isEuropa ? "Meta Europa 🌍" : "Meta Orlando 🏰";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="glass-card rounded-2xl p-5"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isEuropa
            ? <Euro className="h-4 w-4 text-info" />
            : <DollarSign className="h-4 w-4 text-info" />
          }
          <h3 className="text-sm font-medium text-muted-foreground">
            {isEuropa ? "Euro Europa" : "Dólar Disney"}
          </h3>
          {isLive
            ? <Wifi className="h-3 w-3 text-primary" title="Cotação ao vivo" />
            : <WifiOff className="h-3 w-3 text-muted-foreground/50" title="Cotação manual" />
          }
        </div>

        <div className="flex items-center gap-2">
          {deveComprar && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
              COMPRAR
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">🏰</span>
            <Switch
              id="europa-switch"
              checked={isEuropa}
              onCheckedChange={setIsEuropa}
              className="scale-75"
            />
            <span className="text-[10px] text-muted-foreground">🌍</span>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={isEuropa ? "eur" : "usd"}
          initial={{ opacity: 0, x: isEuropa ? 12 : -12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isEuropa ? -12 : 12 }}
          transition={{ duration: 0.2 }}
        >
          <div className="mb-4 flex items-baseline gap-3">
            <span className="font-mono text-2xl font-bold">
              R$ {cotacao.toFixed(2)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">{currencyLabel}</span>
            </span>
            <span className={`flex items-center gap-0.5 text-xs font-medium ${diff > 0 ? "text-destructive" : "text-primary"}`}>
              {diff > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(diff).toFixed(1)}% vs média
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-secondary/50 px-3 py-2">
              <p className="text-[10px] text-muted-foreground">{isEuropa ? "Média ECA" : "Média DCA"}</p>
              <p className="font-mono text-sm font-semibold">R$ {media.toFixed(2)}</p>
            </div>
            <div className="rounded-lg bg-secondary/50 px-3 py-2">
              <p className="text-[10px] text-muted-foreground">Reserva {currencyLabel}</p>
              <p className="font-mono text-sm font-semibold">{currencySymbol}{reserva.toLocaleString()}</p>
            </div>
          </div>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((reserva / meta) * 100, 100)}%` }}
              transition={{ duration: 1 }}
              className="h-full rounded-full bg-info"
            />
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {currencySymbol}{reserva} / {currencySymbol}{meta.toLocaleString()} — {destLabel}
          </p>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};
