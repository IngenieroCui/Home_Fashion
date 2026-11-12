import { PageState } from '../page-state';
import type { ComponentProps } from 'react';
export function EmptyState(props: Omit<ComponentProps<typeof PageState>, 'tone'>) {
  return <PageState {...props} tone="empty" />;
}
