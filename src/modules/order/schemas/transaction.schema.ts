import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Transaction {
  @Prop({ required: true })
  orderId: string;

  @Prop({ required: true })
  businessId: string;

  @Prop({ required: true })
  amount: number;

  @Prop()
  items: Record<string, any>[];

  @Prop()
  departmentId: string;

  @Prop({ default: Date.now })
  timestamp: Date;

  @Prop()
  status: string;

  @Prop()
  taxResponse: Record<string, any>;
}

export type TransactionDocument = Transaction & Document;
export const TransactionSchema = SchemaFactory.createForClass(Transaction);