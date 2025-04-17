import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
  SimpleGrid,
  Flex,
  Icon,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { BsCommand, BsSearch, BsPeople } from 'react-icons/bs';
import SEO from '../components/SEO';

const Home = () => {
  const features = [
    {
      icon: BsCommand,
      title: 'Create Prompts',
      description: 'Design and share your own AI prompts with the community.',
    },
    {
      icon: BsSearch,
      title: 'Explore',
      description: 'Discover prompts created by other users and learn from them.',
    },
    {
      icon: BsPeople,
      title: 'Collaborate',
      description: 'Work together to improve and refine prompts.',
    },
  ];

  return (
    <>
      <SEO
        title="Create and Share AI Prompts"
        description="Join RabbitR1 Prompts to create, share, and discover AI prompts. Build a community of prompt engineers and enthusiasts."
        openGraph={{
          title: "RabbitR1 Prompts - Create and Share AI Prompts",
          description: "Join our community to create and discover AI prompts. Connect with prompt engineers and enthusiasts.",
          type: "website",
        }}
      />
      <Box
        position="relative"
        minH="calc(100vh - 72px)"
        bg="gray.900"
        overflow="hidden"
      >
        {/* Gradient orbs */}
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

        <Container maxW="container.xl" position="relative" py={20}>
          <VStack spacing={12} textAlign="center" mb={20}>
            <VStack spacing={6}>
              <Heading
                as="h1"
                fontSize={{ base: "4xl", md: "6xl" }}
                fontWeight="bold"
                bgGradient="linear(to-r, rabbit.400, rabbit.500)"
                bgClip="text"
                letterSpacing="tight"
              >
                RabbitR1 Prompts
              </Heading>
              <Text
                fontSize={{ base: "xl", md: "2xl" }}
                color="whiteAlpha.900"
                maxW="3xl"
                lineHeight="tall"
              >
                Your platform for creating, sharing, and discovering AI prompts.
                Join our community and unlock the potential of AI-powered conversations.
              </Text>
            </VStack>
            <Button
              as={RouterLink}
              to="/prompts/create"
              size="lg"
              px={8}
              fontSize="lg"
              height="60px"
              _hover={{
                transform: 'translateY(-2px)',
                boxShadow: '0 0 20px rgba(255, 147, 51, 0.4)',
              }}
              transition="all 0.2s"
            >
              Create Your First Prompt
            </Button>
          </VStack>

          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={10}>
            {features.map((feature) => (
              <Box
                key={feature.title}
                bg="rgba(17, 17, 17, 0.7)"
                backdropFilter="blur(10px)"
                border="1px"
                borderColor="whiteAlpha.200"
                p={8}
                rounded="xl"
                position="relative"
                overflow="hidden"
                transition="all 0.2s"
                _hover={{
                  transform: 'translateY(-4px)',
                  borderColor: 'rabbit.500',
                  '& .feature-icon': {
                    color: 'rabbit.500',
                  },
                }}
              >
                <Flex
                  direction="column"
                  align="center"
                  textAlign="center"
                  position="relative"
                  zIndex={1}
                >
                  <Icon
                    as={feature.icon}
                    boxSize={10}
                    mb={4}
                    className="feature-icon"
                    color="whiteAlpha.900"
                    transition="all 0.2s"
                  />
                  <Heading
                    as="h3"
                    size="lg"
                    mb={4}
                    bgGradient="linear(to-r, rabbit.400, rabbit.500)"
                    bgClip="text"
                  >
                    {feature.title}
                  </Heading>
                  <Text color="whiteAlpha.800">{feature.description}</Text>
                </Flex>
              </Box>
            ))}
          </SimpleGrid>
        </Container>
      </Box>
    </>
  );
};

export default Home;
