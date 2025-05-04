const express = require("express");
const cookieParser = require("cookie-parser");
const connectDb = require("./db/connectDb");
const helmet = require("helmet");
const app = express();
require("dotenv").config();

const adsRoute = require("./routes/advertisement.route");
const verTryRoute = require("./routes/ver.route");
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cookieParser());
app.use(helmet());
app.use("/advertisement", adsRoute);
app.use("/ver", verTryRoute);
app.listen(PORT, () => {
  connectDb();
  console.log("Server listening to port", PORT);
});
