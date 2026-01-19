import { useState, useEffect, createContext, useContext, ReactNode } from "react";

export interface GameSidebarVisibility {
  tictactoe: boolean;
  sudoku: boolean;
  memory: boolean;
}

interface GameSidebarVisibilityContextType {
  visibility: GameSidebarVisibility;
  toggleGame: (game: keyof GameSidebarVisibility) => void;
  isVisible: (game: keyof GameSidebarVisibility) => boolean;
}

const STORAGE_KEY = "gameSidebarVisibility";

const defaultVisibility: GameSidebarVisibility = {
  tictactoe: false,
  sudoku: true, // Sudoku visible by default (saved games)
  memory: false,
};

const GameSidebarVisibilityContext = createContext<GameSidebarVisibilityContextType | undefined>(undefined);

export const GameSidebarVisibilityProvider = ({ children }: { children: ReactNode }) => {
  const [visibility, setVisibility] = useState<GameSidebarVisibility>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...defaultVisibility, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error("Error reading game sidebar visibility:", e);
    }
    return defaultVisibility;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visibility));
    } catch (e) {
      console.error("Error saving game sidebar visibility:", e);
    }
  }, [visibility]);

  const toggleGame = (game: keyof GameSidebarVisibility) => {
    setVisibility((prev) => ({
      ...prev,
      [game]: !prev[game],
    }));
  };

  const isVisible = (game: keyof GameSidebarVisibility) => visibility[game];

  return (
    <GameSidebarVisibilityContext.Provider value={{ visibility, toggleGame, isVisible }}>
      {children}
    </GameSidebarVisibilityContext.Provider>
  );
};

export const useGameSidebarVisibility = () => {
  const context = useContext(GameSidebarVisibilityContext);
  if (!context) {
    throw new Error("useGameSidebarVisibility must be used within GameSidebarVisibilityProvider");
  }
  return context;
};
