import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { Connection } from 'typeorm';
import { getConnectionToken } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { getQueueToken } from '@nestjs/bullmq';
import { CreateOrderDto } from 'src/modules/order/dto/order.dto';
import { AppModule } from 'src/app.module';
import { OrderStatus } from 'src/common/constants/queue-names.const';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { validOrderDto } from './setup';

describe('Order Integration Tests', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let taxQueue: Queue;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }));

    await app.init();
    
    connection = app.get(getConnectionToken());
    taxQueue = app.get(getQueueToken('tax-processing'));
  });

  afterAll(async () => {
    await connection.close();
    await app.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all tables before each test
    const entities = connection.entityMetadatas;
    for (const entity of entities) {
      const repository = connection.getRepository(entity.name);
      await repository.query(`TRUNCATE TABLE "${entity.tableName}" CASCADE;`);
    }
    // Clear queue
    await taxQueue.drain()
  });

  describe('POST /orders', () => {
    const validOrderDto: CreateOrderDto = {
      businessId: '123e4567-e89b-12d3-a456-426614174000',
      departmentId: '123e4567-e89b-12d3-a456-426614174001',
      items: [
        {
          productId: 'PROD-1',
          name: 'Test Product',
          quantity: 2,
          unitPrice: 100,
        },
        {
          productId: 'PROD-2',
          name: 'Another Product',
          quantity: 1,
          unitPrice: 50,
        },
      ],
      notes: 'Test order'
    };

    it('should create an order successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/orders')
        .send(validOrderDto)
        .expect(201);

      expect(response.body).toMatchObject({
        businessId: validOrderDto.businessId,
        departmentId: validOrderDto.departmentId,
        status: OrderStatus.PENDING,
        amount: 250, // (2 * 100) + (1 * 50)
        notes: validOrderDto.notes,
      });

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('orderNumber');
      expect(response.body.orderNumber).toMatch(/^DPL-\d{8}-[0-9A-Z]{5}$/);
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body.items).toHaveLength(2);
    });

    it('should validate required fields', async () => {
      const invalidOrder = {
        businessId: '123e4567-e89b-12d3-a456-426614174000',
        // missing departmentId
        items: [],
      };

      const response = await request(app.getHttpServer())
        .post('/orders')
        .send(invalidOrder)
        .expect(400);

      expect(response.body.message).toContain('departmentId');
      expect(response.body.message).toContain('items');
    });

    it('should validate item fields', async () => {
      const orderWithInvalidItems = {
        ...validOrderDto,
        items: [
          {
            productId: 'PROD-1',
            // missing name
            quantity: -1, // invalid quantity
            unitPrice: 'invalid', // invalid price
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/orders')
        .send(orderWithInvalidItems)
        .expect(400);

      expect(response.body.message).toContain('name');
      expect(response.body.message).toContain('quantity');
      expect(response.body.message).toContain('unitPrice');
    });

    it('should handle concurrent order creation', async () => {
      const promises = Array(5).fill(validOrderDto).map(() =>
        request(app.getHttpServer())
          .post('/orders')
          .send(validOrderDto)
      );

      const responses = await Promise.all(promises);
      
      // Check all requests succeeded
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Check all order numbers are unique
      const orderNumbers = responses.map(response => response.body.orderNumber);
      const uniqueOrderNumbers = new Set(orderNumbers);
      expect(uniqueOrderNumbers.size).toBe(responses.length);
    });
  });

  describe('GET /orders/:id', () => {
    let createdOrder: any;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/orders')
        .send(validOrderDto);
      createdOrder = response.body;
    });

    it('should retrieve an order by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/orders/${createdOrder.id}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: createdOrder.id,
        orderNumber: createdOrder.orderNumber,
        businessId: createdOrder.businessId,
        departmentId: createdOrder.departmentId,
        status: createdOrder.status,
        amount: createdOrder.amount,
      });
    });

    it('should return 404 for non-existent order', async () => {
      await request(app.getHttpServer())
        .get('/orders/non-existent-id')
        .expect(404);
    });
  });

  describe('GET /orders/business/:businessId', () => {
    beforeEach(async () => {
      // Create multiple orders for the same business
      await Promise.all([
        request(app.getHttpServer()).post('/orders').send(validOrderDto),
        request(app.getHttpServer()).post('/orders').send(validOrderDto),
        request(app.getHttpServer()).post('/orders').send({
          ...validOrderDto,
          businessId: 'different-business-id',
        }),
      ]);
    });

    it('should retrieve all orders for a business', async () => {
      const response = await request(app.getHttpServer())
        .get(`/orders/business/${validOrderDto.businessId}`)
        .expect(200);

      expect(response.body).toHaveProperty('orders');
      expect(response.body.orders).toHaveLength(2);
      expect(response.body).toHaveProperty('totalOrders', 2);
      expect(response.body).toHaveProperty('totalAmount', 500); // 2 orders * 250
    });

    it('should support pagination and sorting', async () => {
      const response = await request(app.getHttpServer())
        .get(`/orders/business/${validOrderDto.businessId}`)
        .query({ page: 1, limit: 1, sortBy: 'createdAt', sortOrder: 'DESC' })
        .expect(200);

      expect(response.body.orders).toHaveLength(1);
      expect(response.body).toHaveProperty('totalOrders', 2);
      expect(response.body).toHaveProperty('currentPage', 1);
      expect(response.body).toHaveProperty('totalPages', 2);
    });
  });

  describe('GET /orders/transactions', () => {
    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/orders')
        .send(validOrderDto);
    });

    it('should retrieve transactions with filters', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders/transactions')
        .query({
          businessId: validOrderDto.businessId,
          startDate: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          endDate: new Date().toISOString(),
        })
        .expect(200);

      expect(response.body).toHaveProperty('transactions');
      expect(response.body.transactions).toBeInstanceOf(Array);
      expect(response.body).toHaveProperty('total');
    });

    it('should handle invalid date filters', async () => {
      await request(app.getHttpServer())
        .get('/orders/transactions')
        .query({
          startDate: 'invalid-date',
          endDate: 'invalid-date',
        })
        .expect(400);
    });
  });

  describe('GET /orders/transactions/:id', () => {
    let transactionId: string;

    beforeEach(async () => {
      const orderResponse = await request(app.getHttpServer())
        .post('/orders')
        .send(validOrderDto);
      
      // Get the transaction ID from the order response
      const orderTransactionsResponse = await request(app.getHttpServer())
        .get(`/orders/${orderResponse.body.id}/transactions`)
        .expect(200);
      
      transactionId = orderTransactionsResponse.body[0].id;
    });

    it('should retrieve transaction status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/orders/transactions/${transactionId}`)
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('lastProcessedAt');
      expect(response.body).toHaveProperty('retryCount');
    });

    it('should return 404 for non-existent transaction', async () => {
      await request(app.getHttpServer())
        .get('/orders/transactions/non-existent-id')
        .expect(404);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Temporarily break the database connection
      await connection.close();

      const response = await request(app.getHttpServer())
        .post('/orders')
        .send(validOrderDto)
        .expect(500);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('database');

      // Restore the connection for other tests
      await connection.connect();
    });

    it('should handle queue processing errors gracefully', async () => {
      // Mock queue error
      jest.spyOn(taxQueue, 'add').mockRejectedValueOnce(new Error('Queue error'));

      const response = await request(app.getHttpServer())
        .post('/orders')
        .send(validOrderDto)
        .expect(500);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('queue');
    });
  });
});