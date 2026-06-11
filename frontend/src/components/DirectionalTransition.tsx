import React from 'react';
// @ts-ignore
import { ViewTransition } from 'react';

interface DirectionalTransitionProps {
  children: React.ReactNode;
}

export const DirectionalTransition: React.FC<DirectionalTransitionProps> = ({ children }) => {
  return (
    // @ts-ignore
    <ViewTransition
      enter={{
        'nav-forward': 'slide-from-right',
        'nav-back': 'slide-from-left',
        default: 'none',
      }}
      exit={{
        'nav-forward': 'slide-to-left',
        'nav-back': 'slide-to-right',
        default: 'none',
      }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
};

export default DirectionalTransition;
