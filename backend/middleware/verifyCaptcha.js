const verifyCaptcha = async (req, res, next) => {
  const captcha = req.body.captchaToken;
  if (!captcha) {
    return res
      .status(400)
      .json({ success: false, message: "Captcha required" });
  }

  try {
    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: captcha,
        }),
      }
    );

    const data = await response.json();

    if (!data.success) {
      return res
        .status(403)
        .json({ success: false, message: "Captcha failed" });
    }

    next();
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Captcha verification failed" });
  }
};

module.exports = verifyCaptcha;
