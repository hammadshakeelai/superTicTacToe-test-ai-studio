import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl text-center space-y-8"
      >
        <h1 className="text-6xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
          Super Tic-Tac-Toe
        </h1>
        <p className="text-xl text-slate-300">
          Experience the ultimate strategic challenge. 9 boards, 1 winner.
          Play against friends, climb the Elo ladder, and analyze your moves with our AI grader.
        </p>
        <div className="flex justify-center gap-4 pt-8">
          <Link
            to="/register"
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-semibold transition-colors"
          >
            Get Started
          </Link>
          <Link
            to="/login"
            className="px-8 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-semibold transition-colors"
          >
            Sign In
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
