import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { GameState, Move, applyMove, createInitialState } from './src/gameLogic.js';
import { evaluateMoveAccuracy } from './src/aiEvaluator.js';

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  const PORT = 3000;
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // matchId -> { state: GameState, players: { X: string, O: string } }
  const activeGames = new Map<string, { state: GameState, players: { X: string, O: string } }>();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('create_match', ({ matchId, userId }) => {
      activeGames.set(matchId, {
        state: createInitialState(),
        players: { X: userId, O: '' }
      });
      socket.join(matchId);
      console.log(`Match ${matchId} created by ${userId}`);
    });

    socket.on('join_match', ({ matchId, userId }) => {
      const game = activeGames.get(matchId);
      if (game) {
        if (!game.players.O && game.players.X !== userId) {
          game.players.O = userId;
        }
        socket.join(matchId);
        io.to(matchId).emit('match_state', game.state);
        console.log(`User ${userId} joined match ${matchId}`);
      }
    });

    socket.on('make_move', async (data) => {
      const { matchId, move } = data;
      const game = activeGames.get(matchId);
      if (game) {
        const stateBefore = game.state;
        
        // Evaluate move accuracy in background (non-blocking for basic response)
        const accuracy = evaluateMoveAccuracy(stateBefore, move);
        
        const newState = applyMove(stateBefore, move);
        game.state = newState;
        
        io.to(matchId).emit('move_made', { move, state: newState, accuracy });

        if (newState.winner) {
          io.to(matchId).emit('game_over', { winner: newState.winner });
          activeGames.delete(matchId);
          // Here we would save the match result to the database
        }
      }
    });

    socket.on('send_message', (data) => {
      const { roomId, message } = data;
      socket.to(roomId).emit('receive_message', message);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
