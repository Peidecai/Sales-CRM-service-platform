import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { plainToInstance } from 'class-transformer'
import * as bcrypt from 'bcryptjs'
import { User } from './user.entity'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { QueryUserDto } from './dto/query-user.dto'
import { UserResponseDto } from './dto/user-response.dto'

@Injectable()
export class UserService {
  private readonly BCRYPT_SALT_ROUNDS = 12

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    // Check for duplicate username
    const existing = await this.userRepository.findOne({
      where: { username: dto.username },
    })
    if (existing) {
      throw new ConflictException(`Username "${dto.username}" already exists`)
    }

    const hashedPassword = await bcrypt.hash(dto.password, this.BCRYPT_SALT_ROUNDS)
    const user = this.userRepository.create({
      ...dto,
      password: hashedPassword,
    })
    const saved = await this.userRepository.save(user)
    return this.toResponse(saved)
  }

  async findAll(query: QueryUserDto): Promise<{ list: UserResponseDto[]; total: number }> {
    const { page = 1, pageSize = 20, keyword, role } = query

    const qb = this.userRepository.createQueryBuilder('user')

    if (keyword) {
      qb.andWhere('(user.username LIKE :kw OR user.name LIKE :kw OR user.email LIKE :kw)', {
        kw: `%${keyword}%`,
      })
    }

    if (role) {
      qb.andWhere('user.role = :role', { role })
    }

    qb.orderBy('user.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()
    return {
      list: list.map((u) => this.toResponse(u)),
      total,
    }
  }

  async findOne(id: number): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id },
    })
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }
    return this.toResponse(user)
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.username = :username', { username })
      .getOne()
  }

  async update(id: number, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id },
    })
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }

    const updateData = { ...dto }
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, this.BCRYPT_SALT_ROUNDS)
    }

    Object.assign(user, updateData)
    const saved = await this.userRepository.save(user)
    return this.toResponse(saved)
  }

  async remove(id: number): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id },
    })
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }
    await this.userRepository.softRemove(user)
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password)
  }

  /** Convert User entity to a safe response DTO (excludes password, deleted, updatedAt) */
  private toResponse(user: User): UserResponseDto {
    return plainToInstance(UserResponseDto, user, { excludeExtraneousValues: true })
  }
}
