export type RemoteLiveRequestKind = 'live-music' | 'live-bible' | 'live-video';

export interface RemoteChromeTabResponse {
  status?: string;
  tab?: {
    id: string;
    label: string;
    songId: number | null;
    songName: string | null;
  };
  error?: string;
}

export interface RemoteLiveRequestResponse {
  status?: string;
  approval?: {
    id: string;
    kind: RemoteLiveRequestKind;
    userName: string;
    createdAt: string;
  };
  error?: string;
}
