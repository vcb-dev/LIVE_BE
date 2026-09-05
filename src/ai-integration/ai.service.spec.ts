/// <reference types="jest" />

import { BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { BlockType } from '@prisma/client';
import { AiService } from './ai.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AiService', () => {
  let service: AiService;

  const config = {
    get: jest.fn((key: string) => {
      if (key === 'AI_SERVICE_URL') return 'http://localhost:8000';
      if (key === 'AI_SERVICE_API_KEY') return 'test-key';
      return undefined;
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AiService(config as unknown as ConfigService);
  });

  it('maps AI response to camelCase suggestion', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        title: 'Ý nghĩa nhẫn',
        content: 'Món trang sức này...',
        suggested_duration_sec: 55,
      },
    });

    const result = await service.generateScriptBlock(BlockType.MEANING, {
      code: 'SP001',
      name: 'Nhẫn vàng',
      attributes: { material: 'Vàng 18K' },
    });

    expect(result).toEqual({
      title: 'Ý nghĩa nhẫn',
      content: 'Món trang sức này...',
      suggestedDurationSec: 55,
    });
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://localhost:8000/v1/generate-script-block',
      expect.objectContaining({
        type: BlockType.MEANING,
        product: {
          code: 'SP001',
          name: 'Nhẫn vàng',
          attributes: { material: 'Vàng 18K' },
        },
      }),
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-API-Key': 'test-key' }),
      }),
    );
  });

  it('throws when AI service is not configured', async () => {
    const unconfigured = new AiService({
      get: jest.fn(() => undefined),
    } as unknown as ConfigService);

    await expect(
      unconfigured.generateScriptBlock(BlockType.MEANING, {
        code: 'SP001',
        name: 'Nhẫn vàng',
        attributes: {},
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });
});
