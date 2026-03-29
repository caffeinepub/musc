import { type ReactNode, createContext, useContext } from "react";
import {
  type AmbientSoundHook,
  useAmbientSound,
} from "../hooks/useAmbientSound";
import { type SFXContextValue, useSFX } from "../hooks/useSFX";

type FullSFXContext = SFXContextValue & AmbientSoundHook;

const SFXContext = createContext<FullSFXContext | null>(null);

export function SFXProvider({ children }: { children: ReactNode }) {
  const sfx = useSFX();
  const ambient = useAmbientSound();
  return (
    <SFXContext.Provider value={{ ...sfx, ...ambient }}>
      {children}
    </SFXContext.Provider>
  );
}

export function useSFXContext(): FullSFXContext {
  const ctx = useContext(SFXContext);
  if (!ctx) throw new Error("useSFXContext must be used within SFXProvider");
  return ctx;
}
