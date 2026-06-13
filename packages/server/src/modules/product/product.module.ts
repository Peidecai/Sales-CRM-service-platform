import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Product } from './entities/product.entity'
import { ProductCategory } from './entities/product-category.entity'
import { OpportunityProduct } from './entities/opportunity-product.entity'
import { ProductController } from './product.controller'
import { ProductService } from './product.service'
import { ProductCategoryService } from './product-category.service'

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductCategory, OpportunityProduct])],
  controllers: [ProductController],
  providers: [ProductService, ProductCategoryService],
  exports: [ProductService, TypeOrmModule],
})
export class ProductModule {}
