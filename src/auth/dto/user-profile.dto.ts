import { ApiProperty } from '@nestjs/swagger';
import {UserRole} from '../../utils/StringConst';

export class UserProfileDto {
  @ApiProperty({ example: 'cuid123' })
  id: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  email: string;

  @ApiProperty({ example: UserRole.VIEWER })
  role: string;

  @ApiProperty({ example: true })
  active: boolean;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  createdAt: Date;
}