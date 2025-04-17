import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  config: {
    initialColorMode: 'dark',
    useSystemColorMode: false,
  },
  colors: {
    rabbit: {
      50: '#fff3e6',
      100: '#ffe0c2',
      200: '#ffcd9e',
      300: '#ffb97a',
      400: '#ffa656',
      500: '#ff9333', // Main orange
      600: '#ff7f0f',
      700: '#eb6c00',
      800: '#c75c00',
      900: '#a34b00',
    },
  },
  styles: {
    global: {
      body: {
        bg: 'gray.900',
        color: 'whiteAlpha.900',
      },
    },
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'rabbit',
      },
      variants: {
        solid: {
          bg: 'rabbit.500',
          color: 'white',
          _hover: {
            bg: 'rabbit.600',
          },
        },
        ghost: {
          color: 'whiteAlpha.900',
          _hover: {
            bg: 'whiteAlpha.200',
          },
        },
        outline: {
          borderColor: 'rabbit.500',
          color: 'rabbit.500',
          _hover: {
            bg: 'whiteAlpha.200',
          },
        },
      },
    },
    Link: {
      baseStyle: {
        color: 'whiteAlpha.900',
        _hover: {
          color: 'rabbit.500',
          textDecoration: 'none',
        },
      },
    },
  },
});

export default theme;
