import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

export default function LobbyPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'match_players'),
        where('user_id', '==', user.uid),
        orderBy('started_at', 'desc'),
        limit(10)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setMatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        console.error("Error fetching match history:", error);
        // Don't crash the UI, just leave matches empty
      });
      return unsubscribe;
    } catch (error) {
      console.error("Error setting up match history listener:", error);
    }
  }, [user]);

  const createPrivateMatch = () => {
    // Generate a random match ID
    const matchId = Math.random().toString(36).substring(2, 10);
    navigate(`/play/${matchId}`);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex">
      {/* Sidebar */}
      <div className="w-80 border-r border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white">Global Chat</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {/* Chat messages would go here */}
          <div className="text-sm text-slate-500 text-center mt-10">Chat coming soon...</div>
        </div>
        <div className="p-4 border-t border-slate-800">
          <input
            type="text"
            placeholder="Type a message..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800 rounded-2xl p-8 flex items-center justify-between shadow-xl"
          >
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-indigo-600 rounded-full flex items-center justify-center text-3xl font-bold text-white">
                {profile?.username?.[0]?.toUpperCase()}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">{profile?.username}</h1>
                <div className="flex gap-4 text-sm text-slate-400">
                  <div className="bg-slate-900 px-3 py-1 rounded-full">
                    Elo: <span className="text-indigo-400 font-mono">{profile?.elo_rating}</span>
                  </div>
                  <div className="bg-slate-900 px-3 py-1 rounded-full">
                    Accuracy: <span className="text-emerald-400 font-mono">{profile?.avg_accuracy}%</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={createPrivateMatch}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-indigo-500/20"
              >
                Find Ranked Match
              </button>
              <button
                onClick={createPrivateMatch}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-colors"
              >
                Create Private Link
              </button>
            </div>
          </motion.div>

          {/* Match History */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Match History</h2>
            <div className="bg-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/50 text-slate-400 text-sm uppercase tracking-wider">
                    <th className="p-4 font-medium">Opponent</th>
                    <th className="p-4 font-medium">Result</th>
                    <th className="p-4 font-medium">Elo Change</th>
                    <th className="p-4 font-medium">Accuracy</th>
                    <th className="p-4 font-medium">Date</th>
                    <th className="p-4 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {matches.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No matches played yet.
                      </td>
                    </tr>
                  ) : (
                    matches.map((match) => (
                      <tr key={match.id} className="hover:bg-slate-700/20 transition-colors">
                        <td className="p-4 text-white">Player {match.opponent_id}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            match.result === 'win' ? 'bg-emerald-500/20 text-emerald-400' :
                            match.result === 'loss' ? 'bg-red-500/20 text-red-400' :
                            'bg-slate-500/20 text-slate-400'
                          }`}>
                            {match.result?.toUpperCase() || 'DRAW'}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-sm">
                          <span className={match.elo_change > 0 ? 'text-emerald-400' : 'text-red-400'}>
                            {match.elo_change > 0 ? '+' : ''}{match.elo_change || 0}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-sm text-slate-300">
                          {match.accuracy_score || 0}%
                        </td>
                        <td className="p-4 text-sm text-slate-400">
                          {new Date(match.started_at).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <button className="text-indigo-400 hover:text-indigo-300 text-sm font-medium">
                            Replay
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
