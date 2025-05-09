const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("Failed to connect to MongoDB:", err));

// Nodemailer Setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Homepage
app.get("/", (req, res) => {
  res.render("start");
});

// Handle user input from start page
app.post("/start", async (req, res) => {
  const { name, gender, pair } = req.body;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: `New Revision Started by ${name}`,
      text: `User ${name} (${gender}) has started the revision.\nPair: ${pair}`
    });

    res.render("select-category", { name, gender, pair });
  } catch (error) {
    console.error("❌ Error sending email:", error);
    res.status(500).send("Failed to send start revision email.");
  }
});

// Handle category selection
app.post("/select-category", (req, res) => {
  const { name, gender, category, pair } = req.body;

  if (category === "Questions & Answer") {
    // Proceed to week selection
    res.render("week-selection", { name, gender, category, pair });
  } else {
    // Directly serve Exercise or Memory Verse PDF
    const fileName = category === "Exercise" ? "Exercise.pdf" : "MemoryVerse.pdf";
    const pdfPath = `/uploads/${fileName}`; // Updated for correct URL path

    if (fs.existsSync(path.join(__dirname, "uploads", fileName))) {
      res.render("revision-pdf", {
        name,
        gender,
        category,
        week: null,
        pair,
        pdfPath
      });
    } else {
      res.status(404).send(`${category} PDF not found.`);
    }
  }
});

// Week selection handler
app.post("/week-selection", (req, res) => {
  const { name, gender, category, week, pair } = req.body;
  const pdfPath = `/uploads/Week ${week}.pdf`; // Updated for correct URL path

  if (fs.existsSync(path.join(__dirname, "uploads", `Week ${week}.pdf`))) {
    res.render("revision-pdf", { name, gender, category, week, pair, pdfPath });
  } else {
    res.status(404).send("PDF not found for the selected week.");
  }
});

// File upload logic
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, file.originalname)
});

const upload = multer({ storage });

app.post("/upload-pdf", upload.single("pdf"), (req, res) => {
  const file = req.file;

  if (!file) return res.status(400).send("No file uploaded.");

  transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER,
    subject: `New PDF Uploaded: ${file.originalname}`,
    text: `A new PDF file has been uploaded: ${file.originalname}.`
  })
  .then(() => res.send("PDF uploaded successfully!"))
  .catch(err => {
    console.error("❌ Error sending email:", err);
    res.status(500).send("Error sending email after upload.");
  });
});

// Start server
app.listen(process.env.PORT || 5000, () => {
  console.log("Server running on port", process.env.PORT || 5000);
});
