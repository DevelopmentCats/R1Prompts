import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Text,
  Link,
  useToast,
  Container,
  Heading,
  InputGroup,
  InputRightElement,
  IconButton,
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic input validation
    if (!email.trim() || !password.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);

    try {
      await login(email, password);
      toast({
        title: 'Login successful',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err: any) {
      toast({
        title: 'Login failed',
        description: err.message || 'Please check your credentials',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxW="container.sm" py={8}>
      <VStack spacing={8} align="stretch">
        <Box textAlign="center">
          <Heading size="xl" mb={2}>
            Welcome Back
          </Heading>
          <Text color="gray.500">
            Sign in to continue to RabbitR1 Prompts
          </Text>
        </Box>

        <Box
          p={4}
          bg="gray.700"
          borderRadius="lg"
          borderLeft="4px"
          borderColor="orange.400"
        >
          <Text color="gray.200" fontSize="sm">
            ⚠️ This is a Community Website made by Cat. Please do not use Official Rabbit Credentials.
          </Text>
        </Box>

        <Box
          as="form"
          onSubmit={handleSubmit}
          bg="gray.800"
          p={8}
          borderRadius="xl"
          boxShadow="xl"
          border="1px"
          borderColor="gray.700"
        >
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel>Email</FormLabel>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                bg="gray.900"
                borderColor="gray.600"
                _hover={{ borderColor: 'orange.500' }}
                _focus={{ borderColor: 'orange.500', boxShadow: 'none' }}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Password</FormLabel>
              <InputGroup>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  bg="gray.900"
                  borderColor="gray.600"
                  _hover={{ borderColor: 'orange.500' }}
                  _focus={{ borderColor: 'orange.500', boxShadow: 'none' }}
                />
                <InputRightElement>
                  <IconButton
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                    onClick={() => setShowPassword(!showPassword)}
                    variant="ghost"
                    colorScheme="orange"
                    size="sm"
                  />
                </InputRightElement>
              </InputGroup>
            </FormControl>

            <Box pt={2} width="100%" display="flex" justifyContent="center">
              <Button
                type="submit"
                colorScheme="orange"
                size="lg"
                width="66%"
                isLoading={isLoading}
                loadingText="Signing in..."
              >
                Sign In
              </Button>
            </Box>
          </VStack>
        </Box>

        <Text textAlign="center">
          Don't have an account?{' '}
          <Link as={RouterLink} to="/register" color="orange.500">
            Sign up
          </Link>
        </Text>
      </VStack>
    </Container>
  );
};

export default Login;
