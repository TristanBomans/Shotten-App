import { createContext, useContext, useEffect, useState } from "react";
import type { PlayerSession } from "./player-session";
import { getPlayerSession } from "./player-session";

interface SessionContextValue {
  session: PlayerSession;
  isLoading: boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      const existingSession = await getPlayerSession();
      if (existingSession) {
        setSession(existingSession);
      }
      setIsLoading(false);
    }

    void loadSession();
  }, []);

  if (isLoading || !session) {
    return null;
  }

  return (
    <SessionContext.Provider value={{ session, isLoading: false }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): PlayerSession {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context.session;
}