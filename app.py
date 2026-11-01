from flask import Flask, jsonify, render_template, request, abort
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
# БД створюється автоматично: instance/places.db
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///places.db"
db = SQLAlchemy(app)

CATEGORIES = ["Landmark", "Park", "Historic site", "Religious site", "Museum", "Other"]


class Place(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    category = db.Column(db.String(50), nullable=False, default="Other")
    description = db.Column(db.Text, default="")
    lat = db.Column(db.Float, nullable=False)
    lng = db.Column(db.Float, nullable=False)

    def to_dict(self):
        return {
            "id": self.id, "name": self.name, "category": self.category,
            "description": self.description, "lat": self.lat, "lng": self.lng,
        }


SEED = [
    ("Ivano-Frankivsk City Hall", "Landmark",
     "A historic city hall in the heart of the city, now home to the Museum of History.", 48.92270, 24.71090),
    ("Shevchenko Park", "Park",
     "A popular green space with walking paths, a lake, and recreational areas.", 48.91590, 24.70620),
    ("Potocki Palace", "Historic site",
     "The remains of a 17th-century palace complex associated with the city's founders.", 48.92330, 24.71440),
    ("Cathedral of the Holy Resurrection", "Religious site",
     "A landmark Greek Catholic cathedral located near the central square.", 48.92110, 24.70890),
    ("Bastion", "Historic site",
     "A restored section of the city's old defensive fortifications with shops and galleries.", 48.92420, 24.71010),
]


def init_db():
    with app.app_context():
        db.create_all()
        if Place.query.count() == 0:
            db.session.add_all(
                Place(name=n, category=c, description=d, lat=la, lng=lo) for n, c, d, la, lo in SEED
            )
            db.session.commit()


def read_payload(partial_ok=False):
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        abort(400, "Name is required")
    try:
        lat, lng = float(data["lat"]), float(data["lng"])
    except (KeyError, TypeError, ValueError):
        abort(400, "Valid lat and lng are required")
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        abort(400, "Coordinates out of range")
    category = data.get("category") or "Other"
    if category not in CATEGORIES:
        category = "Other"
    return name[:120], category, (data.get("description") or "").strip(), lat, lng


@app.errorhandler(400)
def bad_request(e):
    return jsonify(error=e.description), 400


@app.route("/")
def index():
    return render_template("index.html", categories=CATEGORIES)


@app.get("/api/places")
def list_places():
    return jsonify([p.to_dict() for p in Place.query.order_by(Place.id).all()])


@app.post("/api/places")
def create_place():
    name, category, description, lat, lng = read_payload()
    place = Place(name=name, category=category, description=description, lat=lat, lng=lng)
    db.session.add(place)
    db.session.commit()
    return jsonify(place.to_dict()), 201


@app.put("/api/places/<int:place_id>")
def update_place(place_id):
    place = db.get_or_404(Place, place_id)
    place.name, place.category, place.description, place.lat, place.lng = read_payload()
    db.session.commit()
    return jsonify(place.to_dict())


@app.delete("/api/places/<int:place_id>")
def delete_place(place_id):
    place = db.get_or_404(Place, place_id)
    db.session.delete(place)
    db.session.commit()
    return "", 204


init_db()

if __name__ == "__main__":
    app.run(debug=True)
