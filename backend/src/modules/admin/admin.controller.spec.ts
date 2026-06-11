import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { DataQualityService } from './data-quality.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AuthService } from '../auth/auth.service';

describe('AdminController', () => {
  let controller: AdminController;
  let service: AdminService;

  const mockAdminService = {
    getUsers: jest.fn(),
    createUser: jest.fn(),
    getAnalytics: jest.fn(),
  };

  const mockDataQualityService = {
    probeSymbol: jest.fn(),
    getHistoricalConsistency: jest.fn(),
    getDataGapReport: jest.fn(),
  };

  const mockAuthService = {
    validateSession: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: mockAdminService },
        { provide: DataQualityService, useValue: mockDataQualityService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    service = module.get<AdminService>(AdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUsers', () => {
    it('should delegate to AdminService.getUsers()', async () => {
      const mockUsers = [{ id: '1', username: 'admin', role: 'SUPERUSER' }];
      mockAdminService.getUsers.mockResolvedValue(mockUsers);

      const result = await controller.getUsers();
      expect(result).toEqual(mockUsers);
      expect(mockAdminService.getUsers).toHaveBeenCalledTimes(1);
    });
  });

  describe('createUser', () => {
    it('should delegate to AdminService.createUser() with dto', async () => {
      const dto: CreateUserDto = { username: 'testuser', password: 'password123', role: 'BASIC' };
      const expectedResult = { id: '2', username: 'testuser', role: 'BASIC' };
      mockAdminService.createUser.mockResolvedValue(expectedResult);

      const result = await controller.createUser(dto);
      expect(result).toEqual(expectedResult);
      expect(mockAdminService.createUser).toHaveBeenCalledWith(dto);
    });
  });

  describe('getAnalytics', () => {
    it('should delegate to AdminService.getAnalytics()', async () => {
      const mockAnalytics = { totalSearches: 10, dailyStats: [] };
      mockAdminService.getAnalytics.mockResolvedValue(mockAnalytics);

      const result = await controller.getAnalytics();
      expect(result).toEqual(mockAnalytics);
      expect(mockAdminService.getAnalytics).toHaveBeenCalledTimes(1);
    });
  });
});
