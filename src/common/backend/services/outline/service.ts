import md5 from '@web-clipper/shared/lib/md5';
import { DocumentService, CreateDocumentRequest } from '../../index';
import { CompleteStatus, Repository, UnauthorizedError } from '../interface';
import {
  OutlineBackendServiceConfig,
  OutlineAuthInfoResponse,
  OutlineCollectionResponse,
  OutlineDocumentResponse,
} from './interface';
import { IWebRequestService } from '@/service/common/webRequest';
import Container from 'typedi';

export default class OutlineDocumentService implements DocumentService {
  private webRequestService: IWebRequestService;
  private baseUrl: string;
  private config: OutlineBackendServiceConfig;

  constructor(config: OutlineBackendServiceConfig) {
    this.config = config;
    this.baseUrl = (config.baseUrl || 'https://app.getoutline.com').replace(/\/+$/, '');
    this.webRequestService = Container.get(IWebRequestService);
  }

  getId = () => {
    return md5(`${this.baseUrl}:${this.config.apiKey}`);
  };

  getUserInfo = async () => {
    const response = await this.post<OutlineAuthInfoResponse>('auth.info');
    const user = response?.data?.user || response?.user || response?.data;
    const name = user?.name || 'Outline User';
    const avatar = user?.avatarUrl || '';
    const email = user?.email || user?.emailAddress || '';
    return {
      name,
      avatar,
      homePage: this.baseUrl,
      description: email,
    };
  };

  getRepositories = async (): Promise<Repository[]> => {
    const response = await this.post<OutlineCollectionResponse>('collections.list');
    const collections = response?.data || [];
    return collections.map(collection => ({
      id: collection.id,
      name: collection.name,
      groupId: collection.id,
      groupName: collection.name,
      disabled: collection.permission === 'read',
    }));
  };

  createDocument = async ({
    repositoryId,
    title,
    content,
  }: CreateDocumentRequest): Promise<CompleteStatus> => {
    const response = await this.post<OutlineDocumentResponse>('documents.create', {
      collectionId: repositoryId,
      title,
      text: content,
      publish: true,
    });
    const doc = response?.data || (response as any);
    const href = this.toAbsoluteUrl(doc.url || `/doc/${doc.urlId || doc.id}`);
    return {
      href,
    };
  };

  private async post<T>(method: string, data?: any): Promise<T> {
    const url = `${this.baseUrl}/api/${method}`;
    try {
      return await this.webRequestService.requestInBackground<T>(url, {
        method: 'post',
        data,
        timeout: 10000,
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      });
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401) {
        throw new UnauthorizedError('Unauthorized! Please check your Outline API key.');
      }
      const message = error?.data?.message || error?.message || 'Outline request failed.';
      throw new Error(message);
    }
  }

  private toAbsoluteUrl(urlPath: string): string {
    try {
      return new URL(urlPath, `${this.baseUrl}/`).href;
    } catch (error) {
      return `${this.baseUrl}${urlPath.startsWith('/') ? '' : '/'}${urlPath}`;
    }
  }
}
