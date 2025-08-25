import { SetMetadata } from '@nestjs/common';

export type AccessTypeValue = 'public' | 'accessToken' | 'refreshToken';
export const ACCESS_TYPE_KEY = 'access_type';

export const AccessType = (type: AccessTypeValue) => SetMetadata(ACCESS_TYPE_KEY, type);
