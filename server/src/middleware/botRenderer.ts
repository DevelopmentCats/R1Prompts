import { Request, Response, NextFunction } from 'express';
import { detectBot } from '../utils/botDetector';
import NodeCache from 'node-cache';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { Prompt, PromptCategory } from '../entities/Prompt';
import path from 'path';

// Cache responses for 5 minutes
const cache = new NodeCache({ stdTTL: 300 });

interface MetaData {
  title: string;
  description: string;
  image: string;
  url: string;
  type: string;
  siteName: string;
  imageAlt?: string;
  authorName?: string;
  publishedTime?: string;
  themeColor?: string;
  keywords?: string[];
  section?: string;
  breadcrumbs?: Array<{ name: string; url: string }>;
}

export const botRenderer = async (req: Request, res: Response, next: NextFunction) => {
  // Skip bot rendering for API routes and static files
  if (req.path.startsWith('/api/') || req.path.includes('.')) {
    console.log('Skipping bot rendering for:', req.path);
    return next();
  }

  const userAgent = req.headers['user-agent'] || '';
  console.log('Bot Renderer - Request details:', {
    path: req.path,
    userAgent,
    headers: req.headers,
    ip: req.ip,
    forwardedFor: req.headers['x-forwarded-for']
  });

  const bot = detectBot(userAgent);
  if (bot) {
    console.log('Bot detected:', {
      name: bot.name,
      userAgent,
      requiresSpecialTags: bot.requiresSpecialTags
    });
    
    // Add debug header
    res.setHeader('X-Bot-Detected', bot.name);
  }
  
  // If not a bot, proceed with normal request handling
  if (!bot) {
    console.log('No bot detected, proceeding with normal request');
    return next();
  }

  try {
    const path = req.path;
    const cacheKey = `bot_render_${bot.name}_${path}`;
    
    // Check cache first
    const cachedHtml = cache.get<string>(cacheKey);
    if (cachedHtml) {
      console.log('Serving cached response for bot:', bot.name);
      res.setHeader('X-Bot-Response', 'cached');
      res.send(cachedHtml);
      return;
    }

    console.log('Generating meta tags for path:', path);
    const metaTags = await generateMetaTags(path, bot);
    if (!metaTags) {
      console.log('No meta tags generated, falling back to default handling');
      return next();
    }

    // Add base URL to all URLs in meta tags
    const baseUrl = process.env.VITE_APP_URL || 'https://dev.r1prompts.com';
    const html = generateHtml(metaTags).replace(/undefined\//g, baseUrl + '/');
    
    cache.set(cacheKey, html);
    console.log('Serving fresh response for bot:', bot.name);
    res.setHeader('X-Bot-Response', 'fresh');
    res.send(html);
  } catch (error) {
    console.error('Error in bot renderer:', error);
    next();
  }
};

async function generateMetaTags(path: string, bot: { name: string; requiresSpecialTags?: boolean }): Promise<string | null> {
  const promptMatch = path.match(/\/prompts\/([^\/]+)/);
  const userMatch = path.match(/\/users\/([^\/]+)/);
  const exploreMatch = path.match(/^\/explore\/?$/);
  const baseUrl = process.env.VITE_APP_URL || 'https://dev.r1prompts.com';

  let meta: MetaData = {
    title: 'RabbitR1 Prompts',
    description: 'Create, share, and discover AI prompts with the RabbitR1 community.',
    image: `${baseUrl}/api/uploads/og-default.png`,
    url: `${baseUrl}${path}`,
    type: 'website',
    siteName: 'RabbitR1 Prompts',
    themeColor: '#FF9333',
    keywords: ['AI prompts', 'prompt engineering', 'AI community', 'prompt sharing'],
    breadcrumbs: [{ name: 'Home', url: '/' }]
  };

  if (promptMatch) {
    const promptId = promptMatch[1];
    const promptRepository = AppDataSource.getRepository(Prompt);
    const prompt = await promptRepository.findOne({
      where: { id: promptId },
      relations: ['author']
    });

    if (prompt) {
      const imageUrl = prompt.imageUrls?.[0] ? `${baseUrl}${prompt.imageUrls[0]}` : meta.image;
      meta = {
        ...meta,
        title: `${prompt.title} | RabbitR1 Prompts`,
        description: prompt.description || `A prompt by ${prompt.author?.username}`,
        image: imageUrl,
        url: `${baseUrl}/prompts/${promptId}`,
        type: 'article',
        authorName: prompt.author?.username,
        publishedTime: prompt.createdAt.toISOString(),
        imageAlt: `Preview of ${prompt.title}`,
        section: 'Prompts',
        keywords: [...(meta.keywords || []), ...prompt.tags, prompt.category],
        breadcrumbs: [
          { name: 'Home', url: '/' },
          { name: 'Prompts', url: '/explore' },
          { name: prompt.title, url: `/prompts/${promptId}` }
        ]
      };
    }
  } else if (userMatch) {
    const userId = userMatch[1];
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: userId },
      relations: ['prompts']
    });

    if (user) {
      meta = {
        ...meta,
        title: `${user.username}'s Profile | RabbitR1 Prompts`,
        description: `Check out ${user.username}'s profile and their ${user.promptsGenerated} prompts on RabbitR1 Prompts.`,
        image: user.avatarUrl ? `${baseUrl}${user.avatarUrl}` : meta.image,
        url: `${baseUrl}/users/${userId}`,
        type: 'profile',
        section: 'Users',
        keywords: [...(meta.keywords || []), 'user profile', user.username],
        breadcrumbs: [
          { name: 'Home', url: '/' },
          { name: 'Users', url: '/users' },
          { name: user.username, url: `/users/${userId}` }
        ]
      };
    }
  } else if (exploreMatch) {
    meta = {
      ...meta,
      title: 'Explore Prompts | RabbitR1 Prompts',
      description: 'Discover and explore AI prompts shared by the RabbitR1 community.',
      type: 'website',
      section: 'Explore',
      breadcrumbs: [
        { name: 'Home', url: '/' },
        { name: 'Explore', url: '/explore' }
      ]
    };
  }

  // Platform-specific optimizations
  const platformMeta = generatePlatformSpecificMeta(meta, bot);
  
  return platformMeta;
}

function generatePlatformSpecificMeta(meta: MetaData, bot: { name: string; requiresSpecialTags?: boolean }): string {
  // Ensure meta values are properly escaped for HTML
  const escapeHtml = (str: string) => str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const safeTitle = escapeHtml(meta.title);
  const safeDescription = escapeHtml(meta.description);
  const safeSiteName = escapeHtml(meta.siteName);
  const safeAuthorName = meta.authorName ? escapeHtml(meta.authorName) : '';
  const safeImageAlt = meta.imageAlt ? escapeHtml(meta.imageAlt) : safeTitle;

  let tags = `
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDescription}">
    ${meta.keywords?.length ? `<meta name="keywords" content="${meta.keywords.map(escapeHtml).join(', ')}">` : ''}
    <link rel="canonical" href="${meta.url}">
    
    <!-- Basic Meta -->
    <meta name="robots" content="max-snippet:-1, max-image-preview:large, max-video-preview:-1">
    <meta name="author" content="${safeAuthorName || safeSiteName}">
    ${meta.section ? `<meta name="section" content="${escapeHtml(meta.section)}">` : ''}
    ${meta.publishedTime ? `<meta name="article:published_time" content="${meta.publishedTime}">` : ''}
    
    <!-- Open Graph -->
    <meta property="og:title" content="${safeTitle}">
    <meta property="og:description" content="${safeDescription}">
    <meta property="og:image" content="${meta.image}">
    <meta property="og:image:secure_url" content="${meta.image}">
    <meta property="og:url" content="${meta.url}">
    <meta property="og:type" content="${meta.type}">
    <meta property="og:site_name" content="${safeSiteName}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:type" content="image/png">
    <meta property="og:image:alt" content="${safeImageAlt}">
    <meta property="og:locale" content="en_US">
    
    <!-- Discord -->
    <meta name="theme-color" content="${meta.themeColor || '#FF9333'}">
    <meta property="discord:image" content="${meta.image}">
    <meta property="discord:image:width" content="1200">
    <meta property="discord:image:height" content="630">
    <meta property="discord:image:alt" content="${safeImageAlt}">
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${safeTitle}">
    <meta name="twitter:description" content="${safeDescription}">
    <meta name="twitter:image" content="${meta.image}">
    <meta name="twitter:image:alt" content="${safeImageAlt}">`;

  // Add structured data
  if (meta.type === 'article') {
    tags += `
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "${safeTitle}",
        "description": "${safeDescription}",
        "image": "${meta.image}",
        "author": {
          "@type": "Person",
          "name": "${safeAuthorName}"
        },
        ${meta.publishedTime ? `"datePublished": "${meta.publishedTime}",` : ''}
        "publisher": {
          "@type": "Organization",
          "name": "${safeSiteName}",
          "logo": {
            "@type": "ImageObject",
            "url": "${meta.image}"
          }
        },
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": "${meta.url}"
        }
      }
    </script>`;
  }

  return tags;
}

function generateHtml(metaTags: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    ${metaTags}
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;
}
