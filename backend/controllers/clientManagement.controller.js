// controllers/clientManagement.controller.js
const mongoose = require("mongoose");
const Client = require("../models/Client");
const { decryptAES128 } = require("../utils/encipher");

// ========== Get all clients (only userType: 'client') ==========
const getClients = async (req, res) => {
  try {
    console.log("=== BACKEND CLIENT FETCH ===");
    console.log("Query params received:", req.query);

    // Always decrypt data on the backend - never send encrypted data to frontend
    const shouldDecrypt = req.query.decrypt === "true" || true; // Force decrypt for security
    console.log("Will decrypt data:", shouldDecrypt);

    const docs = await Client.aggregate([
      {
        $lookup: {
          from: "credentials",
          localField: "credentialId",
          foreignField: "_id",
          as: "cred",
        },
      },
      { $unwind: "$cred" },
      { $match: { "cred.userType": "client" } },
      {
        $project: {
          firstName: 1,
          middleName: 1,
          lastName: 1,
          suffixName: 1,
          profilePicture: 1,
          sex: 1,
          address: 1,
          contactNumber: 1,
          dateOfBirth: 1,
          maritalStatus: 1,
          createdAt: 1,
          restrictedUntil: 1,
          restrictionReason: 1,
          isBanned: 1,
          banReason: 1,
          credentialId: "$cred._id",
          email: "$cred.email",
          userType: "$cred.userType",
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    console.log(`Found ${docs.length} clients from database`);

    // Check if we have data to decrypt
    if (docs.length > 0) {
      console.log("Sample ENCRYPTED data from DB:", {
        firstName: docs[0].firstName,
        lastName: docs[0].lastName,
        contactNumber: docs[0].contactNumber,
        city: docs[0].address?.city,
      });
    }

    // ALWAYS decrypt sensitive data before sending to frontend
    if (shouldDecrypt && docs.length > 0) {
      console.log("🔓 Starting server-side decryption...");

      let successfulDecryptions = 0;
      let failedDecryptions = 0;

      for (let i = 0; i < docs.length; i++) {
        const client = docs[i];

        try {
          // Test if data is actually encrypted by trying to decrypt first client
          if (i === 0) {
            console.log("🧪 Testing decryption on first client...");
          }

          // Decrypt personal information
          if (client.firstName) {
            const originalFirstName = client.firstName;
            client.firstName = decryptAES128(client.firstName);
            if (i === 0)
              console.log(`firstName: "${originalFirstName}" -> "${client.firstName}"`);
          }

          if (client.lastName) {
            const originalLastName = client.lastName;
            client.lastName = decryptAES128(client.lastName);
            if (i === 0)
              console.log(`lastName: "${originalLastName}" -> "${client.lastName}"`);
          }

          if (client.middleName) {
            client.middleName = decryptAES128(client.middleName);
          }

          if (client.suffixName) {
            client.suffixName = decryptAES128(client.suffixName);
          }

          if (client.contactNumber) {
            const originalContact = client.contactNumber;
            client.contactNumber = decryptAES128(client.contactNumber);
            if (i === 0)
              console.log(
                `contactNumber: "${originalContact}" -> "${client.contactNumber}"`
              );
          }

          // Decrypt address information
          if (client.address) {
            if (client.address.street) {
              client.address.street = decryptAES128(client.address.street);
            }
            if (client.address.barangay) {
              client.address.barangay = decryptAES128(client.address.barangay);
            }
            if (client.address.city) {
              const originalCity = client.address.city;
              client.address.city = decryptAES128(client.address.city);
              if (i === 0)
                console.log(`city: "${originalCity}" -> "${client.address.city}"`);
            }
            if (client.address.province) {
              client.address.province = decryptAES128(client.address.province);
            }
            if (client.address.region) {
              client.address.region = decryptAES128(client.address.region);
            }
          }

          successfulDecryptions++;
        } catch (decryptError) {
          failedDecryptions++;
          console.error(`❌ Decryption failed for client ${client._id}:`, {
            error: decryptError.message,
            firstName: client.firstName,
            lastName: client.lastName,
          });

          // Log the specific error details
          console.error("Decryption error details:", decryptError);
        }
      }

      console.log(
        `✅ Decryption complete: ${successfulDecryptions} successful, ${failedDecryptions} failed`
      );

      // Show sample of decrypted data
      if (docs.length > 0) {
        console.log("Sample DECRYPTED data being sent to frontend:", {
          firstName: docs[0].firstName,
          lastName: docs[0].lastName,
          contactNumber: docs[0].contactNumber,
          city: docs[0].address?.city,
        });
      }
    } else if (!shouldDecrypt) {
      console.log("⚠️ WARNING: Sending encrypted data to frontend (security risk!)");
    }

    // Send decrypted data to frontend
    res.setHeader("Content-Type", "application/json");
    res.status(200).json({
      success: true,
      message: "Clients retrieved successfully",
      data: docs,
      decrypted: shouldDecrypt,
      count: docs.length,
    });

    console.log(`📤 Sent ${docs.length} clients to frontend`);
  } catch (error) {
    console.error("❌ Error in getClients controller:", error);
    res.setHeader("Content-Type", "application/json");
    res.status(500).json({
      success: false,
      message: "Error fetching clients",
      error: error.message,
    });
  }
};

// ========== Restrict a client ==========
const restrictClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { duration, reason } = req.body;

    const until = new Date();
    if (duration === "24h") until.setHours(until.getHours() + 24);
    if (duration === "72h") until.setHours(until.getHours() + 72);
    if (duration === "1w") until.setDate(until.getDate() + 7);
    if (duration === "1m") until.setMonth(until.getMonth() + 1);
    if (duration === "6m") until.setMonth(until.getMonth() + 6);

    const client = await Client.findByIdAndUpdate(
      id,
      { restrictedUntil: until, restrictionReason: reason },
      { new: true }
    );

    if (!client) return res.status(404).json({ message: "Client not found" });

    res.setHeader("Content-Type", "application/json");
    res.json({ message: "Client restricted successfully", client });
  } catch (error) {
    console.error("Error restricting client:", error);
    res.setHeader("Content-Type", "application/json");
    res.status(500).json({
      message: "Error restricting client",
      error: error.message,
    });
  }
};

// ========== Ban a client ==========
const banClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const client = await Client.findByIdAndUpdate(
      id,
      { isBanned: true, banReason: reason },
      { new: true }
    );

    if (!client) return res.status(404).json({ message: "Client not found" });

    res.setHeader("Content-Type", "application/json");
    res.json({ message: "Client banned successfully", client });
  } catch (error) {
    console.error("Error banning client:", error);
    res.setHeader("Content-Type", "application/json");
    res.status(500).json({
      message: "Error banning client",
      error: error.message,
    });
  }
};

module.exports = {
  getClients,
  restrictClient,
  banClient,
};
