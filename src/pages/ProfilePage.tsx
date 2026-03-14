import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs, or } from 'firebase/firestore';
import { motion } from 'motion/react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserProfile } from '../AuthContext';

export default function ProfilePage() {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!uid) return;
      try {
        const docRef = doc(db, 'users', uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        }

        const q = query(
          collection(db, 'match_records'),
          or(
            where('player_x', '==', uid),
            where('player_o', '==', uid)
          ),
          limit(50)
        );
        const historySnap = await getDocs(q);
        const docs = historySnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        docs.sort((a, b) => b.created_at - a.created_at);
        setHistory(docs.slice(0, 20));
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [uid]);

  if (loading) {
    return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">User not found.</div>;
  }

  const winRate = profile.matches_played > 0 
    ? Math.round((profile.wins / profile.matches_played) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/lobby')} className="text-slate-400 hover:text-white transition-colors">
            &larr; Back to Lobby
          </button>
        </div>

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800 rounded-2xl p-8 shadow-xl border border-slate-700 flex flex-col md:flex-row items-center gap-8"
        >
          <div className="w-32 h-32 bg-indigo-600 rounded-full flex items-center justify-center text-5xl font-bold text-white shadow-lg">
            {profile.username?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-4xl font-bold text-white mb-2">{profile.username}</h1>
            <p className="text-slate-400 mb-6">Member since {new Date(profile.created_at).toLocaleDateString()}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                <div className="text-sm text-slate-400 mb-1">Elo Rating</div>
                <div className="text-2xl font-mono font-bold text-indigo-400">{profile.elo_rating}</div>
              </div>
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                <div className="text-sm text-slate-400 mb-1">Matches</div>
                <div className="text-2xl font-mono font-bold text-slate-200">{profile.matches_played || 0}</div>
              </div>
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                <div className="text-sm text-slate-400 mb-1">Win Rate</div>
                <div className="text-2xl font-mono font-bold text-emerald-400">{winRate}%</div>
              </div>
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                <div className="text-sm text-slate-400 mb-1">Accuracy</div>
                <div className="text-2xl font-mono font-bold text-blue-400">{profile.avg_accuracy}%</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Match History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-700"
        >
          <div className="p-6 border-b border-slate-700 bg-slate-800/50">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Recent Matches
            </h2>
          </div>
          
          {history.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No matches played yet.</div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {history.map((match) => {
                const isWinner = match.winner === uid;
                const isDraw = match.winner === 'Draw';
                const resultColor = isWinner ? 'text-emerald-400' : isDraw ? 'text-slate-400' : 'text-red-400';
                const resultText = isWinner ? 'Won' : isDraw ? 'Draw' : 'Lost';
                const opponentName = match.player_x === uid ? match.player_o_name : match.player_x_name;
                
                return (
                  <div key={match.id} className="p-4 hover:bg-slate-700/30 transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold bg-slate-900 border border-slate-700 ${resultColor}`}>
                        {resultText[0]}
                      </div>
                      <div>
                        <div className="font-bold text-white">vs {opponentName || 'Bot'}</div>
                        <div className="text-xs text-slate-400 font-mono">{new Date(match.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-slate-300">{match.moves_count} moves</div>
                      <div className="text-xs text-slate-500 capitalize">{match.status}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
