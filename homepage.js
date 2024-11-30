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

//Checking if the PDF.js lib has properly loaded
if (typeof pdfjsLib === 'undefined') {
    console.error('PDF.js library is not loaded');
  } else {
    console.log('PDF.js library loaded successfully');
  }

const button = document.getElementById("gen-button");
const fileInput = document.getElementById("choose-file");

document.getElementById('gen-button').addEventListener('click', function (event) {
    const file = fileInput.files[0];
    if (file && file.type === 'application/pdf') { //Checks if the file is in PDF format
      const fileReader = new FileReader(); //This is the function that reads the contents of the file
  
      fileReader.onload = function () { //onload event happens when the Filereader has finished reading the file
        const typedArray = new Uint8Array(this.result); //Converted to Uint8Array so that the PDF.js lib can process it
  
        // Load PDF using PDF.js library
        pdfjsLib.getDocument(typedArray).promise.then(pdf => {
          console.log(`PDF loaded: ${file.name}, Total pages: ${pdf.numPages}`);
          
          const pagesPromises = [];
          for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
            pagesPromises.push(
              pdf.getPage(pageNumber).then(page => {
                console.log(`Processing page ${pageNumber}`);
                return page.getTextContent().then(textContent => {
                  const pageText = textContent.items.map(item => item.str).join(' ');
                  console.log(`Extracted text from page ${pageNumber}:`, pageText);
                  return pageText;
                });
              })
            );
          }
  
        }).catch(error => {
          console.error('Error loading PDF:', error);
        });
      };
  
      fileReader.readAsArrayBuffer(file);
    } else {
      alert('Please upload a valid PDF file.');
    }
  });


