import { CallSummaryProcessor } from '../../../src/modules/ai/processors/call-summary.processor'

describe('CallSummaryProcessor', () => {
  let processor: CallSummaryProcessor
  let callRecordRepository: {
    findOne: jest.Mock
    save: jest.Mock
  }
  let aiService: {
    chat: jest.Mock
  }
  let callAnalysisService: {
    analyzeCall: jest.Mock
  }

  beforeEach(() => {
    callRecordRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    }
    aiService = {
      chat: jest.fn(),
    }
    callAnalysisService = {
      analyzeCall: jest.fn().mockRejectedValue(new Error('analysis not available')),
    }

    processor = new CallSummaryProcessor(
      callRecordRepository as never,
      aiService as never,
      callAnalysisService as never,
      { sendToUser: jest.fn() } as never,
    )
  })

  it('should skip when call record does not exist', async () => {
    callRecordRepository.findOne.mockResolvedValue(null)

    await processor.handleSummary({ data: { callRecordId: 1 } } as never)

    expect(callRecordRepository.findOne).toHaveBeenCalledWith({
      where: { id: 1 },
    })
    expect(aiService.chat).not.toHaveBeenCalled()
    expect(callRecordRepository.save).not.toHaveBeenCalled()
  })

  it('should skip when call record has no notes', async () => {
    callRecordRepository.findOne.mockResolvedValue({
      id: 2,
      deleted: false,
      notes: '',
    })

    await processor.handleSummary({ data: { callRecordId: 2 } } as never)

    expect(aiService.chat).not.toHaveBeenCalled()
    expect(callRecordRepository.save).not.toHaveBeenCalled()
  })

  it('should generate summary and save call record', async () => {
    const record = {
      id: 3,
      deleted: false,
      notes: 'Customer asks for pricing details',
      aiSummary: null,
    }
    callRecordRepository.findOne.mockResolvedValue(record)
    aiService.chat.mockResolvedValue('summary result')

    await processor.handleSummary({ data: { callRecordId: 3 } } as never)

    expect(aiService.chat).toHaveBeenCalledWith(
      expect.any(String),
      'Customer asks for pricing details',
      { temperature: 0.3, maxTokens: 1024 },
    )
    expect(record.aiSummary).toBe('summary result')
    expect(callRecordRepository.save).toHaveBeenCalledWith(record)
  })

  it('should rethrow when AI generation fails', async () => {
    callRecordRepository.findOne.mockResolvedValue({
      id: 4,
      deleted: false,
      notes: 'Some notes',
    })
    aiService.chat.mockRejectedValue(new Error('ai failed'))

    await expect(
      processor.handleSummary({ data: { callRecordId: 4 } } as never),
    ).rejects.toThrow('ai failed')
  })
})
