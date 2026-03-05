import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcryptjs'
import { User } from './user.entity'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { QueryUserDto } from './dto/query-user.dto'

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    // Check for duplicate username
    const existing = await this.userRepository.findOne({
      where: { username: dto.username, deleted: false },
    })
    if (existing) {
      throw new ConflictException(`Username "${dto.username}" already exists`)
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10)
    const user = this.userRepository.create({
      ...dto,
      password: hashedPassword,
    })
    const saved = await this.userRepository.save(user)
    return this.stripPassword(saved)
  }

  async findAll(query: QueryUserDto): Promise<{ list: User[]; total: number }> {
    const { page = 1, pageSize = 20, keyword, role } = query

    const qb = this.userRepository
      .createQueryBuilder('user')
      .where('user.deleted = :deleted', { deleted: false })

    if (keyword) {
      qb.andWhere('(user.username LIKE :kw OR user.name LIKE :kw OR user.email LIKE :kw)', {
        kw: `%${keyword}%`,
      })
    }

    if (role) {
      qb.andWhere('user.role = :role', { role })
    }

    qb.orderBy('user.id', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()
    return {
      list: list.map((u) => this.stripPassword(u)),
      total,
    }
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, deleted: false },
    })
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }
    return this.stripPassword(user)
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { username, deleted: false },
    })
  }

  async update(id: number, dto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, deleted: false },
    })
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }

    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10)
    }

    Object.assign(user, dto)
    const saved = await this.userRepository.save(user)
    return this.stripPassword(saved)
  }

  async remove(id: number): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id, deleted: false },
    })
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }
    user.deleted = true
    await this.userRepository.save(user)
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password)
  }

  /** Remove password field from user object before returning */
  private stripPassword(user: User): User {
    delete (user as Partial<Pick<User, 'password'>>).password
    return user
  }
}
