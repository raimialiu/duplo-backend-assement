import { BullRootModuleOptions } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

export const getBullConfig = (configService: ConfigService): BullRootModuleOptions => ({
    connection :{
        host: configService.get('REDIS_HOST', 'localhost'),
        port: configService.get('REDIS_PORT', 6379)
    },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: false,
    removeOnFail: false,
  },
});