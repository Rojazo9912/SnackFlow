import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, Length, IsIn } from 'class-validator';

export const SUPERVISOR_ACTIONS = [
  'cancel_paid_order',
  'large_inventory_adjustment',
  'cash_discrepancy',
  'delete_product',
  'change_product_price',
] as const;

export type SupervisorActionType = typeof SUPERVISOR_ACTIONS[number];

export class SupervisorAuthorizeDto {
  @ApiProperty({ example: '1234', description: 'PIN del supervisor (4 dígitos)' })
  @IsString()
  @Length(4, 6)
  supervisorPin: string;

  @ApiProperty({ enum: SUPERVISOR_ACTIONS })
  @IsIn(SUPERVISOR_ACTIONS)
  actionType: SupervisorActionType;

  @ApiPropertyOptional({ example: 'uuid-de-la-orden' })
  @IsOptional()
  @IsUUID('4')
  referenceId?: string;

  @ApiPropertyOptional({ example: 'orders' })
  @IsOptional()
  @IsString()
  referenceTable?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
