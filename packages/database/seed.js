/**
 * CoGether Database Seeder
 * Populates initial production-standard User records (Admin & Demo User)
 * using OWASP Argon2id password hashing.
 */

const { db } = require('./client');
const { hashPassword } = require('../auth/passwords');
const { logger } = require('../observability');

async function seedDatabase() {
  logger.info('Starting database seeding...');

  try {
    const adminPasswordHash = await hashPassword('Admin@CoGether2026!');
    const userPasswordHash = await hashPassword('User@CoGether2026!');

    // 1. Seed or update Admin User
    const adminRes = await db.query(
      `INSERT INTO identity.users (email, name, display_name, password_hash, is_verified, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         display_name = EXCLUDED.display_name,
         password_hash = EXCLUDED.password_hash,
         is_verified = EXCLUDED.is_verified,
         role = EXCLUDED.role,
         updated_at = NOW()
       RETURNING id, email, role`,
      ['admin@cogether.tech', 'CoGether Admin', 'CoGether Admin', adminPasswordHash, true, 'ADMIN']
    );

    // 2. Seed or update Demo User
    const userRes = await db.query(
      `INSERT INTO identity.users (email, name, display_name, password_hash, is_verified, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         display_name = EXCLUDED.display_name,
         password_hash = EXCLUDED.password_hash,
         is_verified = EXCLUDED.is_verified,
         role = EXCLUDED.role,
         updated_at = NOW()
       RETURNING id, email, role`,
      ['user@cogether.tech', 'Alex Morgan', 'Alex Morgan', userPasswordHash, true, 'USER']
    );

    logger.info('Database seeding completed successfully', {
      admin: adminRes.rows[0],
      demoUser: userRes.rows[0]
    });
    console.log('Seeded accounts:');
    console.log(' - Admin: admin@cogether.tech / Admin@CoGether2026! (Role: ADMIN)');
    console.log(' - User:  user@cogether.tech / User@CoGether2026! (Role: USER)');
  } catch (err) {
    logger.error('Database seeding failed', { error: err.message, stack: err.stack });
    throw err;
  }
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding error:', err.message);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
