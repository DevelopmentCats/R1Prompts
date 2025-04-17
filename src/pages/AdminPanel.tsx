import React, { useState } from 'react';
import {
  Box,
  Container,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  TabPanel,
  Tab,
  Stat,
  StatLabel,
  StatNumber,
  SimpleGrid,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  Center,
  ButtonGroup,
  Switch
} from '@chakra-ui/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../lib/axios';
import { useNavigate } from 'react-router-dom';

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

interface User {
  id: string;
  username: string;
  isAdmin: boolean;
  createdAt: string;
  promptsGenerated: number;
  promptsCount: number;
}

interface Prompt {
  id: string;
  title: string;
  authorSafe: {
    username: string;
  };
  createdAt: string;
}

interface Metrics {
  totalUsers: number;
  totalPrompts: number;
  recentUsers: number;
  recentPrompts: number;
  totalPromptsGenerated: number;
}

const AdminPanel: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [userToDelete, setUserToDelete] = React.useState<string | null>(null);
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  // Pagination state
  const [userPage, setUserPage] = useState(1);
  const [promptPage, setPromptPage] = useState(1);
  const limit = 10;

  // Fetch users with pagination
  const { data: usersData } = useQuery<PaginatedResponse<User>>({
    queryKey: ['admin', 'users', userPage],
    queryFn: async () => {
      const response = await axiosInstance.get(`/users/admin/users?page=${userPage}&limit=${limit}`);
      return response.data;
    },
  });

  // Fetch prompts with pagination
  const { data: promptsData } = useQuery<PaginatedResponse<Prompt>>({
    queryKey: ['admin', 'prompts', promptPage],
    queryFn: async () => {
      const response = await axiosInstance.get(`/prompts/admin/all?page=${promptPage}&limit=${limit}`);
      return response.data;
    },
  });

  // Fetch metrics
  const { data: metrics } = useQuery<Metrics>({
    queryKey: ['admin', 'metrics'],
    queryFn: async () => {
      const response = await axiosInstance.get('/users/admin/metrics');
      return response.data;
    },
  });

  // Toggle admin status mutation
  const toggleAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await axiosInstance.patch(`/users/admin/users/${userId}/toggle-admin`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast({
        title: 'Success',
        description: 'Admin status updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update admin status',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await axiosInstance.delete(`/users/admin/users/${userId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'metrics'] });
      toast({
        title: 'Success',
        description: 'User deleted successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onClose();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete user',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      onClose();
    },
  });

  // Delete prompt mutation
  const deletePromptMutation = useMutation({
    mutationFn: async (promptId: string) => {
      const response = await axiosInstance.delete(`/prompts/admin/${promptId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'prompts'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'metrics'] });
      toast({
        title: 'Success',
        description: 'Prompt deleted successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete prompt',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    },
  });

  const handleDeleteUser = (userId: string) => {
    setUserToDelete(userId);
    onOpen();
  };

  const confirmDelete = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete);
    }
  };

  return (
    <Container maxW="container.xl" py={8}>
      <Heading mb={8}>Admin Panel</Heading>
      <Tabs>
        <TabList>
          <Tab>Dashboard</Tab>
          <Tab>Users</Tab>
          <Tab>Prompts</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
              <Stat>
                <StatLabel>Total Users</StatLabel>
                <StatNumber>{metrics?.totalUsers || 0}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Total Prompts</StatLabel>
                <StatNumber>{metrics?.totalPrompts || 0}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel>New Users (7 days)</StatLabel>
                <StatNumber>{metrics?.recentUsers || 0}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel>New Prompts (7 days)</StatLabel>
                <StatNumber>{metrics?.recentPrompts || 0}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Total Prompts Generated</StatLabel>
                <StatNumber>{metrics?.totalPromptsGenerated || 0}</StatNumber>
              </Stat>
            </SimpleGrid>
          </TabPanel>

          <TabPanel>
            <Box overflowX="auto">
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Username</Th>
                    <Th>Created At</Th>
                    <Th>Prompts Created</Th>
                    <Th>Prompts Generated</Th>
                    <Th>Admin</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {usersData?.items?.map((user) => (
                    <Tr key={user.id}>
                      <Td>{user.username}</Td>
                      <Td>{new Date(user.createdAt).toLocaleDateString()}</Td>
                      <Td>{user.promptsCount}</Td>
                      <Td>{user.promptsGenerated}</Td>
                      <Td>
                        <Switch
                          isChecked={user.isAdmin}
                          onChange={() => toggleAdminMutation.mutate(user.id)}
                        />
                      </Td>
                      <Td>
                        <Button
                          colorScheme="red"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          Delete
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
              {(usersData?.totalPages ?? 0) > 1 && (
                <Center mt={4}>
                  <ButtonGroup>
                    <Button
                      onClick={() => setUserPage(p => Math.max(1, p - 1))}
                      isDisabled={userPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      onClick={() => setUserPage(p => Math.min(usersData?.totalPages ?? 1, p + 1))}
                      isDisabled={userPage === (usersData?.totalPages ?? 1)}
                    >
                      Next
                    </Button>
                  </ButtonGroup>
                </Center>
              )}
            </Box>
          </TabPanel>

          <TabPanel>
            <Box overflowX="auto">
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Title</Th>
                    <Th>Author</Th>
                    <Th>Created At</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {promptsData?.items?.map((prompt) => (
                    <Tr key={prompt.id}>
                      <Td>{prompt.title}</Td>
                      <Td>{prompt.authorSafe?.username || 'Unknown'}</Td>
                      <Td>{new Date(prompt.createdAt).toLocaleDateString()}</Td>
                      <Td>
                        <ButtonGroup>
                          <Button
                            colorScheme="blue"
                            size="sm"
                            onClick={() => navigate(`/prompt/${prompt.id}`)}
                          >
                            View
                          </Button>
                          <Button
                            colorScheme="red"
                            size="sm"
                            onClick={() => deletePromptMutation.mutate(prompt.id)}
                          >
                            Delete
                          </Button>
                        </ButtonGroup>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
              {(promptsData?.totalPages ?? 0) > 1 && (
                <Center mt={4}>
                  <ButtonGroup>
                    <Button
                      onClick={() => setPromptPage(p => Math.max(1, p - 1))}
                      isDisabled={promptPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      onClick={() => setPromptPage(p => Math.min(promptsData?.totalPages ?? 1, p + 1))}
                      isDisabled={promptPage === (promptsData?.totalPages ?? 1)}
                    >
                      Next
                    </Button>
                  </ButtonGroup>
                </Center>
              )}
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>

      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete User
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={confirmDelete} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Container>
  );
};

export default AdminPanel;
