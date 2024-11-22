import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Order } from "../business/entities/order.entity";
import { OrderService } from "./service/order.service";
import { OrderController } from "./controller/order.controller";
import { QueueNames } from "src/common/constants/queue-names.const";

@Module({
    imports: [
        TypeOrmModule.forFeature([Order]),
        BullModule.registerQueue({
            name: QueueNames.ORDER_PROCESSING,
        })
    ],
    providers: [OrderService],
    controllers: [OrderController]
})
export class OrderModule {

}