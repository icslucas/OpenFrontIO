import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user?: {
      id: string;
      username: string;
      discriminator: string;
      avatar: string | null;
      email: string;
      accessToken: string;
      refreshToken: string;
    };
    state?: string;
  }
}
