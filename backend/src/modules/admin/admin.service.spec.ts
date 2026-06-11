import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    searchLog: {
      findMany: jest.fn(),
    },
    fundamentalSnapshot: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUsers', () => {
    it('should return all users with count of searchLogs', async () => {
      const mockUsers = [
        { id: '1', username: 'admin', role: 'SUPERUSER', createdAt: new Date(), _count: { searchLogs: 5 } },
        { id: '2', username: 'user1', role: 'BASIC', createdAt: new Date(), _count: { searchLogs: 2 } },
      ];
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.getUsers();
      expect(result).toEqual(mockUsers);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          username: true,
          role: true,
          createdAt: true,
          _count: {
            select: { searchLogs: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('createUser', () => {
    it('should create a user with a hashed password', async () => {
      const dto = { username: 'newuser', password: 'password123', role: 'BASIC' };
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockImplementation((args) => {
        return Promise.resolve({
          id: 'new-id',
          username: args.data.username,
          role: args.data.role,
        });
      });

      const result = await service.createUser(dto);
      expect(result).toEqual({
        id: 'new-id',
        username: 'newuser',
        role: 'BASIC',
      });
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'newuser' },
      });
      expect(mockPrismaService.user.create).toHaveBeenCalled();
      
      const createCallData = mockPrismaService.user.create.mock.calls[0][0].data;
      expect(createCallData.username).toBe('newuser');
      expect(createCallData.role).toBe('BASIC');
      expect(createCallData.passwordHash).toBeDefined();
      expect(createCallData.passwordHash).toContain(':'); // salt:hash format
    });

    it('should throw ConflictException if username already exists', async () => {
      const dto = { username: 'admin', password: 'password123', role: 'BASIC' };
      mockPrismaService.user.findUnique.mockResolvedValue({ id: '1', username: 'admin' });

      await expect(service.createUser(dto)).rejects.toThrow(ConflictException);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'admin' },
      });
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });
  });

  describe('getAnalytics', () => {
    it('should compile daily volume, top tickers, top sectors, and recent logs', async () => {
      const date1 = new Date();
      const date2 = new Date();
      date2.setDate(date2.getDate() - 1);

      const mockLogs = [
        { id: 'l1', symbol: 'AAPL', timestamp: date1, user: { username: 'user1' }, ipAddress: '192.168.1.1', city: 'Local', state: 'Local' },
        { id: 'l2', symbol: 'AAPL', timestamp: date1, user: { username: 'user2' }, ipAddress: '192.168.1.1', city: 'Local', state: 'Local' },
        { id: 'l3', symbol: 'MSFT', timestamp: date2, user: { username: 'user1' }, ipAddress: '8.8.8.8', city: 'Mountain View', state: 'California' },
        { id: 'l4', symbol: 'TSLA', timestamp: date2, user: null, ipAddress: 'Unknown', city: 'Unknown', state: 'Unknown' },
      ];

      const mockSnapshots = [
        { symbol: 'AAPL', sector: 'Technology' },
        { symbol: 'MSFT', sector: 'Technology' },
      ];

      mockPrismaService.searchLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaService.fundamentalSnapshot.findMany.mockResolvedValue(mockSnapshots);

      const result = await service.getAnalytics();

      expect(result).toBeDefined();
      expect(result.totalSearches).toBe(4);
      
      // Top symbols assertion
      expect(result.topSymbols).toContainEqual({ symbol: 'AAPL', count: 2 });
      expect(result.topSymbols).toContainEqual({ symbol: 'MSFT', count: 1 });
      expect(result.topSymbols).toContainEqual({ symbol: 'TSLA', count: 1 });

      // Top sectors assertion
      expect(result.topSectors).toContainEqual({ sector: 'Technology', count: 3 }); // AAPL (2) + MSFT (1)
      expect(result.topSectors).toContainEqual({ sector: 'Unknown', count: 1 }); // TSLA (1)

      // Recent searches check
      expect(result.recentSearches.length).toBe(4);
      expect(result.recentSearches[0]).toEqual({
        id: 'l1',
        username: 'user1',
        symbol: 'AAPL',
        sector: 'Technology',
        timestamp: date1,
        ipAddress: '192.168.1.1',
        city: 'Local',
        state: 'Local',
      });
      expect(result.recentSearches[3]).toEqual({
        id: 'l4',
        username: 'Unknown',
        symbol: 'TSLA',
        sector: 'Unknown',
        timestamp: date2,
        ipAddress: 'Unknown',
        city: 'Unknown',
        state: 'Unknown',
      });

      // Top IPs check
      expect(result.topIps.length).toBe(3);
      expect(result.topIps).toContainEqual({ ip: '192.168.1.1', count: 2, city: 'Local', state: 'Local' });
      expect(result.topIps).toContainEqual({ ip: '8.8.8.8', count: 1, city: 'Mountain View', state: 'California' });
      expect(result.topIps).toContainEqual({ ip: 'Unknown', count: 1, city: 'Unknown', state: 'Unknown' });

      // Daily stats check
      expect(result.dailyStats.length).toBe(7); // Last 7 days
    });
  });
});
