import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import {UserRole} from '../utils/StringConst';
import { v4 as uuidv4 } from 'uuid';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    id: uuidv4(),
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedPassword',
    role: UserRole.VIEWER,
    active: true,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  describe('validateUser', () => {
    it('should validate user with correct credentials', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        active: mockUser.active,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
        isDeleted: mockUser.isDeleted,
      });
    });

    it('should return null for invalid credentials', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      usersService.findByEmail.mockResolvedValue({ ...mockUser, active: false });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.validateUser('test@example.com', 'password'))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('should return access token', async () => {
      const mockToken = 'mock-jwt-token';
      jwtService.sign.mockReturnValue(mockToken);

      const result = await service.login(mockUser);

      expect(result).toEqual({ accessToken: mockToken });
      expect(jwtService.sign).toHaveBeenCalledWith({
        email: mockUser.email,
        sub: mockUser.id,
        role: mockUser.role,
      });
    });
  });

  describe('register', () => {
    const registerDto = {
      name: 'New User',
      email: 'new@example.com',
      password: 'password123',
      role: UserRole.VIEWER,
    };

    it('should register a new user', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      usersService.create.mockResolvedValue({
        ...mockUser,
        ...registerDto,
        password: 'hashedPassword',
      });

      const result = await service.register(registerDto);

      expect(result).not.toHaveProperty('password');
      expect(usersService.create).toHaveBeenCalledWith({
        ...registerDto,
        password: 'hashedPassword',
        active: true,
      });
    });

    it('should throw ConflictException if user already exists', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(service.register(registerDto))
        .rejects.toThrow(ConflictException);
    });
  });
});