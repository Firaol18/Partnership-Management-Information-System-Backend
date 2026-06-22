import { SetMetadata } from '@nestjs/common';
import { ACTIONS } from 'src/common/constants/actions';

export const RESOURCE_KEY = 'RESOURCE' as const;
export const Resource = (
  resourceData: { resource: string; actions: ACTIONS[] }[],
) => SetMetadata(RESOURCE_KEY, resourceData);
