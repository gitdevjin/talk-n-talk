import { registerAs } from '@nestjs/config';

export interface JwtConfig {
  secret: string;
  accessTokenTtl: string;
  refreshTokenTtl: string;
}

export default registerAs<JwtConfig>('jwt', () => {
  return {
    secret: process.env.JWT_SECRET,
    accessTokenTtl: process.env.JWT_ACCESS_TTL || '3600s',
    refreshTokenTtl: process.env.JWT_REFRESH_TTL || '7d',
  };
});
