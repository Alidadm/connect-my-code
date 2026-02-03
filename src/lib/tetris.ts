// Tetris game constants and utilities

export type TetrisBlock = number[][];
export type TetrisPiece = {
  shape: TetrisBlock;
  color: string;
  name: string;
};

// Retro pixel-style colors
export const TETRIS_COLORS = {
  I: "hsl(180, 100%, 50%)",  // Cyan
  O: "hsl(50, 100%, 50%)",   // Yellow
  T: "hsl(280, 100%, 60%)",  // Purple
  S: "hsl(120, 100%, 40%)",  // Green
  Z: "hsl(0, 100%, 50%)",    // Red
  J: "hsl(220, 100%, 50%)",  // Blue
  L: "hsl(30, 100%, 50%)",   // Orange
} as const;

export const TETRIS_PIECES: Record<string, TetrisPiece> = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: TETRIS_COLORS.I,
    name: "I",
  },
  O: {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: TETRIS_COLORS.O,
    name: "O",
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: TETRIS_COLORS.T,
    name: "T",
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    color: TETRIS_COLORS.S,
    name: "S",
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    color: TETRIS_COLORS.Z,
    name: "Z",
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: TETRIS_COLORS.J,
    name: "J",
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: TETRIS_COLORS.L,
    name: "L",
  },
};

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;
export const PIECE_NAMES = ["I", "O", "T", "S", "Z", "J", "L"] as const;

// Points for clearing lines
export const POINTS = {
  1: 100,
  2: 300,
  3: 500,
  4: 800,
} as const;

// Get a random piece
export const getRandomPiece = (): TetrisPiece => {
  const randomIndex = Math.floor(Math.random() * PIECE_NAMES.length);
  return TETRIS_PIECES[PIECE_NAMES[randomIndex]];
};

// Create empty board
export const createEmptyBoard = (): (string | null)[][] => {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from({ length: BOARD_WIDTH }, () => null)
  );
};

// Rotate a piece clockwise
export const rotatePiece = (shape: TetrisBlock): TetrisBlock => {
  const rows = shape.length;
  const cols = shape[0].length;
  const rotated: TetrisBlock = [];
  for (let col = 0; col < cols; col++) {
    const newRow: number[] = [];
    for (let row = rows - 1; row >= 0; row--) {
      newRow.push(shape[row][col]);
    }
    rotated.push(newRow);
  }
  return rotated;
};

// Check if a piece can be placed at a position
export const canPlace = (
  board: (string | null)[][],
  shape: TetrisBlock,
  x: number,
  y: number
): boolean => {
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col]) {
        const newX = x + col;
        const newY = y + row;
        if (
          newX < 0 ||
          newX >= BOARD_WIDTH ||
          newY >= BOARD_HEIGHT ||
          (newY >= 0 && board[newY][newX] !== null)
        ) {
          return false;
        }
      }
    }
  }
  return true;
};

// Place a piece on the board
export const placePiece = (
  board: (string | null)[][],
  shape: TetrisBlock,
  color: string,
  x: number,
  y: number
): (string | null)[][] => {
  const newBoard = board.map((row) => [...row]);
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col] && y + row >= 0) {
        newBoard[y + row][x + col] = color;
      }
    }
  }
  return newBoard;
};

// Clear completed lines and return new board with lines cleared count
export const clearLines = (
  board: (string | null)[][]
): { newBoard: (string | null)[][]; linesCleared: number } => {
  const newBoard = board.filter((row) => row.some((cell) => cell === null));
  const linesCleared = BOARD_HEIGHT - newBoard.length;
  while (newBoard.length < BOARD_HEIGHT) {
    newBoard.unshift(Array.from({ length: BOARD_WIDTH }, () => null));
  }
  return { newBoard, linesCleared };
};

// Calculate ghost piece position (where the piece will land)
export const getGhostPosition = (
  board: (string | null)[][],
  shape: TetrisBlock,
  x: number,
  y: number
): number => {
  let ghostY = y;
  while (canPlace(board, shape, x, ghostY + 1)) {
    ghostY++;
  }
  return ghostY;
};

// Calculate level based on lines cleared
export const getLevel = (linesCleared: number): number => {
  return Math.floor(linesCleared / 10) + 1;
};

// Calculate drop interval based on level (faster = harder)
export const getDropInterval = (level: number): number => {
  const baseInterval = 1000;
  const minInterval = 100;
  return Math.max(minInterval, baseInterval - (level - 1) * 80);
};
