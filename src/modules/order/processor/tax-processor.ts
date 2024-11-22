// src/modules/order/processors/tax-processor.ts
import { Processor } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import { Transaction, TransactionDocument } from '../schemas/transaction.schema';
import { firstValueFrom } from 'rxjs';
import { timeout, retry } from 'rxjs/operators';

@Processor('tax-processing')
export class TaxProcessor {
  private readonly logger = new Logger(TaxProcessor.name);

  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    private httpService: HttpService,
  ) {}

  @Process('process-tax')
  async processTax(job: Job<{ transactionId: string; orderData: any }>) {
    this.logger.debug(`Processing tax for transaction ${job.data.transactionId}`);
    
    try {
      const taxResponse = await firstValueFrom(
        this.httpService
          .post('https://taxes.free.beeceptor.com/log-tax', job.data.orderData)
          .pipe(
            timeout(40000),
            retry(3),
          ),
      );

      await this.transactionModel.findByIdAndUpdate(
        job.data.transactionId,
        {
          taxResponse: taxResponse.data,
          status: 'completed',
          lastProcessedAt: new Date(),
        },
        { new: true },
      );

      this.logger.debug(`Successfully processed tax for transaction ${job.data.transactionId}`);
      return taxResponse.data;
    } catch (error) {
      await this.transactionModel.findByIdAndUpdate(
        job.data.transactionId,
        {
          status: 'failed',
          errorMessage: error.message,
          lastProcessedAt: new Date(),
        },
      );

      this.logger.error(`Failed to process tax for transaction ${job.data.transactionId}`, error.stack);
      throw error;
    }
  }
}