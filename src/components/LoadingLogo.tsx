import React from 'react';
import { Box, useColorMode } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';

const pulse = keyframes`
  0% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 0.8; }
`;

const LoadingLogo: React.FC = () => {
  const { colorMode } = useColorMode();
  const pulseAnimation = `${pulse} 1.5s ease-in-out infinite`;
  
  const mainColor = colorMode === 'light' ? '#ED8936' : '#F6AD55';
  const strokeColor = colorMode === 'light' ? '#1A202C' : '#171923';

  return (
    <Box
      animation={pulseAnimation}
      width="100px"
      height="100px"
    >
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Main head shape */}
        <path
          d="M50 15C35 15 20 30 20 45C20 60 35 75 50 75C65 75 80 60 80 45C80 30 65 15 50 15Z"
          fill={mainColor}
          stroke={strokeColor}
          strokeWidth="3"
        />
        
        {/* Left ear */}
        <path
          d="M35 15C35 15 25 5 20 2C15 -1 10 1 15 8C20 15 30 25 35 25"
          fill={mainColor}
          stroke={strokeColor}
          strokeWidth="3"
          strokeLinecap="round"
        />
        
        {/* Right ear */}
        <path
          d="M65 15C65 15 75 5 80 2C85 -1 90 1 85 8C80 15 70 25 65 25"
          fill={mainColor}
          stroke={strokeColor}
          strokeWidth="3"
          strokeLinecap="round"
        />
        
        {/* Eyes */}
        <circle cx="35" cy="45" r="5" fill={strokeColor} />
        <circle cx="65" cy="45" r="5" fill={strokeColor} />
        
        {/* Nose */}
        <path
          d="M47 55C47 55 50 58 53 55C51 58 49 58 47 55Z"
          fill={strokeColor}
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </Box>
  );
};

export default LoadingLogo;
