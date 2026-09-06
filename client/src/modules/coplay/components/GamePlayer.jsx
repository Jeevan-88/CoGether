import React from 'react';
import GameShell from './GameShell.jsx';

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
  const username = currentUsername || localStorage.getItem('sp_username') || 'ArcadePlayer';

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
