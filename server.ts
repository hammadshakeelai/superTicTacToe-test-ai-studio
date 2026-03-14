import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { GameState, Move, applyMove, createInitialState } from './src/gameLogic.js';
import { evaluateMoveAccuracy, getBestMove, getEvaluation } from './src/aiEvaluator.js';

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

  // matchId -> { state: GameState, players: { X: string, O: string }, isBotMatch?: boolean, botDifficulty?: number }
  const activeGames = new Map<string, { state: GameState, players: { X: string, O: string }, isBotMatch?: boolean, botDifficulty?: number }>();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('create_match', ({ matchId, userId, isBotMatch, botDifficulty }) => {
      activeGames.set(matchId, {
        state: createInitialState(),
        players: { X: userId, O: isBotMatch ? 'BOT' : '' },
        isBotMatch,
        botDifficulty: botDifficulty || 3
      });
      socket.join(matchId);
      console.log(`Match ${matchId} created by ${userId} (Bot: ${isBotMatch})`);
      
      // If it's a bot match, emit initial state immediately
      if (isBotMatch) {
        io.to(matchId).emit('match_state', activeGames.get(matchId)!.state);
      }
    });

    socket.on('join_match', ({ matchId, userId }) => {
      let game = activeGames.get(matchId);
      if (!game) {
        // If match doesn't exist (e.g. server restarted or friend joined first), create it
        // We assume it's a regular PvP match if it wasn't created explicitly as a bot match
        const isBotMatch = matchId.startsWith('bot_');
        game = {
          state: createInitialState(),
          players: { X: userId, O: isBotMatch ? 'BOT' : '' },
          isBotMatch,
          botDifficulty: 3
        };
        activeGames.set(matchId, game);
        console.log(`Match ${matchId} auto-created by ${userId}`);
      } else {
        if (!game.players.O && game.players.X !== userId) {
          game.players.O = userId;
        }
      }
      socket.join(matchId);
      const role = game.players.X === userId ? 'X' : (game.players.O === userId ? 'O' : 'Spectator');
      socket.emit('match_joined', { state: game.state, role });
      io.to(matchId).emit('match_state', game.state);
      console.log(`User ${userId} joined match ${matchId} as ${role}`);
    });

    const handleBotMove = async (matchId: string) => {
      const game = activeGames.get(matchId);
      if (!game || !game.isBotMatch || game.state.winner) return;

      // Bot plays as O
      if (game.state.currentPlayer === 'O') {
        setTimeout(() => {
          const botMove = getBestMove(game.state, game.botDifficulty);
          if (botMove) {
            const stateBefore = game.state;
            const accuracy = evaluateMoveAccuracy(stateBefore, botMove);
            const newState = applyMove(stateBefore, botMove);
            game.state = newState;
            
            io.to(matchId).emit('move_made', { 
              move: botMove, 
              state: newState, 
              accuracy,
              evaluation: getEvaluation(newState)
            });

            if (newState.winner) {
              io.to(matchId).emit('game_over', { 
                winner: newState.winner,
                matchDetails: {
                  player_x: game.players.X,
                  player_o: game.players.O,
                  isBotMatch: game.isBotMatch || false,
                  moves_count: newState.moves.length
                }
              });
              activeGames.delete(matchId);
            }
          }
        }, 500); // Small delay for realism
      }
    };

    socket.on('make_move', async (data) => {
      const { matchId, move } = data;
      const game = activeGames.get(matchId);
      if (game) {
        // Prevent human from playing bot's turn
        if (game.isBotMatch && game.state.currentPlayer === 'O') return;

        const stateBefore = game.state;
        
        // Evaluate move accuracy in background
        const accuracy = evaluateMoveAccuracy(stateBefore, move);
        
        const newState = applyMove(stateBefore, move);
        game.state = newState;
        
        io.to(matchId).emit('move_made', { 
          move, 
          state: newState, 
          accuracy,
          evaluation: getEvaluation(newState)
        });

        if (newState.winner) {
          io.to(matchId).emit('game_over', { 
            winner: newState.winner,
            matchDetails: {
              player_x: game.players.X,
              player_o: game.players.O,
              isBotMatch: game.isBotMatch || false,
              moves_count: newState.moves.length
            }
          });
          activeGames.delete(matchId);
        } else if (game.isBotMatch) {
          handleBotMove(matchId);
        }
      }
    });

    socket.on('request_hint', (data) => {
      const { matchId } = data;
      const game = activeGames.get(matchId);
      if (game && !game.state.winner) {
        // Calculate hint based on current state
        const hintMove = getBestMove(game.state, 3);
        if (hintMove) {
          socket.emit('receive_hint', hintMove);
        }
      }
    });

    socket.on('resign', (data) => {
      const { matchId, player } = data;
      const game = activeGames.get(matchId);
      if (game && !game.state.winner) {
        const winner = player === 'X' ? 'O' : 'X';
        game.state.winner = winner;
        io.to(matchId).emit('game_over', { 
          winner: winner,
          matchDetails: {
            player_x: game.players.X,
            player_o: game.players.O,
            isBotMatch: game.isBotMatch || false,
            moves_count: game.state.moves.length
          }
        });
        activeGames.delete(matchId);
      }
    });

    socket.on('offer_draw', (data) => {
      const { matchId, player } = data;
      const game = activeGames.get(matchId);
      if (game && !game.state.winner) {
        if (game.isBotMatch) {
          // Bot always declines draw for now
          socket.emit('draw_declined');
        } else {
          // Send to the other player
          socket.to(matchId).emit('draw_offered', { by: player });
        }
      }
    });

    socket.on('accept_draw', (data) => {
      const { matchId } = data;
      const game = activeGames.get(matchId);
      if (game && !game.state.winner) {
        game.state.winner = 'Draw';
        io.to(matchId).emit('game_over', { 
          winner: 'Draw',
          matchDetails: {
            player_x: game.players.X,
            player_o: game.players.O,
            isBotMatch: game.isBotMatch || false,
            moves_count: game.state.moves.length
          }
        });
        activeGames.delete(matchId);
      }
    });

    socket.on('decline_draw', (data) => {
      const { matchId } = data;
      socket.to(matchId).emit('draw_declined');
    });

    socket.on('send_message', (data) => {
      const { roomId, message, sender, timestamp } = data;
      // Broadcast to everyone in the room (including sender to confirm)
      io.to(roomId).emit('receive_message', { sender, message, timestamp });
    });

    socket.on('global_chat_send', (data) => {
      const { message, sender, timestamp } = data;
      io.emit('global_chat_receive', { sender, message, timestamp });
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
