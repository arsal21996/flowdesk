import { PrismaClient, Role, TaskStatus, Priority } from '@prisma/client';
import bcrypt from 'bcryptjs';
const db = new PrismaClient();
async function main() {
  const passwordHash = await bcrypt.hash('Demo123!', 12);
  const admin = await db.user.upsert({ where: { email: 'demo@flowdesk.local' }, update: {}, create: { name: 'Alex Morgan', email: 'demo@flowdesk.local', passwordHash, role: Role.ADMIN } });
  const manager = await db.user.upsert({ where: { email: 'manager@flowdesk.local' }, update: {}, create: { name: 'Jamie Chen', email: 'manager@flowdesk.local', passwordHash, role: Role.MANAGER } });
  const member = await db.user.upsert({ where: { email: 'member@flowdesk.local' }, update: {}, create: { name: 'Sam Rivera', email: 'member@flowdesk.local', passwordHash, role: Role.MEMBER } });
  await db.task.deleteMany(); await db.project.deleteMany();
  const website = await db.project.create({ data: { name: 'Website Redesign', description: 'Refresh the marketing site and improve conversion.', ownerId: admin.id, color: '#7c3aed' } });
  const launch = await db.project.create({ data: { name: 'Product Launch', description: 'Coordinate the next major product release.', ownerId: manager.id, color: '#0ea5e9' } });
  await db.task.createMany({ data: [
    { title: 'Audit existing pages', projectId: website.id, assigneeId: member.id, status: TaskStatus.DONE, priority: Priority.HIGH },
    { title: 'Build landing page', projectId: website.id, assigneeId: admin.id, status: TaskStatus.IN_PROGRESS, priority: Priority.HIGH },
    { title: 'Write launch checklist', projectId: launch.id, assigneeId: manager.id, status: TaskStatus.TODO, priority: Priority.MEDIUM },
    { title: 'Prepare release notes', projectId: launch.id, assigneeId: member.id, status: TaskStatus.TODO, priority: Priority.LOW }
  ] });
}
main().finally(() => db.$disconnect());
