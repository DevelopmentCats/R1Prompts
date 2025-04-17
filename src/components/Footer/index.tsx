import { Box, Container, Stack, Text, Link } from '@chakra-ui/react';

const Footer = () => {
  return (
    <Box
      bg="brand.900"
      color="gray.200"
      borderTop="1px solid"
      borderColor="gray.700"
    >
      <Container
        as={Stack}
        maxW="container.xl"
        py={4}
        direction={{ base: 'column', md: 'row' }}
        spacing={4}
        justify={{ base: 'center', md: 'space-between' }}
        align={{ base: 'center', md: 'center' }}
      >
        <Text>© 2024 R1 Prompts. All rights reserved</Text>
        <Stack direction="row" spacing={6}>
          <Link href="#">Privacy</Link>
          <Link href="#">Terms</Link>
          <Link href="#">Contact</Link>
        </Stack>
      </Container>
    </Box>
  );
};

export default Footer;
