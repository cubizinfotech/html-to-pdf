const express = require("express");
const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
const PORT = 3000;

// Middleware to parse JSON
app.use(express.json());

// Directory to store PDFs
const pdfDirectory = path.join(__dirname, "pdfs");
if (!fs.existsSync(pdfDirectory)) {
  fs.mkdirSync(pdfDirectory);
}

// First API: Convert HTML to PDF
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

  try {
    // Launch Puppeteer
    console.log("Launching Puppeteer browser...");
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage();
    console.log("Navigating to the provided URL...");

    // Log additional info if the URL is problematic
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    // Load the HTML file with adjusted timeout and waitUntil
    console.log(`Loading URL: ${url}`);
    await page.goto(url, { 
      waitUntil: "load", // Wait until the DOM is fully loaded
      timeout: 600000  // Set timeout to 10 minutes for slow pages
    });

    console.log("Page loaded successfully!");

    // Generate the PDF
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
    });
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
  /*
  try {
    // Launch Puppeteer
    console.log("Launching Puppeteer browser...");
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage();
    console.log("Navigating to the provided URL...");

    // Load the HTML file
    await page.goto(url, { waitUntil: "networkidle0", timeout: 300000 });
    console.log("Page loaded successfully!");

    // Generate the PDF
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
    });
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
  */
});

// Second API: Delete PDF
app.delete("/delete-pdf", (req, res) => {
  const { filename } = req.body;

  if (!filename) {
    return res
      .status(400)
      .json({ status: "error", message: "Filename is required." });
  }

  const filePath = path.join(pdfDirectory, filename);

  if (!fs.existsSync(filePath)) {
    return res
      .status(404)
      .json({ status: "error", message: "File not found." });
  }

  try {
    fs.unlinkSync(filePath);
    return res.json({
      status: "success",
      message: "File deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting file:", error);
    return res
      .status(500)
      .json({ status: "error", message: "Failed to delete file." });
  }
});

// Serve PDFs
app.use("/pdfs", express.static(pdfDirectory));

// Default route
app.get("/", (req, res) => {
  res.send("Welcome to the HTML to PDF converter API!");
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port:${PORT}`);
});
