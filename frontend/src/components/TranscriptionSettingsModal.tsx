import { useState, useEffect, useCallback } from 'react';

export interface TranscriptionConfig {
  provider: 'local' | 'cloud';
  localModel: string;
  cloudModel: string;
  deepgramApiKey?: string | null;
}

interface TranscriptionSettingsModalProps {
  showTranscriptionSettings: boolean;
  setShowTranscriptionSettings: (show: boolean) => void;
  transcriptionConfig: TranscriptionConfig;
  setTranscriptionConfig: (config: TranscriptionConfig | ((prev: TranscriptionConfig) => TranscriptionConfig)) => void;
  onSave: (config: TranscriptionConfig) => void;
}

const API_BASE_URL = 'http://localhost:5167';

const WHISPER_MODELS = [
  'tiny', 'tiny.en', 'base', 'base.en', 'small', 'small.en',
  'medium', 'medium.en', 'large-v1', 'large-v2', 'large-v3', 'large-v3-turbo'
];

const DEEPGRAM_MODELS = [
  { id: 'base', name: 'Base', description: 'Fastest & cheapest' },
  { id: 'enhanced', name: 'Enhanced', description: 'Balanced speed & accuracy' },
  { id: 'nova-2', name: 'Nova-2', description: 'High accuracy' },
  { id: 'nova-3', name: 'Nova-3', description: 'Latest & most accurate' }
];

export function TranscriptionSettingsModal({
  showTranscriptionSettings,
  setShowTranscriptionSettings,
  transcriptionConfig,
  setTranscriptionConfig,
  onSave
}: TranscriptionSettingsModalProps) {
  const [apiKey, setApiKey] = useState(transcriptionConfig.deepgramApiKey || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isApiKeyLocked, setIsApiKeyLocked] = useState(true);
  const [isLockButtonVibrating, setIsLockButtonVibrating] = useState(false);

  useEffect(() => {
    if (!showTranscriptionSettings) return;

    const fetchAndSetConfig = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/get-transcription-config`);
        const data = await response.json();
        
        const configToSet = data.provider ? data : { ...transcriptionConfig, provider: 'local' };
        
        setTranscriptionConfig(configToSet);
        setApiKey(configToSet.deepgramApiKey || '');
      } catch {
        setTranscriptionConfig(prev => ({ ...prev, provider: 'local' }));
      }
    };

    fetchAndSetConfig();
  }, [showTranscriptionSettings, setTranscriptionConfig]);

  const handleSave = useCallback(() => {
    const updatedConfig = { 
      ...transcriptionConfig, 
      deepgramApiKey: transcriptionConfig.provider === 'cloud' ? apiKey.trim() || null : null 
    };
    
    setTranscriptionConfig(updatedConfig);
    setShowTranscriptionSettings(false);
    onSave(updatedConfig);
  }, [transcriptionConfig, apiKey, setTranscriptionConfig, setShowTranscriptionSettings, onSave]);

  const handleProviderChange = useCallback((provider: 'local' | 'cloud') => {
    setTranscriptionConfig(prev => ({ ...prev, provider }));
  }, [setTranscriptionConfig]);

  const handleModelChange = useCallback((model: string) => {
    const field = transcriptionConfig.provider === 'local' ? 'localModel' : 'cloudModel';
    setTranscriptionConfig(prev => ({ ...prev, [field]: model }));
  }, [transcriptionConfig.provider, setTranscriptionConfig]);

  const handleApiKeyLockToggle = useCallback(() => {
    if (isApiKeyLocked) {
      setIsLockButtonVibrating(true);
      setTimeout(() => setIsLockButtonVibrating(false), 500);
    } else {
      setIsApiKeyLocked(!isApiKeyLocked);
    }
  }, [isApiKeyLocked]);

  const requiresApiKey = transcriptionConfig.provider === 'cloud';
  const isDoneDisabled = requiresApiKey && !apiKey.trim();
  const currentModel = transcriptionConfig.provider === 'local' 
    ? transcriptionConfig.localModel 
    : transcriptionConfig.cloudModel;

  if (!showTranscriptionSettings) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Transcription Settings</h3>
          <button
            onClick={() => setShowTranscriptionSettings(false)}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transcription Provider
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="local"
                  checked={transcriptionConfig.provider === 'local'}
                  onChange={() => handleProviderChange('local')}
                  className="mr-2"
                />
                <span className="text-sm">Local (Whisper)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="cloud"
                  checked={transcriptionConfig.provider === 'cloud'}
                  onChange={() => handleProviderChange('cloud')}
                  className="mr-2"
                />
                <span className="text-sm">Cloud (Deepgram)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {transcriptionConfig.provider === 'local' ? 'Whisper Model' : 'Deepgram Model'}
            </label>
            <select
              className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              value={currentModel}
              onChange={(e) => handleModelChange(e.target.value)}
            >
              {(transcriptionConfig.provider === 'local' ? WHISPER_MODELS : DEEPGRAM_MODELS).map(model => (
                <option 
                  key={typeof model === 'string' ? model : model.id} 
                  value={typeof model === 'string' ? model : model.id}
                >
                  {typeof model === 'string' ? model : `${model.name} - ${model.description}`}
                </option>
              ))}
            </select>
          </div>

          {requiresApiKey && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deepgram API Key
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={isApiKeyLocked}
                  className={`w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 pr-24 ${
                    isApiKeyLocked ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  placeholder="Enter your Deepgram API key"
                />
                {isApiKeyLocked && (
                  <div 
                    onClick={() => {
                      setIsLockButtonVibrating(true);
                      setTimeout(() => setIsLockButtonVibrating(false), 500);
                    }}
                    className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-50 rounded-md cursor-not-allowed"
                  />
                )}
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsApiKeyLocked(!isApiKeyLocked)}
                    className={`text-gray-500 hover:text-gray-700 transition-colors duration-200 ${
                      isLockButtonVibrating ? 'animate-vibrate text-red-500' : ''
                    }`}
                    title={isApiKeyLocked ? "Unlock to edit" : "Lock to prevent editing"}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d={isApiKeyLocked 
                          ? "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          : "M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                        } 
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="text-gray-500 hover:text-gray-700"
                    title={showApiKey ? "Hide API key" : "Show API key"}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d={showApiKey 
                          ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        } 
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500">
            {transcriptionConfig.provider === 'local' 
              ? 'Local processing using Whisper models. No internet required.'
              : 'Cloud processing with Deepgram. Includes speaker diarization.'
            }
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={() => setShowTranscriptionSettings(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isDoneDisabled}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              isDoneDisabled 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
} 