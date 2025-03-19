const express = require("express");
const cookieParser = require("cookie-parser");
const connectDb = require("./db/connectDb");
const app = express();
require("dotenv").config();

const authRoute = require("./routes/auth.route");

const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRoute);

app.listen(PORT, () => {
  connectDb();
  console.log("Server listening to port", PORT);
});
