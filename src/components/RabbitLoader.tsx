import { Box } from '@chakra-ui/react';

const RabbitLoader = () => {
  return (
    <Box
      width="48px"
      height="48px"
      display="inline-block"
      sx={{
        '@keyframes hop': {
          '0%': {
            transform: 'translateY(0) rotate(0deg)',
          },
          '25%': {
            transform: 'translateY(-20px) rotate(-5deg)',
          },
          '50%': {
            transform: 'translateY(0) rotate(0deg)',
          },
          '75%': {
            transform: 'translateY(-10px) rotate(5deg)',
          },
          '100%': {
            transform: 'translateY(0) rotate(0deg)',
          },
        },
        animation: 'hop 1s infinite ease-in-out',
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 4C8.27167 4 5.33333 7.35333 5.33333 11.0833C5.33333 14.2333 7.46667 16.9083 10.3333 17.6667V20H8V22H16V20H13.6667V17.6667C16.5333 16.9083 18.6667 14.2333 18.6667 11.0833C18.6667 7.35333 15.7283 4 12 4ZM12 6C14.4667 6 16.6667 8.2 16.6667 11.0833C16.6667 13.9667 14.4667 16.1667 12 16.1667C9.53333 16.1667 7.33333 13.9667 7.33333 11.0833C7.33333 8.2 9.53333 6 12 6Z"
          fill="#F6AD55"
        />
        <circle cx="10" cy="10" r="1.5" fill="#F6AD55" />
        <circle cx="14" cy="10" r="1.5" fill="#F6AD55" />
      </svg>
    </Box>
  );
};

export default RabbitLoader;
