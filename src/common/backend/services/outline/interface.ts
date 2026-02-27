export interface OutlineBackendServiceConfig {
  baseUrl?: string;
  apiKey: string;
}

export interface OutlineUser {
  id?: string;
  name?: string;
  avatarUrl?: string;
  email?: string;
  emailAddress?: string;
}

export interface OutlineAuthInfoResponse {
  data?: {
    user?: OutlineUser;
    [key: string]: any;
  };
  user?: OutlineUser;
  [key: string]: any;
}

export interface OutlineCollection {
  id: string;
  name: string;
  permission?: string;
}

export interface OutlineCollectionResponse {
  data: OutlineCollection[];
}

export interface OutlineDocument {
  id: string;
  url?: string;
  urlId?: string;
}

export interface OutlineDocumentResponse {
  data: OutlineDocument;
  url?: string;
}
