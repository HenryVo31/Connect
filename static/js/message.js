// Listen to events within the page
document.addEventListener('DOMContentLoaded', () => {

	// Connect to websocket
	var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

	// As socket.io is connected:
	socket.on('connect', () => {

		// Main process:

		// Get the display name of the user
		user = document.getElementById('display_name_for_JS').innerHTML;

		// Check whether the user's display name is in the local storage
		if (user !== localStorage.getItem("user")) {

			localStorage.setItem("user", user);
			localStorage.removeItem('current_channel');
			localStorage.removeItem('default_channel');
		};

		// Get the current channel from local storage
		var current_channel = localStorage.getItem('current_channel');

		// Set current channel to # general if its value is null
		if (current_channel === null) {
			current_channel = "# general";
		}

		// If it is a first time user, set their channel and send this data to Python
		if (localStorage.getItem("default_channel") === null) {

			localStorage.setItem("default_channel", current_channel);

			document.getElementById('hidden-input').value = current_channel;
			document.getElementById('hidden-form').submit();
		}

		// Emit the channel to Python
		socket.emit('join channel', {'current_channel': current_channel});

		// Scroll down the page to the latest message
		var message_box = document.querySelector('.message-box');
		message_box.scrollTop = message_box.scrollHeight;

		// Setting up standard channels' buttons
		document.querySelectorAll('.list-group-item').forEach(function(channel) {
			channel.onclick = () => {

				// Get the channel from the button
				current_channel = channel.innerHTML;

				// Store the channel in local storage
				localStorage.setItem("current_channel", current_channel);

				// Submit this data back to Python
				document.getElementById('hidden-input').value = current_channel;
				document.getElementById('hidden-form').submit();
			};
		});

		// Setting up private channels' buttons
		document.querySelectorAll('.list-group-item-private').forEach(function(channel) {
			channel.onclick = () => {

				// Open the overlay
				open_channel_key_overlay();

				// When the join button is clicked:
				document.getElementById('join_private_channel_button').onclick = () => {

					// Get the channel from the button
					current_channel = channel.innerHTML.replace(' <i class="fa fa-lock" aria-hidden="true"></i>', "");

					// Get the inputted channel's key
					var channel_key = document.getElementById('enter_channel_key').value;

					// Set a boolean
      				var password_check;

      				// Send the channel's key to Python through AJAX and get a boolean in return
      				$.ajax ({

      					async: false,
      					url: "check_channel_password",
      					type: "POST",
      					dataType: "json",
      					data: {input_key: channel_key, channel_name: current_channel},
      					success: function(result) {
      						password_check = result.password_check;
      					}
      				});

      				// If boolean is false, channel's key is incorrect
      				if (password_check == "false") {
      					document.querySelector(".channel-key-error-div").style.display = "block";
                                    document.querySelector("#enter_channel_key").style.borderColor = "red";
      					return false;
      				};

      				// Set the channel in local storage
      				localStorage.setItem("current_channel", current_channel);

      				// Submit the channel to Python
      				document.getElementById('hidden-input').value = current_channel;
      				document.getElementById('hidden-form').submit();
      			};
			};
		});	

            // When the user press Enter in the input box, link this to a button click
            document.querySelector('#input-message').addEventListener('keyup', function(event) {
                  if (event.keyCode === 13) {
                        event.preventDefault();
                        // Linking pressing Enter with button being clicked
                        document.querySelector('#message-button').click();
                  };
            });

            // When message button is clicked, emit the message
            document.querySelector('#message-button').onclick = () => {

                  // Get the message
                  const msg = document.getElementById('input-message').value;

                  // Error checking:
                  if (msg.trim().length === 0) {
                        return false;
                  }

                  // Get the user's display name
                  const display_name = document.getElementById('display_name_for_JS').innerHTML;

                  // Emit the message to Python
                  socket.emit('submit message', {'msg': msg, 'display_name': display_name, 'current_channel': current_channel});

                  // Clear the input field
                  document.getElementById('input-message').value = ""
            };
      });

      // When a new message is announced, broadcast it to all computers in the channel
      socket.on('announce message', data => {

            // Append new messages to message list:

            // Get message item
            const message_item = document.createElement('div')
            message_item.className = "message-item"

            // Get message item image
            const message_item_img = document.createElement('div')
            message_item_img.className = "message-item-img"

            // Get image
            const message_img = document.createElement('img')
            message_img.src = data.image

            // Append above
            message_item_img.appendChild(message_img)
            message_item.append(message_item_img)

            //////////////////////////////////////////////

            // Get message item body
            const message_item_body = document.createElement('div');
            message_item_body.className = "message-item-body";

            // Get the display name
            const header = document.createElement('header');
            header.innerHTML = data.display_name_user;

            // Get the body of the message

            // Customize body of message depending on type of input
            const chat_message_link = document.createElement('a');
            chat_message_link.href = data.msg;
            const li = document.createElement('li');
            var message;

            if (data.msg.includes("https://connectapp-images.s3.ca-central-1.amazonaws.com")) {
                  const chat_message_file_div = document.createElement('div')
                  chat_message_file_div.className = "chat-message-file-div"
                  const chat_message_file_innerdiv = document.createElement('div')
                  chat_message_file_innerdiv.className = "chat-message-file-innerdiv"
                  const file_icon = document.createElement('i')
                  file_icon.className = "fas fa-file"
                  const chat_message_file = document.createElement('div')
                  chat_message_file.className = "chat-message-file";

                  replaced_str = "https://connectapp-images.s3.ca-central-1.amazonaws.com/" + data.username + "instance/root/"
                  chat_message_file.innerHTML = data.msg.replace(replaced_str, "")
                  chat_message_file_innerdiv.append(file_icon)
                  chat_message_file_innerdiv.append(chat_message_file)
                  chat_message_file_div.append(chat_message_file_innerdiv)
                  li.append(chat_message_file_div)
                  chat_message_link.append(li)
                  message = chat_message_link
            }

            else if (data.msg.includes("https://")) {
                  li.innerHTML = data.msg
                  chat_message_link.append(li)
                  message = chat_message_link
            }

            else {
                  li.innerHTML = data.msg
                  message = li
            }

            // Create outer div for timestamp div
            const outer_div = document.createElement('div')
            outer_div.className = "chat-time-outer"

            // Create inner div for timestamp
            const div = document.createElement('div');
            div.innerHTML = data.time_sent;
            div.className = "chat-time-inner";

            // Append above
            outer_div.appendChild(div);
            message_item_body.append(header);
            message_item_body.append(outer_div);
            message_item_body.append(message);
            message_item.append(message_item_body);

            // Append everything to the message list
            var message_list = document.querySelector('#message-list');
            message_list.append(message_item);

            // Scroll to bottom of page when a new message appears
            var message_box = document.querySelector('.message-box');
            message_box.scrollTop = message_box.scrollHeight;
      });
});

function upload_file() {
      // Check if file is present
      file = document.getElementById("upload-file")
      if (file.value === "" || file.value === null) {
            document.querySelector(".upload-error-div").style.display = "block";
            document.querySelector("#upload-file").style.borderColor = "red";
            return false;
      }

      // Turn the file into its appropriate format
      var file_data = new FormData($('#upload-form')[0]);

      // Send file to Python to upload to S3. Return the link to file on S3
      var file_link;

      // Send the channel's key to Python through AJAX and get a boolean in return
      $.ajax ({
            async: false,
            url: "upload_file_message",
            processData: false,
            contentType: false,
            type: "POST",
            data: file_data,
            success: function(result) {
                  file_link = result.file_link;
            }
      });

      // Fill in message box
      document.getElementById("input-message").value = file_link;
      document.querySelector('#message-button').click();

      // Close overlay
      close_upload_overlay();
}

// Opening the channel panel in mobile version
function channel_panel_open() {
      document.querySelector(".open-menu-btn").style.display = "none";
      document.querySelector(".channel-panel").style.width = "100%";
};

// Closing the channel panel in mobile version
function channel_panel_close() {
      document.querySelector(".open-menu-btn").style.display = "block";
      document.querySelector(".channel-panel").style.width = "0";
};

// Opening the overlay
function open_overlay() {
      document.getElementById('add_channel_overlay').style.display = "flex";
}

// Closing the overlay
function close_overlay() {
      clear_error();
      document.getElementById('add_channel_overlay').style.display = "none";
}

// Hide the key input field if user choose public
function hide_key() {
      document.getElementById('key_input').style.display = "none";
};

// Show the key input field if the user choose private
function show_key() {
      document.getElementById("key_input").style.display = "inline-block";
};

// Open the channel key overlay
function open_channel_key_overlay() {
      document.getElementById('channel_key_overlay').style.display = "flex";
};

// Close the channel key overlay
function close_channel_key_overlay() {
      document.getElementById('channel_key_overlay').style.display = "none";
      document.querySelector(".channel-key-error-div").style.display = "none"
      document.querySelector("#enter_channel_key").style.borderColor = "grey";
}

// Open upload overlay
function open_upload_overlay() {
      document.querySelector(".upload-file-overlay").style.display = "flex";
}

// Close upload overlay
function close_upload_overlay() {
      document.querySelector(".upload-file-overlay").style.display = "none";
      document.querySelector("#upload-file").value = null;
      document.querySelector(".upload-error-div").style.display = "none";
      document.querySelector("#upload-file").style.borderColor = "grey";
}

// Check inputs fields before adding channel
document.querySelector(".add-channel-btn").addEventListener("click", function() {
      validate_add_channel(event)
})

function validate_add_channel(event) {
      // Prevent from submission
      event.preventDefault();

      // Clear previous errors
      clear_error();

      // Get all fields
      channel_name = document.querySelector("#create_channel_input");
      channel_key = document.querySelector("#key_input");

      // Check name
      if (channel_name.value === "" || channel_name.value.length === 0) {
            var field = "Channel Name"
            var error = "empty"
            create_error(field, error)
            return false
      }

      var result;

      $.ajax ({
            async: false,
            url: "validate_add_channel",
            type: "POST",
            dataType: "json",
            data: {channel_name: channel_name.value},
            success: function(response) {
                  result = response.result
            }
      });

      if (result == "too long") {
            field = "Channel Name"
            error = "too long"
            create_error(field, error)
            return false;
      }

      if (result == "taken") {
            field = "Channel Name"
            error = "taken"
            create_error(field, error)
            return false;
      }

      if ($(channel_key).is(':visible')) {

            // Check key
            if (channel_key.value === "" || channel_key.value.length === 0) {
                  field = "Channel Key"
                  error = "empty"
                  create_error(field, error)
                  return false
            }
      }

      // Submit form
      $(".add-channel-form").submit();

      // Close overlay
      close_overlay();
}

function create_error(field, error) {
      add_channel_error_div = document.querySelector(".add-channel-error-div");
      add_channel_error_innerdiv = document.querySelector(".add-channel-error-innerdiv")

      if (field === "Channel Name") {
            document.querySelector("#create_channel_input").style.borderColor = "red";
      }

      else {
            document.querySelector("#key_input").style.borderColor = "red";
      }

      if (error === "empty") {
            add_channel_error_innerdiv.innerHTML = field + " is empty"
      }

      if (error === "too long") {
            add_channel_error_innerdiv.innerHTML = field + " exceeds the maximum 15 characters"
      }

      if (error === "taken") {
            add_channel_error_innerdiv.innerHTML = field + " is already taken"
      }
 
      add_channel_error_div.style.display = "block";
}

function clear_error() {
      document.querySelector(".add-channel-error-div").style.display = "none";
      document.querySelector("#create_channel_input").style.borderColor = "black";
      document.querySelector("#key_input").style.borderColor = "black";
}