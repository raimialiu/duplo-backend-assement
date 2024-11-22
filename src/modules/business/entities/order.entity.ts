import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Business } from '../../business/entities/business.entity';
import { Department } from './department.entity';

@Entity()
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderNumber: string;

  @Column('decimal')
  amount: number;

  @Column('jsonb')
  items: any;

  @ManyToOne(() => Business, business => business.orders)
  business: Business;

  @ManyToOne(() => Department, department => department.orders)
  department: Department;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ default: 'pending' })
  status: string;
}