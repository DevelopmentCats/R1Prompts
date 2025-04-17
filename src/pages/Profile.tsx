import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Avatar,
  Button,
  useColorModeValue,
  useToast,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Link,
  Icon,
  Center
} from '@chakra-ui/react';
import { FiSettings } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { axiosInstance } from '../lib/axios';
import PromptCard from '../components/PromptCard';
import LoadingLogo from '../components/LoadingLogo';
import SEO from '../components/SEO';
import { PromptCategory } from '../types/prompt';
import { getAvatarUrl } from '../utils/avatar';
import Masonry from 'react-masonry-css';

const breakpointColumns = {
  default: 3,
  1100: 2,
  700: 1
};

interface UserProfile {
  id: string;
  username: string;
  bio?: string;
  website?: string;
  avatarUrl?: string;
}

interface UserPrompt {
  id: string;
  title: string;
  description: string;
  category: PromptCategory;
  likes: number;
  totalCopies: number;
  totalViews: number;
  createdAt: string;
  tags: string[];
  imageUrls?: string[];
  isPublic: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  author: {
    id: string;
    username: string;
  };
}

const Profile = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isOwnProfile = !userId || userId === user?.id;
  const targetUserId = isOwnProfile ? user?.id : userId;

  const toast = useToast();
  const queryClient = useQueryClient();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const accentColor = useColorModeValue('orange.500', 'orange.300');

  const { data: profileData, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ['profile', targetUserId],
    queryFn: async () => {
      try {
        const endpoint = isOwnProfile ? '/users/profile' : `/users/byId/${targetUserId}`;
        const response = await axiosInstance.get(endpoint);
        return response.data;
      } catch (error: any) {
        if (error?.response?.status === 404) {
          toast({
            title: 'Profile not found',
            description: 'The requested user profile could not be found.',
            status: 'error',
            duration: 5000,
          });
          navigate('/prompts/explore');
        } else {
          toast({
            title: 'Error loading profile',
            description: error?.response?.data?.message || 'Failed to load profile',
            status: 'error',
            duration: 5000,
          });
        }
        throw error;
      }
    },
    enabled: !!targetUserId,
    retry: false,
  });

  const { data: userPrompts, isLoading: promptsLoading } = useQuery<UserPrompt[]>({
    queryKey: ['userPrompts', targetUserId],
    queryFn: async () => {
      try {
        const response = await axiosInstance.get(`/prompts/byUserId/${targetUserId}`);
        return response.data;
      } catch (error: any) {
        if (error?.response?.status === 404) {
          return []; // Return empty array if no prompts found
        }
        toast({
          title: 'Error loading prompts',
          description: error?.response?.data?.message || 'Failed to load prompts',
          status: 'error',
          duration: 5000,
        });
        throw error;
      }
    },
    enabled: !!targetUserId,
    retry: false,
  });

  const deletePromptMutation = useMutation({
    mutationFn: async (promptId: string) => {
      await axiosInstance.delete(`/prompts/${promptId}`);
    },
    onSuccess: () => {
      queryClient.setQueryData(['userPrompts', targetUserId], (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.filter((prompt: any) => prompt.id !== deletePromptMutation.variables);
      });

      queryClient.invalidateQueries({ queryKey: ['userPrompts', targetUserId] });

      toast({
        title: 'Prompt deleted',
        status: 'success',
        duration: 3000,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting prompt',
        description: error?.response?.data?.message || 'Failed to delete prompt',
        status: 'error',
        duration: 5000,
      });
    },
  });

  const handleDeletePrompt = (promptId: string) => {
    if (window.confirm('Are you sure you want to delete this prompt?')) {
      deletePromptMutation.mutate(promptId);
    }
  };

  if (profileLoading) {
    return (
      <Center py={10}>
        <LoadingLogo />
      </Center>
    );
  }

  if (!profileData) {
    return (
      <Box height="100vh" display="flex" alignItems="center" justifyContent="center">
        <Text>User not found</Text>
      </Box>
    );
  }

  return (
    <>
      <SEO
        title={`${profileData.username || 'User'}'s Profile`}
        description={profileData ? `View ${profileData.username}'s AI prompts and contributions to the RabbitR1 Prompts community.` : 'Loading user profile...'}
        openGraph={{
          title: `${profileData.username || 'User'}'s Profile - RabbitR1 Prompts`,
          description: profileData ? `Check out ${profileData.username}'s AI prompts and activity on RabbitR1 Prompts.` : 'Loading user profile...',
          type: 'profile',
          image: getAvatarUrl(profileData.avatarUrl),
          imageAlt: `${profileData.username}'s profile picture`,
        }}
        noindex={!profileData}
      />
      <Container maxW="container.xl" py={8}>
        <Box bg={bgColor} borderRadius="xl" borderWidth="1px" borderColor={borderColor} overflow="hidden">
          {/* Profile Header */}
          <Box p={8} bg={accentColor} color="white">
            <HStack spacing={8} align="center" justify="space-between">
              <HStack spacing={4}>
                <Avatar size="2xl" name={profileData.username} src={getAvatarUrl(profileData.avatarUrl)} />
                <VStack align="start" spacing={2}>
                  <Heading size="2xl">{profileData.username}</Heading>
                </VStack>
              </HStack>
              {isOwnProfile && (
                <Button
                  as={RouterLink}
                  to="/settings"
                  colorScheme="whiteAlpha"
                  leftIcon={<Icon as={FiSettings} />}
                >
                  Settings
                </Button>
              )}
            </HStack>
          </Box>

          <Tabs>
            <TabList px={6}>
              <Tab>Profile</Tab>
              <Tab>Prompts</Tab>
            </TabList>

            <TabPanels>
              <TabPanel>
                <VStack spacing={6} align="stretch">
                  {profileData.bio && (
                    <Box>
                      <Text fontWeight="bold" mb={2}>Bio</Text>
                      <Text>{profileData.bio}</Text>
                    </Box>
                  )}
                  {profileData.website && (
                    <Box>
                      <Text fontWeight="bold" mb={2}>Website</Text>
                      <Link href={profileData.website} isExternal color="blue.500">
                        {profileData.website}
                      </Link>
                    </Box>
                  )}
                </VStack>
              </TabPanel>

              <TabPanel>
                {promptsLoading ? (
                  <Center py={10}>
                    <LoadingLogo />
                  </Center>
                ) : userPrompts?.length ? (
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
                      {userPrompts.map((prompt) => (
                        <Box key={prompt.id} mb={6}>
                          <PromptCard
                            prompt={{
                              ...prompt,
                              likes: prompt.likes || 0,
                              tags: prompt.tags || [],
                              imageUrls: prompt.imageUrls || [],
                              isPublic: prompt.isPublic,
                              authorSafe: {
                                id: profileData.id,
                                username: profileData.username,
                              },
                            }}
                            isOwner={prompt.canEdit}
                            showAuthorLink={false}
                            onDelete={prompt.canDelete ? () => handleDeletePrompt(prompt.id) : undefined}
                            interactive={false}
                          />
                        </Box>
                      ))}
                    </Masonry>
                  </Box>
                ) : (
                  <Box textAlign="center" py={10}>
                    <Text fontSize="lg" color="gray.500">
                      {isOwnProfile
                        ? "You haven't created any prompts yet."
                        : "This user hasn't created any prompts yet."}
                    </Text>
                    {isOwnProfile && (
                      <Button
                        colorScheme="orange"
                        mt={4}
                        onClick={() => navigate('/prompts/create')}
                      >
                        Create Your First Prompt
                      </Button>
                    )}
                  </Box>
                )}
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </Container>
    </>
  );
};

export default Profile;
