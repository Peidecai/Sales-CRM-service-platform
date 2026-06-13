import { BadRequestException } from '@nestjs/common'
import { AnalysisInputSource, AnalysisStatus, AnalysisType } from '@crm/shared'
import { CallAnalysisService } from '../../src/modules/ai/call-analysis.service'
import { CallAnalysisResult } from '../../src/modules/ai/entities/call-analysis-result.entity'
import { CallRecord } from '../../src/modules/call-record/call-record.entity'
import { Customer } from '../../src/modules/customer/customer.entity'
import { CallTranscript } from '../../src/modules/recording/entities/call-transcript.entity'
import { RecordingFile } from '../../src/modules/recording/entities/recording-file.entity'
import { CloudTranscriptionCallback } from '../../src/modules/recording/entities/cloud-transcription-callback.entity'
import {
  createMockQueryBuilder,
  createMockRepository,
  fixtures,
  MockRepository,
} from '../test-utils'
import type { AuthUser } from '../../src/common/decorators/current-user.decorator'

describe('CallAnalysisService', () => {
  let service: CallAnalysisService
  let analysisRepo: MockRepository<CallAnalysisResult>
  let callRecordRepo: MockRepository<CallRecord>
  let transcriptRepo: MockRepository<CallTranscript>
  let cloudTranscriptionCallbackRepo: MockRepository<CloudTranscriptionCallback>
  let customerRepo: MockRepository<Customer>
  let recordingFileRepo: MockRepository<RecordingFile>
  let aiService: { chat: jest.Mock }
  let configService: {
    getConfig: jest.Mock
    resolveCallAnalysisPrompt: jest.Mock
    resolveVoiceMemoPrompt: jest.Mock
    resolveSpeechScoringPrompt: jest.Mock
  }
  let customerService: { update: jest.Mock }
  let opportunityService: { create: jest.Mock }
  let knowledgeService: { ask: jest.Mock }
  let adminUser: AuthUser

  beforeEach(() => {
    analysisRepo = createMockRepository<CallAnalysisResult>()
    callRecordRepo = createMockRepository<CallRecord>()
    transcriptRepo = createMockRepository<CallTranscript>()
    cloudTranscriptionCallbackRepo = createMockRepository<CloudTranscriptionCallback>()
    customerRepo = createMockRepository<Customer>()
    recordingFileRepo = createMockRepository<RecordingFile>()

    analysisRepo.create.mockImplementation((payload) => ({ id: 10, ...payload }))
    analysisRepo.save.mockImplementation(async (entity) => entity)
    callRecordRepo.save.mockImplementation(async (entity) => entity)

    aiService = {
      chat: jest.fn().mockResolvedValue(
        JSON.stringify({
          summary: '已完成分析',
          customerClassify: '有意向',
          confidence: 0.8,
          speechScore: 82,
        }),
      ),
    }

    configService = {
      getConfig: jest.fn().mockResolvedValue({
        callAnalysisEnabled: true,
        speechScoringEnabled: false,
        knowledgeCompareEnabled: false,
        customerClassifyEnabled: false,
        autoCreateOpportunity: false,
        classifyRules: [],
      }),
      resolveCallAnalysisPrompt: jest.fn().mockReturnValue('分析以下内容：{transcriptText}'),
      resolveVoiceMemoPrompt: jest.fn().mockReturnValue('分析以下速记：{transcriptText}'),
      resolveSpeechScoringPrompt: jest.fn().mockReturnValue('评分：{transcriptText}'),
    }

    customerService = { update: jest.fn() }
    opportunityService = { create: jest.fn() }
    knowledgeService = { ask: jest.fn() }
    adminUser = fixtures.admin() as AuthUser

    service = new CallAnalysisService(
      analysisRepo as never,
      callRecordRepo as never,
      transcriptRepo as never,
      cloudTranscriptionCallbackRepo as never,
      customerRepo as never,
      recordingFileRepo as never,
      aiService as never,
      configService as never,
      customerService as never,
      opportunityService as never,
      knowledgeService as never,
    )
  })

  it('falls back to matched cloud transcription callback text when ASR segments are missing', async () => {
    callRecordRepo.findOne.mockResolvedValue(fixtures.callRecord({ id: 352, notes: null }))
    recordingFileRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([], 0))
    transcriptRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([], 0))
    cloudTranscriptionCallbackRepo.createQueryBuilder.mockReturnValue(
      createMockQueryBuilder([
        {
          taskId: 'task-352',
          transcriptText: '客户询问贷款方案，销售说明了还款周期。',
        },
      ]),
    )

    const result = await service.analyzeCall(352, adminUser)

    expect(result.status).toBe(AnalysisStatus.COMPLETED)
    expect(result.inputSource).toBe(AnalysisInputSource.ASR)
    expect(aiService.chat).toHaveBeenCalledWith(
      expect.stringContaining('客户询问贷款方案'),
      expect.any(String),
      expect.any(Object),
    )
    expect(analysisRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        callRecordId: 352,
        analysisType: AnalysisType.FULL,
        inputSource: AnalysisInputSource.ASR,
      }),
    )
  })

  it('still rejects records without transcript text or notes', async () => {
    callRecordRepo.findOne.mockResolvedValue(fixtures.callRecord({ id: 353, notes: null }))
    recordingFileRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([], 0))
    transcriptRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([], 0))
    cloudTranscriptionCallbackRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([], 0))

    await expect(service.analyzeCall(353, adminUser)).rejects.toBeInstanceOf(BadRequestException)
    expect(aiService.chat).not.toHaveBeenCalled()
  })
})
