import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderModule } from './modules/order/order.module';
import { Order } from './modules/business/entities/order.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'root',
      database: 'test',
      entities: [Order],
      synchronize: true,
    }),
    OrderModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
