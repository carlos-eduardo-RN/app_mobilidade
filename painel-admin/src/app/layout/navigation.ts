export type NavItem = {
  label: string;
  path: string;
};

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Usuários', path: '/usuarios' },
  { label: 'Motoristas', path: '/motoristas' },
  { label: 'Corridas', path: '/corridas' },
  { label: 'Pagamentos', path: '/pagamentos' },
  { label: 'Saques', path: '/saques' },
  { label: 'Categorias', path: '/categorias' },
  { label: 'Relatórios', path: '/relatorios' },
  { label: 'Configurações', path: '/configuracoes' },
];
