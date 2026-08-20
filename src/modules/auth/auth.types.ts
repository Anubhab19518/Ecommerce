export interface SessionData {
  sessionId: string;
  userId: string;
  tokenHash: string;
  createdAt: string;
  lastRotatedAt: string;
  userAgent?: string;
  ip?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthenticatedOrganisation {
  id: string;
  name: string;
  slug?: string;
  logo?: string | null;
  branding?: Record<string, unknown> | null;
}

export interface UserSessionContext {
  user: AuthenticatedUser;
  organisation: AuthenticatedOrganisation | null;
  isSuperAdmin: boolean;
  roles: string[];
  permissions: string[];
}

export interface LoginResult {
  tokens: AuthTokens;
  context: UserSessionContext;
}
