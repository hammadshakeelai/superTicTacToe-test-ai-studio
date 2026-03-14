import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';

export default function LobbyPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<any[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [chatMessages, setChatMessages] = useState<{sender: string, message: string, timestamp: number}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [showCustomModal, setShowCustomModal] = useState(false);
  const [botDifficulty, setBotDifficulty] = useState(3);
  const [gameMode, setGameMode] = useState<'bot' | 'friend'>('bot');

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
      });
      return unsubscribe;
    } catch (error) {
      console.error("Error setting up match history listener:", error);
    }
  }, [user]);

  useEffect(() => {
    const serverUrl = (import.meta as any).env?.VITE_APP_URL || window.location.origin;
    const newSocket = io(serverUrl);
    setSocket(newSocket);

    newSocket.on('global_chat_receive', (data) => {
      setChatMessages(prev => [...prev, data]);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const sendGlobalChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket) return;
    socket.emit('global_chat_send', {
      sender: profile?.username || user?.displayName || 'Player',
      message: chatInput.trim(),
      timestamp: Date.now()
    });
    setChatInput('');
  };

  const createPrivateMatch = () => {
    const matchId = Math.random().toString(36).substring(2, 10);
    if (socket && user) {
      socket.emit('create_match', { matchId, userId: user.uid });
      setTimeout(() => navigate(`/play/${matchId}`), 100);
    }
  };

  const createBotMatch = () => {
    const matchId = 'bot_' + Math.random().toString(36).substring(2, 10);
    if (socket && user) {
      socket.emit('create_match', { matchId, userId: user.uid, isBotMatch: true, botDifficulty });
      setTimeout(() => navigate(`/play/${matchId}`), 100);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex">
      {/* Sidebar - Global Chat */}
      <div className="w-80 border-r border-slate-800 flex flex-col bg-slate-900/50">
        <div className="p-4 border-b border-slate-800 bg-slate-800/50">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            Global Chat
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {chatMessages.length === 0 ? (
            <div className="text-sm text-slate-500 text-center mt-10">Welcome to Global Chat!</div>
          ) : (
            chatMessages.map((msg, i) => (
              <div key={i} className="text-sm">
                <span className="font-bold text-indigo-400">{msg.sender}: </span>
                <span className="text-slate-300">{msg.message}</span>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>
        <form onSubmit={sendGlobalChat} className="p-4 border-t border-slate-800 bg-slate-900">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type a message..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </form>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between shadow-xl gap-6"
          >
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-indigo-600 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                {profile?.username?.[0]?.toUpperCase()}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">{profile?.username}</h1>
                <div className="flex gap-4 text-sm text-slate-400">
                  <div className="bg-slate-900 px-3 py-1 rounded-full border border-slate-700">
                    Elo: <span className="text-indigo-400 font-mono font-bold">{profile?.elo_rating}</span>
                  </div>
                  <div className="bg-slate-900 px-3 py-1 rounded-full border border-slate-700">
                    Accuracy: <span className="text-emerald-400 font-mono font-bold">{profile?.avg_accuracy}%</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 w-full md:w-auto">
              <button
                onClick={() => { setGameMode('friend'); setShowCustomModal(true); }}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-indigo-500/20 w-full"
              >
                Play Online (PvP)
              </button>
              <button
                onClick={() => { setGameMode('bot'); setShowCustomModal(true); }}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-emerald-500/20 w-full"
              >
                Play Computer (Bot)
              </button>
              <button
                onClick={() => alert("Tournaments feature coming soon!")}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-colors w-full"
              >
                Join Tournament
              </button>
            </div>
          </motion.div>

          {/* Tips Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-xl"
          >
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Pro Tips
            </h2>
            <ul className="space-y-2 text-sm text-slate-300 list-disc list-inside">
              <li><strong>Control the Center:</strong> Winning the center sub-board gives you a massive advantage in the global game.</li>
              <li><strong>Force Moves:</strong> Try to send your opponent to sub-boards that are already won or full, allowing them to play anywhere.</li>
              <li><strong>Sacrifice for Position:</strong> Sometimes losing a sub-board is worth it if it forces your opponent into a bad position on the global board.</li>
              <li><strong>Use Hints:</strong> If you're stuck, use the Hint button in-game to see the AI's suggested move.</li>
            </ul>
          </motion.div>

          {/* Tournaments Section */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Tournaments
              </h2>
              <button
                onClick={() => alert("Tournament creation coming soon!")}
                className="text-sm px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
              >
                Create Tournament
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Placeholder Tournaments */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 shadow-lg flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-white">Weekly Super Cup</h3>
                    <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded">Open</span>
                  </div>
                  <p className="text-sm text-slate-400 mb-4">Join the weekly tournament and climb the leaderboard.</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                    <span className="flex items-center gap-1"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> 12/32 Players</span>
                    <span className="flex items-center gap-1"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Starts in 2h</span>
                  </div>
                </div>
                <button className="w-full py-2 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 rounded-lg font-semibold transition-colors text-sm">
                  Join Tournament
                </button>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 shadow-lg flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-white">Beginner's Brawl</h3>
                    <span className="px-2 py-1 bg-rose-500/20 text-rose-400 text-xs font-bold rounded">Full</span>
                  </div>
                  <p className="text-sm text-slate-400 mb-4">A tournament for players under 1200 Elo.</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                    <span className="flex items-center gap-1"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> 16/16 Players</span>
                    <span className="flex items-center gap-1"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> In Progress</span>
                  </div>
                </div>
                <button disabled className="w-full py-2 bg-slate-700/50 text-slate-500 cursor-not-allowed rounded-lg font-semibold text-sm">
                  Spectate
                </button>
              </div>
            </div>
          </div>

          {/* Match History */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Match History</h2>
            <div className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/50 text-slate-400 text-sm uppercase tracking-wider">
                    <th className="p-4 font-medium">Opponent</th>
                    <th className="p-4 font-medium">Result</th>
                    <th className="p-4 font-medium">Elo Change</th>
                    <th className="p-4 font-medium">Accuracy</th>
                    <th className="p-4 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {matches.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        No matches played yet.
                      </td>
                    </tr>
                  ) : (
                    matches.map((match) => (
                      <tr key={match.id} className="hover:bg-slate-700/20 transition-colors">
                        <td className="p-4 text-white font-medium">Player {match.opponent_id}</td>
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
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Game Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700 shadow-2xl"
          >
            <h3 className="text-2xl font-bold text-white mb-4">Custom Game</h3>
            
            <div className="flex gap-2 mb-6 p-1 bg-slate-900/50 rounded-lg">
              <button 
                onClick={() => setGameMode('bot')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${gameMode === 'bot' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Play Bot
              </button>
              <button 
                onClick={() => setGameMode('friend')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${gameMode === 'friend' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Play a Friend
              </button>
            </div>

            {gameMode === 'bot' && (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Bot Difficulty (Depth)</label>
                  <input 
                    type="range" 
                    min="1" max="5" 
                    value={botDifficulty} 
                    onChange={(e) => setBotDifficulty(parseInt(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1 font-mono">
                    <span>1 (Easy)</span>
                    <span>3 (Med)</span>
                    <span>5 (Hard)</span>
                  </div>
                </div>
              </div>
            )}

            {gameMode === 'friend' && (
              <div className="mb-6 text-sm text-slate-400 text-center">
                Create a private match and share the link with a friend to play together!
              </div>
            )}

            <div className="flex gap-3">
              <button 
                onClick={() => setShowCustomModal(false)}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={gameMode === 'bot' ? createBotMatch : createPrivateMatch}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-emerald-500/20"
              >
                Start Game
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
