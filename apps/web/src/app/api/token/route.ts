import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { SignJWT } from 'jose';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ mensaje: 'No autenticado.' }, { status: 401 });
  }

  const secreto = process.env.JWT_SHARED_SECRET;
  if (!secreto) {
    return NextResponse.json({ mensaje: 'Falta JWT_SHARED_SECRET.' }, { status: 500 });
  }

  const token = await new SignJWT({ rol: session.user.rol })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(session.user.id)
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(new TextEncoder().encode(secreto));

  return NextResponse.json({ token });
}
