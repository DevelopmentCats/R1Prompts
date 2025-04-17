interface SeoConfig {
  title: string;
  titleTemplate: string;
  description: string;
  siteUrl: string;
  openGraph: {
    type: string;
    locale: string;
    url: string;
    siteName: string;
    images: Array<{
      url: string;
      width: number;
      height: number;
      alt: string;
    }>;
  };
  twitter: {
    handle: string;
    site: string;
    cardType: string;
  };
}

const seoConfig: SeoConfig = {
  title: 'RabbitR1 Prompts',
  titleTemplate: '%s | RabbitR1 Prompts',
  description: 'Create, share, and discover AI prompts with the RabbitR1 community.',
  siteUrl: import.meta.env.VITE_APP_URL || 'https://r1prompts.com',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: import.meta.env.VITE_APP_URL || 'https://r1prompts.com',
    siteName: 'RabbitR1 Prompts',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'RabbitR1 Prompts - Create, Share, and Discover AI Prompts',
      },
    ],
  },
  twitter: {
    handle: '@r1prompts',
    site: '@r1prompts',
    cardType: 'summary_large_image',
  },
};

export default seoConfig;
