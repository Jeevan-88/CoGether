-- Migration 014: Friends System, Private Game Rooms, Invitations, E2EE Public Keys, and Direct Messaging
-- Fully backward-compatible, non-destructive schema additions.

-- 1. Persistent Friendships Table
CREATE TABLE IF NOT EXISTS identity.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_1 UUID NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  user_id_2 UUID NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  status VARCHAR(32) NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'blocked'
  action_user_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE, -- User who performed the last state transition
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_friendship_distinct CHECK (user_id_1 != user_id_2),
  CONSTRAINT uq_friendship_pair UNIQUE (user_id_1, user_id_2)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user1 ON identity.friendships(user_id_1, status);
CREATE INDEX IF NOT EXISTS idx_friendships_user2 ON identity.friendships(user_id_2, status);
CREATE INDEX IF NOT EXISTS idx_friendships_action ON identity.friendships(action_user_id);

-- 2. Private Game Rooms Table
CREATE TABLE IF NOT EXISTS coplay.private_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code VARCHAR(32) NOT NULL UNIQUE, -- e.g. 'DUEL-9A2F'
  game_id VARCHAR(64) NOT NULL,
  host_user_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  status VARCHAR(32) NOT NULL DEFAULT 'open', -- 'open', 'active', 'closed'
  max_capacity INT NOT NULL DEFAULT 2,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 hours')
);

CREATE INDEX IF NOT EXISTS idx_private_rooms_code ON coplay.private_rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_private_rooms_host ON coplay.private_rooms(host_user_id, status);

-- 3. Game Invitations Table
CREATE TABLE IF NOT EXISTS coplay.game_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES coplay.private_rooms(id) ON DELETE CASCADE,
  inviter_user_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  invitee_user_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  invite_token VARCHAR(128) NOT NULL UNIQUE,
  game_id VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'expired', 'canceled'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes')
);

CREATE INDEX IF NOT EXISTS idx_game_invitations_token ON coplay.game_invitations(invite_token);
CREATE INDEX IF NOT EXISTS idx_game_invitations_invitee ON coplay.game_invitations(invitee_user_id, status);
CREATE INDEX IF NOT EXISTS idx_game_invitations_inviter ON coplay.game_invitations(inviter_user_id, status);

-- 4. User Public Keys for End-to-End Encryption (E2EE)
CREATE TABLE IF NOT EXISTS identity.user_keys (
  user_id UUID PRIMARY KEY REFERENCES identity.users(id) ON DELETE CASCADE,
  key_id VARCHAR(64) NOT NULL,
  public_key_jwk JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Persistent Encrypted Direct Messages
CREATE TABLE IF NOT EXISTS identity.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  ciphertext TEXT NOT NULL, -- Client-side AES-256-GCM encrypted message content
  iv VARCHAR(64) NOT NULL, -- Hex-encoded 12-byte initialization vector
  sender_key_id VARCHAR(64) NOT NULL,
  recipient_key_id VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'sent', -- 'sent', 'delivered', 'read'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dm_conversation ON identity.direct_messages(
  LEAST(sender_id, recipient_id),
  GREATEST(sender_id, recipient_id),
  created_at DESC
);
CREATE INDEX IF NOT EXISTS idx_dm_unread ON identity.direct_messages(recipient_id, status) WHERE status != 'read';
