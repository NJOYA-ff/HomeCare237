// hooks/useAudioCall.ts
import { useState } from "react";

export interface CallParams {
  token: string;
  contactName: string;
}

export const useAudioCall = () => {
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [callParams, setCallParams] = useState<CallParams | null>(null);

  const startAudioCall = (params: CallParams) => {
    setCallParams(params);
    setIsCallModalOpen(true);
  };

  const endAudioCall = () => {
    setIsCallModalOpen(false);
    setCallParams(null);
  };

  return {
    isCallModalOpen,
    callParams,
    startAudioCall,
    endAudioCall,
  };
};
