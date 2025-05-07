const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const CryptoJS = require("crypto-js");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Store latest QR strings by ID
const latestQRStrings = {
  ID1: null,
  ID2: null,
  ID3: null,
  ID4: null,
  ID5: null,
  ID6: null,
};

// CRC Calculation
function calculateCRC(inputStr) {
  let crc = 0xffff;
  for (let i = 0; i < inputStr.length; i++) {
    crc ^= inputStr.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

// Generate Custom Timestamp
function generateCustomTimestamp() {
  return `99170013${Date.now()}`;
}

// Generate KHQR Data
function generateKHQRData(id, merchantName, transactionAmount) {
  const payloadFormatIndicator = "000201";
  const pointOfInitiationMethod = "010212";

  // Use globally unique identifier based on ID
  const idToGUID = {
    ID1: "29210017lyouy_sochea_id1@aclb",
    ID2: "29210017lyouy_sochea_id2@aclb",
    ID3: "29210017lyouy_sochea_id3@aclb",
    ID4: "29210017lyouy_sochea_id4@aclb",
    ID5: "29210017lyouy_sochea_id5@aclb",
    ID6: "29210017lyouy_sochea_id6@aclb",
  };

  const globallyUniqueIdentifier = idToGUID[id] || idToGUID.ID1;

  const mcc = "52045999";
  const countryCode = "5802KH";
  const formattedMerchantName = `5912${merchantName}`;
  const merchantCity = "6010PHNOM PENH";
  const transactionCurrency = "5303840";
  const formattedTransactionAmount = `5404${parseFloat(
    transactionAmount
  ).toFixed(2)}`;
  const timestamp = generateCustomTimestamp();

  const khqrDataWithoutCRC =
    payloadFormatIndicator +
    pointOfInitiationMethod +
    globallyUniqueIdentifier +
    mcc +
    transactionCurrency +
    formattedTransactionAmount +
    countryCode +
    formattedMerchantName +
    merchantCity +
    timestamp;

  const dataToCalculateCRC = khqrDataWithoutCRC + "6304";
  const crc = calculateCRC(dataToCalculateCRC);
  return khqrDataWithoutCRC + "6304" + crc;
}

// POST /generate-qr
app.post("/generate-qr", (req, res) => {
  const { amount, id } = req.body;

  if (!amount || isNaN(amount)) {
    return res.status(400).json({ error: "Valid amount is required" });
  }

  const validIDs = ["ID1", "ID2", "ID3", "ID4", "ID5", "ID6"];
  const normalizedID = id ? id.toUpperCase() : "ID1";

  if (!validIDs.includes(normalizedID)) {
    return res
      .status(400)
      .json({ error: `Invalid ID. Use one of: ${validIDs.join(", ")}` });
  }

  const merchantName = `Sochea Lyouy - ${normalizedID}`;
  const khqrCode = generateKHQRData(normalizedID, merchantName, amount);

  // Save as latest QR string for this ID
  latestQRStrings[normalizedID] = khqrCode;

  const md5Hash = CryptoJS.MD5(khqrCode).toString();

  res.json({
    id: normalizedID,
    qrString: khqrCode,
    md5Hash: md5Hash,
    amount: amount,
    timestamp: new Date().toISOString(),
  });
});

// GET /get-latest-qr
app.get("/get-latest-qr", (req, res) => {
  const id = req.query.id ? req.query.id.toUpperCase() : "ID1";
  const validIDs = ["ID1", "ID2", "ID3", "ID4", "ID5", "ID6"];

  if (!validIDs.includes(id)) {
    return res
      .status(400)
      .json({ error: `Invalid ID. Use one of: ${validIDs.join(", ")}` });
  }

  const qrString = latestQRStrings[id];

  if (!qrString) {
    return res
      .status(404)
      .json({ error: `No QR code has been generated for ${id} yet.` });
  }

  res.setHeader("Content-Type", "text/plain");
  res.send(qrString);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
