import { OpportunityStage, UserRole } from '@crm/shared'
import { OpportunityController } from '../../src/modules/opportunity/opportunity.controller'

describe('OpportunityController', () => {
  let controller: OpportunityController
  let opportunityService: {
    findAll: jest.Mock
    create: jest.Mock
    exportCsv: jest.Mock
    getStats: jest.Mock
    findOne: jest.Mock
    update: jest.Mock
    updateStage: jest.Mock
    remove: jest.Mock
  }
  let notificationService: {
    opportunityCreated: jest.Mock
    opportunityStageChanged: jest.Mock
    opportunityDeleted: jest.Mock
  }

  beforeEach(() => {
    opportunityService = {
      findAll: jest.fn(),
      create: jest.fn(),
      exportCsv: jest.fn(),
      getStats: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      updateStage: jest.fn(),
      remove: jest.fn(),
    }
    notificationService = {
      opportunityCreated: jest.fn(),
      opportunityStageChanged: jest.fn(),
      opportunityDeleted: jest.fn(),
    }

    controller = new OpportunityController(
      opportunityService as never,
      notificationService as never,
    )
  })

  const user = { id: 7, username: 'manager01', role: UserRole.MANAGER }

  it('findAll should delegate to service', async () => {
    const query = { page: 1, pageSize: 20 }
    const pageData = { list: [{ id: 1 }], total: 1, page: 1, pageSize: 20 }
    opportunityService.findAll.mockResolvedValue(pageData)

    const result = await controller.findAll(query as never, user as never)

    expect(opportunityService.findAll).toHaveBeenCalledWith(query, user)
    expect(result).toBe(pageData)
  })

  it('create should notify after creation', async () => {
    const dto = { title: 'Q3 Deal' }
    const created = { id: 12, title: 'Q3 Deal' }
    opportunityService.create.mockResolvedValue(created)

    const result = await controller.create(dto as never, user as never)

    expect(opportunityService.create).toHaveBeenCalledWith(dto)
    expect(notificationService.opportunityCreated).toHaveBeenCalledWith(
      user.id,
      user.username,
      created.id,
      created.title,
    )
    expect(result).toBe(created)
  })

  it('exportCsv should set headers and send CSV', async () => {
    const res: { setHeader: jest.Mock; send: jest.Mock } = {
      setHeader: jest.fn(),
      send: jest.fn(),
    }
    opportunityService.exportCsv.mockResolvedValue('id,title\n12,Q3 Deal')

    await controller.exportCsv(res as never, user as never)

    expect(opportunityService.exportCsv).toHaveBeenCalledWith(user)
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8')
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename=opportunities.csv',
    )
    expect(res.send).toHaveBeenCalledWith('id,title\n12,Q3 Deal')
  })

  it('getStats should delegate to service', async () => {
    opportunityService.getStats.mockResolvedValue({ total: 2 })

    const result = await controller.getStats(user as never)

    expect(opportunityService.getStats).toHaveBeenCalledWith(user)
    expect(result).toEqual({ total: 2 })
  })

  it('findOne should delegate to service', async () => {
    opportunityService.findOne.mockResolvedValue({ id: 12 })

    const result = await controller.findOne(12, user as never)

    expect(opportunityService.findOne).toHaveBeenCalledWith(12, user)
    expect(result).toEqual({ id: 12 })
  })

  it('update should delegate to service', async () => {
    const dto = { title: 'Q3 Deal Updated' }
    opportunityService.update.mockResolvedValue({ id: 12, title: 'Q3 Deal Updated' })

    const result = await controller.update(12, dto as never, user as never)

    expect(opportunityService.update).toHaveBeenCalledWith(12, dto, user)
    expect(result).toEqual({ id: 12, title: 'Q3 Deal Updated' })
  })

  it('should emit stage change notification with previous and current stages', async () => {
    const dto = { stage: OpportunityStage.NEGOTIATION }
    const updatedOpportunity = { id: 12, title: 'Q2 Big Deal' }

    opportunityService.updateStage.mockResolvedValue({
      opportunity: updatedOpportunity,
      previousStage: OpportunityStage.PROPOSAL,
      currentStage: OpportunityStage.NEGOTIATION,
    })

    const result = await controller.updateStage(12, dto as never, user as never)

    expect(opportunityService.updateStage).toHaveBeenCalledWith(12, dto, user)
    expect(notificationService.opportunityStageChanged).toHaveBeenCalledWith(
      user.id,
      user.username,
      updatedOpportunity.id,
      updatedOpportunity.title,
      OpportunityStage.PROPOSAL,
      OpportunityStage.NEGOTIATION,
    )
    expect(result).toBe(updatedOpportunity)
  })

  it('remove should call service and notify delete', async () => {
    opportunityService.remove.mockResolvedValue(undefined)

    const result = await controller.remove(12, user as never)

    expect(opportunityService.remove).toHaveBeenCalledWith(12)
    expect(notificationService.opportunityDeleted).toHaveBeenCalledWith(
      user.id,
      user.username,
      12,
    )
    expect(result).toBeNull()
  })
})
