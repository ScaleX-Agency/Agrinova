import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import * as z from 'zod';

const createUserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(6),
  fullName: z.string().min(1),
  roleId: z.number()
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify caller is Chairman
    const caller = await prisma.user.findUnique({
      where: { clerk_id: userId },
      include: { role: true }
    });

    if (!caller || caller.role.role_name.toLowerCase() !== 'chairman') {
      return NextResponse.json({ error: 'Forbidden. Chairman access required.' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    const { username, password, fullName, roleId } = parsed.data;

    // Create user in Clerk
    // Note: clerkClient() returns the instance in v7
    const client = await clerkClient();
    const clerkUser = await client.users.createUser({
      username,
      password,
      firstName: fullName.split(' ')[0] || fullName,
      lastName: fullName.split(' ').slice(1).join(' ') || undefined,
    });

    // Create in Prisma
    const dbUser = await prisma.user.create({
      data: {
        clerk_id: clerkUser.id,
        role_id: roleId,
        full_name: fullName,
        username: username,
      }
    });

    return NextResponse.json({ success: true, user: dbUser });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
