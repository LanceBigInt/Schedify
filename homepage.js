const button = document.getElementById("gen-button");
const fileInput = document.getElementById("choose-file");

// Initially hide the button
button.style.visibility = "hidden";

// Main logic of the app.
fileInput.addEventListener("change", () => {
    if (fileInput.files.length === 0) {
        button.style.visibility = "hidden";
    } else {
        button.style.visibility = "visible";
    }
});

// Checking if the PDF.js lib has properly loaded
if (typeof pdfjsLib === 'undefined') {
    console.error('PDF.js library is not loaded');
} else {
    console.log('PDF.js library loaded successfully');
}

document.getElementById('gen-button').addEventListener('click', function () {
    const file = fileInput.files[0];
    if (file && file.type === 'application/pdf') { // Checks if the file is in PDF format
        const fileReader = new FileReader(); // This is the function that reads the contents of the file

        fileReader.onload = function () { // onload event happens when the Filereader has finished reading the file
            const typedArray = new Uint8Array(this.result); // Converted to Uint8Array so that the PDF.js lib can process it

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

                Promise.all(pagesPromises).then(pagesText => {
                  const fullText = pagesText.join('\n');
                  const normalizedText = normalizeText(fullText);
                  logScheduleJSON(normalizedText);
              });

            }).catch(error => {
                console.error('Error loading PDF:', error);
            });
        };

        fileReader.readAsArrayBuffer(file);
    } else {
        alert('Please upload a valid PDF file.');
    }
});

const normalizeText = (text) => {
  console.log("=== Starting Text Normalization ===");
  console.log("Original text:", text);
  
  // Remove multiple spaces, tabs, and newlines
  const normalized = text
      .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
      .replace(/\n+/g, ' ')  // Replace newlines with space
      .trim();               // Remove leading/trailing whitespace
  
  console.log("Normalized text:", normalized);
  console.log("=== Normalization Complete ===");
  return normalized;
};


// Function to parse the schedule from the normalized text
const schedule = (pageText) => {
    console.log("=== Processing Schedule ===");

    // Extract relevant content based on keywords "UNITS" and "TOTAL UNITS"
    // The idea is to extract the part of the pageText between "UNITS" and "TOTAL UNITS"
    const contentStart = pageText.indexOf("UNITS") + 5;  // Start after the keyword "UNITS"
    const contentEnd = pageText.indexOf("TOTAL UNITS"); // End before the keyword "TOTAL UNITS"
    
    // The relevantText holds the portion of the page that contains the actual schedule
    const relevantText = pageText.substring(contentStart, contentEnd).trim();

    console.log("Processing text:", relevantText);

    // Regex to find occurrences of ".0" (to separate lines or values in the content)
    const regex = /\d+\.0/g;  // This regex matches any number followed by ".0"
    let combinedLines = [];
    let previousIndex = 0;

    // Iterate through all occurrences of ".0" to split the text into lines
    let match;
    while ((match = regex.exec(relevantText)) !== null) {
        // Extract the part of the string before and after the current match
        const beforeMatch = relevantText.substring(previousIndex, match.index + match[0].length);
        const afterMatch = relevantText.substring(match.index + match[0].length).trim();

        // Split the beforeMatch and afterMatch into individual lines
        const linesBefore = beforeMatch.split("\n");
        const linesAfter = afterMatch.split("\n");

        // Combine the lines before the match with the combined lines array
        combinedLines = [...combinedLines, ...linesBefore];

        // Move the previousIndex to the end of the current match for the next iteration
        previousIndex = regex.lastIndex;
    }

    // After processing all matches, split the remaining part of the string
    const remainingText = relevantText.substring(previousIndex).trim();
    const remainingLines = remainingText.split("\n");

    // Add any remaining lines after the last match
    combinedLines = [...combinedLines, ...remainingLines];
    console.log("Combined lines:", combinedLines);

    const scheduleArray = [];
    
    const subjectPattern = /([A-Z]+\d*[A-Z]*)\s+([A-Z\s.']+)\s+([A-Z\d]+)\s+((?:[MTWTHFS]+\s[\d:APM\s-]+ROOM\s+\d+\s+)+)([\d.]+)/g;

    // Regular expression to match individual schedule entries (day, time, room)
    const schedulePattern = /([MTWTHFS]+)\s+([\d:APM\s-]+)\s+ROOM\s+(\d+)/g;

    // Iterate through each line in combinedLines for further processing
    combinedLines.forEach((line) => {
        if (line.trim() === "") return;  // Skip empty lines
        
        let match;
        while ((match = subjectPattern.exec(line)) !== null) {
            // Extract the individual components for each match
            const [_, subjectCode, description, section, scheduleBlock, units] = match;

            let scheduleMatch;
            while ((scheduleMatch = schedulePattern.exec(scheduleBlock)) !== null) {
                // Extract the details of each schedule (day, time, room)
                const [__, day, time, room] = scheduleMatch;
                
                // Push the extracted data into the scheduleArray
                scheduleArray.push({
                    subjectCode: subjectCode.trim(),
                    description: description.trim(),
                    section: section.trim(),
                    day: day.trim(),
                    schedule: time.trim(),
                    room: `Room ${room.trim()}`,
                    units: units.trim()
                });
            }
        }
    });

    // Return the final array of parsed schedule data
    return JSON.stringify(scheduleArray, null, 2); 
};

const logScheduleJSON = (pageText) => {
  const scheduleJSON = schedule(pageText);
  console.log(scheduleJSON);
};