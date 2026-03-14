import { GameState, Move, checkWinner, applyMove, Player } from './gameLogic';

const MAX_DEPTH = 3;

function evaluateBoard(state: GameState, player: 'X' | 'O'): number {
  if (state.winner === player) return 1000;
  if (state.winner === (player === 'X' ? 'O' : 'X')) return -1000;
  if (state.winner === 'Draw') return 0;

  let score = 0;
  for (let i = 0; i < 9; i++) {
    if (state.subBoardWinners[i] === player) score += 10;
    else if (state.subBoardWinners[i] === (player === 'X' ? 'O' : 'X')) score -= 10;
  }
  return score;
}

function getValidMoves(state: GameState): Move[] {
  const moves: Move[] = [];
  const player = state.currentPlayer;

  if (state.nextRequiredSubBoard !== null) {
    const superIdx = state.nextRequiredSubBoard;
    for (let subIdx = 0; subIdx < 9; subIdx++) {
      if (state.superBoard[superIdx][subIdx] === null) {
        moves.push({ superGridIndex: superIdx, subGridIndex: subIdx, player });
      }
    }
  } else {
    for (let superIdx = 0; superIdx < 9; superIdx++) {
      if (state.subBoardWinners[superIdx] === null) {
        for (let subIdx = 0; subIdx < 9; subIdx++) {
          if (state.superBoard[superIdx][subIdx] === null) {
            moves.push({ superGridIndex: superIdx, subGridIndex: subIdx, player });
          }
        }
      }
    }
  }
  return moves;
}

export function minimax(state: GameState, depth: number, alpha: number, beta: number, isMaximizing: boolean, player: 'X' | 'O'): number {
  if (depth === 0 || state.winner !== null) {
    return evaluateBoard(state, player);
  }

  const moves = getValidMoves(state);
  if (moves.length === 0) return evaluateBoard(state, player);

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const newState = applyMove(state, move);
      const ev = minimax(newState, depth - 1, alpha, beta, false, player);
      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const newState = applyMove(state, move);
      const ev = minimax(newState, depth - 1, alpha, beta, true, player);
      minEval = Math.min(minEval, ev);
      beta = Math.min(beta, ev);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

export function evaluateMoveAccuracy(stateBeforeMove: GameState, actualMove: Move): { bestMove: Move | null, heuristicDelta: number, label: string } {
  const player = stateBeforeMove.currentPlayer;
  const validMoves = getValidMoves(stateBeforeMove);
  
  if (validMoves.length === 0) return { bestMove: null, heuristicDelta: 0, label: 'Forced' };

  let bestScore = -Infinity;
  let bestMove: Move | null = null;
  const moveScores = new Map<Move, number>();

  for (const move of validMoves) {
    const newState = applyMove(stateBeforeMove, move);
    const score = minimax(newState, MAX_DEPTH, -Infinity, Infinity, false, player);
    moveScores.set(move, score);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  const actualState = applyMove(stateBeforeMove, actualMove);
  const actualScore = minimax(actualState, MAX_DEPTH, -Infinity, Infinity, false, player);

  const delta = bestScore - actualScore;
  let label = 'Best Move';
  if (delta > 50) label = 'Blunder';
  else if (delta > 20) label = 'Inaccuracy';
  else if (delta > 0) label = 'Good Move';

  return { bestMove, heuristicDelta: delta, label };
}
