export interface ColorOption {
  id: string;
  label: string;
  labelEn: string;
  color: string; // for text
  bgColor: string; // for background
  previewColor: string; // for UI icon
}

export const TEXT_COLORS: ColorOption[] = [
  { id: 'default', label: 'Обычный текст', labelEn: 'Default text', color: 'inherit', bgColor: 'transparent', previewColor: '#a1a1aa' },
  { id: 'gray', label: 'Серый текст', labelEn: 'Gray text', color: '#9b9a97', bgColor: '', previewColor: '#9b9a97' },
  { id: 'brown', label: 'Коричневый текст', labelEn: 'Brown text', color: '#976d57', bgColor: '', previewColor: '#976d57' },
  { id: 'orange', label: 'Оранжевый текст', labelEn: 'Orange text', color: '#d9730d', bgColor: '', previewColor: '#d9730d' },
  { id: 'yellow', label: 'Жёлтый текст', labelEn: 'Yellow text', color: '#cb912f', bgColor: '', previewColor: '#cb912f' },
  { id: 'green', label: 'Зелёный текст', labelEn: 'Green text', color: '#448361', bgColor: '', previewColor: '#448361' },
  { id: 'blue', label: 'Синий текст', labelEn: 'Blue text', color: '#337ea9', bgColor: '', previewColor: '#337ea9' },
  { id: 'purple', label: 'Фиолетовый текст', labelEn: 'Purple text', color: '#9065b0', bgColor: '', previewColor: '#9065b0' },
  { id: 'pink', label: 'Розовый текст', labelEn: 'Pink text', color: '#c14c8a', bgColor: '', previewColor: '#c14c8a' },
  { id: 'red', label: 'Красный текст', labelEn: 'Red text', color: '#d44c47', bgColor: '', previewColor: '#d44c47' },
];

export const BG_COLORS: ColorOption[] = [
  { id: 'default', label: 'Без фона', labelEn: 'Default background', color: '', bgColor: 'transparent', previewColor: 'transparent' },
  { id: 'gray', label: 'Серый фон', labelEn: 'Gray background', color: '', bgColor: 'rgba(120, 119, 116, 0.3)', previewColor: 'rgba(120, 119, 116, 0.4)' },
  { id: 'brown', label: 'Коричневый фон', labelEn: 'Brown background', color: '', bgColor: 'rgba(159, 107, 83, 0.35)', previewColor: 'rgba(159, 107, 83, 0.5)' },
  { id: 'orange', label: 'Оранжевый фон', labelEn: 'Orange background', color: '', bgColor: 'rgba(217, 115, 13, 0.35)', previewColor: 'rgba(217, 115, 13, 0.5)' },
  { id: 'yellow', label: 'Жёлтый фон', labelEn: 'Yellow background', color: '', bgColor: 'rgba(203, 145, 47, 0.35)', previewColor: 'rgba(203, 145, 47, 0.5)' },
  { id: 'green', label: 'Зелёный фон', labelEn: 'Green background', color: '', bgColor: 'rgba(68, 131, 97, 0.35)', previewColor: 'rgba(68, 131, 97, 0.5)' },
  { id: 'blue', label: 'Синий фон', labelEn: 'Blue background', color: '', bgColor: 'rgba(51, 126, 169, 0.35)', previewColor: 'rgba(51, 126, 169, 0.5)' },
  { id: 'purple', label: 'Фиолетовый фон', labelEn: 'Purple background', color: '', bgColor: 'rgba(144, 101, 176, 0.35)', previewColor: 'rgba(144, 101, 176, 0.5)' },
  { id: 'pink', label: 'Розовый фон', labelEn: 'Pink background', color: '', bgColor: 'rgba(193, 76, 138, 0.35)', previewColor: 'rgba(193, 76, 138, 0.5)' },
  { id: 'red', label: 'Красный фон', labelEn: 'Red background', color: '', bgColor: 'rgba(212, 76, 71, 0.35)', previewColor: 'rgba(212, 76, 71, 0.5)' },
];
