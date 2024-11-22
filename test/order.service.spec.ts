import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { getModelToken } from '@nestjs/mongoose';
import { Repository, Transaction } from 'typeorm';
import { Model } from 'mongoose';
import { Queue } from 'bullmq';
import { Order } from 'src/modules/business/entities/order.entity';
import { CreateOrderDto } from 'src/modules/order/dto/order.dto';
import { OrderService } from 'src/modules/order/service/order.service';

describe('OrderService', () => {
  let service: OrderService;
  let orderRepository: Repository<Order>;
  let transactionModel: Model<Transaction>;
  let taxQueue: Queue;

  const mockOrderRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    manager: {
      connection: {
        createQueryRunner: () => ({
          connect: jest.fn(),
          startTransaction: jest.fn(),
          commitTransaction: jest.fn(),
          rollbackTransaction: jest.fn(),
          release: jest.fn(),
          manager: {
            save: jest.fn(),
          },
        }),
      },
    },
  };

  const mockTransactionModel = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  const mockTaxQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        {
          provide: getModelToken(Transaction.name),
          useValue: mockTransactionModel,
        },
        {
          provide: getQueueToken('tax-processing'),
          useValue: mockTaxQueue,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    orderRepository = module.get<Repository<Order>>(getRepositoryToken(Order));
    transactionModel = module.get<Model<Transaction>>(getModelToken(Transaction.name));
    taxQueue = module.get<Queue>(getQueueToken('tax-processing'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    const mockCreateOrderDto: CreateOrderDto = {
      businessId: '123e4567-e89b-12d3-a456-426614174000',
      departmentId: '123e4567-e89b-12d3-a456-426614174001',
      items: [
        {
          productId: 'PROD-1',
          name: 'Test Product',
          quantity: 2,
          unitPrice: 100,
        },
      ],
    };

    const mockOrder = {
      id: '123e4567-e89b-12d3-a456-426614174002',
      orderNumber: 'DPL-20241122-ABC12',
      amount: 200,
      status: 'pending',
      createdAt: new Date(),
    };

    const mockTransaction = {
      id: '507f1f77bcf86cd799439011',
      orderId: mockOrder.id,
      status: 'pending',
    };

    it('should create an order successfully', async () => {
      mockOrderRepository.create.mockReturnValue(mockOrder);
      mockOrderRepository.manager.connection.createQueryRunner().manager.save.mockResolvedValue(mockOrder);
      mockTransactionModel.create.mockReturnValue(mockTransaction);
      mockTransactionModel.save.mockResolvedValue(mockTransaction);
      mockTaxQueue.add.mockResolvedValue(undefined);

      const result = await service.createOrder(mockCreateOrderDto);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockOrder.id);
      expect(result.amount).toBe(200);
      expect(mockTaxQueue.add).toHaveBeenCalledWith('process-tax', {
        transactionId: mockTransaction.id,
        orderData: expect.any(Object),
      });
    });

    it('should handle transaction rollback on error', async () => {
      const error = new Error('Database error');
      mockOrderRepository.create.mockReturnValue(mockOrder);
      mockOrderRepository.manager.connection.createQueryRunner().manager.save.mockRejectedValue(error);

      await expect(service.createOrder(mockCreateOrderDto)).rejects.toThrow();

      const queryRunner = mockOrderRepository.manager.connection.createQueryRunner();
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });

  describe('getBusinessOrders', () => {
    const mockBusinessId = '123e4567-e89b-12d3-a456-426614174000';
    const mockOrders = [
      {
        id: '123',
        orderNumber: 'DPL-20241122-ABC12',
        amount: 200,
        status: 'completed',
        department: { name: 'Sales' },
        createdAt: new Date(),
      },
    ];

    it('should return business orders with statistics', async () => {
      mockOrderRepository.find.mockResolvedValueOnce(mockOrders);
      mockOrderRepository.find.mockResolvedValueOnce([mockOrders[0]]);

      const result = await service.getBusinessOrders(mockBusinessId);

      expect(result).toBeDefined();
      expect(result.totalOrders).toBe(1);
      expect(result.totalAmount).toBe(200);
      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].departmentName).toBe('Sales');
    });
  });

  describe('queryTransactions', () => {
    const mockQuery = {
      businessId: '123',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    };

    const mockTransactions = [
      {
        _id: '507f1f77bcf86cd799439011',
        orderId: '123',
        businessId: '123',
        amount: 200,
        status: 'completed',
        timestamp: new Date(),
      },
    ];

    it('should return filtered transactions', async () => {
      mockTransactionModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockTransactions),
        }),
      });

      const result = await service.queryTransactions(mockQuery);

      expect(result.total).toBe(1);
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].orderId).toBe('123');
    });
  });

  describe('getTransactionStatus', () => {
    const mockTransactionId = '507f1f77bcf86cd799439011';
    const mockTransaction = {
      _id: mockTransactionId,
      status: 'completed',
      lastProcessedAt: new Date(),
      taxResponse: { taxAmount: 20 },
    };

    it('should return transaction status', async () => {
      mockTransactionModel.findById.mockResolvedValue(mockTransaction);

      const result = await service.getTransactionStatus(mockTransactionId);

      expect(result).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.taxResponse).toBeDefined();
    });

    it('should throw error for non-existent transaction', async () => {
      mockTransactionModel.findById.mockResolvedValue(null);

      await expect(service.getTransactionStatus(mockTransactionId))
        .rejects
        .toThrow('Transaction not found');
    });
  });
});