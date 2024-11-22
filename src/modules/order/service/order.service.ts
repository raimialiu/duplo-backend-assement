import { InjectRepository } from '@nestjs/typeorm';
// src/modules/order/order.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { MoreThanOrEqual, Repository, Transaction } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import { Order } from 'src/modules/business/entities/order.entity';
import { TransactionDocument } from '../schemas/transaction.schema';
import { CreateOrderDto, OrderResponseDto } from '../dto/order.dto';
import { QueryTransactionDto } from '../dto/querytransaction.dto';
import { OrderStatus, QueueNames } from 'src/common/constants/queue-names.const';
import { Queue } from 'bullmq';
import { generateOrderNumber } from 'src/utils/order.util';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    @InjectQueue(QueueNames.ORDER_PROCESSING)
    private taxQueue: Queue,
  ) {}

  async createOrder(orderData: CreateOrderDto): Promise<OrderResponseDto> {
    const queryRunner = this.orderRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Calculate total amount
      const totalAmount = orderData.items.reduce(
        (sum, item) => sum + (item.quantity * item.unitPrice),
        0
      );

      // Create order in PostgreSQL
      const order = this.orderRepository.create({
        orderNumber: generateOrderNumber(),
        amount: totalAmount,
        items: orderData.items,
        business: { id: orderData.businessId },
        department: { id: orderData.departmentId },
        status: OrderStatus.PENDING,
      });

      const savedOrder = await queryRunner.manager.save(Order, order);

      // Create transaction record in MongoDB
      const transaction = new this.transactionModel({
        orderId: savedOrder.id,
        businessId: orderData.businessId,
        amount: totalAmount,
        items: orderData.items,
        departmentId: orderData.departmentId,
        status: 'pending',
      });
      await transaction.save();

      // Add tax processing job to queue
      await this.taxQueue.add('process-tax', {
        transactionId: transaction.id,
        orderData: {
          orderId: savedOrder.id,
          businessId: orderData.businessId,
          amount: totalAmount,
          timestamp: new Date(),
        },
      });

      await queryRunner.commitTransaction();

      return {
        id: savedOrder.id,
        orderNumber: savedOrder.orderNumber,
        amount: totalAmount,
        status: savedOrder.status,
        items: orderData.items,
        businessId: orderData.businessId,
        departmentId: orderData.departmentId,
        createdAt: savedOrder.createdAt,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new HttpException(
        'Failed to create order',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async getBusinessOrders(businessId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [orders, todayOrders] = await Promise.all([
      this.orderRepository.find({
        where: { business: { id: businessId } },
        relations: ['department'],
        order: { createdAt: 'DESC' },
      }),
      this.orderRepository.find({
        where: {
          business: { id: businessId },
          createdAt: MoreThanOrEqual(today),
        },
        relations: ['department'],
      }),
    ]);

    return {
      totalOrders: orders.length,
      totalAmount: orders.reduce((sum, order) => sum + Number(order.amount), 0),
      todayOrders: todayOrders.length,
      todayAmount: todayOrders.reduce((sum, order) => sum + Number(order.amount), 0),
      orders: orders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        amount: order.amount,
        status: order.status,
        departmentName: order.department.name,
        createdAt: order.createdAt,
      })),
    };
  }

  async queryTransactions(query: QueryTransactionDto) {
    const filter: any = {};

    if (query.orderId) filter.orderId = query.orderId;
    if (query.businessId) filter.businessId = query.businessId;
    if (query.status) filter.status = query.status;
    if (query.startDate || query.endDate) {
      filter.timestamp = {};
      if (query.startDate) filter.timestamp.$gte = new Date(query.startDate);
      if (query.endDate) filter.timestamp.$lte = new Date(query.endDate);
    }

    const transactions = await this.transactionModel
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(100);

    return {
      total: transactions.length,
      transactions: transactions.map(t => ({
        id: t._id,
        orderId: t.orderId,
        businessId: t.businessId,
        amount: t.amount,
        status: t.status,
        timestamp: t.timestamp,
        taxResponse: t.taxResponse,
      })),
    };
  }

  async getTransactionStatus(transactionId: string) {
    const transaction: any = await this.transactionModel.findById(transactionId);
    if (!transaction) {
      throw new HttpException('Transaction not found', HttpStatus.NOT_FOUND);
    }

    return {
      id: transaction._id,
      status: transaction.status,
      lastProcessedAt: transaction.lastProcessedAt,
      errorMessage: transaction.errorMessage,
      taxResponse: transaction.taxResponse,
    };
  }
}