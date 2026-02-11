import { applyDecorators } from '@nestjs/common';
import { ApiResponse, ApiHeader, ApiBearerAuth } from '@nestjs/swagger';

/**
 * Common Swagger response decorators to avoid repetition across controllers.
 */

/** Standard error responses for all tenant-scoped endpoints */
export const ApiTenantResponses = () =>
  applyDecorators(
    ApiHeader({ name: 'X-Tenant-ID', required: false, description: 'Tenant slug (alternative to subdomain)' }),
    ApiResponse({ status: 400, description: 'Tenant could not be resolved' }),
    ApiResponse({ status: 403, description: 'Tenant suspended or feature not available' }),
    ApiResponse({ status: 429, description: 'Rate limit exceeded' }),
  );

/** Standard responses for authenticated + tenant-scoped endpoints */
export const ApiAuthenticatedResponses = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiHeader({ name: 'X-Tenant-ID', required: false, description: 'Tenant slug (alternative to subdomain)' }),
    ApiResponse({ status: 401, description: 'Unauthorized — invalid or missing JWT' }),
    ApiResponse({ status: 403, description: 'Tenant suspended or limit reached' }),
    ApiResponse({ status: 429, description: 'Rate limit exceeded' }),
  );

/** Created response */
export const ApiCreatedResponse = (description: string) =>
  ApiResponse({ status: 201, description });

/** Success response */
export const ApiSuccessResponse = (description: string) =>
  ApiResponse({ status: 200, description });

/** Not found response */
export const ApiNotFoundResponse = () =>
  ApiResponse({ status: 404, description: 'Resource not found' });

/** Conflict response */
export const ApiConflictResponse = (description = 'Resource already exists') =>
  ApiResponse({ status: 409, description });
