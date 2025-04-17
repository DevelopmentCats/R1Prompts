interface BotInfo {
  name: string;
  userAgents: string[];
  requiresSpecialTags?: boolean;
}

const KNOWN_BOTS: BotInfo[] = [
  {
    name: 'discord',
    userAgents: [
      'discord',
      'discordbot',
      'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
      'Mozilla/5.0 (compatible; DiscordBot/2.0; +https://discordapp.com)'
    ],
    requiresSpecialTags: true
  },
  {
    name: 'slack',
    userAgents: ['slackbot', 'slack-imgproxy'],
    requiresSpecialTags: true
  },
  {
    name: 'twitter',
    userAgents: ['twitterbot', 'twitter'],
    requiresSpecialTags: true
  },
  {
    name: 'facebook',
    userAgents: ['facebookexternalhit', 'facebook', 'fb']
  },
  {
    name: 'linkedin',
    userAgents: ['linkedinbot', 'linkedin']
  },
  {
    name: 'google',
    userAgents: ['google', 'googlebot', 'apis-google']
  },
  {
    name: 'bing',
    userAgents: ['bingbot', 'msnbot']
  },
  {
    name: 'pinterest',
    userAgents: ['pinterest', 'pinterestbot']
  },
  {
    name: 'telegram',
    userAgents: ['telegrambot', 'telegram']
  },
  {
    name: 'whatsapp',
    userAgents: ['whatsapp', 'whatsappbot']
  },
  {
    name: 'reddit',
    userAgents: ['redditbot', 'reddit']
  },
  {
    name: 'skype',
    userAgents: ['skypeuripreview', 'skype']
  },
  {
    name: 'yahoo',
    userAgents: ['yahoo', 'yahoobot']
  },
  {
    name: 'duckduckgo',
    userAgents: ['duckduckbot', 'duckduckgo']
  },
  {
    name: 'yandex',
    userAgents: ['yandexbot', 'yandex']
  }
];

export function detectBot(userAgent: string = ''): BotInfo | null {
  const lowerUserAgent = userAgent.toLowerCase();
  console.log('Checking user agent:', lowerUserAgent);
  
  for (const bot of KNOWN_BOTS) {
    if (bot.userAgents.some(agent => lowerUserAgent.includes(agent.toLowerCase()))) {
      console.log('Matched bot:', bot.name);
      return bot;
    }
  }
  
  return null;
}

export function isBot(userAgent: string = ''): boolean {
  return detectBot(userAgent) !== null;
}
