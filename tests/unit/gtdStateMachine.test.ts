import { describe, it, expect } from 'vitest';
import { GTDStateMachine } from '../../src/domain/gtd/stateMachine';

describe('GTD State Machine Business Logic', () => {
  describe('Step 1: «С этим надо что-то делать?» (ACTIONABLE)', () => {
    it('should transition to CHOOSE_NOT_ACTIONABLE on NO', () => {
      const res = GTDStateMachine.transition('ACTIONABLE', 'NO');
      expect(res.nextQuestion).toBe('CHOOSE_NOT_ACTIONABLE');
      expect(res.isCompletedItem).toBeFalsy();
    });

    it('should route to TRASH when choosing trash', () => {
      const res = GTDStateMachine.transition('CHOOSE_NOT_ACTIONABLE', 'CHOOSE_TRASH');
      expect(res.nextQuestion).toBe('COMPLETED');
      expect(res.isCompletedItem).toBe(true);
      expect(res.taskUpdates?.destination).toBe('trash');
      expect(res.taskUpdates?.deleted_at).toBeDefined();
    });

    it('should route to NOTES when choosing notes', () => {
      const res = GTDStateMachine.transition('CHOOSE_NOT_ACTIONABLE', 'CHOOSE_NOTES');
      expect(res.nextQuestion).toBe('COMPLETED');
      expect(res.isCompletedItem).toBe(true);
      expect(res.taskUpdates?.destination).toBe('notes');
    });

    it('should transition to FOR_ME on YES', () => {
      const res = GTDStateMachine.transition('ACTIONABLE', 'YES');
      expect(res.nextQuestion).toBe('FOR_ME');
      expect(res.isCompletedItem).toBeFalsy();
    });
  });

  describe('Step 2: «Мне?» (FOR_ME)', () => {
    it('should transition to DELEGATE_FORM on NO', () => {
      const res = GTDStateMachine.transition('FOR_ME', 'NO');
      expect(res.nextQuestion).toBe('DELEGATE_FORM');
    });

    it('should route to waiting_for when delegation form is submitted', () => {
      const res = GTDStateMachine.transition('DELEGATE_FORM', 'SUBMIT_DELEGATION', {
        delegatedTo: 'Алексей',
        waitingFor: 'Макет дизайна сайта',
        checkDate: '2026-11-05',
      });
      expect(res.nextQuestion).toBe('COMPLETED');
      expect(res.isCompletedItem).toBe(true);
      expect(res.taskUpdates?.destination).toBe('waiting_for');
      expect(res.taskUpdates?.delegated_to).toBe('Алексей');
      expect(res.taskUpdates?.waiting_for).toBe('Макет дизайна сайта');
      expect(res.taskUpdates?.check_date).toBe('2026-11-05');
    });

    it('should transition to IS_NOW on YES', () => {
      const res = GTDStateMachine.transition('FOR_ME', 'YES');
      expect(res.nextQuestion).toBe('IS_NOW');
    });
  });

  describe('Step 3: «Сейчас?» (IS_NOW)', () => {
    it('should transition to CHOOSE_LATER on NO', () => {
      const res = GTDStateMachine.transition('IS_NOW', 'NO');
      expect(res.nextQuestion).toBe('CHOOSE_LATER');
    });

    it('should route to SOMEDAY when chosen', () => {
      const res = GTDStateMachine.transition('CHOOSE_LATER', 'CHOOSE_SOMEDAY');
      expect(res.nextQuestion).toBe('COMPLETED');
      expect(res.isCompletedItem).toBe(true);
      expect(res.taskUpdates?.destination).toBe('someday');
    });

    it('should open CALENDAR_FORM when Calendar is chosen', () => {
      const res = GTDStateMachine.transition('CHOOSE_LATER', 'CHOOSE_CALENDAR');
      expect(res.nextQuestion).toBe('CALENDAR_FORM');
    });

    it('should route to calendar when date is submitted', () => {
      const res = GTDStateMachine.transition('CALENDAR_FORM', 'SUBMIT_CALENDAR', {
        scheduledDate: '2026-11-10',
        scheduledTime: '10:00',
      });
      expect(res.nextQuestion).toBe('COMPLETED');
      expect(res.isCompletedItem).toBe(true);
      expect(res.taskUpdates?.destination).toBe('calendar');
      expect(res.taskUpdates?.scheduled_date).toBe('2026-11-10');
      expect(res.taskUpdates?.scheduled_time).toBe('10:00');
    });

    it('should throw error if calendar date is missing', () => {
      expect(() => {
        GTDStateMachine.transition('CALENDAR_FORM', 'SUBMIT_CALENDAR', {});
      }).toThrow();
    });

    it('should transition to IS_SINGLE_STEP on YES', () => {
      const res = GTDStateMachine.transition('IS_NOW', 'YES');
      expect(res.nextQuestion).toBe('IS_SINGLE_STEP');
    });
  });

  describe('Step 4: «Одношаговая?» (IS_SINGLE_STEP)', () => {
    it('should open CREATE_PROJECT_FORM on NO', () => {
      const res = GTDStateMachine.transition('IS_SINGLE_STEP', 'NO');
      expect(res.nextQuestion).toBe('CREATE_PROJECT_FORM');
    });

    it('should transition to IS_TWO_MINUTES on YES', () => {
      const res = GTDStateMachine.transition('IS_SINGLE_STEP', 'YES');
      expect(res.nextQuestion).toBe('IS_TWO_MINUTES');
    });
  });

  describe('Step 5: «Можно сделать за 2 минуты?» (IS_TWO_MINUTES)', () => {
    it('should show 2-minute action screen on DO_NOW', () => {
      const res = GTDStateMachine.transition('IS_TWO_MINUTES', 'DO_NOW');
      expect(res.nextQuestion).toBe('DO_TWO_MINUTES');
      expect(res.isCompletedItem).toBeFalsy();
    });

    it('should complete task with completed status when user confirms completion', () => {
      const res = GTDStateMachine.transition('DO_TWO_MINUTES', 'COMPLETE_ACTION');
      expect(res.nextQuestion).toBe('COMPLETED');
      expect(res.isCompletedItem).toBe(true);
      expect(res.taskUpdates?.status).toBe('completed');
      expect(res.taskUpdates?.completed_at).toBeDefined();
    });

    it('should defer to NEXT_ACTIONS without completing if user chooses deferral from question', () => {
      const res = GTDStateMachine.transition('IS_TWO_MINUTES', 'DEFER_TO_NEXT_ACTIONS');
      expect(res.nextQuestion).toBe('COMPLETED');
      expect(res.isCompletedItem).toBe(true);
      expect(res.taskUpdates?.destination).toBe('next_actions');
      expect(res.taskUpdates?.status).toBe('active');
      expect(res.taskUpdates?.completed_at).toBeUndefined();
    });

    it('should defer to NEXT_ACTIONS without completing if user chooses deferral from 2-min execution screen', () => {
      const res = GTDStateMachine.transition('DO_TWO_MINUTES', 'DEFER_TO_NEXT_ACTIONS');
      expect(res.nextQuestion).toBe('COMPLETED');
      expect(res.isCompletedItem).toBe(true);
      expect(res.taskUpdates?.destination).toBe('next_actions');
      expect(res.taskUpdates?.status).toBe('active');
    });
  });
});
