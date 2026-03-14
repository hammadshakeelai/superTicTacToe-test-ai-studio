import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { GameState, Move } from '../gameLogic';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
  const [playerRole, setPlayerRole] = useState<'X' | 'O' | 'Spectator' | null>(null);
  const [accuracyLog, setAccuracyLog] = useState<{ move: Move, label: string, delta: number }[]>([]);
  
  const [chatMessages, setChatMessages] = useState<{sender: string, message: string, timestamp: number}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [evaluation, setEvaluation] = useState<number>(0);
  const [hintMove, setHintMove] = useState<Move | null>(null);

  useEffect(() => {
    if (!user || !matchId) return;

    const serverUrl = (import.meta as any).env?.VITE_APP_URL || window.location.origin;
    const newSocket = io(serverUrl);
    setSocket(newSocket);

    // We don't know if it's a bot match from the URL, but the server handles it if it was created as one.
    newSocket.emit('join_match', { matchId, userId: user.uid });

    newSocket.on('match_joined', ({ state, role }) => {
      setGameState(state);
      setPlayerRole(role);
    });

    newSocket.on('match_state', (state: GameState) => {
      setGameState(state);
    });

    newSocket.on('move_made', ({ move, state, accuracy, evaluation: evalScore }) => {
      setGameState(state);
      setHintMove(null); // Clear hint on new move
      if (evalScore !== undefined) setEvaluation(evalScore);
      if (accuracy) {
        setAccuracyLog(prev => [...prev, { move, label: accuracy.label, delta: accuracy.heuristicDelta }]);
      }
    });

    newSocket.on('receive_hint', (move: Move) => {
      setHintMove(move);
    });

    newSocket.on('receive_message', (data) => {
      setChatMessages(prev => [...prev, data]);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    newSocket.on('game_over', ({ winner }) => {
      alert(`Game Over! Winner: ${winner}`);
      navigate(`/lobby`);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [matchId, user]);

  const handleCellClick = (superIdx: number, subIdx: number) => {
    if (!socket || !gameState || !playerRole) return;
    if (gameState.currentPlayer !== playerRole || playerRole === 'Spectator') return;
    if (gameState.winner !== null) return;

    if (gameState.nextRequiredSubBoard !== null && gameState.nextRequiredSubBoard !== superIdx) return;
    if (gameState.subBoardWinners[superIdx] !== null) return;
    if (gameState.superBoard[superIdx][subIdx] !== null) return;

    const move: Move = { superGridIndex: superIdx, subGridIndex: subIdx, player: playerRole as 'X' | 'O' };
    socket.emit('make_move', { matchId, move });
  };

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket) return;
    socket.emit('send_message', {
      roomId: matchId,
      sender: profile?.username || user?.displayName || 'Player',
      message: chatInput.trim(),
      timestamp: Date.now()
    });
    setChatInput('');
  };

  const handleResign = () => {
    if (window.confirm("Are you sure you want to resign?")) {
      alert("You resigned.");
      navigate('/lobby');
    }
  };

  if (!gameState) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Connecting to match...</div>;

  // Calculate Evaluation Bar percentage (0 to 100, 50 is even)
  // Eval is roughly -100 to +100 (excluding 1000 for win)
  let evalPercent = 50;
  if (evaluation > 500) evalPercent = 100;
  else if (evaluation < -500) evalPercent = 0;
  else evalPercent = 50 + (evaluation / 100) * 50;
  
  // Clamp between 5 and 95 so it's always visible unless someone won
  if (evaluation < 500 && evaluation > -500) {
    evalPercent = Math.max(5, Math.min(95, evalPercent));
  }

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
          <button 
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert("Match link copied to clipboard!");
            }}
            className="px-3 py-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded border border-emerald-500/20 text-sm font-medium transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            Share Link
          </button>
          <button 
            onClick={() => socket?.emit('request_hint', { matchId })} 
            disabled={gameState.currentPlayer !== playerRole || gameState.winner !== null}
            className="px-3 py-1 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-blue-500/20 text-sm font-medium transition-colors"
          >
            Hint
          </button>
          <button onClick={handleResign} className="px-3 py-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded border border-red-500/20 text-sm font-medium transition-colors">
            Resign
          </button>
          <button onClick={() => alert("Draw offer sent.")} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-600 text-sm font-medium transition-colors">
            Offer Draw
          </button>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
            <span className="text-sm font-medium text-emerald-400">Connected</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Evaluation Bar */}
        <div className="w-8 bg-slate-800 border-r border-slate-700 flex flex-col justify-end relative overflow-hidden">
          <div 
            className="w-full bg-indigo-500 transition-all duration-500 ease-in-out absolute bottom-0"
            style={{ height: `${evalPercent}%` }}
          ></div>
          <div 
            className="w-full bg-rose-500 transition-all duration-500 ease-in-out absolute top-0"
            style={{ height: `${100 - evalPercent}%` }}
          ></div>
          <div className="absolute inset-0 flex flex-col justify-between py-2 items-center text-[10px] font-bold z-10 pointer-events-none mix-blend-difference text-white">
            <span>O</span>
            <span>X</span>
          </div>
        </div>

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
          <div className="grid grid-cols-3 gap-2 sm:gap-4 p-4 bg-slate-800 rounded-2xl shadow-2xl border border-slate-700">
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
                  {subBoard.map((cell, subIdx) => {
                    const isHint = hintMove?.superBoardIdx === superIdx && hintMove?.subBoardIdx === subIdx;
                    return (
                      <button
                        key={subIdx}
                        onClick={() => handleCellClick(superIdx, subIdx)}
                        disabled={!isPlayable || cell !== null || subWinner !== null}
                        className={cn(
                          "w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center text-2xl sm:text-3xl font-bold rounded-lg transition-all duration-200",
                          cell === null && isPlayable ? "hover:bg-indigo-500/30 cursor-pointer bg-slate-800" : "bg-slate-800 cursor-default",
                          cell === 'X' ? "text-indigo-400" : "text-rose-400",
                          isHint ? "ring-2 ring-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)] bg-blue-500/20" : ""
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
                    );
                  })}
                </div>
              );
            })}
          </div>
        </main>

        {/* Sidebar: Accuracy Log & Chat */}
        <aside className="w-80 border-l border-slate-800 bg-slate-900/50 flex flex-col">
          <div className="p-4 border-b border-slate-800 bg-slate-800/50">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Move Analysis
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
          <div className="h-1/2 border-t border-slate-800 flex flex-col bg-slate-900">
            <div className="p-3 border-b border-slate-800 bg-slate-800/50">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Match Chat
              </h4>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-2">
              {chatMessages.length === 0 ? (
                <div className="text-xs text-slate-500 text-center mt-4">Say hi to your opponent!</div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div key={i} className="text-sm">
                    <span className={cn("font-bold", msg.sender === profile?.username ? "text-indigo-400" : "text-rose-400")}>{msg.sender}: </span>
                    <span className="text-slate-300">{msg.message}</span>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={sendChat} className="p-3 border-t border-slate-800">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
}
