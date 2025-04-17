import { HStack, Text, Badge, useColorModeValue } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { useGlobalStats } from '../hooks/useGlobalStats';
import { useEffect, useState } from 'react';

interface PromptsCounterProps {
  size?: 'sm' | 'md' | 'lg';
  pollingInterval?: number;
}

const pulseAnimation = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
`;

const slideUp = keyframes`
  0% { transform: translateY(20%); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
`;

const AnimatedNumber: React.FC<{ value: number }> = ({ value }) => {
  const [prevValue, setPrevValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (prevValue !== value) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setPrevValue(value);
      }, 300); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [value, prevValue]);

  return (
    <Text
      as="span"
      animation={isAnimating ? `${slideUp} 0.3s ease-out` : undefined}
      display="inline-block"
    >
      {value.toLocaleString()}
    </Text>
  );
};

export const PromptsCounter: React.FC<PromptsCounterProps> = ({
  size = 'md',
  pollingInterval = 3000, // Poll every 3 seconds by default
}) => {
  const { data } = useGlobalStats(pollingInterval);
  const bgColor = useColorModeValue('whiteAlpha.200', 'whiteAlpha.200');
  const borderColor = useColorModeValue('whiteAlpha.300', 'whiteAlpha.300');

  const fontSizes = {
    sm: { label: 'xs', count: 'sm' },
    md: { label: 'sm', count: 'md' },
    lg: { label: 'md', count: 'lg' },
  };

  const paddingSizes = {
    sm: { p: 1, px: 2 },
    md: { p: 2, px: 3 },
    lg: { p: 2, px: 3 },
  };

  return (
    <HStack
      spacing={2}
      p={paddingSizes[size].p}
      px={paddingSizes[size].px}
      bg={bgColor}
      borderRadius="full"
      border="1px solid"
      borderColor={borderColor}
      backdropFilter="blur(8px)"
      transition="all 0.2s"
      _hover={{
        bg: 'whiteAlpha.300',
        transform: 'scale(1.02)',
      }}
    >
      <Text
        fontSize={fontSizes[size].label}
        color="whiteAlpha.900"
        fontWeight="medium"
      >
        Total Prompts
      </Text>
      <Badge
        fontSize={fontSizes[size].count}
        py={0.5}
        px={2}
        borderRadius="md"
        variant="solid"
        colorScheme="orange"
        bgGradient="linear(to-r, orange.400, orange.500)"
        fontWeight="bold"
        textShadow="0 1px 2px rgba(0,0,0,0.2)"
        animation={data?.totalPromptsGenerated ? `${pulseAnimation} 0.3s ease-in-out` : undefined}
      >
        <AnimatedNumber value={data?.totalPromptsGenerated || 0} />
      </Badge>
    </HStack>
  );
};
