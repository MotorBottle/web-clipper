import { TextExtension } from '@/extensions/common';

const isXiaohongshuUrl = (url: string) => /^https?:\/\/(?:www\.)?xiaohongshu\.com\//i.test(url);
const LAZY_IMAGE_ATTRIBUTES = [
  'data-src',
  'data-original',
  'data-origin',
  'data-actualsrc',
  'data-lazy-src',
  'data-url',
  'data-image',
  'data-echo',
  'srcset',
];

const normalizeUrl = (url: string, baseUrl: string) => {
  const cleaned = (url || '').trim().replace(/^['"]|['"]$/g, '');
  if (!cleaned) {
    return '';
  }
  try {
    return new URL(cleaned, baseUrl).href;
  } catch (error) {
    return cleaned;
  }
};

const srcFromSrcSet = (srcset: string) => {
  const first = (srcset || '')
    .split(',')
    .map((item) => item.trim())
    .find(Boolean);
  if (!first) {
    return '';
  }
  return first.split(/\s+/)[0] || '';
};

const parseBackgroundImageUrls = (style: string) => {
  const urls: string[] = [];
  const regex = /url\(([^)]+)\)/g;
  let match = regex.exec(style);
  while (match) {
    const value = (match[1] || '').trim().replace(/^['"]|['"]$/g, '');
    if (value) {
      urls.push(value);
    }
    match = regex.exec(style);
  }
  return urls;
};

const normalizeImagesForXiaohongshu = ($root: JQuery, $: JQueryStatic, baseUrl: string) => {
  $root.find('img').each((_, element) => {
    const $img = $(element);
    const currentSrc = ($img.attr('src') || '').trim();
    if (currentSrc && !currentSrc.startsWith('data:image')) {
      $img.attr('src', normalizeUrl(currentSrc, baseUrl));
      return;
    }
    for (const attribute of LAZY_IMAGE_ATTRIBUTES) {
      const value = ($img.attr(attribute) || '').trim();
      if (!value) {
        continue;
      }
      const candidate = attribute === 'srcset' ? srcFromSrcSet(value) : value;
      if (!candidate) {
        continue;
      }
      $img.attr('src', normalizeUrl(candidate, baseUrl));
      return;
    }
  });

  $root.find('[style*="background-image"]').each((_, element) => {
    const $element = $(element);
    const style = $element.attr('style') || '';
    const imageUrls = parseBackgroundImageUrls(style).map((url) => normalizeUrl(url, baseUrl));
    if (!imageUrls.length) {
      return;
    }
    if ($element.find('img').length > 0) {
      return;
    }
    imageUrls.forEach((url) => {
      $element.append(
        $('<img />', {
          src: url,
          alt: '',
          'data-web-clipper-bg-image': 'true',
        })
      );
    });
  });
};

const collectImageUrls = ($root: JQuery, $: JQueryStatic, baseUrl: string) => {
  const urls = new Set<string>();
  $root.find('img').each((_, element) => {
    const $img = $(element);
    const src = ($img.attr('src') || '').trim();
    if (src && !src.startsWith('data:image')) {
      urls.add(normalizeUrl(src, baseUrl));
      return;
    }
    const dataSrc = ($img.attr('data-src') || '').trim();
    if (dataSrc) {
      urls.add(normalizeUrl(dataSrc, baseUrl));
    }
  });
  return Array.from(urls).filter(Boolean);
};

const collectImageUrlsFromHtml = (html: string, baseUrl: string) => {
  const urls = new Set<string>();
  const regex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match = regex.exec(html || '');
  while (match) {
    const src = (match[1] || '').trim();
    if (src && !src.startsWith('data:image')) {
      urls.add(normalizeUrl(src, baseUrl));
    }
    match = regex.exec(html || '');
  }
  return urls;
};

const appendMissingImagesToHtml = (html: string, imageUrls: string[], baseUrl: string) => {
  const existingUrls = collectImageUrlsFromHtml(html, baseUrl);
  const missingUrls = imageUrls.filter((url) => !existingUrls.has(url));
  if (!missingUrls.length) {
    return html;
  }
  return `${html}${missingUrls.map((url) => `<p><img src="${url}" alt="" /></p>`).join('')}`;
};

export default new TextExtension(
  {
    name: 'Readability',
    icon: 'copy',
    version: '0.0.1',
    description: 'Intelligent extraction of webpage main content.',
		i18nManifest: {
			'de-DE': { name: 'Lesbarkeit', description: 'Intelligente Extraktion des Hauptinhalts der Webseite.' },
			'en-US': { name: 'Readability', description: 'Intelligent extraction of webpage main content.' },
			'ja-JP': { name: '読みやすさ', description: 'ウェブページの主要な内容をインテリジェントに抽出します。' },
			'ko-KR': { name: '가독성', description: '웹 페이지의 주요 내용을 지능적으로 추출합니다.' },
			'ru-RU': { name: 'Читаемость', description: 'Интеллектуальная извлечение основного содержимого веб-страницы.' },
			'zh-CN': { name: '智能提取', description: '智能提取当前页面元素' },
		}
	},
  {
    run: async context => {
      const { turndown, document, Readability, $ } = context;
      const baseUrl = document.location.href;
      const isXiaohongshu = isXiaohongshuUrl(document.location.href);
      let documentClone = document.cloneNode(true) as Document;
      const $documentClone = $(documentClone);

      $documentClone
        .find('#skPlayer')
        .remove();

      if (isXiaohongshu) {
        normalizeImagesForXiaohongshu($documentClone, $, baseUrl);
      }

      let article = new Readability(documentClone, {
        keepClasses: true,
      }).parse();

      if (!article || !article.content) {
        return turndown.turndown($documentClone.find('body').html() || '');
      }

      if (isXiaohongshu) {
        const imageUrlsSet = new Set<string>();
        const articleRoot =
          $documentClone.find('article').first().length > 0
            ? $documentClone.find('article').first()
            : $documentClone.find('body').first();
        collectImageUrls(articleRoot, $, baseUrl).forEach((url) => imageUrlsSet.add(url));
        $documentClone.find('.media-container').each((_, element) => {
          collectImageUrls($(element), $, baseUrl).forEach((url) => imageUrlsSet.add(url));
        });
        const imageUrls = Array.from(imageUrlsSet);
        if (imageUrls.length > 0) {
          article.content = appendMissingImagesToHtml(article.content, imageUrls, baseUrl);
        }
      }

      return turndown.turndown(article.content);
    },
  }
);
