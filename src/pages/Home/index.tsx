import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  Stack,
  Image,
  useColorModeValue,
  Grid,
  GridItem,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';

const Home = () => {
  const bgGradient = useColorModeValue(
    'linear(to-r, brand.800, brand.900)',
    'linear(to-r, brand.900, black)'
  );

  return (
    <Box>
      {/* Hero Section */}
      <Box
        bgGradient={bgGradient}
        position="relative"
        overflow="hidden"
      >
        <Container maxW="container.xl" py={{ base: 20, md: 32 }}>
          <Grid
            templateColumns={{ base: '1fr', lg: '1fr 1fr' }}
            gap={8}
            alignItems="center"
          >
            <GridItem>
              <Stack spacing={6}>
                <Heading
                  as="h1"
                  fontSize={{ base: '4xl', md: '5xl', lg: '6xl' }}
                  fontWeight="bold"
                  lineHeight="shorter"
                  color="whiteAlpha.900"
                >
                  Unlock the Full Potential of Your{' '}
                  <Text as="span" color="accent.400">
                    Rabbit R1
                  </Text>
                </Heading>
                <Text
                  fontSize={{ base: 'lg', md: 'xl' }}
                  color="whiteAlpha.800"
                  maxW="600px"
                >
                  Discover, create, and share powerful prompts that transform how you interact with your R1 device. Join our community of innovators.
                </Text>
                <Stack direction={{ base: 'column', sm: 'row' }} spacing={4}>
                  <Button
                    as={RouterLink}
                    to="/prompts/explore"
                    size="lg"
                    colorScheme="orange"
                    px={8}
                  >
                    Explore Prompts
                  </Button>
                  <Button
                    as={RouterLink}
                    to="/register"
                    size="lg"
                    variant="outline"
                    px={8}
                    _hover={{
                      bg: 'whiteAlpha.200',
                    }}
                  >
                    Join Community
                  </Button>
                </Stack>
              </Stack>
            </GridItem>
            <GridItem display={{ base: 'none', lg: 'block' }}>
              <Box position="relative">
                <Image
                  src="/r1-device.png"
                  alt="Rabbit R1 Device"
                  w="full"
                  maxW="500px"
                  mx="auto"
                />
              </Box>
            </GridItem>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxW="container.xl" py={20}>
        <Grid
          templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }}
          gap={8}
        >
          {features.map((feature, index) => (
            <GridItem key={index}>
              <Stack spacing={4} p={6} bg="brand.800" borderRadius="xl">
                <Box color="accent.400" fontSize="3xl">
                  {feature.icon}
                </Box>
                <Heading as="h3" size="md" color="whiteAlpha.900">
                  {feature.title}
                </Heading>
                <Text color="whiteAlpha.800">{feature.description}</Text>
              </Stack>
            </GridItem>
          ))}
        </Grid>
      </Container>

      {/* Categories Section */}
      <Box bg="brand.800" py={20}>
        <Container maxW="container.xl">
          <Heading
            as="h2"
            size="xl"
            mb={12}
            textAlign="center"
            color="whiteAlpha.900"
          >
            Explore Prompt Categories
          </Heading>
          <Grid
            templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }}
            gap={8}
          >
            {categories.map((category, index) => (
              <GridItem key={index}>
                <Box
                  as={RouterLink}
                  to={`/prompts/explore?category=${category.id}`}
                  p={6}
                  bg="brand.700"
                  borderRadius="xl"
                  transition="all 0.3s"
                  _hover={{
                    transform: 'translateY(-4px)',
                    shadow: 'xl',
                  }}
                >
                  <Heading as="h3" size="md" mb={2} color="whiteAlpha.900">
                    {category.name}
                  </Heading>
                  <Text color="whiteAlpha.800">{category.description}</Text>
                </Box>
              </GridItem>
            ))}
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

const features = [
  {
    icon: '🚀',
    title: 'Powerful Prompts',
    description: 'Access a curated collection of prompts designed for optimal R1 performance.',
  },
  {
    icon: '🤝',
    title: 'Community Driven',
    description: 'Share your prompts and learn from other R1 enthusiasts.',
  },
  {
    icon: '🎯',
    title: 'Category Focused',
    description: 'Find exactly what you need with our organized prompt categories.',
  },
  {
    icon: '⚡',
    title: 'Always Updated',
    description: 'Stay current with the latest prompt engineering techniques.',
  },
];

const categories = [
  {
    id: 'general',
    name: 'General',
    description: 'Universal prompts for everyday tasks and interactions.',
  },
  {
    id: 'generative-ui',
    name: 'Generative UI',
    description: 'Prompts focused on interface generation and visual tasks.',
  },
  {
    id: 'teach-mode',
    name: 'Teach Mode',
    description: 'Educational prompts to help R1 learn new skills.',
  },
  {
    id: 'lam',
    name: 'LAM',
    description: 'Large Action Model specific prompts for complex tasks.',
  },
];

export default Home;
