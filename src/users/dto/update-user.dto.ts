import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsBoolean } from 'class-validator';
import {UserRole} from '../../utils/StringConst';

export class UpdateUserDto {

  @ApiPropertyOptional({ example: 'John Doe' })
  name: string;
  
  @ApiPropertyOptional({ example: UserRole.EDITOR })
  @IsOptional()
  role?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}