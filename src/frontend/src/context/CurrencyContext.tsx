import { type ReactNode, createContext, useContext, useState } from "react";

export const CURRENCIES = [
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "INR", symbol: "₹", label: "Indian Rupee" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "JPY", symbol: "¥", label: "Japanese Yen" },
  { code: "CAD", symbol: "C$", label: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  label: string;
}

interface CurrencyContextValue {
  currency: CurrencyInfo;
  setCurrency: (code: CurrencyCode) => void;
  symbol: string;
  formatAmount: (n: number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>(() => {
    const saved = localStorage.getItem("musc-currency");
    if (saved && CURRENCIES.find((c) => c.code === saved)) {
      return saved as CurrencyCode;
    }
    return "USD";
  });

  const currency =
    CURRENCIES.find((c) => c.code === currencyCode) ?? CURRENCIES[0];

  const setCurrency = (code: CurrencyCode) => {
    setCurrencyCode(code);
    localStorage.setItem("musc-currency", code);
  };

  const formatAmount = (n: number): string => {
    if (currencyCode === "JPY") {
      return `${currency.symbol}${Math.round(n).toLocaleString()}`;
    }
    return `${currency.symbol}${Math.abs(n).toFixed(2)}`;
  };

  return (
    <CurrencyContext.Provider
      value={{ currency, setCurrency, symbol: currency.symbol, formatAmount }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
