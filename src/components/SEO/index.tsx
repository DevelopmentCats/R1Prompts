import { Helmet } from 'react-helmet-async';
import seoConfig from '../../config/seo';

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  openGraph?: {
    title?: string;
    description?: string;
    url?: string;
    type?: string;
    image?: string;
    imageAlt?: string;
    imageWidth?: number;
    imageHeight?: number;
    siteName?: string;
    color?: string;
  };
  noindex?: boolean;
}

const SEO: React.FC<SEOProps> = ({
  title,
  description = seoConfig.description,
  canonical,
  openGraph,
  noindex = false,
}) => {
  const pageTitle = title
    ? title.includes('RabbitR1 Prompts')
      ? title
      : seoConfig.titleTemplate.replace('%s', title)
    : seoConfig.title;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const canonicalUrl = canonical || currentUrl;

  const ogTitle = openGraph?.title || pageTitle;
  const ogDescription = openGraph?.description || description;
  const ogUrl = openGraph?.url || canonicalUrl;
  const ogType = openGraph?.type || seoConfig.openGraph.type;
  const ogImage = openGraph?.image || seoConfig.openGraph.images[0].url;
  const ogImageAlt = openGraph?.imageAlt || seoConfig.openGraph.images[0].alt;
  const ogImageWidth = openGraph?.imageWidth || seoConfig.openGraph.images[0].width;
  const ogImageHeight = openGraph?.imageHeight || seoConfig.openGraph.images[0].height;
  const ogSiteName = openGraph?.siteName || seoConfig.openGraph.siteName;
  const ogColor = openGraph?.color || '#5865F2'; // Discord brand color as default

  const isDevelopment = import.meta.env.DEV;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      {isDevelopment && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph / Discord */}
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={ogDescription} />
      <meta property="og:url" content={ogUrl} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={ogSiteName} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content={ogImageAlt} />
      <meta property="og:image:width" content={String(ogImageWidth)} />
      <meta property="og:image:height" content={String(ogImageHeight)} />
      <meta property="og:locale" content={seoConfig.openGraph.locale} />
      <meta name="theme-color" content={ogColor} />

      {/* Twitter */}
      <meta name="twitter:card" content={seoConfig.twitter.cardType} />
      <meta name="twitter:site" content={seoConfig.twitter.site} />
      <meta name="twitter:creator" content={seoConfig.twitter.handle} />
      <meta name="twitter:title" content={ogTitle} />
      <meta name="twitter:description" content={ogDescription} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
};

export default SEO;
