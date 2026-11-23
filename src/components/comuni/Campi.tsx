import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { leggiNumero } from "@/lib/formato";
import { cn } from "@/lib/utils";

/** Numero con virgola italiana: conferma all'uscita dal campo. */
export function CampoNumero({
  valore,
  onChange,
  decimali = 3,
  className,
  disabled,
  vuotoNull,
  ...rest
}: {
  valore: number | null;
  onChange: (n: number | null) => void;
  decimali?: number | undefined;
  className?: string | undefined;
  disabled?: boolean | undefined;
  vuotoNull?: boolean | undefined;
  placeholder?: string | undefined;
  "aria-label"?: string | undefined;
}) {
  const fmt = (n: number | null) =>
    n === null || n === undefined ? "" : n.toLocaleString("it-IT", { maximumFractionDigits: decimali, useGrouping: false });
  const [testo, setTesto] = useState(fmt(valore));
  useEffect(() => setTesto(fmt(valore)), [valore]);
  return (
    <Input
      inputMode="decimal"
      value={testo}
      disabled={disabled}
      className={cn("tabular text-right", className)}
      onChange={(e) => setTesto(e.target.value)}
      onBlur={() => {
        const n = leggiNumero(testo);
        if (n === null) {
          if (vuotoNull) onChange(null);
          else setTesto(fmt(valore));
          return;
        }
        if (n !== valore) onChange(n);
        else setTesto(fmt(valore));
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      {...rest}
    />
  );
}

export function Campo({ label, children, className }: { label: string; children: React.ReactNode; className?: string | undefined }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
