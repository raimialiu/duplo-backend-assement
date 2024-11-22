import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Department } from './department.entity';
import { Order } from './order.entity';

@Entity()
export class Business {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  registrationNumber: string;

  @Column()
  address: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => Department, department => department.business)
  departments: Department[];

  @OneToMany(() => Order, order => order.business)
  orders: Order[];
}