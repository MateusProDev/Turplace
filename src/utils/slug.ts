export function generateSlug(title: string): string {
  const cleanTitle = title.includes('%') ? decodeURIComponent(title) : title;
  return cleanTitle
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
    .trim()
    .replace(/\s+/g, '-') // Substitui espaços por hífens
    .replace(/-+/g, '-') // Remove hífens consecutivos
    .replace(/^-|-$/g, ''); // Remove hífens no início/fim
}