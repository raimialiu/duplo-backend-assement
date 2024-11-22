import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany } from 'typeorm';
import { Business } from '../../business/entities/business.entity';
import { Order } from './order.entity';

@Entity()
export class Department {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  headName: string;

  @Column()
  headEmail: string;

  @ManyToOne(() => Business, business => business.departments)
  business: Business;

  @OneToMany(() => Order, order => order.department)
  orders: Order[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}