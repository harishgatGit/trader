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

  async register(username: string, password: string, email?: string) {
    const finalEmail = email || (username.includes('@') ? username : null);

    const existingUsername = await this.prisma.user.findUnique({
      where: { username },
    });
    if (existingUsername) {
      throw new ConflictException('Username is already taken');
    }

    if (finalEmail) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: finalEmail },
      });
      if (existingEmail) {
        throw new ConflictException('Email is already registered');
      }
    }

    const passwordHash = this.hashPassword(password);
    
    const user = await this.prisma.user.create({
      data: {
        username,
        email: finalEmail,
        passwordHash,
        role: 'BASIC',
        subscriptionPlan: 'FREE',
        isActive: true,
      },
    });

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      subscriptionPlan: user.subscriptionPlan,
      isActive: user.isActive,
    };
  }

  /**
   * Verify an OAuth identity from Google (auth code) or Microsoft (ID token),
   * then create or find the user account and return a session token.
   */
  async socialLogin(
    payload: { code?: string; idToken?: string },
    provider: 'google' | 'microsoft',
    deviceInfo: string,
  ) {
    let email: string;
    let name: string;

    if (provider === 'google') {
      if (!payload.code) throw new BadRequestException('Google login requires an auth code.');
      const googleUser = await this.exchangeGoogleCode(payload.code);
      email = googleUser.email;
      name = googleUser.name;
    } else if (provider === 'microsoft') {
      if (!payload.idToken) throw new BadRequestException('Microsoft login requires an ID token.');
      const msUser = await this.verifyMicrosoftToken(payload.idToken);
      email = msUser.email;
      name = msUser.name;
    } else {
      throw new BadRequestException(`Unsupported OAuth provider: ${provider}`);
    }

    if (!email) {
      throw new BadRequestException('Could not retrieve email from OAuth provider.');
    }

    let user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Auto-register: derive a unique username from the email prefix
      const emailPrefix = email.split('@')[0] || 'user';
      const uniqueSuffix = crypto.randomBytes(3).toString('hex');
      let username = `${emailPrefix}_${uniqueSuffix}`;

      let checkUser = await this.prisma.user.findUnique({ where: { username } });
      while (checkUser) {
        const newSuffix = crypto.randomBytes(3).toString('hex');
        username = `${emailPrefix}_${newSuffix}`;
        checkUser = await this.prisma.user.findUnique({ where: { username } });
      }

      user = await this.prisma.user.create({
        data: {
          username,
          email,
          passwordHash: null,
          role: 'BASIC',
          subscriptionPlan: 'FREE',
          isActive: true,
        },
      });
    }

    if (!user.isActive) {
      throw new UnauthorizedException('This account has been deactivated');
    }

    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        token,
        deviceInfo: deviceInfo || `OAuth (${provider.toUpperCase()})`,
        isActive: true,
      },
    });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        subscriptionPlan: user.subscriptionPlan,
        isActive: user.isActive,
      },
    };
  }

  /**
   * Verify a Microsoft ID token JWT by fetching Microsoft's public JWKS,
   * finding the matching key by `kid`, then verifying the RSA-SHA256 signature
   * using Node's built-in `crypto` module (no extra npm packages needed).
   */
  private async verifyMicrosoftToken(idToken: string): Promise<{ email: string; name: string }> {
    const axios = await import('axios');

    const clientId = process.env.MICROSOFT_CLIENT_ID;
    if (!clientId) {
      throw new BadRequestException('Microsoft OAuth is not configured on the server.');
    }

    try {
      // 1. Split the JWT
      const parts = idToken.split('.');
      if (parts.length !== 3) throw new Error('Invalid JWT format');

      const [headerB64, payloadB64, signatureB64] = parts;

      // 2. Decode header to find `kid` (key ID)
      const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());
      if (!header.kid) throw new Error('No kid in JWT header');

      // 3. Fetch Microsoft public JWKS
      const jwksRes = await axios.default.get(
        'https://login.microsoftonline.com/common/discovery/v2.0/keys',
        { timeout: 5000 },
      );
      const keys: any[] = jwksRes.data.keys;
      const jwk = keys.find((k) => k.kid === header.kid);
      if (!jwk) throw new Error(`No matching JWKS key for kid: ${header.kid}`);

      // 4. Verify RSA-SHA256 signature using Node crypto
      const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
      const signingInput = `${headerB64}.${payloadB64}`;
      const signature = Buffer.from(signatureB64, 'base64url');

      const isValid = crypto.verify('SHA256', Buffer.from(signingInput), publicKey, signature);
      if (!isValid) throw new UnauthorizedException('Microsoft ID token signature is invalid.');

      // 5. Decode and validate claims
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());

      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        throw new UnauthorizedException('Microsoft ID token has expired.');
      }

      // Validate audience — must match our app's client ID
      const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
      if (!aud.includes(clientId)) {
        throw new UnauthorizedException('Microsoft ID token audience mismatch.');
      }

      const email: string = payload.email || payload.preferred_username || payload.upn;
      if (!email) throw new Error('No email claim in Microsoft ID token');

      const name: string =
        payload.name || `${payload.given_name || ''} ${payload.family_name || ''}`.trim() || email.split('@')[0];

      return { email: email.toLowerCase(), name };
    } catch (error: any) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      throw new UnauthorizedException(
        `Microsoft authentication failed: ${error.message}`,
      );
    }
  }


  /**
   * Exchange a Google authorization code for an ID token, then decode it
   * to extract the user's verified email and name.
   */
  private async exchangeGoogleCode(code: string): Promise<{ email: string; name: string }> {
    const axios = await import('axios');

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new BadRequestException('Google OAuth is not configured on the server.');
    }

    try {
      const response = await axios.default.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: 'postmessage', // Required for popup-based auth code flow
        grant_type: 'authorization_code',
      });

      const idToken = response.data.id_token;
      if (!idToken) {
        throw new Error('No id_token in Google response');
      }

      // Decode the JWT payload (we trust it because we received it directly from Google over HTTPS)
      const payloadB64 = idToken.split('.')[1];
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf-8'));

      if (!payload.email) {
        throw new Error('No email in Google ID token');
      }

      if (!payload.email_verified) {
        throw new UnauthorizedException('Google email is not verified.');
      }

      return {
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
      };
    } catch (error: any) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      // Surface the exact Google error (e.g. redirect_uri_mismatch, invalid_grant)
      const googleErr =
        error.response?.data?.error_description ||
        error.response?.data?.error ||
        error.message ||
        'Unknown error';
      console.error('[Google OAuth] Token exchange failed:', googleErr, error.response?.data);
      throw new UnauthorizedException(`Google authentication failed: ${googleErr}`);
    }
  }

  async updateUsername(userId: string, newUsername: string) {
    const trimmed = newUsername.trim();
    if (!trimmed || trimmed.length < 3) {
      throw new BadRequestException('Username must be at least 3 characters.');
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
      throw new BadRequestException('Username may only contain letters, numbers, underscores, hyphens, and dots.');
    }

    const existing = await this.prisma.user.findUnique({ where: { username: trimmed } });
    if (existing && existing.id !== userId) {
      throw new ConflictException('That username is already taken.');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { username: trimmed },
    });

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      subscriptionPlan: user.subscriptionPlan,
      isActive: user.isActive,
    };
  }

  async login(username: string, password: string, deviceInfo: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user || !user.passwordHash || !this.verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('This account has been deactivated');
    }

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
        email: user.email,
        role: user.role,
        subscriptionPlan: user.subscriptionPlan,
        isActive: user.isActive,
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
      return null;
    }

    if (!session.user.isActive) {
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
      email: session.user.email,
      role: session.user.role,
      subscriptionPlan: session.user.subscriptionPlan,
      isActive: session.user.isActive,
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
