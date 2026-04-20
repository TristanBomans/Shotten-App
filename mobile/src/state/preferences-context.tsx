import { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_PREFERENCES, getPreferences } from "./preferences";
import type { Preferences } from "./preferences";

interface PreferencesContextValue {
  preferences: Preferences;
  isLoading: boolean;
  reload: () => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    const prefs = await getPreferences();
    setPreferences(prefs);
    setIsLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <PreferencesContext.Provider value={{ preferences, isLoading, reload: () => void load() }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return context;
}