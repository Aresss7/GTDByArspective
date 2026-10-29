import { GTDQuestionId, TaskDestination, Task } from '../../shared/types';

export type GTDAnswer =
  | 'YES'
  | 'NO'
  | 'CHOOSE_TRASH'
  | 'CHOOSE_NOTES'
  | 'SUBMIT_DELEGATION'
  | 'CHOOSE_CALENDAR'
  | 'CHOOSE_SOMEDAY'
  | 'SUBMIT_CALENDAR'
  | 'SUBMIT_PROJECT'
  | 'DO_NOW'
  | 'DEFER_TO_NEXT_ACTIONS'
  | 'COMPLETE_ACTION';

export interface GTDTransitionResult {
  nextQuestion: GTDQuestionId | 'COMPLETED';
  taskUpdates?: Partial<Task>;
  isCompletedItem?: boolean;
}

export interface DelegationPayload {
  delegatedTo: string;
  waitingFor?: string;
  checkDate?: string;
}

export interface CalendarPayload {
  scheduledDate: string;
  scheduledTime?: string;
}

export interface ProjectPayload {
  title: string;
  description?: string;
  firstStepTitle: string;
  approximatePlan?: string;
  completionCriteria?: string;
}
