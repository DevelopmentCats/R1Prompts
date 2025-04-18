import {
  Box,
  Container,
  VStack,
  Heading,
  Text,
  Button,
  HStack,
  Avatar,
  Icon,
  Divider,
  useToast,
  Badge,
  Flex,
  Image,
  SimpleGrid,
  Center,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure
} from '@chakra-ui/react';
import { useParams, Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { BsHandThumbsUp, BsHandThumbsUpFill, BsArrowLeft, BsCopy } from 'react-icons/bs';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../lib/axios';
import { formatDistanceToNow } from 'date-fns';
import { PromptCategory, CATEGORY_DISPLAY_NAMES } from '../types/prompt';
import { useAuth } from '../contexts/AuthContext';
import { getPromptImageUrl } from '../utils/prompt-images';
import LoadingLogo from '../components/LoadingLogo';
import SEO from '../components/SEO';
import seoConfig from '../config/seo';

interface Author {
  id?: string;
  username?: string;
  avatarUrl?: string;
}

interface Prompt {
  id: string;
  title: string;
  description: string;
  content: string;
  category: PromptCategory;
  totalVotes: number;
  totalCopies: number;
  totalViews: number;
  createdAt: string;
  authorSafe?: Author;
  imageUrls?: string[];
  tags?: string[];
  canEdit?: boolean;
  canDelete?: boolean;
}

interface ExtendedPrompt extends Prompt {
  hasVoted?: boolean;
  hasCopied?: boolean;
}

const PromptView = () => {
  const { id } = useParams();
  const [isVoted, setIsVoted] = useState(false);
  const [votes, setVotes] = useState(0);
  const queryClient = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);

  const { data: prompt, isLoading, error } = useQuery<ExtendedPrompt>({
    queryKey: ['prompt', id],
    queryFn: async () => {
      const response = await axiosInstance.get(`/prompts/${id}`);
      console.log('Prompt response:', response.data);
      console.log('Current user:', user);
      return response.data;
    },
  });

  // Update total votes when prompt data changes
  useEffect(() => {
    if (prompt) {
      console.log('Prompt data:', {
        id: prompt.id,
        authorId: prompt.authorSafe?.id,
        userId: user?.id,
        isAdmin: user?.isAdmin,
        canEdit: prompt.canEdit,
        canDelete: prompt.canDelete
      });
      setVotes(prompt.totalVotes || 0);
    }
  }, [prompt, user]);

  // Check if user has voted for this prompt
  useQuery({
    queryKey: ['promptVote', id],
    queryFn: async () => {
      if (!isAuthenticated) {
        return { voted: false };
      }
      try {
        const response = await axiosInstance.get(`/prompts/${id}/vote`);
        setIsVoted(response.data.voted);
        return response.data;
      } catch (error) {
        console.error('Error checking vote status:', error);
        return { voted: false };
      }
    },
    enabled: !!id && isAuthenticated,
    retry: 1,
    refetchOnWindowFocus: false
  });

  const handleVote = async () => {
    if (!prompt || !isAuthenticated) {
      toast({
        title: 'Login Required',
        description: 'Please login to vote for prompts. Your votes help the community find the best content!',
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    try {
      const response = await axiosInstance.post(`/prompts/${id}/vote`);
      setIsVoted(response.data.voted);
      setVotes(response.data.votes);
      // Invalidate both prompt and vote queries to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['prompt', id] });
      queryClient.invalidateQueries({ queryKey: ['promptVote', id] });
      // Also invalidate the prompts list query to update the Explore page when navigating back
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
    } catch (error) {
      console.error('Error voting prompt:', error);
      toast({
        title: 'Error',
        description: 'Failed to vote for the prompt. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleCopy = async () => {
    if (!prompt?.content) return;

    try {
      // Copy content to clipboard first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(prompt.content);
      } else {
        // Fallback to textarea method
        const textArea = document.createElement("textarea");
        textArea.value = prompt.content;
        textArea.style.top = "0";
        textArea.style.left = "0";
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

      // Show success toast immediately
      if (!isAuthenticated) {
        toast({
          title: 'Prompt copied to clipboard',
          description: 'Sign up to save your favorite prompts and track your usage!',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Prompt copied to clipboard',
          status: 'success',
          duration: 2000,
        });
      }

      // Optimistically update the copy count
      queryClient.setQueryData(['prompt', id], (oldData: any) => ({
        ...oldData,
        totalCopies: (oldData?.totalCopies || 0) + 1,
      }));

      // Track the copy count for all users
      try {
        const response = await axiosInstance.post(`/prompts/${id}/copy`);
        // Update with server data
        if (response.data.totalCopies !== undefined) {
          queryClient.setQueryData(['prompt', id], (oldData: any) => ({
            ...oldData,
            totalCopies: response.data.totalCopies,
          }));
        }
        // Also invalidate the prompts list query
        queryClient.invalidateQueries({ queryKey: ['prompts'] });
      } catch (error) {
        console.error('Error updating copy count:', error);
        // Roll back optimistic update
        queryClient.setQueryData(['prompt', id], (oldData: any) => ({
          ...oldData,
          totalCopies: Math.max((oldData?.totalCopies || 1) - 1, 0),
        }));
      }
    } catch (error) {
      console.error('Error copying prompt:', error);
      toast({
        title: 'Error copying prompt',
        description: 'Failed to copy the prompt to clipboard. Please try selecting and copying manually.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleDelete = async () => {
    try {
      await axiosInstance.delete(`/prompts/${id}`);
      // Invalidate prompts list query before navigating
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      toast({
        title: 'Prompt deleted',
        status: 'success',
        duration: 3000,
      });
      navigate('/prompts/explore');
    } catch (error) {
      console.error('Error deleting prompt:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete prompt',
        status: 'error',
        duration: 3000,
      });
    } finally {
      onClose();
    }
  };

  if (isLoading) {
    return (
      <Center py={10}>
        <LoadingLogo />
      </Center>
    );
  }

  if (error || !prompt) {
    return (
      <Box minH="calc(100vh - 72px)" display="flex" alignItems="center" justifyContent="center">
        <Text>Error loading prompt. Please try again later.</Text>
      </Box>
    );
  }

  return (
    <>
      <SEO
        title={prompt ? prompt.title : 'Loading Prompt...'}
        description={prompt ? `${prompt.description.slice(0, 160)}...` : 'Loading prompt details...'}
        openGraph={{
          title: prompt ? prompt.title : 'AI Prompt',
          description: prompt ? prompt.description : 'Loading prompt details...',
          type: 'article',
          image: prompt?.imageUrls?.[0] ? getPromptImageUrl(prompt.imageUrls[0]) : seoConfig.openGraph.images[0].url,
          imageAlt: prompt ? prompt.title : 'AI Prompt',
        }}
        noindex={!prompt}
      />
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

        <Container maxW="container.lg" position="relative">
          <VStack spacing={8} align="stretch" width="100%">
            <VStack spacing={6} align="stretch">
              <HStack spacing={4} align="center" justify="space-between" width="100%">
                <HStack spacing={4}>
                  <Button
                    leftIcon={<Icon as={BsArrowLeft} />}
                    onClick={() => navigate(-1)}
                    variant="ghost"
                    color="orange.400"
                    _hover={{ bg: 'whiteAlpha.200' }}
                    size="md"
                    pl={1}
                  >
                    Back
                  </Button>
                  <Badge
                    colorScheme="orange"
                    variant="solid"
                    px={3}
                    py={1}
                    borderRadius="full"
                  >
                    {CATEGORY_DISPLAY_NAMES[prompt.category]}
                  </Badge>
                </HStack>
                
                {(prompt.canEdit || prompt.canDelete) && (
                  <HStack spacing={4}>
                    {prompt.canEdit && (
                      <Button
                        colorScheme="orange"
                        variant="outline"
                        onClick={() => navigate(`/prompts/${prompt.id}/edit`)}
                      >
                        Edit
                      </Button>
                    )}
                    {prompt.canDelete && (
                      <Button
                        colorScheme="red"
                        variant="outline"
                        onClick={onOpen}
                      >
                        Delete
                      </Button>
                    )}
                  </HStack>
                )}
              </HStack>

              <VStack spacing={4} align="stretch">
                <Heading size="2xl">{prompt.title}</Heading>

                {prompt.tags && prompt.tags.length > 0 && (
                  <HStack spacing={2} align="center">
                    <Text color="gray.400">Tags:</Text>
                    <Flex wrap="wrap" gap={2}>
                      {prompt.tags.map((tag) => (
                        <Badge
                          key={tag}
                          colorScheme="orange"
                          variant="subtle"
                          px={2}
                          py={1}
                          borderRadius="full"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </Flex>
                  </HStack>
                )}

                <HStack spacing={4}>
                  <Button
                    size="md"
                    variant="ghost"
                    leftIcon={
                      <Icon
                        as={isVoted ? BsHandThumbsUpFill : BsHandThumbsUp}
                        color={isVoted ? "orange.500" : "inherit"}
                      />
                    }
                    onClick={handleVote}
                    _hover={{ bg: 'whiteAlpha.200' }}
                    color={isVoted ? "orange.500" : "inherit"}
                    transition="all 0.2s"
                  >
                    {votes}
                  </Button>
                  <HStack 
                    spacing={2} 
                    px={3}
                    py={2}
                    color="gray.500"
                  >
                    <Icon as={BsCopy} />
                    <Text>{prompt?.totalCopies || 0}</Text>
                  </HStack>
                </HStack>

                <HStack spacing={4} align="center">
                  {prompt.authorSafe && (
                    <HStack spacing={2} mb={4}>
                      <Avatar
                        size="sm"
                        name={prompt.authorSafe.username}
                        src={prompt.authorSafe.avatarUrl}
                      />
                      <Box>
                        <RouterLink to={`/profile/${prompt.authorSafe.id}`}>
                          <Text
                            fontWeight="bold"
                            color="blue.500"
                            _hover={{ textDecoration: 'underline' }}
                          >
                            {prompt.authorSafe.username}
                          </Text>
                        </RouterLink>
                      </Box>
                    </HStack>
                  )}
                  <Text color="gray.500">•</Text>
                  <Text color="gray.500">
                    {formatDistanceToNow(new Date(prompt.createdAt))} ago
                  </Text>
                </HStack>
              </VStack>

              <Text color="whiteAlpha.800">{prompt.description}</Text>

              <Divider borderColor="whiteAlpha.200" />

            </VStack>

            <VStack align="stretch" spacing={6}>
              {/* Preview Images for Generative UI Prompts */}
              {prompt.imageUrls && prompt.imageUrls.length > 0 && (
                <Box>
                  <Heading size="md" color="whiteAlpha.900" mb={4}>
                    UI Preview
                  </Heading>
                  <SimpleGrid 
                    columns={[1, 2]} 
                    spacing={6}
                    sx={{
                      '& > div': {
                        aspectRatio: '4/3',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bg: 'whiteAlpha.50',
                      }
                    }}
                  >
                    {prompt.imageUrls.map((url, index) => (
                      <Box
                        key={index}
                        position="relative"
                        borderRadius="xl"
                        overflow="hidden"
                        border="1px solid"
                        borderColor="whiteAlpha.200"
                        cursor="pointer"
                        onClick={() => window.open(getPromptImageUrl(url), '_blank')}
                        transition="all 0.2s"
                        _hover={{
                          transform: 'scale(1.02)',
                          borderColor: 'whiteAlpha.400'
                        }}
                      >
                        <Image
                          src={getPromptImageUrl(url)}
                          alt={`Preview ${index + 1}`}
                          objectFit="contain"
                          w="100%"
                          h="100%"
                          p={4}
                          fallback={
                            <Box
                              w="100%"
                              h="100%"
                              bg="gray.700"
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                            >
                              <Text color="gray.500">Loading image...</Text>
                            </Box>
                          }
                          onError={(e) => {
                            console.error('Failed to load image:', url);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </Box>
                    ))}
                  </SimpleGrid>
                </Box>
              )}

              <Box
                bg="whiteAlpha.50"
                p={6}
                borderRadius="xl"
                border="1px solid"
                borderColor="whiteAlpha.200"
                position="relative"
                mb={0}
              >
                <Flex justify="space-between" align="center" mb={4}>
                  <Heading as="h1" size="lg" color="whiteAlpha.900">
                    {prompt.title}
                  </Heading>
                </Flex>
                <Text whiteSpace="pre-wrap" color="whiteAlpha.900">
                  {prompt.content}
                </Text>
              </Box>
              <Flex justify="flex-end" mt={1} gap={2}>
                <Button
                  onClick={handleCopy}
                  leftIcon={<Icon as={BsCopy} />}
                  colorScheme="rabbit"
                  size="md"
                >
                  Copy Prompt
                </Button>
              </Flex>
            </VStack>
          </VStack>
        </Container>
      </Box>
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent bg="gray.800" borderColor="whiteAlpha.200" borderWidth={1}>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Prompt
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete this prompt? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose} variant="ghost" mr={3}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleDelete}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};

export default PromptView;
