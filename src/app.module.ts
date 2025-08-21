import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from './common/common.module';
import { UserModule } from './user/user.module';
import { ProfileModule } from './profile/profile.module';
import { AuthModule } from './auth/auth.module';
import { Profile } from './profile/entity/profile.entity';
import { User } from './user/entity/user.entity';
import { LoggerModule } from 'nestjs-pino';
import { ChatModule } from './chat/chat.module';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import authConfig from './config/auth.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, authConfig],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport: {
          target: 'pino-pretty', // pretty logs in dev
          options: {
            colorize: true,
            singleLine: false,
            translateTime: 'SYS:standard',
          },
        },
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbConfig = configService.get('database');
        return {
          type: 'postgres',
          url: dbConfig.url,
          ssl: dbConfig.ssl,
          synchronize: dbConfig.synchronize,
          entities: [User, Profile],
        };
      },
    }),
    CommonModule,
    UserModule,
    ProfileModule,
    AuthModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
