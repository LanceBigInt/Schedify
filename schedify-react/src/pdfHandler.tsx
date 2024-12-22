import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocumentProxy, PDFPageProxy, TextContent, TextItem } from 'pdfjs-dist/types/src/display/api';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155/pdf.worker.min.mjs`;

// Interfaces
export interface Schedule {
    day: string;
    schedule: string;
    room: string;
}

interface CourseEntry {
    code: string;
    name: string;
    section: string;
    units: string;
    schedules: Schedule[];
}

interface ParsedSchedule {
    courses: CourseEntry[];
}

// Normalize and clean up extracted text
const normalizeText = (text: string): string => {
    console.log("=== Starting Text Normalization ===");
    return text
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, ' ')
        .trim();
};

// Main function to process the PDF
export const processPDF = async (file: File): Promise<ParsedSchedule> => {
    if (!file || file.type !== 'application/pdf') {
        throw new Error('Please provide a valid PDF file.');
    }

    const arrayBuffer = await file.arrayBuffer();
    const typedArray = new Uint8Array(arrayBuffer);

    try {
        const pdf: PDFDocumentProxy = await pdfjsLib.getDocument(typedArray).promise;
        const page = await pdf.getPage(1);
        const content = await page.getTextContent();
        const text = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ');
        const normalizedText = normalizeText(text);
        return parseSchedule(normalizedText);
    } catch (error) {
        console.error('Error processing PDF:', error);
        throw error;
    }
};

// Function to parse the schedule from the extracted text
const parseSchedule = (pageText: string): ParsedSchedule => {
    console.log("=== Processing Schedule ===");

    const contentStart: number = pageText.indexOf("UNITS") + 5;
    const contentEnd: number = pageText.indexOf("TOTAL UNITS");
    if (contentStart < 0 || contentEnd < 0) {
        throw new Error("Failed to locate the relevant section in the text.");
    }
    const relevantText: string = pageText.substring(contentStart, contentEnd).trim();

    console.log("Relevant Text:", relevantText);

    const subjectPattern = /^([A-Z0-9]+)\s+([A-Z0-9\s.'&,\-]+)\s+([A-Z0-9\/]+\s?[A-Z0-9]+)\s+((?:[MTWTHFS]+a?\s+[\d:APM\s-]+(?:ROOM|Room|Gym|VR)?\s*[^\s]*.*?)+?)\s+([\d.]+)$/i;
    const schedulePattern = /([MTWTHFS]+a?)\s+([\d:APM\s-]+)\s*(?:ROOM|Room|Gym|VR)?\s*([^\s]+.*)/g;

    const combinedLines: string[] = relevantText.split(/(?<=\d\.0)\s+/).map((line) => line.trim());
    console.log("Combined Lines:", combinedLines);

    const scheduleArray: CourseEntry[] = [];
    const processedCourses = new Map<string, CourseEntry>();

    combinedLines.forEach((line) => {
        if (line.trim() === "") return;

        const courseMatch = subjectPattern.exec(line);
        if (courseMatch) {
            const [, code, name, section, scheduleBlock, units] = courseMatch;
            const courseKey = `${code.trim()}-${section.trim()}`;

            const schedules: Schedule[] = [];
            let scheduleMatch: RegExpExecArray | null;

            while ((scheduleMatch = schedulePattern.exec(scheduleBlock)) !== null) {
                const [, day, time, room] = scheduleMatch;

                schedules.push({
                    day: day.trim(),
                    schedule: time.trim(),
                    room: room.includes('VR') ? room.trim() : `Room ${room.trim()}`,
                });
            }

            // Merge schedules if the course already exists
            if (processedCourses.has(courseKey)) {
                const existingCourse = processedCourses.get(courseKey);
                if (existingCourse) {
                    existingCourse.schedules.push(...schedules);
                }
            } else {
                const courseEntry: CourseEntry = {
                    code: code.trim(),
                    name: name.trim(),
                    section: section.trim(),
                    units: units.trim(),
                    schedules: schedules,
                };
                processedCourses.set(courseKey, courseEntry);
                scheduleArray.push(courseEntry);
            }
        } else {
            console.warn("Unmatched Line:", line);
        }
    });

    return { courses: scheduleArray };
};