document.querySelector(".profile-picture").addEventListener("change", function() {
	display_profile_picture(event)
})

function display_profile_picture(event) {
	var tgt = event.target || window.event.srcElement,
	files = tgt.files;

	// Filereader support
	if (FileReader && files && files.length) {
		var fr = new FileReader();
		fr.onload = function () {
			document.querySelector(".profile-picture-src").src = fr.result
		}
		fr.readAsDataURL(files[0]);
	}
}

document.querySelector(".display-name-btn").addEventListener("click", function() {
	validate_display_name(event)
})

function validate_display_name(event) {
	// Prevent from submission
	event.preventDefault();

	// Clear previous errors
	clear_error();

	// Get all fields
	display_name = document.querySelector(".display-name-input");
	
	// Check field
	if (display_name.value === "" || display_name.value.length === 0) {
		var field = "Display Name"
		var error = "empty"
		create_error(field, error)
		return false
	}

	var result;

	$.ajax ({
		async: false,
		url: "validate_display_name",
		type: "POST",
		dataType: "json",
		data: {display_name: display_name.value},
		success: function(response) {
			result = response.result
		}
	});

	if (result == "false") {
		field = "Display Name"
		error = "taken"
		create_error(field, error)
		return false;
	}

	$(".display-name-form").submit();
}

function create_error(field, error) {
	error_block = document.querySelector(".error-block-outerdiv");
	error_innerblock = document.querySelector(".error-innerblock")

	if (field === "Display Name") {
		document.querySelector(".display-name-input").style.borderColor = "red";
	}

	if (error === "empty") {
		error_innerblock.innerHTML = field + " is empty"
	}

	if (error === "taken") {
		error_innerblock.innerHTML = field + " is already taken"
	}
 
	error_block.style.display = "block"
}

function clear_error() {
	document.querySelector(".error-block-outerdiv").style.display = "none";
	document.querySelector(".display-name-input").style.borderColor = "grey";
}