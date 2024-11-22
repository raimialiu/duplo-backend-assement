import { IsOptional, IsString, IsDateString } from "class-validator";


export class QueryTransactionDto {
    @IsOptional()
    @IsString()
    orderId?: string;

    @IsOptional()
    @IsString()
    businessId?: string;

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

    @IsOptional()
    @IsString()
    status?: string;
}
