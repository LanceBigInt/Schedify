import { useState, useEffect } from "react";
import {
  FileUploadDropzone,
  FileUploadList,
  FileUploadRoot,
} from "@/components/ui/file-upload";
import { processPDF } from "@/pdfHandler";
import "./App.css";

// Interfaces
interface Schedule {
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

function App() {
  const [acceptedFiles, setAcceptedFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduleData, setScheduleData] = useState<ParsedSchedule | null>(null);

  const handleFileChange = async (details: { files: File[] }) => {
    if (!details.files.length) return;

    setAcceptedFiles(details.files);
    setIsLoading(true);
    setError(null);

    try {
      const file = details.files[0];
      if (file.type !== "application/pdf") {
        throw new Error("Please upload a PDF file");
      }

      const result = await processPDF(file);
      setScheduleData(result);
    } catch (err) {
      console.error("PDF processing error:", err);
      setError(err instanceof Error ? err.message : "Failed to process PDF");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        if (isLoading) {
          setError(
            "Processing is taking longer than expected. Please try again."
          );
          setIsLoading(false);
        }
      }, 100); // 10 second timeout

      return () => clearTimeout(timeout);
    }
  }, [isLoading]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center">
      <div className="flex flex-col">
        <main className="container mx-auto px-4 py-10 max-w-3xl">
          <div className="space-y-6 bg-white shadow-lg rounded-lg p-6 md:p-8 justify-center">
            <div className="text-center">
              <h1 className="text-2xl md:text-3xl font-semibold text-black subpixel-antialiased">
                Schedify
              </h1>
              <p className="text-sm md:text-base font-light text-gray-700 mt-2">
                Organize your day with Schedify
              </p>
              {isLoading && (
                <div className="mt-4 flex items-center justify-center space-x-2">
                  <svg
                    className="animate-spin h-5 w-5 text-blue-500"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span className="text-blue-600">Processing PDF...</span>
                </div>
              )}
              {error && (
                <div className="mt-4">
                  <p className="text-red-600">{error}</p>
                </div>
              )}
              {scheduleData && (
                <div className="mt-4 space-y-4">
                  <h2 className="text-lg font-medium">
                    Processed Courses: {scheduleData.courses.length}
                  </h2>
                  {scheduleData.courses.map((course, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold">
                        {course.code} - {course.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Section: {course.section} | Units: {course.units}
                      </p>
                      <div className="mt-2">
                        {course.schedules.map((schedule, idx) => (
                          <p key={idx} className="text-sm">
                            {schedule.day} | {schedule.schedule} |{" "}
                            {schedule.room}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <FileUploadRoot
              maxW="xl"
              alignItems="stretch"
              maxFiles={1}
              onFileAccept={handleFileChange}
              className="w-full"
              accept="application/pdf"
            >
              <FileUploadDropzone
                label="Upload your Certificate of Registration here"
                description="Only PDF files are accepted"
                className="flex flex-col bg-gray-100 rounded-lg p-6 md:p-24 text-center items-center justify-center gap-2 shadow-inner text-black hover:shadow-2xl transition-all duration-300 ease-out"
              />
              <FileUploadList files={acceptedFiles} showSize clearable />
            </FileUploadRoot>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
