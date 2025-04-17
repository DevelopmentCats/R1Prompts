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
  FormHelperText,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { useState } from 'react';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Passwords do not match',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Implement Firebase registration
      toast({
        title: 'Registration successful',
        description: 'Welcome to R1 Prompts!',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Registration failed',
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
            <Heading size="xl">Create an Account</Heading>
            <Text color="gray.400">
              Join the R1 Prompts community and start sharing your knowledge
            </Text>
          </Stack>

          <form onSubmit={handleRegister}>
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Username</FormLabel>
                <Input
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
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
                <FormHelperText>
                  This will be your public display name
                </FormHelperText>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
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
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
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
                <FormHelperText>
                  Must be at least 8 characters long
                </FormHelperText>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Confirm Password</FormLabel>
                <Input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
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
                Create Account
              </Button>
            </Stack>
          </form>

          <Text textAlign="center">
            Already have an account?{' '}
            <Link as={RouterLink} to="/login" color="accent.400">
              Sign in
            </Link>
          </Text>
        </Stack>
      </Box>
    </Container>
  );
};

export default Register;
