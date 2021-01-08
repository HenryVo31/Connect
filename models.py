from flask_sqlalchemy import SQLAlchemy

# Set up database
db = SQLAlchemy()

# User table - Storing user's data
class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String, nullable=False)
    hash = db.Column(db.String, nullable=False)
    display_name = db.Column(db.String, nullable=False)
    image = db.Column(db.String, nullable=True)

# Chat table - Storing chat messages and their associated information
class Chat(db.Model):
    __tablename__ = "chat"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String, nullable=False)
    messages = db.Column(db.String, nullable=False)
    time = db.Column(db.String, nullable=False)
    room = db.Column(db.String, nullable=False)
    display_name = db.Column(db.String, nullable=False)
    image = db.Column(db.String, nullable=True)

# Saved channel table - Storing the last channel the user was on
class Saved_Channel(db.Model):
    __tablename__ = "saved_channel"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String, nullable=False)
    previous_channel = db.Column(db.String, nullable=False)

# Channel table - Storing all the channels on the website and their key if they are private
class Channel(db.Model):
    __tablename__ = "channel"
    id = db.Column(db.Integer, primary_key=True)
    channel = db.Column(db.String, nullable=False)
    key = db.Column(db.String, nullable=False)

