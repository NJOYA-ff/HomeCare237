import React, { createContext, useContext, useState } from "react";

interface ChatContextType {
  chatOpen: boolean;
  setChatOpen: (v: boolean) => void;
}

const ChatContext = createContext<ChatContextType>({ chatOpen: false, setChatOpen: () => {} });

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [chatOpen, setChatOpen] = useState(false);
  return <ChatContext.Provider value={{ chatOpen, setChatOpen }}>{children}</ChatContext.Provider>;
};

export const useChatContext = () => useContext(ChatContext);
