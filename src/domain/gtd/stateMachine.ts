import { GTDQuestionId, Task } from '../../shared/types';
import {
  GTDAnswer,
  GTDTransitionResult,
  DelegationPayload,
  CalendarPayload,
} from './types';

export class GTDStateMachine {
  /**
   * Вычисляет следующий шаг и обновления для задачи на основе выбранного ответа
   */
  static transition(
    currentQuestion: GTDQuestionId,
    answer: GTDAnswer,
    payload?: any
  ): GTDTransitionResult {
    switch (currentQuestion) {
      // 1. «С этим надо что-то делать?»
      case 'ACTIONABLE': {
        if (answer === 'YES') {
          return { nextQuestion: 'FOR_ME' };
        }
        if (answer === 'NO') {
          return { nextQuestion: 'CHOOSE_NOT_ACTIONABLE' };
        }
        break;
      }

      // Выбор: Мусор или Заметки (при ответе «Нет» на 1-й вопрос)
      case 'CHOOSE_NOT_ACTIONABLE': {
        if (answer === 'CHOOSE_TRASH') {
          return {
            nextQuestion: 'COMPLETED',
            isCompletedItem: true,
            taskUpdates: {
              destination: 'trash',
              status: 'active',
              deleted_at: new Date().toISOString(),
            },
          };
        }
        if (answer === 'CHOOSE_NOTES') {
          return {
            nextQuestion: 'COMPLETED',
            isCompletedItem: true,
            taskUpdates: {
              destination: 'notes',
              status: 'active',
            },
          };
        }
        break;
      }

      // 2. «Мне?»
      case 'FOR_ME': {
        if (answer === 'YES') {
          return { nextQuestion: 'IS_NOW' };
        }
        if (answer === 'NO') {
          return { nextQuestion: 'DELEGATE_FORM' };
        }
        break;
      }

      // Форма делегирования (при ответе «Нет» на «Мне?»)
      case 'DELEGATE_FORM': {
        if (answer === 'SUBMIT_DELEGATION') {
          const data = payload as DelegationPayload;
          return {
            nextQuestion: 'COMPLETED',
            isCompletedItem: true,
            taskUpdates: {
              destination: 'waiting_for',
              status: 'active',
              delegated_to: data.delegatedTo || null,
              waiting_for: data.waitingFor || null,
              check_date: data.checkDate || null,
            },
          };
        }
        break;
      }

      // 3. «Сейчас?» (в пределах ближайшей недели)
      case 'IS_NOW': {
        if (answer === 'YES') {
          return { nextQuestion: 'IS_SINGLE_STEP' };
        }
        if (answer === 'NO') {
          return { nextQuestion: 'CHOOSE_LATER' };
        }
        break;
      }

      // Выбор: Календарь или Когда-нибудь потом (при ответе «Нет» на «Сейчас?»)
      case 'CHOOSE_LATER': {
        if (answer === 'CHOOSE_CALENDAR') {
          return { nextQuestion: 'CALENDAR_FORM' };
        }
        if (answer === 'CHOOSE_SOMEDAY') {
          return {
            nextQuestion: 'COMPLETED',
            isCompletedItem: true,
            taskUpdates: {
              destination: 'someday',
              status: 'active',
            },
          };
        }
        break;
      }

      // Форма выбора даты в календаре
      case 'CALENDAR_FORM': {
        if (answer === 'SUBMIT_CALENDAR') {
          const data = payload as CalendarPayload;
          if (!data.scheduledDate) {
            throw new Error('Для календаря обязательно указание даты выполнения');
          }
          return {
            nextQuestion: 'COMPLETED',
            isCompletedItem: true,
            taskUpdates: {
              destination: 'calendar',
              status: 'active',
              scheduled_date: data.scheduledDate,
              scheduled_time: data.scheduledTime || null,
            },
          };
        }
        break;
      }

      // 4. «Одношаговая?»
      case 'IS_SINGLE_STEP': {
        if (answer === 'YES') {
          return { nextQuestion: 'IS_TWO_MINUTES' };
        }
        if (answer === 'NO') {
          return { nextQuestion: 'CREATE_PROJECT_FORM' };
        }
        break;
      }

      // 5. «Можно сделать за 2 минуты?»
      case 'IS_TWO_MINUTES': {
        // «Да, выполнить сейчас»
        if (answer === 'DO_NOW') {
          return { nextQuestion: 'DO_TWO_MINUTES' };
        }
        // «Добавить в текущие действия» (если занимает больше 2 минут ИЛИ занимает <=2 минут, но не делается сейчас)
        if (answer === 'DEFER_TO_NEXT_ACTIONS' || answer === 'NO') {
          return {
            nextQuestion: 'COMPLETED',
            isCompletedItem: true,
            taskUpdates: {
              destination: 'next_actions',
              status: 'active',
            },
          };
        }
        break;
      }

      // Экран непосредственного выполнения двухминутного действия
      case 'DO_TWO_MINUTES': {
        if (answer === 'COMPLETE_ACTION') {
          const now = new Date().toISOString();
          return {
            nextQuestion: 'COMPLETED',
            isCompletedItem: true,
            taskUpdates: {
              destination: 'next_actions',
              status: 'completed',
              completed_at: now,
            },
          };
        }
        if (answer === 'DEFER_TO_NEXT_ACTIONS') {
          return {
            nextQuestion: 'COMPLETED',
            isCompletedItem: true,
            taskUpdates: {
              destination: 'next_actions',
              status: 'active',
            },
          };
        }
        break;
      }
    }

    throw new Error(`Недопустимый переход: вопрос ${currentQuestion}, ответ ${answer}`);
  }

  /**
   * Возвращает заголовок вопроса для отображения пользователю
   */
  static getQuestionTitle(question: GTDQuestionId): string {
    switch (question) {
      case 'ACTIONABLE':
        return 'С этим надо что-то делать?';
      case 'CHOOSE_NOT_ACTIONABLE':
        return 'Что сделать с этой информацией?';
      case 'FOR_ME':
        return 'Мне?';
      case 'DELEGATE_FORM':
        return 'Делегирование и ожидание';
      case 'IS_NOW':
        return 'Сейчас? (в пределах ближайшей недели)';
      case 'CHOOSE_LATER':
        return 'Когда предстоит выполнить дело?';
      case 'CALENDAR_FORM':
        return 'Назначение даты в Календарь';
      case 'IS_SINGLE_STEP':
        return 'Одношаговая?';
      case 'CREATE_PROJECT_FORM':
        return 'Создание проекта';
      case 'IS_TWO_MINUTES':
        return 'Можно сделать за 2 минуты?';
      case 'DO_TWO_MINUTES':
        return 'Выполните действие прямо сейчас';
      default:
        return '';
    }
  }

  /**
   * Возвращает порядковый номер основного шага (1..5) для индикатора прогресса
   */
  static getStepNumber(question: GTDQuestionId): { step: number; total: number } {
    switch (question) {
      case 'ACTIONABLE':
      case 'CHOOSE_NOT_ACTIONABLE':
        return { step: 1, total: 5 };
      case 'FOR_ME':
      case 'DELEGATE_FORM':
        return { step: 2, total: 5 };
      case 'IS_NOW':
      case 'CHOOSE_LATER':
      case 'CALENDAR_FORM':
        return { step: 3, total: 5 };
      case 'IS_SINGLE_STEP':
      case 'CREATE_PROJECT_FORM':
        return { step: 4, total: 5 };
      case 'IS_TWO_MINUTES':
      case 'DO_TWO_MINUTES':
        return { step: 5, total: 5 };
      default:
        return { step: 1, total: 5 };
    }
  }
}
