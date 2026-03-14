import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundException } from '@nestjs/common'
import { AnnouncementService } from '../../src/modules/announcement/announcement.service'
import { Announcement, AnnouncementChannel } from '../../src/modules/announcement/entities/announcement.entity'
import { AnnouncementRead } from '../../src/modules/announcement/entities/announcement-read.entity'
import { NotificationService } from '../../src/modules/notification/notification.service'
import { AnnouncementPriority } from '@crm/shared'
import {
  createMockRepository,
  createMockQueryBuilder,
  MockRepository,
  MockQueryBuilder,
} from '../test-utils'

describe('AnnouncementService', () => {
  let service: AnnouncementService
  let announcementRepo: MockRepository<Announcement>
  let readRepo: MockRepository<AnnouncementRead>
  let notificationService: { announcementPublished: jest.Mock }

  beforeEach(async () => {
    announcementRepo = createMockRepository<Announcement>()
    readRepo = createMockRepository<AnnouncementRead>()
    notificationService = {
      announcementPublished: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnouncementService,
        { provide: getRepositoryToken(Announcement), useValue: announcementRepo },
        { provide: getRepositoryToken(AnnouncementRead), useValue: readRepo },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile()

    service = module.get(AnnouncementService)
  })

  const mockAnnouncement = {
    id: 1,
    title: 'Test Announcement',
    content: 'Test content',
    priority: AnnouncementPriority.NORMAL,
    isPinned: false,
    channels: [AnnouncementChannel.WEB],
    targetRoles: null,
    publishAt: null,
    endAt: null,
    createdBy: 1,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  }

  describe('create', () => {
    it('should create an announcement and broadcast via WebSocket', async () => {
      const dto = { title: 'New Announcement', content: 'Content', createdBy: 1 }
      announcementRepo.create.mockReturnValue({ ...mockAnnouncement, ...dto })
      announcementRepo.save.mockResolvedValue({ ...mockAnnouncement, ...dto })

      const result = await service.create(dto)

      expect(result.title).toBe('New Announcement')
      expect(announcementRepo.create).toHaveBeenCalledWith(dto)
      expect(announcementRepo.save).toHaveBeenCalled()
      expect(notificationService.announcementPublished).toHaveBeenCalledWith(1, 1, 'New Announcement')
    })

    it('should not broadcast when WEB channel is excluded', async () => {
      const dto = { title: 'Email Only', channels: [AnnouncementChannel.EMAIL], createdBy: 2 }
      const saved = { ...mockAnnouncement, ...dto, id: 2 }
      announcementRepo.create.mockReturnValue(saved)
      announcementRepo.save.mockResolvedValue(saved)

      await service.create(dto)

      expect(notificationService.announcementPublished).not.toHaveBeenCalled()
    })

    it('should default createdBy to 0 when not provided', async () => {
      const dto = { title: 'System Announcement' }
      const saved = { ...mockAnnouncement, ...dto, createdBy: null }
      announcementRepo.create.mockReturnValue(saved)
      announcementRepo.save.mockResolvedValue(saved)

      await service.create(dto)

      expect(notificationService.announcementPublished).toHaveBeenCalledWith(0, 1, 'System Announcement')
    })
  })

  describe('findOne', () => {
    it('should return announcement by id', async () => {
      announcementRepo.findOne.mockResolvedValue(mockAnnouncement)

      const result = await service.findOne(1)

      expect(result).toEqual(mockAnnouncement)
      expect(announcementRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } })
    })

    it('should throw NotFoundException when not found', async () => {
      announcementRepo.findOne.mockResolvedValue(null)

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException)
    })
  })

  describe('update', () => {
    it('should update announcement fields', async () => {
      announcementRepo.findOne.mockResolvedValue({ ...mockAnnouncement })
      announcementRepo.save.mockImplementation((e) => Promise.resolve(e))

      const result = await service.update(1, { title: 'Updated', isPinned: true })

      expect(result.title).toBe('Updated')
      expect(result.isPinned).toBe(true)
      expect(announcementRepo.save).toHaveBeenCalled()
    })
  })

  describe('remove', () => {
    it('should soft-remove announcement', async () => {
      announcementRepo.findOne.mockResolvedValue(mockAnnouncement)
      announcementRepo.softRemove.mockResolvedValue(undefined)

      await service.remove(1)

      expect(announcementRepo.softRemove).toHaveBeenCalledWith(mockAnnouncement)
    })

    it('should throw NotFoundException when removing non-existent', async () => {
      announcementRepo.findOne.mockResolvedValue(null)

      await expect(service.remove(999)).rejects.toThrow(NotFoundException)
    })
  })

  describe('findAll', () => {
    it('should return paginated announcements with filters', async () => {
      const list = [mockAnnouncement]
      const qb = createMockQueryBuilder(list, 1)
      announcementRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.findAll({
        priority: AnnouncementPriority.NORMAL,
        isPinned: false,
        page: 1,
        pageSize: 10,
      })

      expect(result).toEqual({ list, total: 1 })
      expect(qb.andWhere).toHaveBeenCalledTimes(2)
      expect(qb.skip).toHaveBeenCalledWith(0)
      expect(qb.take).toHaveBeenCalledWith(10)
      expect(qb.orderBy).toHaveBeenCalledWith('a.isPinned', 'DESC')
      expect(qb.addOrderBy).toHaveBeenCalledWith('a.publishAt', 'DESC')
    })

    it('should use default page/pageSize', async () => {
      const qb = createMockQueryBuilder([], 0)
      announcementRepo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({})

      expect(qb.skip).toHaveBeenCalledWith(0)
      expect(qb.take).toHaveBeenCalledWith(20)
      expect(qb.andWhere).not.toHaveBeenCalled()
    })
  })

  describe('markRead', () => {
    it('should create read record when not already read', async () => {
      readRepo.findOne.mockResolvedValue(null)
      readRepo.create.mockReturnValue({ announcementId: 1, userId: 1 })
      readRepo.save.mockResolvedValue({ id: 1, announcementId: 1, userId: 1 })

      await service.markRead(1, 1)

      expect(readRepo.create).toHaveBeenCalledWith({ announcementId: 1, userId: 1 })
      expect(readRepo.save).toHaveBeenCalled()
    })

    it('should skip when already read', async () => {
      readRepo.findOne.mockResolvedValue({ id: 1, announcementId: 1, userId: 1 })

      await service.markRead(1, 1)

      expect(readRepo.save).not.toHaveBeenCalled()
    })
  })

  describe('getUnreadCount', () => {
    it('should return count of unread announcements', async () => {
      const qb = createMockQueryBuilder([], 5)
      announcementRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getUnreadCount(1)

      expect(result).toBe(5)
      expect(qb.leftJoin).toHaveBeenCalled()
      expect(qb.andWhere).toHaveBeenCalledWith('r.id IS NULL')
      expect(qb.getCount).toHaveBeenCalled()
    })
  })
})
