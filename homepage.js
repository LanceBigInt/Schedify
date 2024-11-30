const button = document.getElementById("gen-button");
const fileInput = document.getElementById("choose-file");

// Initially hide the button
button.style.visibility = "hidden";

// Main logic of the app.
fileInput.addEventListener("change", (buttonhide) => {
    if (fileInput.files.length === 0) {
        button.style.visibility = "hidden";
    } else {
        button.style.visibility = "visible";
    }
});



