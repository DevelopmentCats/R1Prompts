import {
  Container,
  Heading,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Stack,
  Text,
  Flex,
  Tag,
  TagLabel,
  HStack,
  Box,
  Center
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '../../lib/axios';
import { Link } from 'react-router-dom';
import { PromptCategory, CATEGORY_DISPLAY_NAMES } from '../../types/prompt';
import PromptCard from '../../components/PromptCard';
import Masonry from 'react-masonry-css';
import LoadingLogo from '../../components/LoadingLogo';

interface Prompt {
  id: string;
  title: string;
  description: string;
  category: PromptCategory;
  author: {
    id: string;
    username: string;
  };
  totalVotes: number;
  createdAt: string;
  imageUrls: string[];
  tags: string[];
}

interface ExtendedPrompt extends Prompt {
  hasVoted?: boolean;
  hasCopied?: boolean;
}

type SortOption = 'recent' | 'votes';

const breakpointColumns = {
  default: 3,
  1100: 2,
  700: 1
};

const PromptExplore = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PromptCategory | ''>('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  // Query for popular tags
  const { data: popularTags } = useQuery({
    queryKey: ['popularTags'],
    queryFn: async () => {
      const response = await axiosInstance.get<string[]>('/prompts/popular-tags');
      return response.data;
    },
  });

  const { data: prompts, isLoading, error } = useQuery({
    queryKey: ['prompts', searchQuery, selectedCategory, selectedTag, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedTag) params.append('tag', selectedTag);
      params.append('sort', sortBy);

      const response = await axiosInstance.get<ExtendedPrompt[]>(`/prompts?${params}`);
      return response.data;
    },
  });

  return (
    <Container maxW="container.xl" py={8}>
      <Stack spacing={8}>
        <Stack spacing={4}>
          <Heading>Explore Prompts</Heading>
          <Flex gap={4} wrap={{ base: 'wrap', md: 'nowrap' }}>
            <InputGroup flex="2">
              <InputLeftElement pointerEvents="none">
                <SearchIcon color="gray.300" />
              </InputLeftElement>
              <Input
                placeholder="Search prompts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                bg="brand.700"
                borderColor="whiteAlpha.200"
                _hover={{
                  borderColor: 'accent.500',
                }}
                _focus={{
                  borderColor: 'accent.500',
                  boxShadow: '0 0 0 1px var(--chakra-colors-accent-500)',
                }}
              />
            </InputGroup>
            <Select
              placeholder="All Categories"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as PromptCategory | '')}
              bg="brand.700"
              borderColor="whiteAlpha.200"
              _hover={{
                borderColor: 'accent.500',
              }}
              _focus={{
                borderColor: 'accent.500',
                boxShadow: '0 0 0 1px var(--chakra-colors-accent-500)',
              }}
              flex="1"
            >
              {Object.values(PromptCategory).map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_DISPLAY_NAMES[category]}
                </option>
              ))}
            </Select>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              bg="brand.700"
              borderColor="whiteAlpha.200"
              _hover={{
                borderColor: 'accent.500',
              }}
              _focus={{
                borderColor: 'accent.500',
                boxShadow: '0 0 0 1px var(--chakra-colors-accent-500)',
              }}
              flex="1"
            >
              <option value="recent">Most Recent</option>
              <option value="votes">Most Voted</option>
            </Select>
          </Flex>

          {/* Popular Tags */}
          {popularTags && popularTags.length > 0 && (
            <Box>
              <Text mb={2} color="whiteAlpha.700">Popular Tags:</Text>
              <HStack spacing={2} wrap="wrap">
                {popularTags.map((tag) => (
                  <Tag
                    key={tag}
                    size="md"
                    variant={selectedTag === tag ? "solid" : "subtle"}
                    colorScheme="orange"
                    cursor="pointer"
                    onClick={() => setSelectedTag(selectedTag === tag ? '' : tag)}
                    _hover={{ opacity: 0.8 }}
                  >
                    <TagLabel>{tag}</TagLabel>
                  </Tag>
                ))}
              </HStack>
            </Box>
          )}
        </Stack>

        {isLoading && (
          <Center py={10}>
            <LoadingLogo />
          </Center>
        )}
        {error ? (
          <Text color="red.500">Error loading prompts</Text>
        ) : (
          <Box
            css={{
              '.my-masonry-grid': {
                display: 'flex',
                marginLeft: '-24px',
                width: 'auto'
              },
              '.my-masonry-grid_column': {
                paddingLeft: '24px',
                backgroundClip: 'padding-box'
              }
            }}
          >
            <Masonry
              breakpointCols={breakpointColumns}
              className="my-masonry-grid"
              columnClassName="my-masonry-grid_column"
            >
              {prompts?.map((prompt) => (
                <Box key={prompt.id} mb={6}>
                  <Link 
                    to={`/prompts/${prompt.id}`}
                    style={{ display: 'block' }}
                  >
                    <PromptCard
                      prompt={{
                        ...prompt,
                        isPublic: true,
                        authorSafe: prompt.author,
                        totalCopies: 0,
                        totalVotes: prompt.totalVotes || 0,
                        tags: prompt.tags || [],
                      }}
                      showAuthorLink={false}
                    />
                  </Link>
                </Box>
              ))}
            </Masonry>
          </Box>
        )}
      </Stack>
    </Container>
  );
};

export default PromptExplore;
