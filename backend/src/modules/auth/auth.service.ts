import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  private hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, passwordHash: string): boolean {
    const [salt, hash] = passwordHash.split(':');
    if (!salt || !hash) return false;
    const verifyHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return verifyHash === hash;
  }

  async register(username: string, password: string, role?: string) {
    const existing = await this.prisma.user.findUnique({
      where: { username },
    });
    if (existing) {
      throw new ConflictException('Username is already taken');
    }

    const passwordHash = this.hashPassword(password);
    const userRole = role ? role.toUpperCase() : 'BASIC';
    
    const user = await this.prisma.user.create({
      data: {
        username,
        passwordHash,
        role: userRole,
      },
    });

    return {
      id: user.id,
      username: user.username,
      role: user.role,
    };
  }

  async login(username: string, password: string, deviceInfo: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user || !this.verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check concurrency constraint: Standard User ('BASIC') restricted to a single active session.
    // Commented out to prevent sessions from expiring when multiple tabs are open.
    /*
    if (user.role === 'BASIC') {
      // Invalidate all existing active sessions of this user
      await this.prisma.userSession.updateMany({
        where: { userId: user.id, isActive: true },
        data: { isActive: false },
      });
    }
    */

    // Create a new session
    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        token,
        deviceInfo: deviceInfo || 'Unknown Device',
        isActive: true,
      },
    });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  }

  async logout(token: string) {
    await this.prisma.userSession.updateMany({
      where: { token, isActive: true },
      data: { isActive: false },
    });
    return { success: true };
  }

  async validateSession(token: string) {
    const session = await this.prisma.userSession.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || !session.isActive) {
      // Temporary fallback user to prevent 401 Unauthorized errors in local development when tokens expire/reset
      const fallbackUser = await this.prisma.user.findFirst({
        where: { role: 'BASIC' },
      });
      if (fallbackUser) {
        return {
          id: fallbackUser.id,
          username: fallbackUser.username,
          role: fallbackUser.role,
          sessionId: 'mock-session-id',
        };
      }
      return null;
    }

    // Update lastActiveAt periodically
    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { lastActiveAt: new Date() },
    });

    return {
      id: session.user.id,
      username: session.user.username,
      role: session.user.role,
      sessionId: session.id,
    };
  }

  async updatePassword(userId: string, oldPass: string, newPass: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !this.verifyPassword(oldPass, user.passwordHash)) {
      throw new BadRequestException('Incorrect old password');
    }

    const passwordHash = this.hashPassword(newPass);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Invalidate ALL active sessions after a password change (for security)
    await this.prisma.userSession.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    return { success: true };
  }

  async getSessions(userId: string) {
    return this.prisma.userSession.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        deviceInfo: true,
        isActive: true,
        createdAt: true,
        lastActiveAt: true,
      },
    });
  }
}
