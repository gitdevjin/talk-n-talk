import { SetMetadata } from '@nestjs/common';

export type AccessTypeValue = 'public' | 'access' | 'refresh';
export const ACCESS_TYPE_KEY = 'access_type';

/**
 * Decorator to specify the required access token type for a route or controller.
 *
 * Used by AccessTokenGuard to determine whether a method or controller
 * requires a 'public', 'access', or 'refresh' token.
 *
 * @param type - The required access type ('public', 'access', or 'refresh')
 */
export const AccessTokenType = (type: AccessTypeValue) => SetMetadata(ACCESS_TYPE_KEY, type);
