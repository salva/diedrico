export interface GoogleDriveFile {
  id: string;
  name: string;
  modifiedTime: string;
}

export interface GoogleDriveConfig {
  clientId: string;
  apiKey?: string;
  appId: string;
}

export interface GoogleUserProfile {
  name: string;
  email: string;
  picture?: string;
  sub: string;
}
