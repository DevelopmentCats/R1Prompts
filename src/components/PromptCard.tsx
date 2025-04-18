import {
  Box,
  Heading,
  Text,
  Stack,
  Badge,
  IconButton,
  useColorModeValue,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  HStack,
  Flex,
  Tag,
  Button,
  Icon,
  Image,
  Tooltip,
  Link,
} from '@chakra-ui/react';
import { FiMoreVertical, FiEdit2, FiTrash2, FiLock } from 'react-icons/fi';
import { BsHandThumbsUpFill, BsCopy } from 'react-icons/bs';
import { Link as RouterLink } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { PromptCategory } from '../types/prompt';
import { useAuth } from '../contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../lib/axios';
import { getPromptImageUrl } from '../utils/prompt-images';

interface PromptCardProps {
  prompt: {
    id: string;
    title: string;
    description: string;
    content: string;
    category: PromptCategory;
    isPublic: boolean;
    totalVotes: number;
    tags: string[];
    imageUrls?: string[];
    createdAt: Date;
    updatedAt: Date;
    totalViews: number;
    totalCopies: number;
    hasVoted?: boolean;
    authorSafe?: {
      id: string;
      username: string;
    };
    canEdit?: boolean;
    canDelete?: boolean;
  };
  showAuthorLink?: boolean;
  isOwner?: boolean;
  onDelete?: (id: string) => void;
  interactive?: boolean;
  allowVotesAndCopies?: boolean;
}

const PromptCard = ({ 
  prompt, 
  showAuthorLink = true, 
  isOwner = false,
  onDelete,
  interactive = false,
  allowVotesAndCopies = false
}: PromptCardProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const authorColor = useColorModeValue('blue.500', 'blue.300');

  const voteMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        window.location.href = '/login';
        return;
      }
      const response = await axiosInstance.post(`/prompts/${prompt.id}/vote`);
      console.log('Vote response:', response.data);
      return response.data;
    },
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['prompts'] });

      // Get the current prompt from the cache
      const previousPrompts = queryClient.getQueryData(['prompts']);

      // Optimistically update the prompt
      queryClient.setQueryData(['prompts'], (old: any) => {
        if (!old?.pages) return old;
        
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            prompts: page.prompts.map((p: any) => {
              if (p.id === prompt.id) {
                const newHasVoted = !p.hasVoted;
                return {
                  ...p,
                  hasVoted: newHasVoted,
                  totalVotes: p.totalVotes + (newHasVoted ? 1 : -1)
                };
              }
              return p;
            })
          }))
        };
      });

      return { previousPrompts };
    },
    onError: (err, variables, context) => {
      console.error('Vote error:', err);
      // Roll back the optimistic update
      if (context?.previousPrompts) {
        queryClient.setQueryData(['prompts'], context.previousPrompts);
      }
    },
    onSuccess: (data) => {
      console.log('Vote success:', data);
      // Update with server data
      queryClient.setQueryData(['prompts'], (old: any) => {
        if (!old?.pages) return old;
        
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            prompts: page.prompts.map((p: any) => {
              if (p.id === prompt.id) {
                return {
                  ...p,
                  hasVoted: data.voted,
                  totalVotes: data.votes
                };
              }
              return p;
            })
          }))
        };
      });

      // Refetch to ensure we're in sync
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      
      // Also update the specific prompt data if available
      queryClient.invalidateQueries({ queryKey: ['prompt', prompt.id] });
    },
  });

  const copyMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        window.location.href = '/login';
        return;
      }
      // Copy content to clipboard first
      await navigator.clipboard.writeText(prompt.content || '');

      // Then make the API call
      const response = await axiosInstance.post(`/prompts/${prompt.id}/copy`);
      return response.data;
    },
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['prompts'] });

      // Get the current prompt from the cache
      const previousPrompts = queryClient.getQueryData(['prompts']);

      // Optimistically update the prompt
      queryClient.setQueryData(['prompts'], (old: any) => {
        if (!old?.pages) return old;
        
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            prompts: page.prompts.map((p: any) => {
              if (p.id === prompt.id) {
                return {
                  ...p,
                  totalCopies: (p.totalCopies || 0) + 1
                };
              }
              return p;
            })
          }))
        };
      });

      return { previousPrompts };
    },
    onError: (err, variables, context) => {
      console.error('Copy error:', err);
      // Roll back the optimistic update
      if (context?.previousPrompts) {
        queryClient.setQueryData(['prompts'], context.previousPrompts);
      }
    },
    onSuccess: (data) => {
      // Update with server data
      queryClient.setQueryData(['prompts'], (old: any) => {
        if (!old?.pages) return old;
        
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            prompts: page.prompts.map((p: any) => {
              if (p.id === prompt.id) {
                return {
                  ...p,
                  totalCopies: data.totalCopies
                };
              }
              return p;
            })
          }))
        };
      });

      // Refetch to ensure we're in sync
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      
      // Also update the specific prompt data if available
      queryClient.invalidateQueries({ queryKey: ['prompt', prompt.id] });
    },
  });

  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      bg={bgColor}
      borderColor={borderColor}
      _hover={{ transform: 'translateY(-2px)', transition: 'all 0.2s' }}
      height="100%"
      display="flex"
      flexDirection="column"
      position="relative"
    >
      {prompt.imageUrls && 
       Array.isArray(prompt.imageUrls) && 
       prompt.imageUrls.length > 0 && 
       prompt.imageUrls[0] && (
        <Box 
          position="relative" 
          paddingTop="56.25%"
          id={`image-container-${prompt.id}`}
        >
          <Image
            src={getPromptImageUrl(prompt.imageUrls[0])}
            alt={prompt.title}
            position="absolute"
            top="0"
            left="0"
            width="100%"
            height="100%"
            objectFit="cover"
            fallback={
              <Box
                position="absolute"
                top="0"
                left="0"
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
              // Hide the image container on error
              const container = document.getElementById(`image-container-${prompt.id}`);
              if (container) {
                container.style.display = 'none';
              }
            }}
          />
        </Box>
      )}

      <Box p={6} flex="1" display="flex" flexDirection="column">
        <HStack justify="space-between" align="start" mb={2}>
          <Box>
            <Badge colorScheme="orange" mb={2}>
              {prompt.category}
            </Badge>
            <Stack spacing={2}>
              <Heading
                size="md"
                color="inherit"
                _hover={{ color: 'orange.500' }}
              >
                <RouterLink to={`/prompts/${prompt.id}`}>
                  {prompt.title}
                </RouterLink>
              </Heading>
              {prompt.authorSafe && (
                <Text fontSize="sm" color="gray.500">
                  by{' '}
                  {showAuthorLink ? (
                    <Link
                      as={RouterLink}
                      to={`/profile/${prompt.authorSafe.id}`}
                      color={authorColor}
                      _hover={{ textDecoration: 'underline' }}
                    >
                      {prompt.authorSafe.username}
                    </Link>
                  ) : (
                    <Text as="span" color={authorColor} display="inline">
                      {prompt.authorSafe.username}
                    </Text>
                  )}
                  {prompt.createdAt && (' • ' + formatDistanceToNow(prompt.createdAt) + ' ago')}
                </Text>
              )}
            </Stack>
          </Box>
          <Flex>
            {!prompt.isPublic && (
              <Tooltip label="Private Prompt" placement="top">
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  width="32px"
                  height="32px"
                  borderRadius="md"
                  background="linear-gradient(135deg, #f97316 0%, #ea580c 100%)"
                  boxShadow="0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1)"
                  mr={2}
                  _before={{
                    content: '""',
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    borderRadius: "md",
                    padding: "1px",
                    background: "linear-gradient(135deg, rgba(255,255,255,0.5), rgba(255,255,255,0.2))",
                    WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                    WebkitMaskComposite: "xor",
                    maskComposite: "exclude",
                  }}
                  _hover={{
                    transform: 'scale(1.05)',
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  <Icon
                    as={FiLock}
                    boxSize={4}
                    color="white"
                    style={{
                      filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.3))',
                      strokeWidth: 2.5
                    }}
                  />
                </Box>
              </Tooltip>
            )}
            {isOwner && onDelete && (
              <Menu>
                <MenuButton
                  as={IconButton}
                  icon={<FiMoreVertical />}
                  variant="ghost"
                  size="sm"
                  aria-label="Options"
                />
                <MenuList>
                  <MenuItem
                    as={RouterLink}
                    to={`/prompts/${prompt.id}/edit`}
                    icon={<FiEdit2 />}
                  >
                    Edit
                  </MenuItem>
                  <MenuItem
                    onClick={() => onDelete?.(prompt.id)}
                    icon={<FiTrash2 />}
                    color="red.500"
                  >
                    Delete
                  </MenuItem>
                </MenuList>
              </Menu>
            )}
          </Flex>
        </HStack>

        <Text noOfLines={2} color="gray.500" mb={4}>
          {prompt.description}
        </Text>

        {prompt.tags && prompt.tags.length > 0 && (
          <Flex wrap="wrap" gap={2} mb={4}>
            {prompt.tags.map((tag, index) => (
              <Tag
                key={index}
                size="sm"
                borderRadius="full"
                variant="subtle"
                colorScheme="orange"
              >
                {tag}
              </Tag>
            ))}
          </Flex>
        )}

        {interactive && (
          <HStack spacing={4} mt="auto" mb={2}>
            {allowVotesAndCopies ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={
                    <Icon
                      as={BsHandThumbsUpFill}
                      color={prompt.hasVoted !== undefined ? (prompt.hasVoted ? "orange.500" : "gray.500") : "gray.500"}
                    />
                  }
                  onClick={() => voteMutation.mutate()}
                  isLoading={voteMutation.isPending}
                >
                  {prompt.totalVotes || 0}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<BsCopy />}
                  onClick={() => copyMutation.mutate()}
                  isLoading={copyMutation.isPending}
                >
                  {prompt.totalCopies || 0}
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={
                    <Icon
                      as={BsHandThumbsUpFill}
                      color={prompt.hasVoted !== undefined ? (prompt.hasVoted ? "orange.500" : "gray.500") : "gray.500"}
                    />
                  }
                  pointerEvents="none"
                  cursor="default"
                  _hover={{}}
                  _active={{}}
                >
                  {prompt.totalVotes || 0}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<BsCopy />}
                  pointerEvents="none"
                  cursor="default"
                  _hover={{}}
                  _active={{}}
                >
                  {prompt.totalCopies || 0}
                </Button>
              </>
            )}
          </HStack>
        )}
      </Box>
    </Box>
  );
};

export default PromptCard;
