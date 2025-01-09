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
    return res
      .status(400)
      .json({ status: "error", message: "HTML file URL is required." });
  }

  const uniqueName = `${uuidv4()}.pdf`;
  const pdfPath = path.join(pdfDirectory, uniqueName);

  try {
    // const browser = await puppeteer.launch({
    //   headless: true,
    //   executablePath:
    //     "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", // Adjust the path if necessary
    //   args: ["--no-sandbox", "--disable-setuid-sandbox"],
    // });
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    
    const page = await browser.newPage();

    // Load the HTML file
    await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });

    // Generate the PDF
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    // Return the file URL
    const fileUrl = `${req.protocol}://${req.get("host")}/pdfs/${uniqueName}`;
    return res.json({ status: "success", pdfUrl: fileUrl });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return res
      .status(500)
      .json({ status: "error", message: "Failed to generate PDF." });
  }
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

app.get("/", function (req, res) {
  return res.send("welcome user");
});

// Serve PDFs
app.use("/pdfs", express.static(pdfDirectory));

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
