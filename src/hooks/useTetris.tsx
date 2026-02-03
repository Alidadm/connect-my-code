import { useState, useCallback, useEffect, useRef } from "react";
import {
  TetrisPiece,
  TetrisBlock,
  createEmptyBoard,
  getRandomPiece,
  rotatePiece,
  canPlace,
  placePiece,
  clearLines,
  getGhostPosition,
  getLevel,
  getDropInterval,
  POINTS,
  BOARD_WIDTH,
} from "@/lib/tetris";
import { useGameSounds } from "@/hooks/useGameSounds";

export interface TetrisState {
  board: (string | null)[][];
  currentPiece: TetrisPiece | null;
  nextPiece: TetrisPiece;
  position: { x: number; y: number };
  score: number;
  level: number;
  linesCleared: number;
  gameOver: boolean;
  isPaused: boolean;
  isPlaying: boolean;
}

export const useTetris = () => {
  const { playMatch, playWin, playLose, playGameStart, playFlip } = useGameSounds();
  
  const [state, setState] = useState<TetrisState>(() => ({
    board: createEmptyBoard(),
    currentPiece: null,
    nextPiece: getRandomPiece(),
    position: { x: 3, y: -2 },
    score: 0,
    level: 1,
    linesCleared: 0,
    gameOver: false,
    isPaused: false,
    isPlaying: false,
  }));

  const dropIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get initial position for a piece
  const getInitialPosition = (piece: TetrisPiece) => ({
    x: Math.floor((BOARD_WIDTH - piece.shape[0].length) / 2),
    y: -1,
  });

  // Spawn a new piece
  const spawnPiece = useCallback(() => {
    setState((prev) => {
      const newPiece = prev.nextPiece;
      const initialPos = getInitialPosition(newPiece);

      // Check if game is over (can't place new piece)
      if (!canPlace(prev.board, newPiece.shape, initialPos.x, initialPos.y)) {
        playLose();
        return { ...prev, gameOver: true, isPlaying: false, currentPiece: newPiece, position: initialPos };
      }

      return {
        ...prev,
        currentPiece: newPiece,
        nextPiece: getRandomPiece(),
        position: initialPos,
      };
    });
  }, [playLose]);

  // Lock piece and check for lines
  const lockPiece = useCallback(() => {
    setState((prev) => {
      if (!prev.currentPiece) return prev;

      const newBoard = placePiece(
        prev.board,
        prev.currentPiece.shape,
        prev.currentPiece.color,
        prev.position.x,
        prev.position.y
      );

      const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);
      
      if (linesCleared > 0) {
        playMatch();
      }

      const totalLines = prev.linesCleared + linesCleared;
      const newLevel = getLevel(totalLines);
      const pointsKey = linesCleared as 1 | 2 | 3 | 4;
      const points = linesCleared > 0 ? (POINTS[pointsKey] || 0) * prev.level : 0;

      return {
        ...prev,
        board: clearedBoard,
        currentPiece: null,
        score: prev.score + points,
        linesCleared: totalLines,
        level: newLevel,
      };
    });
  }, [playMatch]);

  // Move piece
  const movePiece = useCallback((dx: number, dy: number) => {
    setState((prev) => {
      if (!prev.currentPiece || prev.gameOver || prev.isPaused) return prev;

      const newX = prev.position.x + dx;
      const newY = prev.position.y + dy;

      if (canPlace(prev.board, prev.currentPiece.shape, newX, newY)) {
        return { ...prev, position: { x: newX, y: newY } };
      }

      // If moving down and can't, lock the piece
      if (dy > 0) {
        return prev; // Will be handled by drop logic
      }

      return prev;
    });
  }, []);

  // Rotate piece
  const rotate = useCallback(() => {
    setState((prev) => {
      if (!prev.currentPiece || prev.gameOver || prev.isPaused) return prev;

      const rotatedShape = rotatePiece(prev.currentPiece.shape);

      // Try normal rotation
      if (canPlace(prev.board, rotatedShape, prev.position.x, prev.position.y)) {
        playFlip();
        return {
          ...prev,
          currentPiece: { ...prev.currentPiece, shape: rotatedShape },
        };
      }

      // Wall kick - try shifting left/right
      for (const offset of [-1, 1, -2, 2]) {
        if (canPlace(prev.board, rotatedShape, prev.position.x + offset, prev.position.y)) {
          playFlip();
          return {
            ...prev,
            currentPiece: { ...prev.currentPiece, shape: rotatedShape },
            position: { ...prev.position, x: prev.position.x + offset },
          };
        }
      }

      return prev;
    });
  }, [playFlip]);

  // Hard drop
  const hardDrop = useCallback(() => {
    setState((prev) => {
      if (!prev.currentPiece || prev.gameOver || prev.isPaused) return prev;

      const ghostY = getGhostPosition(prev.board, prev.currentPiece.shape, prev.position.x, prev.position.y);
      const dropDistance = ghostY - prev.position.y;

      return {
        ...prev,
        position: { ...prev.position, y: ghostY },
        score: prev.score + dropDistance * 2,
      };
    });
    // Lock immediately after hard drop
    setTimeout(lockPiece, 50);
  }, [lockPiece]);

  // Soft drop (faster falling)
  const softDrop = useCallback(() => {
    movePiece(0, 1);
  }, [movePiece]);

  // Drop logic (called on interval)
  const drop = useCallback(() => {
    setState((prev) => {
      if (!prev.currentPiece || prev.gameOver || prev.isPaused) return prev;

      const newY = prev.position.y + 1;

      if (canPlace(prev.board, prev.currentPiece.shape, prev.position.x, newY)) {
        return { ...prev, position: { ...prev.position, y: newY } };
      }

      // Can't move down, lock the piece
      const newBoard = placePiece(
        prev.board,
        prev.currentPiece.shape,
        prev.currentPiece.color,
        prev.position.x,
        prev.position.y
      );

      const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);

      if (linesCleared > 0) {
        playMatch();
      }

      const totalLines = prev.linesCleared + linesCleared;
      const newLevel = getLevel(totalLines);
      const pointsKey = linesCleared as 1 | 2 | 3 | 4;
      const points = linesCleared > 0 ? (POINTS[pointsKey] || 0) * prev.level : 0;

      // Get next piece
      const newPiece = prev.nextPiece;
      const initialPos = getInitialPosition(newPiece);

      // Check for game over
      if (!canPlace(clearedBoard, newPiece.shape, initialPos.x, initialPos.y)) {
        playLose();
        return {
          ...prev,
          board: clearedBoard,
          currentPiece: null,
          score: prev.score + points,
          linesCleared: totalLines,
          level: newLevel,
          gameOver: true,
          isPlaying: false,
        };
      }

      return {
        ...prev,
        board: clearedBoard,
        currentPiece: newPiece,
        nextPiece: getRandomPiece(),
        position: initialPos,
        score: prev.score + points,
        linesCleared: totalLines,
        level: newLevel,
      };
    });
  }, [playMatch, playLose]);

  // Start game
  const startGame = useCallback(() => {
    playGameStart();
    const firstPiece = getRandomPiece();
    setState({
      board: createEmptyBoard(),
      currentPiece: firstPiece,
      nextPiece: getRandomPiece(),
      position: getInitialPosition(firstPiece),
      score: 0,
      level: 1,
      linesCleared: 0,
      gameOver: false,
      isPaused: false,
      isPlaying: true,
    });
  }, [playGameStart]);

  // Pause/Resume
  const togglePause = useCallback(() => {
    setState((prev) => {
      if (prev.gameOver) return prev;
      return { ...prev, isPaused: !prev.isPaused };
    });
  }, []);

  // Game loop
  useEffect(() => {
    if (!state.isPlaying || state.gameOver || state.isPaused) {
      if (dropIntervalRef.current) {
        clearInterval(dropIntervalRef.current);
        dropIntervalRef.current = null;
      }
      return;
    }

    const interval = getDropInterval(state.level);
    dropIntervalRef.current = setInterval(drop, interval);

    return () => {
      if (dropIntervalRef.current) {
        clearInterval(dropIntervalRef.current);
      }
    };
  }, [state.isPlaying, state.gameOver, state.isPaused, state.level, drop]);

  // Ghost position for current piece
  const ghostY = state.currentPiece
    ? getGhostPosition(state.board, state.currentPiece.shape, state.position.x, state.position.y)
    : state.position.y;

  return {
    state,
    ghostY,
    startGame,
    togglePause,
    movePiece,
    rotate,
    hardDrop,
    softDrop,
  };
};
