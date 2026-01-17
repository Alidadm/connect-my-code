import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface GameSoundSettings {
  isMuted: boolean;
  toggleMute: () => void;
}

const GameSoundSettingsContext = createContext<GameSoundSettings | undefined>(undefined);

const STORAGE_KEY = "game-sounds-muted";

export const GameSoundSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [isMuted, setIsMuted] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "true";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isMuted));
  }, [isMuted]);

  const toggleMute = () => setIsMuted((prev) => !prev);

  return (
    <GameSoundSettingsContext.Provider value={{ isMuted, toggleMute }}>
      {children}
    </GameSoundSettingsContext.Provider>
  );
};

export const useGameSoundSettings = () => {
  const context = useContext(GameSoundSettingsContext);
  if (!context) {
    // Return default values if used outside provider
    return { isMuted: false, toggleMute: () => {} };
  }
  return context;
};
