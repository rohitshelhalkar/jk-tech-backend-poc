import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole } from '../utils/StringConst';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockUser = {
    id: 'user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.VIEWER,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerDto: RegisterDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: UserRole.VIEWER,
      };

      const expectedResult = { ...mockUser, ...registerDto, isDeleted: false };
      authService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(registerDto);

      expect(result).toEqual(expectedResult);
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('login', () => {
    it('should login user and return access token', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockRequest = { user: mockUser };
      const expectedResult = { accessToken: 'mock-jwt-token' };
      authService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto, mockRequest);

      expect(result).toEqual(expectedResult);
      expect(authService.login).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('getProfile', () => {
    it('should return user profile', () => {
      const mockRequest = { user: mockUser };

      const result = controller.getProfile(mockRequest);

      expect(result).toEqual(mockUser);
    });
  });

  describe('logout', () => {
    it('should return logout success message', async () => {
      const result = await controller.logout();

      expect(result).toEqual({ message: 'Logout successful' });
    });
  });
});