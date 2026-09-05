import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { isAxiosError } from 'axios';
import { BlockType } from '@prisma/client';

export interface AiProductContext {
  code: string;
  name: string;
  attributes: Record<string, unknown>;
}

export interface AiScriptBlockSuggestion {
  title: string;
  content: string;
  suggestedDurationSec: number;
}

interface AiGenerateResponse {
  title: string;
  content: string;
  suggested_duration_sec: number;
}

@Injectable()
export class AiService {
  constructor(private readonly config: ConfigService) {}

  async generateScriptBlock(
    type: BlockType,
    product: AiProductContext,
    existingTitle?: string,
  ): Promise<AiScriptBlockSuggestion> {
    const baseUrl = this.config.get<string>('AI_SERVICE_URL')?.trim();
    const apiKey = this.config.get<string>('AI_SERVICE_API_KEY')?.trim();

    if (!baseUrl || !apiKey) {
      throw new BadGatewayException('Dịch vụ AI chưa được cấu hình');
    }

    const url = `${baseUrl.replace(/\/$/, '')}/v1/generate-script-block`;

    try {
      const { data } = await axios.post<AiGenerateResponse>(
        url,
        {
          type,
          product: {
            code: product.code,
            name: product.name,
            attributes: product.attributes,
          },
          existing_title: existingTitle?.trim() || null,
          locale: 'vi',
        },
        {
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 60_000,
        },
      );

      return {
        title: data.title,
        content: data.content,
        suggestedDurationSec: data.suggested_duration_sec,
      };
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 400) {
        throw new BadGatewayException('Dịch vụ AI từ chối yêu cầu');
      }
      throw new BadGatewayException('Dịch vụ AI tạm thời không phản hồi');
    }
  }
}
