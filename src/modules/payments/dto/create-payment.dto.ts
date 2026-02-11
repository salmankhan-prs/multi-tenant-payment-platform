import { IsNumber, IsString, IsOptional, IsEnum, IsObject, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({ example: 50000, description: 'Amount in smallest unit (paise/cents)' })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ example: 'INR', enum: ['INR', 'USD', 'EUR', 'GBP'] })
  @IsString()
  currency: string;

  @ApiProperty({ example: 'Rahul Sharma' })
  @IsString()
  senderName: string;

  @ApiProperty({ example: 'HDFC0001234' })
  @IsString()
  senderAccount: string;

  @ApiProperty({ example: 'Priya Singh' })
  @IsString()
  receiverName: string;

  @ApiProperty({ example: 'ICIC0005678' })
  @IsString()
  receiverAccount: string;

  @ApiPropertyOptional({ example: 'Invoice payment for Jan 2025' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Flexible metadata for tenant-specific needs' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
