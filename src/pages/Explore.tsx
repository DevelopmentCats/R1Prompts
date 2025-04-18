
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Tag,
  TagLabel,
  TagCloseButton,
  Center,
  Icon,
  Heading,
  Flex,
} from '@chakra-ui/react';
import { BsSearch } from 'react-icons/bs';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { axiosInstance } from '../lib/axios';
import { PromptCategory, CATEGORY_DISPLAY_NAMES, Prompt } from '../types/prompt';
import PromptCard from '../components/PromptCard';
import Masonry from 'react-masonry-css';
import SEO from '../components/SEO';
import LoadingLogo from '../components/LoadingLogo';
import { getPromptImageUrl } from '../utils/prompt-images';

interface PromptResponse {
  prompts: Prompt[];
  currentPage: number;
  totalPages: number;
}

interface PopularTag {
  tag: string;
  count: number;
}

const breakpointColumns = {
  default: 3,
  1100: 2,
  700: 1
};

const masonryStyles = {
  '.my-masonry-grid': {
    display: 'flex',
    marginLeft: '-24px',
    width: 'auto',
  },
  '.my-masonry-grid_column': {
    paddingLeft: '24px',
    backgroundClip: 'padding-box',
  },
  '.prompt-card-enter': {
    opacity: 0,
    transform: 'scale(0.9)',
  },
  '.prompt-card-enter-active': {
    opacity: 1,
    transform: 'scale(1)',
    transition: 'opacity 300ms ease-in, transform 300ms ease-in',
  },
  '@keyframes shimmer': {
    '0%': {
      transform: 'translateX(-100%)',
    },
    '100%': {
      transform: 'translateX(100%)',
    },
  },
};

const masonryColumnStyles = {
  display: 'flex',
  flexDirection: 'column' as const,
  height: 'fit-content',
};

const Explore = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PromptCategory | 'All Categories'>('All Categories');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'votes' | 'copies'>('votes');

  // Fetch prompts with infinite scrolling
  const {
    data: promptData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error
  } = useInfiniteQuery<PromptResponse>({
    queryKey: ['prompts', selectedCategory, searchQuery, sortBy, selectedTag],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      params.append('page', String(pageParam));
      params.append('sort', sortBy);
      params.append('limit', '12'); // Increased limit for fewer API calls
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory !== 'All Categories') params.append('category', selectedCategory);
      if (selectedTag) params.append('tag', selectedTag);

      const response = await axiosInstance.get<PromptResponse>(`/prompts?${params.toString()}`);
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.currentPage >= lastPage.totalPages) return undefined;
      return lastPage.currentPage + 1;
    },
    initialPageParam: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });

  // Calculate pagination data
  const paginationData = useMemo(() => {
    if (!promptData?.pages || promptData.pages.length === 0) {
      return {
        totalItems: 0,
        totalPages: 0,
        loadedPages: 0,
        loadedItems: 0
      };
    }
    
    const lastPage = promptData.pages[promptData.pages.length - 1];
    const loadedItems = promptData.pages.reduce((total, page) => total + page.prompts.length, 0);
    
    return {
      totalItems: lastPage.totalPages * lastPage.prompts.length, // Approximate total
      totalPages: lastPage.totalPages,
      loadedPages: promptData.pages.length,
      loadedItems
    };
  }, [promptData?.pages]);

  // Fetch popular tags
  const { data: popularTags = [] } = useQuery<PopularTag[]>({
    queryKey: ['popularTags'],
    queryFn: async () => {
      const response = await axiosInstance.get<PopularTag[]>('/prompts/tags/popular');
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Merge prompts from all pages and sort them on the client side
  const allPrompts = useMemo(() => {
    if (!promptData?.pages) return [];
    
    // Flatten all pages into a single array
    const flattenedPrompts = promptData.pages.flatMap(page => page.prompts);
    
    // Apply client-side sorting to maintain consistent sort order
    return [...flattenedPrompts].sort((a, b) => {
      if (sortBy === 'votes') {
        // Sort by votes (descending) and then by date if votes are equal
        return b.totalVotes - a.totalVotes || 
               new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === 'copies') {
        // Sort by copies (descending) and then by date if copies are equal
        return b.totalCopies - a.totalCopies || 
               new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else {
        // Default 'newest' sort - by date (descending)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [promptData?.pages, sortBy]);

  // Store the scroll position before loading new content
  const scrollPositionRef = useRef(0);

  // Handle scroll position when loading new content
  useEffect(() => {
    if (isFetchingNextPage) {
      // Save the current scroll position
      scrollPositionRef.current = window.scrollY;
    } else if (promptData?.pages && promptData.pages.length > 1) {
      // After the new content is rendered, adjust scroll to maintain position
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPositionRef.current);
      });
    }
  }, [isFetchingNextPage, promptData?.pages]);

  // Intersection Observer setup for infinite scrolling
  const observerTarget = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        
        // Only trigger if we're scrolling down and not already loading
        if (firstEntry.isIntersecting && hasNextPage && !isFetchingNextPage && !loadingRef.current) {
          loadingRef.current = true;
          
          // Clear any existing timeout
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
          }

          // Add a small delay before loading the next page
          loadingTimeoutRef.current = setTimeout(() => {
            fetchNextPage().finally(() => {
              loadingRef.current = false;
            });
          }, 500); // 500ms delay between loads
        }
      },
      {
        root: null,
        threshold: 0.5,
        rootMargin: '100px',
      }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Preload images for smoother masonry layout
  useEffect(() => {
    if (allPrompts.length > 0) {
      // Find prompts with images
      const promptsWithImages = allPrompts.filter(p => 
        p.imageUrls && Array.isArray(p.imageUrls) && p.imageUrls.length > 0
      );
      
      // Preload images
      promptsWithImages.forEach((prompt) => {
        if (prompt.imageUrls && Array.isArray(prompt.imageUrls) && prompt.imageUrls.length > 0) {
          // Only preload the first image
          const url = prompt.imageUrls[0];
          if (url) {
            const img = new Image();
            img.src = getPromptImageUrl(url);
          }
        }
      });
    }
  }, [allPrompts]);

  return (
    <>
      <SEO
        title="Explore AI Prompts"
        description="Discover and learn from a vast collection of AI prompts. Browse by category, search for specific topics, and find inspiration for your next project."
        openGraph={{
          title: "Explore AI Prompts - RabbitR1 Prompts",
          description: "Browse our collection of AI prompts, filter by category, and find the perfect prompt for your needs.",
          type: "website",
        }}
      />
      <Box
        minH="calc(100vh - 72px)"
        bg="gray.900"
        position="relative"
        overflow="hidden"
        py={8}
      >
        {/* Background gradient effects */}
        <Box
          position="absolute"
          top="-100px"
          right="-100px"
          w="500px"
          h="500px"
          bg="rabbit.500"
          filter="blur(180px)"
          opacity={0.15}
          borderRadius="full"
          zIndex={0}
        />
        <Box
          position="absolute"
          bottom="-100px"
          left="-100px"
          w="500px"
          h="500px"
          bg="rabbit.400"
          filter="blur(180px)"
          opacity={0.15}
          borderRadius="full"
          zIndex={0}
        />

        <Container maxW="container.xl" position="relative" zIndex={1}>
          {/* Header Section */}
          <VStack spacing={8} align="stretch" mb={12}>
            <Box textAlign="center">
              <Heading 
                as="h1" 
                size="2xl" 
                mb={4}
                bgGradient="linear(to-r, rabbit.500, rabbit.200)"
                bgClip="text"
              >
                Explore Prompts
              </Heading>
              <Text fontSize="lg" color="whiteAlpha.800">
                Discover and share AI-powered prompts with the community
              </Text>
            </Box>

            {/* Search and Filters */}
            <Box 
              bg="whiteAlpha.50" 
              backdropFilter="blur(10px)"
              borderRadius="xl"
              p={6}
              border="1px solid"
              borderColor="whiteAlpha.100"
            >
              <VStack spacing={4}>
                <HStack spacing={4} width="100%" wrap="wrap">
                  <InputGroup flex={1} minW={{ base: "100%", md: "320px" }}>
                    <InputLeftElement pointerEvents="none">
                      <Icon as={BsSearch} color="gray.300" />
                    </InputLeftElement>
                    <Input
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                      }}
                      placeholder="Search prompts..."
                      variant="filled"
                      bg="whiteAlpha.50"
                      _hover={{ bg: "whiteAlpha.100" }}
                      _focus={{ bg: "whiteAlpha.100" }}
                    />
                  </InputGroup>

                  <Select
                    value={selectedCategory}
                    onChange={(e) => {
                      const value = e.target.value as PromptCategory | 'All Categories';
                      setSelectedCategory(value);
                    }}
                    placeholder="All Categories"
                  >
                    <option value="All Categories">All Categories</option>
                    {Object.values(PromptCategory).map((value) => (
                      <option key={value} value={value}>
                        {CATEGORY_DISPLAY_NAMES[value as PromptCategory]}
                      </option>
                    ))}
                  </Select>

                  <Select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value as 'newest' | 'votes' | 'copies');
                    }}
                    variant="filled"
                    bg="whiteAlpha.50"
                    _hover={{ bg: "whiteAlpha.100" }}
                    minW={{ base: "100%", md: "150px" }}
                  >
                    <option value="newest">Newest</option>
                    <option value="votes">Most Voted</option>
                    <option value="copies">Most Copied</option>
                  </Select>
                </HStack>

                {/* Popular Tags Section */}
                <Box width="100%" mt={4}>
                  <Text fontWeight="semibold" mb={2} color="whiteAlpha.800">
                    Popular Tags:
                  </Text>
                  <Flex wrap="wrap" gap={2}>
                    {selectedTag ? (
                      <Tag
                        size="md"
                        colorScheme="rabbit"
                        borderRadius="md"
                        cursor="pointer"
                        onClick={() => {
                          setSelectedTag('');
                        }}
                        bg="rabbit.500"
                        color="white"
                      >
                        <TagLabel>{selectedTag}</TagLabel>
                        <TagCloseButton />
                      </Tag>
                    ) : (
                      popularTags.map(({ tag, count }) => (
                        <Tag
                          key={tag}
                          size="sm"
                          borderRadius="full"
                          variant="subtle"
                          colorScheme="orange"
                          cursor="pointer"
                          onClick={() => {
                            setSelectedTag(tag);
                          }}
                          _hover={{ 
                            opacity: 0.8 
                          }}
                        >
                          <TagLabel>
                            {tag} ({count})
                          </TagLabel>
                        </Tag>
                      ))
                    )}
                  </Flex>
                </Box>
              </VStack>
            </Box>
          </VStack>

          {/* Prompts Grid */}
          <Box css={masonryStyles}>
            {isError ? (
              <Center py={10}>
                <VStack spacing={4}>
                  <Text color="red.500">Error loading prompts</Text>
                  <Text color="whiteAlpha.700">{error?.toString()}</Text>
                </VStack>
              </Center>
            ) : isLoading ? (
              <Center py={10}>
                <VStack spacing={4}>
                  <LoadingLogo />
                  <Text color="gray.500">Loading prompts...</Text>
                </VStack>
              </Center>
            ) : (
              <Box position="relative">
                <Masonry
                  breakpointCols={breakpointColumns}
                  className="my-masonry-grid"
                  columnClassName="my-masonry-grid_column"
                >
                  {allPrompts.map((prompt) => {
                    return (
                      <Box
                        key={prompt.id}
                        className="prompt-card"
                        mb={6}
                        opacity={1}
                        transform="scale(1)"
                        transition="opacity 0.3s ease-in-out, transform 0.3s ease-in-out"
                        _hover={{
                          transform: 'translateY(-4px)',
                        }}
                        width="100%"
                        height="fit-content"
                        sx={masonryColumnStyles}
                      >
                        <PromptCard 
                          prompt={{
                            ...prompt,
                            // Ensure imageUrls is always defined as an array
                            imageUrls: prompt.imageUrls || []
                          }} 
                          interactive 
                          allowVotesAndCopies={false} 
                        />
                      </Box>
                    );
                  })}
                </Masonry>

                {/* Loading indicator */}
                {isFetchingNextPage && (
                  <Center py={8}>
                    <VStack spacing={4}>
                      <LoadingLogo />
                      <Text color="gray.500">Loading more prompts...</Text>
                    </VStack>
                  </Center>
                )}
                
                {/* Intersection observer target */}
                <Box ref={observerTarget} h="10px" />

                {/* No more prompts message */}
                {!isLoading && !hasNextPage && allPrompts.length > 0 && (
                  <Center py={6}>
                    <Text color="whiteAlpha.700">
                      Loaded {paginationData.loadedItems} of approximately {paginationData.totalItems} prompts
                      {paginationData.loadedPages < paginationData.totalPages ? 
                        ` (${paginationData.loadedPages} of ${paginationData.totalPages} pages)` : 
                        ' (All pages loaded)'}
                    </Text>
                  </Center>
                )}

                {/* No prompts found message */}
                {!isLoading && allPrompts.length === 0 && (
                  <Center py={10}>
                    <Text color="whiteAlpha.700">No prompts found matching your criteria</Text>
                  </Center>
                )}
              </Box>
            )}
          </Box>
        </Container>
      </Box>
    </>
  );
};

export default Explore;
