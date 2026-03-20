import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { TrainingCategory } from './entities/training-category.entity'
import { CreateTrainingCategoryDto, UpdateTrainingCategoryDto } from './dto/training-category.dto'

@Injectable()
export class TrainingCategoryService {
  constructor(
    @InjectRepository(TrainingCategory)
    private readonly categoryRepo: Repository<TrainingCategory>,
  ) {}

  async findAll(): Promise<TrainingCategory[]> {
    return this.categoryRepo.find({ order: { sortOrder: 'ASC', createdAt: 'DESC' } })
  }

  async findOne(id: number): Promise<TrainingCategory> {
    const cat = await this.categoryRepo.findOne({ where: { id } })
    if (!cat) throw new NotFoundException(`Training category #${id} not found`)
    return cat
  }

  async create(dto: CreateTrainingCategoryDto): Promise<TrainingCategory> {
    const entity = this.categoryRepo.create(dto)
    return this.categoryRepo.save(entity)
  }

  async update(id: number, dto: UpdateTrainingCategoryDto): Promise<TrainingCategory> {
    const cat = await this.findOne(id)
    Object.assign(cat, dto)
    return this.categoryRepo.save(cat)
  }

  async remove(id: number): Promise<void> {
    const cat = await this.findOne(id)
    await this.categoryRepo.softRemove(cat)
  }
}
