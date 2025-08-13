import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { UserRole } from '../src/utils/StringConst';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test-e2e'
        }
      }
    });
    await app.close();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user', () => {
      const registerDto = {
        name: 'Test User E2E',
        email: 'test-e2e@example.com',
        password: 'password123',
        role: UserRole.VIEWER,
      };

      return request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.email).toBe(registerDto.email);
          expect(res.body.name).toBe(registerDto.name);
          expect(res.body.role).toBe(registerDto.role);
          expect(res.body).not.toHaveProperty('password');
        });
    });

    it('should return 409 when user already exists', () => {
      const registerDto = {
        name: 'Test User E2E Duplicate',
        email: 'test-e2e@example.com',
        password: 'password123',
        role: UserRole.VIEWER,
      };

      return request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(409);
    });
  });

  describe('/auth/login (POST)', () => {
    it('should login with valid credentials', () => {
      const loginDto = {
        email: 'test-e2e@example.com',
        password: 'password123',
      };

      return request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(typeof res.body.accessToken).toBe('string');
        });
    });

    it('should return 401 for invalid credentials', () => {
      const loginDto = {
        email: 'test-e2e@example.com',
        password: 'wrongpassword',
      };

      return request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);
    });
  });

  describe('/auth/me (GET)', () => {
    let accessToken: string;

    beforeAll(async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test-e2e@example.com',
          password: 'password123',
        });
      accessToken = loginResponse.body.accessToken;
    });

    it('should return user profile with valid token', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.email).toBe('test-e2e@example.com');
          expect(res.body).not.toHaveProperty('password');
        });
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });
  });

  describe('/auth/logout (POST)', () => {
    let accessToken: string;

    beforeAll(async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test-e2e@example.com',
          password: 'password123',
        });
      accessToken = loginResponse.body.accessToken;
    });

    it('should logout successfully', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('Logout successful');
        });
    });
  });
});