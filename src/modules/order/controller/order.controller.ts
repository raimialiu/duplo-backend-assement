import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    Query,
    UseGuards,
    ValidationPipe,
  } from '@nestjs/common';
  import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
  import { OrderService } from './order.service';
  import { CreateOrderDto, QueryTransactionDto } from './dto';
  import { AuthGuard } from '../auth/guards/auth.guard';
  
  @ApiTags('Orders')
  @Controller('orders')
  @UseGuards(AuthGuard)
  export class OrderController {
    constructor(private readonly orderService: OrderService) {}
  
    @Post()
    @ApiOperation({ summary: 'Create a new order' })
    @ApiResponse({ status: 201, description: 'Order created successfully' })
    async createOrder(@Body(ValidationPipe) orderData: CreateOrderDto) {
      return await this.orderService.createOrder(orderData);
    }
  
    @Get('business/:businessId')
    @ApiOperation({ summary: 'Get business order details' })
    async getBusinessOrders(@Param('businessId') businessId: string) {
      return await this.orderService.getBusinessOrders(businessId);
    }
  
    @Get('transactions')
    @ApiOperation({ summary: 'Query transactions' })
    async queryTransactions(@Query(ValidationPipe) query: QueryTransactionDto) {
      return await this.orderService.queryTransactions(query);
    }
  
    @Get('transactions/:id')
    @ApiOperation({ summary: 'Get transaction status' })
    async getTransactionStatus(@Param('id') id: string) {
      return await this.orderService.getTransactionStatus(id);
    }
  }