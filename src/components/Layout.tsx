import {
  Box,
  Container,
  Flex,
  Button,
  HStack,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Avatar,
  Link,
  useColorModeValue,
} from '@chakra-ui/react';
import { Link as RouterLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAvatarUrl } from '../utils/avatar';
import { useMemo } from 'react';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Move all color mode values to the top
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const navBgColor = useColorModeValue('rgba(255, 255, 255, 0.9)', 'rgba(26, 32, 44, 0.9)');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const linkColor = useColorModeValue('gray.700', 'gray.200');
  const buttonHoverBg = useColorModeValue('gray.100', 'gray.700');
  const avatarHoverColor = useColorModeValue('orange.600', 'orange.500');
  const adminPanelColor = useColorModeValue('red.500', 'red.500');

  const avatarUrl = useMemo(() => getAvatarUrl(user?.avatarUrl), [user?.avatarUrl]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box minH="100vh" bg={bgColor}>
      <Box
        as="nav"
        position="sticky"
        top={0}
        zIndex={10}
        bg={navBgColor}
        backdropFilter="blur(10px)"
        borderBottom="1px"
        borderColor={borderColor}
        shadow="sm"
      >
        <Container maxW="container.xl" py={4}>
          <Flex justify="space-between" align="center">
            <HStack spacing={8}>
              <Link
                as={RouterLink}
                to="/"
                fontSize="3xl"
                fontWeight="extrabold"
                color="orange.500"
                _hover={{ color: avatarHoverColor, textDecoration: 'none' }}
                display="flex"
                alignItems="center"
                letterSpacing="tight"
              >
                R1Prompts
              </Link>
              <HStack spacing={8}>
                <Link
                  as={RouterLink}
                  to="/prompts/explore"
                  color={linkColor}
                  fontWeight="medium"
                  _hover={{ color: 'rabbit.500', transform: 'translateY(-1px)' }}
                  transition="all 0.2s"
                >
                  Explore
                </Link>
                {user && (
                  <>
                    <Link
                      as={RouterLink}
                      to="/prompts/generate"
                      color={linkColor}
                      fontWeight="medium"
                      _hover={{ color: 'rabbit.500', transform: 'translateY(-1px)' }}
                      transition="all 0.2s"
                    >
                      Generate
                    </Link>
                    <Link
                      as={RouterLink}
                      to="/prompts/create"
                      color={linkColor}
                      fontWeight="medium"
                      _hover={{ color: 'rabbit.500', transform: 'translateY(-1px)' }}
                      transition="all 0.2s"
                    >
                      Create
                    </Link>
                  </>
                )}
              </HStack>
            </HStack>

            <HStack spacing={4}>
              {user ? (
                <Menu>
                  <MenuButton 
                    as={Button} 
                    variant="ghost" 
                    p={1}
                    height="40px"
                    width="40px"
                    borderRadius="full"
                  >
                    <Avatar 
                      size="md" 
                      name={user.username} 
                      src={avatarUrl}
                    />
                  </MenuButton>
                  <MenuList>
                    <MenuItem as={RouterLink} to="/profile">
                      Profile
                    </MenuItem>
                    {user.isAdmin && (
                      <MenuItem as={RouterLink} to="/admin" color={adminPanelColor}>
                        Admin Panel
                      </MenuItem>
                    )}
                    <MenuItem as={RouterLink} to="/settings">
                      Settings
                    </MenuItem>
                    <MenuItem onClick={handleLogout}>
                      Sign Out
                    </MenuItem>
                  </MenuList>
                </Menu>
              ) : (
                <>
                  <Button
                    as={RouterLink}
                    to="/login"
                    variant="ghost"
                    size="md"
                    _hover={{ bg: buttonHoverBg }}
                  >
                    Sign In
                  </Button>
                  <Button
                    as={RouterLink}
                    to="/register"
                    size="md"
                    variant="solid"
                    colorScheme="orange"
                  >
                    Sign Up
                  </Button>
                </>
              )}
            </HStack>
          </Flex>
        </Container>
      </Box>
      <Box as="main" flex={1}>
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
