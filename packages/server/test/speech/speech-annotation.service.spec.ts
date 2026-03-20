import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { SpeechAnnotationService } from '../../src/modules/speech/speech-annotation.service'
import { SpeechAnnotation } from '../../src/modules/speech/entities/speech-annotation.entity'
import { SpeechTemplateService } from '../../src/modules/speech/speech-template.service'
import { createMockRepository, type MockRepository } from '../test-utils'

describe('SpeechAnnotationService', () => {
  let service: SpeechAnnotationService
  let annotationRepo: MockRepository
  let templateService: { incrementUsageCount: jest.Mock }

  beforeEach(async () => {
    annotationRepo = createMockRepository()
    templateService = { incrementUsageCount: jest.fn().mockResolvedValue(undefined) }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpeechAnnotationService,
        { provide: getRepositoryToken(SpeechAnnotation), useValue: annotationRepo },
        { provide: SpeechTemplateService, useValue: templateService },
      ],
    }).compile()

    service = module.get(SpeechAnnotationService)
  })

  describe('findByCallRecord', () => {
    it('should return annotations for call record', async () => {
      const annotations = [{ id: 1, callRecordId: 10, startTime: 0, endTime: 30 }]
      annotationRepo.find.mockResolvedValue(annotations)

      const result = await service.findByCallRecord(10)
      expect(result).toEqual(annotations)
      expect(annotationRepo.find).toHaveBeenCalledWith({
        where: { callRecordId: 10 },
        relations: ['template'],
        order: { startTime: 'ASC' },
      })
    })
  })

  describe('create', () => {
    it('should create annotation without templateId', async () => {
      const dto = { callRecordId: 1, startTime: 0, endTime: 30, text: 'Hi' }
      annotationRepo.create.mockReturnValue({ ...dto, id: 1, annotatedBy: 5 })
      annotationRepo.save.mockImplementation(async (e) => e)

      const result = await service.create(dto, 5)
      expect(result.annotatedBy).toBe(5)
      expect(templateService.incrementUsageCount).not.toHaveBeenCalled()
    })

    it('should create annotation with templateId and increment usage', async () => {
      const dto = { callRecordId: 1, templateId: 3, startTime: 0, endTime: 30, text: 'Hi' }
      annotationRepo.create.mockReturnValue({ ...dto, id: 1, annotatedBy: 5 })
      annotationRepo.save.mockImplementation(async (e) => e)

      await service.create(dto, 5)
      expect(templateService.incrementUsageCount).toHaveBeenCalledWith(3)
    })
  })

  describe('update', () => {
    it('should update annotation', async () => {
      const existing = { id: 1, text: 'Old', comment: null }
      annotationRepo.findOne.mockResolvedValue(existing)
      annotationRepo.save.mockImplementation(async (e) => e)

      const result = await service.update(1, { text: 'New' })
      expect(result.text).toBe('New')
    })

    it('should throw if not found', async () => {
      annotationRepo.findOne.mockResolvedValue(null)
      await expect(service.update(999, { text: 'X' })).rejects.toThrow('标注不存在')
    })
  })

  describe('remove', () => {
    it('should soft remove annotation', async () => {
      const existing = { id: 1 }
      annotationRepo.findOne.mockResolvedValue(existing)
      annotationRepo.softRemove.mockImplementation(async (e) => e)

      await service.remove(1)
      expect(annotationRepo.softRemove).toHaveBeenCalledWith(existing)
    })

    it('should throw if not found', async () => {
      annotationRepo.findOne.mockResolvedValue(null)
      await expect(service.remove(999)).rejects.toThrow('标注不存在')
    })
  })
})
