import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

/**
 * رسائل قصيرة عربية (نجاح / خطأ / تنبيه) تختفي تلقائيًا.
 * لا صوت تلقائي، ولا نافذة منبثقة تحجب القراءة.
 */

type Kind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: Kind;
  message: string;
}

interface ToastApi {
  show: (message: string, kind?: Kind) => void;
}

const Ctx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const remove = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, kind: Kind = "info") => {
      const id = nextId.current++;
      setItems((list) => [...list.slice(-2), { id, kind, message }]);
      window.setTimeout(() => remove(id), 3200);
    },
    [remove]
  );

  const api = useMemo(() => ({ show }), [show]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <div
        className="no-print fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-4"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className="surface flex max-w-md items-center gap-2 px-4 py-2.5 text-sm font-semibold shadow-lg"
            style={{
              borderColor: t.kind === "error" ? "#c98d86" : t.kind === "success" ? "var(--accent)" : "var(--border-strong)",
            }}
          >
            <span
              aria-hidden
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{
                background: t.kind === "error" ? "#a4372e" : t.kind === "success" ? "var(--accent)" : "var(--gold)",
              }}
            />
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
