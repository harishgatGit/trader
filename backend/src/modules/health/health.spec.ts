import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: HealthService;

  const mockPrismaService = {
    healthCheck: jest.fn().mockResolvedValue(true),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health check with status field', async () => {
    jest.spyOn(healthService, 'check').mockResolvedValue({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        database: 'connected',
        redis: 'connected',
      },
      environment: 'test',
    });

    const result = await controller.check();
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('services');
  });
});
