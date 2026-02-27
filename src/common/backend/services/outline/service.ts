import md5 from '@web-clipper/shared/lib/md5';
import { DocumentService, CreateDocumentRequest } from '../../index';
import { CompleteStatus, Repository, UnauthorizedError } from '../interface';
import {
  OutlineBackendServiceConfig,
  OutlineAuthInfoResponse,
  OutlineCollectionResponse,
  OutlineDocumentResponse,
} from './interface';
import { extend, RequestMethod } from 'umi-request';

export default class OutlineDocumentService implements DocumentService {
  private request: RequestMethod;
  private baseUrl: string;
  private config: OutlineBackendServiceConfig;

  constructor(config: OutlineBackendServiceConfig) {
    this.config = config;
    this.baseUrl = (config.baseUrl || 'https://app.getoutline.com').replace(/\/+$/, '');
    this.request = extend({
      prefix: `${this.baseUrl}/api/`,
      timeout: 10000,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    });
    this.request.interceptors.response.use(
      async response => {
        if (response.status === 401) {
          throw new UnauthorizedError(
            'Unauthorized! Please check your Outline API key or login status.'
          );
        }
        if (!response.ok) {
          const data = await response.clone().json().catch(() => ({}));
          const message = data?.message || data?.error || response.statusText;
          throw new Error(`(${response.status}) ${message}`);
        }
        return response;
      },
      error => {
        throw error;
      }
    );
  }

  getId = () => {
    return md5(`${this.baseUrl}:${this.config.apiKey}`);
  };

  getUserInfo = async () => {
    const response = await this.request.post<OutlineAuthInfoResponse>('auth.info');
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
    const response = await this.request.post<OutlineCollectionResponse>('collections.list');
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
    const response = await this.request.post<OutlineDocumentResponse>('documents.create', {
      data: {
        collectionId: repositoryId,
        title,
        text: content,
        publish: true,
      },
    });
    const doc = response?.data || (response as any);
    const href = doc.url || `${this.baseUrl}/doc/${doc.urlId || doc.id}`;
    return {
      href,
    };
  };
}
