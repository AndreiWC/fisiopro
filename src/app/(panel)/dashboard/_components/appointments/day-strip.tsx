"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, addDays, isSameDay, isToday, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function parseDateParam(value: string | null) {
  if (!value) return new Date();
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

const PAGE_SIZE = 14;
const INITIAL_PAST_DAYS = 3;
const INITIAL_FUTURE_DAYS = 30;
const EDGE_THRESHOLD = 200;
const SCROLL_SETTLE_DELAY = 120;

export function DayStrip() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selected = startOfDay(parseDateParam(searchParams.get("date")));
  const today = useMemo(() => startOfDay(new Date()), []);

  const [rangeStart, setRangeStart] = useState(() => addDays(today, -INITIAL_PAST_DAYS));
  const [rangeEnd, setRangeEnd] = useState(() => addDays(today, INITIAL_FUTURE_DAYS));

  useEffect(() => {
    if (selected < rangeStart) setRangeStart(selected);
    if (selected > rangeEnd) setRangeEnd(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const days = useMemo(() => {
    const count = differenceInCalendarDays(rangeEnd, rangeStart) + 1;
    return Array.from({ length: count }, (_, i) => addDays(rangeStart, i));
  }, [rangeStart, rangeEnd]);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const dayRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const isFirstCenter = useRef(true);
  const lastCenteredKey = useRef<string | null>(null);

  // Depende de `days` também: quando a data selecionada está fora do range
  // inicial, o botão só existe depois que o range é expandido em um re-render
  // seguinte — o guard por `lastCenteredKey` evita centralizar de novo à toa
  // sempre que o carrossel carrega mais dias ao rolar.
  useEffect(() => {
    const key = format(selected, "yyyy-MM-dd");
    if (key === lastCenteredKey.current) return;

    const node = dayRefs.current[key];
    if (!node) return;

    node.scrollIntoView({
      behavior: isFirstCenter.current ? "auto" : "smooth",
      inline: "center",
      block: "nearest",
    });
    isFirstCenter.current = false;
    lastCenteredKey.current = key;
  }, [selected, days]);

  const settleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (settleTimeout.current) clearTimeout(settleTimeout.current);
    };
  }, []);

  // Só decide expandir o range quando o scroll realmente para — checar a
  // cada evento (inclusive durante a animação do scrollBy) fazia a borda
  // "esquerda" disparar no meio de uma rolagem para frente e voltar no tempo.
  function handleScroll() {
    if (settleTimeout.current) clearTimeout(settleTimeout.current);
    settleTimeout.current = setTimeout(() => {
      const el = scrollerRef.current;
      if (!el) return;
      const { scrollLeft, scrollWidth, clientWidth } = el;

      if (scrollWidth - (scrollLeft + clientWidth) < EDGE_THRESHOLD) {
        setRangeEnd((prev) => addDays(prev, PAGE_SIZE));
      }

      if (scrollLeft < EDGE_THRESHOLD) {
        const prevScrollWidth = scrollWidth;
        setRangeStart((prev) => addDays(prev, -PAGE_SIZE));
        requestAnimationFrame(() => {
          const node = scrollerRef.current;
          if (node) node.scrollLeft += node.scrollWidth - prevScrollWidth;
        });
      }
    }, SCROLL_SETTLE_DELAY);
  }

  function scrollByPage(direction: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth, behavior: "smooth" });
  }

  function selectDate(date: Date) {
    const url = new URL(window.location.href);
    url.searchParams.set("date", format(date, "yyyy-MM-dd"));
    router.push(url.toString());
  }

  return (
    <div className="w-full min-w-0">
      <div className="flex items-center gap-2">
        {/* No celular as setas somem: arrastar a faixa já navega e o espaço vai para os dias. */}
        <button
          type="button"
          onClick={() => scrollByPage(-1)}
          className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card hover:bg-secondary sm:flex"
          aria-label="Dias anteriores"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div
          ref={scrollerRef}
          onScroll={handleScroll}
          className="scrollbar-none flex min-w-0 flex-1 snap-x snap-proximity gap-1.5 overflow-x-auto scroll-smooth py-0.5 sm:gap-2"
        >
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const isActive = isSameDay(day, selected);
            return (
              <button
                key={key}
                ref={(el) => {
                  dayRefs.current[key] = el;
                }}
                type="button"
                onClick={() => selectDate(day)}
                aria-pressed={isActive}
                aria-current={isToday(day) ? "date" : undefined}
                className={cn(
                  "flex w-[calc((100%-1.5rem)/5)] shrink-0 snap-center flex-col items-center rounded-2xl border py-2 transition-colors sm:w-[4.5rem] sm:py-2.5",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-foreground hover:bg-secondary",
                )}
              >
                <span
                  className={cn(
                    "text-[10px] font-medium uppercase sm:text-[11px]",
                    isActive ? "text-primary-foreground/80" : "text-muted-foreground",
                  )}
                >
                  {/* "EEEEEE" = abreviação curta (seg, ter...); "EEE" em pt-BR devolve o nome inteiro. */}
                  {format(day, "EEEEEE", { locale: ptBR }).replace(".", "")}
                </span>
                <span className="text-base leading-tight font-semibold tabular-nums sm:text-lg">
                  {format(day, "dd")}
                </span>
                <span
                  className={cn(
                    "mt-0.5 h-1 w-1 rounded-full",
                    isToday(day)
                      ? isActive
                        ? "bg-primary-foreground"
                        : "bg-primary"
                      : "bg-transparent",
                  )}
                />
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => scrollByPage(1)}
          className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card hover:bg-secondary sm:flex"
          aria-label="Próximos dias"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
