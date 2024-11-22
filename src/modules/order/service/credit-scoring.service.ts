import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction, TransactionDocument } from '../schemas/transaction.schema';

@Injectable()
export class CreditScoreService {
  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
  ) {}

  async calculateCreditScore(businessId: string): Promise<number> {
    const transactions = await this.transactionModel
      .find({ businessId })
      .sort({ timestamp: -1 })
      .limit(100);

    if (!transactions.length) return 0;

    // Factors for credit score calculation
    const totalTransactions = transactions.length;
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
    const averageTransactionAmount = totalAmount / totalTransactions;
    const successfulTransactions = transactions.filter(t => t.status === 'completed').length;
    const successRate = successfulTransactions / totalTransactions;

    // Calculate base score (0-850)
    let score = 0;
    
    // Transaction history weight (max 300 points)
    score += Math.min(totalTransactions * 3, 300);
    
    // Transaction success rate (max 300 points)
    score += successRate * 300;
    
    // Average transaction amount (max 250 points)
    score += Math.min((averageTransactionAmount / 10000) * 250, 250);

    return Math.min(Math.round(score), 850);
  }
}