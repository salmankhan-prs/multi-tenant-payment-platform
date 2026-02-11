import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  ValidateNested,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class WhiteLabelDto {
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  companyName?: string;
}

export class CreateTenantDto {
  @ApiProperty({ example: 'HDFC Bank' })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'hdfc',
    description: 'Unique slug used for subdomain: hdfc.financeops.com',
  })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens only',
  })
  slug: string;

  @ApiProperty({ enum: ['starter', 'professional', 'enterprise'] })
  @IsEnum(['starter', 'professional', 'enterprise'])
  tier: 'starter' | 'professional' | 'enterprise';

  @ApiPropertyOptional({ example: 'payments.hdfcbank.com' })
  @IsOptional()
  @IsString()
  customDomain?: string;

  @ApiPropertyOptional({
    type: WhiteLabelDto,
    description: 'White-label branding configuration',
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => WhiteLabelDto)
  whiteLabel?: WhiteLabelDto;
}
