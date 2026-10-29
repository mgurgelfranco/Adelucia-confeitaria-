export type ArtTheme =
  | 'bolo-tradicional'
  | 'bolo-vintage'
  | 'bolo-milfolhas'
  | 'bolo-pintado'
  | 'bolo-coracao'
  | 'bolo-baby'
  | 'bolo-andar'
  | 'bolo-chocolate'
  | 'bolo-afetivo'
  | 'cake-brownie'
  | 'brigadeiro-tradicional'
  | 'brigadeiro-especiais'
  | 'brigadeiro-premium'
  | 'bombom'
  | 'doces-scrap'
  | 'sobremesa-taca'
  | 'cheesecake'
  | 'fatia-bolo';

const THEME_TO_REAL_PHOTO: Record<ArtTheme, string> = {
  'bolo-tradicional': '/assets/produtos/bolo-tradicional.jpg',
  'bolo-vintage': '/assets/produtos/bolo-vintage.jpg',
  'bolo-milfolhas': '/assets/produtos/bolo-milfolhas.jpg',
  'bolo-pintado': '/assets/produtos/bolo-pintado.jpg',
  'bolo-coracao': '/assets/produtos/bolo-coracao.jpg',
  'bolo-baby': '/assets/produtos/bolo-baby.jpg',
  'bolo-andar': '/assets/produtos/bolo-andar.jpg',
  'bolo-chocolate': '/assets/produtos/bolo-chocolate-belga.jpg',
  'bolo-afetivo': '/assets/produtos/bolo-afetivo.jpg',
  'cake-brownie': '/assets/produtos/cake-brownie-esp.jpg',
  'brigadeiro-tradicional': '/assets/produtos/caixa-brigadeiros.jpg',
  'brigadeiro-especiais': '/assets/produtos/caixa-brigadeiros.jpg',
  'brigadeiro-premium': '/assets/produtos/caixa-brigadeiros.jpg',
  bombom: '/assets/produtos/caixa-brigadeiros.jpg',
  'doces-scrap': '/assets/produtos/doces-scrap.jpg',
  'sobremesa-taca': '/assets/produtos/brownie-taca.jpg',
  cheesecake: '/assets/produtos/cheesecake.jpg',
  'fatia-bolo': '/assets/produtos/fatia-personalizada.jpg',
};

export function createPatisserieSvgUrl(theme: ArtTheme, _label?: string): string {
  return THEME_TO_REAL_PHOTO[theme] || '/assets/produtos/bolo-vintage.jpg';
}
