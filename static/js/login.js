document.querySelector(".login-button").addEventListener("click", function() {
	validate_register(event)
})

function validate_register(event) {
	// Prevent from submission
	event.preventDefault();

	// Clear previous errors
	clear_error();

	// Get all fields
	username = document.querySelector(".login-username");
	password = document.querySelector(".login-password");
	
	// Check username
	if (username.value === "" || username.value.length === 0) {
		var field = "Username"
		var error = "empty"
		create_error(field, error)
		return false
	}

	// Check password
	if (password.value === "" || password.value.length === 0) {
		field = "Password"
		error = "empty"
		create_error(field, error)
		return false
	}

	var result;

	$.ajax ({
		async: false,
		url: "validate_login",
		type: "POST",
		dataType: "json",
		data: {username: username.value, password: password.value},
		success: function(response) {
			result = response.result
		}
	});

	if (result == "false") {
		field = "Both"
		error = "incorrect"
		create_error(field, error)
		return false;
	}

	$(".login-form").submit();
}

function create_error(field, error) {
	error_block = document.querySelector(".error-block");
	error_innerblock = document.querySelector(".error-innerblock")

	if (field === "Username") {
		document.querySelector(".login-username").style.borderColor = "red";
	}

	else if (field === "Password") {
		document.querySelector(".login-password").style.borderColor = "red";
	}

	else {
		document.querySelector(".login-username").style.borderColor = "red";
		document.querySelector(".login-password").style.borderColor = "red";
	}


	if (error === "empty") {
		error_innerblock.innerHTML = field + " is empty"
	}

	if (error === "incorrect") {
		error_innerblock.innerHTML = "Incorrect Username/Password"
}
 
	error_block.style.display = "block"
}

function clear_error() {
	document.querySelector(".error-block").style.display = "none";
	document.querySelector(".login-username").style.borderColor = "grey";
	document.querySelector(".login-password").style.borderColor = "grey";
}