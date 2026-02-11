import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { TenantContext } from '../tenant/tenant.context';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: Partial<UserDocument>; accessToken: string }> {
    const tenant = TenantContext.getCurrentTenant();

    if (tenant.settings.maxUsers !== -1) {
      const currentCount = await this.userModel.countDocuments();
      if (currentCount >= tenant.settings.maxUsers) {
        throw new ForbiddenException({
          error: 'USER_LIMIT_REACHED',
          message: `Maximum users (${tenant.settings.maxUsers}) reached for ${tenant.tier} tier`,
          usage: { current: currentCount, limit: tenant.settings.maxUsers },
        });
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    let user: UserDocument;
    try {
      user = await this.userModel.create({
        email: dto.email,
        name: dto.name,
        passwordHash,
        role: 'member',
      });
    } catch (error: any) {
      if (error.code === 11000) {
        throw new ConflictException('Email already registered for this tenant');
      }
      throw error;
    }

    const payload = {
      sub: user._id.toString(),
      tenantId: tenant._id,
      tenantSlug: tenant.slug,
      role: user.role,
    };

    return {
      user: { _id: user._id, email: user.email, name: user.name, role: user.role },
      accessToken: this.jwtService.sign(payload),
    };
  }

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const user = await this.userModel
      .findOne({ email: dto.email })
      .select('+passwordHash')
      .exec();

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tenant = TenantContext.getCurrentTenant();

    const payload = {
      sub: user._id.toString(),
      tenantId: tenant._id,
      tenantSlug: tenant.slug,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}
