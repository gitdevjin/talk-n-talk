import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => {
  return {
    hashRounds: parseInt(process.env.BCRYPT_HASH_ROUNDS) || 10,
  };
});
