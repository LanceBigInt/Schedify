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
    const contentStart = pageText.indexOf("UNITS") + 5;
    const contentEnd = pageText.indexOf("TOTAL UNITS");
    const relevantText = pageText.substring(contentStart, contentEnd).trim();

    console.log("Processing text:", relevantText);

    // Improved regex patterns to handle all cases
    const subjectPattern = /([A-Z]+\d*[A-Z]*)\s+([A-Z\sA-Z\s0-9.'&]+)\s+([A-Z0-9]+)\s+((?:[MTWTHFS]+a?\s+[\d:APM\s-]+(?:ROOM|Room|VR)\s*[^\s]+\s*)+)([\d.]+)/g;
    const schedulePattern = /([MTWTHFS]+a?)\s+([\d:APM\s-]+)\s+(?:ROOM|Room|VR)\s*([^\s]+)/g;

    // Split text into course entries using .0 as delimiter
    const regex = /\d+\.0/g;
    let combinedLines = [];
    let previousIndex = 0;

    let match;
    while ((match = regex.exec(relevantText)) !== null) {
        const beforeMatch = relevantText.substring(previousIndex, match.index + match[0].length);
        combinedLines.push(beforeMatch.trim());
        previousIndex = regex.lastIndex;
    }

    // Add remaining text after last match
    const remainingText = relevantText.substring(previousIndex).trim();
    if (remainingText) {
        combinedLines.push(remainingText);
    }

    // Process each line and build schedule array
    const scheduleArray = [];
    const processedCourses = new Map(); // Track courses to combine multiple schedules

    combinedLines.forEach((line) => {
        if (line.trim() === "") return;

        let courseMatch;
        while ((courseMatch = subjectPattern.exec(line)) !== null) {
            const [_, code, name, section, scheduleBlock, units] = courseMatch;
            
            const courseKey = `${code.trim()}-${section.trim()}`;
            const schedules = [];

            let scheduleMatch;
            while ((scheduleMatch = schedulePattern.exec(scheduleBlock)) !== null) {
                const [__, day, time, room] = scheduleMatch;
                
                schedules.push({
                    day: day.trim(),
                    schedule: time.trim(),
                    room: room.includes('VR') ? 
                    `${room.trim()}` : 
                    `Room ${room.trim()}`
                });
            }

            // Combine schedules for the same course
            if (processedCourses.has(courseKey)) {
                const existingCourse = processedCourses.get(courseKey);
                existingCourse.schedules.push(...schedules);
            } else {
                const courseEntry = {
                    code: code.trim(),
                    name: name.trim(),
                    section: section.trim(),
                    units: units,
                    schedules: schedules
                };
                processedCourses.set(courseKey, courseEntry);
                scheduleArray.push(courseEntry);
            }
        }
    });

    return JSON.stringify({ courses: scheduleArray }, null, 2);
};

const logScheduleJSON = (pageText) => {
    const scheduleJSON = schedule(pageText);
    console.log(scheduleJSON);
};