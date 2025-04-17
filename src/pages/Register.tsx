import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
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
  FormErrorMessage,
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { useAuth } from '../contexts/AuthContext';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const { register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    // Username validation
    if (!username.trim()) {
      newErrors.username = 'Username is required';
    } else if (username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      newErrors.username = 'Username can only contain letters, numbers, underscores, and hyphens';
    }

    // Email validation
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(password)) {
      newErrors.password = 'Password must include at least one uppercase letter, one lowercase letter, one number, and one special character';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Rate limiting check
    const lastAttempt = localStorage.getItem('lastRegistrationAttempt');
    const now = Date.now();
    if (lastAttempt && now - parseInt(lastAttempt) < 1000) { // 1 second delay between attempts
      newErrors.general = 'Please wait before trying again';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await register(username, email, password);
      toast({
        title: 'Registration successful',
        description: 'Welcome to RabbitR1 Prompts!',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      navigate('/prompts/explore');
    } catch (err: any) {
      toast({
        title: 'Registration failed',
        description: err.response?.data?.message || 'Please try again',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
      localStorage.setItem('lastRegistrationAttempt', Date.now().toString());
    }
  };

  return (
    <Container maxW="container.sm" py={8}>
      <VStack spacing={8} align="stretch">
        <Box textAlign="center">
          <Heading size="xl" mb={2}>
            Create Account
          </Heading>
          <Text color="gray.500">
            Join RabbitR1 Prompts Community
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
            <FormControl isRequired isInvalid={!!errors.username}>
              <FormLabel>Username</FormLabel>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                bg="gray.900"
                borderColor="gray.600"
                _hover={{ borderColor: 'orange.500' }}
                _focus={{ borderColor: 'orange.500', boxShadow: 'none' }}
              />
              <FormErrorMessage>{errors.username}</FormErrorMessage>
            </FormControl>

            <FormControl isRequired isInvalid={!!errors.email}>
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
              <FormErrorMessage>{errors.email}</FormErrorMessage>
            </FormControl>

            <FormControl isRequired isInvalid={!!errors.password}>
              <FormLabel>Password</FormLabel>
              <InputGroup>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
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
                  />
                </InputRightElement>
              </InputGroup>
              <FormErrorMessage>{errors.password}</FormErrorMessage>
            </FormControl>

            <FormControl isRequired isInvalid={!!errors.confirmPassword}>
              <FormLabel>Confirm Password</FormLabel>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                bg="gray.900"
                borderColor="gray.600"
                _hover={{ borderColor: 'orange.500' }}
                _focus={{ borderColor: 'orange.500', boxShadow: 'none' }}
              />
              <FormErrorMessage>{errors.confirmPassword}</FormErrorMessage>
            </FormControl>

            {errors.general && (
              <Text color="red.500" mb={4}>
                {errors.general}
              </Text>
            )}

            <Box pt={2} width="100%" display="flex" justifyContent="center">
              <Button
                type="submit"
                colorScheme="orange"
                size="lg"
                width="66%"
                isLoading={isLoading}
                loadingText="Creating Account..."
              >
                Create Account
              </Button>
            </Box>

            <Text textAlign="center">
              Already have an account?{' '}
              <Link as={RouterLink} to="/login" color="orange.400">
                Sign In
              </Link>
            </Text>
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
};

export default Register;
