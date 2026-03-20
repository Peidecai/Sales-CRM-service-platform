import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { getQueueToken } from '@nestjs/bull'
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common'
import { RecordingService } from '../../src/modules/recording/recording.service'
import { RecordingFile } from '../../src/modules/recording/entities/recording-file.entity'
import { AsrTask } from '../../src/modules/recording/entities/asr-task.entity'
import { CallTranscript } from '../../src/modules/recording/entities/call-transcript.entity'
import { CallRecord } from '../../src/modules/call-record/call-record.entity'
import { OssRecordingService } from '../../src/modules/recording/oss-recording.service'
import { RecordingSourceType, UserRole, CallDirection, CallStatus } from '@crm/shared'

describe('RecordingService — Manual Upload', () => {
  let service: RecordingService
  let recordingRepo: Record<string, jest.Mock>
  let callRecordRepo: Record<string, jest.Mock>
  let asrTaskRepo: Record<string, jest.Mock>
  let asrQueue: Record<string, jest.Mock>
  let ossService: Record<string, jest.Mock>

  const mockAdmin = { id: 1, role: UserRole.ADMIN, name: 'Admin' } as any
  const mockSales = { id: 2, role: UserRole.SALES, name: 'Sales' } as any

  const mockFile = {
    buffer: Buffer.from('audio data'),
    originalname: 'test.mp3',
    mimetype: 'audio/mpeg',
    size: 1024 * 1024, // 1MB
  }

  beforeEach(async () => {
    recordingRepo = {
      create: jest.fn((d) => ({ id: 1, ...d })),
      save: jest.fn((e) => Promise.resolve({ id: 1, ...e })),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        innerJoin: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      })),
    }
    callRecordRepo = {
      create: jest.fn((d) => ({ id: 10, ...d })),
      save: jest.fn((e) => Promise.resolve({ id: 10, ...e })),
      findOne: jest.fn(),
    }
    asrTaskRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((d) => ({ id: 100, ...d })),
      save: jest.fn((e) => Promise.resolve({ id: 100, ...e })),
    }
    asrQueue = { add: jest.fn().mockResolvedValue({}) }
    ossService = {
      uploadBuffer: jest.fn().mockResolvedValue(undefined),
      getBucket: jest.fn().mockReturnValue('test-bucket'),
      getSignedUrl: jest.fn().mockReturnValue('https://oss.example.com/test'),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecordingService,
        { provide: getRepositoryToken(RecordingFile), useValue: recordingRepo },
        { provide: getRepositoryToken(AsrTask), useValue: asrTaskRepo },
        { provide: getRepositoryToken(CallTranscript), useValue: { find: jest.fn().mockResolvedValue([]) } },
        { provide: getRepositoryToken(CallRecord), useValue: callRecordRepo },
        { provide: 'ASR_PROVIDER', useValue: { submitTask: jest.fn(), pollOrWebhookResult: jest.fn() } },
        { provide: getQueueToken('asr'), useValue: asrQueue },
        { provide: OssRecordingService, useValue: ossService },
      ],
    }).compile()

    service = module.get<RecordingService>(RecordingService)
  })

  describe('uploadManualRecording', () => {
    it('should upload a valid mp3 file and create CallRecord + RecordingFile', async () => {
      const dto = { customerId: 1, notes: 'test call' }
      const result = await service.uploadManualRecording(mockFile, dto, mockAdmin)

      expect(callRecordRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 1,
          userId: mockAdmin.id,
          isManualUpload: true,
          direction: CallDirection.OUTBOUND,
          status: CallStatus.ENDED,
        }),
      )
      expect(callRecordRepo.save).toHaveBeenCalled()
      expect(ossService.uploadBuffer).toHaveBeenCalled()
      expect(recordingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceType: RecordingSourceType.MANUAL_UPLOAD,
          notes: 'test call',
        }),
      )
      expect(recordingRepo.save).toHaveBeenCalled()
      expect(result.callRecord).toBeDefined()
      expect(result.recordingFile).toBeDefined()
    })

    it('should reject unsupported audio format', async () => {
      const badFile = { ...mockFile, mimetype: 'video/mp4' }
      await expect(service.uploadManualRecording(badFile, {}, mockAdmin)).rejects.toThrow(
        BadRequestException,
      )
    })

    it('should reject file larger than 100MB', async () => {
      const bigFile = { ...mockFile, size: 101 * 1024 * 1024 }
      await expect(service.uploadManualRecording(bigFile, {}, mockAdmin)).rejects.toThrow(
        BadRequestException,
      )
    })

    it('should accept wav format', async () => {
      const wavFile = { ...mockFile, mimetype: 'audio/wav', originalname: 'test.wav' }
      const result = await service.uploadManualRecording(wavFile, {}, mockAdmin)
      expect(result.recordingFile).toBeDefined()
    })

    it('should accept amr format', async () => {
      const amrFile = { ...mockFile, mimetype: 'audio/amr', originalname: 'test.amr' }
      const result = await service.uploadManualRecording(amrFile, {}, mockAdmin)
      expect(result.recordingFile).toBeDefined()
    })

    it('should set counterpartPhone and actualCallTime from dto', async () => {
      const dto = { counterpartPhone: '13800138000', actualCallTime: '2026-01-15T10:00:00Z' }
      await service.uploadManualRecording(mockFile, dto, mockAdmin)

      expect(recordingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          counterpartPhone: '13800138000',
          actualCallTime: new Date('2026-01-15T10:00:00Z'),
        }),
      )
    })

    it('should set uploadedById to current user id', async () => {
      await service.uploadManualRecording(mockFile, {}, mockSales)
      expect(recordingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ uploadedById: mockSales.id }),
      )
    })

    it('should associate with opportunity when provided', async () => {
      const dto = { opportunityId: 5 }
      await service.uploadManualRecording(mockFile, dto, mockAdmin)
      expect(callRecordRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ opportunityId: 5 }),
      )
    })

    it('should handle ASR trigger failure gracefully', async () => {
      // Make triggerAsr fail after file creation
      recordingRepo.findOne = jest.fn().mockRejectedValue(new Error('ASR failed'))
      const result = await service.uploadManualRecording(mockFile, {}, mockAdmin)
      expect(result.asrTriggered).toBe(false)
    })
  })

  describe('batchUploadManual', () => {
    it('should upload multiple files and return results', async () => {
      const files = [mockFile, { ...mockFile, originalname: 'test2.mp3' }]
      const dtos = [{}, { customerId: 2 }]
      const results = await service.batchUploadManual(files, dtos, mockAdmin)

      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(true)
    })

    it('should handle individual failures in batch', async () => {
      const files = [
        mockFile,
        { ...mockFile, mimetype: 'video/avi' }, // bad format
      ]
      const results = await service.batchUploadManual(files, [{}, {}], mockAdmin)

      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
      expect(results[1].error).toContain('不支持')
    })

    it('should use empty dto when dtos array is shorter than files', async () => {
      const files = [mockFile, mockFile]
      const dtos = [{ customerId: 1 }] // only 1 dto for 2 files
      const results = await service.batchUploadManual(files, dtos, mockAdmin)

      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(true)
    })
  })

  describe('findRecordings with source filter', () => {
    it('should add source filter when provided', async () => {
      const qb = recordingRepo.createQueryBuilder()
      await service.findRecordings(undefined, 1, 20, mockAdmin, RecordingSourceType.MANUAL_UPLOAD)
      // Verify andWhere was called (source filter)
      expect(qb.andWhere).toHaveBeenCalled()
    })
  })
})
