import {
  Box,
  Container,
  Grid,
  GridItem,
  Heading,
  Text,
  Stack,
  Avatar,
  Button,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  useColorModeValue,
  FormControl,
  FormLabel,
  Input,
  Switch,
  useToast,
} from '@chakra-ui/react';
import { useState } from 'react';

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [userData] = useState({
    username: 'JohnDoe',
    email: 'john@example.com',
    bio: 'R1 enthusiast and prompt engineer',
    notifications: true,
    darkMode: true,
  });
  const toast = useToast();

  const cardBg = useColorModeValue('brand.800', 'brand.900');
  const cardBorder = useColorModeValue('whiteAlpha.200', 'whiteAlpha.100');

  const handleSave = () => {
    setIsEditing(false);
    toast({
      title: 'Profile updated',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  // Mock prompts data
  const userPrompts = [
    {
      id: '1',
      title: 'Smart Assistant Setup',
      category: 'General',
      likes: 45,
      isPublic: true,
    },
    {
      id: '2',
      title: 'Custom UI Generator',
      category: 'Generative UI',
      likes: 32,
      isPublic: false,
    },
  ];

  return (
    <Container maxW="container.xl" py={20}>
      <Grid templateColumns={{ base: '1fr', lg: '300px 1fr' }} gap={8}>
        {/* Profile Sidebar */}
        <GridItem>
          <Box
            bg={cardBg}
            p={6}
            borderRadius="xl"
            border="1px solid"
            borderColor={cardBorder}
          >
            <Stack spacing={6} align="center">
              <Avatar
                size="2xl"
                name={userData.username}
                src="/avatar-placeholder.png"
              />
              <Stack spacing={2} textAlign="center">
                <Heading size="lg">{userData.username}</Heading>
                <Text color="gray.400">{userData.bio}</Text>
              </Stack>
              <Button
                colorScheme="orange"
                variant="outline"
                w="full"
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </Button>
            </Stack>
          </Box>
        </GridItem>

        {/* Main Content */}
        <GridItem>
          <Tabs variant="line" colorScheme="orange">
            <TabList borderBottomColor={cardBorder}>
              <Tab>My Prompts</Tab>
              <Tab>Settings</Tab>
            </TabList>

            <TabPanels>
              {/* My Prompts Panel */}
              <TabPanel px={0}>
                <Stack spacing={4}>
                  {userPrompts.map((prompt) => (
                    <Box
                      key={prompt.id}
                      bg={cardBg}
                      p={6}
                      borderRadius="xl"
                      border="1px solid"
                      borderColor={cardBorder}
                    >
                      <Grid templateColumns="1fr auto" gap={4} alignItems="center">
                        <Stack spacing={1}>
                          <Heading size="md">{prompt.title}</Heading>
                          <Text color="gray.400">
                            Category: {prompt.category} • {prompt.likes} likes
                          </Text>
                        </Stack>
                        <Stack direction="row" spacing={2}>
                          <Button size="sm" variant="ghost">
                            Edit
                          </Button>
                          <Button size="sm" colorScheme="red" variant="ghost">
                            Delete
                          </Button>
                        </Stack>
                      </Grid>
                    </Box>
                  ))}
                </Stack>
              </TabPanel>

              {/* Settings Panel */}
              <TabPanel px={0}>
                <Box
                  bg={cardBg}
                  p={6}
                  borderRadius="xl"
                  border="1px solid"
                  borderColor={cardBorder}
                >
                  <Stack spacing={6}>
                    <FormControl>
                      <FormLabel>Username</FormLabel>
                      <Input
                        value={userData.username}
                        isReadOnly={!isEditing}
                        bg="brand.700"
                        border="1px solid"
                        borderColor="whiteAlpha.200"
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel>Email</FormLabel>
                      <Input
                        value={userData.email}
                        isReadOnly={!isEditing}
                        bg="brand.700"
                        border="1px solid"
                        borderColor="whiteAlpha.200"
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel>Bio</FormLabel>
                      <Input
                        value={userData.bio}
                        isReadOnly={!isEditing}
                        bg="brand.700"
                        border="1px solid"
                        borderColor="whiteAlpha.200"
                      />
                    </FormControl>

                    <Stack spacing={4}>
                      <FormControl display="flex" alignItems="center">
                        <FormLabel htmlFor="notifications" mb="0">
                          Email Notifications
                        </FormLabel>
                        <Switch
                          id="notifications"
                          isChecked={userData.notifications}
                          colorScheme="orange"
                          isDisabled={!isEditing}
                        />
                      </FormControl>

                      <FormControl display="flex" alignItems="center">
                        <FormLabel htmlFor="darkMode" mb="0">
                          Dark Mode
                        </FormLabel>
                        <Switch
                          id="darkMode"
                          isChecked={userData.darkMode}
                          colorScheme="orange"
                          isDisabled={!isEditing}
                        />
                      </FormControl>
                    </Stack>

                    {isEditing && (
                      <Stack direction="row" spacing={4}>
                        <Button
                          colorScheme="orange"
                          onClick={handleSave}
                        >
                          Save Changes
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setIsEditing(false)}
                        >
                          Cancel
                        </Button>
                      </Stack>
                    )}
                  </Stack>
                </Box>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </GridItem>
      </Grid>
    </Container>
  );
};

export default Profile;
