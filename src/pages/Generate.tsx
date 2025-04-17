import {
  Box,
  Container,
  VStack,
  Heading,
  Text,
  Button,
  Textarea,
  useToast,
  HStack,
  Icon,
  Badge,
  Select,
} from '@chakra-ui/react';
import { useState } from 'react';
import { BsLightning, BsCopy, BsArrowRepeat } from 'react-icons/bs';
import { axiosInstance } from '../lib/axios';
import { PromptsCounter } from '../components/PromptsCounter';

interface GenerateState {
  userInput: string;
  generatedPrompt: string | null;
  isGenerating: boolean;
  error: string | null;
  characterCount?: number;
  selectedModel: string;
}

const AVAILABLE_MODELS = [
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (32k)' },
  { id: 'llama3-70b-8192', name: 'Llama3 70B' },
  { id: 'gemma-7b-it', name: 'Gemma 7B' },
  { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B Versatile' }
] as const;

const Generate = () => {
  const [state, setState] = useState<GenerateState>({
    userInput: '',
    generatedPrompt: null,
    isGenerating: false,
    error: null,
    selectedModel: 'llama3-70b-8192',
  });
  const toast = useToast();

  const handleGenerate = async () => {
    if (!state.userInput.trim()) {
      toast({
        title: 'Input required',
        description: 'Please describe the UI you want to generate.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setState(prev => ({ ...prev, isGenerating: true, error: null }));
    
    try {
      const response = await axiosInstance.post('/generate', {
        description: state.userInput,
        model: state.selectedModel
      });
      
      setState(prev => ({
        ...prev,
        generatedPrompt: response.data.prompt,
        characterCount: response.data.prompt.length,
        isGenerating: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to generate prompt. Please try again.',
        isGenerating: false,
      }));
      toast({
        title: 'Generation failed',
        description: 'There was an error generating your prompt. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleCopy = async () => {
    if (!state.generatedPrompt) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(state.generatedPrompt);
      } else {
        // Fallback method
        const textArea = document.createElement("textarea");
        textArea.value = state.generatedPrompt;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
        } catch (err) {
          console.error('Fallback: Unable to copy', err);
          throw new Error('Copy failed');
        } finally {
          document.body.removeChild(textArea);
        }
      }
      
      toast({
        title: 'Copied to clipboard',
        status: 'success',
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: 'Failed to copy',
        description: 'Please try selecting and copying manually',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleRegenerate = () => {
    if (state.generatedPrompt) {
      handleGenerate();
    }
  };

  return (
    <Box
      minH="calc(100vh - 72px)"
      bg="gray.900"
      py={8}
      position="relative"
      overflow="hidden"
    >
      {/* Background gradients */}
      <Box
        position="absolute"
        top="-20%"
        left="-10%"
        width="40%"
        height="40%"
        bg="rabbit.500"
        filter="blur(150px)"
        opacity={0.15}
        borderRadius="full"
      />
      <Box
        position="absolute"
        bottom="-20%"
        right="-10%"
        width="40%"
        height="40%"
        bg="rabbit.500"
        filter="blur(150px)"
        opacity={0.15}
        borderRadius="full"
      />

      <Container maxW="container.xl" py={8}>
        <VStack spacing={8} align="stretch">
          <HStack justify="space-between" align="center">
            <Heading size="lg">Generate UI Prompt</Heading>
            <PromptsCounter size="sm" />
          </HStack>
          <Box>
            <HStack mb={2} justify="space-between">
              <Text fontSize="sm" color="gray.500">
                Describe the UI you want to generate
              </Text>
              <Select
                size="sm"
                width="auto"
                value={state.selectedModel}
                onChange={(e) => setState(prev => ({ ...prev, selectedModel: e.target.value }))}
              >
                {AVAILABLE_MODELS.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </Select>
            </HStack>
            <Box
              bg="whiteAlpha.100"
              borderRadius="xl"
              p={6}
              backdropFilter="blur(10px)"
              border="1px solid"
              borderColor="whiteAlpha.200"
            >
              <VStack spacing={6} align="stretch">
                <HStack spacing={2}>
                  <Icon as={BsLightning} color="orange.400" />
                  <Text fontWeight="semibold" color="white">Describe Your UI</Text>
                </HStack>

                <Textarea
                  value={state.userInput}
                  onChange={(e) => setState(prev => ({ ...prev, userInput: e.target.value }))}
                  placeholder="Example: A modern weather dashboard with current conditions and a 5-day forecast..."
                  size="lg"
                  minH="150px"
                  bg="whiteAlpha.50"
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                  _hover={{ borderColor: "whiteAlpha.300" }}
                  _focus={{ borderColor: "orange.400", boxShadow: "0 0 0 1px var(--chakra-colors-orange-400)" }}
                  color="white"
                  _placeholder={{ color: "whiteAlpha.400" }}
                />

                <Button
                  colorScheme="orange"
                  size="lg"
                  width="full"
                  onClick={handleGenerate}
                  isLoading={state.isGenerating}
                  loadingText="Generating..."
                  _hover={{ bg: 'orange.500' }}
                >
                  Generate Prompt
                </Button>
              </VStack>
            </Box>

            {state.generatedPrompt && (
              <Box
                bg="whiteAlpha.100"
                borderRadius="xl"
                p={6}
                backdropFilter="blur(10px)"
                border="1px solid"
                borderColor="whiteAlpha.200"
              >
                <VStack spacing={6} align="stretch">
                  <HStack justify="space-between" align="center">
                    <HStack spacing={2}>
                      <Text fontWeight="semibold" color="white">Generated Prompt</Text>
                      <Badge
                        colorScheme={state.characterCount && state.characterCount <= 950 ? "green" : "red"}
                        variant="solid"
                      >
                        {state.characterCount} chars
                      </Badge>
                    </HStack>
                    <HStack spacing={2}>
                      <Button
                        leftIcon={<Icon as={BsArrowRepeat} />}
                        variant="ghost"
                        size="sm"
                        onClick={handleRegenerate}
                        color="orange.400"
                        _hover={{ bg: 'whiteAlpha.200' }}
                      >
                        Regenerate
                      </Button>
                      <Button
                        leftIcon={<Icon as={BsCopy} />}
                        variant="ghost"
                        size="sm"
                        onClick={handleCopy}
                        color="orange.400"
                        _hover={{ bg: 'whiteAlpha.200' }}
                      >
                        Copy
                      </Button>
                    </HStack>
                  </HStack>

                  <Box
                    p={4}
                    bg="whiteAlpha.50"
                    borderRadius="md"
                    whiteSpace="pre-wrap"
                    fontFamily="mono"
                    color="white"
                    fontSize="md"
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                  >
                    {state.generatedPrompt}
                  </Box>
                </VStack>
              </Box>
            )}

            {state.error && (
              <Box
                p={4}
                bg="red.900"
                color="red.200"
                borderRadius="md"
                border="1px solid"
                borderColor="red.500"
              >
                <Text>{state.error}</Text>
              </Box>
            )}
          </Box>
        </VStack>
      </Container>
    </Box>
  );
};

export default Generate;
