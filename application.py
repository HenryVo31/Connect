import os
import datetime
import boto3
from sqlalchemy import asc
from werkzeug.utils import secure_filename

from flask import Flask, session, render_template, redirect, request, url_for, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_session import Session
from werkzeug.security import check_password_hash, generate_password_hash

from models import *
from helpers import login_required

# Naming the app and initializing socket.io
app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

# Make sure response aren't cached
app.config["TEMPLATE_AUTO_RELOAD"] = True

# Configure session to use filesystem
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)

# Check for environment variable
if not os.getenv("DATABASE_URL"):
    raise RuntimeError("DATABASE_URL is not set")

# Set up database
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db.init_app(app)

# Prevent the storing of caches
@app.after_request
def after_request(response):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Expires"] = 0
    response.headers["Pragma"] = "no-cache"
    return response

# Homepage/Landing page
@app.route("/")
def index():
    return render_template("index.html")

# Login page
@app.route("/login", methods=["GET", "POST"])
def login():

    if request.method == "POST":

        # Clear the session
        session.clear()

        # Getting the username and password from HTML form
        username = request.form.get("username")
        password = request.form.get("password")

        # Error checking and information validation:
        if not username:
            return render_template("error.html", error_message="Invalid username and/or password")

        if not password:
            return render_template("error.html", error_message="Invalid username and/or password")

        if User.query.filter_by(username=username).count() == 0:
            return render_template("error.html", error_message="Invalid username and/or password")

        rows = User.query.filter_by(username=username).first()
        hash = rows.hash

        if check_password_hash(hash, password) == False:
            return render_template("error.html", error_message="Invalid username and/or password")

        # Storing the user's id into session
        session["user_id"] = rows.id

        # Decide whether to redirect user to message or display name page
        check_display_name = User.query.filter_by(username=username).first()

        if check_display_name.display_name != "Guest":

            return redirect('/message')

        return redirect('/display_name')

    else:
        return render_template("login.html")


# Validate login form
@app.route("/validate_login", methods=["POST"])
def validate_login():
    username = request.form.get("username")
    password = request.form.get("password")

    if User.query.filter_by(username=username).count() == 0:
        return jsonify({"result": "false"})

    rows = User.query.filter_by(username=username).first()
    hash = rows.hash

    if check_password_hash(hash, password) == False:
        return jsonify({"result": "false"})

    return jsonify({"result": "true"})


# Logout
@app.route("/logout")
def logout():

    # Clear session and redirect to homepage
    session.clear()
    return redirect("/")

# Register page
@app.route("/register", methods=["GET", "POST"])
def register():

    if request.method == "POST":
        print("ok")

        # Get data from HTML form
        username = request.form.get("username")
        password = request.form.get("password")
        confirm_password = request.form.get("confirm_password")

        # Error checking and information validation:
        if not username:
            return render_template("error.html", error_message="Username is empty")

        if not password:
            return render_template("error.html", error_message="Password is empty")

        if not confirm_password:
            return render_template("error.html", error_message="Re-enter password is empty")

        if confirm_password != password:
            return render_template("error.html", error_message="Re-enter password does not match password")

        if User.query.filter_by(username=username).count() != 0:
            return render_template("error.html", error_message="Username has been taken")

        # Add new account to database
        hash = generate_password_hash(password)

        add_account = User(username=username, hash=hash, display_name="Guest", image="https://connectapp-images.s3.ca-central-1.amazonaws.com/230-2301779_best-classified-apps-default-user-profile.png")
        db.session.add(add_account)
        db.session.commit()

        return redirect('/login')

    else:
        return render_template("register.html")

# Validate register form
@app.route("/validate_register", methods=["POST"])
def validate_register():
    username = request.form.get("username")

    if User.query.filter_by(username=username).count() != 0:
        return jsonify({"result": "false"})

    else:
        return jsonify({"result": "true"})


# Display name page
@app.route("/display_name", methods=["GET", "POST"])
@login_required
def display_name():

    if request.method == "POST":

        # Get data from session and HTML form:
        user_id = session["user_id"]

        display_name_user = request.form.get("display_name")
        image = request.files["profile_picture"]

        # Error checking and information validation:
        if not display_name_user:
            return render_template("error.html", error_message="Invalid Display Name")

        if User.query.filter_by(display_name=display_name_user).count() != 0:
            return render_template("error.html", error_message="Display Name has been taken")

        rows = User.query.get(user_id)

        # Insert the display name into the database
        rows.display_name = display_name_user

        username = rows.username

        rows_chat = Chat.query.filter_by(username=username).all()

        # Check whether profile picture was changed
        if image.filename != "":
            os.makedirs(os.path.join(app.instance_path, 'root'), exist_ok=True)
            image.save(os.path.join(app.instance_path, 'root', secure_filename(image.filename)))

            # Upload image to s3
            file_name = "instance/root/" + image.filename
            file_name = file_name.replace(" ", "_")
            file_name = file_name.replace("(", "")
            file_name = file_name.replace(")", "")
            key_name = rows.username + "-profile-picture"
            upload_to_s3(file_name, key_name)

            # Update image file
            rows.image = "https://connectapp-images.s3.ca-central-1.amazonaws.com/" + key_name + "?versionId=null"

        # Replacing the display name and image in all chat messages stored in database => In case the user wants to change display name
        for chat in rows_chat:
            chat.display_name = display_name_user
            chat.image = rows.image

        db.session.commit()

        return redirect("/message")

    else:
        user_id = session["user_id"]
        rows = User.query.get(user_id)
        image = rows.image

        return render_template("display_name.html", image=image)


# Upload file from message
@app.route("/upload_file_message", methods=["POST"])
def upload_file_message():
    upload_file = request.files["upload_file"]

    user_id = session["user_id"]
    rows = User.query.get(user_id)
    display_name_user = rows.display_name

    # Save file to correct directory
    os.makedirs(os.path.join(app.instance_path, 'root'), exist_ok=True)
    upload_file.save(os.path.join(app.instance_path, 'root', secure_filename(upload_file.filename)))

    # Upload file to s3
    file_name = "instance/root/" + upload_file.filename
    file_name = file_name.replace(" ", "_")
    file_name = file_name.replace("(", "")
    file_name = file_name.replace(")", "")
    key_name = rows.username + file_name
    upload_to_s3(file_name, key_name)

    # Update image file
    file_link = "https://connectapp-images.s3.ca-central-1.amazonaws.com/" + key_name

    return jsonify({"file_link": file_link})


# Validate display name form
@app.route("/validate_display_name", methods=["POST"])
def validate_display_name():
    display_name_user = request.form.get("display_name")

    if User.query.filter_by(display_name=display_name_user).count() != 0:
        return jsonify({"result": "false"})

    return jsonify({"result": "true"})


# Upload file to Amazon S3
def upload_to_s3(file_name, key_name):
    s3 = boto3.client('s3', aws_access_key_id="AKIAQWXTFYXYEET5EK4G", aws_secret_access_key="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", region_name="ca-central-1")
    bucket = 'connectapp-images'
    s3.upload_file(file_name, bucket, key_name, ExtraArgs={'ACL': 'public-read'})


# Message page
@app.route("/message", methods=["GET", "POST"])
@login_required
def message():

    # Create list to store the channels
    channel_list = []

    # Add channels from database to list
    rows_channel = Channel.query.all()

    for channel in rows_channel:
        channel_inner_list = []
        channel_inner_list.extend((channel.channel, channel.key))

        channel_list.append(channel_inner_list)

    # Get current channel through POST
    current_channel = request.args.get("current_channel")

    # Get the id, display name and username
    user_id = session["user_id"]

    rows = User.query.get(user_id)

    display_name_user = rows.display_name

    username = rows.username

    # Validate current channel and get the appropriate value for it
    if current_channel is None:

        # If the user first launches the website or loading it up:

        # Get the channel from saved channel database, if doesn't exist, add the first row and set current channel to # general
        if Saved_Channel.query.filter_by(username=username).count() == 0:
            current_channel = "# general"
            add_first_channel = Saved_Channel(username=username, previous_channel=current_channel)
            db.session.add(add_first_channel)
            db.session.commit()

        # Else, get the channel from saved channel database and set it as current channel
        else:
            previous_channel = Saved_Channel.query.filter_by(username=username).first()
            current_channel = previous_channel.previous_channel

    # If current channel value is passed from POST, set it as current channel
    else:
        existing_channel = Saved_Channel.query.filter_by(username=username).first()
        existing_channel.previous_channel = current_channel
        db.session.commit()

    # Get all the chat messages from the specific room
    all_chat = Chat.query.filter_by(room=current_channel).order_by(Chat.id.asc())

    # Handling the POST request
    if request.method == "POST":
        current_channel = request.form.get("current_channel")

        return redirect(url_for("message", current_channel=current_channel))

    else:
        return render_template("message.html", display_name_user=display_name_user, all_chat=all_chat,
                               current_channel=current_channel, channel_list=channel_list)


# Add channel function
@app.route("/add_channel", methods=["POST"])
def add_channel():

    # Get data from HTML form
    new_channel = request.form.get("new_channel")
    key = request.form.get("key")
    public_private = request.form.get("public_private")

    new_channel = "# " + new_channel

    # Error checking and information validation:
    if len(new_channel) > 17:
        return render_template("error.html", error_message="Channel's name is too long. Maximum is 15 characters")

    if Channel.query.filter_by(channel=new_channel).count() != 0:
        return render_template("error.html", error_message="Channel's name has been taken, please choose a different name")

    # Check if new channel is public or private and add key appropriately:
    if public_private == "public":
        add_new_channel = Channel(channel=new_channel, key="none")
        db.session.add(add_new_channel)

    elif public_private == "private":
        if not key:
            return render_template("error.html", error_message="Channel's key not found, please provide a key")

        add_new_channel = Channel(channel=new_channel, key=key)
        db.session.add(add_new_channel)

    db.session.commit()

    return redirect("/message")


# Check the inputs fields before adding a new channel
@app.route("/validate_add_channel", methods=["POST"])
def validate_add_channel():
    channel_name = request.form.get("channel_name")

    channel_name = "# " + channel_name

    if len(channel_name) > 17:
        return jsonify({"result": "too long"})

    if Channel.query.filter_by(channel=channel_name).count() != 0:
        return jsonify({"result": "taken"})

    return jsonify({"result": "true"})


# Validate channel's key function
@app.route("/check_channel_password", methods=["POST"])
def check_channel_password():

    # Get data from HTML form
    input_key = request.form.get("input_key")

    channel_name = request.form.get("channel_name")

    rows = Channel.query.filter_by(channel=channel_name).first()

    # Get the key of the respective channel in the database
    channel_key = rows.key

    # Return appropriate value through AJAX response to client's Javascript
    if input_key == channel_key:
        return jsonify({"password_check": "true"})

    else:
        return jsonify({"password_check": "false"})


# Join channel function
@socketio.on("join channel")
def join_channel(data):

    # Get the data from client's Javascript
    current_channel = data["current_channel"]

    # Join the room requested
    join_room(current_channel)


# Function to emmit the message to client
@socketio.on("submit message")
def socket_message(data):

    # Get data from the client sending the message
    msg = data["msg"]
    display_name_user = data["display_name"]
    current_channel = data["current_channel"]

    # Join the room the client is on
    join_room(current_channel)

    # Get the time
    currentDT = datetime.datetime.now()

    currentDT = currentDT.strftime("%I:%M %p | %d-%m-%Y")

    # Get the image
    rows = User.query.filter_by(display_name=display_name_user).first()
    image = rows.image

    # Get the username
    username_row = User.query.filter_by(display_name=display_name_user).first()
    username = username_row.username

    # Save message to database
    new_chat = Chat(username=username, messages=msg, time=currentDT, room=current_channel,
                    display_name=display_name_user, image=image)
    db.session.add(new_chat)
    db.session.commit()

    # Get the time and use it as timestamp for the message
    time_sent = currentDT

    # Emit the message to all users
    emit("announce message", {"msg": msg, "display_name_user": display_name_user, "time_sent": time_sent, "image": image, "username": username}, room=current_channel)


# Run the program
if __name__ == '__main__':
    socketio.run(app, debug=True)


