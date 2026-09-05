import { PageState } from '@/components/page-state';

export default function PanelLoading() {
  return (
    <PageState title="Preparando tu espacio de trabajo" tone="loading">
      <p>Estamos consultando la información del módulo.</p>
    </PageState>
  );
}
