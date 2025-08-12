import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsBoolean } from 'class-validator';
import {UserRole} from 'src/utils/StringConst';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: UserRole.EDITOR })
  @IsOptional()
  role?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}