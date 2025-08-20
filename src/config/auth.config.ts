import { registerAs } from '@nestjs/config';

export interface AuthConfig {
  hashRounds: number;
}

export default registerAs<AuthConfig>('auth', () => {
  return {
    hashRounds: parseInt(process.env.BCRYPT_HASH_ROUNDS) || 10,
  };
});
