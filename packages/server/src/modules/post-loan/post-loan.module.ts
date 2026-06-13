import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PostLoan } from './entities/post-loan.entity'
import { RepaymentPlan } from './entities/repayment-plan.entity'
import { PostLoanController } from './post-loan.controller'
import { PostLoanService } from './post-loan.service'
import { ContractModule } from '../contract/contract.module'

@Module({
  imports: [TypeOrmModule.forFeature([PostLoan, RepaymentPlan]), ContractModule],
  controllers: [PostLoanController],
  providers: [PostLoanService],
  exports: [PostLoanService],
})
export class PostLoanModule {}
