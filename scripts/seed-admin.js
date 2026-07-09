const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const db = new PrismaClient({
  datasources: { db: { url: 'file:../db/custom.db' } }
});

async function main() {
  const email = 'admin@openworkflow.ai';
  const password = 'admin123';

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Admin user already exists:', JSON.stringify({ id: existing.id, email: existing.email, role: existing.role }));
    // Update password and role to make sure it matches
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.user.update({
      where: { email },
      data: { hashedPassword, role: 'ADMIN', name: 'Admin' }
    });
    console.log('Password and role updated.');
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await db.user.create({
    data: {
      email,
      name: 'Admin',
      hashedPassword,
      role: 'ADMIN',
    }
  });
  console.log('Admin user created:', JSON.stringify({ id: user.id, email: user.email, role: user.role }));
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
