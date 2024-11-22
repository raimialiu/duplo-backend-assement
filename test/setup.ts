import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, createConnection } from 'typeorm';
import { MongoClient } from 'mongodb';
import { CreateOrderDto } from 'src/modules/order/dto/order.dto';

export const validOrderDto: CreateOrderDto = {
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

export class TestDatabaseSetup {
  private static mongoServer: MongoMemoryServer;
  private static mongoClient: MongoClient;
  private static postgresConnection: Connection;

  static async initializeMongoMemoryServer() {
    this.mongoServer = await MongoMemoryServer.create({
      binary: {
        version: '6.0.8', // Specify MongoDB version
      },
      instance: {
        dbName: 'test-db',
      },
    });
    const mongoUri = this.mongoServer.getUri();
    this.mongoClient = await MongoClient.connect(mongoUri);
    return mongoUri;
  }

  static async initializePostgres() {
    this.postgresConnection = await createConnection({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'test',
      password: 'test',
      database: 'test_db',
      entities: ['src/**/*.entity.ts'],
      synchronize: true,
    });
    return this.postgresConnection;
  }

  static async closeConnections() {
    if (this.mongoClient) {
      await this.mongoClient.close();
    }
    if (this.mongoServer) {
      await this.mongoServer.stop();
    }
    if (this.postgresConnection) {
      await this.postgresConnection.close();
    }
  }

  static async clearDatabase() {
    if (this.mongoClient) {
      const db = this.mongoClient.db();
      const collections = await db.collections();
      for (const collection of collections) {
        await collection.deleteMany({});
      }
    }
    if (this.postgresConnection) {
      const entities = this.postgresConnection.entityMetadatas;
      for (const entity of entities) {
        const repository = this.postgresConnection.getRepository(entity.name);
        await repository.query(`TRUNCATE TABLE "${entity.tableName}" CASCADE;`);
      }
    }
  }
}