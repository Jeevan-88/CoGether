import React from 'react';
import GameShell from './GameShell.jsx';
import { useAuth } from '../../../core/AuthContext.jsx';

/**
 * GamePlayer
 * Backward-compatible wrapper delegating directly to the new GameShell architecture.
 */
export default function GamePlayer({
  game,
  onClose,
  onLaunchSquadRoom,
  initialMode = 'SINGLE_PLAYER',
  initialRoomId = null,
  currentUsername = null
}) {
  const { profile } = useAuth();
  const username = currentUsername || profile?.displayName || profile?.username || 'ArcadePlayer';

  return (
    <GameShell
      game={game}
      onClose={onClose}
      initialMode={initialMode}
      initialRoomId={initialRoomId}
      currentUsername={username}
    />
  );
}

export { GameShell };
