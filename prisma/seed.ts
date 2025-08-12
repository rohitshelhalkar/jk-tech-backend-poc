import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Started...');
  // Create admin user
  const hashedPassword = await bcrypt.hash('Admin@1234$', 10);
  
  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      id: uuidv4(),
      email: 'admin@example.com',
      name: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN',
      active: true,
    },
  });

  // Create editor user
  const editorPassword = await bcrypt.hash('Editor@1234$', 10);
  const editor = await prisma.user.upsert({
    where: { email: 'editor@example.com' },
    update: {},
    create: {
      id: uuidv4(),
      email: 'editor@example.com',
      name: 'Editor User',
      password: editorPassword,
      role: 'EDITOR',
      active: true,
    },
  });

  // Create viewer user
  const viewerPassword = await bcrypt.hash('Viewer@1234$', 10);
  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@example.com' },
    update: {},
    create: {
      id: uuidv4(),
      email: 'viewer@example.com',
      name: 'Viewer User',
      password: viewerPassword,
      role: 'VIEWER',
      active: true,
    },
  });

  console.log({ admin, editor, viewer });
}

main()
  .then(async () => {
    console.log('Seeding completed successfully.');
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.log('error Seeding completed successfully.');
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });