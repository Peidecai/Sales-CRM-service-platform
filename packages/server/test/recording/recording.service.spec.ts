import { NotFoundException, ForbiddenException } from '@nestjs/common'
import { UserRole } from '@crm/shared'
import { RecordingService } from '../../src/modules/recording/recording.service'
import { AsrTaskStatus } from '../../src/modules/recording/entities/asr-task.entity'
import { TranscriptSpeaker } from '../../src/modules/recording/entities/call-transcript.entity'
import {
  createMockRepository,
  createMockQueryBuilder,
  type MockRepository,
} from '../test-utils'

describe('RecordingService', () => {
  let service: RecordingService
  let recordingFileRepo: MockRepository
  let asrTaskRepo: MockRepository
  let transcriptRepo: MockRepository
  let callRecordRepo: MockRepository
  let asrAdapter: { submitTask: jest.Mock; pollOrWebhookResult: jest.Mock }
  let asrQueue: { add: jest.Mock }
  let ossRecording: { getSignedUrl: jest.Mock }

  const adminUser = { id: 1, role: UserRole.ADMIN, username: 'admin' }
  const salesUser = { id: 2, role: UserRole.SALES, username: 'sales' }

  beforeEach(() => {
    recordingFileRepo = createMockRepository()
    asrTaskRepo = createMockRepository()
    transcriptRepo = createMockRepository()
    callRecordRepo = createMockRepository()

    asrAdapter = {
      submitTask: jest.fn(),
      pollOrWebhookResult: jest.fn(),
    }
    asrQueue = { add: jest.fn().mockResolvedValue({}) }
    ossRecording = {
      getSignedUrl: jest.fn().mockReturnValue('https://example.com/signed-url'),
    }

    service = new RecordingService(
      recordingFileRepo as never,
      asrTaskRepo as never,
      transcriptRepo as never,
      callRecordRepo as never,
      asrAdapter as never,
      asrQueue as never,
      ossRecording as never,
    )
  })

  /* ── findRecordings ─────────────────────────────────────── */

  describe('findRecordings', () => {
    it('should return paginated recording list for admin', async () => {
      const files = [{ id: 1, callRecordId: 10, ossKey: 'key.wav' }]
      const qb = createMockQueryBuilder(files, 1)
      recordingFileRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.findRecordings(undefined, 1, 20, adminUser as never)

      expect(result).toEqual({ list: files, total: 1 })
      expect(qb.skip).toHaveBeenCalledWith(0)
      expect(qb.take).toHaveBeenCalledWith(20)
    })

    it('should restrict SALES user to own records', async () => {
      const qb = createMockQueryBuilder([], 0)
      recordingFileRepo.createQueryBuilder.mockReturnValue(qb)

      await service.findRecordings(undefined, 1, 10, salesUser as never)

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(cr.userId = :uid OR cr.agentId = :uid)',
        { uid: salesUser.id },
      )
    })
  })

  /* ── getRecording ───────────────────────────────────────── */

  describe('getRecording', () => {
    it('should return recording file for admin', async () => {
      const file = { id: 1, callRecordId: 10, callRecord: null }
      recordingFileRepo.findOne.mockResolvedValue(file)

      const result = await service.getRecording(1, adminUser as never)
      expect(result).toBe(file)
    })

    it('should throw NotFoundException when not found', async () => {
      recordingFileRepo.findOne.mockResolvedValue(null)
      await expect(service.getRecording(999, adminUser as never)).rejects.toThrow(NotFoundException)
    })

    it('should throw ForbiddenException when SALES user accesses others recording', async () => {
      const file = {
        id: 1,
        callRecordId: 10,
        callRecord: { userId: 99, agentId: 88 }, // not salesUser.id
      }
      recordingFileRepo.findOne.mockResolvedValue(file)
      await expect(service.getRecording(1, salesUser as never)).rejects.toThrow(ForbiddenException)
    })
  })

  /* ── triggerAsr ─────────────────────────────────────────── */

  describe('triggerAsr', () => {
    const makeFile = (overrides: Record<string, unknown> = {}) => ({
      id: 1,
      callRecordId: 10,
      ossKey: 'recordings/test.wav',
      durationSeconds: 60,
      callRecord: null,
      ...overrides,
    })

    it('should skip ASR for recordings shorter than 8 seconds', async () => {
      recordingFileRepo.findOne.mockResolvedValue(makeFile({ durationSeconds: 5 }))

      const result = await service.triggerAsr(1, adminUser as never)

      expect(result).toEqual({ taskId: 0, status: 'skipped' })
      expect(asrQueue.add).not.toHaveBeenCalled()
    })

    it('should return existing task if one already exists', async () => {
      recordingFileRepo.findOne.mockResolvedValue(makeFile())
      asrTaskRepo.findOne.mockResolvedValue({ id: 42, status: AsrTaskStatus.PROCESSING })

      const result = await service.triggerAsr(1, adminUser as never)

      expect(result).toEqual({ taskId: 42, status: AsrTaskStatus.PROCESSING })
      expect(asrQueue.add).not.toHaveBeenCalled()
    })

    it('should create task and enqueue ASR job', async () => {
      // getRecording (via findOne on recordingFileRepo)
      recordingFileRepo.findOne.mockResolvedValue(makeFile())
      // No existing ASR task
      asrTaskRepo.findOne.mockResolvedValue(null)
      const newTask = { id: 100, recordingFileId: 1, status: AsrTaskStatus.PENDING }
      asrTaskRepo.create.mockReturnValue(newTask)
      asrTaskRepo.save.mockResolvedValue(newTask)

      const result = await service.triggerAsr(1, adminUser as never)

      expect(result).toEqual({ taskId: 100, status: AsrTaskStatus.PENDING })
      expect(asrQueue.add).toHaveBeenCalledWith(
        { recordingFileId: 1, recordingUrl: 'https://example.com/signed-url' },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      )
    })

    it('should use callRecord duration when file has no durationSeconds', async () => {
      recordingFileRepo.findOne.mockResolvedValue(makeFile({ durationSeconds: null }))
      callRecordRepo.findOne.mockResolvedValue({ id: 10, duration: 3 }) // <8s → skip

      const result = await service.triggerAsr(1, adminUser as never)
      expect(result).toEqual({ taskId: 0, status: 'skipped' })
    })
  })

  /* ── runAsrForTask ──────────────────────────────────────── */

  describe('runAsrForTask', () => {
    it('should process ASR and save transcripts', async () => {
      const task = {
        id: 50,
        recordingFileId: 1,
        status: AsrTaskStatus.PENDING,
        startedAt: null as Date | null,
        completedAt: null as Date | null,
        externalTaskId: null as string | null,
      }
      asrTaskRepo.findOne.mockResolvedValue(task)
      asrTaskRepo.save.mockResolvedValue(task)

      asrAdapter.submitTask.mockResolvedValue({ externalTaskId: 'ext-123' })
      asrAdapter.pollOrWebhookResult.mockResolvedValue([
        { segmentIndex: 0, startTimeMs: 0, endTimeMs: 5000, speaker: 'agent', text: 'Hello' },
        { segmentIndex: 1, startTimeMs: 5000, endTimeMs: 10000, speaker: 'customer', text: 'Hi' },
      ])
      transcriptRepo.create.mockImplementation((data: Record<string, unknown>) => data)
      transcriptRepo.save.mockResolvedValue({})

      await service.runAsrForTask(1, 'https://oss/test.wav')

      expect(task.status).toBe(AsrTaskStatus.COMPLETED)
      expect(task.externalTaskId).toBe('ext-123')
      expect(task.completedAt).toBeInstanceOf(Date)
      expect(transcriptRepo.save).toHaveBeenCalledTimes(2)
      expect(transcriptRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ speaker: TranscriptSpeaker.AGENT, text: 'Hello' }),
      )
      expect(transcriptRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ speaker: TranscriptSpeaker.CUSTOMER, text: 'Hi' }),
      )
    })

    it('should skip when no pending task found', async () => {
      asrTaskRepo.findOne.mockResolvedValue(null)
      await service.runAsrForTask(1, 'https://oss/test.wav')
      expect(asrAdapter.submitTask).not.toHaveBeenCalled()
    })

    it('should mark task as FAILED and rethrow on adapter error', async () => {
      const task = {
        id: 50,
        recordingFileId: 1,
        status: AsrTaskStatus.PENDING,
        startedAt: null as Date | null,
        completedAt: null as Date | null,
        externalTaskId: null as string | null,
        errorMessage: null as string | null,
      }
      asrTaskRepo.findOne.mockResolvedValue(task)
      asrTaskRepo.save.mockResolvedValue(task)
      asrAdapter.submitTask.mockRejectedValue(new Error('ASR provider timeout'))

      await expect(service.runAsrForTask(1, 'url')).rejects.toThrow('ASR provider timeout')

      expect(task.status).toBe(AsrTaskStatus.FAILED)
      expect(task.errorMessage).toBe('ASR provider timeout')
      expect(task.completedAt).toBeInstanceOf(Date)
    })
  })

  /* ── getTranscripts ─────────────────────────────────────── */

  describe('getTranscripts', () => {
    it('should return empty array when no completed ASR tasks', async () => {
      recordingFileRepo.findOne.mockResolvedValue({ id: 1, callRecord: null })
      asrTaskRepo.find.mockResolvedValue([])

      const result = await service.getTranscripts(1, adminUser as never)
      expect(result).toEqual([])
    })
  })
})
