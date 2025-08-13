import { Injectable, ConflictException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import {UserRole} from '../utils/StringConst';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && await bcrypt.compare(password, user.password)) {
      if (!user.active) {
        throw new UnauthorizedException('Your account has been deactivated. Please contact the administrator.');
      }
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
    };
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Only admins can create users with specific roles
    if (registerDto.role && registerDto.role !== UserRole.VIEWER) {
      // In real implementation, you would check if the current user is admin
      // For now, we'll allow role assignment during registration for demo purposes
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const userData = {
      ...registerDto,
      password: hashedPassword,
      role: UserRole.VIEWER,
      active: true, // New users are active by default
    };

    const user = await this.usersService.create(userData);
    const { password, ...result } = user;
    return result;
  }
}