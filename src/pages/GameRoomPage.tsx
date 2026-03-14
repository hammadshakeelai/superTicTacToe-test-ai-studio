import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { GameState, Move } from '../gameLogic';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for Tailwind classes
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function GameRoomPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const { user, profile } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerRole, setPlayerRole] = useState<'X' | 'O' | null>(null);
  const [accuracyLog, setAccuracyLog] = useState<{ move: Move, label: string, delta: number }[]>([]);

  useEffect(() => {
    if (!user || !matchId) return;

    // Connect to Socket.io server
    // Using APP_URL from env, or fallback to window.location.origin
    const serverUrl = (import.meta as any).env?.VITE_APP_URL || window.location.origin;
    const newSocket = io(serverUrl);
    setSocket(newSocket);

    // Join match
    newSocket.emit('join_match', { matchId, userId: user.uid });

    newSocket.on('match_state', (state: GameState) => {
      setGameState(state);
      // Determine role based on who joined first (simplified)
      // In a real app, this would be determined by the server
      if (!playerRole) {
        setPlayerRole(state.moves.length % 2 === 0 ? 'X' : 'O');
      }
    });

    newSocket.on('move_made', ({ move, state, accuracy }) => {
      setGameState(state);
      if (accuracy) {
        setAccuracyLog(prev => [...prev, { move, label: accuracy.label, delta: accuracy.heuristicDelta }]);
      }
    });

    newSocket.on('game_over', ({ winner }) => {
      alert(`Game Over! Winner: ${winner}`);
      navigate(`/summary/${matchId}`);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [matchId, user]);

  const handleCellClick = (superIdx: number, subIdx: number) => {
    if (!socket || !gameState || !playerRole) return;
    if (gameState.currentPlayer !== playerRole) return;
    if (gameState.winner !== null) return;

    // Validate move locally before sending
    if (gameState.nextRequiredSubBoard !== null && gameState.nextRequiredSubBoard !== superIdx) return;
    if (gameState.subBoardWinners[superIdx] !== null) return;
    if (gameState.superBoard[superIdx][subIdx] !== null) return;

    const move: Move = { superGridIndex: superIdx, subGridIndex: subIdx, player: playerRole };
    socket.emit('make_move', { matchId, move });
  };

  if (!gameState) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Connecting to match...</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/lobby')} className="text-slate-400 hover:text-white transition-colors">
            &larr; Back to Lobby
          </button>
          <h1 className="text-xl font-bold text-white">Match: <span className="text-indigo-400 font-mono">{matchId}</span></h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm font-medium">
            Theme:
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as any)}
              className="ml-2 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="standard">Standard</option>
              <option value="retro">Retro Pixel</option>
              <option value="neon">Neon Cyberpunk</option>
              <option value="minimalist">Clean Minimalist</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
            <span className="text-sm font-medium text-emerald-400">Connected</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Game Area */}
        <main className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-2">
              {gameState.winner ? (
                <span className="text-emerald-400">Winner: {gameState.winner}</span>
              ) : (
                <span>Current Turn: <span className={gameState.currentPlayer === 'X' ? 'text-indigo-400' : 'text-rose-400'}>{gameState.currentPlayer}</span></span>
              )}
            </h2>
            <p className="text-slate-400">You are playing as: <strong className="text-white">{playerRole}</strong></p>
          </div>

          {/* SuperBoard */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 p-4 bg-slate-800 rounded-2xl shadow-2xl">
            {gameState.superBoard.map((subBoard, superIdx) => {
              const isRequired = gameState.nextRequiredSubBoard === superIdx;
              const isFree = gameState.nextRequiredSubBoard === null && gameState.subBoardWinners[superIdx] === null;
              const isPlayable = (isRequired || isFree) && gameState.winner === null && gameState.currentPlayer === playerRole;
              const subWinner = gameState.subBoardWinners[superIdx];

              return (
                <div
                  key={superIdx}
                  className={cn(
                    "relative grid grid-cols-3 gap-1 p-2 rounded-xl transition-all duration-300",
                    isPlayable ? "bg-indigo-500/20 ring-2 ring-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)]" : "bg-slate-900/50",
                    subWinner ? "opacity-50" : ""
                  )}
                >
                  {/* SubBoard Winner Overlay */}
                  {subWinner && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-slate-900/80 rounded-xl backdrop-blur-sm">
                      <span className={cn(
                        "text-6xl font-black",
                        subWinner === 'X' ? "text-indigo-500" : "text-rose-500"
                      )}>
                        {subWinner}
                      </span>
                    </div>
                  )}

                  {/* Cells */}
                  {subBoard.map((cell, subIdx) => (
                    <button
                      key={subIdx}
                      onClick={() => handleCellClick(superIdx, subIdx)}
                      disabled={!isPlayable || cell !== null || subWinner !== null}
                      className={cn(
                        "w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center text-2xl sm:text-3xl font-bold rounded-lg transition-all duration-200",
                        cell === null && isPlayable ? "hover:bg-indigo-500/30 cursor-pointer bg-slate-800" : "bg-slate-800 cursor-default",
                        cell === 'X' ? "text-indigo-400" : "text-rose-400"
                      )}
                    >
                      {cell && (
                        <motion.span
                          initial={{ scale: 0, rotate: -45 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                          {cell}
                        </motion.span>
                      )}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </main>

        {/* Sidebar: Accuracy Log & Chat */}
        <aside className="w-80 border-l border-slate-800 bg-slate-900/50 flex flex-col">
          <div className="p-4 border-b border-slate-800">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              AI Move Analysis
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {accuracyLog.length === 0 ? (
              <p className="text-sm text-slate-500 text-center mt-4">Make a move to see AI analysis.</p>
            ) : (
              accuracyLog.map((log, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    "p-3 rounded-xl border text-sm",
                    log.label === 'Best Move' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                    log.label === 'Good Move' ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
                    log.label === 'Inaccuracy' ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400" :
                    "bg-red-500/10 border-red-500/20 text-red-400"
                  )}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold">Move {i + 1} ({log.move.player})</span>
                    <span className="font-mono text-xs opacity-70">Δ {log.delta}</span>
                  </div>
                  <div className="font-medium">{log.label}</div>
                </motion.div>
              ))
            )}
          </div>
          
          {/* Chat Box */}
          <div className="h-1/3 border-t border-slate-800 flex flex-col bg-slate-900">
            <div className="p-3 border-b border-slate-800 bg-slate-800/50">
              <h4 className="text-sm font-bold text-white">Match Chat</h4>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="text-xs text-slate-500 text-center">Chat connected.</div>
            </div>
            <div className="p-3 border-t border-slate-800">
              <input
                type="text"
                placeholder="Type a message..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
