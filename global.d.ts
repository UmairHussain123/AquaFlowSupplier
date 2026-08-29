declare module '*.json' {
  const value: any;
  export default value;
}

declare module '*.svg' {
  import React from 'react';
  import {SvgProps} from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}

// react-native-dotenv's virtual module, populated from .env at build time.
declare module '@env' {
  export const API_URL: string | undefined;
}

// Minimal typing for env vars used in React Native (avoids pulling full @types/node)
declare const process: {
  env: {
    API_URL?: string;
    [key: string]: string | undefined;
  };
};
