const express = require("express");
const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
const PORT = 3000;

// Directory to store PDFs
const pdfDirectory = path.join(__dirname, "pdfs");

// Create the directory if it doesn't exist
if (!fs.existsSync(pdfDirectory)) {
  fs.mkdirSync(pdfDirectory);
  console.log("PDF directory created at:", pdfDirectory);
}

// API: Convert HTML to PDF
app.post("/html-to-pdf", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    console.error("No URL provided in the request.");
    return res
      .status(400)
      .json({ status: "error", message: "HTML file URL is required." });
  }

  const uniqueName = `${uuidv4()}.pdf`;
  const pdfPath = path.join(pdfDirectory, uniqueName);

  console.log(`Request to convert HTML to PDF for URL: ${url}`);

  try {
    // Launch Puppeteer browser instance
    console.log("Launching Puppeteer browser...");
    const browser = await puppeteer.launch({
      headless: true,  // Set to true to run in headless mode
      args: ["--no-sandbox", "--disable-setuid-sandbox"],  // Required for some environments like Docker
    });

    const page = await browser.newPage();
    console.log("Navigating to the provided URL...");

    // Try to open the page, increase the timeout to 2 minutes
    await page.goto(url, { waitUntil: "networkidle0", timeout: 180000 });
    console.log("Page loaded successfully!");

    // Generate the PDF and save it
    await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
    console.log(`PDF generated successfully and saved to: ${pdfPath}`);

    await browser.close();
    console.log("Browser closed successfully.");

    // Return the file URL
    const fileUrl = `${req.protocol}://${req.get("host")}/pdfs/${uniqueName}`;
    return res.json({ status: "success", pdfUrl: fileUrl });
  } catch (error) {
    console.error("Error generating PDF:", error);

    // Handle specific timeout error or other errors
    if (error.name === 'TimeoutError') {
      return res.status(500).json({
        status: "error",
        message: "Navigation timeout exceeded. The page took too long to load."
      });
    }

    return res.status(500).json({
      status: "error",
      message: "Failed to generate PDF due to an unexpected error."
    });
  }
});

// Serve PDFs (static files)
app.use("/pdfs", express.static(pdfDirectory));

// Default route
app.get("/", (req, res) => {
  res.send("Welcome to the HTML to PDF converter API!");
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
