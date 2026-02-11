import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  ApiTenantResponses,
  ApiCreatedResponse,
  ApiSuccessResponse,
  ApiConflictResponse,
} from '../../common/decorators/api-responses.decorator';

@ApiTags('Auth')
@Controller('auth')
@ApiTenantResponses()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user under the current tenant' })
  @ApiCreatedResponse('User registered, JWT returned')
  @ApiConflictResponse('Email already registered')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login and receive JWT with tenantId claim' })
  @ApiSuccessResponse('JWT returned')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
