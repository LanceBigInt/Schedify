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


const schedule = (pageText) => {
    console.log("=== Processing Schedule ===");
    
    const contentStart = pageText.indexOf("UNITS") + 5;
    const contentEnd = pageText.indexOf("TOTAL UNITS");
    const relevantText = pageText.substring(contentStart, contentEnd).trim();
    
    console.log("Processing text:", relevantText);
    
    const scheduleArray = [];
    
    // Split into individual subject entries using course codes as delimiters
    const subjectPattern = /([A-Z]+\d*[A-Z]*)\s+((?:[A-Z][A-Za-z\s]+[12]?)+(?:\s+(?:AND|&)?\s+[A-Z][A-Za-z\s]+)*)\s+([\w\/]+(?:\s+\d+)?)\s+([MTWTHFS]+)\s+([\d:APM\s-]+)\s+(?:ROOM\s+)?([\/\w\d]+)\s+([\d.]+)/g;
    
    const dayMap = {
        M: 'Monday',
        T: 'Tuesday',
        W: 'Wednesday',
        TH: 'Thursday',
        F: 'Friday',
        S: 'Saturday',
        SU: 'Sunday'
    };
    
    let match;
    while ((match = subjectPattern.exec(relevantText)) !== null) {
        const [_, subjectCode, description, section, day, time, room, units] = match;
        
        // Process days
        const dayCodes = day.match(/TH|[MTWFS]/g) || [];
        const days = dayCodes.map(d => dayMap[d] || d).join(', ');
        
        // Clean up room number
        const roomNumber = room.includes('VR') ? 
            room.trim() : 
            room.split('/')[0].trim();
            
        // Create entry
        scheduleArray.push({
            subjectCode: subjectCode.trim(),
            description: description.trim(),
            section: section.trim(),
            day: days,
            schedule: time.trim(),
            room: roomNumber.startsWith('VR') ? roomNumber : `Room ${roomNumber}`,
            units: units.trim()
        });
    }
    
    return JSON.stringify(scheduleArray, null, 2);
};


const logScheduleJSON = (pageText) => {
  const scheduleJSON = schedule(pageText);
  console.log(scheduleJSON);
};
