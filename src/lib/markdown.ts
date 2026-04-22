import { marked } from 'marked';

marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Normaliza markdown escrito por autores não-técnicos.
 *
 * Corrige erros comuns como:
 *  - Títulos envolvidos em negrito: "**## Título **" -> "## Título"
 *  - Títulos com 3 asteriscos: "***## Título***"   -> "## Título"
 *  - Títulos inline (sem quebra de linha antes)    -> move para linha própria
 *  - Linhas em branco excessivas
 *  - Espaços NBSP / zero-width
 */
export function normalizeMarkdown(input: string): string {
  if (!input) return '';

  let out = input;

  out = out.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  out = out.replace(/\u00a0/g, ' ').replace(/\u200b/g, '');

  out = out.replace(
    /\*{2,3}\s*(#{1,6})\s+([^\n*]+?)\s*\*{2,3}/g,
    '\n\n$1 $2\n\n',
  );

  out = out.replace(
    /([^\n])[ \t]+(#{2,6})[ \t]+([^\n]+)/g,
    (_m, before: string, hashes: string, rest: string) =>
      `${before}\n\n${hashes} ${rest}`,
  );

  out = out.replace(/^(#{1,6}[^\n]+)\n(?!\n)/gm, '$1\n\n');

  // Codifica espaços em URLs de imagens markdown: ![alt](url com espaço.png) -> ![alt](url%20com%20espaço.png)
  // Sem isso, o marked quebra o parsing no primeiro espaço.
  out = out.replace(/!\[([^\]]*)\]\(([^)]*)\)/g, (_m, alt: string, rest: string) => {
    const titleMatch = rest.match(/\s+(["'][^"']*["'])\s*$/);
    let url = titleMatch ? rest.slice(0, rest.length - titleMatch[0].length) : rest;
    const title = titleMatch ? ' ' + titleMatch[1] : '';
    url = url.trim().replace(/ /g, '%20');
    return `![${alt}](${url}${title})`;
  });

  // O mesmo para links regulares: [texto](url com espaço) -> [texto](url%20com%20espaço)
  out = out.replace(/(^|[^!])\[([^\]]+)\]\(([^)]*)\)/g, (_m, prefix: string, text: string, rest: string) => {
    const titleMatch = rest.match(/\s+(["'][^"']*["'])\s*$/);
    let url = titleMatch ? rest.slice(0, rest.length - titleMatch[0].length) : rest;
    const title = titleMatch ? ' ' + titleMatch[1] : '';
    url = url.trim().replace(/ /g, '%20');
    return `${prefix}[${text}](${url}${title})`;
  });

  out = out.replace(/\n{3,}/g, '\n\n');

  return out.trim();
}

/**
 * Normaliza e renderiza markdown para HTML, pronto para ser usado
 * em dangerouslySetInnerHTML tanto no preview quanto no site.
 */
export function renderBlogMarkdown(md: string): string {
  const normalized = normalizeMarkdown(md);
  return marked.parse(normalized, { async: false }) as string;
}

/**
 * Classe Tailwind aplicada ao container do HTML renderizado.
 *
 * Define estilos explícitos para h1..h4, p, strong, ul, ol, li, a,
 * blockquote, code, pre, hr e img. Isso torna a renderização
 * independente do plugin @tailwindcss/typography (que não está instalado).
 */
export const BLOG_CONTENT_CLASS =
  'max-w-none text-gray-700 ' +
  '[&_h1]:text-3xl [&_h1]:font-extrabold [&_h1]:text-gray-900 [&_h1]:mt-10 [&_h1]:mb-4 [&_h1]:leading-tight ' +
  '[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:leading-tight ' +
  '[&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-gray-900 [&_h3]:mt-8 [&_h3]:mb-3 ' +
  '[&_h4]:text-lg [&_h4]:font-bold [&_h4]:text-gray-900 [&_h4]:mt-6 [&_h4]:mb-2 ' +
  '[&_p]:text-base [&_p]:text-gray-700 [&_p]:leading-relaxed [&_p]:mb-5 ' +
  '[&_strong]:font-bold [&_strong]:text-gray-900 [&_em]:italic ' +
  '[&_a]:text-orange-600 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-orange-700 ' +
  '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-5 [&_ul]:space-y-1.5 ' +
  '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-5 [&_ol]:space-y-1.5 ' +
  '[&_li]:text-gray-700 [&_li]:leading-relaxed ' +
  '[&_blockquote]:border-l-4 [&_blockquote]:border-orange-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_blockquote]:my-5 ' +
  '[&_code]:bg-gray-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono [&_code]:text-orange-600 ' +
  '[&_pre]:bg-gray-900 [&_pre]:text-gray-100 [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:my-5 ' +
  '[&_pre_code]:bg-transparent [&_pre_code]:text-inherit [&_pre_code]:p-0 ' +
  '[&_hr]:my-8 [&_hr]:border-gray-200 ' +
  '[&_img]:rounded-lg [&_img]:my-5 [&_img]:max-w-full [&_img]:h-auto';

/**
 * HTML de placeholder para imagens que falham ao carregar.
 */
export const BROKEN_IMAGE_PLACEHOLDER_HTML =
  '<div class="flex flex-col items-center justify-center gap-2 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-8 my-5 text-gray-400">' +
  '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="3" x2="21" y2="21"></line></svg>' +
  '<span class="text-xs">Imagem não disponível</span>' +
  '</div>';

/**
 * Substitui qualquer <img> que falhe ao carregar por um placeholder amigável.
 * Chame uma vez após o conteúdo do post ser montado no DOM.
 */
export function installBrokenImageFallback(root: HTMLElement | null) {
  if (!root) return;
  const imgs = root.querySelectorAll<HTMLImageElement>('img');
  imgs.forEach((img) => {
    const handler = () => {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = BROKEN_IMAGE_PLACEHOLDER_HTML;
      const placeholder = wrapper.firstElementChild;
      if (placeholder) img.replaceWith(placeholder);
    };
    if (img.complete && img.naturalWidth === 0) {
      handler();
    } else {
      img.addEventListener('error', handler, { once: true });
    }
  });
}
