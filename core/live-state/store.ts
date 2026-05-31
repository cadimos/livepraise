import {
  STAGE_RETURN_ACTIONS,
  type LiveAction,
  type LiveActionName,
  type LiveState,
} from '../../shared/types/live.js';

const STAGE_ACTION_SET = new Set<string>(STAGE_RETURN_ACTIONS);

function isStageAction(acao: LiveActionName): boolean {
  return STAGE_ACTION_SET.has(acao);
}

const INITIAL_STATE: LiveState = {
  frozen: false,
  lastAction: null,
  lastStageAction: null,
  revision: 0,
};

export class LiveStateStore {
  private state: LiveState = { ...INITIAL_STATE };

  getState(): LiveState {
    return {
      ...this.state,
      lastAction: this.state.lastAction
        ? { ...this.state.lastAction }
        : null,
      lastStageAction: this.state.lastStageAction
        ? { ...this.state.lastStageAction }
        : null,
    };
  }

  setFrozen(frozen: boolean): LiveState {
    this.state = { ...this.state, frozen };
    return this.getState();
  }

  applyAction(action: LiveAction, fromOperator: boolean): LiveState {
    if (fromOperator && this.state.frozen && action.acao !== 'atualizar') {
      return this.getState();
    }

    const patch: Partial<LiveState> = {
      revision: this.state.revision + 1,
    };
    if (isStageAction(action.acao)) {
      patch.lastStageAction = { ...action };
    } else {
      patch.lastAction = { ...action };
    }
    this.state = { ...this.state, ...patch };
    return this.getState();
  }

  reset(): void {
    this.state = { ...INITIAL_STATE };
  }
}

export function createLiveStateStore(): LiveStateStore {
  return new LiveStateStore();
}
