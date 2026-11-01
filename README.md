# Explore Ivano-Frankivsk (Flask + SQLite)

Карта міста з місцями, які зберігаються в базі даних (SQLite через Flask-SQLAlchemy).

## Запуск у VS Code

```bash
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux
pip install -r requirements.txt
python app.py
```
Відкрити http://127.0.0.1:5000

БД `instance/places.db` створюється автоматично при першому запуску й заповнюється 5 початковими місцями.
Щоб почати з нуля — видаліть файл `instance/places.db`.

## Що вміє
- Список місць завантажується з БД (`GET /api/places`)
- Пошук і фільтр за категорією
- Клік по місцю → переліт до маркера на карті
- Додавання місця (`POST`), редагування (`PUT`), видалення (`DELETE`) — усе зберігається в БД
- Додавання місця: «+ Add place» → заповнити форму → «Pick on map» → клік на карті → «Save place»

## Структура
```
app.py              Flask, модель Place, REST API
templates/index.html
static/style.css
static/app.js       Leaflet + fetch до API
```
Плитки карти: OpenStreetMap, а при блокуванні автоматично Esri (ключі не потрібні). Шар можна перемкнути вручну іконкою у правому верхньому куті карти.
