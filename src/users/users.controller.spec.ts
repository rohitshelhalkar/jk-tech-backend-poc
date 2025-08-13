import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '../utils/StringConst';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  const mockUser = {
    id: 'user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.VIEWER,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUsersService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);
  });

  describe('findAll', () => {
    it('should return array of users', async () => {
      const mockUsers = [mockUser];
      usersService.findAll.mockResolvedValue(mockUsers);

      const result = await controller.findAll();

      expect(result).toEqual(mockUsers);
      expect(usersService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      usersService.findById.mockResolvedValue(mockUser);

      const result = await controller.findOne('user-id');

      expect(result).toEqual(mockUser);
      expect(usersService.findById).toHaveBeenCalledWith('user-id');
    });
  });

  describe('update', () => {
    it('should update user', async () => {
      const updateDto: UpdateUserDto = {
        name: 'Updated Name',
        active: false,
      };
      const updatedUser = { ...mockUser, ...updateDto };
      usersService.update.mockResolvedValue(updatedUser);

      const result = await controller.update('user-id', updateDto);

      expect(result).toEqual(updatedUser);
      expect(usersService.update).toHaveBeenCalledWith('user-id', updateDto);
    });
  });

  describe('remove', () => {
    it('should delete user', async () => {
      const deleteResult = { message: 'User deleted successfully' };
      usersService.remove.mockResolvedValue(deleteResult);

      const result = await controller.remove('user-id');

      expect(result).toEqual(deleteResult);
      expect(usersService.remove).toHaveBeenCalledWith('user-id');
    });
  });
});