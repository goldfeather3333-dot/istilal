import { useState, useCallback } from 'react';

// Sound options from public/sounds
export const NOTIFICATION_SOUNDS = {
  chime: {
    name: 'Chime',
    src: '/sounds/chime.mp3',
  },
  bell: {
    name: 'Bell',
    src: '/sounds/bell.mp3',
  },
  success: {
    name: 'Success',
    src: '/sounds/success.mp3',
  },
  pop: {
    name: 'Pop',
    src: '/sounds/pop.mp3',
  },
} as const;

export type NotificationSoundType = keyof typeof NOTIFICATION_SOUNDS;

interface NotificationSoundSettings {
  enabled: boolean;
  soundType: NotificationSoundType;
  volume: number;
}

const DEFAULT_SETTINGS: NotificationSoundSettings = {
  enabled: true,
  soundType: 'chime',
  volume: 0.5,
};

const STORAGE_KEY = 'notificationSoundSettings';

export const useNotificationSound = () => {
  const [settings, setSettings] = useState<NotificationSoundSettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      } catch {
        return DEFAULT_SETTINGS;
      }
    }

    return DEFAULT_SETTINGS;
  });

  const playAudio = useCallback((soundType: NotificationSoundType, volume: number) => {
    const sound = NOTIFICATION_SOUNDS[soundType];
    const audio = new Audio(sound.src);
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.preload = 'auto';

    audio.play().catch((err) => {
      console.log('Could not play notification sound:', err);
    });
  }, []);

  const playSound = useCallback(
    (overrideSoundType?: NotificationSoundType) => {
      if (!settings.enabled) return;

      const soundType = overrideSoundType || settings.soundType;
      playAudio(soundType, settings.volume);
    },
    [settings.enabled, settings.soundType, settings.volume, playAudio]
  );

  const toggleSound = useCallback(() => {
    setSettings((prev) => {
      const next = { ...prev, enabled: !prev.enabled };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const setSoundType = useCallback((soundType: NotificationSoundType) => {
    setSettings((prev) => {
      const next = { ...prev, soundType };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const setVolume = useCallback((volume: number) => {
    setSettings((prev) => {
      const next = { ...prev, volume: Math.max(0, Math.min(1, volume)) };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const testSound = useCallback(
    (overrideSoundType?: NotificationSoundType) => {
      const soundType = overrideSoundType || settings.soundType;
      playAudio(soundType, settings.volume);
    },
    [settings.soundType, settings.volume, playAudio]
  );

  return {
    settings,
    playSound,
    toggleSound,
    setSoundType,
    setVolume,
    testSound,
    isEnabled: settings.enabled,
    soundType: settings.soundType,
    volume: settings.volume,
  };
};
