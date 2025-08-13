import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {UsersService} from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private userService: UsersService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  // async validate(payload: any) {
  //   return { 
  //     id: payload.sub, 
  //     email: payload.email, 
  //     role: payload.role 
  //   };
  // }

  async validate(payload: any) {
    const user = await this.userService.findById(payload.sub);
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    
    if (!user.active) {
      throw new UnauthorizedException('Your account has been deactivated. Please contact the administrator.');
    }
    
    return {
      ...user
    };
  }
}