export type Player = 'X' | 'O' | null;
export type BoardState = Player[];
export type SuperBoardState = BoardState[];

export interface GameState {
  superBoard: SuperBoardState;
  subBoardWinners: (Player | 'Draw')[];
  currentPlayer: 'X' | 'O';
  nextRequiredSubBoard: number | null;
  winner: Player | 'Draw';
  moves: Move[];
}

export interface Move {
  superGridIndex: number;
  subGridIndex: number;
  player: 'X' | 'O';
}

const WINNING_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

export function checkWinner(board: (Player | 'Draw')[]): Player | 'Draw' {
  for (const [a, b, c] of WINNING_COMBINATIONS) {
    if (board[a] && board[a] !== 'Draw' && board[a] === board[b] && board[a] === board[c]) {
      return board[a] as Player;
    }
  }
  if (board.every(cell => cell !== null)) {
    return 'Draw';
  }
  return null;
}

export function createInitialState(): GameState {
  return {
    superBoard: Array(9).fill(null).map(() => Array(9).fill(null)),
    subBoardWinners: Array(9).fill(null),
    currentPlayer: 'X',
    nextRequiredSubBoard: null,
    winner: null,
    moves: []
  };
}

export function isValidMove(state: GameState, superGridIndex: number, subGridIndex: number): boolean {
  if (state.winner !== null) return false;
  if (state.nextRequiredSubBoard !== null && state.nextRequiredSubBoard !== superGridIndex) return false;
  if (state.subBoardWinners[superGridIndex] !== null) return false;
  if (state.superBoard[superGridIndex][subGridIndex] !== null) return false;
  return true;
}

export function applyMove(state: GameState, move: Move): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const { superGridIndex, subGridIndex, player } = move;

  newState.superBoard[superGridIndex][subGridIndex] = player;
  newState.moves.push(move);

  // Check sub-board winner
  const subWinner = checkWinner(newState.superBoard[superGridIndex]);
  if (subWinner) {
    newState.subBoardWinners[superGridIndex] = subWinner;
  }

  // Check super-board winner
  const superWinner = checkWinner(newState.subBoardWinners);
  if (superWinner) {
    newState.winner = superWinner;
  }

  // Determine next required sub-board
  if (newState.winner === null) {
    const nextSubBoard = subGridIndex;
    if (newState.subBoardWinners[nextSubBoard] !== null || newState.superBoard[nextSubBoard].every(c => c !== null)) {
      newState.nextRequiredSubBoard = null; // Free move
    } else {
      newState.nextRequiredSubBoard = nextSubBoard;
    }
    newState.currentPlayer = player === 'X' ? 'O' : 'X';
  }

  return newState;
}
