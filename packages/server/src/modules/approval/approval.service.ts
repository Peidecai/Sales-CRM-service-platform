import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ApprovalStatus, ApprovalAction, UserRole } from '@crm/shared'
import type { PageResult } from '@crm/shared'
import { ApprovalFlow } from './entities/approval-flow.entity'
import { ApprovalInstance } from './entities/approval-instance.entity'
import { ApprovalRecord } from './entities/approval-record.entity'
import { CreateApprovalInstanceDto } from './dto/create-approval-instance.dto'
import { ApproveActionDto } from './dto/approve-action.dto'
import { QueryApprovalDto } from './dto/query-approval.dto'
import type { AuthUser } from '../../common/decorators/current-user.decorator'

@Injectable()
export class ApprovalService {
  constructor(
    @InjectRepository(ApprovalFlow)
    private readonly flowRepository: Repository<ApprovalFlow>,
    @InjectRepository(ApprovalInstance)
    private readonly instanceRepository: Repository<ApprovalInstance>,
    @InjectRepository(ApprovalRecord)
    private readonly recordRepository: Repository<ApprovalRecord>,
  ) {}

  // ─── Create Instance ───────────────────────────────────────────────────

  /**
   * 发起审批
   * 根据业务类型查找匹配的流程定义，创建审批实例并设置到第一个节点
   */
  async createInstance(dto: CreateApprovalInstanceDto, user: AuthUser): Promise<ApprovalInstance> {
    // 查找对应业务类型已启用的流程定义
    const flow = await this.flowRepository.findOne({
      where: { bizType: dto.bizType, isEnabled: true },
    })
    if (!flow) {
      throw new BadRequestException(`业务类型 ${dto.bizType} 暂无可用的审批流程定义`)
    }
    if (!flow.nodes || flow.nodes.length === 0) {
      throw new BadRequestException(`审批流程 ${flow.flowName} 未配置审批节点`)
    }

    // 按 order 排序取第一个节点
    const sortedNodes = [...flow.nodes].sort((a, b) => a.order - b.order)
    const firstNode = sortedNodes[0]

    const instance = this.instanceRepository.create({
      flowDefinitionId: flow.id,
      bizType: dto.bizType,
      bizId: dto.bizId,
      bizNo: dto.bizNo ?? null,
      title: dto.title,
      applicantId: user.id,
      currentNodeId: firstNode.id,
      status: ApprovalStatus.PENDING,
      resultRemark: null,
      completedAt: null,
    })

    return this.instanceRepository.save(instance)
  }

  // ─── List ──────────────────────────────────────────────────────────────

  async findAll(query: QueryApprovalDto, _user: AuthUser): Promise<PageResult<ApprovalInstance>> {
    const { page = 1, pageSize = 20, status, bizType, applicantId } = query

    const qb = this.instanceRepository.createQueryBuilder('i')

    if (status) qb.andWhere('i.status = :status', { status })
    if (bizType) qb.andWhere('i.bizType = :bizType', { bizType })
    if (applicantId) qb.andWhere('i.applicantId = :applicantId', { applicantId })

    qb.orderBy('i.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()
    return { list, total, page, pageSize }
  }

  // ─── Detail ────────────────────────────────────────────────────────────

  /**
   * 获取审批实例详情，附带所有操作记录
   */
  async findOne(
    id: number,
    _user: AuthUser,
  ): Promise<{ instance: ApprovalInstance; records: ApprovalRecord[]; flow: ApprovalFlow | null }> {
    const instance = await this.instanceRepository.findOne({
      where: { id },
    })
    if (!instance) throw new NotFoundException(`审批实例 ${id} 不存在`)

    const records = await this.recordRepository.find({
      where: { instanceId: id },
      order: { createdAt: 'ASC' },
    })

    const flow = await this.flowRepository.findOne({
      where: { id: instance.flowDefinitionId },
    })

    return { instance, records, flow }
  }

  // ─── Process Action ────────────────────────────────────────────────────

  /**
   * 处理审批动作（通过 / 驳回 / 转交）
   * - 通过：推进到下一节点；如为最后节点则终态 APPROVED
   * - 驳回：终态 REJECTED
   * - 转交：记录委托，不推进节点（实际转交逻辑需结合通知系统）
   */
  async processAction(
    instanceId: number,
    dto: ApproveActionDto,
    user: AuthUser,
  ): Promise<ApprovalInstance> {
    const instance = await this.instanceRepository.findOne({
      where: { id: instanceId },
    })
    if (!instance) throw new NotFoundException(`审批实例 ${instanceId} 不存在`)

    if (instance.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException(`当前审批状态为 ${instance.status}，无法操作`)
    }

    // 获取当前节点信息
    const flow = await this.flowRepository.findOne({
      where: { id: instance.flowDefinitionId },
    })
    if (!flow) throw new NotFoundException('关联的流程定义不存在')

    const sortedNodes = [...flow.nodes].sort((a, b) => a.order - b.order)
    const currentNodeIndex = sortedNodes.findIndex((n) => n.id === instance.currentNodeId)
    const currentNode = currentNodeIndex >= 0 ? sortedNodes[currentNodeIndex] : null

    if (!currentNode) {
      throw new BadRequestException('当前节点配置异常，无法操作')
    }

    // 计算耗时（以实例创建时间为基准，粗略估算分钟数）
    const durationMinutes = Math.round((Date.now() - instance.createdAt.getTime()) / 60000)

    // 创建操作记录
    const record = this.recordRepository.create({
      instanceId,
      nodeId: currentNode.id,
      nodeName: currentNode.name,
      approverId: user.id,
      action: dto.action,
      opinion: dto.opinion ?? null,
      attachments: dto.attachments && dto.attachments.length > 0 ? dto.attachments : null,
      durationMinutes,
    })
    await this.recordRepository.save(record)

    // 根据动作更新实例状态
    if (dto.action === ApprovalAction.REJECT) {
      instance.status = ApprovalStatus.REJECTED
      instance.resultRemark = dto.opinion ?? null
      instance.completedAt = new Date()
      instance.currentNodeId = null
    } else if (dto.action === ApprovalAction.APPROVE) {
      const nextNode = sortedNodes[currentNodeIndex + 1]
      if (nextNode) {
        // 还有下一节点
        instance.currentNodeId = nextNode.id
      } else {
        // 最后节点，审批通过
        instance.status = ApprovalStatus.APPROVED
        instance.resultRemark = dto.opinion ?? null
        instance.completedAt = new Date()
        instance.currentNodeId = null
      }
    }
    // DELEGATE：仅记录，不改变实例状态，等待转交实现

    return this.instanceRepository.save(instance)
  }

  // ─── Withdraw ──────────────────────────────────────────────────────────

  /**
   * 撤回审批申请
   * 只有申请人本人且状态为 PENDING 时才可撤回
   */
  async withdraw(instanceId: number, user: AuthUser): Promise<ApprovalInstance> {
    const instance = await this.instanceRepository.findOne({
      where: { id: instanceId },
    })
    if (!instance) throw new NotFoundException(`审批实例 ${instanceId} 不存在`)

    if (instance.applicantId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('只有申请人可以撤回审批')
    }

    if (instance.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException(`当前状态 ${instance.status} 不允许撤回`)
    }

    instance.status = ApprovalStatus.WITHDRAWN
    instance.completedAt = new Date()
    instance.currentNodeId = null

    return this.instanceRepository.save(instance)
  }

  // ─── My Pending ────────────────────────────────────────────────────────

  /**
   * 获取当前用户待审批的实例列表
   * 简单实现：查找 status=PENDING 且 applicantId=当前用户 的实例
   * （完整实现需结合节点审批人配置做精确匹配）
   */
  async getMyPending(_user: AuthUser): Promise<ApprovalInstance[]> {
    return this.instanceRepository.find({
      where: {
        status: ApprovalStatus.PENDING,
      },
      order: { createdAt: 'DESC' },
    })
  }
}
