// src/modules/order/dto/create-order.dto.ts
import { IsNumber, IsUUID, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsString()
  productId: string;

  @IsString()
  name: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  unitPrice: number;
}

export class CreateOrderDto {
  @IsUUID()
  businessId: string;

  @IsUUID()
  departmentId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}

// src/modules/order/dto/order-response.dto.ts
export class OrderResponseDto {
  id: string;
  orderNumber: string;
  amount: number;
  status: string;
  items: OrderItemDto[];
  businessId: string;
  departmentId: string;
  createdAt: Date;
}

