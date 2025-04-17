import {
  Box,
  Flex,
  Button,
  useColorModeValue,
  Stack,
  Container,
  Image,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  Avatar,
  Text,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { HamburgerIcon, ChevronDownIcon } from '@chakra-ui/icons';
import { useAuth } from '../../contexts/AuthContext';
import { getAvatarUrl } from '../../utils/avatar';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();

  const avatarUrl = getAvatarUrl(user?.avatarUrl);

  return (
    <Box
      position="sticky"
      top={0}
      zIndex={1000}
      bg={useColorModeValue('brand.800', 'brand.900')}
      px={4}
      backdropFilter="blur(10px)"
      borderBottom="1px solid"
      borderColor={useColorModeValue('gray.200', 'gray.700')}
    >
      <Container maxW="container.xl">
        <Flex h={16} alignItems="center" justifyContent="space-between">
          <RouterLink to="/">
            <Image h="40px" src="/logo.svg" alt="R1 Prompts" />
          </RouterLink>

          {/* Desktop Navigation */}
          <Stack
            direction="row"
            spacing={8}
            alignItems="center"
            display={{ base: 'none', md: 'flex' }}
          >
            <RouterLink to="/prompts/explore">
              <Button variant="ghost">Explore</Button>
            </RouterLink>
            {isAuthenticated && (
              <RouterLink to="/prompts/create">
                <Button variant="ghost">Create</Button>
              </RouterLink>
            )}
            {!isAuthenticated ? (
              <RouterLink to="/login">
                <Button variant="solid">Sign In</Button>
              </RouterLink>
            ) : (
              <Menu>
                <MenuButton
                  as={Button}
                  variant="ghost"
                  rightIcon={<ChevronDownIcon />}
                  display="flex"
                  alignItems="center"
                  px={2}
                >
                  <Flex alignItems="center" gap={2}>
                    <Box boxSize="32px" borderRadius="full" overflow="hidden">
                      <Avatar
                        size="sm"
                        src={avatarUrl}
                        name={user?.username || undefined}
                      />
                    </Box>
                    <Text>{user?.username}</Text>
                  </Flex>
                </MenuButton>
                <MenuList>
                  <MenuItem as={RouterLink} to="/profile">
                    Profile
                  </MenuItem>
                  {user?.isAdmin && (
                    <MenuItem as={RouterLink} to="/admin">
                      Admin Panel
                    </MenuItem>
                  )}
                  <MenuItem onClick={logout}>
                    Sign Out
                  </MenuItem>
                </MenuList>
              </Menu>
            )}
          </Stack>

          {/* Mobile Navigation */}
          <Box display={{ base: 'block', md: 'none' }}>
            <Menu>
              <MenuButton
                as={IconButton}
                aria-label="Menu"
                icon={<HamburgerIcon />}
                variant="ghost"
              />
              <MenuList>
                <MenuItem as={RouterLink} to="/prompts/explore">
                  Explore
                </MenuItem>
                {isAuthenticated && (
                  <MenuItem as={RouterLink} to="/prompts/create">
                    Create
                  </MenuItem>
                )}
                {isAuthenticated ? (
                  <>
                    <MenuItem as={RouterLink} to="/profile">
                      Profile
                    </MenuItem>
                    {user?.isAdmin && (
                      <MenuItem as={RouterLink} to="/admin">
                        Admin Panel
                      </MenuItem>
                    )}
                    <MenuItem onClick={logout}>Sign Out</MenuItem>
                  </>
                ) : (
                  <MenuItem as={RouterLink} to="/login">
                    Sign In
                  </MenuItem>
                )}
              </MenuList>
            </Menu>
          </Box>
        </Flex>
      </Container>
    </Box>
  );
};

export default Navbar;
