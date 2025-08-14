import { registerAs } from '@nestjs/config';

export default registerAs('database', () => {
  const db_type = process.env.DB_TYPE || 'local';
  const isLocal = db_type === 'local';

  return {
    type: 'postgres',
    url: isLocal ? process.env.DB_LOCAL_DATABASE_URL : process.env.DB_REMOTE_DATABASE_URL,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
  };
});
