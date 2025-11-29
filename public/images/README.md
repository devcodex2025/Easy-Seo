# Easy SEO Icons

Ця папка містить іконки та логотипи для Easy SEO.

## Наявні файли

- `logo.svg` - Основний логотип (64x64)
- `favicon.svg` - Фавікон (32x32)
- `generate-icons.html` - Допоміжна сторінка для генерації PNG

## Генерація PNG іконок

Для кращої сумісності з усіма браузерами рекомендовано створити PNG версії:

### Варіант 1: Онлайн інструмент (рекомендовано)
1. Відвідайте https://realfavicongenerator.net/
2. Завантажте `favicon.svg`
3. Налаштуйте параметри та згенеруйте всі необхідні розміри
4. Завантажте згенеровані файли в цю папку

### Варіант 2: ImageMagick (командний рядок)
```bash
# Встановіть ImageMagick (якщо ще не встановлено)
# Windows: choco install imagemagick
# macOS: brew install imagemagick
# Linux: sudo apt-get install imagemagick

# Генерація різних розмірів
magick convert favicon.svg -resize 16x16 favicon-16x16.png
magick convert favicon.svg -resize 32x32 favicon-32x32.png
magick convert favicon.svg -resize 180x180 apple-touch-icon.png
magick convert favicon.svg -resize 192x192 favicon-192x192.png
magick convert favicon.svg -resize 512x512 favicon-512x512.png
```

### Варіант 3: Inkscape
```bash
# Встановіть Inkscape
# Windows: choco install inkscape
# macOS: brew install inkscape
# Linux: sudo apt-get install inkscape

inkscape favicon.svg --export-type=png --export-width=32 --export-filename=favicon-32x32.png
inkscape favicon.svg --export-type=png --export-width=16 --export-filename=favicon-16x16.png
inkscape favicon.svg --export-type=png --export-width=180 --export-filename=apple-touch-icon.png
inkscape favicon.svg --export-type=png --export-width=192 --export-filename=favicon-192x192.png
inkscape favicon.svg --export-type=png --export-width=512 --export-filename=favicon-512x512.png
```

## Необхідні розміри

- `favicon-16x16.png` - Стандартний фавікон
- `favicon-32x32.png` - Стандартний фавікон (HD)
- `apple-touch-icon.png` - 180x180 для iOS
- `favicon-192x192.png` - Android Chrome
- `favicon-512x512.png` - Android Chrome (висока якість)

## Дизайн

Логотип Easy SEO містить:
- Градієнтний фон (banana yellow: #FFE135 → #FFC107)
- Букву "E" (Easy) - мінімалістичний дизайн
- Індикатор SEO - графік/діаграма, що символізує аналіз


