import React from 'react';
import { Swords, Check, X } from 'lucide-react';
import { useSocial } from '../../core/SocialContext';
import CogetherAvatarRenderer from '../auth/CogetherAvatarRenderer';
import './IncomingGameInviteBanner.css';

export default function IncomingGameInviteBanner({ onAcceptInvite }) {
  const { incomingGameInvite, acceptGameInvite, rejectGameInvite, dismissIncomingGameInvite } = useSocial();

  if (!incomingGameInvite || !incomingGameInvite.invitation) return null;

  const { invitation, room, inviter } = incomingGameInvite;
  const gameName = invitation.game_id === '2048' ? '2048' :
                   invitation.game_id === 'hextris' ? 'Hextris' :
                   invitation.game_id === 'clumsy-bird' ? 'Clumsy Bird' :
                   invitation.game_id === 'block-puzzle' ? 'Block Puzzle' :
                   invitation.game_id || 'Arcade Duel';

  const handleAccept = async () => {
    try {
      const res = await acceptGameInvite(invitation.invite_token);
      if (res.success && typeof onAcceptInvite === 'function') {
        onAcceptInvite(res.room || room, invitation.game_id);
      }
    } catch (e) {
      console.error('Failed to accept invite', e);
    }
  };

  const handleDecline = async () => {
    try {
      await rejectGameInvite(invitation.invite_token);
    } catch (e) {
      dismissIncomingGameInvite();
    }
  };

  return (
    <div className="game-invite-banner-toast fade-in" role="alert">
      <div className="invite-banner-inner">
        <div className="invite-banner-avatar">
          {inviter?.avatarConfig ? (
            <CogetherAvatarRenderer config={inviter.avatarConfig} size={36} animated={false} />
          ) : inviter?.avatarUrl ? (
            <img src={inviter.avatarUrl} alt="" className="invite-avatar-img" />
          ) : (
            <div className="invite-avatar-fallback">
              <Swords size={18} />
            </div>
          )}
        </div>

        <div className="invite-banner-content">
          <div className="invite-banner-title">
            <strong>{inviter?.displayName || inviter?.username || 'A friend'}</strong> invited you to play
          </div>
          <div className="invite-banner-meta">
            <span className="invite-game-badge">{gameName}</span>
            <span className="invite-room-code">Room: {room?.room_code || 'DUEL'}</span>
          </div>
        </div>

        <div className="invite-banner-actions">
          <button type="button" className="btn-invite-accept" onClick={handleAccept} title="Join game">
            <Check size={15} />
            <span>Accept</span>
          </button>
          <button type="button" className="btn-invite-decline" onClick={handleDecline} title="Decline">
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
