import { useState, useRef, useMemo } from 'react';
import {
  Box,
  Button,
  Container,
  Divider,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Textarea,
  VStack,
  useToast,
  useColorModeValue,
  Avatar,
  Center,
  IconButton,
} from '@chakra-ui/react';
import { FiCamera } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../lib/axios';
import { getAvatarUrl } from '../utils/avatar';

interface UserProfile {
  username?: string;
  email?: string;
  bio?: string;
  website?: string;
  avatarUrl?: string;
}

const Settings = () => {
  const { user, updateProfile } = useAuth();
  const [profile, setProfile] = useState<UserProfile>({
    username: user?.username || '',
    email: user?.email || '',
    bio: user?.bio || '',
    website: user?.website || '',
    avatarUrl: user?.avatarUrl || '',
  });
  
  const avatarUrl = useMemo(() => getAvatarUrl(profile.avatarUrl), [profile.avatarUrl]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toast = useToast();
  const queryClient = useQueryClient();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UserProfile) => {
      // Filter out empty strings and undefined values
      const updatedFields = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== '' && value !== undefined)
      );
      
      // If website is provided but not a valid URL, remove it
      if (updatedFields.website && !updatedFields.website.startsWith('http')) {
        delete updatedFields.website;
      }
      
      const response = await axiosInstance.patch('/users/profile', updatedFields);
      return response.data;
    },
    onSuccess: (data) => {
      updateProfile(data);
      toast({
        title: 'Profile updated successfully!',
        status: 'success',
        duration: 3000,
      });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Please try again later.';
      toast({
        title: 'Error updating profile',
        description: errorMessage,
        status: 'error',
        duration: 5000,
      });
    },
  });

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;

    const file = event.target.files[0];
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await axiosInstance.patch('/users/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      updateProfile(response.data);
      setProfile(prev => ({ ...prev, avatarUrl: response.data.avatarUrl }));
      
      toast({
        title: 'Avatar updated successfully!',
        status: 'success',
        duration: 3000,
      });

      // Invalidate all profile-related queries
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
    } catch (error: any) {
      toast({
        title: 'Error updating avatar',
        description: error.response?.data?.message || 'Please try again later.',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profile);
  };

  return (
    <Container maxW="container.md" py={8}>
      <Box bg={bgColor} borderRadius="xl" borderWidth="1px" borderColor={borderColor} p={8}>
        <VStack spacing={8} align="stretch">
          <Box>
            <Heading size="lg" mb={6}>Profile Settings</Heading>
            <Center mb={8}>
              <Box position="relative">
                <Avatar
                  size="2xl"
                  src={avatarUrl}
                  name={profile.username || undefined}
                />
                <IconButton
                  aria-label="Change avatar"
                  icon={<FiCamera />}
                  isRound
                  size="sm"
                  position="absolute"
                  bottom="0"
                  right="0"
                  onClick={() => fileInputRef.current?.click()}
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarChange}
                  accept="image/jpeg,image/png,image/gif"
                  style={{ display: 'none' }}
                />
              </Box>
            </Center>
            <form onSubmit={handleProfileUpdate}>
              <VStack spacing={6} align="stretch">
                <FormControl isRequired={false}>
                  <FormLabel>Username</FormLabel>
                  <Input
                    value={profile.username}
                    onChange={(e) =>
                      setProfile({ ...profile, username: e.target.value })
                    }
                    placeholder="Username"
                  />
                </FormControl>

                <FormControl isRequired={false}>
                  <FormLabel>Email</FormLabel>
                  <Input
                    value={profile.email}
                    onChange={(e) =>
                      setProfile({ ...profile, email: e.target.value })
                    }
                    placeholder="Email"
                    type="email"
                  />
                </FormControl>

                <FormControl isRequired={false}>
                  <FormLabel>Bio</FormLabel>
                  <Textarea
                    value={profile.bio}
                    onChange={(e) =>
                      setProfile({ ...profile, bio: e.target.value })
                    }
                    placeholder="Tell us about yourself"
                    rows={4}
                  />
                </FormControl>

                <FormControl isRequired={false}>
                  <FormLabel>Website</FormLabel>
                  <Input
                    value={profile.website}
                    onChange={(e) =>
                      setProfile({ ...profile, website: e.target.value })
                    }
                    placeholder="https://your-website.com"
                    type="url"
                  />
                </FormControl>

                <Button
                  type="submit"
                  colorScheme="orange"
                  size="lg"
                  isLoading={updateProfileMutation.isPending}
                >
                  Save Changes
                </Button>
              </VStack>
            </form>
          </Box>

          <Divider />

          <Box>
            <Heading size="lg" mb={6}>Account Settings</Heading>
            <VStack spacing={4} align="stretch">
              <Button
                variant="outline"
                colorScheme="red"
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                    // Handle account deletion
                    // TODO: Implement account deletion
                  }
                }}
              >
                Delete Account
              </Button>
            </VStack>
          </Box>
        </VStack>
      </Box>
    </Container>
  );
};

export default Settings;
