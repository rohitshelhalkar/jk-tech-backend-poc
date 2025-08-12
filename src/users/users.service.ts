import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(userData: any) {
    return this.prisma.user.create({
      data: userData,
    });
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      where: {
        isDeleted: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return users;
  }

  async findById(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { 
        id,
        isDeleted: false
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { 
        email,
        isDeleted: false
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findFirst({
      where: { 
        id,
        isDeleted: false
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        ...updateUserDto,
        updatedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  async remove(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { 
        id,
        isDeleted: false
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Soft delete the user
    await this.prisma.user.update({
      where: { id },
      data: { 
        isDeleted: true,
        updatedAt: new Date()
      }
    });

    return { message: 'User deleted successfully' };
  }
}