// Rodada 16 — página de cada tipo de negócio (sem efeitos ao importar: ventures16 registra as áreas e
// precisa carregar depois de menus9, que registra a versão antiga de Festivais).
import type { VKind } from '../sim/sys/ventures9';

/** Página dedicada de cada tipo de negócio (studio e booking já moram em Estúdio e produtor / Agente e promotor). */
export const PAGE16: Record<VKind, { area: string; tab?: [string, string] }> = {
  festival: { area: 'festivals', tab: ['festivals16', 'mine'] }, publisher: { area: 'publishing16' }, media: { area: 'outlets16' }, platform: { area: 'platform16' },
  studio: { area: 'studio12', tab: ['studio12', 'studio'] }, booking: { area: 'tour12' },
};
