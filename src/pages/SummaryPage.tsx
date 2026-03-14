import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

export default function SummaryPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700"
      >
        <h1 className="text-4xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
          Match Summary
        </h1>
        <p className="text-slate-400 text-center mb-8 font-mono">ID: {matchId}</p>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-900 p-6 rounded-xl text-center border border-slate-800">
            <h3 className="text-lg font-bold text-slate-400 mb-2">Elo Change</h3>
            <div className="text-4xl font-black text-emerald-400">+15</div>
            <div className="text-sm text-slate-500 mt-2">New Rating: 1215</div>
          </div>
          <div className="bg-slate-900 p-6 rounded-xl text-center border border-slate-800">
            <h3 className="text-lg font-bold text-slate-400 mb-2">Accuracy</h3>
            <div className="text-4xl font-black text-indigo-400">87%</div>
            <div className="text-sm text-slate-500 mt-2">Excellent Play</div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold border-b border-slate-700 pb-2">Move Analysis</h3>
          <div className="flex justify-between items-center p-3 bg-slate-900 rounded-lg">
            <span className="text-emerald-400 font-bold">Best Moves</span>
            <span className="font-mono">12</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-900 rounded-lg">
            <span className="text-blue-400 font-bold">Good Moves</span>
            <span className="font-mono">5</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-900 rounded-lg">
            <span className="text-yellow-400 font-bold">Inaccuracies</span>
            <span className="font-mono">2</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-900 rounded-lg">
            <span className="text-red-400 font-bold">Blunders</span>
            <span className="font-mono">0</span>
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <button
            onClick={() => navigate('/lobby')}
            className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold transition-colors"
          >
            Back to Lobby
          </button>
          <button
            className="flex-1 py-4 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold transition-colors"
          >
            Replay Match
          </button>
        </div>
      </motion.div>
    </div>
  );
}
