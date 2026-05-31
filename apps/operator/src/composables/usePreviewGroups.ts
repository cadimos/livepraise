import { computed, onMounted, ref } from 'vue';
import { fetchJson } from './useApi';
import { useExternalDevices } from './useExternalDevices';
import type { ClientRole, DisplayAssignment } from '@shared/types/live';
import {
  EXTERNAL_PREVIEW_PROFILE_ORDER,
  type PreviewGroupDescriptor,
  type PreviewGroupKind,
} from '../types/preview-groups';

const LABEL_KEYS: Record<PreviewGroupKind, string> = {
  projection: 'preview.groups.projection',
  'stage-return': 'preview.groups.stageReturn',
  live: 'preview.groups.live',
  vocal: 'preview.groups.vocal',
  stage: 'preview.groups.stage',
  player: 'preview.groups.player',
};

function group(
  id: string,
  kind: PreviewGroupKind,
  order: number,
  deliveryRole: ClientRole,
  options: {
    labelKey?: string;
    deliveryProfile?: PreviewGroupDescriptor['deliveryProfile'];
  } = {},
): PreviewGroupDescriptor {
  return {
    id,
    kind,
    labelKey: options.labelKey ?? LABEL_KEYS[kind],
    order,
    deliveryRole,
    deliveryProfile: options.deliveryProfile,
  };
}

/**
 * Grupos visíveis na coluna de prévias (CAD-221).
 */
export function usePreviewGroups() {
  const assignments = ref<DisplayAssignment[]>([]);
  const { onlineDevices } = useExternalDevices();

  async function loadDisplays(): Promise<void> {
    try {
      const data = await fetchJson<{ assignments: DisplayAssignment[] }>('/displays/config');
      assignments.value = data.assignments ?? [];
    } catch {
      assignments.value = [];
    }
  }

  onMounted(() => {
    void loadDisplays();
  });

  const visibleGroups = computed((): PreviewGroupDescriptor[] => {
    const out: PreviewGroupDescriptor[] = [];
    let order = 0;

    out.push(group('projection', 'projection', order++, 'projector'));

    const hasStageReturnMonitor = assignments.value.some((a) => a.role === 'stage-return');
    const projectionMonitors = assignments.value.filter((a) => a.role === 'projection');
    const hasSecondPhysical =
      hasStageReturnMonitor || projectionMonitors.length > 1;

    if (hasSecondPhysical) {
      if (hasStageReturnMonitor) {
        out.push(group('stage-return', 'stage-return', order++, 'stage-return'));
      } else {
        out.push(
          group('stage-return', 'stage-return', order++, 'projector', {
            labelKey: 'preview.groups.projectionSecondary',
          }),
        );
      }
    }

    const onlineProfiles = new Set(onlineDevices.value.map((d) => d.profile));
    for (const profile of EXTERNAL_PREVIEW_PROFILE_ORDER) {
      if (onlineProfiles.has(profile)) {
        out.push(
          group(`external-${profile}`, profile, order++, 'external-display', {
            deliveryProfile: profile,
          }),
        );
      }
    }

    return out;
  });

  return {
    visibleGroups,
    reloadDisplays: loadDisplays,
  };
}
