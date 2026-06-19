import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: string;
  robots?: string;
}

export function useSEO({
  title,
  description,
  keywords = 'InvestingAtti, stock analyst, AI trading, technical analysis, stock research, AI stock analysis, swing trading, stock market education, ETF research, support and resistance',
  canonical,
  ogTitle,
  ogDescription,
  ogImage = 'https://investingatti.com/brand/logo_dark_600x160.png',
  twitterCard = 'summary_large_image',
  robots = 'index, follow',
}: SEOProps) {
  useEffect(() => {
    // 1. Update Title
    document.title = title;

    // Helper function to set or create meta tags
    const setMeta = (name: string, content: string, attrName = 'name') => {
      let element = document.querySelector(`meta[${attrName}="${name}"]`);
      if (content) {
        if (!element) {
          element = document.createElement('meta');
          element.setAttribute(attrName, name);
          document.head.appendChild(element);
        }
        element.setAttribute('content', content);
      } else if (element) {
        element.remove();
      }
    };

    // Helper to set or create links
    const setLink = (rel: string, href: string) => {
      let element = document.querySelector(`link[rel="${rel}"]`);
      if (href) {
        if (!element) {
          element = document.createElement('link');
          element.setAttribute('rel', rel);
          document.head.appendChild(element);
        }
        element.setAttribute('href', href);
      } else if (element) {
        element.remove();
      }
    };

    // 2. Standard Meta
    setMeta('description', description);
    setMeta('keywords', keywords);
    setMeta('robots', robots);

    // 3. Canonical Link
    const finalCanonical = canonical || window.location.href;
    setLink('canonical', finalCanonical);

    // 4. Open Graph
    setMeta('og:title', ogTitle || title, 'property');
    setMeta('og:description', ogDescription || description, 'property');
    setMeta('og:type', 'website', 'property');
    setMeta('og:url', finalCanonical, 'property');
    setMeta('og:image', ogImage, 'property');

    // 5. Twitter Card
    setMeta('twitter:card', twitterCard);
    setMeta('twitter:title', ogTitle || title);
    setMeta('twitter:description', ogDescription || description);
    setMeta('twitter:image', ogImage);

  }, [title, description, keywords, canonical, ogTitle, ogDescription, ogImage, twitterCard, robots]);
}
