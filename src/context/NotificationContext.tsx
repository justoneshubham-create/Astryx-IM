import React, { createContext, useContext, ReactNode } from 'react';
import { useToast, ToastViewport } from '@astryxdesign/core/Toast';

interface NotificationContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

function NotificationInnerProvider({ children }: { children: ReactNode }) {
  const toast = useToast();

  const success = (message: string) => {
    toast({
      body: message,
      type: 'info',
      autoHideDuration: 4000,
    });
  };

  const error = (message: string) => {
    toast({
      body: message,
      type: 'error',
      autoHideDuration: 6000,
    });
  };

  const info = (message: string) => {
    toast({
      body: message,
      type: 'info',
      autoHideDuration: 4000,
    });
  };

  return (
    <NotificationContext.Provider value={{ success, error, info }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <ToastViewport>
      <NotificationInnerProvider>{children}</NotificationInnerProvider>
    </ToastViewport>
  );
};

export const useNotification = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return ctx;
};
