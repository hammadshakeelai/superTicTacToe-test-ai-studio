import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';

export default function SummaryPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { eloChange?: number, newElo?: number, isWinner?: boolean, isDraw?: boolean, accuracy?: number } | null;

  const eloChange = state?.eloChange ?? 0;
  const newElo = state?.newElo ?? 1200;
  const isWinner = state?.isWinner ?? false;
  const isDraw = state?.isDraw ?? false;
  const accuracy = state?.accuracy;

  const resultText = isWinner ? 'Victory!' : isDraw ? 'Draw' : 'Defeat';
  const resultColor = isWinner ? 'text-emerald-400' : isDraw ? 'text-slate-400' : 'text-red-400';

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700"
      >
        <h1 className={`text-4xl font-bold text-center mb-2 ${resultColor}`}>
          {resultText}
        </h1>
        <p className="text-slate-400 text-center mb-8 font-mono">Match ID: {matchId}</p>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-900 p-6 rounded-xl text-center border border-slate-800">
            <h3 className="text-lg font-bold text-slate-400 mb-2">Elo Change</h3>
            <div className={`text-4xl font-black ${eloChange > 0 ? 'text-emerald-400' : eloChange < 0 ? 'text-red-400' : 'text-slate-400'}`}>
              {eloChange > 0 ? '+' : ''}{eloChange}
            </div>
            <div className="text-sm text-slate-500 mt-2">New Rating: {newElo}</div>
          </div>
          <div className="bg-slate-900 p-6 rounded-xl text-center border border-slate-800">
            <h3 className="text-lg font-bold text-slate-400 mb-2">Accuracy</h3>
            <div className="text-4xl font-black text-indigo-400">{accuracy !== undefined ? `${accuracy}%` : '--%'}</div>
            <div className="text-sm text-slate-500 mt-2">{accuracy !== undefined ? 'Based on AI Evaluation' : 'Analysis Not Available'}</div>
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <button
            onClick={() => navigate('/lobby')}
            className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold transition-colors"
          >
            Back to Lobby
          </button>
        </div>
      </motion.div>
    </div>
  );
}
