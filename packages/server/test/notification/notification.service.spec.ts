import { NotificationService } from '../../src/modules/notification/notification.service'
import { NotificationInboxService } from '../../src/modules/notification/notification-inbox.service'
import { NotificationType } from '../../src/modules/notification/notification.types'

describe('NotificationService', () => {
  let service: NotificationService
  let gateway: {
    broadcast: jest.Mock
    sendToUser: jest.Mock
    emitToUser: jest.Mock
  }
  let inboxService: {
    create: jest.Mock
  }

  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-06T00:00:00.000Z'))

    gateway = {
      broadcast: jest.fn(),
      sendToUser: jest.fn(),
      emitToUser: jest.fn(),
    }
    inboxService = {
      create: jest.fn().mockResolvedValue({ id: 1 }),
    }
    service = new NotificationService(gateway as never, inboxService as never)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('notify should broadcast payload with timestamp', () => {
    service.notify({
      type: NotificationType.CUSTOMER_CREATED,
      actorId: 1,
      actorName: 'alice',
      resource: 'customer',
      resourceId: 11,
      message: 'created',
      data: { name: 'Acme' },
    })

    expect(gateway.broadcast).toHaveBeenCalledWith({
      type: NotificationType.CUSTOMER_CREATED,
      actorId: 1,
      actorName: 'alice',
      resource: 'customer',
      resourceId: 11,
      message: 'created',
      data: { name: 'Acme' },
      timestamp: '2026-03-06T00:00:00.000Z',
    })
  })

  it('notifyUser should send payload to target user with timestamp', () => {
    service.notifyUser(9, {
      type: NotificationType.CALL_RECORD_CREATED,
      actorId: 2,
      actorName: 'bob',
      resource: 'call_record',
      resourceId: 21,
      message: 'created',
    })

    expect(gateway.sendToUser).toHaveBeenCalledWith(9, {
      type: NotificationType.CALL_RECORD_CREATED,
      actorId: 2,
      actorName: 'bob',
      resource: 'call_record',
      resourceId: 21,
      message: 'created',
      timestamp: '2026-03-06T00:00:00.000Z',
    })
  })

  it('customerCreated should emit CUSTOMER_CREATED', () => {
    service.customerCreated(1, 'alice', 101, 'Acme')
    expect(gateway.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.CUSTOMER_CREATED,
        actorId: 1,
        actorName: 'alice',
        resource: 'customer',
        resourceId: 101,
        data: { customerName: 'Acme' },
      }),
    )
  })

  it('customerUpdated should emit CUSTOMER_UPDATED', () => {
    service.customerUpdated(2, 'bob', 102, 'Beta')
    expect(gateway.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.CUSTOMER_UPDATED,
        resource: 'customer',
        resourceId: 102,
        data: { customerName: 'Beta' },
      }),
    )
  })

  it('customerDeleted should emit CUSTOMER_DELETED', () => {
    service.customerDeleted(3, 'carol', 103)
    expect(gateway.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.CUSTOMER_DELETED,
        resource: 'customer',
        resourceId: 103,
      }),
    )
  })

  it('opportunityCreated should emit OPPORTUNITY_CREATED', () => {
    service.opportunityCreated(4, 'dave', 201, 'Q4 Deal')
    expect(gateway.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.OPPORTUNITY_CREATED,
        resource: 'opportunity',
        resourceId: 201,
        data: { title: 'Q4 Deal' },
      }),
    )
  })

  it('opportunityStageChanged should emit OPPORTUNITY_STAGE_CHANGED', () => {
    service.opportunityStageChanged(5, 'erin', 202, 'Deal', 'lead', 'proposal')
    expect(gateway.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.OPPORTUNITY_STAGE_CHANGED,
        resource: 'opportunity',
        resourceId: 202,
        data: { title: 'Deal', fromStage: 'lead', toStage: 'proposal' },
      }),
    )
  })

  it('opportunityDeleted should emit OPPORTUNITY_DELETED', () => {
    service.opportunityDeleted(6, 'frank', 203)
    expect(gateway.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.OPPORTUNITY_DELETED,
        resource: 'opportunity',
        resourceId: 203,
      }),
    )
  })

  it('callRecordCreated should emit CALL_RECORD_CREATED', () => {
    service.callRecordCreated(7, 'grace', 301)
    expect(gateway.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.CALL_RECORD_CREATED,
        resource: 'call_record',
        resourceId: 301,
      }),
    )
  })

  it('callRecordDeleted should emit CALL_RECORD_DELETED', () => {
    service.callRecordDeleted(8, 'henry', 302)
    expect(gateway.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.CALL_RECORD_DELETED,
        resource: 'call_record',
        resourceId: 302,
      }),
    )
  })

  it('callSummaryCompleted should emit CALL_SUMMARY_COMPLETED', () => {
    service.callSummaryCompleted(303)
    expect(gateway.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.CALL_SUMMARY_COMPLETED,
        actorId: 0,
        resource: 'call_record',
        resourceId: 303,
      }),
    )
  })

  it('articleCreated should emit ARTICLE_CREATED', () => {
    service.articleCreated(9, 'ivy', 401, 'How to sell')
    expect(gateway.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.ARTICLE_CREATED,
        resource: 'article',
        resourceId: 401,
        data: { title: 'How to sell' },
      }),
    )
  })

  it('articleEmbeddingCompleted should emit ARTICLE_EMBEDDING_COMPLETED', () => {
    service.articleEmbeddingCompleted(402, 'Playbook')
    expect(gateway.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.ARTICLE_EMBEDDING_COMPLETED,
        actorId: 0,
        resource: 'article',
        resourceId: 402,
        data: { title: 'Playbook' },
      }),
    )
  })
})
