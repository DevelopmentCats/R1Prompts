import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Text,
  Link,
  useToast,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { useState } from 'react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // TODO: Implement Firebase authentication
      
      toast({
        title: 'Login successful',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Login failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxW="container.sm" py={20}>
      <Box
        bg="brand.800"
        p={8}
        borderRadius="xl"
        boxShadow="xl"
        border="1px solid"
        borderColor="whiteAlpha.200"
      >
        <Stack spacing={6}>
          <Stack spacing={2} textAlign="center">
            <Heading size="xl">Welcome Back</Heading>
            <Text color="gray.400">
              Enter your credentials to access your account
            </Text>
          </Stack>

          <form onSubmit={handleLogin}>
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  bg="brand.700"
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                  _hover={{
                    borderColor: 'whiteAlpha.300',
                  }}
                  _focus={{
                    borderColor: 'accent.500',
                    boxShadow: '0 0 0 1px var(--chakra-colors-accent-500)',
                  }}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Password</FormLabel>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  bg="brand.700"
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                  _hover={{
                    borderColor: 'whiteAlpha.300',
                  }}
                  _focus={{
                    borderColor: 'accent.500',
                    boxShadow: '0 0 0 1px var(--chakra-colors-accent-500)',
                  }}
                />
              </FormControl>

              <Button
                type="submit"
                colorScheme="orange"
                size="lg"
                fontSize="md"
                isLoading={isLoading}
              >
                Sign In
              </Button>
            </Stack>
          </form>

          <Stack spacing={4} textAlign="center">
            <Text>
              Don't have an account?{' '}
              <Link as={RouterLink} to="/register" color="accent.400">
                Sign up
              </Link>
            </Text>
            <Link color="accent.400" fontSize="sm">
              Forgot your password?
            </Link>
          </Stack>
        </Stack>
      </Box>
    </Container>
  );
};

export default Login;
