export interface SpicetifyTrackData {
  uri: string;
  name: string;
  artists?: { name: string }[];
  album?: {
    name: string;
    images?: { url: string }[];
  };
  duration?: number;
  metadata?: {
    image_url?: string;
    image_xlarge_url?: string;
    title?: string;
    artist_name?: string;
    duration?: string;
  };
}

export interface SpicetifyGlobal {
  Player: {
    data?: {
      item?: SpicetifyTrackData;
    };
    addEventListener: (event: string, callback: (event?: any) => void) => void;
    removeEventListener: (event: string, callback: (event?: any) => void) => void;
    getProgress: () => number;
    seek: (positionMs: number) => void;
    isPlaying: () => boolean;
  };
  showNotification?: (text: string) => void;
  Topbar?: {
    Button: new (
      label: string,
      icon: string,
      onClick: () => void,
      disabled?: boolean,
      bool?: boolean
    ) => { element: HTMLElement };
  };
  Platform?: {
    History?: {
      push: (path: string) => void;
    };
  };
}

declare global {
  interface Window {
    Spicetify?: SpicetifyGlobal;
  }
}
