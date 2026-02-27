import { TextExtension } from '@/extensions/common';

const isXiaohongshuUrl = (url: string) => /^https?:\/\/(?:www\.)?xiaohongshu\.com\//i.test(url);
const LAZY_IMAGE_ATTRIBUTES = [
  'imgsrc',
  'data-imgsrc',
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

const XIAOHONGSHU_SLIDER_SELECTORS = [
  '.xhs-slider-container',
  '[class*="xhs-slider-container"]',
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

const isValidImageCandidate = (value: string) => {
  const v = (value || '').trim().toLowerCase();
  if (!v) {
    return false;
  }
  if (v.startsWith('data:image') || v.startsWith('blob:')) {
    return false;
  }
  if (v === 'true' || v === 'false' || v === 'null' || v === 'undefined') {
    return false;
  }
  return true;
};

const getImageCandidate = ($img: JQuery, baseUrl: string) => {
  for (const attribute of LAZY_IMAGE_ATTRIBUTES) {
    const value = ($img.attr(attribute) || '').trim();
    if (!value) {
      continue;
    }
    const candidate = attribute === 'srcset' ? srcFromSrcSet(value) : value;
    if (!isValidImageCandidate(candidate)) {
      continue;
    }
    return normalizeUrl(candidate, baseUrl);
  }
  const currentSrc = ($img.attr('src') || '').trim();
  if (isValidImageCandidate(currentSrc)) {
    return normalizeUrl(currentSrc, baseUrl);
  }
  return '';
};

const normalizeImagesForXiaohongshu = ($root: JQuery, $: JQueryStatic, baseUrl: string) => {
  $root.find('img').each((_, element) => {
    const $img = $(element);
    const src = getImageCandidate($img, baseUrl);
    if (src) {
      $img.attr('src', src);
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

const pushUnique = (result: string[], seen: Set<string>, url: string) => {
  if (!url || seen.has(url)) {
    return;
  }
  seen.add(url);
  result.push(url);
};

const isDuplicatedSlideNode = ($node: JQuery) => {
  return (
    $node.closest('[class*="swiper-slide-duplicate"]').length > 0 ||
    $node.closest('[class*="slick-cloned"]').length > 0
  );
};

const collectImageUrlsInOrder = ($root: JQuery, $: JQueryStatic, baseUrl: string) => {
  const result: string[] = [];
  const seen = new Set<string>();
  $root
    .find(
      'img, [imgsrc], [data-imgsrc], [data-src], [data-origin], [data-original], [data-actualsrc], [style*="background-image"]'
    )
    .each((_, element) => {
      const $element = $(element);
      if (isDuplicatedSlideNode($element)) {
        return;
      }
      if (($element.attr('style') || '').includes('background-image')) {
        const style = ($element.attr('style') || '').trim();
        parseBackgroundImageUrls(style)
          .map((url) => normalizeUrl(url, baseUrl))
          .forEach((url) => pushUnique(result, seen, url));
        return;
      }
      const url = getImageCandidate($element, baseUrl);
      if (url) {
        pushUnique(result, seen, url);
      }
    });
  return result;
};

const collectSliderImageUrls = ($root: JQuery, $: JQueryStatic, baseUrl: string) => {
  const mergedUrls: string[] = [];
  const mergedSeen = new Set<string>();
  const visited = new Set<Element>();
  XIAOHONGSHU_SLIDER_SELECTORS.forEach((selector) => {
    $root.find(selector).each((_, element) => {
      if (visited.has(element)) {
        return;
      }
      visited.add(element);
      const $container = $(element);
      const urls = collectImageUrlsInOrder($container, $, baseUrl);
      urls.forEach((url) => pushUnique(mergedUrls, mergedSeen, url));
    });
  });
  return mergedUrls;
};

const stripAllImagesFromHtml = (html: string) => {
  return (html || '').replace(/<img[^>]*>/gi, '');
};

const appendImagesToHtml = (html: string, imageUrls: string[]) => {
  if (!imageUrls.length) {
    return html;
  }
  return `${html}${imageUrls.map((url) => `<p><img src="${url}" alt="" /></p>`).join('')}`;
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
        const sliderImageUrls = collectSliderImageUrls($documentClone, $, baseUrl);
        if (sliderImageUrls.length > 0) {
          article.content = stripAllImagesFromHtml(article.content);
          article.content = appendImagesToHtml(article.content, sliderImageUrls);
        }
      }

      return turndown.turndown(article.content);
    },
  }
);
