import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

function SimpleTicTacToeDemo() {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [winner, setWinner] = useState<string | null>(null);

  const checkWinner = (squares: (string | null)[]) => {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) return squares[a];
    }
    if (!squares.includes(null)) return 'Draw';
    return null;
  };

  const handleMove = (idx: number) => {
    if (board[idx] || winner) return;
    
    const newBoard = [...board];
    newBoard[idx] = 'X';
    let currentWinner = checkWinner(newBoard);
    setBoard(newBoard);
    setWinner(currentWinner);

    if (!currentWinner) {
      setTimeout(() => {
        const emptyIndices = newBoard.map((v, i) => v === null ? i : null).filter(v => v !== null) as number[];
        if (emptyIndices.length > 0) {
          const botIdx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
          const botBoard = [...newBoard];
          botBoard[botIdx] = 'O';
          setBoard(botBoard);
          setWinner(checkWinner(botBoard));
        }
      }, 400);
    }
  };

  const reset = () => { setBoard(Array(9).fill(null)); setWinner(null); };

  return (
    <div className="flex flex-col items-center bg-slate-800/80 p-6 rounded-2xl shadow-xl w-full max-w-sm border border-slate-700">
      <h3 className="text-xl font-bold text-white mb-1">Simple Tic-Tac-Toe</h3>
      <p className="text-slate-400 text-sm mb-6">Play against a random bot!</p>
      <div className="grid grid-cols-3 gap-2 mb-6">
        {board.map((cell, idx) => (
          <button
            key={idx}
            onClick={() => handleMove(idx)}
            disabled={!!cell || !!winner}
            className={cn(
              "w-16 h-16 flex items-center justify-center text-3xl font-bold rounded-xl transition-all duration-200",
              !cell && !winner ? "bg-slate-700 hover:bg-slate-600 cursor-pointer" : "bg-slate-900/50 cursor-default",
              cell === 'X' ? "text-indigo-400" : "text-rose-400"
            )}
          >
            {cell && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>{cell}</motion.span>
            )}
          </button>
        ))}
      </div>
      {winner ? (
        <div className="text-center h-10">
          <div className="text-lg font-bold text-emerald-400 mb-2">{winner === 'Draw' ? "It's a Draw!" : `${winner} Wins!`}</div>
          <button onClick={reset} className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors">Play Again</button>
        </div>
      ) : (
        <div className="h-10"></div>
      )}
    </div>
  );
}

function SuperTicTacToeDemo() {
  const [superBoard, setSuperBoard] = useState<(string | null)[][]>(Array(9).fill(null).map(() => Array(9).fill(null)));
  const [subWinners, setSubWinners] = useState<(string | null)[]>(Array(9).fill(null));
  const [nextRequired, setNextRequired] = useState<number | null>(null);
  const [winner, setWinner] = useState<string | null>(null);

  const checkLine = (squares: (string | null)[]) => {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) return squares[a];
    }
    if (!squares.includes(null)) return 'Draw';
    return null;
  };

  const handleMove = (superIdx: number, subIdx: number) => {
    if (winner) return;
    if (nextRequired !== null && nextRequired !== superIdx) return;
    if (subWinners[superIdx] !== null) return;
    if (superBoard[superIdx][subIdx] !== null) return;

    const newSuperBoard = superBoard.map(arr => [...arr]);
    newSuperBoard[superIdx][subIdx] = 'X';
    
    const newSubWinners = [...subWinners];
    const subWinner = checkLine(newSuperBoard[superIdx]);
    if (subWinner) newSubWinners[superIdx] = subWinner;

    const gameWinner = checkLine(newSubWinners);
    
    let nextReq: number | null = subIdx;
    if (newSubWinners[nextReq] !== null) nextReq = null;

    setSuperBoard(newSuperBoard);
    setSubWinners(newSubWinners);
    setNextRequired(nextReq);
    setWinner(gameWinner);

    if (!gameWinner) {
      setTimeout(() => {
        let botSuperIdx = nextReq;
        if (botSuperIdx === null) {
          const availableSuper = newSubWinners.map((w, i) => w === null ? i : null).filter(v => v !== null) as number[];
          if (availableSuper.length === 0) {
            setWinner('Draw');
            return;
          }
          botSuperIdx = availableSuper[Math.floor(Math.random() * availableSuper.length)];
        }

        const availableSub = newSuperBoard[botSuperIdx].map((c, i) => c === null ? i : null).filter(v => v !== null) as number[];
        if (availableSub.length > 0) {
          const botSubIdx = availableSub[Math.floor(Math.random() * availableSub.length)];
          
          const botSuperBoard = newSuperBoard.map(arr => [...arr]);
          botSuperBoard[botSuperIdx][botSubIdx] = 'O';
          
          const botSubWinners = [...newSubWinners];
          const bSubWinner = checkLine(botSuperBoard[botSuperIdx]);
          if (bSubWinner) botSubWinners[botSuperIdx] = bSubWinner;

          const bGameWinner = checkLine(botSubWinners);
          
          let bNextReq: number | null = botSubIdx;
          if (botSubWinners[bNextReq] !== null) bNextReq = null;

          setSuperBoard(botSuperBoard);
          setSubWinners(botSubWinners);
          setNextRequired(bNextReq);
          setWinner(bGameWinner);
        }
      }, 400);
    }
  };

  const reset = () => {
    setSuperBoard(Array(9).fill(null).map(() => Array(9).fill(null)));
    setSubWinners(Array(9).fill(null));
    setNextRequired(null);
    setWinner(null);
  };

  return (
    <div className="flex flex-col items-center bg-slate-800/80 p-6 rounded-2xl shadow-xl w-full max-w-md border border-slate-700">
      <h3 className="text-xl font-bold text-white mb-1">Super Tic-Tac-Toe</h3>
      <p className="text-slate-400 text-sm mb-6">A game of games. Play against the bot!</p>
      <div className="grid grid-cols-3 gap-2 mb-6 bg-slate-900 p-3 rounded-xl shadow-inner">
        {superBoard.map((subBoard, superIdx) => {
          const isRequired = nextRequired === superIdx;
          const isFree = nextRequired === null && subWinners[superIdx] === null;
          const isPlayable = (isRequired || isFree) && !winner;
          const sWinner = subWinners[superIdx];

          return (
            <div key={superIdx} className={cn(
              "relative grid grid-cols-3 gap-1 p-1.5 rounded-lg transition-all duration-300",
              isPlayable ? "bg-indigo-500/20 ring-2 ring-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.2)]" : "bg-slate-800",
              sWinner ? "opacity-50" : ""
            )}>
              {sWinner && sWinner !== 'Draw' && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-slate-900/80 rounded-lg backdrop-blur-sm">
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className={cn("text-5xl font-black", sWinner === 'X' ? "text-indigo-500" : "text-rose-500")}>{sWinner}</motion.span>
                </div>
              )}
              {subBoard.map((cell, subIdx) => (
                <button
                  key={subIdx}
                  onClick={() => handleMove(superIdx, subIdx)}
                  disabled={!isPlayable || !!cell || !!sWinner}
                  className={cn(
                    "w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center text-sm sm:text-lg font-bold rounded transition-colors",
                    !cell && isPlayable ? "bg-slate-700 hover:bg-slate-600 cursor-pointer" : "bg-slate-900/50 cursor-default",
                    cell === 'X' ? "text-indigo-400" : "text-rose-400"
                  )}
                >
                  {cell && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>{cell}</motion.span>}
                </button>
              ))}
            </div>
          )
        })}
      </div>
      {winner ? (
        <div className="text-center h-10">
          <div className="text-lg font-bold text-emerald-400 mb-2">{winner === 'Draw' ? "It's a Draw!" : `${winner} Wins!`}</div>
          <button onClick={reset} className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors">Play Again</button>
        </div>
      ) : (
        <div className="h-10"></div>
      )}
    </div>
  );
}

export default function AuthPage() {
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const isLogin = location.pathname === '/login';

  const handleGoogleAuth = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/lobby');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col lg:flex-row overflow-hidden">
      {/* Left Side - Auth */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12 z-10 bg-slate-900 shadow-2xl">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-700"
        >
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-slate-400 text-sm">Sign in to play ranked matches and track your Elo.</p>
          </div>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-6 text-sm text-center">
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleAuth}
            className="w-full py-3.5 px-4 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-center gap-3 shadow-lg"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <p className="mt-8 text-center text-slate-400 text-sm">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => navigate(isLogin ? '/register' : '/login')}
              className="text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </motion.div>
      </div>

      {/* Right Side - Demos */}
      <div className="flex-1 bg-slate-900/50 border-t lg:border-t-0 lg:border-l border-slate-800 p-8 flex flex-col items-center justify-start lg:justify-center gap-8 overflow-y-auto relative">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-500 rounded-full mix-blend-screen filter blur-[100px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-rose-500 rounded-full mix-blend-screen filter blur-[100px]"></div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center z-10 mt-8 lg:mt-0"
        >
          <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Try it out!</h2>
          <p className="text-slate-400">Play a quick match against our random bot before signing in.</p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="z-10 w-full flex justify-center"
        >
          <SimpleTicTacToeDemo />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="z-10 w-full flex justify-center pb-8"
        >
          <SuperTicTacToeDemo />
        </motion.div>
      </div>
    </div>
  );
}
