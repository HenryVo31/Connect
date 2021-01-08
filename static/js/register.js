document.querySelector(".register-button").addEventListener("click", function() {
	validate_register(event)
})

function validate_register(event) {
	// Prevent from submission
	event.preventDefault();

	// Clear previous errors
	clear_error();

	// Get all fields
	username = document.querySelector(".register-username");
	password = document.querySelector(".register-password");
	confirm_password = document.querySelector(".register-confirm-password");
	
	// Check username
	if (username.value === "" || username.value.length === 0) {
		var field = "Username"
		var error = "empty"
		create_error(field, error)
		return false
	}

	var result;

	$.ajax ({
		async: false,
		url: "validate_register",
		type: "POST",
		dataType: "json",
		data: {username: username.value},
		success: function(response) {
			result = response.result
		}
	});

	if (result == "false") {
		field = "Username"
		error = "taken"
		create_error(field, error)
		return false;
	}

	// Check password
	if (password.value === "" || password.value.length === 0) {
		field = "Password"
		error = "empty"
		create_error(field, error)
		return false
	}

	// Check confirm password
	if (confirm_password.value === "" || confirm_password.value === 0) {
		field = "Confirm Password"
		error = "empty"
		create_error(field, error)
		return false
	}

	else {
		if (confirm_password.value != password.value) {
			field = "Confirm Password"
			error = "no match"
			create_error(field, error)
			return false
		}
	}

	$(".register-form").submit();
}

function create_error(field, error) {
	error_block = document.querySelector(".error-block");
	error_innerblock = document.querySelector(".error-innerblock")

	if (field === "Username") {
		document.querySelector(".register-username").style.borderColor = "red";
	}

	else if (field === "Password") {
		document.querySelector(".register-password").style.borderColor = "red";
	}

	else {
		document.querySelector(".register-confirm-password").style.borderColor = "red";
	}

	if (error === "empty") {
		error_innerblock.innerHTML = field + " is empty"
	}

	if (error === "taken") {
		error_innerblock.innerHTML = field + " is already taken"
	}

	if (error === "no match") {
		error_innerblock.innerHTML = field + " does not match Password"
}
 
	error_block.style.display = "block"
}

function clear_error() {
	document.querySelector(".error-block").style.display = "none";
	document.querySelector(".register-username").style.borderColor = "grey";
	document.querySelector(".register-password").style.borderColor = "grey";
	document.querySelector(".register-confirm-password").style.borderColor = "grey";
}