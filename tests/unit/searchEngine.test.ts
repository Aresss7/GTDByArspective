import { describe, it, expect } from 'vitest';
import { parseSearchQuery, matchesSearch, containsWordBoundary } from '../../src/shared/searchEngine';

describe('Advanced Search Engine', () => {
  // Test case 1: Обычный поиск по слову
  it('1. should perform plain single or multi-word search case-insensitively', () => {
    const item1 = { title: 'Купить новый ноутбук', notes: 'Выбрать модель с 32GB RAM' };
    const item2 = { title: 'Купить кофе' };

    expect(matchesSearch(item1, 'ноутбук')).toBe(true);
    expect(matchesSearch(item1, 'НОУТБУК')).toBe(true);
    expect(matchesSearch(item1, 'купить ноутбук')).toBe(true);
    expect(matchesSearch(item2, 'ноутбук')).toBe(false);
  });

  // Test case 2: Точная фраза в кавычках
  it('2. should match exact phrases in quotes and respect word order', () => {
    const item1 = { title: 'Нужно купить компьютер срочно' };
    const item2 = { title: 'Компьютер нужно купить завтра' };
    const item3 = { title: 'Купить отличный компьютер' };

    expect(matchesSearch(item1, '"купить компьютер"')).toBe(true);
    // Reversed word order should not match exact phrase
    expect(matchesSearch(item2, '"купить компьютер"')).toBe(false);
    // Words separated by another word should not match exact phrase
    expect(matchesSearch(item3, '"купить компьютер"')).toBe(false);
  });

  // Test case 3: Исключение отдельного слова с дефисами по бокам (-слово-)
  it('3. should exclude items containing the exact standalone word marked with hyphens', () => {
    const itemWithWord = { title: 'Срочный ремонт монитора' };
    const itemWithoutWord = { title: 'Покупка нового монитора' };

    expect(matchesSearch(itemWithWord, 'монитор -ремонт-')).toBe(false);
    expect(matchesSearch(itemWithoutWord, 'монитор -ремонт-')).toBe(true);
  });

  // Test case 4: Исключение слова не исключает подстроку в другом слове (-комп- не исключает компьютер)
  it('4. should not exclude words containing the pattern as a substring (-комп- does not exclude компьютер)', () => {
    const itemComputer = { title: 'Купить мощный компьютер для работы' };
    const itemKomp = { title: 'Продать старый комп на запчасти' };

    // -комп- excludes standalone "комп", but MUST NOT exclude "компьютер"
    expect(matchesSearch(itemComputer, 'купить -комп-')).toBe(true);
    expect(matchesSearch(itemKomp, 'купить -комп-')).toBe(false);
  });

  // Test case 5: Поиск с OR
  it('5. should match items matching at least one alternative with OR operator (case-insensitive)', () => {
    const item1 = { title: 'Выбрать качественный монитор' };
    const item2 = { title: 'Купить яркий дисплей' };
    const item3 = { title: 'Купить клавиатуру' };

    expect(matchesSearch(item1, 'монитор OR дисплей')).toBe(true);
    expect(matchesSearch(item2, 'монитор or дисплей')).toBe(true);
    expect(matchesSearch(item3, 'монитор Or дисплей')).toBe(false);
  });

  // Test case 6: Сочетание OR и исключения
  it('6. should combine OR groups and exclusions correctly', () => {
    const item1 = { title: 'Купить монитор' };
    const item2 = { title: 'Ремонт дисплея в сервисном центре' };
    const item3 = { title: 'Купить дисплей' };

    const query = 'монитор OR дисплей -ремонт-';
    expect(matchesSearch(item1, query)).toBe(true);
    expect(matchesSearch(item3, query)).toBe(true);
    expect(matchesSearch(item2, query)).toBe(false); // Excluded by -ремонт-
  });

  // Test case 7: Составные слова с дефисами (Ростов-на-Дону)
  it('7. should preserve hyphenated compound words intact and not treat them as exclusions', () => {
    const itemCity = { title: 'Командировка в Ростов-на-Дону к партнерам' };
    const itemCourse = { title: 'Записаться на онлайн-курс по дизайну' };

    expect(matchesSearch(itemCity, 'Ростов-на-Дону')).toBe(true);
    expect(matchesSearch(itemCity, '"Ростов-на-Дону"')).toBe(true);
    expect(matchesSearch(itemCourse, 'онлайн-курс')).toBe(true);

    // Exclusion should also not break compound words:
    // If text has "Ростов-на-Дону", -на- should NOT match because "на" is inside compound word!
    expect(containsWordBoundary('Ростов-на-Дону', 'на')).toBe(false);
    expect(matchesSearch(itemCity, 'Ростов -на-')).toBe(true);
  });

  // Test case 8: Поиск по тегам (#tag)
  it('8. should match by hashtag in title, notes or tags array', () => {
    const itemWithTag = { title: 'Сдать налоговую декларацию', tags: ['налоги', 'срочно'] };
    const itemWithTextTag = { title: 'Подготовить отчет #срочно к пятнице' };
    const itemOther = { title: 'Обычная задача' };

    expect(matchesSearch(itemWithTag, '#срочно')).toBe(true);
    expect(matchesSearch(itemWithTextTag, '#срочно')).toBe(true);
    expect(matchesSearch(itemOther, '#срочно')).toBe(false);
  });

  // Test case 9: Комбинированный сложный запрос
  it('9. should handle complex combined queries with exact phrases, OR, exclusions, and tags', () => {
    const itemMatching = {
      title: 'Подготовить отчет: "годовой баланс" для руководства #финансы',
      notes: 'Включает аудит за все 4 квартала',
    };
    const itemExcluded = {
      title: 'Подготовить отчет: "годовой баланс" #финансы',
      notes: 'Отправить в архив после проверки',
    };

    const complexQuery = '"годовой баланс" OR "квартальный отчет" -архив- #финансы';
    expect(matchesSearch(itemMatching, complexQuery)).toBe(true);
    expect(matchesSearch(itemExcluded, complexQuery)).toBe(false); // contains excluded word "архив"
  });

  // Test case 10: Category filter
  it('10. should filter by destination/category if provided', () => {
    const itemSomeday = { title: 'Изучить испанский язык', destination: 'someday' };
    const itemInbox = { title: 'Изучить испанский язык', destination: 'inbox' };

    expect(matchesSearch(itemSomeday, 'испанский', 'someday')).toBe(true);
    expect(matchesSearch(itemInbox, 'испанский', 'someday')).toBe(false);
  });
});
